<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const user    = ref(null);
const loading = ref(false);

// ── DATA ──────────────────────────────────────────────────────────────────
const timeOffRequests = ref([]);
const swapRequests    = ref([]);
const myShifts        = ref([]);
const allEmployees    = ref([]);

// ── NEW REQUEST DIALOG ────────────────────────────────────────────────────
const showDialog   = ref(false);
const requestType  = ref('timeoff'); // 'timeoff' | 'swap'
const submitting   = ref(false);

const timeOffForm = ref({ startDate: '', endDate: '', reason: '' });
const swapForm    = ref({ shiftId: '', reason: '' });

// ── TABS ──────────────────────────────────────────────────────────────────
const selectedTab = ref('all');

const allRequests = computed(() => {
  const to = timeOffRequests.value.map(r => ({
    ...r,
    _type: 'timeoff',
    _id: r.request_id || r.id,
    _title: 'Time Off Request',
    _icon: 'mdi-calendar-remove',
    _color: '#4361EE',
    _date: formatDate(r.start_date || r.startDate),
    _detail: `${formatDate(r.start_date || r.startDate)} – ${formatDate(r.end_date || r.endDate)}`,
    _reason: r.reason || '',
    _status: r.status || 'pending',
    _created: r.created_at || r.createdAt,
  }));
  const sw = swapRequests.value.map(r => ({
    ...r,
    _type: 'swap',
    _id: r.swap_id || r.id,
    _title: 'Shift Swap Request',
    _icon: 'mdi-swap-horizontal',
    _color: '#f57c00',
    _date: formatDate(r.created_at || r.createdAt),
    _detail: r.requestingUserName ? `Requested by ${r.requestingUserName}` : 'Swap request',
    _reason: r.reason || '',
    _status: r.status || 'pending',
    _created: r.created_at || r.createdAt,
  }));
  return [...to, ...sw].sort((a, b) => Number(b._created) - Number(a._created));
});

const filteredRequests = computed(() => {
  if (selectedTab.value === 'all') return allRequests.value;
  if (selectedTab.value === 'timeoff') return allRequests.value.filter(r => r._type === 'timeoff');
  if (selectedTab.value === 'swap') return allRequests.value.filter(r => r._type === 'swap');
  return allRequests.value.filter(r => r._status === selectedTab.value);
});

const pendingCount = computed(() => allRequests.value.filter(r => r._status === 'pending').length);

const myShiftOptions = computed(() =>
  myShifts.value.map(s => {
    const d = new Date(Number(s.shiftTime || s.shift_time));
    const start = formatMinutes(s.startTime || s.start_time);
    return {
      title: `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${start}`,
      value: s.shift_id || s.id,
    };
  })
);

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadAll();
});

const loadAll = async () => {
  loading.value = true;
  try {
    const userId = user.value?.user_id || user.value?.userId;
    const [toRes, swapRes, shiftRes] = await Promise.all([
      EmployeeService.getMyTimeOffRequests(),
      EmployeeService.getMySwapRequests(),
      EmployeeService.getMyShifts(),
    ]);
    const allTo = Array.isArray(toRes.data) ? toRes.data : [];
    timeOffRequests.value = allTo.filter(r => (r.user_id || r.userId) === userId);

    const allSwaps = Array.isArray(swapRes.data) ? swapRes.data : [];
    swapRequests.value = allSwaps.filter(s => {
      const reqUserId = s.swapUser?.requestingUser?.id;
      return reqUserId === userId;
    });

    const allShifts = Array.isArray(shiftRes.data) ? shiftRes.data : [];
    myShifts.value = allShifts.filter(s => (s.user_id || s.userId) === userId);
  } catch (err) {
    console.error('Error loading requests:', err);
  } finally {
    loading.value = false;
  }
};

// ── SUBMIT ─────────────────────────────────────────────────────────────────
const openDialog = (type = 'timeoff') => {
  requestType.value = type;
  timeOffForm.value = { startDate: '', endDate: '', reason: '' };
  swapForm.value = { shiftId: '', reason: '' };
  showDialog.value = true;
};

