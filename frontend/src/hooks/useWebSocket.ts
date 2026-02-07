'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { EventData } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

export function useWebSocket(room?: string) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = room
      ? `${WS_URL}/ws/spectator?room=${room}`
      : `${WS_URL}/ws/spectator`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type && data.narrative) {
            setEvents((prev) => [data, ...prev].slice(0, 100));
          }
        } catch {
          // Ignore invalid messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected, reconnecting in 5s...');
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [room]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const subscribeToRoom = useCallback((roomId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', room: roomId }));
    }
  }, []);

  return { events, isConnected, subscribeToRoom };
}
