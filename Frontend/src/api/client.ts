import axios, {AxiosError, AxiosHeaders, type InternalAxiosRequestConfig} from "axios";

type RefreshResponse = {
  access_token: string;
};

const extractApiErrorMessage = (error: AxiosError): string | null => {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim().length > 0) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const detail = payload.detail;

  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const validationMessages = detail
      .map((item) => {
        if (item && typeof item === "object") {
          const message = (item as Record<string, unknown>).msg;
          return typeof message === "string" ? message : null;
        }
        return null;
      })
      .filter((message): message is string => Boolean(message));

    if (validationMessages.length > 0) {
      return validationMessages.join("; ");
    }
  }

  const message = payload.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return null;
};

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;
let isRedirectingToLogin = false;

const triggerLogoutRedirect = () => {
  localStorage.removeItem("access_token");
  delete client.defaults.headers.common.Authorization;

  if (!isRedirectingToLogin) {
    isRedirectingToLogin = true;
    window.location.href = "/login";
  }
};

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<RefreshResponse>(
        import.meta.env.VITE_API_URL + "/auth/refresh",
        {},
        { withCredentials: true }
      )
      .then(({ data }) => {
        if (!data?.access_token) {
          throw new Error("Missing access token in refresh response");
        }

        localStorage.setItem("access_token", data.access_token);
        client.defaults.headers.common.Authorization = "Bearer " + data.access_token;
        return data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;    
});


client.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url ?? "";
    const isRefreshEndpoint = requestUrl.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const refreshedToken = await refreshAccessToken();

        const headers = AxiosHeaders.from(originalRequest.headers);
        headers.set("Authorization", "Bearer " + refreshedToken);
        originalRequest.headers = headers;

        return client(originalRequest);
      } catch (refreshError) {
        triggerLogoutRedirect();
        return Promise.reject(refreshError);
      }
    }

    const apiMessage = extractApiErrorMessage(error);
    if (apiMessage) {
      error.message = apiMessage;
    }

    return Promise.reject(error);
  }
);

export default client;
