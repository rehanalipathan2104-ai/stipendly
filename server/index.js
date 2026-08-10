import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './auth.js';
import routes from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.use(authMiddleware);
app.use('/api', routes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

app.listen(PORT, () => {
  console.log(`\n  Stipendly API server running at http://localhost:${PORT}`);
  console.log(`  Frontend should connect to http://localhost:${PORT}/api\n`);
});
