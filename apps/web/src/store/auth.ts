import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken?: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, user, refreshToken) => {
        localStorage.setItem("unilib_token", token);
        if (refreshToken) localStorage.setItem("unilib_refresh_token", refreshToken);
        set({ token, user, refreshToken: refreshToken ?? null });
      },
      setTokens: (token, refreshToken) => {
        localStorage.setItem("unilib_token", token);
        if (refreshToken) localStorage.setItem("unilib_refresh_token", refreshToken);
        set({ token, refreshToken: refreshToken ?? null });
      },
      logout: () => {
        localStorage.removeItem("unilib_token");
        localStorage.removeItem("unilib_refresh_token");
        set({ token: null, refreshToken: null, user: null });
      },
    }),
    { name: "unilib-auth" },
  ),
);
