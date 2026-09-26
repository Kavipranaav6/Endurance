import { create } from "zustand";
import { trpcCall } from "./api";
import {
  SignupInput,
  LoginInput,
  ResetPasswordInput,
  User,
} from "@stocksense/schemas";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (data: LoginInput) => Promise<void>;
  signup: (data: SignupInput) => Promise<void>;
  requestOtp: (email: string) => Promise<string>;
  resetPassword: (data: ResetPasswordInput) => Promise<string>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem("stocksense_token"),
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: async () => {
    set({ isLoading: true });
    const storedToken = localStorage.getItem("stocksense_token");

    // Try refreshing or getting profile
    try {
      if (storedToken) {
        const { user } = await trpcCall<{ user: User }>(
          "auth.me",
          "query",
          undefined,
          storedToken
        );
        set({
          user,
          accessToken: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      // Try cookie-based refresh
      const refreshed = await trpcCall<{ accessToken: string; user: User }>(
        "auth.refresh",
        "mutation"
      );
      if (refreshed?.accessToken) {
        localStorage.setItem("stocksense_token", refreshed.accessToken);
        set({
          user: refreshed.user,
          accessToken: refreshed.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch {
      localStorage.removeItem("stocksense_token");
      set({ user: null, accessToken: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (data: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await trpcCall<{ accessToken: string; user: User }>(
        "auth.login",
        "mutation",
        data
      );
      localStorage.setItem("stocksense_token", res.accessToken);
      set({
        user: res.user,
        accessToken: res.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to log in", isLoading: false });
      throw err;
    }
  },

  signup: async (data: SignupInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await trpcCall<{ accessToken: string; user: User }>(
        "auth.signup",
        "mutation",
        data
      );
      localStorage.setItem("stocksense_token", res.accessToken);
      set({
        user: res.user,
        accessToken: res.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to sign up", isLoading: false });
      throw err;
    }
  },

  requestOtp: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await trpcCall<{ success: boolean; message: string }>(
        "auth.requestOtp",
        "mutation",
        { email }
      );
      set({ isLoading: false });
      return res.message;
    } catch (err: any) {
      set({ error: err.message || "Failed to request verification code", isLoading: false });
      throw err;
    }
  },

  resetPassword: async (data: ResetPasswordInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await trpcCall<{ success: boolean; message: string }>(
        "auth.resetPassword",
        "mutation",
        data
      );
      set({ isLoading: false });
      return res.message;
    } catch (err: any) {
      set({ error: err.message || "Failed to reset password", isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await trpcCall("auth.logout", "mutation", {}, get().accessToken);
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("stocksense_token");
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
