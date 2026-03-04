<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);
const loading = ref(true);

const alerts = ref([]);
const weeklySchedule = ref([]);
const schedulePublished = ref(false);

const weekDays = computed(() => {
  const days = [
    { short: 'SUN', full: 'Sunday' },
    { short: 'MON', full: 'Monday' },
    { short: 'TUE', full: 'Tuesday' },
    { short: 'WED', full: 'Wednesday' },
    { short: 'THU', full: 'Thursday' },
    { short: 'FRI', full: 'Friday' },
    { short: 'SAT', full: 'Saturday' }
  ];
  
  const today = new Date();
  const sunday = getSunday(today);
  
  return days.map((day, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const dateNum = date.getDate();
    const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
    
    const shifts = weeklySchedule.value.filter(s => {
      const shiftDate = new Date(Number(s.shift_time || s.shiftTime));
      return shiftDate.toDateString() === date.toDateString();
    });
    
    // Sort shifts by start time
    const sortedShifts = shifts.sort((a, b) => {
      const aStart = a.start_time || a.startTime;
      const bStart = b.start_time || b.startTime;
      return aStart - bStart;
    });
    
    const isToday = date.toDateString() === today.toDateString();
    
    return { 
      short: day.short,
      full: day.full,
      dateNum, 
      monthShort,
      shifts: sortedShifts,
      isToday 
    };
  });
});

