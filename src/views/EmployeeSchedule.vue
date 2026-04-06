<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployeeService from "../services/employeeServices.js";
import EmployeeLayout from '../components/EmployeeLayout.vue';

const router = useRouter();
const user   = ref(null);

const shifts        = ref([]);
const selectedWeek  = ref(new Date());
const loadingShifts = ref(false);
const viewMode      = ref('week');

watch(selectedWeek, () => loadShifts());

// ── WEEK DAYS ─────────────────────────────────────────────────────────────
const weekDays = computed(() => {
  const sunday = new Date(selectedWeek.value);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  sunday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    const ds = day.toISOString().split('T')[0];

    const dayShifts = shifts.value
      .filter(s => {
        const st = new Date(Number(s.shiftTime || s.shift_time));
        return st.toISOString().split('T')[0] === ds;
      })
      .sort((a, b) => (a.start_time || a.startTime || 0) - (b.start_time || b.startTime || 0));

    return {
      date: day, dateString: ds,
      dayName:    ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i],
      dayShort:   ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],
      dayOfMonth: day.getDate(),
      month:      day.toLocaleDateString('en-US', { month: 'short' }),
      isToday:    ds === new Date().toISOString().split('T')[0],
      shifts:     dayShifts,
    };
  });
});

const todayOnly = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  return weekDays.value.filter(d => d.dateString === today);
});

const displayDays = computed(() => viewMode.value === 'day' ? todayOnly.value : weekDays.value);

const currentWeekLabel = computed(() => {
  const s = weekDays.value[0];
  const e = weekDays.value[6];
  if (s.month === e.month) return `${s.month} ${s.dayOfMonth} – ${e.dayOfMonth}, ${s.date.getFullYear()}`;
  return `${s.month} ${s.dayOfMonth} – ${e.month} ${e.dayOfMonth}, ${s.date.getFullYear()}`;
});

// ── DATA ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadShifts();
});

const loadShifts = async () => {
  loadingShifts.value = true;
  try {
    // ✅ Pass userId as query param — backend does the filtering
    const userId = user.value?.user_id || user.value?.userId;
    const res = await EmployeeService.getMyShifts(userId);
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error loading shifts:', err);
  } finally {
    loadingShifts.value = false;
  }
};

const previousWeek = () => {
  const d = new Date(selectedWeek.value);
  d.setDate(d.getDate() - 7);
  selectedWeek.value = d;
};

const nextWeek = () => {
  const d = new Date(selectedWeek.value);
  d.setDate(d.getDate() + 7);
  selectedWeek.value = d;
};

const formatTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  const h    = Math.floor(minutes / 60);
  const m    = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
};

