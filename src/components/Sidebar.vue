<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    color="primary"
    dark
    @mouseenter="rail = false"
    @mouseleave="rail = true"
  >
    <!-- Logo/Header -->
    <v-list-item
      prepend-icon="mdi-calendar-clock"
      title="ShiftBoard"
      nav
    />

    <v-divider></v-divider>

    <!-- User Info Section -->
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
        :class="{ 'bg-accent': isActive(dashboardRoute) }"
        rounded="lg"
        @click="router.push(dashboardRoute)"
      />
      <v-list-item
        prepend-icon="mdi-office-building"
        title="Workplace"
        :class="{ 'bg-accent': isActive('/workplace') }"
        rounded="lg"
        @click="router.push('/workplace')"
      />
      <v-list-item
        prepend-icon="mdi-account-cog"
        title="Profile"
        :class="{ 'bg-accent': isActive('/profile') }"
        rounded="lg"
        @click="router.push('/profile')"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Utils from '../config/utils.js';
import AuthServices from '../services/authServices.js';

const router = useRouter();
const route = useRoute();
const drawer = ref(true);
const rail = ref(true);

const user = computed(() => Utils.getStore('user'));

const userInitials = computed(() => {
  if (!user.value) return '';
  const first = user.value.fName?.[0] || '';
  const last = user.value.lName?.[0] || '';
  return `${first}${last}`.toUpperCase();
});

// ✅ Manual exact active check — no Vuetify router magic
const isActive = (path) => route.path === path;

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
  transition: width 0.3s ease !important;
}

.bg-accent {
  background-color: rgba(67, 97, 238, 0.15) !important;
}
</style>