# ApplyAI
Using AI for automatical job application

# Job Application Management System - Complete Project Structure

## 📁 Project Structure

```
job-application-system/
├── frontend/                      # React Frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── Overview.tsx
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   └── ApplicationList.tsx
│   │   │   ├── profile/
│   │   │   │   ├── ProfileUpload.tsx
│   │   │   │   ├── ProfileForm.tsx
│   │   │   │   └── ProfileView.tsx
│   │   │   ├── jobs/
│   │   │   │   ├── JobSearch.tsx
│   │   │   │   ├── JobCard.tsx
│   │   │   │   └── JobDetails.tsx
│   │   │   ├── application/
│   │   │   │   ├── MaterialGenerator.tsx
│   │   │   │   ├── MatchAnalysis.tsx
│   │   │   │   └── DocumentEditor.tsx
│   │   │   ├── interview/
│   │   │   │   ├── InterviewPrep.tsx
│   │   │   │   └── InterviewChat.tsx
│   │   │   └── tracking/
│   │   │       └── ApplicationTracking.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── JobDetailsPage.tsx
│   │   │   ├── InterviewPage.tsx
│   │   │   └── TrackingPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── storage.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useJobs.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                       # Node.js Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── auth.ts
│   │   │   └── azure.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── userController.ts
│   │   │   ├── jobController.ts
│   │   │   ├── applicationController.ts
│   │   │   └── aiController.ts
│   │   ├── services/
│   │   │   ├── aiService.ts
│   │   │   ├── jobScraperService.ts
│   │   │   ├── documentService.ts
│   │   │   ├── emailService.ts
│   │   │   └── matchingService.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Job.ts
│   │   │   ├── Application.ts
│   │   │   └── Document.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── jobs.ts
│   │   │   ├── applications.ts
│   │   │   └── ai.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts
│   │   ├── utils/
│   │   │   ├── pdfParser.ts
│   │   │   ├── aiPrompts.ts
│   │   │   └── helpers.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── uploads/                   # Local file storage
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_add_indexes.sql
│   └── seeds/
│       └── dev_data.sql
│
├── shared/                        # Shared types
│   └── types.ts
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
│
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git
- Google Cloud Console account (for OAuth)
- AI API keys (OpenAI/Anthropic)

### Step 1: Clone and Install

```bash
# Create project directory
mkdir job-application-system
cd job-application-system

# Initialize git
git init

# Create frontend
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# Install frontend dependencies
npm install react-router-dom axios @tanstack/react-query
npm install lucide-react @headlessui/react
npm install react-pdf pdfjs-dist
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

cd ..

# Create backend
mkdir backend
cd backend
npm init -y
npm install express cors dotenv
npm install pg typeorm reflect-metadata
npm install passport passport-google-oauth20
npm install jsonwebtoken bcrypt
npm install multer pdf-parse
npm install openai @anthropic-ai/sdk
npm install nodemailer googleapis
npm install -D typescript @types/node @types/express
npm install -D @types/passport @types/jsonwebtoken
npm install -D @types/multer @types/bcrypt
npm install -D ts-node nodemon

cd ..
```

### Step 2: Database Setup

```bash
# Install PostgreSQL (if not already installed)
# Windows: Download from https://www.postgresql.org/download/windows/

# Create database
psql -U postgres
CREATE DATABASE job_application_db;
\q
```

### Step 3: Environment Variables

Create `.env` files:

**backend/.env**
```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/job_application_db

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Azure (for production)
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection
AZURE_STORAGE_CONTAINER=documents

# Gmail API
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Step 4: Run Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit: http://localhost:5173

## 📦 Build for Production

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

## 🚀 Azure Deployment

See `docs/DEPLOYMENT.md` for detailed Azure deployment instructions.

## 📚 Next Steps

I'll now provide all the code files. The artifacts will include:
1. Database schema
2. Backend code (TypeScript)
3. Frontend code (React + TypeScript)
4. Configuration files
5. Deployment scripts

Each file will be provided in separate artifacts for clarity.