import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../app/store/useAuthStore';

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const { accessToken } = useAuthStore();
  const [isConnected, setIsConnected] = useState(socketInstance?.connected || false);
  const listenersRef = useRef(new Map<string, ((...args: unknown[]) => void)[]>());
  const messageQueueRef = useRef<{ event: string; args: unknown[] }[]>([]);

  useEffect(() => {
    if (!accessToken) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      // Use a microtask to avoid synchronous setState inside effect body
      Promise.resolve().then(() => setIsConnected(false));
      return;
    }

    if (!socketInstance) {
      socketInstance = io('http://localhost:3000', {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        // Flush any queued messages
        if (messageQueueRef.current.length > 0) {
          console.log(`[Socket] Flushing ${messageQueueRef.current.length} queued messages`);
          messageQueueRef.current.forEach(({ event, args }) => {
            socketInstance?.emit(event, ...args);
          });
          messageQueueRef.current = [];
        }
      });
      socketInstance.on('disconnect', () => setIsConnected(false));
      socketInstance.on('error', (err) => console.error('Socket error:', err));
    }

    return () => {
      // We don't disconnect immediately so the socket can be shared across components
    };
  }, [accessToken]);

  // Subscribe to socket events dynamically
  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    if (!socketInstance) return () => {};

    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event)?.push(callback);
    socketInstance.on(event, callback as (...args: unknown[]) => void);

    return () => {
      const cbs = listenersRef.current.get(event) || [];
      const updatedCbs = cbs.filter((cb) => cb !== callback);
      listenersRef.current.set(event, updatedCbs);
      socketInstance?.off(event, callback);
    };
  }, []);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit(event, ...args);
    } else {
      console.log(`[Socket] Queueing offline message: ${event}`);
      messageQueueRef.current.push({ event, args });
    }
  }, []);

  return { on, emit, isConnected };
};
