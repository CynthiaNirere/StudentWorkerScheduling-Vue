<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const selectedTab = ref('all');

// ── HARDCODED DEMO ALERTS ─────────────────────────────────────────────────
const allAlerts = ref([
  {
    id: 'swap-1',
    type: 'swap',
    category: 'Shift Swap',
    title: 'Shift Cover Request',
    message: 'Sarah Johnson needs someone for Mon, Apr 21',
    icon: 'mdi-swap-horizontal',
    color: '#f57c00',
    timestamp: Date.now() - 1000 * 60 * 25,
    status: 'pending',
  },
  {
    id: 'timeoff-1',
    type: 'timeoff',
    category: 'Time Off',
    title: 'Time Off Request',
    message: 'Michael Chen requested time off Apr 28 - Apr 30',
    reason: 'Family event',
    icon: 'mdi-calendar-remove',
    color: '#4361EE',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    status: 'pending',
  },
  {
    id: 'timeoff-2',
    type: 'timeoff',
    category: 'Time Off',
    title: 'Time Off Request',
    message: 'Ashley Brown requested time off May 5 - May 6',
    reason: 'Doctor appointment',
    icon: 'mdi-calendar-remove',
    color: '#4361EE',
    timestamp: Date.now() - 1000 * 60 * 60 * 10,
    status: 'pending',
  },
  {
    id: 'swap-2',
    type: 'swap',
    category: 'Shift Swap',
    title: 'Shift Cover Request',
    message: 'Emily Rodriguez needs someone for Wed, Apr 23',
    icon: 'mdi-swap-horizontal',
    color: '#f57c00',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    status: 'accepted',
  },
  {
    id: 'notif-1',
    type: 'notification',
    category: 'System',
    title: 'Schedule Published',
    message: 'This week\'s schedule has been published to all employees.',
    icon: 'mdi-bell',
    color: '#9e9e9e',
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    status: 'read',
  },
]);

const filteredAlerts = computed(() => {
  if (selectedTab.value === 'all') return allAlerts.value;
  if (selectedTab.value === 'pending')
    return allAlerts.value.filter(a => a.status === 'pending' || a.status === 'accepted' || a.status === 'unread');
  return allAlerts.value.filter(a => a.type === selectedTab.value);
});

const pendingCount = computed(() =>
  allAlerts.value.filter(a => a.status === 'pending' || a.status === 'accepted').length
);

const formatTimestamp = (ts) => {
  if (!ts) return '';
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const getStatusColor = (status) => {
  const colors = { pending: '#f57c00', accepted: '#4361EE', approved: '#2e7d32', rejected: '#d32f2f', read: '#9e9e9e', unread: '#f57c00' };
  return colors[status] || '#9e9e9e';
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Actions like approve/reject are disabled.
      </v-alert>

      <!-- Header -->
      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Notifications & Alerts</h1>
        <p class="text-body-2 text-grey">All your notifications, requests, and alerts in one place</p>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="all">
            All
            <v-chip v-if="allAlerts.length > 0" size="x-small" color="#12086F" variant="tonal" class="ml-2">
              {{ allAlerts.length }}
            </v-chip>
          </v-tab>
          <v-tab value="pending">
            Pending
            <v-chip v-if="pendingCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-2">
              {{ pendingCount }}
            </v-chip>
          </v-tab>
          <v-tab value="swap">Shift Swaps</v-tab>
          <v-tab value="timeoff">Time Off</v-tab>
          <v-tab value="notification">System</v-tab>
        </v-tabs>
      </v-card>

      <!-- Alerts List -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-4">
          <div v-if="filteredAlerts.length === 0" class="text-center py-8">
            <v-icon size="64" class="mb-2 text-grey">mdi-bell-check-outline</v-icon>
            <div class="text-body-1 text-grey mb-2">No alerts</div>
            <div class="text-body-2 text-grey">You're all caught up!</div>
          </div>

          <div v-else>
            <div
              v-for="alert in filteredAlerts"
              :key="alert.id"
              class="alert-item pa-4 mb-3"
              :class="{ 'alert-unread': alert.status === 'pending' || alert.status === 'unread' }"
            >
              <div class="d-flex ga-3 align-start">
                <v-avatar :color="alert.color" size="40">
                  <v-icon color="white">{{ alert.icon }}</v-icon>
                </v-avatar>

                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-start mb-1">
                    <div>
                      <v-chip :color="alert.color" size="x-small" variant="tonal" class="mb-1">
                        {{ alert.category }}
                      </v-chip>
                      <div class="text-body-1 font-weight-bold navy-text">{{ alert.title }}</div>
                    </div>
                    <div class="text-caption text-grey">{{ formatTimestamp(alert.timestamp) }}</div>
                  </div>

                  <p class="text-body-2 mb-2">{{ alert.message }}</p>

                  <div v-if="alert.reason" class="text-caption text-grey mb-2">
                    <strong>Reason:</strong> {{ alert.reason }}
                  </div>

                  <div class="d-flex ga-2 align-center">
                    <v-chip :color="getStatusColor(alert.status)" size="x-small" variant="tonal">
                      {{ alert.status }}
                    </v-chip>
                    <v-chip v-if="alert.type === 'swap' || alert.type === 'timeoff'"
                      size="x-small" color="#9e9e9e" variant="tonal">
                      Actions disabled in guest mode
                    </v-chip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.alert-item { border: 1px solid #e0e0e0; border-radius: 8px; background: white; }
.alert-unread { border-left: 4px solid #f57c00; background: #fff8f3; }
</style>