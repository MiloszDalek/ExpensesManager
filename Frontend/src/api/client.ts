import axios, {AxiosError, type InternalAxiosRequestConfig} from "axios";

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

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;    
});


client.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem("access_token", data.access_token);
        return client(originalRequest);
      } catch (refreshError) {
        // logout if refresh token also does not work
        localStorage.removeItem("access_token");
        window.location.href = "/login";
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
