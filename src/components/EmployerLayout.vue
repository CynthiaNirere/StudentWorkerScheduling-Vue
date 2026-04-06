<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTheme } from 'vuetify';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';

const props = defineProps({
  isGuest: { type: Boolean, default: false }
});

const router = useRouter();
const route  = useRoute();
const theme  = useTheme();
let refreshInterval = null;

const user         = ref(null);
const businessArea = ref('');
const rail         = ref(true);
const showNotifications = ref(false);
const pendingSwaps    = ref([]);
const pendingTimeOff  = ref([]);
const unreadMsgCount  = ref(0);
const notifPrefs      = ref({ shiftReminders: true, swapRequests: true, timeOffRequests: true, scheduleChanges: true });

const loadUnreadMsgCount = async () => {
  if (props.isGuest) return;
  try {
    const res = await EmployerService.getUnreadMessageCount();
    unreadMsgCount.value = res.data?.unreadCount || 0;
  } catch (e) { /* silent */ }
};

const sidebarGradient = computed(() =>
  theme.global.name.value === 'dark'
    ? 'linear-gradient(180deg, #1E1E1E 0%, #2D2D2D 100%)'
    : 'linear-gradient(180deg, #12086F 0%, #2B354F 100%)'
);

const notifications = computed(() => {
  const items = [];
  if (!notifPrefs.value.swapRequests && !notifPrefs.value.timeOffRequests) return items;
  if (notifPrefs.value.swapRequests) pendingSwaps.value.forEach(swap => {
    const name = swap.requestingUserName || 'Unknown';
    const shift = swap.shift;
    let shiftInfo = '';
    if (shift) {
      const d = new Date(Number(shift.shiftTime));
      shiftInfo = ` for ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    }
    items.push({
      id: `swap-${swap.swap_id || swap.id}`,
      type: 'swap',
      label: 'Shift Cover Request',
      message: `${name} needs someone${shiftInfo}`,
      icon: 'mdi-swap-horizontal',
      color: '#f57c00',
    });
  });
  if (notifPrefs.value.timeOffRequests) pendingTimeOff.value.forEach(req => {
    const name = req.employeeName || 'Unknown';
    const start = new Date(Number(req.start_date || req.startDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end   = new Date(Number(req.end_date   || req.endDate  )).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    items.push({
      id: `timeoff-${req.request_id || req.id}`,
      type: 'timeoff',
      label: 'Time Off Request',
      message: `${name} requested time off ${start} - ${end}`,
      icon: 'mdi-calendar-remove',
      color: '#4361EE',
    });
  });
  return items;
});

const unreadCount = computed(() => notifications.value.length);

const loadPendingRequests = async () => {
  if (props.isGuest) return;
  try {
    const [swapRes, timeOffRes] = await Promise.all([
      EmployerService.getAllShiftSwapRequests(),
      EmployerService.getAllTimeOffRequests(),
    ]);
    pendingSwaps.value   = (Array.isArray(swapRes.data)    ? swapRes.data    : []).filter(s => s.status === 'pending' || s.status === 'accepted');
    pendingTimeOff.value = (Array.isArray(timeOffRes.data) ? timeOffRes.data : []).filter(t => t.status === 'pending');
  } catch (err) {
    console.error('Error loading pending requests:', err);
  }
};

const goToPage = (type) => {
  router.push({ name: type === 'swap' ? 'employerSwaps' : 'employerTimeOff' });
};

onMounted(async () => {
  user.value = Utils.getStore('user');

  if (props.isGuest) {
    businessArea.value = 'Demo Campus Gym';
  } else if (user.value?.work_location) {
    try {
      const res = await EmployerService.getLocationById(user.value.work_location);
      businessArea.value = res.data?.name || 'My Workplace';
    } catch { businessArea.value = 'My Workplace'; }
  }

  const savedTheme = localStorage.getItem('themePreference') || localStorage.getItem('theme');
  if (savedTheme) theme.global.name.value = savedTheme;

  const savedPrefs = localStorage.getItem('notificationPreferences');
  if (savedPrefs) {
    try { notifPrefs.value = { ...notifPrefs.value, ...JSON.parse(savedPrefs) }; } catch {}
  }

  await Promise.all([loadPendingRequests(), loadUnreadMsgCount()]);
  refreshInterval = setInterval(() => { loadPendingRequests(); loadUnreadMsgCount(); }, 15000);
  window.addEventListener('notifications-updated', loadPendingRequests);
  window.addEventListener('notif-prefs-updated', reloadNotifPrefs);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  window.removeEventListener('notifications-updated', loadPendingRequests);
  window.removeEventListener('notif-prefs-updated', reloadNotifPrefs);
});

const reloadNotifPrefs = () => {
  const saved = localStorage.getItem('notificationPreferences');
  if (saved) {
    try { notifPrefs.value = { ...notifPrefs.value, ...JSON.parse(saved) }; } catch {}
  }
};

watch(() => route.path, () => { loadPendingRequests(); });

const userInitials = computed(() => {
  if (!user.value) return 'G';
  return (user.value.fName?.[0] || user.value.first_name?.[0] || '') +
         (user.value.lName?.[0] || user.value.last_name?.[0] || '');
});

const userFullName = computed(() => {
  if (!user.value) return 'Guest User';
  return `${user.value.fName || user.value.first_name || ''} ${user.value.lName || user.value.last_name || ''}`.trim() || 'Employer';
});

const userEmail = computed(() => props.isGuest ? 'demo@shiftboard.com' : user.value?.email || '');

const handleMouseEnter = () => { rail.value = false; };
const handleMouseLeave = () => { rail.value = true; };

const logout = () => {
  if (props.isGuest) {
    localStorage.removeItem('isGuest');
    localStorage.removeItem('user');
    router.push({ name: 'landing' });
  } else {
    Utils.setStore('user', null);
    router.push('/login');
  }
};
</script>

<template>
  <div class="employer-layout">
    <v-navigation-drawer
      permanent
      :rail="rail"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      class="sidebar"
      :style="{ background: sidebarGradient }"
    >
      <div class="sidebar-header pa-4">
        <div v-show="!rail">
          <h2 class="text-h6 font-weight-bold text-white">ShiftBoard</h2>
          <p class="text-caption text-white-80 mt-1 mb-0">{{ businessArea || '...' }}</p>
          <v-chip v-if="isGuest" size="x-small" color="info" variant="tonal" class="mt-2">
            <v-icon start size="x-small">mdi-eye-outline</v-icon>Guest Mode
          </v-chip>
        </div>
        <div v-show="rail" class="text-center">
          <v-icon color="white" size="32">mdi-calendar-clock</v-icon>
        </div>
      </div>

      <v-divider class="border-white-20" />

      <v-list nav class="px-2">
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard"
          :to="isGuest ? { name: 'guestDashboard' } : { name: 'employerDashboard' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-calendar" title="Schedule"
          :to="isGuest ? { name: 'guestSchedule' } : { name: 'employerSchedule' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-calendar-text" title="Templates"
          :to="isGuest ? { name: 'guestTemplates' } : { name: 'employerTemplates' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-account-group" title="Employees"
          :to="isGuest ? { name: 'guestEmployees' } : { name: 'employerEmployees' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-clock-outline" title="Availability"
          :to="isGuest ? { name: 'guestAvailability' } : { name: 'employerAvailability' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-calendar-remove" title="Time Off"
          :to="isGuest ? { name: 'guestTimeOff' } : { name: 'employerTimeOff' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-swap-horizontal" title="Swaps"
          :to="isGuest ? { name: 'guestSwaps' } : { name: 'employerSwaps' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-message-text" title="Messages"
          :to="isGuest ? { name: 'guestMessages' } : { name: 'employerMessages' }"
          color="white" class="nav-item" rounded="lg">
          <template #append v-if="unreadMsgCount > 0">
            <v-badge :content="unreadMsgCount" color="#f57c00" inline />
          </template>
        </v-list-item>
        <v-list-item prepend-icon="mdi-checkbox-marked-circle-outline" title="Tasks"
          :to="isGuest ? { name: 'guestTasks' } : { name: 'employerTasks' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-credit-card-clock-outline" title="Time Cards"
          :to="isGuest ? { name: 'guestDashboard' } : { name: 'employerTimeCards' }"
          color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-cog-outline" title="Settings"
          :to="isGuest ? { name: 'guestDashboard' } : { name: 'employerSettings' }"
          color="white" class="nav-item" rounded="lg" />
      </v-list>
    </v-navigation-drawer>

    <div class="main-content">
      <v-app-bar elevation="0" density="compact" class="top-bar">
        <v-spacer />

        <!-- Bell icon -->
        <v-menu location="bottom end" v-model="showNotifications">
          <template #activator="{ props: bellProps }">
            <v-btn v-bind="bellProps" icon variant="text" class="mr-1">
              <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error">
                <v-icon>mdi-bell</v-icon>
              </v-badge>
            </v-btn>
          </template>
          <v-card min-width="420" max-width="500" style="max-height: 500px; overflow-y: auto;">
            <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center justify-space-between">
              <span>Notifications</span>
              <v-btn v-if="notifications.length > 0" size="x-small" variant="tonal" color="#12086F"
                @click="router.push({ name: 'employerAlerts' }); showNotifications = false">
                View All
              </v-btn>
            </v-card-title>
            <v-divider />
            <div v-if="notifications.length === 0" class="text-center pa-6">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-bell-check-outline</v-icon>
              <p class="text-medium-emphasis">No pending requests</p>
            </div>
            <div v-else>
              <div v-for="notif in notifications" :key="notif.id"
                class="pa-4 notif-item"
                style="border-bottom: 1px solid #f0f0f0; cursor: pointer;"
                @click="goToPage(notif.type); showNotifications = false"
              >
                <div class="d-flex ga-3 align-start">
                  <v-icon :color="notif.color" size="large">{{ notif.icon }}</v-icon>
                  <div class="flex-grow-1">
                    <v-chip :color="notif.color" size="x-small" variant="tonal" class="mb-1">{{ notif.label }}</v-chip>
                    <p class="text-body-2 mb-0">{{ notif.message }}</p>
                  </div>
                </div>
              </div>
            </div>
          </v-card>
        </v-menu>

        <!-- Account menu -->
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon variant="text">
              <v-avatar size="36" :color="isGuest ? '#4895EF' : '#12086F'">
                <span class="text-white font-weight-bold text-caption">{{ userInitials }}</span>
              </v-avatar>
            </v-btn>
          </template>
          <v-card min-width="200">
            <v-card-text class="pa-3">
              <div class="text-center mb-3">
                <v-avatar size="48" :color="isGuest ? '#4895EF' : '#12086F'" class="mb-2">
                  <span class="text-white font-weight-bold">{{ userInitials }}</span>
                </v-avatar>
                <div class="text-body-2 font-weight-bold">{{ userFullName }}</div>
                <div class="text-caption text-medium-emphasis">{{ userEmail }}</div>
                <v-chip v-if="isGuest" size="x-small" color="info" variant="tonal" class="mt-2">Guest Mode</v-chip>
              </div>
              <v-divider class="my-2" />
              <v-list density="compact" class="pa-0">
                <v-list-item v-if="!isGuest" prepend-icon="mdi-account" title="Profile" :to="{ name: 'employerProfile' }" />
                <v-list-item
                  prepend-icon="mdi-logout"
                  :title="isGuest ? 'Exit Guest Mode' : 'Sign Out'"
                  @click="logout"
                  :class="isGuest ? 'text-info' : 'text-error'"
                />
              </v-list>
            </v-card-text>
          </v-card>
        </v-menu>
      </v-app-bar>

      <div class="page-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.employer-layout { display: flex; min-height: 100vh; }
.sidebar { color: white; transition: width 0.3s ease; }
.sidebar-header { background-color: rgba(0,0,0,0.15); min-height: 64px; display: flex; align-items: center; }
.text-white-80 { color: rgba(255,255,255,0.8); }
.border-white-20 { border-color: rgba(255,255,255,0.2) !important; }
.nav-item { margin-bottom: 4px; transition: all 0.2s; }
.nav-item:hover:not(.v-list-item--disabled) { background-color: rgba(255,255,255,0.1) !important; }
.main-content { flex: 1; display: flex; flex-direction: column; }
.page-content { flex: 1; overflow-y: auto; }
.notif-item:hover { background: #fafafa; }
</style>