import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, Radio, AlertTriangle, Siren, Flame, Car, MapPin, Signal, Clock, ChevronRight, Plus, RotateCcw, Play, Pause, ArrowLeft, X, Zap, BarChart3, LogOut, Building2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Vehicle, Incident, TrafficSignal, CongestionLevel } from '@/types/traffic';
import { initialVehicles, initialIncidents, initialSignals, initialRoadSegments, getVehicleColor, getSeverityColor } from '@/data/simulation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import traffiqLogo from '@/assets/TRAFFIQ LOGO.png';
import MapContainer from '@/components/MapContainer';
import GreenCorridorSimulator from '@/components/GreenCorridorSimulator';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

function getDistance(p1: { lat: number, lng: number }, p2: { lat: number, lng: number }) {
  const R = 6371e3; // metres
  const φ1 = p1.lat * Math.PI / 180;
  const φ2 = p2.lat * Math.PI / 180;
  const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
  const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function VehicleIcon({ type }: { type: Vehicle['type'] }) {
  switch (type) {
    case 'ambulance': return <Siren className="h-4 w-4" />;
    case 'fire': return <Flame className="h-4 w-4" />;
    case 'police': return <Shield className="h-4 w-4" />;
    default: return <Car className="h-4 w-4" />;
  }
}



export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [unifiedAlerts, setUnifiedAlerts] = useState<any[]>([]);
  const [signals, setSignals] = useState<TrafficSignal[]>(initialSignals);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'units' | 'verification' | 'alerts' | 'history' | 'analytics'>('units');
  const [verifTab, setVerifTab] = useState<'pending' | 'verified'>('pending');
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [verifiedDrivers, setVerifiedDrivers] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sector, setSector] = useState('LOCATING...');
  const [activeMission, setActiveMission] = useState<Vehicle | null>(null);
  const [livePaths, setLivePaths] = useState<{ id: string; path: { lat: number; lng: number }[]; color: string; eta?: string }[]>([]);
  const [pastRoutes, setPastRoutes] = useState<any[]>([]);
  const [eta, setEta] = useState<string>('CALCULATING...');
  
  // ANALYTICS STATE
  const [zoneTraffic, setZoneTraffic] = useState<any[]>([]);
  const [busyZone, setBusyZone] = useState<{ name: string; delay: number } | null>(null);


  const fetchDrivers = useCallback(async () => {
    // Join with user_roles to get only drivers
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'driver');
    if (!roles) return;
    const userIds = roles.map(r => r.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds);

    if (profiles) {
      setPendingDrivers(profiles.filter((p: any) => !p.is_approved));
      setVerifiedDrivers(profiles.filter((p: any) => p.is_approved));
    }
  }, []);

  const handleApprove = async (userId: string) => {
    setIsApproving(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true } as any)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      toast.success("DRIVER ACCESS AUTHORIZED");
      await fetchDrivers();
    } catch (error: any) {
      console.error('VERIFICATION ERROR:', error);
      toast.error(`VERIFICATION FAILED: ${error.message || 'DATABASE ACCESS DENIED'}`);
    } finally {
      setIsApproving(null);
    }
  };

  const fetchData = useCallback(async () => {
    const { data: vData } = await supabase.from('vehicles').select('*');
    const { data: sData } = await supabase.from('traffic_signals').select('*');
    const { data: iData } = await supabase.from('incidents').select('*').is('resolved_at', null);
    const { data: rData } = await supabase.from('routes').select('*').eq('active', true);
    const { data: hData } = await supabase.from('routes').select(`
      *,
      vehicles (callsign, type)
    `).eq('active', false).order('created_at', { ascending: false }).limit(20);

    let fetchedVehicles = (vData || []) as any[];
    let fetchedSignals = (sData || []) as any[];
    let fetchedIncidents = (iData || []) as any[];
    let fetchedRoutes = (rData || []) as any[];
    setPastRoutes(hData || []);

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

    // AUTO-COMPLETE STALE MISSIONS (>20 MIN)
    const staleRoutes = fetchedRoutes.filter(r => 
      (now - new Date(r.created_at).getTime()) > 20 * 60 * 1000
    );

    if (staleRoutes.length > 0) {
      const staleRouteIds = staleRoutes.map(r => r.id);
      const staleVehicleIds = staleRoutes.map(r => r.vehicle_id);

      await supabase.from('routes').update({ active: false }).in('id', staleRouteIds);
      await supabase.from('vehicles').update({ status: 'idle' }).in('id', staleVehicleIds);

      fetchedRoutes = fetchedRoutes.filter(r => !staleRouteIds.includes(r.id));
      fetchedVehicles = fetchedVehicles.map(v => 
        staleVehicleIds.includes(v.id) ? { ...v, status: 'idle' } : v
      );
    }

    // Unified Alerts Logic
    const dbAlerts = fetchedIncidents
      .filter(inc => !inc.resolved_at && (inc.severity === 'critical' || inc.severity === 'high'))
      .map(inc => ({
        id: `db-${inc.id}`,
        rawId: inc.id,
        message: `${inc.type.toUpperCase()}: ${inc.description.toUpperCase()}`,
        location: (inc as any).location_name || `SECTOR ${Math.floor(inc.lat)}.${Math.floor(inc.lng)}`,
        image_url: (inc as any).image_url,
        upvotes: (inc as any).upvotes,
        downvotes: (inc as any).downvotes,
        is_verified: (inc as any).is_verified,
        time: `${Math.round((Date.now() - new Date(inc.created_at).getTime()) / 60000)}M AGO`,
        source: 'SYSTEM'
      }));

    const googleAlerts = [
      { id: 'g1', message: 'HEAVY TRAFFIC DETECTED', location: 'CORE ARTERY', time: 'LIVE', source: 'GOOGLE' },
      { id: 'g2', message: 'ROADWORKS SYNCED', location: 'PERIPHERAL DIVIDE', time: 'LIVE', source: 'GOOGLE' }
    ];
    setUnifiedAlerts([...dbAlerts, ...googleAlerts]);

    const missionColors = ['#F43F5E', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#6366F1'];
    const currentLivePaths = fetchedRoutes.map((r, idx) => ({
      id: r.id,
      path: r.path,
      color: missionColors[idx % missionColors.length],
      eta: r.eta ? `${Math.round(r.eta / 60)} MIN` : 'N/A'
    }));
    setLivePaths(currentLivePaths);

    // Update activeMission and eta for HUD
    const enRouteVehs = fetchedVehicles.filter(v => v.status === 'en-route');
    const primary = enRouteVehs.find(v => v.type === 'ambulance') || enRouteVehs[0];
    if (primary) {
      setActiveMission(primary);
      const route = fetchedRoutes.find(r => r.vehicle_id === primary.id);
      if (route) setEta(route.eta ? `${Math.round(route.eta / 60)} MIN` : 'N/A');
    } else {
      setActiveMission(null);
    }

    const updatedSignals = fetchedSignals.map(sig => {
      const approachingAmbulance = fetchedVehicles.find(v =>
        v.type === 'ambulance' &&
        getDistance({ lat: v.lat, lng: v.lng }, { lat: sig.lat, lng: sig.lng }) < 300
      );
      return {
        ...sig,
        state: approachingAmbulance ? 'green' : sig.state,
        corridorActive: !!approachingAmbulance
      };
    });

    setVehicles(fetchedVehicles);
    setSignals(updatedSignals);
  }, []);

  useEffect(() => {
    fetchData();
    fetchDrivers();

    const vSub = supabase.channel('v-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchData).subscribe();
    const sSub = supabase.channel('s-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'traffic_signals' }, fetchData).subscribe();
    const iSub = supabase.channel('i-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        const inc = payload.new;
        toast('🚨 EMERGENCY BROADCAST', {
          description: `NEW ${inc.type?.toUpperCase()} INCIDENT REPORTED NEAR ${inc.location_name?.toUpperCase() || 'UNKNOWN TACTICAL SECTOR'}.`,
          style: { background: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold' },
          duration: 8000
        });
      }
      fetchData();
    }).subscribe();
    const pSub = supabase.channel('p-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchDrivers).subscribe();
    const rSub = supabase.channel('routes-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, fetchData).subscribe();
    
    // Add interval to forcefully trigger the auto-resolve garbage collection every minute
    const cronLoop = setInterval(fetchData, 60000);

    return () => {
      vSub.unsubscribe();
      sSub.unsubscribe();
      iSub.unsubscribe();
      pSub.unsubscribe();
      rSub.unsubscribe();
      clearInterval(cronLoop);
    };
  }, [fetchData, fetchDrivers]);

  useEffect(() => {
    // LIVE GEOLOCATION TRACKING
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(newLoc);

        if (window.google && window.google.maps) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: newLoc }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const address = results[0].address_components;
              const sublocality = address.find(c => c.types.includes('sublocality'))?.long_name;
              const locality = address.find(c => c.types.includes('locality'))?.long_name;
              setSector(sublocality || locality || 'CENTRAL SECTOR');
            }
          });
        }
      },
      (err) => console.warn('GEOLOCATION ERROR:', err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    // Traffic Zone Polling every 5 mins
    const checkTraffic = () => {
      if (!window.google || !window.google.maps) return;
      
      const service = new google.maps.DistanceMatrixService();
      
      const origin = { lat: 28.6139, lng: 77.2090 }; // Central Ref
      const destinations = [
        { lat: 28.6304, lng: 77.2177, name: 'CONNAUGHT PLACE (C)' },
        { lat: 28.5677, lng: 77.2100, name: 'AIIMS / SOUTH (S)' },
        { lat: 28.6921, lng: 77.1528, name: 'PITAMPURA (N)' },
        { lat: 28.6280, lng: 77.2760, name: 'LAXMI NAGAR (E)' }
      ];

      service.getDistanceMatrix({
        origins: [origin],
        destinations: destinations.map(d => ({ lat: d.lat, lng: d.lng })),
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), // needed for traffic data
        }
      }, (response, status) => {
        if (status === 'OK' && response) {
          const results = response.rows[0].elements;
          let mostBusy = { name: 'CALCULATING...', ratio: 0, delayMin: 0 };
          
          const newZones = destinations.map((dest, i) => {
            const el = results[i];
            if (el.status === 'OK' && el.duration && el.duration_in_traffic) {
              const dur = el.duration.value;
              const durTraffic = el.duration_in_traffic.value;
              const ratio = durTraffic / dur;
              const delayMin = Math.round((durTraffic - dur) / 60);
              
              if (ratio > mostBusy.ratio) {
                mostBusy = { name: dest.name.split(' ')[0], ratio, delayMin };
              }
              
              return {
                name: dest.name.split(' ')[0], 
                nominal: Math.round(dur/60), 
                traffic: Math.round(durTraffic/60),
                congestionRatio: ratio
              };
            }
            return { name: dest.name.split(' ')[0], nominal: 0, traffic: 0, congestionRatio: 0 };
          });

          if (mostBusy.ratio > 0) {
            setBusyZone({ name: mostBusy.name, delay: mostBusy.delayMin });
          }
          setZoneTraffic(newZones);
        }
      });
    };

    // Delay initial check slightly to ensure Google Maps is loaded from MapContainer
    const initTimer = setTimeout(checkTraffic, 3000);
    const interval = setInterval(checkTraffic, 5 * 60 * 1000); // 5 mins
    
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
    checkTraffic();
  }, []);

  const handleResolveIncident = async (id: string) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success("INCIDENT OFFICIALLY RESOLVED");
      fetchData(); // Immediately refresh the matrix
    } catch (err: any) {
      console.error(err);
      toast.error("FAILED TO RESOLVE INCIDENT");
    }
  };

  const handleDeleteIncident = async (id: string) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success("INCIDENT REMOVED FROM SYSTEM");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("FAILED TO REMOVE INCIDENT");
    }
  };

  const activeVehicles = vehicles.filter(v => v.status !== 'idle');
  const selected = selectedVehicle ? vehicles.find(v => v.id === selectedVehicle) : null;
  const selectedInc = selectedIncident ? incidents.find(i => i.id === selectedIncident) : null;

  return (
    <div className="flex h-screen flex-col bg-slate-50 uppercase tracking-wider text-primary">
      {/* GOV STRIP */}
      <div className="bg-primary px-4 py-1 text-[10px] font-bold text-white">
        <div className="container flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            GOVERNMENT OF INDIA · TRAFFIC COORDINATION CENTER
          </span>
          <span>SECURE TERMINAL VERSION 4.0.2</span>
        </div>
      </div>

      {/* TOP BAR */}
      <header className="flex h-20 shrink-0 items-center justify-between border-b-4 border-primary bg-white px-6 shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={traffiqLogo} alt="Logo" className="h-12 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-black leading-none">TRAFFIQ</span>
              <span className="text-[10px] font-bold text-primary/60">SMART CITY INDIA · TERMINAL v2.4</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 border border-primary/10">
            <Radio className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
            <span className="text-xs font-black text-blue-600">LIVE FEED</span>
          </div>
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-2 rounded border-2 border-primary/20 px-3 py-1.5 text-xs font-bold transition-all hover:bg-primary hover:text-white"
          >
            <BarChart3 className="h-3 w-3" />
            ANALYTICS
          </button>
          <button
            onClick={() => setShowSimulator(true)}
            className="flex items-center gap-2 rounded border-2 border-primary/20 px-3 py-1.5 text-xs font-bold transition-all hover:bg-primary hover:text-white"
          >
            <Zap className="h-3 w-3" />
            SIMULATOR
          </button>
          <div className="h-10 w-px bg-primary/10 mx-2" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-black leading-none">{profile?.display_name || 'ADMIN-01'}</div>
              <div className="text-[9px] font-bold text-primary/50">AUTHORIZED PERSONNEL</div>
            </div>
            <button onClick={signOut} className="p-2 rounded hover:bg-red-50 text-red-600 transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="flex w-full md:w-96 md:max-h-full max-h-[50vh] shrink-0 flex-col md:border-r-2 border-b-2 md:border-b-0 border-primary/10 bg-white shadow-lg z-20">
          <div className="flex bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('units')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black transition-all ${activeTab === 'units' ? 'bg-white shadow-sm text-primary' : 'text-primary/40'}`}
            >
              <Car className="h-3 w-3" /> UNITS
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-primary' : 'text-primary/40'}`}
            >
              <RotateCcw className="h-3 w-3" /> HISTORY
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black transition-all ${activeTab === 'verification' ? 'bg-white shadow-sm text-primary' : 'text-primary/40'}`}
            >
              <Shield className="h-3 w-3" /> VERIFICATION
              {pendingDrivers.length > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black transition-all ${activeTab === 'alerts' ? 'bg-white shadow-sm text-primary' : 'text-primary/40'}`}
            >
              <Bell className="h-3 w-3" /> ALERTS
              {unifiedAlerts.length > 0 && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-px bg-primary/10 border-b border-primary/10">
            {[
              { label: 'UNITS', value: activeVehicles.length },
              { label: 'ALERTS', value: unifiedAlerts.length },
              { label: 'PENDING', value: pendingDrivers.length },
            ].map(stat => (
              <div key={stat.label} className="bg-white p-4 text-center">
                <div className="text-xl font-black">{stat.value}</div>
                <div className="text-[8px] font-black text-primary/40 leading-none mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50">
            {activeTab === 'units' ? (
              <>
                <div className="sticky top-0 bg-primary px-4 py-2 font-black text-[10px] text-white">
                  ACTIVE PRIORITY UNITS
                </div>
                {vehicles.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVehicle(v.id); setSelectedIncident(null); }}
                    className={`group flex w-full items-center gap-4 border-b border-primary/5 px-6 py-4 text-left transition-all hover:bg-blue-50 ${selectedVehicle === v.id ? 'bg-white border-l-8 border-primary shadow-inner' : ''}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 ${v.status === 'en-route' ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-primary/20'
                      }`}>
                      <VehicleIcon type={v.type as any} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{v.callsign}</span>
                        <span className="text-[9px] font-black text-primary/40">{v.type}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] font-bold uppercase">
                        <span className={v.status === 'en-route' ? 'text-blue-600' : 'text-primary/40'}>{v.status}</span>
                        {v.speed > 0 && <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {Math.round(v.speed)} KM/H</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            ) : activeTab === 'verification' ? (
              <>
                <div className="flex gap-4 p-4 border-b border-primary/5">
                  <button
                    onClick={() => setVerifTab('pending')}
                    className={`text-[9px] font-black tracking-[0.2em] ${verifTab === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-primary/40'}`}
                  >
                    PENDING ({pendingDrivers.length})
                  </button>
                  <button
                    onClick={() => setVerifTab('verified')}
                    className={`text-[9px] font-black tracking-[0.2em] ${verifTab === 'verified' ? 'text-primary border-b-2 border-primary' : 'text-primary/40'}`}
                  >
                    VERIFIED ({verifiedDrivers.length})
                  </button>
                </div>
                <div className="space-y-4 p-4">
                  {(verifTab === 'pending' ? pendingDrivers : verifiedDrivers).map(driver => (
                    <div key={driver.id} className="bg-white border-2 border-primary/10 p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-xs font-black">{driver.display_name?.toUpperCase()}</div>
                          <div className="text-[9px] font-bold text-primary/40 italic">{driver.user_id}</div>
                        </div>
                        <div className={`px-2 py-0.5 text-[8px] font-black rounded ${driver.is_approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {driver.is_approved ? 'VERIFIED' : 'PENDING'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-bold mb-4">
                        <div className="bg-slate-50 p-2 border border-primary/5">
                          <div className="text-primary/40 text-[7px] mb-0.5">VEHICLE TYPE</div>
                          <div>{driver.vehicle_type?.toUpperCase()}</div>
                        </div>
                        <div className="bg-slate-50 p-2 border border-primary/5">
                          <div className="text-primary/40 text-[7px] mb-0.5">REG. ID</div>
                          <div>{driver.vehicle_reg_id || 'N/A'}</div>
                        </div>
                        <div className="col-span-2 bg-slate-50 p-2 border border-primary/5">
                          <div className="text-primary/40 text-[7px] mb-0.5">LICENSE NUMBER</div>
                          <div>{driver.license_number || 'N/A'}</div>
                        </div>
                      </div>
                      {!driver.is_approved && (
                        <button
                          onClick={() => handleApprove(driver.user_id)}
                          disabled={isApproving === driver.user_id}
                          className="w-full bg-primary py-2 text-[9px] font-black text-white hover:bg-primary/90 transition-all rounded shadow-md flex items-center justify-center gap-2"
                        >
                          {isApproving === driver.user_id ? 'AUTHORIZING...' : 'VERIFY & APPROVE ACCESS'}
                        </button>
                      )}
                    </div>
                  ))}
                  {(verifTab === 'pending' ? pendingDrivers : verifiedDrivers).length === 0 && (
                    <div className="text-center py-12">
                      <Shield className="mx-auto h-8 w-8 text-primary/10 mb-2" />
                      <p className="text-[10px] font-black text-primary/40">NO {verifTab.toUpperCase()} DRIVERS FOUND</p>
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === 'alerts' ? (
              <div className="flex-1 overflow-y-auto bg-slate-50/50">
                <div className="sticky top-0 bg-primary px-4 py-2 font-black text-[10px] text-white">
                  UNIFIED ALERT LOG (GOOGLE + SYSTEM)
                </div>
                <div className="divide-y divide-primary/5">
                  {unifiedAlerts.map(alert => (
                    <div key={alert.id} className={`p-4 ${alert.source === 'GOOGLE' ? 'bg-blue-50/20' : 'bg-red-50/20'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${alert.source === 'GOOGLE' ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`} />
                        <span className="text-[10px] font-black text-primary uppercase">{alert.source} ADVISORY</span>
                      </div>
                      <div className="text-[11px] font-black leading-snug mb-1">{alert.message}</div>
                      <div className="flex items-center gap-1 mb-2 opacity-60">
                        <MapPin className="h-2 w-2" />
                        <span className="text-[8px] font-bold uppercase">{alert.location}</span>
                      </div>
                      
                      {/* Community Validation & Evidence Component */}
                      {alert.source === 'SYSTEM' && alert.image_url && (
                        <div className="my-2 border-2 border-primary/20 p-1 bg-white">
                          <img src={alert.image_url} alt="Incident Evidence" className="w-full h-32 object-cover object-center" />
                        </div>
                      )}
                      {alert.source === 'SYSTEM' && (
                        <div className="text-[9px] font-bold mb-2 flex items-center justify-between bg-white p-2 border border-primary/10">
                          <div className="flex items-center gap-3">
                            <span className="text-green-600">👍 {alert.upvotes || 0}</span>
                            <span className="text-red-600">👎 {alert.downvotes || 0}</span>
                          </div>
                          <span className={alert.is_verified ? 'text-green-600 font-black tracking-widest' : 'text-primary/40 tracking-widest'}>
                             {alert.is_verified ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2">
                        <div className="text-[8px] font-bold text-primary/40 uppercase">STRATEGIC STATUS: {alert.time}</div>
                        {alert.source === 'SYSTEM' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteIncident(alert.rawId)}
                              className="bg-white border-2 border-slate-400 text-slate-500 px-3 py-1 text-[8px] font-black hover:bg-slate-500 hover:text-white transition-colors"
                            >
                              DELETE
                            </button>
                            <button
                              onClick={() => handleResolveIncident(alert.rawId)}
                              className="bg-white border-2 border-red-500 text-red-600 px-3 py-1 text-[8px] font-black hover:bg-red-500 hover:text-white transition-colors"
                            >
                              RESOLVE
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {unifiedAlerts.length === 0 && (
                    <div className="p-8 text-center text-[10px] font-black opacity-20 uppercase">No active security alerts</div>
                  )}
                </div>
              </div>
            ) : activeTab === 'history' ? (
              <div className="flex-1 overflow-y-auto bg-slate-50/50">
                <div className="sticky top-0 bg-primary px-4 py-2 font-black text-[10px] text-white">
                  MISSION ARCHIVE (PAST RIDES)
                </div>
                <div className="divide-y divide-primary/5">
                  {pastRoutes.map(ride => (
                    <div key={ride.id} className="p-4 bg-white hover:bg-blue-50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded group-hover:bg-primary group-hover:text-white transition-colors">
                            <VehicleIcon type={ride.vehicles?.type || 'ambulance'} />
                          </div>
                          <div>
                            <div className="text-[10px] font-black">{ride.vehicles?.callsign || 'UNIT-ARCHIVE'}</div>
                            <div className="text-[8px] font-bold text-primary/40 uppercase">{ride.vehicles?.type}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black">{new Date(ride.created_at).toLocaleDateString()}</div>
                          <div className="text-[8px] font-bold text-primary/40">{new Date(ride.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded border border-primary/5 group-hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-2 text-[9px] font-black">
                          <Clock className="h-3 w-3 text-blue-600" />
                          {ride.eta ? `${Math.round(ride.eta / 60)} MIN DURATION` : 'UNCOMPLETED'}
                        </div>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all text-primary" />
                      </div>
                    </div>
                  ))}
                  {pastRoutes.length === 0 && (
                    <div className="p-12 text-center text-[10px] font-black text-primary/40 uppercase">
                      NO MISSION ARCHIVES FOUND
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {/* MAP */}
        <main className="relative flex-1 bg-white overflow-hidden">
          <MapContainer
            incidents={incidents as any}
            vehicles={vehicles as any}
            signals={signals as any}
            selectedIncident={selectedInc}
            setSelectedIncident={(inc) => setSelectedIncident(inc?.id || null)}
            userLocation={userLocation}
            livePaths={livePaths}
          />

          {/* LIVE SECTOR HUD */}
          <div className="absolute top-2 left-2 z-10 space-y-2">
            <div className="bg-primary px-4 py-2 flex items-center gap-2 border-2 border-white shadow-2xl">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-black text-white tracking-[0.2em]">COMMAND VIEW ACTIVE</span>
            </div>
            <div className="bg-white/95 p-4 border-2 border-primary shadow-2xl backdrop-blur-md">
              <div className="text-[8px] font-black text-primary/40 uppercase tracking-[0.3em] mb-1">TACTICAL SECTOR</div>
              <div className="text-sm font-black text-primary">{sector.toUpperCase()}</div>
            </div>

            {activeMission && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-red-600 p-4 border-2 border-white shadow-2xl space-y-3"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-white/20">
                  <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                  <span className="text-[10px] font-black text-white tracking-[0.2em]">EMERGENCY MISSION ACTIVE</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[8px] font-black text-white/60 uppercase">UNIT CALLSIGN</div>
                    <div className="text-lg font-black text-white">{activeMission.callsign}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black text-white/60 uppercase">ETA TO SCENE</div>
                    <div className="text-lg font-black text-white animate-pulse">{eta}</div>
                  </div>
                </div>
                <div className="bg-white/10 p-2 rounded text-[9px] font-black text-white/80 flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  OPTIMIZED ROUTE SYNCHRONIZED
                </div>
              </motion.div>
            )}
          </div>

          {/* LEGEND */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 rounded-xl bg-white/90 p-4 border-2 border-primary/10 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] font-black mb-1">SYSTEM LEGEND</div>
            {[
              { color: 'bg-primary', label: 'ACTIVE UNIT' },
              { color: 'bg-blue-500', label: 'SIGNAL: GO' },
              { color: 'bg-red-600', label: 'SIGNAL: STOP' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-sm ${l.color}`} />
                <span className="text-[9px] font-black">{l.label}</span>
              </div>
            ))}
          </div>

          {/* FLOATING DATA PANEL */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-6 left-6 w-80 overflow-hidden rounded-2xl bg-white border-4 border-primary shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]"
              >
                <div className="bg-primary p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black">{selected.callsign}</span>
                    <button onClick={() => setSelectedVehicle(null)}><X className="h-5 w-5" /></button>
                  </div>
                  <div className="text-[10px] font-bold opacity-80">{selected.type} · UNIT PROFILE</div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-[8px] font-black text-primary/40">STATUS</div>
                      <div className="text-xs font-black text-blue-600">{selected.status}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <div className="text-[8px] font-black text-primary/40">VELOCITY</div>
                      <div className="text-xs font-black">{Math.round(selected.speed)} KM/H</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-primary/40 uppercase">Global coordinates</div>
                    <div className="font-mono text-xs font-bold bg-slate-50 p-2 rounded truncate">
                      {selected.position.lat.toFixed(6)} N / {selected.position.lng.toFixed(6)} E
                    </div>
                  </div>
                  <button className="w-full bg-primary py-3 text-xs font-black text-white hover:bg-primary/90 transition-colors">
                    OPEN CHANNEL
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showSimulator && (
              <GreenCorridorSimulator 
                onClose={() => setShowSimulator(false)} 
                baseSignals={signals} 
                baseIncidents={incidents} 
                userLocation={userLocation}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showAnalytics && (
              <AnalyticsDashboard 
                onClose={() => setShowAnalytics(false)} 
                liveData={{ vehicles, incidents }} 
                userLocation={userLocation}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
