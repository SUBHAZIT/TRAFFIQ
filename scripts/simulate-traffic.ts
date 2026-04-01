import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
  console.log('--- STARTING SMART TRAFFIC SIMULATION ---');

  // 1. Spawn an ambulance
  console.log('Spawning Emergency Unit AMB-X...');
  const { data: vehicle, error: vErr } = await supabase.from('vehicles').insert({
    callsign: 'AMB-X',
    type: 'ambulance',
    lat: 28.6100,
    lng: 77.2000,
    status: 'en-route',
    speed: 60
  }).select().single();

  if (vErr) {
    console.error('Error spawning vehicle:', vErr.message);
    return;
  }

  const vehicleId = vehicle.id;

  // 2. Add an Incident manually
  console.log('Reporting new incident at Connaught Place...');
  const { data: incident } = await supabase.from('incidents').insert({
    type: 'accident',
    severity: 'critical',
    description: 'SIMULATED MULTI-VEHICLE COLLISION',
    lat: 28.6300,
    lng: 77.2200
  }).select().single();

  // 3. Move the ambulance toward the incident
  let currentLat = 28.6100;
  let currentLng = 77.2000;
  const targetLat = 28.6300;
  const targetLng = 77.2200;

  console.log('Simulating real-time movement and signal preemption...');

  for (let i = 0; i < 10; i++) {
    currentLat += (targetLat - currentLat) * 0.2;
    currentLng += (targetLng - currentLng) * 0.2;

    await supabase.from('vehicles').update({
      lat: currentLat,
      lng: currentLng,
      speed: 70 + Math.random() * 20
    }).eq('id', vehicleId);

    console.log(`Step ${i+1}: Unit at ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`);
    
    // Simulate signal override
    if (i === 5) {
      console.log('Approaching Intersection: Activating GREEN WAVE corridor...');
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('Unit Arrived On Scene.');
  await supabase.from('vehicles').update({ status: 'on-scene', speed: 0 }).eq('id', vehicleId);

  console.log('--- SIMULATION COMPLETE ---');
  process.exit(0);
}

runSimulation();
