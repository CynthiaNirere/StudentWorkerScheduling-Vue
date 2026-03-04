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

    <!-- User Info Section (clickable, opens profile popup) -->
    <v-menu v-if="user" location="end" offset="8">
      <template v-slot:activator="{ props }">
        <v-list-item v-bind="props" class="py-4" style="cursor: pointer;">
          <template v-slot:prepend>
            <v-avatar color="white" size="40">
              <span class="text-primary font-weight-bold text-h6">
                {{ userInitials }}
              </span>
            </v-avatar>
          </template>
          <v-list-item-title v-if="!rail" class="font-weight-bold">
            {{ user.fName }} {{ user.lName }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="!rail" class="text-capitalize">
            {{ user.role }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>

      <v-card min-width="200">
        <v-card-text>
          <div class="text-center">
            <v-avatar color="secondary" class="mt-2 mb-2" size="large">
              <span class="font-weight-bold">{{ userInitials }}</span>
            </v-avatar>
            <h3>{{ user.fName }} {{ user.lName }}</h3>
            <p class="text-caption mt-1">{{ user.email }}</p>
            <v-chip
              size="small"
              :color="user.role === 'admin' ? 'error' : user.role === 'employer' ? 'primary' : 'success'"
              class="my-2"
            >
              {{ user.role }}
            </v-chip>
            <v-divider class="my-3"></v-divider>
            <v-btn variant="text" color="primary" block @click="router.push('/profile')">
              <v-icon start>mdi-account-cog</v-icon>
              View Profile
            </v-btn>
            <v-btn variant="text" color="error" block @click="handleLogout">
              <v-icon start>mdi-logout</v-icon>
              Logout
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-menu>

    <v-divider v-if="user"></v-divider>

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
        title="Profile"
        value="profile"
        to="/profile"
        active-class="bg-accent"
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

// Get user from localStorage
const user = computed(() => Utils.getStore('user'));

// Compute user initials (e.g., "CN" for Cynthia Nirere)
const userInitials = computed(() => {
  if (!user.value) return '';
  const first = user.value.fName?.[0] || '';
  const last = user.value.lName?.[0] || '';
  return `${first}${last}`.toUpperCase();
});

const handleLogout = async () => {
  try {
    await AuthServices.logoutUser(user.value);
  } catch (err) {
    console.warn('Logout error:', err);
  } finally {
    Utils.removeItem('user');
    router.push({ name: 'login' });
  }
};

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