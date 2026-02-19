import apiClient from "./services.js";

export default {
  loginUser(user) {
    return apiClient.post("auth/login", user)
      .then(response => {
        console.log("AuthService - Full response:", response);
        console.log("AuthService - Response data:", response.data);
        return response.data;
      });
  },
  
  authorizeUser(code) {
    return apiClient.post("auth/authorize", code)
      .then(response => response.data);
  },
  
  logoutUser(token) {
    return apiClient.post("auth/logout", token)
      .then(response => response.data);
  },
  
  signUp(userData) {
    return apiClient.post("auth/signup", userData)
      .then(response => response.data);
  }
};