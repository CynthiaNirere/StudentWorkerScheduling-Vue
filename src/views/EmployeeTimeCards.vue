<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const user         = ref(null);
const loading      = ref(false);
const clockRecords = ref([]);
const myShifts     = ref([]);
const activeTab    = ref('pending');

// ── SUBMIT TIMECARD ───────────────────────────────────────────────────────
const submittingTimecard = ref(false);
const showSubmitDialog   = ref(false);
const timecardSubmitted  = ref(false); // track if current period already submitted

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

// Pay period anchor
const ANCHOR = new Date('2025-01-06T00:00:00');

function getPayPeriodStart(date) {
  const ms   = 14 * 24 * 60 * 60 * 1000;
  const diff = Math.floor((date - ANCHOR) / ms);
  const s    = new Date(ANCHOR.getTime() + diff * ms);
  s.setHours(0, 0, 0, 0);
  return s;
}

function periodEnd(start) {
  const d = new Date(start);
  d.setDate(d.getDate() + 13);
  d.setHours(23, 59, 59, 999);
  return d;
}

function periodLabel(start) {
  const o = { month: 'short', day: 'numeric' };
  const e = periodEnd(start);
  return `${start.toLocaleDateString('en-US', o)} – ${e.toLocaleDateString('en-US', { ...o, year: 'numeric' })}`;
}

// ── RECORDS ───────────────────────────────────────────────────────────────
const recordsWithDetails = computed(() =>
  clockRecords.value.map(r => {
    const clockIn  = r.clockInTime  || r.clock_in_time;
    const clockOut = r.clockOutTime || r.clock_out_time;
    const inDate   = clockIn  ? new Date(Number(clockIn))  : null;
    const outDate  = clockOut ? new Date(Number(clockOut)) : null;
    let totalHours = null;
    if (inDate && outDate) {
      totalHours = ((outDate - inDate) / (1000 * 60 * 60)).toFixed(2);
    } else if (r.totalHoursWorked || r.total_hours_worked) {
      totalHours = parseFloat(r.totalHoursWorked || r.total_hours_worked).toFixed(2);
    }
    const rejectionComment = r.rejectionReason || r.rejection_reason || r.rejectReason || null;
    return { ...r, inDate, outDate, totalHours, status: r.status || 'pending', rejectionComment };
  })
);

const currentPeriodStart = computed(() => getPayPeriodStart(new Date()));

const pendingRecords = computed(() => {
  const start = currentPeriodStart.value;
  const end   = periodEnd(start);
  return recordsWithDetails.value.filter(r => r.inDate && r.inDate >= start && r.inDate <= end);
});

const pendingCount = computed(() =>
  recordsWithDetails.value.filter(r =>
    r.status === 'pending' || r.status === 'clocked_out' || r.status === 'rejected'
  ).length
);

// Total hours for the current period
const currentPeriodHours = computed(() =>
  pendingRecords.value.reduce((s, r) => s + (parseFloat(r.totalHours) || 0), 0).toFixed(2)
);

// Is it end-of-week? (Friday or later in the pay period second week)
const isEndOfWeek = computed(() => {
  const today = new Date();
  return today.getDay() === 5 || today.getDay() === 6 || today.getDay() === 0; // Fri, Sat, Sun
});

// Has the current period already been submitted?
const currentPeriodSubmitted = computed(() => {
  if (!pendingRecords.value.length) return false;
  return pendingRecords.value.every(r => r.status === 'approved' || r.status === 'submitted');
});

function buildWeekDays(periodStart, offset) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + offset + i);
    const s = new Date(d); s.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    days.push({
      date: d,
      records: recordsWithDetails.value.filter(r => r.inDate && r.inDate >= s && r.inDate <= e)
    });
  }
  return days;
}

const pendingWeek1 = computed(() => buildWeekDays(currentPeriodStart.value, 0));
const pendingWeek2 = computed(() => buildWeekDays(currentPeriodStart.value, 7));

