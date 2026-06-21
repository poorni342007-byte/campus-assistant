import os
import json
import urllib.request
import urllib.error
import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
import database
from dependencies import require_student, get_current_user

router = APIRouter(prefix="/api", tags=["student"])

# Pydantic Schemas for Validation
class AttendanceCreate(BaseModel):
    student_id: int
    subject_name: str
    attended_classes: int = 0
    total_classes: int = 0

class AttendanceUpdate(BaseModel):
    subject_name: str
    attended_classes: int
    total_classes: int

class CgpaCourseCreate(BaseModel):
    student_id: int
    semester: int
    course_name: str
    credits: int
    grade_point: float

class CgpaCourseUpdate(BaseModel):
    semester: int
    course_name: str
    credits: int
    grade_point: float

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatbotRequest(BaseModel):
    student_id: int
    message: str
    history: list[ChatMessage] = []

class ResumeAnalyzeRequest(BaseModel):
    resume_text: str
    target_role: str

class StudyTaskCreate(BaseModel):
    student_id: int
    subject_name: str
    topic: str
    study_date: str
    duration_minutes: int = 60

class StudyTaskUpdate(BaseModel):
    subject_name: str = None
    topic: str = None
    study_date: str = None
    duration_minutes: int = None
    is_completed: bool = None

class StudyPlanGenerateRequest(BaseModel):
    student_id: int
    exam_start_date: str
    daily_hours: float

class ProfileUpdate(BaseModel):
    full_name: str

# ----------------- Student Profile -----------------
@router.get("/student/profile")
def get_student_profile(user = Depends(require_student)):
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"],
        "reg_number": user.get("reg_number"),
        "department": user.get("department"),
        "force_password_change": user.get("force_password_change", False)
    }

