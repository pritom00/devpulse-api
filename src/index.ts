import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initializeDatabase } from './config/init';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function bootstrap(): Promise<void> {
  try {
    // Initialize DB tables before accepting connections
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 DevPulse API running on port ${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV ?? 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
