<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const user         = ref(null);
const loading      = ref(false);
const clockRecords = ref([]);
const myShifts     = ref([]);
const activeTab    = ref('current');

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
// Local edits for draft entries — not sent to backend until Submit is clicked
const localEdits = ref({});

const recordsWithDetails = computed(() =>
  clockRecords.value.map(r => {
    const rid    = r.id || r.clock_id;
    const edit   = localEdits.value[rid];
    const clockIn  = edit?.clockInTime  ?? r.clockInTime  ?? r.clock_in_time;
    const clockOut = edit?.clockOutTime ?? r.clockOutTime ?? r.clock_out_time;
    const inDate   = clockIn  ? new Date(Number(clockIn))  : null;
    const outDate  = clockOut ? new Date(Number(clockOut)) : null;
    let totalHours = null;
    if (inDate && outDate) {
      totalHours = ((outDate - inDate) / (1000 * 60 * 60)).toFixed(2);
    } else if (r.totalHoursWorked || r.total_hours_worked) {
      totalHours = parseFloat(r.totalHoursWorked || r.total_hours_worked).toFixed(2);
    }
    const rejectionComment = r.rejectionReason || r.rejection_reason || r.rejectReason || r.reason || null;
    return {
      ...r,
      ...(edit ? { clockInTime: edit.clockInTime, clockOutTime: edit.clockOutTime, notes: edit.notes } : {}),
      inDate, outDate, totalHours,
      status: r.status || 'pending',
      rejectionComment,
      _pendingEdit: !!edit,
    };
  })
);

const currentPeriodStart = computed(() => getPayPeriodStart(new Date()));

// All records in the current pay period
const currentPeriodRecords = computed(() => {
  const start = currentPeriodStart.value;
  const end   = periodEnd(start);
  return recordsWithDetails.value.filter(r => r.inDate && r.inDate >= start && r.inDate <= end);
});

// Current period — unsubmitted (actionable)
const pendingRecords = computed(() =>
  currentPeriodRecords.value.filter(r =>
    r.status === 'pending' || r.status === 'clocked_out' || r.status === 'rejected'
  )
);

// Current period — submitted/approved/rejected (went through review process)
const submittedRecords = computed(() =>
  currentPeriodRecords.value.filter(r =>
    r.status === 'submitted' || r.status === 'approved' || r.status === 'rejected'
  )
);

const pendingCount   = computed(() => pendingRecords.value.length);
const submittedCount = computed(() => currentPeriodRecords.value.filter(r => r.status === 'submitted').length);

// Total hours for the current period (all entries)
const currentPeriodHours = computed(() =>
  currentPeriodRecords.value.reduce((s, r) => s + (parseFloat(r.totalHours) || 0), 0).toFixed(2)
);

// Is it end-of-week? (Friday or later in the pay period second week)
const isEndOfWeek = computed(() => {
  const today = new Date();
  return today.getDay() === 5 || today.getDay() === 6 || today.getDay() === 0;
});

// Has the current period already been submitted?
const currentPeriodSubmitted = computed(() => {
  if (!currentPeriodRecords.value.length) return false;
  return currentPeriodRecords.value.every(r => r.status === 'approved' || r.status === 'submitted');
});

function buildWeekDays(periodStart, offset, filterFn = null) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + offset + i);
    const s = new Date(d); s.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    let records = recordsWithDetails.value.filter(r => r.inDate && r.inDate >= s && r.inDate <= e);
    if (filterFn) records = records.filter(filterFn);
    days.push({ date: d, records });
  }
  return days;
}

const isUnsubmitted      = (r) => r.status === 'pending' || r.status === 'clocked_out';
const isSubmittedOrDone  = (r) => r.status === 'submitted' || r.status === 'approved' || r.status === 'rejected';

const pendingWeek1   = computed(() => buildWeekDays(currentPeriodStart.value, 0, isUnsubmitted));
const pendingWeek2   = computed(() => buildWeekDays(currentPeriodStart.value, 7, isUnsubmitted));
const submittedWeek1 = computed(() => buildWeekDays(currentPeriodStart.value, 0, isSubmittedOrDone));
const submittedWeek2 = computed(() => buildWeekDays(currentPeriodStart.value, 7, isSubmittedOrDone));

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
  checkTimecardNotifications();
});

