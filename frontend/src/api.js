import { mockApi } from "./mockApi";

export const ADMIN_ACCESS = Boolean(import.meta.env.ADMIN);
export const MOCK = import.meta.env.VITE_MOCK === "1" || ADMIN_ACCESS;

export async function api(path, opts = {}) {
  if (MOCK) return mockApi(path, opts);
  const { method = "GET", body } = opts;
  const token = localStorage.getItem("vc_token");
  const r = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.detail || "Erro inesperado");
    e.status = r.status;
    throw e;
  }
  return data;
}
