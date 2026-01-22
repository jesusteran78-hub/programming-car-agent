/**
 * ATLAS Gateway
 * Single entry point for all external requests
 * Publishes events to the Event Bus for agent consumption
 *
 * @module src/gateway
 */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { config } = require('../core/config');
const logger = require('../core/logger').child('Gateway');
const { publishEvent, EVENT_TYPES, registerHeartbeat } = require('../core/event-bus');

// Import routes
const whatsappRoutes = require('./routes/whatsapp');
const apiRoutes = require('./routes/api');
const videoFactoryRoutes = require('./routes/video-factory');

/**
 * Creates and configures the Express application
 * @returns {express.Application}
 */
function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(bodyParser.json());

  // Request logging (only in debug mode)
  if (config.logLevel === 'DEBUG') {
    app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  // Health check routes
  app.get('/', (req, res) => res.send('ATLAS Gateway Active'));
  app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));
  app.get('/webhook', (req, res) => res.send('Webhook Active'));

  // Mount routes
  app.use('/webhook', whatsappRoutes);
  app.use('/api', apiRoutes);
  app.use('/video-factory', videoFactoryRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  return app;
}

/**
 * Starts the Gateway server
 * @param {number} [port] - Port to listen on (defaults to config.port)
 * @returns {Promise<http.Server>}
 */
async function startGateway(port = config.port) {
  const app = createApp();

  // Register gateway heartbeat
  await registerHeartbeat('gateway', { version: '1.0.0', started: new Date().toISOString() });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`ATLAS Gateway running on port ${port}`);
      logger.info(`Webhook: http://localhost:${port}/webhook`);
      logger.info(`API: http://localhost:${port}/api`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

// Start if run directly
if (require.main === module) {
  startGateway().catch((err) => {
    logger.error('Failed to start Gateway:', err);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  startGateway,
};
