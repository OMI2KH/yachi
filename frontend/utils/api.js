import axios from "axios";

// Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Attach token to every request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (import.meta.env.DEV) console.log(`[API REQUEST] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Global error handling
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) console.log(`[API RESPONSE]`, response);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth"; // redirect if token expired
    }
    const message =
      error.response?.data?.message || error.message || "An unknown error occurred";
    return Promise.reject(new Error(message));
  }
);

// --- Auth ---
export const login = async (email, password) => {
  const res = await api.post("/auth/login", { email, password });
  if (res.data.token) localStorage.setItem("token", res.data.token);
  return res.data;
};

export const register = async (userData) => {
  const res = await api.post("/auth/register", userData);
  return res.data;
};

// --- User ---
export const getMe = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

export const getUserProfile = async (userId) => {
  const res = await api.get(`/users/${userId}`);
  return res.data;
};

export const updateUserProfile = async (userId, data) => {
  const res = await api.put(`/users/${userId}`, data);
  return res.data;
};

// --- Products ---
export const getProducts = async (params = {}) => {
  const res = await api.get("/products", { params });
  return res.data;
};

export const getProductById = async (id) => {
  const res = await api.get(`/products/${id}`);
  return res.data;
};

// --- Transactions ---
export const createTransaction = async ({ productId, paymentMethod, customerName, customerPhone }) => {
  const res = await api.post("/transactions/create", {
    productId,
    paymentMethod,
    customerName,
    customerPhone,
  });
  return res.data;
};

// --- Payments ---
export const payWithTelebirr = async (transactionId) => {
  const res = await api.post(`/payments/telebirr`, { transactionId });
  return res.data;
};

export const payWithCBE = async (transactionId) => {
  const res = await api.post(`/payments/cbe`, { transactionId });
  return res.data;
};

export const payWithEasyCash = async (transactionId) => {
  const res = await api.post(`/payments/easycash`, { transactionId });
  return res.data;
};

export default api;

