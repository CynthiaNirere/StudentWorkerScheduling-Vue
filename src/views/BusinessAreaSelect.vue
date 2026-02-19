<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import businessAreaServices from "../services/businessAreaServices.js";

const router = useRouter();
const user = ref(null);
const businessAreas = ref([]);
const loading = ref(true);

onMounted(async () => {
  user.value = Utils.getStore("user");
  if (!user.value || user.value.role !== "admin") {
    router.push({ name: "login" });
    return;
  }

  try {
    const response = await businessAreaServices.getAll();
    businessAreas.value = response.data;
  } catch (error) {
    console.error("Failed to load business areas:", error);
  } finally {
    loading.value = false;
  }
});

const getAbbreviation = (name) => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
};

const selectArea = (area) => {
  Utils.setStore("selectedBusinessArea", area);
  router.push({ name: "employerDashboard" });
};

const goBack = () => {
  router.push({ name: "roleSelect" });
};
</script>

<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="10" md="8" lg="7">
        <v-card class="pa-8" elevation="3">
          <!-- Header -->
          <div class="text-center mb-2">
            <p class="text-body-2 text-grey">
              Welcome back Admin, pick Business Area
            </p>
          </div>

          <div class="text-center mb-6">
            <h3 class="text-h6 font-weight-bold">Select Workplace</h3>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </div>

          <!-- Business Areas Grid -->
          <v-row v-else justify="center" class="my-4">
            <v-col
              v-for="area in businessAreas"
              :key="area.location_id"
              cols="4"
              sm="4"
              md="4"
              class="d-flex justify-center"
            >
              <div class="text-center">
                <v-card
                  class="pa-4 d-flex align-center justify-center cursor-pointer"
                  variant="outlined"
                  width="80"
                  height="80"
                  @click="selectArea(area)"
                  hover
                >
                  <span class="text-h6 font-weight-bold">
                    {{ getAbbreviation(area.name) }}
                  </span>
                </v-card>
                <p class="text-caption mt-2">{{ area.name }}</p>
              </div>
            </v-col>
          </v-row>

          <!-- No areas message -->
          <div
            v-if="!loading && businessAreas.length === 0"
            class="text-center py-8"
          >
            <p class="text-body-2 text-grey">No business areas found.</p>
          </div>

          <!-- Back button -->
          <div class="text-center mt-4">
            <v-btn variant="text" @click="goBack"> Back </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
