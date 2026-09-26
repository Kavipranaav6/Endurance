import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./routers/app.js";
import { createContext } from "./trpc.js";

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

  server.get("/health", async () => {
    return {
      status: "ok",
      service: "stocksense-api",
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
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  start();
}
