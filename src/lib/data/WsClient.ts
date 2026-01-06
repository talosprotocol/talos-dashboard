import { AuditEvent } from "./schemas";

export type WsClientStatus = "CONNECTING" | "OPEN" | "CLOSED" | "ERROR";

export interface WsClientOptions {
    url: string;
    capability: string;
    onEvent: (event: AuditEvent) => void;
    onStatusChange?: (status: WsClientStatus) => void;
    onHeartbeat?: (lastCursor: string) => void;
    filters?: Record<string, unknown>;
}

export class WsClient {
    private ws: WebSocket | null = null;
    private readonly options: WsClientOptions;
    private status: WsClientStatus = "CLOSED";
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private lastCursor: string | null = null;

    constructor(options: WsClientOptions) {
        this.options = options;
    }

    private setStatus(status: WsClientStatus) {
        this.status = status;
        this.options.onStatusChange?.(status);
    }

    connect() {
        if (this.ws || this.status === "CONNECTING") return;

        this.setStatus("CONNECTING");
        console.log(`Connecting to ${this.options.url}...`);
        
        try {
            this.ws = new WebSocket(this.options.url);

            this.ws.onopen = () => {
                console.log("WS Connected, initiating handshake...");
                this.sendHandshake();
            };

            this.ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.error("Failed to parse WS message", e);
                }
            };

            this.ws.onerror = (err) => {
                console.error("WS Error", err);
                this.setStatus("ERROR");
            };

            this.ws.onclose = (event) => {
                console.log(`WS Closed: ${event.code} ${event.reason}`);
                this.cleanup();
                this.setStatus("CLOSED");
                this.scheduleReconnect();
            };
        } catch (e) {
            console.error("WS Connection throw", e);
            this.setStatus("ERROR");
            this.scheduleReconnect();
        }
    }

    private sendHandshake() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const initMsg = {
            type: "init",
            version: 1,
            capability: this.options.capability,
            nonce: crypto.randomUUID(),
            ts: new Date().toISOString(),
            filters: this.options.filters
        };

        this.ws.send(JSON.stringify(initMsg));
    }

    private handleMessage(message: Record<string, unknown>) {
        const type = message.type as string;

        switch (type) {
            case "init_ack":
                console.log(`Handshake success: session ${message.session_id}`);
                this.setStatus("OPEN");
                this.reconnectAttempts = 0;
                this.startHeartbeat(message.heartbeat_interval_ms as number);
                break;

            case "event":
                if (message.event) {
                    this.lastCursor = (message.cursor as string) || this.lastCursor;
                    this.options.onEvent(message.event as AuditEvent);
                }
                break;

            case "error":
                console.error(`WS Protocol Error [${message.code}]: ${message.message}`);
                // If it's a fatal error (like AUTH_FAILED), we might want to stop reconnecting
                if (message.code === "AUTH_FAILED" || message.code === "CAPABILITY_EXPIRED") {
                    this.cleanup(); // Stop everything
                }
                break;

            case "reconnect":
                console.log(`Server requested reconnect in ${message.retry_after_ms}ms`);
                this.reconnect((message.retry_after_ms as number) || 1000);
                break;

            case "heartbeat":
                 // Server check
                 this.options.onHeartbeat?.(message.last_cursor as string);
                 break;

            default:
                console.warn("Unknown message type", type);
        }
    }

    private startHeartbeat(interval: number) {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ 
                    type: "heartbeat", 
                    last_cursor: this.lastCursor || "" 
                }));
            }
        }, interval || 30000);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private scheduleReconnect() {
        this.stopReconnect();
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    private stopReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    private cleanup() {
        this.stopHeartbeat();
        this.stopReconnect();
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.onopen = null;
            this.ws.close();
            this.ws = null;
        }
    }

    reconnect(delay = 0) {
        this.cleanup();
        this.setStatus("CLOSED");
        if (delay > 0) {
            this.reconnectTimeout = setTimeout(() => this.connect(), delay);
        } else {
            this.connect();
        }
    }

    disconnect() {
        this.cleanup();
        this.setStatus("CLOSED");
    }

    getStatus() {
        return this.status;
    }
}
