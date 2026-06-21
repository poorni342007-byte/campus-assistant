import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure backend folder is in path for relative imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import database
from routers import auth_router, student, teacher, admin

load_dotenv(override=True)

app = FastAPI(title="CampusAI – Backend API", version="1.0.0")

# Enable Cross-Origin Resource Sharing (CORS) configurable via .env
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """
    Auto-initialize database and tables when the FastAPI server starts.
    """
    success, message = database.init_db()
    if success:
        print(f"Database setup: {message}")
    else:
        print(f"Database setup error: {message}")

@app.get("/api/health")
def health_check():
    """Health check endpoint to test API responsiveness."""
    return {"status": "healthy", "service": "CampusAI Backend"}

# Include Modular Routers
app.include_router(auth_router.router)
app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(admin.router)
