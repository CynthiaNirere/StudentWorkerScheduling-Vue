import apiClient from "./services.js";
import Utils from "../config/utils.js";

const getAuthHeader = () => {
  const user = Utils.getStore('user');
  return user ? {} : {};
};

export default {

  // ─── PROFILE ────────────────────────────────────────────────────────────
  getProfile(userId) {
    return apiClient.get(`/users/${userId}`);
  },

  updateProfile(userId, data) {
    // Employee can only update phone_number
    return apiClient.put(`/users/${userId}`, { phone_number: data.phone_number });
  },

  // ─── SHIFTS ─────────────────────────────────────────────────────────────
  getMyShifts() {
    return apiClient.get('/shifts');
  },

  getShiftsByWeek(startDate, endDate) {
    return apiClient.get(`/shifts?startDate=${startDate}&endDate=${endDate}`);
  },

  // ─── AVAILABILITY ────────────────────────────────────────────────────────
  getMyAvailability(userId) {
    return apiClient.get(`/availability/user/${userId}`);
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
    return apiClient.get(`/clock-records/user/${userId}`);
  },

  // ─── TASKS ────────────────────────────────────────────────────────────────
  getMyTaskLists() {
    return apiClient.get('/task-lists');
  },

  getTaskItems(tasklistId) {
    return apiClient.get(`/task-list-items?tasklistId=${tasklistId}`);
  },

  completeTaskItem(id) {
    return apiClient.put(`/task-list-items/${id}/complete`, {});
  },

  updateTaskItem(id, data) {
    return apiClient.put(`/task-list-items/${id}`, data);
  },

  // ─── MESSAGES ─────────────────────────────────────────────────────────────
  getInbox() {
    return apiClient.get('/messages/inbox');
  },

  getSentMessages() {
    return apiClient.get('/messages/sent');
  },

  sendMessage(data) {
    return apiClient.post('/messages', data);
  },

  markMessageAsRead(id) {
    return apiClient.put(`/messages/${id}/read`, {});
  },

  deleteMessage(id) {
    return apiClient.delete(`/messages/${id}`);
  },

  getUnreadMessageCount() {
    return apiClient.get('/messages/unread-count');
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