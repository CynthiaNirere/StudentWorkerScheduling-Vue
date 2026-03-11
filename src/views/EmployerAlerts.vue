<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const notifications = ref([]);
const swapRequests = ref([]);
const timeOffRequests = ref([]);
const loading = ref(false);
const selectedTab = ref("all");

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const allAlerts = computed(() => {
  const alerts = [];
  
  // Add swap requests as alerts
  swapRequests.value.forEach(swap => {
    const name = swap.requestingUserName || 'Unknown';
    const shift = swap.shift;
    let shiftInfo = '';
    if (shift) {
      const d = new Date(Number(shift.shiftTime));
      shiftInfo = ` for ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    }
    
    alerts.push({
      id: `swap-${swap.swap_id || swap.id}`,
      type: 'swap',
      category: 'Shift Swap',
      title: 'Shift Cover Request',
      message: `${name} needs someone${shiftInfo}`,
      icon: 'mdi-swap-horizontal',
      color: '#f57c00',
      timestamp: swap.created_at || swap.createdAt,
      status: swap.status,
      data: swap
    });
  });
  
  // Add time off requests as alerts
  timeOffRequests.value.forEach(req => {
    const name = req.employeeName || 'Unknown';
    const start = new Date(Number(req.start_date || req.startDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(Number(req.end_date || req.endDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    alerts.push({
      id: `timeoff-${req.request_id || req.id}`,
      type: 'timeoff',
      category: 'Time Off',
      title: 'Time Off Request',
      message: `${name} requested time off ${start} - ${end}`,
      reason: req.reason,
      icon: 'mdi-calendar-remove',
      color: '#4361EE',
      timestamp: req.created_at || req.createdAt,
      status: req.status,
      data: req
    });
  });
  
  // Add system notifications
  notifications.value.forEach(notif => {
    alerts.push({
      id: `notif-${notif.notification_id}`,
      type: 'notification',
      category: 'System',
      title: notif.title,
      message: notif.description || notif.title,
      icon: 'mdi-bell',
      color: '#9e9e9e',
      timestamp: notif.created_at || notif.createdAt,
      status: notif.is_read ? 'read' : 'unread',
      data: notif
    });
  });
  
  // Sort by timestamp (newest first)
  return alerts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
});

const filteredAlerts = computed(() => {
  if (selectedTab.value === 'all') return allAlerts.value;
  if (selectedTab.value === 'pending') {
    return allAlerts.value.filter(a => 
      a.status === 'pending' || a.status === 'accepted' || a.status === 'unread'
    );
  }
  return allAlerts.value.filter(a => a.type === selectedTab.value);
});

const pendingCount = computed(() => 
  allAlerts.value.filter(a => 
    a.status === 'pending' || a.status === 'accepted' || a.status === 'unread'
  ).length
);

onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadAllAlerts();
});

const loadAllAlerts = async () => {
  loading.value = true;
  try {
    const [swapRes, timeOffRes, notifRes] = await Promise.all([
      EmployerService.getAllShiftSwapRequests(),
      EmployerService.getAllTimeOffRequests(),
      EmployerService.getAllNotifications()
    ]);
    
    const swaps = Array.isArray(swapRes.data) ? swapRes.data : [];
    const timeOffs = Array.isArray(timeOffRes.data) ? timeOffRes.data : [];
    const notifs = Array.isArray(notifRes.data) ? notifRes.data : [];
    
    swapRequests.value = swaps.filter(s => s.status === 'pending' || s.status === 'accepted');
    timeOffRequests.value = timeOffs.filter(t => t.status === 'pending');
    notifications.value = notifs;
    
  } catch (err) {
    console.error("Error loading alerts:", err);
    showSnackbar("Error loading alerts", "error");
  } finally {
    loading.value = false;
  }
};

const handleAlertClick = (alert) => {
  if (alert.type === 'swap') {
    router.push({ name: 'employerSwaps' });
  } else if (alert.type === 'timeoff') {
    router.push({ name: 'employerTimeOff' });
  } else if (alert.type === 'notification') {
    // Mark as read
    if (alert.status === 'unread') {
      markNotificationRead(alert.data.notification_id);
    }
  }
};

const markNotificationRead = async (id) => {
  try {
    await EmployerService.markNotificationRead(id);
    await loadAllAlerts();
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }
};

const dismissNotification = async (id) => {
  try {
    await EmployerService.deleteNotification(id);
    showSnackbar("Notification dismissed", "success");
    await loadAllAlerts();
  } catch (err) {
    console.error("Error dismissing notification:", err);
    showSnackbar("Error dismissing notification", "error");
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const getStatusColor = (status) => {
  const colors = {
    pending: '#f57c00',
    accepted: '#4361EE',
    approved: '#2e7d32',
    rejected: '#d32f2f',
    denied: '#d32f2f',
    unread: '#f57c00',
    read: '#9e9e9e'
  };
  return colors[status] || '#9e9e9e';
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Notifications & Alerts</h1>
        <p class="text-body-2 text-grey">
          All your notifications, requests, and alerts in one place
        </p>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="all">
            All
            <v-chip
              v-if="allAlerts.length > 0"
              size="x-small"
              color="#12086F"
              variant="tonal"
              class="ml-2"
            >
              {{ allAlerts.length }}
            </v-chip>
          </v-tab>
          <v-tab value="pending">
            Pending
            <v-chip
              v-if="pendingCount > 0"
              size="x-small"
              color="#f57c00"
              variant="tonal"
              class="ml-2"
            >
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
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" size="32" />
          </div>

          <div v-else-if="filteredAlerts.length === 0" class="text-center py-8">
            <v-icon size="64" class="mb-2 text-grey">mdi-bell-check-outline</v-icon>
            <div class="text-body-1 text-grey mb-2">No {{ selectedTab === 'all' ? '' : selectedTab }} alerts</div>
            <div class="text-body-2 text-grey">You're all caught up!</div>
          </div>

          <div v-else>
            <div
              v-for="alert in filteredAlerts"
              :key="alert.id"
              class="alert-item pa-4 mb-3"
              :class="{ 'alert-unread': alert.status === 'pending' || alert.status === 'unread' }"
              @click="handleAlertClick(alert)"
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
                  
                  <div class="d-flex ga-2">
                    <v-chip :color="getStatusColor(alert.status)" size="x-small" variant="tonal">
                      {{ alert.status }}
                    </v-chip>
                  </div>
                </div>
                
                <v-btn
                  v-if="alert.type === 'notification'"
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  @click.stop="dismissNotification(alert.data.notification_id)"
                />
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.navy-card {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05);
}

.alert-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.alert-item:hover {
  border-color: #12086F;
  box-shadow: 0 2px 8px rgba(18, 8, 111, 0.1);
  transform: translateY(-1px);
}

.alert-unread {
  border-left: 4px solid #f57c00;
  background: #fff8f3;
}
</style>