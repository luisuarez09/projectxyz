CREATE POLICY "stored_objects_worker_scan_read_policy"
ON "app"."stored_objects"
FOR SELECT
TO proyectoxyz_worker
USING (true);

CREATE POLICY "stored_objects_worker_scan_update_policy"
ON "app"."stored_objects"
FOR UPDATE
TO proyectoxyz_worker
USING (true)
WITH CHECK (true);
