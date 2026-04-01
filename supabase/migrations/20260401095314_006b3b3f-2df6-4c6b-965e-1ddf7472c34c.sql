
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'citizen');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'citizen',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can see own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + citizen role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('ambulance', 'fire', 'police', 'civilian')),
  callsign TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL DEFAULT 0,
  lng DOUBLE PRECISION NOT NULL DEFAULT 0,
  dest_lat DOUBLE PRECISION,
  dest_lng DOUBLE PRECISION,
  speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'dispatched', 'en-route', 'on-scene')),
  priority INTEGER NOT NULL DEFAULT 0,
  eta INTEGER,
  driver_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'driver'));
CREATE POLICY "Admins can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'driver') AND driver_id = auth.uid()));
CREATE POLICY "Admins can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('accident', 'congestion', 'roadblock', 'fire', 'medical')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  image_url TEXT,
  reported_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  assigned_vehicles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can report incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Admins can update incidents" ON public.incidents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete incidents" ON public.incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create traffic_signals table
CREATE TABLE public.traffic_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  state TEXT NOT NULL DEFAULT 'red' CHECK (state IN ('green', 'yellow', 'red')),
  name TEXT NOT NULL,
  overridden BOOLEAN NOT NULL DEFAULT false,
  corridor_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.traffic_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view signals" ON public.traffic_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage signals" ON public.traffic_signals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert signals" ON public.traffic_signals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create routes table
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  path JSONB NOT NULL DEFAULT '[]',
  eta INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view routes" ON public.routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage routes" ON public.routes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update routes" ON public.routes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create road_segments table
CREATE TABLE public.road_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  end_lat DOUBLE PRECISION NOT NULL,
  end_lng DOUBLE PRECISION NOT NULL,
  congestion TEXT NOT NULL DEFAULT 'free' CHECK (congestion IN ('free', 'light', 'moderate', 'heavy')),
  speed_limit INTEGER NOT NULL DEFAULT 60,
  current_speed INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.road_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view segments" ON public.road_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage segments" ON public.road_segments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update segments" ON public.road_segments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_signals_updated_at BEFORE UPDATE ON public.traffic_signals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON public.road_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for incident images
INSERT INTO storage.buckets (id, name, public) VALUES ('incident-images', 'incident-images', true);

CREATE POLICY "Anyone can view incident images" ON storage.objects FOR SELECT USING (bucket_id = 'incident-images');
CREATE POLICY "Authenticated can upload incident images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'incident-images');
