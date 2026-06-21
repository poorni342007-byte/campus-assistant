import os
import datetime
from fastapi import Header, Depends, HTTPException, status
import database

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header"
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use 'Bearer <token>'"
        )
    token = authorization.split(" ")[1]
    
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed"
        )
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT s.expires_at, st.id, st.full_name, st.email, st.role, st.reg_number, st.department, st.force_password_change
            FROM sessions s
            JOIN students st ON s.student_id = st.id
            WHERE s.token = %s
            """,
            (token,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token"
            )
        
        # Check expiry
        if user['expires_at'] < datetime.datetime.now():
            cursor.execute("DELETE FROM sessions WHERE token = %s", (token,))
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please log in again."
            )
            
        user['token'] = token
        # Convert force_password_change to boolean
        user['force_password_change'] = bool(user.get('force_password_change', False))
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auth verification error: {str(e)}"
        )
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

async def require_student(user = Depends(get_current_user)):
    if user['role'] != 'student':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student privilege required"
        )
    return user

async def require_teacher(user = Depends(get_current_user)):
    if user['role'] != 'teacher':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Teacher privilege required"
        )
    return user

async def require_admin(user = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin privilege required"
        )
    return user
