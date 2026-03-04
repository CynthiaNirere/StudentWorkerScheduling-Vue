import apiClient from "./services.js";

// ✅ ADDED: Helper to add demo header when in guest mode
const addDemoHeader = (config = {}) => {
  const isGuest = localStorage.getItem('isGuest') === 'true';
  
  if (isGuest) {
    return {
      ...config,
      headers: {
        ...config.headers,
        'x-demo-mode': 'true'
      }
    };
  }
  
  return config;
};

export default {

  // SHIFTS

  getAllShifts(){
    return apiClient.get("/shifts", addDemoHeader());
  },

  getShiftsByWeek(startDate, endDate) {
    return apiClient.get(`/shifts?startDate=${startDate}&endDate=${endDate}`, addDemoHeader());
  },

  getShiftsByLocation(locationId) {
    return apiClient.get(`/shifts?locationId=${locationId}`, addDemoHeader());
  },

  getShiftById(id) {
    return apiClient.get(`/shifts/${id}`, addDemoHeader());
  },

  createShift(shift) {
    return apiClient.post("/shifts", shift, addDemoHeader());
  },

  updateShift(id, shift) {
    return apiClient.put(`/shifts/${id}`, shift, addDemoHeader());
  },

  deleteShift(id) {
    return apiClient.delete(`/shifts/${id}`, addDemoHeader());
  },

  assignUserToShift(id, userId) {
    return apiClient.put(`/shifts/${id}/assign`, { userId }, addDemoHeader());
  },

  publishShift(id) {
    return apiClient.put(`/shifts/${id}/publish`, {}, addDemoHeader());
  },

  // NOTIFICATIONS

  getAllNotifications() {
    return apiClient.get("/notifications", addDemoHeader());
  },

  createNotification(notification) {
    return apiClient.post("/notifications", notification, addDemoHeader());
  },

  markNotificationRead(id) {
    return apiClient.put(`/notifications/${id}/read`, {}, addDemoHeader());
  },

  deleteNotification(id) {
    return apiClient.delete(`/notifications/${id}`, addDemoHeader());
  },

 
  // SHIFT SWAP REQUESTS

  getAllShiftSwapRequests() {
    return apiClient.get("/shift-swap-requests", addDemoHeader());
  },

  getPendingSwapRequests() {
    return apiClient.get("/shift-swap-requests?status=pending", addDemoHeader());
  },

  getSwapRequestById(id) {
    return apiClient.get(`/shift-swap-requests/${id}`, addDemoHeader());
  },

  approveSwapRequest(id) {
    return apiClient.put(`/shift-swap-requests/${id}/approve`, {}, addDemoHeader());
  },

  rejectSwapRequest(id) {
    return apiClient.put(`/shift-swap-requests/${id}/reject`, {}, addDemoHeader());
  },

  // TIME OFF REQUESTS

  getAllTimeOffRequests() {
    return apiClient.get("/time-off-requests", addDemoHeader());
  },

  getPendingTimeOffRequests() {
    return apiClient.get("/time-off-requests?status=pending", addDemoHeader());
  },

  getTimeOffRequestById(id) {
    return apiClient.get(`/time-off-requests/${id}`, addDemoHeader());
  },

  approveTimeOffRequest(id) {
    return apiClient.put(`/time-off-requests/${id}/approve`, {}, addDemoHeader());
  },

  denyTimeOffRequest(id) {
    return apiClient.put(`/time-off-requests/${id}/deny`, {}, addDemoHeader());
  },

  deleteTimeOffRequest(id) {
    return apiClient.delete(`/time-off-requests/${id}`, addDemoHeader());
  },

  // EMPLOYEES (USERS)

  getAllEmployees() {
    return apiClient.get("/users", addDemoHeader());
  },

  getEmployeeById(id) {
    return apiClient.get(`/users/${id}`, addDemoHeader());
  },

  createEmployee(employee) {
    return apiClient.post("/users", employee, addDemoHeader());
  },

  updateEmployee(id, employee) {
    return apiClient.put(`/users/${id}`, employee, addDemoHeader());
  },

  deleteEmployee(id) {
    return apiClient.delete(`/users/${id}`, addDemoHeader());
  },

  
  // AVAILABILITY

  getAllAvailability() {
    return apiClient.get("/availability", addDemoHeader());
  },

  getAvailabilityByUser(userId) {
    return apiClient.get(`/availability?userId=${userId}`, addDemoHeader());
  },

  createAvailability(availability) {
    return apiClient.post("/availability", availability, addDemoHeader());
  },

  updateAvailability(id, availability) {
    return apiClient.put(`/availability/${id}`, availability, addDemoHeader());
  },

  deleteAvailability(id) {
    return apiClient.delete(`/availability/${id}`, addDemoHeader());
  },

  // TASK LISTS

  getAllTaskLists() {
    return apiClient.get("/task-lists", addDemoHeader());
  },

  getTaskListById(id) {
    return apiClient.get(`/task-lists/${id}`, addDemoHeader());
  },

  createTaskList(taskList) {
    return apiClient.post("/task-lists", taskList, addDemoHeader());
  },

  updateTaskList(id, taskList) {
    return apiClient.put(`/task-lists/${id}`, taskList, addDemoHeader());
  },

  deleteTaskList(id) {
    return apiClient.delete(`/task-lists/${id}`, addDemoHeader());
  },

  completeTaskList(id) {
    return apiClient.put(`/task-lists/${id}/complete`, {}, addDemoHeader());
  },

  archiveTaskList(id) {
    return apiClient.put(`/task-lists/${id}/archive`, {}, addDemoHeader());
  },

  // TASK LIST ITEMS

  getAllTaskItems() {
    return apiClient.get("/task-list-items", addDemoHeader());
  },

  getTaskItemsByList(tasklistId) {
    return apiClient.get(`/task-list-items?tasklistId=${tasklistId}`, addDemoHeader());
  },

  createTaskItem(item) {
    return apiClient.post("/task-list-items", item, addDemoHeader());
  },

  updateTaskItem(id, item) {
    return apiClient.put(`/task-list-items/${id}`, item, addDemoHeader());
  },

  deleteTaskItem(id) {
    return apiClient.delete(`/task-list-items/${id}`, addDemoHeader());
  },

  completeTaskItem(id) {
    return apiClient.put(`/task-list-items/${id}/complete`, {}, addDemoHeader());
  },

  reorderTaskItems(items) {
    return apiClient.put("/task-list-items/reorder", { items }, addDemoHeader());
  },

  // BUSINESS AREAS (LOCATIONS)

  getAllLocations() {
    return apiClient.get("/business-areas", addDemoHeader());
  },

  getLocationById(id) {
    return apiClient.get(`/business-areas/${id}`, addDemoHeader());
  },

  createLocation(location) {
    return apiClient.post("/business-areas", location);
  },

  updateLocation(id, location) {
    return apiClient.put(`/business-areas/${id}`, location);
  },

  deleteLocation(id) {
    return apiClient.delete(`/business-areas/${id}`);
  },

  // JOB ROLES

  getAllJobRoles() {
    return apiClient.get("/job-roles", addDemoHeader());
  },

  getJobRoleById(id) {
    return apiClient.get(`/job-roles/${id}`, addDemoHeader());
  },

  createJobRole(jobRole) {
    return apiClient.post("/job-roles", jobRole);
  },

  updateJobRole(id, jobRole) {
    return apiClient.put(`/job-roles/${id}`, jobRole);
  },

  deleteJobRole(id) {
    return apiClient.delete(`/job-roles/${id}`);
  },

  // CLOCK IN/OUT

  getAllClockRecords() {
    return apiClient.get("/clock-records", addDemoHeader());
  },

  approveClockRecord(id) {
    return apiClient.put(`/clock-records/${id}/approve`, {}, addDemoHeader());
  },

};