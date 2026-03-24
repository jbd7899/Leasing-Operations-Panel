import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";

export const AUTH_TOKEN_KEY = "auth_session_token";

export function initApiClient() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    setBaseUrl(`https://${domain}`);
  }
  setAuthTokenGetter(() => SecureStore.getItemAsync(AUTH_TOKEN_KEY));
}

const BASE = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : `http://localhost:8080/api`;
};

async function authHeaders(): Promise<HeadersInit> {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE()}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...((options.headers as Record<string, string>) ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await apiFetch(path);
    return res.json();
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
    return res.json();
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
    return res.json();
  },
  async del<T>(path: string): Promise<T> {
    const res = await apiFetch(path, { method: "DELETE" });
    return res.json();
  },

  prospects: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params)}` : "";
      return api.get<{ prospects: import("../constants/types").Prospect[]; total: number }>(
        `/prospects${qs}`,
      );
    },
    get: (id: string) =>
      api.get<{
        prospect: import("../constants/types").Prospect;
        interactions: import("../constants/types").Interaction[];
        notes: import("../constants/types").Note[];
        tags: import("../constants/types").Tag[];
      }>(`/prospects/${id}`),
    update: (id: string, body: Partial<import("../constants/types").Prospect>) =>
      api.patch<import("../constants/types").Prospect>(`/prospects/${id}`, body),
    addNote: (id: string, body: string) =>
      api.post<import("../constants/types").Note>(`/prospects/${id}/notes`, { body }),
    setTags: (id: string, tagIds: string[]) =>
      api.post<{ tags: import("../constants/types").Tag[] }>(`/prospects/${id}/tags`, { tagIds }),
  },

  inbox: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params)}` : "";
      return api.get<{ items: import("../constants/types").InboxItem[]; total: number }>(
        `/inbox${qs}`,
      );
    },
  },

  properties: {
    list: () => api.get<{ properties: import("../constants/types").Property[] }>("/properties"),
    create: (body: { name: string; address1?: string; city?: string; state?: string; zip?: string }) =>
      api.post<import("../constants/types").Property>("/properties", body),
    update: (id: string, body: Partial<import("../constants/types").Property>) =>
      api.patch<import("../constants/types").Property>(`/properties/${id}`, body),
  },

  twilioNumbers: {
    list: () => api.get<{ twilioNumbers: import("../constants/types").TwilioNumber[] }>("/twilio-numbers"),
  },

  users: {
    list: () => api.get<{ users: import("../constants/types").AccountUser[] }>("/users"),
  },

  tags: {
    list: () => api.get<{ tags: import("../constants/types").Tag[] }>("/tags"),
    create: (name: string, color?: string) =>
      api.post<import("../constants/types").Tag>("/tags", { name, color }),
  },

  exports: {
    create: (prospectIds: string[], format: "csv" | "json") =>
      api.post<import("../constants/types").ExportBatch>("/exports", { prospectIds, format }),
    list: () => api.get<{ exports: import("../constants/types").ExportBatch[] }>("/exports"),
    downloadUrl: (id: string) => `${BASE()}/exports/${id}/download`,
  },

  auth: {
    user: () =>
      api.get<{
        user: {
          id: string;
          email?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        } | null;
      }>("/auth/user"),
  },
};
