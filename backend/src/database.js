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
    purchase_date TEXT,
    purchase_price REAL,
    owner_type TEXT DEFAULT 'club',
    owner_id INTEGER,
    owner_name TEXT,
    status TEXT DEFAULT 'active',
    condition TEXT DEFAULT 'good',
    total_flights INTEGER DEFAULT 0,
    total_hours REAL DEFAULT 0,
    last_inspection TEXT,
    next_inspection TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipment_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    assigned_to INTEGER REFERENCES students(id),
    assigned_name TEXT,
    assigned_date TEXT DEFAULT (date('now')),
    returned_date TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS equipment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    event_type TEXT NOT NULL,
    description TEXT,
    date TEXT DEFAULT (date('now')),
    performed_by TEXT,
    cost REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

    INSERT INTO students (name, phone, email, current_level, instructor, status, medical_clearance) VALUES
    ('אדם ישראלי', '050-1111111', 'adam@example.com', 'P1', 'יובל הר-לב', 'active', 1),
    ('רינה כהן', '052-2222222', 'rina@example.com', 'P2', 'ליאת שמש', 'active', 1),
    ('גיל פרץ', '054-3333333', 'gil@example.com', 'P1', 'יובל הר-לב', 'active', 1),
    ('מאיה ברק', '053-4444444', 'maya@example.com', 'P2', 'ליאת שמש', 'active', 1),
    ('עמי גולן', '058-5555555', 'ami@example.com', 'beginner', 'רמי דקל', 'active', 0);

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

    INSERT INTO equipment (name, type, brand, model, serial_number, purchase_date, purchase_price, owner_type, condition, total_flights, total_hours) VALUES
    ('כנף קלאב 1', 'wing', 'Ozone', 'Rush 6', 'OZ-R6-001', '2022-03-15', 8500, 'club', 'good', 234, 312),
    ('כנף קלאב 2', 'wing', 'Advance', 'ALPHA 7', 'ADV-A7-002', '2021-08-20', 9200, 'club', 'good', 189, 251),
    ('רתמה 1', 'harness', 'Sup Air', 'Altirando 4', 'SA-ALT4-001', '2022-01-10', 2800, 'club', 'excellent', 234, 312),
    ('רתמה 2', 'harness', 'Advance', 'Lightness 3', 'ADV-L3-002', '2023-05-01', 3200, 'club', 'excellent', 189, 251),
    ('מצנח חירום 1', 'reserve', 'Gin', 'Yeti 3', 'GIN-Y3-001', '2022-03-15', 1800, 'club', 'good', 0, 312),
    ('רדיו 1', 'radio', 'Motorola', 'T82', 'MOT-T82-001', '2023-01-01', 350, 'club', 'good', 0, 0);

    INSERT INTO equipment (name, type, brand, model, serial_number, purchase_date, purchase_price, owner_type, owner_name, condition, total_flights, total_hours) VALUES
    ('כנף תלמיד - אדם', 'wing', 'Nova', 'Mentor 7', 'NOV-M7-003', '2023-09-01', 7800, 'student', 'אדם ישראלי', 'good', 23, 31),
    ('כנף חבר - יוסי', 'wing', 'Ozone', 'Rush 6 MS', 'OZ-R6S-004', '2021-12-01', 8800, 'member', 'יוסי כהן', 'good', 145, 193);

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
    ('עונת הקיץ נפתחת!', 'עונת הטיסות הקיצית מתחילה ב-1 ליוני. הצטרפו אלינו לאימונים הראשונים!', 'high', 'ועד המועדון', '2025-07-31'),
    ('קורס P1 חדש - הרשמה פתוחה', 'פותחים קורס P1 חדש בחודש יולי. מקומות מוגבלים - הירשמו עוד היום!', 'normal', 'יובל הר-לב', '2025-06-30'),
    ('תחזוקה תקופתית - מגרש המועדון', 'ביום שישי הקרוב יתקיים ניקיון ותחזוקה של מגרש המועדון. מוזמנים להצטרף ולעזור!', 'low', 'ועד המועדון', '2025-06-20');

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

    INSERT INTO maintenance_records (equipment_id, type, description, performed_date, next_due, cost, technician, status) VALUES
    (1, 'inspection', 'בדיקה שנתית מלאה של הכנף', '2024-11-15', '2025-11-15', 450, 'ריגינג ישראל', 'completed'),
    (2, 'inspection', 'בדיקה שנתית מלאה של הכנף', '2024-09-20', '2025-09-20', 420, 'ריגינג ישראל', 'completed'),
    (3, 'inspection', 'בדיקה שנתית של הרתמה', '2024-12-01', '2025-12-01', 200, 'יובל הר-לב', 'completed'),
    (5, 'repack', 'אריזה מחדש של מצנח חירום', '2024-10-05', '2025-10-05', 180, 'ריגינג ישראל', 'completed');
  `);
}

export default db;
