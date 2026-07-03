import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import bcrypt

load_dotenv()


def get_connection():
    load_dotenv(override=True)
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            port=int(os.getenv("DB_PORT", 3306)),
            ssl_disabled=False
        )
        return connection, None
    except Error as e:
        return None, str(e)


def init_db():
    load_dotenv(override=True)

    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        raise RuntimeError("Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment variables.")

    connection, error_msg = get_connection()

    if not connection:
        return False, f"Could not connect to MySQL Server. Details: {error_msg}"

    try:
        cursor = connection.cursor()

        db_name = os.getenv("DB_NAME", "campus_ai")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.execute(f"USE {db_name}")

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student',
            department VARCHAR(100) DEFAULT NULL,
            reg_number VARCHAR(50) DEFAULT NULL,
            force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        try:
            cursor.execute("SHOW COLUMNS FROM students LIKE 'role'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE students ADD COLUMN role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student'")

            cursor.execute("SHOW COLUMNS FROM students LIKE 'department'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE students ADD COLUMN department VARCHAR(100) DEFAULT NULL")

            cursor.execute("SHOW COLUMNS FROM students LIKE 'reg_number'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE students ADD COLUMN reg_number VARCHAR(50) DEFAULT NULL")

            cursor.execute("SHOW COLUMNS FROM students LIKE 'force_password_change'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE students ADD COLUMN force_password_change BOOLEAN NOT NULL DEFAULT FALSE")

            cursor.execute("SHOW COLUMNS FROM students LIKE 'is_admin'")
            if cursor.fetchone():
                cursor.execute("UPDATE students SET role = 'admin' WHERE is_admin = 1")
                cursor.execute("UPDATE students SET role = 'student' WHERE is_admin = 0 OR is_admin IS NULL")
                cursor.execute("ALTER TABLE students DROP COLUMN is_admin")
                print("Database migration: Migrated 'is_admin' to 'role' and dropped 'is_admin' column.")

            connection.commit()
        except Error as alter_err:
            print(f"Migration error (students table columns): {alter_err}")

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            subject_name VARCHAR(100) NOT NULL,
            attended_classes INT DEFAULT 0,
            total_classes INT DEFAULT 0,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS cgpa_courses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            semester INT NOT NULL,
            course_name VARCHAR(100) NOT NULL,
            credits INT NOT NULL,
            grade_point DECIMAL(4, 2) NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS study_plans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            subject_name VARCHAR(100) NOT NULL,
            topic VARCHAR(255) NOT NULL,
            study_date DATE NOT NULL,
            duration_minutes INT DEFAULT 60,
            is_completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS teacher_subjects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            teacher_id INT NOT NULL,
            subject_name VARCHAR(100) NOT NULL,
            department VARCHAR(100),
            FOREIGN KEY (teacher_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token VARCHAR(128) PRIMARY KEY,
            student_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            token VARCHAR(128) PRIMARY KEY,
            student_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(150) NOT NULL,
            content TEXT NOT NULL,
            type VARCHAR(50) NOT NULL,
            priority VARCHAR(20) NOT NULL,
            expires_at DATE DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        try:
            cursor.execute("SHOW COLUMNS FROM announcements LIKE 'expires_at'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE announcements ADD COLUMN expires_at DATE DEFAULT NULL")
                connection.commit()
                print("Database migration: Added 'expires_at' to 'announcements' table.")
        except Error as alter_err:
            print(f"Migration error (announcements.expires_at): {alter_err}")

        cursor.execute("SELECT id FROM students WHERE email = %s", (admin_email.strip().lower(),))

        if not cursor.fetchone():
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(
                admin_password.strip().encode("utf-8"),
                salt
            ).decode("utf-8")

            cursor.execute("""
                INSERT INTO students (full_name, email, password_hash, role)
                VALUES (%s, %s, %s, %s)
            """, (
                "Administrator",
                admin_email.strip().lower(),
                hashed_password,
                "admin"
            ))

            print("Default admin account seeded successfully from .env settings.")

        connection.commit()
        return True, "Database initialized successfully."

    except Error as e:
        return False, f"Database initialization failed: {e}"

    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()


def get_db_connection():
    load_dotenv(override=True)

    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "campus_ai"),
            port=int(os.getenv("DB_PORT", 3306)),
            ssl_disabled=False
        )
        return connection

    except Error as e:
        print(f"Error connecting to database: {e}")
        return None
