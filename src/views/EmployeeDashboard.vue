
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
const currentTime     = ref('');
const currentDate     = ref('');
const shiftStatus     = ref('none'); // 'none' | 'upcoming' | 'active' | 'ended'
const shiftElapsed    = ref('');
const shiftWorkedHours = ref('');
const shiftCountdown  = ref('');

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  currentDate.value = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (todayDay.value?.shifts?.length) {
    const shift = todayDay.value.shifts[0];
    const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
    const startMin = shift.startTime ?? shift.start_time ?? 0;
    const endMin   = shift.endTime   ?? shift.end_time;
    const startMs  = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), Math.floor(startMin / 60), startMin % 60, 0).getTime();
    const endMs    = endMin != null ? new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), Math.floor(endMin / 60), endMin % 60, 0).getTime() : null;
    const nowMs    = now.getTime();
    const pad      = n => String(n).padStart(2, '0');

    if (nowMs < startMs) {
      shiftStatus.value = 'upcoming';
      const d = startMs - nowMs;
      const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000);
      shiftCountdown.value = h > 0 ? `${h}h ${m}m` : `${m}m`;
    } else if (endMs && nowMs <= endMs) {
      shiftStatus.value = 'active';
      const d = nowMs - startMs;
      shiftElapsed.value = `${pad(Math.floor(d/3600000))}:${pad(Math.floor((d%3600000)/60000))}:${pad(Math.floor((d%60000)/1000))}`;
      shiftWorkedHours.value = (d / 3600000).toFixed(2);
    } else if (endMs && nowMs > endMs) {
      shiftStatus.value = 'ended';
      const d = endMs - startMs;
      shiftElapsed.value = `${pad(Math.floor(d/3600000))}:${pad(Math.floor((d%3600000)/60000))}:00`;
      shiftWorkedHours.value = (d / 3600000).toFixed(2);
    }
  } else {
    shiftStatus.value = 'none';
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
const completedTasks = ref(new Set());
const completeTask = (task) => {
  const id = task.tasklist_id || task.id;
  const next = new Set(completedTasks.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  completedTasks.value = next;
};

onMounted(async () => {
  user.value = Utils.getStore('user');
  updateTime();
  setInterval(updateTime, 1000);
  await Promise.all([loadShifts(), loadTasks(), loadRequests()]);
  loading.value = false;
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

                <!-- Shift status -->
                <div v-if="shiftStatus === 'upcoming'" class="shift-status-card pa-3 rounded-lg text-center">
                  <p class="text-caption text-grey mb-1">Shift starts in</p>
                  <p class="text-h5 font-weight-bold navy-text mb-1">{{ shiftCountdown }}</p>
                  <p class="text-caption text-grey">{{ formatTime(todayDay.shifts[0].startTime ?? todayDay.shifts[0].start_time) }} – {{ formatTime(todayDay.shifts[0].endTime ?? todayDay.shifts[0].end_time) }}</p>
                </div>

                <div v-else-if="shiftStatus === 'active'" class="shift-active-card pa-4 rounded-lg">
                  <div class="d-flex align-center ga-2 mb-3">
                    <v-icon color="#2e7d32" size="18">mdi-circle</v-icon>
                    <span class="text-body-2 font-weight-bold" style="color:#2e7d32">Shift in progress</span>
                  </div>
                  <p class="text-caption text-grey mb-1">Time worked</p>
                  <p class="text-h5 font-weight-bold navy-text mb-1">{{ shiftElapsed }}</p>
                  <p class="text-caption text-grey">{{ shiftWorkedHours }} hrs so far</p>
                </div>

                <div v-else-if="shiftStatus === 'ended'" class="shift-ended-card pa-4 rounded-lg text-center">
                  <v-icon color="#2e7d32" size="28" class="mb-2">mdi-check-circle</v-icon>
                  <p class="text-body-2 font-weight-bold mb-2" style="color:#2e7d32">Shift completed</p>
                  <p class="text-caption text-grey mb-1">Total hours worked</p>
                  <p class="text-h5 font-weight-bold navy-text">{{ shiftWorkedHours }} hrs</p>
                </div>

                <div v-else class="text-center pa-3 text-caption text-grey">No shift scheduled today</div>
              </v-card-text>
            </v-card>

            <!-- Tasks preview -->
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-title class="text-body-1 font-weight-bold pa-4 navy-text">
                <v-icon start size="18">mdi-checkbox-marked-circle-outline</v-icon>My Tasks
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-4">
                <div v-if="assignedTasks.length === 0" class="text-center py-4">
                  <v-icon size="40" color="grey-lighten-2" class="mb-2">mdi-clipboard-check-outline</v-icon>
                  <p class="text-caption text-grey">No tasks assigned</p>
                </div>
                <div
                  v-for="task in assignedTasks"
                  :key="task.tasklist_id || task.id"
                  class="task-row pa-3 mb-2 rounded d-flex align-center ga-2"
                  :class="{ 'task-row--done': completedTasks.has(task.tasklist_id || task.id) }"
                >
                  <v-checkbox
                    density="compact"
                    hide-details
                    color="#12086F"
                    :model-value="completedTasks.has(task.tasklist_id || task.id)"
                    @update:model-value="completeTask(task)"
                  />
                  <v-icon size="14" :color="task.priority === 'urgent' ? 'error' : task.priority === 'high' ? 'warning' : '#12086F'">mdi-flag</v-icon>
                  <span class="text-body-2 font-weight-medium task-title" :class="{ 'text-decoration-line-through text-grey': completedTasks.has(task.tasklist_id || task.id) }">
                    {{ task.title }}
                  </span>
                  <v-spacer />
                  <v-btn
                    size="x-small"
                    :color="completedTasks.has(task.tasklist_id || task.id) ? 'success' : '#12086F'"
                    variant="tonal"
                    @click="completeTask(task)"
                  >
                    {{ completedTasks.has(task.tasklist_id || task.id) ? 'Done' : 'Complete' }}
                  </v-btn>
                </div>
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

.schedule-grid {
  display: grid;
  gap: 0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}
.sched-header {
  background: linear-gradient(135deg, #12086F, #2B354F);
  color: white;
  padding: 8px 4px;
  text-align: center;
  border-right: 1px solid rgba(255,255,255,0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.sched-header:last-child { border-right: none; }
.sched-header--today { background: linear-gradient(135deg, #4361EE, #5B73F0); }
.day-label { font-size: 10px; font-weight: 700; opacity: 0.85; text-transform: uppercase; }
.day-num { font-size: 18px; font-weight: 800; }
.day-month { font-size: 10px; opacity: 0.7; }
.sched-body {
  background: white;
  min-height: 80px;
  padding: 6px;
  border-right: 1px solid #e8e8e8;
  border-top: 1px solid #e8e8e8;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.03);
}
.sched-body:last-child { border-right: none; }
.sched-body--today { background: #f0f4ff; }
.no-shift-text { text-align: center; color: #b0b0b0; font-size: 11px; padding: 18px 0; letter-spacing: .02em; }
.shift-pill {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-left: 3px solid #4361EE;
  border-radius: 4px;
  padding: 4px 6px;
  margin-bottom: 4px;
}
.shift-pill-time { font-size: 11px; font-weight: 700; color: #12086F; }
.shift-pill-end { color: #666; }

.task-row { background: #f5f6ff; border-left: 3px solid #12086F; }
.task-row--done { opacity: .6; }
.task-title { color: #1a1a2e; }
.request-row { background: #fafafa; border: 1px solid #e0e0e0; cursor: pointer; transition: all 0.15s; }
.request-row:hover { background: #f0f4ff; border-color: #12086F; }
.cursor-pointer { cursor: pointer; }

.shift-status-card { background: #f0f4ff; border: 1px solid #c5cae9; }
.shift-active-card { background: #f1faf3; border: 1px solid #a5d6a7; }
.shift-ended-card  { background: #f1faf3; border: 1px solid #a5d6a7; }

/* Dark mode overrides */
.v-theme--dark .navy-text { color: #C5CAE9 !important; }
.v-theme--dark .navy-card { border-color: #37474F !important; }
.v-theme--dark .sched-body { background: #1E1E2E; border-color: #37474F; }
.v-theme--dark .sched-body--today { background: #252540; }
.v-theme--dark .sched-header { border-right-color: rgba(255,255,255,0.08); }
.v-theme--dark .schedule-grid { border-color: #37474F; }
.v-theme--dark .no-shift-text { color: #78909C; }
.v-theme--dark .shift-pill { background: linear-gradient(135deg, #1a237e44, #1a237e66); border-left-color: #7B68EE; }
.v-theme--dark .shift-pill-time { color: #C5CAE9; }
.v-theme--dark .task-row { background: #2a2a3e; border-left-color: #7B68EE; }
.v-theme--dark .task-title { color: #E8EAF6; }
.v-theme--dark .request-row { background: #1E1E2E; border-color: #37474F; }
.v-theme--dark .request-row:hover { background: #252540; }
.v-theme--dark .shift-status-card { background: #1a1a3e; border-color: #3949AB; }
.v-theme--dark .shift-active-card, .v-theme--dark .shift-ended-card { background: #1a2e1a; border-color: #2e7d32; }
</style>