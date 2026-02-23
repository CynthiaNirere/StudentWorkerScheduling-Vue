<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';

const router = useRouter();
const rail = ref(true);
const currentTime = ref('');
const currentDate = ref('');
const user = ref(null);
const showNotifications = ref(false);
const unreadCount = ref(3);
const businessArea = ref('The Brew');

// ─── TASKS ────────────────────────────────────────────────────────────────
const todaysTasks = ref([
  { id: 1, title: 'Restock supplies', dueTime: 'Due end of shift', completed: false },
  { id: 2, title: 'Clean equipment', dueTime: 'Due end of shift', completed: false }
]);

const allTasksCompleted = computed(() => {
  return todaysTasks.value.length > 0 && todaysTasks.value.every(t => t.completed);
});

const submitTasks = () => {
  console.log('Tasks submitted:', todaysTasks.value);
  alert('Tasks submitted!');
};

const toggleTask = (taskId) => {
  const task = todaysTasks.value.find(t => t.id === taskId);
  if (task) task.completed = !task.completed;
};

// ─── SHIFT SESSIONS ───────────────────────────────────────────────────────
const shiftSessions = ref([]);

const currentShift = computed(() => shiftSessions.value.find(s => s.status === 'checked-in'));
const completedShifts = computed(() => shiftSessions.value.filter(s => s.status === 'checked-out'));
const totalHoursThisWeek = computed(() =>
  completedShifts.value.reduce((sum, shift) => sum + parseFloat(shift.totalHours || 0), 0).toFixed(1)
);

const checkIn = () => {
  const now = new Date();
  shiftSessions.value.push({
    id: shiftSessions.value.length + 1,
    checkInTime: now.getTime(),
    checkOutTime: null,
    totalHours: 0,
    status: 'checked-in'
  });
};

