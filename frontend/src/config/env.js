const getEnv = (key, defaultValue) => {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value;
};

// Helper to sanitize URL to prevent double slashes
const cleanUrl = (url) => {
  if (!url) return '';
  return url.replace(/([^:]\/)\/+/g, '$1');
};

const rawApiUrl = getEnv('VITE_API_URL', 'http://localhost:3000/api');
const rawSocketUrl = getEnv('VITE_SOCKET_URL', 'http://localhost:3000');
const rawPublicAppUrl = getEnv('VITE_PUBLIC_APP_URL', 'http://localhost:5173');

const env = {
  apiUrl: cleanUrl(rawApiUrl),
  socketUrl: cleanUrl(rawSocketUrl),
  publicAppUrl: cleanUrl(rawPublicAppUrl),
};

export default env;
