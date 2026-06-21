from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
import database
import auth
from dependencies import require_admin
import datetime

router = APIRouter(prefix="/api", tags=["admin"])

# Request Schemas
class TeacherCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    department: str
    temporary_password: str
    subjects: list[str] = []

class TeacherSubjectsUpdateRequest(BaseModel):
    subjects: list[str]

class PromoteStudentRequest(BaseModel):
    student_id: int
    department: str
    subjects: list[str] = []

class BulkDeleteStudentsRequest(BaseModel):
    student_ids: list[int]

class AnnouncementCreateRequest(BaseModel):
    title: str
    content: str
    type: str
    priority: str
    expires_at: str = None  # YYYY-MM-DD format

class AnnouncementUpdateRequest(BaseModel):
    title: str
    content: str
    type: str
    priority: str
    expires_at: str = None

# ----------------- Admin Analytics Metrics -----------------
@router.get("/admin/metrics")
def get_admin_metrics(user = Depends(require_admin)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        # 1. Total student users (role = 'student')
        cursor.execute("SELECT COUNT(*) as student_count FROM students WHERE role = 'student'")
        total_students = cursor.fetchone()['student_count'] or 0
        
        # 2. Campus average CGPA of students
        cursor.execute(
            """
            SELECT SUM(c.credits * c.grade_point) as weighted_sum, SUM(c.credits) as total_credits 
            FROM cgpa_courses c
            JOIN students s ON c.student_id = s.id
            WHERE s.role = 'student'
            """
        )
        cgpa_row = cursor.fetchone()
        average_cgpa = 0.0
        if cgpa_row and cgpa_row['total_credits'] and cgpa_row['total_credits'] > 0:
            average_cgpa = round(float(cgpa_row['weighted_sum']) / float(cgpa_row['total_credits']), 2)
        else:
            average_cgpa = 7.50
            
        # 3. Campus average attendance percentage of students
        cursor.execute(
            """
            SELECT SUM(a.attended_classes) as total_att, SUM(a.total_classes) as total_cls 
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE s.role = 'student'
            """
        )
        att_row = cursor.fetchone()
        average_attendance = 100.0
        if att_row and att_row['total_cls'] and att_row['total_cls'] > 0:
            average_attendance = round((float(att_row['total_att']) / float(att_row['total_cls'])) * 100, 1)
        else:
            average_attendance = 78.5
            
        return {
            "total_students": total_students,
            "average_cgpa": average_cgpa,
            "average_attendance": average_attendance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ----------------- Student Roster -----------------
@router.get("/admin/students")
def get_admin_students(user = Depends(require_admin)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT id, full_name, email, reg_number, department, created_at FROM students WHERE role = 'student' ORDER BY full_name")
        students = cursor.fetchall()
        
        student_reports = []
        for s in students:
            student_id = s['id']
            
            cursor.execute(
                "SELECT SUM(attended_classes) as total_att, SUM(total_classes) as total_cls FROM attendance WHERE student_id = %s",
                (student_id,)
            )
            att_row = cursor.fetchone()
            att_pct = 100.0
            if att_row and att_row['total_cls'] and att_row['total_cls'] > 0:
                att_pct = round((float(att_row['total_att'] or 0) / float(att_row['total_cls'])) * 100, 1)
            else:
                att_pct = 0.0
                
            cursor.execute(
                "SELECT SUM(credits * grade_point) as weighted_sum, SUM(credits) as total_credits FROM cgpa_courses WHERE student_id = %s",
                (student_id,)
            )
            cgpa_row = cursor.fetchone()
            gpa = 0.0
            if cgpa_row and cgpa_row['total_credits'] and cgpa_row['total_credits'] > 0:
                gpa = round(float(cgpa_row['weighted_sum'] or 0.0) / float(cgpa_row['total_credits']), 2)
            else:
                gpa = 0.0
                
            if (att_row and att_row['total_cls'] and att_row['total_cls'] > 0 and att_pct < 75.0) or (cgpa_row and cgpa_row['total_credits'] and cgpa_row['total_credits'] > 0 and gpa < 5.5):
                risk_status = "High"
            elif (att_row and att_row['total_cls'] and att_row['total_cls'] > 0 and att_pct < 80.0) or (cgpa_row and cgpa_row['total_credits'] and cgpa_row['total_credits'] > 0 and gpa < 6.5):
                risk_status = "Warning"
            else:
                risk_status = "Stable"
                
            student_reports.append({
                "id": student_id,
                "full_name": s['full_name'],
                "email": s['email'],
                "reg_number": s.get('reg_number') or "N/A",
                "department": s.get('department') or "N/A",
                "created_at": str(s['created_at'].date()) if s.get('created_at') else "N/A",
                "cgpa": gpa,
                "attendance_percentage": att_pct,
                "risk_status": risk_status
            })
            
        return student_reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.post("/admin/students/bulk-delete")
def bulk_delete_students(data: BulkDeleteStudentsRequest, user = Depends(require_admin)):
    if not data.student_ids:
        raise HTTPException(status_code=400, detail="Student IDs list cannot be empty")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor()
        format_strings = ','.join(['%s'] * len(data.student_ids))
        cursor.execute(
            f"DELETE FROM students WHERE id IN ({format_strings}) AND role = 'student'",
            tuple(data.student_ids)
        )
        conn.commit()
        return {"message": "Selected student accounts deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ----------------- Teacher Management -----------------
@router.post("/admin/teachers")
def create_teacher(data: TeacherCreateRequest, user = Depends(require_admin)):
    if not data.full_name.strip():
        raise HTTPException(status_code=400, detail="Full Name cannot be empty")
    if not data.department.strip():
        raise HTTPException(status_code=400, detail="Department cannot be empty")
    if len(data.temporary_password) < 8:
        raise HTTPException(status_code=400, detail="Temporary password must be at least 8 characters long")
        
    # Check domain rules (must end in allowed domain suffix, but admin creates it)
    if not auth.is_valid_student_email(data.email):
        raise HTTPException(
            status_code=400, 
            detail="Email domain not allowed. Please use the institutional domain."
        )
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        # Check conflicts
        cursor.execute("SELECT id FROM students WHERE email = %s", (data.email.strip().lower(),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
            
        hashed_password = auth.hash_password(data.temporary_password)
        cursor.execute(
            """
            INSERT INTO students (full_name, email, password_hash, role, department, force_password_change)
            VALUES (%s, %s, %s, 'teacher', %s, 1)
            """,
            (data.full_name.strip(), data.email.strip().lower(), hashed_password, data.department.strip())
        )
        teacher_id = cursor.lastrowid
        
        # Insert subject mapping
        for subject in data.subjects:
            if subject.strip():
                cursor.execute(
                    """
                    INSERT INTO teacher_subjects (teacher_id, subject_name, department)
                    VALUES (%s, %s, %s)
                    """,
                    (teacher_id, subject.strip(), data.department.strip())
                )
                
        conn.commit()
        return {"message": "Teacher account created successfully.", "id": teacher_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.get("/admin/teachers")
def list_teachers(user = Depends(require_admin)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, full_name, email, department, created_at, force_password_change
            FROM students
            WHERE role = 'teacher'
            ORDER BY full_name
            """
        )
        teachers = cursor.fetchall()
        
        for t in teachers:
            t["created_at"] = str(t["created_at"].date()) if t.get("created_at") else "N/A"
            t["force_password_change"] = bool(t["force_password_change"])
            
            # Fetch assigned subjects
            cursor.execute(
                "SELECT subject_name FROM teacher_subjects WHERE teacher_id = %s ORDER BY subject_name",
                (t["id"],)
            )
            t["subjects"] = [row["subject_name"] for row in cursor.fetchall()]
            
            # Find last login or status
            # For simplicity, if force_password_change is true, status is 'Force Change Pending', else 'Active'
            t["status"] = "Force Change Pending" if t["force_password_change"] else "Active"
            
        return teachers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.delete("/admin/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, user = Depends(require_admin)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM students WHERE id = %s AND role = 'teacher'", (teacher_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Teacher not found")
            
        cursor.execute("DELETE FROM students WHERE id = %s", (teacher_id,))
        conn.commit()
        return {"message": "Teacher account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.put("/admin/teachers/{teacher_id}/subjects")
def update_teacher_subjects(teacher_id: int, data: TeacherSubjectsUpdateRequest, user = Depends(require_admin)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        # Verify teacher exists
        cursor.execute("SELECT department FROM students WHERE id = %s AND role = 'teacher'", (teacher_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Teacher not found")
            
        dept = row["department"]
        
        # Clear current subjects
        cursor.execute("DELETE FROM teacher_subjects WHERE teacher_id = %s", (teacher_id,))
        
        # Add new subjects
        for sub in data.subjects:
            if sub.strip():
                cursor.execute(
                    """
                    INSERT INTO teacher_subjects (teacher_id, subject_name, department)
                    VALUES (%s, %s, %s)
                    """,
                    (teacher_id, sub.strip(), dept)
                )
        conn.commit()
        return {"message": "Teacher subjects updated successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.post("/admin/promote")
def promote_student(data: PromoteStudentRequest, user = Depends(require_admin)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        # Check student existence
        cursor.execute("SELECT id FROM students WHERE id = %s AND role = 'student'", (data.student_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Student not found or already promoted")
            
        # Update user record
        cursor.execute(
            """
            UPDATE students 
            SET role = 'teacher', department = %s, force_password_change = 1
            WHERE id = %s
            """,
            (data.department.strip(), data.student_id)
        )
        
        # Add subjects
        for sub in data.subjects:
            if sub.strip():
                cursor.execute(
                    """
                    INSERT INTO teacher_subjects (teacher_id, subject_name, department)
                    VALUES (%s, %s, %s)
                    """,
                    (data.student_id, sub.strip(), data.department.strip())
                )
                
        conn.commit()
        return {"message": "Student promoted to Teacher successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ----------------- Announcements Manager -----------------
@router.post("/announcements")
def create_announcement(data: AnnouncementCreateRequest, user = Depends(require_admin)):
    if not data.title.strip() or not data.content.strip():
        raise HTTPException(status_code=400, detail="Title and content are required")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        expires_date = None
        if data.expires_at and data.expires_at.strip():
            try:
                expires_date = datetime.date.fromisoformat(data.expires_at.strip())
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expires_at format. Use YYYY-MM-DD.")
                
        cursor.execute(
            """
            INSERT INTO announcements (title, content, type, priority, expires_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (data.title.strip(), data.content.strip(), data.type.strip(), data.priority.strip(), expires_date)
        )
        conn.commit()
        new_id = cursor.lastrowid
        return {
            "message": "Announcement created successfully",
            "id": new_id,
            "title": data.title.strip(),
            "content": data.content.strip(),
            "type": data.type.strip(),
            "priority": data.priority.strip(),
            "expires_at": str(expires_date) if expires_date else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.put("/announcements/{announcement_id}")
def update_announcement(announcement_id: int, data: AnnouncementUpdateRequest, user = Depends(require_admin)):
    if not data.title.strip() or not data.content.strip():
        raise HTTPException(status_code=400, detail="Title and content are required")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True, buffered=True)
        # Verify existence
        cursor.execute("SELECT id FROM announcements WHERE id = %s", (announcement_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Announcement not found")
            
        expires_date = None
        if data.expires_at and data.expires_at.strip():
            try:
                expires_date = datetime.date.fromisoformat(data.expires_at.strip())
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expires_at format. Use YYYY-MM-DD.")
                
        cursor.execute(
            """
            UPDATE announcements 
            SET title = %s, content = %s, type = %s, priority = %s, expires_at = %s 
            WHERE id = %s
            """,
            (data.title.strip(), data.content.strip(), data.type.strip(), data.priority.strip(), expires_date, announcement_id)
        )
        conn.commit()
        return {"message": "Announcement updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.delete("/announcements/{announcement_id}")
def delete_announcement(announcement_id: int, user = Depends(require_admin)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(buffered=True)
        cursor.execute("SELECT id FROM announcements WHERE id = %s", (announcement_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Announcement not found")
            
        cursor.execute("DELETE FROM announcements WHERE id = %s", (announcement_id,))
        conn.commit()
        return {"message": "Announcement deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
