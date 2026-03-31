import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { newsHandler } from './routes/news';
import { announcementsHandler } from './routes/announcements';
import { videoHandler } from './routes/video';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local/dev convenience: load env vars from repo-root `.env` (Render ignores this and uses real env vars).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/news', newsHandler);
app.get('/api/announcements', announcementsHandler);
app.get('/api/video', videoHandler);

// Serve built frontend in production
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist, { maxAge: '1h', index: false }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Lobby TV server listening on :${port}`);
});

