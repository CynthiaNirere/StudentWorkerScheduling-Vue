import apiClient from "./services.js";
import Utils from "../config/utils.js";

// ✅ FINAL FIX: Only use demo mode for TRUE guest sessions, never for logged-in users
const addDemoHeader = (config = {}) => {
  // Check if explicitly in guest mode (not logged in at all)
  const isGuest = localStorage.getItem('isGuest') === 'true';
  const user = Utils.getStore('user');
  
  // If user exists, NEVER use demo mode - they're logged in!
  if (user) {
    return config;
  }
  
  // Only add demo header if explicitly guest AND no user
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

  getAllTemplates() {
    return apiClient.get("/schedule-templates", addDemoHeader());
  },

  getTemplateById(id) {
    return apiClient.get(`/schedule-templates/${id}`, addDemoHeader());
  },

  createTemplate(template) {
    return apiClient.post("/schedule-templates", template, addDemoHeader());
  },

  updateTemplate(id, template) {
    return apiClient.put(`/schedule-templates/${id}`, template, addDemoHeader());
  },

  deleteTemplate(id) {
    return apiClient.delete(`/schedule-templates/${id}`, addDemoHeader());
  },

  applyTemplate(id, startDate) {
    return apiClient.post(`/schedule-templates/${id}/apply`, { startDate }, addDemoHeader());
  },

  createScheduleTemplate(template) {
    return apiClient.post("/schedule-templates", template, addDemoHeader());
  },

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

  getAllShiftSwapRequests() {
    return apiClient.get("/shift-swap-requests", addDemoHeader());
  },

  getAllSwapRequests() {
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

  addRoleToUser(userId, roleData) {
    return apiClient.post(`/user-job-roles/user/${userId}/roles`, roleData, addDemoHeader());
  },

  getUserRoles(userId) {
    return apiClient.get(`/user-job-roles/user/${userId}/roles`, addDemoHeader());
  },

  removeRoleFromUser(userId, roleId) {
    return apiClient.delete(`/user-job-roles/user/${userId}/roles/${roleId}`, addDemoHeader());
  },

  setPrimaryRole(userId, roleId) {
    return apiClient.put(`/user-job-roles/user/${userId}/roles/${roleId}/primary`, {}, addDemoHeader());
  },

  getUsersByRole(roleId) {
    return apiClient.get(`/user-job-roles/role/${roleId}/users`, addDemoHeader());
  },

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

  assignTaskToShift(shiftId, tasklistId) {
    return apiClient.post("/shift-tasks", { shiftId, tasklistId }, addDemoHeader());
  },

  bulkAssignTasksToShift(shiftId, tasklistIds) {
    return apiClient.post("/shift-tasks/bulk", { shiftId, tasklistIds }, addDemoHeader());
  },

  getShiftTasks(shiftId) {
    return apiClient.get(`/shift-tasks/shift/${shiftId}`, addDemoHeader());
  },

  getTaskShifts(tasklistId) {
    return apiClient.get(`/shift-tasks/task/${tasklistId}`, addDemoHeader());
  },

  removeTaskFromShift(shiftId, tasklistId) {
    return apiClient.delete(`/shift-tasks/shift/${shiftId}/task/${tasklistId}`, addDemoHeader());
  },

  sendMessage(messageData) {
    return apiClient.post("/messages", messageData, addDemoHeader());
  },

  broadcastMessage(messageData) {
    return apiClient.post("/messages/broadcast", messageData, addDemoHeader());
  },

  getInbox() {
    return apiClient.get("/messages/inbox", addDemoHeader());
  },

  getSentMessages() {
    return apiClient.get("/messages/sent", addDemoHeader());
  },

  getUnreadMessageCount() {
    return apiClient.get("/messages/unread-count", addDemoHeader());
  },

  markMessageAsRead(id) {
    return apiClient.put(`/messages/${id}/read`, {}, addDemoHeader());
  },

  deleteMessage(id) {
    return apiClient.delete(`/messages/${id}`, addDemoHeader());
  },

  getTaskCompletionHistory() {
    return apiClient.get("/tasklists/history/all", addDemoHeader());
  },

  getTaskListItems(tasklistId) {
    return apiClient.get(`/tasklistitems/tasklist/${tasklistId}`, addDemoHeader());
  },

  createTaskListItem(item) {
    return apiClient.post("/tasklistitems", item, addDemoHeader());
  },

  updateTaskListItem(id, updates) {
    return apiClient.put(`/tasklistitems/${id}`, updates, addDemoHeader());
  },

  deleteTaskListItem(id) {
    return apiClient.delete(`/tasklistitems/${id}`, addDemoHeader());
  },

  getAllLocations() {
    return apiClient.get("/business-areas", addDemoHeader());
  },

  // ✅ NEW: Alias for business area filtering (used by EmployerEmployees.vue)
  getBusinessAreas() {
    return apiClient.get("/business-areas", addDemoHeader());
  },

  getLocationById(id) {
    return apiClient.get(`/business-areas/${id}`, addDemoHeader());
  },

  createLocation(location) {
    return apiClient.post("/business-areas", location, addDemoHeader());
  },

  updateLocation(id, location) {
    return apiClient.put(`/business-areas/${id}`, location, addDemoHeader());
  },

  deleteLocation(id) {
    return apiClient.delete(`/business-areas/${id}`, addDemoHeader());
  },

  getAllJobRoles() {
    return apiClient.get("/job-roles", addDemoHeader());
  },

  getJobRoleById(id) {
    return apiClient.get(`/job-roles/${id}`, addDemoHeader());
  },

  createJobRole(jobRole) {
    return apiClient.post("/job-roles", jobRole, addDemoHeader());
  },

  updateJobRole(id, jobRole) {
    return apiClient.put(`/job-roles/${id}`, jobRole, addDemoHeader());
  },

  deleteJobRole(id) {
    return apiClient.delete(`/job-roles/${id}`, addDemoHeader());
  },

 // ✅ PATCH: Replace the clock record section at the bottom of employerServices.js
// Find these three lines:
//   getAllClockRecords()
//   approveClockRecord()
// And replace the entire block with this:

  getAllClockRecords() {
    return apiClient.get("/clock-records", addDemoHeader());
  },

  approveClockRecord(id) {
    return apiClient.put(`/clock-records/${id}/approve`, {}, addDemoHeader());
  },

  rejectClockRecord(id, reason = '') {
    return apiClient.put(`/clock-records/${id}/reject`, { reason }, addDemoHeader());
  },

  modifyClockRecord(id, data) {
    // data: { clockInTime, clockOutTime, notes }
    return apiClient.put(`/clock-records/${id}/modify`, data, addDemoHeader());
  },

};