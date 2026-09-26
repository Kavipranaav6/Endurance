import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

class RedisOtpService {
  private client: Redis | null = null;
  private isConnected = false;
  private memoryStore = new Map<string, { otp: string; expiresAt: number }>();

  constructor() {
    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // don't spam retries if offline
        lazyConnect: true,
      });

      this.client.connect().then(() => {
        this.isConnected = true;
        console.log("Redis connected successfully for OTP store");
      }).catch(() => {
        console.warn("Redis unavailable, falling back to memory store for OTPs");
        this.isConnected = false;
      });

      this.client.on("error", () => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
    }
  }

  async setOtp(email: string, otp: string, ttlSeconds = 600): Promise<void> {
    const key = `otp:${email.toLowerCase()}`;
    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, otp, "EX", ttlSeconds);
        return;
      } catch (err) {
        console.warn("Redis set failed, falling back to memory store", err);
      }
    }
    this.memoryStore.set(key, {
      otp,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async getOtp(email: string): Promise<string | null> {
    const key = `otp:${email.toLowerCase()}`;
    if (this.isConnected && this.client) {
      try {
        const val = await this.client.get(key);
        if (val) return val;
      } catch (err) {
        console.warn("Redis get failed, falling back to memory store", err);
      }
    }
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.otp;
  }

  async delOtp(email: string): Promise<void> {
    const key = `otp:${email.toLowerCase()}`;
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // fallback
      }
    }
    this.memoryStore.delete(key);
  }
}

export const otpStore = new RedisOtpService();
