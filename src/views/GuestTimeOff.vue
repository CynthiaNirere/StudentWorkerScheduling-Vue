<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const loading = ref(true);
const timeOffRequests = ref([]);
const activeTab = ref('pending');

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

const tabs = [
  { value: 'pending', label: 'PENDING' },
  { value: 'approved', label: 'APPROVED' },
  { value: 'denied', label: 'DENIED' },
  { value: 'all', label: 'ALL' }
];

onMounted(async () => {
  const isGuest = localStorage.getItem('isGuest');
  if (!isGuest) {
    router.push({ name: 'landing' });
    return;
  }
  
  localStorage.setItem('user', JSON.stringify(DEMO_USER));
  await loadTimeOffRequests();
});

const loadTimeOffRequests = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllTimeOffRequests();
    const allRequests = Array.isArray(res.data) ? res.data : [];
    
    // Filter for demo requests only
    timeOffRequests.value = allRequests.filter(req => 
      (req.request_id || req.requestId || '').toString().startsWith('demo-')
    );
  } catch (err) {
    console.error('Error loading time off requests:', err);
  } finally {
    loading.value = false;
  }
};

const filteredRequests = computed(() => {
  if (activeTab.value === 'all') return timeOffRequests.value;
  return timeOffRequests.value.filter(req => req.status === activeTab.value);
});

const pendingCount = computed(() => {
  return timeOffRequests.value.filter(req => req.status === 'pending').length;
});

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(Number(startDate));
  const end = new Date(Number(endDate));
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end day
};

const getStatusColor = (status) => {
  if (status === 'pending') return 'orange';
  if (status === 'approved') return 'success';
  if (status === 'denied') return 'error';
  return 'grey';
};

const exitGuestMode = () => {
  localStorage.removeItem('isGuest');
  localStorage.removeItem('user');
  router.push({ name: 'landing' });
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
            <strong>Guest Mode</strong> - Viewing demo time off requests
          </div>
          <v-btn color="primary" variant="outlined" @click="exitGuestMode">
            Exit Guest Mode
          </v-btn>
        </div>
      </v-alert>

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">Time Off Requests</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Review and manage employee time off requests
        </p>
      </div>

      <!-- Tabs -->
      <v-tabs v-model="activeTab" color="primary" class="mb-6">
        <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
          {{ tab.label }}
          <v-badge
            v-if="tab.value === 'pending' && pendingCount > 0"
            :content="pendingCount"
            color="orange"
            inline
            class="ml-2"
          />
        </v-tab>
      </v-tabs>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Requests Table -->
      <v-card v-else variant="outlined" rounded="lg">
        <v-table>
          <thead>
            <tr>
              <th class="text-left">Employee</th>
              <th class="text-left">Start Date</th>
              <th class="text-left">End Date</th>
              <th class="text-left">Days</th>
              <th class="text-left">Reason</th>
              <th class="text-left">Status</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredRequests.length === 0">
              <td colspan="7" class="text-center py-8 text-grey">
                No {{ activeTab === 'all' ? '' : activeTab }} time off requests
              </td>
            </tr>
            <tr v-for="request in filteredRequests" :key="request.request_id || request.requestId">
              <td>{{ request.user_name || request.userName || 'Employee' }}</td>
              <td>{{ formatDate(request.start_date || request.startDate) }}</td>
              <td>{{ formatDate(request.end_date || request.endDate) }}</td>
              <td>{{ calculateDays(request.start_date || request.startDate, request.end_date || request.endDate) }}</td>
              <td>{{ request.reason || '-' }}</td>
              <td>
                <v-chip 
                  :color="getStatusColor(request.status)" 
                  size="small" 
                  variant="tonal"
                >
                  {{ request.status }}
                </v-chip>
              </td>
              <td>
                <div class="d-flex justify-center gap-2">
                  <v-btn icon size="small" variant="text" color="primary" disabled>
                    <v-icon>mdi-eye</v-icon>
                  </v-btn>
                  <v-btn 
                    v-if="request.status === 'pending'"
                    icon 
                    size="small" 
                    variant="text" 
                    color="success" 
                    disabled
                  >
                    <v-icon>mdi-check</v-icon>
                  </v-btn>
                  <v-btn 
                    v-if="request.status === 'pending'"
                    icon 
                    size="small" 
                    variant="text" 
                    color="error" 
                    disabled
                  >
                    <v-icon>mdi-close</v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Pagination -->
        <v-card-actions v-if="filteredRequests.length > 0" class="justify-end">
          <span class="text-caption text-grey mr-4">
            Items per page: 10
          </span>
          <span class="text-caption text-grey mr-4">
            1-1 of {{ filteredRequests.length }}
          </span>
          <v-btn icon size="small" variant="text" disabled>
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" disabled>
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.gap-2 {
  gap: 8px;
}

th {
  font-weight: 600 !important;
  color: #12086F !important;
}
</style>