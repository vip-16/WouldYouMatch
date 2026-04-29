import { WSFrame } from '../types';
import { getWsUrl } from './api';

type Listener = (frame: WSFrame) => void;

export interface WebSocketConnectionOptions {
  onOpen?: () => void;
  onClose?: () => void;
  getReconnectTicket?: () => Promise<string>;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingFrames: string[] = [];
  private openPromise: Promise<void> | null = null;
  private connectionOptions: WebSocketConnectionOptions = {};
  private reconnectAttempt = 0;
  private manuallyDisconnected = false;

  public connect(ticket: string, options: WebSocketConnectionOptions = {}): Promise<void> {
    this.connectionOptions = options;
    this.manuallyDisconnected = false;

    if (this.isConnected()) {
      options.onOpen?.();
      return Promise.resolve();
    }
    if (this.openPromise) return this.openPromise;

    this.clearReconnectTimer();
    this.openPromise = this.open(ticket);
    return this.openPromise;
  }

  public waitForOpen(): Promise<void> {
    if (this.isConnected()) return Promise.resolve();
    if (this.openPromise) return this.openPromise;
    return Promise.reject(new Error('WebSocket is not connecting'));
  }

  public send(type: string, payload: unknown): boolean {
    const frame = JSON.stringify({ type, seq: 0, ts: Math.floor(Date.now() / 1000), payload });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(frame);
      return true;
    }
    if (this.ws?.readyState === WebSocket.CONNECTING || this.openPromise || this.reconnectTimer) {
      this.pendingFrames.push(frame);
      return true;
    }
    console.warn('WS is not connected. Event was not sent:', type);
    return false;
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public disconnect() {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.clearPing();
    this.pendingFrames = [];
    this.openPromise = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private open(ticket: string): Promise<void> {
    const ws = new WebSocket(getWsUrl(ticket));
    this.ws = ws;

    return new Promise<void>((resolve, reject) => {
      let opened = false;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        opened = true;
        this.openPromise = null;
        this.reconnectAttempt = 0;
        console.log('WS connection established');
        this.connectionOptions.onOpen?.();
        this.clearPing();
        this.pingInterval = setInterval(() => this.send('pong', {}), 20_000);

        const queuedFrames = this.pendingFrames;
        this.pendingFrames = [];
        queuedFrames.forEach((frame) => ws.send(frame));
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const frame: WSFrame = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(frame));
        } catch (err) {
          console.error('Error parsing WS frame:', err);
        }
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.ws = null;
        this.openPromise = null;
        this.clearPing();
        this.connectionOptions.onClose?.();
        if (!opened) reject(new Error('WebSocket closed before opening'));
        if (!this.manuallyDisconnected) this.scheduleReconnect();
      };

      ws.onerror = (err) => console.error('WS error:', err);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.connectionOptions.getReconnectTicket) return;
    const delay = Math.min(1_000 * 2 ** this.reconnectAttempt, 15_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.manuallyDisconnected || !this.connectionOptions.getReconnectTicket) return;
      try {
        const ticket = await this.connectionOptions.getReconnectTicket();
        this.openPromise = this.open(ticket);
        await this.openPromise;
      } catch (error) {
        console.warn('WS reconnect attempt failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  private clearPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = null;
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

export const wsClient = new WebSocketClient();
