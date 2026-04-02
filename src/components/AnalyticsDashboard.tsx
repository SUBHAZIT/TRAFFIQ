import React, { useState, useEffect } from 'react';
import { ChevronDown, Play, Pause, Bus, Car, Truck, CheckCircle2, Navigation, AlertCircle, X, Clock } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  ComposedChart, Line
} from 'recharts';
import { 
  GoogleMap, useJsApiLoader, Polyline, Marker, InfoWindow, Circle 
} from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA ---
const EVENTS = [
  {
    id: 1,
    title: 'CENTRAL ARTERY → NORTHERN SECTOR',
    time: '06:27 - 09:25',
    active: true,
    resolved: false,
    stats: [
      { icon: <Bus className="h-3 w-3"/>, val: 97, color: 'bg-teal-500' },
      { icon: <Car className="h-3 w-3"/>, val: 197, color: 'bg-red-500' },
      { icon: <Truck className="h-3 w-3"/>, val: 198, color: 'bg-red-600' },
      { label: 'ALL', val: 963, color: 'bg-slate-700' }
    ]
  },
  {
    id: 2,
    title: 'WESTERN DIVIDE → PERIPHERAL',
    time: '09:12 - 10:39',
    active: false,
    resolved: false,
    stats: [
      { icon: <Bus className="h-3 w-3"/>, val: 97, color: 'bg-teal-500' },
      { icon: <Car className="h-3 w-3"/>, val: 197, color: 'bg-red-500' },
      { icon: <Truck className="h-3 w-3"/>, val: 198, color: 'bg-red-600' },
      { label: 'ALL', val: 963, color: 'bg-slate-700' }
    ]
  },
  {
    id: 3,
    title: 'TECH PARK → SOUTHERN BYPASS',
    time: '16:11 - 16:39',
    active: false,
    resolved: true,
    stats: [
      { icon: <Bus className="h-3 w-3"/>, val: 97, color: 'bg-teal-500' },
      { icon: <Car className="h-3 w-3"/>, val: 197, color: 'bg-red-500' },
      { icon: <Truck className="h-3 w-3"/>, val: 198, color: 'bg-red-600' },
      { label: 'ALL', val: 963, color: 'bg-slate-700' }
    ]
  },
  {
    id: 4,
    title: 'INDUSTRIAL BLOCK → HIGHWAY 4',
    time: '16:31 - 17:12',
    active: false,
    resolved: true,
    stats: [
      { icon: <Bus className="h-3 w-3"/>, val: 97, color: 'bg-teal-500' },
      { icon: <Car className="h-3 w-3"/>, val: 197, color: 'bg-red-500' },
      { label: 'ALL', val: 563, color: 'bg-slate-700' }
    ]
  }
];

const SPEED_FREQ_DATA = Array.from({length: 15}).map((_, i) => ({
  speed: i * 5,
  freq: Math.random() * 0.4,
  historical: (Math.random() * 0.2) + (i > 2 && i < 8 ? 0.2 : 0)
}));

const TIME_CHART_DATA = Array.from({length: 10}).map((_, i) => {
  const h = Math.floor(6 + i * 0.5);
  const m = i % 2 === 0 ? '00' : '30';
  return {
    time: `${h.toString().padStart(2, '0')}:${m}`,
    value: Math.floor(Math.random() * 15000 + 5000),
    score: Math.random() * 0.8 + 0.1,
    active: i === 4 // Highlight mid-morning
  }
});

// --- COMPONENTS ---

