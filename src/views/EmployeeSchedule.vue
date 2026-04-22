<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployeeService from "../services/employeeServices.js";
import EmployeeLayout from '../components/EmployeeLayout.vue';

const router = useRouter();
const user   = ref(null);

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const shifts        = ref([]);
const allShifts     = ref([]); // all team shifts for the week
const swapRequests  = ref([]); // to show who took a swap
const selectedWeek  = ref(new Date());
const loadingShifts = ref(false);
const viewMode      = ref('week');

// ── MY SHIFTS ONLY TOGGLE ─────────────────────────────────────────────────
const myShiftsOnly = ref(true);

watch(selectedWeek, () => loadShifts());

// ── WEEK DAYS ─────────────────────────────────────────────────────────────
const weekDays = computed(() => {
  const sunday = new Date(selectedWeek.value);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  sunday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    const ds = toLocalDateStr(day);

    // Determine which shift list to display
    const sourceShifts = myShiftsOnly.value ? shifts.value : allShifts.value;

    const dayShifts = sourceShifts
      .filter(s => {
        const st = new Date(Number(s.shiftTime || s.shift_time));
        return toLocalDateStr(st) === ds;
      })
      .sort((a, b) => (a.start_time || a.startTime || 0) - (b.start_time || b.startTime || 0));

    return {
      date: day, dateString: ds,
      dayName:    ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i],
      dayShort:   ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],
      dayOfMonth: day.getDate(),
      month:      day.toLocaleDateString('en-US', { month: 'short' }),
      isToday:    ds === toLocalDateStr(new Date()),
      shifts:     dayShifts,
    };
  });
});

