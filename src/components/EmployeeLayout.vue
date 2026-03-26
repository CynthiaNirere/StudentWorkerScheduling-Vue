<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify'; // ✅ ADD THIS
import Utils from '../config/utils.js';

const router = useRouter();
const theme = useTheme(); // ✅ ADD THIS
const user = ref(null);
const rail = ref(true);

// ✅ ADD THIS: Dynamic sidebar gradient based on theme
const sidebarGradient = computed(() => {
  if (theme.global.name.value === 'dark') {
    return 'linear-gradient(180deg, #1E1E1E 0%, #2D2D2D 100%)';
  }
  return 'linear-gradient(180deg, #12086F 0%, #2B354F 100%)';
});

const handleMouseEnter = () => { rail.value = false; };
const handleMouseLeave = () => { rail.value = true; };

onMounted(() => {
  user.value = Utils.getStore('user');
  
  // ✅ ADD THIS: Load saved theme preference
  const savedTheme = localStorage.getItem('themePreference');
  if (savedTheme) {
    theme.global.name.value = savedTheme;
  }
});

const userInitials = computed(() => {
  if (!user.value) return '?';
  const firstName = user.value.fName || user.value.first_name || '';
  const lastName = user.value.lName || user.value.last_name || '';
  return (firstName[0] || '') + (lastName[0] || '');
});

const userFullName = computed(() => {
  if (!user.value) return '';
  const firstName = user.value.fName || user.value.first_name || '';
  const lastName = user.value.lName || user.value.last_name || '';
  return `${firstName} ${lastName}`.trim();
});

const userEmail = computed(() => user.value?.email || '');

const logout = () => {
  Utils.setStore('user', null);
  router.push('/login');
};
</script>

<template>
  <div class="employee-layout">
    <!-- Collapsible Sidebar -->
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
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          :to="{ name: 'employeeDashboard' }"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-clock-outline"
          title="My Availability"
          :to="{ name: 'employeeAvailability' }"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-calendar-month"
          title="Team Schedule"
          :to="{ name: 'employeeSchedule' }"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-account-circle-outline"
          title="Profile"
          :to="{ name: 'employeeProfile' }"
          color="white"
          class="nav-item"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-cog-outline"
          title="Settings"
          :to="{ name: 'employeeSettings' }"
          color="white"
          class="nav-item"
          rounded="lg"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Top App Bar -->
      <v-app-bar elevation="0" density="compact" class="top-bar">
        <v-spacer />

        <!-- Account Menu -->
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
                <v-list-item
                  prepend-icon="mdi-account"
                  title="Profile"
                  :to="{ name: 'employeeProfile' }"
                />
                <v-list-item
                  prepend-icon="mdi-logout"
                  title="Sign Out"
                  @click="logout"
                  class="text-error"
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
.employee-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  color: white;
  transition: width 0.3s ease;
}

.sidebar-header {
  background-color: rgba(0, 0, 0, 0.15);
  min-height: 64px;
  display: flex;
  align-items: center;
}

.border-white-20 {
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.nav-item {
  margin-bottom: 4px;
  transition: all 0.2s;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  overflow-y: auto;
}
</style>