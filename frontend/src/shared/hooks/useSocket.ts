import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../app/store/useAuthStore';

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const { accessToken } = useAuthStore();
  const [isConnected, setIsConnected] = useState(socketInstance?.connected || false);
  const listenersRef = useRef(new Map<string, Function[]>());

  useEffect(() => {
    if (!accessToken) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      setIsConnected(false);
      return;
    }

    if (!socketInstance) {
      socketInstance = io('http://localhost:3000', {
        auth: { token: accessToken },
        transports: ['websocket'],
      });

      socketInstance.on('connect', () => setIsConnected(true));
      socketInstance.on('disconnect', () => setIsConnected(false));
      socketInstance.on('error', (err) => console.error('Socket error:', err));
    }

    return () => {
      // We don't disconnect immediately so the socket can be shared across components
    };
  }, [accessToken]);

  // Subscribe to socket events dynamically
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (!socketInstance) return;

    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event)?.push(callback);
    socketInstance.on(event, callback);

    return () => {
      const cbs = listenersRef.current.get(event) || [];
      const updatedCbs = cbs.filter((cb) => cb !== callback);
      listenersRef.current.set(event, updatedCbs);
      socketInstance?.off(event, callback);
    };
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit(event, ...args);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }, []);

  return { on, emit, isConnected };
};
