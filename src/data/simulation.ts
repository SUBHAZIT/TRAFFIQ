import { Vehicle, Incident, TrafficSignal, RoadSegment, SystemStats } from '@/types/traffic';

// City grid centered around a fictional metro area
const CITY_CENTER = { lat: 28.6139, lng: 77.2090 }; // New Delhi coordinates

export const initialVehicles: Vehicle[] = [
  {
    id: 'AMB-001',
    type: 'ambulance',
    callsign: 'MEDIC-7',
    position: { lat: 28.6200, lng: 77.2150 },
    speed: 0,
    status: 'idle',
    priority: 3,
  },
  {
    id: 'AMB-002',
    type: 'ambulance',
    callsign: 'MEDIC-12',
    position: { lat: 28.6050, lng: 77.1980 },
    speed: 45,
    status: 'en-route',
    destination: { lat: 28.6300, lng: 77.2200 },
    eta: 340,
    priority: 3,
  },
  {
    id: 'FIR-001',
    type: 'fire',
    callsign: 'ENGINE-4',
    position: { lat: 28.6280, lng: 77.2020 },
    speed: 35,
    status: 'dispatched',
    destination: { lat: 28.6100, lng: 77.2250 },
    eta: 480,
    priority: 2,
  },
  {
    id: 'POL-001',
    type: 'police',
    callsign: 'UNIT-22',
    position: { lat: 28.6100, lng: 77.2120 },
    speed: 55,
    status: 'en-route',
    destination: { lat: 28.6180, lng: 77.2300 },
    eta: 180,
    priority: 1,
  },
  {
    id: 'POL-002',
    type: 'police',
    callsign: 'UNIT-15',
    position: { lat: 28.6350, lng: 77.2180 },
    speed: 0,
    status: 'on-scene',
    priority: 1,
  },
];

export const initialIncidents: Incident[] = [
  {
    id: 'INC-001',
    type: 'accident',
    position: { lat: 28.6180, lng: 77.2300 },
    severity: 'high',
    description: 'MULTI-VEHICLE COLLISION ON NH-44',
    reportedAt: new Date(Date.now() - 15 * 60000),
    assignedVehicles: ['POL-001', 'AMB-002'],
  },
  {
    id: 'INC-002',
    type: 'fire',
    position: { lat: 28.6100, lng: 77.2250 },
    severity: 'critical',
    description: 'STRUCTURE FIRE — COMMERCIAL DISTRICT',
    reportedAt: new Date(Date.now() - 8 * 60000),
    assignedVehicles: ['FIR-001'],
  },
  {
    id: 'INC-003',
    type: 'congestion',
    position: { lat: 28.6250, lng: 77.2050 },
    severity: 'medium',
    description: 'HEAVY CONGESTION — CONNAUGHT PLACE AREA',
    reportedAt: new Date(Date.now() - 45 * 60000),
    assignedVehicles: [],
  },
  {
    id: 'INC-004',
    type: 'medical',
    position: { lat: 28.6300, lng: 77.2200 },
    severity: 'critical',
    description: 'CARDIAC EMERGENCY — RESIDENTIAL ZONE',
    reportedAt: new Date(Date.now() - 3 * 60000),
    assignedVehicles: ['AMB-002'],
  },
];

export const initialSignals: TrafficSignal[] = [
  { id: 'SIG-001', position: { lat: 28.6150, lng: 77.2100 }, state: 'green', name: 'JANPATH CROSSING', overridden: false, corridorActive: false },
  { id: 'SIG-002', position: { lat: 28.6180, lng: 77.2150 }, state: 'red', name: 'BARAKHAMBA RD', overridden: true, corridorActive: true },
  { id: 'SIG-003', position: { lat: 28.6200, lng: 77.2200 }, state: 'green', name: 'KG MARG JUNCTION', overridden: true, corridorActive: true },
  { id: 'SIG-004', position: { lat: 28.6100, lng: 77.2050 }, state: 'red', name: 'PATEL CHOWK', overridden: false, corridorActive: false },
  { id: 'SIG-005', position: { lat: 28.6250, lng: 77.2100 }, state: 'yellow', name: 'RAJIV CHOWK', overridden: false, corridorActive: false },
  { id: 'SIG-006', position: { lat: 28.6300, lng: 77.2150 }, state: 'green', name: 'ITO JUNCTION', overridden: false, corridorActive: false },
  { id: 'SIG-007', position: { lat: 28.6080, lng: 77.2180 }, state: 'red', name: 'MANDI HOUSE', overridden: false, corridorActive: false },
  { id: 'SIG-008', position: { lat: 28.6220, lng: 77.2250 }, state: 'green', name: 'PRAGATI MAIDAN', overridden: true, corridorActive: true },
];

export const initialRoadSegments: RoadSegment[] = [
  { id: 'RD-001', start: { lat: 28.6100, lng: 77.2000 }, end: { lat: 28.6200, lng: 77.2100 }, congestion: 'heavy', speedLimit: 60, currentSpeed: 12 },
  { id: 'RD-002', start: { lat: 28.6200, lng: 77.2100 }, end: { lat: 28.6300, lng: 77.2200 }, congestion: 'moderate', speedLimit: 60, currentSpeed: 35 },
  { id: 'RD-003', start: { lat: 28.6150, lng: 77.2150 }, end: { lat: 28.6250, lng: 77.2250 }, congestion: 'free', speedLimit: 80, currentSpeed: 72 },
  { id: 'RD-004', start: { lat: 28.6050, lng: 77.2050 }, end: { lat: 28.6150, lng: 77.2150 }, congestion: 'light', speedLimit: 50, currentSpeed: 42 },
  { id: 'RD-005', start: { lat: 28.6250, lng: 77.2000 }, end: { lat: 28.6350, lng: 77.2100 }, congestion: 'heavy', speedLimit: 60, currentSpeed: 8 },
];

export const systemStats: SystemStats = {
  activeVehicles: 4,
  activeIncidents: 4,
  signalsOverridden: 3,
  avgResponseTime: 4.2,
  corridorsActive: 2,
  totalAlerts: 127,
};

export function getVehicleColor(type: Vehicle['type']): string {
  switch (type) {
    case 'ambulance': return 'text-emergency';
    case 'fire': return 'text-warning';
    case 'police': return 'text-accent';
    case 'civilian': return 'text-muted-foreground';
  }
}

export function getSeverityColor(severity: Incident['severity']): string {
  switch (severity) {
    case 'critical': return 'text-emergency';
    case 'high': return 'text-destructive';
    case 'medium': return 'text-warning';
    case 'low': return 'text-primary';
  }
}

export function getCongestionColor(level: RoadSegment['congestion']): string {
  switch (level) {
    case 'heavy': return 'bg-congestion-heavy';
    case 'moderate': return 'bg-congestion-moderate';
    case 'light': return 'bg-congestion-light';
    case 'free': return 'bg-congestion-free';
  }
}
