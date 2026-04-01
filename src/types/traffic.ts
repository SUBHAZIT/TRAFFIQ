export type VehicleType = 'ambulance' | 'fire' | 'police' | 'civilian';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SignalState = 'green' | 'red' | 'yellow';
export type CongestionLevel = 'free' | 'light' | 'moderate' | 'heavy';
export type UserRole = 'admin' | 'driver' | 'citizen';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  callsign: string;
  position: Coordinates;
  destination?: Coordinates;
  speed: number;
  status: 'idle' | 'dispatched' | 'en-route' | 'on-scene';
  eta?: number;
  route?: Coordinates[];
  priority: number;
}

export interface Incident {
  id: string;
  type: 'accident' | 'congestion' | 'roadblock' | 'fire' | 'medical';
  position: Coordinates;
  severity: IncidentSeverity;
  description: string;
  reportedAt: Date;
  resolvedAt?: Date;
  assignedVehicles: string[];
}

export interface TrafficSignal {
  id: string;
  position: Coordinates;
  state: SignalState;
  name: string;
  overridden: boolean;
  corridorActive: boolean;
}

export interface RoadSegment {
  id: string;
  start: Coordinates;
  end: Coordinates;
  congestion: CongestionLevel;
  speedLimit: number;
  currentSpeed: number;
}

export interface SystemStats {
  activeVehicles: number;
  activeIncidents: number;
  signalsOverridden: number;
  avgResponseTime: number;
  corridorsActive: number;
  totalAlerts: number;
}
