-- Allow drivers to manage their own routes
DROP POLICY IF EXISTS "Admins can manage routes" ON public.routes;
DROP POLICY IF EXISTS "Admins can update routes" ON public.routes;

CREATE POLICY "Manage own routes" ON public.routes
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = vehicle_id AND driver_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = vehicle_id AND driver_id = auth.uid()
    )
  );
