import { createServer } from 'http';
import app from './index.js';
import { startTickLoop } from './engine/tick.js';
import { wsManager } from './ws/manager.js';

const PORT = process.env.PORT || 4000;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
// NOTE: WebSocket does NOT work on Vercel serverless.
// For production with WebSocket support, deploy to Railway, Fly.io, or similar.
// HTTP REST endpoints work fine on Vercel.
wsManager.initialize(server);

// Start the tick loop - the heartbeat of Deadwood
startTickLoop();

// Start listening
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   ██████╗ ███████╗ █████╗ ██████╗ ██╗    ██╗ ██████╗  ██████╗  ██████╗  ║
  ║   ██╔══██╗██╔════╝██╔══██╗██╔══██╗██║    ██║██╔═══██╗██╔═══██╗██╔══██╗ ║
  ║   ██║  ██║█████╗  ███████║██║  ██║██║ █╗ ██║██║   ██║██║   ██║██║  ██║ ║
  ║   ██║  ██║██╔══╝  ██╔══██║██║  ██║██║███╗██║██║   ██║██║   ██║██║  ██║ ║
  ║   ██████╔╝███████╗██║  ██║██████╔╝╚███╔███╔╝╚██████╔╝╚██████╔╝██████╔╝ ║
  ║   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝  ╚══╝╚══╝  ╚═════╝  ╚═════╝ ╚═════╝  ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝

  Deadwood is alive.

  HTTP Server:  http://localhost:${PORT}
  WebSocket:    ws://localhost:${PORT}/ws/spectator
                ws://localhost:${PORT}/ws/agent?token=YOUR_API_KEY

  Tick loop running. The world advances every 5 seconds.

  Try:
    curl http://localhost:${PORT}/api/health
    curl http://localhost:${PORT}/skills.md
  `);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
