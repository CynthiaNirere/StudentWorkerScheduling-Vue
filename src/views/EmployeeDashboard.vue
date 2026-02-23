<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';

const router = useRouter();
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
  if (task) {
    task.completed = !task.completed;
  }
};

// ─── SHIFT SESSIONS ───────────────────────────────────────────────────────
const shiftSessions = ref([]);

const currentShift = computed(() => {
  return shiftSessions.value.find(s => s.status === 'checked-in');
});

const completedShifts = computed(() => {
  return shiftSessions.value.filter(s => s.status === 'checked-out');
});

const totalHoursThisWeek = computed(() => {
  return completedShifts.value.reduce((sum, shift) => sum + parseFloat(shift.totalHours || 0), 0).toFixed(1);
});

const checkIn = () => {
  const now = new Date();
  const newShift = {
    id: shiftSessions.value.length + 1,
    checkInTime: now.getTime(),
    checkOutTime: null,
    totalHours: 0,
    status: 'checked-in'
  };
  shiftSessions.value.push(newShift);
  console.log('Employee checked in at:', formatTime(newShift.checkInTime));
};

const checkOut = (shiftId) => {
  const shift = shiftSessions.value.find(s => s.id === shiftId);
  if (shift) {
    const now = new Date();
    shift.checkOutTime = now.getTime();
    shift.status = 'checked-out';
    shift.totalHours = calculateTotalHours(shift.checkInTime, shift.checkOutTime);
    console.log('Employee checked out at:', formatTime(shift.checkOutTime));
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

const urgentNotifications = computed(() => {
  return notifications.value.filter(n => n.priority === 'high');
});

const handleNotificationAction = (notificationId) => {
  console.log('Action taken on notification:', notificationId);
  notifications.value = notifications.value.filter(n => n.id !== notificationId);
  unreadCount.value = Math.max(0, unreadCount.value - 1);
};

const dismissNotification = (notificationId) => {
  notifications.value = notifications.value.filter(n => n.id !== notificationId);
  unreadCount.value = Math.max(0, unreadCount.value - 1);
};

const viewAllNotifications = () => {
  showNotifications.value = true;
};

// ─── SCHEDULE & STATUS ────────────────────────────────────────────────────
const scheduleStatus = ref({
  status: 'approved',
  submittedDate: '2 days ago',
  message: 'Your schedule has been approved',
  color: 'success',
  icon: 'mdi-check-circle'
});

const pendingRequests = ref([
  {
    id: 1,
    type: 'Time Off Request',
    date: 'March 10-12, 2026',
    status: 'pending',
    submitDate: 'Submitted 3 days ago'
  },
  {
    id: 2,
    type: 'Shift Swap',
    date: 'Thursday March 5',
    status: 'approved',
    submitDate: 'Approved 1 day ago'
  }
]);

const calendarShifts = ref([
  { date: '2026-02-16', employee: 'You', time: '9:00 AM - 5:00 PM', status: 'confirmed', color: '#4caf50' },
  { date: '2026-02-16', employee: 'Alex Martinez', time: '2:00 PM - 10:00 PM', status: 'confirmed', color: '#4caf50' },
  { date: '2026-02-16', employee: 'Sam Wilson', time: '10:00 AM - 6:00 PM', status: 'confirmed', color: '#4caf50' },
  { date: '2026-02-17', employee: 'You', time: 'OFF', status: 'off', color: '#e0e0e0' },
  { date: '2026-02-18', employee: 'You', time: '2:00 PM - 10:00 PM', status: 'confirmed', color: '#4caf50' },
  { date: '2026-02-18', employee: 'Jordan Lee', time: '9:00 AM - 5:00 PM', status: 'pending-swap', color: '#ff9800' },
  { date: '2026-02-19', employee: 'You', time: '9:00 AM - 1:00 PM', status: 'available', color: '#2196f3' },
]);

const nextShift = computed(() => {
  const upcoming = calendarShifts.value.find(s => s.employee === 'You' && s.status === 'confirmed' && new Date(s.date) > new Date());
  if (upcoming) {
    const date = new Date(upcoming.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
      return upcoming.time.split(' - ')[0] + ' Tomorrow';
    }
    return upcoming.time.split(' - ')[0] + ' ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return 'No upcoming shifts';
});

const requestShiftSwap = (shiftDate) => {
  console.log('Request shift swap for:', shiftDate);
  alert('Shift swap request submitted!');
};

// ─── TEAM MEMBERS ─────────────────────────────────────────────────────────
const teamMembers = ref([
  { id: 1, name: 'You (Tessy)', role: 'Barista', status: 'off-shift', avatar: 'T' },
  { id: 2, name: 'Alex Martinez', role: 'Barista', status: 'on-shift', avatar: 'AM', shiftEnd: '10:00 PM' },
  { id: 3, name: 'Sam Wilson', role: 'Manager', status: 'on-shift', avatar: 'SW', shiftEnd: '6:00 PM' },
  { id: 4, name: 'Jordan Lee', role: 'Barista', status: 'off-shift', avatar: 'JL' },
  { id: 5, name: 'Maria Garcia', role: 'Barista', status: 'on-shift', avatar: 'MG', shiftEnd: '8:00 PM' },
]);

// ─── USER INFO ────────────────────────────────────────────────────────────
const userGreeting = computed(() => {
  if (user.value) {
    return `${user.value.fName || 'Employee'}`;
  }
  return 'Employee';
});

const userInitials = computed(() => {
  if (user.value) {
    return (user.value.fName?.[0] || '') + (user.value.lName?.[0] || '');
  }
  return 'E';
});

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────
const formatTime = (timestamp) => {
  if (!timestamp) return '--:--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const calculateTotalHours = (checkIn, checkOut) => {
  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffMs = checkOutDate - checkInDate;
    const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
    return diffHours;
  }
  return 0;
};

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDate.value = now.toLocaleDateString('en-US', options);
};

const getStatusChipColor = (status) => {
  switch(status) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'needs-changes': return 'error';
    default: return 'grey';
  }
};

