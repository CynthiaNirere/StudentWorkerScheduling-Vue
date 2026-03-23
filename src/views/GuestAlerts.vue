<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const loading = ref(true);
const selectedTab = ref('all');

const swapRequests = ref([]);
const timeOffRequests = ref([]);

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
  await loadAlerts();
});

const loadAlerts = async () => {
  loading.value = true;
  try {
    const [swapRes, timeOffRes] = await Promise.all([
      EmployerService.getAllShiftSwapRequests(),
      EmployerService.getAllTimeOffRequests(),
    ]);
    
    swapRequests.value = Array.isArray(swapRes.data) ? swapRes.data : [];
    timeOffRequests.value = Array.isArray(timeOffRes.data) ? timeOffRes.data : [];
  } catch (err) {
    console.error('Error loading alerts:', err);
  } finally {
    loading.value = false;
  }
};

const allAlerts = computed(() => {
  const alerts = [];
  
  swapRequests.value.forEach(swap => {
    alerts.push({
      id: `swap-${swap.swap_id || swap.id}`,
      type: 'swap',
      category: 'Shift Swap',
      title: 'Shift Cover Request',
      message: `${swap.requestingUserName || 'Unknown'} needs someone for ${formatShiftDate(swap.shift)}`,
      reason: '',
      status: swap.status || 'pending',
      date: swap.created_at || swap.createdAt,
      icon: 'mdi-swap-horizontal',
      color: '#f57c00',
    });
  });
  
  timeOffRequests.value.forEach(req => {
    const start = formatDate(req.start_date || req.startDate);
    const end = formatDate(req.end_date || req.endDate);
    alerts.push({
      id: `timeoff-${req.request_id || req.id}`,
      type: 'timeoff',
      category: 'Time Off',
      title: 'Time Off Request',
      message: `${req.employeeName || 'Unknown'} requested time off ${start} - ${end}`,
      reason: req.reason ? `Reason: ${req.reason}` : '',
      status: req.status || 'pending',
      date: req.created_at || req.createdAt,
      icon: 'mdi-calendar-remove',
      color: '#4361EE',
    });
  });
  
  return alerts.sort((a, b) => Number(b.date) - Number(a.date));
});

const filteredAlerts = computed(() => {
  if (selectedTab.value === 'pending') {
    return allAlerts.value.filter(a => a.status === 'pending');
  }
  if (selectedTab.value === 'shift_swaps') {
    return allAlerts.value.filter(a => a.type === 'swap');
  }
  if (selectedTab.value === 'time_off') {
    return allAlerts.value.filter(a => a.type === 'timeoff');
  }
  if (selectedTab.value === 'system') {
    return []; // No system alerts in demo
  }
  return allAlerts.value;
});

const pendingCount = computed(() => {
  return allAlerts.value.filter(a => a.status === 'pending').length;
});

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatShiftDate = (shift) => {
  if (!shift || !shift.shiftTime) return '';
  const date = new Date(Number(shift.shiftTime));
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatAlertDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const getStatusColor = (status) => {
  if (status === 'pending') return '#f57c00';
  if (status === 'approved' || status === 'accepted') return '#2e7d32';
  if (status === 'denied' || status === 'rejected') return '#d32f2f';
  return '#9e9e9e';
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text mb-2">Notifications & Alerts</h1>
        <p class="text-body-2 text-grey">
          All your notifications, requests, and alerts in one place
        </p>
      </div>

      <!-- Tabs -->
      <v-card variant="flat" class="mb-4">
        <v-tabs
          v-model="selectedTab"
          color="#12086F"
          align-tabs="start"
          density="compact"
        >
          <v-tab value="all">
            All
            <v-chip size="x-small" class="ml-2" variant="tonal">
              {{ allAlerts.length }}
            </v-chip>
          </v-tab>
          <v-tab value="pending">
            Pending
            <v-chip size="x-small" class="ml-2" variant="tonal" color="#f57c00">
              {{ pendingCount }}
            </v-chip>
          </v-tab>
          <v-tab value="shift_swaps">Shift Swaps</v-tab>
          <v-tab value="time_off">Time Off</v-tab>
          <v-tab value="system">System</v-tab>
        </v-tabs>
      </v-card>

      <!-- Alerts List -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="48" />
      </div>

      <div v-else-if="filteredAlerts.length === 0" class="text-center py-12">
        <v-icon size="80" color="#e0e0e0" class="mb-4">
          mdi-bell-check-outline
        </v-icon>
        <h3 class="text-h6 font-weight-regular text-grey mb-2">No alerts</h3>
        <p class="text-body-2 text-grey">You're all caught up!</p>
      </div>

      <div v-else class="alerts-list">
        <v-card
          v-for="alert in filteredAlerts"
          :key="alert.id"
          variant="outlined"
          rounded="lg"
          class="alert-card mb-3"
        >
          <div class="d-flex">
            <!-- Left Border -->
            <div class="alert-border" :style="{ backgroundColor: alert.color }" />
            
            <!-- Content -->
            <div class="flex-grow-1 pa-4">
              <div class="d-flex align-start justify-space-between mb-2">
                <div class="d-flex align-center ga-3">
                  <v-avatar :color="alert.color" size="40">
                    <v-icon color="white" size="24">{{ alert.icon }}</v-icon>
                  </v-avatar>
                  
                  <div>
                    <v-chip
                      :color="alert.color"
                      size="x-small"
                      variant="tonal"
                      class="mb-1"
                    >
                      {{ alert.category }}
                    </v-chip>
                    <h3 class="text-body-1 font-weight-bold navy-text">
                      {{ alert.title }}
                    </h3>
                  </div>
                </div>

                <div class="text-caption text-grey">
                  {{ formatAlertDate(alert.date) }}
                </div>
              </div>

              <p class="text-body-2 mb-1">{{ alert.message }}</p>
              
              <p v-if="alert.reason" class="text-caption text-grey mb-3">
                {{ alert.reason }}
              </p>

              <v-chip
                :color="getStatusColor(alert.status)"
                size="small"
                variant="tonal"
                class="text-capitalize"
              >
                {{ alert.status }}
              </v-chip>
            </div>
          </div>
        </v-card>
      </div>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.alerts-list {
  max-width: 1200px;
}

.alert-card {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05);
  transition: all 0.2s;
  overflow: hidden;
}

.alert-card:hover {
  box-shadow: 0 4px 12px rgba(18, 8, 111, 0.12);
  transform: translateY(-2px);
}

.alert-border {
  width: 4px;
  flex-shrink: 0;
}

.ga-3 {
  gap: 12px;
}
</style>