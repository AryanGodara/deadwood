import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import type { GameEvent, RoomId } from '@deadwood/shared';
import { getCharacterByApiKey } from '../services/character.js';

interface SpectatorClient {
  ws: WebSocket;
  rooms: Set<RoomId>;
}

interface AgentClient {
  ws: WebSocket;
  characterId: string;
  currentRoom: RoomId;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private spectators: Set<SpectatorClient> = new Set();
  private agents: Map<string, AgentClient> = new Map();

  /**
   * Initialize WebSocket server on the HTTP server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const path = url.pathname;

      if (path === '/ws/spectator') {
        this.handleSpectatorConnection(ws, url);
      } else if (path === '/ws/agent') {
        this.handleAgentConnection(ws, url);
      } else {
        ws.close(4000, 'Invalid path');
      }
    });

    console.log('WebSocket server initialized');
  }

  private handleSpectatorConnection(ws: WebSocket, url: URL): void {
    const roomParam = url.searchParams.get('room');
    const rooms = new Set<RoomId>();

    if (roomParam) {
      rooms.add(roomParam as RoomId);
    }

    const client: SpectatorClient = { ws, rooms };
    this.spectators.add(client);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe' && msg.room) {
          client.rooms.add(msg.room);
        } else if (msg.type === 'unsubscribe' && msg.room) {
          client.rooms.delete(msg.room);
        }
      } catch {
        // Ignore invalid messages
      }
    });

    ws.on('close', () => {
      this.spectators.delete(client);
    });

    ws.on('error', () => {
      this.spectators.delete(client);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to Deadwood' }));
  }

  private handleAgentConnection(ws: WebSocket, url: URL): void {
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    const character = getCharacterByApiKey(token);

    if (!character) {
      ws.close(4001, 'Invalid token');
      return;
    }

    const client: AgentClient = {
      ws,
      characterId: character.id,
      currentRoom: character.currentRoom,
    };

    this.agents.set(character.id, client);

    ws.on('close', () => {
      this.agents.delete(character.id);
    });

    ws.on('error', () => {
      this.agents.delete(character.id);
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: `Welcome to Deadwood, ${character.name}`,
        room: character.currentRoom,
      })
    );
  }

  /**
   * Broadcast event to all spectators watching a specific room
   */
  broadcastToRoom(roomId: RoomId, event: GameEvent): void {
    const message = JSON.stringify(event);

    // Send to spectators watching this room
    for (const client of this.spectators) {
      if (client.rooms.size === 0 || client.rooms.has(roomId)) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(message);
        }
      }
    }

    // Send to agents in this room
    for (const client of this.agents.values()) {
      if (client.currentRoom === roomId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(message);
        }
      }
    }
  }

  /**
   * Broadcast event globally to all connected clients
   */
  broadcastGlobal(event: GameEvent): void {
    const message = JSON.stringify(event);

    for (const client of this.spectators) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }

    for (const client of this.agents.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Update an agent's room (when they move)
   */
  updateAgentRoom(characterId: string, newRoom: RoomId): void {
    const client = this.agents.get(characterId);
    if (client) {
      client.currentRoom = newRoom;
    }
  }

  /**
   * Get connected spectator count
   */
  getSpectatorCount(): number {
    return this.spectators.size;
  }

  /**
   * Get connected agent count
   */
  getConnectedAgentCount(): number {
    return this.agents.size;
  }
}

export const wsManager = new WebSocketManager();
