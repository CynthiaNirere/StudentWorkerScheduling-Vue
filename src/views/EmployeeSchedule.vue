<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import { useNotifications } from '../composables/useNotifications.js';

const router = useRouter();
const rail = ref(true);
const user = ref(null);
const businessArea = ref('The Brew');
const showNotificationsMenu = ref(false);
const showTimeOffDialog = ref(false);
const timeOffStart = ref('');
const timeOffEnd = ref('');
const timeOffReason = ref('');

const { notifications, unreadCount, dismissNotification, handleNotificationAction } = useNotifications();

const userInitials = computed(() =>
  (user.value?.fName?.[0] || '') + (user.value?.lName?.[0] || '') || 'E'
);

// ── WEEK NAVIGATION ────────────────────────────────────────────────────────
const currentWeekStart = ref(getMonday(new Date()));

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

const weekDays = computed(() => {
  const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  return labels.map((label, i) => {
    const date = new Date(currentWeekStart.value);
    date.setDate(currentWeekStart.value.getDate() + i);
    return { label, dateNum: date.getDate() };
  });
});

const weekLabel = computed(() => {
  const s = currentWeekStart.value;
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
});

const prevWeek = () => { const d = new Date(currentWeekStart.value); d.setDate(d.getDate() - 7); currentWeekStart.value = d; };
const nextWeek = () => { const d = new Date(currentWeekStart.value); d.setDate(d.getDate() + 7); currentWeekStart.value = d; };

