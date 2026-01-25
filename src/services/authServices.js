import apiClient from "./services.js"; 

export default {
  loginUser(user) {
    return apiClient.post("auth/login", user);
  },
  authorizeUser(code) {
    return apiClient.post("auth/authorize", code);
  },
  logoutUser(token) {
    return apiClient.post("auth/logout", token);
  },
};