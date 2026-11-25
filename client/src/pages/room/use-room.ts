import { useEffect, useReducer } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Action } from '@game-core/game';
import type { ClientEvents, ErrorCode, Mode, ServerEvents, Snapshot } from '@game-core/protocol';

type RoomSocket = Socket<ServerEvents, ClientEvents>;
const errors: Record<ErrorCode, string> = {
  invalid_payload: 'Use 1–24 letters, numbers, spaces, hyphens, or underscores.',
  already_joined: 'This connection is already in a room.',
  name_taken: 'That player name is already in use in this room.',
  round_running: 'A round is in progress. Try joining after it finishes.',
  not_joined: 'Join a room first.',
  not_host: 'Only the host can start a round.',
  inactive: 'Your board is inactive.',
  stale_round: 'The round has changed. Try again.',
};

const actions: Readonly<Record<string, Action | undefined>> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'softDrop', ' ': 'hardDrop',
};

type RoomState = {
  socket: RoomSocket | null;
  snapshot: Snapshot | null;
  message: string | null;
  connected: boolean;
};
const initial: RoomState = { socket: null, snapshot: null, message: null, connected: false };
type Event =
  | { type: 'setup'; socket: RoomSocket }
  | { type: 'connect' | 'disconnect' }
  | { type: 'snapshot'; snapshot: Snapshot }
  | { type: 'error'; message: string };

export function reduceRoom(state: RoomState, event: Event): RoomState {
  switch (event.type) {
    case 'setup': return { ...initial, socket: event.socket };
    case 'connect': return { ...state, connected: true, message: null };
    case 'disconnect': return { ...state, connected: false, snapshot: null, message: 'Connection lost. Reconnecting…' };
    case 'snapshot': return { ...state, snapshot: event.snapshot, message: null };
    case 'error': return { ...state, message: event.message };
  }
}

export function useRoom(room: string, name: string) {
  const [state, dispatch] = useReducer(reduceRoom, initial);

  useEffect(() => {
    const socket: RoomSocket = io({ autoConnect: false, forceNew: true });
    const join = () => {
      dispatch({ type: 'connect' });
      socket.timeout(5000).emit('room:join', { room, name }, (error, reply) => {
        if (!socket.connected) return;
        if (error) dispatch({ type: 'error', message: 'The room did not respond. Reload to try again.' });
        else if (!reply.ok) dispatch({ type: 'error', message: errors[reply.error] });
      });
    };
    socket.on('connect', join);
    socket.on('disconnect', () => dispatch({ type: 'disconnect' }));
    socket.on('connect_error', () => dispatch({ type: 'error', message: 'Unable to connect. Retrying…' }));
    socket.on('room:snapshot', (snapshot) => dispatch({ type: 'snapshot', snapshot }));
    dispatch({ type: 'setup', socket });
    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [room, name]);

  const { socket, snapshot, connected } = state;
  const roundId = snapshot?.roundId;
  const canPlay = connected && snapshot?.phase === 'running'
    && snapshot.roster.some(({ id, alive }) => id === snapshot.selfId && alive);

  useEffect(() => {
    if (!socket || !canPlay || roundId === undefined) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const action = actions[event.key];
      if (!action) return;
      if (event.target instanceof HTMLElement
        && (event.target.matches('input, textarea, select, button, a') || event.target.isContentEditable)) return;
      event.preventDefault();
      if (!socket.connected || (event.repeat && (action === 'hardDrop' || action === 'rotate'))) return;
      socket.emit('player:input', { action, roundId });
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [socket, canPlay, roundId]);

  const start = (mode: Mode) => {
    if (!socket?.connected || !snapshot) return;
    socket.timeout(5000).emit('round:start', { mode, roundId: snapshot.roundId }, (error, reply) => {
      if (!socket.connected) return;
      if (error) dispatch({ type: 'error', message: 'The server did not confirm the start request.' });
      else if (!reply.ok) dispatch({ type: 'error', message: errors[reply.error] });
    });
  };

  return { ...state, start };
}
