import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH || './data/paragliding.db';
const dbDir = dirname(DB_PATH);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Clubs (tenants)
  CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'ILS',
    settings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Users
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin','instructor','member')) DEFAULT 'member',
    phone TEXT,
    license_number TEXT,
    license_expiry TEXT,
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    UNIQUE (club_id, email)
  );

  -- Equipment
  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    purchase_date TEXT,
    purchase_price REAL,
    status TEXT CHECK(status IN ('active','maintenance','retired','rented')) DEFAULT 'active',
    owner_id INTEGER,
    notes TEXT,
    last_inspection TEXT,
    next_inspection TEXT,
    flight_hours REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  -- Safety checks
  CREATE TABLE IF NOT EXISTS safety_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    inspector_id INTEGER NOT NULL,
    check_date TEXT NOT NULL,
    result TEXT CHECK(result IN ('pass','fail','conditional')) NOT NULL,
    notes TEXT,
    next_check_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id)
  );

  -- Finance categories
  CREATE TABLE IF NOT EXISTS finance_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('income','expense')) NOT NULL,
    color TEXT DEFAULT '#6366F1',
    FOREIGN KEY (club_id) REFERENCES clubs(id)
  );

  -- Finance transactions
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    category_id INTEGER,
    user_id INTEGER,
    amount REAL NOT NULL,
    type TEXT CHECK(type IN ('income','expense')) NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    reference TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (category_id) REFERENCES finance_categories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Courses
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    instructor_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    level TEXT CHECK(level IN ('beginner','intermediate','advanced','tandem')) DEFAULT 'beginner',
    duration_days INTEGER,
    price REAL,
    max_students INTEGER DEFAULT 10,
    status TEXT CHECK(status IN ('draft','active','completed','cancelled')) DEFAULT 'draft',
    start_date TEXT,
    end_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (instructor_id) REFERENCES users(id)
  );

  -- Students (can be users or external)
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth TEXT,
    emergency_contact TEXT,
    medical_info TEXT,
    license_level TEXT,
    total_flights INTEGER DEFAULT 0,
    total_hours REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Course enrollments
  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('enrolled','completed','dropped','pending')) DEFAULT 'pending',
    enrollment_date TEXT DEFAULT (datetime('now')),
    completion_date TEXT,
    grade TEXT,
    notes TEXT,
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE (club_id, course_id, student_id)
  );

  -- Experience flights (tandem, joy rides)
  CREATE TABLE IF NOT EXISTS experience_flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    pilot_id INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    passenger_email TEXT,
    passenger_phone TEXT,
    flight_date TEXT NOT NULL,
    duration_minutes INTEGER,
    takeoff_location TEXT,
    landing_location TEXT,
    status TEXT CHECK(status IN ('scheduled','completed','cancelled','no-show')) DEFAULT 'scheduled',
    price REAL,
    payment_status TEXT CHECK(payment_status IN ('pending','paid','refunded')) DEFAULT 'pending',
    notes TEXT,
    equipment_id INTEGER,
    weather_conditions TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (pilot_id) REFERENCES users(id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
  );

  -- Marketing campaigns
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('email','sms','social','event','other')) DEFAULT 'email',
    status TEXT CHECK(status IN ('draft','active','completed','paused')) DEFAULT 'draft',
    target_audience TEXT,
    content TEXT,
    budget REAL,
    start_date TEXT,
    end_date TEXT,
    metrics TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id)
  );

  -- Social media posts
  CREATE TABLE IF NOT EXISTS social_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    platform TEXT CHECK(platform IN ('facebook','instagram','twitter','linkedin','whatsapp')) NOT NULL,
    content TEXT NOT NULL,
    status TEXT CHECK(status IN ('draft','scheduled','published','failed')) DEFAULT 'draft',
    scheduled_at TEXT,
    published_at TEXT,
    media_urls TEXT DEFAULT '[]',
    ai_generated INTEGER DEFAULT 0,
    campaign_id INTEGER,
    engagement TEXT DEFAULT '{}',
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- Weather records
  CREATE TABLE IF NOT EXISTS weather_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    recorded_at TEXT NOT NULL,
    temperature REAL,
    wind_speed REAL,
    wind_direction INTEGER,
    wind_gusts REAL,
    visibility REAL,
    cloud_cover INTEGER,
    precipitation REAL,
    conditions TEXT,
    is_flyable INTEGER DEFAULT 1,
    notes TEXT,
    FOREIGN KEY (club_id) REFERENCES clubs(id)
  );

  -- Notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    user_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (club_id) REFERENCES clubs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export default db;
