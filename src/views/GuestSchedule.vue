<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const loading = ref(true);
const shifts = ref([]);
const currentWeek = ref({
  start: null,
  end: null
});

const weekDays = [
  { name: 'Sunday', day: 1 },
  { name: 'Monday', day: 2 },
  { name: 'Tuesday', day: 3 },
  { name: 'Wednesday', day: 4 },
  { name: 'Thursday', day: 5 },
  { name: 'Friday', day: 6 },
  { name: 'Saturday', day: 7 }
];

onMounted(async () => {
  const isGuest = localStorage.getItem('isGuest');
  if (!isGuest) {
    router.push({ name: 'landing' });
    return;
  }
  
  // Set demo user
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
  localStorage.setItem('user', JSON.stringify(DEMO_USER));
  
  setCurrentWeek();
  await loadShifts();
});

const setCurrentWeek = () => {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  sunday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  
  currentWeek.value = {
    start: sunday,
    end: saturday,
    startTimestamp: sunday.getTime(),
    endTimestamp: saturday.getTime()
  };
};

const loadShifts = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getShiftsByWeek(
      currentWeek.value.startTimestamp,
      currentWeek.value.endTimestamp
    );
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error loading shifts:', err);
  } finally {
    loading.value = false;
  }
};

const getShiftsForDay = (dayNumber) => {
  return shifts.value.filter(shift => {
    const shiftDate = new Date(Number(shift.shift_time));
    return shiftDate.getDay() === dayNumber - 1;
  });
};

const getDayDate = (dayNumber) => {
  const date = new Date(currentWeek.value.start);
  date.setDate(date.getDate() + (dayNumber - 1));
  return date.getDate();
};

const formatTime = (minutes) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatDateRange = () => {
  if (!currentWeek.value.start || !currentWeek.value.end) {
    return 'Loading...';
  }
  const start = currentWeek.value.start;
  const end = currentWeek.value.end;
  return `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()} - ${end.getMonth() + 1}/${end.getDate()}/${end.getFullYear()}`;
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
            <strong>Guest Mode</strong> - Viewing demo schedule data
          </div>
          <v-btn color="primary" variant="outlined" @click="exitGuestMode">
            Exit Guest Mode
          </v-btn>
        </div>
      </v-alert>

      <!-- Header -->
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Weekly Schedule</h1>
          <p class="text-subtitle-1 text-medium-emphasis">
            Manage shifts for the week of {{ formatDateRange() }}
          </p>
        </div>
        
        <div class="d-flex gap-3 align-center">
          <v-chip color="orange" variant="tonal" size="small">Draft</v-chip>
          <v-btn color="primary" variant="outlined" disabled>
            PUBLISH SCHEDULE
          </v-btn>
          <v-btn color="primary" variant="flat" disabled>
            ADD SHIFT
          </v-btn>
        </div>
      </div>

      <!-- Week Navigation -->
      <div class="d-flex justify-center align-center mb-6">
        <v-btn icon variant="text" size="small" disabled>
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <h3 class="mx-4">{{ formatDateRange() }}</h3>
        <v-btn icon variant="text" size="small" disabled>
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </div>

      <!-- Weekly Grid -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else class="schedule-grid">
        <div v-for="day in weekDays" :key="day.day" class="day-column">
          <div class="day-header pa-4 text-center">
            <div class="text-h6 font-weight-bold text-white">{{ day.name }}</div>
            <div class="text-h4 font-weight-bold text-white">{{ getDayDate(day.day) }}</div>
          </div>
          
          <div class="day-body pa-3">
            <div v-if="getShiftsForDay(day.day).length === 0" class="text-center py-8">
              <p class="text-body-2 text-grey">No shifts</p>
              <v-btn
                variant="outlined"
                size="small"
                color="primary"
                prepend-icon="mdi-plus"
                disabled
                class="mt-2"
              >
                Add Shift
              </v-btn>
            </div>
            
            <div v-else>
              <v-card
                v-for="shift in getShiftsForDay(day.day)"
                :key="shift.shift_id"
                class="shift-card mb-2"
                elevation="1"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex justify-space-between align-start">
                    <div>
                      <div class="text-subtitle-2 font-weight-bold">
                        {{ formatTime(shift.start_time) }} - {{ formatTime(shift.end_time) }}
                      </div>
                      <div class="text-caption text-grey">
                        {{ shift.employee_name || 'Unassigned' }}
                      </div>
                      <div class="text-caption text-grey">
                        {{ shift.job_role_title || 'Front Desk Attendant' }}
                      </div>
                    </div>
                    <v-chip size="x-small" color="success" variant="tonal">
                      Published
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
              
              <v-btn
                variant="outlined"
                size="small"
                color="primary"
                prepend-icon="mdi-plus"
                disabled
                block
                class="mt-2"
              >
                Add Shift
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.gap-3 {
  gap: 12px;
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

.day-column {
  background: white;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.day-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white;
  border-bottom: 2px solid #e0e0e0;
}

.day-body {
  flex: 1;
  overflow-y: auto;
}

.shift-card {
  border-left: 3px solid #4361EE;
  cursor: not-allowed;
  opacity: 0.9;
}

.shift-card:hover {
  opacity: 1;
}
</style>