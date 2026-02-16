import apiClient from "./services.js";

export default {
  // User Management
  getAllUsers() {
    return apiClient.get("/admin/users");
  },
  
  getUserById(id) {
    return apiClient.get(`/admin/users/${id}`);
  },
  
  createUser(userData) {
    return apiClient.post("/admin/users", userData);
  },
  
  updateUser(id, userData) {
    return apiClient.put(`/admin/users/${id}`, userData);
  },
  
  deleteUser(id) {
    return apiClient.delete(`/admin/users/${id}`);
  },
};