'use client';

import { useState, useEffect } from 'react';
import { getWorldTime, type TimeData } from '@/lib/api';

export function useWorldState() {
  const [time, setTime] = useState<TimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTime() {
      const data = await getWorldTime();
      setTime(data);
      setIsLoading(false);
    }

    fetchTime();

    // Poll every 5 seconds (tick duration)
    const interval = setInterval(fetchTime, 5000);
    return () => clearInterval(interval);
  }, []);

  return { time, isLoading };
}
