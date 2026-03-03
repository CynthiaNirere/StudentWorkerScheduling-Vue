<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';

const props = defineProps({
  isGuest: {
    type: Boolean,
    default: false
  }
});

const router = useRouter();
const user = ref(null);
const businessArea = ref('');
const rail = ref(true);

onMounted(async () => {
  user.value = Utils.getStore('user');
  
  // Set business area based on guest or real user
  if (props.isGuest) {
    businessArea.value = 'Demo Campus Gym';
  } else if (user.value?.work_location) {
    businessArea.value = 'The Brew';
  }
});

const userInitials = computed(() => {
  if (!user.value) return 'G';  // G for Guest
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
          <!-- Guest Badge -->
          <v-chip v-if="isGuest" size="x-small" color="info" variant="tonal" class="mt-2">
            <v-icon start size="x-small">mdi-eye-outline</v-icon>
            Guest Mode
          </v-chip>
        </div>
        <div v-show="rail" class="text-center">
          <v-icon color="white" size="32">mdi-calendar-clock</v-icon>
          <!-- Guest indicator when collapsed -->
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
          :to="isGuest ? undefined : { name: 'employerDashboard' }"
          :disabled="isGuest"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-calendar"
          title="Schedule"
          :to="isGuest ? undefined : { name: 'employerSchedule' }"
          :disabled="isGuest"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-account-group"
          title="Employees"
          :to="isGuest ? undefined : { name: 'employerEmployees' }"
          :disabled="isGuest"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-clock-outline"
          title="Availability"
          :to="isGuest ? undefined : { name: 'employerAvailability' }"
          :disabled="isGuest"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-calendar-remove"
          title="Time Off"
          :to="isGuest ? undefined : { name: 'employerTimeOff' }"
          :disabled="isGuest"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-swap-horizontal"
          title="Swaps"
          :to="isGuest ? undefined : { name: 'employerSwaps' }"
          :disabled="isGuest"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-checkbox-marked-circle-outline"
          title="Tasks"
          :to="isGuest ? undefined : { name: 'employerTasks' }"
          :disabled="isGuest"
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