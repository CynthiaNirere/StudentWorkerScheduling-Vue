<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const loading = ref(true);
const alerts = ref([]);
const weeklySchedule = ref([]);
const schedulePublished = ref(false);

// Demo user credentials
const DEMO_USER = {
  userId: 'demo-employer',
  user_id: 'demo-employer',
  email: 'demo@shiftboard.com',
  fName: 'Demo',
  lName: 'Manager',
  role: 'employer',
  work_location: null, // Will be set from demo location
  token: 'demo-token'
};

onMounted(async () => {
  const isGuest = localStorage.getItem('isGuest');
  if (!isGuest) {
    router.push({ name: 'landing' });
    return;
  }
  
  // Set demo user in localStorage so services work
  localStorage.setItem('user', JSON.stringify(DEMO_USER));
  
  await loadDashboardData();
});

const loadDashboardData = async () => {
  loading.value = true;
  try {
    await Promise.all([loadAlerts(), loadWeeklySchedule()]);
  } catch (err) {
    console.error('Dashboard load error:', err);
  } finally {
    loading.value = false;
  }
};

const loadAlerts = async () => {
  try {
    // ✅ FIXED: Changed from getAllShiftSwapRequests to getAllSwapRequests
    const [swapRes, timeOffRes] = await Promise.all([
      EmployerService.getAllSwapRequests().catch(() => ({ data: [] })),
      EmployerService.getAllTimeOffRequests().catch(() => ({ data: [] })),
    ]);
    
    const swaps = Array.isArray(swapRes.data) ? swapRes.data : [];
    const timeOffs = Array.isArray(timeOffRes.data) ? timeOffRes.data : [];
    
    alerts.value = [
      ...swaps.filter(s => s.status === 'pending').slice(0, 2).map(s => ({
        id: `swap-${s.swap_id}`,
        type: 'Shift Cover Request',
        message: `Employee needs coverage`,
        time: timeAgo(s.created_at),
        actions: ['Approve', 'Deny'],
      })),
      ...timeOffs.filter(t => t.status === 'pending').slice(0, 1).map(t => ({
        id: `timeoff-${t.request_id}`,
        type: 'Time Off Request',
        message: `Employee requested time off`,
        time: timeAgo(t.created_at),
        actions: ['Approve', 'Deny'],
      })),
    ];
  } catch (err) {
    console.error('Error loading alerts:', err);
  }
};

const loadWeeklySchedule = async () => {
  try {
    const monday = getMonday(new Date());
    const startDate = monday.getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000;
    
    const res = await EmployerService.getShiftsByWeek(startDate, endDate);
    weeklySchedule.value = Array.isArray(res.data) ? res.data : [];
    schedulePublished.value = weeklySchedule.value.some(s => s.status === 'published');
  } catch (err) {
    console.error('Error loading schedule:', err);
  }
};

const weekDays = computed(() => {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const today = new Date();
  const monday = getMonday(today);
  
  return days.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateNum = date.getDate();
    const shifts = weeklySchedule.value.filter(s => {
      const shiftDate = new Date(Number(s.shift_time || s.shiftTime));
      return shiftDate.toDateString() === date.toDateString();
    });
    return { label, dateNum, shifts };
  });
});

// ✅ ADDED: Missing helper functions
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatShiftTime = (minutes) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const diff = Date.now() - Number(timestamp);
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
};