// Submitted tab: past periods grouped
const submittedPeriods = computed(() => {
  const current = currentPeriodStart.value.getTime();
  const map = new Map();
  recordsWithDetails.value.forEach(r => {
    if (!r.inDate) return;
    const ps = getPayPeriodStart(r.inDate);
    if (ps.getTime() === current) return;
    const key = ps.getTime();
    if (!map.has(key)) map.set(key, { start: ps, records: [] });
    map.get(key).records.push(r);
  });
  return [...map.values()]
    .sort((a, b) => b.start - a.start)
    .map(p => {
      const totalHours    = p.records.reduce((s, r) => s + (parseFloat(r.totalHours) || 0), 0).toFixed(2);
      const approvedHours = p.records.filter(r => r.status === 'approved').reduce((s, r) => s + (parseFloat(r.totalHours) || 0), 0).toFixed(2);
      return { ...p, totalHours, approvedHours };
    });
});

const expandedPeriods  = ref({});
const togglePeriod     = (key) => { expandedPeriods.value[key] = !expandedPeriods.value[key]; };
const pendingWeeksOpen = ref({ w1: true, w2: false });

// ── LIFECYCLE ──────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    const userId = user.value?.user_id || user.value?.userId;
    const [clockRes, shiftRes] = await Promise.all([
      EmployeeService.getClockRecordsByUser(userId),
      EmployeeService.getMyShifts(),
    ]);
    clockRecords.value = Array.isArray(clockRes.data) ? clockRes.data : [];
    const all = Array.isArray(shiftRes.data) ? shiftRes.data : [];
    myShifts.value = all.filter(s => (s.user_id || s.userId) === userId);
  } catch {
    showSnackbar('Error loading time cards', 'error');
  } finally {
    loading.value = false;
  }
};

// ── SUBMIT TIMECARD ────────────────────────────────────────────────────────
const submitTimecard = async () => {
  submittingTimecard.value = true;
  try {
    // Mark all pending records in the current period as submitted
    const toSubmit = pendingRecords.value.filter(r =>
      r.status === 'pending' || r.status === 'clocked_out'
    );
    if (toSubmit.length === 0) {
      showSnackbar('No pending entries to submit', 'warning');
      showSubmitDialog.value = false;
      return;
    }

    // Use the submitTimecard service call if available, otherwise update each record
    try {
      const userId = user.value?.user_id || user.value?.userId;
      await EmployeeService.submitTimecard({
        userId,
        periodStart: currentPeriodStart.value.getTime(),
        periodEnd:   periodEnd(currentPeriodStart.value).getTime(),
      });
    } catch {
      // Fallback: mark each record individually
      for (const record of toSubmit) {
        const id = record.id || record.clock_id;
        if (id) {
          await EmployeeService.updateClockRecord(id, { status: 'pending' }).catch(() => {});
        }
      }
    }

    showSnackbar(`Timecard submitted! ${toSubmit.length} entries sent for manager review.`, 'success');
    showSubmitDialog.value = false;
    timecardSubmitted.value = true;
    await loadData();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error submitting timecard', 'error');
  } finally {
    submittingTimecard.value = false;
  }
};

// ── EDIT ──────────────────────────────────────────────────────────────────
const showEditDialog = ref(false);
const editForm       = ref({ id: null, clockInTime: '', clockOutTime: '', notes: '' });
const saving         = ref(false);

const openEdit = (record) => {
  editForm.value = {
    id:           record.id || record.clock_id,
    clockInTime:  record.inDate  ? toInputDateTime(record.inDate)  : '',
    clockOutTime: record.outDate ? toInputDateTime(record.outDate) : '',
    notes:        record.notes || '',
  };
  showEditDialog.value = true;
};

