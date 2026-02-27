import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

// ─── Protocol Constants ───────────────────────────────────
const PROTOCOL_VERSION = 3;
const CLIENT_ID = 'openclaw-control-ui';
const CLIENT_VERSION = '1.0.0';
const CLIENT_MODE = 'ui';

// ─── Types ────────────────────────────────────────────────

export type GatewayStatus = 'disconnected' | 'connecting' | 'handshaking' | 'connected';

interface RequestFrame {
  type: 'req';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

interface ResponseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string; retryable?: boolean };
}

interface EventFrame {
  type: 'event';
  event: string;
  payload?: Record<string, unknown>;
  seq?: number;
}

type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

type EventHandler = (payload: Record<string, unknown>, event: string) => void;

interface PendingRequest {
  resolve: (payload: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ─── Configuration ────────────────────────────────────────

const GATEWAY_TOKEN = process.env.EXPO_PUBLIC_INTENT_OS_SECRET || '8689fdc8686636b2959299e8f2f7bb587d43eb99096535e807646e19bde716ce';

function getGatewayUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      return `ws://${host}:18789`;
    }
    return 'ws://127.0.0.1:18789';
  }
  // On native, localhost refers to the device — use LAN IP or 10.0.2.2 for Android emulator
  return Platform.OS === 'android'
    ? 'ws://10.0.2.2:18789'
    : 'ws://127.0.0.1:18789';
}

// ─── Request ID Generator ─────────────────────────────────

let reqCounter = 0;
function nextReqId(): string {
  return `ios-${Date.now()}-${++reqCounter}`;
}

// ─── Hook ─────────────────────────────────────────────────

export function useGatewayConnection() {
  const [status, setStatus] = useState<GatewayStatus>('disconnected');
  const [serverInfo, setServerInfo] = useState<Record<string, unknown> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const eventHandlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  // ─── Event subscription ──────────────────────────────

  const onEvent = useCallback((eventName: string, handler: EventHandler) => {
    if (!eventHandlersRef.current.has(eventName)) {
      eventHandlersRef.current.set(eventName, new Set());
    }
    eventHandlersRef.current.get(eventName)!.add(handler);

    // Return unsubscribe function
    return () => {
      eventHandlersRef.current.get(eventName)?.delete(handler);
    };
  }, []);

  // ─── Send request with response promise ──────────────

  const sendRequest = useCallback((method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Gateway not connected'));
        return;
      }

      const id = nextReqId();
      const frame: RequestFrame = { type: 'req', id, method, ...(params ? { params } : {}) };

      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
        reject(new Error(`Request ${method} timed out (id: ${id})`));
      }, 60000); // 60s timeout for agent requests

      pendingRef.current.set(id, { resolve, reject, timer });

      ws.send(JSON.stringify(frame));
    });
  }, []);

  // ─── Frame dispatcher ────────────────────────────────

  const handleFrame = useCallback((raw: string) => {
    let frame: GatewayFrame;
    try {
      frame = JSON.parse(raw);
    } catch {
      console.warn('[GatewayConn] Unparseable frame');
      return;
    }

    if (frame.type === 'res') {
      const res = frame as ResponseFrame;
      const pending = pendingRef.current.get(res.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRef.current.delete(res.id);
        if (res.ok) {
          pending.resolve(res.payload ?? {});
        } else {
          pending.reject(new Error(res.error?.message ?? 'Gateway request failed'));
        }
      }
    } else if (frame.type === 'event') {
      const evt = frame as EventFrame;

      // Handle connect.challenge during handshake
      if (evt.event === 'connect.challenge') {
        performHandshake(evt.payload as { nonce: string; ts: number });
        return;
      }

      // Dispatch to registered handlers
      const handlers = eventHandlersRef.current.get(evt.event);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(evt.payload ?? {}, evt.event);
          } catch (err) {
            console.error(`[GatewayConn] Event handler error for "${evt.event}":`, err);
          }
        }
      }

      // Also dispatch to wildcard handlers
      const wildcardHandlers = eventHandlersRef.current.get('*');
      if (wildcardHandlers) {
        for (const handler of wildcardHandlers) {
          try {
            handler(evt.payload ?? {}, evt.event);
          } catch (err) {
            console.error('[GatewayConn] Wildcard event handler error:', err);
          }
        }
      }
    }
  }, []);

  // ─── Handshake: respond to connect.challenge ─────────

  const performHandshake = useCallback((challenge: { nonce: string; ts: number }) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    setStatus('handshaking');

    const connectFrame: RequestFrame = {
      type: 'req',
      id: nextReqId(),
      method: 'connect',
      params: {
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client: {
          id: CLIENT_ID,
          version: CLIENT_VERSION,
          platform: Platform.OS === 'web' ? 'web' : Platform.OS,
          mode: CLIENT_MODE,
        },
        caps: [],
        auth: {
          token: GATEWAY_TOKEN,
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write', 'operator.admin'],
      },
    };

    // Register a pending handler for this connect request
    const id = connectFrame.id;
    const timer = setTimeout(() => {
      pendingRef.current.delete(id);
      console.error('[GatewayConn] Handshake timed out');
      setStatus('disconnected');
    }, 10000);

    pendingRef.current.set(id, {
      resolve: (payload) => {
        console.log('[GatewayConn] Handshake complete (hello-ok)');
        setServerInfo(payload);
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      },
      reject: (err) => {
        console.error('[GatewayConn] Handshake rejected:', err.message);
        setStatus('disconnected');
      },
      timer,
    });

    ws.send(JSON.stringify(connectFrame));
  }, []);

  // ─── Connect ─────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    intentionalCloseRef.current = false;
    setStatus('connecting');

    const url = getGatewayUrl();
    console.log('[GatewayConn] Connecting to', url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[GatewayConn] WebSocket open, waiting for challenge...');
      // The gateway sends connect.challenge automatically on open
    };

    ws.onmessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : '';
      handleFrame(data);
    };

    ws.onerror = (event) => {
      console.error('[GatewayConn] WebSocket error:', event);
    };

    ws.onclose = (event) => {
      console.log('[GatewayConn] WebSocket closed:', event.code, event.reason);
      wsRef.current = null;
      setStatus('disconnected');
      setServerInfo(null);

      // Reject all pending requests
      for (const [id, pending] of pendingRef.current) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Connection closed'));
      }
      pendingRef.current.clear();

      // Reconnect unless intentional close
      if (!intentionalCloseRef.current) {
        scheduleReconnect();
      }
    };
  }, [handleFrame]);

  // ─── Disconnect ──────────────────────────────────────

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setStatus('disconnected');
    setServerInfo(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  // ─── Reconnect with exponential backoff ──────────────

  const scheduleReconnect = useCallback(() => {
    const attempt = reconnectAttemptsRef.current;
    if (attempt >= 8) {
      console.warn('[GatewayConn] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // 1s, 2s, 4s, ... up to 30s
    console.log(`[GatewayConn] Reconnecting in ${delay}ms (attempt ${attempt + 1})`);

    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current = attempt + 1;
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  // ─── Cleanup on unmount ──────────────────────────────

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Unmount');
      }
    };
  }, []);

  return {
    status,
    serverInfo,
    connect,
    disconnect,
    sendRequest,
    onEvent,
    isConnected: status === 'connected',
  };
}
