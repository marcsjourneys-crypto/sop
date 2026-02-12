import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/schema.js';
import authRoutes from './routes/auth.js';
import sopsRoutes from './routes/sops.js';
import questionnairesRoutes from './routes/questionnaires.js';
import shadowingRoutes from './routes/shadowing.js';
import usersRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import approvalsRoutes from './routes/approvals.js';
import workflowRoutes from './routes/workflow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sops', sopsRoutes);
app.use('/api/questionnaires', questionnairesRoutes);
app.use('/api/shadowing', shadowingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/workflow', workflowRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static frontend files
const frontendPath = path.join(__dirname, '..', '..', 'SOP', 'dist');
app.use(express.static(frontendPath));

// All other routes serve the frontend (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
