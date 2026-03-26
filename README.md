# 🛣️ RoadSense - AI-Based Road Inspection System

> Built for WITCHAR-26 Hackathon · Problem Statement ID: 05
> Team: Atharva Baodhankar · Esha Chavan · Jay Suryawanshi

## 🎯 Project Overview

RoadSense is a full-stack web application that automates road inspection using AI-powered defect detection. It helps municipal authorities identify and prioritize road maintenance by analyzing photos uploaded by field inspectors.

### Key Features

- 🤖 **AI Detection**: YOLOv8 models detect potholes, cracks, and alligator cracking
- 📊 **Quality Scoring**: Automatic road quality assessment (0-100 scale)
- 🗺️ **Live Heatmap**: Real-time visualization of road conditions
- 📍 **GPS Tagging**: Automatic location capture from device
- 🎨 **Annotated Images**: Bounding boxes drawn on detected defects
- 👥 **Role-Based Access**: Inspector and Admin user roles
- ⚡ **Real-time Updates**: Live dashboard updates via Supabase Realtime

## ✅ Current Status

### Completed ✅
- ✅ Backend API with Express.js
- ✅ AI detection using dual Roboflow models (potholes + cracks)
- ✅ Image annotation with bounding boxes (Jimp + Sharp)
- ✅ Supabase integration (Auth, Database, Storage, Realtime)
- ✅ Quality score calculation algorithm
- ✅ Frontend structure with React + Tailwind
- ✅ Authentication pages (Login/Signup)
- ✅ Landing page
- ✅ Role-based routing

### In Progress 🔄
- 🔄 Upload page with GPS tagging
- 🔄 Admin dashboard with statistics
- 🔄 Google Maps heatmap integration
- 🔄 Inspection detail pages

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account (already configured)
- Roboflow API key

### 1. Backend Setup

```bash
cd backend
npm install
```

Update `.env` with your API keys (Supabase keys already set):
```env
ROBOFLOW_API_KEY=your_key_here
GOOGLE_MAPS_API_KEY=your_key_here
```

Start the backend:
```bash
npm run dev
```

Backend runs on: http://localhost:5001

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

## 🧪 Testing

### Test AI Detection

```bash
cd backend
node test-roboflow.js
```

This tests the dual-model detection system with a sample image.

### Test Backend Health

```bash
curl http://localhost:5001/api/health
```

### Create Test User

```bash
cd backend
node create-test-user.js
```

Creates: `test.inspector@roadsense.com` / `Test@1234`

## 📁 Project Structure

```
RoadSense/
├── backend/
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── upload.js            # Multer config
│   ├── routes/
│   │   ├── inspect.js           # Main inspection endpoint
│   │   ├── inspections.js       # CRUD operations
│   │   ├── stats.js             # Dashboard stats
│   │   └── heatmap.js           # Map data
│   ├── services/
│   │   ├── roboflow.js          # AI detection (dual models)
│   │   ├── annotate.js          # Bounding box drawing
│   │   ├── storage.js           # Supabase storage upload
│   │   ├── scorer.js            # Quality score calculation
│   │   └── geocoder.js          # Reverse geocoding
│   ├── .env                     # Environment variables
│   └── server.js                # Express server
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabase.js      # Supabase client
│   │   │   └── api.js           # Axios API client
│   │   ├── pages/
│   │   │   ├── Landing.jsx      # Landing page
│   │   │   ├── Login.jsx        # Login page
│   │   │   ├── Signup.jsx       # Signup page
│   │   │   ├── Upload.jsx       # Inspector upload
│   │   │   ├── Dashboard.jsx    # Admin dashboard
│   │   │   ├── MapPage.jsx      # Heatmap view
│   │   │   └── InspectionDetail.jsx
│   │   ├── App.jsx              # Main app with routing
│   │   └── index.css            # Design system styles
│   └── .env                     # Frontend env vars
│
└── node-test/                   # Original working AI code
    ├── detect-combined.js       # Dual model detection
    └── wow.png                  # Test image
```

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | Public |
| POST | `/api/inspect` | Submit inspection | Required |
| GET | `/api/inspections` | List inspections | Required |
| GET | `/api/inspections/:id` | Get single inspection | Required |
| DELETE | `/api/inspections/:id` | Delete inspection | Admin only |
| GET | `/api/stats` | Dashboard statistics | Admin only |
| GET | `/api/heatmap` | Heatmap data | Required |

## 🎨 Design System

The frontend follows a strict design system:

- **Colors**: Warm off-white background (#F9F9F8), green primary (#15803d)
- **Typography**: Inter font, monospace for scores/coordinates
- **Components**: Status pills, score displays, defect chips
- **Animations**: Pulse effects for live indicators and critical alerts

See `SYSTEM_DESIGN.md` section 20 for complete design guidelines.

## 🗄️ Database Schema

### profiles
```sql
- id (UUID, FK to auth.users)
- email (TEXT)
- name (TEXT)
- role (TEXT: 'inspector' | 'admin')
- created_at (TIMESTAMPTZ)
```

### inspections
```sql
- id (UUID)
- lat, lng (DECIMAL)
- address (TEXT)
- timestamp (TIMESTAMPTZ)
- score (INTEGER 0-100)
- status (TEXT: 'Good' | 'Moderate' | 'Critical')
- defect_count (INTEGER)
- defects (JSONB)
- original_image_url (TEXT)
- annotated_image_url (TEXT)
- inspector_id (UUID, FK)
- zone (TEXT)
```

## 🤖 AI Detection

Uses two Roboflow YOLOv8 models:

1. **Pothole Detection**: Detects potholes with high accuracy
2. **Crack Detection**: Detects cracks, weathering, and raveling

### Quality Score Algorithm

```javascript
Penalties:
- Pothole: -15 points
- Alligator Cracking: -10 points
- Crack: -5 points
- Weathering: -3 points

Score = max(0, 100 - total_penalty)

Status:
- Good: 80-100
- Moderate: 50-79
- Critical: 0-49
```

## 🔐 User Roles

### Inspector
- Upload road photos
- View own inspections
- Auto-assigned on signup

### Admin
- View all inspections
- Access dashboard with statistics
- Delete inspections
- Export reports
- View heatmap

**Admin credentials**: Check with team (set manually in Supabase)

## 🌐 Environment Variables

### Backend (.env)
```env
SUPABASE_URL=https://sigekuvayyrtapqrkbcs.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
ROBOFLOW_API_KEY=your_key
ROBOFLOW_POTHOLE_URL=https://...
ROBOFLOW_CRACK_URL=https://...
GOOGLE_MAPS_API_KEY=your_key
PORT=5001
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://sigekuvayyrtapqrkbcs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_MAPS_KEY=your_key
VITE_API_URL=http://localhost:5001/api
```

## 📝 Next Steps

1. Complete Upload page with GPS auto-detection
2. Build Admin Dashboard with real-time stats
3. Integrate Google Maps heatmap
4. Add PDF export functionality
5. Implement Redis caching (optional)
6. Deploy to production

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, React Router
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (2 buckets)
- **Auth**: Supabase Auth (JWT)
- **AI**: Roboflow YOLOv8 (dual models)
- **Image Processing**: Sharp, Jimp
- **Maps**: Google Maps API (planned)

## 📄 License

Built for educational purposes - WITCHAR-26 Hackathon

## 👥 Team

- Atharva Baodhankar
- Esha Chavan
- Jay Suryawanshi

---

**Status**: Backend fully functional ✅ | Frontend structure complete ✅ | AI detection working ✅
