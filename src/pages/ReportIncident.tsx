import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, MapPin, Camera, Upload, AlertTriangle, ArrowLeft, X, Loader2, Navigation, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MapContainer from '@/components/MapContainer';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const INCIDENT_TYPES = [
  { value: 'accident', label: 'VEHICULAR ACCIDENT', icon: '🚗' },
  { value: 'congestion', label: 'CRITICAL CONGESTION', icon: '🚦' },
  { value: 'roadblock', label: 'UNAUTHORIZED ROADBLOCK', icon: '🚧' },
  { value: 'fire', label: 'FIRE / HAZMAT', icon: '🔥' },
  { value: 'medical', label: 'MEDICAL EMERGENCY', icon: '🏥' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'LOW', color: 'border-primary text-primary bg-primary/5' },
  { value: 'medium', label: 'MEDIUM', color: 'border-warning text-warning bg-warning/5' },
  { value: 'high', label: 'HIGH', color: 'border-destructive text-destructive bg-destructive/5' },
  { value: 'critical', label: 'CRITICAL', color: 'border-emergency text-emergency bg-emergency/5' },
];

export default function ReportIncident() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const latVal = place.geometry.location.lat();
        const lngVal = place.geometry.location.lng();
        setLat(latVal.toFixed(6));
        setLng(lngVal.toFixed(6));
        const area = place.name || place.formatted_address?.split(',')[0] || 'SEARCHED LOCATION';
        setLocationName(area.toUpperCase());
        toast.success('TARGET AREA ACQUIRED FROM SEARCH');
      }
    }
  };

  // AUTO-DETECT LOCATION ON MOUNT
  useEffect(() => {
    detectLocation();
  }, []);

  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        // Find a suitable short name from the address components
        const route = results[0].address_components.find(c => c.types.includes('route'))?.long_name;
        const sublocality = results[0].address_components.find(c => c.types.includes('sublocality'))?.long_name;
        const area = sublocality || route || results[0].formatted_address.split(',')[0];
        setLocationName(area.toUpperCase());
      }
    });
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const latVal = e.latLng.lat();
      const lngVal = e.latLng.lng();
      setLat(latVal.toFixed(6));
      setLng(lngVal.toFixed(6));
      reverseGeocode(latVal, lngVal);
      toast.success('LOCATION PINNED ON MAP');
    }
  };

  const detectLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLat(newLoc.lat.toFixed(6));
          setLng(newLoc.lng.toFixed(6));
          setUserLocation(newLoc);
          reverseGeocode(newLoc.lat, newLoc.lng);
          setLocating(false);
          toast.success('PRECISION LOCATION CAPTURED');
        },
        () => {
          toast.error('LOCATION SYNC FAILED');
          setLocating(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error('GEOLOCATION NOT SUPPORTED');
      setLocating(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('IMAGE MUST BE UNDER 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !severity || !description || !lat || !lng) {
      toast.error('PLEASE FILL ALL REQUIRED FIELDS');
      return;
    }
    setLoading(true);

    try {
      let imageUrl: string | null = null;

      if (image) {
        const ext = image.name.split('.').pop();
        const path = `${user?.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('incident-images')
          .upload(path, image);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from('incident-images')
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('incidents').insert({
        type,
        severity,
        description: description.toUpperCase(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        location_name: locationName,
        image_url: imageUrl,
        reported_by: user?.id,
      });

      if (error) throw error;
      toast.success('INCIDENT REPORTED SUCCESSFULLY');
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message?.toUpperCase() || 'FAILED TO REPORT INCIDENT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 uppercase tracking-widest text-primary overflow-hidden">
      {/* GOV STRIP */}
      <div className="hidden md:block bg-primary px-4 py-1.5 text-[10px] font-bold text-white relative z-50 shrink-0">
        <div className="container mx-auto flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            DIRECT-LINK EMERGENCY REPORTING SYSTEM (V3.0-FULL)
          </span>
          <span className="hidden sm:inline">CENTRAL COMMAND STRATEGIC OVERLAY</span>
        </div>
      </div>

      <header className="hidden md:flex relative z-10 h-20 items-center justify-between border-b-4 border-primary bg-white px-8 shadow-xl shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 border-2 border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-xl font-black leading-none">INCIDENT OVERWATCH</span>
            <span className="text-[10px] font-bold text-primary/40 mt-1">REAL-TIME FIELD REPORTING & TARGET ACQUISITION</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-500 text-red-600 font-black text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            LIVE COMMS ESTABLISHED
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT PANEL: LARGE TACTICAL MAP */}
        <div className="absolute inset-0 md:static md:flex-1 md:border-r-4 border-primary group z-0">
           {/* SCANNER EFFECT */}
           <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20 animate-scan z-20 pointer-events-none" />
           
           <MapContainer 
             onMapClick={handleMapClick}
             userLocation={userLocation}
             incidents={lat && lng ? [{ id: 'pre-report', lat: parseFloat(lat), lng: parseFloat(lng), severity: 'critical', type: 'PIN' }] : []}
             cleanMode={true}
           />

           {/* MAP HUD OVERLAYS */}
           <div className="absolute top-20 left-4 right-4 md:top-6 md:left-6 z-10 flex flex-col gap-4 pointer-events-none">
              {isLoaded && (
                <div className="bg-primary p-2 border-2 border-white shadow-2xl backdrop-blur-md w-full md:w-64 relative pointer-events-auto">
                  <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                    <input
                      type="text"
                      placeholder="SEARCH EXACT LOCATION..."
                      className="w-full border-2 border-white/20 bg-white/10 px-3 py-2 pr-8 text-[10px] font-black text-white focus:outline-none focus:border-white placeholder:text-white/40"
                    />
                  </Autocomplete>
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40 pointer-events-none" />
                </div>
              )}

              {/* Huge Coordinate Box (Desktop Only) */}
              <div className="hidden md:block bg-primary p-4 border-2 border-white shadow-2xl backdrop-blur-md w-64 pointer-events-auto">
                 <div className="text-[8px] font-black text-white/40 tracking-[0.2em] mb-2">GEOSPATIAL COORDINATES</div>
                 <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-white/10 pb-1">
                       <span className="text-[7px] text-white/30">LATITUDE</span>
                       <span className="text-sm font-black text-white tabular-nums">{lat || '00.000000'}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/10 pb-1">
                       <span className="text-[7px] text-white/30">LONGITUDE</span>
                       <span className="text-sm font-black text-white tabular-nums">{lng || '00.000000'}</span>
                    </div>
                 </div>
                 <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locating}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-white px-3 py-2 font-black text-[9px] tracking-widest text-primary hover:bg-slate-100 transition-all disabled:opacity-50"
                  >
                    {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                    FORCE GPS RE-SYNC
                  </button>
              </div>

              {/* Status Indicator */}
              <div className="pointer-events-auto bg-white/90 p-2 md:p-3 border-2 border-primary shadow-lg backdrop-blur-sm w-[60%] md:w-64 truncate">
                 <div className="text-[7px] md:text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] mb-1">TARGET STATUS</div>
                 <div className="text-[9px] md:text-[10px] font-black text-primary truncate">
                   {locationName || (lat && lng ? 'LOCATION ACQUIRED' : 'WAITING FOR INPUT...')}
                 </div>
              </div>
           </div>

           {/* Mobile Floating Back Button */}
           <button
              type="button"
              onClick={() => navigate(-1)}
              className="md:hidden absolute top-4 left-4 h-11 w-11 bg-white rounded-full border-2 border-primary shadow-xl flex items-center justify-center text-primary z-20 transition-transform active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
           </button>

           {/* Mobile GPS Force Button (Floating absolute on right) */}
           <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="md:hidden absolute top-4 right-4 h-11 w-11 bg-white rounded-full border-2 border-primary shadow-xl flex items-center justify-center text-primary z-20 transition-transform active:scale-95"
            >
              {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
           </button>

           <div className="hidden md:block absolute bottom-6 right-6 z-10">
              <div className="bg-primary/90 text-white px-4 py-2 text-[10px] font-black border-2 border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                SATELLITE DOWNLINK: STABLE (99.2%)
              </div>
           </div>
        </div>

        {/* RIGHT PANEL: REPORT FORM */}
        <div className="absolute bottom-0 left-0 right-0 md:static w-full md:w-[450px] bg-white overflow-y-auto px-6 pt-4 pb-24 md:p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] md:shadow-[-20px_0_40px_rgba(0,0,0,0.05)] md:border-l-4 border-primary z-10 max-h-[65vh] md:max-h-none rounded-t-3xl md:rounded-none flex flex-col">
          {/* DRAG HANDLE (MOBILE ONLY) */}
          <div className="md:hidden flex justify-center w-full mb-6 shrink-0 pt-2">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleSubmit}
            className="space-y-10"
          >
            {/* Classification */}
            <section>
              <div className="flex items-center gap-2 mb-4 border-b-2 border-primary pb-1">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <h3 className="font-black text-[10px] tracking-[0.2em] text-primary">01. CLASSIFICATION</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {INCIDENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex flex-col items-center gap-2 border-4 p-4 text-center transition-all ${
                      type === t.value ? 'border-primary bg-primary text-white shadow-lg' : 'border-slate-50 bg-slate-50 hover:border-primary/20'
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className={`font-black text-[8px] tracking-widest ${type === t.value ? 'text-white' : 'text-primary/60'}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Severity */}
            <section>
              <div className="flex items-center gap-2 mb-4 border-b-2 border-primary pb-1">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="font-black text-[10px] tracking-[0.2em] text-primary">02. SEVERITY PROTOCOL</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SEVERITY_LEVELS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`border-4 py-4 font-black text-[9px] tracking-[0.2em] transition-all ${
                      severity === s.value ? s.color + ' border-current shadow-lg scale-105' : 'border-slate-50 text-primary/20 hover:border-primary/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Evidence Link */}
            <section>
              <div className="flex items-center gap-2 mb-4 border-b-2 border-primary pb-1">
                <Camera className="h-4 w-4 text-primary" />
                <h3 className="font-black text-[10px] tracking-[0.2em] text-primary">03. FIELD EVIDENCE</h3>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              {imagePreview ? (
                <div className="relative border-4 border-primary shadow-xl overflow-hidden group">
                  <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover transition-transform group-hover:scale-110" />
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImagePreview(null); }}
                    className="absolute right-2 top-2 bg-white p-2 border-2 border-primary hover:bg-primary hover:text-white transition-all shadow-xl z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-3 border-4 border-dashed border-primary/20 bg-slate-50 py-10 text-primary/40 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <Upload className="h-6 w-6" />
                  <span className="font-black text-[9px] tracking-[0.2em]">TRANSMIT SCENE IMAGERY</span>
                </button>
              )}
            </section>

            {/* Final Submission */}
            <section className="pt-6 border-t-4 border-primary mb-24 md:mb-0">
              <label className="mb-4 block font-black text-[10px] tracking-[0.2em] text-primary/40">SUPPLEMENTARY DATA</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full border-4 border-slate-50 bg-slate-50 px-4 py-3 font-black text-xs text-primary placeholder:text-primary/20 focus:border-primary focus:outline-none mb-6"
                placeholder="REPORT DESCRIPTIVE DATA..."
              />
              
              <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 bg-white md:bg-transparent shadow-[0_-20px_40px_rgba(0,0,0,0.1)] md:shadow-none z-50 border-t-4 md:border-t-0 border-primary md:border-transparent">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center gap-2 md:gap-4 bg-red-600 py-5 md:py-6 rounded-xl md:rounded-none font-black text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] text-white transition-all hover:bg-red-700 disabled:opacity-50 overflow-hidden shadow-2xl active:scale-95"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[45deg]" />
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <AlertTriangle className="h-6 w-6" />}
                  {loading ? 'TRANSMITTING...' : 'BROADCAST REPORT'}
                </button>
              </div>
            </section>
          </motion.form>
        </div>
      </main>
    </div>
  );
}
