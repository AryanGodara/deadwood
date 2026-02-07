import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

import routes from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

// CORS - allow all origins (agents come from anywhere)
app.use(cors());

// Helmet with relaxed settings
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// JSON body parser (1mb limit)
app.use(express.json({ limit: '1mb' }));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Mount routes
app.use(routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Global error handler
app.use(errorHandler);

export default app;
