import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, TrafficLayer, Marker, Polyline, InfoWindow, DirectionsRenderer, OverlayViewF } from '@react-google-maps/api';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Info } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px'
};

const defaultCenter = {
  lat: 28.6139, // Default to New Delhi
  lng: 77.2090
};

interface MapContainerProps {
  incidents?: any[];
  vehicles?: any[];
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  selectedIncident?: any;
  setSelectedIncident?: (incident: any) => void;
  directions?: google.maps.DirectionsResult | null;
  multiDirections?: { id: string; result: google.maps.DirectionsResult; color: string }[];
  livePaths?: { id: string; path: { lat: number; lng: number }[]; color: string; eta?: string | number }[];
  signals?: any[];
  userLocation?: { lat: number; lng: number } | null;
  isJourneyStarted?: boolean;
  tilt?: number;
  heading?: number;
  routeBlocks?: any[];
  center?: { lat: number; lng: number } | null;
  cleanMode?: boolean;
}

const MapContainer: React.FC<MapContainerProps> = ({ 
  incidents = [], 
  vehicles = [], 
  onMapClick,
  selectedIncident,
  setSelectedIncident,
  directions,
  multiDirections = [],
  livePaths = [],
  signals = [],
  userLocation,
  isJourneyStarted = false,
  tilt = 0,
  heading = 0,
  routeBlocks = [],
  center,
  cleanMode = false
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry']
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showMobileLegend, setShowMobileLegend] = useState(false);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  useEffect(() => {
    if (map && userLocation) {
      map.panTo(userLocation);
      if (isJourneyStarted) {
        map.setZoom(18);
        // Normalize tilt and heading for a smooth experience
        const safeTilt = Math.min(Math.max(Math.abs(tilt), 0), 45);
        map.setTilt(safeTilt);
        // Map heading is rotation around Z axis, usually needs fine tuning
        // map.setHeading(heading); // Heading often requires Vector map ID
      }
    }
  }, [map, userLocation, isJourneyStarted, tilt, heading]);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  return isLoaded ? (
    <div className="h-full w-full border-4 border-primary shadow-2xl relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center || defaultCenter}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onMapClick}
        options={{
          styles: [
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#f5f5f5" }]
            },
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#616161" }]
            },
            {
              featureType: "all",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#f5f5f5" }]
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#e9e9e9" }]
            },
          ]
        }}
      >
        {!cleanMode && <TrafficLayer />}
        
        {/* Incident Markers */}
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={{ lat: incident.lat, lng: incident.lng }}
            icon={{
              url: `https://maps.google.com/mapfiles/ms/icons/${incident.severity === 'critical' ? 'red' : 'yellow'}-dot.png`
            }}
            onClick={() => setSelectedIncident?.(incident)}
          />
        ))}

        {/* Vehicle Markers */}
        {vehicles.map((vehicle) => (
          vehicle.type === 'ambulance' ? (
            <OverlayViewF
              key={vehicle.id}
              position={{ lat: vehicle.lat, lng: vehicle.lng }}
              mapPaneName="overlayMouseTarget"
            >
              <div 
                style={{ 
                  transform: 'translate(-50%, -50%) scale(0.4)',
                  width: '300px', 
                  height: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <DotLottieReact
                  src="https://lottie.host/757ee603-1ccc-42ad-a9c2-40aea527944c/oI7Qtwq0sh.lottie"
                  loop
                  autoplay
                />
              </div>
            </OverlayViewF>
          ) : (
            <Marker
              key={vehicle.id}
              position={{ lat: vehicle.lat, lng: vehicle.lng }}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
              }}
            />
          )
        ))}

        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              scale: 1.5,
              anchor: new google.maps.Point(12, 12),
              rotation: isJourneyStarted ? 0 : 0 // In a real app we'd use 'heading'
            }}
          />
        )}

        {/* Route Block Highlights */}
        {routeBlocks.map((block) => (
          <Marker
            key={`block-${block.id}`}
            position={{ lat: block.lat, lng: block.lng }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#ff0000',
              fillOpacity: 0.7,
              strokeWeight: 3,
              strokeColor: '#ffffff',
            }}
            zIndex={100}
          />
        ))}

        {directions && (
          <DirectionsRenderer
            directions={directions}
            routeIndex={(directions as any).routeIndex || 0}
            options={{
              polylineOptions: {
                strokeColor: '#0000FF',
                strokeWeight: 6,
                strokeOpacity: 0.8
              }
            }}
          />
        )}

        {multiDirections.map((route) => (
          <DirectionsRenderer
            key={route.id}
            directions={route.result}
            options={{
              polylineOptions: {
                strokeColor: route.color,
                strokeWeight: 6,
                strokeOpacity: 0.8,
              },
              suppressMarkers: false, // Show markers for clarity if requested
            }}
          />
        ))}

        {livePaths.map((lp) => (
          <React.Fragment key={lp.id}>
            <Polyline
              path={lp.path}
              options={{
                strokeColor: lp.color,
                strokeWeight: 6,
                strokeOpacity: 0.8,
              }}
            />
            {lp.path.length > 0 && (
              <>
                <Marker
                  position={lp.path[0]}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: lp.color,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                  }}
                />
                <Marker
                  position={lp.path[lp.path.length - 1]}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#ef4444',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 3,
                  }}
                  label={{
                    text: lp.eta ? `ETA: ${lp.eta}` : 'DEST',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: '900',
                  }}
                />
              </>
            )}
          </React.Fragment>
        ))}

        {/* Signal Markers */}
        {signals && signals.map((signal) => (
          <Marker
            key={signal.id}
            position={{ lat: signal.position.lat, lng: signal.position.lng }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: signal.state === 'green' ? '#22c55e' : signal.state === 'red' ? '#ef4444' : '#eab308',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
            }}
          />
        ))}

        {selectedIncident && (
          <InfoWindow
            position={{ lat: selectedIncident.lat, lng: selectedIncident.lng }}
            onCloseClick={() => setSelectedIncident?.(null)}
          >
            <div className="p-2 uppercase font-black text-[10px] tracking-widest text-primary">
              <h3 className="border-b-2 border-primary mb-1 pb-1">{selectedIncident.type}</h3>
              <p>{selectedIncident.description}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {/* Mobile Legend Toggle */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowMobileLegend(!showMobileLegend); }}
        className="md:hidden absolute top-24 right-4 bg-white h-10 w-10 flex items-center justify-center rounded-full border-2 border-primary shadow-xl text-primary z-20"
      >
        <Info className="h-5 w-5" />
      </button>

      {/* Legend overlay */}
      <div className={`absolute top-[140px] right-4 md:top-4 md:right-4 bg-white/95 p-4 border-2 border-primary shadow-2xl space-y-3 backdrop-blur-md text-primary z-20 ${showMobileLegend ? 'block' : 'hidden md:block'}`}>
        <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black tracking-[0.2em]">LIVE TRAFFIC DATA</span>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-6 rounded-full bg-[#ff0000]" />
            <span className="text-[8px] font-bold text-primary/60">HEAVY TRAFFIC</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-6 rounded-full bg-[#ffcf00]" />
            <span className="text-[8px] font-bold text-primary/60">MODERATE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-6 rounded-full bg-[#00ff00]" />
            <span className="text-[8px] font-bold text-primary/60">CLEAR FLOW</span>
          </div>
        </div>

        <div className="pt-2 space-y-2 border-t border-primary/10">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-[10px] font-black tracking-widest text-primary">CRITICAL INCIDENT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-[10px] font-black tracking-widest text-primary">MINOR INCIDENT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black tracking-widest text-primary">EMERGENCY VEHICLE</span>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-full w-full flex items-center justify-center bg-slate-50 border-4 border-primary">
      <span className="animate-pulse font-black text-xs tracking-[0.3em]">INITIALIZING GEOSPATIAL INTELLIGENCE...</span>
    </div>
  );
};

export default React.memo(MapContainer);
