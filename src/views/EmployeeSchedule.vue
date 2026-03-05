<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployeeLayout from '../components/EmployeeLayout.vue';

const router = useRouter();
const user = ref(null);

const shifts = ref([]);
const selectedWeek = ref(new Date());
const loadingShifts = ref(false);

// ── TIME OFF DIALOG ─────────────────────────────────────────────────────────
const showTimeOffDialog = ref(false);
const timeOffStart = ref('');
const timeOffEnd = ref('');
const timeOffReason = ref('');
const timeOffRequests = ref([]);

const submitTimeOff = () => {
  if (!timeOffStart.value || !timeOffEnd.value) return;
  timeOffRequests.value.unshift({
    id: Date.now(),
    start: timeOffStart.value,
    end: timeOffEnd.value,
    reason: timeOffReason.value || 'No reason provided',
    status: 'pending'
  });
  showTimeOffDialog.value = false;
  timeOffStart.value = '';
  timeOffEnd.value = '';
  timeOffReason.value = '';
};

// ── SHIFT SWAP DIALOG ───────────────────────────────────────────────────────
const showSwapDialog = ref(false);
const swapShift = ref(null);
const swapNote = ref('');
const swapRequests = ref([]);

const openSwap = (shift, dayName) => {
  swapShift.value = { ...shift, dayName };
  swapNote.value = '';
  showSwapDialog.value = true;
};

const submitSwap = () => {
  if (!swapShift.value) return;
  swapRequests.value.unshift({
    id: Date.now(),
    shift: swapShift.value,
    note: swapNote.value,
    status: 'pending'
  });
  showSwapDialog.value = false;
  swapShift.value = null;
};

// ── WEEK NAVIGATION ─────────────────────────────────────────────────────────
watch(selectedWeek, () => { loadShifts(); });