const getShiftStatusColor = (status) => {
  switch(status) {
    case 'confirmed': return '#4caf50';
    case 'pending-swap': return '#ff9800';
    case 'available': return '#2196f3';
    case 'off': return '#e0e0e0';
    default: return '#9e9e9e';
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
  <div class="dashboard-container">
    <!-- Sidebar Navigation -->
    <v-navigation-drawer permanent class="sidebar">
      <!-- Logo/Header -->
      <div class="sidebar-header pa-4">
        <h2 class="text-h6 font-weight-bold text-white">TalonTime</h2>
        <p class="text-caption text-white-80 mt-2 mb-0">{{ businessArea }}</p>
      </div>

      <v-divider></v-divider>

      <!-- Navigation Items -->
      <v-list nav>
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          active
          color="primary"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-clock-outline"
          title="My Availability"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-calendar-clock"
          title="Shift Requests"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-checkbox-marked-circle-outline"
          title="My Tasks"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Header -->
      <div class="dashboard-header pa-6 d-flex justify-space-between align-center">
        <div>
          <h1 class="text-h4 font-weight-bold mb-1">Dashboard</h1>
          <p class="text-body-2 text-grey">Hi, {{ userGreeting }}! • {{ businessArea }}</p>
        </div>
        <div class="header-right d-flex align-center gap-3">
          <!-- Notifications Bell -->
          <v-menu location="bottom" v-model="showNotifications">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon size="large" class="notification-bell">
                <v-badge :content="unreadCount" :value="unreadCount > 0" color="error">
                  <v-icon>mdi-bell</v-icon>
                </v-badge>
              </v-btn>
            </template>

            <v-card min-width="400" max-width="500" class="notification-panel">
              <v-card-title class="text-h6 font-weight-bold pa-4">
                Notifications
              </v-card-title>
              <v-divider></v-divider>

              <div v-if="notifications.length === 0" class="text-center pa-6">
                <p class="text-grey">No notifications</p>
              </div>

              <div v-else class="notification-list">
                <div v-for="(notification, index) in notifications" :key="notification.id" class="notification-item pa-4">
                  <div class="d-flex gap-3">
                    <v-icon color="primary" size="large">
                      {{ notification.icon }}
                    </v-icon>
                    <div class="flex-grow-1">
                      <div class="d-flex justify-space-between align-start mb-2">
                        <p class="text-body-2 font-weight-bold">{{ notification.type }}</p>
                        <v-btn icon size="x-small" @click="dismissNotification(notification.id)">
                          <v-icon size="small">mdi-close</v-icon>
                        </v-btn>
                      </div>
                      <p class="text-body-2 mb-2">{{ notification.message }}</p>
                      <p class="text-caption text-grey mb-2">{{ notification.timestamp }}</p>
                      <v-btn
                        v-if="notification.action"
                        size="small"
                        color="primary"
                        @click="handleNotificationAction(notification.id)"
                      >
                        {{ notification.action }}
                      </v-btn>
                    </div>
                  </div>
                  <v-divider v-if="index !== notifications.length - 1" class="mt-4"></v-divider>
                </div>
              </div>
            </v-card>
          </v-menu>

          <!-- Profile Dropdown Menu -->
          <v-menu location="bottom end">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon size="large" class="profile-btn">
                <v-avatar size="48" color="primary" class="font-weight-bold text-white">
                  {{ userInitials }}
                </v-avatar>
              </v-btn>
            </template>

            <v-card min-width="250">
              <v-card-text class="pa-4">
                <!-- User Info Section -->
                <div class="text-center mb-4 pb-4 border-bottom">
                  <v-avatar size="56" color="primary" class="font-weight-bold text-white mb-3">
                    {{ userInitials }}
                  </v-avatar>
                  <p class="text-body-2 font-weight-bold mb-1">{{ userGreeting }} {{ user?.lName || '' }}</p>
                  <p class="text-caption text-grey mb-2">{{ user?.email }}</p>
                  <v-chip size="small" color="primary" text-color="white">
                    {{ user?.role || 'employee' }}
                  </v-chip>
                </div>

                <!-- Menu Items -->
                <v-list dense>
                  <v-list-item
                    prepend-icon="mdi-pencil"
                    title="Edit Profile"
                    @click="() => {}"
                  ></v-list-item>
                  <v-list-item
                    prepend-icon="mdi-cog"
                    title="Settings"
                    @click="() => {}"
                  ></v-list-item>
                </v-list>

                <v-divider class="my-2"></v-divider>

                <!-- Logout -->
                <v-list dense>
                  <v-list-item
                    prepend-icon="mdi-logout"
                    title="Sign Out"
                    class="text-error"
                    @click="logout"
                  ></v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-menu>
        </div>
      </div>

      <!-- Subtle Urgent Notifications Banner -->
      <div v-if="urgentNotifications.length > 0" class="urgent-banner pa-4">
        <v-row align="center" class="ma-0">
          <v-col cols="auto">
            <v-icon color="primary" size="small">mdi-alert</v-icon>
          </v-col>
          <v-col cols="auto" class="flex-grow-1">
            <p class="text-body-2 mb-0">
              <strong>{{ urgentNotifications[0].type }}:</strong> {{ urgentNotifications[0].message }}
            </p>
          </v-col>
          <v-col cols="auto">
            <v-btn size="small" variant="text" @click="viewAllNotifications">
              View All
            </v-btn>
          </v-col>
        </v-row>
      </div>

      <!-- Main Content -->
      <v-container fluid class="pa-6">
        <v-row class="dashboard-grid" align="start">
          <!-- LEFT: Time + Clock In/Out -->
          <v-col cols="12" lg="4" xl="3">
            <!-- Clock In/Out Section -->
            <v-card class="shadow-lg mb-6">
              <v-card-text class="pa-6">
                <!-- Current Time -->
                <div class="text-center mb-6">
                  <p class="text-caption text-grey mb-2">Current Time</p>
                  <div class="clock-display">
                    <p class="text-h3 font-weight-bold mb-0">{{ currentTime }}</p>
                  </div>
                  <p class="text-body-2 text-grey mt-4">{{ currentDate }}</p>
                </div>

                <v-divider class="my-6"></v-divider>

                <!-- Shift Info -->
                <div class="shift-info mb-6">
                  <h3 class="text-h6 font-weight-bold mb-2">Today's Shift</h3>
                  <p class="text-body-1 font-weight-bold">9:00 AM - 5:00 PM @ {{ businessArea }}</p>
                </div>

                <v-divider class="my-6"></v-divider>

                <!-- Current Shift Sessions -->
                <div class="shift-sessions">
                  <div v-if="currentShift" class="active-shift mb-6">
                    <div class="d-flex justify-space-between align-center mb-4">
                      <h4 class="text-body-1 font-weight-bold">Shift #{{ currentShift.id }} - Active</h4>
                      <v-chip color="success" size="small">In Progress</v-chip>
                    </div>
                    <v-row class="mb-4">
                      <v-col cols="6" class="text-center">
                        <p class="text-caption text-grey mb-2">Check In Time</p>
                        <p class="text-body-2 font-weight-bold">{{ formatTime(currentShift.checkInTime) }}</p>
                      </v-col>
                      <v-col cols="6" class="text-center">
                        <p class="text-caption text-grey mb-2">Duration</p>
                        <p class="text-body-2 font-weight-bold text-primary">Running...</p>
                      </v-col>
                    </v-row>
                    <v-btn block color="primary" @click="checkOut(currentShift.id)">
                      <v-icon left>mdi-clock-out</v-icon>
                      Check Out
                    </v-btn>
                  </div>

                  <div v-if="completedShifts.length > 0" class="completed-shifts mb-6">
                    <div class="d-flex justify-space-between align-center mb-3">
                      <p class="text-body-2 font-weight-bold">Completed Shifts</p>
                      <div class="text-center">
                        <p class="text-caption text-grey mb-1">Total This Week</p>
                        <p class="text-h6 font-weight-bold text-success">{{ totalHoursThisWeek }}h</p>
                      </div>
                    </div>
                    <div v-for="shift in completedShifts" :key="shift.id" class="shift-card mb-3">
                      <div class="d-flex justify-space-between align-center mb-2">
                        <p class="text-body-2 font-weight-bold">Shift #{{ shift.id }}</p>
                        <v-chip color="grey" size="small">Completed</v-chip>
                      </div>
                      <v-row class="mb-2">
                        <v-col cols="4" class="text-center">
                          <p class="text-caption text-grey">In</p>
                          <p class="text-body-2 font-weight-bold">{{ formatTime(shift.checkInTime) }}</p>
                        </v-col>
                        <v-col cols="4" class="text-center">
                          <p class="text-caption text-grey">Out</p>
                          <p class="text-body-2 font-weight-bold">{{ formatTime(shift.checkOutTime) }}</p>
                        </v-col>
                        <v-col cols="4" class="text-center">
                          <p class="text-caption text-grey">Hours</p>
                          <p class="text-body-2 font-weight-bold text-success">{{ shift.totalHours }}h</p>
                        </v-col>
                      </v-row>
                    </div>
                  </div>

                  <div
                    v-if="!currentShift && completedShifts.length > 0"
                    class="next-shift-info text-center mb-4 pa-4"
                    style="background-color: #f0f7ff; border-radius: 8px;"
                  >
                    <p class="text-caption text-grey mb-1">Next Shift</p>
                    <p class="text-h6 font-weight-bold text-primary">{{ nextShift }}</p>
                  </div>

                  <div v-if="!currentShift && shiftSessions.length === 0" class="text-center py-4">
                    <v-btn block color="primary" size="large" @click="checkIn">
                      <v-icon left>mdi-clock-in</v-icon>
                      Start First Shift
                    </v-btn>
                  </div>

                  <div v-if="!currentShift && shiftSessions.length > 0" class="text-center py-4">
                    <v-btn block color="primary" size="large" @click="checkIn">
                      <v-icon left>mdi-clock-in</v-icon>
                      Start Shift #{{ shiftSessions.length + 1 }}
                    </v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Tasks -->
            <v-card class="shadow-lg">
              <v-card-title class="text-h6 font-weight-bold pa-4">
                <v-icon left>mdi-checkbox-marked-circle-outline</v-icon>
                Today's Tasks
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <div v-if="todaysTasks.length === 0" class="text-center py-4">
                  <p class="text-grey text-body-2">No tasks assigned</p>
                </div>
                <div v-for="task in todaysTasks" :key="task.id" class="mb-3">
                  <v-checkbox
                    :model-value="task.completed"
                    @update:model-value="toggleTask(task.id)"
                    hide-details
                    size="small"
                  >
                    <template #label>
                      <div class="task-item">
                        <p :class="['text-body-2 mb-0', { 'text-decoration-line-through text-grey': task.completed }]">
                          {{ task.title }}
                        </p>
                        <p class="text-caption text-grey mb-0">{{ task.dueTime }}</p>
                      </div>
                    </template>
                  </v-checkbox>
                </div>
              </v-card-text>
              <v-card-actions class="pa-4 pt-0">
                <v-btn
                  block
                  :color="allTasksCompleted ? 'success' : 'grey'"
                  :disabled="!allTasksCompleted"
                  @click="submitTasks"
                >
                  Submit Completed Tasks
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <!-- RIGHT: Calendar + Pending Requests -->
          <v-col cols="12" lg="8" xl="9">
            <!-- Calendar -->
            <v-card class="shadow-lg">
              <v-card-title class="text-h6 font-weight-bold pa-6 d-flex justify-space-between align-center">
                <div>
                  <v-icon left>mdi-calendar-range</v-icon>
                  This Week's Schedule Preview
                </div>
                <v-chip :color="scheduleStatus.color" text-color="white" size="small">
                  <v-icon left size="small">{{ scheduleStatus.icon }}</v-icon>
                  {{ scheduleStatus.status === 'approved' ? 'Approved' : 'Pending' }}
                </v-chip>
              </v-card-title>
              <v-divider></v-divider>

              <v-card-text class="pa-6">
                <!-- Calendar Grid -->
                <div class="calendar-scroll">
                  <div class="calendar-grid">
                    <div class="calendar-header">
                      <div class="calendar-day-header">
                        <span class="day-header-name">MON</span>
                        <span class="day-header-number">16</span>
                      </div>
                      <div class="calendar-day-header">
                        <span class="day-header-name">TUE</span>
                        <span class="day-header-number">17</span>
                      </div>
                      <div class="calendar-day-header">
                        <span class="day-header-name">WED</span>
                        <span class="day-header-number">18</span>
                      </div>
                      <div class="calendar-day-header">
                        <span class="day-header-name">THU</span>
                        <span class="day-header-number">19</span>
                      </div>
                      <div class="calendar-day-header">
                        <span class="day-header-name">FRI</span>
                        <span class="day-header-number">20</span>
                      </div>
                      <div class="calendar-day-header">
                        <span class="day-header-name">SAT</span>
                        <span class="day-header-number">21</span>
                      </div>
                      <div class="calendar-day-header">
                        <span class="day-header-name">SUN</span>
                        <span class="day-header-number">22</span>
                      </div>
                    </div>

                    <div class="calendar-body">
                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box">
                            <div class="shift-time">9AM-5PM</div>
                            <div class="shift-person">You</div>
                          </div>
                          <div class="shift-box">
                            <div class="shift-time">2PM-10PM</div>
                            <div class="shift-person">Alex M.</div>
                          </div>
                          <div class="shift-box">
                            <div class="shift-time">10AM-6PM</div>
                            <div class="shift-person">Sam W.</div>
                          </div>
                        </div>
                      </div>

                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box shift-off">
                            <div class="shift-person">You</div>
                            <div class="shift-status-text">Day Off</div>
                          </div>
                          <p class="no-shifts-text">No shifts</p>
                        </div>
                      </div>

                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box">
                            <div class="shift-time">2PM-10PM</div>
                            <div class="shift-person">You</div>
                          </div>
                          <div class="shift-box">
                            <div class="shift-time">9AM-5PM</div>
                            <div class="shift-person">Jordan L.</div>
                            <div class="shift-status-text">Pending Swap</div>
                          </div>
                        </div>
                      </div>

                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box">
                            <div class="shift-time">9AM-1PM</div>
                            <div class="shift-person">You</div>
                            <div class="shift-status-text">Available</div>
                            <v-btn size="x-small" color="primary" variant="flat" class="claim-btn mt-1">
                              CLAIM
                            </v-btn>
                          </div>
                          <p class="no-shifts-text">No shifts</p>
                        </div>
                      </div>

                      <div class="calendar-day">
                        <div class="shifts-container">
                          <div class="shift-box">
                            <div class="shift-time">10AM-6PM</div>
                            <div class="shift-person">You</div>
                          </div>
                          <p class="no-shifts-text">No shifts</p>
                        </div>
                      </div>

                      <div class="calendar-day">
                        <div class="shifts-container">
                          <p class="no-shifts-text">No shifts</p>
                        </div>
                      </div>

                      <div class="calendar-day">
                        <div class="shifts-container">
                          <p class="no-shifts-text">No shifts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <v-btn block color="primary" variant="outlined" class="mt-4">
                  View Full Schedule
                </v-btn>
              </v-card-text>
            </v-card>

            <!-- Pending Requests -->
            <v-card class="shadow-lg mt-6">
              <v-card-title class="text-h6 font-weight-bold pa-4">
                <v-icon left>mdi-clock-alert</v-icon>
                Pending Requests
              </v-card-title>
              <v-divider></v-divider>

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
                      <v-chip :color="getStatusChipColor(request.status)" text-color="white" size="small">
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
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════
   LAYOUT & CONTAINERS
   ═══════════════════════════════════════════════════════════════════════ */

.dashboard-container {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.dashboard-grid {
  gap: 0;
}

/* ═══════════════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════════════ */

.sidebar {
  width: 280px;
  background: linear-gradient(180deg, #0c0558 0%, #12086f 60%, #1a0f85 100%);
  color: white;
}

.sidebar :deep(.v-list-item--active) {
  background-color: rgba(255, 255, 255, 0.14) !important;
  border-radius: 8px;
}

.sidebar-header {
  background-color: rgba(0, 0, 0, 0.15);
}

.white-80 {
  color: rgba(255, 255, 255, 0.8);
}

/* ═══════════════════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════════════════ */

.dashboard-header {
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.header-right {
  gap: 12px;
}

.profile-btn {
  transition: transform 0.2s;
}

.profile-btn:hover {
  transform: scale(1.05);
}

/* ═══════════════════════════════════════════════════════════════════════
   NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════════ */

.notification-bell {
  position: relative;
}

.notification-panel {
  max-height: 500px;
  overflow-y: auto;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  border-bottom: 1px solid #f0f0f0;
}

.notification-item:last-child {
  border-bottom: none;
}

.urgent-banner {
  background-color: #eef0fb;
  border-bottom: 1px solid #c5cae9;
}

/* ═══════════════════════════════════════════════════════════════════════
   CLOCK & SHIFTS
   ═══════════════════════════════════════════════════════════════════════ */

.clock-display {
  padding: 20px;
  background: linear-gradient(135deg, #12086f 0%, #1c10a8 100%);
  border-radius: 12px;
  margin: 16px 0;
  color: white;
}

.shift-info {
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.shift-card {
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

/* ═══════════════════════════════════════════════════════════════════════
   TASKS
   ═══════════════════════════════════════════════════════════════════════ */

.task-item {
  margin-left: 8px;
}

/* ═══════════════════════════════════════════════════════════════════════
   PENDING REQUESTS
   ═══════════════════════════════════════════════════════════════════════ */

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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.compact-rect:hover {
  background: #f5f5f5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.compact-rect-left {
  min-width: 0;
  flex: 1;
}

.compact-title {
  margin: 0 0 6px 0;
  font-weight: 700;
  font-size: 1rem;
  color: #222;
  line-height: 1.3;
}

.compact-sub {
  margin: 0 0 6px 0;
  font-size: 0.875rem;
  color: #555;
  line-height: 1.4;
}

.compact-meta {
  margin: 0;
  font-size: 0.75rem;
  color: #999;
  font-style: italic;
}

.compact-rect-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: 16px;
}

/* ═══════════════════════════════════════════════════════════════════════
   CALENDAR
   ═══════════════════════════════════════════════════════════════════════ */

.calendar-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 10px;
}

.calendar-scroll::-webkit-scrollbar {
  height: 8px;
}

.calendar-scroll::-webkit-scrollbar-thumb {
  background: #cfcfcf;
  border-radius: 999px;
}

.calendar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.calendar-grid {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-sizing: border-box;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background-color: #12086f;
  border-bottom: 2px solid #0d0660;
}

.calendar-day-header {
  padding: 10px 8px 8px;
  text-align: center;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.calendar-day-header:last-child {
  border-right: none;
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
  min-height: 300px;
}

.calendar-day {
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  padding: 8px;
  min-height: 300px;
  background-color: white;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.shifts-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shift-box {
  padding: 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  background-color: #dbeafe;
}

.shift-off {
  background-color: #f1f5f9;
}

.shift-time {
  font-weight: bold;
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
  margin-top: 3px;
}

.no-shifts-text {
  text-align: center;
  color: #9ca3af;
  font-size: 0.75rem;
  margin: 6px 0 0 0;
  padding: 4px 0;
}

.claim-btn {
  font-size: 0.6rem;
  height: 20px;
  min-width: unset;
  padding: 0 6px;
}

.shift-box-empty {
  padding: 8px;
  border: 1px dashed #e0e0e0;
  border-radius: 6px;
  text-align: center;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-shift-btn {
  color: #999;
  font-size: 0.7rem;
}

.schedule-legend {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

/* ═══════════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════════ */

.gap-3 {
  gap: 12px;
}

.border-bottom {
  border-bottom: 1px solid #f0f0f0 !important;
}

.shadow-lg {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

/* ═══════════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════════ */

@media (max-width: 1200px) {
  .sidebar {
    width: 100%;
  }

  .dashboard-container {
    flex-direction: column;
  }

  .calendar-grid {
    min-width: 900px;
  }

  .calendar-day {
    min-height: 250px;
  }

  .day-number {
    font-size: 1.25rem;
  }

  .shift-time,
  .shift-person {
    font-size: 0.7rem;
  }
}

@media (max-width: 768px) {
  .calendar-day-header {
    display: none;
  }
}
</style>