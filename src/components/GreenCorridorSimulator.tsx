import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause, Zap, Clock, Shield, Siren, Activity, Car } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { supabase } from '@/integrations/supabase/client';
import MapContainer from '@/components/MapContainer';
import { toast } from 'sonner';

interface GreenCorridorSimulatorProps {
  onClose: () => void;
  baseSignals: any[];
  baseIncidents: any[];
  userLocation?: { lat: number; lng: number } | null;
}

function getDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const R = 6371e3; // metres
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function GreenCorridorSimulator({ onClose, baseSignals, baseIncidents, userLocation }: GreenCorridorSimulatorProps) {
  const [activeRoutes, setActiveRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [timeRemaining, setTimeRemaining] = useState(180); // seconds, default 3m
  const [isCorridorActive, setIsCorridorActive] = useState(false);
  
  const [simVehicles, setSimVehicles] = useState<any[]>([]);
  const [simSignals, setSimSignals] = useState<any[]>(baseSignals);

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  useEffect(() => {
    async function fetchRoutes() {
      const { data, error } = await supabase
        .from('routes')
        .select('*, vehicles(callsign, type)')
        .eq('active', true);
      
      if (data && data.length > 0) {
        setActiveRoutes(data);
        setSelectedRoute(data[0]);
      } else {
        toast.error('NO ACTIVE ROUTES FOUND FOR SIMULATION');
      }
    }
    fetchRoutes();
  }, []);

  // Generate initial civilian traffic
  useEffect(() => {
    if (!selectedRoute) return;
    
    // Create random civilian cars near the route area
    const path = selectedRoute.path;
    if (!path || path.length === 0) return;
    
    const centerLat = path[Math.floor(path.length / 2)].lat;
    const centerLng = path[Math.floor(path.length / 2)].lng;
    
    const civilians = Array.from({ length: 40 }).map((_, i) => ({
      id: `CIV-${i}`,
      type: 'civilian',
      status: 'idle',
      speed: Math.random() * 40 + 20,
      position: {
        lat: centerLat + (Math.random() - 0.5) * 0.05,
        lng: centerLng + (Math.random() - 0.5) * 0.05
      },
      lat: centerLat + (Math.random() - 0.5) * 0.05,
      lng: centerLng + (Math.random() - 0.5) * 0.05,
    }));
    
    setSimVehicles(civilians);
    setSimSignals(baseSignals);
    setProgress(0);
    setTimeRemaining(180);
    setIsCorridorActive(false);
    setIsPlaying(false);
  }, [selectedRoute, baseSignals]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
    if (!isPlaying) {
      lastTimeRef.current = performance.now();
      requestAnimationFrame(runSimulation);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  };

  const runSimulation = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Simulation runs 1 real second = roughly 1 simulation second
    // For visual speed, we might want it to be slightly faster
    const timeSpeedup = 1.0; 
    
    setTimeRemaining((prev) => {
      const newTime = prev - (deltaTime / 1000) * timeSpeedup;
      if (newTime <= 0) return 0;
      return newTime;
    });

    setProgress((prev) => {
      // 180 seconds total
      const newProgress = prev + (deltaTime / 1000) * timeSpeedup / 180;
      return newProgress >= 1 ? 1 : newProgress;
    });

    animationRef.current = requestAnimationFrame(runSimulation);
  };

  useEffect(() => {
    if (timeRemaining <= 0 || progress >= 1) {
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      toast.success("SIMULATION COMPLETE: VEHICLE REACHED DESTINATION");
    }
  }, [timeRemaining, progress]);

  // Update simulator state per frame
  useEffect(() => {
    if (!selectedRoute || !selectedRoute.path || selectedRoute.path.length === 0) return;
    
    const path = selectedRoute.path;
    const totalSegments = path.length - 1;
    const currentFloatIndex = progress * totalSegments;
    const currentIndex = Math.min(Math.floor(currentFloatIndex), totalSegments - 1);
    const nextIndex = Math.min(currentIndex + 1, totalSegments);
    const segmentProgress = currentFloatIndex - currentIndex;

    const p1 = path[currentIndex];
    const p2 = path[nextIndex];

    const currentLat = p1.lat + (p2.lat - p1.lat) * segmentProgress;
    const currentLng = p1.lng + (p2.lng - p1.lng) * segmentProgress;

    const ev = {
      id: selectedRoute.vehicle_id || 'SIM-EV',
      type: 'ambulance', // Ensure Lottie icon gets triggered
      callsign: selectedRoute.vehicles?.callsign || 'SIM-EV',
      status: 'en-route',
      speed: 80,
      position: { lat: currentLat, lng: currentLng },
      lat: currentLat,
      lng: currentLng
    };

    // Corridor logic: ETA < 2 mins (120 seconds)
    const shouldCorridorBeActive = timeRemaining <= 120 && timeRemaining > 0;
    
    if (shouldCorridorBeActive && !isCorridorActive) {
      setIsCorridorActive(true);
      toast.success("GREEN CORRIDOR PROTOCOL INITIATED. ETA < 2:00. ALL LIGHTS EN-ROUTE: GREEN");
    }

    // Update Signals
    const newSignals = baseSignals.map(sig => {
      // If signal is close to the active route, turn it green during active corridor
      const isNearRoute = path.some((p: any) => getDistance(p, { lat: sig.lat || sig.position.lat, lng: sig.lng || sig.position.lng }) < 1000);
      
      if (shouldCorridorBeActive) {
        if (isNearRoute) {
          return { ...sig, state: 'green', corridorActive: true };
        } else {
          return { ...sig, state: 'red', corridorActive: false };
        }
      }
      return sig;
    });

    // Update civilians (just give them a gentle random jiggle to look alive)
    const updatedCivilians = simVehicles.filter(v => v.type === 'civilian').map(v => ({
      ...v,
      lat: v.lat + (Math.random() - 0.5) * 0.0001,
      lng: v.lng + (Math.random() - 0.5) * 0.0001,
    }));

    setSimVehicles([ev, ...updatedCivilians]);
    setSimSignals(newSignals);

  }, [progress, timeRemaining]); // Do NOT include baseSignals/simVehicles explicitly or it causes endless loops

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rs = Math.floor(secs % 60);
    return `${mins}:${rs.toString().padStart(2, '0')}`;
  };

  const livePaths = selectedRoute ? [{
    id: selectedRoute.id,
    path: selectedRoute.path,
    color: '#3B82F6',
    eta: formatTime(timeRemaining)
  }] : [];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between border-b-2 border-primary">
        <div className="flex items-center gap-4">
          <div className="bg-green-500/20 p-2 rounded border border-green-500">
            <Zap className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-green-400">Green Corridor Simulator</h2>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">TACTICAL PRE-CALCULATION SYSTEM</div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative border-r-2 border-slate-700">
          <MapContainer 
            vehicles={simVehicles}
            signals={simSignals}
            incidents={baseIncidents}
            livePaths={livePaths as any}
            center={simVehicles.length > 0 ? { lat: simVehicles[0].lat, lng: simVehicles[0].lng } : (selectedRoute?.path?.[0] || userLocation || null)}
          />
          
          {/* Overlays */}
          <div className="absolute top-4 left-4 flex flex-col gap-4 max-w-sm w-full">
            <div className={`p-6 rounded-2xl border-2 backdrop-blur-xl shadow-2xl transition-all duration-500 ${isCorridorActive ? 'bg-green-500/90 border-green-400/50 shadow-[#22c55e_0px_0px_50px]' : 'bg-slate-900/80 border-slate-700/50'}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Clock className={`h-6 w-6 ${isCorridorActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className={`text-xs font-black tracking-widest uppercase ${isCorridorActive ? 'text-white/80' : 'text-slate-400'}`}>SIMULATED ETA</span>
                </div>
                <div className={`px-3 py-1 rounded text-xs font-bold ${isCorridorActive ? 'bg-white text-green-600' : 'bg-slate-800 text-slate-300'}`}>
                  {isCorridorActive ? 'CORRIDOR ACTIVE' : 'NOMINAL'}
                </div>
              </div>
              
              <div className="text-center font-mono text-[4rem] leading-none font-black text-white tracking-widest mb-6">
                {formatTime(timeRemaining)}
              </div>

              <div className="bg-black/20 rounded-xl p-4 flex justify-between items-center text-white text-xs font-bold">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 opacity-50" />
                  <span>CIVILIAN TRAFFIC</span>
                </div>
                <span>{isCorridorActive ? 'HALTED' : 'NORMAL FLOW'}</span>
              </div>
            </div>
            
            {selectedRoute && (
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-500/20 shadow-inner border border-blue-500/50 p-1.5 rounded w-12 h-12 flex items-center justify-center">
                    <DotLottieReact
                      src="https://lottie.host/757ee603-1ccc-42ad-a9c2-40aea527944c/oI7Qtwq0sh.lottie"
                      loop
                      autoplay
                    />
                  </div>
                  <div>
                    <div className="text-xs font-black">UNIT {selectedRoute.vehicles?.callsign}</div>
                    <div className="text-[10px] text-blue-400 font-bold tracking-widest">{selectedRoute.vehicles?.type.toUpperCase()}</div>
                  </div>
                </div>
              </div>
            )}
            
            {isCorridorActive && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/90 backdrop-blur-md border-2 border-red-400 p-4 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.5)] text-white"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="h-5 w-5 animate-pulse" />
                  <div className="text-sm font-black tracking-widest">TACTICAL OVERRIDE</div>
                </div>
                <div className="text-xs font-bold text-red-100">
                  INTERSECTIONS SECURED. CIVILIAN TRAFFIC LIGHTS RED. CORRIDOR PATH GREEN.
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-slate-800 flex flex-col items-stretch p-6">
          <h3 className="text-sm font-black tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            SIMULATION CONTROL
          </h3>

          <div className="space-y-4 mb-8">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Select Route for Simulation</label>
            <div className="space-y-2">
              {activeRoutes.map(route => (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedRoute?.id === route.id ? 'bg-blue-500/10 border-blue-500' : 'bg-slate-700 border-slate-600 hover:border-slate-500'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-white">{route.vehicles?.callsign || 'PRIORITY ROUTE'}</span>
                    <span className="text-xs font-bold text-blue-400">{route.vehicles?.type.toUpperCase()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">ID: {route.id.split('-')[0]}...</div>
                </button>
              ))}
              {activeRoutes.length === 0 && (
                <div className="text-xs text-slate-500 p-4 bg-slate-900 rounded-xl text-center font-bold">
                  NO ACTIVE ROUTES FOUND
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <button
              onClick={togglePlay}
              disabled={!selectedRoute}
              className={`w-full py-4 rounded-xl font-black tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
                isPlaying 
                  ? 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] text-amber-950'
                  : 'bg-green-500 hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] text-green-950'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isPlaying ? (
                <><Pause className="h-5 w-5" /> PAUSE SIMULATION</>
              ) : (
                <><Play className="h-5 w-5" /> START SIMULATION</>
              )}
            </button>
            
            <button
              onClick={() => {
                setProgress(0);
                setTimeRemaining(180);
                setIsCorridorActive(false);
                setSimSignals(baseSignals);
              }}
              className="w-full py-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black tracking-widest text-sm transition-all"
            >
              RESET 
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
