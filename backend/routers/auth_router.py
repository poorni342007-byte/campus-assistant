import os
import uuid
import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
import database
import auth
from dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["authentication"])

# Request/Response schemas
class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    reg_number: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/register")
def register(user_data: RegisterRequest):
    success, msg = auth.register_student(
        full_name=user_data.full_name,
        email=user_data.email,
        password=user_data.password,
        reg_number=user_data.reg_number
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@router.post("/login")
def login(login_data: LoginRequest):
    success, result = auth.login_student(
        email=login_data.email,
        password=login_data.password
    )
    if not success:
        raise HTTPException(status_code=401, detail=result)
    
    # Generate session token (UUID v4)
    token = str(uuid.uuid4())
    expiry_hours = int(os.getenv("SESSION_EXPIRY_HOURS", 8))
    expires_at = datetime.datetime.now() + datetime.timedelta(hours=expiry_hours)
    
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sessions (token, student_id, expires_at) VALUES (%s, %s, %s)",
            (token, result["id"], expires_at)
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session generation failed: {str(e)}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
            
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": result["id"],
            "full_name": result["full_name"],
            "email": result["email"],
            "role": result["role"],
            "reg_number": result.get("reg_number"),
            "department": result.get("department"),
            "created_at": str(result.get("created_at")),
            "force_password_change": result.get("force_password_change", False)
        }
    }

@router.post("/logout")
def logout(user = Depends(get_current_user)):
    token = user['token']
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = %s", (token,))
        conn.commit()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    email = req.email.strip().lower()
    
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, full_name FROM students WHERE email = %s", (email,))
        student = cursor.fetchone()
        
        if student:
            # Generate reset token (UUID v4)
            reset_token = str(uuid.uuid4())
            expires_at = datetime.datetime.now() + datetime.timedelta(hours=1)
            
            # Save token to database
            cursor.execute(
                "INSERT INTO password_resets (token, student_id, expires_at) VALUES (%s, %s, %s)",
                (reset_token, student["id"], expires_at)
            )
            conn.commit()
            
            # Print reset link to server logs
            reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
            print("\n" + "="*80)
            print(f" PASSWORD RESET REQUEST RECEIVED FOR {email}")
            print(f" Reset Link: {reset_link}")
            print("="*80 + "\n")
            
            # SMTP code could go here if configured in .env, otherwise printing to logs is sufficient
            
    except Exception as e:
        # Log error but return generic response
        print(f"Error in forgot-password: {e}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
            
    # Always return a generic success message to prevent user enumeration
    return {"message": "If the email exists, a password reset link has been generated and printed to logs."}

@router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest):
    token = req.token.strip()
    new_password = req.new_password
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not any(c.isupper() for c in new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number.")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cursor = conn.cursor(dictionary=True)
        # Check reset token validity
        cursor.execute(
            "SELECT * FROM password_resets WHERE token = %s",
            (token,)
        )
        reset_row = cursor.fetchone()
        if not reset_row:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
            
        # Check expiry
        if reset_row['expires_at'] < datetime.datetime.now():
            cursor.execute("DELETE FROM password_resets WHERE token = %s", (token,))
            conn.commit()
            raise HTTPException(status_code=400, detail="Password reset token has expired.")
            
        # Update user's password
        hashed_password = auth.hash_password(new_password)
        cursor.execute(
            "UPDATE students SET password_hash = %s, force_password_change = 0 WHERE id = %s",
            (hashed_password, reset_row['student_id'])
        )
        # Delete token
        cursor.execute("DELETE FROM password_resets WHERE token = %s", (token,))
        conn.commit()
        
        return {"message": "Password has been reset successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@router.post("/auth/change-password")
def change_password(req: ChangePasswordRequest, user = Depends(get_current_user)):
    current_password = req.current_password
    new_password = req.new_password
    student_id = user["id"]
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not any(c.isupper() for c in new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in new_password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number.")
        
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        cursor = conn.cursor(dictionary=True)
        # Fetch current password hash
        cursor.execute("SELECT password_hash FROM students WHERE id = %s", (student_id,))
        row = cursor.fetchone()
        
        if not row or not auth.check_password(current_password, row["password_hash"]):
            raise HTTPException(status_code=400, detail="Incorrect current password.")
            
        # Update password
        hashed_password = auth.hash_password(new_password)
        cursor.execute(
            "UPDATE students SET password_hash = %s, force_password_change = 0 WHERE id = %s",
            (hashed_password, student_id)
        )
        conn.commit()
        return {"message": "Password changed successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
