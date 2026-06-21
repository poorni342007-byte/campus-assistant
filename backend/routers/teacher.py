from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
import database
from dependencies import require_teacher

router = APIRouter(prefix="/api", tags=["teacher"])

class MarkAttendanceRequest(BaseModel):
    subject_name: str
    present_student_ids: list[int]
    absent_student_ids: list[int]

@router.get("/teacher/subjects")
def get_teacher_subjects(user = Depends(require_teacher)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, subject_name, department FROM teacher_subjects WHERE teacher_id = %s ORDER BY subject_name",
            (user["id"],)
        )
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.get("/teacher/students")
def get_teacher_students(user = Depends(require_teacher)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        # Fetch students who are registered in subjects taught by this teacher
        cursor.execute(
            """
            SELECT DISTINCT s.id as student_id, s.full_name, s.email, s.reg_number, 
                            a.subject_name, a.attended_classes, a.total_classes
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.subject_name IN (
                SELECT subject_name FROM teacher_subjects WHERE teacher_id = %s
            )
            ORDER BY a.subject_name, s.full_name
            """,
            (user["id"],)
        )
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.post("/teacher/attendance/mark")
def mark_attendance(data: MarkAttendanceRequest, user = Depends(require_teacher)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Verify teacher is authorized to mark attendance for this subject
        cursor.execute(
            "SELECT id FROM teacher_subjects WHERE teacher_id = %s AND subject_name = %s",
            (user["id"], data.subject_name)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: You are not assigned to teach '{data.subject_name}'"
            )
            
        # Update present students
        for s_id in data.present_student_ids:
            cursor.execute(
                """
                UPDATE attendance 
                SET total_classes = total_classes + 1, attended_classes = attended_classes + 1 
                WHERE student_id = %s AND subject_name = %s
                """,
                (s_id, data.subject_name)
            )
            
        # Update absent students
        for s_id in data.absent_student_ids:
            cursor.execute(
                """
                UPDATE attendance 
                SET total_classes = total_classes + 1 
                WHERE student_id = %s AND subject_name = %s
                """,
                (s_id, data.subject_name)
            )
            
        conn.commit()
        return {"message": f"Attendance for '{data.subject_name}' marked successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.get("/teacher/students/{student_id}/attendance")
def get_student_subject_attendance(student_id: int, user = Depends(require_teacher)):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor(dictionary=True)
        # Fetch the student's attendance records that overlap with the teacher's assigned subjects
        cursor.execute(
            """
            SELECT a.id, a.subject_name, a.attended_classes, a.total_classes, s.full_name, s.reg_number
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.student_id = %s AND a.subject_name IN (
                SELECT subject_name FROM teacher_subjects WHERE teacher_id = %s
            )
            """,
            (student_id, user["id"])
        )
        records = cursor.fetchall()
        if not records:
            raise HTTPException(status_code=404, detail="No attendance records found for this student in your subjects")
        return records
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
