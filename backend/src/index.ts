






import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import emailRoutes from './routes/email';
import slackRoutes from './routes/slack';
import { initializeTransporters } from './services/mailer';
import { recoverInterruptedJobs, startEmailScheduler } from './workers/emailWorker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Initialize mailer connection early
initializeTransporters().catch(console.error);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Centralized error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

let workerInterval: NodeJS.Timeout | null = null;
let server: any = null;

async function startServer() {
  try {
    console.log('[Server] Starting server...');
    
    // 1. Initialize mailer connection early
    await initializeTransporters();

    // 2. Recover interrupted PROCESSING jobs absolutely first
    await recoverInterruptedJobs();

    // 3. Start the background email worker only after recovery is complete
    workerInterval = startEmailScheduler();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful Shutdown
function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (workerInterval) {
    clearInterval(workerInterval);
    console.log('🛑 Stopped email worker loop.');
  }
  
  if (server) {
    server.close(() => {
      console.log('🛑 Express server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force close after 10s if it's hanging
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
