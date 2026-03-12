<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const templates = ref([]);
const loading = ref(false);

const DEMO_USER = {
  userId: 'demo-employer',
  user_id: 'demo-employer',
  email: 'demo@shiftboard.com',
  fName: 'Demo',
  lName: 'Manager',
  role: 'employer',
  work_location: null,
  token: 'demo-token'
};

onMounted(async () => {
  const isGuest = localStorage.getItem('isGuest');
  if (!isGuest) {
    router.push({ name: 'landing' });
    return;
  }
  
  localStorage.setItem('user', JSON.stringify(DEMO_USER));
  await loadTemplates();
});

const loadTemplates = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllTemplates();
    const allTemplates = Array.isArray(res.data) ? res.data : [];
    // Filter for demo templates only
    templates.value = allTemplates;
  } catch (err) {
    console.error('Error loading templates:', err);
  } finally {
    loading.value = false;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const exitGuestMode = () => {
  localStorage.removeItem('isGuest');
  localStorage.removeItem('user');
  router.push({ name: 'landing' });
};

const goBack = () => {
  router.push({ name: 'guestSchedule' });
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">
      <!-- Guest Mode Banner -->
      <v-alert type="info" variant="tonal" prominent class="mb-6">
        <div class="d-flex align-center justify-space-between">
          <div>
            <v-icon size="large" class="mr-3">mdi-eye-outline</v-icon>
            <strong>Guest Mode</strong> - Viewing demo schedule templates (read-only)
          </div>
          <v-btn color="primary" variant="outlined" @click="exitGuestMode">
            Exit Guest Mode
          </v-btn>
        </div>
      </v-alert>

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Schedule Templates</h1>
          <p class="text-body-2 text-grey">
            Manage and apply reusable weekly schedule templates
          </p>
        </div>
        <v-btn
          color="#12086F"
          variant="flat"
          prepend-icon="mdi-arrow-left"
          @click="goBack"
        >
          Back to Schedule
        </v-btn>
      </div>

      <!-- Templates Grid -->
      <v-row v-if="!loading">
        <v-col 
          v-for="template in templates" 
          :key="template.template_id || template.id"
          cols="12" 
          md="6" 
          lg="4"
        >
          <v-card variant="outlined" rounded="lg" class="template-card">
            <v-card-title class="d-flex align-center justify-space-between pa-4">
              <div class="text-h6 font-weight-bold navy-text">
                {{ template.name || template.title }}
              </div>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                    icon="mdi-dots-vertical"
                    size="small"
                    variant="plain"
                    v-bind="props"
                    disabled
                  />
                </template>
              </v-menu>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-4">
              <p class="text-body-2 text-grey mb-4">
                {{ template.description || 'No description provided' }}
              </p>

              <div class="d-flex align-center ga-2 mb-3">
                <v-icon size="18" color="#4361EE">mdi-calendar-clock</v-icon>
                <span class="text-caption font-weight-medium">
                  {{ template.shift_count || 0 }} shifts
                </span>
              </div>

              <div class="d-flex align-center ga-2">
                <v-icon size="18" color="#9e9e9e">mdi-calendar</v-icon>
                <span class="text-caption text-grey">
                  Created {{ formatDate(template.created_at || template.createdAt) }}
                </span>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-4">
              <v-btn
                color="#9c27b0"
                variant="tonal"
                block
                prepend-icon="mdi-calendar-check"
                disabled
              >
                Apply Template
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Empty State -->
        <v-col v-if="templates.length === 0" cols="12">
          <v-card variant="outlined" rounded="lg" class="pa-12 text-center">
            <v-icon size="80" color="#e0e0e0" class="mb-4">
              mdi-calendar-text-outline
            </v-icon>
            <h3 class="text-h6 font-weight-bold mb-2">No Templates Yet</h3>
            <p class="text-body-2 text-grey mb-6">
              Schedule templates help you quickly create recurring weekly schedules
            </p>
          </v-card>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <div v-else class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="48" />
      </div>

      <!-- How Templates Work Info Box -->
      <v-card variant="tonal" color="#E3F2FD" class="mt-6" rounded="lg">
        <v-card-text class="pa-5">
          <div class="d-flex align-start">
            <v-icon color="#1976D2" size="28" class="mr-4">mdi-information</v-icon>
            <div>
              <h3 class="text-body-1 font-weight-bold mb-2" style="color: #1976D2;">
                How Templates Work
              </h3>
              <ul class="text-body-2 text-grey ml-2">
                <li>Templates save the structure of your weekly schedule</li>
                <li>Click "Apply Template" to create shifts for any week</li>
                <li>Shifts are created as drafts - you can edit before publishing</li>
                <li>Great for recurring weekly schedules!</li>
              </ul>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.template-card {
  border-color: #e0e0e0;
  box-shadow: 0 2px 8px rgba(18, 8, 111, 0.08);
  transition: all 0.2s;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(18, 8, 111, 0.12);
  transform: translateY(-2px);
}
</style>