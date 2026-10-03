import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../types/whiteboard';
import { getApiBaseUrl } from './api';

function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.replace(/\/$/, '');
  }
  return getApiBaseUrl();
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(token?: string | null): Socket<ServerToClientEvents, ClientToServerEvents> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('whiteboard_auth_token') || localStorage.getItem('token') : null);
  const socketUrl = getSocketUrl();
  
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: {
        token: authToken,
      },
    });
  } else if (authToken && socket.auth) {
    (socket.auth as { token?: string | null }).token = authToken;
  }
  return socket;
}
