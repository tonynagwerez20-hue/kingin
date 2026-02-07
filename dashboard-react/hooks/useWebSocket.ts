"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface WebSocketMessage {
    type: string;
    data: any;
}

export function useWebSocket(url: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>(undefined);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log("[WebSocket] Connected");
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    setLastMessage(message);
                } catch (error) {
                    console.error("[WebSocket] Failed to parse message:", error);
                }
            };

            ws.onerror = (error) => {
                console.error("[WebSocket] Error:", error);
            };

            ws.onclose = () => {
                console.log("[WebSocket] Disconnected");
                setIsConnected(false);

                // Auto-reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log("[WebSocket] Reconnecting...");
                    connect();
                }, 3000);
            };

            wsRef.current = ws;
        } catch (error) {
            console.error("[WebSocket] Connection failed:", error);
        }
    }, [url]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return { isConnected, lastMessage };
}
