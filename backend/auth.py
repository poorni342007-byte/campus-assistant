import bcrypt
import re
import os
from mysql.connector import Error
from database import get_db_connection

def hash_password(password: str) -> str:
    """
    Hashes a password using bcrypt.
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_password(password: str, hashed_password: str) -> bool:
    """
    Verifies a password against its bcrypt hash.
    """
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def validate_email(email: str) -> bool:
    """
    Simple regular expression check for valid email formats.
    """
    email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(email_regex, email))

def is_valid_student_email(email: str) -> bool:
    """
    Checks if the email domain matches allowed student domains.
    """
    email = email.strip().lower()
    if '@' not in email:
        return False
    domain = email.split('@')[-1]
    
    # Load ALLOWED_STUDENT_DOMAINS from env
    allowed_domains_str = os.getenv("ALLOWED_STUDENT_DOMAINS", "edu,edu.in,sairamtap.edu.in")
    allowed_domains = [d.strip().lower() for d in allowed_domains_str.split(',') if d.strip()]
    
    for d in allowed_domains:
        if domain == d or domain.endswith('.' + d):
            return True
    return False

def register_student(full_name: str, email: str, password: str, reg_number: str):
    """
    Registers a new student.
    Returns: (bool, message)
    """
    if not full_name.strip():
        return False, "Full Name cannot be empty."
    if not email.strip() or not validate_email(email):
        return False, "Please enter a valid email address."
    if not is_valid_student_email(email):
        return False, "Email domain not allowed. Please use your institutional email."
    if not reg_number or not reg_number.strip():
        return False, "Registration Number cannot be empty."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    
    # Check password strength: at least 1 uppercase, 1 number
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."

    conn = get_db_connection()
    if not conn:
        return False, "Database connection failed. Please ensure the database is running."

    try:
        cursor = conn.cursor(dictionary=True)
        
        # Check if email already exists
        cursor.execute("SELECT id FROM students WHERE email = %s", (email.strip().lower(),))
        if cursor.fetchone():
            return False, "An account with this email already exists."

        # Check if reg_number already exists
        cursor.execute("SELECT id FROM students WHERE reg_number = %s", (reg_number.strip(),))
        if cursor.fetchone():
            return False, "An account with this Registration Number already exists."

        # Hash the password
        hashed_password = hash_password(password)

        # Insert new student record
        insert_query = """
        INSERT INTO students (full_name, email, password_hash, reg_number, role)
        VALUES (%s, %s, %s, %s, 'student')
        """
        cursor.execute(insert_query, (full_name.strip(), email.strip().lower(), hashed_password, reg_number.strip()))
        conn.commit()
        
        return True, "Account created. You can now log in."
    except Error as e:
        return False, f"Database error during registration: {e}"
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

def login_student(email: str, password: str):
    """
    Authenticates a student/teacher/admin using email and password.
    Returns: (bool, user_dict_or_error_message)
    """
    if not email.strip() or not password:
        return False, "Email and Password cannot be empty."

    conn = get_db_connection()
    if not conn:
        return False, "Database connection failed. Please ensure the database is running."

    try:
        cursor = conn.cursor(dictionary=True)
        
        # Fetch student by email
        cursor.execute("SELECT * FROM students WHERE email = %s", (email.strip().lower(),))
        student = cursor.fetchone()
        
        if not student:
            return False, "Invalid email or password."

        # Validate password
        if check_password(password, student['password_hash']):
            student.pop('password_hash', None)
            # Make sure we convert fields to proper types
            student['force_password_change'] = bool(student.get('force_password_change', False))
            return True, student
        else:
            return False, "Invalid email or password."
            
    except Error as e:
        return False, f"Database error during login: {e}"
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
