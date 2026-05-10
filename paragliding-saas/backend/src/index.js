import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import equipmentRoutes from './routes/equipment.js';
import financeRoutes from './routes/finance.js';
import studentsRoutes from './routes/students.js';
import coursesRoutes from './routes/courses.js';
import flightsRoutes from './routes/flights.js';
import marketingRoutes from './routes/marketing.js';
import socialRoutes from './routes/social.js';
import weatherRoutes from './routes/weather.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/flights', flightsRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/weather', weatherRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
