import apiClient from "./services.js";

export default {

  // SHIFTS

  getAllShifts(){
    return apiClient.get("/shifts");
  },

  getShiftsByWeek(startDate, endDate) {
    return apiClient.get(`/shifts?startDate=${startDate}&endDate=${endDate}`);
  },

  getShiftsByLocation(locationId) {
    return apiClient.get(`/shifts?locationId=${locationId}`);
  },

  getShiftById(id) {
    return apiClient.get(`/shifts/${id}`);
  },

  createShift(shift) {
    return apiClient.post("/shifts", shift);
  },

  updateShift(id, shift) {
    return apiClient.put(`/shifts/${id}`, shift);
  },

  deleteShift(id) {
    return apiClient.delete(`/shifts/${id}`);
  },

  assignUserToShift(id, userId) {
    return apiClient.put(`/shifts/${id}/assign`, { userId });
  },

  publishShift(id) {
    return apiClient.put(`/shifts/${id}/publish`);
  },

  // NOTIFICATIONS

  getAllNotifications() {
    return apiClient.get("/notifications");
  },

  createNotification(notification) {
    return apiClient.post("/notifications", notification);
  },

  markNotificationRead(id) {
    return apiClient.put(`/notifications/${id}/read`);
  },

  deleteNotification(id) {
    return apiClient.delete(`/notifications/${id}`);
  },

 
  // SHIFT SWAP REQUESTS


  getAllShiftSwapRequests() {
    return apiClient.get("/shift-swaps");
  },

  getPendingSwapRequests() {
    return apiClient.get("/shift-swaps?status=pending");
  },

  getSwapRequestById(id) {
    return apiClient.get(`/shift-swaps/${id}`);
  },

  approveSwapRequest(id) {
    return apiClient.put(`/shift-swaps/${id}/approve`);
  },

  rejectSwapRequest(id) {
    return apiClient.put(`/shift-swaps/${id}/reject`);
  },

  // TIME OFF REQUESTS

  getAllTimeOffRequests() {
    return apiClient.get("/time-off-requests");
  },

  getPendingTimeOffRequests() {
    return apiClient.get("/time-off-requests?status=pending");
  },

  getTimeOffRequestById(id) {
    return apiClient.get(`/time-off-requests/${id}`);
  },

  approveTimeOffRequest(id) {
    return apiClient.put(`/time-off-requests/${id}/approve`);
  },

  denyTimeOffRequest(id) {
    return apiClient.put(`/time-off-requests/${id}/deny`);
  },

  deleteTimeOffRequest(id) {
    return apiClient.delete(`/time-off-requests/${id}`);
  },

  // EMPLOYEES (USERS)

  getAllEmployees() {
    return apiClient.get("/users");
  },

  getEmployeeById(id) {
    return apiClient.get(`/users/${id}`);
  },

  createEmployee(employee) {
    return apiClient.post("/users", employee);
  },

  updateEmployee(id, employee) {
    return apiClient.put(`/users/${id}`, employee);
  },

  deleteEmployee(id) {
    return apiClient.delete(`/users/${id}`);
  },

  
  // AVAILABILITY

  getAllAvailability() {
    return apiClient.get("/availability");
  },

  getAvailabilityByUser(userId) {
    return apiClient.get(`/availability?userId=${userId}`);
  },

  createAvailability(availability) {
    return apiClient.post("/availability", availability);
  },

  updateAvailability(id, availability) {
    return apiClient.put(`/availability/${id}`, availability);
  },

  deleteAvailability(id) {
    return apiClient.delete(`/availability/${id}`);
  },

  // TASK LISTS

  getAllTaskLists() {
    return apiClient.get("/task-lists");
  },

  getTaskListById(id) {
    return apiClient.get(`/task-lists/${id}`);
  },

  createTaskList(taskList) {
    return apiClient.post("/task-lists", taskList);
  },

  updateTaskList(id, taskList) {
    return apiClient.put(`/task-lists/${id}`, taskList);
  },

  deleteTaskList(id) {
    return apiClient.delete(`/task-lists/${id}`);
  },

  completeTaskList(id) {
    return apiClient.put(`/task-lists/${id}/complete`);
  },

  archiveTaskList(id) {
    return apiClient.put(`/task-lists/${id}/archive`);
  },

  // TASK LIST ITEMS

  getAllTaskItems() {
    return apiClient.get("/task-list-items");
  },

  getTaskItemsByList(tasklistId) {
    return apiClient.get(`/task-list-items?tasklistId=${tasklistId}`);
  },

  createTaskItem(item) {
    return apiClient.post("/task-list-items", item);
  },

  updateTaskItem(id, item) {
    return apiClient.put(`/task-list-items/${id}`, item);
  },

  deleteTaskItem(id) {
    return apiClient.delete(`/task-list-items/${id}`);
  },

  completeTaskItem(id) {
    return apiClient.put(`/task-list-items/${id}/complete`);
  },

  reorderTaskItems(items) {
    return apiClient.put("/task-list-items/reorder", { items });
  },

  // BUSINESS AREAS (LOCATIONS)

  getAllLocations() {
    return apiClient.get("/business-areas");
  },

  getLocationById(id) {
    return apiClient.get(`/business-areas/${id}`);
  },

  // JOB ROLES

  getAllJobRoles() {
    return apiClient.get("/job-roles");
  },

  getJobRoleById(id) {
    return apiClient.get(`/job-roles/${id}`);
  },

  // CLOCK IN/OUT

  getAllClockRecords() {
    return apiClient.get("/clock-records");
  },

  approveClockRecord(id) {
    return apiClient.put(`/clock-records/${id}/approve`);
  },

};