const submitRequest = async () => {
  submitting.value = true;
  try {
    if (requestType.value === 'timeoff') {
      if (!timeOffForm.value.startDate || !timeOffForm.value.endDate) {
        showSnackbar('Start and end date are required', 'error');
        return;
      }
      const start = new Date(timeOffForm.value.startDate).getTime();
      const end   = new Date(timeOffForm.value.endDate).getTime();
      await EmployeeService.createTimeOffRequest({ startDate: start, endDate: end, reason: timeOffForm.value.reason || null });
      showSnackbar('Time off request submitted!', 'success');
    } else {
      if (!swapForm.value.shiftId) {
        showSnackbar('Please select a shift', 'error');
        return;
      }
      await EmployeeService.createSwapRequest({ originalShiftId: swapForm.value.shiftId, reason: swapForm.value.reason || null });
      showSnackbar('Shift swap request submitted!', 'success');
    }
    showDialog.value = false;
    window.dispatchEvent(new Event('notifications-updated'));
    await loadAll();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error submitting request', 'error');
  } finally {
    submitting.value = false;
  }
};

const cancelRequest = async (req) => {
  try {
    if (req._type === 'timeoff') {
      await EmployeeService.deleteTimeOffRequest(req._id);
    } else {
      await EmployeeService.cancelSwapRequest(req._id);
    }
    showSnackbar('Request cancelled', 'success');
    await loadAll();
  } catch (err) {
    showSnackbar('Error cancelling request', 'error');
  }
};

