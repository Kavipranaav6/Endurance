import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  SignupInputSchema,
  LoginInputSchema,
  RequestOtpInputSchema,
  ResetPasswordInputSchema,
} from "@stocksense/schemas";
import { prisma } from "../lib/prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import { otpStore } from "../lib/redis.js";
import { generateOtp, sendOtpEmail } from "../lib/mailer.js";

// In-memory fallback user store when Postgres is offline/unconfigured
const memoryUsers = new Map<string, any>();

function isDbUnavailable(err: any): boolean {
  return (
    !process.env.DATABASE_URL ||
    err?.name === "PrismaClientInitializationError" ||
    err?.constructor?.name === "PrismaClientInitializationError" ||
    err?.code?.startsWith("P1") ||
    err?.message?.includes("Can't reach database") ||
    err?.message?.includes("Environment variable not found: DATABASE_URL")
  );
}

async function findUserByEmail(email: string) {
  const normalized = email.toLowerCase();
  if (!process.env.DATABASE_URL) {
    return memoryUsers.get(normalized) || null;
  }
  try {
    return await prisma.user.findUnique({ where: { email: normalized } });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      return memoryUsers.get(normalized) || null;
    }
    throw err;
  }
}

async function findUserById(id: string) {
  if (!process.env.DATABASE_URL) {
    for (const user of memoryUsers.values()) {
      if (user.id === id) return user;
    }
    return null;
  }
  try {
    return await prisma.user.findUnique({ where: { id } });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      for (const user of memoryUsers.values()) {
        if (user.id === id) return user;
      }
      return null;
    }
    throw err;
  }
}

async function createUser(data: { email: string; name: string; passwordHash: string; role: any }) {
  const normalized = data.email.toLowerCase();
  if (!process.env.DATABASE_URL) {
    const user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: normalized,
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryUsers.set(normalized, user);
    return user;
  }
  try {
    return await prisma.user.create({ data });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      const user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: normalized,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryUsers.set(normalized, user);
      return user;
    }
    throw err;
  }
}

async function updateUserPassword(email: string, passwordHash: string) {
  const normalized = email.toLowerCase();
  if (!process.env.DATABASE_URL) {
    const user = memoryUsers.get(normalized);
    if (user) {
      user.passwordHash = passwordHash;
      user.updatedAt = new Date();
      return user;
    }
    return null;
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash },
      });
    }
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      const user = memoryUsers.get(normalized);
      if (user) {
        user.passwordHash = passwordHash;
        user.updatedAt = new Date();
        return user;
      }
    }
    throw err;
  }
}

function setRefreshCookie(res: any, token: string) {
  if (res && typeof res.setCookie === "function") {
    res.setCookie("refreshToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  }
}

function clearRefreshCookie(res: any) {
  if (res && typeof res.clearCookie === "function") {
    res.clearCookie("refreshToken", {
      path: "/",
    });
  }
}

export const authRouter = router({
  signup: publicProcedure
    .input(SignupInputSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await findUserByEmail(input.email);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await createUser({
        email: input.email,
        name: input.name,
        passwordHash,
        role: "STAFF",
      });

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      setRefreshCookie(ctx.res, refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
      };
    }),

  login: publicProcedure
    .input(LoginInputSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await findUserByEmail(input.email);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      setRefreshCookie(ctx.res, refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
      };
    }),

  refresh: publicProcedure.mutation(async ({ ctx }) => {
    const rawCookie = ctx.req.headers.cookie;
    let refreshToken: string | undefined;

    if (rawCookie) {
      const match = rawCookie.match(/refreshToken=([^;]+)/);
      if (match) {
        refreshToken = match[1];
      }
    }

    if (!refreshToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No refresh token provided",
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired refresh token",
      });
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User no longer exists",
      });
    }

    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }),

  requestOtp: publicProcedure
    .input(RequestOtpInputSchema)
    .mutation(async ({ input }) => {
      const user = await findUserByEmail(input.email);

      if (!user) {
        return {
          success: true,
          message: "If an account exists with this email, a verification code was sent.",
        };
      }

      const otp = generateOtp();
      await otpStore.setOtp(user.email, otp, 600);
      await sendOtpEmail(user.email, otp);

      return {
        success: true,
        message: "A 6-digit verification code has been sent to your email address.",
      };
    }),

  resetPassword: publicProcedure
    .input(ResetPasswordInputSchema)
    .mutation(async ({ input }) => {
      const storedOtp = await otpStore.getOtp(input.email);

      if (!storedOtp || storedOtp !== input.otp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification code",
        });
      }

      const user = await findUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 10);
      await updateUserPassword(input.email, passwordHash);
      await otpStore.delOtp(input.email);

      return {
        success: true,
        message: "Password reset successful. You may now log in with your new password.",
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await findUserById(ctx.user.userId);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    clearRefreshCookie(ctx.res);
    return { success: true };
  }),
});
