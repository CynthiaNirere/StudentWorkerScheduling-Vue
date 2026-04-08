import axios from "axios";
import Utils from "../config/utils.js";
import Router from "../router.js";

var baseurl = import.meta.env.VITE_APP_API_URL;
if (!baseurl) {
  if (import.meta.env.DEV) {
    baseurl = "http://localhost:3131/workerscheduling-t1/api/";
  } else {
    baseurl = "https://workerscheduling.eaglesoftwareteam.com/workerscheduling-t1/api/";
  }
}

console.log("API Base URL:", baseurl);

const apiClient = axios.create({
  baseURL: baseurl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// ── REQUEST INTERCEPTOR ───────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const user = Utils.getStore("user");

    // ✅ isGuest is only valid when there is NO real logged-in user
    // If a user object exists in storage, ignore the isGuest flag entirely
    const isGuest = localStorage.getItem('isGuest') === 'true' && !user;

    // ✅ If user exists but isGuest is still set (stale), clean it up
    if (user && localStorage.getItem('isGuest') === 'true') {
      console.log('🧹 Clearing stale isGuest flag — real user found');
      localStorage.removeItem('isGuest');
    }

    // Public endpoints — no auth headers needed
    const publicEndpoints = ['/auth/login', '/auth/logout', '/auth/register'];
    const isPublicEndpoint = publicEndpoints.some(ep => config.url?.includes(ep));

    if (isPublicEndpoint) {
      return config;
    }

    if (user && !isGuest) {
      // ✅ Token is stored inside the user object — not as a separate key
      const token = user.token;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const userId    = user.user_id || user.userId || user.id;
      const userEmail = user.email;
      const userRole  = user.role;

      if (userId && userEmail) {
        config.headers['x-user-id']    = userId;
        config.headers['x-user-email'] = userEmail;
        config.headers['x-user-role']  = userRole;

        console.log('✅ Auth headers added:', { userId, email: userEmail, role: userRole, hasToken: !!token });
      } else {
        console.warn('⚠️ User object exists but missing userId or email');
      }
    } else if (isGuest) {
      config.headers['x-demo-mode'] = 'true';
      console.log('👁️ Guest mode — demo header added');
    } else {
      console.log('ℹ️ No auth — public or login request');
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ── RESPONSE INTERCEPTOR ──────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const user    = Utils.getStore("user");
      const isGuest = localStorage.getItem('isGuest') === 'true';

      if (!isGuest && !user) {
        console.log('❌ 401 Unauthorized — redirecting to login');
        Utils.removeItem("user");
        Router.push({ name: "login" });
      } else {
        console.log('❌ 401 in guest/public mode — not redirecting');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;