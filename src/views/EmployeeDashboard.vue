
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const router = useRouter();
const user   = ref(null);
const loading = ref(true);

// ── DATA ──────────────────────────────────────────────────────────────────
const myShifts       = ref([]);
const myTasks        = ref([]);
const pendingTimeOff = ref([]);
const pendingSwaps   = ref([]);

// ── CLOCK STATE ───────────────────────────────────────────────────────────
const currentTime      = ref('');
const currentDate      = ref('');
const activeClockRecord = ref(null);
const clockLoading     = ref(false);
const isWorkDevice     = ref(false);
const clockedInAt      = ref(null);
const elapsedTime      = ref('00:00:00');
const hoursRemaining   = ref('');
const minutesRemaining = ref(0);

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  currentDate.value = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Elapsed timer
  if (clockedInAt.value) {
    const diff = now - clockedInAt.value;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    elapsedTime.value = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // Time remaining until shift end
  if (activeClockRecord.value && todayDay.value?.shifts?.length) {
    const shift = todayDay.value.shifts[0];
    const endMin = shift.endTime || shift.end_time;
    if (endMin != null) {
      const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
      const endMs = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(),
        Math.floor(endMin / 60), endMin % 60, 0).getTime();
      const diffMs = endMs - now.getTime();
      if (diffMs > 0) {
        const rh = Math.floor(diffMs / 3600000);
        const rm = Math.floor((diffMs % 3600000) / 60000);
        hoursRemaining.value = rh > 0 ? `${rh}h ${rm}m` : `${rm}m`;
        minutesRemaining.value = Math.floor(diffMs / 60000);
      } else {
        hoursRemaining.value = '0m';
        minutesRemaining.value = 0;
      }
    }
  }
};

// ── WEEK NAVIGATION ───────────────────────────────────────────────────────
const viewMode = ref('week'); // 'day' | 'week'
const selectedWeek = ref(new Date());

const weekDays = computed(() => {
  const sunday = getSunday(selectedWeek.value);
  const today = new Date().toISOString().split('T')[0];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    const dayShifts = myShifts.value.filter(s => {
      const st = new Date(Number(s.shiftTime || s.shift_time));
      return st.toISOString().split('T')[0] === ds;
    }).sort((a, b) => (a.startTime || a.start_time) - (b.startTime || b.start_time));
    return {
      label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],
      full: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i],
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      dateString: ds,
      isToday: ds === today,
      shifts: dayShifts,
    };
  });
});

const todayDay = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  return weekDays.value.find(d => d.dateString === today) || weekDays.value[0];
});

const displayDays = computed(() =>
  viewMode.value === 'day' ? [todayDay.value] : weekDays.value
);

const weekLabel = computed(() => {
  const days = weekDays.value;
  const s = days[0];
  const e = days[6];
  if (s.month === e.month) return `${s.month} ${s.dateNum} – ${e.dateNum}, ${s.dateNum < 10 ? new Date().getFullYear() : new Date().getFullYear()}`;
  return `${s.month} ${s.dateNum} – ${e.month} ${e.dateNum}`;
});

// ── COMPUTED ──────────────────────────────────────────────────────────────
const userGreeting = computed(() => user.value?.fName || user.value?.first_name || 'there');

const pendingCount = computed(() => pendingTimeOff.value.length + pendingSwaps.value.length);

const assignedTasks = computed(() =>
  myTasks.value.filter(t => {
    const assignedTo = t.assignedTo || t.assigned_to;
    const userId = user.value?.user_id || user.value?.userId;
    return assignedTo === userId || !assignedTo;
  }).slice(0, 3)
);

const nextShift = computed(() => {
  const now = Date.now();
  const upcoming = myShifts.value
    .filter(s => Number(s.shiftTime || s.shift_time) > now)
    .sort((a, b) => Number(a.shiftTime || a.shift_time) - Number(b.shiftTime || b.shift_time));
  if (!upcoming.length) return null;
  const s = upcoming[0];
  const d = new Date(Number(s.shiftTime || s.shift_time));
  return { shift: s, dateLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) };
});

// ── DATA LOADING ──────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  isWorkDevice.value = localStorage.getItem('isWorkDevice') === 'true';
  updateTime();
  setInterval(updateTime, 1000);
  await Promise.all([loadShifts(), loadTasks(), loadRequests()]);
  loading.value = false;
  // Auto clock-in on work device if shift today and not already clocked in
  if (isWorkDevice.value && !activeClockRecord.value && todayDay.value?.shifts?.length) {
    await handleClockIn();
  }
});

const loadShifts = async () => {
  try {
    const res = await EmployeeService.getMyShifts();
    const all = Array.isArray(res.data) ? res.data : [];
    const userId = user.value?.user_id || user.value?.userId;
    myShifts.value = all.filter(s => (s.user_id || s.userId) === userId);
  } catch (err) { console.error('Shifts error:', err); }
};

