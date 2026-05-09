import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../data/paragliding.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    budget REAL,
    spent REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    leads_generated INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT,
    campaign_id INTEGER REFERENCES campaigns(id),
    status TEXT DEFAULT 'new',
    interest TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birth_date TEXT,
    join_date TEXT DEFAULT (date('now')),
    membership_type TEXT DEFAULT 'regular',
    membership_expiry TEXT,
    status TEXT DEFAULT 'active',
    certifications TEXT,
    total_flights INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customer_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    type TEXT NOT NULL,
    description TEXT,
    date TEXT DEFAULT (date('now')),
    staff TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level TEXT,
    description TEXT,
    duration_hours INTEGER,
    price REAL,
    max_students INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active',
    instructor TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birth_date TEXT,
    enrollment_date TEXT DEFAULT (date('now')),
    current_level TEXT DEFAULT 'beginner',
    instructor TEXT,
    status TEXT DEFAULT 'active',
    medical_clearance INTEGER DEFAULT 0,
    medical_expiry TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS student_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    enrolled_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    grade TEXT,
    status TEXT DEFAULT 'active',
    flight_hours REAL DEFAULT 0,
    theory_score INTEGER
  );

  CREATE TABLE IF NOT EXISTS theory_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    test_name TEXT NOT NULL,
    score INTEGER,
    max_score INTEGER DEFAULT 100,
    passed INTEGER DEFAULT 0,
    test_date TEXT DEFAULT (date('now')),
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS experience_flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    flight_date TEXT,
    flight_time TEXT,
    pilot TEXT,
    location TEXT,
    duration_minutes INTEGER DEFAULT 15,
    price REAL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    waiver_signed INTEGER DEFAULT 0,
    waiver_signed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    event_date TEXT,
    location TEXT,
    max_participants INTEGER,
    price REAL DEFAULT 0,
    status TEXT DEFAULT 'upcoming',
    type TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS event_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id),
    customer_id INTEGER REFERENCES customers(id),
    customer_name TEXT,
    customer_phone TEXT,
    registered_at TEXT DEFAULT (datetime('now')),
    payment_status TEXT DEFAULT 'unpaid',
    attendance TEXT DEFAULT 'registered'
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    category TEXT,
    country TEXT,
    rating INTEGER DEFAULT 3,
    payment_terms TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS supplier_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    order_date TEXT DEFAULT (date('now')),
    expected_delivery TEXT,
    actual_delivery TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    items TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT UNIQUE,
    manufacture_year INTEGER,
    color TEXT,
    size TEXT,
    weight_kg REAL,
    min_pilot_weight REAL,
    max_pilot_weight REAL,
    purchase_date TEXT,
    purchase_price REAL,
    supplier_id INTEGER REFERENCES suppliers(id),
    warranty_expiry TEXT,
    owner_type TEXT DEFAULT 'club',
    owner_id INTEGER,
    owner_name TEXT,
    status TEXT DEFAULT 'active',
    condition TEXT DEFAULT 'good',
    location TEXT DEFAULT 'מחסן',
    total_flights INTEGER DEFAULT 0,
    total_hours REAL DEFAULT 0,
    max_flights INTEGER,
    max_years INTEGER,
    insured INTEGER DEFAULT 0,
    insurance_value REAL,
    insurance_expiry TEXT,
    last_inspection TEXT,
    next_inspection TEXT,
    inspection_interval_months INTEGER DEFAULT 12,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipment_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    inspection_date TEXT NOT NULL,
    inspection_type TEXT NOT NULL,
    result TEXT DEFAULT 'passed',
    findings TEXT,
    inspector TEXT,
    lab_name TEXT,
    cost REAL,
    certificate_url TEXT,
    next_due TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipment_repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    report_date TEXT DEFAULT (date('now')),
    description TEXT NOT NULL,
    reported_by TEXT,
    repaired_by TEXT,
    repair_date TEXT,
    cost REAL,
    under_warranty INTEGER DEFAULT 0,
    result TEXT,
    back_in_service INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipment_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    borrower_type TEXT NOT NULL,
    borrower_id INTEGER,
    borrower_name TEXT NOT NULL,
    borrower_phone TEXT,
    loan_date TEXT DEFAULT (date('now')),
    expected_return TEXT,
    actual_return TEXT,
    condition_out TEXT DEFAULT 'good',
    condition_in TEXT,
    approved_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipment_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    image_type TEXT DEFAULT 'general',
    file_path TEXT NOT NULL,
    caption TEXT,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alert_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT UNIQUE NOT NULL,
    warning_days INTEGER DEFAULT 30,
    urgent_days INTEGER DEFAULT 7,
    email_enabled INTEGER DEFAULT 1,
    whatsapp_enabled INTEGER DEFAULT 1,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS alert_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    equipment_id INTEGER REFERENCES equipment(id),
    message TEXT,
    channel TEXT,
    sent_to TEXT,
    status TEXT DEFAULT 'sent',
    sent_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    type TEXT NOT NULL,
    description TEXT,
    performed_date TEXT,
    next_due TEXT,
    cost REAL,
    technician TEXT,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS maintenance_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    forecast_type TEXT NOT NULL,
    predicted_date TEXT,
    priority TEXT DEFAULT 'medium',
    estimated_cost REAL,
    description TEXT,
    ai_reasoning TEXT,
    generated_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS weather_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT DEFAULT 'Israel',
    latitude REAL,
    longitude REAL,
    temperature REAL,
    wind_speed REAL,
    wind_direction INTEGER,
    precipitation REAL,
    visibility REAL,
    cloud_cover INTEGER,
    raw_data TEXT,
    ai_analysis TEXT,
    safety_rating TEXT,
    logged_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER REFERENCES customers(id),
    author_name TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'post',
    likes INTEGER DEFAULT 0,
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS community_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES community_posts(id),
    author_id INTEGER REFERENCES customers(id),
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    author TEXT,
    expires_at TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flight_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    difficulty TEXT DEFAULT 'intermediate',
    distance_km REAL,
    altitude_gain INTEGER,
    max_altitude INTEGER,
    min_altitude INTEGER,
    waypoints TEXT,
    conditions TEXT,
    best_season TEXT,
    rating REAL DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS route_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL REFERENCES flight_routes(id),
    reviewer_id INTEGER REFERENCES customers(id),
    reviewer_name TEXT NOT NULL,
    rating INTEGER,
    comment TEXT,
    flight_date TEXT,
    conditions TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lesson_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id),
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    video_url TEXT,
    order_num INTEGER DEFAULT 1,
    duration_minutes INTEGER,
    level TEXT DEFAULT 'beginner',
    status TEXT DEFAULT 'published',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lesson_quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL REFERENCES lesson_modules(id),
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    order_num INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    module_id INTEGER NOT NULL REFERENCES lesson_modules(id),
    completed INTEGER DEFAULT 0,
    quiz_score INTEGER,
    quiz_attempts INTEGER DEFAULT 0,
    last_watched_at TEXT,
    completed_at TEXT,
    UNIQUE(student_id, module_id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_date TEXT DEFAULT (date('now')),
    amount REAL NOT NULL,
    payment_type TEXT NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    payer_type TEXT,
    payer_id INTEGER,
    payer_name TEXT NOT NULL,
    description TEXT,
    reference_id INTEGER,
    reference_type TEXT,
    status TEXT DEFAULT 'paid',
    receipt_number TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date TEXT DEFAULT (date('now')),
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    description TEXT NOT NULL,
    payment_method TEXT DEFAULT 'transfer',
    status TEXT DEFAULT 'paid',
    invoice_number TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS member_dues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    member_type TEXT NOT NULL,
    member_id INTEGER,
    member_name TEXT NOT NULL,
    member_phone TEXT,
    amount_due REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    payment_id INTEGER REFERENCES payments(id),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS social_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content_facebook TEXT,
    content_instagram TEXT,
    content_whatsapp TEXT,
    post_type TEXT DEFAULT 'general',
    platforms TEXT DEFAULT 'facebook',
    scheduled_at TEXT,
    published_at TEXT,
    status TEXT DEFAULT 'draft',
    reference_type TEXT,
    reference_id INTEGER,
    image_suggestion TEXT,
    hashtags TEXT,
    ai_generated INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    campaign_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS social_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    objective TEXT DEFAULT 'awareness',
    platform TEXT DEFAULT 'facebook',
    budget REAL DEFAULT 0,
    spent REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    leads_generated INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS communication_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    channel TEXT DEFAULT 'whatsapp',
    subject TEXT,
    content TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS communications_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_name TEXT,
    recipient_contact TEXT,
    channel TEXT DEFAULT 'whatsapp',
    template_id INTEGER REFERENCES communication_templates(id),
    subject TEXT,
    content TEXT,
    status TEXT DEFAULT 'sent',
    sent_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed data
const customerCount = db.prepare('SELECT COUNT(*) as c FROM customers').get();
if (customerCount.c === 0) {
  db.exec(`
    INSERT INTO customers (name, phone, email, membership_type, membership_expiry, certifications, total_flights, status) VALUES
    ('יוסי כהן', '050-1234567', 'yosi@example.com', 'premium', '2026-12-31', 'P2,P3', 145, 'active'),
    ('מיכל לוי', '052-2345678', 'michal@example.com', 'regular', '2026-06-30', 'P2', 67, 'active'),
    ('אבי מזרחי', '054-3456789', 'avi@example.com', 'premium', '2026-12-31', 'P2,P3,P4', 312, 'active'),
    ('שרה דוד', '053-4567890', 'sara@example.com', 'regular', '2025-12-31', 'P1', 12, 'active'),
    ('דן ברגר', '058-5678901', 'dan@example.com', 'annual', '2026-09-15', 'P2', 89, 'active'),
    ('נועה שפירא', '050-6789012', 'noa@example.com', 'regular', '2026-03-01', 'P2,P3', 178, 'active'),
    ('רון כץ', '052-7890123', 'ron@example.com', 'premium', '2026-12-31', 'P2,P3,P4,SIV', 445, 'active'),
    ('תמר בן-דוד', '054-8901234', 'tamar@example.com', 'regular', '2025-11-30', 'P1,P2', 34, 'active');

    INSERT INTO courses (name, level, description, duration_hours, price, max_students, instructor) VALUES
    ('מבוא למצנחי רחיפה P1', 'beginner', 'קורס יסודות לטיסת מצנח רחיפה', 40, 2800, 6, 'יובל הר-לב'),
    ('קורס P2 - כנפיים', 'intermediate', 'קורס מתקדם לטייסים עם ניסיון בסיסי', 60, 4500, 8, 'ליאת שמש'),
    ('קורס P3 - טייס מתקדם', 'advanced', 'קורס לטייסים מנוסים', 80, 6000, 6, 'יובל הר-לב'),
    ('SIV - ניהול מצבי חירום', 'advanced', 'קורס ניהול תקלות ומצבי חירום', 20, 3500, 8, 'רמי דקל'),
    ('תיאוריה ומטאורולוגיה', 'beginner', 'תיאוריה של טיסה ומזג אוויר', 16, 800, 15, 'ליאת שמש');

    INSERT INTO students (name, phone, email, current_level, instructor, status, medical_clearance, medical_expiry) VALUES
    ('אדם ישראלי', '050-1111111', 'adam@example.com', 'P1', 'יובל הר-לב', 'active', 1, '2027-01-15'),
    ('רינה כהן', '052-2222222', 'rina@example.com', 'P2', 'ליאת שמש', 'active', 1, '2026-08-20'),
    ('גיל פרץ', '054-3333333', 'gil@example.com', 'P1', 'יובל הר-לב', 'active', 1, '2026-06-10'),
    ('מאיה ברק', '053-4444444', 'maya@example.com', 'P2', 'ליאת שמש', 'active', 1, '2027-03-01'),
    ('עמי גולן', '058-5555555', 'ami@example.com', 'beginner', 'רמי דקל', 'active', 0, NULL);

    INSERT INTO campaigns (name, type, budget, spent, status, leads_generated, conversions) VALUES
    ('קמפיין פייסבוק - קיץ', 'social_media', 3000, 1850, 'active', 24, 6),
    ('גוגל אדס - ספטמבר', 'google_ads', 2000, 2000, 'completed', 18, 4),
    ('תערוכת ספורט 2025', 'event', 1500, 1200, 'completed', 35, 8),
    ('אינסטגרם - סרטוני טיסה', 'social_media', 1000, 450, 'active', 12, 2);

    INSERT INTO leads (name, phone, email, source, status, interest) VALUES
    ('כרמל דניאל', '050-9876543', 'carmel@example.com', 'facebook', 'interested', 'קורס P1'),
    ('לירז מנחם', '052-8765432', 'liraz@example.com', 'google', 'contacted', 'טיסת חוויה'),
    ('עופר שלום', '054-7654321', 'ofer@example.com', 'referral', 'new', 'קורס P1'),
    ('נטע כהן', '053-6543210', 'neta@example.com', 'instagram', 'qualified', 'טיסת חוויה');

    INSERT INTO suppliers (name, contact_name, phone, email, category, country, rating) VALUES
    ('Ozone Paragliders', 'Sales Team', '+33-123456789', 'sales@ozone.net', 'כנפיים', 'France', 5),
    ('Advance Thun', 'Hans Mueller', '+41-987654321', 'info@advance.ch', 'כנפיים', 'Switzerland', 5),
    ('Gin Gliders', 'Kim Lee', '+82-111222333', 'info@gingliders.com', 'כנפיים', 'South Korea', 4),
    ('Sup Air', 'Pierre Dupont', '+33-456789012', 'contact@supair.com', 'ציוד בטיחות', 'France', 4),
    ('ציוד ספורט ישראל', 'דוד לוי', '03-5555555', 'david@sports.co.il', 'ציוד מקומי', 'Israel', 4);

    INSERT INTO equipment (name, type, brand, model, serial_number, manufacture_year, color, size, purchase_date, purchase_price, owner_type, condition, location, total_flights, total_hours, max_flights, max_years, last_inspection, next_inspection, inspection_interval_months, insured, insurance_value) VALUES
    ('כנף קלאב 1', 'wing', 'Ozone', 'Rush 6', 'OZ-R6-001', 2022, 'כחול', 'M', '2022-03-15', 8500, 'club', 'good', 'מחסן', 234, 312, 500, 10, '2025-11-15', '2026-11-15', 12, 1, 6000),
    ('כנף קלאב 2', 'wing', 'Advance', 'ALPHA 7', 'ADV-A7-002', 2021, 'אדום', 'S', '2021-08-20', 9200, 'club', 'good', 'מחסן', 189, 251, 500, 10, '2025-09-20', '2026-09-20', 12, 1, 7000),
    ('רתמה 1', 'harness', 'Sup Air', 'Altirando 4', 'SA-ALT4-001', 2022, 'שחור', 'L', '2022-01-10', 2800, 'club', 'excellent', 'מחסן', 234, 312, NULL, 10, '2025-12-01', '2026-12-01', 12, 1, 2000),
    ('רתמה 2', 'harness', 'Advance', 'Lightness 3', 'ADV-L3-002', 2023, 'אפור', 'M', '2023-05-01', 3200, 'club', 'excellent', 'מחסן', 189, 251, NULL, 10, '2025-10-15', '2026-05-20', 12, 1, 2500),
    ('מצנח חירום 1', 'reserve', 'Gin', 'Yeti 3', 'GIN-Y3-001', 2022, 'כתום', 'M', '2022-03-15', 1800, 'club', 'good', 'מחסן', 0, 312, NULL, 10, '2025-10-05', '2026-05-15', 6, 1, 1500),
    ('רדיו 1', 'radio', 'Motorola', 'T82', 'MOT-T82-001', 2023, 'שחור', NULL, '2023-01-01', 350, 'club', 'good', 'מחסן', 0, 0, NULL, 7, '2025-01-01', '2026-01-01', 12, 0, NULL);

    INSERT INTO equipment (name, type, brand, model, serial_number, manufacture_year, color, size, purchase_date, purchase_price, owner_type, owner_name, condition, location, total_flights, total_hours, max_flights, max_years, last_inspection, next_inspection, inspection_interval_months) VALUES
    ('כנף תלמיד - אדם', 'wing', 'Nova', 'Mentor 7', 'NOV-M7-003', 2023, 'ירוק', 'S', '2023-09-01', 7800, 'student', 'אדם ישראלי', 'good', 'אצל תלמיד', 23, 31, 500, 10, '2025-08-01', '2026-08-01', 12),
    ('כנף חבר - יוסי', 'wing', 'Ozone', 'Rush 6 MS', 'OZ-R6S-004', 2021, 'סגול', 'MS', '2021-12-01', 8800, 'member', 'יוסי כהן', 'good', 'אצל חבר', 145, 193, 500, 10, '2025-06-01', '2026-06-01', 12);

    INSERT INTO equipment_inspections (equipment_id, inspection_date, inspection_type, result, findings, inspector, cost, next_due) VALUES
    (1, '2025-11-15', 'שנתית מלאה', 'passed', 'ציוד במצב תקין. כמה קרעים קטנים תוקנו.', 'ריגינג ישראל', 450, '2026-11-15'),
    (2, '2025-09-20', 'שנתית מלאה', 'passed', 'ציוד במצב טוב. נמצאו שחיקות קטנות בחגורות.', 'ריגינג ישראל', 420, '2026-09-20'),
    (3, '2025-12-01', 'שנתית', 'passed', 'רתמה במצב מצוין.', 'יובל הר-לב', 200, '2026-12-01'),
    (5, '2025-10-05', 'אריזה מחדש', 'passed', 'אורז מחדש כנדרש.', 'ריגינג ישראל', 180, '2026-04-05');

    INSERT INTO equipment_repairs (equipment_id, report_date, description, reported_by, repaired_by, repair_date, cost, result, back_in_service) VALUES
    (1, '2025-09-10', 'קרע קטן בפאנל 3', 'יובל הר-לב', 'ריגינג ישראל', '2025-09-15', 150, 'תוקן בהצלחה', 1),
    (2, '2025-07-20', 'שחיקה בחגורת כתף ימין', 'אדם ישראלי', 'ריגינג ישראל', '2025-08-01', 280, 'הוחלפה חגורה', 1);

    INSERT INTO alert_settings (alert_type, warning_days, urgent_days, email_enabled, whatsapp_enabled) VALUES
    ('inspection_due', 30, 7, 1, 1),
    ('reserve_repack', 30, 14, 1, 1),
    ('insurance_expiry', 60, 14, 1, 1),
    ('max_flights', 50, 20, 1, 1),
    ('loan_overdue', 3, 1, 1, 1),
    ('medical_expiry', 60, 14, 1, 0);

    INSERT INTO flight_routes (name, description, location, difficulty, distance_km, altitude_gain, max_altitude, conditions, best_season, rating, total_reviews) VALUES
    ('הגלבוע הצפוני', 'מסלול קלאסי לאורך רכס הגלבוע', 'הגלבוע', 'intermediate', 18.5, 650, 1050, 'רוח צפונית-מערבית 15-25 קמ"ש', 'אביב-סתיו', 4.5, 12),
    ('כרמל מרכזי', 'מסלול ציורי בין עצי הכרמל', 'הכרמל', 'beginner', 8.2, 320, 545, 'רוח ים עדינה', 'קיץ-סתיו', 4.2, 8),
    ('חרמון עליון', 'מסלול אתגרי בגבהים', 'חרמון', 'expert', 25.0, 1400, 2200, 'תנאים משתנים, רק למנוסים', 'קיץ', 4.8, 5),
    ('ים המלח דרום', 'מסלול ייחודי מעל ים המלח', 'ים המלח', 'intermediate', 15.0, 400, 200, 'תרמיקה חזקה בצהריים', 'חורף-אביב', 4.3, 7);

    INSERT INTO experience_flights (customer_name, customer_phone, flight_date, pilot, location, duration_minutes, price, status, payment_status, waiver_signed) VALUES
    ('טל שמיר', '050-1122334', '2026-04-15', 'יובל הר-לב', 'הגלבוע', 20, 350, 'completed', 'paid', 1),
    ('ורד נוימן', '052-2233445', '2026-04-20', 'רמי דקל', 'כרמל', 15, 300, 'completed', 'paid', 1),
    ('אייל גרוס', '054-3344556', '2026-06-10', 'יובל הר-לב', 'הגלבוע', 20, 350, 'confirmed', 'unpaid', 0),
    ('שיר בלום', '053-4455667', '2026-06-20', 'ליאת שמש', 'כרמל', 15, 300, 'pending', 'unpaid', 0);

    INSERT INTO events (name, description, event_date, location, max_participants, price, status, type) VALUES
    ('טורניר פאן-ישראלי 2026', 'תחרות ידידותית לכל רמות הטייסים', '2026-08-15', 'הגלבוע', 50, 150, 'upcoming', 'competition'),
    ('ימי כיף משפחתיים', 'יום פעילות לבני משפחה של חברי מועדון', '2026-07-04', 'כרמל', 30, 80, 'upcoming', 'social'),
    ('הרצאת בטיחות', 'הרצאה על בטיחות בטיסה עם מומחה', '2026-06-30', 'מועדון', 25, 0, 'upcoming', 'education');

    INSERT INTO community_posts (author_name, title, content, type, pinned) VALUES
    ('יובל הר-לב', 'ברוכים הבאים לאתר המועדון החדש!', 'שמחים להשיק את מערכת הניהול החדשה שלנו. כאן תוכלו לעקוב אחר ההתקדמות שלכם, לקבל עדכונים ולהתחבר עם חברים.', 'announcement', 1),
    ('אבי מזרחי', 'טיסה מדהימה על הגלבוע אמש!', 'אמש היו תנאים מושלמים על הגלבוע - רוח יציבה 18 קמ"ש ותרמיקה נחמדה. עפתי 2.5 שעות בלי לרדת! מי היה שם?', 'post', 0),
    ('יוסי כהן', 'שאלה על ציוד', 'מישהו מנסה את ה-Rush 6 MS החדש? רוצה לשמוע דעות לפני שאני מחליט לקנות.', 'question', 0),
    ('מועדון הרחיפה', 'הודעה חשובה - בדיקת ציוד שנתית', 'מזכירים לכל החברים - הגיע הזמן לבדיקה השנתית של הציוד. צרו קשר עם המדריכים לקביעת תור.', 'announcement', 0);

    INSERT INTO announcements (title, content, priority, author, expires_at) VALUES
    ('עונת הקיץ נפתחת!', 'עונת הטיסות הקיצית מתחילה ב-1 ליוני. הצטרפו אלינו לאימונים הראשונים!', 'high', 'ועד המועדון', '2026-07-31'),
    ('קורס P1 חדש - הרשמה פתוחה', 'פותחים קורס P1 חדש בחודש יולי. מקומות מוגבלים - הירשמו עוד היום!', 'normal', 'יובל הר-לב', '2026-06-30'),
    ('תחזוקה תקופתית - מגרש המועדון', 'ביום שישי הקרוב יתקיים ניקיון ותחזוקה של מגרש המועדון. מוזמנים להצטרף ולעזור!', 'low', 'ועד המועדון', '2026-05-20');

    INSERT INTO lesson_modules (title, description, content, order_num, duration_minutes, level, course_id) VALUES
    ('מבוא לטיסת מצנח רחיפה', 'היסטוריה, עקרונות בסיסיים וציוד', 'תוכן השיעור: מבוא לספורט, סוגי כנפיים, ציוד בסיסי, בטיחות ראשונית...', 1, 45, 'beginner', 1),
    ('מטאורולוגיה בסיסית', 'הבנת מזג האוויר לטייסים', 'תוכן: יסודות מטאורולוגיה, קריאת תחזיות, רוחות תרמיקה ומסלול...', 2, 60, 'beginner', 1),
    ('ציוד ובטיחות', 'הכרת הציוד ונהלי בטיחות', 'תוכן: פרטי הציוד, בדיקות לפני טיסה, נהלי חירום...', 3, 45, 'beginner', 1),
    ('טכניקות המראה', 'שיטות המראה בתנאים שונים', 'תוכן: המראה קדמית, אחורית, בתנאי רוח שונים...', 4, 60, 'beginner', 1),
    ('ניווט בסיסי', 'קריאת מפות ותכנון מסלול', 'תוכן: קריאת מפות טופוגרפיות, תכנון מסלול, ניווט בשטח...', 5, 45, 'intermediate', 2);

    INSERT INTO lesson_quizzes (module_id, question, options, correct_answer, explanation, order_num) VALUES
    (1, 'מה ההבדל בין כנף בגדל S לגדל L?', '["שטח פנים שונה","צבע שונה","מחיר שונה","מותג שונה"]', 0, 'גדל הכנף קובע את שטח הפנים שלה, המשפיע על העומס הסגולי ומהירות הטיסה', 1),
    (1, 'מה הציוד הבסיסי הנדרש לטיסה?', '["כנף, רתמה, מצנח חירום","כנף בלבד","כנף ורתמה","כנף, רתמה, מצנח חירום, מכשיר GPS"]', 2, 'הציוד המינימלי כולל כנף, רתמה ומצנח חירום', 2),
    (2, 'מה זה תרמיקה?', '["עמוד אוויר עולה חם","רוח אנכית יורדת","עמוד אוויר קר","לחץ אוויר גבוה"]', 0, 'תרמיקה היא עמוד אוויר חם שעולה מהאדמה בשל חימום סולרי', 1),
    (3, 'כמה פעמים יש לבדוק את הציוד לפני טיסה?', '["פעם אחת","פעמיים","שלוש פעמים","כל עת שנדרש"]', 0, 'בדיקה מלאה אחת לפני כל טיסה היא המינימום הנדרש', 1);

    -- Finance tables seed data
    INSERT INTO payments (payment_date, amount, payment_type, payment_method, payer_name, payer_type, description, status, receipt_number) VALUES
    ('2026-01-10', 4500, 'course', 'transfer', 'אדם ישראלי', 'student', 'קורס P2 - כנפיים', 'paid', 'REC-001'),
    ('2026-01-15', 2800, 'course', 'cash', 'רינה כהן', 'student', 'קורס P1', 'paid', 'REC-002'),
    ('2026-02-01', 800, 'membership', 'transfer', 'יוסי כהן', 'member', 'דמי חבר 2026', 'paid', 'REC-003'),
    ('2026-02-05', 800, 'membership', 'credit', 'מיכל לוי', 'member', 'דמי חבר 2026', 'paid', 'REC-004'),
    ('2026-02-10', 800, 'membership', 'transfer', 'אבי מזרחי', 'member', 'דמי חבר 2026', 'paid', 'REC-005'),
    ('2026-02-15', 350, 'flight', 'cash', 'טל שמיר', 'customer', 'טיסת חוויה - הגלבוע', 'paid', 'REC-006'),
    ('2026-02-20', 300, 'flight', 'credit', 'ורד נוימן', 'customer', 'טיסת חוויה - כרמל', 'paid', 'REC-007'),
    ('2026-03-01', 800, 'membership', 'app', 'דן ברגר', 'member', 'דמי חבר 2026', 'paid', 'REC-008'),
    ('2026-03-10', 3500, 'course', 'transfer', 'גיל פרץ', 'student', 'קורס SIV', 'paid', 'REC-009'),
    ('2026-03-15', 800, 'membership', 'cash', 'נועה שפירא', 'member', 'דמי חבר 2026', 'paid', 'REC-010'),
    ('2026-04-01', 150, 'event', 'credit', 'רון כץ', 'member', 'טורניר פאן-ישראלי', 'paid', 'REC-011'),
    ('2026-04-05', 150, 'event', 'cash', 'תמר בן-דוד', 'member', 'טורניר פאן-ישראלי', 'paid', 'REC-012'),
    ('2026-04-10', 2800, 'course', 'transfer', 'עמי גולן', 'student', 'קורס P1', 'paid', 'REC-013'),
    ('2026-05-01', 800, 'membership', 'transfer', 'רון כץ', 'member', 'דמי חבר 2026', 'paid', 'REC-014'),
    ('2026-05-05', 350, 'flight', 'cash', 'אייל גרוס', 'customer', 'טיסת חוויה - הגלבוע', 'pending', 'REC-015');

    INSERT INTO expenses (expense_date, amount, category, description, payment_method, status, invoice_number) VALUES
    ('2026-01-05', 450, 'maintenance', 'בדיקה שנתית כנף קלאב 1', 'transfer', 'paid', 'INV-2026-001'),
    ('2026-01-20', 420, 'maintenance', 'בדיקה שנתית כנף קלאב 2', 'transfer', 'paid', 'INV-2026-002'),
    ('2026-02-01', 2400, 'insurance', 'ביטוח ציוד שנתי 2026', 'transfer', 'paid', 'INV-2026-003'),
    ('2026-02-15', 1500, 'site_rental', 'שכירת אתר הגלבוע - חצי שנה', 'check', 'paid', 'INV-2026-004'),
    ('2026-03-01', 280, 'maintenance', 'תיקון רתמה - החלפת חגורת כתף', 'cash', 'paid', NULL),
    ('2026-03-10', 890, 'equipment', 'ציוד כביסה וניקוי כנפיים', 'credit', 'paid', 'INV-2026-005'),
    ('2026-04-01', 180, 'maintenance', 'אריזה מחדש מצנח חירום', 'cash', 'paid', NULL),
    ('2026-04-15', 600, 'admin', 'עלויות אתר + שיווק דיגיטלי', 'transfer', 'paid', 'INV-2026-006'),
    ('2026-05-01', 1200, 'site_rental', 'שכירת אתר כרמל - חצי שנה', 'check', 'pending', 'INV-2026-007'),
    ('2026-05-05', 350, 'fuel', 'דלק לנסיעות שטח - אפריל', 'cash', 'paid', NULL);

    INSERT INTO social_campaigns (name, objective, platform, budget, spent, start_date, end_date, status, leads_generated, conversions, impressions, clicks) VALUES
    ('קמפיין פתיחת עונה 2026', 'leads', 'facebook', 3000, 1400, '2026-04-01', '2026-05-31', 'active', 18, 5, 8400, 320),
    ('קורס P1 - יולי 2026', 'conversions', 'instagram', 1500, 600, '2026-05-15', '2026-06-30', 'active', 12, 3, 4200, 180),
    ('ימי פתוח', 'awareness', 'facebook', 800, 800, '2026-03-01', '2026-03-31', 'completed', 35, 8, 12000, 560);

    INSERT INTO social_posts (title, content_facebook, content_instagram, content_whatsapp, post_type, platforms, status, published_at, likes, comments, shares, reach) VALUES
    ('פתיחת עונת הקיץ!', 'חברים יקרים, עונת הקיץ כבר כאן! הגלבוע קורא לנו עם תנאי טיסה מושלמים. הצטרפו אלינו לאימונים הראשונים של העונה ותחוו טיסה בגבהים עם נוף עוצר נשימה!', 'עונת הקיץ כאן! 🪂☀️ הגלבוע קורא לנו', 'חברים, עונת הקיץ נפתחת! מי מגיע לאימון ראשון?', 'event', 'facebook,instagram,whatsapp', 'published', '2026-05-01', 47, 12, 8, 1240),
    ('קורס P1 חדש - נרשמים!', 'פותחים קורס P1 חדש ביולי! המקומות מוגבלים - 6 תלמידים בלבד. הקורס כולל 40 שעות הדרכה, ציוד מלא ולוויה אישית של המדריכים הטובים שלנו.', 'קורס P1 חדש! 🎓 6 מקומות בלבד. הצטרפו עכשיו!', 'קורס P1 ביולי - עדיין יש מקומות! דברו איתנו 📱', 'promo', 'facebook,instagram', 'published', '2026-05-03', 23, 6, 4, 890),
    ('יום טיסה מושלם', 'אמש היו תנאי טיסה מדהימים על הגלבוע! רוח יציבה מהצפון 18 קמ"ש ותרמיקה נהדרת. חברי המועדון עפו עד 3 שעות ברציפות. מחפשים אנשים לשתף את הקסם הזה!', 'יום טיסה מושלם! 🌤️ הגלבוע בשיא יופיו', 'אמש הגלבוע היה ממש מדהים - מי היה שם?! 🪂', 'general', 'facebook,instagram,whatsapp', 'draft', NULL, 0, 0, 0, 0);

    INSERT INTO communication_templates (name, type, channel, subject, content) VALUES
    ('יום הולדת שמח', 'birthday', 'whatsapp', NULL, 'שלום {name}! 🎂 כל המועדון מאחל לך יום הולדת שמח! מגיע לך עוף חינם - פנו אלינו לקביעת תאריך. יאללה לעוף! 🪂'),
    ('תזכורת חידוש חברות', 'reminder', 'whatsapp', NULL, 'שלום {name}, החברות שלך במועדון פגה בקרוב. חדש עכשיו וקבל {discount}% הנחה על הקורס הבא!'),
    ('הזמנה לאירוע', 'event', 'whatsapp', NULL, 'שלום {name}! 🎉 אנחנו שמחים להזמין אותך ל{event_name} שיתקיים ב{event_date}. הכניסה: {price}. מוזמן להירשם!'),
    ('ברוך הבא למועדון', 'welcome', 'whatsapp', NULL, 'ברוך הבא {name}! 🪂 שמחים שהצטרפת למשפחת מועדון מצנחי רחיפה. המדריך {instructor} יצור איתך קשר בקרוב לתיאום האימון הראשון.'),
    ('הזדמנות שדרוג קורס', 'upsell', 'whatsapp', NULL, 'שלום {name}! 🌟 כל הכבוד על סיום קורס {course}! הגיע הזמן לשלב הבא - קורס {next_course} מתחיל בקרוב. רוצה לשמוע עוד?');

    INSERT INTO member_dues (year, member_type, member_id, member_name, member_phone, amount_due, amount_paid, due_date, status) VALUES
    (2026, 'member', 1, 'יוסי כהן', '050-1234567', 800, 800, '2026-01-31', 'paid'),
    (2026, 'member', 2, 'מיכל לוי', '052-2345678', 800, 800, '2026-01-31', 'paid'),
    (2026, 'member', 3, 'אבי מזרחי', '054-3456789', 800, 800, '2026-01-31', 'paid'),
    (2026, 'member', 4, 'שרה דוד', '053-4567890', 800, 0, '2026-01-31', 'pending'),
    (2026, 'member', 5, 'דן ברגר', '058-5678901', 800, 800, '2026-01-31', 'paid'),
    (2026, 'member', 6, 'נועה שפירא', '050-6789012', 800, 800, '2026-01-31', 'paid'),
    (2026, 'member', 7, 'רון כץ', '052-7890123', 800, 800, '2026-01-31', 'paid'),
    (2026, 'member', 8, 'תמר בן-דוד', '054-8901234', 800, 0, '2026-01-31', 'pending'),
    (2026, 'student', 1, 'אדם ישראלי', '050-1111111', 400, 400, '2026-01-31', 'paid'),
    (2026, 'student', 2, 'רינה כהן', '052-2222222', 400, 200, '2026-01-31', 'partial'),
    (2026, 'student', 3, 'גיל פרץ', '054-3333333', 400, 400, '2026-01-31', 'paid'),
    (2026, 'student', 4, 'מאיה ברק', '053-4444444', 400, 0, '2026-01-31', 'pending'),
    (2026, 'student', 5, 'עמי גולן', '058-5555555', 400, 0, '2026-01-31', 'pending');
  `);
}

export default db;