const getActionColor = (action) => {
  if (action === 'Approve') return '#2e7d32';
  if (action === 'Deny') return '#d32f2f';
  return '#12086F';
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
      <v-alert
        type="info"
        variant="tonal"
        prominent
        class="mb-6"
      >
        <div class="d-flex align-center justify-space-between">
          <div>
            <v-icon size="large" class="mr-3">mdi-eye-outline</v-icon>
            <strong>Guest Mode</strong> - You're viewing demo data. 
            <span class="text-caption">Actions are disabled in guest mode.</span>
          </div>
          <v-btn
            color="primary"
            variant="outlined"
            @click="exitGuestMode"
          >
            Exit Guest Mode
          </v-btn>
        </div>
      </v-alert>

      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text mb-2">Dashboard</h1>
        <p class="text-subtitle-1 text-medium-emphasis">Demo Campus Gym - Demo Workspace</p>
      </div>

      <!-- Quick Actions (Disabled) -->
      <v-row class="mb-6">
        <v-col cols="auto">
          <v-btn color="#12086F" variant="flat" size="large" disabled>
            Create Schedule
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn color="#4361EE" variant="outlined" size="large" disabled>
            Add Employee
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn color="#4361EE" variant="outlined" size="large" disabled>
            Create Shift
          </v-btn>
        </v-col>
      </v-row>

      <!-- Alerts & Notifications -->
      <v-card class="mb-6 navy-card" variant="outlined" rounded="lg">
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <span class="text-h6 font-weight-bold">Alerts & Notifications</span>
          <v-btn variant="text" size="small" color="#4361EE" disabled>View All</v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" />
          </div>
          
          <div v-else-if="alerts.length === 0" class="text-center py-8">
            <v-icon color="grey" size="48">mdi-check-circle-outline</v-icon>
            <p class="text-grey mt-2">No pending alerts</p>
          </div>
          
          <div v-else>
            <div v-for="(alert, idx) in alerts" :key="alert.id" class="pa-4"
              :class="{ 'bg-grey-lighten-5': idx % 2 === 0 }">
              <div class="d-flex justify-space-between align-start mb-2">
                <div class="flex-grow-1">
                  <v-chip size="small" color="#12086F" variant="tonal" class="mb-2">
                    {{ alert.type }}
                  </v-chip>
                  <p class="text-body-1 mb-1">{{ alert.message }}</p>
                  <p class="text-caption text-grey">{{ alert.time }}</p>
                </div>
                <v-btn icon="mdi-close" size="small" variant="text" disabled />
              </div>
              
              <div class="d-flex gap-2 mt-3">
                <v-btn v-for="action in alert.actions" :key="action"
                  :color="getActionColor(action)"
                  :variant="action === 'Approve' ? 'flat' : 'outlined'"
                  size="small"
                  disabled>
                  {{ action }}
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Schedule Preview -->
      <v-card class="navy-card" variant="outlined" rounded="lg">
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <span class="text-h6 font-weight-bold">This Week's Schedule Preview</span>
          <div class="d-flex align-center gap-3">
            <v-chip :color="schedulePublished ? '#2e7d32' : '#f57c00'"
              size="small" variant="tonal">
              {{ schedulePublished ? 'Schedule Published' : 'Schedule Not Published' }}
            </v-chip>
            <v-btn variant="text" size="small" color="#4361EE" disabled>
              View Full Schedule
            </v-btn>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" />
          </div>
          
          <div v-else class="schedule-grid">
            <div v-for="day in weekDays" :key="day.label" class="schedule-column">
              <div class="schedule-header pa-3 text-center">
                <div class="text-subtitle-2 font-weight-bold text-white">{{ day.label }}</div>
                <div class="text-h6 font-weight-bold text-white">{{ day.dateNum }}</div>
              </div>
              
              <div class="schedule-body pa-2">
                <div v-for="shift in day.shifts" :key="shift.shift_id" class="shift-item pa-2 mb-2">
                  <div class="text-caption font-weight-bold">
                    {{ formatShiftTime(shift.start_time || shift.startTime) }}
                  </div>
                  <div class="text-caption">
                    {{ shift.employee_name || shift.employeeName || 'Employee' }}
                  </div>
                </div>
                
                <div v-if="day.shifts.length === 0" class="text-center text-caption text-grey py-4">
                  No shifts
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
.navy-text {
  color: #12086F !important;
}

.navy-card {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05);
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e0e0e0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.schedule-column {
  background: white;
  min-height: 200px;
}

.schedule-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white;
}

.schedule-body {
  min-height: 150px;
}

.shift-item {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-left: 3px solid #4361EE;
  border-radius: 4px;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
</style>