<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const selectedTab = ref('inbox');

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

onMounted(() => {
  const isGuest = localStorage.getItem('isGuest');
  if (!isGuest) {
    router.push({ name: 'landing' });
    return;
  }
  
  localStorage.setItem('user', JSON.stringify(DEMO_USER));
});
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">
         <!-- Guest Mode Banner -->
      <v-alert type="info" variant="tonal" prominent class="mb-6">
        <div class="d-flex align-center justify-space-between">
          <div>
            <v-icon size="large" class="mr-3">mdi-eye-outline</v-icon>
            <strong>Guest Mode</strong> - Viewing demo messages
          </div>
          <v-btn color="primary" variant="outlined" @click="exitGuestMode">
            Exit Guest Mode
          </v-btn>
        </div>
      </v-alert>
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text mb-2">Messages</h1>
          <p class="text-body-2 text-grey">
            Communicate with your team
          </p>
        </div>
        
        <div class="d-flex ga-3">
          <v-btn
            color="#9c27b0"
            variant="flat"
            prepend-icon="mdi-bullhorn"
            disabled
          >
            Broadcast
          </v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            prepend-icon="mdi-email-plus"
            disabled
          >
            New Message
          </v-btn>
        </div>
      </div>

      <!-- Tabs -->
      <v-card variant="flat" class="mb-6">
        <v-tabs
          v-model="selectedTab"
          color="#12086F"
          align-tabs="start"
          density="compact"
        >
          <v-tab value="inbox">Inbox</v-tab>
          <v-tab value="sent">Sent</v-tab>
        </v-tabs>
      </v-card>

      <!-- Empty State -->
      <v-card variant="outlined" rounded="lg" class="empty-state-card">
        <v-card-text class="pa-12 text-center">
          <v-icon size="120" color="#BDBDBD" class="mb-6">
            mdi-email-outline
          </v-icon>
          
          <h3 class="text-h6 font-weight-regular text-grey mb-3">
            No messages
          </h3>
          
          <p class="text-body-2 text-grey">
            Your inbox is empty
          </p>
        </v-card-text>
      </v-card>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.empty-state-card {
  border-color: #e0e0e0;
  background: #FAFAFA;
}

.ga-3 {
  gap: 12px;
}
</style>