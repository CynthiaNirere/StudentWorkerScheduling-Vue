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

// ✅ FIXED REQUEST INTERCEPTOR - Allow public endpoints
apiClient.interceptors.request.use(
  (config) => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const user = Utils.getStore("user");
    
    console.log('🔍 Request interceptor - URL:', config.url);
    console.log('🔍 Request interceptor - User object:', user);
    console.log('🔍 Request interceptor - isGuest:', isGuest);
    
    // ✅ CRITICAL: Allow login/logout requests WITHOUT auth headers
    const publicEndpoints = ['/auth/login', '/auth/logout', '/auth/register'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (isPublicEndpoint) {
      console.log('✅ Public endpoint - allowing request without auth headers');
      return config;
    }
    
    // For protected endpoints, add auth headers if user exists
    if (user && !isGuest) {
      const token = user.token || 
                   localStorage.getItem('token') || 
                   localStorage.getItem('authToken');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      const userId = user.user_id || user.userId || user.id;
      const userEmail = user.email;
      const userRole = user.role;
      
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
        console.warn('⚠️ Missing user ID or email for protected endpoint');
      }
    }
    else if (isGuest) {
      config.headers['x-demo-mode'] = 'true';
      console.log('👁️ Guest mode - demo header added');
    } else {
      console.log('ℹ️ No auth - assuming public or login request');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
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
      const isGuest = localStorage.getItem('isGuest') === 'true';
      if (!isGuest) {
        console.log('❌ 401 Unauthorized - redirecting to login');
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