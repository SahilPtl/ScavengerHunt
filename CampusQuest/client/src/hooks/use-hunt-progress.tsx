import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { Coordinates, Message } from '@shared/schema';

interface PlayerPosition {
  userId: number;
  position: Coordinates;
  currentClueIndex: number;
  heading?: number; // Direction in degrees, 0-360
  teamId?: number | null; // The team this player belongs to
}

interface HuntProgress {
  isConnected: boolean;
  otherPlayers: PlayerPosition[];
  activePlayerCount: number;
  messages: Message[];
  updatePosition: (position: Coordinates, currentClueIndex: number, heading?: number) => void;
  sendMessage: (content: string) => void;
}

export function useHuntProgress(huntId: number): HuntProgress {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<PlayerPosition[]>([]);
  const [activePlayerCount, setActivePlayerCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!user || !huntId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/hunt?userId=${user.id}&huntId=${huntId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);

      switch (data.type) {
        case 'player_position':
          setOtherPlayers(prev => {
            // Find the previous position to calculate heading
            const prevPlayer = prev.find(p => p.userId === data.userId);
            let heading = prevPlayer?.heading ?? 0;
            
            // If we have a previous position, calculate the heading
            if (prevPlayer?.position) {
              const prevPos = prevPlayer.position;
              const newPos = data.position;
              
              // Only calculate heading if there's meaningful movement
              const distance = Math.sqrt(
                Math.pow(newPos.latitude - prevPos.latitude, 2) + 
                Math.pow(newPos.longitude - prevPos.longitude, 2)
              );
              
              if (distance > 0.0001) { // Minimum movement threshold
                // Calculate heading in degrees (0-360)
                const deltaLat = newPos.latitude - prevPos.latitude;
                const deltaLng = newPos.longitude - prevPos.longitude;
                heading = (Math.atan2(deltaLng, deltaLat) * (180 / Math.PI) + 360) % 360;
              }
            }
            
            const filtered = prev.filter(p => p.userId !== data.userId);
            return [...filtered, {
              userId: data.userId,
              position: data.position,
              currentClueIndex: data.currentClueIndex,
              heading,
              teamId: data.teamId
            }];
          });
          break;
        case 'player_count':
          setActivePlayerCount(data.count);
          break;
        case 'chat_message':
          if (data.message.senderId !== user.id) {
            console.log('Adding new message:', data.message);
            setMessages(prev => [...prev, data.message]);
          }
          break;
        case 'chat_history':
          console.log('Received chat history:', data.messages);
          setMessages(data.messages || []);
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, huntId]);

  const updatePosition = useCallback((
    position: Coordinates, 
    currentClueIndex: number, 
    heading?: number
  ) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'update_position',
        position,
        currentClueIndex,
        heading // Include heading if available
      }));
    }
  }, [socket]);

  const sendMessage = useCallback((content: string) => {
    if (socket?.readyState === WebSocket.OPEN && user) {
      const newMessage: Message = {
        senderId: user.id,
        content,
        timestamp: new Date()
      };

      socket.send(JSON.stringify({
        type: 'chat_message',
        message: {
          content: newMessage.content
        }
      }));

      // Add the message immediately for the sender
      setMessages(prev => [...prev, newMessage]);
    }
  }, [socket, user]);

  return {
    isConnected,
    otherPlayers,
    activePlayerCount,
    messages,
    updatePosition,
    sendMessage
  };
}