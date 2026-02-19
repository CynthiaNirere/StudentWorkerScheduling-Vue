<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';

const router = useRouter();
const user = ref(null);
const businessArea = ref('');

// Drawer state
const drawer = ref(true);
const rail = ref(false); // mini mode
const isPinned = ref(false);

onMounted(async () => {
  user.value = Utils.getStore('user');
  if (user.value?.work_location) {
    businessArea.value = 'The Brew';
  }
});

const userGreeting = computed(() =>
  user.value ? (user.value.fName || 'Employer') : 'Employer'
);

const userInitials = computed(() => {
  if (!user.value) return 'E';
  return (user.value.fName?.[0] || '') + (user.value.lName?.[0] || '');
});

const logout = () => {
  Utils.setStore('user', null);
  router.push('/login');
};

// Expand on hover (only if not pinned)
const handleMouseEnter = () => {
  if (!isPinned.value) rail.value = false;
};

const handleMouseLeave = () => {
  if (!isPinned.value) rail.value = true;
};

// Toggle pin (lock open)
const togglePin = () => {
  isPinned.value = !isPinned.value;
  rail.value = !isPinned.value ? true : false;
};
</script>

<template>
  <div class="employer-layout">
    
    <!-- Collapsible Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      permanent
      :rail="rail"
      expand-on-hover
      class="sidebar"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <!-- Header -->
      <div class="sidebar-header pa-4 d-flex align-center justify-space-between">
        <div v-if="!rail">
          <h2 class="text-h6 font-weight-bold text-white mb-0">TalonTime</h2>
          <p class="text-caption text-white-80 mt-1 mb-0">
            {{ businessArea || '...' }}
          </p>
        </div>

        <!-- Pin Button -->
        <v-btn
          icon
          variant="text"
          size="small"
          @click="togglePin"
        >
          <v-icon color="white">
            {{ isPinned ? 'mdi-pin' : 'mdi-pin-outline' }}
          </v-icon>
        </v-btn>
      </div>

      <v-divider />

      <!-- Navigation -->
      <v-list nav density="comfortable">
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          :to="{ name: 'employerDashboard' }"
        />
        <v-list-item
          prepend-icon="mdi-calendar"
          title="Schedule"
          :to="{ name: 'employerSchedule' }"
        />
        <v-list-item
          prepend-icon="mdi-account-group"
          title="Employees"
          :to="{ name: 'employerEmployees' }"
        />
        <v-list-item
          prepend-icon="mdi-clock-outline"
          title="Availability"
          :to="{ name: 'employerAvailability' }"
        />
        <v-list-item
          prepend-icon="mdi-calendar-remove"
          title="Time Off"
          :to="{ name: 'employerTimeOff' }"
        />
        <v-list-item
          prepend-icon="mdi-swap-horizontal"
          title="Swaps"
          :to="{ name: 'employerSwaps' }"
        />
        <v-list-item
          prepend-icon="mdi-checkbox-marked-circle-outline"
          title="Tasks"
          :to="{ name: 'employerTasks' }"
        />
        <v-list-item
          prepend-icon="mdi-account"
          title="Profile"
          :to="{ name: 'employerProfile' }"
        />
      </v-list>

      <v-spacer />

      <!-- Logout -->
      <v-list nav class="pb-4">
        <v-list-item
          prepend-icon="mdi-logout"
          title="Sign Out"
          @click="logout"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content -->
    <div class="main-content">
      <slot />
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
  background: linear-gradient(to bottom, #8b3a42 0%, #a04a52 100%);
  color: white;
  transition: width 0.3s ease;
}

.sidebar-header {
  background-color: rgba(0, 0, 0, 0.1);
}

.text-white-80 {
  color: rgba(255, 255, 255, 0.8);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  overflow-x: hidden;
  padding: 24px;
}
</style>
