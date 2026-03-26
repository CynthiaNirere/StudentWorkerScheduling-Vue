<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';

const props = defineProps({
  isGuest: {
    type: Boolean,
    default: false
  }
});

const router = useRouter();
const route = useRoute();
let refreshInterval = null;
const user = ref(null);
const businessArea = ref('');
const rail = ref(true);

const showNotifications = ref(false);
const pendingSwaps = ref([]);
const pendingTimeOff = ref([]);

const notifications = computed(() => {
  const items = [];

  pendingSwaps.value.forEach(swap => {
    const name = swap.requestingUserName || 'Unknown';
    const shift = swap.shift;
    let shiftInfo = '';
    if (shift) {
      const d = new Date(Number(shift.shiftTime));
      shiftInfo = ` for ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    }
    items.push({
      id: `swap-${swap.swap_id || swap.id}`,
      rawId: swap.swap_id || swap.id,
      type: 'swap',
      label: 'Shift Cover Request',
      message: `${name} needs someone${shiftInfo}`,
      icon: 'mdi-swap-horizontal',
      color: '#f57c00',
    });
  });

  pendingTimeOff.value.forEach(req => {
    const name = req.employeeName || 'Unknown';
    const start = new Date(Number(req.start_date || req.startDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(Number(req.end_date || req.endDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    items.push({
      id: `timeoff-${req.request_id || req.id}`,
      rawId: req.request_id || req.id,
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
    const swaps = Array.isArray(swapRes.data) ? swapRes.data : [];
    const timeOffs = Array.isArray(timeOffRes.data) ? timeOffRes.data : [];
    pendingSwaps.value = swaps.filter(s => s.status === 'pending' || s.status === 'accepted');
    pendingTimeOff.value = timeOffs.filter(t => t.status === 'pending');
  } catch (err) {
    console.error('Error loading pending requests:', err);
  }
};

const goToPage = (type) => {
  if (type === 'swap') {
    router.push({ name: 'employerSwaps' });
  } else {
    router.push({ name: 'employerTimeOff' });
  }
};

onMounted(async () => {
  user.value = Utils.getStore('user');
  
  if (props.isGuest) {
    businessArea.value = 'Demo Campus Gym';
  } else if (user.value?.work_location) {
    try {
      const res = await EmployerService.getLocationById(user.value.work_location);
      businessArea.value = res.data?.name || 'My Workplace';
    } catch (err) {
      console.error('Error loading business area:', err);
      businessArea.value = 'My Workplace';
    }
  }

  await loadPendingRequests();
  refreshInterval = setInterval(loadPendingRequests, 30000);
  window.addEventListener('notifications-updated', loadPendingRequests);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
  window.removeEventListener('notifications-updated', loadPendingRequests);
});

watch(() => route.path, () => {
  loadPendingRequests();
});

const userInitials = computed(() => {
  if (!user.value) return 'G';
  const firstName = user.value.fName || user.value.first_name || '';
  const lastName = user.value.lName || user.value.last_name || '';
  return (firstName[0] || '') + (lastName[0] || '');
});

const userFullName = computed(() => {
  if (!user.value) return 'Guest User';
  const firstName = user.value.fName || user.value.first_name || '';
  const lastName = user.value.lName || user.value.last_name || '';
  return `${firstName} ${lastName}`.trim() || 'Employer';
});

const userEmail = computed(() => {
  if (props.isGuest) return 'demo@shiftboard.com';
  return user.value?.email || '';
});

const handleMouseEnter = () => {
  rail.value = false;
};

const handleMouseLeave = () => {
  rail.value = true;
};

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
    <!-- Collapsible Sidebar Navigation -->
    <v-navigation-drawer 
      permanent 
      :rail="rail"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      class="sidebar"
    >
      <div class="sidebar-header pa-4">
        <div v-show="!rail">
          <h2 class="text-h6 font-weight-bold text-white">ShiftBoard</h2>
          <p class="text-caption text-white-80 mt-1 mb-0">
            {{ businessArea || '...' }}
          </p>
          <v-chip v-if="isGuest" size="x-small" color="info" variant="tonal" class="mt-2">
            <v-icon start size="x-small">mdi-eye-outline</v-icon>
            Guest Mode
          </v-chip>
        </div>
        <div v-show="rail" class="text-center">
          <v-icon color="white" size="32">mdi-calendar-clock</v-icon>
          <v-icon v-if="isGuest" color="info" size="16" class="mt-1">
            mdi-eye-outline
          </v-icon>
        </div>
      </div>

      <v-divider class="border-white-20" />

      <v-list nav class="px-2">
  <v-list-item
    prepend-icon="mdi-view-dashboard"
    title="Dashboard"
    :to="isGuest ? { name: 'guestDashboard' } : { name: 'employerDashboard' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
  <v-list-item
    prepend-icon="mdi-calendar"
    title="Schedule"
    :to="isGuest ? { name: 'guestSchedule' } : { name: 'employerSchedule' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
  <v-list-item
    prepend-icon="mdi-calendar-text"
    title="Templates"
    :to="isGuest ? { name: 'guestTemplates' } : { name: 'employerTemplates' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
  <v-list-item
    prepend-icon="mdi-account-group"
    title="Employees"
    :to="isGuest ? { name: 'guestEmployees' } : { name: 'employerEmployees' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
  <v-list-item
    prepend-icon="mdi-clock-outline"
    title="Availability"
    :to="isGuest ? { name: 'guestAvailability' } : { name: 'employerAvailability' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
  <v-list-item
    prepend-icon="mdi-calendar-remove"
    title="Time Off"
    :to="isGuest ? { name: 'guestTimeOff' } : { name: 'employerTimeOff' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
  <v-list-item
    prepend-icon="mdi-swap-horizontal"
    title="Swaps"
    :to="isGuest ? { name: 'guestSwaps' } : { name: 'employerSwaps' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
  <v-list-item
    prepend-icon="mdi-bell-alert"
    title="Alerts"
    :to="isGuest ? { name: 'guestAlerts' } : { name: 'employerAlerts' }"
    color="white"
    class="nav-item"
    rounded="lg"
  >
    <template #append v-if="!isGuest && unreadCount > 0 && !rail">
      <v-chip size="x-small" color="error" variant="flat">
        {{ unreadCount }}
      </v-chip>
    </template>
  </v-list-item>
  <v-list-item
    prepend-icon="mdi-message-text"
    title="Messages"
    :to="isGuest ? { name: 'guestMessages' } : { name: 'employerMessages' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
  <v-list-item
    prepend-icon="mdi-checkbox-marked-circle-outline"
    title="Tasks"
    :to="isGuest ? { name: 'guestTasks' } : { name: 'employerTasks' }"
    color="white"
    class="nav-item"
    rounded="lg"
  />
</v-list>
    </v-navigation-drawer>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Top Navigation Bar -->
      <v-app-bar elevation="0" color="white" density="compact" class="top-bar">
        <v-spacer />

        <!-- Notification Bell -->
        <v-menu location="bottom end" v-model="showNotifications">
          <template #activator="{ props: bellProps }">
            <v-btn v-bind="bellProps" icon variant="text" class="mr-1">
              <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error">
                <v-icon>mdi-bell</v-icon>
              </v-badge>
            </v-btn>
          </template>
          <v-card min-width="420" max-width="500" style="max-height: 500px; overflow-y: auto;">
            <v-card-title class="text-h6 font-weight-bold pa-4">Notifications</v-card-title>
            <v-divider />
            <div v-if="notifications.length === 0" class="text-center pa-6">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-bell-check-outline</v-icon>
              <p class="text-grey">No pending requests</p>
            </div>
            <div v-else>
              <div
                v-for="notif in notifications"
                :key="notif.id"
                class="pa-4"
                style="border-bottom: 1px solid #f0f0f0;"
              >
                <div class="d-flex ga-3 align-start">
                  <v-icon :color="notif.color" size="large">{{ notif.icon }}</v-icon>
                  <div class="flex-grow-1" style="cursor: pointer;" @click="goToPage(notif.type); showNotifications = false">
                    <v-chip :color="notif.color" size="x-small" variant="tonal" class="mb-1">{{ notif.label }}</v-chip>
                    <p class="text-body-2 mb-0">{{ notif.message }}</p>
                  </div>
                </div>
              </div>
            </div>
          </v-card>
        </v-menu>
        
        <!-- Account Menu -->
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
                <div class="text-caption text-grey">{{ userEmail }}</div>
                <v-chip v-if="isGuest" size="x-small" color="info" variant="tonal" class="mt-2">
                  Guest Mode
                </v-chip>
              </div>
              
              <v-divider class="my-2" />
              
              <v-list density="compact" class="pa-0">
                <v-list-item
                  v-if="!isGuest"
                  prepend-icon="mdi-account"
                  title="Profile"
                  :to="{ name: 'employerProfile' }"
                />
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

      <!-- Page Content -->
      <div class="page-content">
        <slot />
      </div>
    </div>

  </div>
</template>

<style scoped>
.employer-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.sidebar {
  background: linear-gradient(180deg, #12086F 0%, #2B354F 100%);
  color: white;
  transition: width 0.3s ease;
}

.sidebar-header {
  background-color: rgba(0, 0, 0, 0.15);
  min-height: 64px;
  display: flex;
  align-items: center;
}

.text-white-80 {
  color: rgba(255, 255, 255, 0.8);
}

.border-white-20 {
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.nav-item {
  margin-bottom: 4px;
  transition: all 0.2s;
}

.nav-item:hover:not(.v-list-item--disabled) {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.nav-item.v-list-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.top-bar {
  border-bottom: 1px solid #e0e0e0;
}

.page-content {
  flex: 1;
  overflow-y: auto;
}
</style>