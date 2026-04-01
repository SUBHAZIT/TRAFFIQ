import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Checking Supabase connection...');
  console.log('URL:', supabaseUrl);

  const { data: incidents, error: incError } = await supabase.from('incidents').select('*');
  if (incError) console.error('Incidents error:', incError.message);
  else console.log('Incidents count:', incidents?.length);

  const { data: vehicles, error: vehError } = await supabase.from('vehicles').select('*');
  if (vehError) console.error('Vehicles error:', vehError.message);
  else console.log('Vehicles count:', vehicles?.length);
}

checkData();
