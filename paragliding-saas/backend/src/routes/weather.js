import { Router } from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/current', async (req, res) => {
  const lat = process.env.WEATHER_LAT || '32.08';
  const lon = process.env.WEATHER_LON || '34.78';
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation,visibility,weather_code&wind_speed_unit=kmh`;
    const response = await fetch(url);
    const data = await response.json();
    const c = data.current;
    const windSpeed = c.wind_speed_10m;
    const gusts = c.wind_gusts_10m;
    const cloudCover = c.cloud_cover;
    const precip = c.precipitation;
    const isFlyable = windSpeed >= 10 && windSpeed <= 35 && gusts <= 45 && cloudCover < 80 && precip === 0 ? 1 : 0;

    const record = {
      temperature: c.temperature_2m,
      wind_speed: windSpeed,
      wind_direction: c.wind_direction_10m,
      wind_gusts: gusts,
      visibility: c.visibility / 1000,
      cloud_cover: cloudCover,
      precipitation: precip,
      conditions: describeWeather(c.weather_code),
      is_flyable: isFlyable,
    };

    db.prepare(`
      INSERT INTO weather_records (club_id, recorded_at, temperature, wind_speed, wind_direction, wind_gusts, visibility, cloud_cover, precipitation, conditions, is_flyable)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.clubId, record.temperature, record.wind_speed, record.wind_direction, record.wind_gusts, record.visibility, record.cloud_cover, record.precipitation, record.conditions, record.is_flyable);

    res.json(record);
  } catch (err) {
    const latest = db.prepare('SELECT * FROM weather_records WHERE club_id=? ORDER BY recorded_at DESC LIMIT 1').get(req.clubId);
    res.json(latest || { error: 'Weather unavailable' });
  }
});

router.get('/history', (req, res) => {
  const records = db.prepare('SELECT * FROM weather_records WHERE club_id=? ORDER BY recorded_at DESC LIMIT 48').all(req.clubId);
  res.json(records);
});

function describeWeather(code) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

export default router;