// Custom Gauge Map
const SpeedGauge = ({ speed }: { speed: number }) => {
  // Angle spanning -120 to +120 (240 sweep)
  // Max speed = 60
  const normalizedSpeed = Math.min(Math.max(speed, 0), 60);
  const angle = -120 + (normalizedSpeed / 60) * 240;

  return (
    <div className="relative w-full aspect-[2/1] overflow-hidden flex flex-col items-center justify-end">
      <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
        {/* Background Arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#333" strokeWidth="20" />
        {/* Red Zone (0-20) */}
        <path d="M 20 100 A 80 80 0 0 1 60 30" fill="none" stroke="#ef4444" strokeWidth="20" />
        {/* Yellow Zone (20-40) */}
        <path d="M 60 30 A 80 80 0 0 1 140 30" fill="none" stroke="#eab308" strokeWidth="20" />
        {/* Green Zone (40-60) */}
        <path d="M 140 30 A 80 80 0 0 1 180 100" fill="none" stroke="#22c55e" strokeWidth="20" />
        
        {/* Needle */}
        <g transform={`rotate(${angle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="40" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="100" r="8" fill="#fff" />
        </g>
        
        {/* Texts */}
        <text x="20" y="120" fill="#666" fontSize="12" textAnchor="middle">0</text>
        <text x="60" y="15" fill="#666" fontSize="12" textAnchor="middle">20</text>
        <text x="140" y="15" fill="#666" fontSize="12" textAnchor="middle">40</text>
        <text x="180" y="120" fill="#666" fontSize="12" textAnchor="middle">60</text>
      </svg>
      <div className="absolute -bottom-6 text-xl font-black text-white/90">{speed.toFixed(1)} km/h</div>
    </div>
  );
};

export default function AnalyticsDashboard({ onClose, liveData, userLocation }: { onClose: () => void, liveData?: any, userLocation?: { lat: number, lng: number } | null }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry'] as any,
  });

  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mapCenter, setMapCenter] = useState({ lat: 22.5726, lng: 88.3639 });
  const [playbackProgress, setPlaybackProgress] = useState(30);

  const [realEvents, setRealEvents] = useState<any[]>(EVENTS);
  const [activeEvent, setActiveEvent] = useState<any>(EVENTS[0]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !window.google) return;
    
    const checkLiveTraffic = () => {
      const service = new google.maps.DistanceMatrixService();
      
      const origin = mapCenter;
      const destinations = [
        { lat: mapCenter.lat + 0.04, lng: mapCenter.lng, name: 'NORTHERN SECTOR' },
        { lat: mapCenter.lat - 0.04, lng: mapCenter.lng, name: 'SOUTHERN BYPASS' },
        { lat: mapCenter.lat, lng: mapCenter.lng + 0.04, name: 'EASTERN ARTERY' },
        { lat: mapCenter.lat, lng: mapCenter.lng - 0.04, name: 'WESTERN DIVIDE' }
      ];

      service.getDistanceMatrix({
        origins: [origin],
        destinations: destinations.map(d => ({ lat: d.lat, lng: d.lng })),
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), 
        }
      }, (response, status) => {
        if (status === 'OK' && response) {
          const results = response.rows[0].elements;
          
          const newEvents = destinations.map((dest, i) => {
            const el = results[i];
            const dur = el?.duration?.value || 600;
            const durTraffic = el?.duration_in_traffic?.value || dur;
            const delay = durTraffic - dur;
            const isResolved = delay < 120; // less than 2 mins delay = resolved
            
            return {
              id: i + 1,
              title: `CENTRAL NODE → ${dest.name}`,
              time: `${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - LIVE`,
              active: false,
              resolved: isResolved,
              stats: [
                { icon: <Bus className="h-3 w-3"/>, val: Math.floor(Math.random() * 50) + 10, color: 'bg-teal-500' },
                { icon: <Car className="h-3 w-3"/>, val: Math.floor(durTraffic / 10), color: isResolved ? 'bg-green-500' : 'bg-red-500' },
                { label: 'DEL', val: Math.round(delay/60), color: 'bg-slate-700' }
              ],
              progress: Math.min(100, Math.max(0, (dur / durTraffic) * 100))
            };
          });

          setRealEvents(newEvents);
          // Set active event to the one with the most traffic delay initially if no active event is explicitly interacted with
          setActiveEvent(prev => prev && prev.id !== 1 ? prev : [...newEvents].sort((a,b) => b.stats[2].val - a.stats[2].val)[0]);
        }
      });
    };

    const initTimer = setTimeout(checkLiveTraffic, 2000); // 2 second delay to let map instance mount calmly
    const interval = setInterval(checkLiveTraffic, 5 * 60 * 1000); // 5 mins
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [isLoaded, mapCenter]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#121212] text-slate-300 font-sans overflow-hidden"
    >
      {/* HEADER */}
      <header className="h-12 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between px-6 shrink-0">
        <div className="text-sm font-bold text-slate-200">Congestion Event Analysis Using Bus Trajectories</div>
        <div className="flex gap-4 items-center">
          <span className="text-xs text-slate-500 hover:text-white cursor-pointer transition-colors">About</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="flex-1 grid grid-cols-12 gap-1 p-1 overflow-hidden bg-[#0a0a0a]">
        
        {/* LEFT PANEL */}
        <aside className="col-span-3 bg-[#1e1e1e] flex flex-col overflow-hidden rounded-bl-lg">
          {/* Dropdown */}
          <div className="p-4 border-b border-[#333]">
            <div className="bg-white text-black px-3 py-2 rounded flex justify-between items-center text-sm font-bold cursor-pointer">
              {currentDate}
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Congestion Events
              <br/>
              <span className="text-[10px] text-slate-500 font-normal normal-case">{realEvents.length} events detected</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {realEvents.map(ev => (
              <div 
                key={ev.id} 
                onClick={() => setActiveEvent(ev)}
                className={`p-4 border-l-4 cursor-pointer transition-colors ${
                  activeEvent.id === ev.id ? 'bg-[#2980b9] border-red-500' : 'hover:bg-[#252525] border-transparent'
                }`}
              >
                <div className={`font-bold text-sm mb-1 ${activeEvent.id === ev.id ? 'text-white' : 'text-slate-200'}`}>
                  {ev.title}
                </div>
                <div className={`flex items-center justify-between text-xs mb-3 ${activeEvent.id === ev.id ? 'text-blue-100' : 'text-slate-400'}`}>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {ev.time}</span>
                  {ev.resolved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
                
                {/* Horizontal Congestion Bar */}
                <div className="relative h-2 w-full bg-slate-800 rounded-full mb-3 overflow-hidden">
                  {/* Traffic gradient: Green - Orange - Red */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-orange-500 to-red-600" style={{ width: '80%' }}></div>
                  <div className="absolute top-0 bottom-0 w-8 border-x-2 border-white/50 bg-black/20" style={{ left: `${ev.progress || 30}%` }}></div>
                </div>
                
                <div className="flexItems-center space-x-2 flex text-[9px] font-bold text-white">
                  {ev.stats.map((s, idx) => (
                    <div key={idx} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${s.color}`}>
                      {s.icon || s.label} <span>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER PANEL */}
        <main className="col-span-6 flex flex-col gap-1 overflow-hidden">
          {/* Map Layer */}
          <div className="relative flex-1 bg-[#1e1e1e] rounded-t-sm border border-[#333] overflow-hidden">
            {isLoaded ? (
               <GoogleMap
                 mapContainerStyle={{ width: '100%', height: '100%' }}
                 center={mapCenter}
                 zoom={9}
                 options={{
                   disableDefaultUI: true,
                   styles: [
                     { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                     { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                     { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                     {
                       featureType: 'water',
                       elementType: 'geometry',
                       stylers: [{ color: '#17263c' }],
                     },
                     {
                       featureType: 'road',
                       elementType: 'geometry',
                       stylers: [{ color: '#38414e' }],
                     },
                     {
                       featureType: 'road',
                       elementType: 'geometry.stroke',
                       stylers: [{ color: '#212a37' }],
                     }
                   ]
                 }}
               >
                 {/* 100km Radius Marker */}
                 <Circle 
                   center={mapCenter} 
                   radius={100000} 
                   options={{ 
                     strokeColor: '#ef4444', 
                     strokeOpacity: 0.5, 
                     strokeWeight: 2, 
                     fillColor: '#ef4444', 
                     fillOpacity: 0.05 
                   }} 
                 />

                 {/* Polyline Route */}
                 <Polyline 
                   path={[
                     { lat: mapCenter.lat, lng: mapCenter.lng },
                     { lat: mapCenter.lat - 0.013, lng: mapCenter.lng + 0.013 },
                     { lat: mapCenter.lat - 0.023, lng: mapCenter.lng + 0.023 },
                     { lat: mapCenter.lat - 0.038, lng: mapCenter.lng + 0.043 }
                   ]}
                   options={{
                     strokeColor: '#ef4444',
                     strokeWeight: 4,
                     strokeOpacity: 0.9
                   }}
                 />
                 {/* Markers */}
                 <Marker position={{ lat: mapCenter.lat, lng: mapCenter.lng }} icon={{ path: 0, scale: 8, fillColor: '#22c55e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }} />
                 <Marker position={{ lat: mapCenter.lat - 0.038, lng: mapCenter.lng + 0.043 }} icon={{ path: 0, scale: 8, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }} />
                 {/* Incidents (mock offset) */}
                 <Marker position={{ lat: mapCenter.lat - 0.013, lng: mapCenter.lng + 0.013 }} icon={{ path: 0, scale: 6, fillColor: 'transparent', fillOpacity: 1, strokeColor: '#ef4444', strokeWeight: 3 }} />
                 
                 {/* Dynamic Live Data Incidents */}
                 {liveData?.incidents?.slice(0, 5).map((inc: any) => (
                   <Marker key={inc.id} position={{ lat: inc.latitude, lng: inc.longitude }} icon={{ path: 0, scale: 5, fillColor: 'transparent', fillOpacity: 0.8, strokeColor: '#f59e0b', strokeWeight: 2 }} />
                 ))}
                 
                 <InfoWindow position={{ lat: mapCenter.lat - 0.018, lng: mapCenter.lng + 0.018 }}>
                   <div className="p-1 text-[#333] max-w-[200px]">
                     <h3 className="font-bold text-sm mb-1">Heavy Traffic</h3>
                     <p className="text-xs mb-1">Severe congestion detected along primary vector routing within regional sector.</p>
                     <div className="text-[9px] text-gray-500 italic text-right border-t pt-1">published on {currentTime.toLocaleTimeString()}</div>
                   </div>
                 </InfoWindow>
               </GoogleMap>
            ) : (
               <div className="w-full h-full flex items-center justify-center">LOADING MAPS ENGINE...</div>
            )}

            {/* Map Legend Overlay */}
            <div className="absolute top-4 right-4 bg-white/95 text-black p-3 rounded shadow-xl text-xs font-bold space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-500"/> recent incident</div>
                <div className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-gray-400"/> past incident</div>
                <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full border-2 border-green-500" /> origin</div>
                <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full border-2 border-red-500" /> destination</div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t text-blue-600">
                <div className="h-1 w-6 bg-blue-500"></div>
                Congestion mentioned in tweet
              </div>
            </div>
          </div>

          {/* Bottom Deck */}
          <div className="h-48 grid grid-cols-2 gap-1 rounded-b-sm">
            {/* Clock Deck */}
            <div className="bg-[#1e1e1e] border border-[#333] flex flex-col items-center justify-center p-6">
              <div className="text-[5rem] font-medium leading-none text-slate-200 font-mono tracking-tighter mb-4 shadow-inner">
                {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-slate-500">{currentDate}</div>
            </div>
            {/* Speed Gauge Deck */}
            <div className="bg-[#1e1e1e] border border-[#333] flex items-center justify-center p-6 relative">
              <SpeedGauge speed={13.6} />
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: CHARTS */}
        <aside className="col-span-3 flex flex-col gap-1 rounded-br-lg overflow-hidden">
          
          {/* Chart 1: Speed Config */}
          <div className="bg-[#1e1e1e] flex-1 border border-[#333] p-4 flex flex-col">
            <h3 className="text-xs text-slate-400 mb-4 flex justify-between">
              Observed Speed Frequency
              <div className="flex items-center gap-1 text-[10px] text-red-500"><div className="h-px w-3 bg-red-500"></div> historical</div>
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={SPEED_FREQ_DATA} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                  <CartesianGrid stroke="#333" vertical={false} />
                  <XAxis dataKey="speed" tick={{ fill: '#777', fontSize: 10 }} stroke="#444" tickLine={false} />
                  <YAxis tick={{ fill: '#777', fontSize: 10 }} stroke="#444" tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                  <Bar dataKey="freq" fill="#1e3a8a" barSize={16} />
                  <Line type="monotone" dataKey="historical" stroke="#ef4444" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Bus Movement */}
          <div className="bg-[#1e1e1e] flex-1 border border-[#333] p-4 flex flex-col">
            <h3 className="text-xs text-slate-400 mb-4">Observed Bus Movement</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TIME_CHART_DATA} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid stroke="#333" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#777', fontSize: 10 }} stroke="#444" tickLine={false} />
                  <YAxis tick={{ fill: '#777', fontSize: 10 }} stroke="#444" tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                  <Bar dataKey="value" barSize={20}>
                    {TIME_CHART_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.active ? '#ef4444' : '#1e3a8a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Congestion Score */}
          <div className="bg-[#1e1e1e] flex-1 border border-[#333] p-4 flex flex-col">
            <h3 className="text-xs text-slate-400 mb-4">Congestion Score</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TIME_CHART_DATA} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                  <CartesianGrid stroke="#333" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#777', fontSize: 10 }} stroke="#444" tickLine={false} />
                  <YAxis tick={{ fill: '#777', fontSize: 10 }} stroke="#444" tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                  <Bar dataKey="score" barSize={20}>
                    {TIME_CHART_DATA.map((entry, index) => (
                      <Cell key={`score-${index}`} fill={entry.active ? '#ef4444' : '#1e3a8a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </aside>
      </div>
    </motion.div>
  );
}
