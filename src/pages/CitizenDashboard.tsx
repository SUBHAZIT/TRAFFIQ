import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, MapPin, Bell, Car, LogOut, Plus, Radio, Eye, Building2, Loader2, Search, Navigation, X } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import traffiqLogo from '@/assets/TRAFFIQ LOGO.png';
import MapContainer from '@/components/MapContainer';

interface IncidentRow {
  id: string;
  type: string;
  lat: number;
  lng: number;
  severity: string;
  description: string;
  created_at: string;
  resolved_at: string | null;
}

export default function CitizenDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sector, setSector] = useState('LOCATING...');
  const [weather, setWeather] = useState<{ condition: string; temp: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState<string>('');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeBlocks, setRouteBlocks] = useState<any[]>([]);
  const [isRouting, setIsRouting] = useState(false);
  const [isJourneyStarted, setIsJourneyStarted] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [totalDistance, setTotalDistance] = useState<number | null>(null);
  const [googleAlerts, setGoogleAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .is('resolved_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        let activeIncidents = data || [];
        const now = Date.now();
        const staleIds = activeIncidents
          .filter(inc => (now - new Date(inc.created_at).getTime()) > 20 * 60 * 1000)
          .map(inc => inc.id);

        if (staleIds.length > 0) {
          await supabase
            .from('incidents')
            .update({ resolved_at: new Date().toISOString() })
            .in('id', staleIds);
          activeIncidents = activeIncidents.filter(inc => !staleIds.includes(inc.id));
        }

        setIncidents(activeIncidents as IncidentRow[]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase.from('vehicles').select('*');
        if (error) throw error;
        if (data) setVehicles(data);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };

    const fetchWeather = async (lat: number, lng: number) => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
        const data = await response.json();
        if (data.current_weather) {
          const code = data.current_weather.weathercode;
          let condition = 'CLEAR';
          if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) condition = 'RAIN';
          else if ([45, 48].includes(code)) condition = 'FOG';
          else if ([95, 96, 99].includes(code)) condition = 'STORM';

          setWeather({ condition, temp: Math.round(data.current_weather.temperature) });
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    fetchData();
    fetchVehicles();

    // Initial weather fetch with default or current location
    const initialLat = userLocation?.lat || 28.6139;
    const initialLng = userLocation?.lng || 77.2090;
    fetchWeather(initialLat, initialLng);

    // DYNAMIC REROUTING DURING JOURNEY
    if (isJourneyStarted && incidents.length > 0) {
      const checkReroute = async () => {
        if (!directions) return;
        const path = directions.routes[0].overview_path;
        const blocksFound = incidents.filter(incident => {
          const incidentLoc = new google.maps.LatLng(incident.lat, incident.lng);
          return (incident.severity === 'critical' || incident.severity === 'high') &&
            path.some(point => google.maps.geometry.spherical.computeDistanceBetween(point, incidentLoc) < 200);
        });

        if (blocksFound.length > 0) {
          toast.warning("SYSTEM ALERT: NEW BLOCKS DETECTED. AUTO-REROUTING...");
          await calculateRoute();
        }
      };
      checkReroute();
    }

    // SIMULATED SPEED DURING JOURNEY
    let speedInterval: any;
    if (isJourneyStarted) {
      speedInterval = setInterval(() => {
        setSpeed(prev => {
          const change = Math.floor(Math.random() * 10) - 5;
          return Math.max(20, Math.min(65, prev + change));
        });
      }, 3000);
    } else {
      setSpeed(0);
    }

    // AUTO-DETECT LIVE POSITION
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(newLoc);

          // Reverse Geocode to get Sector
          if (window.google && window.google.maps) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: newLoc }, (results, status) => {
              if (status === "OK" && results && results[0]) {
                const neighborhood = results[0].address_components.find(
                  c => c.types.includes("neighborhood") || c.types.includes("sublocality")
                );
                setSector(neighborhood ? neighborhood.long_name : "UNKNOWN SECTOR");
              }
            });
          }
          // Update weather when location changes
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.error("GEOLOCATION ERROR", err),
        { enableHighAccuracy: true }
      );
    }

    // Subscribe to real-time updates
    const incidentsSubscription = supabase
      .channel('incidents-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchData();
      })
      .subscribe();

    const vehiclesSubscription = supabase
      .channel('vehicles-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchVehicles();
      })
      .subscribe();

    // Force periodic incident cleanup checks locally every minute
    const cronTimer = setInterval(fetchData, 60000);

    return () => {
      incidentsSubscription.unsubscribe();
      vehiclesSubscription.unsubscribe();
      clearInterval(cronTimer);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const calculateRoute = async () => {
    if (!userLocation || !destination || !window.google) return;
    setIsRouting(true);
    setRouteBlocks([]);

    const directionsService = new google.maps.DirectionsService();

    try {
      const result = await directionsService.route({
        origin: userLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.PESSIMISTIC
        }
      });

      const route = result.routes[0].legs[0];
      const dur = route.duration?.value || 0;
      const durTraffic = route.duration_in_traffic?.value || dur;

      if (durTraffic > dur * 1.2) {
        toast.warning("SYSTEM ADVISORY: HEAVY CONGESTION DETECTED ON PRIMARY ROUTE. OPTIMIZING...");
      }

      // SYSTEM CHECK: Cross-reference route with Supabase Incidents
      const path = result.routes[0].overview_path;

      // ADAPTIVE REROUTING: Analyze all available routes
      let bestRouteIndex = 0;
      let minBlocks = Infinity;
      const routeAnalysis = result.routes.map(r => {
        const p = r.overview_path;
        return incidents.filter(inc => {
          const l = new google.maps.LatLng(inc.lat, inc.lng);
          return (inc.severity === 'critical' || inc.severity === 'high') &&
            p.some(pt => google.maps.geometry.spherical.computeDistanceBetween(pt, l) < 150);
        });
      });

      routeAnalysis.forEach((blks, idx) => {
        if (blks.length < minBlocks) {
          minBlocks = blks.length;
          bestRouteIndex = idx;
        }
      });

      const blocksFound = routeAnalysis[bestRouteIndex];

      setRouteBlocks(blocksFound);
      setDirections({ ...result, routes: [result.routes[bestRouteIndex]] });

      const leg = result.routes[bestRouteIndex].legs[0];
      const distValue = leg.distance?.value || 0;
      setEta(leg.duration?.text || '--');
      setDistance(leg.distance?.text || '--');

      if (!isJourneyStarted || totalDistance === null) {
        setTotalDistance(distValue);
        setProgress(0);
      } else {
        const p = Math.max(0, Math.min(99, ((totalDistance - distValue) / totalDistance) * 100));
        setProgress(Math.round(p));
      }

      if (blocksFound.length > 0) {
        toast.error(`MISSION ALERT: ${blocksFound.length} ROUTE OBSTRUCTIONS REMAIN ON BEST PATH`);
      } else if (bestRouteIndex > 0) {
        toast.success("SYSTEM OPTIMIZED: ADAPTIVE REROUTING BYPASSED ALL OBSTRUCTIONS");
      } else {
        toast.success("SECURE ROUTE CALCULATED");
      }
    } catch (error) {
      console.error("Routing Error", error);
      toast.error("FAILED TO CALCULATE SECURE ROUTE");
    } finally {
      setIsRouting(false);
    }
  };

  const fetchDynamicTrafficAlerts = async (loc: { lat: number, lng: number }) => {
    if (!window.google || !window.google.maps) return;

    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    const distanceMatrix = new google.maps.DistanceMatrixService();

    // 1. Find nearby intersections/major points
    const request = {
      location: new google.maps.LatLng(loc.lat, loc.lng),
      radius: 20000, // 20KM
      type: 'intersection'
    };

    placesService.nearbySearch(request, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        const samplePoints = results.slice(0, 4).map(res => res.geometry?.location).filter(Boolean) as google.maps.LatLng[];

        // 2. Check traffic delay for these points
        distanceMatrix.getDistanceMatrix({
          origins: [new google.maps.LatLng(loc.lat, loc.lng)],
          destinations: samplePoints,
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.PESSIMISTIC
          }
        }, (res, stat) => {
          if (stat === "OK" && res && res.rows[0].elements) {
            const alerts = res.rows[0].elements.map((el, idx) => {
              const durRaw = el.duration?.value || 0;
              const durTraffic = el.duration_in_traffic?.value || durRaw;
              const place = results[idx];

              if (durTraffic > durRaw * 1.2) {
                return {
                  id: `g-${place.place_id}`,
                  message: `HEAVY CONGESTION DETECTED`,
                  location: place.name?.toUpperCase() || 'MAJOR ARTERY',
                  time: 'LIVE',
                  source: 'GOOGLE',
                  severity: 'high'
                };
              }
              return null;
            }).filter(Boolean);

            setGoogleAlerts(alerts as any[]);
          }
        });
      }
    });
  };

  useEffect(() => {
    if (userLocation) {
      fetchDynamicTrafficAlerts(userLocation);
      const interval = setInterval(() => fetchDynamicTrafficAlerts(userLocation), 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [userLocation]);

  const [unifiedAlerts, setUnifiedAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Combine DB incidents with REAL Google Traffic Alerts
    const dbAlerts = incidents
      .filter(inc => !inc.resolved_at && (inc.severity === 'critical' || inc.severity === 'high'))
      .map(inc => ({
        id: `db-${inc.id}`,
        message: `${inc.type.toUpperCase()}: ${inc.description.toUpperCase()}`,
        location: (inc as any).location_name || `SECTOR ${Math.floor(inc.lat)}.${Math.floor(inc.lng)}`,
        time: `${Math.round((Date.now() - new Date(inc.created_at).getTime()) / 60000)}M AGO`,
        source: 'SYSTEM',
        severity: inc.severity
      }));

    setUnifiedAlerts([...dbAlerts, ...googleAlerts].sort((a, b) => b.id.localeCompare(a.id)));
  }, [incidents, googleAlerts, sector]);

  return (
    <div className="flex h-screen flex-col bg-slate-50 uppercase tracking-widest text-primary">
      {/* GOV STRIP */}
      <div className="hidden md:flex bg-primary px-4 py-1 text-[10px] font-bold text-white">
        <div className="container flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            GOVERNMENT OF INDIA - CITIZEN PORTAL
          </span>
          <span>EMERGENCY HELPLINE: 112</span>
        </div>
      </div>

      <header className="hidden md:flex h-20 shrink-0 items-center justify-between border-b-4 border-primary bg-white px-6 shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={traffiqLogo} alt="Logo" className="h-12 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-black leading-none">TRAFFIQ</span>
              <span className="text-[10px] font-bold text-primary/60">INTELLIGENT CITIZEN INTERFACE</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-black text-primary/40">AUTHORIZED USER</span>
            <span className="text-xs font-black">{profile?.display_name?.toUpperCase() || 'CITIZEN'}</span>
          </div>
          <button onClick={signOut} className="rounded border-2 border-primary/20 px-4 py-1.5 text-xs font-black transition-all hover:bg-primary hover:text-white">
            LOGOUT
          </button>
        </div>
      </header>

      <div className="flex-1 md:overflow-y-auto md:p-8 flex flex-col relative w-full h-full">
        <div className="mx-auto max-w-5xl space-y-8 w-full h-full md:h-auto">
          {/* Quick Actions (Desktop Only) */}
          <div className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link
              to="/report"
              className="group bg-white border-2 border-primary/10 p-6 shadow-lg transition-all hover:border-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded bg-primary text-white mb-4">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-sm font-black">REPORT INCIDENT</div>
              <div className="text-[9px] font-bold text-primary/40 mt-1">EMERGENCY ASSISTANCE REQUEST</div>
            </Link>
            <div className="bg-white border-2 border-primary/10 p-6 shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10 text-primary mb-4">
                <Eye className="h-6 w-6" />
              </div>
              <div className="text-sm font-black">LIVE TRAFFIC</div>
              <div className="text-[9px] font-bold text-primary/40 mt-1">REAL-TIME CITY STATUS</div>
            </div>
            <div className="bg-white border-2 border-primary/10 p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[7px] font-black opacity-40 uppercase">LIVE SYNC</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10 text-primary mb-4">
                <Bell className="h-6 w-6" />
              </div>
              <div className="text-sm font-black">{unifiedAlerts.length} OPERATIONAL ALERTS</div>
              <div className="text-[9px] font-bold text-primary/40 mt-1">REAL-TIME TRAFFIC & SYSTEM LOGS</div>
            </div>
          </div>

          <div className="flex flex-col md:block md:relative w-full h-full md:h-auto">
            
            {/* Search HUD (Desktop absolute view) */}
            <div className="hidden md:block absolute top-6 left-6 z-20 w-96 space-y-4">
              <div className="bg-primary/95 p-6 border-2 border-white shadow-2xl backdrop-blur-md">
                <div className="text-[8px] font-black text-white/40 tracking-[0.3em] mb-3 uppercase">STRATEGIC DESTINATION SEARCH</div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-primary/30" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-white pl-10 pr-4 py-3 font-black text-xs text-primary border-2 border-white focus:outline-none placeholder:text-primary/20"
                      placeholder="ENTER DESTINATION SECTOR..."
                    />
                  </div>
                  <button
                    onClick={calculateRoute}
                    disabled={isRouting}
                    className="bg-white p-3 border-2 border-white hover:bg-slate-100 transition-all text-primary disabled:opacity-50"
                  >
                    {isRouting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>

                {directions && !isJourneyStarted && (
                  <button
                    onClick={() => {
                      setIsJourneyStarted(true);
                      toast.success("JOURNEY PROTOCOL INITIALIZED");
                    }}
                    className="w-full mt-4 bg-white text-primary py-3 font-black text-[10px] tracking-[0.2em] hover:bg-slate-100 transition-all border-2 border-white flex items-center justify-center gap-2"
                  >
                    <Navigation className="h-3 w-3" />
                    START JOURNEY
                  </button>
                )}
              </div>

              {/* Live Journey HUD (Active during journey) */}
              {isJourneyStarted && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-primary p-6 border-2 border-white shadow-2xl text-white"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-white/20 pb-2">
                    <div className="text-[10px] font-black tracking-widest flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      MISSION IN PROGRESS
                    </div>
                    <button
                      onClick={() => { setIsJourneyStarted(false); setProgress(0); setTotalDistance(null); }}
                      className="text-[8px] font-black border border-white/20 px-2 py-1 hover:bg-white/10"
                    >
                      ABORT MISSION
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-[7px] font-bold text-white/40 uppercase mb-1">VELOCITY</div>
                      <div className="text-xl font-black">{speed} <span className="text-[10px] text-white/40">KM/H</span></div>
                    </div>
                    <div>
                      <div className="text-[7px] font-bold text-white/40 uppercase mb-1">ARRIVAL</div>
                      <div className="text-xl font-black">{eta}</div>
                    </div>
                    <div>
                      <div className="text-[7px] font-bold text-white/40 uppercase mb-1">DISTANCE</div>
                      <div className="text-xl font-black">{distance}</div>
                    </div>
                  </div>

                  <div className="mt-4 bg-white/5 p-3 border border-white/10">
                    <div className="flex justify-between text-[8px] font-black mb-1">
                      <span>JOURNEY COMPLETION</span>
                      <span>{progress || 0}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress || 0}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* System Block Alerts */}
              {routeBlocks.length > 0 && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-red-600 p-4 border-2 border-white shadow-2xl text-white"
                >
                  <div className="flex items-center gap-2 mb-2 font-black text-[10px] tracking-widest border-b border-white/20 pb-1">
                    <AlertTriangle className="h-3 w-3" />
                    MISSION-CRITICAL OBSTRUCTION
                  </div>
                  <div className="space-y-2">
                    {routeBlocks.map((block: any) => (
                      <div key={block.id} className="text-[9px] font-bold leading-tight flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-white animate-pulse" />
                        SYSTEM ALERT: {block.description.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Map Canvas - Full screen on mobile via absolute inset-0 */}
            <div className="absolute inset-0 md:relative md:h-[680px] w-full md:border-4 md:border-primary shadow-2xl overflow-hidden flex-none z-0">
              <MapContainer
                incidents={incidents}
                vehicles={vehicles.filter(v => v.type !== 'ambulance')}
                selectedIncident={selectedIncident}
                setSelectedIncident={setSelectedIncident}
                userLocation={userLocation}
                directions={directions}
                isJourneyStarted={isJourneyStarted}
                routeBlocks={routeBlocks}
              />

              {/* Live Indicators Overlay (Mobile & Desktop) */}
              <div className="absolute bottom-28 left-4 md:bottom-6 md:left-6 z-10 space-y-2 w-36 md:w-auto md:max-w-[50%] pointer-events-auto">
                <div className="bg-primary px-2 py-1.5 md:px-3 flex items-center gap-2 border-2 border-white shadow-lg">
                  <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                  <span className="text-[8px] md:text-[10px] font-black text-white tracking-widest leading-none">LIVE TRACKING ACTIVE</span>
                </div>
                <div className="bg-white/90 p-2 md:p-3 border-2 border-primary shadow-lg backdrop-blur-sm">
                  <div className="text-[7px] md:text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] mb-0.5 md:mb-1">CURRENT SECTOR</div>
                  <div className="text-[9px] md:text-xs font-black text-primary leading-tight truncate">{sector.toUpperCase()}</div>
                </div>
              </div>

              {/* Desktop Weather Status Floating Card */}
              {weather && (
                <div className="hidden md:block absolute bottom-6 right-6 bg-white/90 p-4 border-4 border-primary shadow-xl z-10 backdrop-blur-md">
                  <div className="text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] mb-1">LOCAL ATMOSPHERE</div>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-black text-primary">{weather.condition}</div>
                    <div className="h-10 w-[2px] bg-primary/20" />
                    <div className="text-lg font-black text-primary/60">{weather.temp}°C</div>
                  </div>
                </div>
              )}

              {/* MOBILE ONLY OVERLAYS */}
              <div className="md:hidden absolute inset-0 z-20 pointer-events-none">
                
                {/* Mobile Floating Search */}
                <div className="absolute top-4 left-4 right-4 pointer-events-auto">
                  <div className="flex gap-2">
                    <div className="relative flex-1 bg-white rounded-full shadow-2xl border-2 border-primary overflow-hidden">
                      <MapPin className="absolute left-5 top-4 h-5 w-5 text-primary/30" />
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full bg-transparent pl-12 pr-4 py-4 font-black text-sm text-primary focus:outline-none placeholder:text-primary/40"
                        placeholder="SEARCH DESTINATION..."
                      />
                    </div>
                    <button
                      onClick={calculateRoute}
                      disabled={isRouting}
                      className="h-[60px] w-[60px] rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shrink-0"
                    >
                      {isRouting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
                    </button>
                  </div>
                </div>

                {/* Mobile Journey HUD */}
                {isJourneyStarted && (
                  <div className="absolute top-24 left-4 right-4 pointer-events-auto">
                    <div className="bg-primary/95 p-4 rounded-3xl shadow-2xl text-white border-2 border-white backdrop-blur-md">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                           <span className="text-[10px] font-black tracking-widest text-green-400">MISSION ACTIVE</span>
                        </div>
                        <button onClick={() => { setIsJourneyStarted(false); setProgress(0); setTotalDistance(null); }} className="text-white/50 p-1"><X className="h-5 w-5"/></button>
                      </div>
                      <div className="flex justify-between items-end">
                          <div>
                            <div className="text-[9px] font-bold tracking-widest text-white/40 mb-1">ARRIVAL ETA</div>
                            <div className="text-2xl font-black">{eta}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-bold tracking-widest text-white/40 mb-1">SPEED</div>
                            <div className="text-2xl font-black">{speed} <span className="text-xs">KM/H</span></div>
                          </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Mini Round Icons / Action Buttons */}
                <div className="absolute bottom-28 right-4 flex flex-col gap-4 pointer-events-auto">
                  <button onClick={() => toast.info(`Current Sector: ${sector.toUpperCase()}`)} className="h-14 w-14 rounded-full bg-white shadow-[0_10px_20px_rgba(0,0,0,0.2)] border-2 border-primary flex flex-col items-center justify-center text-primary">
                    <Navigation className="h-5 w-5 mb-0.5" />
                  </button>
                  <button onClick={() => window.location.reload()} className="h-14 w-14 rounded-full bg-white shadow-[0_10px_20px_rgba(0,0,0,0.2)] border-2 border-primary flex items-center justify-center text-primary relative">
                    <Bell className="h-6 w-6" />
                    {unifiedAlerts.length > 0 && <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
                  </button>
                  <button onClick={signOut} className="h-14 w-14 rounded-full bg-slate-800 shadow-[0_10px_20px_rgba(0,0,0,0.2)] border-2 border-slate-700 flex items-center justify-center text-red-400">
                    <LogOut className="h-5 w-5 ml-1" />
                  </button>
                </div>

                {/* Mobile Bottom Report Issue */}
                <div className="absolute bottom-8 left-4 right-4 pointer-events-auto">
                  <Link to="/report" className="flex items-center justify-center gap-3 w-full bg-red-600 text-white rounded-full py-5 text-base font-black tracking-widest shadow-[0_15px_40px_rgba(220,38,38,0.5)] border-2 border-red-400 transition-transform active:scale-95">
                    <AlertTriangle className="h-6 w-6" />
                    REPORT LIVE INCIDENT
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts (Desktop Only) */}
          <div className="hidden md:block bg-white border-4 border-primary shadow-2xl">
            <div className="bg-primary px-6 py-3">
              <h2 className="text-xs font-black tracking-widest text-white flex items-center gap-2">
                <Bell className="h-4 w-4" />
                CRITICAL BROADCASTS
              </h2>
            </div>
            <div className="divide-y divide-primary/10">
              {unifiedAlerts.map(alert => (
                <div key={alert.id} className={`flex items-center gap-4 px-6 py-4 ${alert.source === 'GOOGLE' ? 'bg-slate-50' : 'bg-red-50/30'}`}>
                  {alert.source === 'GOOGLE' ? (
                    <Navigation className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                  )}
                  <div className="flex-1 flex flex-col">
                    <span className="text-[11px] font-black">{alert.message}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="h-2 w-2 text-primary/40" />
                      <span className="text-[8px] font-black text-primary/60">{alert.location}</span>
                      <span className="text-[8px] font-bold text-primary/20 uppercase">| {alert.source}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-primary/40">{alert.time}</span>
                </div>
              ))}
              {unifiedAlerts.length === 0 && (
                <div className="px-6 py-10 text-center text-[10px] font-black opacity-20">NO ACTIVE ALERTS DETECTED</div>
              )}
            </div>
          </div>

          {/* Active Incidents (Desktop Only) */}
          <div className="hidden md:block bg-white border-2 border-primary/10 shadow-xl">
            <div className="border-b-2 border-primary/10 px-6 py-4">
              <h2 className="text-xs font-black tracking-widest text-primary flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                LOCAL INCIDENT MONITOR
              </h2>
            </div>
            <div className="divide-y divide-primary/5">
              {incidents.length > 0 ? (
                incidents.map(inc => (
                  <div key={inc.id} className="flex items-center gap-6 px-6 py-5 hover:bg-slate-50 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-primary/20 bg-white">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5">
                          {inc.severity.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold text-primary/40">/ {inc.type.toUpperCase()}</span>
                      </div>
                      <p className="text-xs font-black text-primary">{inc.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black text-primary">{Math.round((Date.now() - new Date(inc.created_at).getTime()) / 60000)} MINS AGO</span>
                      <span className="text-[8px] font-bold text-primary/40 text-nowrap truncate max-w-[150px]">{(inc as any).location_name || sector.toUpperCase()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center">
                  <span className="text-[10px] font-black text-primary/40 leading-relaxed uppercase tracking-[0.2em]">
                    {loading ? 'SYNCHRONIZING WITH CENTRAL COMMAND...' : 'NO ACTIVE INCIDENTS REPORTED IN THIS SECTOR'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
