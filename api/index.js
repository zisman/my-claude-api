import 'dotenv/config';
import express from 'express';
import cors from 'cors';

export const config = {
  runtime: 'nodejs18.x',
};

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Paragliding Club API is running!', status: 'ok' });
});

app.get('/api/test', (req, res) => {
  res.json({ test: 'success' });
});

export default (req, res) => {
  return app(req, res);
};