<template>
  <v-app>
    <Sidebar v-if="showSidebar" />
    
    <v-main>
      <v-container fluid>
        <slot></slot>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';

const route = useRoute();

// Hide sidebar on login/signup pages
const showSidebar = computed(() => {
  const publicRoutes = ['login', 'signup', 'roleSelect'];
  return !publicRoutes.includes(route.name);
});
</script>