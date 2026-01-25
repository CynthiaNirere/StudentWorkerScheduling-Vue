import apiClient from "./services.js";

export default {
  // Get all users
  getAllUsers() {
    return apiClient.get("/users");
  },
  
  // Get user by ID
  getUser(id) {
    return apiClient.get(`/users/${id}`);  
  },
  
  // Create new user
  createUser(user) {
    return apiClient.post("/users", user);
  },
  
  // Update user
  updateUser(id, user) {
    return apiClient.put(`/users/${id}`, user);  
  },
  
  // Delete user
  deleteUser(id) {
    return apiClient.delete(`/users/${id}`);  
  }
};