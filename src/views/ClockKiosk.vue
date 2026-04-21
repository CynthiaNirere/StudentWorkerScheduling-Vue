<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const user = ref(null);
const employees = ref([]);
const shifts = ref([]);
const clockRecords = ref([]);
const loading = ref(true);
const currentTime = ref('');
const currentDate = ref('');
const actionLoading = ref(null);

// ── PIN EXIT PROTECTION ───────────────────────────────────────────────────
const showExitDialog = ref(false);
const exitPin = ref('');
const pinError = ref('');
const pinLoading = ref(false);
// PIN is the last 4 digits of the employer's user_id, or a hardcoded fallback.
// In a real app this would be a stored PIN — for now we use a simple approach.
const KIOSK_EXIT_PIN = '1234'; // fallback default PIN

const snackbar = ref(false);
const snackMsg = ref('');
const snackColor = ref('success');

let timeInterval = null;
let pollInterval = null;

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  currentDate.value = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const todayStr = () => new Date().toISOString().split('T')[0];

const todayEmployees = computed(() => {
  const today = todayStr();
  const todayShifts = shifts.value.filter(s => {
    const d = new Date(Number(s.shiftTime || s.shift_time));
    return d.toISOString().split('T')[0] === today;
  });

  return employees.value
    .map(emp => {
      const empId = emp.user_id || emp.userId;
      const empShifts = todayShifts.filter(s => (s.user_id || s.userId) === empId);
      const activeRecord = clockRecords.value.find(r => (r.user_id || r.userId) === empId && r.status === 'clocked_in');
      const name = `${emp.fName || emp.first_name || ''} ${emp.lName || emp.last_name || ''}`.trim();
      return {
        id: empId,
        name: name || emp.email || 'Unknown',
        shifts: empShifts,
        activeRecord,
        isClockedIn: !!activeRecord,
      };
    })
    .filter(e => e.shifts.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
});

const formatShiftTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

const loadData = async () => {
  try {
    const [empRes, shiftRes, clockRes] = await Promise.all([
      EmployerService.getAllEmployees(),
      EmployerService.getAllShifts(),
      EmployerService.getAllClockRecords(),
    ]);
    employees.value = (Array.isArray(empRes.data) ? empRes.data : []).filter(u => u.role === 'employee');
    shifts.value = Array.isArray(shiftRes.data) ? shiftRes.data : [];
    clockRecords.value = Array.isArray(clockRes.data) ? clockRes.data : [];
  } catch (e) {
    console.error('Kiosk load error:', e);
  } finally {
    loading.value = false;
  }
};

const pollData = async () => {
  try {
    const [shiftRes, clockRes] = await Promise.all([
      EmployerService.getAllShifts(),
      EmployerService.getAllClockRecords(),
    ]);
    shifts.value = Array.isArray(shiftRes.data) ? shiftRes.data : [];
    clockRecords.value = Array.isArray(clockRes.data) ? clockRes.data : [];
  } catch {}
};

const handleClockAction = async (emp) => {
  actionLoading.value = emp.id;
  try {
    if (emp.isClockedIn) {
      await EmployerService.kioskClockOut({ userId: emp.id });
      snackMsg.value = `${emp.name} clocked out`;
      snackColor.value = 'info';
    } else {
      const shiftId = emp.shifts[0]?.shift_id || emp.shifts[0]?.id;
      if (!shiftId) {
        snackMsg.value = 'No shift found for today';
        snackColor.value = 'error';
        snackbar.value = true;
        return;
      }
      await EmployerService.kioskClockIn({ userId: emp.id, shiftId });
      snackMsg.value = `${emp.name} clocked in`;
      snackColor.value = 'success';
    }
    snackbar.value = true;
    await pollData();
  } catch (err) {
    snackMsg.value = err.response?.data?.message || 'Clock action failed';
    snackColor.value = 'error';
    snackbar.value = true;
  } finally {
    actionLoading.value = null;
  }
};

// ── EXIT KIOSK (PIN protected) ────────────────────────────────────────────
const promptExitKiosk = () => {
  exitPin.value = '';
  pinError.value = '';
  showExitDialog.value = true;
};

const confirmExitKiosk = () => {
  pinLoading.value = true;
  pinError.value = '';

  // Get the stored PIN — use last 4 digits of employer user_id as default,
  // or the stored kiosk PIN from localStorage if set
  const storedPin = localStorage.getItem('kioskExitPin') || KIOSK_EXIT_PIN;

  setTimeout(() => {
    if (exitPin.value === storedPin) {
      showExitDialog.value = false;
      exitPin.value = '';
      router.push({ name: 'employerSettings' });
    } else {
      pinError.value = 'Incorrect PIN. Please try again.';
      exitPin.value = '';
    }
    pinLoading.value = false;
  }, 400); // small delay for UX feel
};

const cancelExit = () => {
  showExitDialog.value = false;
  exitPin.value = '';
  pinError.value = '';
};

onMounted(async () => {
  user.value = Utils.getStore('user');
  if (!user.value || user.value.role !== 'employer') {
    router.push({ name: 'login' });
    return;
  }
  if (localStorage.getItem('isWorkDevice') !== 'true') {
    router.push({ name: 'employerSettings' });
    return;
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
    <!-- Top bar -->
    <div class="kiosk-header">
      <div class="d-flex align-center ga-3">
        <v-icon size="28" color="white">mdi-clock-check-outline</v-icon>
        <span class="text-h6 font-weight-bold text-white">Clock-In Kiosk</span>
      </div>
      <div class="text-center">
        <div class="text-h3 font-weight-bold text-white kiosk-time">{{ currentTime }}</div>
        <div class="text-body-2 text-white" style="opacity:0.8;">{{ currentDate }}</div>
      </div>
      <!-- Exit button now requires PIN — employees can't tap out of kiosk -->
      <v-btn variant="tonal" color="white" prepend-icon="mdi-lock" @click="promptExitKiosk">
        Exit Kiosk
      </v-btn>
    </div>

    <!-- Content -->
    <div class="kiosk-body">
      <div v-if="loading" class="d-flex justify-center align-center" style="height:60vh;">
        <v-progress-circular indeterminate size="64" color="#12086F" />
      </div>

      <div v-else-if="todayEmployees.length === 0" class="d-flex flex-column justify-center align-center" style="height:60vh;">
        <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-calendar-remove-outline</v-icon>
        <div class="text-h5 font-weight-bold text-grey-darken-1 mb-2">No Shifts Today</div>
        <div class="text-body-1 text-grey">No employees are scheduled for today.</div>
      </div>

      <div v-else>
        <div class="text-body-1 font-weight-bold mb-4" style="color:#12086F;">
          {{ todayEmployees.length }} employee{{ todayEmployees.length !== 1 ? 's' : '' }} scheduled today
        </div>
        <v-row>
          <v-col
            v-for="emp in todayEmployees"
            :key="emp.id"
            cols="12" sm="6" md="4" lg="3"
          >
            <v-card
              rounded="xl"
              :color="emp.isClockedIn ? '#E8F5E9' : '#FFF'"
              :variant="emp.isClockedIn ? 'flat' : 'outlined'"
              class="employee-card pa-5"
              :class="{ 'clocked-in-card': emp.isClockedIn }"
              @click="handleClockAction(emp)"
              :loading="actionLoading === emp.id"
              :disabled="actionLoading !== null && actionLoading !== emp.id"
            >
              <div class="d-flex align-center ga-3 mb-3">
                <v-avatar :color="emp.isClockedIn ? '#2E7D32' : '#12086F'" size="48">
                  <span class="text-white font-weight-bold text-body-1">
                    {{ emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1 min-width-0">
                  <div class="text-body-1 font-weight-bold text-truncate">{{ emp.name }}</div>
                  <div class="text-caption text-grey">
                    {{ emp.shifts.map(s => `${formatShiftTime(s.startTime || s.start_time)} – ${formatShiftTime(s.endTime || s.end_time)}`).join(', ') }}
                  </div>
                </div>
              </div>

              <v-chip
                :color="emp.isClockedIn ? '#2E7D32' : '#f57c00'"
                variant="tonal"
                size="small"
                :prepend-icon="emp.isClockedIn ? 'mdi-check-circle' : 'mdi-circle-outline'"
                class="mb-3"
              >
                {{ emp.isClockedIn ? 'Clocked In' : 'Not Clocked In' }}
              </v-chip>

              <v-btn
                block
                :color="emp.isClockedIn ? '#D32F2F' : '#2E7D32'"
                variant="flat"
                size="large"
                :prepend-icon="emp.isClockedIn ? 'mdi-logout' : 'mdi-login'"
                :loading="actionLoading === emp.id"
                class="text-none"
              >
                {{ emp.isClockedIn ? 'Clock Out' : 'Clock In' }}
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </div>

    <!-- PIN Exit Dialog -->
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
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(18, 8, 111, 0.12);
}

.clocked-in-card {
  border-color: #2E7D32 !important;
}

.min-width-0 { min-width: 0; }
</style>