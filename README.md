# 🎓 CampusAI – Smart College Assistant

CampusAI is a full-stack academic management and student productivity platform designed to help students, teachers, and administrators manage academic activities efficiently.

The platform provides attendance tracking, CGPA calculation, AI-powered assistance, study planning, performance prediction, resume analysis, and role-based access control through a modern web interface.

## 🌐 Live Demo

**Frontend:**
https://campus-assistant-4f2t.onrender.com

**Backend Health Check:**
https://campus-assistant-backend-hahn.onrender.com/api/health

---

## 🚀 Features

### 👨‍🎓 Student Portal

* Student Registration & Login
* Attendance Tracking
* CGPA Calculator
* Study Planner
* AI Chatbot Assistant
* Resume Analyzer
* Performance Predictor
* Student Profile Management

### 👨‍🏫 Teacher Portal

* Teacher Dashboard
* Student Attendance Management
* Student Performance Overview
* Subject-wise Attendance Tracking
* Account Settings

### 👨‍💼 Admin Portal

* Campus Statistics Dashboard
* Student Roster Management
* Teacher Management
* Announcement Management
* Account Settings

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* CSS

### Backend

* FastAPI
* Python
* REST APIs

### Database

* MySQL

### AI Integration

* Google Gemini API

### Deployment

* Render (Frontend)
* Render (Backend)
* GitHub

---

## 📁 Project Structure

```text
CAMPUS ASSISTANT
│
├── backend
│   ├── auth.py
│   ├── database.py
│   ├── dependencies.py
│   ├── main.py
│   ├── requirements.txt
│   ├── schema.sql
│   └── routers
│
└── frontend
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src
```

---

## 🔐 Authentication

CampusAI supports role-based authentication:

* Student
* Teacher
* Admin

Passwords are securely hashed using bcrypt before storage.

---

## 🤖 AI Features

CampusAI integrates Google Gemini API to provide:

* Student Query Assistance
* Academic Guidance
* Study Recommendations
* Learning Support

---

## 📊 Core Modules

### Attendance Tracker

Tracks attendance percentage and attendance statistics.

### CGPA Calculator

Calculates semester GPA and cumulative CGPA.

### Study Planner

Helps students organize study schedules efficiently.

### Resume Analyzer

Analyzes resumes and identifies skill gaps.

### Performance Predictor

Provides academic performance insights based on available data.

---

## ⚙️ Local Setup

### Clone Repository

```bash
git clone https://github.com/poorni342007-byte/campus-assistant.git
cd campus-assistant
```

### Backend Setup

```bash
cd backend

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs on:

```text
http://localhost:8000
```

### Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## 📌 Future Enhancements

* Email Notifications
* Mobile App Version
* Faculty Analytics Dashboard
* OCR-Based Attendance
* Placement Tracking
* Cloud Storage Integration
* Multi-College Support

---

## 👩‍💻 Author

**Poorni**

Built as a full-stack portfolio project to demonstrate:

* FastAPI Development
* React Development
* MySQL Database Design
* REST API Development
* Cloud Deployment
* AI Integration

---

## 📄 License

This project is developed for educational and portfolio purposes.
