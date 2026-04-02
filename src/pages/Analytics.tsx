import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Activity, AlertTriangle, Car, Clock, TrendingUp, BarChart3, LogOut, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import traffiqLogo from '@/assets/TRAFFIQ LOGO.png';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { useJsApiLoader } from '@react-google-maps/api';

const responseTimeData = [
  { month: 'JAN', avg: 4.8, target: 3.0 },
  { month: 'FEB', avg: 4.5, target: 3.0 },
  { month: 'MAR', avg: 4.2, target: 3.0 },
  { month: 'APR', avg: 3.9, target: 3.0 },
  { month: 'MAY', avg: 3.5, target: 3.0 },
  { month: 'JUN', avg: 3.2, target: 3.0 },
];

export default function Analytics() {
  const { profile, signOut } = useAuth();
  
  const [kpis, setKpis] = useState([
    { label: 'AVG RESPONSE TIME', value: '3.2 MIN', change: '-12%', icon: Clock, positive: true },
    { label: 'ACTIVE INCIDENTS', value: '0', change: '+0', icon: AlertTriangle, positive: false },
    { label: 'VEHICLES DEPLOYED', value: '0', change: '+0', icon: Car, positive: true },
    { label: 'GREEN CORRIDORS', value: '0', change: '+0', icon: Activity, positive: true },
  ]);

  const [incidentData, setIncidentData] = useState<any[]>([]);
  const [vehicleUtilData, setVehicleUtilData] = useState<any[]>([]);
  const [trafficData, setTrafficData] = useState<any[]>([]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'] as any,
  });

  useEffect(() => {
    const fetchSupabaseData = async () => {
      const { data: iData } = await supabase.from('incidents').select('*');
      const { data: vData } = await supabase.from('vehicles').select('*');
      const { data: sData } = await supabase.from('traffic_signals').select('*');
      
      const rawIncidents = iData || [];
      const rawVehicles = vData || [];
      const rawSignals = sData || [];
      
      // KPI Calculation
      const activeIncidents = rawIncidents.filter(i => !i.resolved_at).length;
      const activeVehicles = rawVehicles.filter(v => v.status !== 'idle').length;
      const corridors = rawSignals.filter(s => s.corridorActive).length; 

      setKpis([
        { label: 'AVG RESPONSE TIME', value: '3.2 MIN', change: '-12%', icon: Clock, positive: true },
        { label: 'ACTIVE INCIDENTS', value: activeIncidents.toString(), change: `LIVE`, icon: AlertTriangle, positive: false },
        { label: 'VEHICLES DEPLOYED', value: activeVehicles.toString(), change: `LIVE`, icon: Car, positive: true },
        { label: 'GREEN CORRIDORS', value: corridors.toString(), change: `LIVE`, icon: Activity, positive: true },
      ]);

      // Categories
      const counts: Record<string, number> = {};
      rawIncidents.forEach(i => {
         const t = i.type.toUpperCase();
         counts[t] = (counts[t] || 0) + 1;
      });
      const indD = Object.entries(counts).map(([type, count]) => ({ type, count }));
      setIncidentData(indD.length > 0 ? indD : [
        { type: 'ACCIDENT', count: 0 },
        { type: 'FIRE', count: 0 },
        { type: 'MEDICAL', count: 0 },
        { type: 'CONGESTION', count: 0 },
        { type: 'ROADBLOCK', count: 0 }
      ]);

      // Vehicle Utilization by Live Status
      const activeVCount = { ambulance: 0, fire: 0, police: 0 };
      const standbyVCount = { ambulance: 0, fire: 0, police: 0 };
      
      rawVehicles.forEach(v => {
         if (v.status === 'idle') {
           if (v.type in standbyVCount) (standbyVCount as any)[v.type]++;
         } else {
           if (v.type in activeVCount) (activeVCount as any)[v.type]++;
         }
      });
      
      setVehicleUtilData([
         { status: 'ON-DUTY', ...activeVCount },
         { status: 'STANDBY', ...standbyVCount }
      ]);
    };
    
    fetchSupabaseData();
    const interval = setInterval(fetchSupabaseData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoaded || !window.google || !window.google.maps) return;
    
    const fetchTraffic = () => {
      const service = new google.maps.DistanceMatrixService();
      const origin = { lat: 28.6139, lng: 77.2090 }; // Center CP
      const destinations = [
        { lat: 28.6304, lng: 77.2177, name: 'CONNAUGHT PL' },
        { lat: 28.5677, lng: 77.2100, name: 'AIIMS / SOUTH' },
        { lat: 28.6921, lng: 77.1528, name: 'PITAMPURA' },
        { lat: 28.6280, lng: 77.2760, name: 'LAXMI NAGAR' },
        { lat: 28.5245, lng: 77.1855, name: 'QUTUB MINAR' }
      ];
      
      service.getDistanceMatrix({
        origins: [origin],
        destinations: destinations.map(d => ({ lat: d.lat, lng: d.lng })),
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date() }
      }, (response, status) => {
        if (status === 'OK' && response) {
          const results = response.rows[0].elements;
          const newZones = destinations.map((dest, i) => {
            const el = results[i];
            if (el.status === 'OK' && el.duration && el.duration_in_traffic) {
               const nominal = el.duration.value;
               const traffic = el.duration_in_traffic.value;
               const congestionPercent = Math.round((traffic / nominal - 1) * 100);
               return { sector: dest.name, congestion: Math.max(0, congestionPercent) };
            }
            return { sector: dest.name, congestion: 0 };
          });
          setTrafficData(newZones);
        }
      });
    };

    fetchTraffic();
    const mapInterval = setInterval(fetchTraffic, 60000); // every minute
    return () => clearInterval(mapInterval);
  }, [isLoaded]);

  return (
    <div className="flex h-screen flex-col bg-slate-50 uppercase tracking-widest text-primary">
      {/* GOV STRIP */}
      <div className="bg-primary px-4 py-1 text-[10px] font-bold text-white">
        <div className="container flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            GOVERNMENT OF INDIA · DATA ANALYTICS DIVISION
          </span>
          <span>SYSTEM TIME: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <header className="flex h-20 shrink-0 items-center justify-between border-b-4 border-primary bg-white px-6 shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={traffiqLogo} alt="Logo" className="h-12 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-black leading-none text-primary">TRAFFIQ</span>
              <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">NETWORK ANALYTICS ENGINE</span>
            </div>
          </Link>
        </div>
        <button onClick={signOut} className="flex items-center gap-2 rounded border-2 border-primary/20 px-4 py-1.5 text-xs font-black transition-all hover:bg-primary hover:text-white">
          <LogOut className="h-4 w-4" /> LOGOUT
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border-b-8 border-primary p-6 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <kpi.icon className="h-5 w-5 text-primary" />
                  <span className={`text-[10px] font-black ${kpi.positive ? 'text-blue-600' : 'text-red-600'}`}>
                    {kpi.change}
                  </span>
                </div>
                <div className="mt-4 text-3xl font-black text-primary">{kpi.value}</div>
                <div className="mt-1 text-[9px] font-black text-primary/40">{kpi.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Charts Card */}
            {[
              { title: 'RESPONSE TIME TREND (MONTHLY)', icon: TrendingUp, type: 'area', data: responseTimeData },
              { title: 'LIFETIME INCIDENTS BY CATEGORY', icon: BarChart3, type: 'bar', data: incidentData },
              { title: 'LIVE VEHICLE STATUS', icon: Car, type: 'stack', data: vehicleUtilData },
              { title: 'LIVE SECTOR CONGESTION (%)', icon: Activity, type: 'barTraffic', data: trafficData },
            ].map((chart, i) => (
              <div key={chart.title} className="bg-white border-2 border-primary/10 p-6 shadow-lg">
                <h3 className="mb-6 flex items-center gap-3 text-xs font-black tracking-widest text-primary">
                  <chart.icon className="h-4 w-4" />
                  {chart.title}
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === 'bar' ? (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="type" tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <YAxis tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#003366" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : chart.type === 'barTraffic' ? (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="sector" tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <YAxis tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip />
                        <Bar dataKey="congestion" fill="#0055AA" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : chart.type === 'stack' ? (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="status" tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <YAxis tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <Tooltip />
                        <Bar dataKey="ambulance" stackId="a" fill="#003366" />
                        <Bar dataKey="fire" stackId="a" fill="#0066FF" />
                        <Bar dataKey="police" stackId="a" fill="#002244" />
                      </BarChart>
                    ) : (
                      <AreaChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="month" tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <YAxis tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <Tooltip />
                        <defs>
                          <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#003366" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#003366" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="avg" stroke="#003366" strokeWidth={3} fill={`url(#grad-${i})`} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