const checkTimecardNotifications = async () => {
  const userId = user.value?.user_id || user.value?.userId;
  if (!userId) return;
  try {
    const res = await EmployeeService.getMyNotifications(userId);
    const notifs = Array.isArray(res.data) ? res.data : [];
    const unread = notifs.filter(n =>
      (n.type === 'timecard') && !n.isRead && !n.is_read
    );
    if (unread.length === 0) return;
    const latest = unread[0];
    const msg = latest.description || latest.message || latest.title || 'Your timecard status was updated';
    const approved = msg.toLowerCase().includes('approved');
    showSnackbar(msg, approved ? 'success' : 'error');
    for (const n of unread) {
      await EmployeeService.markNotificationRead(n.notification_id || n.id).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  } catch { /* silent */ }
};

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

    // Flush any locally-edited drafts to the backend first
    for (const [id, edit] of Object.entries(localEdits.value)) {
      await EmployeeService.updateClockRecord(id, edit).catch(() => {});
    }
    localEdits.value = {};

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

const saveEdit = () => {
  const inTs  = editForm.value.clockInTime  ? new Date(editForm.value.clockInTime).getTime()  : null;
  const outTs = editForm.value.clockOutTime ? new Date(editForm.value.clockOutTime).getTime() : null;
  // Store locally — backend is only updated on Submit to avoid auto-approval
  localEdits.value[editForm.value.id] = { clockInTime: inTs, clockOutTime: outTs, notes: editForm.value.notes };
  showSnackbar('Entry updated — submit your timecard to save permanently.', 'success');
  showEditDialog.value = false;
};

// ── LOG HOURS ──────────────────────────────────────────────────────────────
const showLogDialog   = ref(false);
const logSelectedWeek = ref(null);
const logDays         = ref([]);
const logging         = ref(false);

// local date helpers (avoids UTC timezone shift)
const localDateStr   = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const minutesToTime  = (min) => { if (min == null) return ''; const h = Math.floor(min/60); const m = min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; };

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
  const start   = new Date(ts);
  const weekEnd = new Date(start); weekEnd.setDate(start.getDate() + 6); weekEnd.setHours(23,59,59,999);
  const today   = new Date(); today.setHours(23,59,59,999);
  const cutoff  = weekEnd < today ? weekEnd : today;

  // Only show shift days that are on or before today
  const shifts = myShifts.value
    .filter(s => {
      const st = new Date(Number(s.shiftTime || s.shift_time));
      return st >= start && st <= cutoff;
    })
    .sort((a,b) => Number(a.shiftTime||a.shift_time) - Number(b.shiftTime||b.shift_time));

  logDays.value = shifts.map(s => ({
    date:       new Date(Number(s.shiftTime || s.shift_time)),
    shiftId:    s.shift_id || s.id,
    clockIn:    minutesToTime(s.startTime || s.start_time),
    clockOut:   minutesToTime(s.endTime   || s.end_time),
    notes:      '',
    shiftLabel: `Scheduled ${minutesToTime(s.startTime||s.start_time)} – ${minutesToTime(s.endTime||s.end_time)}`,
  }));
};

const addExtraDay = () => {
  const today = new Date(); today.setHours(0,0,0,0);
  logDays.value.push({ date: new Date(today), shiftId: null, clockIn: '', clockOut: '', notes: '', shiftLabel: null, isExtra: true });
};

const calcHours = (day) => {
  if (!day.clockIn || !day.clockOut) return null;
  const inMs  = new Date(`1970-01-01T${day.clockIn}`).getTime();
  const outMs = new Date(`1970-01-01T${day.clockOut}`).getTime();
  if (outMs <= inMs) return null;
  return ((outMs - inMs) / 3600000).toFixed(2);
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
  if (!filled.length) { showSnackbar('Enter at least one day with clock in and out times', 'error'); return; }
  const missingNote = filled.find(d => !d.notes.trim());
  if (missingNote) { showSnackbar('A comment is required for every day you log hours', 'error'); return; }

  logging.value = true;
  let saved = 0;
  for (const day of filled) {
    try {
      const dateStr = localDateStr(day.date);
      const inTs    = new Date(`${dateStr}T${day.clockIn}:00`).getTime();
      const outTs   = new Date(`${dateStr}T${day.clockOut}:00`).getTime();
      if (outTs <= inTs) continue;
      const payload = { clockInTime: inTs, clockOutTime: outTs, notes: day.notes };
      if (day.shiftId) payload.shiftId = day.shiftId;
      const res   = await EmployeeService.clockIn(payload);
      const newId = res.data?.id || res.data?.clock_id || res.data?.clockId;
      if (newId) saved++;
    } catch { /* individual day failed — backend requires shiftId */ }
  }
  logging.value = false;
  if (saved > 0) {
    showSnackbar(`${saved} entr${saved>1?'ies':'y'} logged! They appear in the Current tab.`, 'success');
    showLogDialog.value = false;
    await loadData();
  } else {
    showSnackbar('Could not save — the backend needs a fix to support entries without a scheduled shift.', 'error');
  }
};

// ── HELPERS ────────────────────────────────────────────────────────────────
const toInputDateTime = (d) => {
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const formatTime  = (d) => d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
const dayShort    = (d) => d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const isToday     = (d) => { const t = new Date(); return d.getDate()===t.getDate()&&d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear(); };
const weekHours      = (days) => days.reduce((s,d)=>s+d.records.reduce((ss,r)=>ss+(parseFloat(r.totalHours)||0),0),0).toFixed(2);
const weekEntryCount = (days) => days.reduce((s,d)=>s+d.records.length,0);

const getWeekLabel = (days, fallback) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(days[0].date); start.setHours(0,0,0,0);
  const end   = new Date(days[6].date); end.setHours(23,59,59,999);
  if (today >= start && today <= end) return 'This Week';
  if (end < today) return 'Last Week';
  if (start > today) return 'Next Week';
  return fallback;
};

const showSnackbar = (msg, color='success') => { snackMsg.value=msg; snackColor.value=color; snackbar.value=true; };

