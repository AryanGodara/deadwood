'use client';

import { useState, useEffect } from 'react';
import { getHealth } from '@/lib/api';

export function useAgentCount() {
  const [agentCount, setAgentCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    async function fetchHealth() {
      const health = await getHealth();
      if (health) {
        setAgentCount(health.agentCount);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    }

    fetchHealth();

    // Poll every 10 seconds
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return { agentCount, isConnected };
}
