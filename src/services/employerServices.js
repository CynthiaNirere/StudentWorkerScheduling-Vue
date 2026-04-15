import apiClient from "./services.js";
import Utils from "../config/utils.js";

// services.js interceptor handles auth headers for logged-in users.
// addDemoHeader only needed for guest mode (no logged-in user).
const addDemoHeader = (config = {}) => {
  const isGuest = localStorage.getItem('isGuest') === 'true';
  const user    = Utils.getStore('user');
  if (isGuest && !user) {
    return { ...config, headers: { ...config.headers, 'x-demo-mode': 'true' } };
  }
  return config;
};

export default {

  // ── SHIFTS ──────────────────────────────────────────────────────────────
  getAllShifts() {
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

  // ── SCHEDULE TEMPLATES ───────────────────────────────────────────────────
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

  // ── NOTIFICATIONS ────────────────────────────────────────────────────────
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

  // ── SHIFT SWAP REQUESTS ──────────────────────────────────────────────────
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

  // ── TIME OFF REQUESTS ────────────────────────────────────────────────────
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

  // ── USERS / EMPLOYEES ────────────────────────────────────────────────────
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
  removeFromWorkplace(userId) {
    return apiClient.delete(`/users/${userId}/workplace`, addDemoHeader());
  },
  searchEmployees(query) {
    return apiClient.get(`/users/search?q=${encodeURIComponent(query)}`, addDemoHeader());
  },
  assignToWorkplace(userId) {
    return apiClient.post(`/users/${userId}/assign`, {}, addDemoHeader());
  },

  // Search existing users by name (for the assign-to-workplace flow)
  searchEmployeesByName(q) {
    return apiClient.get(`/users/search?q=${encodeURIComponent(q)}`, addDemoHeader());
  },

  // Look up a single user by exact email — returns 404 if not found
  findByEmail(email) {
    return apiClient.get(`/users/email/${encodeURIComponent(email)}`, addDemoHeader());
  },

  // Assign an existing user to the employer's workplace — no duplicate record created
  assignEmployeeToWorkplace(userId) {
    return apiClient.post(`/users/${userId}/assign`, {}, addDemoHeader());
  },

  // ── USER JOB ROLES ───────────────────────────────────────────────────────
  addRoleToUser(userId, roleData) {
    return apiClient.post(`/user-job-roles/user/${userId}/roles`, roleData, addDemoHeader());
  },
  getUserRoles(userId, locationId) {
    const params = locationId ? `?locationId=${locationId}` : '';
    return apiClient.get(`/user-job-roles/user/${userId}/roles${params}`, addDemoHeader());
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

  // ── AVAILABILITY ─────────────────────────────────────────────────────────
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

  // ── TASK LISTS ───────────────────────────────────────────────────────────
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

  // ── TASK LIST ITEMS ──────────────────────────────────────────────────────
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

  // ── SHIFT TASKS ──────────────────────────────────────────────────────────
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

  // ── MESSAGES ─────────────────────────────────────────────────────────────
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

  // ── CLOCK RECORDS (time cards) ───────────────────────────────────────────
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
    return apiClient.put(`/clock-records/${id}/modify`, data, addDemoHeader());
  },
  clockIn(shiftId) {
    return apiClient.post("/clock-records/clock-in", { shiftId }, addDemoHeader());
  },
  clockOut(id) {
    return apiClient.put(`/clock-records/clock-out/${id}`, {}, addDemoHeader());
  },
  kioskClockIn({ userId, shiftId }) {
    return apiClient.post("/clock-records/clock-in", { userId, shiftId }, addDemoHeader());
  },
  kioskClockOut({ userId }) {
    return apiClient.put("/clock-records/clock-out/0", { userId }, addDemoHeader());
  },

  // ── BUSINESS AREAS / LOCATIONS ───────────────────────────────────────────
  getAllLocations() {
    return apiClient.get("/business-areas", addDemoHeader());
  },
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

  // ── JOB ROLES ────────────────────────────────────────────────────────────
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

  // ── TASK COMPLETION HISTORY ──────────────────────────────────────────────
  getTaskCompletionHistory() {
    return apiClient.get("/tasklists/history/all", addDemoHeader());
  },

};