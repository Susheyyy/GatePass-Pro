export function resolveApiConfig({ baseUrl, legacyUrl, production = false, origin = 'http://localhost:5173' } = {}) {
  const configured = baseUrl || legacyUrl;
  if (production && !configured) throw new Error('Configure VITE_API_BASE_URL before building for production');
  const input = (configured || 'http://localhost:5000/api').replace(/\/+$/, '').replace(/\/residents$/, '');
  if (!/^https?:\/\//.test(input) && !/^\/(?!\/)/.test(input)) throw new Error('API base must be an HTTP(S) URL or an absolute same-origin path');
  const parsed = new URL(input, origin);
  if (parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error('API base must not contain query parameters, fragments or credentials');
  return { base: parsed.href.replace(/\/$/, ''), socketOrigin: parsed.origin };
}

const config = resolveApiConfig({ baseUrl: import.meta.env?.VITE_API_BASE_URL, legacyUrl: import.meta.env?.VITE_API_URL, production: import.meta.env?.PROD, origin: globalThis.location?.origin });
export const apiEndpoint = resource => `${config.base}/${resource}`;
export const socketOrigin = config.socketOrigin;
