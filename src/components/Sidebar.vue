<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    color="primary"
    dark
    @click="rail = false"
  >
    <!-- Logo/Header -->
    <v-list-item
      prepend-icon="mdi-calendar-clock"
      title="ShiftBoard"
      nav
    >
      <template v-slot:append>
        <v-btn
          variant="text"
          icon="mdi-chevron-left"
          @click.stop="rail = !rail"
        ></v-btn>
      </template>
    </v-list-item>

    <v-divider></v-divider>

    <!-- User Info Section (shows when NOT collapsed) -->
    <v-list-item v-if="!rail && user" class="py-4">
      <template v-slot:prepend>
        <v-avatar color="white" size="40">
          <span class="text-primary font-weight-bold text-h6">
            {{ userInitials }}
          </span>
        </v-avatar>
      </template>
      <v-list-item-title class="font-weight-bold">
        {{ user.fName }} {{ user.lName }}
      </v-list-item-title>
      <v-list-item-subtitle class="text-capitalize">
        {{ user.role }}
      </v-list-item-subtitle>
    </v-list-item>

    <v-divider v-if="!rail"></v-divider>

    <!-- Navigation Links -->
    <v-list density="compact" nav>
      <v-list-item
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        value="dashboard"
        :to="dashboardRoute"
        active-class="bg-accent"
      ></v-list-item>

      <v-list-item
        prepend-icon="mdi-office-building"
        title="Workplace"
        value="workplace"
        to="/workplace"
        active-class="bg-accent"
      ></v-list-item>

      <v-list-item
        prepend-icon="mdi-account-cog"
        title="Profile & Settings"
        value="profile"
        to="/profile"
        active-class="bg-accent"
      ></v-list-item>

      <v-list-item
        prepend-icon="mdi-logout"
        title="Sign Out"
        value="signout"
        @click="handleLogout"
      ></v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';

const router = useRouter();
const drawer = ref(true);
const rail = ref(false);

// Get user from localStorage
const user = computed(() => Utils.getStore('user'));

// Compute user initials (e.g., "CN" for Cynthia Nirere)
const userInitials = computed(() => {
  if (!user.value) return '';
  const first = user.value.fName?.[0] || '';
  const last = user.value.lName?.[0] || '';
  return `${first}${last}`.toUpperCase();
});

// Dashboard route based on user role
const dashboardRoute = computed(() => {
  const role = user.value?.role;
  if (role === 'admin') return '/admin';
  if (role === 'employer') return '/employer';
  return '/employee';
});
</script>

<style scoped>
.v-navigation-drawer {
  z-index: 1000;
}

/* Active menu item styling */
.bg-accent {
  background-color: rgba(67, 97, 238, 0.15) !important;
}
</style>