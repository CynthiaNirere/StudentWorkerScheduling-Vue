<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    color="primary"
    dark
  >
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

    <v-list density="compact" nav>
      <v-list-item
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        value="dashboard"
        :to="dashboardRoute"
      ></v-list-item>

      <v-list-item
        prepend-icon="mdi-office-building"
        title="Workplaces"
        value="workplaces"
        to="/workplaces"
      ></v-list-item>

      <v-list-item
        prepend-icon="mdi-account-cog"
        title="Profile & Settings"
        value="profile"
        to="/profile"
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
import AuthServices from '../services/authServices.js';

const router = useRouter();
const drawer = ref(true);
const rail = ref(false);

// Get user role to determine dashboard route
const user = computed(() => Utils.getStore('user'));

const dashboardRoute = computed(() => {
  const role = user.value?.role;
  if (role === 'admin') return '/admin';
  if (role === 'employer') return '/employer';
  return '/employee';
});

const handleLogout = async () => {
  try {
    await AuthServices.logoutUser();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    Utils.removeItem('user');
    localStorage.clear();
    sessionStorage.clear();
    
    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
    
    router.push({ name: 'login' });
  }
};
</script>

<style scoped>
.v-navigation-drawer {
  z-index: 1000;
}
</style>