import apiClient from "./services.js";
import Utils from "../config/utils.js";

export default {

  // ─── PROFILE ────────────────────────────────────────────────────────────
  getProfile(userId) {
    return apiClient.get(`/users/${userId}`);
  },

  updateProfile(userId, data) {
    return apiClient.put(`/users/${userId}`, { phone_number: data.phone_number });
  },

  // ─── EMAIL NOTIFICATIONS ────────────────────────────────────────────────
  updateEmailNotifications(userId, enabled) {
    return apiClient.put(`/users/${userId}/email-notifications`, {
      emailNotifications: enabled
    });
  },

  updateCertifications(userId, certifications) {
    return apiClient.patch(`/users/${userId}/certifications`, { certifications });
  },

  // ─── SHIFTS ─────────────────────────────────────────────────────────────
  // My shifts only (filtered by userId on backend)
  getMyShifts(userId) {
    if (userId) return apiClient.get(`/shifts?userId=${userId}`);
    return apiClient.get('/shifts');
  },

  // All shifts (for team schedule view)
  getAllShifts() {
    return apiClient.get('/shifts');
  },

  // Today's shifts for this employee
  getMyShiftsToday(userId) {
    const today = new Date();
    const start = new Date(today); start.setHours(0,0,0,0);
    const end   = new Date(today); end.setHours(23,59,59,999);
    return apiClient.get(`/shifts?userId=${userId}&startDate=${start.getTime()}&endDate=${end.getTime()}`);
  },

  getShiftsByWeek(startDate, endDate) {
    return apiClient.get(`/shifts?startDate=${startDate}&endDate=${endDate}`);
  },

  // ─── AVAILABILITY ────────────────────────────────────────────────────────
  getMyAvailability(userId, locationId = null) {
    const query = locationId ? `?locationId=${locationId}` : '';
    return apiClient.get(`/availability/user/${userId}${query}`);
  },

  createAvailability(data) {
    return apiClient.post('/availability', data);
  },

  updateAvailability(id, data) {
    return apiClient.put(`/availability/${id}`, data);
  },

  deleteAvailability(id) {
    return apiClient.delete(`/availability/${id}`);
  },

  getAllAvailability() {
    return apiClient.get('/availability');
  },

  // ─── BUSINESS AREAS ──────────────────────────────────────────────────────
  getBusinessAreas() {
    return apiClient.get('/business-areas');
  },

  getBusinessAreaById(id) {
    return apiClient.get(`/business-areas/${id}`);
  },

  // ─── TIME OFF REQUESTS ────────────────────────────────────────────────────
  getMyTimeOffRequests() {
    return apiClient.get('/time-off-requests');
  },

  createTimeOffRequest(data) {
    return apiClient.post('/time-off-requests', data);
  },

  deleteTimeOffRequest(id) {
    return apiClient.delete(`/time-off-requests/${id}`);
  },

  // ─── SHIFT SWAP REQUESTS ──────────────────────────────────────────────────
  getMySwapRequests() {
    return apiClient.get('/shift-swap-requests');
  },

  createSwapRequest(data) {
    return apiClient.post('/shift-swap-requests', data);
  },

  acceptSwapRequest(id, acceptingUserId) {
    return apiClient.put(`/shift-swap-requests/${id}/accept`, { acceptingUserId });
  },

  cancelSwapRequest(id) {
    return apiClient.put(`/shift-swap-requests/${id}/cancel`);
  },

  // ─── CLOCK / TIME CARDS ───────────────────────────────────────────────────
  clockIn(data) {
    return apiClient.post('/clock-records/clock-in', data);
  },

  clockOut(id) {
    return apiClient.put(`/clock-records/clock-out/${id}`, {});
  },

  getMyClockRecords() {
    return apiClient.get('/clock-records');
  },

  getClockRecordsByUser(userId) {
    return apiClient.get(`/clock-records?userId=${userId}`);
  },

  updateClockRecord(id, data) {
    return apiClient.put(`/clock-records/${id}/modify`, data);
  },

  // Submit timecard for the current pay period
  // Backend should mark all pending records for this user/period as submitted
  submitTimecard(data) {
    return apiClient.post('/clock-records/submit-timecard', data);
  },

  // ─── TASKS ────────────────────────────────────────────────────────────────
  getMyTaskLists() {
    return apiClient.get('/task-lists');
  },

  // Get task lists linked to a specific shift (for today's tasks filter)
  getTaskListsByShift(shiftId) {
    return apiClient.get(`/shift-tasks/shift/${shiftId}`);
  },

  getTaskItems(tasklistId) {
    return apiClient.get(`/task-list-items?tasklistId=${tasklistId}`);
  },

  // Complete a task item — backend records completedBy from the auth token
  completeTaskItem(id) {
    return apiClient.put(`/task-list-items/${id}/complete`, {});
  },

  updateTaskItem(id, data) {
    return apiClient.put(`/task-list-items/${id}`, data);
  },

  // ─── MESSAGES ─────────────────────────────────────────────────────────────
  sendMessage(data) {
    return apiClient.post('/messages', data);
  },

  getInbox() {
    return apiClient.get('/messages/inbox');
  },

  getSentMessages() {
    return apiClient.get('/messages/sent');
  },

  getUnreadMessageCount() {
    return apiClient.get('/messages/unread-count');
  },

  markMessageAsRead(id) {
    return apiClient.put(`/messages/${id}/read`, {});
  },

  deleteMessage(id) {
    return apiClient.delete(`/messages/${id}`);
  },

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  getMyNotifications(userId) {
    return apiClient.get(`/notifications/user/${userId}`);
  },

  markNotificationRead(id) {
    return apiClient.put(`/notifications/read/${id}`, {});
  },

  markAllNotificationsRead(userId) {
    return apiClient.put(`/notifications/read-all/user/${userId}`, {});
  },

  createNotification(data) {
    return apiClient.post('/notifications', data);
  },

  deleteNotification(id) {
    return apiClient.delete(`/notifications/${id}`);
  },

  // ─── JOB ROLES ────────────────────────────────────────────────────────────
  getAllJobRoles() {
    return apiClient.get('/job-roles');
  },

  getUserRoles(userId) {
    return apiClient.get(`/user-job-roles/user/${userId}/roles`);
  },

  // ─── EMPLOYEES (for swap - see coworkers) ────────────────────────────────
  getAllEmployees() {
    return apiClient.get('/users');
  },
};