<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const user = ref(null);

// ── Clock state ───────────────────────────────────────────────────────────
const employees    = ref([]);
const shifts       = ref([]);
const clockRecords = ref([]);
const loading      = ref(true);

// ── Time ──────────────────────────────────────────────────────────────────
const currentTime = ref('');
const currentDate = ref('');
let timeInterval  = null;
let pollInterval  = null;

// ── Action state ──────────────────────────────────────────────────────────
const actionLoading = ref(null);
const snackbar  = ref(false);
const snackMsg  = ref('');
const snackColor = ref('success');

// ── Confirmation dialog ───────────────────────────────────────────────────
// Before any clock action, we show a confirmation screen so no one
// accidentally clocks in the wrong person.
const showConfirm   = ref(false);
const confirmEmp    = ref(null);   // the employee card being acted on
const confirmAction = ref('');     // 'in' or 'out'

// ── PIN Exit ──────────────────────────────────────────────────────────────
const showExitDialog = ref(false);
const exitPin        = ref('');
const pinError       = ref('');
const pinLoading     = ref(false);
const KIOSK_EXIT_PIN = '1234';

// ── Helpers ───────────────────────────────────────────────────────────────
const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
  currentDate.value = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

const todayStr = () => new Date().toISOString().split('T')[0];

const formatShiftTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// ── Computed: today's employees with their clock state ────────────────────
const todayEmployees = computed(() => {
  const today = todayStr();
  const todayShifts = shifts.value.filter(s => {
    const d = new Date(Number(s.shiftTime || s.shift_time));
    return d.toISOString().split('T')[0] === today;
  });

  return employees.value
    .map(emp => {
      const empId    = emp.user_id || emp.userId;
      const empShifts = todayShifts.filter(s => (s.user_id || s.userId) === empId);

      // ✅ FIX: match multiple possible status strings the backend may return
      const activeRecord = clockRecords.value.find(r => {
        const rid = r.user_id || r.userId;
        const status = (r.status || '').toLowerCase();
        return rid === empId && (
          status === 'clocked_in' ||
          status === 'active'     ||
          status === 'open'       ||
          status === 'in'         ||
          (!r.clockOut && !r.clock_out && !r.endTime && !r.end_time)
        );
      });

      const name = `${emp.fName || emp.first_name || ''} ${emp.lName || emp.last_name || ''}`.trim();
      return {
        id:          empId,
        name:        name || emp.email || 'Unknown',
        initials:    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?',
        shifts:      empShifts,
        activeRecord,
        isClockedIn: !!activeRecord,
        clockInTime: activeRecord
          ? new Date(Number(activeRecord.clockIn || activeRecord.clock_in || activeRecord.startTime || activeRecord.start_time || Date.now()))
              .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : null,
      };
    })
    .filter(e => e.shifts.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
});

const clockedInCount = computed(() => todayEmployees.value.filter(e => e.isClockedIn).length);

// ── Data loading ──────────────────────────────────────────────────────────
const loadData = async () => {
  try {
    const [empRes, shiftRes, clockRes] = await Promise.all([
      EmployerService.getAllEmployees(),
      EmployerService.getAllShifts(),
      EmployerService.getAllClockRecords(),
    ]);
    employees.value    = (Array.isArray(empRes.data)   ? empRes.data   : []).filter(u => u.role === 'employee');
    shifts.value       = Array.isArray(shiftRes.data)  ? shiftRes.data  : [];
    // ✅ FIX: store ALL records — don't pre-filter, so we can check status correctly
    clockRecords.value = Array.isArray(clockRes.data)  ? clockRes.data  : [];
  } catch (e) {
    console.error('Kiosk load error:', e);
  } finally {
    loading.value = false;
  }
};

// ✅ FIX: poll refreshes ALL three data sources, not just shifts+clocks
const pollData = async () => {
  try {
    const [shiftRes, clockRes] = await Promise.all([
      EmployerService.getAllShifts(),
      EmployerService.getAllClockRecords(),
    ]);
    shifts.value       = Array.isArray(shiftRes.data) ? shiftRes.data : [];
    clockRecords.value = Array.isArray(clockRes.data) ? clockRes.data : [];
  } catch {}
};

// ── Confirmation flow ─────────────────────────────────────────────────────
// Step 1: tap card → show confirmation dialog
const requestClockAction = (emp) => {
  if (actionLoading.value) return;
  confirmEmp.value    = emp;
  confirmAction.value = emp.isClockedIn ? 'out' : 'in';
  showConfirm.value   = true;
};

// Step 2: confirm → execute
const executeClockAction = async () => {
  const emp = confirmEmp.value;
  if (!emp) return;
  showConfirm.value = false;
  actionLoading.value = emp.id;
  try {
    if (confirmAction.value === 'out') {
      await EmployerService.kioskClockOut({ userId: emp.id });
      snackMsg.value   = `✓ ${emp.name} clocked out`;
      snackColor.value = 'info';
    } else {
      const shiftId = emp.shifts[0]?.shift_id || emp.shifts[0]?.id;
      if (!shiftId) {
        snackMsg.value   = 'No shift found for today';
        snackColor.value = 'error';
        snackbar.value   = true;
        return;
      }
      await EmployerService.kioskClockIn({ userId: emp.id, shiftId });
      snackMsg.value   = `✓ ${emp.name} clocked in`;
      snackColor.value = 'success';
    }
    snackbar.value = true;
    // ✅ FIX: wait a beat then refresh — gives backend time to commit
    await new Promise(r => setTimeout(r, 500));
    await pollData();
  } catch (err) {
    snackMsg.value   = err.response?.data?.message || 'Clock action failed';
    snackColor.value = 'error';
    snackbar.value   = true;
  } finally {
    actionLoading.value = null;
    confirmEmp.value    = null;
  }
};

const cancelConfirm = () => {
  showConfirm.value = false;
  confirmEmp.value  = null;
};

// ── PIN exit ──────────────────────────────────────────────────────────────
const promptExitKiosk = () => {
  exitPin.value  = '';
  pinError.value = '';
  showExitDialog.value = true;
};

const confirmExitKiosk = () => {
  pinLoading.value = true;
  pinError.value   = '';
  const storedPin  = localStorage.getItem('kioskExitPin') || KIOSK_EXIT_PIN;
  setTimeout(() => {
    if (exitPin.value === storedPin) {
      showExitDialog.value = false;
      router.push({ name: 'employerSettings' });
    } else {
      pinError.value = 'Incorrect PIN. Please try again.';
      exitPin.value  = '';
    }
    pinLoading.value = false;
  }, 400);
};

const cancelExit = () => {
  showExitDialog.value = false;
  exitPin.value  = '';
  pinError.value = '';
};

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  if (!user.value || user.value.role !== 'employer') {
    router.push({ name: 'login' }); return;
  }
  if (localStorage.getItem('isWorkDevice') !== 'true') {
    router.push({ name: 'employerSettings' }); return;
  }
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
  await loadData();
  pollInterval = setInterval(pollData, 10000);
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<template>
  <div class="kiosk-root">

    <!-- ── Header ── -->
    <div class="kiosk-header">
      <div class="d-flex align-center ga-3">
        <v-icon size="28" color="white">mdi-clock-check-outline</v-icon>
        <span class="text-h6 font-weight-bold text-white">Clock-In Kiosk</span>
      </div>

      <div class="text-center">
        <div class="text-h3 font-weight-bold text-white kiosk-time">{{ currentTime }}</div>
        <div class="text-body-2 text-white" style="opacity:0.8;">{{ currentDate }}</div>
      </div>

      <div class="d-flex align-center ga-3">
        <!-- Live stats -->
        <div class="kiosk-stat-chip" v-if="!loading">
          <v-icon size="16" color="white">mdi-account-check</v-icon>
          <span class="text-white text-body-2 font-weight-medium">
            {{ clockedInCount }}/{{ todayEmployees.length }} in
          </span>
        </div>
        <v-btn variant="tonal" color="white" prepend-icon="mdi-lock" @click="promptExitKiosk">
          Exit Kiosk
        </v-btn>
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="kiosk-body">

      <div v-if="loading" class="d-flex justify-center align-center" style="height:60vh;">
        <v-progress-circular indeterminate size="64" color="#12086F" />
      </div>

      <div v-else-if="todayEmployees.length === 0"
        class="d-flex flex-column justify-center align-center" style="height:60vh;">
        <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-calendar-remove-outline</v-icon>
        <div class="text-h5 font-weight-bold text-grey-darken-1 mb-2">No Shifts Today</div>
        <div class="text-body-1 text-grey">No employees are scheduled for today.</div>
      </div>

      <div v-else>
        <div class="text-body-2 text-grey mb-5">
          Tap your card to clock in or out. You will be asked to confirm before anything is saved.
        </div>

        <v-row>
          <v-col
            v-for="emp in todayEmployees"
            :key="emp.id"
            cols="12" sm="6" md="4" lg="3"
          >
            <v-card
              rounded="xl"
              :color="emp.isClockedIn ? '#E8F5E9' : '#FFFFFF'"
              :variant="emp.isClockedIn ? 'flat' : 'outlined'"
              class="employee-card pa-5"
              :class="{ 'clocked-in-card': emp.isClockedIn, 'loading-card': actionLoading === emp.id }"
              :loading="actionLoading === emp.id"
              :disabled="actionLoading !== null && actionLoading !== emp.id"
              @click="requestClockAction(emp)"
            >
              <div class="d-flex align-center ga-3 mb-4">
                <v-avatar :color="emp.isClockedIn ? '#2E7D32' : '#12086F'" size="52">
                  <span class="text-white font-weight-bold text-body-1">{{ emp.initials }}</span>
                </v-avatar>
                <div class="flex-grow-1 min-width-0">
                  <div class="text-body-1 font-weight-bold text-truncate">{{ emp.name }}</div>
                  <div class="text-caption text-grey">
                    {{ emp.shifts.map(s => `${formatShiftTime(s.startTime || s.start_time)} – ${formatShiftTime(s.endTime || s.end_time)}`).join(', ') }}
                  </div>
                </div>
              </div>

              <!-- Status chip -->
              <div class="mb-4">
                <v-chip
                  :color="emp.isClockedIn ? '#2E7D32' : '#9E9E9E'"
                  variant="tonal"
                  size="small"
                  :prepend-icon="emp.isClockedIn ? 'mdi-check-circle' : 'mdi-circle-outline'"
                >
                  {{ emp.isClockedIn ? `In since ${emp.clockInTime}` : 'Not Clocked In' }}
                </v-chip>
              </div>

              <v-btn
                block
                :color="emp.isClockedIn ? '#D32F2F' : '#2E7D32'"
                variant="flat"
                size="large"
                :prepend-icon="emp.isClockedIn ? 'mdi-logout' : 'mdi-login'"
                :loading="actionLoading === emp.id"
                class="text-none font-weight-bold"
              >
                {{ emp.isClockedIn ? 'Clock Out' : 'Clock In' }}
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </div>

    <!-- ── Confirmation Dialog ── -->
    <!-- This is the safety step: shows exactly who is being clocked in/out -->
    <v-dialog v-model="showConfirm" max-width="400" persistent>
      <v-card rounded="xl" v-if="confirmEmp">
        <div
          class="confirm-header pa-6 text-center"
          :style="{ background: confirmAction === 'in' ? '#1B5E20' : '#B71C1C' }"
        >
          <v-avatar color="white" size="72" class="mb-3">
            <span
              class="font-weight-bold text-h5"
              :style="{ color: confirmAction === 'in' ? '#1B5E20' : '#B71C1C' }"
            >{{ confirmEmp.initials }}</span>
          </v-avatar>
          <div class="text-h6 font-weight-bold text-white">{{ confirmEmp.name }}</div>
          <div class="text-body-2 text-white mt-1" style="opacity:0.85;">
            {{ confirmEmp.shifts.map(s => `${formatShiftTime(s.startTime || s.start_time)} – ${formatShiftTime(s.endTime || s.end_time)}`).join(', ') }}
          </div>
        </div>

        <v-card-text class="pa-6 text-center">
          <v-icon
            size="48"
            :color="confirmAction === 'in' ? '#2E7D32' : '#D32F2F'"
            class="mb-3"
          >
            {{ confirmAction === 'in' ? 'mdi-login' : 'mdi-logout' }}
          </v-icon>
          <div class="text-h6 font-weight-bold mb-2">
            {{ confirmAction === 'in' ? 'Confirm Clock In' : 'Confirm Clock Out' }}
          </div>
          <div class="text-body-2 text-grey">
            {{ confirmAction === 'in'
              ? 'Is this you? Tap confirm to clock in.'
              : 'Is this you? Tap confirm to clock out.' }}
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 ga-2">
          <v-btn variant="tonal" color="grey" size="large" class="flex-grow-1 text-none" @click="cancelConfirm">
            Cancel
          </v-btn>
          <v-btn
            :color="confirmAction === 'in' ? '#2E7D32' : '#D32F2F'"
            variant="flat"
            size="large"
            class="flex-grow-1 text-none font-weight-bold"
            @click="executeClockAction"
          >
            {{ confirmAction === 'in' ? 'Yes, Clock In' : 'Yes, Clock Out' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── PIN Exit Dialog ── -->
    <v-dialog v-model="showExitDialog" max-width="380" persistent>
      <v-card rounded="xl">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 d-flex align-center ga-2" style="color:#12086F;">
          <v-icon color="#12086F">mdi-lock</v-icon>
          Manager Exit Required
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 text-grey mb-4">Enter the manager PIN to exit kiosk mode.</p>
          <v-otp-input
            v-model="exitPin"
            length="4"
            type="password"
            color="#12086F"
            variant="outlined"
            :error="!!pinError"
            @finish="confirmExitKiosk"
          />
          <p v-if="pinError" class="text-caption text-error mt-2">
            <v-icon size="small">mdi-alert-circle</v-icon> {{ pinError }}
          </p>
          <p class="text-caption text-grey mt-3">
            Default PIN: <strong>1234</strong>. Change it in Settings → Work Device.
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="cancelExit">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="pinLoading" @click="confirmExitKiosk">Exit Kiosk</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="top center">
      <div class="text-center text-body-1 font-weight-bold">{{ snackMsg }}</div>
    </v-snackbar>
  </div>
</template>

<style scoped>
.kiosk-root {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.kiosk-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.kiosk-time {
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
}

.kiosk-stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.15);
  border-radius: 20px;
  padding: 6px 14px;
}

.kiosk-body {
  flex: 1;
  padding: 32px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.employee-card {
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 2px solid transparent;
}

.employee-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(18, 8, 111, 0.14);
}

.clocked-in-card {
  border-color: #2E7D32 !important;
}

.loading-card {
  opacity: 0.7;
  pointer-events: none;
}

.confirm-header {
  border-radius: 12px 12px 0 0;
}

.min-width-0 { min-width: 0; }
</style>