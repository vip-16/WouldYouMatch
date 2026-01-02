import { WSFrame } from '../types';
import { getWsUrl } from './api';

type Listener = (frame: WSFrame) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private pingInterval: any = null;

  public connect(ticket: string, onOpen?: () => void, onClose?: () => void) {
    if (this.ws) {
      this.ws.close();
    }

    const url = getWsUrl(ticket);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WS Connection Established');
      if (onOpen) onOpen();

      // Start ping heartbeat every 20s
      this.pingInterval = setInterval(() => {
        this.send('pong', {});
      }, 20000);
    };

    this.ws.onmessage = (event) => {
      try {
        const frame: WSFrame = JSON.parse(event.data);
        this.listeners.forEach((listener) => listener(frame));
      } catch (err) {
        console.error('Error parsing WS frame:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('WS Connection Closed');
      if (this.pingInterval) clearInterval(this.pingInterval);
      if (onClose) onClose();
    };

    this.ws.onerror = (err) => {
      console.error('WS Error:', err);
    };
  }

  public send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const frame = {
        type,
        seq: 0,
        ts: Math.floor(Date.now() / 1000),
        payload,
      };
      this.ws.send(JSON.stringify(frame));
    } else {
      console.warn('WS is not open. Event buffered or dropped:', type);
    }
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