const getShiftColor       = (shift) => ['#E3F2FD','#E8F5E9','#FFF9C4','#FFE0B2','#F3E5F5','#FCE4EC'][(shift.job_role_id || shift.jobRoleId || 0) % 6];
const getShiftBorderColor = (shift) => ['#1976D2','#2e7d32','#f57c00','#ff6f00','#7b1fa2','#c2185b'][(shift.job_role_id || shift.jobRoleId || 0) % 6];
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">My Schedule</h1>
          <p class="text-body-2 text-grey">{{ currentWeekLabel }}</p>
        </div>
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-calendar-clock"
          @click="router.push({ name: 'employeeTimeRequests' })">
          Request Time Off / Swap
        </v-btn>
      </div>

      <!-- Nav bar + view toggle -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <div class="pa-3 d-flex align-center justify-space-between">
          <v-btn icon="mdi-chevron-left" variant="text" color="#12086F" size="small" @click="previousWeek" />
          <span class="text-subtitle-1 font-weight-bold navy-text">{{ currentWeekLabel }}</span>
          <div class="d-flex align-center ga-2">
            <v-btn-toggle v-model="viewMode" color="#12086F" variant="outlined" mandatory divided density="compact">
              <v-btn value="day" size="small"><v-icon size="14" class="mr-1">mdi-calendar-today</v-icon>Day</v-btn>
              <v-btn value="week" size="small"><v-icon size="14" class="mr-1">mdi-calendar-week</v-icon>Week</v-btn>
            </v-btn-toggle>
            <v-btn icon="mdi-chevron-right" variant="text" color="#12086F" size="small" @click="nextWeek" />
          </div>
        </div>
      </v-card>

      <!-- Calendar grid -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-6">
        <v-progress-linear v-if="loadingShifts" indeterminate color="#12086F" />

        <div v-if="shifts.length === 0 && !loadingShifts" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-2" class="mb-3">mdi-calendar-blank-outline</v-icon>
          <div class="text-body-1 text-grey mb-1">No shifts scheduled this week</div>
          <div class="text-caption text-grey">Your manager will publish your schedule when ready</div>
        </div>

        <div v-else
          class="calendar-grid"
          :style="{ gridTemplateColumns: `repeat(${displayDays.length}, 1fr)` }"
        >
          <!-- Headers -->
          <div v-for="day in displayDays" :key="'header-' + day.dateString"
            class="calendar-header" :class="{ 'today-header': day.isToday }">
            <div class="day-name">{{ viewMode === 'day' ? day.dayName : day.dayShort }}</div>
            <div class="day-date">
              <span class="date-number">{{ day.dayOfMonth }}</span>
              <span class="date-month">{{ day.month }}</span>
            </div>
          </div>

          <!-- Day cells -->
          <div v-for="day in displayDays" :key="'day-' + day.dateString"
            class="calendar-day" :class="{ 'today-cell': day.isToday }">
            <div class="shifts-container">
              <div v-if="day.shifts.length === 0" class="no-shifts">
                <v-icon size="small" color="grey">mdi-calendar-blank</v-icon>
                <span class="text-caption text-grey">No shifts</span>
              </div>

              <div v-for="shift in day.shifts" :key="shift.shift_id || shift.id"
                class="shift-card"
                :style="{ backgroundColor: getShiftColor(shift), borderLeftColor: getShiftBorderColor(shift) }">
                <!-- Start → End time -->
                <div class="shift-time-row">
                  <span class="shift-time-val">{{ formatTime(shift.start_time || shift.startTime) }}</span>
                  <span class="shift-time-arrow">→</span>
                  <span class="shift-time-val">{{ formatTime(shift.end_time || shift.endTime) }}</span>
                </div>
                <div v-if="shift.notes" class="shift-notes text-caption">{{ shift.notes }}</div>
                <v-btn size="x-small" variant="text" color="#7209B7" class="mt-1 pa-0 swap-btn"
                  @click.stop="router.push({ name: 'employeeSwaps' })">
                  Request Swap
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </v-card>

      <v-alert type="info" variant="tonal" color="#4361EE" density="compact">
        <v-icon start>mdi-information-outline</v-icon>
        To request time off or swap a shift, use the button above or go to <strong>Time Requests</strong> in the sidebar.
      </v-alert>

    </v-container>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.calendar-grid { display: grid; }

.calendar-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white; padding: 12px 8px; text-align: center;
  border-right: 1px solid rgba(255,255,255,0.1);
  border-bottom: 2px solid #12086F;
}
.calendar-header:last-child { border-right: none; }
.today-header { background: linear-gradient(135deg, #4361EE 0%, #5B73F0 100%); }
.day-name   { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 4px; }
.day-date   { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
.date-number { font-size: 20px; font-weight: bold; line-height: 1; }
.date-month  { font-size: 11px; opacity: 0.8; }

.calendar-day {
  border-right: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0;
  background: #fafafa; min-height: 180px;
}
.calendar-day:last-child { border-right: none; }
.today-cell { background: #f0f4ff; }
.shifts-container { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.no-shifts { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 20px 8px; }

.shift-card {
  background: white; border-left: 3px solid #4361EE; border-radius: 6px;
  padding: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.15s;
}
.shift-card:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(18,8,111,0.1); }

.shift-time-row { display: flex; align-items: center; gap: 3px; margin-bottom: 3px; }
.shift-time-val  { font-size: 11px; font-weight: 700; color: #12086F; }
.shift-time-arrow { font-size: 9px; color: #9ca3af; }
.shift-notes { color: #555; margin-bottom: 2px; }
.swap-btn { font-size: 10px; height: auto !important; }
</style>