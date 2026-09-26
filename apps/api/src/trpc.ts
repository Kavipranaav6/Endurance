import { initTRPC, TRPCError } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { verifyAccessToken, TokenPayload } from "./lib/jwt.js";

export interface Context {
  req: CreateFastifyContextOptions["req"];
  res: CreateFastifyContextOptions["res"];
  user: TokenPayload | null;
}

export function createContext({ req, res }: CreateFastifyContextOptions): Context {
  const authHeader = req.headers.authorization;
  let user: TokenPayload | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    user = verifyAccessToken(token);
  }

  return { req, res, user };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
