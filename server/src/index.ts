import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './db/schema.js';
import authRoutes from './routes/auth.js';
import sopsRoutes from './routes/sops.js';
import questionnairesRoutes from './routes/questionnaires.js';
import shadowingRoutes from './routes/shadowing.js';
import usersRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sops', sopsRoutes);
app.use('/api/questionnaires', questionnairesRoutes);
app.use('/api/shadowing', shadowingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
