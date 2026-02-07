import app from '../src/index.js';

// Vercel serverless entrypoint
// NOTE: WebSocket does not work on Vercel serverless functions.
// For WebSocket support, deploy to Railway, Fly.io, or similar platforms.
// All HTTP REST endpoints work fine on Vercel.

export default app;
