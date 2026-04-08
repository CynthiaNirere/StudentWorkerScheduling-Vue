
<script setup>
// Simple App.vue - let each page control its own layout
</script>

<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style>
/* Global size increase — scales everything uniformly */
html {
  font-size: 20px;
  zoom: 1.50;
}
body {
  font-size: 1rem;
}
.v-application {
  font-size: 1rem;
}
</style>