const saveEdit = async () => {
  saving.value = true;
  try {
    const inTs  = editForm.value.clockInTime  ? new Date(editForm.value.clockInTime).getTime()  : null;
    const outTs = editForm.value.clockOutTime ? new Date(editForm.value.clockOutTime).getTime() : null;
    await EmployeeService.updateClockRecord(editForm.value.id, {
      clockInTime: inTs, clockOutTime: outTs, notes: editForm.value.notes
    });
    showSnackbar('Time entry updated', 'success');
    showEditDialog.value = false;
    await loadData();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error updating', 'error');
  } finally { saving.value = false; }
};

// ── LOG HOURS ──────────────────────────────────────────────────────────────
const showLogDialog   = ref(false);
const logSelectedWeek = ref(null);
const logDays         = ref([]);
const logging         = ref(false);

const weekOptions = computed(() => {
  const opts = [];
  const now  = new Date();
  const base = new Date(now);
  const dow  = base.getDay();
  base.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));
  base.setHours(0, 0, 0, 0);
  for (let w = 0; w < 10; w++) {
    const start = new Date(base);
    start.setDate(base.getDate() - w * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const o = { month: 'short', day: 'numeric' };
    opts.push({
      title: `${start.toLocaleDateString('en-US', o)} – ${end.toLocaleDateString('en-US', { ...o, year: 'numeric' })}`,
      value: start.getTime(),
    });
  }
  return opts;
});

const onWeekSelected = (ts) => {
  if (!ts) return;
  const start = new Date(ts);
  logDays.value = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
    const dayEnd   = new Date(d); dayEnd.setHours(23,59,59,999);
    const shift = myShifts.value.find(s => {
      const st = new Date(Number(s.shiftTime || s.shift_time));
      return st >= dayStart && st <= dayEnd;
    });
    return { date: d, shiftId: shift ? (shift.shift_id || shift.id) : null, clockIn: '', clockOut: '' };
  });
};

const openLogDialog = () => {
  const now  = new Date();
  const dow  = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  start.setHours(0, 0, 0, 0);
  logSelectedWeek.value = start.getTime();
  onWeekSelected(start.getTime());
  showLogDialog.value = true;
};

const saveLog = async () => {
  const filled = logDays.value.filter(d => d.clockIn && d.clockOut);
  if (!filled.length) {
    showSnackbar('Enter at least one day with clock in and out times', 'error'); return;
  }
  logging.value = true;
  let saved = 0;
  for (const day of filled) {
    try {
      const inTs  = new Date(day.clockIn).getTime();
      const outTs = new Date(day.clockOut).getTime();
      if (day.shiftId) {
        const res   = await EmployeeService.clockIn({ shiftId: day.shiftId });
        const newId = res.data?.id || res.data?.clock_id || res.data?.clockId;
        if (newId) await EmployeeService.updateClockRecord(newId, { clockInTime: inTs, clockOutTime: outTs });
      }
      saved++;
    } catch { /* skip failed days */ }
  }
  if (saved > 0) {
    showSnackbar(`${saved} day${saved > 1 ? 's' : ''} submitted for review!`, 'success');
    showLogDialog.value = false;
    await loadData();
  } else {
    showSnackbar('Could not submit — make sure shifts exist for selected days', 'error');
  }
  logging.value = false;
};

