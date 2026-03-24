import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { initWebSocketServer } from './services/websocketService';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import devicesRoutes from './routes/devices';
import insightsRoutes from './routes/insights';
import userRoutes from './routes/user';
import ingestRoutes from './routes/ingest';
import protonestRoutes from './routes/protonest';
import thresholdsRoutes from './routes/thresholds';
import { startSyncService } from './services/protonestSync';
import { broadcastSensorReading } from './services/websocketService';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet()); // Security headers

// Build CORS origin configuration
// If the list contains '*', allow ALL origins (useful in development)
// Otherwise, restrict to the listed origins
const corsOriginList = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || [];
// Build CORS origin configuration.
// When the list contains '*', set origin=true so express-cors echoes back the
// requesting origin (effectively allows any origin while still supporting credentials).
// This is intentional for development; in production use an explicit origin list.
const corsOriginConfig = corsOriginList.includes('*')
  ? true                  // reflect requesting origin (allows any origin with credentials)
  : corsOriginList.length > 0
    ? corsOriginList
    : '*';

app.use(cors({
  origin: corsOriginConfig,
  credentials: true
}));
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Desk Assistant API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/protonest', protonestRoutes);
app.use('/api/thresholds', thresholdsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('⚠️  Warning: Could not connect to database. Server will start but may not function properly.');
    }

    // Create HTTP server and attach WebSocket
    const server = createServer(app);
    initWebSocketServer(server);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`⚡ WebSocket: ws://localhost:${PORT}/ws`);

      // Start Protonest sync service (polls every 5 seconds)
      // WebSocket handles real-time; polling catches anything missed and broadcasts to app clients
      startSyncService(5000, broadcastSensorReading);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
