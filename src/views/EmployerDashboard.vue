<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);
const loading = ref(true);

// ─── DATA ─────────────────────────────────────────────────────────────────
const alerts = ref([]);
const weeklySchedule = ref([]);
const schedulePublished = ref(false);

// ─── COMPUTED ─────────────────────────────────────────────────────────────
const weekDays = computed(() => {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const today = new Date();
  const monday = getMonday(today);
  
  return days.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateNum = date.getDate();
    const shifts = weeklySchedule.value.filter(s => {
      const shiftDate = new Date(Number(s.shift_time));
      return shiftDate.toDateString() === date.toDateString();
    });
    return { label, dateNum, shifts };
  });
});

// ─── LIFECYCLE ────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadDashboardData();
});

// ─── DATA LOADING ─────────────────────────────────────────────────────────
const loadDashboardData = async () => {
  loading.value = true;
  try {
    await Promise.all([
      loadAlerts(),
      loadWeeklySchedule(),
    ]);
  } catch (err) {
    console.error('Dashboard load error:', err);
  } finally {
    loading.value = false;
  }
};

const loadAlerts = async () => {
  try {
    // Load notifications and convert to alerts
    const userId = user.value?.userId || user.value?.user_id;
    if (!userId) return;
    
    const [notifRes, swapRes, timeOffRes] = await Promise.all([
      EmployerService.getNotifications(userId),
      EmployerService.getAllShiftSwapRequests(),
      EmployerService.getAllTimeOffRequests(),
    ]);
    
    const notifications = Array.isArray(notifRes.data) ? notifRes.data : [];
    const swaps = Array.isArray(swapRes.data) ? swapRes.data : [];
    const timeOffs = Array.isArray(timeOffRes.data) ? timeOffRes.data : [];
    
    alerts.value = [
      ...swaps
        .filter(s => s.status === 'pending')
        .slice(0, 2)
        .map(s => ({
          id: `swap-${s.swap_id}`,
          type: 'Shift Cover Request',
          message: `${s.requester_name || 'Employee'} needs someone for ${formatShiftDate(s.shift_time)}`,
          time: timeAgo(s.created_at),
          actions: ['Approve', 'Deny', 'Find Replacement'],
        })),
      ...timeOffs
        .filter(t => t.status === 'pending')
        .slice(0, 1)
        .map(t => ({
          id: `timeoff-${t.request_id}`,
          type: 'Time Off Request',
          message: `${t.user_name || 'Employee'} requested time off for ${formatDate(t.start_date)} - ${formatDate(t.end_date)}`,
          time: timeAgo(t.created_at),
          actions: ['Approve', 'Deny'],
        })),
      ...notifications
        .filter(n => !n.is_read && n.type?.toLowerCase().includes('task'))
        .slice(0, 1)
        .map(n => ({
          id: `notif-${n.notification_id}`,
          type: n.type,
          message: n.description || n.title,
          time: timeAgo(n.created_at),
          actions: ['Mark as Read'],
        })),
    ];
  } catch (err) {
    console.error('Error loading alerts:', err);
  }
};

const loadWeeklySchedule = async () => {
  try {
    const monday = getMonday(new Date());
    const startDate = monday.getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000;
    
    const res = await EmployerService.getShiftsByWeek(startDate, endDate);
    weeklySchedule.value = Array.isArray(res.data) ? res.data : [];
    schedulePublished.value = weeklySchedule.value.some(s => s.status === 'published');
  } catch (err) {
    console.error('Error loading schedule:', err);
  }
};

