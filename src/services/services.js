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

// ✅ UPDATED REQUEST INTERCEPTOR - Attach auth headers
apiClient.interceptors.request.use(
  (config) => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const user = Utils.getStore("user");
    
    // ✅ ADD DEBUG LOGGING
    console.log('🔍 Request interceptor - User object:', user);
    console.log('🔍 Request interceptor - isGuest:', isGuest);
    
    // If logged-in user, add auth headers
    if (user && !isGuest) {
      // Check for token in multiple places
      const token = user.token || 
                   localStorage.getItem('token') || 
                   localStorage.getItem('authToken');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // ✅ IMPROVED: Handle different user object structures
      const userId = user.user_id || user.userId || user.id;
      const userEmail = user.email;
      const userRole = user.role;
      
      // Only add headers if we have valid data
      if (userId && userEmail) {
        config.headers['x-user-id'] = userId;
        config.headers['x-user-email'] = userEmail;
        config.headers['x-user-role'] = userRole;
        
        console.log('✅ Auth headers added:', {
          userId,
          email: userEmail,
          role: userRole,
          hasToken: !!token
        });
      } else {
        console.error('❌ Missing user ID or email!', { userId, userEmail, userRole });
      }
    }
    // If guest mode, add demo header
    else if (isGuest) {
      config.headers['x-demo-mode'] = 'true';
      console.log('👁️ Guest mode - demo header added');
    } else {
      console.warn('⚠️ No user and not guest mode!');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR - Handle unauthorized errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't redirect if in guest mode
      const isGuest = localStorage.getItem('isGuest') === 'true';
      if (!isGuest) {
        console.log('❌ 401 Unauthorized - redirecting to login');
        // Unauthorized - clear user and redirect to login
        Utils.removeItem("user");
        Router.push({ name: "login" });
      } else {
        console.log('❌ 401 in guest mode - not redirecting');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;