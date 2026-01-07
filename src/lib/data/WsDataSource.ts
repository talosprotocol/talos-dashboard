import { 
    DataSource, 
    StreamMessage,
    AuditFilters
} from "./DataSourceTypes";
import { HttpDataSource } from "./HttpDataSource";
import { WsClient } from "./WsClient";

export class WsDataSource extends HttpDataSource implements DataSource {
    private wsClient: WsClient | null = null;

    subscribe(cb: (msg: StreamMessage) => void, filters?: AuditFilters): () => void {
        const wsUrl = process.env.NEXT_PUBLIC_TALOS_WS_URL || "ws://localhost:8000/api/events/stream";
        const capability = process.env.NEXT_PUBLIC_TALOS_CAPABILITY || "talos_read_allow";

        console.log("Initializing WsDataSource subscription...");

        this.wsClient = new WsClient({
            url: wsUrl,
            capability: capability,
            filters: filters as Record<string, unknown>,
            onEvent: (event) => {
                // Validate cursor integrity like HttpDataSource does
                this.ingestEvent(event);
                cb({ type: "audit_event", event });
            },
            onStatusChange: (status) => {
                console.log(`WsClient status: ${status}`);
                // We could emit a special message if needed
            },
            onHeartbeat: () => {
                // Heartbeat success
            }
        });

        this.wsClient.connect();

        // Gateway Status still needs polling
        const statusPoll = setInterval(async () => {
            try {
                const status = await this.getGatewayStatus();
                cb({ type: "gateway_status", status });
            } catch (err) {
                console.warn("Gateway status poll failed:", err);
            }
        }, 5000);

        return () => {
            console.log("Cleaning up WsDataSource subscription...");
            clearInterval(statusPoll);
            this.wsClient?.disconnect();
            this.wsClient = null;
        };
    }
}