// ── HELPERS ───────────────────────────────────────────────────────────────
const formatDate = (ts) => {
  if (!ts) return '—';
  return new Date(Number(ts)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMinutes = (min) => {
  if (!min && min !== 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`;
};

const statusColor = (s) => ({ pending: '#f57c00', approved: '#2e7d32', denied: '#d32f2f', accepted: '#4361EE', rejected: '#d32f2f', cancelled: '#9e9e9e' }[s] || 'grey');

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');
const showSnackbar = (msg, color = 'success') => { snackMsg.value = msg; snackColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Time Requests</h1>
          <p class="text-body-2 text-grey">Manage your time off and shift swap requests</p>
        </div>
        <!-- ✅ Split button dropdown to choose request type -->
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn color="#12086F" variant="flat" prepend-icon="mdi-plus" v-bind="props">
              New Request
              <v-icon end>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-calendar-remove" @click="openDialog('timeoff')">
              <v-list-item-title>Request Time Off</v-list-item-title>
              <v-list-item-subtitle>Days off, vacation, sick leave</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-swap-horizontal" @click="openDialog('swap')">
              <v-list-item-title>Request Shift Swap</v-list-item-title>
              <v-list-item-subtitle>Trade or drop a shift</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <!-- Summary chips -->
      <div class="d-flex flex-wrap ga-2 mb-5">
        <v-chip color="#12086F" variant="tonal" size="small">
          <v-icon start size="small">mdi-format-list-bulleted</v-icon>{{ allRequests.length }} Total
        </v-chip>
        <v-chip color="#f57c00" variant="tonal" size="small">
          <v-icon start size="small">mdi-clock-alert-outline</v-icon>{{ pendingCount }} Pending
        </v-chip>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="all">All<v-chip v-if="allRequests.length" size="x-small" color="#12086F" variant="tonal" class="ml-2">{{ allRequests.length }}</v-chip></v-tab>
          <v-tab value="pending">Pending<v-chip v-if="pendingCount" size="x-small" color="#f57c00" variant="tonal" class="ml-2">{{ pendingCount }}</v-chip></v-tab>
          <v-tab value="timeoff">Time Off</v-tab>
          <v-tab value="swap">Shift Swaps</v-tab>
        </v-tabs>
      </v-card>

      <!-- List -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-4">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" size="32" />
          </div>
          <div v-else-if="filteredRequests.length === 0" class="text-center py-10">
            <v-icon size="64" color="grey-lighten-2" class="mb-3">mdi-calendar-check-outline</v-icon>
            <div class="text-body-1 text-grey">No requests found</div>
            <div class="text-caption text-grey mt-1">Click "New Request" to submit one</div>
          </div>
          <div v-else>
            <div
              v-for="req in filteredRequests"
              :key="req._id + req._type"
              class="request-item pa-4 mb-3"
              :class="{ 'request-pending': req._status === 'pending' }"
            >
              <div class="d-flex ga-3 align-start">
                <v-avatar :color="req._color" size="40">
                  <v-icon color="white">{{ req._icon }}</v-icon>
                </v-avatar>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-start mb-1">
                    <div>
                      <v-chip :color="req._color" size="x-small" variant="tonal" class="mb-1">{{ req._title }}</v-chip>
                      <div class="text-body-2 font-weight-bold navy-text">{{ req._detail }}</div>
                    </div>
                    <v-chip :color="statusColor(req._status)" size="x-small" variant="tonal">{{ req._status }}</v-chip>
                  </div>
                  <div v-if="req._reason" class="text-caption text-grey mb-1">
                    <strong>Reason:</strong> {{ req._reason }}
                  </div>
                  <div class="text-caption text-grey">{{ formatDate(req._created) }}</div>
                </div>
                <v-btn
                  v-if="req._status === 'pending'"
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="cancelRequest(req)"
                />
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- New Request Dialog -->
    <v-dialog v-model="showDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-4 navy-text font-weight-bold">
          <v-icon start>{{ requestType === 'timeoff' ? 'mdi-calendar-remove' : 'mdi-swap-horizontal' }}</v-icon>
          {{ requestType === 'timeoff' ? 'Request Time Off' : 'Request Shift Swap' }}
        </v-card-title>
        <v-divider />

        <!-- Type selector inside dialog -->
        <v-card-text class="pa-5">
          <v-btn-toggle v-model="requestType" color="#12086F" variant="outlined" mandatory divided class="mb-5" style="width:100%">
            <v-btn value="timeoff" style="flex:1">
              <v-icon start size="small">mdi-calendar-remove</v-icon>Time Off
            </v-btn>
            <v-btn value="swap" style="flex:1">
              <v-icon start size="small">mdi-swap-horizontal</v-icon>Shift Swap
            </v-btn>
          </v-btn-toggle>

          <!-- Time Off form -->
          <template v-if="requestType === 'timeoff'">
            <v-text-field v-model="timeOffForm.startDate" label="Start Date *" type="date" variant="outlined" density="compact" class="mb-3" color="#12086F" />
            <v-text-field v-model="timeOffForm.endDate" label="End Date *" type="date" variant="outlined" density="compact" class="mb-3" color="#12086F" />
            <v-textarea v-model="timeOffForm.reason" label="Reason (optional)" variant="outlined" density="compact" rows="2" color="#12086F" />
          </template>

          <!-- Swap form -->
          <template v-else>
            <v-select
              v-model="swapForm.shiftId"
              :items="myShiftOptions"
              label="Select Shift to Swap *"
              variant="outlined"
              density="compact"
              class="mb-3"
              color="#12086F"
              :no-data-text="'No upcoming shifts found'"
            />
            <v-textarea v-model="swapForm.reason" label="Reason (optional)" variant="outlined" density="compact" rows="2" color="#12086F" />
            <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mt-3">
              Your manager will be notified to find a replacement for this shift.
            </v-alert>
          </template>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="submitting" @click="submitRequest">Submit Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.request-item { border: 1px solid #e0e0e0; border-radius: 8px; background: white; transition: all 0.2s; }
.request-item:hover { border-color: #12086F; box-shadow: 0 2px 8px rgba(18,8,111,0.08); }
.request-pending { border-left: 4px solid #f57c00; background: #fff8f3; }
</style>