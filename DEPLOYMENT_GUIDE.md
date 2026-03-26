# 🚀 RoadSense Deployment Guide
## Moving to a New Supabase Account

This guide covers everything you need to deploy RoadSense to a new Supabase project.

---

## 📋 Prerequisites

- New Supabase account/project created
- Node.js 18+ installed
- Roboflow account with API key
- Google Maps API key
- Git installed

---

## 🗄️ Part 1: Supabase Database Setup

### Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization
4. Project name: `roadsense` (or your choice)
5. Database password: **Save this securely**
6. Region: Choose closest to your location
7. Click "Create new project"
8. Wait 2-3 minutes for provisioning

### Step 2: Run Database Schema

Go to **SQL Editor** in Supabase Dashboard and run this SQL:

```sql
-- File: node-test/main.sql

-- 1. Create profiles table
CREATE TABLE profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT,
  name       TEXT,
  role       TEXT DEFAULT 'inspector' 
             CHECK (role IN ('inspector', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create inspections table
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
  zone                TEXT,
  
  -- Workflow fields
  repair_status TEXT DEFAULT 'pending' CHECK (repair_status IN ('pending', 'in_progress', 'completed', 'rejected')),
  after_image_url TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  completion_date DATE,
  estimated_completion_date DATE,
  admin_notes TEXT,
  user_feedback TEXT,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  feedback_at TIMESTAMPTZ
);

-- 3. Create indexes for performance
CREATE INDEX idx_location ON inspections (lat, lng);
CREATE INDEX idx_status   ON inspections (status);
CREATE INDEX idx_zone     ON inspections (zone);
CREATE INDEX idx_created  ON inspections (created_at DESC);
CREATE INDEX idx_inspector ON inspections (inspector_id);
CREATE INDEX idx_repair_status ON inspections (repair_status);

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE inspections;

-- 5. Create auto-profile trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'inspector'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Enable Row Level Security
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for profiles
CREATE POLICY "read own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 8. RLS Policies for inspections - Inspector
CREATE POLICY "inspector can insert"
ON inspections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = inspector_id);

CREATE POLICY "inspector reads own"
ON inspections FOR SELECT
TO authenticated
USING (auth.uid() = inspector_id);

CREATE POLICY "inspector updates own"
ON inspections FOR UPDATE
TO authenticated
USING (auth.uid() = inspector_id);

-- 9. RLS Policies for inspections - Admin
CREATE POLICY "admin reads all"
ON inspections FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin updates all"
ON inspections FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin deletes all"
ON inspections FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### Step 3: Create Storage Buckets

Go to **Storage** in Supabase Dashboard:

#### Bucket 1: inspections
1. Click "New bucket"
2. Name: `inspections`
3. Public: **Yes** (checked)
4. File size limit: 10MB
5. Allowed MIME types: `image/jpeg, image/png, image/jpg`
6. Click "Create bucket"

This bucket stores:
- Original uploaded images
- Annotated images with bounding boxes
- After-repair images (workflow feature)

#### Storage RLS Policies

Run this SQL in SQL Editor:

```sql
-- File: backend/setup-storage.sql

-- Public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspections');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspections' 
  AND auth.role() = 'authenticated'
);

-- Users can update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'inspections' 
  AND auth.uid() = owner
);

-- Admins can delete
CREATE POLICY "Admins can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inspections'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);
```

### Step 4: Create Admin User

Go to **Authentication → Users** in Supabase Dashboard:

1. Click "Add user"
2. Email: `admin@roadsense.com` (or your choice)
3. Password: Create a strong password
4. Auto Confirm Email: **ON** (checked)
5. Click "Create user"

Then run this SQL to set admin role:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@roadsense.com';

-- Verify
SELECT id, email, role FROM profiles;
```

### Step 5: Get Supabase Credentials

Go to **Project Settings → API** in Supabase Dashboard:

