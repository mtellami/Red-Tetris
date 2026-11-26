import { useCallback, useEffect, useEffectEvent, useReducer } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Action } from '@game-core/game';
import type { ClientEvents, ErrorCode, Mode, ServerEvents, Snapshot } from '@game-core/protocol';

type RoomSocket = Socket<ServerEvents, ClientEvents>;
type JoinState =
  | { status: 'joining' | 'joined' }
  | { status: 'rejected'; message: string; code?: ErrorCode };

const errors: Record<ErrorCode, string> = {
  invalid_payload: 'Use 1–24 letters, numbers, spaces, hyphens, or underscores.',
  already_joined: 'This connection is already in a room.',
  name_taken: 'That player name is already in use in this room.',
  round_running: 'A round is in progress. Try joining after it finishes.',
  room_unavailable: 'This room is no longer open. Choose another room or enter a room name.',
  not_joined: 'Join a room first.',
  not_host: 'Only the host can start a round.',
  inactive: 'Your board is inactive.',
  stale_round: 'The round has changed. Try again.',
};

const actions: Readonly<Record<string, Action | undefined>> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'softDrop', ' ': 'hardDrop',
};

type RoomState = {
  room: string | undefined;
  name: string | undefined;
  socket: RoomSocket | null;
  snapshot: Snapshot | null;
  message: string | null;
  connected: boolean;
  join: JoinState;
};
const initial: RoomState = {
  room: undefined, name: undefined, socket: null, snapshot: null,
  message: null, connected: false, join: { status: 'joining' },
};
type Event =
  | { type: 'setup'; socket: RoomSocket; room: string; name: string }
  | { type: 'reset' | 'connect' | 'disconnect' | 'joined' }
  | { type: 'rejected'; message: string; code?: ErrorCode }
  | { type: 'snapshot'; snapshot: Snapshot }
  | { type: 'error'; message: string };

export function reduceRoom(state: RoomState, event: Event): RoomState {
  switch (event.type) {
    case 'reset': return initial;
    case 'setup': return { ...initial, room: event.room, name: event.name, socket: event.socket };
    case 'connect': return { ...state, connected: true, message: null, join: { status: 'joining' } };
    case 'disconnect': return { ...state, connected: false, snapshot: null, message: 'Connection lost. Reconnecting…' };
    case 'snapshot': return { ...state, snapshot: event.snapshot, message: null };
    case 'joined': return { ...state, join: { status: 'joined' } };
    case 'rejected': {
      const { message, code } = event;
      return { ...state, message, join: { status: 'rejected', message, code } };
    }
    case 'error': return { ...state, message: event.message };
  }
}

export function useRoom(room?: string, name?: string, lobbyOnly?: boolean) {
  const [state, dispatch] = useReducer(reduceRoom, initial);
  const requiresOpenLobby = useEffectEvent(() => lobbyOnly);

  useEffect(() => {
    if (!room || !name) {
      dispatch({ type: 'reset' });
      return;
    }
    const socket: RoomSocket = io({ autoConnect: false, forceNew: true, timeout: 5000 });
    let joined = false;
    const join = () => {
      dispatch({ type: 'connect' });
      const request = !joined && requiresOpenLobby() ? { room, name, lobbyOnly: true } : { room, name };
      socket.timeout(5000).emit('room:join', request, (error, reply) => {
        if (!socket.connected) return;
        if (error) dispatch({ type: 'rejected', message: 'The room did not respond. Try again.' });
        else if (!reply.ok) dispatch({ type: 'rejected', message: errors[reply.error], code: reply.error });
        else {
          joined = true;
          dispatch({ type: 'joined' });
        }
      });
    };
    socket.on('connect', join);
    socket.on('disconnect', () => {
      dispatch({ type: 'disconnect' });
      if (!joined) dispatch({ type: 'rejected', message: 'Connection lost. Try again.' });
    });
    socket.on('connect_error', () => {
      if (joined) dispatch({ type: 'error', message: 'Unable to connect. Retrying…' });
      else dispatch({ type: 'rejected', message: 'Unable to connect. Try again.' });
    });
    socket.on('room:snapshot', (snapshot) => dispatch({ type: 'snapshot', snapshot }));
    dispatch({ type: 'setup', socket, room, name });
    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [room, name]);

  const { socket, snapshot, connected, join, message } =
    state.room === room && state.name === name ? state : initial;
  const roundId = snapshot?.roundId;
  const canPlay = connected && snapshot?.phase === 'running'
    && snapshot.roster.some(({ id, alive }) => id === snapshot.selfId && alive);
  const sendInput = useCallback((action: Action) => {
    if (!socket?.connected || !canPlay || roundId === undefined) return;
    socket.emit('player:input', { action, roundId });
  }, [socket, canPlay, roundId]);

  useEffect(() => {
    if (!canPlay) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const action = actions[event.key];
      if (!action) return;
      if (event.target instanceof HTMLElement
        && (event.target.matches('input, textarea, select, button, a') || event.target.isContentEditable)) return;
      event.preventDefault();
      if (event.repeat && (action === 'hardDrop' || action === 'rotate')) return;
      sendInput(action);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [canPlay, sendInput]);

  const selectMode = (mode: Mode) => {
    if (!socket?.connected || !snapshot) return;
    socket.timeout(5000).emit('round:select-mode', { mode, roundId: snapshot.roundId }, (error, reply) => {
      if (!socket.connected) return;
      if (error) dispatch({ type: 'error', message: 'The server did not confirm the mode selection.' });
      else if (!reply.ok) dispatch({ type: 'error', message: errors[reply.error] });
    });
  };

  const start = () => {
    if (!socket?.connected || !snapshot) return;
    socket.timeout(5000).emit('round:start', { roundId: snapshot.roundId }, (error, reply) => {
      if (!socket.connected) return;
      if (error) dispatch({ type: 'error', message: 'The server did not confirm the start request.' });
      else if (!reply.ok) dispatch({ type: 'error', message: errors[reply.error] });
    });
  };

  return { snapshot, connected, join, message, selectMode, start, canPlay, sendInput };
}

export type RoomSession = ReturnType<typeof useRoom>;
