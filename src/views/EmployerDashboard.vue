<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';
import EmployerLayout from '../components/EmployerLayout.vue';

const router  = useRouter();
const user    = ref(null);
const loading = ref(true);

const weeklySchedule   = ref([]);
const schedulePublished = ref(false);
const pendingSwaps     = ref([]);
const pendingTimeOff   = ref([]);
const employees        = ref([]);
const clockedInCount   = ref(0);

// ── WEEK DAYS ─────────────────────────────────────────────────────────────
const weekDays = computed(() => {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const full  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today  = new Date();
  const sunday = getSunday(today);

  return days.map((short, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    const shifts = weeklySchedule.value.filter(s => {
      const sd = new Date(Number(s.shift_time || s.shiftTime));
      return sd.toISOString().split('T')[0] === dateString;
    }).sort((a, b) => (a.start_time || a.startTime || 0) - (b.start_time || b.startTime || 0));

    return {
      short, full: full[i], dateNum: date.getDate(),
      monthShort: date.toLocaleDateString('en-US', { month: 'short' }),
      shifts,
      isToday: date.toDateString() === today.toDateString(),
    };
  });
});

// ── STAT CARDS ────────────────────────────────────────────────────────────
const statCards = computed(() => [
  {
    label:    'Employees',
    value:    employees.value.length,
    icon:     'mdi-account-group',
    color:    '#12086F',
    bg:       '#eef2ff',
    route:    'employerEmployees',
  },
  {
    label:    'Shifts This Week',
    value:    weeklySchedule.value.length,
    icon:     'mdi-calendar-check',
    color:    '#4361EE',
    bg:       '#e8eeff',
    route:    'employerSchedule',
  },
  {
    label:    'Pending Time Off',
    value:    pendingTimeOff.value.length,
    icon:     'mdi-calendar-remove',
    color:    pendingTimeOff.value.length > 0 ? '#f57c00' : '#2e7d32',
    bg:       pendingTimeOff.value.length > 0 ? '#fff3e0' : '#e8f5e9',
    route:    'employerTimeOff',
  },
  {
    label:    'Swap Requests',
    value:    pendingSwaps.value.length,
    icon:     'mdi-swap-horizontal',
    color:    pendingSwaps.value.length > 0 ? '#9C27B0' : '#2e7d32',
    bg:       pendingSwaps.value.length > 0 ? '#f3e5f5' : '#e8f5e9',
    route:    'employerSwaps',
  },
]);

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadAll();
});

const loadAll = async () => {
  loading.value = true;
  try {
    await Promise.all([loadSchedule(), loadRequests(), loadEmployees(), loadClockedIn()]);
  } finally {
    loading.value = false;
  }
};

const loadSchedule = async () => {
  try {
    const res = await EmployerService.getAllShifts();
    const allShifts = Array.isArray(res.data) ? res.data : [];
    // Only this week's shifts
    const sunday   = getSunday(new Date()).getTime();
    const saturday = sunday + 7 * 24 * 60 * 60 * 1000;
    weeklySchedule.value   = allShifts.filter(s => {
      const t = Number(s.shift_time || s.shiftTime);
      return t >= sunday && t < saturday;
    });
    schedulePublished.value = weeklySchedule.value.some(s => s.status === 'published');
  } catch (err) { console.error('Schedule error:', err); }
};

const loadRequests = async () => {
  try {
    const [swapRes, toRes] = await Promise.all([
      EmployerService.getAllShiftSwapRequests(),
      EmployerService.getAllTimeOffRequests(),
    ]);
    pendingSwaps.value   = (Array.isArray(swapRes.data) ? swapRes.data : []).filter(s => s.status === 'pending' || s.status === 'accepted');
    pendingTimeOff.value = (Array.isArray(toRes.data)   ? toRes.data   : []).filter(t => t.status === 'pending');
  } catch (err) { console.error('Requests error:', err); }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    employees.value = (Array.isArray(res.data) ? res.data : []).filter(u => u.role === 'employee');
  } catch (err) { console.error('Employees error:', err); }
};

const loadClockedIn = async () => {
  try {
    const res = await EmployerService.getAllClockRecords();
    const records = Array.isArray(res.data) ? res.data : [];
    clockedInCount.value = records.filter(r => r.status === 'clocked_in').length;
  } catch { clockedInCount.value = 0; }
};