const statusColor = (s) => ({ approved: '#2e7d32', rejected: '#d32f2f', submitted: '#1565C0' }[s] || '#f57c00');
const statusLabel = (s) => ({ approved: 'Approved', rejected: 'Denied', submitted: 'Needs Review', clocked_out: 'Not Clocked Out', pending: 'Pending' }[s] || s);
const cardClass   = (s) => ({ rejected: 'status-card--rejected', submitted: 'status-card--submitted', approved: 'status-card--approved' }[s] || '');

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
          <v-tab value="current">
            Current
            <v-chip v-if="pendingCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-2">{{ pendingCount }}</v-chip>
          </v-tab>
          <v-tab value="submitted">
            Submitted
            <v-chip v-if="submittedCount > 0" size="x-small" color="#1565C0" variant="tonal" class="ml-2">{{ submittedCount }}</v-chip>
          </v-tab>
          <v-tab value="past">Past</v-tab>
        </v-tabs>
      </v-card>

      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="36" />
      </div>

      <template v-else>

        <!-- CURRENT PERIOD TAB (unsubmitted) -->
        <template v-if="activeTab === 'current'">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-body-2 font-weight-bold navy-text">{{ periodLabel(currentPeriodStart) }}</div>
            <div class="d-flex align-center ga-2">
              <span class="text-caption text-grey">Total: <strong class="navy-text">{{ currentPeriodHours }} hrs</strong></span>
            </div>
          </div>

          <!-- Week 1 -->
          <v-card variant="outlined" rounded="lg" class="navy-card overflow-hidden mb-3" :class="weekEntryCount(pendingWeek1) > 0 ? 'week-card--active' : ''">
            <div class="week-toggle d-flex align-center px-5 py-4 cursor-pointer" @click="pendingWeeksOpen.w1 = !pendingWeeksOpen.w1">
              <v-icon size="18" class="mr-3" color="#12086F" style="transition:transform .2s" :style="pendingWeeksOpen.w1 ? 'transform:rotate(90deg)' : ''">mdi-chevron-right</v-icon>
              <span class="text-body-2 font-weight-bold navy-text mr-2">{{ getWeekLabel(pendingWeek1, 'Week 1') }}</span>
              <v-chip v-if="weekEntryCount(pendingWeek1) > 0" size="x-small" color="#12086F" variant="tonal" class="mr-2">{{ weekEntryCount(pendingWeek1) }} entr{{ weekEntryCount(pendingWeek1) === 1 ? 'y' : 'ies' }}</v-chip>
              <span class="text-caption text-grey">
                {{ pendingWeek1[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }} –
                {{ pendingWeek1[6].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}
              </span>
              <v-spacer />
              <span class="text-body-2 font-weight-bold" :style="weekEntryCount(pendingWeek1) > 0 ? 'color:#12086F' : ''">{{ weekHours(pendingWeek1) }} hrs</span>
            </div>
            <template v-if="pendingWeeksOpen.w1">
              <v-divider />
              <div class="pa-4 d-flex flex-column ga-3">
                <template v-for="day in pendingWeek1" :key="day.date.getTime()">
                  <div v-for="r in day.records" :key="r.id || r.clock_id" class="shift-card d-flex align-center pa-4" :class="cardClass(r.status)">
                    <div class="shift-icon-circle mr-4" :class="isToday(day.date) ? 'shift-icon-circle--today' : ''">
                      <v-icon color="white" size="20">mdi-clock-outline</v-icon>
                    </div>
                    <div style="flex:1">
                      <div class="d-flex align-center ga-2 mb-1">
                        <span class="entry-badge">Clock Entry</span>
                        <span v-if="isToday(day.date)" class="today-pill">Today</span>
                        <span v-if="r._pendingEdit" class="status-pill status-pill--edited">Edited</span>
                        <span v-if="r.status === 'submitted'" class="status-pill status-pill--submitted">Needs Review</span>
                        <span v-if="r.status === 'approved'"  class="status-pill status-pill--approved">Approved</span>
                        <span v-if="r.status === 'rejected'"  class="status-pill status-pill--rejected">Rejected</span>
                      </div>
                      <div class="text-body-2 font-weight-bold navy-text mb-1">{{ day.date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'}) }}</div>
                      <div class="text-caption text-grey">
                        In: <strong>{{ formatTime(r.inDate) }}</strong> → Out: <strong>{{ r.outDate ? formatTime(r.outDate) : 'Not clocked out' }}</strong>
                        <span v-if="r.totalHours"> · <span class="navy-text font-weight-bold">{{ r.totalHours }} hrs</span></span>
                      </div>
                      <div v-if="r.notes" class="text-caption text-grey mt-1">
                        <v-icon size="11" class="mr-1">mdi-comment-text-outline</v-icon>{{ r.notes }}
                      </div>
                      <div v-if="r.status === 'rejected' && r.rejectionComment" class="rejection-note mt-2 d-flex align-start ga-2">
                        <v-icon size="13" color="#d32f2f" style="margin-top:2px">mdi-message-alert-outline</v-icon>
                        <span class="text-caption" style="color:#b71c1c"><strong>Manager:</strong> {{ r.rejectionComment }}</span>
                      </div>
                    </div>
                    <div class="d-flex flex-column align-end ga-2">
                      <v-chip size="x-small" :color="statusColor(r.status)" variant="tonal">{{ statusLabel(r.status) }}</v-chip>
                      <v-btn v-if="r.status==='pending'||r.status==='rejected'||r.status==='clocked_out'" size="x-small" variant="tonal" color="#12086F" @click="openEdit(r)">Edit</v-btn>
                    </div>
                  </div>
                </template>
                <div v-if="pendingWeek1.every(d => d.records.length === 0)" class="text-center py-4 text-caption text-grey">No shifts logged this week</div>
              </div>
            </template>
          </v-card>

          <!-- Week 2 -->
          <v-card variant="outlined" rounded="lg" class="navy-card overflow-hidden mb-4" :class="weekEntryCount(pendingWeek2) > 0 ? 'week-card--active' : ''">
            <div class="week-toggle d-flex align-center px-5 py-4 cursor-pointer" @click="pendingWeeksOpen.w2 = !pendingWeeksOpen.w2">
              <v-icon size="18" class="mr-3" color="#12086F" style="transition:transform .2s" :style="pendingWeeksOpen.w2 ? 'transform:rotate(90deg)' : ''">mdi-chevron-right</v-icon>
              <span class="text-body-2 font-weight-bold navy-text mr-2">{{ getWeekLabel(pendingWeek2, 'Week 2') }}</span>
              <v-chip v-if="weekEntryCount(pendingWeek2) > 0" size="x-small" color="#12086F" variant="tonal" class="mr-2">{{ weekEntryCount(pendingWeek2) }} entr{{ weekEntryCount(pendingWeek2) === 1 ? 'y' : 'ies' }}</v-chip>
              <span class="text-caption text-grey">
                {{ pendingWeek2[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }} –
                {{ pendingWeek2[6].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}
              </span>
              <v-spacer />
              <span class="text-body-2 font-weight-bold" :style="weekEntryCount(pendingWeek2) > 0 ? 'color:#12086F' : ''">{{ weekHours(pendingWeek2) }} hrs</span>
            </div>
            <template v-if="pendingWeeksOpen.w2">
              <v-divider />
              <div class="pa-4 d-flex flex-column ga-3">
                <template v-for="day in pendingWeek2" :key="day.date.getTime()">
                  <div v-for="r in day.records" :key="r.id || r.clock_id" class="shift-card d-flex align-center pa-4" :class="cardClass(r.status)">
                    <div class="shift-icon-circle mr-4" :class="isToday(day.date) ? 'shift-icon-circle--today' : ''">
                      <v-icon color="white" size="20">mdi-clock-outline</v-icon>
                    </div>
                    <div style="flex:1">
                      <div class="d-flex align-center ga-2 mb-1">
                        <span class="entry-badge">Clock Entry</span>
                        <span v-if="isToday(day.date)" class="today-pill">Today</span>
                        <span v-if="r._pendingEdit" class="status-pill status-pill--edited">Edited</span>
                        <span v-if="r.status === 'submitted'" class="status-pill status-pill--submitted">Needs Review</span>
                        <span v-if="r.status === 'approved'"  class="status-pill status-pill--approved">Approved</span>
                        <span v-if="r.status === 'rejected'"  class="status-pill status-pill--rejected">Rejected</span>
                      </div>
                      <div class="text-body-2 font-weight-bold navy-text mb-1">{{ day.date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'}) }}</div>
                      <div class="text-caption text-grey">
                        In: <strong>{{ formatTime(r.inDate) }}</strong> → Out: <strong>{{ r.outDate ? formatTime(r.outDate) : 'Not clocked out' }}</strong>
                        <span v-if="r.totalHours"> · <span class="navy-text font-weight-bold">{{ r.totalHours }} hrs</span></span>
                      </div>
                      <div v-if="r.notes" class="text-caption text-grey mt-1">
                        <v-icon size="11" class="mr-1">mdi-comment-text-outline</v-icon>{{ r.notes }}
                      </div>
                      <div v-if="r.status === 'rejected' && r.rejectionComment" class="rejection-note mt-2 d-flex align-start ga-2">
                        <v-icon size="13" color="#d32f2f" style="margin-top:2px">mdi-message-alert-outline</v-icon>
                        <span class="text-caption" style="color:#b71c1c"><strong>Manager:</strong> {{ r.rejectionComment }}</span>
                      </div>
                    </div>
                    <div class="d-flex flex-column align-end ga-2">
                      <v-chip size="x-small" :color="statusColor(r.status)" variant="tonal">{{ statusLabel(r.status) }}</v-chip>
                      <v-btn v-if="r.status==='pending'||r.status==='rejected'||r.status==='clocked_out'" size="x-small" variant="tonal" color="#12086F" @click="openEdit(r)">Edit</v-btn>
                    </div>
                  </div>
                </template>
                <div v-if="pendingWeek2.every(d => d.records.length === 0)" class="text-center py-4 text-caption text-grey">No shifts logged this week</div>
              </div>
            </template>
          </v-card>

          <div v-if="pendingRecords.length === 0" class="text-center py-10">
            <v-icon size="52" color="grey-lighten-2" class="mb-3">mdi-calendar-check-outline</v-icon>
            <div class="text-body-2 text-grey">No unsubmitted entries for this period</div>
            <div class="text-caption text-grey mt-1">Check the "Submitted" tab to see entries awaiting review</div>
          </div>
        </template>

        <!-- SUBMITTED TAB -->
        <template v-if="activeTab === 'submitted'">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-body-2 font-weight-bold navy-text">{{ periodLabel(currentPeriodStart) }}</div>
            <div class="d-flex align-center ga-2 flex-wrap">
              <span class="status-pill status-pill--submitted">Blue = Needs Review</span>
              <span class="status-pill status-pill--approved">Green = Approved</span>
              <span class="status-pill status-pill--rejected">Red = Denied</span>
            </div>
          </div>

          <v-alert v-if="submittedRecords.length === 0" type="info" variant="tonal" density="compact" color="#1565C0" class="mb-4">
            <div class="text-caption">No submitted entries yet. Submit your timecard from the Current tab.</div>
          </v-alert>

          <!-- Week 1 -->
          <v-card v-if="submittedWeek1.some(d => d.records.length > 0)" variant="outlined" rounded="lg" class="navy-card overflow-hidden mb-3">
            <div class="week-toggle d-flex align-center px-5 py-4 cursor-pointer" @click="pendingWeeksOpen.w1 = !pendingWeeksOpen.w1">
              <v-icon size="18" class="mr-3" color="#12086F" style="transition:transform .2s" :style="pendingWeeksOpen.w1 ? 'transform:rotate(90deg)' : ''">mdi-chevron-right</v-icon>
              <span class="text-body-2 font-weight-bold navy-text mr-2">{{ getWeekLabel(submittedWeek1, 'Week 1') }}</span>
              <span class="text-caption text-grey">
                {{ submittedWeek1[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }} –
                {{ submittedWeek1[6].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}
              </span>
              <v-spacer />
              <span class="text-body-2 font-weight-bold navy-text">{{ weekHours(submittedWeek1) }} hrs</span>
            </div>
            <template v-if="pendingWeeksOpen.w1">
              <v-divider />
              <div class="pa-4 d-flex flex-column ga-3">
                <template v-for="day in submittedWeek1" :key="day.date.getTime()">
                  <div v-for="r in day.records" :key="r.id || r.clock_id" class="shift-card pa-4" :class="cardClass(r.status)">
                    <div class="d-flex align-center">
                      <div class="shift-icon-circle mr-4" :style="{ background: r.status==='approved' ? '#2e7d32' : r.status==='rejected' ? '#d32f2f' : '#1565C0' }">
                        <v-icon color="white" size="20">{{ r.status==='approved' ? 'mdi-check-circle' : r.status==='rejected' ? 'mdi-close-circle' : 'mdi-clock-check-outline' }}</v-icon>
                      </div>
                      <div style="flex:1">
                        <div class="d-flex align-center ga-2 mb-1">
                          <span class="entry-badge">Clock Entry</span>
                          <span v-if="r.status==='submitted'" class="status-pill status-pill--submitted">Needs Review</span>
                          <span v-if="r.status==='approved'"  class="status-pill status-pill--approved">Approved</span>
                          <span v-if="r.status==='rejected'"  class="status-pill status-pill--rejected">Denied</span>
                        </div>
                        <div class="text-body-2 font-weight-bold navy-text mb-1">{{ day.date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'}) }}</div>
                        <div class="text-caption text-grey">
                          In: <strong>{{ formatTime(r.inDate) }}</strong> → Out: <strong>{{ r.outDate ? formatTime(r.outDate) : 'Not clocked out' }}</strong>
                          <span v-if="r.totalHours"> · <strong>{{ r.totalHours }} hrs</strong></span>
                        </div>
                      </div>
                      <v-chip size="x-small" :color="statusColor(r.status)" variant="tonal" class="ml-2">{{ statusLabel(r.status) }}</v-chip>
                    </div>
                    <div v-if="r.status === 'rejected' && r.rejectionComment" class="rejection-note mt-3 d-flex align-start ga-2">
                      <v-icon size="14" color="#d32f2f" style="margin-top:1px">mdi-message-alert</v-icon>
                      <div>
                        <div class="text-caption font-weight-bold" style="color:#b71c1c">Manager's Note:</div>
                        <div class="text-caption" style="color:#b71c1c">{{ r.rejectionComment }}</div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </v-card>

          <!-- Week 2 -->
          <v-card v-if="submittedWeek2.some(d => d.records.length > 0)" variant="outlined" rounded="lg" class="navy-card overflow-hidden mb-3">
            <div class="week-toggle d-flex align-center px-5 py-4 cursor-pointer" @click="pendingWeeksOpen.w2 = !pendingWeeksOpen.w2">
              <v-icon size="18" class="mr-3" color="#12086F" style="transition:transform .2s" :style="pendingWeeksOpen.w2 ? 'transform:rotate(90deg)' : ''">mdi-chevron-right</v-icon>
              <span class="text-body-2 font-weight-bold navy-text mr-2">{{ getWeekLabel(submittedWeek2, 'Week 2') }}</span>
              <span class="text-caption text-grey">
                {{ submittedWeek2[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }} –
                {{ submittedWeek2[6].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}
              </span>
              <v-spacer />
              <span class="text-body-2 font-weight-bold navy-text">{{ weekHours(submittedWeek2) }} hrs</span>
            </div>
            <template v-if="pendingWeeksOpen.w2">
              <v-divider />
              <div class="pa-4 d-flex flex-column ga-3">
                <template v-for="day in submittedWeek2" :key="day.date.getTime()">
                  <div v-for="r in day.records" :key="r.id || r.clock_id" class="shift-card pa-4" :class="cardClass(r.status)">
                    <div class="d-flex align-center">
                      <div class="shift-icon-circle mr-4" :style="{ background: r.status==='approved' ? '#2e7d32' : r.status==='rejected' ? '#d32f2f' : '#1565C0' }">
                        <v-icon color="white" size="20">{{ r.status==='approved' ? 'mdi-check-circle' : r.status==='rejected' ? 'mdi-close-circle' : 'mdi-clock-check-outline' }}</v-icon>
                      </div>
                      <div style="flex:1">
                        <div class="d-flex align-center ga-2 mb-1">
                          <span class="entry-badge">Clock Entry</span>
                          <span v-if="r.status==='submitted'" class="status-pill status-pill--submitted">Needs Review</span>
                          <span v-if="r.status==='approved'"  class="status-pill status-pill--approved">Approved</span>
                          <span v-if="r.status==='rejected'"  class="status-pill status-pill--rejected">Denied</span>
                        </div>
                        <div class="text-body-2 font-weight-bold navy-text mb-1">{{ day.date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'}) }}</div>
                        <div class="text-caption text-grey">
                          In: <strong>{{ formatTime(r.inDate) }}</strong> → Out: <strong>{{ r.outDate ? formatTime(r.outDate) : 'Not clocked out' }}</strong>
                          <span v-if="r.totalHours"> · <strong>{{ r.totalHours }} hrs</strong></span>
                        </div>
                      </div>
                      <v-chip size="x-small" :color="statusColor(r.status)" variant="tonal" class="ml-2">{{ statusLabel(r.status) }}</v-chip>
                    </div>
                    <div v-if="r.status === 'rejected' && r.rejectionComment" class="rejection-note mt-3 d-flex align-start ga-2">
                      <v-icon size="14" color="#d32f2f" style="margin-top:1px">mdi-message-alert</v-icon>
                      <div>
                        <div class="text-caption font-weight-bold" style="color:#b71c1c">Manager's Note:</div>
                        <div class="text-caption" style="color:#b71c1c">{{ r.rejectionComment }}</div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </v-card>
        </template>

        <!-- PAST PERIODS TAB -->
        <template v-if="activeTab === 'past'">
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
                <div class="pa-4 d-flex flex-column ga-3">
                  <div class="text-caption font-weight-bold text-grey-darken-2 mb-1">WEEK 1</div>
                  <template v-for="day in buildWeekDays(period.start, 0)" :key="'ps1-'+day.date.getTime()">
                    <div v-for="r in day.records" :key="r.id || r.clock_id" class="shift-card d-flex align-center pa-4" :class="cardClass(r.status)">
                      <div class="shift-icon-circle mr-4"><v-icon color="white" size="20">mdi-clock-outline</v-icon></div>
                      <div style="flex:1">
                        <div class="d-flex align-center ga-2 mb-1">
                          <span class="entry-badge">Clock Entry</span>
                          <span v-if="r.status === 'submitted'" class="status-pill status-pill--submitted">Needs Review</span>
                          <span v-if="r.status === 'approved'"  class="status-pill status-pill--approved">Approved</span>
                          <span v-if="r.status === 'rejected'"  class="status-pill status-pill--rejected">Rejected</span>
                        </div>
                        <div class="text-body-2 font-weight-bold navy-text mb-1">{{ day.date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'}) }}</div>
                        <div class="text-caption text-grey">In: <strong>{{ formatTime(r.inDate) }}</strong> → Out: <strong>{{ r.outDate ? formatTime(r.outDate) : 'Not clocked out' }}</strong><span v-if="r.totalHours"> · <span class="navy-text font-weight-bold">{{ r.totalHours }} hrs</span></span></div>
                      </div>
                      <v-chip size="x-small" :color="statusColor(r.status)" variant="tonal">{{ statusLabel(r.status) }}</v-chip>
                    </div>
                  </template>
                  <v-divider style="border-style:dashed;opacity:.4" />
                  <div class="text-caption font-weight-bold text-grey-darken-2 mb-1">WEEK 2</div>
                  <template v-for="day in buildWeekDays(period.start, 7)" :key="'ps2-'+day.date.getTime()">
                    <div v-for="r in day.records" :key="r.id || r.clock_id" class="shift-card d-flex align-center pa-4" :class="cardClass(r.status)">
                      <div class="shift-icon-circle mr-4"><v-icon color="white" size="20">mdi-clock-outline</v-icon></div>
                      <div style="flex:1">
                        <div class="d-flex align-center ga-2 mb-1">
                          <span class="entry-badge">Clock Entry</span>
                          <span v-if="r.status === 'submitted'" class="status-pill status-pill--submitted">Needs Review</span>
                          <span v-if="r.status === 'approved'"  class="status-pill status-pill--approved">Approved</span>
                          <span v-if="r.status === 'rejected'"  class="status-pill status-pill--rejected">Rejected</span>
                        </div>
                        <div class="text-body-2 font-weight-bold navy-text mb-1">{{ day.date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',year:'numeric'}) }}</div>
                        <div class="text-caption text-grey">In: <strong>{{ formatTime(r.inDate) }}</strong> → Out: <strong>{{ r.outDate ? formatTime(r.outDate) : 'Not clocked out' }}</strong><span v-if="r.totalHours"> · <span class="navy-text font-weight-bold">{{ r.totalHours }} hrs</span></span></div>
                      </div>
                      <v-chip size="x-small" :color="statusColor(r.status)" variant="tonal">{{ statusLabel(r.status) }}</v-chip>
                    </div>
                  </template>
                </div>
                <v-divider />
                <div class="d-flex align-center justify-space-between px-5 py-3 period-total-bar">
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

    <!-- Log Hours dialog — Workday-style -->
    <v-dialog v-model="showLogDialog" max-width="600" persistent scrollable>
      <v-card rounded="lg">
        <v-card-title class="pa-4 pb-3 d-flex align-center ga-2">
          <v-icon color="#12086F" size="20">mdi-clock-edit-outline</v-icon>
          <span class="navy-text font-weight-bold text-body-1">Log Hours</span>
        </v-card-title>
        <v-divider />

        <!-- Week selector -->
        <div class="px-4 pt-3 pb-3">
          <v-select v-model="logSelectedWeek" :items="weekOptions" label="Pay period week" variant="outlined" density="compact" color="#12086F" hide-details @update:model-value="onWeekSelected" prepend-inner-icon="mdi-calendar-range" />
        </div>
        <v-divider />

        <v-card-text class="pa-0" style="max-height:65vh; overflow-y:auto;">

          <!-- No shifts message -->
          <div v-if="logDays.length === 0" class="text-center py-8 px-5">
            <v-icon size="44" color="grey-lighten-2" class="mb-2">mdi-calendar-remove-outline</v-icon>
            <div class="text-body-2 text-grey mb-1">No scheduled shifts found for this week</div>
            <div class="text-caption text-grey mb-3">Only days with shifts can be logged. Use "Add Day" for manual entries.</div>
            <v-btn size="small" variant="tonal" color="#12086F" prepend-icon="mdi-plus" @click="addExtraDay">Add Day</v-btn>
          </div>

          <!-- Shift-based day rows -->
          <div v-else>
            <!-- Column headers -->
            <div class="log-col-headers px-4 py-2 d-flex align-center ga-2 text-caption text-grey">
              <div style="flex:0 0 90px">Day</div>
              <div style="flex:1">Clock In</div>
              <div style="flex:1">Clock Out</div>
              <div style="flex:0 0 52px;text-align:right">Hours</div>
            </div>
            <v-divider />

            <div v-for="(day, idx) in logDays" :key="idx"
              class="log-day-card"
              :class="{ 'log-day-card--today': isToday(day.date), 'log-day-card--filled': !!(day.clockIn && day.clockOut && day.notes.trim()) }"
            >
              <!-- Row: day + times + hours -->
              <div class="d-flex align-center ga-2 mb-2">
                <!-- Day label -->
                <div style="flex:0 0 90px">
                  <div class="log-day-name">{{ day.date.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase() }}</div>
                  <div class="text-caption text-grey" style="font-size:10px">{{ day.date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) }}</div>
                  <span v-if="isToday(day.date)" class="today-pill" style="font-size:9px;padding:1px 5px;">Today</span>
                </div>
                <!-- Clock in -->
                <v-text-field v-model="day.clockIn" type="time" variant="outlined" density="compact" color="#12086F" hide-details style="flex:1" />
                <!-- Arrow -->
                <v-icon size="14" color="grey" style="flex-shrink:0">mdi-arrow-right</v-icon>
                <!-- Clock out -->
                <v-text-field v-model="day.clockOut" type="time" variant="outlined" density="compact" color="#12086F" hide-details style="flex:1" />
                <!-- Hours badge -->
                <div style="flex:0 0 52px;text-align:right">
                  <span v-if="calcHours(day)" class="log-hours-badge">{{ calcHours(day) }}</span>
                </div>
              </div>

              <!-- Scheduled reference -->
              <div v-if="day.shiftLabel" class="text-caption text-grey mb-2" style="padding-left:96px">
                <v-icon size="11" class="mr-1">mdi-calendar-clock</v-icon>{{ day.shiftLabel }}
              </div>

              <!-- Required comment -->
              <v-textarea
                v-model="day.notes"
                :label="(day.clockIn && day.clockOut) ? 'Comment * (required)' : 'Comment'"
                variant="outlined"
                density="compact"
                color="#12086F"
                rows="1"
                hide-details
                auto-grow
                placeholder="What did you work on? (e.g. Front desk, inventory count...)"
                :error="!!(day.clockIn && day.clockOut && !day.notes.trim())"
              />

              <!-- Remove extra day -->
              <div v-if="day.isExtra" class="mt-2 d-flex justify-end">
                <v-btn icon="mdi-close" size="x-small" variant="plain" color="error" @click="logDays.splice(idx,1)" />
              </div>
            </div>

            <!-- Add extra day button -->
            <div class="px-4 py-3">
              <v-btn size="small" variant="text" color="#12086F" prepend-icon="mdi-plus" @click="addExtraDay">
                Add a day not in your schedule
              </v-btn>
            </div>
          </div>

          <v-divider />
          <div class="px-4 py-2">
            <v-alert type="info" variant="tonal" density="compact" color="#12086F" class="text-caption">
              Times are pre-filled from your scheduled shift. Adjust if needed. <strong>Comment is required</strong> for every day entered.
            </v-alert>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 d-flex justify-end ga-2">
          <v-btn variant="text" @click="showLogDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="logging" prepend-icon="mdi-check" @click="saveLog">Enter Hours</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>


<style scoped>
.navy-text  { color: #12086F !important; }
.navy-card  { border-color: #e0e0e0; }
.week-card--active { border-color: #12086F !important; border-left-width: 3px !important; }
.cursor-pointer { cursor: pointer; }
.period-row, .week-toggle { transition: background .15s; }
.period-row:hover, .week-toggle:hover { background: #fafbff; }
.log-day-row { border-bottom: 1px solid #f0f0f0; }
.log-day-row:last-child { border-bottom: none; }
.log-day--today { background: #f5f4ff; }
.rejection-note { background: #fff3f3; border-left: 3px solid #ef9a9a; border-radius: 0 4px 4px 0; padding: 5px 10px; }
.period-total-bar { background: #f5f4ff; }

/* Shift cards */
.shift-card { background: white; border: 1px solid #e8e8f0; border-radius: 12px; transition: background .15s; }
.shift-card:hover { background: #fafbff; }
.status-card--submitted { border-left: 4px solid #1565C0 !important; background: #EFF6FF !important; border-color: #90CAF9 !important; }
.status-card--approved  { border-left: 4px solid #2e7d32 !important; background: #F0FDF4 !important; border-color: #A5D6A7 !important; }
.status-card--rejected  { border-left: 4px solid #d32f2f !important; background: #FFF5F5 !important; border-color: #FFCDD2 !important; }

/* Icon circle */
.shift-icon-circle { width: 40px; height: 40px; border-radius: 10px; background: #12086F; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.shift-icon-circle--today { background: #4361EE; }

/* Badges / pills */
.entry-badge { background: #ede9ff; color: #12086F; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
.today-pill  { background: #12086F; color: white; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }
.status-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; letter-spacing: .02em; }
.status-pill--edited { background: #fff3e0; color: #e65100; }
.status-pill--submitted { background: #1565C0; color: white; }
.status-pill--approved  { background: #2e7d32; color: white; }
.status-pill--rejected  { background: #d32f2f; color: white; }

/* ── Workday-style log day cards ───────────────────────────────────────── */
.log-col-headers { background: #fafafa; border-bottom: 1px solid #e0e0e0; }
.log-day-card {
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: background .15s;
}
.log-day-card:last-child { border-bottom: none; }
.log-day-card--today { background: #f5f4ff; }
.log-day-card--filled { background: #f0fdf4; }
.log-day-card--today.log-day-card--filled { background: #f0fdf4; }
.log-day-name { font-size: 13px; font-weight: 800; color: #12086F; letter-spacing: .06em; min-width: 32px; }
.log-day-date { font-size: 11px; }
.log-hours-badge { background: #12086F; color: white; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 20px; }
.notes-required-error :deep(.v-field__outline) { --v-field-border-color: #d32f2f !important; }

/* ── Dark mode ─────────────────────────────────────────────────────────── */
.v-theme--dark .navy-text  { color: #C5CAE9 !important; }
.v-theme--dark .navy-card  { border-color: #37474F; }
.v-theme--dark .week-card--active { border-color: #7B68EE !important; }
.v-theme--dark .period-row:hover, .v-theme--dark .week-toggle:hover { background: #263238; }
.v-theme--dark .shift-card { background: #1E1E2E; border-color: #37474F; }
.v-theme--dark .shift-card:hover { background: #263238; }
.v-theme--dark .status-card--submitted { background: #0a1929 !important; border-color: #1565C0 !important; }
.v-theme--dark .status-card--approved  { background: #051a08 !important; border-color: #2e7d32 !important; }
.v-theme--dark .status-card--rejected  { background: #1a0505 !important; border-color: #d32f2f !important; }
.v-theme--dark .entry-badge  { background: #1a237e; color: #C5CAE9; }
.v-theme--dark .today-pill   { background: #4361EE; }
.v-theme--dark .shift-icon-circle { background: #3949AB; }
.v-theme--dark .rejection-note { background: #1a0000; border-left-color: #ef5350; }
.v-theme--dark .period-total-bar { background: #1a1a3e; }
.v-theme--dark .log-day-row  { border-bottom-color: #37474F; }
.v-theme--dark .log-day--today { background: #1a1a3e; }
.v-theme--dark .log-day-card { border-bottom-color: #37474F; }
.v-theme--dark .log-day-card--today  { background: #1a1a3e; }
.v-theme--dark .log-day-card--filled { background: #051a08; }
.v-theme--dark .log-day-name { color: #C5CAE9; }
.v-theme--dark .log-hours-badge { background: #3949AB; }
</style>