onMounted(async () => {
  user.value = Utils.getStore('user');
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
    const userId = user.value?.userId || user.value?.user_id;
    if (!userId) return;
    
    const [swapRes, timeOffRes] = await Promise.all([
      EmployerService.getAllShiftSwapRequests().catch(() => ({ data: [] })),
      EmployerService.getAllTimeOffRequests().catch(() => ({ data: [] })),
    ]);
    
    const swaps = Array.isArray(swapRes.data) ? swapRes.data : [];
    const timeOffs = Array.isArray(timeOffRes.data) ? timeOffRes.data : [];
    
    alerts.value = [
      ...swaps.filter(s => s.status === 'pending').slice(0, 2).map(s => ({
        id: `swap-${s.swap_id}`,
        type: 'Shift Cover Request',
        message: `Employee needs someone for ${formatShiftDate(s.shift_time)}`,
        time: timeAgo(s.created_at),
        actions: ['Approve', 'Deny'],
      })),
      ...timeOffs.filter(t => t.status === 'pending').slice(0, 1).map(t => ({
        id: `timeoff-${t.request_id}`,
        type: 'Time Off Request',
        message: `Employee requested time off for ${formatDate(t.start_date)} - ${formatDate(t.end_date)}`,
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
    const sunday = getSunday(new Date());
    const startDate = sunday.getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000;
    
    const res = await EmployerService.getShiftsByWeek(startDate, endDate);
    weeklySchedule.value = Array.isArray(res.data) ? res.data : [];
    schedulePublished.value = weeklySchedule.value.some(s => s.status === 'published');
  } catch (err) {
    console.error('Error loading schedule:', err);
  }
};

const handleAction = async (alertId, action) => {
  console.log('Action:', action, 'for alert:', alertId);
  alerts.value = alerts.value.filter(a => a.id !== alertId);
};

const createSchedule = () => router.push({ name: 'employerSchedule' });
const addEmployee = () => router.push({ name: 'employerEmployees' });
const createShift = () => router.push({ name: 'employerSchedule', query: { action: 'create' } });
const viewFullSchedule = () => router.push({ name: 'employerSchedule' });

const getSunday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatShiftTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
};

const formatShiftDate = (timestamp) => {
  if (!timestamp) return '';
  return new Date(Number(timestamp)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  return new Date(Number(timestamp)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  });
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
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text mb-2">Dashboard</h1>
        <p class="text-body-2 text-grey">Welcome back! Here's what's happening this week.</p>
      </div>

      <!-- Quick Actions -->
      <v-row class="mb-6">
        <v-col cols="12" sm="auto">
          <v-btn color="#12086F" variant="flat" size="large" @click="createSchedule" block>
            <v-icon start>mdi-calendar-plus</v-icon>
            Create Schedule
          </v-btn>
        </v-col>
        <v-col cols="12" sm="auto">
          <v-btn color="#4361EE" variant="outlined" size="large" @click="addEmployee" block>
            <v-icon start>mdi-account-plus</v-icon>
            Add Employee
          </v-btn>
        </v-col>
        <v-col cols="12" sm="auto">
          <v-btn color="#4361EE" variant="outlined" size="large" @click="createShift" block>
            <v-icon start>mdi-clock-plus-outline</v-icon>
            Create Shift
          </v-btn>
        </v-col>
      </v-row>

      <!-- Alerts & Notifications -->
      <v-card class="mb-6 navy-card" variant="outlined" rounded="lg">
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <div class="d-flex align-center">
            <v-icon color="#12086F" class="mr-2">mdi-bell-outline</v-icon>
            <span class="text-h6 font-weight-bold">Alerts & Notifications</span>
          </div>
          <v-btn variant="text" size="small" color="#4361EE">View All</v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" />
          </div>
          
          <div v-else-if="alerts.length === 0" class="text-center py-8">
            <v-icon color="#2e7d32" size="56">mdi-check-circle-outline</v-icon>
            <p class="text-body-1 text-grey mt-3 mb-0">All caught up!</p>
            <p class="text-caption text-grey">No pending alerts at the moment</p>
          </div>
          
          <div v-else>
            <div v-for="(alert, idx) in alerts" :key="alert.id" class="pa-4 alert-item"
              :class="{ 'bg-grey-lighten-5': idx % 2 === 0 }">
              <div class="d-flex justify-space-between align-start mb-2">
                <div class="flex-grow-1">
                  <v-chip size="small" color="#12086F" variant="tonal" class="mb-2">
                    {{ alert.type }}
                  </v-chip>
                  <p class="text-body-1 mb-1">{{ alert.message }}</p>
                  <p class="text-caption text-grey">
                    <v-icon size="x-small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ alert.time }}
                  </p>
                </div>
                <v-btn icon="mdi-close" size="small" variant="text" color="grey"
                  @click="alerts.splice(idx, 1)" />
              </div>
              
              <div class="d-flex gap-2 mt-3">
                <v-btn v-for="action in alert.actions" :key="action"
                  :color="getActionColor(action)"
                  :variant="action === 'Approve' ? 'flat' : 'outlined'"
                  size="small" @click="handleAction(alert.id, action)">
                  <v-icon start size="small">
                    {{ action === 'Approve' ? 'mdi-check' : 'mdi-close' }}
                  </v-icon>
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
          <div class="d-flex align-center">
            <v-icon color="#12086F" class="mr-2">mdi-calendar-week</v-icon>
            <span class="text-h6 font-weight-bold">This Week's Schedule</span>
          </div>
          <div class="d-flex align-center gap-3">
            <v-chip :color="schedulePublished ? '#2e7d32' : '#f57c00'"
              size="small" variant="tonal">
              <v-icon start size="small">
                {{ schedulePublished ? 'mdi-check-circle' : 'mdi-alert-circle' }}
              </v-icon>
              {{ schedulePublished ? 'Published' : 'Draft' }}
            </v-chip>
            <v-btn variant="text" size="small" color="#4361EE" @click="viewFullSchedule">
              View Full Schedule
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" />
          </div>
          
          <div v-else class="schedule-grid">
            <div v-for="day in weekDays" :key="day.short" class="schedule-column"
              :class="{ 'today-column': day.isToday }">
              <!-- Day Header with Clear Labels -->
              <div class="schedule-header pa-3 text-center">
                <div class="text-overline font-weight-bold text-white mb-1">{{ day.short }}</div>
                <div class="text-h5 font-weight-bold text-white mb-0">{{ day.dateNum }}</div>
                <div class="text-caption text-white-70">{{ day.monthShort }}</div>
              </div>
              
              <div class="schedule-body pa-2">
                <!-- Today badge -->
                <v-chip v-if="day.isToday" color="#FFD700" size="x-small" class="mb-2 mx-auto d-block" style="width: fit-content;">
                  <v-icon start size="x-small">mdi-star</v-icon>
                  Today
                </v-chip>
                
                <!-- Shifts sorted by time -->
                <div v-for="shift in day.shifts" :key="shift.shift_id" class="shift-item pa-2 mb-2">
                  <div class="text-caption font-weight-bold navy-text">
                    {{ formatShiftTime(shift.start_time || shift.startTime) }}
                  </div>
                  <div class="text-caption">
                    {{ shift.employee_name || shift.employeeName || 'Unassigned' }}
                  </div>
                </div>
                
                <div v-if="day.shifts.length === 0" class="text-center py-6">
                  <v-icon size="32" class="text-grey-lighten-1 mb-1">mdi-calendar-blank-outline</v-icon>
                  <div class="text-caption text-grey">No shifts</div>
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
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 8px;
}

.schedule-column {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.schedule-column:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.today-column {
  border: 2px solid #FFD700;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.schedule-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  min-height: 90px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.text-white-70 {
  color: rgba(255, 255, 255, 0.7);
}

.schedule-body {
  min-height: 200px;
  max-height: 300px;
  overflow-y: auto;
}

.shift-item {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-left: 3px solid #4361EE;
  border-radius: 6px;
  transition: all 0.15s;
}

.shift-item:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 4px rgba(67, 97, 238, 0.2);
}

.alert-item {
  transition: background-color 0.2s;
}

.alert-item:hover {
  background-color: #f5f5f5 !important;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }

/* Responsive adjustments */
@media (max-width: 960px) {
  .schedule-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
  
  .schedule-header {
    min-height: 80px;
    padding: 8px !important;
  }
  
  .schedule-body {
    max-height: 250px;
  }
}

@media (max-width: 600px) {
  .schedule-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>