const loadTasks = async () => {
  try {
    const res = await EmployeeService.getMyTaskLists();
    myTasks.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) { console.error('Tasks error:', err); }
};

const loadRequests = async () => {
  try {
    const [toRes, swapRes] = await Promise.all([
      EmployeeService.getMyTimeOffRequests(),
      EmployeeService.getMySwapRequests(),
    ]);
    const userId = user.value?.user_id || user.value?.userId;
    const allTo = Array.isArray(toRes.data) ? toRes.data : [];
    const allSwaps = Array.isArray(swapRes.data) ? swapRes.data : [];
    pendingTimeOff.value = allTo.filter(r => {
      const rUserId = r.user_id || r.userId;
      return rUserId === userId && r.status === 'pending';
    });
    pendingSwaps.value = allSwaps.filter(s => {
      const reqUserId = s.swapUser?.requestingUser?.id;
      return reqUserId === userId && (s.status === 'pending' || s.status === 'accepted');
    });
  } catch (err) { console.error('Requests error:', err); }
};

// ── CLOCK ACTIONS ─────────────────────────────────────────────────────────
const handleClockIn = async () => {
  const todayShifts = todayDay.value.shifts;
  if (!todayShifts.length) {
    snackMsg.value = 'No shifts scheduled for today';
    snackColor.value = 'error';
    snackbar.value = true;
    return;
  }
  clockLoading.value = true;
  try {
    const shiftId = todayShifts[0].shift_id || todayShifts[0].id;
    const res = await EmployeeService.clockIn({ shiftId });
    activeClockRecord.value = res.data;
    clockedInAt.value = new Date();
    elapsedTime.value = '00:00:00';
    snackMsg.value = 'Clocked in successfully!';
    snackColor.value = 'success';
    snackbar.value = true;
  } catch (err) {
    snackMsg.value = err.response?.data?.message || 'Error clocking in';
    snackColor.value = 'error';
    snackbar.value = true;
  } finally { clockLoading.value = false; }
};

const handleClockOut = async () => {
  if (!activeClockRecord.value) return;
  clockLoading.value = true;
  try {
    const id = activeClockRecord.value.id || activeClockRecord.value.clock_id;
    await EmployeeService.clockOut(id);
    activeClockRecord.value = null;
    clockedInAt.value = null;
    elapsedTime.value = '00:00:00';
    hoursRemaining.value = '';
    snackMsg.value = 'Clocked out successfully!';
    snackColor.value = 'success';
    snackbar.value = true;
  } catch (err) {
    snackMsg.value = 'Error clocking out';
    snackColor.value = 'error';
    snackbar.value = true;
  } finally { clockLoading.value = false; }
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
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
};