// ── HELPERS ────────────────────────────────────────────────────────────────
const toInputDateTime = (d) => {
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const formatTime  = (d) => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
const dayShort    = (d) => d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const isToday     = (d) => { const t = new Date(); return d.getDate()===t.getDate()&&d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear(); };
const weekHours   = (days) => days.reduce((s,d)=>s+d.records.reduce((ss,r)=>ss+(parseFloat(r.totalHours)||0),0),0).toFixed(2);

const showSnackbar = (msg, color='success') => { snackMsg.value=msg; snackColor.value=color; snackbar.value=true; };

const DayRow = {
  name: 'DayRow',
  props: { day: Object, isToday: Boolean, dayShort: String, formatTime: Function, readonly: { type: Boolean, default: false } },
  emits: ['edit'],
  template: `
    <div>
      <template v-if="day.records.length > 0">
        <div v-for="(r, ri) in day.records" :key="r.id || r.clock_id" class="day-row px-5 pt-3" :class="{ 'today-row': isToday, 'rejected-row': r.status === 'rejected' }">
          <div class="d-flex align-center pb-3 ga-4">
            <div style="flex:0 0 150px">
              <template v-if="ri === 0">
                <div class="d-flex align-center ga-2">
                  <div class="day-badge" :class="{ 'day-badge--today': isToday }">{{ dayShort }}</div>
                  <div>
                    <div class="text-body-2" :class="isToday ? 'navy-text font-weight-medium' : ''">{{ day.date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}</div>
                    <div v-if="isToday" class="text-caption navy-text" style="font-weight:600">Today</div>
                  </div>
                </div>
              </template>
            </div>
            <div style="flex:0 0 100px" class="text-body-2">{{ formatTime(r.inDate) }}</div>
            <div style="flex:0 0 110px" class="text-body-2" :class="!r.outDate ? 'text-grey' : ''">{{ r.outDate ? formatTime(r.outDate) : 'Not clocked out' }}</div>
            <div style="flex:1" class="text-body-2 font-weight-medium navy-text">{{ r.totalHours ? r.totalHours + ' hrs' : '—' }}</div>
            <div v-if="!readonly && (r.status === 'pending' || r.status === 'rejected' || r.status === 'clocked_out')">
              <v-btn size="x-small" variant="tonal" color="#12086F" @click="$emit('edit', r)">Edit</v-btn>
            </div>
          </div>
          <div v-if="r.status === 'rejected' && r.rejectionComment" class="rejection-note mb-3 d-flex align-start ga-2">
            <v-icon size="13" color="#d32f2f" style="margin-top:2px">mdi-message-alert-outline</v-icon>
            <span class="text-caption" style="color:#b71c1c"><strong>Manager:</strong> {{ r.rejectionComment }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="day-row day-row--empty d-flex align-center px-5 py-3" :class="{ 'today-row': isToday }">
          <div style="flex:0 0 150px">
            <div class="d-flex align-center ga-2">
              <div class="day-badge" :class="{ 'day-badge--today': isToday }">{{ dayShort }}</div>
              <div class="text-body-2 text-grey">{{ day.date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}</div>
            </div>
          </div>
          <div class="text-caption text-grey" style="flex:1">No shifts</div>
        </div>
      </template>
    </div>
  `,
};
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h5 font-weight-bold navy-text">My Time Card</h1>
          <p class="text-body-2 text-grey mt-1">Track your hours and submit your timecard at the end of the week</p>
        </div>
        <div class="d-flex ga-2 flex-wrap">
          <v-btn color="#12086F" variant="tonal" size="small" @click="openLogDialog">
            <v-icon start size="16">mdi-plus</v-icon>Log Hours
          </v-btn>
          <!-- Submit Timecard button -->
          <v-btn
            color="#2e7d32"
            variant="flat"
            size="small"
            :disabled="pendingRecords.length === 0 || currentPeriodSubmitted"
            @click="showSubmitDialog = true"
          >
            <v-icon start size="16">mdi-send-check</v-icon>
            {{ currentPeriodSubmitted ? 'Submitted' : 'Submit Timecard' }}
          </v-btn>
        </div>
      </div>

      <!-- End of week reminder -->
      <v-alert
        v-if="isEndOfWeek && pendingRecords.length > 0 && !currentPeriodSubmitted"
        type="warning"
        variant="tonal"
        density="compact"
        color="#f57c00"
        class="mb-4"
        icon="mdi-calendar-clock"
      >
        <div class="d-flex align-center justify-space-between flex-wrap gap-2">
          <div class="text-caption">
            It's end of week — you have <strong>{{ currentPeriodHours }} hours</strong> ready to submit for this pay period.
          </div>
          <v-btn size="x-small" color="#f57c00" variant="flat" @click="showSubmitDialog = true">Submit Now</v-btn>
        </div>
      </v-alert>

      <!-- Already submitted notice -->
      <v-alert
        v-if="currentPeriodSubmitted"
        type="success"
        variant="tonal"
        density="compact"
        color="#2e7d32"
        class="mb-4"
        icon="mdi-check-circle"
      >
        <div class="text-caption">Timecard submitted for this period. Awaiting manager review.</div>
      </v-alert>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-5">
        <v-tabs v-model="activeTab" color="#12086F">
          <v-tab value="pending">
            Current Period
            <v-chip v-if="pendingCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-2">{{ pendingCount }}</v-chip>
          </v-tab>
          <v-tab value="submitted">Past Periods</v-tab>
        </v-tabs>
      </v-card>

      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="36" />
      </div>

      <template v-else>

        <!-- CURRENT PERIOD TAB -->
        <template v-if="activeTab === 'pending'">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-body-2 font-weight-bold navy-text">{{ periodLabel(currentPeriodStart) }}</div>
            <div class="d-flex align-center ga-2">
              <span class="text-caption text-grey">Total: <strong class="navy-text">{{ currentPeriodHours }} hrs</strong></span>
            </div>
          </div>

          <!-- Week 1 -->
          <v-card variant="outlined" rounded="lg" class="navy-card overflow-hidden mb-3">
            <div class="week-toggle d-flex align-center px-5 py-4 cursor-pointer" @click="pendingWeeksOpen.w1 = !pendingWeeksOpen.w1">
              <v-icon size="18" class="mr-3" color="#12086F" style="transition:transform .2s" :style="pendingWeeksOpen.w1 ? 'transform:rotate(90deg)' : ''">mdi-chevron-right</v-icon>
              <span class="text-body-2 font-weight-bold navy-text mr-2">Week 1</span>
              <span class="text-caption text-grey">
                {{ pendingWeek1[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }} –
                {{ pendingWeek1[6].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}
              </span>
              <v-spacer />
              <span class="text-body-2 font-weight-bold navy-text">{{ weekHours(pendingWeek1) }} hrs</span>
            </div>
            <template v-if="pendingWeeksOpen.w1">
              <v-divider />
              <template v-for="(day, idx) in pendingWeek1" :key="'p1-'+idx">
                <DayRow :day="day" :is-today="isToday(day.date)" :day-short="dayShort(day.date)" :format-time="formatTime" @edit="openEdit" />
                <v-divider v-if="idx < 6" style="opacity:.35" />
              </template>
            </template>
          </v-card>

          <!-- Week 2 -->
          <v-card variant="outlined" rounded="lg" class="navy-card overflow-hidden mb-4">
            <div class="week-toggle d-flex align-center px-5 py-4 cursor-pointer" @click="pendingWeeksOpen.w2 = !pendingWeeksOpen.w2">
              <v-icon size="18" class="mr-3" color="#12086F" style="transition:transform .2s" :style="pendingWeeksOpen.w2 ? 'transform:rotate(90deg)' : ''">mdi-chevron-right</v-icon>
              <span class="text-body-2 font-weight-bold navy-text mr-2">Week 2</span>
              <span class="text-caption text-grey">
                {{ pendingWeek2[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }} –
                {{ pendingWeek2[6].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}
              </span>
              <v-spacer />
              <span class="text-body-2 font-weight-bold navy-text">{{ weekHours(pendingWeek2) }} hrs</span>
            </div>
            <template v-if="pendingWeeksOpen.w2">
              <v-divider />
              <template v-for="(day, idx) in pendingWeek2" :key="'p2-'+idx">
                <DayRow :day="day" :is-today="isToday(day.date)" :day-short="dayShort(day.date)" :format-time="formatTime" @edit="openEdit" />
                <v-divider v-if="idx < 6" style="opacity:.35" />
              </template>
            </template>
          </v-card>

          <div v-if="pendingRecords.length === 0" class="text-center py-10">
            <v-icon size="52" color="grey-lighten-2" class="mb-3">mdi-calendar-check-outline</v-icon>
            <div class="text-body-2 text-grey">No entries for this pay period yet</div>
            <div class="text-caption text-grey mt-1">Use "Log Hours" to add your time, or clock in on the kiosk</div>
          </div>
        </template>

        <!-- PAST PERIODS TAB -->
        <template v-if="activeTab === 'submitted'">
          <div v-if="submittedPeriods.length === 0" class="text-center py-10">
            <v-icon size="52" color="grey-lighten-2" class="mb-3">mdi-history</v-icon>
            <div class="text-body-2 text-grey">No past pay periods yet</div>
          </div>

          <div v-for="period in submittedPeriods" :key="period.start.getTime()" class="mb-3">
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <div class="period-row d-flex align-center px-5 py-4 cursor-pointer" @click="togglePeriod(period.start.getTime())">
                <v-icon size="18" class="mr-3" color="#12086F" style="transition:transform .2s" :style="expandedPeriods[period.start.getTime()] ? 'transform:rotate(90deg)' : ''">mdi-chevron-right</v-icon>
                <div class="flex-1">
                  <div class="text-body-2 font-weight-bold navy-text">{{ periodLabel(period.start) }}</div>
                  <div class="text-caption text-grey">{{ period.records.length }} entr{{ period.records.length === 1 ? 'y' : 'ies' }}</div>
                </div>
                <div class="text-right">
                  <div class="text-body-1 font-weight-bold navy-text">{{ period.totalHours }} hrs</div>
                  <div class="text-caption" style="color:#2e7d32">{{ period.approvedHours }} approved</div>
                </div>
              </div>

              <template v-if="expandedPeriods[period.start.getTime()]">
                <v-divider />
                <div class="px-5 pt-4 pb-1">
                  <span class="text-caption font-weight-bold text-grey-darken-2">WEEK 1</span>
                </div>
                <template v-for="(day, idx) in buildWeekDays(period.start, 0)" :key="'s1-'+period.start.getTime()+'-'+idx">
                  <DayRow :day="day" :is-today="false" :day-short="dayShort(day.date)" :format-time="formatTime" :readonly="true" />
                  <v-divider v-if="idx < 6" style="opacity:.35" />
                </template>
                <v-divider class="my-1" style="border-style:dashed;opacity:.4" />
                <div class="px-5 pt-3 pb-1">
                  <span class="text-caption font-weight-bold text-grey-darken-2">WEEK 2</span>
                </div>
                <template v-for="(day, idx) in buildWeekDays(period.start, 7)" :key="'s2-'+period.start.getTime()+'-'+idx">
                  <DayRow :day="day" :is-today="false" :day-short="dayShort(day.date)" :format-time="formatTime" :readonly="true" />
                  <v-divider v-if="idx < 6" style="opacity:.35" />
                </template>
                <v-divider />
                <div class="d-flex align-center justify-space-between px-5 py-3" style="background:#f5f4ff">
                  <span class="text-body-2 font-weight-bold navy-text">Period Total</span>
                  <span class="text-body-2 font-weight-bold navy-text">{{ period.totalHours }} hrs</span>
                </div>
              </template>
            </v-card>
          </div>
        </template>
      </template>
    </v-container>

    <!-- Submit Timecard Confirmation Dialog -->
    <v-dialog v-model="showSubmitDialog" max-width="460" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 d-flex align-center ga-2" style="color:#2e7d32;">
          <v-icon color="#2e7d32">mdi-send-check</v-icon>
          Submit Timecard
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 mb-3">You are submitting your timecard for:</p>
          <div class="pa-3 mb-3" style="background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
            <div class="text-body-2 font-weight-bold navy-text">{{ periodLabel(currentPeriodStart) }}</div>
            <div class="text-body-2 mt-1">Total hours: <strong>{{ currentPeriodHours }}</strong></div>
            <div class="text-caption text-grey mt-1">{{ pendingRecords.length }} clock entr{{ pendingRecords.length === 1 ? 'y' : 'ies' }}</div>
          </div>
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE">
            <div class="text-caption">Once submitted, your manager will review and approve your hours. You can still add corrections before they approve.</div>
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showSubmitDialog = false" :disabled="submittingTimecard">Cancel</v-btn>
          <v-btn color="#2e7d32" variant="flat" :loading="submittingTimecard" @click="submitTimecard">
            Submit Timecard
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit dialog -->
    <v-dialog v-model="showEditDialog" max-width="420" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-3 navy-text font-weight-bold text-body-1">Edit Time Entry</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field v-model="editForm.clockInTime"  label="Clock In"  type="datetime-local" variant="outlined" density="compact" color="#12086F" class="mb-3" />
          <v-text-field v-model="editForm.clockOutTime" label="Clock Out" type="datetime-local" variant="outlined" density="compact" color="#12086F" class="mb-3" />
          <v-textarea   v-model="editForm.notes" label="Notes (optional)" variant="outlined" density="compact" color="#12086F" rows="2" hide-details />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 d-flex justify-end ga-2">
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="saving" @click="saveEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Log Hours dialog -->
    <v-dialog v-model="showLogDialog" max-width="500" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-3 navy-text font-weight-bold text-body-1">Log Hours</v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <div class="px-5 pt-4 pb-3">
            <v-select v-model="logSelectedWeek" :items="weekOptions" label="Select week" variant="outlined" density="compact" color="#12086F" hide-details @update:model-value="onWeekSelected" />
          </div>
          <v-divider />
          <div v-if="logDays.length">
            <div v-for="(day, idx) in logDays" :key="idx" class="log-day-row px-5 py-3 d-flex align-center ga-3" :class="{ 'log-day--today': isToday(day.date) }">
              <div style="flex:0 0 110px">
                <div class="text-body-2 font-weight-medium" :class="isToday(day.date) ? 'navy-text' : ''">
                  {{ day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
                </div>
              </div>
              <v-text-field v-model="day.clockIn" type="time" variant="outlined" density="compact" color="#12086F" hide-details placeholder="In" style="flex:1" />
              <v-icon size="14" color="grey">mdi-arrow-right</v-icon>
              <v-text-field v-model="day.clockOut" type="time" variant="outlined" density="compact" color="#12086F" hide-details placeholder="Out" style="flex:1" />
            </div>
          </div>
          <div class="px-5 py-2">
            <div class="text-caption text-grey">Leave a day blank to skip it.</div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 d-flex justify-end ga-2">
          <v-btn variant="text" @click="showLogDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="logging" @click="saveLog">Submit for Review</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>


<style scoped>
.navy-text  { color: #12086F !important; }
.navy-card  { border-color: #e0e0e0; }
.cursor-pointer { cursor: pointer; }
.period-row, .week-toggle { transition: background .15s; }
.period-row:hover, .week-toggle:hover { background: #fafbff; }
.day-row { background: white; }
.day-row:hover { background: #fafbff; }
.day-row--empty { opacity: .5; }
.today-row { background: #f5f4ff !important; }
.rejected-row { background: #fff8f8 !important; }
.day-badge { width: 34px; height: 34px; border-radius: 8px; background: #f0f0f0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #666; letter-spacing: .04em; }
.day-badge--today { background: #12086F; color: white; }
.log-day-row { border-bottom: 1px solid #f0f0f0; }
.log-day-row:last-child { border-bottom: none; }
.log-day--today { background: #f5f4ff; }
.rejection-note { margin-left: 46px; background: #fff3f3; border-left: 3px solid #ef9a9a; border-radius: 0 4px 4px 0; padding: 5px 10px; }
</style>