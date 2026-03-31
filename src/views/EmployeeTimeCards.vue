<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const user    = ref(null);
const loading = ref(false);
const clockRecords = ref([]);
const myShifts = ref([]);

const showSubmitDialog = ref(false);
const submitForm = ref({ shiftId: '', clockInTime: '', clockOutTime: '', notes: '' });
const submitting = ref(false);

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

// ── COMPUTED ──────────────────────────────────────────────────────────────
const today = new Date();
const todayDay = today.getDay(); // 0=Sun, 5=Fri
const isSubmitDay = computed(() => todayDay === 0 || todayDay === 5); // Sunday or Friday

const recordsWithDetails = computed(() =>
  clockRecords.value.map(r => {
    const clockIn  = r.clockInTime  || r.clock_in_time;
    const clockOut = r.clockOutTime || r.clock_out_time;
    const inDate  = clockIn  ? new Date(Number(clockIn))  : null;
    const outDate = clockOut ? new Date(Number(clockOut)) : null;
    let totalHours = '—';
    if (inDate && outDate) {
      totalHours = ((outDate - inDate) / (1000 * 60 * 60)).toFixed(2) + ' hrs';
    } else if (r.totalHoursWorked || r.total_hours_worked) {
      totalHours = parseFloat(r.totalHoursWorked || r.total_hours_worked).toFixed(2) + ' hrs';
    }
    return {
      ...r,
      date: inDate ? inDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—',
      clockInDisplay:  inDate  ? inDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—',
      clockOutDisplay: outDate ? outDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Not clocked out',
      totalHours,
      status: r.status || 'pending',
    };
  })
);

const pendingCount   = computed(() => recordsWithDetails.value.filter(r => r.status === 'pending' || r.status === 'clocked_out').length);
const approvedCount  = computed(() => recordsWithDetails.value.filter(r => r.status === 'approved').length);
const totalThisWeek  = computed(() => {
  const approved = recordsWithDetails.value.filter(r => r.status === 'approved');
  return approved.reduce((sum, r) => {
    const h = parseFloat(r.totalHours) || 0;
    return sum + h;
  }, 0).toFixed(2);
});

const shiftOptions = computed(() =>
  myShifts.value.map(s => {
    const d = new Date(Number(s.shiftTime || s.shift_time));
    return {
      title: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + formatMinutes(s.startTime || s.start_time),
      value: s.shift_id || s.id,
    };
  })
);

const selectedTab = ref('all');
const filteredRecords = computed(() => {
  if (selectedTab.value === 'all') return recordsWithDetails.value;
  return recordsWithDetails.value.filter(r => r.status === selectedTab.value);
});

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
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
  } catch (err) {
    console.error('Error loading time cards:', err);
    showSnackbar('Error loading time cards', 'error');
  } finally {
    loading.value = false;
  }
};

// ── CLOCK IN/OUT ──────────────────────────────────────────────────────────
const activeRecord = ref(null);
const clockLoading = ref(false);

const handleClockIn = async () => {
  if (!submitForm.value.shiftId) { showSnackbar('Please select a shift', 'error'); return; }
  clockLoading.value = true;
  try {
    const res = await EmployeeService.clockIn({ shiftId: submitForm.value.shiftId });
    activeRecord.value = res.data;
    showSnackbar('Clocked in successfully!', 'success');
    await loadData();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error clocking in', 'error');
  } finally { clockLoading.value = false; }
};

const handleClockOut = async (record) => {
  const id = record.id || record.clock_id;
  clockLoading.value = true;
  try {
    await EmployeeService.clockOut(id);
    showSnackbar('Clocked out! Your time card is pending review.', 'success');
    await loadData();
  } catch (err) {
    showSnackbar('Error clocking out', 'error');
  } finally { clockLoading.value = false; }
};

