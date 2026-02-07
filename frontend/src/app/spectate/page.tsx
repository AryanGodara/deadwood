'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getHistory, getCharacters, getRooms, type EventData, type CharacterData, type RoomData } from '@/lib/api';
import EventFeed from '@/components/spectator/EventFeed';
import RoomView from '@/components/spectator/RoomView';
import WorldClock from '@/components/spectator/WorldClock';

const ROOMS = ['rusty_spur_saloon', 'street', 'jail'] as const;

const ROOM_INFO: Record<string, { name: string; icon: string }> = {
  rusty_spur_saloon: { name: 'The Rusty Spur Saloon', icon: '🍺' },
  street: { name: 'Main Street', icon: '🌵' },
  jail: { name: 'Sheriff\'s Jail', icon: '⛓️' },
};

export default function SpectatePage() {
  const [selectedRoom, setSelectedRoom] = useState<string>('rusty_spur_saloon');
  const [historicalEvents, setHistoricalEvents] = useState<EventData[]>([]);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);

  const { events: wsEvents, isConnected, subscribeToRoom } = useWebSocket(selectedRoom);

  // Combine WebSocket events with historical events
  const allEvents = [...wsEvents, ...historicalEvents.filter(
    (he) => !wsEvents.some((we) => we.id === he.id)
  )].slice(0, 100);

  // Fetch historical events when room changes
  useEffect(() => {
    async function fetchData() {
      const [eventsData, charsData, roomsData] = await Promise.all([
        getHistory(selectedRoom, 50),
        getCharacters(),
        getRooms(),
      ]);
      setHistoricalEvents(eventsData);
      setCharacters(charsData);
      setRooms(roomsData);
    }
    fetchData();
    subscribeToRoom(selectedRoom);

    // Refresh every 10 seconds as fallback
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [selectedRoom, subscribeToRoom]);

  const currentRoom = rooms.find((r) => r.id === selectedRoom);
  const roomCharacters = characters.filter((c) => c.currentRoom === selectedRoom);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-western text-3xl text-gold flex items-center space-x-3">
          <span>👁️</span>
          <span>Spectate</span>
        </h1>
        <div className="flex items-center space-x-4">
          <WorldClock />
          <div className="wood-panel px-3 py-2 flex items-center space-x-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse-slow glow-gold' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-parchment font-western">
              {isConnected ? 'LIVE' : 'POLLING'}
            </span>
          </div>
        </div>
      </div>

      {/* Room Tabs */}
      <div className="flex space-x-1 mb-6">
        {ROOMS.map((room) => (
          <button
            key={room}
            onClick={() => setSelectedRoom(room)}
            className={`western-tab flex items-center space-x-2 ${
              selectedRoom === room ? 'active' : ''
            }`}
          >
            <span>{ROOM_INFO[room].icon}</span>
            <span>{ROOM_INFO[room].name}</span>
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Feed - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="wood-panel p-4">
            <div className="wood-header -mx-4 -mt-4 mb-4 rounded-t-lg flex items-center justify-center space-x-2">
              <span>📜</span>
              <h2 className="font-western text-lg text-gold">Event Feed</h2>
            </div>
            <EventFeed events={allEvents} />
          </div>
        </div>

        {/* Room View - 1/3 width */}
        <div className="lg:col-span-1">
          <div className="wood-panel p-4">
            <div className="wood-header -mx-4 -mt-4 mb-4 rounded-t-lg flex items-center justify-center space-x-2">
              <span>{ROOM_INFO[selectedRoom].icon}</span>
              <h2 className="font-western text-lg text-gold">{ROOM_INFO[selectedRoom].name}</h2>
            </div>
            {currentRoom ? (
              <RoomView
                roomName={currentRoom.name}
                description={currentRoom.description}
                characters={roomCharacters}
                items={[]}
                exits={currentRoom.exits}
              />
            ) : (
              <p className="text-parchment/40 italic font-fell">Loading room...</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-24" />
    </div>
  );
}
