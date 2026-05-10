import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './database.js';

console.log('🌱 Seeding database...');

// Create demo club
const clubStmt = db.prepare(`
  INSERT OR IGNORE INTO clubs (name, slug, email, phone, address, timezone, currency)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

clubStmt.run(
  'SkyFly Paragliding Club',
  'skyfly',
  'info@skyfly.com',
  '+972-52-1234567',
  'Mount Gilboa, Israel',
  'Asia/Jerusalem',
  'ILS'
);

const club = db.prepare('SELECT id FROM clubs WHERE slug = ?').get('skyfly');

// Create admin user
const adminPass = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT OR IGNORE INTO users (club_id, email, password_hash, name, role, phone)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(club.id, 'admin@skyfly.com', adminPass, 'Admin User', 'admin', '+972-52-1111111');

// Create instructor
const instrPass = bcrypt.hashSync('instr123', 10);
db.prepare(`
  INSERT OR IGNORE INTO users (club_id, email, password_hash, name, role, phone, license_number)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(club.id, 'instructor@skyfly.com', instrPass, 'Yael Cohen', 'instructor', '+972-52-2222222', 'PG-IL-2018-0042');

// Create member
const memberPass = bcrypt.hashSync('member123', 10);
db.prepare(`
  INSERT OR IGNORE INTO users (club_id, email, password_hash, name, role, phone)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(club.id, 'member@skyfly.com', memberPass, 'Avi Levi', 'member', '+972-52-3333333');

const [admin, instructor, member] = [
  db.prepare('SELECT id FROM users WHERE email = ?').get('admin@skyfly.com'),
  db.prepare('SELECT id FROM users WHERE email = ?').get('instructor@skyfly.com'),
  db.prepare('SELECT id FROM users WHERE email = ?').get('member@skyfly.com'),
];

// Equipment
const eqData = [
  ['Advance Alpha 7', 'wing', 'Advance', 'Alpha 7', 'ADV-A7-2021-001', '2021-03-15', 8500, 'active', 245.5],
  ['Gin Boomerang 12', 'wing', 'Gin', 'Boomerang 12', 'GIN-B12-2022-003', '2022-06-10', 12000, 'active', 180.0],
  ['Nova Mentor 7', 'wing', 'Nova', 'Mentor 7', 'NOV-M7-2020-007', '2020-09-01', 9200, 'maintenance', 420.0],
  ['Kortel Karver', 'harness', 'Kortel', 'Karver', 'KRT-KV-2021-012', '2021-01-20', 2800, 'active', 245.5],
  ['Woody Valley X-Rated 8', 'harness', 'Woody Valley', 'X-Rated 8', 'WV-XR8-2022-004', '2022-03-05', 3200, 'active', 180.0],
  ['Charly X-Over', 'reserve', 'Charly', 'X-Over', 'CHA-XO-2021-008', '2021-07-12', 1500, 'active', 0],
  ['POC Trabec Race', 'helmet', 'POC', 'Trabec Race', 'POC-TR-2022-015', '2022-02-28', 350, 'active', 0],
  ['Flytec 6030', 'instrument', 'Flytec', '6030', 'FLY-6030-2020-002', '2020-05-15', 1200, 'active', 0],
];

const eqStmt = db.prepare(`
  INSERT OR IGNORE INTO equipment (club_id, name, type, brand, model, serial_number, purchase_date, purchase_price, status, flight_hours)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const eq of eqData) {
  eqStmt.run(club.id, ...eq);
}

// Finance categories
const catData = [
  [club.id, 'Membership Fees', 'income', '#10B981'],
  [club.id, 'Course Fees', 'income', '#0EA5E9'],
  [club.id, 'Experience Flights', 'income', '#8B5CF6'],
  [club.id, 'Equipment Sales', 'income', '#F59E0B'],
  [club.id, 'Donations', 'income', '#EC4899'],
  [club.id, 'Equipment Maintenance', 'expense', '#EF4444'],
  [club.id, 'Insurance', 'expense', '#F97316'],
  [club.id, 'Site Fees', 'expense', '#6366F1'],
  [club.id, 'Training & Certification', 'expense', '#14B8A6'],
  [club.id, 'Marketing', 'expense', '#84CC16'],
];

const catStmt = db.prepare(`
  INSERT OR IGNORE INTO finance_categories (club_id, name, type, color) VALUES (?, ?, ?, ?)
`);
for (const cat of catData) catStmt.run(...cat);

const categories = db.prepare('SELECT * FROM finance_categories WHERE club_id = ?').all(club.id);
const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]));

