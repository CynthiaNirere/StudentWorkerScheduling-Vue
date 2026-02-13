import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/business-areas");
  },
  
  getById(id) {
    return apiClient.get(`/business-areas/${id}`);
  },
  
  create(data) {
    return apiClient.post("/business-areas", data);
  },
  
  update(id, data) {
    return apiClient.put(`/business-areas/${id}`, data);
  },
  
  delete(id) {
    return apiClient.delete(`/business-areas/${id}`);
  },
};