-- Fix the overly permissive audit log INSERT policy
-- Replace WITH CHECK (true) with proper provider/employee check

DROP POLICY IF EXISTS "System can insert audit logs" ON public.employee_audit_log;

-- Only allow inserts from authenticated users who are either the provider or an employee
CREATE POLICY "Authenticated users can insert audit logs"
ON public.employee_audit_log FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- Provider inserting
    provider_id = auth.uid()
    -- Admin inserting
    OR public.has_role(auth.uid(), 'admin')
    -- Employee inserting (via trigger context)
    OR public.is_employee_of_provider(auth.uid(), provider_id)
  )
);