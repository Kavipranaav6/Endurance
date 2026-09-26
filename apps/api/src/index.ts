import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./routers/app.js";
import { createContext } from "./trpc.js";
import { wsManager } from "./lib/websocket.js";

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow local dev origins
      cb(null, true);
    },
    credentials: true,
  });

  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET || "stocksense-cookie-secret-dev-2026",
  });

  await server.register(websocket);

  server.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (socket /* WebSocket */, req) => {
      // Handle both Fastify WebSocket v10 connection.socket or direct socket
      const ws = (socket as any).socket || socket;
      wsManager.registerClient(ws);
    });
  });

  server.get("/health", async () => {
    return {
      status: "ok",
      service: "stocksense-api",
      wsClients: wsManager.getClientCount(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  await server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });

  return server;
}

const start = async () => {
  const server = await buildServer();
  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || "0.0.0.0";

  try {
    await server.listen({ port, host });
    console.log(`API server listening on http://${host}:${port}`);
    console.log(`WebSocket server active on ws://${host}:${port}/ws`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  start();
}
