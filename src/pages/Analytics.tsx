import { useState } from 'react';
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

const responseTimeData = [
  { month: 'JAN', avg: 4.8, target: 3.0 },
  { month: 'FEB', avg: 4.5, target: 3.0 },
  { month: 'MAR', avg: 4.2, target: 3.0 },
  { month: 'APR', avg: 3.9, target: 3.0 },
  { month: 'MAY', avg: 3.5, target: 3.0 },
  { month: 'JUN', avg: 3.2, target: 3.0 },
];

const incidentData = [
  { type: 'ACCIDENT', count: 127, color: '#003366' },
  { type: 'FIRE', count: 43, color: '#004488' },
  { type: 'MEDICAL', count: 89, color: '#0055AA' },
  { type: 'CONGESTION', count: 234, color: '#0066FF' },
  { type: 'ROADBLOCK', count: 56, color: '#002244' },
];

const vehicleUtilData = [
  { hour: '00', ambulance: 2, fire: 1, police: 3 },
  { hour: '04', ambulance: 1, fire: 0, police: 2 },
  { hour: '08', ambulance: 5, fire: 2, police: 6 },
  { hour: '12', ambulance: 4, fire: 3, police: 5 },
  { hour: '16', ambulance: 6, fire: 2, police: 7 },
  { hour: '20', ambulance: 3, fire: 1, police: 4 },
];

const trafficData = [
  { time: '06:00', congestion: 20 },
  { time: '07:00', congestion: 45 },
  { time: '08:00', congestion: 78 },
  { time: '09:00', congestion: 92 },
  { time: '10:00', congestion: 65 },
  { time: '11:00', congestion: 55 },
  { time: '12:00', congestion: 60 },
  { time: '13:00', congestion: 50 },
  { time: '14:00', congestion: 45 },
  { time: '15:00', congestion: 55 },
  { time: '16:00', congestion: 70 },
  { time: '17:00', congestion: 88 },
  { time: '18:00', congestion: 95 },
  { time: '19:00', congestion: 75 },
  { time: '20:00', congestion: 40 },
  { time: '21:00', congestion: 25 },
];

const kpis = [
  { label: 'AVG RESPONSE TIME', value: '3.2 MIN', change: '-12%', icon: Clock, positive: true },
  { label: 'ACTIVE INCIDENTS', value: '14', change: '+3', icon: AlertTriangle, positive: false },
  { label: 'VEHICLES DEPLOYED', value: '23', change: '+5', icon: Car, positive: true },
  { label: 'GREEN CORRIDORS', value: '7', change: '+2', icon: Activity, positive: true },
];

export default function Analytics() {
  const { profile, signOut } = useAuth();

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
          <Link to="/" className="flex items-center gap-2">
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
              { title: 'RESPONSE TIME TREND', icon: TrendingUp, type: 'area', data: responseTimeData },
              { title: 'INCIDENTS BY CATEGORY', icon: BarChart3, type: 'bar', data: incidentData },
              { title: 'VEHICLE UTILIZATION', icon: Car, type: 'stack', data: vehicleUtilData },
              { title: 'TRAFFIC PATTERNS', icon: Activity, type: 'area', data: trafficData },
            ].map((chart, i) => (
              <div key={chart.title} className="bg-white border-2 border-primary/10 p-6 shadow-lg">
                <h3 className="mb-6 flex items-center gap-3 text-xs font-black tracking-widest text-primary">
                  <chart.icon className="h-4 w-4" />
                  {chart.title}
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === 'bar' ? (
                      <BarChart data={incidentData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="type" tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <YAxis tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#003366" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : chart.type === 'stack' ? (
                      <BarChart data={vehicleUtilData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="hour" tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <YAxis tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <Tooltip />
                        <Bar dataKey="ambulance" stackId="a" fill="#003366" />
                        <Bar dataKey="fire" stackId="a" fill="#0066FF" />
                        <Bar dataKey="police" stackId="a" fill="#002244" />
                      </BarChart>
                    ) : (
                      <AreaChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey={chart.data === trafficData ? 'time' : 'month'} tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <YAxis tick={{ fill: '#003366', fontSize: 10, fontWeight: 900 }} />
                        <Tooltip />
                        <defs>
                          <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#003366" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#003366" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey={chart.data === trafficData ? 'congestion' : 'avg'} stroke="#003366" strokeWidth={3} fill={`url(#grad-${i})`} />
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
