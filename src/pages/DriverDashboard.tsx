import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Siren, Flame, Car, MapPin, Radio, LogOut, Navigation, Signal, Clock, Zap, AlertTriangle, Building2, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSensorData } from '@/hooks/useSensorData';
import { supabase } from '@/integrations/supabase/client';
import MapContainer from '@/components/MapContainer';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import traffiqLogo from '@/assets/TRAFFIQ LOGO.png';

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export default function DriverDashboard() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const { user, profile, signOut } = useAuth();
  const { orientation } = useSensorData();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'en-route' | 'on-scene'>('idle');
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0); // seconds
  const [distance, setDistance] = useState(0); // meters
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [unifiedAlerts, setUnifiedAlerts] = useState<any[]>([]);
  const [routeBlocks, setRouteBlocks] = useState<any[]>([]);
  const [sector, setSector] = useState('LOCATING...');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [googleAlerts, setGoogleAlerts] = useState<any[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [myVehicle, setMyVehicle] = useState<any>(null);
  const [currentRouteId, setCurrentRouteId] = useState<string | null>(null);
  const routingRequestedRef = useRef(false);
  const [pastRides, setPastRides] = useState<any[]>([]);
  const [updateFields, setUpdateFields] = useState({
    license_number: '',
    vehicle_reg_id: '',
    vehicle_type: 'ambulance'
  });

  // Track Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(newPos);
          if (status === 'en-route') {
            setSpeed(pos.coords.speed !== null ? pos.coords.speed * 3.6 : 45); // KM/H
          }
          
          // SYNC TO SUPABASE
          if (myVehicle?.id) {
            supabase.from('vehicles').update({
              lat: newPos.lat,
              lng: newPos.lng,
              speed: pos.coords.speed !== null ? pos.coords.speed * 3.6 : (status === 'en-route' ? 45 : 0)
            }).eq('id', myVehicle.id).then();
          }
          
          // Reverse Geocode for Sector
          if (window.google && window.google.maps) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: newPos }, (results, status) => {
              if (status === "OK" && results && results[0]) {
                const neighborhood = results[0].address_components.find(
                  c => c.types.includes("neighborhood") || c.types.includes("sublocality")
                );
                setSector(neighborhood ? neighborhood.long_name : "UNKNOWN SECTOR");
              }
            });
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [status]);

  // Fetch Dynamic Hospitals from Google Places
  useEffect(() => {
    if (!isLoaded || !userLocation || !window.google) return;

    const dummyDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(dummyDiv);
    
    const request: google.maps.places.PlaceSearchRequest = {
      location: userLocation,
      radius: 50000, // 50KM
      type: 'hospital'
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const formattedHospitals = results.map(result => ({
          id: result.place_id,
          name: result.name || 'UNKNOWN HOSPITAL',
          lat: result.geometry?.location?.lat(),
          lng: result.geometry?.location?.lng(),
          address: result.vicinity
        }));
        setNearbyHospitals(formattedHospitals);
      }
    });
  }, [isLoaded, userLocation]);

  useEffect(() => {
    if (profile?.vehicle_type) {
      setSelectedVehicle(profile.vehicle_type);
    }
  }, [profile]);

  // Fetch or Create City-Wide Vehicle Record
  useEffect(() => {
    const syncVehicle = async () => {
      if (!user || !profile?.is_approved) return;
      
      const { data: existing, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', user.id)
        .maybeSingle();

      if (existing) {
        setMyVehicle(existing);
        // RESTORE MISSION STATE
        if (existing.status !== 'idle') {
          setStatus(existing.status as any);
          if (existing.dest_lat && existing.dest_lng) {
            setDestinationCoords({ lat: existing.dest_lat, lng: existing.dest_lng });
            setDestination("RESUMED MISSION");
          }
          
          // Fetch active route
          const { data: route } = await supabase
            .from('routes')
            .select('id')
            .eq('vehicle_id', existing.id)
            .eq('active', true)
            .maybeSingle();
          
          if (route) setCurrentRouteId(route.id);
        }

        // FETCH RIDE HISTORY
        const { data: history } = await supabase
          .from('routes')
          .select('*')
          .eq('vehicle_id', existing.id)
          .eq('active', false)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (history) setPastRides(history);
      } else if (profile?.vehicle_type) {
        // Auto-assign vehicle if missing but driver is approved
        const { data: newV, error: createErr } = await supabase
          .from('vehicles')
          .insert({
            type: profile.vehicle_type,
            callsign: `${profile.vehicle_type.toUpperCase()}-${user.id.slice(0, 4)}`,
            driver_id: user.id,
            status: 'idle',
            lat: userLocation?.lat || 28.6139,
            lng: userLocation?.lng || 77.2090
          } as any)
          .select()
          .single();
        
        if (newV) setMyVehicle(newV);
        if (createErr) console.error("VEHICLE SYNC ERROR:", createErr);
      }
    };
    
    syncVehicle();
  }, [user, profile, isLoaded]);

  // Fetch Incidents and Signals
  useEffect(() => {
    const fetchData = async () => {
      const { data: sData } = await supabase.from('traffic_signals').select('*');
      const { data: iData } = await supabase.from('incidents').select('*');
      
      let fetchedSignals = (sData || []) as any[];
      let fetchedIncidents = (iData || []) as any[];

      // AUTO-RESOLVE STALE INCIDENTS (>20 MIN)
      const now = Date.now();
      const stales = fetchedIncidents.filter(inc => 
        !inc.resolved_at && (now - new Date(inc.created_at).getTime()) > 20 * 60 * 1000
      );

      if (stales.length > 0) {
        const staleIds = stales.map(s => s.id);
        await supabase
          .from('incidents')
          .update({ resolved_at: new Date().toISOString() })
          .in('id', staleIds);
        
        fetchedIncidents = fetchedIncidents.map(inc => 
          staleIds.includes(inc.id) ? { ...inc, resolved_at: new Date().toISOString() } : inc
        );
      }

      setIncidents(fetchedIncidents);
      setSignals(fetchedSignals);
    };

    fetchData();

    const iSub = supabase.channel('incidents-driver').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, fetchData).subscribe();
    const sSub = supabase.channel('signals-driver').on('postgres_changes', { event: '*', schema: 'public', table: 'traffic_signals' }, fetchData).subscribe();

    return () => {
      iSub.unsubscribe();
      sSub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status === 'idle') {
      routingRequestedRef.current = false;
    }
  }, [status]);

  const [forceRouteUpdate, setForceRouteUpdate] = useState(0);
  const prevIncidentsLength = useRef(0);
  const incidentsRef = useRef(incidents);

  useEffect(() => {
    incidentsRef.current = incidents;
    const criticalCount = incidents.filter(i => !i.resolved_at && (i.severity === 'critical' || i.severity === 'high')).length;
    if (criticalCount > prevIncidentsLength.current) {
      if (status === 'en-route' && routingRequestedRef.current) {
        routingRequestedRef.current = false;
        setForceRouteUpdate(prev => prev + 1);
        toast.error('NEW TACTICAL INCIDENT DETECTED! RECALCULATING ROUTE', {
          style: { background: '#ef4444', color: '#fff', border: 'none' }
        });
      }
    }
    prevIncidentsLength.current = criticalCount;
  }, [incidents, status]);

  useEffect(() => {
    if (status === 'en-route' && destinationCoords && isLoaded && userLocation) {
      if (routingRequestedRef.current) return;
      routingRequestedRef.current = true;
      
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: userLocation,
          destination: destinationCoords,
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.PESSIMISTIC
          }
        },
        (result, status) => {
           if (status === google.maps.DirectionsStatus.OK && result) {
            // ADAPTIVE REROUTING: Scan all available routes for blocks
            let bestRouteIndex = 0;
            let minBlocks = Infinity;
            
            const routeAnalysis = result.routes.map(r => {
              const p = r.overview_path;
              return incidentsRef.current.filter(inc => {
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

            const selectedBlocks = routeAnalysis[bestRouteIndex];
            setRouteBlocks(selectedBlocks);
            const optimizedRoute = result.routes[bestRouteIndex];
            setDirections({ ...result, routes: [optimizedRoute] });
            
            const leg = optimizedRoute.legs[0];
            if (leg) {
              const durTraffic = leg.duration_in_traffic?.value || leg.duration?.value || 0;
              setEta(durTraffic);
              setDistance(leg.distance?.value || 0);

              if (selectedBlocks.length > 0) {
                toast.error(`TACTICAL ALERT: ${selectedBlocks.length} ROUTE OBSTRUCTIONS REMAIN ON MISSION PATH`);
              } else if (bestRouteIndex > 0) {
                toast.success("MISSION OPTIMIZED: ADAPTIVE REROUTING APPLIED TO BYPASS OBSTRUCTIONS");
              }
            }
          }
        }
      );
    } else if (status === 'idle') {
      setDirections(null);
      setEta(0);
      setDistance(0);
    }
  }, [status, destinationCoords, isLoaded, forceRouteUpdate]);

  // Persistent Target Route Sync 
  useEffect(() => {
    if (directions && directions.routes.length > 0 && myVehicle?.id && currentRouteId) {
      const optimizedRoute = directions.routes[0];
      const pathCoords = optimizedRoute.overview_path.map(pt => ({
        lat: pt.lat(),
        lng: pt.lng()
      }));
      
      supabase.from('routes').update({
        path: pathCoords as any,
        eta: Math.round(optimizedRoute.legs[0].duration?.value || 0),
        active: true
      } as any).eq('id', currentRouteId).then(({ error }) => {
        if (error) console.error("ROUTE UPDATE ERROR:", error);
      });
    }
  }, [directions, myVehicle?.id, currentRouteId]);

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return "--:--";
    const mins = Math.ceil(seconds / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}H ${m}M`;
    }
    return `${mins} MIN`;
  };

  const formatDistance = (meters: number) => {
    if (meters <= 0) return "0.0 KM";
    return `${(meters / 1000).toFixed(1)} KM`;
  };

  const handleStartMission = async () => {
    if (selectedVehicle && destinationCoords) {
      setStatus('en-route');
      if (myVehicle?.id) {
        const { error } = await supabase.from('vehicles').update({
          status: 'en-route',
          dest_lat: destinationCoords.lat,
          dest_lng: destinationCoords.lng
        } as any).eq('id', myVehicle.id);
        
        if (error) {
          console.error("MISSION SYNC ERROR:", error);
          toast.error("COMMAND CENTER SYNC FAILED");
        } else {
          // CREATE NEW ROUTE RECORD FOR HISTORY
          const { data: routeData } = await supabase.from('routes').insert({
            vehicle_id: myVehicle.id,
            active: true,
            path: []
          }).select('id').single();
          
          if (routeData) setCurrentRouteId(routeData.id);
          toast.success("MISSION SYNCHRONIZED WITH COMMAND CENTER");
        }
      }
    }
  };

  const fetchDynamicTrafficAlerts = async (loc: { lat: number, lng: number }) => {
    if (!window.google || !window.google.maps) return;

    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    const distanceMatrix = new google.maps.DistanceMatrixService();

    const request = {
      location: new google.maps.LatLng(loc.lat, loc.lng),
      radius: 20000,
      type: 'intersection'
    };

    placesService.nearbySearch(request, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        const samplePoints = results.slice(0, 4).map(res => res.geometry?.location).filter(Boolean) as google.maps.LatLng[];
        
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
      const interval = setInterval(() => fetchDynamicTrafficAlerts(userLocation), 60000);
      return () => clearInterval(interval);
    }
  }, [userLocation]);

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

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        setDestination(place.name || place.formatted_address || '');
        setDestinationCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };

  const vehicleTypes = [
    { id: 'ambulance', label: 'AMBULANCE', icon: Siren },
    { id: 'fire', label: 'FIRE ENGINE', icon: Flame },
    { id: 'police', label: 'POLICE', icon: Shield },
  ];

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        license_number: updateFields.license_number,
        vehicle_reg_id: updateFields.vehicle_reg_id,
        vehicle_type: updateFields.vehicle_type
      } as any)
      .eq('user_id', user.id);
    
    if (!error) {
      window.location.reload(); // Refresh to get updated profile
    }
    setIsUpdatingProfile(false);
  };

  const hasIncompleteProfile = !profile?.license_number || !profile?.vehicle_reg_id || !profile?.vehicle_type;

  if (!isLoaded) return (
    <div className="flex h-screen items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-6">
        <img src={traffiqLogo} alt="Logo" className="h-24 w-auto animate-pulse" />
        <span className="text-xs font-black tracking-[0.5em] text-white">SYSTEM INITIALIZING...</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-slate-50 uppercase tracking-widest text-primary">
      {/* GOV STRIP */}
      <div className="bg-primary px-4 py-1 text-[10px] font-bold text-white">
        <div className="container flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            GOVERNMENT OF INDIA · DRIVER PORTAL
          </span>
          <span>ROADSIDE ASSISTANCE: 1033</span>
        </div>
      </div>

      <header className="flex h-20 shrink-0 items-center justify-between border-b-4 border-primary bg-white px-6 shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={traffiqLogo} alt="Logo" className="h-12 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-black leading-none">TRAFFIQ</span>
              <span className="text-[10px] font-bold text-primary/60">INTELLIGENT DRIVER INTERFACE</span>
            </div>
          </Link>
          {status !== 'idle' && (
            <div className="ml-6 flex items-center gap-2 border-2 border-primary bg-blue-50 px-3 py-1">
              <Activity className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[10px] font-black">{status}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-black text-primary/40">OPERATOR ID</span>
            <span className="text-xs font-black">{profile?.display_name?.toUpperCase() || 'UNIT-01'}</span>
          </div>
          <button onClick={signOut} className="rounded border-2 border-primary/20 px-4 py-1.5 text-xs font-black transition-all hover:bg-primary hover:text-white">
            LOGOUT
          </button>
        </div>
      </header>

      {hasIncompleteProfile ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white border-4 border-primary p-8 shadow-2xl">
            <h2 className="text-xl font-black mb-6">COMPLETE YOUR PROFILE</h2>
            <p className="text-[10px] font-bold text-primary/60 mb-6">ALL FIELDS ARE MANDATORY FOR VERIFICATION BY THE TRAFFIC AUTHORITY.</p>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">VEHICLE ID (REG. NO)</label>
                <input
                  type="text"
                  required
                  value={updateFields.vehicle_reg_id}
                  onChange={e => setUpdateFields({...updateFields, vehicle_reg_id: e.target.value.toUpperCase()})}
                  className="w-full rounded border-2 border-primary/10 bg-slate-50 px-3 py-3 text-[10px] font-black focus:outline-none focus:border-primary"
                  placeholder="DL 01 AB 1234"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">DRIVING LICENSE NO.</label>
                <input
                  type="text"
                  required
                  value={updateFields.license_number}
                  onChange={e => setUpdateFields({...updateFields, license_number: e.target.value.toUpperCase()})}
                  className="w-full rounded border-2 border-primary/10 bg-slate-50 px-3 py-3 text-[10px] font-black focus:outline-none focus:border-primary"
                  placeholder="LIC-XXXXXX"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">VEHICLE TYPE</label>
                <select
                  required
                  value={updateFields.vehicle_type}
                  onChange={e => setUpdateFields({...updateFields, vehicle_type: e.target.value})}
                  className="w-full rounded border-2 border-primary/10 bg-slate-50 px-3 py-3 text-[10px] font-black focus:outline-none focus:border-primary"
                >
                  <option value="ambulance">AMBULANCE</option>
                  <option value="fire">FIRE ENGINE</option>
                  <option value="police">POLICE CRUISER</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full bg-primary py-4 text-xs font-black text-white shadow-lg disabled:opacity-50"
              >
                {isUpdatingProfile ? 'PROCESSING...' : 'SUBMIT FOR VERIFICATION'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Controls */}
          <aside className="flex w-80 shrink-0 flex-col border-r-4 border-primary bg-white overflow-y-auto">
            <div className="border-b-2 border-primary/10 p-6">
              <h3 className="mb-4 text-[9px] font-black tracking-[0.2em] text-primary/40">UNIT IDENTIFICATION</h3>
              <div className="space-y-3">
                {vehicleTypes.filter(vt => vt.id === profile?.vehicle_type).map(vt => (
                  <div
                    key={vt.id}
                    className="flex w-full items-center gap-4 border-2 p-3 border-primary bg-primary text-white"
                  >
                    <vt.icon className="h-5 w-5" />
                    <span className="text-xs font-black">{vt.label}</span>
                  </div>
                ))}
                {!profile?.vehicle_type && (
                  <p className="text-[10px] font-black text-red-500">NO VEHICLE ASSIGNED</p>
                )}
              </div>
            </div>

          <div className="border-b-2 border-primary/10 p-6">
            <h3 className="mb-4 text-[9px] font-black tracking-[0.2em] text-primary/40">TARGET DESTINATION</h3>
            <div className="space-y-4">
              <div className="relative">
                <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                  <input
                    type="text"
                    placeholder="SEARCH DESTINATION..."
                    className="w-full border-2 border-primary bg-slate-50 px-3 py-3 text-[10px] font-black focus:outline-none placeholder:text-primary/20"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </Autocomplete>
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-primary/30" />
              </div>

              <div className="text-[8px] font-black tracking-[0.2em] text-primary/40 mt-4 mb-2 uppercase">Hospitals within 50KM</div>
              <select
                value={destination}
                onChange={e => {
                  const name = e.target.value;
                  const h = nearbyHospitals.find(h => h.name === name);
                  if (h) {
                    setDestination(h.name);
                    setDestinationCoords({ lat: h.lat, lng: h.lng });
                  }
                }}
                className="w-full border-2 border-primary bg-slate-50 px-3 py-3 text-[10px] font-black focus:outline-none"
              >
                <option value="">— SELECT LOCAL HOSPITAL —</option>
                {nearbyHospitals.map(h => (
                  <option key={h.id} value={h.name}>{h.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-b-2 border-primary/10 p-6">
            <h3 className="mb-4 text-[9px] font-black tracking-[0.2em] text-primary/40">MISSION STATUS</h3>
            <div className="space-y-3">
              {status === 'idle' && (
                <button
                  onClick={handleStartMission}
                  disabled={!selectedVehicle || !destinationCoords}
                  className="w-full bg-primary py-4 text-xs font-black text-white shadow-lg disabled:opacity-30"
                >
                  INITIATE MISSION
                </button>
              )}
              {status !== 'idle' && (
                <>
                  <button
                    onClick={async () => {
                      const nextStatus = status === 'en-route' ? 'on-scene' : 'idle';
                      setStatus(nextStatus);
                      if (myVehicle?.id) {
                        await supabase.from('vehicles').update({ 
                          status: nextStatus,
                          dest_lat: nextStatus === 'idle' ? null : undefined,
                          dest_lng: nextStatus === 'idle' ? null : undefined
                        } as any).eq('id', myVehicle.id);

                        if (nextStatus === 'idle') {
                          if (currentRouteId) {
                            await supabase.from('routes').update({ active: false } as any).eq('id', currentRouteId);
                            setCurrentRouteId(null);
                          }
                        }
                      }
                    }}
                    className="w-full border-4 border-primary py-4 text-xs font-black text-primary hover:bg-slate-50"
                  >
                    {status === 'en-route' ? 'ARRIVED ON SCENE' : 'MISSION COMPLETE'}
                  </button>
                  <button
                    onClick={async () => {
                      setStatus('idle');
                      if (myVehicle?.id) {
                        await supabase.from('vehicles').update({ 
                          status: 'idle',
                          dest_lat: null,
                          dest_lng: null
                        } as any).eq('id', myVehicle.id);
                        
                        if (currentRouteId) {
                          await supabase.from('routes').update({ active: false } as any).eq('id', currentRouteId);
                          setCurrentRouteId(null);
                        }
                      }
                    }}
                    className="w-full text-center text-[9px] font-black text-primary/40 hover:text-primary transition-colors"
                  >
                    ABORT MISSION
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="p-6 overflow-y-auto max-h-[400px]">
            <h3 className="mb-4 text-[9px] font-black tracking-[0.2em] text-primary/40">MY RIDE HISTORY</h3>
            <div className="space-y-3">
              {pastRides.map(ride => (
                <div key={ride.id} className="p-3 bg-slate-50 border border-primary/5 rounded group hover:border-primary/20 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] font-black">{new Date(ride.created_at).toLocaleDateString()}</div>
                    <div className="text-[8px] font-bold text-primary/40">{new Date(ride.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black text-primary/60">
                    <Clock className="h-3 w-3" />
                    {ride.eta ? `${Math.round(ride.eta / 60)} MIN DURATION` : 'UNCOMPLETED'}
                  </div>
                </div>
              ))}
              {pastRides.length === 0 && (
                <div className="py-4 text-center text-[9px] font-black text-primary/20 uppercase tracking-widest">
                  NO PAST RIDES RECORDED
                </div>
              )}
            </div>
          </div>
          <div className="p-6 border-t border-primary/10 overflow-y-auto max-h-[400px]">
            <h3 className="mb-4 text-[9px] font-black tracking-[0.2em] text-primary/40">UNIFIED ALERT FEED</h3>
            <div className="space-y-3">
              {unifiedAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className={`border-l-4 p-4 ${alert.source === 'GOOGLE' ? 'border-blue-500 bg-blue-50/30' : 'border-red-500 bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {alert.source === 'GOOGLE' ? (
                      <Navigation className="h-3 w-3 text-blue-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    )}
                    <span className="text-[10px] font-black text-primary leading-tight">{alert.message.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1 opacity-60">
                    <MapPin className="h-2 w-2" />
                    <span className="text-[8px] font-bold uppercase">{alert.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[7px] font-bold text-primary/40 uppercase">{alert.source} • {alert.time}</span>
                  </div>
                </div>
              ))}
              {unifiedAlerts.length === 0 && (
                <p className="text-[10px] font-black text-primary/20">NO ACTIVE ALERTS</p>
              )}
            </div>
          </div>
        </aside>

        <main className="relative flex-1 overflow-hidden bg-white">
          <div className="absolute inset-0 grid-bg opacity-20" />
          
          <div className="absolute left-8 top-8 z-10 w-80 space-y-4">
            <div className="bg-white border-4 border-primary p-6 shadow-2xl">
              <div className="grid grid-cols-3 gap-6">
                <div className="border-b-2 border-primary/10 pb-2">
                  <div className="text-[8px] font-black text-primary/40">SPEED</div>
                  <div className="text-xl font-black">{status === 'en-route' ? Math.round(speed) : 0} <span className="text-[8px] opacity-40">KM/H</span></div>
                </div>
                <div className="border-b-2 border-primary/10 pb-2">
                  <div className="text-[8px] font-black text-primary/40">ETA</div>
                  <div className="text-xl font-black">{status === 'en-route' ? formatDuration(eta) : '--:--'}</div>
                </div>
                <div className="border-b-2 border-primary/10 pb-2">
                  <div className="text-[8px] font-black text-primary/40">DISTANCE</div>
                  <div className="text-xl font-black">{status === 'en-route' ? formatDistance(distance) : '0.0 KM'}</div>
                </div>
              </div>
            </div>

            {destination && (
              <div className="bg-primary/5 border-2 border-primary p-4">
                <div className="text-[8px] font-black text-primary/40">TARGET</div>
                <div className="text-xs font-black text-primary">{destination}</div>
              </div>
            )}
          </div>

          <div className="flex h-full w-full items-center justify-center relative">
            {profile?.is_approved ? (
              <MapContainer 
                userLocation={userLocation}
                isJourneyStarted={status === 'en-route'}
                routeBlocks={routeBlocks}
                directions={directions}
                incidents={incidents}
                signals={signals}
                // @ts-ignore - adding tilt/heading for sensor integration
                tilt={orientation.beta}
                heading={orientation.alpha}
              />
            ) : (
              <div className="text-center z-10 bg-white/90 p-12 border-8 border-primary shadow-2xl max-w-lg mx-auto">
                <AlertTriangle className="mx-auto mb-6 h-20 w-20 text-red-600 animate-pulse" />
                <h2 className="text-2xl font-black mb-4">ACCESS RESTRICTED</h2>
                <p className="text-sm font-black text-primary/60 mb-6 leading-relaxed">
                  YOUR ACCOUNT (ID: {profile?.license_number || 'PENDING'}) IS CURRENTLY UNDER REVIEW BY THE TRAFFIC COORDINATION AUTHORITY.
                </p>
                <div className="flex flex-col gap-2 text-[10px] font-bold text-left bg-slate-50 p-4 border-2 border-primary/10">
                  <span className="flex justify-between"><span>NAME:</span> <span>{profile?.display_name?.toUpperCase()}</span></span>
                  <span className="flex justify-between"><span>VEHICLE:</span> <span>{profile?.vehicle_reg_id || 'N/A'}</span></span>
                  <span className="flex justify-between"><span>TYPE:</span> <span>{profile?.vehicle_type?.toUpperCase() || 'N/A'}</span></span>
                </div>
                <p className="mt-8 text-[9px] font-black text-primary/40 animate-bounce">
                  AWAITING GOVERNMENT VERIFICATION...
                </p>
              </div>
            )}

            {/* Overlays */}
            {profile?.is_approved && status === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/5 pointer-events-none">
                <div className="bg-white p-6 border-4 border-primary shadow-2xl text-center pointer-events-auto">
                  <Navigation className="mx-auto mb-4 h-12 w-12 text-primary/20" />
                  <p className="text-xs font-black">SELECT DESTINATION TO START MISSION</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      )}
    </div>
  );
}
