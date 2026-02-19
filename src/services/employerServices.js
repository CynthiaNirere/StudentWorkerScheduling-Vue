import apiClient from "./services.js";

// ─── EMPLOYEES ────────────────────────────────────────────────────────────
const getAllEmployees = () => apiClient.get("/users");
const getEmployeeById = (id) => apiClient.get(`/users/${id}`);
const createEmployee = (data) => apiClient.post("/users", data);
const updateEmployee = (id, data) => apiClient.put(`/users/${id}`, data);
const deleteEmployee = (id) => apiClient.delete(`/users/${id}`);

// ─── LOCATIONS (Business Areas) ───────────────────────────────────────────
const getAllLocations = () => apiClient.get("/business-areas");
const getLocationById = (id) => apiClient.get(`/business-areas/${id}`);

// ─── JOB ROLES ────────────────────────────────────────────────────────────
const getAllJobRoles = (locationId) =>
  locationId
    ? apiClient.get("/job-roles", { params: { location_id: locationId } })
    : apiClient.get("/job-roles");

// ─── SHIFTS ───────────────────────────────────────────────────────────────
const getShiftsByWeek = (startDate, endDate) =>
  apiClient.get("/shifts", { params: { start: startDate, end: endDate } });

const getShiftsByLocation = (locationId) =>
  apiClient.get("/shifts", { params: { location_id: locationId } });

const getShiftsByUser = (userId) =>
  apiClient.get("/shifts", { params: { user_id: userId } });

const createShift = (data) => apiClient.post("/shifts", data);
const updateShift = (id, data) => apiClient.put(`/shifts/${id}`, data);
const deleteShift = (id) => apiClient.delete(`/shifts/${id}`);
const publishShift = (id) => apiClient.put(`/shifts/${id}`, { status: "published" });

// ─── CLOCK IN / OUT ───────────────────────────────────────────────────────
const clockIn = (data) => apiClient.post("/clock/in", data);
const clockOut = (data) => apiClient.post("/clock/out", data);
const getClockHistory = (userId) => apiClient.get(`/clock/${userId}`);

// ─── AVAILABILITY ─────────────────────────────────────────────────────────
const getAvailability = (userId) => apiClient.get(`/availability/${userId}`);
const createAvailability = (data) => apiClient.post("/availability", data);
const updateAvailability = (id, data) => apiClient.put(`/availability/${id}`, data);
const deleteAvailability = (id) => apiClient.delete(`/availability/${id}`);

// ─── TIME OFF REQUESTS ────────────────────────────────────────────────────
const getTimeOffRequests = (userId) =>
  apiClient.get("/time-off-requests", { params: { user_id: userId } });
const getAllTimeOffRequests = () => apiClient.get("/time-off-requests");
const createTimeOffRequest = (data) => apiClient.post("/time-off-requests", data);
const updateTimeOffRequest = (id, data) =>
  apiClient.put(`/time-off-requests/${id}`, data);

// ─── SHIFT SWAP REQUESTS ──────────────────────────────────────────────────
const getShiftSwapRequests = (userId) =>
  apiClient.get("/shift-swaps", { params: { user_id: userId } });
const getAllShiftSwapRequests = () => apiClient.get("/shift-swaps");
const createShiftSwapRequest = (data) => apiClient.post("/shift-swaps", data);
const updateShiftSwapRequest = (id, data) =>
  apiClient.put(`/shift-swaps/${id}`, data);

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────
const getNotifications = (userId) => apiClient.get(`/notifications/${userId}`);
const markNotificationRead = (id) => apiClient.put(`/notifications/${id}/read`);

// ─── TASKS ────────────────────────────────────────────────────────────────
const getTasksForUser = (userId) =>
  apiClient.get("/tasklist/items", { params: { assigned_to: userId } });
const updateTaskItem = (id, data) => apiClient.put(`/tasklist/items/${id}`, data);
const getAllTaskLists = () => apiClient.get("/tasklist");
const createTaskList = (data) => apiClient.post("/tasklist", data);
const createTaskItem = (data) => apiClient.post("/tasklist/items", data);

export default {
  // Employees
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,

  // Locations
  getAllLocations,
  getLocationById,

  // Job Roles
  getAllJobRoles,

  // Shifts
  getShiftsByWeek,
  getShiftsByLocation,
  getShiftsByUser,
  createShift,
  updateShift,
  deleteShift,
  publishShift,

  // Clock
  clockIn,
  clockOut,
  getClockHistory,

  // Availability
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,

  // Time Off
  getTimeOffRequests,
  getAllTimeOffRequests,
  createTimeOffRequest,
  updateTimeOffRequest,

  // Swap
  getShiftSwapRequests,
  getAllShiftSwapRequests,
  createShiftSwapRequest,
  updateShiftSwapRequest,

  // Notifications
  getNotifications,
  markNotificationRead,

  // Tasks
  getTasksForUser,
  updateTaskItem,
  getAllTaskLists,
  createTaskList,
  createTaskItem,
};