const checkOut = (shiftId) => {
  const shift = shiftSessions.value.find(s => s.id === shiftId);
  if (shift) {
    const now = new Date();
    shift.checkOutTime = now.getTime();
    shift.status = 'checked-out';
    shift.totalHours = calculateTotalHours(shift.checkInTime, shift.checkOutTime);
  }
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────
const notifications = ref([
  {
    id: 1,
    type: 'Shift Cover Request',
    message: 'Alex Martinez needs someone for Tuesday 3PM-7PM',
    timestamp: '2 hours ago',
    action: 'Take it',
    priority: 'high',
    icon: 'mdi-calendar-check'
  },
  {
    id: 2,
    type: 'Urgent: Safety Alert',
    message: 'Manager: Please wear safety gear today - critical equipment malfunction risk',
    timestamp: '30 minutes ago',
    priority: 'high',
    icon: 'mdi-alert-circle'
  },
  {
    id: 3,
    type: 'Schedule Update',
    message: 'Your schedule for next week has been sent for approval',
    timestamp: '1 hour ago',
    priority: 'normal',
    icon: 'mdi-calendar-check'
  }
]);

const urgentNotifications = computed(() => notifications.value.filter(n => n.priority === 'high'));

const handleNotificationAction = (notificationId) => {
  notifications.value = notifications.value.filter(n => n.id !== notificationId);
  unreadCount.value = Math.max(0, unreadCount.value - 1);
};

const dismissNotification = (notificationId) => {
  notifications.value = notifications.value.filter(n => n.id !== notificationId);
  unreadCount.value = Math.max(0, unreadCount.value - 1);
};

const viewAllNotifications = () => { showNotifications.value = true; };

// ─── SCHEDULE & STATUS ────────────────────────────────────────────────────
const scheduleStatus = ref({
  status: 'approved',
  message: 'Your schedule has been approved',
  color: 'success',
  icon: 'mdi-check-circle'
});

const pendingRequests = ref([
  { id: 1, type: 'Time Off Request', date: 'March 10-12, 2026', status: 'pending', submitDate: 'Submitted 3 days ago' },
  { id: 2, type: 'Shift Swap', date: 'Thursday March 5', status: 'approved', submitDate: 'Approved 1 day ago' }
]);

const calendarShifts = ref([
  { date: '2026-02-16', employee: 'You', time: '9:00 AM - 5:00 PM', status: 'confirmed' },
  { date: '2026-02-18', employee: 'You', time: '2:00 PM - 10:00 PM', status: 'confirmed' },
  { date: '2026-02-19', employee: 'You', time: '9:00 AM - 1:00 PM', status: 'available' },
]);

const nextShift = computed(() => {
  const upcoming = calendarShifts.value.find(
    s => s.employee === 'You' && s.status === 'confirmed' && new Date(s.date) > new Date()
  );
  if (upcoming) {
    const date = new Date(upcoming.date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return upcoming.time.split(' - ')[0] + ' Tomorrow';
    }
    return upcoming.time.split(' - ')[0] + ' ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return 'No upcoming shifts';
});

// ─── USER INFO ────────────────────────────────────────────────────────────
const userGreeting = computed(() => user.value?.fName || 'Employee');
const userInitials = computed(() =>
  (user.value?.fName?.[0] || '') + (user.value?.lName?.[0] || '') || 'E'
);

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────
const formatTime = (timestamp) => {
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const calculateTotalHours = (checkIn, checkOut) => {
  if (checkIn && checkOut) return ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);
  return 0;
};

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  currentDate.value = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const getStatusChipColor = (status) => {
  switch (status) {
    case 'pending': return '#f57c00';
    case 'approved': return '#2e7d32';
    case 'needs-changes': return '#d32f2f';
    default: return 'grey';
  }
};

const logout = () => {
  Utils.setStore('user', null);
  router.push('/login');
};

// ─── LIFECYCLE ────────────────────────────────────────────────────────────
onMounted(() => {
  user.value = Utils.getStore('user');
  updateTime();
  setInterval(updateTime, 1000);
});
</script>

<template>
  <v-app>
    <!-- ── Sidebar Navigation ───────────────────────────────────────────── -->
    <v-navigation-drawer
      :rail="rail"
      @mouseenter="rail = false"
      @mouseleave="rail = true"
      permanent
      width="280"
      class="employee-sidebar"
    >
      <!-- Header -->
      <div class="sidebar-header d-flex align-center pa-4" style="min-height: 64px; background: rgba(0,0,0,0.15);">
        <template v-if="!rail">
          <div>
            <h2 class="text-h6 font-weight-bold text-white mb-0">TalonTime</h2>
            <p class="text-caption text-white mb-0" style="opacity: 0.8">{{ businessArea }}</p>
          </div>
        </template>
        <v-icon v-else size="32" color="white">mdi-calendar-clock</v-icon>
      </div>

      <v-divider style="border-color: rgba(255,255,255,0.2)" />

      <v-list nav class="px-2 mt-2">
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          active
          rounded="lg"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-clock-outline"
          title="My Availability"
          rounded="lg"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-calendar-clock"
          title="Shift Requests"
          rounded="lg"
          class="mb-1"
        />
        <v-list-item
          prepend-icon="mdi-checkbox-marked-circle-outline"
          title="My Tasks"
          rounded="lg"
          class="mb-1"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- ── App Bar ───────────────────────────────────────────────────────── -->
    <v-app-bar color="white" elevation="0" style="border-bottom: 1px solid #e0e0e0;" density="compact">
      <v-spacer />

      <!-- Notification Bell -->
      <v-menu location="bottom" v-model="showNotifications">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon class="mr-1">
            <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error">
              <v-icon>mdi-bell</v-icon>
            </v-badge>
          </v-btn>
        </template>
        <v-card min-width="400" max-width="500" style="max-height: 500px; overflow-y: auto;">
          <v-card-title class="text-h6 font-weight-bold pa-4">Notifications</v-card-title>
          <v-divider />
          <div v-if="notifications.length === 0" class="text-center pa-6">
            <p class="text-grey">No notifications</p>
          </div>
          <div v-else>
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="pa-4"
              style="border-bottom: 1px solid #f0f0f0;"
            >
              <div class="d-flex ga-3">
                <v-icon color="primary" size="large">{{ notification.icon }}</v-icon>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-start mb-1">
                    <p class="text-body-2 font-weight-bold mb-0">{{ notification.type }}</p>
                    <v-btn icon size="x-small" variant="text" @click="dismissNotification(notification.id)">
                      <v-icon size="small">mdi-close</v-icon>
                    </v-btn>
                  </div>
                  <p class="text-body-2 mb-1">{{ notification.message }}</p>
                  <p class="text-caption text-grey mb-2">{{ notification.timestamp }}</p>
                  <v-btn
                    v-if="notification.action"
                    size="small"
                    color="primary"
                    variant="flat"
                    @click="handleNotificationAction(notification.id)"
                  >
                    {{ notification.action }}
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-menu>

      <!-- Profile Dropdown -->
      <v-menu location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon size="small" class="mr-2">
            <v-avatar size="36" color="#12086F" class="text-caption font-weight-bold text-white">
              {{ userInitials }}
            </v-avatar>
          </v-btn>
        </template>
        <v-card min-width="200">
          <v-card-text class="pa-4">
            <div class="text-center mb-3">
              <v-avatar size="48" color="#12086F" class="text-caption font-weight-bold text-white mb-2">
                {{ userInitials }}
              </v-avatar>
              <p class="text-body-2 font-weight-bold mb-0">{{ userGreeting }} {{ user?.lName || '' }}</p>
              <p class="text-caption text-grey">{{ user?.email }}</p>
            </div>
            <v-divider class="mb-2" />
            <v-list density="compact" class="pa-0">
              <v-list-item prepend-icon="mdi-account" title="Profile" @click="() => {}" />
              <v-list-item
                prepend-icon="mdi-logout"
                title="Sign Out"
                class="text-error"
                @click="logout"
              />
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- ── Main Content ──────────────────────────────────────────────────── -->
    <v-main style="background: #f5f5f5;">

      <!-- Urgent Banner -->
      <div v-if="urgentNotifications.length > 0" class="urgent-banner pa-3">
        <div class="d-flex align-center ga-2">
          <v-icon color="primary" size="small">mdi-alert</v-icon>
          <p class="text-body-2 mb-0 flex-grow-1">
            <strong>{{ urgentNotifications[0].type }}:</strong> {{ urgentNotifications[0].message }}
          </p>
          <v-btn size="small" variant="text" @click="viewAllNotifications">View All</v-btn>
        </div>
      </div>

      <v-container fluid class="pa-6">
        <!-- Page Title -->
        <div class="mb-6">
          <h1 class="text-h4 font-weight-bold navy-text mb-1">Dashboard</h1>
          <p class="text-body-2 text-grey">Hi, {{ userGreeting }}! • {{ businessArea }}</p>
        </div>

        <v-row align="start">
          <!-- ── LEFT: Clock In/Out + Tasks ──────────────────────────────── -->
          <v-col cols="12" lg="4" xl="3">

            <!-- Clock In/Out Card -->
            <v-card variant="outlined" rounded="lg" class="navy-card mb-6">
              <v-card-text class="pa-6">
                <!-- Current Time -->
                <div class="text-center mb-5">
                  <p class="text-caption text-grey mb-2">Current Time</p>
                  <div class="clock-display">
                    <p class="text-h3 font-weight-bold mb-0">{{ currentTime }}</p>
                  </div>
                  <p class="text-body-2 text-grey mt-3 mb-0">{{ currentDate }}</p>
                </div>

                <v-divider class="my-4" />

                <!-- Today's Shift Info -->
                <div class="shift-info mb-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">Today's Shift</p>
                  <p class="text-body-2 font-weight-bold mb-0">9:00 AM - 5:00 PM @ {{ businessArea }}</p>
                </div>

                <v-divider class="my-4" />

                <!-- Active Shift -->
                <div v-if="currentShift" class="active-shift mb-4">
                  <div class="d-flex justify-space-between align-center mb-3">
                    <p class="text-body-2 font-weight-bold mb-0">Shift #{{ currentShift.id }} — Active</p>
                    <v-chip color="success" size="small" variant="tonal">In Progress</v-chip>
                  </div>
                  <v-row dense class="mb-3">
                    <v-col cols="6" class="text-center">
                      <p class="text-caption text-grey mb-1">Check In</p>
                      <p class="text-body-2 font-weight-bold mb-0">{{ formatTime(currentShift.checkInTime) }}</p>
                    </v-col>
                    <v-col cols="6" class="text-center">
                      <p class="text-caption text-grey mb-1">Duration</p>
                      <p class="text-body-2 font-weight-bold text-primary mb-0">Running...</p>
                    </v-col>
                  </v-row>
                  <v-btn block color="#12086F" variant="flat" @click="checkOut(currentShift.id)">
                    Check Out
                  </v-btn>
                </div>

                <!-- Completed Shifts -->
                <div v-if="completedShifts.length > 0" class="mb-4">
                  <div class="d-flex justify-space-between align-center mb-3">
                    <p class="text-body-2 font-weight-bold mb-0">Completed Shifts</p>
                    <div class="text-right">
                      <p class="text-caption text-grey mb-0">This Week</p>
                      <p class="text-subtitle-2 font-weight-bold text-success mb-0">{{ totalHoursThisWeek }}h</p>
                    </div>
                  </div>
                  <div v-for="shift in completedShifts" :key="shift.id" class="completed-shift-card mb-2">
                    <div class="d-flex justify-space-between align-center mb-1">
                      <p class="text-body-2 font-weight-bold mb-0">Shift #{{ shift.id }}</p>
                      <v-chip color="grey" size="small" variant="tonal">Completed</v-chip>
                    </div>
                    <v-row dense>
                      <v-col cols="4" class="text-center">
                        <p class="text-caption text-grey mb-0">In</p>
                        <p class="text-caption font-weight-bold mb-0">{{ formatTime(shift.checkInTime) }}</p>
                      </v-col>
                      <v-col cols="4" class="text-center">
                        <p class="text-caption text-grey mb-0">Out</p>
                        <p class="text-caption font-weight-bold mb-0">{{ formatTime(shift.checkOutTime) }}</p>
                      </v-col>
                      <v-col cols="4" class="text-center">
                        <p class="text-caption text-grey mb-0">Hours</p>
                        <p class="text-caption font-weight-bold text-success mb-0">{{ shift.totalHours }}h</p>
                      </v-col>
                    </v-row>
                  </div>
                </div>

                <!-- Next Shift -->
                <div
                  v-if="!currentShift && completedShifts.length > 0"
                  class="text-center mb-4 pa-3"
                  style="background: #f0f7ff; border-radius: 8px;"
                >
                  <p class="text-caption text-grey mb-1">Next Shift</p>
                  <p class="text-subtitle-2 font-weight-bold text-primary mb-0">{{ nextShift }}</p>
                </div>

                <!-- Check In Button -->
                <v-btn v-if="!currentShift" block color="#12086F" variant="flat" size="large" @click="checkIn">
                  {{ shiftSessions.length === 0 ? 'Start First Shift' : `Start Shift #${shiftSessions.length + 1}` }}
                </v-btn>
              </v-card-text>
            </v-card>

            <!-- Tasks Card -->
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center ga-2">
                <v-icon>mdi-checkbox-marked-circle-outline</v-icon>
                Today's Tasks
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-4">
                <div v-if="todaysTasks.length === 0" class="text-center py-4">
                  <p class="text-grey text-body-2">No tasks assigned</p>
                </div>
                <div v-for="task in todaysTasks" :key="task.id" class="mb-2">
                  <v-checkbox
                    :model-value="task.completed"
                    @update:model-value="toggleTask(task.id)"
                    hide-details
                    color="#12086F"
                    density="compact"
                  >
                    <template #label>
                      <div class="ml-2">
                        <p :class="['text-body-2 mb-0', { 'text-decoration-line-through text-grey': task.completed }]">
                          {{ task.title }}
                        </p>
                        <p class="text-caption text-grey mb-0">{{ task.dueTime }}</p>
                      </div>
                    </template>
                  </v-checkbox>
                </div>
              </v-card-text>
              <v-divider />
              <v-card-actions class="pa-4">
                <v-btn
                  block
                  :color="allTasksCompleted ? 'success' : 'grey'"
                  :variant="allTasksCompleted ? 'flat' : 'outlined'"
                  :disabled="!allTasksCompleted"
                  @click="submitTasks"
                >
                  Submit Completed Tasks
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <!-- ── RIGHT: Calendar + Pending Requests ──────────────────────── -->
          <v-col cols="12" lg="8" xl="9">

            <!-- Schedule Card -->
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h6 font-weight-bold">This Week's Schedule Preview</span>
                <div class="d-flex align-center ga-3">
                  <v-chip :color="scheduleStatus.color" size="small" variant="tonal">
                    <v-icon start size="small">{{ scheduleStatus.icon }}</v-icon>
                    {{ scheduleStatus.status === 'approved' ? 'Approved' : 'Pending' }}
                  </v-chip>
                  <v-btn variant="text" size="small" color="#4361EE">View Full Schedule</v-btn>
                </div>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-4">
                <div class="calendar-scroll">
                  <div class="calendar-grid">

                    <!-- Calendar Header -->
                    <div class="calendar-header">
                      <div v-for="(day, i) in ['MON','TUE','WED','THU','FRI','SAT','SUN']" :key="day" class="calendar-day-header">
                        <span class="day-header-name">{{ day }}</span>
                        <span class="day-header-number">{{ [16,17,18,19,20,21,22][i] }}</span>
                      </div>
                    </div>

                    <!-- Calendar Body -->
                    <div class="calendar-body">
                      <!-- MON -->
                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box">
                            <div class="shift-time">9AM–5PM</div>
                            <div class="shift-person">You</div>
                          </div>
                          <div class="shift-box">
                            <div class="shift-time">2PM–10PM</div>
                            <div class="shift-person">Alex M.</div>
                          </div>
                          <div class="shift-box">
                            <div class="shift-time">10AM–6PM</div>
                            <div class="shift-person">Sam W.</div>
                          </div>
                        </div>
                        <div class="add-shift-btn">+ Add Shift</div>
                      </div>

                      <!-- TUE -->
                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box shift-off">
                            <div class="shift-person">You</div>
                            <div class="shift-status-text">Day Off</div>
                          </div>
                          <p class="no-shifts-text">No shifts</p>
                        </div>
                        <div class="add-shift-btn">+ Add Shift</div>
                      </div>

                      <!-- WED -->
                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box">
                            <div class="shift-time">2PM–10PM</div>
                            <div class="shift-person">You</div>
                          </div>
                          <div class="shift-box">
                            <div class="shift-time">9AM–5PM</div>
                            <div class="shift-person">Jordan L.</div>
                            <div class="shift-status-text">Pending Swap</div>
                          </div>
                        </div>
                        <div class="add-shift-btn">+ Add Shift</div>
                      </div>

                      <!-- THU -->
                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box">
                            <div class="shift-time">9AM–1PM</div>
                            <div class="shift-person">You</div>
                            <div class="shift-status-text">Available</div>
                            <v-btn size="x-small" color="#12086F" variant="flat" class="claim-btn mt-1">CLAIM</v-btn>
                          </div>
                          <p class="no-shifts-text">No shifts</p>
                        </div>
                        <div class="add-shift-btn">+ Add Shift</div>
                      </div>

                      <!-- FRI -->
                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box">
                            <div class="shift-time">10AM–6PM</div>
                            <div class="shift-person">You</div>
                          </div>
                          <p class="no-shifts-text">No shifts</p>
                        </div>
                        <div class="add-shift-btn">+ Add Shift</div>
                      </div>

                      <!-- SAT -->
                      <div class="calendar-day">
                        <p class="no-shifts-text">No shifts</p>
                        <div class="add-shift-btn">+ Add Shift</div>
                      </div>

                      <!-- SUN -->
                      <div class="calendar-day">
                        <p class="no-shifts-text">No shifts</p>
                        <div class="add-shift-btn">+ Add Shift</div>
                      </div>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Pending Requests Card -->
            <v-card variant="outlined" rounded="lg" class="navy-card mt-6">
              <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center ga-2">
                <v-icon>mdi-clock-alert</v-icon>
                Pending Requests
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-4">
                <div v-if="pendingRequests.length === 0" class="text-center py-4">
                  <p class="text-grey text-body-2">No pending requests</p>
                </div>
                <div v-else class="compact-rect-list">
                  <div v-for="request in pendingRequests" :key="request.id" class="compact-rect">
                    <div class="compact-rect-left">
                      <p class="compact-title">{{ request.type }}</p>
                      <p class="compact-sub">{{ request.date }}</p>
                      <p class="compact-meta">{{ request.submitDate }}</p>
                    </div>
                    <div class="compact-rect-right">
                      <v-chip :color="getStatusChipColor(request.status)" variant="tonal" size="small">
                        {{ request.status }}
                      </v-chip>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
/* ── Sidebar ────────────────────────────────────────────────────────────── */
.employee-sidebar {
  background: linear-gradient(180deg, #12086F 0%, #2B354F 100%) !important;
}

.employee-sidebar :deep(.v-list-item__prepend .v-icon) {
  color: white !important;
  opacity: 1 !important;
}

.employee-sidebar :deep(.v-list-item-title) {
  color: white !important;
}

.employee-sidebar :deep(.v-list-item) {
  transition: all 0.2s;
}

.employee-sidebar :deep(.v-list-item:hover) {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.employee-sidebar :deep(.v-list-item--active) {
  background-color: rgba(255, 255, 255, 0.14) !important;
}

/* ── Utilities ──────────────────────────────────────────────────────────── */
.navy-text {
  color: #12086F !important;
}

.navy-card {
  border-color: #e0e0e0 !important;
  box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05) !important;
}

/* ── Urgent Banner ──────────────────────────────────────────────────────── */
.urgent-banner {
  background-color: #eef0fb;
  border-bottom: 1px solid #c5cae9;
}

/* ── Clock Display ──────────────────────────────────────────────────────── */
.clock-display {
  padding: 20px;
  background: linear-gradient(135deg, #12086f 0%, #1c10a8 100%);
  border-radius: 12px;
  margin: 8px 0;
  color: white;
}

/* ── Shift Cards (inside clock panel) ──────────────────────────────────── */
.shift-info {
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.completed-shift-card {
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border-left: 3px solid #12086f;
}

.active-shift {
  padding: 16px;
  background-color: #f0f7f4;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

/* ── Pending Requests ───────────────────────────────────────────────────── */
.compact-rect-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.compact-rect {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  padding: 16px;
  min-height: 80px;
  transition: all 0.2s;
}

.compact-rect:hover {
  background: #f5f5f5;
  box-shadow: 0 2px 8px rgba(18, 8, 111, 0.08);
  transform: translateY(-1px);
}

.compact-rect-left { flex: 1; min-width: 0; }
.compact-title { margin: 0 0 6px; font-weight: 700; font-size: 1rem; color: #222; }
.compact-sub { margin: 0 0 4px; font-size: 0.875rem; color: #555; }
.compact-meta { margin: 0; font-size: 0.75rem; color: #999; font-style: italic; }
.compact-rect-right { flex-shrink: 0; margin-left: 16px; }

/* ── Calendar ───────────────────────────────────────────────────────────── */
.calendar-scroll {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 8px;
}

.calendar-scroll::-webkit-scrollbar { height: 6px; }
.calendar-scroll::-webkit-scrollbar-thumb { background: #cfcfcf; border-radius: 999px; }
.calendar-scroll::-webkit-scrollbar-track { background: transparent; }

.calendar-grid {
  min-width: 700px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #e0e0e0;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.calendar-day-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  padding: 10px 8px 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.day-header-name {
  font-weight: 700;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.day-header-number {
  font-size: 1.75rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.18);
  line-height: 1;
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e0e0e0;
}

.calendar-day {
  background: white;
  padding: 8px;
  min-height: 200px;
}

.shifts-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
}

.shift-box {
  padding: 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-left: 3px solid #4361EE;
  cursor: pointer;
  transition: all 0.15s;
}

.shift-box:hover {
  opacity: 0.85;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(18, 8, 111, 0.1);
}

.shift-off {
  background: #f1f5f9 !important;
  border-left-color: #94a3b8 !important;
}

.shift-time {
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
}

.shift-person {
  color: #475569;
  font-size: 0.7rem;
}

.shift-status-text {
  font-style: italic;
  font-size: 0.65rem;
  color: #64748b;
  margin-top: 2px;
}

.no-shifts-text {
  text-align: center;
  color: #9ca3af;
  font-size: 0.75rem;
  margin: 4px 0;
  padding: 4px 0;
}

.add-shift-btn {
  width: 100%;
  padding: 6px;
  border: 1px dashed #4361EE;
  background: none;
  border-radius: 5px;
  font-size: 12px;
  color: #4361EE;
  cursor: pointer;
  text-align: center;
  margin-top: 6px;
  transition: all 0.15s;
}

.add-shift-btn:hover {
  border-color: #12086F;
  color: #12086F;
  background: rgba(18, 8, 111, 0.05);
}

.claim-btn {
  font-size: 0.6rem;
  height: 20px;
  min-width: unset;
  padding: 0 6px;
}
</style>
