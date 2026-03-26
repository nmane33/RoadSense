x-- Profiles table
CREATE TABLE profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT,
  name       TEXT,
  role       TEXT DEFAULT 'inspector' 
             CHECK (role IN ('inspector', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inspections table
CREATE TABLE inspections (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT now(),
  lat                 DECIMAL(10, 7) NOT NULL,
  lng                 DECIMAL(10, 7) NOT NULL,
  address             TEXT,
  timestamp           TIMESTAMPTZ NOT NULL,
  score               INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  status              TEXT NOT NULL CHECK (status IN ('Good','Moderate','Critical')),
  defect_count        INTEGER DEFAULT 0,
  defects             JSONB,
  original_image_url  TEXT,
  annotated_image_url TEXT,
  inspector_id        UUID REFERENCES auth.users(id),
  zone                TEXT
);

-- Indexes
CREATE INDEX idx_location ON inspections (lat, lng);
CREATE INDEX idx_status   ON inspections (status);
CREATE INDEX idx_zone     ON inspections (zone);
CREATE INDEX idx_created  ON inspections (created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE inspections;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'inspector'
  )
  ON CONFLICT (id) DO NOTHING;  -- ← prevents crash if profile exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


  ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "read own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Inspector policies
CREATE POLICY "inspector can insert"
ON inspections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = inspector_id);

CREATE POLICY "inspector reads own"
ON inspections FOR SELECT
TO authenticated
USING (auth.uid() = inspector_id);

-- Admin policies
CREATE POLICY "admin reads all"
ON inspections FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin can delete"
ON inspections FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

**Step 5 — Now try creating the admin user in dashboard**

Go to **Authentication → Users → Add User → Auto Confirm ON**
```
Email:    admin@roadsense.com
Password: Admin@1234

---

UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@roadsense.com';

-- Verify
SELECT id, email, role FROM profiles;