// ── HELPERS ───────────────────────────────────────────────────────────────
const formatMinutes = (min) => {
  if (!min && min !== 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`;
};

const statusColor = (s) => ({ pending: '#f57c00', approved: '#2e7d32', rejected: '#d32f2f', clocked_in: '#9C27B0', clocked_out: '#f57c00' }[s] || '#9e9e9e');
const statusLabel = (s) => ({ pending: 'Pending Review', approved: 'Approved', rejected: 'Rejected', clocked_in: 'Clocked In', clocked_out: 'Awaiting Review' }[s] || s);

const showSnackbar = (msg, color = 'success') => { snackMsg.value = msg; snackColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">My Time Cards</h1>
        <p class="text-body-2 text-grey">Track your hours and submit for manager review</p>
      </div>

      <!-- Submit window alert -->
      <v-alert
        v-if="!isSubmitDay"
        type="info"
        variant="tonal"
        color="#4361EE"
        density="compact"
        class="mb-4"
      >
        Time cards are typically submitted on <strong>Friday</strong> (end of work week) or <strong>Sunday</strong> (start of new week). You can still clock in and out any day.
      </v-alert>
      <v-alert
        v-else
        type="success"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        <v-icon start>mdi-calendar-check</v-icon>
        Today is a submit day! Review your hours and make sure everything is accurate.
      </v-alert>

      <!-- Summary chips -->
      <div class="d-flex flex-wrap ga-2 mb-5">
        <v-chip color="#12086F" variant="tonal" size="small">
          <v-icon start size="small">mdi-clock-outline</v-icon>
          {{ totalThisWeek }} hrs approved
        </v-chip>
        <v-chip color="#f57c00" variant="tonal" size="small">
          <v-icon start size="small">mdi-clock-alert-outline</v-icon>
          {{ pendingCount }} Pending
        </v-chip>
        <v-chip color="#2e7d32" variant="tonal" size="small">
          <v-icon start size="small">mdi-check-circle-outline</v-icon>
          {{ approvedCount }} Approved
        </v-chip>
      </div>

      <!-- Clock In/Out Quick Action -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-5">
        <v-card-title class="text-body-1 font-weight-bold pa-4 navy-text">
          <v-icon start size="18">mdi-login</v-icon>Quick Clock In
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-row align="center">
            <v-col cols="12" md="5">
              <v-select
                v-model="submitForm.shiftId"
                :items="shiftOptions"
                label="Select Shift"
                variant="outlined"
                density="compact"
                color="#12086F"
                :no-data-text="'No shifts found'"
              />
            </v-col>
            <v-col cols="12" md="4">
              <!-- Show clock out if there's an active clocked-in record -->
              <div v-if="recordsWithDetails.find(r => r.status === 'clocked_in')">
                <v-btn
                  color="error"
                  variant="flat"
                  block
                  :loading="clockLoading"
                  @click="handleClockOut(recordsWithDetails.find(r => r.status === 'clocked_in'))"
                >
                  <v-icon start>mdi-logout</v-icon>Clock Out
                </v-btn>
              </div>
              <div v-else>
                <v-btn color="#12086F" variant="flat" block :loading="clockLoading" @click="handleClockIn">
                  <v-icon start>mdi-login</v-icon>Clock In
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Records Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="all">All</v-tab>
          <v-tab value="pending">
            Pending
            <v-chip v-if="pendingCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-2">{{ pendingCount }}</v-chip>
          </v-tab>
          <v-tab value="approved">Approved</v-tab>
          <v-tab value="rejected">Rejected</v-tab>
        </v-tabs>
      </v-card>

      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-4">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" size="32" />
          </div>
          <div v-else-if="filteredRecords.length === 0" class="text-center py-10">
            <v-icon size="64" color="grey-lighten-2" class="mb-3">mdi-credit-card-clock-outline</v-icon>
            <div class="text-body-1 text-grey">No time cards yet</div>
            <div class="text-caption text-grey mt-1">Clock in to start tracking your hours</div>
          </div>
          <div v-else>
            <div v-for="r in filteredRecords" :key="r.id || r.clock_id" class="record-row pa-4 mb-3">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-avatar :color="statusColor(r.status)" size="40">
                    <v-icon color="white" size="20">mdi-clock-outline</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-body-2 font-weight-bold navy-text">{{ r.date }}</div>
                    <div class="text-caption text-grey">{{ r.clockInDisplay }} → {{ r.clockOutDisplay }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-body-2 font-weight-bold navy-text">{{ r.totalHours }}</div>
                  <v-chip :color="statusColor(r.status)" size="x-small" variant="tonal" class="mt-1">
                    {{ statusLabel(r.status) }}
                  </v-chip>
                </div>
              </div>
              <!-- Clock out button for active shifts -->
              <div v-if="r.status === 'clocked_in'" class="mt-3">
                <v-btn color="error" variant="tonal" size="small" :loading="clockLoading" @click="handleClockOut(r)">
                  <v-icon start>mdi-logout</v-icon>Clock Out Now
                </v-btn>
              </div>
              <div v-if="r.notes" class="text-caption text-grey mt-2">{{ r.notes }}</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.record-row { border: 1px solid #e0e0e0; border-radius: 8px; background: white; }
</style>