const weekDays = computed(() => {
  const sunday = new Date(selectedWeek.value);
  sunday.setDate(sunday.getDate() - sunday.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    const dayDateString = day.toISOString().split('T')[0];

    const dayShifts = shifts.value.filter(shift => {
      const shiftTimestamp = Number(shift.shiftTime || shift.shift_time);
      const shiftDate = new Date(shiftTimestamp);
      const year = shiftDate.getFullYear();
      const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const date = String(shiftDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${date}` === dayDateString;
    }).sort((a, b) => (a.start_time || a.startTime) - (b.start_time || b.startTime));

    return {
      date: day,
      dateString: dayDateString,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
      dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      dayOfMonth: day.getDate(),
      month: day.toLocaleDateString('en-US', { month: 'short' }),
      isToday: dayDateString === new Date().toISOString().split('T')[0],
      shifts: dayShifts
    };
  });
});

const currentWeekLabel = computed(() => {
  const start = weekDays.value[0];
  const end = weekDays.value[6];
  if (start.month === end.month) {
    return `${start.month} ${start.dayOfMonth} - ${end.dayOfMonth}, ${start.date.getFullYear()}`;
  }
  return `${start.month} ${start.dayOfMonth} - ${end.month} ${end.dayOfMonth}, ${start.date.getFullYear()}`;
});

onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadShifts();
});

const loadShifts = async () => {
  loadingShifts.value = true;
  try {
    const res = await EmployerService.getAllShifts();
    const allShifts = Array.isArray(res.data) ? res.data : [];
    const currentUserId = user.value?.user_id || user.value?.userId;
    shifts.value = allShifts.filter(shift => {
      const shiftUserId = shift.user_id || shift.userId;
      return shiftUserId === currentUserId;
    });
  } catch (err) {
    console.error("Error loading shifts:", err);
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
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minute.toString().padStart(2, '0')}${ampm}`;
};

const getShiftColor = (shift) => {
  const roleId = shift.job_role_id || shift.jobRoleId || 0;
  return ['#E3F2FD', '#E8F5E9', '#FFF9C4', '#FFE0B2', '#F3E5F5', '#FCE4EC'][roleId % 6];
};

const getShiftBorderColor = (shift) => {
  const roleId = shift.job_role_id || shift.jobRoleId || 0;
  return ['#1976D2', '#2e7d32', '#f57c00', '#ff6f00', '#7b1fa2', '#c2185b'][roleId % 6];
};

const statusColor = (status) => ({ pending: 'warning', approved: 'success', denied: 'error' }[status] || 'grey');
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
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-calendar-remove" @click="showTimeOffDialog = true">
          Request Time Off
        </v-btn>
      </div>

      <!-- Week Navigation -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <div class="pa-3 d-flex align-center justify-space-between">
          <v-btn icon="mdi-chevron-left" variant="text" color="#12086F" size="small" @click="previousWeek" />
          <span class="text-subtitle-1 font-weight-bold navy-text">{{ currentWeekLabel }}</span>
          <v-btn icon="mdi-chevron-right" variant="text" color="#12086F" size="small" @click="nextWeek" />
        </div>
      </v-card>

      <!-- Calendar Grid -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-6">
        <v-progress-linear v-if="loadingShifts" indeterminate color="#12086F" />

        <div class="calendar-grid">
          <!-- Headers -->
          <div
            v-for="day in weekDays"
            :key="'header-' + day.dateString"
            class="calendar-header"
            :class="{ 'today-header': day.isToday }"
          >
            <div class="day-name">{{ day.dayName }}</div>
            <div class="day-date">
              <span class="date-number">{{ day.dayOfMonth }}</span>
              <span class="date-month">{{ day.month }}</span>
            </div>
          </div>

          <!-- Day Cells -->
          <div
            v-for="day in weekDays"
            :key="'day-' + day.dateString"
            class="calendar-day"
            :class="{ 'today-cell': day.isToday }"
          >
            <div class="shifts-container">
              <div
                v-for="shift in day.shifts"
                :key="shift.shift_id || shift.id"
                class="shift-card"
                :style="{ backgroundColor: getShiftColor(shift), borderLeftColor: getShiftBorderColor(shift) }"
              >
                <div class="shift-time">
                  {{ formatTime(shift.start_time || shift.startTime) }} - {{ formatTime(shift.end_time || shift.endTime) }}
                </div>
                <div class="shift-role" v-if="shift.role_name">{{ shift.role_name }}</div>
                <v-btn
                  size="x-small"
                  variant="text"
                  color="#7209B7"
                  class="mt-1 pa-0"
                  style="font-size:10px;height:auto;"
                  @click="openSwap(shift, day.dayName)"
                >
                  Request Swap
                </v-btn>
              </div>

              <div v-if="day.shifts.length === 0" class="no-shifts">
                <v-icon size="small" color="grey">mdi-calendar-blank</v-icon>
                <span class="text-caption text-grey">No shifts</span>
              </div>
            </div>
          </div>
        </div>
      </v-card>

      <!-- Pending Requests -->
      <v-card v-if="timeOffRequests.length || swapRequests.length" variant="outlined" rounded="lg" class="navy-card">
        <v-card-title class="text-h6 font-weight-bold pa-4">My Pending Requests</v-card-title>
        <v-divider />
        <v-list>
          <v-list-item
            v-for="req in timeOffRequests"
            :key="'to-' + req.id"
            prepend-icon="mdi-calendar-remove"
          >
            <v-list-item-title class="text-body-2 font-weight-medium">
              Time Off: {{ req.start }} – {{ req.end }}
            </v-list-item-title>
            <v-list-item-subtitle>{{ req.reason }}</v-list-item-subtitle>
            <template #append>
              <v-chip :color="statusColor(req.status)" size="x-small" variant="tonal">{{ req.status }}</v-chip>
            </template>
          </v-list-item>

          <v-list-item
            v-for="req in swapRequests"
            :key="'sw-' + req.id"
            prepend-icon="mdi-swap-horizontal"
          >
            <v-list-item-title class="text-body-2 font-weight-medium">
              Swap: {{ req.shift.dayName }} {{ formatTime(req.shift.start_time || req.shift.startTime) }}–{{ formatTime(req.shift.end_time || req.shift.endTime) }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="req.note">{{ req.note }}</v-list-item-subtitle>
            <template #append>
              <v-chip :color="statusColor(req.status)" size="x-small" variant="tonal">{{ req.status }}</v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card>

    </v-container>

    <!-- Time Off Dialog -->
    <v-dialog v-model="showTimeOffDialog" max-width="420" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pa-5 pb-3">Request Time Off</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 text-grey mb-4">Your request will be sent to your manager for approval.</p>
          <v-text-field
            v-model="timeOffStart"
            label="Start Date"
            type="date"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <v-text-field
            v-model="timeOffEnd"
            label="End Date"
            type="date"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <v-textarea
            v-model="timeOffReason"
            label="Reason (optional)"
            variant="outlined"
            density="comfortable"
            rows="2"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showTimeOffDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :disabled="!timeOffStart || !timeOffEnd" @click="submitTimeOff">
            Submit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Shift Swap Dialog -->
    <v-dialog v-model="showSwapDialog" max-width="400" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-h6 font-weight-bold pa-5 pb-3">Request Shift Swap</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" class="mb-4" density="compact">
            {{ swapShift?.dayName }} —
            {{ swapShift ? formatTime(swapShift.start_time || swapShift.startTime) : '' }} –
            {{ swapShift ? formatTime(swapShift.end_time || swapShift.endTime) : '' }}
          </v-alert>
          <p class="text-body-2 text-grey mb-3">Your manager will be notified to find a replacement.</p>
          <v-textarea
            v-model="swapNote"
            label="Note (optional)"
            variant="outlined"
            density="comfortable"
            rows="2"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showSwapDialog = false">Cancel</v-btn>
          <v-btn color="#7209B7" variant="flat" @click="submitSwap">Submit Swap Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); }

.calendar-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white;
  padding: 12px 8px;
  text-align: center;
  border-right: 1px solid rgba(255,255,255,0.1);
  border-bottom: 2px solid #12086F;
}
.calendar-header:last-child { border-right: none; }
.today-header { background: linear-gradient(135deg, #4361EE 0%, #5B73F0 100%); }

.day-name { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 4px; }
.day-date { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
.date-number { font-size: 20px; font-weight: bold; line-height: 1; }
.date-month { font-size: 11px; opacity: 0.8; }

.calendar-day {
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}
.calendar-day:nth-child(7n) { border-right: none; }
.today-cell { background: #f0f4ff; }

.shifts-container { padding: 8px; display: flex; flex-direction: column; gap: 6px; min-height: 120px; }

.shift-card {
  background: white;
  border-left: 3px solid #4361EE;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.shift-time { font-size: 12px; font-weight: bold; color: #12086F; margin-bottom: 3px; }
.shift-role { font-size: 11px; color: #666; }

.no-shifts { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 20px 8px; }
</style>
