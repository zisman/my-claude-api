import { Router } from 'express';
import db from '../database.js';
import { analyzeWeatherSafety } from '../services/claude.js';

const router = Router();

const SITES = {
  gilboa: { lat: 32.51, lon: 35.41, name: 'הגלבוע' },
  carmel: { lat: 32.71, lon: 35.00, name: 'הכרמל' },
  hermon: { lat: 33.41, lon: 35.85, name: 'חרמון' },
  deadsea: { lat: 31.55, lon: 35.47, name: 'ים המלח' }
};

router.get('/forecast', async (req, res) => {
  const site = req.query.site || 'gilboa';
  const location = SITES[site] || SITES.gilboa;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,windspeed_10m,winddirection_10m,windgusts_10m,precipitation,cloudcover,visibility,weathercode&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation_probability&forecast_days=3&timezone=Asia%2FJerusalem`;

    const response = await fetch(url);
    const data = await response.json();

    res.json({ location: location.name, site, ...data });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בקבלת נתוני מזג אוויר' });
  }
});

router.post('/analyze', async (req, res) => {
  const { weatherData, site } = req.body;
  const siteName = SITES[site]?.name || site || 'ישראל';

  try {
    const analysis = await analyzeWeatherSafety(weatherData);

    db.prepare(`
      INSERT INTO weather_logs (location, latitude, longitude, temperature, wind_speed, wind_direction, precipitation, cloud_cover, raw_data, ai_analysis, safety_rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      siteName,
      SITES[site]?.lat,
      SITES[site]?.lon,
      weatherData.temperature,
      weatherData.windspeed_10m,
      weatherData.winddirection_10m,
      weatherData.precipitation,
      weatherData.cloudcover,
      JSON.stringify(weatherData),
      JSON.stringify(analysis),
      analysis.safety_rating
    );

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', (req, res) => {
  const logs = db.prepare(`SELECT * FROM weather_logs ORDER BY logged_at DESC LIMIT 20`).all();
  res.json(logs);
});

router.get('/sites', (req, res) => {
  res.json(Object.entries(SITES).map(([id, s]) => ({ id, ...s })));
});

export default router;
