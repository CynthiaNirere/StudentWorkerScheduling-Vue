<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const loading = ref(true);
const weeklySchedule = ref([]);

// Demo user credentials
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
  await loadWeeklySchedule();
});

const loadWeeklySchedule = async () => {
  loading.value = true;
  try {
    const monday = getMonday(new Date());
    const startDate = monday.getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000;
    
    const res = await EmployerService.getShiftsByWeek(startDate, endDate);
    weeklySchedule.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error loading schedule:', err);
  } finally {
    loading.value = false;
  }
};

const scheduleStatus = computed(() => {
  const hasPublished = weeklySchedule.value.some(s => s.status === 'published');
  return hasPublished ? 'Published' : 'Draft';
});

const weekDays = computed(() => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = new Date();
  const sunday = getSunday(today);
  
  return days.map((label, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const dateNum = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const isToday = date.toDateString() === today.toDateString();
    const shifts = weeklySchedule.value.filter(s => {
      const shiftDate = new Date(Number(s.shift_time || s.shiftTime));
      return shiftDate.toDateString() === date.toDateString();
    });
    return { label, dateNum, month, isToday, shifts };
  });
});

const getSunday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

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

const exitGuestMode = () => {
  localStorage.removeItem('isGuest');
  localStorage.removeItem('user');
  router.push({ name: 'landing' });
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-h4 font-weight-bold navy-text mb-2">Dashboard</h1>
        <p class="text-body-1 text-grey">Welcome back! Here's what's happening this week.</p>
      </div>

      <!-- Quick Actions (All Disabled) -->
      <div class="d-flex ga-3 mb-8">
        <v-btn
          color="#12086F"
          variant="flat"
          size="large"
          prepend-icon="mdi-calendar-plus"
          disabled
        >
          Create Schedule
        </v-btn>
        <v-btn
          color="#4361EE"
          variant="outlined"
          size="large"
          prepend-icon="mdi-account-plus"
          disabled
        >
          Add Employee
        </v-btn>
        <v-btn
          color="#4361EE"
          variant="outlined"
          size="large"
          prepend-icon="mdi-clock-plus-outline"
          disabled
        >
          Create Shift
        </v-btn>
      </div>

      <!-- This Week's Schedule -->
      <v-card variant="outlined" rounded="lg" class="schedule-card">
        <v-card-title class="pa-5 d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon color="#12086F" size="28" class="mr-3">mdi-calendar</v-icon>
            <span class="text-h6 font-weight-bold">This Week's Schedule</span>
          </div>
          <div class="d-flex align-center ga-3">
            <v-chip
              :color="scheduleStatus === 'Published' ? '#2e7d32' : '#f57c00'"
              variant="tonal"
              size="small"
            >
              {{ scheduleStatus }}
            </v-chip>
            <v-btn
              color="#4361EE"
              variant="text"
              size="small"
              append-icon="mdi-arrow-right"
              disabled
            >
              View Full Schedule
            </v-btn>
          </div>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-5">
          <div v-if="loading" class="text-center py-12">
            <v-progress-circular indeterminate color="#12086F" size="48" />
          </div>

          <div v-else class="week-grid">
            <div
              v-for="day in weekDays"
              :key="day.label"
              class="day-column"
              :class="{ 'day-today': day.isToday }"
            >
              <!-- Day Header -->
              <div class="day-header">
                <div class="text-caption font-weight-bold text-white mb-1">
                  {{ day.label }}
                </div>
                <div class="text-h5 font-weight-bold text-white">
                  {{ day.dateNum }}
                </div>
                <div class="text-caption text-white" style="opacity: 0.9;">
                  {{ day.month }}
                </div>
                <div v-if="day.isToday" class="today-badge">
                  ⭐ Today
                </div>
              </div>

              <!-- Day Body -->
              <div class="day-body">
                <div v-if="day.shifts.length === 0" class="no-shifts">
                  <v-icon color="#e0e0e0" size="40" class="mb-2">
                    mdi-calendar-blank-outline
                  </v-icon>
                  <div class="text-caption text-grey">No shifts</div>
                </div>

                <div v-else>
                  <div
                    v-for="shift in day.shifts"
                    :key="shift.shift_id"
                    class="shift-card mb-2"
                  >
                    <div class="text-caption font-weight-bold mb-1">
                      {{ formatShiftTime(shift.start_time || shift.startTime) }}
                    </div>
                    <div class="text-caption text-grey">
                      {{ shift.employee_name || shift.employeeName || 'Unassigned' }}
                    </div>
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
.navy-text {
  color: #12086F !important;
}

.schedule-card {
  border-color: #e0e0e0;
  box-shadow: 0 2px 8px rgba(18, 8, 111, 0.08);
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
}

.day-column {
  border-radius: 12px;
  overflow: hidden;
  background: white;
  border: 1px solid #e0e0e0;
  min-height: 240px;
  transition: all 0.2s;
}

.day-column:hover {
  box-shadow: 0 4px 12px rgba(18, 8, 111, 0.12);
  transform: translateY(-2px);
}

.day-today {
  border: 2px solid #FFC107;
  box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.1);
}

.day-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  padding: 16px;
  text-align: center;
  position: relative;
}

.day-today .day-header {
  background: linear-gradient(135deg, #FFC107 0%, #FFA000 100%);
}

.today-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.day-body {
  padding: 12px;
  min-height: 140px;
}

.no-shifts {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 8px;
}

.shift-card {
  background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
  border-left: 3px solid #4361EE;
  padding: 10px;
  border-radius: 6px;
  transition: all 0.2s;
}

.shift-card:hover {
  background: linear-gradient(135deg, #BBDEFB 0%, #90CAF9 100%);
  transform: translateX(2px);
}

.ga-3 {
  gap: 12px;
}
</style>