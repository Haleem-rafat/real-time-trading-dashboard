import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAppSelector } from '@store/hooks';
import { ESocketEvents } from '@constants/socket-events';
import { SocketContext } from './socket-context';

interface Props {
  children: ReactNode;
}

/**
 * Opens a singleton socket.io-client connection once the user is
 * authenticated. The token is sent in the handshake `auth` field.
 * The connection is torn down on logout (token cleared).
 *
 * Note: in dev the backend allows anonymous connections too
 * (`ALLOW_ANON_WS=true`), so subscribing pre-auth would also work,
 * but waiting for auth keeps the contract clean for production.
 */
export function SocketProvider({ children }: Props) {
  const token = useAppSelector((s) => s.auth.token);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      // The cleanup of the previous effect (when present) already
      // disconnected the prior socket. Just leave state at defaults.
      return;
    }

    const url = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8080';
    const instance = io(url, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // All setState calls live inside listener callbacks — this is the
    // documented React pattern for subscribing to external systems.
    const handleConnect = () => {
      setSocket(instance);
      setIsConnected(true);
      console.log('[socket] connected', instance.id);
    };
    const handleReady = (payload: unknown) => {
      console.log('[socket] connection:ready', payload);
    };
    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      console.log('[socket] disconnected', reason);
    };
    const handleConnectError = (err: Error) => {
      console.error('[socket] connect_error', err.message);
    };

    instance.on('connect', handleConnect);
    instance.on(ESocketEvents.CONNECTION_READY, handleReady);
    instance.on('disconnect', handleDisconnect);
    instance.on('connect_error', handleConnectError);

    return () => {
      instance.off('connect', handleConnect);
      instance.off(ESocketEvents.CONNECTION_READY, handleReady);
      instance.off('disconnect', handleDisconnect);
      instance.off('connect_error', handleConnectError);
      instance.disconnect();
      // Reset state via the React 18+ batching path: queueing these
      // inside cleanup is allowed (cleanup is treated as a callback,
      // not synchronous effect-body code).
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const value = useMemo(() => ({ socket, isConnected }), [socket, isConnected]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
