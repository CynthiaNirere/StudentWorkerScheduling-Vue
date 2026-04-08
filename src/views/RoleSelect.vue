<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";

const router = useRouter();
const user = ref(null);

onMounted(() => {
  user.value = Utils.getStore("user");
  if (!user.value || user.value.role !== "admin") {
    router.push({ name: "login" });
  }
});

// navigate to workplace selection
const handleAdminClick = () => {
  router.push({ name: "workplace" }); // Changed from "adminViewDashboard"
};

// Handle business area manager button click
const handleManagerClick = () => {
  router.push({ name: "businessAreaSelect" });
};
</script>

<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="5">
        <v-card class="pa-8" elevation="3">
          <!-- Header -->
          <div class="text-center mb-6">
            <p class="text-body-2 text-grey">
              Welcome Admin, who would you like to log in as
            </p>
          </div>

          <!-- Options -->
          <div class="d-flex flex-column align-center ga-3 my-6">
            <v-btn
              block
              size="large"
              color="primary"
              variant="elevated"
              prepend-icon="mdi-shield-crown"
              @click="handleAdminClick"
            >
              As Admin
            </v-btn>
            <v-btn
              block
              size="large"
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-store"
              @click="handleManagerClick"
            >
              As a Business area manager
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>