// ─── ACTIONS ──────────────────────────────────────────────────────────────
const handleAction = async (alertId, action) => {
  console.log('Action:', action, 'for alert:', alertId);
  // Implement action handlers here
  if (action === 'Mark as Read') {
    const notifId = alertId.replace('notif-', '');
    try {
      await EmployerService.markNotificationRead(notifId);
      alerts.value = alerts.value.filter(a => a.id !== alertId);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }
};

const createSchedule = () => {
  router.push({ name: 'employerSchedule' });
};

const addEmployee = () => {
  router.push({ name: 'employerEmployees' });
};

const createShift = () => {
  router.push({ name: 'employerSchedule', query: { action: 'create' } });
};

const viewFullSchedule = () => {
  router.push({ name: 'employerSchedule' });
};

const viewAllAlerts = () => {
  // Navigate to dedicated alerts page or expand view
  console.log('View all alerts');
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatShiftTime = (minutes) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatShiftDate = (timestamp) => {
  if (!timestamp) return '';
  return new Date(Number(timestamp)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  return new Date(Number(timestamp)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  });
};

const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const diff = Date.now() - Number(timestamp);
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

const getActionColor = (action) => {
  if (action === 'Approve') return 'success';
  if (action === 'Deny') return 'error';
  return 'primary';
};
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold mb-2">Dashboard</h1>
      </div>

      <!-- Quick Actions -->
      <v-row class="mb-6">
        <v-col cols="auto">
          <v-btn
            color="#7b1c2e"
            variant="flat"
            size="large"
            @click="createSchedule"
          >
            Create Schedule
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn
            variant="outlined"
            size="large"
            @click="addEmployee"
          >
            Add Employee
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn
            variant="outlined"
            size="large"
            @click="createShift"
          >
            Create Shift
          </v-btn>
        </v-col>
      </v-row>

      <!-- Alerts & Notifications -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <span class="text-h6 font-weight-bold">Alerts & Notifications</span>
          <v-btn
            variant="text"
            size="small"
            @click="viewAllAlerts"
          >
            View All
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </div>
          
          <div v-else-if="alerts.length === 0" class="text-center py-8">
            <v-icon color="grey" size="48">mdi-check-circle-outline</v-icon>
            <p class="text-grey mt-2">No pending alerts</p>
          </div>
          
          <div v-else>
            <div
              v-for="(alert, idx) in alerts"
              :key="alert.id"
              class="pa-4"
              :class="{ 'bg-grey-lighten-5': idx % 2 === 0 }"
            >
              <div class="d-flex justify-space-between align-start mb-2">
                <div class="flex-grow-1">
                  <div class="d-flex align-center gap-2 mb-1">
                    <v-chip size="small" color="error" variant="text">
                      {{ alert.type }}
                    </v-chip>
                  </div>
                  <p class="text-body-1 mb-1">{{ alert.message }}</p>
                  <p class="text-caption text-grey">{{ alert.time }}</p>
                </div>
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  @click="alerts.splice(idx, 1)"
                />
              </div>
              
              <div class="d-flex gap-2 mt-3">
                <v-btn
                  v-for="action in alert.actions"
                  :key="action"
                  :color="getActionColor(action)"
                  :variant="action === 'Approve' ? 'flat' : 'outlined'"
                  size="small"
                  @click="handleAction(alert.id, action)"
                >
                  {{ action }}
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- This Week's Schedule Preview -->
      <v-card variant="outlined">
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <span class="text-h6 font-weight-bold">This Week's Schedule Preview</span>
          <div class="d-flex align-center gap-3">
            <v-chip
              :color="schedulePublished ? 'success' : 'warning'"
              size="small"
              variant="tonal"
            >
              {{ schedulePublished ? 'Schedule Published' : 'Schedule Not Published' }}
            </v-chip>
            <v-btn
              variant="text"
              size="small"
              @click="viewFullSchedule"
            >
              View Full Schedule
            </v-btn>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </div>
          
          <div v-else class="schedule-grid">
            <div
              v-for="day in weekDays"
              :key="day.label"
              class="schedule-column"
            >
              <!-- Day Header -->
              <div class="schedule-header pa-3 text-center">
                <div class="text-subtitle-2 font-weight-bold">{{ day.label }}</div>
                <div class="text-h6 font-weight-bold">{{ day.dateNum }}</div>
              </div>
              
              <!-- Shifts -->
              <div class="schedule-body pa-2">
                <div
                  v-for="shift in day.shifts"
                  :key="shift.shift_id"
                  class="shift-item pa-2 mb-2"
                >
                  <div class="text-caption font-weight-bold">
                    {{ formatShiftTime(shift.start_time) }}
                  </div>
                  <div class="text-caption">
                    {{ shift.employee_name || 'Unassigned' }}
                  </div>
                  <div v-if="shift.notes" class="text-caption text-grey mt-1">
                    + Add Shift
                  </div>
                </div>
                
                <div v-if="day.shifts.length === 0" class="text-center text-caption text-grey py-4">
                  No shifts
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.schedule-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e0e0e0;
  border: 1px solid #e0e0e0;
}

.schedule-column {
  background: white;
  min-height: 200px;
}

.schedule-header {
  background: #f5f5f5;
  border-bottom: 2px solid #7b1c2e;
}

.schedule-body {
  min-height: 150px;
}

.shift-item {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
  border-radius: 4px;
}

.bg-grey-lighten-5 {
  background-color: #fafafa;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>