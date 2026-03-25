import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
});

let refreshRequest: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("unilib_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as { _retry?: boolean; headers?: Record<string, string> };
    const refreshToken = localStorage.getItem("unilib_refresh_token");

    if (!error.response || error.response.status !== 401 || originalRequest?._retry || !refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshRequest) {
      refreshRequest = axios
        .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
        .then((res) => {
          const newAccessToken = res.data?.token as string | undefined;
          const newRefreshToken = res.data?.refreshToken as string | undefined;

          if (!newAccessToken) return null;

          localStorage.setItem("unilib_token", newAccessToken);
          if (newRefreshToken) localStorage.setItem("unilib_refresh_token", newRefreshToken);

          return newAccessToken;
        })
        .catch(() => {
          localStorage.removeItem("unilib_token");
          localStorage.removeItem("unilib_refresh_token");
          return null;
        })
        .finally(() => {
          refreshRequest = null;
        });
    }

    const newToken = await refreshRequest;
    if (!newToken) return Promise.reject(error);

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  },
);
