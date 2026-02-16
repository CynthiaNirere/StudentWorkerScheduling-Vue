<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";

const router = useRouter();
const user = ref(null);

const notifications = ref([]);
const shifts = ref([]);
const employees = ref([]);
const loadingNotifications = ref(false);
const loadingShifts = ref(false);

const showAllNotificationsDialog = ref(false);
const showCreateShiftDialog = ref(false);
const showAddEmployeeDialog = ref(false);
const creatingShift = ref(false);
const addingEmployee = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const newShift = ref({
  date: "",
  startTime: "",
  endTime: "",
  userId: "",
  notes: "",
});

const newEmployee = ref({
  fName: "",
  lName: "",
  email: "",
  phone_number: "",
  password_hash: "",
  role: "employee",
});


onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadNotifications(), loadShifts(), loadEmployees()]);
});

const weekDays = computed(() => {
  const labels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  return labels.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayShifts = shifts.value.filter((s) => {
      const d = new Date(Number(s.shiftTime));
      return d.toDateString() === date.toDateString();
    });
    return { label, dateNum: date.getDate(), fullDate: date, shifts: dayShifts };
  });
});

const schedulePublished = computed(() =>
  shifts.value.some((s) => s.status === "published")
);

const loadNotifications = async () => {
  loadingNotifications.value = true;
  try {
    const res = await EmployerService.getAllNotifications();
    notifications.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading notifications:", err);
    notifications.value = [];
  } finally {
    loadingNotifications.value = false;
  }
};

const loadShifts = async () => {
  loadingShifts.value = true;
  try {
    const now = Date.now();
    const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
    const res = await EmployerService.getShiftsByWeek(now, weekEnd);
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading shifts:", err);
    shifts.value = [];
  } finally {
    loadingShifts.value = false;
  }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const all = Array.isArray(res.data) ? res.data : [];
    employees.value = all.filter((u) => u.role === "employee");
  } catch (err) {
    console.error("Error loading employees:", err);
  }
};

const dismissNotification = async (id) => {
  try {
    await EmployerService.markNotificationRead(id);
    notifications.value = notifications.value.filter(
      (n) => n.notification_id !== id
    );
  } catch (err) {
    console.error("Error dismissing notification:", err);
  }
};

const handleApproveSwap = async (notification) => {
  try {
    await EmployerService.approveSwapRequest(notification.swap_id);
    await dismissNotification(notification.notification_id);
    showSnackbar("Shift swap approved!", "success");
    loadShifts();
  } catch (err) {
    showSnackbar("Error approving swap request", "error");
  }
};

const handleDenySwap = async (notification) => {
  try {
    await EmployerService.rejectSwapRequest(notification.swap_id);
    await dismissNotification(notification.notification_id);
    showSnackbar("Shift swap denied", "success");
  } catch (err) {
    showSnackbar("Error denying swap request", "error");
  }
};

const handleMarkAsRead = async (id) => {
  await dismissNotification(id);
  showSnackbar("Marked as read", "success");
};

const handleCreateShift = async () => {
  if (!newShift.value.date || !newShift.value.startTime || !newShift.value.endTime) {
    showSnackbar("Please fill in date, start time, and end time", "error");
    return;
  }
  creatingShift.value = true;
  try {
    const shiftTime = new Date(newShift.value.date).getTime();
    await EmployerService.createShift({
      shiftTime,
      startTime: timeToMinutes(newShift.value.startTime),
      endTime: timeToMinutes(newShift.value.endTime),
      userId: newShift.value.userId || null,
      notes: newShift.value.notes || null,
      locationId: user.value?.work_location || 1,
      jobRoleId: 1,
      status: "draft",
      createdAt: Date.now(),
    });
    showSnackbar("Shift created successfully!", "success");
    showCreateShiftDialog.value = false;
    newShift.value = { date: "", startTime: "", endTime: "", userId: "", notes: "" };
    loadShifts();
  } catch (err) {
    showSnackbar("Error creating shift", "error");
  } finally {
    creatingShift.value = false;
  }
};