// ── TEAM DATA ──────────────────────────────────────────────────────────────
// Mon Tue Wed Thu Fri Sat Sun
const employees = computed(() => [
  {
    name: user.value ? `${user.value.fName} ${user.value.lName}` : 'You',
    shifts: ['9AM–5PM', null, '2PM–10PM', '9AM–1PM', '10AM–6PM', null, null],
    bg: '#e8eaf6', border: '#3949ab', text: '#1a237e'
  },
  { name: 'Alex M.',   shifts: ['2PM–10PM', '9AM–5PM', null, '10AM–6PM', null, null, null], bg: '#e3f2fd', border: '#1565c0', text: '#0d47a1' },
  { name: 'Jordan L.', shifts: [null, '10AM–6PM', '9AM–5PM', null, '2PM–10PM', null, null],       bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20' },
  { name: 'Sam W.',    shifts: ['10AM–6PM', null, null, '9AM–5PM', null, null, null],        bg: '#fce4ec', border: '#c62828', text: '#b71c1c' },
]);

// Restructure: per day → array of shifts
const dayShifts = computed(() =>
  weekDays.value.map((_, di) =>
    employees.value
      .filter(e => e.shifts[di])
      .map(e => ({ employee: e.name, time: e.shifts[di], bg: e.bg, border: e.border, text: e.text }))
  )
);

// ── ACTIVITY FEED ──────────────────────────────────────────────────────────
const activityFeed = ref([
  { id: 1, type: 'Shift Cover Request', message: 'Alex Martinez requested shift cover for Tuesday 3PM–7PM', time: '2 hours ago', action: 'Add to schedule', icon: 'mdi-account-switch', color: 'primary' },
  { id: 2, type: 'Task Completed',      message: 'Sam Wilson marked "Clean equipment" as complete',         time: '1 day ago',    action: null,              icon: 'mdi-check-circle', color: 'success' },
]);

const timeOffRequests = ref([]);

const snackbar = ref(false);
const snackMsg = ref('');
const showSnack = (msg) => { snackMsg.value = msg; snackbar.value = true; };

const handleActivity = (id) => {
  activityFeed.value = activityFeed.value.filter(a => a.id !== id);
  showSnack('Added to schedule!');
};

const submitTimeOff = () => {
  if (!timeOffStart.value || !timeOffEnd.value) return;
  timeOffRequests.value.unshift({
    id: Date.now(),
    type: 'Time Off Request',
    message: `${timeOffStart.value} to ${timeOffEnd.value}${timeOffReason.value ? ' — ' + timeOffReason.value : ''}`,
    time: 'Just now',
    action: null,
    icon: 'mdi-calendar-remove',
    color: 'warning'
  });
  activityFeed.value.unshift(timeOffRequests.value[0]);
  showTimeOffDialog.value = false;
  timeOffStart.value = '';
  timeOffEnd.value = '';
  timeOffReason.value = '';
  showSnack('Time off request submitted! Waiting for review.');
};

const logout = () => {
  Utils.setStore('user', null);
  router.push('/login');
};

onMounted(() => {
  user.value = Utils.getStore('user');
});
</script>

<template>
  <v-app>
    <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
    <v-navigation-drawer :rail="rail" @mouseenter="rail = false" @mouseleave="rail = true" permanent width="280" class="employee-sidebar">
      <div class="sidebar-header d-flex align-center pa-4" style="min-height:64px;background:rgba(0,0,0,0.15)">
        <template v-if="!rail">
          <div>
            <h2 class="text-h6 font-weight-bold text-white mb-0">ShiftBoard</h2>
            <p class="text-caption text-white mb-0" style="opacity:0.8">{{ businessArea }}</p>
          </div>
        </template>
        <v-icon v-else size="32" color="white">mdi-calendar-clock</v-icon>
      </div>
      <v-divider style="border-color:rgba(255,255,255,0.2)" />
      <v-list nav class="px-2 mt-2">
        <v-list-item prepend-icon="mdi-view-dashboard"         title="Dashboard"       rounded="lg" class="mb-1" @click="router.push({ name: 'employeeDashboard' })" />
        <v-list-item prepend-icon="mdi-clock-outline"          title="My Availability" rounded="lg" class="mb-1" @click="router.push({ name: 'employeeAvailability' })" />
        <v-list-item prepend-icon="mdi-calendar-month"         title="Team Schedule"   rounded="lg" class="mb-1" active />
        <v-list-item prepend-icon="mdi-account-circle-outline" title="Profile"         rounded="lg" class="mb-1" @click="router.push({ name: 'profile' })" />
      </v-list>
    </v-navigation-drawer>

    <!-- ── App Bar ──────────────────────────────────────────────────────── -->
    <v-app-bar color="white" elevation="0" style="border-bottom:1px solid #e0e0e0" density="compact">
      <v-spacer />

      <!-- Notification Bell -->
      <v-menu location="bottom" v-model="showNotificationsMenu">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon class="mr-1">
            <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error">
              <v-icon>mdi-bell</v-icon>
            </v-badge>
          </v-btn>
        </template>
        <v-card min-width="400" max-width="500" style="max-height:500px;overflow-y:auto">
          <v-card-title class="text-h6 font-weight-bold pa-4">Notifications</v-card-title>
          <v-divider />
          <div v-if="notifications.length === 0" class="text-center pa-6"><p class="text-grey">No notifications</p></div>
          <div v-else>
            <div v-for="n in notifications" :key="n.id" class="pa-4" style="border-bottom:1px solid #f0f0f0">
              <div class="d-flex ga-3">
                <v-icon color="primary" size="large">{{ n.icon }}</v-icon>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-start mb-1">
                    <p class="text-body-2 font-weight-bold mb-0">{{ n.type }}</p>
                    <v-btn icon size="x-small" variant="text" @click="dismissNotification(n.id)"><v-icon size="small">mdi-close</v-icon></v-btn>
                  </div>
                  <p class="text-body-2 mb-1">{{ n.message }}</p>
                  <p class="text-caption text-grey mb-2">{{ n.timestamp }}</p>
                  <v-btn v-if="n.action" size="small" color="primary" variant="flat" @click="handleNotificationAction(n.id)">{{ n.action }}</v-btn>
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
            <v-avatar size="36" color="#12086F" class="text-caption font-weight-bold text-white">{{ userInitials }}</v-avatar>
          </v-btn>
        </template>
        <v-card min-width="200">
          <v-card-text class="pa-4">
            <div class="text-center mb-3">
              <v-avatar size="48" color="#12086F" class="text-caption font-weight-bold text-white mb-2">{{ userInitials }}</v-avatar>
              <p class="text-body-2 font-weight-bold mb-0">{{ user?.fName }} {{ user?.lName }}</p>
              <p class="text-caption text-grey">{{ user?.email }}</p>
            </div>
            <v-divider class="mb-2" />
            <v-list density="compact" class="pa-0">
              <v-list-item prepend-icon="mdi-account" title="Profile" @click="router.push({ name: 'profile' })" />
              <v-list-item prepend-icon="mdi-logout" title="Sign Out" class="text-error" @click="logout" />
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- ── Main Content ──────────────────────────────────────────────────── -->
    <v-main style="background:#f5f5f5">
      <v-container fluid class="pa-6">

        <!-- Page Header -->
        <div class="d-flex justify-space-between align-center mb-1">
          <div>
            <h1 class="text-h4 font-weight-bold navy-text mb-0">Team Schedule</h1>
            <p class="text-caption text-grey mt-1">Read-only view of schedule</p>
          </div>
          <v-btn color="#12086F" variant="flat" prepend-icon="mdi-calendar-remove" @click="showTimeOffDialog = true">
            Request Time Off
          </v-btn>
        </div>

        <!-- Week Navigation -->
        <div class="d-flex align-center ga-2 mb-4">
          <v-btn icon variant="text" density="compact" @click="prevWeek"><v-icon>mdi-chevron-left</v-icon></v-btn>
          <span class="text-body-2 font-weight-medium">{{ weekLabel }}</span>
          <v-btn icon variant="text" density="compact" @click="nextWeek"><v-icon>mdi-chevron-right</v-icon></v-btn>
        </div>

        <!-- Calendar Grid -->
        <div class="calendar-card mb-6">
          <!-- Day headers -->
          <div class="cal-header">
            <div v-for="(day, i) in weekDays" :key="i" class="cal-day-header">
              <span class="day-header-name">{{ day.label }}</span>
              <span class="day-header-number">{{ day.dateNum }}</span>
            </div>
          </div>
          <!-- Day columns with shift cards -->
          <div class="cal-body">
            <div v-for="(day, di) in weekDays" :key="di" class="cal-day-col">
              <div class="shifts-container">
                <div
                  v-for="(shift, si) in dayShifts[di]"
                  :key="si"
                  class="shift-box"
                >
                  <div class="shift-time">{{ shift.time }}</div>
                  <div class="shift-person">{{ shift.employee }}</div>
                </div>
              </div>
              <p v-if="dayShifts[di].length === 0" class="no-shifts-text">No shifts</p>
            </div>
          </div>
        </div>

        <!-- Activity Feed -->
        <h2 class="text-h6 font-weight-bold navy-text mb-3">Activity</h2>
        <div v-if="activityFeed.length === 0" class="text-center py-6">
          <p class="text-grey text-body-2">No recent activity</p>
        </div>
        <div v-else class="activity-list">
          <v-card
            v-for="item in activityFeed"
            :key="item.id"
            rounded="lg"
            elevation="0"
            class="activity-card mb-3"
          >
            <v-card-text class="pa-4">
              <div class="d-flex justify-space-between align-start">
                <div class="d-flex ga-3 align-start">
                  <v-icon :color="item.color" size="22" class="mt-1">{{ item.icon }}</v-icon>
                  <div>
                    <p class="text-body-2 font-weight-bold mb-1">{{ item.type }}</p>
                    <p class="text-body-2 text-grey-darken-1 mb-1">{{ item.message }}</p>
                    <p class="text-caption text-grey mb-0">{{ item.time }}</p>
                  </div>
                </div>
                <v-btn
                  v-if="item.action"
                  color="#12086F"
                  variant="flat"
                  size="small"
                  @click="handleActivity(item.id)"
                >
                  {{ item.action }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>

      </v-container>
    </v-main>

    <!-- Time Off Dialog -->
    <v-dialog v-model="showTimeOffDialog" max-width="420" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pa-5 pb-3">Request Time Off</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 text-grey mb-4">Your request will be sent to your manager for approval.</p>
          <div class="d-flex gap-3 mb-4">
            <div class="flex-grow-1">
              <label class="text-caption font-weight-medium d-block mb-1">From</label>
              <v-text-field v-model="timeOffStart" type="date" variant="outlined" density="comfortable" hide-details />
            </div>
            <div class="flex-grow-1">
              <label class="text-caption font-weight-medium d-block mb-1">To</label>
              <v-text-field v-model="timeOffEnd" type="date" variant="outlined" density="comfortable" hide-details />
            </div>
          </div>
          <label class="text-caption font-weight-medium d-block mb-1">Reason (optional)</label>
          <v-textarea v-model="timeOffReason" variant="outlined" density="comfortable" rows="2" placeholder="e.g. Medical appointment" hide-details />
        </v-card-text>
        <v-card-actions class="pa-5 pt-2">
          <v-spacer />
          <v-btn variant="text" @click="showTimeOffDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :disabled="!timeOffStart || !timeOffEnd" @click="submitTimeOff">Submit Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" color="success" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </v-app>
</template>

<style scoped>
.employee-sidebar { background: linear-gradient(180deg, #12086F 0%, #2B354F 100%) !important; }
.employee-sidebar :deep(.v-list-item__prepend .v-icon) { color: white !important; opacity: 1 !important; }
.employee-sidebar :deep(.v-list-item-title) { color: white !important; }
.employee-sidebar :deep(.v-list-item--active) { background: rgba(255,255,255,0.15) !important; }

.navy-text { color: #12086F; }

/* ── Calendar ─────────────────────────────────────────────────────────── */
.calendar-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.cal-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e0e0e0;
}

.cal-day-header {
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

.cal-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e0e0e0;
}

.cal-day-col {
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

.no-shifts-text {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
  padding: 8px 0;
}


/* Activity feed */
.activity-card { border: 1px solid #e0e0e0; }

.gap-3 { gap: 12px; }
</style>
