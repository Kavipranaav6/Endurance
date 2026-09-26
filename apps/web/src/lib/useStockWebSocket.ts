import { useEffect, useRef, useState } from "react";
import { StockLedgerEvent } from "@stocksense/schemas";

export function useStockWebSocket(onEvent?: (event: StockLedgerEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState<StockLedgerEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    // Connect to /ws directly via dev server proxy or API
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (messageEvent) => {
      try {
        const event: StockLedgerEvent = JSON.parse(messageEvent.data);
        setLatestEvent(event);
        if (onEvent) {
          onEvent(event);
        }
      } catch {
        // ignore parse error
      }
    };

    return () => {
      ws.close();
    };
  }, [onEvent]);

  return { isConnected, latestEvent };
}
