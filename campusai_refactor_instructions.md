# CampusAI — Full Refactor Instruction Prompt
> Feed this entire document to your AI agent (Antigravity) as its instruction prompt.
> Last authored: 2026-06-16

---

## CONTEXT

You are working on **CampusAI**, a smart college assistant web app built with:
- **Frontend**: React 18 + Vite + react-router-dom + lucide-react + Vanilla CSS (dark glassmorphism)
- **Backend**: Python FastAPI + Uvicorn
- **Database**: MySQL 8.x
- **AI**: Google Gemini 2.5 Flash (with local fallback)

The project currently has 2 roles (Student, Admin) and 9 feature phases. You are being asked to perform a **complete architectural and feature refactor**. Follow every instruction below precisely. Do not skip any section.

---

## PART 1 — ROLE HIERARCHY & PRIVILEGE SEPARATION

### 1.1 New Role Structure

Replace the current single `is_admin` boolean with a proper `role` column. There are now **3 roles**:

| Role | Internal Value | Description |
|------|---------------|-------------|
| Student | `student` | Default for all self-registered accounts |
| Teacher | `teacher` | Created only by Admin. Cannot self-register. |
| Admin | `admin` | One seeded account. Can create Teachers. Full system access. |

### 1.2 Database Changes

**In the `students` table:**
- Remove the `is_admin` BOOLEAN column.
- Add `role` ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student'.
- Add `department` VARCHAR(100) DEFAULT NULL (used by teachers to scope their view).
- Add `reg_number` VARCHAR(50) DEFAULT NULL (for students — their college registration number).
- Write a migration in `database.py` that: checks if `is_admin` column exists → if yes, creates `role` column, copies data (`is_admin=TRUE` → `role='admin'`, else `role='student'`), then drops `is_admin`.

**New table: `teacher_subjects`**
```sql
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  subject_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  FOREIGN KEY (teacher_id) REFERENCES students(id) ON DELETE CASCADE
);
```
This maps which subjects a teacher is responsible for.

### 1.3 Privilege Matrix (Definitive)

| Feature | Student | Teacher | Admin |
|---------|---------|---------|-------|
| Register (self) | ✅ | ❌ | ❌ |
| Login | ✅ | ✅ | ✅ |
| View own Dashboard stats | ✅ | ❌ | ❌ |
| Attendance Tracker (own) | ✅ | ❌ | ❌ |
| CGPA Calculator (own) | ✅ | ❌ | ❌ |
| AI Chatbot (own context) | ✅ | ❌ | ❌ |
| Performance Predictor (own) | ✅ | ❌ | ❌ |
| Resume Analyzer | ✅ | ❌ | ❌ |
| Study Planner (own) | ✅ | ❌ | ❌ |
| View announcements (read-only) | ✅ | ✅ | ✅ |
| View students in their subject | ❌ | ✅ | ✅ |
| View attendance of their subject's students | ❌ | ✅ | ✅ |
| Mark/update attendance for their subject | ❌ | ✅ | ❌ |
| Publish announcements | ❌ | ❌ | ✅ |
| Delete announcements | ❌ | ❌ | ✅ |
| View campus-wide metrics | ❌ | ❌ | ✅ |
| View all students + risk classification | ❌ | ❌ | ✅ |
| Create Teacher accounts | ❌ | ❌ | ✅ |
| Promote Student to Teacher | ❌ | ❌ | ✅ |
| Delete any user account | ❌ | ❌ | ✅ |
| Assign subjects to Teachers | ❌ | ❌ | ✅ |

---

## PART 2 — AUTHENTICATION & EMAIL HANDLING

### 2.1 Email Domain Rules

Enforce the following at registration and login **on both frontend and backend**:

| Role | Allowed Email Domains | Example |
|------|-----------------------|---------|
| Student | Any institutional domain ending in `.edu`, `.edu.in`, or configured domain list | `sit24co035@sairamtap.edu.in` |
| Admin | Only `@campus.edu` (or the configured admin domain in `.env`) | `admin@campus.edu` |
| Teacher | Only institutional domain (same as student) — but account is **created by Admin**, not self-registered | — |

Add `ALLOWED_STUDENT_DOMAINS` and `ADMIN_EMAIL_DOMAIN` to `.env`. The backend must validate the email suffix before accepting any registration.

### 2.2 Registration Flow Changes

