-- Add DELETE policy for notifications so users can clear their notification history
CREATE POLICY "Users can delete own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);