// Transactions
const txData = [
  [club.id, catMap['Membership Fees'], member.id, 1200, 'income', 'Annual membership - Avi Levi', '2024-01-05', 'bank_transfer'],
  [club.id, catMap['Course Fees'], null, 2500, 'income', 'Beginner course batch - 5 students', '2024-01-12', 'credit_card'],
  [club.id, catMap['Experience Flights'], null, 850, 'income', 'Weekend experience flights x4', '2024-01-20', 'cash'],
  [club.id, catMap['Equipment Maintenance'], null, 450, 'expense', 'Wing inspection & repair - Alpha 7', '2024-01-25', 'bank_transfer'],
  [club.id, catMap['Insurance'], null, 3200, 'expense', 'Annual club insurance premium', '2024-02-01', 'bank_transfer'],
  [club.id, catMap['Membership Fees'], null, 1200, 'income', 'Annual membership - New member', '2024-02-08', 'bank_transfer'],
  [club.id, catMap['Course Fees'], null, 1800, 'income', 'Advanced course - 3 students', '2024-02-15', 'credit_card'],
  [club.id, catMap['Site Fees'], null, 600, 'expense', 'Monthly site rental - Gilboa', '2024-02-28', 'bank_transfer'],
  [club.id, catMap['Marketing'], null, 800, 'expense', 'Social media ads - February', '2024-02-29', 'credit_card'],
  [club.id, catMap['Experience Flights'], null, 1200, 'income', 'Tandem flights x6 - weekend', '2024-03-03', 'cash'],
];

