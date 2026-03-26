# ✅ RoadSense Deployment Checklist

Quick reference for deploying to a new Supabase account.

---

## 🗄️ Supabase Setup

### Database
- [ ] Create new Supabase project
- [ ] Run `node-test/main.sql` in SQL Editor
- [ ] Run `node-test/add-workflow-fields.sql` (if not in main.sql)
- [ ] Verify tables created: `profiles`, `inspections`
- [ ] Verify indexes created
- [ ] Verify RLS enabled on both tables
- [ ] Verify trigger `handle_new_user()` exists

### Storage
- [ ] Create bucket: `inspections` (public)
- [ ] Run `backend/setup-storage.sql` for policies
- [ ] Verify bucket is public
- [ ] Test upload permission

### Authentication
- [ ] Create admin user in Auth dashboard
- [ ] Run SQL to set admin role
- [ ] Verify admin role: `SELECT * FROM profiles WHERE role='admin'`
- [ ] Test signup flow creates inspector role

### Realtime
- [ ] Verify `inspections` table in realtime publication
- [ ] Test realtime updates work

---

## 🔑 API Keys

- [ ] Get Supabase URL from Project Settings → API
- [ ] Get Supabase `anon` key
- [ ] Get Supabase `service_role` key (backend only!)
- [ ] Get Roboflow API key from roboflow.com
- [ ] Get Google Maps API key from Google Cloud Console
- [ ] Enable Maps JavaScript API
- [ ] Enable Geocoding API
- [ ] Restrict Google Maps key to your domains

---

## 📝 Environment Files

### backend/.env
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `ROBOFLOW_API_KEY`
- [ ] `ROBOFLOW_POTHOLE_URL`
- [ ] `ROBOFLOW_CRACK_URL`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `PORT=5001`
- [ ] `NODE_ENV=development`

### frontend/.env
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_GOOGLE_MAPS_KEY`
- [ ] `VITE_API_URL=http://localhost:5001/api`

---

## 📦 Installation

### Backend
```bash
cd backend
npm install
npm run dev
```
- [ ] Backend running on port 5001
- [ ] Health check works: `curl http://localhost:5001/api/health`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- [ ] Frontend running on port 5174
- [ ] Can access http://localhost:5174

---

## 🧪 Testing

### Basic Tests
- [ ] Health check endpoint works
- [ ] Can access landing page
- [ ] Can signup as inspector
- [ ] Can login as inspector
- [ ] Inspector redirects to /upload
- [ ] Can login as admin
- [ ] Admin redirects to /dashboard

### Upload Flow
- [ ] GPS location detected
- [ ] Can upload image
- [ ] AI detection works (or mock data if no credits)
- [ ] Annotated image shown
- [ ] Score calculated
- [ ] Defects listed
- [ ] Images stored in Supabase
- [ ] Inspection saved to database
- [ ] Can view on heatmap

### Admin Features
- [ ] Dashboard shows stats
- [ ] Can see all inspections
- [ ] Can delete inspections
- [ ] Can view inspection details
- [ ] Can update repair status
- [ ] Can upload after image
- [ ] Can mark as completed

### Inspector Features
- [ ] Can see own inspections only
- [ ] Can view inspection details
- [ ] Can add feedback on completed repairs
- [ ] Can rate repairs (1-5 stars)

### Map Features
- [ ] Map loads with markers
- [ ] Markers color-coded by status
- [ ] Satellite view toggle works
- [ ] Street view (pegman) works
- [ ] Fullscreen works
- [ ] Realtime updates work

---

## 🔒 Security

- [ ] `.env` files in `.gitignore`
- [ ] No API keys in git history
- [ ] `service_role` key only in backend
- [ ] RLS policies tested
- [ ] Storage policies tested
- [ ] Admin role verified
- [ ] Inspector role auto-assigned
- [ ] CORS configured correctly

---

## 🚀 Production (Optional)

### Backend Deployment
- [ ] Push to GitHub (without .env)
- [ ] Deploy to Render/Railway/Fly.io
- [ ] Set environment variables
- [ ] Note backend URL
- [ ] Test health endpoint

### Frontend Deployment
- [ ] Deploy to Vercel/Netlify
- [ ] Set environment variables
- [ ] Update `VITE_API_URL` to production backend
- [ ] Update CORS in backend
- [ ] Update Google Maps key restrictions
- [ ] Test production site

---

## 📊 Final Verification

- [ ] All pages load without errors
- [ ] No console errors
- [ ] Images display correctly
- [ ] Maps work correctly
- [ ] Realtime updates work
- [ ] Mobile responsive
- [ ] All workflows tested end-to-end

---

## 📁 Files Changed Summary

### Must Update
1. `backend/.env` - All values
2. `frontend/.env` - All values

### No Changes Needed
- All `.jsx` files (use env vars)
- All `.js` files (use env vars)
- `package.json` files
- SQL files (run as-is)

---

## 🎯 Quick Start Commands

```bash
# 1. Setup backend
cd backend
npm install
# Update .env file
npm run dev

# 2. Setup frontend (new terminal)
cd frontend
npm install
# Update .env file
npm run dev

# 3. Access app
# Frontend: http://localhost:5174
# Backend: http://localhost:5001
```

---

## 📞 Common Issues

| Issue | Solution |
|-------|----------|
| 402 Roboflow error | Out of credits - app uses mock data |
| 403/406 Supabase | Check RLS policies and auth token |
| 404 on API calls | Check backend is running and VITE_API_URL |
| Images not loading | Check storage bucket is public |
| Can't login | Check user exists and password correct |
| Admin sees no data | Check admin role set in profiles |
| Map not loading | Check Google Maps API key and enabled APIs |

---

**Ready to deploy? Follow DEPLOYMENT_GUIDE.md for detailed steps!**
