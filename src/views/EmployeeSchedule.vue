<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import { useNotifications } from '../composables/useNotifications.js';

const router = useRouter();
const rail = ref(true);
const user = ref(null);
const businessArea = ref('The Brew');
const showNotifications = ref(false);

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
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels.map((label, i) => {
    const date = new Date(currentWeekStart.value);
    date.setDate(currentWeekStart.value.getDate() + i);
    return {
      label,
      dateNum: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' })
    };
  });
});

const weekLabel = computed(() => {
  const s = currentWeekStart.value;
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
});

const prevWeek = () => {
  const d = new Date(currentWeekStart.value);
  d.setDate(d.getDate() - 7);
  currentWeekStart.value = d;
};
const nextWeek = () => {
  const d = new Date(currentWeekStart.value);
  d.setDate(d.getDate() + 7);
  currentWeekStart.value = d;
};

// ── TEAM SCHEDULE DATA ─────────────────────────────────────────────────────
// Mon Tue Wed Thu Fri Sat Sun
const teamSchedule = computed(() => [
  {
    name: user.value ? `${user.value.fName} ${user.value.lName}` : 'You',
    initials: userInitials.value,
    color: '#12086F',
    shifts: ['9AM–5PM', null, '2PM–10PM', '9AM–1PM', '10AM–6PM', null, null],
    isMe: true
  },
  { name: 'Alex M.',   initials: 'AM', color: '#4361EE', shifts: ['2PM–10PM', '9AM–5PM', null, '10AM–6PM', null, '9AM–1PM', null] },
  { name: 'Jordan L.', initials: 'JL', color: '#7209B7', shifts: [null, '10AM–6PM', '9AM–5PM', null, '2PM–10PM', null, null] },
  { name: 'Sam W.',    initials: 'SW', color: '#F72585', shifts: ['10AM–6PM', null, null, '9AM–5PM', null, '2PM–10PM', null] },
]);

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
    <!-- Sidebar -->
    <v-navigation-drawer
      :rail="rail"
      @mouseenter="rail = false"
      @mouseleave="rail = true"
      permanent
      width="280"
      class="employee-sidebar"
    >
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
        <v-list-item prepend-icon="mdi-view-dashboard"          title="Dashboard"       rounded="lg" class="mb-1" @click="router.push({ name: 'employeeDashboard' })" />
        <v-list-item prepend-icon="mdi-clock-outline"           title="My Availability" rounded="lg" class="mb-1" @click="router.push({ name: 'employeeAvailability' })" />
        <v-list-item prepend-icon="mdi-calendar-month"          title="Team Schedule"   rounded="lg" class="mb-1" active />
        <v-list-item prepend-icon="mdi-account-circle-outline"  title="Profile"         rounded="lg" class="mb-1" @click="router.push({ name: 'profile' })" />
      </v-list>
    </v-navigation-drawer>

    <!-- App Bar -->
    <v-app-bar color="white" elevation="0" style="border-bottom:1px solid #e0e0e0" density="compact">
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
        <v-card min-width="400" max-width="500" style="max-height:500px;overflow-y:auto">
          <v-card-title class="text-h6 font-weight-bold pa-4">Notifications</v-card-title>
          <v-divider />
          <div v-if="notifications.length === 0" class="text-center pa-6">
            <p class="text-grey">No notifications</p>
          </div>
          <div v-else>
            <div v-for="n in notifications" :key="n.id" class="pa-4" style="border-bottom:1px solid #f0f0f0">
              <div class="d-flex ga-3">
                <v-icon color="primary" size="large">{{ n.icon }}</v-icon>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-start mb-1">
                    <p class="text-body-2 font-weight-bold mb-0">{{ n.type }}</p>
                    <v-btn icon size="x-small" variant="text" @click="dismissNotification(n.id)">
                      <v-icon size="small">mdi-close</v-icon>
                    </v-btn>
                  </div>
                  <p class="text-body-2 mb-1">{{ n.message }}</p>
                  <p class="text-caption text-grey mb-2">{{ n.timestamp }}</p>
                  <v-btn v-if="n.action" size="small" color="primary" variant="flat" @click="handleNotificationAction(n.id)">
                    {{ n.action }}
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

    <!-- Main Content -->
    <v-main style="background:#f5f5f5">
      <v-container fluid class="pa-6">

        <!-- Header -->
        <div class="d-flex justify-space-between align-center mb-6">
          <div>
            <h1 class="text-h4 font-weight-bold navy-text mb-1">Team Schedule</h1>
            <p class="text-body-2 text-grey">{{ businessArea }}</p>
          </div>
          <div class="d-flex align-center ga-2">
            <v-btn icon variant="text" density="compact" @click="prevWeek">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <span class="text-body-2 font-weight-medium px-2">{{ weekLabel }}</span>
            <v-btn icon variant="text" density="compact" @click="nextWeek">
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </div>
        </div>

        <!-- Schedule Table -->
        <v-card rounded="lg" elevation="0" style="border:1px solid #e0e0e0;overflow:hidden">
          <!-- Day Headers -->
          <div class="schedule-header">
            <div class="name-col"></div>
            <div v-for="(day, i) in weekDays" :key="i" class="day-header-col">
              <div class="text-caption font-weight-bold text-grey-darken-1">{{ day.label }}</div>
              <div class="text-h6 font-weight-bold navy-text">{{ day.dateNum }}</div>
              <div class="text-caption text-grey">{{ day.month }}</div>
            </div>
          </div>

          <v-divider />

          <!-- Employee Rows -->
          <div
            v-for="(emp, ei) in teamSchedule"
            :key="emp.name"
            :class="['employee-row', { 'my-row': emp.isMe }]"
          >
            <!-- Name -->
            <div class="name-col d-flex align-center ga-2 pa-3">
              <v-avatar size="32" :color="emp.color">
                <span class="text-white text-caption font-weight-bold">{{ emp.initials }}</span>
              </v-avatar>
              <span class="text-body-2 font-weight-medium">{{ emp.name }}</span>
            </div>

            <!-- Shift cells -->
            <div v-for="(shift, di) in emp.shifts" :key="di" class="shift-col">
              <div v-if="shift" class="shift-pill" :style="{ background: emp.color + '22', borderLeft: `3px solid ${emp.color}` }">
                <span class="text-caption font-weight-bold" :style="{ color: emp.color }">{{ shift }}</span>
              </div>
              <span v-else class="text-caption text-grey">—</span>
            </div>
          </div>
        </v-card>

      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.employee-sidebar {
  background: linear-gradient(180deg, #12086F 0%, #2B354F 100%) !important;
}
.employee-sidebar :deep(.v-list-item__prepend .v-icon) { color: white !important; opacity: 1 !important; }
.employee-sidebar :deep(.v-list-item-title) { color: white !important; }
.employee-sidebar :deep(.v-list-item--active) { background: rgba(255,255,255,0.15) !important; }

.navy-text { color: #12086F; }

/* Schedule grid */
.schedule-header {
  display: grid;
  grid-template-columns: 180px repeat(7, 1fr);
  background: #fafafa;
  padding: 12px 0;
}

.day-header-col {
  text-align: center;
  padding: 4px 8px;
}

.name-col {
  width: 180px;
  min-width: 180px;
  padding: 0 16px;
  border-right: 1px solid #e0e0e0;
}

.employee-row {
  display: grid;
  grid-template-columns: 180px repeat(7, 1fr);
  border-top: 1px solid #f0f0f0;
  min-height: 56px;
  align-items: center;
}

.employee-row.my-row {
  background: rgba(18, 8, 111, 0.03);
}

.shift-col {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
}

.shift-pill {
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
}
</style>
