import { WebSocket } from "ws";
import { StockLedgerEvent } from "@stocksense/schemas";

class WebSocketManager {
  private clients: Set<WebSocket> = new Set();

  registerClient(ws: WebSocket) {
    this.clients.add(ws);

    ws.on("close", () => {
      this.clients.delete(ws);
    });

    ws.on("error", () => {
      this.clients.delete(ws);
    });

    // Send connection established handshake
    this.sendToClient(ws, {
      type: "LEDGER_WRITE",
      timestamp: new Date().toISOString(),
      data: { message: "Connected to StockSense real-time ledger feed" },
    });
  }

  broadcast(event: StockLedgerEvent) {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch {
          this.clients.delete(client);
        }
      }
    }
  }

  private sendToClient(ws: WebSocket, event: StockLedgerEvent) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