Copy these values (you'll need them for .env files):
- Project URL: `https://xxxxx.supabase.co`
- `anon` `public` key: `eyJhbGc...` (long JWT token)
- `service_role` `secret` key: `eyJhbGc...` (different JWT token)

⚠️ **IMPORTANT**: Never commit `service_role` key to git!

---

## 🔑 Part 2: External API Keys

### Roboflow API Key

1. Go to [roboflow.com](https://roboflow.com)
2. Sign up / Log in
3. Go to Settings → API Keys
4. Copy your API key
5. **Note**: Free tier has limited credits

### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API (optional)
4. Go to Credentials → Create Credentials → API Key
5. Copy the API key
6. **Restrict the key** (recommended):
   - Application restrictions: HTTP referrers
   - Add your domain: `localhost:5174`, `yourdomain.com`
   - API restrictions: Select only the APIs you enabled

---

## 📝 Part 3: Environment Configuration

### Backend Environment Variables

Create/update `backend/.env`:

```env
# Supabase - GET FROM YOUR NEW PROJECT
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...YOUR_ANON_KEY
SUPABASE_SERVICE_KEY=eyJhbGc...YOUR_SERVICE_ROLE_KEY

# Roboflow - YOUR API KEY
ROBOFLOW_API_KEY=YOUR_ROBOFLOW_KEY
ROBOFLOW_POTHOLE_URL=https://serverless.roboflow.com/pothole-detection-project-1dpiq/5
ROBOFLOW_CRACK_URL=https://serverless.roboflow.com/road-cracks-sjmd3/3

# Google Maps - YOUR API KEY
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY

# Server Configuration
PORT=5001
NODE_ENV=production
```

### Frontend Environment Variables

Create/update `frontend/.env`:

```env
# Supabase - SAME AS BACKEND (except no service key)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...YOUR_ANON_KEY

# Google Maps - SAME KEY AS BACKEND
VITE_GOOGLE_MAPS_KEY=YOUR_GOOGLE_MAPS_KEY

# API URL - UPDATE FOR PRODUCTION
VITE_API_URL=http://localhost:5001/api
# For production: VITE_API_URL=https://your-backend-domain.com/api
```

---

## 📦 Part 4: Installation & Setup

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Test the server
npm run dev

# Should see:
# 🚀 RoadSense API running on port 5001
# 📍 Health check: http://localhost:5001/api/health
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Should see:
# VITE ready in XXX ms
# ➜  Local:   http://localhost:5174/
```

---

## 🧪 Part 5: Testing

### Test 1: Health Check

```bash
curl http://localhost:5001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-26T...",
  "service": "RoadSense API"
}
```

### Test 2: Create Test Inspector

```bash
cd backend
node create-test-user.js
```

This creates: `test.inspector@roadsense.com` / `Test@1234`

### Test 3: Login

1. Open http://localhost:5174
2. Click "Login"
3. Use test inspector credentials
4. Should redirect to /upload page

### Test 4: Upload Inspection

1. Allow GPS location access
2. Upload a road image
3. Click "Analyze Road Condition"
4. Should see:
   - AI detection results
   - Annotated image with bounding boxes
   - Quality score
   - Defects list

### Test 5: Admin Dashboard

1. Logout
2. Login as admin@roadsense.com
3. Should redirect to /dashboard
4. Should see:
   - Total inspections count
   - Average score
   - Critical/Moderate/Good counts
   - Recent inspections table

### Test 6: Workflow Feature

1. Login as admin
2. Go to any inspection detail
3. Update repair status to "in_progress"
4. Set estimated completion date
5. Upload after image
6. Mark as completed
7. Logout and login as inspector
8. View completed inspection
9. Add feedback and rating

---

## 📁 Part 6: Files to Update

### Files with Hardcoded Values to Change

1. **backend/.env** - ALL values must be updated
2. **frontend/.env** - ALL values must be updated
3. **backend/create-test-user.js** - Update test user email/password if needed
4. **frontend/src/lib/supabase.js** - Uses env vars (no change needed)
5. **backend/lib/supabase.js** - Uses env vars (no change needed)

### Files That DON'T Need Changes

- All React components (use env vars)
- All backend routes (use env vars)
- All services (use env vars)
- Database schema (already run in new project)

---

## 🔒 Part 7: Security Checklist

- [ ] `.env` files added to `.gitignore`
- [ ] Never commit API keys to git
- [ ] Supabase `service_role` key only in backend
- [ ] Google Maps API key restricted to your domains
- [ ] Roboflow API key regenerated if exposed
- [ ] Admin password is strong and secure
- [ ] RLS policies enabled on all tables
- [ ] Storage buckets have proper policies
- [ ] CORS configured in backend for your frontend domain

---

## 🚀 Part 8: Production Deployment

### Backend Deployment (Render/Railway/Fly.io)

1. Push code to GitHub (without .env)
2. Create new web service
3. Set environment variables in dashboard
4. Deploy from GitHub
5. Note the backend URL

### Frontend Deployment (Vercel/Netlify)

1. Push code to GitHub
2. Import project
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_KEY`
   - `VITE_API_URL` (your backend URL)
4. Deploy
5. Update Google Maps API key restrictions with new domain

### Update CORS in Backend

In `backend/server.js`, update CORS:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5174',
    'https://your-frontend-domain.vercel.app'
  ],
  credentials: true
}));
```

---

## 📊 Part 9: Verify Everything Works

### Checklist

- [ ] Database tables created
- [ ] Storage bucket created
- [ ] RLS policies working
- [ ] Realtime enabled
- [ ] Admin user created
- [ ] Backend running
- [ ] Frontend running
- [ ] Can signup as inspector
- [ ] Can login as inspector
- [ ] Can upload inspection
- [ ] AI detection working
- [ ] Images stored in Supabase
- [ ] Can view inspections
- [ ] Admin can see all inspections
- [ ] Admin can delete inspections
- [ ] Map page shows markers
- [ ] Workflow features working
- [ ] Feedback system working

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch inspections"
- Check backend is running
- Check VITE_API_URL in frontend .env
- Check CORS settings in backend

### Issue: "AI detection failed"
- Check Roboflow API key is valid
- Check you have credits remaining
- Check internet connection

### Issue: "Failed to upload image"
- Check storage bucket exists
- Check bucket is public
- Check storage policies are set

### Issue: "Not authorized"
- Check RLS policies are correct
- Check user is logged in
- Check JWT token is valid

### Issue: "Admin can't see all inspections"
- Check admin role is set in profiles table
- Check admin RLS policy exists

---

## 📞 Support

If you encounter issues:

1. Check backend console logs
2. Check browser console logs
3. Check Supabase logs (Dashboard → Logs)
4. Verify all environment variables are set
5. Verify database schema is complete

---

## 🎉 You're Done!

Your RoadSense application should now be fully deployed on the new Supabase account.

**Next Steps:**
- Customize branding/colors
- Add more test data
- Configure production domains
- Set up monitoring
- Create backups

---

**Last Updated**: March 26, 2026
**Version**: 1.0.0