const todayOnly = computed(() => {
  const today = toLocalDateStr(new Date());
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
    const userId = user.value?.user_id || user.value?.userId;
    // Load my shifts
    const myRes = await EmployeeService.getMyShifts(userId);
    shifts.value = Array.isArray(myRes.data)
      ? myRes.data.filter(s => (s.user_id || s.userId) === userId || s.status === 'open')
      : [];

    // Load all shifts for team view
    const allRes = await EmployeeService.getAllShifts();
    allShifts.value = Array.isArray(allRes.data) ? allRes.data : [];

    // Load swap requests to know who took a swap
    const swapRes = await EmployeeService.getMySwapRequests();
    swapRequests.value = Array.isArray(swapRes.data) ? swapRes.data : [];

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

// ── WHO TOOK MY SWAP ──────────────────────────────────────────────────────
// For a given shift, find if I requested a swap that was accepted/approved,
// and return the name of who took it.
const getSwapTakerName = (shift) => {
  const shiftId = shift.shift_id || shift.id;
  const userId  = user.value?.user_id || user.value?.userId;
  const swap = swapRequests.value.find(s => {
    const originalShiftId = s.original_shift_id || s.originalShiftId || s.shiftId || s.shift_id;
    const reqUserId = s.requesting_user_id || s.requestingUserId;
    return String(originalShiftId) === String(shiftId) &&
           String(reqUserId) === String(userId) &&
           (s.status === 'accepted' || s.status === 'approved');
  });
  if (!swap) return null;
  return swap.acceptingUserName || swap.accepting_user_name || null;
};

// ── IS THIS AN OPEN SHIFT (time-off approved) ─────────────────────────────
const isOpenShift = (shift) => {
  return shift.status === 'open' || shift.is_open === true || shift.isOpen === true;
};

// ── IS THIS MY SHIFT ─────────────────────────────────────────────────────
const isMyShift = (shift) => {
  const userId = user.value?.user_id || user.value?.userId;
  return String(shift.user_id || shift.userId) === String(userId);
};

const getShiftColor       = (shift) => {
  if (isOpenShift(shift)) return '#E8F5E9';
  return ['#E3F2FD','#E8F5E9','#FFF9C4','#FFE0B2','#F3E5F5','#FCE4EC'][(shift.job_role_id || shift.jobRoleId || 0) % 6];
};
const getShiftBorderColor = (shift) => {
  if (isOpenShift(shift)) return '#2e7d32';
  return ['#1976D2','#2e7d32','#f57c00','#ff6f00','#7b1fa2','#c2185b'][(shift.job_role_id || shift.jobRoleId || 0) % 6];
};
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
        <div class="d-flex ga-2 flex-wrap">
          <v-btn color="#7209B7" variant="tonal" prepend-icon="mdi-swap-horizontal"
            @click="router.push({ name: 'employeeSwaps' })">
            Request Swap
          </v-btn>
          <v-btn color="#12086F" variant="flat" prepend-icon="mdi-calendar-remove"
            @click="router.push({ name: 'employeeTimeRequests' })">
            Request Time Off
          </v-btn>
        </div>
      </div>

      <!-- Nav bar + view toggle -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <div class="pa-3 d-flex align-center justify-space-between flex-wrap gap-2">
          <v-btn icon="mdi-chevron-left" variant="text" color="#12086F" size="small" @click="previousWeek" />
          <span class="text-subtitle-1 font-weight-bold navy-text">{{ currentWeekLabel }}</span>
          <div class="d-flex align-center ga-2 flex-wrap">
            <!-- My Shifts Only toggle -->
            <v-btn-toggle
              v-model="myShiftsOnly"
              color="#12086F"
              variant="outlined"
              mandatory
              divided
              density="compact"
            >
              <v-btn :value="true" size="small">
                <v-icon size="14" class="mr-1">mdi-account</v-icon>My Shifts
              </v-btn>
              <v-btn :value="false" size="small">
                <v-icon size="14" class="mr-1">mdi-account-group</v-icon>Team
              </v-btn>
            </v-btn-toggle>

            <v-btn-toggle v-model="viewMode" color="#12086F" variant="outlined" mandatory divided density="compact">
              <v-btn value="day" size="small"><v-icon size="14" class="mr-1">mdi-calendar-today</v-icon>Day</v-btn>
              <v-btn value="week" size="small"><v-icon size="14" class="mr-1">mdi-calendar-week</v-icon>Week</v-btn>
            </v-btn-toggle>

            <v-btn icon="mdi-chevron-right" variant="text" color="#12086F" size="small" @click="nextWeek" />
          </div>
        </div>
      </v-card>

      <!-- "My Shifts" mode reminder -->
      <v-alert
        v-if="!myShiftsOnly"
        type="info"
        variant="tonal"
        density="compact"
        color="#4361EE"
        class="mb-4"
        icon="mdi-account-group"
      >
        <div class="text-caption">Showing <strong>all team shifts</strong>. Switch to "My Shifts" to see only yours.</div>
      </v-alert>

      <!-- Calendar grid -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
        <v-progress-linear v-if="loadingShifts" indeterminate color="#12086F" />

        <div v-if="!loadingShifts && displayDays.every(d => d.shifts.length === 0)" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-2" class="mb-3">mdi-calendar-blank-outline</v-icon>
          <div class="text-body-1 text-grey mb-1">
            {{ myShiftsOnly ? 'No shifts scheduled this week' : 'No team shifts this week' }}
          </div>
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
                :class="{ 'shift-card--mine': isMyShift(shift), 'shift-card--open': isOpenShift(shift) }"
                :style="{ backgroundColor: getShiftColor(shift), borderLeftColor: getShiftBorderColor(shift) }">

                <!-- Open shift badge (time-off approved) -->
                <div v-if="isOpenShift(shift)" class="open-shift-badge">
                  <v-icon size="10" color="white">mdi-lock-open</v-icon>
                  Open — available to claim
                </div>

                <!-- Start → End time -->
                <div class="shift-time-row">
                  <span class="shift-time-val">{{ formatTime(shift.start_time || shift.startTime) }}</span>
                  <span class="shift-time-arrow">→</span>
                  <span class="shift-time-val">{{ formatTime(shift.end_time || shift.endTime) }}</span>
                </div>

                <!-- In team view: show who this shift belongs to -->
                <div v-if="!myShiftsOnly" class="shift-owner text-caption">
                  <v-icon size="10" color="#6b7280">mdi-account</v-icon>
                  {{ shift.employee_name || shift.employeeName || 'Unassigned' }}
                </div>

                <div v-if="shift.notes" class="shift-notes text-caption">{{ shift.notes }}</div>

                <!-- Who took my swap -->
                <div v-if="getSwapTakerName(shift)" class="swap-taken-badge">
                  <v-icon size="10" color="white">mdi-swap-horizontal</v-icon>
                  Taken by {{ getSwapTakerName(shift) }}
                </div>

                <!-- Request swap button (only on my shifts, not open shifts) -->
                <v-btn
                  v-if="isMyShift(shift) && !isOpenShift(shift)"
                  size="x-small" variant="text" color="#7209B7"
                  class="mt-1 pa-0 swap-btn"
                  @click.stop="router.push({ name: 'employeeSwaps' })">
                  Request Swap
                </v-btn>

                <!-- Claim button on open shifts -->
                <v-btn
                  v-if="isOpenShift(shift)"
                  size="x-small" variant="flat" color="#2e7d32"
                  class="mt-1 claim-btn"
                  @click.stop="router.push({ name: 'employeeSwaps' })">
                  Claim Shift
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </v-card>

      <!-- Legend -->
      <div class="d-flex flex-wrap ga-3 align-center">
        <div class="legend-item legend-item--shift">
          <span class="legend-dot" style="background:#1976D2;" />
          <span class="legend-label">My Shift</span>
        </div>
        <div class="legend-item legend-item--open">
          <span class="legend-dot" style="background:#2e7d32;" />
          <span class="legend-label">Open (claimable)</span>
        </div>
      </div>

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
.shift-card--mine { box-shadow: 0 0 0 1px rgba(18,8,111,0.15); }
.shift-card--open { border-style: dashed; }

.shift-time-row { display: flex; align-items: center; gap: 3px; margin-bottom: 3px; }
.shift-time-val  { font-size: 11px; font-weight: 700; color: #12086F; }
.shift-time-arrow { font-size: 9px; color: #9ca3af; }
.shift-notes { color: #555; margin-bottom: 2px; }
.swap-btn { font-size: 10px; height: auto !important; }
.claim-btn { font-size: 10px; height: 20px !important; }
.shift-owner { color: #6b7280; margin-bottom: 2px; display: flex; align-items: center; gap: 2px; }

/* Who took your swap */
.swap-taken-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #7209B7;
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 3px;
  margin-top: 3px;
}

/* Open shift badge */
.open-shift-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #2e7d32;
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 3px;
  margin-bottom: 4px;
}

/* Legend */
.legend-item {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px 3px 6px; border-radius: 20px; border: 1px solid;
  font-size: 11px;
}
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-label { font-size: 11px; font-weight: 500; color: #374151; }
.legend-item--shift { border-color: #1976D2; background: #E3F2FD; }
.legend-item--open  { border-color: #2e7d32; background: #E8F5E9; }

/* Dark mode */
.v-theme--dark .calendar-day { background: #1e1e2e; border-color: #333; }
.v-theme--dark .today-cell { background: #1a1f3a; }
.v-theme--dark .shift-card { background: #2a2a3e; }
.v-theme--dark .shift-time-val { color: #a8b4ff; }
.v-theme--dark .navy-text { color: #a8b4ff !important; }
.v-theme--dark .legend-label { color: #E8EAF6; }
.v-theme--dark .legend-item--shift { border-color: #64B5F6; background: rgba(25, 118, 210, 0.25); }
.v-theme--dark .legend-item--open  { border-color: #66BB6A; background: rgba(46, 125, 50, 0.25); }
</style>