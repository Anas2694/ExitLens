import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000",
  withCredentials: true, // ✅ Required for httpOnly cookie auth
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Response interceptor: handle 401 globally ─────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired or missing — redirect to login
     if (window.location.pathname !== "/") {
  window.location.href = "/";
}
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  regenerateKey: () => api.post("/auth/regenerate-key"),
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionsApi = {
  list: (params) => api.get("/sessions", { params }),
  get: (id) => api.get(`/sessions/${id}`),
  stats: (params) => api.get("/sessions/stats", { params }),
};

// ── Insights ──────────────────────────────────────────────────────────────────
export const insightsApi = {
  list: (params) => api.get("/insights", { params }),
  get: (sessionId) => api.get(`/insights/${sessionId}`),
  generate: (sessionId) => api.post("/insights/generate", { sessionId }),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: ()                    => api.get("/projects"),
  create: (data)              => api.post("/projects", data),
  get: (id)                   => api.get(`/projects/${id}`),
  update: (id, data)          => api.put(`/projects/${id}`, data),
  delete: (id)                => api.delete(`/projects/${id}`),
  regenerateKey: (id)         => api.post(`/projects/${id}/regenerate-key`),
  stats: (id)                 => api.get(`/projects/${id}/stats`),
  addGoal: (id, data)         => api.post(`/projects/${id}/goals`, data),
  deleteGoal: (id, goalId)    => api.delete(`/projects/${id}/goals/${goalId}`),
};

export default api;
