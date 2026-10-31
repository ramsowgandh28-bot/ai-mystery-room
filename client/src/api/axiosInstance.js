import axios from 'axios';

// Custom API Error class preserving backend machine code, HTTP status, and safe public message (§14.2 & §14.4)
export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code || 'INTERNAL_SERVER_ERROR';
    this.status = status || 500;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 180000, // 180s (3m) for Gemini AI generation & server spin-up
});

// Request interceptor: attach session token for case-specific routes
api.interceptors.request.use((config) => {
  // Extract caseId from URL if present (e.g., /cases/64f3a.../clues/clue_1/discover)
  const match = config.url?.match(/\/cases\/([a-f0-9]{24})/);
  if (match) {
    const caseId = match[1];
    const token = localStorage.getItem(`mystery_token_${caseId}`);
    if (token) {
      config.headers['X-Session-Token'] = token;
    }
  }
  return config;
});

// Response interceptor: unwraps data on success; rejects with structured ApiError on failure
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    const status = error.response?.status || (error.code === 'ECONNABORTED' ? 504 : 500);
    const message =
      data?.error ||
      (error.code === 'ECONNABORTED'
        ? 'Mystery generation timed out. The AI server took longer than expected. Please try again.'
        : error.message || 'An unexpected error occurred.');
    const code =
      data?.code ||
      (error.code === 'ECONNABORTED'
        ? 'GATEWAY_TIMEOUT'
        : status === 429
        ? 'RATE_LIMIT_EXCEEDED'
        : 'INTERNAL_SERVER_ERROR');

    const apiError = new ApiError(message, code, status);

    // Global navigational triggers (§14.2 & §14.4)
    if (code === 'MISSING_SESSION_TOKEN' || code === 'INVALID_SESSION_TOKEN') {
      const match = error.config?.url?.match(/\/cases\/([a-f0-9]{24})/);
      if (match) {
        localStorage.removeItem(`mystery_token_${match[1]}`);
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        sessionStorage.setItem('flash_toast', 'Session expired or invalid. Please start a new mystery.');
        window.location.href = '/';
      }
    } else if (code === 'CASE_ALREADY_COMPLETED') {
      const match = error.config?.url?.match(/\/cases\/([a-f0-9]{24})/);
      if (match && typeof window !== 'undefined' && !window.location.pathname.includes('/result')) {
        window.location.href = `/cases/${match[1]}/result`;
      }
    } else if (code === 'CASE_NOT_FOUND') {
      const match = error.config?.url?.match(/\/cases\/([a-f0-9]{24})/);
      if (match) {
        localStorage.removeItem(`mystery_token_${match[1]}`);
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        sessionStorage.setItem('flash_toast', 'This mystery has expired or does not exist.');
        window.location.href = '/';
      }
    }

    return Promise.reject(apiError);
  }
);

export default api;
