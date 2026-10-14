const app = require('./src/app');
const config = require('./src/config/env');
const { pool } = require('./src/config/database');
const { initializeDatabase } = require('./src/db/initDb');

async function startServer() {
  try {
    console.log('Connecting to PostgreSQL database and verifying tables...');
    await initializeDatabase();

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(` CRM Backend Server running in ${config.nodeEnv.toUpperCase()} mode`);
      console.log(` Port: ${config.port}`);
      console.log(` Health check: http://localhost:${config.port}/api/health`);
      console.log(` API Base URL: http://localhost:${config.port}/api`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handler
    const handleShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await pool.end();
          console.log('Database connection pool drained.');
          process.exit(0);
        } catch (err) {
          console.error('Error closing database pool:', err.message);
          process.exit(1);
        }
      });

      // Force shutdown after 10s if graceful closing hangs
      setTimeout(() => {
        console.error('Forced shutdown due to timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
