-- Approval requests: require authenticated users to only submit requests for themselves
CREATE POLICY "users insert own approval request"
ON public.approval_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Documents storage bucket: only owner (path prefix = their user id) may update objects
CREATE POLICY "owners update own document objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);