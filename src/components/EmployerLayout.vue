<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTheme } from 'vuetify';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';
import AuthServices from '../services/authServices.js';

const props = defineProps({
  isGuest: { type: Boolean, default: false }
});

const router = useRouter();
const route  = useRoute();
const theme  = useTheme();
let refreshInterval = null;

const user              = ref(null);
const businessArea      = ref(null);
const rail              = ref(true);
const showNotifications = ref(false);
const pendingSwaps      = ref([]);
const pendingTimeOff    = ref([]);
const unreadMsgCount    = ref(0);
const exitingImpersonation = ref(false);
const notifPrefs = ref({ shiftReminders: true, swapRequests: true, timeOffRequests: true, scheduleChanges: true });

// ── Impersonation state ───────────────────────────────────────────────────
const isImpersonating          = computed(() => !!user.value?.isImpersonating || localStorage.getItem('isImpersonating') === 'true');
const impersonatedLocationName = computed(() => user.value?.impersonatedLocationName || localStorage.getItem('impersonatedLocationName') || '');

const loadUnreadMsgCount = async () => {
  if (props.isGuest) return;
  try {
    const res = await EmployerService.getUnreadMessageCount();
    unreadMsgCount.value = res.data?.unreadCount || 0;
  } catch { /* silent */ }
};

const sidebarGradient = computed(() => {
  if (isImpersonating.value) {
    return theme.global.name.value === 'dark'
      ? 'linear-gradient(180deg, #2D1500 0%, #3D2000 100%)'
      : 'linear-gradient(180deg, #7B3F00 0%, #A0522D 100%)';
  }
  return theme.global.name.value === 'dark'
    ? 'linear-gradient(180deg, #1E1E1E 0%, #2D2D2D 100%)'
    : 'linear-gradient(180deg, #12086F 0%, #2B354F 100%)';
});

const workplaceName    = computed(() => businessArea.value?.name    || '');
const workplaceAddress = computed(() => businessArea.value?.address || '');