const statusColor = (s) => ({ pending: '#f57c00', approved: '#2e7d32', denied: '#d32f2f' }[s] || 'grey');

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Dashboard</h1>
        <p class="text-body-2 text-grey">Hi, {{ userGreeting }}! Here's your overview.</p>
      </div>

      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="48" />
      </div>

      <template v-else>
        <v-row>
          <!-- ── LEFT: Clock + Tasks ──────────────────────────────────── -->
          <v-col cols="12" lg="4">

            <!-- Clock Card -->
            <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
              <v-card-text class="pa-5">
                <div class="text-center mb-4">
                  <p class="text-caption text-grey mb-1">Current Time</p>
                  <div class="clock-display pa-4 rounded-lg mb-2">
                    <p class="text-h4 font-weight-bold text-white mb-0">{{ currentTime }}</p>
                  </div>
                  <p class="text-caption text-grey">{{ currentDate }}</p>
                </div>

                <v-divider class="my-3" />

                <!-- Next shift -->
                <div v-if="nextShift" class="text-center mb-4 pa-3 rounded-lg" style="background:#f0f4ff;">
                  <p class="text-caption text-grey mb-1">Next Shift</p>
                  <p class="text-body-2 font-weight-bold navy-text mb-0">
                    {{ nextShift.dateLabel }} · {{ formatTime(nextShift.shift.startTime || nextShift.shift.start_time) }}
                  </p>
                </div>

                <!-- Clock status -->
                <div v-if="!activeClockRecord" class="text-center py-2">
                  <v-icon size="36" color="grey-lighten-2" class="mb-2">mdi-clock-outline</v-icon>
                  <p class="text-caption text-grey">Not clocked in</p>
                  <p v-if="!isWorkDevice" class="text-caption text-warning mt-1">
                    <v-icon size="14" color="warning">mdi-laptop-off</v-icon>
                    Use a registered work device to clock in
                  </p>
                </div>
                <div v-else>
                  <!-- Live elapsed timer -->
                  <div class="timer-display pa-4 rounded-lg mb-3 text-center">
                    <p class="text-caption mb-1" style="color:rgba(255,255,255,0.7);">Time worked</p>
                    <p class="text-h4 font-weight-bold text-white mb-0" style="font-variant-numeric: tabular-nums;">
                      {{ elapsedTime }}
                    </p>
                  </div>
                  <div class="d-flex justify-space-between align-center mb-3 px-1">
                    <div>
                      <p class="text-caption text-grey mb-0">Clocked in</p>
                      <p class="text-body-2 font-weight-bold navy-text mb-0">
                        {{ clockedInAt?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) }}
                      </p>
                    </div>
                    <div class="text-right" v-if="todayDay.shifts.length">
                      <p class="text-caption text-grey mb-0">Clock out at</p>
                      <p class="text-body-2 font-weight-bold navy-text mb-0">
                        {{ formatTime(todayDay.shifts[0].endTime || todayDay.shifts[0].end_time) }}
                      </p>
                    </div>
                  </div>
                  <v-chip
                    v-if="hoursRemaining"
                    block
                    :color="minutesRemaining <= 30 ? '#f57c00' : '#2e7d32'"
                    variant="tonal"
                    class="mb-3 w-100 justify-center"
                  >
                    <v-icon start size="16">mdi-timer-outline</v-icon>
                    {{ hoursRemaining }} remaining
                  </v-chip>
                  <v-btn block color="error" variant="flat" :loading="clockLoading" @click="handleClockOut">
                    <v-icon start>mdi-logout</v-icon>Clock Out
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>

            <!-- Tasks preview -->
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-title class="text-body-1 font-weight-bold pa-4 d-flex align-center justify-space-between navy-text">
                <span><v-icon start size="18">mdi-checkbox-marked-circle-outline</v-icon>My Tasks</span>
                <v-btn size="x-small" variant="tonal" color="#12086F" @click="router.push({ name: 'employeeTasks' })">View All</v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-4">
                <div v-if="assignedTasks.length === 0" class="text-center py-4">
                  <v-icon size="40" color="grey-lighten-2" class="mb-2">mdi-clipboard-check-outline</v-icon>
                  <p class="text-caption text-grey">No tasks assigned</p>
                </div>
                <div v-for="task in assignedTasks" :key="task.tasklist_id || task.id" class="task-row pa-2 mb-2 rounded">
                  <div class="d-flex align-center ga-2">
                    <v-icon size="16" :color="task.priority === 'urgent' ? 'error' : task.priority === 'high' ? 'warning' : '#12086F'">
                      mdi-flag
                    </v-icon>
                    <span class="text-body-2 font-weight-medium">{{ task.title }}</span>
                  </div>
                </div>
                <v-btn v-if="assignedTasks.length > 0" block variant="tonal" color="#12086F" size="small" class="mt-2"
                  @click="router.push({ name: 'employeeTasks' })">
                  Go to Tasks
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- ── RIGHT: Schedule + Pending Requests ─────────────────── -->
          <v-col cols="12" lg="8">

            <!-- Schedule -->
            <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
              <v-card-title class="pa-4 d-flex align-center justify-space-between">
                <span class="text-body-1 font-weight-bold navy-text">
                  <v-icon start size="18">mdi-calendar-week</v-icon>
                  {{ viewMode === 'week' ? 'This Week\'s Schedule' : 'Today\'s Schedule' }}
                </span>
                <div class="d-flex ga-2 align-center">
                  <!-- ✅ Day/Week toggle - no approved chip -->
                  <v-btn-toggle v-model="viewMode" color="#12086F" variant="outlined" mandatory divided density="compact">
                    <v-btn value="day" size="small">
                      <v-icon size="14" class="mr-1">mdi-calendar-today</v-icon>Day
                    </v-btn>
                    <v-btn value="week" size="small">
                      <v-icon size="14" class="mr-1">mdi-calendar-week</v-icon>Week
                    </v-btn>
                  </v-btn-toggle>
                  <v-btn size="small" variant="text" color="#4361EE" @click="router.push({ name: 'employeeSchedule' })">
                    Full Schedule
                  </v-btn>
                </div>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-3">
                <div class="schedule-grid" :style="{ gridTemplateColumns: `repeat(${displayDays.length}, 1fr)` }">
                  <!-- Headers -->
                  <div
                    v-for="day in displayDays"
                    :key="'h-' + day.dateString"
                    class="sched-header"
                    :class="{ 'sched-header--today': day.isToday }"
                  >
                    <span class="day-label">{{ day.label }}</span>
                    <span class="day-num">{{ day.dateNum }}</span>
                    <span class="day-month">{{ day.month }}</span>
                  </div>
                  <!-- Bodies -->
                  <div
                    v-for="day in displayDays"
                    :key="'b-' + day.dateString"
                    class="sched-body"
                    :class="{ 'sched-body--today': day.isToday }"
                  >
                    <div v-if="day.shifts.length === 0" class="no-shift-text">No shifts</div>
                    <div v-for="s in day.shifts" :key="s.shift_id || s.id" class="shift-pill">
                      <div class="shift-pill-time">{{ formatTime(s.startTime || s.start_time) }}</div>
                      <div class="shift-pill-end text-caption">– {{ formatTime(s.endTime || s.end_time) }}</div>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Pending Requests — click redirects to Time Requests page -->
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-title class="pa-4 d-flex align-center justify-space-between">
                <span class="text-body-1 font-weight-bold navy-text">
                  <v-icon start size="18">mdi-clock-alert</v-icon>
                  Pending Requests
                </span>
                <v-chip v-if="pendingCount > 0" size="x-small" color="#f57c00" variant="tonal">{{ pendingCount }}</v-chip>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-4">
                <div v-if="pendingCount === 0" class="text-center py-6">
                  <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-check-circle-outline</v-icon>
                  <p class="text-body-2 text-grey">No pending requests</p>
                </div>
                <div v-else>
                  <div
                    v-for="req in pendingTimeOff"
                    :key="'to-' + (req.request_id || req.id)"
                    class="request-row pa-3 mb-2 rounded cursor-pointer"
                    @click="router.push({ name: 'employeeTimeRequests' })"
                  >
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center ga-2">
                        <v-icon size="16" color="#4361EE">mdi-calendar-remove</v-icon>
                        <div>
                          <div class="text-body-2 font-weight-medium">Time Off Request</div>
                          <div class="text-caption text-grey">
                            {{ new Date(Number(req.start_date || req.startDate)).toLocaleDateString() }}
                          </div>
                        </div>
                      </div>
                      <v-chip :color="statusColor(req.status)" size="x-small" variant="tonal">{{ req.status }}</v-chip>
                    </div>
                  </div>
                  <div
                    v-for="swap in pendingSwaps"
                    :key="'sw-' + (swap.swap_id || swap.id)"
                    class="request-row pa-3 mb-2 rounded cursor-pointer"
                    @click="router.push({ name: 'employeeTimeRequests' })"
                  >
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center ga-2">
                        <v-icon size="16" color="#f57c00">mdi-swap-horizontal</v-icon>
                        <div>
                          <div class="text-body-2 font-weight-medium">Shift Swap Request</div>
                          <div class="text-caption text-grey">{{ swap.status }}</div>
                        </div>
                      </div>
                      <v-chip :color="statusColor(swap.status)" size="x-small" variant="tonal">{{ swap.status }}</v-chip>
                    </div>
                  </div>
                  <v-btn block variant="tonal" color="#12086F" size="small" class="mt-2"
                    @click="router.push({ name: 'employeeTimeRequests' })">
                    Manage All Requests
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">
      {{ snackMsg }}
    </v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.clock-display { background: linear-gradient(135deg, #12086F 0%, #1c10a8 100%); }
.timer-display { background: linear-gradient(135deg, #2e7d32 0%, #388e3c 100%); }

.schedule-grid {
  display: grid;
  gap: 4px;
  background: #f5f5f5;
  padding: 6px;
  border-radius: 8px;
}
.sched-header {
  background: linear-gradient(135deg, #12086F, #2B354F);
  color: white;
  padding: 8px 4px;
  text-align: center;
  border-radius: 6px 6px 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.sched-header--today { background: linear-gradient(135deg, #4361EE, #5B73F0); }
.day-label { font-size: 10px; font-weight: 700; opacity: 0.85; text-transform: uppercase; }
.day-num { font-size: 18px; font-weight: 800; }
.day-month { font-size: 10px; opacity: 0.7; }
.sched-body {
  background: white;
  min-height: 80px;
  padding: 6px;
  border-radius: 0 0 6px 6px;
}
.sched-body--today { background: #f0f4ff; }
.no-shift-text { text-align: center; color: #9ca3af; font-size: 11px; padding: 12px 0; }
.shift-pill {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-left: 3px solid #4361EE;
  border-radius: 4px;
  padding: 4px 6px;
  margin-bottom: 4px;
}
.shift-pill-time { font-size: 11px; font-weight: 700; color: #12086F; }
.shift-pill-end { color: #666; }

.task-row { background: #f9f9f9; border-left: 3px solid #12086F; }
.request-row { background: #fafafa; border: 1px solid #e0e0e0; cursor: pointer; transition: all 0.15s; }
.request-row:hover { background: #f0f4ff; border-color: #12086F; }
.cursor-pointer { cursor: pointer; }
</style>