const txStmt = db.prepare(`
  INSERT OR IGNORE INTO transactions (club_id, category_id, user_id, amount, type, description, date, payment_method)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const tx of txData) txStmt.run(...tx);

// Courses
db.prepare(`
  INSERT OR IGNORE INTO courses (club_id, instructor_id, name, description, level, duration_days, price, max_students, status, start_date, end_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(club.id, instructor.id, 'Paragliding Beginner Course', 'Complete beginner course from ground handling to first solo flights', 'beginner', 10, 2500, 8, 'active', '2024-03-01', '2024-03-15');

db.prepare(`
  INSERT OR IGNORE INTO courses (club_id, instructor_id, name, description, level, duration_days, price, max_students, status, start_date, end_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(club.id, instructor.id, 'Advanced SIV Course', 'SIV (Simulation of Incidents in Flight) over water - safety training', 'advanced', 4, 1800, 6, 'draft', '2024-04-10', '2024-04-14');

db.prepare(`
  INSERT OR IGNORE INTO courses (club_id, instructor_id, name, description, level, duration_days, price, max_students, status, start_date, end_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(club.id, instructor.id, 'Tandem Pilot Certification', 'Get certified as a tandem instructor', 'advanced', 5, 3500, 4, 'completed', '2024-01-15', '2024-01-20');

// Students
const studData = [
  [club.id, null, 'David Shapiro', 'david@email.com', '+972-52-4444444', '1992-05-14', 'Sarah: +972-52-9876543', null, 'P1', 12, 8.5],
  [club.id, null, 'Michal Katz', 'michal@email.com', '+972-52-5555555', '1988-11-22', 'Oren: +972-52-8765432', null, 'P2', 45, 38.0],
  [club.id, null, 'Rotem Ben-David', 'rotem@email.com', '+972-52-6666666', '1995-07-08', 'Tamar: +972-52-7654321', null, null, 0, 0],
  [club.id, member.id, 'Avi Levi', 'member@skyfly.com', '+972-52-3333333', '1985-03-30', 'Nurit: +972-52-6543210', null, 'P3', 120, 145.5],
];

const studStmt = db.prepare(`
  INSERT OR IGNORE INTO students (club_id, user_id, name, email, phone, date_of_birth, emergency_contact, medical_info, license_level, total_flights, total_hours)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const s of studData) studStmt.run(...s);

// Experience flights
const course1 = db.prepare('SELECT id FROM courses WHERE club_id = ? LIMIT 1').get(club.id);
const flightData = [
  [club.id, instructor.id, 'Rachel Green', 'rachel@email.com', '+972-52-7777777', '2024-03-10', 25, 'Mount Gilboa', 'Gilboa Valley', 'completed', 350, 'paid'],
  [club.id, instructor.id, 'Tom White', 'tom@email.com', '+972-52-8888888', '2024-03-10', 30, 'Mount Gilboa', 'Gilboa Valley', 'completed', 350, 'paid'],
  [club.id, instructor.id, 'Sara Blue', 'sara@email.com', '+972-52-9999999', '2024-03-17', 20, 'Mount Gilboa', 'Gilboa Valley', 'completed', 350, 'paid'],
  [club.id, instructor.id, 'Dan Gold', null, null, '2024-03-24', null, 'Mount Gilboa', null, 'scheduled', 350, 'pending'],
];

const flightStmt = db.prepare(`
  INSERT OR IGNORE INTO experience_flights (club_id, pilot_id, passenger_name, passenger_email, passenger_phone, flight_date, duration_minutes, takeoff_location, landing_location, status, price, payment_status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const f of flightData) flightStmt.run(...f);

// Social posts
const postData = [
  [club.id, 'instagram', '🪂 Amazing day at Mount Gilboa! Perfect thermals, crystal clear skies, and happy pilots soaring high. Come join us this weekend for an unforgettable experience flight! DM for bookings 🌅\n\n#Paragliding #SkyFly #MountGilboa #Israel #FlyHigh #Adventure', 'published', null, '2024-03-10 15:30:00', '[]', 1, instructor.id],
  [club.id, 'facebook', 'Weekend Course Registration Now Open! 🎓\n\nOur popular Beginner Paragliding Course starts March 30th. 10 days of comprehensive training with certified instructors.\n\n✅ Theory & weather education\n✅ Ground handling mastery\n✅ Solo flight certification\n\nSpots are limited - register now at skyfly.com\n\n#ParaglidingCourse #LearnToFly #Beginner', 'published', null, '2024-03-08 10:00:00', '[]', 1, instructor.id],
  [club.id, 'instagram', '🏆 Congratulations to our latest tandem certified pilot - Yael Cohen!\n\nAfter 5 intense days of training and 15 successful tandem flights, Yael is now certified to take passengers on unforgettable paragliding experiences.\n\nWelcome to the team! ✈️', 'scheduled', '2024-03-25 12:00:00', null, '[]', 0, admin.id],
];

const postStmt = db.prepare(`
  INSERT OR IGNORE INTO social_posts (club_id, platform, content, status, scheduled_at, published_at, media_urls, ai_generated, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const p of postData) postStmt.run(...p);

// Campaigns
db.prepare(`
  INSERT OR IGNORE INTO campaigns (club_id, name, type, status, target_audience, budget, start_date, end_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(club.id, 'Spring Season Launch', 'social', 'active', 'Adventure seekers 25-45', 2000, '2024-03-01', '2024-04-30');

// Safety checks
const eq1 = db.prepare('SELECT id FROM equipment WHERE club_id = ? LIMIT 1').get(club.id);
if (eq1) {
  db.prepare(`
    INSERT OR IGNORE INTO safety_checks (club_id, equipment_id, inspector_id, check_date, result, notes, next_check_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(club.id, eq1.id, instructor.id, '2024-01-15', 'pass', 'All lines checked, no damage, brake toggles replaced', '2024-07-15');
}

// Weather record
db.prepare(`
  INSERT OR IGNORE INTO weather_records (club_id, recorded_at, temperature, wind_speed, wind_direction, wind_gusts, visibility, cloud_cover, conditions, is_flyable)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(club.id, new Date().toISOString(), 22, 18, 270, 24, 30, 20, 'Partly cloudy, NW breeze, good thermals', 1);

console.log('✅ Seed complete!');
console.log('\n📋 Demo credentials:');
console.log('  Admin:      admin@skyfly.com / admin123');
console.log('  Instructor: instructor@skyfly.com / instr123');
console.log('  Member:     member@skyfly.com / member123');