const notifications = computed(() => {
  const items = [];
  if (notifPrefs.value.swapRequests) pendingSwaps.value.forEach(swap => {
    const name = swap.requestingUserName || 'Unknown';
    const shift = swap.shift;
    let shiftInfo = '';
    if (shift) {
      const d = new Date(Number(shift.shiftTime));
      shiftInfo = ` for ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    }
    items.push({ id: `swap-${swap.swap_id || swap.id}`, type: 'swap', label: 'Shift Cover Request', message: `${name} needs someone${shiftInfo}`, icon: 'mdi-swap-horizontal', color: '#f57c00' });
  });
  if (notifPrefs.value.timeOffRequests) pendingTimeOff.value.forEach(req => {
    const name  = req.employeeName || 'Unknown';
    const start = new Date(Number(req.start_date || req.startDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end   = new Date(Number(req.end_date   || req.endDate  )).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    items.push({ id: `timeoff-${req.request_id || req.id}`, type: 'timeoff', label: 'Time Off Request', message: `${name} requested time off ${start} - ${end}`, icon: 'mdi-calendar-remove', color: '#4361EE' });
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

const goToPage = (type) => router.push({ name: type === 'swap' ? 'employerSwaps' : 'employerTimeOff' });

// ── Exit impersonation ────────────────────────────────────────────────────
const exitImpersonation = async () => {
  exitingImpersonation.value = true;
  try {
    const adminToken    = localStorage.getItem('adminToken');
    const adminUserData = localStorage.getItem('adminUserData');

    if (adminToken) {
      try {
        const res = await AuthServices.exitImpersonation({ adminToken });
        Utils.setStore('user', res.data);
        localStorage.setItem('token', res.data.token);
      } catch {
        if (adminUserData) {
          const saved = JSON.parse(adminUserData);
          Utils.setStore('user', saved);
          localStorage.setItem('token', saved.token);
        }
      }
    } else if (adminUserData) {
      const saved = JSON.parse(adminUserData);
      Utils.setStore('user', saved);
      localStorage.setItem('token', saved.token);
    }

    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('impersonatedLocationName');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUserData');

    router.push({ name: 'workplace' });
  } catch (err) {
    console.error('Exit impersonation error:', err);
  } finally {
    exitingImpersonation.value = false;
  }
};

onMounted(async () => {
  user.value = Utils.getStore('user');

  const locationId = user.value?.work_location || user.value?.impersonatedLocation;

  if (props.isGuest) {
    businessArea.value = { name: 'Demo Campus Gym', address: '' };
  } else if (locationId) {
    try {
      const res = await EmployerService.getLocationById(locationId);
      businessArea.value = res.data || null;
    } catch {
      businessArea.value = { name: user.value?.impersonatedLocationName || 'My Workplace', address: '' };
    }
  }

  const savedTheme = localStorage.getItem('themePreference') || localStorage.getItem('theme');
  if (savedTheme) theme.global.name.value = savedTheme;

  const savedPrefs = localStorage.getItem('notificationPreferences');
  if (savedPrefs) { try { notifPrefs.value = { ...notifPrefs.value, ...JSON.parse(savedPrefs) }; } catch {} }

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
  if (saved) { try { notifPrefs.value = { ...notifPrefs.value, ...JSON.parse(saved) }; } catch {} }
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
    localStorage.clear();
    router.push('/login');
  }
};
</script>

<template>
  <div class="employer-layout">

    <!-- ── Impersonation Banner ──────────────────────────────────────────── -->
    <div v-if="isImpersonating" class="impersonation-banner">
      <div class="d-flex align-center ga-2">
        <v-icon color="white" size="18">mdi-eye</v-icon>
        <span class="text-body-2 font-weight-medium text-white">
          Admin view — You are seeing <strong>{{ impersonatedLocationName }}</strong> as an employer
        </span>
      </div>
      <v-btn size="small" variant="outlined" color="white"
        :loading="exitingImpersonation" @click="exitImpersonation" prepend-icon="mdi-exit-to-app">
        Exit to Admin
      </v-btn>
    </div>

    <v-navigation-drawer
      permanent :rail="rail"
      @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave"
      class="sidebar" :style="{ background: sidebarGradient }"
    >
      <div class="sidebar-header pa-4">
        <div v-show="!rail">
          <h2 class="text-h6 font-weight-bold text-white mb-0">ShiftBoard</h2>
          <div v-if="workplaceName" class="workplace-badge mt-2">
            <v-icon size="12" color="rgba(255,255,255,0.7)" class="mr-1">mdi-map-marker</v-icon>
            <span class="text-caption font-weight-medium" style="color:rgba(255,255,255,0.9);">{{ workplaceName }}</span>
          </div>
          <v-chip v-if="isImpersonating" size="x-small" color="warning" variant="flat" class="mt-2">
            <v-icon start size="x-small">mdi-eye</v-icon>Admin View
          </v-chip>
          <v-chip v-else-if="isGuest" size="x-small" color="info" variant="tonal" class="mt-2">
            <v-icon start size="x-small">mdi-eye-outline</v-icon>Guest Mode
          </v-chip>
        </div>
        <div v-show="rail" class="text-center">
          <v-icon color="white" size="32">{{ isImpersonating ? 'mdi-eye' : 'mdi-calendar-clock' }}</v-icon>
        </div>
      </div>

      <v-divider class="border-white-20" />

      <v-list nav class="px-2">
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard"   :to="isGuest ? { name: 'guestDashboard' }   : { name: 'employerDashboard' }"   color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-calendar"       title="Schedule"    :to="isGuest ? { name: 'guestSchedule' }    : { name: 'employerSchedule' }"    color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-calendar-text"  title="Templates"   :to="isGuest ? { name: 'guestTemplates' }   : { name: 'employerTemplates' }"   color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-account-group"  title="Employees"   :to="isGuest ? { name: 'guestEmployees' }   : { name: 'employerEmployees' }"   color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-clock-outline"  title="Availability" :to="isGuest ? { name: 'guestAvailability' } : { name: 'employerAvailability' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-calendar-remove" title="Time Off"   :to="isGuest ? { name: 'guestTimeOff' }     : { name: 'employerTimeOff' }"     color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-swap-horizontal" title="Swaps"      :to="isGuest ? { name: 'guestSwaps' }       : { name: 'employerSwaps' }"       color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-message-text"   title="Messages"    :to="isGuest ? { name: 'guestMessages' }    : { name: 'employerMessages' }"    color="white" class="nav-item" rounded="lg">
          <template #append v-if="unreadMsgCount > 0">
            <v-badge :content="unreadMsgCount" color="#f57c00" inline />
          </template>
        </v-list-item>
        <v-list-item prepend-icon="mdi-checkbox-marked-circle-outline" title="Tasks"      :to="isGuest ? { name: 'guestTasks' }      : { name: 'employerTasks' }"      color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-credit-card-clock-outline"      title="Time Cards" :to="isGuest ? { name: 'guestDashboard' }  : { name: 'employerTimeCards' }"  color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-cog-outline"                    title="Settings"   :to="isGuest ? { name: 'guestDashboard' }  : { name: 'employerSettings' }"   color="white" class="nav-item" rounded="lg" />

        <v-divider v-if="isImpersonating" class="border-white-20 my-2" />
        <v-list-item v-if="isImpersonating"
          prepend-icon="mdi-exit-to-app" title="Exit Admin View"
          color="warning" class="nav-item" rounded="lg"
          @click="exitImpersonation" />
      </v-list>
    </v-navigation-drawer>

    <div class="main-content" :class="{ 'with-banner': isImpersonating }">
      <v-app-bar elevation="0" density="default" class="top-bar">
        <v-spacer />

        <v-menu location="bottom end" v-model="showNotifications">
          <template #activator="{ props: bellProps }">
            <v-btn v-bind="bellProps" icon variant="text" class="mr-1">
              <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error">
                <v-icon>mdi-bell</v-icon>
              </v-badge>
            </v-btn>
          </template>
          <v-card min-width="420" max-width="500" style="max-height:500px;overflow-y:auto;">
            <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center justify-space-between">
              <span>Notifications</span>
              <v-btn v-if="notifications.length > 0" size="x-small" variant="tonal" color="#12086F"
                @click="router.push({ name: 'employerAlerts' }); showNotifications = false">View All</v-btn>
            </v-card-title>
            <v-divider />
            <div v-if="notifications.length === 0" class="text-center pa-6">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-bell-check-outline</v-icon>
              <p class="text-medium-emphasis">No pending requests</p>
            </div>
            <div v-else>
              <div v-for="notif in notifications" :key="notif.id"
                class="pa-4 notif-item" style="border-bottom:1px solid #f0f0f0;cursor:pointer;"
                @click="goToPage(notif.type); showNotifications = false">
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

        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon variant="text">
              <v-avatar size="42" :color="isImpersonating ? '#f57c00' : isGuest ? '#4895EF' : '#12086F'">
                <span class="text-white font-weight-bold text-caption">{{ userInitials }}</span>
              </v-avatar>
            </v-btn>
          </template>
          <v-card min-width="260">
            <v-card-text class="pa-4">
              <div class="text-center mb-3">
                <v-avatar size="56" :color="isImpersonating ? '#f57c00' : isGuest ? '#4895EF' : '#12086F'" class="mb-2">
                  <span class="text-white font-weight-bold text-body-1">{{ userInitials }}</span>
                </v-avatar>
                <div class="text-body-2 font-weight-bold">{{ userFullName }}</div>
                <div class="text-caption text-medium-emphasis">{{ userEmail }}</div>
                <v-chip v-if="isImpersonating" size="x-small" color="warning" variant="flat" class="mt-2">
                  <v-icon start size="x-small">mdi-eye</v-icon>Admin View
                </v-chip>
                <v-chip v-else-if="isGuest" size="x-small" color="info" variant="tonal" class="mt-2">Guest Mode</v-chip>
              </div>

              <div v-if="workplaceName && !isGuest" class="workplace-profile-badge mb-3">
                <v-icon size="14" color="#12086F" class="mr-1">mdi-map-marker</v-icon>
                <span class="text-caption font-weight-medium" style="color:#12086F;">{{ workplaceName }}</span>
                <div v-if="workplaceAddress" class="text-caption text-grey mt-1 ml-4">{{ workplaceAddress }}</div>
              </div>

              <v-divider class="my-2" />
              <v-list density="compact" class="pa-0">
                <v-list-item v-if="isImpersonating"
                  prepend-icon="mdi-exit-to-app" title="Exit to Admin Panel"
                  class="text-warning font-weight-bold" @click="exitImpersonation" />
                <v-list-item v-if="!isGuest && !isImpersonating"
                  prepend-icon="mdi-account" title="Profile" :to="{ name: 'employerProfile' }" />
                <v-list-item prepend-icon="mdi-logout"
                  :title="isGuest ? 'Exit Guest Mode' : 'Sign Out'"
                  @click="logout" :class="isGuest ? 'text-info' : 'text-error'" />
              </v-list>
            </v-card-text>
          </v-card>
        </v-menu>
      </v-app-bar>

      <div class="page-content"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.employer-layout { display: flex; min-height: 100vh; }
.sidebar { color: white; transition: width 0.3s ease; }
.sidebar-header { background-color: rgba(0,0,0,0.15); min-height: 64px; display: flex; align-items: center; }
.border-white-20 { border-color: rgba(255,255,255,0.2) !important; }
.nav-item { margin-bottom: 4px; transition: all 0.2s; }
.nav-item:hover:not(.v-list-item--disabled) { background-color: rgba(255,255,255,0.1) !important; }
.main-content { flex: 1; display: flex; flex-direction: column; }
.main-content.with-banner { margin-top: 44px; }
.page-content { flex: 1; overflow-y: auto; }
.notif-item:hover { background: #fafafa; }

.impersonation-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9999;
  height: 44px;
  background: linear-gradient(90deg, #e65100, #f57c00);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}

.workplace-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(255,255,255,0.12);
  border-radius: 6px;
  padding: 3px 8px;
}

.workplace-profile-badge {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  padding: 8px 12px;
}
</style>