@router.put("/student/profile")
def update_student_profile(data: ProfileUpdate, user = Depends(require_student)):
    if not data.full_name.strip():
        raise HTTPException(status_code=400, detail="Full Name cannot be empty")
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE students SET full_name = %s WHERE id = %s",
            (data.full_name.strip(), user["id"])
        )
        conn.commit()
        return {"message": "Profile updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ----------------- Dashboard Stats -----------------
@router.get("/dashboard/stats")
def get_dashboard_stats(student_id: int, user = Depends(require_student)):
    if student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot query other student's stats")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # 1. Fetch attendance summary
        cursor.execute(
            "SELECT SUM(attended_classes) as total_attended, SUM(total_classes) as total_classes FROM attendance WHERE student_id = %s",
            (student_id,)
        )
        row = cursor.fetchone()
        
        attendance_percentage = 0.0
        attendance_status = "N/A"
        
        if row and row['total_classes'] and row['total_classes'] > 0:
            total_attended = row['total_attended'] or 0
            total_classes = row['total_classes'] or 0
            attendance_percentage = round((total_attended / total_classes) * 100, 1)
            attendance_status = "Good" if attendance_percentage >= 75.0 else "Critical"
        else:
            attendance_percentage = 0.0
            attendance_status = "No Subjects"

        # 2. Fetch CGPA summary
        cursor.execute(
            "SELECT SUM(credits * grade_point) as total_weighted, SUM(credits) as total_credits FROM cgpa_courses WHERE student_id = %s",
            (student_id,)
        )
        cgpa_row = cursor.fetchone()
        
        cgpa = 0.0
        if cgpa_row and cgpa_row['total_credits'] and cgpa_row['total_credits'] > 0:
            total_weighted = float(cgpa_row['total_weighted'] or 0.0)
            total_credits = int(cgpa_row['total_credits'] or 0)
            cgpa = round(total_weighted / total_credits, 2)
            
        # 3. Fetch pending tasks from study planner
        cursor.execute(
            "SELECT COUNT(*) as pending_count FROM study_plans WHERE student_id = %s AND is_completed = 0",
            (student_id,)
        )
        planner_row = cursor.fetchone()
        pending_tasks = planner_row['pending_count'] if planner_row else 0
            
        return {
            "cgpa": cgpa,
            "cgpa_max": 10.0,
            "attendance_percentage": attendance_percentage,
            "attendance_status": attendance_status,
            "pending_tasks": pending_tasks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.get("/dashboard/announcements")
def get_announcements(student_id: int, user = Depends(get_current_user)):
    # Announcements are readable by all authenticated users
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        # Filter out expired announcements (expires_at is in the past)
        cursor.execute(
            """
            SELECT * FROM announcements 
            WHERE expires_at IS NULL OR expires_at >= CURDATE()
            ORDER BY created_at DESC, id DESC
            """
        )
        records = cursor.fetchall()
        
        if not records:
            default_announcements = [
                ("End Semester Exams Schedule Published", "The end semester theory examinations begin on July 5th. Detailed timetable is available on the campus portal.", "Exam", "High"),
                ("Campus AI Hackathon 2026", "Register for the annual inter-college hackathon before June 20th. Cash prizes up to $5,000 for innovative AI solutions.", "Event", "Medium"),
                ("Low Attendance Warning in Math II", "Your attendance in Mathematics II is currently 64%. Please contact your course instructor to avoid exam debarment.", "Alert", "High")
            ]
            for title, content, type_, priority in default_announcements:
                cursor.execute(
                    """
                    INSERT INTO announcements (title, content, type, priority)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (title, content, type_, priority)
                )
            conn.commit()
            cursor.execute(
                """
                SELECT * FROM announcements 
                WHERE expires_at IS NULL OR expires_at >= CURDATE()
                ORDER BY created_at DESC, id DESC
                """
            )
            records = cursor.fetchall()
            
        for r in records:
            r['date'] = str(r['created_at'].date()) if 'created_at' in r else "2026-06-16"
            r['id'] = int(r['id'])
            if r.get('expires_at'):
                r['expires_at'] = str(r['expires_at'])
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ----------------- Attendance Tracker -----------------
@router.get("/attendance")
def get_attendance(student_id: int, user = Depends(require_student)):
    if student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot query other student's attendance")
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT * FROM attendance WHERE student_id = %s ORDER BY subject_name", (student_id,))
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.post("/attendance")
def add_attendance(data: AttendanceCreate, user = Depends(require_student)):
    if data.student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot mutate other student's attendance")
    if not data.subject_name.strip():
        raise HTTPException(status_code=400, detail="Subject name cannot be empty")
    if data.attended_classes < 0 or data.total_classes < 0:
        raise HTTPException(status_code=400, detail="Classes count cannot be negative")
    if data.attended_classes > data.total_classes:
        raise HTTPException(status_code=400, detail="Attended classes cannot be greater than total classes")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute(
            "SELECT id FROM attendance WHERE student_id = %s AND LOWER(subject_name) = %s",
            (data.student_id, data.subject_name.strip().lower())
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Subject already exists for this student")
            
        cursor.execute(
            """
            INSERT INTO attendance (student_id, subject_name, attended_classes, total_classes)
            VALUES (%s, %s, %s, %s)
            """,
            (data.student_id, data.subject_name.strip(), data.attended_classes, data.total_classes)
        )
        conn.commit()
        new_id = cursor.lastrowid
        return {
            "message": "Subject added successfully",
            "id": new_id,
            "student_id": data.student_id,
            "subject_name": data.subject_name.strip(),
            "attended_classes": data.attended_classes,
            "total_classes": data.total_classes
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.put("/attendance/{attendance_id}")
def update_attendance(attendance_id: int, data: AttendanceUpdate, user = Depends(require_student)):
    if not data.subject_name.strip():
        raise HTTPException(status_code=400, detail="Subject name cannot be empty")
    if data.attended_classes < 0 or data.total_classes < 0:
        raise HTTPException(status_code=400, detail="Classes count cannot be negative")
    if data.attended_classes > data.total_classes:
        raise HTTPException(status_code=400, detail="Attended classes cannot be greater than total classes")

    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        # Verify ownership
        cursor.execute("SELECT student_id FROM attendance WHERE id = %s", (attendance_id,))
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        if record["student_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: Not owner of this record")
            
        # Check name conflict
        cursor.execute(
            "SELECT id FROM attendance WHERE student_id = %s AND LOWER(subject_name) = %s AND id != %s",
            (record['student_id'], data.subject_name.strip().lower(), attendance_id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Another subject with this name already exists")

        cursor.execute(
            """
            UPDATE attendance 
            SET subject_name = %s, attended_classes = %s, total_classes = %s
            WHERE id = %s
            """,
            (data.subject_name.strip(), data.attended_classes, data.total_classes, attendance_id)
        )
        conn.commit()
        return {"message": "Attendance updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.delete("/attendance/{attendance_id}")
def delete_attendance(attendance_id: int, user = Depends(require_student)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT student_id FROM attendance WHERE id = %s", (attendance_id,))
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        if record["student_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: Not owner of this record")
            
        cursor.execute("DELETE FROM attendance WHERE id = %s", (attendance_id,))
        conn.commit()
        return {"message": "Attendance record deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ----------------- CGPA Calculator -----------------
@router.get("/cgpa")
def get_cgpa_courses(student_id: int, user = Depends(require_student)):
    if student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot query other student's grades")
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT * FROM cgpa_courses WHERE student_id = %s ORDER BY semester ASC, course_name ASC", (student_id,))
        records = cursor.fetchall()
        for rec in records:
            rec['grade_point'] = float(rec['grade_point'])
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.post("/cgpa")
def add_cgpa_course(data: CgpaCourseCreate, user = Depends(require_student)):
    if data.student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot mutate other student's grades")
    if not data.course_name.strip():
        raise HTTPException(status_code=400, detail="Course name cannot be empty")
    if data.semester < 1 or data.semester > 8:
        raise HTTPException(status_code=400, detail="Semester must be between 1 and 8")
    if data.credits <= 0:
        raise HTTPException(status_code=400, detail="Credits must be a positive integer")
    if data.grade_point < 0.0 or data.grade_point > 10.0:
        raise HTTPException(status_code=400, detail="Grade point must be between 0.0 and 10.0")

    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute(
            "SELECT id FROM cgpa_courses WHERE student_id = %s AND semester = %s AND LOWER(course_name) = %s",
            (data.student_id, data.semester, data.course_name.strip().lower())
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Course already exists in this semester")

        cursor.execute(
            """
            INSERT INTO cgpa_courses (student_id, semester, course_name, credits, grade_point)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (data.student_id, data.semester, data.course_name.strip(), data.credits, data.grade_point)
        )
        conn.commit()
        new_id = cursor.lastrowid
        return {
            "message": "Course grade added successfully",
            "id": new_id,
            "student_id": data.student_id,
            "semester": data.semester,
            "course_name": data.course_name.strip(),
            "credits": data.credits,
            "grade_point": data.grade_point
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.put("/cgpa/{course_id}")
def update_cgpa_course(course_id: int, data: CgpaCourseUpdate, user = Depends(require_student)):
    if not data.course_name.strip():
        raise HTTPException(status_code=400, detail="Course name cannot be empty")
    if data.semester < 1 or data.semester > 8:
        raise HTTPException(status_code=400, detail="Semester must be between 1 and 8")
    if data.credits <= 0:
        raise HTTPException(status_code=400, detail="Credits must be a positive integer")
    if data.grade_point < 0.0 or data.grade_point > 10.0:
        raise HTTPException(status_code=400, detail="Grade point must be between 0.0 and 10.0")

    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        # Check ownership
        cursor.execute("SELECT student_id FROM cgpa_courses WHERE id = %s", (course_id,))
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Course record not found")
        if record["student_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: Not owner of this course record")

        # Conflict check
        cursor.execute(
            "SELECT id FROM cgpa_courses WHERE student_id = %s AND semester = %s AND LOWER(course_name) = %s AND id != %s",
            (record['student_id'], data.semester, data.course_name.strip().lower(), course_id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Another course with this name already exists in this semester")

        cursor.execute(
            """
            UPDATE cgpa_courses
            SET semester = %s, course_name = %s, credits = %s, grade_point = %s
            WHERE id = %s
            """,
            (data.semester, data.course_name.strip(), data.credits, data.grade_point, course_id)
        )
        conn.commit()
        return {"message": "Course grade updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.delete("/cgpa/{course_id}")
def delete_cgpa_course(course_id: int, user = Depends(require_student)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT student_id FROM cgpa_courses WHERE id = %s", (course_id,))
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Course record not found")
        if record["student_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: Not owner of this course record")
            
        cursor.execute("DELETE FROM cgpa_courses WHERE id = %s", (course_id,))
        conn.commit()
        return {"message": "Course record deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ----------------- AI Chatbot -----------------
def get_student_context(student_id: int) -> str:
    conn = database.get_db_connection()
    if not conn:
        return "Student context: Not available (DB connection failed)"
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT full_name, email, reg_number, role FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        if not student:
            return "Student context: Student not found in database"
            
        full_name = student['full_name']
        email = student['email']
        reg_number = student.get('reg_number') or "N/A"
        role = student.get('role') or "student"

        cursor.execute("SELECT subject_name, attended_classes, total_classes FROM attendance WHERE student_id = %s", (student_id,))
        attendance_records = cursor.fetchall()
        
        attendance_str = ""
        total_attended = 0
        total_classes = 0
        
        if attendance_records:
            attendance_str = "Course Attendance:\n"
            for r in attendance_records:
                att = r['attended_classes']
                tot = r['total_classes']
                total_attended += att
                total_classes += tot
                pct = (att / tot * 100) if tot > 0 else 0.0
                attendance_str += f"- {r['subject_name']}: {att}/{tot} classes ({pct:.1f}%)\n"
            
            avg_pct = (total_attended / total_classes * 100) if total_classes > 0 else 0.0
            status = "Good Standing" if avg_pct >= 75.0 else "Critical Warning"
            attendance_str += f"Overall Attendance: {avg_pct:.1f}% ({status})\n"
        else:
            attendance_str = "Course Attendance: No subjects added yet.\n"

        cursor.execute("SELECT semester, course_name, credits, grade_point FROM cgpa_courses WHERE student_id = %s ORDER BY semester", (student_id,))
        courses_records = cursor.fetchall()
        
        cgpa_str = ""
        total_credits = 0
        total_weighted = 0.0
        
        if courses_records:
            cgpa_str = "Course Grades:\n"
            for r in courses_records:
                creds = r['credits']
                gp = float(r['grade_point'])
                total_credits += creds
                total_weighted += (creds * gp)
                cgpa_str += f"- Sem {r['semester']} | {r['course_name']}: {creds} Credits, Grade Point {gp:.1f}\n"
            
            cgpa = (total_weighted / total_credits) if total_credits > 0 else 0.0
            cgpa_str += f"Overall Cumulative GPA (CGPA): {cgpa:.2f} / 10.0\n"
        else:
            cgpa_str = "Course Grades: No courses added yet.\n"

        context = f"""
Student Profile Context:
- Full Name: {full_name}
- Email: {email}
- Reg Number: {reg_number}
- Role: {role}
- Student Database ID: {student_id}

{attendance_str}
{cgpa_str}
"""
        return context
    except Exception as e:
        return f"Student context: Error retrieving data ({str(e)})"
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

def generate_grounded_fallback_response(message: str, student_id: int) -> str:
    conn = database.get_db_connection()
    if not conn:
        return "I am sorry, but I cannot access the database right now. Please try again later."
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT full_name, email FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        if not student:
            return "I couldn't find your profile in the database. Please make sure you are logged in."
        name = student['full_name']
        email = student['email']
        
        cursor.execute("SELECT subject_name, attended_classes, total_classes FROM attendance WHERE student_id = %s", (student_id,))
        attendance = cursor.fetchall()
        
        cursor.execute("SELECT semester, course_name, credits, grade_point FROM cgpa_courses WHERE student_id = %s", (student_id,))
        courses = cursor.fetchall()
    except Exception as e:
        return f"Error loading your profile data: {str(e)}"
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

    msg = message.lower()
    
    if any(x in msg for x in ["name", "who am i", "profile", "my email", "identity"]):
        return f"Hello {name}! According to my records, you are registered under the email address **{email}** (Student ID: {student_id}). Let me know if you need help analyzing your attendance or grades!"
        
    if any(x in msg for x in ["attendance", "bunk", "class", "present", "absent", "subject"]):
        if not attendance:
            return f"Hi {name}, you don't have any subjects logged in your Attendance Tracker yet. Please go to the Attendance Tracker tab to add your courses!"
            
        total_att = sum(r['attended_classes'] for r in attendance)
        total_cls = sum(r['total_classes'] for r in attendance)
        overall_pct = (total_att / total_cls * 100) if total_cls > 0 else 0.0
        
        resp = f"### Attendance Report for {name}\n"
        resp += f"Overall Attendance: **{overall_pct:.1f}%** ({'Good Standing' if overall_pct >= 75 else 'Critical Warning'})\n\n"
        resp += "Here is the breakdown by subject:\n"
        for r in attendance:
            att = r['attended_classes']
            tot = r['total_classes']
            pct = (att / tot * 100) if tot > 0 else 0.0
            resp += f"- **{r['subject_name']}**: {att}/{tot} classes ({pct:.1f}%) "
            if pct >= 75:
                max_bunk = int((4 * att - 3 * tot) / 3)
                if max_bunk > 0:
                    resp += f"| *Safe to bunk:* {max_bunk} class{'es' if max_bunk > 1 else ''}\n"
                else:
                    resp += "| *On the line!* Do not bunk.\n"
            else:
                req = int(3 * tot - 4 * att)
                resp += f"| *Critical!* Must attend next {req} class{'es' if req > 1 else ''} consecutively\n"
        return resp

    if any(x in msg for x in ["cgpa", "grade", "gpa", "sgpa", "credits", "academic class"]):
        if not courses:
            return f"Hi {name}, you haven't added any course grades to your CGPA Calculator yet. Please go to the CGPA Calculator tab to log your grades!"
        total_creds = sum(c['credits'] for c in courses)
        total_weighted = sum(c['credits'] * float(c['grade_point']) for c in courses)
        cgpa = total_weighted / total_creds if total_creds > 0 else 0.0
        
        standing = 'N/A'
        if total_creds > 0:
            if cgpa >= 9.0: standing = 'Outstanding (O)'
            elif cgpa >= 7.5: standing = 'First Class with Distinction'
            elif cgpa >= 6.0: standing = 'First Class'
            elif cgpa >= 5.0: standing = 'Second Class'
            else: standing = 'Fail / Re-evaluation Required'
            
        resp = f"### Academic Grades & CGPA Report for {name}\n"
        resp += f"Current Cumulative GPA: **{cgpa:.2f} / 10.0**\n"
        resp += f"Total Completed Credits: **{total_creds}**\n"
        resp += f"Academic Standing Class: **{standing}**\n\n"
        resp += "Here is a summary of your courses:\n"
        
        sems = {}
        for c in courses:
            sem = c['semester']
            if sem not in sems: sems[sem] = []
            sems[sem].append(c)
            
        for sem in sorted(sems.keys()):
            resp += f"* **Semester {sem}**:\n"
            for c in sems[sem]:
                resp += f"  - {c['course_name']}: {c['credits']} credits (Grade Point: {float(c['grade_point']):.1f})\n"
        return resp

    if any(x in msg for x in ["performance", "analyze", "standing", "stats", "summary", "how am i doing"]):
        total_att = sum(r['attended_classes'] for r in attendance)
        total_cls = sum(r['total_classes'] for r in attendance)
        overall_pct = (total_att / total_cls * 100) if total_cls > 0 else 0.0
        
        total_creds = sum(c['credits'] for c in courses)
        total_weighted = sum(c['credits'] * float(c['grade_point']) for c in courses)
        cgpa = total_weighted / total_creds if total_creds > 0 else 0.0
        
        resp = f"### Academic Performance Analysis for {name}\n"
        resp += f"1. **Attendance Health**: Overall attendance is **{overall_pct:.1f}%** ({'Good Standing' if overall_pct >= 75 else 'Critical Warning'}).\n"
        if attendance:
            low_att = [r['subject_name'] for r in attendance if (r['attended_classes']/r['total_classes']*100 if r['total_classes']>0 else 0) < 75]
            if low_att:
                resp += f"   - *Action Required:* Your attendance is critical in: {', '.join(low_att)}.\n"
            else:
                resp += "   - Great job! Attendance is above 75% in all registered courses.\n"
        else:
            resp += "   - No attendance logged yet.\n"
            
        resp += f"2. **Grade Standing**: Current CGPA is **{cgpa:.2f}** with **{total_creds}** completed credits.\n"
        if total_creds > 0:
            if cgpa >= 8.5:
                resp += "   - Excellent GPA! You are in an outstanding academic position. Keep maintaining this standard.\n"
            elif cgpa >= 7.0:
                resp += "   - Good standing! You can push your average higher by targeting O/A+ grades in upcoming semesters.\n"
            else:
                resp += "   - Academic warning: Your CGPA is below 7.0. Focus on core credits and seek guidance if needed.\n"
        else:
            resp += "   - No grade records logged yet.\n"
        return resp

    if any(x in msg for x in ["phase 6", "performance predictor"]):
        return "### Phase 6: Performance Predictor 🔮\n**Status:** Fully Implemented\n\nComputes academic standing risks, at-risk subjects, and projects SGPAs based on classes."
    if any(x in msg for x in ["phase 7", "resume analyzer"]):
        return "### Phase 7: Resume Analyzer 📄\n**Status:** Fully Implemented\n\nScans resumes against technical job roles locally or using Gemini to extract alignment and skill gaps."
    if any(x in msg for x in ["phase 8", "study planner"]):
        return "### Phase 8: Study Planner 📅\n**Status:** Fully Implemented\n\nGenerates custom preparation schedules weighted by credit hour loads and attendance warning factors."
    if any(x in msg for x in ["phase 9", "admin dashboard"]):
        return "### Phase 9: Admin Dashboard ⚙️\n**Status:** Fully Implemented\n\nCampus monitoring metrics, student list summaries, and global announcement publications dashboard."

    if any(x in msg for x in ["phase", "roadmap", "project", "feature", "implemented", "architecture", "todo", "done"]):
        resp = f"### Campus Assistant Project Roadmap & Phases\n" \
               f"Hello {name}! All 9 project phases have been completed and are fully functional:\n\n" \
               f"1. **Phase 1 (Core Dashboard)**: Displays stats and system announcements feed.\n" \
               f"2. **Phase 2 (User Authentication)**: Authentication, domain guards, and token-based sessions.\n" \
               f"3. **Phase 3 (Attendance Tracker)**: Track subject logs, limits, and consecutive bunk counts.\n" \
               f"4. **Phase 4 (CGPA Calculator)**: GPA semester records and target SGPA simulators.\n" \
               f"5. **Phase 5 (AI Chatbot / Advisor)**: Contextual assistant (me!) grounded in student details.\n" \
               f"6. **Phase 6 (Performance Predictor 🔮)**: Forecast models and risk standings.\n" \
               f"7. **Phase 7 (Resume Analyzer 📄)**: Align resume skills against target roles.\n" \
               f"8. **Phase 8 (Study Planner 📅)**: Custom revision schedulers.\n" \
               f"9. **Phase 9 (Admin Dashboard ⚙️)**: Management console, CSV rosters, and announcement controls."
        return resp

    return f"Hello {name}! I am CampusAI. Since the Gemini API is currently unavailable, I am running in local grounded mode to assist you.\n\nI can help you analyze your current academic standing, grades, credits, or attendance metrics. Try asking me:\n- *'Analyze my current performance'* \n- *'Can I bunk classes?'* \n- *'What is my current CGPA?'*"

@router.post("/chatbot")
def chat_with_assistant(request: ChatbotRequest, user = Depends(require_student)):
    if request.student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Chatbot session must belong to logged-in user")
        
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        fallback_text = generate_grounded_fallback_response(request.message, request.student_id)
        return {"response": fallback_text}

    student_context = get_student_context(request.student_id)

    payload = {
        "systemInstruction": {
            "parts": [
                {
                    "text": f"You are CampusAI, a helpful, friendly, and context-aware academic assistant. You have access to the student's real-time statistics (attendance and grades) to help answer queries dynamically.\n\n{student_context}\n\nGround your responses using this information. If the student asks about their attendance, grades, or bunking status, use the provided records. Provide brief, actionable, and encouraging answers."
                }
            ]
        },
        "contents": []
    }

    for msg in request.history:
        role = "user" if msg.role == "user" else "model"
        payload["contents"].append({
            "role": role,
            "parts": [{"text": msg.text}]
        })

    payload["contents"].append({
        "role": "user",
        "parts": [{"text": request.message}]
    })

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = response.read().decode("utf-8")
            res_json = json.loads(res_data)
            text_response = res_json["candidates"][0]["content"]["parts"][0]["text"]
            return {"response": text_response}
    except Exception as e:
        print(f"Gemini API call failed ({str(e)}). Using local grounded fallback.")
        fallback_text = generate_grounded_fallback_response(request.message, request.student_id)
        return {"response": fallback_text}

# ----------------- Performance Predictor -----------------
@router.get("/performance/predict")
def predict_performance(student_id: int, user = Depends(require_student)):
    if student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot query other student's predictions")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed.")
        
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT id, subject_name, attended_classes, total_classes FROM attendance WHERE student_id = %s", (student_id,))
        attendance_records = cursor.fetchall()
        cursor.execute("SELECT id, semester, course_name, credits, grade_point FROM cgpa_courses WHERE student_id = %s", (student_id,))
        cgpa_records = cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

    attendance_warnings = []
    total_attended = 0
    total_classes = 0
    
    for r in attendance_warnings:
        pass
        
    for r in attendance_records:
        att = r['attended_classes']
        tot = r['total_classes']
        total_attended += att
        total_classes += tot
        pct = (att / tot * 100) if tot > 0 else 0.0
        
        if pct < 75.0:
            consec_needed = max(0, 3 * tot - 4 * att)
            attendance_warnings.append({
                "id": r['id'],
                "subject_name": r['subject_name'],
                "attended": att,
                "total": tot,
                "percentage": round(pct, 1),
                "consecutive_needed": consec_needed,
                "risk": "High" if pct < 65.0 else "Medium"
            })
            
    overall_att_pct = (total_attended / total_classes * 100) if total_classes > 0 else 100.0
    
    grade_warnings = []
    total_credits = 0
    total_weighted = 0.0
    
    for c in cgpa_records:
        creds = c['credits']
        gp = float(c['grade_point'])
        total_credits += creds
        total_weighted += (creds * gp)
        
        if gp <= 6.0:
            grade_warnings.append({
                "id": c['id'],
                "course_name": c['course_name'],
                "semester": c['semester'],
                "credits": creds,
                "grade_point": gp,
                "recommendation": "Target B+ or higher to restore average" if gp >= 5.0 else "Critical: Re-evaluation or retake required"
            })
            
    cgpa = (total_weighted / total_credits) if total_credits > 0 else 7.5
    
    penalty = 0.0
    if overall_att_pct < 75.0:
        diff = 75.0 - overall_att_pct
        penalty = (diff / 5.0) * 0.1
        
    projected_sgpa = max(0.0, min(10.0, cgpa - penalty))
    
    if overall_att_pct < 65.0 or (total_credits > 0 and cgpa < 5.5):
        overall_status = "Critical"
    elif overall_att_pct < 75.0 or (total_credits > 0 and cgpa < 7.0):
        overall_status = "Warning"
    else:
        overall_status = "Stable"
        
    return {
        "overall_status": overall_status,
        "overall_attendance": round(overall_att_pct, 1),
        "current_cgpa": round(cgpa, 2),
        "projected_sgpa": round(projected_sgpa, 2),
        "attendance_warnings": attendance_warnings,
        "grade_warnings": grade_warnings
    }

# ----------------- Resume Analyzer -----------------
def analyze_resume_locally(resume_text: str, target_role: str) -> dict:
    profiles = {
        "Frontend Developer": {
            "skills": ["react", "javascript", "html", "css", "tailwind", "typescript", "redux", "webpack", "git"],
            "projects": [
                "Build a complex single-page application (SPA) using React, Redux, and TypeScript.",
                "Create a fully responsive CSS/Tailwind landing page optimized for animations and performance.",
                "Develop a mock e-commerce frontend incorporating state management and REST API integrations."
            ],
            "courses": ["Advanced React (Scrimba or Frontend Masters)", "Modern JavaScript (Deep Dive)", "TailwindCSS & CSS Grid layouts"]
        },
        "Backend Developer": {
            "skills": ["python", "fastapi", "nodejs", "express", "mysql", "postgresql", "docker", "rest api", "git"],
            "projects": [
                "Design a robust, async REST API using Python FastAPI with relational databases (MySQL/Postgres).",
                "Create a Node.js microservice architecture utilizing Docker and container networking.",
                "Implement secure JWT auth, token revoking, and request rate-limiting endpoints."
            ],
            "courses": ["Database Design & Normalization", "FastAPI Mastery Course", "Docker & Kubernetes Basics"]
        },
        "Full Stack Developer": {
            "skills": ["react", "nodejs", "express", "mysql", "python", "javascript", "git", "rest api", "tailwind"],
            "projects": [
                "Build a full-stack social network dashboard using React, Node.js, Express, and MySQL.",
                "Develop a real-time collaborative workspace utilizing WebSockets, React, and backend routers.",
                "Deploy a Full-Stack application inside Docker containers with continuous deployment configs."
            ],
            "courses": ["Full Stack Web Developer Bootcamp", "REST API Development best practices", "Modern Database Administrations"]
        },
        "Data Scientist": {
            "skills": ["python", "sql", "pandas", "numpy", "scikit-learn", "tensorflow", "statistics", "data visualization", "git"],
            "projects": [
                "Perform exploratory data analysis (EDA) on structured datasets using Pandas and Seaborn.",
                "Develop a predictive machine learning classifier utilizing Scikit-Learn (e.g. churn predictions).",
                "Train a deep learning neural network using TensorFlow/Keras for image or text classification."
            ],
            "courses": ["Statistical Heuristics and Probabilities", "Machine Learning with Python", "Deep Learning Foundations"]
        },
        "Mobile App Developer": {
            "skills": ["flutter", "dart", "react native", "swift", "kotlin", "firebase", "mobile ui", "git"],
            "projects": [
                "Build a cross-platform mobile application using Flutter and Dart integrated with Firebase storage.",
                "Develop a native iOS app in Swift or Android app in Kotlin with offline data synchronizations.",
                "Design interactive user interfaces utilizing React Native styling sheets and custom navigation."
            ],
            "courses": ["Flutter & Dart Complete Guide", "React Native Foundations", "Mobile Security Best Practices"]
        }
    }
    
    role = target_role if target_role in profiles else "Full Stack Developer"
    profile = profiles[role]
    
    resume_lower = resume_text.lower()
    matched = []
    missing = []
    
    for skill in profile["skills"]:
        if skill in resume_lower:
            matched.append(skill.upper() if skill != "rest api" else "REST API")
        else:
            missing.append(skill.upper() if skill != "rest api" else "REST API")
            
    total = len(profile["skills"])
    score = int((len(matched) / total * 100)) if total > 0 else 0
    
    recommendations = []
    if missing:
        recommendations.append(f"Skills Gaps: Focus on acquiring missing core technical skills like: {', '.join(missing[:3])}.")
    for proj in profile["projects"]:
        recommendations.append(f"Recommended Project: {proj}")
    for course in profile["courses"][:2]:
        recommendations.append(f"Recommended Course: {course}")
        
    return {
        "score": score,
        "matched_skills": matched,
        "missing_skills": missing,
        "recommendations": recommendations
    }

@router.post("/resume/analyze")
def analyze_resume(request: ResumeAnalyzeRequest, user = Depends(require_student)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return analyze_resume_locally(request.resume_text, request.target_role)

    prompt = f"""
    Analyze the following student resume text against the target job role: '{request.target_role}'.
    Evaluate it carefully and return a JSON object with:
    - 'score': an integer from 0 to 100 indicating skill match.
    - 'matched_skills': list of matched technical skills found.
    - 'missing_skills': list of crucial skills for this role missing from the resume.
    - 'recommendations': list of 3-5 specific projects or learning resources to close the gaps.
    
    Resume Text:
    {request.resume_text}
    
    Format the output strictly as a JSON object, without code blocks or markdown labels.
    """

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}

    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=20) as response:
            res_data = response.read().decode("utf-8")
            res_json = json.loads(res_data)
            text_response = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            if text_response.startswith("```"):
                lines = text_response.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].strip() == "```":
                    lines = lines[:-1]
                text_response = "\n".join(lines).strip()
                
            report = json.loads(text_response)
            if "score" in report and "matched_skills" in report and "missing_skills" in report:
                return report
            else:
                raise ValueError("Incomplete keys returned from AI model.")
    except Exception as e:
        print(f"Gemini Resume Analyzer failed ({str(e)}). Using local fallback.")
        return analyze_resume_locally(request.resume_text, request.target_role)

# ----------------- Study Planner -----------------
@router.get("/study-planner")
def get_study_plans(student_id: int, user = Depends(require_student)):
    if student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot query other student's plans")
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute(
            "SELECT * FROM study_plans WHERE student_id = %s ORDER BY study_date ASC, id ASC",
            (student_id,)
        )
        records = cursor.fetchall()
        for r in records:
            r['study_date'] = str(r['study_date'])
            r['is_completed'] = bool(r['is_completed'])
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.post("/study-planner")
def add_study_task(data: StudyTaskCreate, user = Depends(require_student)):
    if data.student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot mutate other student's plans")
    if not data.subject_name.strip():
        raise HTTPException(status_code=400, detail="Subject name cannot be empty")
    if not data.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    if data.duration_minutes <= 0:
        raise HTTPException(status_code=400, detail="Duration must be positive")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute(
            """
            INSERT INTO study_plans (student_id, subject_name, topic, study_date, duration_minutes)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (data.student_id, data.subject_name.strip(), data.topic.strip(), data.study_date, data.duration_minutes)
        )
        conn.commit()
        new_id = cursor.lastrowid
        return {
            "message": "Study session added successfully",
            "id": new_id,
            "student_id": data.student_id,
            "subject_name": data.subject_name.strip(),
            "topic": data.topic.strip(),
            "study_date": data.study_date,
            "duration_minutes": data.duration_minutes,
            "is_completed": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.put("/api/study-planner/{task_id}")
def update_study_task(task_id: int, data: StudyTaskUpdate, user = Depends(require_student)):
    # Note: route prefix is /api in router pathing, since APIRouter has prefix="/api",
    # the route path is "/study-planner/{task_id}". Wait! APIRouter prefixes all routes with prefix.
    # So if prefix is "/api", the path here should be "/study-planner/{task_id}", not "/api/study-planner/{task_id}".
    # Let's adjust this to make sure we don't have duplicate /api/api/!
    # Yes! The router prefix is /api, so the decorator should be router.put("/study-planner/{task_id}").
    pass

@router.put("/study-planner/{task_id}")
def update_study_task(task_id: int, data: StudyTaskUpdate, user = Depends(require_student)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT student_id FROM study_plans WHERE id = %s", (task_id,))
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Study task not found")
        if record["student_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: Not owner of this task")
            
        update_fields = []
        params = []
        if data.subject_name is not None:
            update_fields.append("subject_name = %s")
            params.append(data.subject_name.strip())
        if data.topic is not None:
            update_fields.append("topic = %s")
            params.append(data.topic.strip())
        if data.study_date is not None:
            update_fields.append("study_date = %s")
            params.append(data.study_date)
        if data.duration_minutes is not None:
            update_fields.append("duration_minutes = %s")
            params.append(data.duration_minutes)
        if data.is_completed is not None:
            update_fields.append("is_completed = %s")
            params.append(1 if data.is_completed else 0)
            
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        params.append(task_id)
        update_query = f"UPDATE study_plans SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(update_query, tuple(params))
        conn.commit()
        return {"message": "Study session updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.delete("/study-planner/{task_id}")
def delete_study_task(task_id: int, user = Depends(require_student)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT student_id FROM study_plans WHERE id = %s", (task_id,))
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Study session not found")
        if record["student_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: Not owner of this task")
            
        cursor.execute("DELETE FROM study_plans WHERE id = %s", (task_id,))
        conn.commit()
        return {"message": "Study session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

def get_local_topics_for_subject(subject_name: str) -> list[str]:
    name = subject_name.lower()
    if "math" in name or "algebra" in name or "calculus" in name:
        return [
            "Fundamental Theorems & Formulas review",
            "Core Classifications & Problem Sets solving",
            "Advanced Applications & Theorem Proofs practice",
            "Midterm Test Paper review & corrections",
            "Comprehensive Revision & Mock Test Paper"
        ]
    elif "data structure" in name or "algorithm" in name:
        return [
            "Arrays, Linked Lists & Complexity Analysis",
            "Stacks, Queues & Recursion Tree tracing",
            "Trees, Binary Search Trees & AVL rotations",
            "Graphs, DFS/BFS & Shortest Path algorithms",
            "Sorting, Searching & Mock Coding Interview Problems"
        ]
    elif "python" in name or "java" in name or "programming" in name or "c++" in name or "coding" in name:
        return [
            "Syntax Basics, Variable Scopes & Data Types",
            "Object-Oriented Design (Classes, Inheritance, Polymorphism)",
            "Exception Handling & File Input/Output operations",
            "Collections, Generics & Memory Management basics",
            "Practice Coding Exercises & Algorithm optimizations"
        ]
    elif "database" in name or "sql" in name or "rdbms" in name:
        return [
            "ER Diagrams & Relational Model foundations",
            "SQL Queries, Joins, Group By & Subqueries",
            "Normalization (1NF, 2NF, 3NF, BCNF) & Integrity",
            "Transactions, ACID properties & Indexing strategies",
            "Database Design Practice & Final Schema Optimization"
        ]
    return [
        "Introductory Concepts & Glossary terms review",
        "Core Methodologies & Key Definitions practice",
        "Advanced Problems & In-depth Theoretical analysis",
        "Past Exam Papers & Questions analysis",
        "Final Comprehensive Review & Syllabus checklist"
    ]

@router.post("/study-planner/generate")
def generate_study_plan(request: StudyPlanGenerateRequest, user = Depends(require_student)):
    if request.student_id != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied: Cannot generate plan for other student")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute(
            "SELECT subject_name, attended_classes, total_classes FROM attendance WHERE student_id = %s",
            (request.student_id,)
        )
        subjects = cursor.fetchall()
        
        if not subjects:
            raise HTTPException(status_code=400, detail="No active courses found. Please add subjects to your Attendance Tracker first.")
            
        cursor.execute("DELETE FROM study_plans WHERE student_id = %s", (request.student_id,))
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error loading context: {str(e)}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

    try:
        today = datetime.date.today()
        exam_date = datetime.date.fromisoformat(request.exam_start_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
    days_to_prep = (exam_date - today).days
    if days_to_prep <= 0:
        raise HTTPException(status_code=400, detail="Exam start date must be a future date.")
        
    days_to_prep = min(days_to_prep, 30)

    subject_details = []
    subject_names = [s['subject_name'] for s in subjects]
    
    api_key = os.getenv("GEMINI_API_KEY")
    ai_topics_map = {}
    
    if api_key:
        prompt = f"""
        Generate exactly 5 progressive exam preparation revision topics/units for each of the following course subjects: {', '.join(subject_names)}.
        
        Format your response strictly as a JSON object where the keys are the exact subject names and the values are lists of exactly 5 strings (short descriptions of topics).
        Do not output any markdown code fences or headers. Output pure JSON only.
        """
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        
        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = response.read().decode("utf-8")
                res_json = json.loads(res_data)
                text_response = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                
                if text_response.startswith("```"):
                    lines = text_response.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].strip() == "```":
                        lines = lines[:-1]
                    text_response = "\n".join(lines).strip()
                    
                ai_topics_map = json.loads(text_response)
        except Exception as e:
            print(f"Gemini API topics generation failed ({str(e)}). Using local topics.")

    for s in subjects:
        name = s['subject_name']
        att = s['attended_classes']
        tot = s['total_classes']
        pct = (att / tot * 100) if tot > 0 else 100.0
        
        weight = 1.0
        if pct < 75.0:
            weight = 1.5
        if pct < 65.0:
            weight = 2.0
            
        topics = ai_topics_map.get(name)
        if not topics or len(topics) != 5:
            topics = get_local_topics_for_subject(name)
            
        subject_details.append({
            "name": name,
            "weight": weight,
            "topics": topics,
            "topic_index": 0
        })

    daily_hours = max(0.5, min(request.daily_hours, 8.0))
    slots_per_day = 2 if daily_hours >= 2.0 else 1
    duration_per_slot = int((daily_hours * 60) / slots_per_day)

    generated_plans = []
    
    for day_offset in range(days_to_prep):
        current_date = today + datetime.timedelta(days=day_offset)
        for slot in range(slots_per_day):
            selected_sub = None
            best_score = -1.0
            for sub in subject_details:
                score = sub["weight"] / (1 + sub["topic_index"])
                if score > best_score:
                    best_score = score
                    selected_sub = sub
            if not selected_sub:
                continue
                
            topic = selected_sub["topics"][selected_sub["topic_index"] % len(selected_sub["topics"])]
            selected_sub["topic_index"] += 1
            
            generated_plans.append({
                "subject_name": selected_sub["name"],
                "topic": topic,
                "study_date": str(current_date),
                "duration_minutes": duration_per_slot
            })

    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed to insert generated plans")
        
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        for plan in generated_plans:
            cursor.execute(
                """
                INSERT INTO study_plans (student_id, subject_name, topic, study_date, duration_minutes)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (request.student_id, plan["subject_name"], plan["topic"], plan["study_date"], plan["duration_minutes"])
            )
        conn.commit()
        
        cursor.execute(
            "SELECT * FROM study_plans WHERE student_id = %s ORDER BY study_date ASC, id ASC",
            (request.student_id,)
        )
        records = cursor.fetchall()
        for r in records:
            r['study_date'] = str(r['study_date'])
            r['is_completed'] = bool(r['is_completed'])
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database write error: {str(e)}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