**Student Registration (`/register`):**
- Keep: full_name, email, password, confirm password.
- Add: `reg_number` field (college registration number, alphanumeric, required).
- Add: client-side domain check before submitting (show inline error if domain is not allowed).
- On success: show a banner "Account created. You can now log in." Do NOT auto-login. Redirect to `/login` after 2 seconds.

**Teacher Registration:**
- NO self-registration page for teachers.
- Teachers are created exclusively from the Admin Dashboard (see Part 5).
- A teacher account is created with a temporary password that the Admin sets. The teacher must change it on first login.

**Admin Registration:**
- No registration UI. Admin account is seeded by `database.py` on first startup only.
- Admin credentials must be read from `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Remove the hardcoded `admin@campus.edu` / `adminpassword` defaults from `database.py`. If `.env` values are missing, throw a startup error.

### 2.3 Login Flow Changes

**Single login page (`/login`) for all roles.** Do NOT create separate login pages per role. Role is determined by the backend after authentication.

The backend `POST /api/login` must return the `role` field in the user object:
```json
{ "message": "Login successful", "user": { "id", "full_name", "email", "role", "reg_number", "department", "created_at", "force_password_change" } }
```

**Frontend routing after login (in `App.jsx`):**
- `role === 'student'` → redirect to `/dashboard`
- `role === 'teacher'` → redirect to `/teacher`
- `role === 'admin'` → redirect to `/admin`

Each role gets its **own dedicated top-level route and layout component**. Do not use a single `Dashboard.jsx` for all roles.

### 2.4 Session & Security

**Replace localStorage raw user object with a signed session approach:**
- Backend must generate a **session token** (UUID v4 or similar) on login and store it in a `sessions` table:
  ```sql
  CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(128) PRIMARY KEY,
    student_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  );
  ```
- Sessions expire after **8 hours**.
- Frontend stores only the `token` string in `localStorage` (not the full user object).
- Every API request from the frontend must include the header: `Authorization: Bearer <token>`.
- Backend must validate this token on **every protected endpoint** using a dependency function.
- On logout, backend must `DELETE` the session row. Frontend clears `localStorage`.

**Add server-side auth guards to ALL admin and teacher endpoints.** The current frontend-only hiding is not acceptable.

### 2.5 Password Reset

Add a "Forgot Password?" link on the login page. Implementation:
- `POST /api/auth/forgot-password` — accepts `{ email }`. Always returns the same success message regardless of whether email exists (to prevent enumeration). Internally: generate a reset token (UUID), store it in a `password_resets` table with a 1-hour expiry, and print the reset link to server logs (since there is no email service). Optionally, if `SMTP_*` env vars are configured, send an actual email.
- `POST /api/auth/reset-password` — accepts `{ token, new_password }`. Validates token, updates bcrypt hash, deletes token row.
- Frontend: add `/reset-password` route with a form for new password + confirm.

### 2.6 Force Password Change

When a Teacher account is created by Admin, set `force_password_change = TRUE` in the DB. On the teacher's first login, the backend response includes `"force_password_change": true`. The frontend must intercept this and redirect to `/change-password` before allowing access to the teacher dashboard.

---

## PART 3 — LOGIN & REGISTER PAGE UI

### 3.1 Login Page (`Login.jsx`)

Keep the existing dark glassmorphism aesthetic. Make these changes:

- **Logo/Branding**: Show the CampusAI logo/name at the top of the card. Currently missing.
- **Role indicator**: Do NOT add a role dropdown. Role is auto-detected by backend.
- **"Forgot password?" link**: Add below the password field, aligned right, in a muted color. Links to `/forgot-password`.
- **"Don't have an account? Register" link**: Keep. But add a note in small text: "Teacher accounts are created by your administrator."
- **Error display**: Replace the current basic error text with a styled error banner (red-tinted glass card with an icon). Clear it when the user starts typing.
- **Loading state**: Disable the submit button and show a spinner inside it while the API call is in-flight.
- **Remove**: Any test account hint text or placeholder credentials visible in the UI.

### 3.2 Register Page (`Register.jsx`)

- Add `reg_number` field between `full_name` and `email`.
- Add real-time domain validation: as soon as the email field loses focus, check the domain and show an inline ✅ or ❌ indicator.
- Password strength indicator: show a colored bar (weak/medium/strong) as the user types the password. Enforce minimum 8 characters, 1 uppercase, 1 number.
- Confirm password: show a ✅ when both fields match in real-time.
- On success: do not auto-login. Show a success state (green checkmark + message) for 2 seconds then redirect to `/login`.

### 3.3 Forgot Password Page (`ForgotPassword.jsx`) — NEW

Simple centered card. One email input. Submit button. Shows a success state regardless of result (security best practice). Back to login link.

### 3.4 Change Password Page (`ChangePassword.jsx`) — NEW

Used for force-change on first teacher login and optionally for all users. Fields: current password, new password, confirm new password. Same password strength indicator as register.

---

## PART 4 — STUDENT DASHBOARD

The Student Dashboard is the refactored version of the current monolithic `Dashboard.jsx`. **Split it into separate component files.** The new structure under `src/pages/student/` should be:

```
src/pages/student/
├── StudentLayout.jsx       ← Sidebar + header shell (replaces the layout part of Dashboard.jsx)
├── StudentHome.jsx         ← Phase 2: Dashboard home
├── AttendanceTracker.jsx   ← Phase 3
├── CgpaCalculator.jsx      ← Phase 4
├── Chatbot.jsx             ← Phase 5
├── PerformancePredictor.jsx← Phase 6
├── ResumeAnalyzer.jsx      ← Phase 7
├── StudyPlanner.jsx        ← Phase 8
```

Routing: `/dashboard` renders `StudentLayout.jsx` which uses nested routes (`/dashboard/attendance`, `/dashboard/cgpa`, etc.).

### Features to KEEP (Student):
- Dashboard Home stats (CGPA card, Attendance card, Study session count card)
- Announcements feed (read-only)
- Attendance Tracker — keep all current functionality
- CGPA Calculator — keep all current functionality including Target CGPA simulator
- AI Chatbot — keep, but update the context-building to include `reg_number` and `role`
- Performance Predictor — keep all current functionality including What-If simulator
- Resume Analyzer — keep all current functionality
- Study Planner — keep all current functionality

### Features to REMOVE from Student view:
- Any admin-related state, handlers, or render functions that currently exist in `Dashboard.jsx` even when `is_admin=false`. These are dead code for students and must be fully separated.
- No student should ever be able to see or access `/api/admin/*` endpoints even by typing URLs.

### Features to ADD for Student:
- **Profile Page** (`/dashboard/profile`): Show name, email, reg_number, role, account creation date. Allow editing full_name only. Password change link. No role change from this page.
- **Notification badge**: Show a red dot on the sidebar Dashboard icon when there are unread announcements (track read state in localStorage per announcement ID).

### UI Changes for Student Dashboard:
- The sidebar must show the student's **reg_number** and **name** in the profile widget, not just name.
- Replace the emoji tab labels with clean lucide-react icons only (no emoji in production UI).
- Active tab in sidebar: use a left border accent + background highlight, not just a color change.
- Mobile: sidebar must collapse to a hamburger menu. Currently there is no mobile nav — add it.

---

## PART 5 — ADMIN DASHBOARD

Create a completely separate layout and pages under `src/pages/admin/`:

```
src/pages/admin/
├── AdminLayout.jsx         ← Sidebar + header shell for admin
├── AdminHome.jsx           ← Campus overview metrics
├── StudentRoster.jsx       ← Student list with search, filter, risk
├── TeacherManagement.jsx   ← NEW: Create/manage teacher accounts
├── AnnouncementManager.jsx ← Create/delete announcements
├── AccountSettings.jsx     ← Admin's own account (password change only)
```

Route: `/admin` renders `AdminLayout.jsx` with nested routes.

### Features to KEEP (Admin):
- Campus-wide metrics (total students, avg CGPA, avg attendance)
- Student roster with search and risk filter (Stable / Warning / High Risk)
- Announcement publisher (title, body, type, priority)
- Delete announcements

### Features to REMOVE from Admin:
- Admin should NOT have access to their own Attendance Tracker, CGPA Calculator, Chatbot, Performance Predictor, Resume Analyzer, or Study Planner. Admin is an administrative account, not a student account. Remove all those tabs entirely from the admin layout. If the admin is a real person who is also a student, they should have a separate student account.

### Features to ADD for Admin:

**Teacher Management (`TeacherManagement.jsx`):**
- Create Teacher account form: full_name, email (institutional domain only), department, temporary_password.
- Assign subjects to a teacher (multi-select from existing subjects in the DB or free-text entry).
- Table of all current teachers: name, email, department, subjects assigned, last login, status (Active / Force Password Change Pending).
- Delete teacher button (with confirmation modal).
- Promote student to teacher: search bar → find student by name or email → promote button → triggers role change + assigns department + sets force_password_change.

**Improved Student Roster:**
- Add column for `reg_number`.
- Add column for `department` (if applicable in future).
- Click on a student row to open a **student detail drawer/modal**: shows name, reg_number, email, CGPA, attendance per subject, risk status, account age. Read-only.
- Export button: downloads the roster as a CSV file (frontend-generated, no backend needed).
- Bulk action: select multiple students → bulk delete (with a typed confirmation: "I understand this is irreversible").

**Announcement improvements:**
- Add an `expires_at` DATE field to announcements. If set, the announcement auto-hides from the student feed after that date. Backend: filter out expired announcements in `GET /api/dashboard/announcements`.
- Add announcement edit capability: `PUT /api/announcements/{id}` endpoint + edit form in UI.

---

## PART 6 — TEACHER DASHBOARD

Create a completely separate layout under `src/pages/teacher/`:

```
src/pages/teacher/
├── TeacherLayout.jsx       ← Sidebar + header shell
├── TeacherHome.jsx         ← Overview: their subjects, student count
├── SubjectAttendance.jsx   ← View + mark attendance for their students
├── StudentOverview.jsx     ← List of students in their subjects with status
├── AccountSettings.jsx     ← Force password change + profile
```

Route: `/teacher` renders `TeacherLayout.jsx` with nested routes.

### Teacher Features:

**TeacherHome:**
- Welcome banner with teacher name and department.
- Cards showing: number of subjects assigned, total students across those subjects, overall attendance health (% of students above 75%).
- Read announcements feed (same as student, read-only).

**SubjectAttendance:**
- Dropdown to select one of the teacher's assigned subjects.
- Table of all students enrolled in that subject (pulled from `attendance` table filtered by `subject_name`).
- For each student row: name, reg_number, attended/total, percentage, status badge.
- "Mark Today" button: opens a modal with a checklist of all students. Teacher checks Present/Absent. Submitting increments `total_classes` by 1 for all, and `attended_classes` by 1 for each checked-present student. This calls a new endpoint: `POST /api/teacher/attendance/mark`.
- Teacher CANNOT add new subjects, delete subjects, or edit a student's historical attendance count directly. They can only use the "Mark Today" flow.

**StudentOverview:**
- Combined view of all students across all the teacher's subjects.
- Sortable columns: name, reg_number, subject, attendance %, status.
- Filter: show only students below 75% attendance.
- No CGPA data visible to teachers (scope-limited).

**AccountSettings:**
- If `force_password_change` is true, this page is shown first and cannot be bypassed.
- Standard password change form.
- View-only profile info (name, email, department, assigned subjects).

---

## PART 7 — BACKEND API CHANGES

### 7.1 New Endpoints to Add

```
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/change-password        ← for logged-in users changing their own password

GET    /api/teacher/subjects            ← returns subjects assigned to the authenticated teacher
GET    /api/teacher/students            ← returns all students in the teacher's subjects
POST   /api/teacher/attendance/mark     ← bulk mark attendance for a subject session
GET    /api/teacher/students/{student_id}/attendance  ← teacher view of one student's attendance for their subject

POST   /api/admin/teachers              ← create a teacher account
GET    /api/admin/teachers              ← list all teachers
DELETE /api/admin/teachers/{teacher_id} ← delete a teacher
PUT    /api/admin/teachers/{teacher_id}/subjects  ← update subject assignments for a teacher
POST   /api/admin/promote               ← promote student to teacher

GET    /api/student/profile             ← get own profile (name, email, reg_number)
PUT    /api/student/profile             ← update own full_name only
```

### 7.2 Endpoints to Modify

- `POST /api/register` — add `reg_number` to body and DB insert. Validate email domain against `ALLOWED_STUDENT_DOMAINS`. Reject if domain not allowed.
- `POST /api/login` — return `role`, `reg_number`, `department`, `force_password_change` in response. Generate session token. Store in `sessions` table. Return token to frontend.
- `POST /api/logout` (NEW) — delete session from DB.
- `GET /api/dashboard/announcements` — filter out announcements where `expires_at IS NOT NULL AND expires_at < NOW()`.
- `POST /api/announcements` — add optional `expires_at` field to schema.
- `PUT /api/announcements/{id}` (NEW) — edit announcement.
- ALL admin endpoints — add auth dependency that checks the session token and verifies `role = 'admin'`.
- ALL teacher endpoints — add auth dependency that checks the session token and verifies `role = 'teacher'`.
- ALL student endpoints — add auth dependency that checks the session token and verifies `role = 'student'`.

### 7.3 Endpoints to REMOVE or DEPRECATE

- Remove any endpoint that returns the raw `is_admin` flag. It no longer exists in the schema.
- The endpoint `GET /api/dashboard/stats` currently takes `student_id` as a query param with no auth check — add token-based auth and verify the token belongs to the requested `student_id` (students cannot query each other's stats).

### 7.4 Auth Dependency Pattern

In `main.py`, create a reusable FastAPI dependency:

```python
async def get_current_user(authorization: str = Header(...)):
    # Extract Bearer token
    # Look up in sessions table
    # Check expiry
    # Return user dict with role, id, etc.
    # Raise HTTP 401 if invalid/expired

async def require_student(user = Depends(get_current_user)):
    if user['role'] != 'student': raise HTTPException(403)
    return user

async def require_teacher(user = Depends(get_current_user)):
    if user['role'] != 'teacher': raise HTTPException(403)
    return user

async def require_admin(user = Depends(get_current_user)):
    if user['role'] != 'admin': raise HTTPException(403)
    return user
```

Apply these dependencies to every endpoint accordingly.

---

## PART 8 — FEATURES: KEEP / REMOVE / MODIFY SUMMARY

### ✅ KEEP AS-IS
- Attendance Tracker (student self-service)
- CGPA Calculator (student self-service)
- AI Chatbot with Gemini + local fallback
- Performance Predictor
- Resume Analyzer
- Study Planner (auto-generate + manual)
- Campus metrics in Admin (total students, avg CGPA, avg attendance)
- Announcement feed on student dashboard
- Bcrypt password hashing
- MySQL schema with CASCADE deletes
- Dark glassmorphism CSS design system

### ✅ KEEP BUT MODIFY
- Login page — add forgot password, branding, error banner, loading state
- Register page — add reg_number, domain validation, password strength indicator
- Admin student roster — add reg_number column, clickable detail drawer, CSV export, bulk delete
- Announcement publisher — add expires_at field and edit capability
- Dashboard home stats — add notification badge for unread announcements
- Session storage — replace localStorage user object with token-only storage
- CORS config — make allowed origins configurable via `.env` (`ALLOWED_ORIGINS`)

### ❌ REMOVE
- `is_admin` boolean column (replaced by `role` enum)
- Hardcoded admin credentials in `database.py` (move to `.env`)
- Frontend-only access control on admin endpoints (replace with server-side token auth)
- Monolithic `Dashboard.jsx` (split into per-role layouts and per-feature components)
- Admin having student feature tabs (attendance, CGPA, chatbot, etc.) — Admin is not a student
- Any test account credentials or hints visible in the UI
- Emoji in sidebar tab labels (use icons only)

### 🆕 ADD (New Features)
- `role` ENUM in DB with Teacher as a first-class role
- Teacher Dashboard (SubjectAttendance, StudentOverview, AccountSettings)
- Teacher creation flow in Admin Dashboard
- Student promotion to Teacher in Admin Dashboard
- Force password change on first teacher login
- Session token system (server-side sessions table)
- Auth middleware/dependencies on all protected API endpoints
- Forgot Password + Reset Password flow
- Change Password page
- Student profile page (view + edit name)
- Notification badge for unread announcements
- Mobile-responsive sidebar (hamburger menu)
- Announcement `expires_at` with auto-expiry
- Announcement edit (PUT endpoint + form)
- CSV export of student roster (admin)
- Student detail drawer in admin roster (click to view)
- `teacher_subjects` table and subject assignment
- Teacher bulk attendance marking endpoint + UI

---

## PART 9 — ENVIRONMENT VARIABLES (UPDATED)

Update `backend/.env` to include these new variables:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=campus_ai
DB_PORT=3306

GEMINI_API_KEY=

ADMIN_EMAIL=admin@campus.edu
ADMIN_PASSWORD=<set a strong password here>
ADMIN_EMAIL_DOMAIN=campus.edu

ALLOWED_STUDENT_DOMAINS=edu,edu.in,sairamtap.edu.in
# Comma-separated. The backend checks if the email ends with any of these.

SESSION_EXPIRY_HOURS=8

ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# Comma-separated. Used for CORS config.

# Optional SMTP for password reset emails
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@campus.edu
```

---

## PART 10 — FILE STRUCTURE (TARGET)

```
CAMPUS ASSISTANT/
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── schema.sql               ← keep updated in sync with database.py
│   ├── database.py              ← migration: is_admin→role, add sessions, teacher_subjects, password_resets
│   ├── auth.py                  ← add token generation, session management, domain validation
│   ├── main.py                  ← refactored: add dependencies, new endpoints, remove hardcoded values
│   └── routers/                 ← optional: split main.py into router files per role
│       ├── student.py
│       ├── teacher.py
│       ├── admin.py
│       └── auth_router.py
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              ← update routing: /dashboard, /teacher, /admin, /forgot-password, /reset-password, /change-password
│       ├── index.css            ← keep design system, add mobile sidebar styles
│       ├── api.js               ← NEW: centralized fetch wrapper that injects Bearer token header
│       └── pages/
│           ├── Login.jsx        ← updated
│           ├── Register.jsx     ← updated
│           ├── ForgotPassword.jsx ← NEW
│           ├── ResetPassword.jsx  ← NEW
│           ├── ChangePassword.jsx ← NEW
│           ├── student/
│           │   ├── StudentLayout.jsx
│           │   ├── StudentHome.jsx
│           │   ├── AttendanceTracker.jsx
│           │   ├── CgpaCalculator.jsx
│           │   ├── Chatbot.jsx
│           │   ├── PerformancePredictor.jsx
│           │   ├── ResumeAnalyzer.jsx
│           │   ├── StudyPlanner.jsx
│           │   └── Profile.jsx
│           ├── teacher/
│           │   ├── TeacherLayout.jsx
│           │   ├── TeacherHome.jsx
│           │   ├── SubjectAttendance.jsx
│           │   ├── StudentOverview.jsx
│           │   └── AccountSettings.jsx
│           └── admin/
│               ├── AdminLayout.jsx
│               ├── AdminHome.jsx
│               ├── StudentRoster.jsx
│               ├── TeacherManagement.jsx
│               ├── AnnouncementManager.jsx
│               └── AccountSettings.jsx
```

---

## PART 11 — IMPLEMENTATION ORDER (SUGGESTED)

Do these in order to avoid breaking the running app mid-refactor:

1. **DB migration** — add `role` column, migrate data, add `sessions`, `teacher_subjects`, `password_resets` tables.
2. **Backend auth layer** — update login to return token + role, build `get_current_user` dependency, add it to all existing endpoints.
3. **Frontend `api.js`** — centralized fetch wrapper with token injection. Update all existing API calls to use it.
4. **Role-based routing** — update `App.jsx` to route by role. Create skeleton layout files for all 3 roles.
5. **Split Dashboard.jsx** — extract each tab into its own component file. Verify nothing breaks.
6. **Admin new features** — Teacher Management, roster improvements, announcement edits.
7. **Teacher Dashboard** — build all teacher pages and backend teacher endpoints.
8. **Auth pages** — Forgot Password, Reset Password, Change Password.
9. **Student additions** — Profile page, notification badge, mobile sidebar.
10. **Cleanup** — remove dead code, update `schema.sql` to match, update `.gitignore`.

---

## PART 12 — CONSTRAINTS & RULES FOR THE AI AGENT

- Do NOT break existing student features (Attendance, CGPA, Chatbot, Performance, Resume, Study Planner). These must continue to work identically from the student's perspective.
- Do NOT change the CSS design system variables in `index.css`. New components must use the existing CSS variables (`--bg-color`, `--card-bg`, `--accent`, etc.).
- Do NOT introduce new Python packages unless strictly necessary. Use only what is already in `requirements.txt`.
- Do NOT add any TypeScript. The project is JavaScript/JSX only.
- Do NOT use any external UI component library (no MUI, no Ant Design, no Chakra). Keep lucide-react for icons and the existing CSS system for everything else.
- All database migrations must be **backward-compatible** and **idempotent** — `database.py` must be safe to run multiple times.
- All new API endpoints must follow the existing naming convention: `/api/{domain}/{action}`.
- The admin seed account must read credentials from `.env`. Never hardcode credentials in source code.
- Remove all `console.log` debug statements from production frontend code.
- Every new form must have both client-side and server-side validation.
- The `schema.sql` file must be kept in sync with `database.py` at all times.
