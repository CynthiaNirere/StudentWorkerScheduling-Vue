<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import Utils from '../config/utils.js';
import { useNotifications } from '../composables/useNotifications.js';
import EmployeeService from '../services/employeeServices.js';

const router = useRouter();
const theme  = useTheme();
const user   = ref(null);
const rail   = ref(true);
const showNotifications = ref(false);

const { notifications, unreadCount, dismissNotification, handleNotificationAction } = useNotifications();

const unreadMsgCount = ref(0);
let msgPollInterval = null;

const loadUnreadMsgCount = async () => {
  try {
    const res = await EmployeeService.getUnreadMessageCount();
    unreadMsgCount.value = res.data?.unreadCount || 0;
  } catch (e) { /* silent */ }
};

const sidebarGradient = computed(() =>
  theme.global.name.value === 'dark'
    ? 'linear-gradient(180deg, #1E1E1E 0%, #2D2D2D 100%)'
    : 'linear-gradient(180deg, #12086F 0%, #2B354F 100%)'
);

const userInitials = computed(() => {
  if (!user.value) return '?';
  return (user.value.fName?.[0] || user.value.first_name?.[0] || '') +
         (user.value.lName?.[0] || user.value.last_name?.[0] || '');
});

const userFullName = computed(() => {
  if (!user.value) return '';
  return `${user.value.fName || user.value.first_name || ''} ${user.value.lName || user.value.last_name || ''}`.trim();
});

const userEmail = computed(() => user.value?.email || '');

const handleMouseEnter = () => { rail.value = false; };
const handleMouseLeave = () => { rail.value = true; };

const logout = () => {
  Utils.setStore('user', null);
  router.push('/login');
};

const goToNotificationPage = (notif) => {
  handleNotificationAction(notif.id);
  showNotifications.value = false;
};

onMounted(async () => {
  user.value = Utils.getStore('user');
  const savedTheme = localStorage.getItem('themePreference') || localStorage.getItem('theme');
  if (savedTheme) theme.global.name.value = savedTheme;
  await loadUnreadMsgCount();
  msgPollInterval = setInterval(loadUnreadMsgCount, 15000);
});

onUnmounted(() => {
  if (msgPollInterval) clearInterval(msgPollInterval);
});
</script>

<template>
  <div class="employee-layout">
    <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
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
        </div>
        <div v-show="rail" class="text-center">
          <v-icon color="white" size="32">mdi-calendar-clock</v-icon>
        </div>
      </div>

      <v-divider class="border-white-20" />

      <v-list nav class="px-2">
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard"
          :to="{ name: 'employeeDashboard' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-calendar-month" title="My Schedule"
          :to="{ name: 'employeeSchedule' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-clock-outline" title="My Availability"
          :to="{ name: 'employeeAvailability' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-calendar-clock" title="Time Requests"
          :to="{ name: 'employeeTimeRequests' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-swap-horizontal" title="Shift Swaps"
          :to="{ name: 'employeeSwaps' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-checkbox-marked-circle-outline" title="My Tasks"
          :to="{ name: 'employeeTasks' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-message-text" title="Messages"
          :to="{ name: 'employeeMessages' }" color="white" class="nav-item" rounded="lg">
          <template #append v-if="unreadMsgCount > 0">
            <v-badge :content="unreadMsgCount" color="#f57c00" inline />
          </template>
        </v-list-item>
        <v-list-item prepend-icon="mdi-credit-card-clock-outline" title="Time Cards"
          :to="{ name: 'employeeTimeCards' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-account-circle-outline" title="Profile"
          :to="{ name: 'employeeProfile' }" color="white" class="nav-item" rounded="lg" />
        <v-list-item prepend-icon="mdi-cog-outline" title="Settings"
          :to="{ name: 'employeeSettings' }" color="white" class="nav-item" rounded="lg" />
      </v-list>
    </v-navigation-drawer>

    <!-- ── Main Content ─────────────────────────────────────────────────── -->
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
          <v-card min-width="400" max-width="480" style="max-height: 500px; overflow-y: auto;">
            <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center justify-space-between">
              <span>Notifications</span>
              <v-chip v-if="unreadCount > 0" size="x-small" color="error" variant="flat">{{ unreadCount }}</v-chip>
            </v-card-title>
            <v-divider />
            <div v-if="notifications.length === 0" class="text-center pa-6">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-bell-check-outline</v-icon>
              <p class="text-medium-emphasis text-body-2">All caught up!</p>
            </div>
            <div v-else>
              <div
                v-for="notif in notifications"
                :key="notif.id"
                class="pa-4 notif-row"
                :class="{ 'notif-unread': !notif.read }"
                @click="goToNotificationPage(notif)"
              >
                <div class="d-flex ga-3 align-start">
                  <v-icon :color="notif.color" size="large">{{ notif.icon }}</v-icon>
                  <div class="flex-grow-1">
                    <v-chip :color="notif.color" size="x-small" variant="tonal" class="mb-1">{{ notif.category }}</v-chip>
                    <div class="text-body-2 font-weight-bold">{{ notif.title }}</div>
                    <div class="text-body-2 text-grey">{{ notif.message }}</div>
                    <div class="text-caption text-grey mt-1">{{ notif.timestamp }}</div>
                  </div>
                  <v-btn icon="mdi-close" size="x-small" variant="text"
                    @click.stop="dismissNotification(notif.id)" />
                </div>
              </div>
            </div>
          </v-card>
        </v-menu>

        <!-- Account menu -->
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon variant="text">
              <v-avatar size="36" color="#12086F">
                <span class="text-white font-weight-bold text-caption">{{ userInitials }}</span>
              </v-avatar>
            </v-btn>
          </template>
          <v-card min-width="200">
            <v-card-text class="pa-3">
              <div class="text-center mb-3">
                <v-avatar size="48" color="#12086F" class="mb-2">
                  <span class="text-white font-weight-bold">{{ userInitials }}</span>
                </v-avatar>
                <div class="text-body-2 font-weight-bold">{{ userFullName }}</div>
                <div class="text-caption text-medium-emphasis">{{ userEmail }}</div>
              </div>
              <v-divider class="my-2" />
              <v-list density="compact" class="pa-0">
                <v-list-item prepend-icon="mdi-account" title="Profile" :to="{ name: 'employeeProfile' }" />
                <v-list-item prepend-icon="mdi-logout" title="Sign Out" @click="logout" class="text-error" />
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
.employee-layout { display: flex; min-height: 100vh; }
.sidebar { color: white; transition: width 0.3s ease; }
.sidebar-header { background-color: rgba(0,0,0,0.15); min-height: 64px; display: flex; align-items: center; }
.border-white-20 { border-color: rgba(255,255,255,0.2) !important; }
.nav-item { margin-bottom: 4px; transition: all 0.2s; }
.nav-item:hover { background-color: rgba(255,255,255,0.1) !important; }
.main-content { flex: 1; display: flex; flex-direction: column; }
.page-content { flex: 1; overflow-y: auto; }
.notif-row { border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.15s; }
.notif-row:hover { background: #fafafa; }
.notif-unread { border-left: 3px solid #f57c00; background: #fff8f3; }
</style>