const handleAddEmployee = async () => {
  if (!newEmployee.value.fName || !newEmployee.value.email || !newEmployee.value.password_hash) {
    showSnackbar("First name, email and password are required", "error");
    return;
  }
  addingEmployee.value = true;
  try {
    await EmployerService.createEmployee(newEmployee.value);
    showSnackbar("Employee added successfully!", "success");
    showAddEmployeeDialog.value = false;
    newEmployee.value = { fName: "", lName: "", email: "", phone_number: "", password_hash: "", role: "employee" };
    loadEmployees();
  } catch (err) {
    showSnackbar("Error adding employee", "error");
  } finally {
    addingEmployee.value = false;
  }
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const formatShiftTime = (minutes) => {
  if (minutes === undefined || minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "";
  const diff = Date.now() - Number(timestamp);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return new Date(Number(timestamp)).toLocaleDateString();
};

const getShiftColor = (shift) => {
  const colors = ["blue-lighten-4", "green-lighten-4", "yellow-lighten-4", "orange-lighten-4", "purple-lighten-4"];
  return colors[(shift.job_role_id || 0) % colors.length];
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

const handleSignOut = () => {
  Utils.removeStore("user");
  Utils.removeStore("token");
  router.push({ name: "login" });
};
</script>

<template>
  <v-app>
    <v-navigation-drawer permanent color="#7b1c2e" width="210">

      <!-- Brand -->
      <div class="pa-4 pb-3">
        <div class="d-flex align-center gap-2 mb-1">
          <v-icon color="white" size="22">mdi-clock-outline</v-icon>
          <span class="text-white font-weight-bold text-body-1">Talon Time</span>
        </div>
        <v-chip size="x-small" color="white" variant="tonal" class="text-white">
          Business Manager View
        </v-chip>
      </div>

      <v-divider color="rgba(255,255,255,0.2)" />

      <!-- Nav Links -->
      <v-list density="compact" nav class="mt-1">
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          value="dashboard"
          @click="router.push({ name: 'employerDashboard' })"
          active-color="white"
          base-color="rgba(255,255,255,0.7)"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-calendar-month"
          title="Schedule"
          value="schedule"
          @click="router.push({ name: 'employerSchedule' })"
          base-color="rgba(255,255,255,0.7)"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-account-group"
          title="Employees"
          value="employees"
          @click="router.push({ name: 'employerEmployees' })"
          base-color="rgba(255,255,255,0.7)"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-clock-check-outline"
          title="Availability"
          value="availability"
          @click="router.push({ name: 'employerAvailability' })"
          base-color="rgba(255,255,255,0.7)"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-calendar-remove"
          title="Time Off"
          value="timeoff"
          @click="router.push({ name: 'employerTimeOff' })"
          base-color="rgba(255,255,255,0.7)"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-checkbox-marked-outline"
          title="Tasks"
          value="tasks"
          @click="router.push({ name: 'employerTasks' })"
          base-color="rgba(255,255,255,0.7)"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-swap-horizontal"
          title="Shift Swaps"
          value="swaps"
          @click="router.push({ name: 'employerSwaps' })"
          base-color="rgba(255,255,255,0.7)"
          class="mb-1"
        />
      </v-list>

      <template #append>
        <v-divider color="rgba(255,255,255,0.2)" />
        <v-list density="compact" nav class="my-1">
          <v-list-item
            prepend-icon="mdi-logout"
            title="Sign Out"
            base-color="rgba(255,255,255,0.7)"
            @click="handleSignOut"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-main style="background: #f5f5f5;">
      <v-container fluid class="pa-6">

        <v-row align="center" class="mb-5">
          <v-col>
            <h1 class="text-h5 font-weight-bold">Dashboard</h1>
          </v-col>
          <v-col cols="auto" class="d-flex align-center ga-3">
            <v-btn
              color="#7b1c2e"
              variant="flat"
              size="small"
              @click="router.push({ name: 'employerSchedule' })"
            >
              Create Schedule
            </v-btn>
            <v-btn
              color="#7b1c2e"
              variant="outlined"
              size="small"
              @click="showAddEmployeeDialog = true"
            >
              Add Employee
            </v-btn>
            <v-btn
              color="#7b1c2e"
              variant="outlined"
              size="small"
              @click="showCreateShiftDialog = true"
            >
              Create Shift
            </v-btn>
            <v-avatar
              color="grey-lighten-3"
              size="36"
              style="cursor: pointer"
              @click="router.push({ name: 'employerProfile' })"
            >
              <v-icon>mdi-account</v-icon>
            </v-avatar>
          </v-col>
        </v-row>

        <div class="text-subtitle-1 font-weight-semibold mb-3">
          Alerts &amp; Notifications
        </div>

        <v-card variant="outlined" rounded="lg" class="mb-6">
          <!-- Loading -->
          <div v-if="loadingNotifications" class="pa-6 text-center">
            <v-progress-circular indeterminate color="#7b1c2e" size="28" />
          </div>

          <!-- Empty -->
          <div v-else-if="notifications.length === 0" class="pa-6 text-center text-medium-emphasis">
            <v-icon size="32" class="mb-2">mdi-bell-off-outline</v-icon>
            <div class="text-body-2">No new notifications</div>
          </div>

          <template v-else>
            <div
              v-for="(notif, index) in notifications.slice(0, 2)"
              :key="notif.notification_id"
            >
              <div class="pa-4">
                <div class="d-flex justify-space-between align-start mb-1">
                  <span class="text-body-2 font-weight-bold">{{ notif.title }}</span>
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="plain"
                    @click="dismissNotification(notif.notification_id)"
                  />
                </div>
                <p class="text-body-2 text-medium-emphasis mb-1">
                  {{ notif.description }}
                </p>
                <span class="text-caption text-disabled">
                  {{ formatTimeAgo(notif.created_at) }}
                </span>

                <div v-if="notif.type === 'swap_request'" class="d-flex ga-2 mt-3 flex-wrap">
                  <v-btn
                    color="success"
                    variant="flat"
                    size="x-small"
                    @click="handleApproveSwap(notif)"
                  >Approve</v-btn>
                  <v-btn
                    color="error"
                    variant="flat"
                    size="x-small"
                    @click="handleDenySwap(notif)"
                  >Deny</v-btn>
                  <v-btn
                    variant="tonal"
                    size="x-small"
                    @click="router.push({ name: 'employerEmployees' })"
                  >Find Replacement</v-btn>
                </div>

                <!-- Task completed action -->
                <div v-if="notif.type === 'task_completed'" class="mt-3">
                  <v-btn
                    variant="tonal"
                    size="x-small"
                    @click="handleMarkAsRead(notif.notification_id)"
                  >Mark as Read</v-btn>
                </div>
              </div>
              <v-divider v-if="index < notifications.slice(0, 2).length - 1" />
            </div>

            <!-- View All -->
            <v-divider />
            <div class="pa-3 d-flex justify-end">
              <v-btn
                variant="text"
                color="#7b1c2e"
                size="small"
                @click="showAllNotificationsDialog = true"
              >
                View All
              </v-btn>
            </div>
          </template>
        </v-card>

        <div class="d-flex align-center justify-space-between mb-3">
          <span class="text-subtitle-1 font-weight-semibold">
            This Week's Schedule Preview
          </span>
          <v-chip
            :color="schedulePublished ? 'success' : 'warning'"
            size="small"
            variant="tonal"
          >
            {{ schedulePublished ? "Schedule Published" : "Schedule Not Published" }}
          </v-chip>
        </div>

        <v-card variant="outlined" rounded="lg">
          <div class="pa-4">
            <v-btn
              variant="outlined"
              size="small"
              color="#7b1c2e"
              class="mb-4"
              @click="router.push({ name: 'employerSchedule' })"
            >
              View Full Schedule
            </v-btn>

            <!-- Calendar Grid -->
            <div v-if="loadingShifts" class="text-center pa-6">
              <v-progress-circular indeterminate color="#7b1c2e" size="28" />
            </div>

            <div v-else class="calendar-grid">
              <div
                v-for="day in weekDays"
                :key="day.label"
                class="calendar-day"
              >
                <!-- Day Header -->
                <div class="calendar-day-header">
                  <div class="text-caption font-weight-bold text-medium-emphasis">
                    {{ day.label }}
                  </div>
                  <div class="text-body-2 font-weight-bold">{{ day.dateNum }}</div>
                </div>

                <!-- Shifts -->
                <div class="calendar-day-body">
                  <div
                    v-for="shift in day.shifts"
                    :key="shift.shift_id"
                    class="shift-chip"
                    :class="getShiftColor(shift)"
                    @click="router.push({ name: 'employerSchedule' })"
                  >
                    <div class="text-caption font-weight-bold">
                      {{ formatShiftTime(shift.startTime) }}-{{ formatShiftTime(shift.endTime) }}
                    </div>
                    <div class="text-caption">
                      {{ shift.employeeName || "Open" }}
                    </div>
                  </div>

                  <!-- Add shift button -->
                  <div
                    class="add-shift-btn"
                    @click="showCreateShiftDialog = true"
                  >
                    + Add
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card>

      </v-container>
    </v-main>

    <v-dialog v-model="showAllNotificationsDialog" max-width="560" scrollable>
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          View all Alerts &amp; Notifications
          <v-btn
            icon="mdi-close"
            variant="plain"
            size="small"
            style="float:right"
            @click="showAllNotificationsDialog = false"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0" style="max-height: 480px; overflow-y: auto;">
          <div
            v-for="(notif, index) in notifications"
            :key="notif.notification_id"
          >
            <div class="pa-4">
              <div class="d-flex justify-space-between align-start mb-1">
                <span class="text-body-2 font-weight-bold">{{ notif.title }}</span>
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="plain"
                  @click="dismissNotification(notif.notification_id)"
                />
              </div>
              <p class="text-body-2 text-medium-emphasis mb-1">{{ notif.description }}</p>
              <span class="text-caption text-disabled">{{ formatTimeAgo(notif.created_at) }}</span>

              <div v-if="notif.type === 'swap_request'" class="d-flex ga-2 mt-3 flex-wrap">
                <v-btn color="success" variant="flat" size="x-small" @click="handleApproveSwap(notif)">Approve</v-btn>
                <v-btn color="error" variant="flat" size="x-small" @click="handleDenySwap(notif)">Deny</v-btn>
                <v-btn variant="tonal" size="x-small">Find Replacement</v-btn>
              </div>
              <div v-if="notif.type === 'task_completed'" class="mt-3">
                <v-btn variant="tonal" size="x-small" @click="handleMarkAsRead(notif.notification_id)">Mark as Read</v-btn>
              </div>
            </div>
            <v-divider v-if="index < notifications.length - 1" />
          </div>

          <!-- Empty state in modal -->
          <div v-if="notifications.length === 0" class="pa-6 text-center text-medium-emphasis text-body-2">
            No notifications
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCreateShiftDialog" max-width="480">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Create New Shift
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="newShift.date"
            label="Date"
            type="date"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="newShift.startTime"
                label="Start Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newShift.endTime"
                label="End Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-select
            v-model="newShift.userId"
            :items="employees"
            :item-title="(e) => `${e.fName} ${e.lName}`"
            item-value="user_id"
            label="Assign Employee (optional)"
            variant="outlined"
            density="compact"
            clearable
            class="mb-3"
          />
          <v-textarea
            v-model="newShift.notes"
            label="Notes (optional)"
            variant="outlined"
            density="compact"
            rows="2"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCreateShiftDialog = false">Cancel</v-btn>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            :loading="creatingShift"
            @click="handleCreateShift"
          >
            Create Shift
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showAddEmployeeDialog" max-width="480">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Add Employee
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="newEmployee.fName"
                label="First Name"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newEmployee.lName"
                label="Last Name"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model="newEmployee.email"
            label="Email"
            type="email"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-model="newEmployee.phone_number"
            label="Phone Number"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-model="newEmployee.password_hash"
            label="Temporary Password"
            type="password"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-select
            v-model="newEmployee.role"
            :items="['employee', 'employer']"
            label="Role"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddEmployeeDialog = false">Cancel</v-btn>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            :loading="addingEmployee"
            @click="handleAddEmployee"
          >
            Add Employee
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbarMessage }}
    </v-snackbar>

  </v-app>
</template>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  overflow-x: auto;
  min-width: 0;
}

.calendar-day {
  min-width: 80px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.calendar-day-header {
  background: #f0f0f0;
  padding: 6px 8px;
  text-align: center;
  border-bottom: 1px solid #e8e8e8;
}

.calendar-day-body {
  padding: 6px;
  min-height: 80px;
}

.shift-chip {
  border-radius: 5px;
  padding: 4px 6px;
  margin-bottom: 4px;
  cursor: pointer;
  font-size: 10px;
  line-height: 1.4;
}

.shift-chip:hover { opacity: 0.8; }

.add-shift-btn {
  width: 100%;
  padding: 3px;
  border: 1px dashed #ccc;
  background: none;
  border-radius: 4px;
  font-size: 10px;
  color: #999;
  cursor: pointer;
  text-align: center;
  margin-top: 4px;
  transition: all 0.15s;
}

.add-shift-btn:hover {
  border-color: #7b1c2e;
  color: #7b1c2e;
}
</style>