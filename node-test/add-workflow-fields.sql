-- Add workflow fields to inspections table

-- Add repair workflow fields
ALTER TABLE inspections
ADD COLUMN repair_status TEXT DEFAULT 'pending' 
  CHECK (repair_status IN ('pending', 'in_progress', 'completed', 'rejected')),
ADD COLUMN after_image_url TEXT,
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN completion_date DATE,
ADD COLUMN estimated_completion_date DATE,
ADD COLUMN admin_notes TEXT,
ADD COLUMN user_feedback TEXT,
ADD COLUMN user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
ADD COLUMN feedback_at TIMESTAMPTZ;

-- Add index for repair status
CREATE INDEX idx_repair_status ON inspections (repair_status);

-- Update admin policies to allow updates
CREATE POLICY "admin can update"
ON inspections FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow inspectors to add feedback on completed inspections
CREATE POLICY "inspector can add feedback"
ON inspections FOR UPDATE
TO authenticated
USING (
  auth.uid() = inspector_id 
  AND repair_status = 'completed'
)
WITH CHECK (
  auth.uid() = inspector_id 
  AND repair_status = 'completed'
);

COMMENT ON COLUMN inspections.repair_status IS 'Workflow status: pending (new), in_progress (admin working), completed (done with after image), rejected (not actionable)';
COMMENT ON COLUMN inspections.after_image_url IS 'Photo of repaired road uploaded by admin';
COMMENT ON COLUMN inspections.approved_by IS 'Admin who approved/completed the repair';
COMMENT ON COLUMN inspections.approved_at IS 'When admin marked as in_progress or completed';
COMMENT ON COLUMN inspections.completion_date IS 'Actual date when repair was completed';
COMMENT ON COLUMN inspections.estimated_completion_date IS 'Admin estimated completion date';
COMMENT ON COLUMN inspections.admin_notes IS 'Admin notes about repair work';
COMMENT ON COLUMN inspections.user_feedback IS 'Inspector feedback after completion';
COMMENT ON COLUMN inspections.user_rating IS 'Inspector rating (1-5 stars) after completion';
