# CampusAI — Smart College Assistant | Project Summary

> **Last updated**: 2026-06-16  
> **Purpose**: Complete reference document for auditing, decision-making, and understanding the full system. Use this to verify what exists, what's missing, and what should or shouldn't be here.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project File Tree](#2-project-file-tree)
3. [File-by-File Breakdown](#3-file-by-file-breakdown)
4. [Database Schema](#4-database-schema)
5. [User Accounts & Roles](#5-user-accounts--roles)
6. [Role Privileges Matrix](#6-role-privileges-matrix)
7. [Complete API Endpoint Map](#7-complete-api-endpoint-map)
8. [Frontend Feature Location Map](#8-frontend-feature-location-map)
9. [Feature Summary by Phase](#9-feature-summary-by-phase)
10. [How to Run](#10-how-to-run)
11. [Environment Variables](#11-environment-variables)
12. [Dependencies](#12-dependencies)

---

## 1. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | React | 18.3.1 | Component-based SPA UI |
| **Frontend Build Tool** | Vite | 5.2.11 | Fast dev server & HMR |
| **Frontend Routing** | react-router-dom | 6.23.1 | Client-side page routing (`/login`, `/register`, `/`) |
| **Frontend Icons** | lucide-react | 0.395.0 | SVG icon components used across all tabs |
| **Frontend Language** | JavaScript (JSX) | ES2022 | All frontend logic and components |
| **Frontend Styling** | Vanilla CSS | — | Custom dark-mode glassmorphism design system in `index.css` |
| **Backend Framework** | FastAPI | ≥0.111.0 | Python REST API server |
| **Backend Language** | Python | 3.x | All backend logic, API handlers, AI integration |
| **Backend Server** | Uvicorn | ≥0.30.1 | ASGI server running FastAPI |
| **Database** | MySQL | 8.x | All persistent data storage |
| **Database Connector** | mysql-connector-python | ≥8.0.33 | Python ↔ MySQL bridge |
| **Password Hashing** | bcrypt | ≥4.1.0 | Secure password storage |
| **Input Validation** | Pydantic | ≥2.7.4 | Request body schemas with type enforcement |
| **Email Validation** | email-validator | ≥2.0.0 | Email format validation in Pydantic models |
| **Environment Config** | python-dotenv | ≥1.0.1 | Loads `.env` file for DB credentials & API keys |
| **AI Integration** | Google Gemini 2.5 Flash | v1beta API | Chatbot AI responses (with local fallback) |

---

## 2. Project File Tree

```
CAMPUS ASSISTANT/
│
├── backend/                          # Python FastAPI backend server
│   ├── .env                          # Environment variables (DB creds, Gemini API key)
│   ├── requirements.txt              # Python package dependencies
│   ├── schema.sql                    # MySQL schema reference (5 tables)
│   ├── database.py                   # DB connection, table creation, migrations, admin seeding
│   ├── auth.py                       # Authentication helpers (hash, verify, register, login)
│   ├── main.py                       # FastAPI app — ALL 26 API endpoints live here
│   └── __pycache__/                  # Python bytecode cache (auto-generated, ignore)
│
├── frontend/                         # React + Vite frontend application
│   ├── index.html                    # HTML entry point with meta tags & Google Fonts link
│   ├── package.json                  # NPM dependencies & scripts
│   ├── package-lock.json             # NPM lock file (auto-generated)
│   ├── vite.config.js                # Vite dev server config (React plugin)
│   ├── node_modules/                 # NPM packages (auto-generated, ignore)
│   └── src/                          # Source code
│       ├── main.jsx                  # React DOM entry — mounts <App /> into #root
│       ├── App.jsx                   # Root component — auth state, routing, session persistence
│       ├── index.css                 # Global CSS — design system, dark theme, glassmorphism, animations
│       └── pages/
│           ├── Login.jsx             # Login page component
│           ├── Register.jsx          # Registration page component
│           └── Dashboard.jsx         # THE MAIN FILE — contains ALL 9 feature tabs (~3200 lines)
│
├── .venv/                            # Python virtual environment (auto-generated, ignore)
└── __pycache__/                      # Root-level Python cache (auto-generated, ignore)
```

---

## 3. File-by-File Breakdown

### Backend Files (Python)

| File | Size | Language | What It Does |
|------|------|----------|-------------|
| **`.env`** | 213B | Config | Stores `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, and `GEMINI_API_KEY`. Loaded by `python-dotenv`. Never commit this to git. |
| **`requirements.txt`** | 138B | Config | Lists 7 Python packages needed: `fastapi`, `uvicorn`, `mysql-connector-python`, `bcrypt`, `python-dotenv`, `pydantic`, `email-validator`. |
| **`schema.sql`** | ~2KB | SQL | Reference schema with `CREATE TABLE` statements for all 5 tables. Not executed at runtime — `database.py` handles creation programmatically. Useful as a human-readable reference. |
| **`database.py`** | ~5.7KB | Python | **3 functions**: `get_connection()` connects to MySQL server (no DB selected), `init_db()` creates the database + all 5 tables + runs migrations (adds `is_admin` column if missing) + seeds the admin account, `get_db_connection()` connects directly to the `campus_ai` database. Called on server startup. |
| **`auth.py`** | ~3.5KB | Python | **5 functions**: `hash_password()` bcrypt hashes a password, `check_password()` verifies against hash, `validate_email()` regex check, `register_student()` inserts new student row, `login_student()` authenticates and returns user dict with `is_admin` flag. |
| **`main.py`** | ~75KB | Python | **The core API server**. Contains: FastAPI app initialization, CORS config, 11 Pydantic request schemas, startup event handler, **26 API endpoint handlers**, Gemini AI integration, local chatbot fallback engine, resume skill-matching logic, study plan generation algorithm, and performance prediction heuristics. This is the largest and most critical backend file. |

### Frontend Files (JavaScript/JSX)

| File | Size | Language | What It Does |
|------|------|----------|-------------|
| **`index.html`** | 828B | HTML | Entry HTML document. Sets page title ("CampusAI – Smart College Assistant"), meta description, links Google Fonts (Outfit), mounts React into `<div id="root">`. |
| **`vite.config.js`** | 210B | JS | Vite configuration. Enables React plugin (`@vitejs/plugin-react`). Default dev server runs on port 5173. |
| **`package.json`** | 578B | JSON | Defines project name (`campus-ai-frontend`), version (`1.0.0`), scripts (`dev`, `build`, `lint`, `preview`), and 4 runtime + 3 dev dependencies. |
| **`main.jsx`** | 235B | JSX | React entry point. Imports `App` and renders `<App />` into the DOM root using `ReactDOM.createRoot()`. |
| **`App.jsx`** | ~2.3KB | JSX | **Root component**. Manages auth state (`user` object or `null`). Persists login session to `localStorage`. Defines 3 routes: `/login` → Login page, `/register` → Register page, `/` → Dashboard (authenticated only). Redirects unauthenticated users to `/login`. |
| **`index.css`** | ~10KB | CSS | **Global design system**. Dark theme variables (`--bg-color`, `--card-bg`, etc.), glassmorphic card styling, gradient buttons with shimmer animations, form input styles, sidebar navigation layout, responsive grid breakpoints, `.info-card` panel class, `.animate-spin` keyframes, admin grid responsive media query. |
| **`Login.jsx`** | ~3.1KB | JSX | Login form. Email + password inputs. Calls `POST /api/login`. On success, stores user data in `localStorage` and triggers `onLoginSuccess` callback. Shows error messages. Links to Register page. |
| **`Register.jsx`** | ~4KB | JSX | Registration form. Full name + email + password + confirm password. Client-side password match check. Calls `POST /api/register`. Shows success/error. Links to Login page. |
| **`Dashboard.jsx`** | **~150KB** | JSX | **THE MAIN APPLICATION FILE**. Contains ALL 9 feature tabs in a single component (~3200 lines). Includes: 30+ state variables, 15+ API handler functions, 10 render methods (`renderDashboardHome`, `renderAttendanceTracker`, `renderCgpaCalculator`, `renderChatbot`, `renderPerformancePredictor`, `renderResumeAnalyzer`, `renderStudyPlanner`, `renderAdminDashboard`), sidebar menu construction, and the main `renderContent()` switch-case router. |

---

## 4. Database Schema

**Database name**: `campus_ai` (configurable via `.env`)

### Table: `students`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `full_name` | VARCHAR(100) | Required |
| `email` | VARCHAR(100) UNIQUE | Required, lowercased on insert |
| `password_hash` | VARCHAR(255) | bcrypt hash |
| `is_admin` | BOOLEAN DEFAULT FALSE | Added via migration. Controls admin panel access |
| `created_at` | TIMESTAMP | Auto-set on creation |

### Table: `attendance`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `student_id` | INT | Foreign key → `students(id)` ON DELETE CASCADE |
| `subject_name` | VARCHAR(100) | e.g. "Mathematics II" |
| `attended_classes` | INT DEFAULT 0 | Classes attended |
| `total_classes` | INT DEFAULT 0 | Total classes held |

### Table: `cgpa_courses`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `student_id` | INT | Foreign key → `students(id)` ON DELETE CASCADE |
| `semester` | INT | 1–8 |
| `course_name` | VARCHAR(100) | e.g. "Data Structures" |
| `credits` | INT | Credit weight |
| `grade_point` | DECIMAL(4,2) | 0.00–10.00 |

### Table: `study_plans`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `student_id` | INT | Foreign key → `students(id)` ON DELETE CASCADE |
| `subject_name` | VARCHAR(100) | Subject for this session |
| `topic` | VARCHAR(255) | Specific topic/chapter |
| `study_date` | DATE | Scheduled date |
| `duration_minutes` | INT DEFAULT 60 | Session length |
| `is_completed` | BOOLEAN DEFAULT FALSE | Completion toggle |
| `created_at` | TIMESTAMP | Auto-set |

### Table: `announcements`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `title` | VARCHAR(150) | Notice title |
| `content` | TEXT | Full body |
| `type` | VARCHAR(50) | "Alert", "Event", "Exam", "General" |
| `priority` | VARCHAR(20) | "High", "Medium", "Low" |
| `created_at` | TIMESTAMP | Auto-set |

### Relationships
- `attendance.student_id` → `students.id` (CASCADE DELETE)
- `cgpa_courses.student_id` → `students.id` (CASCADE DELETE)
- `study_plans.student_id` → `students.id` (CASCADE DELETE)
- `announcements` — no FK, shared across all users

---

## 5. User Accounts & Roles

### How Login Works
1. User visits `http://localhost:5173/login`
2. Enters email + password
3. Frontend calls `POST /api/login` → backend validates via `auth.login_student()`
4. On success, backend returns `{ message, user: { id, full_name, email, created_at, is_admin } }`
5. Frontend stores the `user` object in `localStorage` and React state
6. `App.jsx` redirects to `/` which renders `Dashboard.jsx`
7. `Dashboard.jsx` reads `user.is_admin` to decide whether to show the Admin tab

### Existing Accounts

| Account | Email | Password | `is_admin` | Purpose |
|---------|-------|----------|-----------|---------|
| **Admin** | `admin@campus.edu` | `adminpassword` | `true` | Auto-seeded on first server start. Has access to Admin Dashboard tab. Can view all students, campus metrics, publish/delete announcements. |
| **Student (Poorni)** | `sit24co035@sairamtap.edu.in` | *(user-set)* | `false` | Real user account with attendance and CGPA data. |
| **Student (trial)** | `trial@gmail.com` | *(user-set)* | `false` | Test account with no data. |
| **Student (Test)** | `test@example.com` | `password123` | `false` | Test account with some attendance data (70.3% overall, flagged as High Risk). |

### How to Create New Accounts
- **Student**: Use the Register page at `/register`. All new accounts default to `is_admin = FALSE`.
- **Admin**: There is NO admin registration UI. To create an admin, either:
  - Manually update the database: `UPDATE students SET is_admin = TRUE WHERE email = 'someone@email.com';`
  - Or modify the seed logic in `database.py` (line ~121–131).

---

## 6. Role Privileges Matrix

| Feature / Action | Student (`is_admin=false`) | Admin (`is_admin=true`) |
|-----------------|---------------------------|------------------------|
| View Dashboard Home (stats + announcements) | ✅ Yes | ✅ Yes |
| Attendance Tracker (add/edit/delete subjects) | ✅ Yes (own data) | ✅ Yes (own data) |
| CGPA Calculator (add/edit/delete courses) | ✅ Yes (own data) | ✅ Yes (own data) |
| AI Chatbot (ask questions) | ✅ Yes (own context) | ✅ Yes (own context) |
| Performance Predictor (risk analysis) | ✅ Yes (own data) | ✅ Yes (own data) |
| Resume Analyzer | ✅ Yes | ✅ Yes |
| Study Planner (generate/manage sessions) | ✅ Yes (own data) | ✅ Yes (own data) |
| **See "Admin Dashboard ⚙️" in sidebar** | ❌ Hidden | ✅ Visible |
| **View campus-wide metrics (total students, avg CGPA, avg attendance)** | ❌ No | ✅ Yes |
| **View all students with risk classifications** | ❌ No | ✅ Yes |
| **Search/filter student roster** | ❌ No | ✅ Yes |
| **Publish new announcements** | ❌ No | ✅ Yes |
| **Delete announcements** | ❌ No | ✅ Yes |
| **See published announcements in dashboard feed** | ✅ Yes (read-only) | ✅ Yes (read-only) |

> **Important**: There is NO server-side authorization on admin endpoints. Any user who knows the URL can call `/api/admin/metrics` or `/api/admin/students` directly. The access control is currently **frontend-only** (sidebar visibility). This is a security gap to be aware of.

---

## 7. Complete API Endpoint Map

All endpoints are defined in `backend/main.py`. The backend runs on `http://localhost:8000`.

### System

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| — | `@app.on_event("startup")` | L94 | Auto-calls `database.init_db()` to create tables, run migrations, seed admin |
| GET | `/api/health` | L105 | Returns `{ status: "healthy" }`. Connectivity test. |

### Authentication (Phase 1)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| POST | `/api/register` | L110 | Creates new student. Body: `{ full_name, email, password }`. Returns success message or error. |
| POST | `/api/login` | L124 | Authenticates student. Body: `{ email, password }`. Returns `{ message, user: { id, full_name, email, created_at, is_admin } }`. |

### Dashboard (Phase 2)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| GET | `/api/dashboard/stats?student_id=N` | L142 | Returns student's overall CGPA, CGPA max, attendance %, attendance status ("Safe"/"Danger"), upcoming sessions count. Queries both `attendance` and `cgpa_courses` tables. |
| GET | `/api/dashboard/announcements?student_id=N` | L208 | Returns all announcements from the `announcements` table sorted by `created_at DESC`. Seeds 3 defaults if table is empty. |

### Attendance (Phase 3)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| GET | `/api/attendance?student_id=N` | L253 | Returns all subjects for a student with attendance counts. |
| POST | `/api/attendance` | L276 | Adds a new subject. Body: `{ student_id, subject_name, attended_classes, total_classes }`. Prevents duplicates. |
| PUT | `/api/attendance/{attendance_id}` | L327 | Updates subject name, attended, and total counts. |
| DELETE | `/api/attendance/{attendance_id}` | L377 | Deletes an attendance record. |

### CGPA (Phase 4)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| GET | `/api/cgpa?student_id=N` | L405 | Returns all courses for a student. |
| POST | `/api/cgpa` | L430 | Adds a course. Body: `{ student_id, semester, course_name, credits, grade_point }`. |
| PUT | `/api/cgpa/{course_id}` | L485 | Updates a course entry. |
| DELETE | `/api/cgpa/{course_id}` | L536 | Deletes a course. |

### AI Chatbot (Phase 5)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| POST | `/api/chatbot` | L869 | Sends a message to the chatbot. Body: `{ student_id, message, history }`. Builds student context from DB, calls Gemini API, returns AI response. Falls back to local rule-based engine on API errors. |

*Helper functions (not endpoints, defined earlier in main.py):*
- `get_student_context(student_id)` — queries student profile, attendance, grades and formats as structured text
- `generate_grounded_fallback_response(message, context)` — local rule-based response generator with keyword matching

### Performance Predictor (Phase 6)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| GET | `/api/performance/predict?student_id=N` | L942 | Analyzes attendance and grade data. Returns: overall risk status (Stable/Warning/Critical), per-subject attendance standings, grade warning zones, predicted next SGPA with penalty heuristics. |

### Resume Analyzer (Phase 7)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| POST | `/api/resume/analyze` | L1128 | Analyzes resume against a target role. Body: `{ resume_text, target_role }`. Returns: alignment score, matched skills, skill gaps, learning action plan with project/course recommendations. All processing is local (no AI API call). |

### Study Planner (Phase 8)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| GET | `/api/study-planner?student_id=N` | L1196 | Returns all study plan sessions for a student. |
| POST | `/api/study-planner` | L1220 | Adds a manual study session. Body: `{ student_id, subject_name, topic, study_date, duration_minutes }`. |
| PUT | `/api/study-planner/{task_id}` | L1261 | Updates a session (subject, topic, date, duration, or completion status). |
| DELETE | `/api/study-planner/{task_id}` | L1309 | Deletes a session. |
| POST | `/api/study-planner/generate` | L1377 | Auto-generates a study schedule. Body: `{ student_id, exam_start_date, daily_hours }`. Uses attendance data to weight subjects. Clears old plans and inserts new ones. |

### Admin Dashboard (Phase 9)

| Method | Endpoint | Line | Purpose |
|--------|---------|------|---------|
| GET | `/api/admin/metrics` | L1583 | Campus-wide stats: total non-admin students, average CGPA (weighted), average attendance %. |
| GET | `/api/admin/students` | L1626 | Lists all non-admin students with per-student CGPA, attendance %, and risk status (High/Warning/Stable). |
| POST | `/api/announcements` | L1688 | Creates a new announcement. Body: `{ title, content, type, priority }`. |
| DELETE | `/api/announcements/{announcement_id}` | L1723 | Deletes an announcement by ID. |

---

## 8. Frontend Feature Location Map

All features live inside `Dashboard.jsx`. Here's where each piece is in the code:

### State Variables (Lines 20–131)

| State Group | Lines | Purpose |
|------------|-------|---------|
| Core dashboard | L21–25 | `activeTab`, `stats`, `announcements`, `loading`, `error` |
| Attendance | L28–43 | Subject data, add/edit form state |
| CGPA | L46–70 | Course data, add/edit form state, target CGPA, expanded semesters |
| Chatbot | L73–78 | Messages array, input, loading, error |
| Performance Predictor | L81–84 | Prediction data, simulated grades |
| Resume Analyzer | L87–91 | Resume text, target role, results |
| Study Planner | L94–109 | Plans, date inputs, manual session form |
| Admin Dashboard | L112–131 | Admin stats, student list, announcements, search/filter, new announcement form |

### API Handlers (Lines 130–768)

| Function | Lines | Calls |
|----------|-------|-------|
| `fetchDashboardData()` | L130–156 | `GET /api/dashboard/stats` + `GET /api/dashboard/announcements` |
| `fetchAttendance()` | L158–180 | `GET /api/attendance` |
| `handleAddSubject()` | L182–230 | `POST /api/attendance` |
| `handleUpdateAttendance()` | L232–280 | `PUT /api/attendance/{id}` |
| `handleDeleteAttendance()` | L282–306 | `DELETE /api/attendance/{id}` |
| `fetchCourses()` | L315–340 | `GET /api/cgpa` |
| `handleAddCourse()` | L342–395 | `POST /api/cgpa` |
| `handleUpdateCourse()` | L397–432 | `PUT /api/cgpa/{id}` |
| `handleDeleteCourse()` | L434–457 | `DELETE /api/cgpa/{id}` |
| `fetchPrediction()` | L460–475 | `GET /api/performance/predict` |
| `handleSendMessage()` | L481–535 | `POST /api/chatbot` |
| `handleAnalyzeResume()` | L537–565 | `POST /api/resume/analyze` |
| `fetchStudyPlans()` | L567–590 | `GET /api/study-planner` |
| `handleGeneratePlan()` | L592–630 | `POST /api/study-planner/generate` |
| `handleAddSession()` | L632–670 | `POST /api/study-planner` |
| `handleToggleComplete()` | L672–683 | `PUT /api/study-planner/{id}` |
| `fetchAdminData()` | L685–712 | `GET /api/admin/metrics` + `GET /api/admin/students` + `GET /api/dashboard/announcements` |
| `handleCreateAnnouncement()` | L720–751 | `POST /api/announcements` |
| `handleDeleteAnnouncement()` | L753–767 | `DELETE /api/announcements/{id}` |

### Render Methods

| Function | Approx Lines | Sidebar Tab ID | Sidebar Label |
|----------|-------------|---------------|---------------|
| `renderDashboardHome()` | L2590–2741 | `dashboard` | Dashboard 📊 |
| `renderAttendanceTracker()` | L810–1180 | `attendance` | Attendance Tracker 📅 |
| `renderCgpaCalculator()` | L1190–1530 | `cgpa` | CGPA Calculator 📐 |
| `renderChatbot()` | L1530–1570 | `chatbot` | AI Chatbot 🤖 |
| `renderPerformancePredictor()` | L1570–1940 | `performance` | Performance Predictor 🔮 |
| `renderResumeAnalyzer()` | L1940–2130 | `resume` | Resume Analyzer 📄 |
| `renderStudyPlanner()` | L2130–2577 | `study_planner` | Study Planner 📅 |
| `renderAdminDashboard()` | L2751–3155 | `admin` | Admin Dashboard ⚙️ |

### Navigation & Layout (Lines 2579–3238)

| Section | Lines | What It Contains |
|---------|-------|-----------------|
| `menuItems` array | L2579–2588 | Sidebar tabs. Admin tab conditionally included via `...(user?.is_admin ? [...] : [])` |
| `renderContent()` | L3157–3179 | Switch-case routing `activeTab` → render method |
| `getActiveTitle()` | L3181–3183 | Returns label for the current tab (displayed in header) |
| Sidebar JSX | L3186–3219 | Brand logo, user profile widget, nav menu loop, logout button |
| Main content area | L3221–3232 | Header + `renderContent()` |

---

## 9. Feature Summary by Phase

### Phase 1: Authentication 🔐
- Register with full_name, email, password (bcrypt hashed)
- Login with email + password
- Session persisted in `localStorage`
- `is_admin` boolean flag returned on login

### Phase 2: Dashboard Home 📊
- Welcome banner with student name
- 3 metric cards: CGPA (with progress bar), Attendance % (with status badge), Study Planner (session count)
- Quick-nav links to other tabs
- Announcements feed from database (sorted newest first)

### Phase 3: Attendance Tracker 📅
- Add/edit/delete subjects
- Present ✅ / Absent ❌ quick buttons
- Color-coded progress bars (green ≥ 75%, red < 75%)
- Bunk insight calculator: "You can bunk N classes" or "Attend N more to reach 75%"
- Overall average attendance banner

### Phase 4: CGPA Calculator 📐
- Semester 1–8 accordion panels
- Add/edit/delete courses (name, credits, grade point)
- Semester SGPA and overall CGPA computed live
- Academic standing classification (Outstanding / First Class / etc.)
- Target CGPA simulator: "Need X.XX SGPA across Y remaining credits"

### Phase 5: AI Chatbot 🤖
- Chat bubble interface with auto-scroll
- Sends student's real DB data (attendance, courses, profile) as context to Gemini API
- Quick-prompt pills for common questions
- **Local fallback**: When Gemini API fails (quota/permissions), a rule-based engine activates using keyword matching against the student's actual data
- Knows about all 9 project phases and can answer project roadmap questions

### Phase 6: Performance Predictor 🔮
- Classifies overall standing: Stable / Warning / Critical
- Per-subject attendance safety status
- Grade warning zones for low-performing courses
- Next-semester SGPA prediction with penalty heuristics
- What-If simulator: hypothetical grades → forecast new SGPA/CGPA

### Phase 7: Resume Analyzer 📄
- Paste text or upload `.txt` file
- Select target role (Frontend Dev, Backend Dev, Data Scientist, ML Engineer, Full Stack, etc.)
- Alignment score (0–100%)
- Matched skills (green badges) vs Skill gaps (orange badges)
- Learning action plan with specific project ideas and course recommendations
- Runs entirely locally — no external API dependency

### Phase 8: Study Planner 📅
- Auto-generates exam prep schedule from attendance subjects
- Weighs subjects by credits and attendance risk (low-attendance subjects get 1.5x priority)
- Enforces daily study hour limits
- Progress tracking: completion %, total hours studied
- Checkbox toggles for individual sessions
- Manual session insertion form

### Phase 9: Admin Dashboard ⚙️
- Sidebar tab only visible to `is_admin = true` accounts
- Campus overview: total students, average CGPA, average attendance
- Student roster table with search and risk filter
- Risk classification: Stable (CGPA ≥ 6.5, attendance ≥ 80%), Warning (below one threshold), High Risk (CGPA < 5.5 or attendance < 75%)
- Announcement publisher: title, body, type, priority → broadcasts to all student dashboards
- Active publications list with delete buttons

---

## 10. How to Run

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- MySQL Server 8.x running on localhost:3306
- A MySQL user (default: `root`) with database creation privileges

### Backend

```bash
cd backend
pip install -r requirements.txt        # Install Python dependencies
uvicorn main:app --reload              # Start on http://localhost:8000
```

The server auto-creates the `campus_ai` database, all tables, runs migrations, and seeds the admin account on first startup.

### Frontend

```bash
cd frontend
npm install                            # Install Node dependencies
npm run dev                            # Start on http://localhost:5173
```

### Access

| URL | What You See |
|-----|-------------|
| `http://localhost:5173/login` | Login page |
| `http://localhost:5173/register` | Registration page |
| `http://localhost:5173/` | Dashboard (redirects to /login if not authenticated) |
| `http://localhost:8000/docs` | FastAPI Swagger UI (all API endpoints documented) |

---

## 11. Environment Variables

File: `backend/.env`

| Variable | Default | Required | Purpose |
|----------|---------|----------|---------|
| `DB_HOST` | `localhost` | Yes | MySQL server host |
| `DB_USER` | `root` | Yes | MySQL username |
| `DB_PASSWORD` | *(empty)* | Yes | MySQL password |
| `DB_NAME` | `campus_ai` | Yes | Database name (auto-created) |
| `DB_PORT` | `3306` | No | MySQL port |
| `GEMINI_API_KEY` | *(none)* | For chatbot | Google Gemini API key. Chatbot works without it (uses local fallback), but responses are rule-based rather than AI-generated. |

---

## 12. Dependencies

### Backend (Python)

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework for building the REST API |
| `uvicorn` | ASGI server to run FastAPI |
| `mysql-connector-python` | MySQL database connector |
| `bcrypt` | Password hashing and verification |
| `python-dotenv` | Load `.env` file variables |
| `pydantic` | Request/response data validation schemas |
| `email-validator` | Email format validation (used by Pydantic's `EmailStr`) |

### Frontend (Node.js)

| Package | Purpose |
|---------|---------|
| `react` | UI component library |
| `react-dom` | DOM rendering for React |
| `react-router-dom` | Client-side routing (`/login`, `/register`, `/`) |
| `lucide-react` | SVG icon components (LayoutDashboard, Calculator, Settings, Trash2, etc.) |
| `vite` | Build tool and dev server |
| `@vitejs/plugin-react` | Vite plugin enabling JSX/React support |

---

## Known Gaps & Security Notes

> Use this section to flag things that exist but shouldn't, or should exist but don't.

1. **No server-side auth on admin endpoints**: `/api/admin/metrics`, `/api/admin/students`, `/api/announcements` (POST/DELETE) are accessible to anyone who knows the URL. There's no JWT/token or session check. The protection is purely frontend (sidebar hidden for non-admins).

2. **No password reset flow**: There's no "Forgot Password" functionality.

3. **No email verification**: Registration accepts any valid-format email without sending a confirmation link.

4. **Session = localStorage only**: No JWT tokens, no server-side sessions, no expiration. The user object is stored as-is in `localStorage`. Anyone with browser access can read it.

5. **Single monolithic Dashboard.jsx**: All 9 features live in one ~3200-line file. This works but could benefit from component extraction for maintainability.

6. **`schema.sql` is reference-only**: It's not executed by the app. `database.py` handles all table creation. If you change one, the other may drift out of sync.

7. **CORS is restricted**: Only `localhost:5173` and `127.0.0.1:5173` are allowed. This needs updating for production deployment.

8. **Gemini API key is in `.env`**: Ensure `.env` is in `.gitignore` before pushing to any repository.
