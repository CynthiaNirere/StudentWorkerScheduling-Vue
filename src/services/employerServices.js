import apiClient from "./services.js";

export default {

  // ── EMAIL NOTIFICATIONS ──────────────────────────────────────────────────
  updateEmailNotifications(userId, enabled) {
    return apiClient.put(`/users/${userId}/email-notifications`, {
      emailNotifications: enabled
    });
  },

  // ── SHIFTS ──────────────────────────────────────────────────────────────
  getAllShifts() {
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
    return apiClient.put(`/shifts/${id}/publish`, {});
  },

  // ── SCHEDULE TEMPLATES ───────────────────────────────────────────────────
  getAllTemplates() {
    return apiClient.get("/schedule-templates");
  },
  getTemplateById(id) {
    return apiClient.get(`/schedule-templates/${id}`);
  },
  createTemplate(template) {
    return apiClient.post("/schedule-templates", template);
  },
  updateTemplate(id, template) {
    return apiClient.put(`/schedule-templates/${id}`, template);
  },
  deleteTemplate(id) {
    return apiClient.delete(`/schedule-templates/${id}`);
  },
  applyTemplate(id, startDate) {
    return apiClient.post(`/schedule-templates/${id}/apply`, { startDate });
  },

  // ── NOTIFICATIONS ────────────────────────────────────────────────────────
  getAllNotifications() {
    return apiClient.get("/notifications");
  },
  createNotification(notification) {
    return apiClient.post("/notifications", notification);
  },
  markNotificationRead(id) {
    return apiClient.put(`/notifications/${id}/read`, {});
  },
  deleteNotification(id) {
    return apiClient.delete(`/notifications/${id}`);
  },

  // ── SHIFT SWAP REQUESTS ──────────────────────────────────────────────────
  getAllShiftSwapRequests() {
    return apiClient.get("/shift-swap-requests");
  },
  getAllSwapRequests() {
    return apiClient.get("/shift-swap-requests");
  },
  getPendingSwapRequests() {
    return apiClient.get("/shift-swap-requests?status=pending");
  },
  getSwapRequestById(id) {
    return apiClient.get(`/shift-swap-requests/${id}`);
  },
  approveSwapRequest(id) {
    return apiClient.put(`/shift-swap-requests/${id}/approve`, {});
  },
  rejectSwapRequest(id) {
    return apiClient.put(`/shift-swap-requests/${id}/reject`, {});
  },

  // ── TIME OFF REQUESTS ────────────────────────────────────────────────────
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
    return apiClient.put(`/time-off-requests/${id}/approve`, {});
  },
  denyTimeOffRequest(id) {
    return apiClient.put(`/time-off-requests/${id}/deny`, {});
  },
  deleteTimeOffRequest(id) {
    return apiClient.delete(`/time-off-requests/${id}`);
  },

  // ── USERS / EMPLOYEES ────────────────────────────────────────────────────
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

  // Search existing users by name (for the assign-to-workplace flow)
  searchEmployeesByName(q) {
    return apiClient.get(`/users/search?q=${encodeURIComponent(q)}`);
  },

  // Assign an existing user to the employer's workplace — no duplicate record created
  assignEmployeeToWorkplace(userId) {
    return apiClient.post(`/users/${userId}/assign`, {});
  },

  // ── USER JOB ROLES ───────────────────────────────────────────────────────
  addRoleToUser(userId, roleData) {
    return apiClient.post(`/user-job-roles/user/${userId}/roles`, roleData);
  },
  getUserRoles(userId) {
    return apiClient.get(`/user-job-roles/user/${userId}/roles`);
  },
  removeRoleFromUser(userId, roleId) {
    return apiClient.delete(`/user-job-roles/user/${userId}/roles/${roleId}`);
  },
  setPrimaryRole(userId, roleId) {
    return apiClient.put(`/user-job-roles/user/${userId}/roles/${roleId}/primary`, {});
  },
  getUsersByRole(roleId) {
    return apiClient.get(`/user-job-roles/role/${roleId}/users`);
  },

  // ── AVAILABILITY ─────────────────────────────────────────────────────────
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

  // ── TASK LISTS ───────────────────────────────────────────────────────────
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
    return apiClient.put(`/task-lists/${id}/complete`, {});
  },
  archiveTaskList(id) {
    return apiClient.put(`/task-lists/${id}/archive`, {});
  },

  // ── TASK LIST ITEMS ──────────────────────────────────────────────────────
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
    return apiClient.put(`/task-list-items/${id}/complete`, {});
  },
  reorderTaskItems(items) {
    return apiClient.put("/task-list-items/reorder", { items });
  },

  // ── SHIFT TASKS ──────────────────────────────────────────────────────────
  assignTaskToShift(shiftId, tasklistId) {
    return apiClient.post("/shift-tasks", { shiftId, tasklistId });
  },
  bulkAssignTasksToShift(shiftId, tasklistIds) {
    return apiClient.post("/shift-tasks/bulk", { shiftId, tasklistIds });
  },
  getShiftTasks(shiftId) {
    return apiClient.get(`/shift-tasks/shift/${shiftId}`);
  },
  getTaskShifts(tasklistId) {
    return apiClient.get(`/shift-tasks/task/${tasklistId}`);
  },
  removeTaskFromShift(shiftId, tasklistId) {
    return apiClient.delete(`/shift-tasks/shift/${shiftId}/task/${tasklistId}`);
  },

  // ── MESSAGES ─────────────────────────────────────────────────────────────
  sendMessage(messageData) {
    return apiClient.post("/messages", messageData);
  },
  broadcastMessage(messageData) {
    return apiClient.post("/messages/broadcast", messageData);
  },
  getInbox() {
    return apiClient.get("/messages/inbox");
  },
  getSentMessages() {
    return apiClient.get("/messages/sent");
  },
  getUnreadMessageCount() {
    return apiClient.get("/messages/unread-count");
  },
  markMessageAsRead(id) {
    return apiClient.put(`/messages/${id}/read`, {});
  },
  deleteMessage(id) {
    return apiClient.delete(`/messages/${id}`);
  },

  // ── CLOCK RECORDS (time cards) ───────────────────────────────────────────
  getAllClockRecords() {
    return apiClient.get("/clock-records");
  },
  approveClockRecord(id) {
    return apiClient.put(`/clock-records/${id}/approve`, {});
  },
  rejectClockRecord(id, reason = '') {
    return apiClient.put(`/clock-records/${id}/reject`, { reason });
  },
  modifyClockRecord(id, data) {
    return apiClient.put(`/clock-records/${id}/modify`, data);
  },
  clockIn(shiftId) {
    return apiClient.post("/clock-records/clock-in", { shiftId });
  },
  clockOut(id) {
    return apiClient.put(`/clock-records/clock-out/${id}`, {});
  },
  kioskClockIn({ userId, shiftId }) {
    return apiClient.post("/clock-records/clock-in", { userId, shiftId });
  },
  kioskClockOut({ userId }) {
    return apiClient.put("/clock-records/clock-out/0", { userId });
  },

  // ── BUSINESS AREAS / LOCATIONS ───────────────────────────────────────────
  getAllLocations() {
    return apiClient.get("/business-areas");
  },
  getBusinessAreas() {
    return apiClient.get("/business-areas");
  },
  getLocationById(id) {
    return apiClient.get(`/business-areas/${id}`);
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

  // ── JOB ROLES ────────────────────────────────────────────────────────────
  getAllJobRoles() {
    return apiClient.get("/job-roles");
  },
  getJobRoleById(id) {
    return apiClient.get(`/job-roles/${id}`);
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

  // ── TASK COMPLETION HISTORY ──────────────────────────────────────────────
  getTaskCompletionHistory() {
    return apiClient.get("/tasklists/history/all");
  },

};