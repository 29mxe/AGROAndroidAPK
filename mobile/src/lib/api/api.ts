import { fetch } from "expo/fetch";
import { authClient } from "../auth/auth-client";

// Response envelope - all app routes return { data: T }, errors return { error: { message, code } }
interface ApiResponse<T> {
  data: T;
  error?: { message: string; code: string };
}

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

const request = async <T>(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<T> => {
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      // Cookies are not sent automatically in React Native — attach them manually
      Cookie: await authClient.getCookie(),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json: ApiResponse<T> = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || "Что-то пошло не так");
    }
    return json.data;
  }

  if (!response.ok) {
    throw new Error("Что-то пошло не так");
  }
  return undefined as T;
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: any) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(url: string, body: any) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  patch: <T>(url: string, body: any) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
};