// ── HELPERS ───────────────────────────────────────────────────────────────
const getSunday = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  const h    = Math.floor(minutes / 60);
  const m    = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
};
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Dashboard</h1>
          <p class="text-body-2 text-grey">
            Welcome back, {{ user?.fName || user?.first_name }}!
            <v-chip v-if="clockedInCount > 0" size="x-small" color="#2e7d32" variant="tonal" class="ml-2">
              <v-icon start size="14">mdi-circle</v-icon>
              {{ clockedInCount }} clocked in now
            </v-chip>
          </p>
        </div>
        <v-chip :color="schedulePublished ? '#2e7d32' : '#f57c00'" variant="tonal" size="small">
          <v-icon start size="18">{{ schedulePublished ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
          Schedule {{ schedulePublished ? 'Published' : 'Draft' }}
        </v-chip>
      </div>

      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="48" />
      </div>

      <template v-else>

        <!-- ── Stat Cards ────────────────────────────────────────────────── -->
        <v-row class="mb-6">
          <v-col v-for="card in statCards" :key="card.label" cols="6" md="3">
            <v-card variant="outlined" rounded="lg" class="stat-card navy-card"
              style="cursor:pointer;" @click="router.push({ name: card.route })">
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="stat-icon-wrap" :style="{ background: card.bg }">
                    <v-icon :color="card.color" size="28">{{ card.icon }}</v-icon>
                  </div>
                  <span class="text-h4 font-weight-black" :style="{ color: card.color }">{{ card.value }}</span>
                </div>
                <div class="text-body-2 text-grey font-weight-medium">{{ card.label }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- ── Quick Actions ─────────────────────────────────────────────── -->
        <v-row class="mb-6">
          <v-col cols="12" sm="4">
            <v-btn block color="#12086F" variant="flat" size="large"
              @click="router.push({ name: 'employerSchedule' })">
              <v-icon start>mdi-calendar-edit</v-icon>Manage Schedule
            </v-btn>
          </v-col>
          <v-col cols="12" sm="4">
            <v-btn block color="#4361EE" variant="outlined" size="large"
              @click="router.push({ name: 'employerEmployees' })">
              <v-icon start>mdi-account-plus</v-icon>Manage Employees
            </v-btn>
          </v-col>
          <v-col cols="12" sm="4">
            <v-btn block color="#9C27B0" variant="outlined" size="large"
              @click="router.push({ name: 'employerTimeCards' })">
              <v-icon start>mdi-credit-card-clock-outline</v-icon>Review Time Cards
            </v-btn>
          </v-col>
        </v-row>

        <!-- ── This Week's Schedule ──────────────────────────────────────── -->
        <v-card variant="outlined" rounded="lg" class="navy-card">
          <v-card-title class="d-flex align-center justify-space-between pa-4">
            <span class="text-body-1 font-weight-bold navy-text">
              <v-icon start size="22">mdi-calendar-week</v-icon>This Week's Schedule
            </span>
            <v-btn size="small" color="#12086F" variant="tonal"
              @click="router.push({ name: 'employerSchedule' })">
              Open Full Schedule
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <div class="week-grid">
              <div v-for="day in weekDays" :key="day.short"
                class="week-col" :class="{ 'week-col--today': day.isToday }">

                <!-- Day header -->
                <div class="week-header">
                  <div class="text-overline font-weight-bold text-white" style="font-size:13px;">{{ day.short }}</div>
                  <div class="text-h6 font-weight-black text-white">{{ day.dateNum }}</div>
                  <div class="text-caption text-white" style="opacity:0.7; font-size:12px;">{{ day.monthShort }}</div>
                </div>

                <!-- Shifts in this day -->
                <div class="week-body">
                  <div v-if="day.shifts.length === 0" class="empty-day">
                    <v-icon size="26" color="grey-lighten-2">mdi-calendar-blank-outline</v-icon>
                    <span class="text-caption text-grey" style="font-size:13px;">No shifts</span>
                  </div>
                  <div v-for="shift in day.shifts" :key="shift.shift_id || shift.id" class="mini-shift">
                    <div class="mini-shift-time">{{ formatTime(shift.start_time || shift.startTime) }}</div>
                    <div class="mini-shift-name text-truncate">
                      {{ shift.employee_name || shift.employeeName || 'Unassigned' }}
                    </div>
                    <v-chip v-if="shift.status === 'draft'" size="x-small" color="#f57c00" variant="tonal"
                      style="font-size:11px; height:20px;">Draft</v-chip>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

      </template>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }

/* Stat cards */
.stat-card { transition: all 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(18,8,111,0.12) !important; }
.stat-icon-wrap { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }

/* Week grid */
.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; background: #f5f5f5; padding: 8px; border-radius: 12px; }
.week-col { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: box-shadow 0.2s; }
.week-col:hover { box-shadow: 0 3px 8px rgba(18,8,111,0.12); }
.week-col--today { outline: 2px solid #4361EE; }

.week-header {
  background: linear-gradient(135deg, #12086F, #2B354F);
  padding: 14px 8px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.week-col--today .week-header { background: linear-gradient(135deg, #4361EE, #5B73F0); }

.week-body { padding: 8px; min-height: 140px; max-height: 280px; overflow-y: auto; }

.empty-day { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 16px 4px; }

.mini-shift {
  background: #f0f4ff;
  border-left: 3px solid #4361EE;
  border-radius: 4px;
  padding: 4px 6px;
  margin-bottom: 4px;
}
.mini-shift-time { font-size: 13px; font-weight: 700; color: #12086F; }
.mini-shift-name { font-size: 13px; color: #444; max-width: 100%; }
</style>