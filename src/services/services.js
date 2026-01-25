import axios from "axios";
import Utils from "../config/utils.js";
import Router from "../router.js";

// Use environment variable for API URL
var baseurl = import.meta.env.VITE_APP_API_URL;

// Fallback logic
if (!baseurl) {
  if (import.meta.env.DEV) {
    baseurl = "http://localhost:3121/tracker-t1/api/";
  } else {
    baseurl = "https://project3.eaglesoftwareteam.com/tracker-t1/api/";
  }
}

console.log("API Base URL:", baseurl); // DEBUG: Remove this later

const apiClient = axios.create({
  baseURL: baseurl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// REQUEST INTERCEPTOR - Attach token to every request
apiClient.interceptors.request.use(
  (config) => {
    const user = Utils.getStore("user");
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
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
      // Unauthorized - clear user and redirect to login
      Utils.removeItem("user");
      Router.push({ name: "login" });
    }
    return Promise.reject(error);
  }
);

export default apiClient;