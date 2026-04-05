<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);
const loading = ref(true);

const weeklySchedule = ref([]);
const schedulePublished = ref(false);
const pendingSwaps = ref([]);
const pendingTimeOff = ref([]);
const employees = ref([]);

const weekDays = computed(() => {
  const days = [
    { short: 'SUN', full: 'Sunday' }, { short: 'MON', full: 'Monday' },
    { short: 'TUE', full: 'Tuesday' }, { short: 'WED', full: 'Wednesday' },
    { short: 'THU', full: 'Thursday' }, { short: 'FRI', full: 'Friday' },
    { short: 'SAT', full: 'Saturday' }
  ];
  const today = new Date();
  const sunday = getSunday(today);

  return days.map((day, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const dateNum = date.getDate();
    const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
    const shifts = weeklySchedule.value.filter(s => {
      const shiftDate = new Date(Number(s.shift_time || s.shiftTime));
      return shiftDate.toDateString() === date.toDateString();
    }).sort((a, b) => (a.start_time || a.startTime) - (b.start_time || b.startTime));
    return {
      short: day.short, full: day.full, dateNum, monthShort, shifts,
      isToday: date.toDateString() === today.toDateString(),
      isFuture: date > today
    };
  });
});

onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadDashboardData();
});

const loadDashboardData = async () => {
  loading.value = true;
  try {
    await Promise.all([loadWeeklySchedule(), loadPendingRequests(), loadEmployees()]);
  } finally {
    loading.value = false;
  }
};

const loadWeeklySchedule = async () => {
  try {
    const sunday = getSunday(new Date());
    const startDate = sunday.getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000;
    const res = await EmployerService.getShiftsByWeek(startDate, endDate);
    const allShifts = Array.isArray(res.data) ? res.data : [];
    weeklySchedule.value = allShifts;
    schedulePublished.value = allShifts.some(s => s.status === 'published');
  } catch (err) { console.error('Error loading schedule:', err); }
};

const loadPendingRequests = async () => {
  try {
    const [swapRes, timeOffRes] = await Promise.all([
      EmployerService.getAllShiftSwapRequests(),
      EmployerService.getAllTimeOffRequests()
    ]);
    pendingSwaps.value = (Array.isArray(swapRes.data) ? swapRes.data : []).filter(s => s.status === 'pending' || s.status === 'accepted');
    pendingTimeOff.value = (Array.isArray(timeOffRes.data) ? timeOffRes.data : []).filter(t => t.status === 'pending');
  } catch (err) { console.error('Error loading requests:', err); }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    employees.value = (Array.isArray(res.data) ? res.data : []).filter(u => u.role === 'employee');
  } catch (err) { console.error('Error loading employees:', err); }
};

const manageSchedule = () => router.push({ name: 'employerSchedule' });
const addEmployee = () => router.push({ name: 'employerEmployees' });
const viewTemplates = () => router.push({ name: 'employerTemplates' });

const getSunday = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatShiftTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
};

</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text mb-1">Dashboard</h1>
        <p class="text-body-2 text-grey">Your command center for workforce management</p>
      </div>

      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="48" />
        <p class="text-body-2 text-grey mt-4">Loading dashboard...</p>
      </div>

      <template v-else>
        <!-- Quick Actions -->
        <v-row class="mb-6">
          <v-col cols="12" sm="4">
            <v-btn color="#12086F" variant="flat" size="x-large" @click="manageSchedule" block>
              <v-icon start>mdi-calendar-edit</v-icon>Manage Schedule
            </v-btn>
          </v-col>
          <v-col cols="12" sm="4">
            <v-btn color="#4361EE" variant="outlined" size="x-large" @click="addEmployee" block>
              <v-icon start>mdi-account-plus</v-icon>Add Employee
            </v-btn>
          </v-col>
          <v-col cols="12" sm="4">
            <v-btn color="#9C27B0" variant="outlined" size="x-large" @click="viewTemplates" block>
              <v-icon start>mdi-content-save</v-icon>Templates
            </v-btn>
          </v-col>
        </v-row>

        <!-- Weekly Schedule -->
        <v-card class="navy-card mb-6" variant="outlined" rounded="lg">
          <v-card-title class="d-flex justify-space-between align-center pa-4">
            <div class="d-flex align-center">
              <v-icon color="#12086F" class="mr-2">mdi-calendar-week</v-icon>
              <span class="text-h6 font-weight-bold">This Week's Schedule</span>
            </div>
            <v-chip :color="schedulePublished ? '#2e7d32' : '#f57c00'" size="small" variant="tonal">
              <v-icon start size="small">{{ schedulePublished ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
              {{ schedulePublished ? 'Published' : 'Draft' }}
            </v-chip>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <div class="schedule-grid">
              <div v-for="day in weekDays" :key="day.short" class="schedule-column" :class="{ 'today-column': day.isToday }">
                <div class="schedule-header pa-3 text-center">
                  <div class="text-overline font-weight-bold text-white mb-1">{{ day.short }}</div>
                  <div class="text-h5 font-weight-bold text-white mb-0">{{ day.dateNum }}</div>
                  <div class="text-caption text-white-70">{{ day.monthShort }}</div>
                </div>
                <div class="schedule-body pa-2">
                  <v-chip v-if="day.isToday" color="#FFD700" size="x-small" class="mb-2 mx-auto d-block" style="width: fit-content;">
                    <v-icon start size="x-small">mdi-star</v-icon>Today
                  </v-chip>
                  <div v-for="shift in day.shifts" :key="shift.shift_id" class="shift-item pa-2 mb-2">
                    <div class="text-caption font-weight-bold navy-text">{{ formatShiftTime(shift.start_time || shift.startTime) }}</div>
                    <div class="text-caption">{{ shift.employee_name || shift.employeeName || 'Unassigned' }}</div>
                  </div>
                  <div v-if="day.shifts.length === 0" class="text-center py-6">
                    <v-icon size="32" class="text-grey-lighten-1 mb-1">mdi-calendar-blank-outline</v-icon>
                    <div class="text-caption text-grey">No shifts</div>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
        <!-- ✅ Stat cards with icons REMOVED — info is surfaced through alerts above -->
      </template>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }
.schedule-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; background: #f5f5f5; padding: 8px; border-radius: 8px; }
.schedule-column { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s; }
.schedule-column:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
.today-column { border: 2px solid #FFD700; box-shadow: 0 2px 8px rgba(255,215,0,0.3); }
.schedule-header { background: linear-gradient(135deg, #12086F 0%, #2B354F 100%); min-height: 90px; display: flex; flex-direction: column; justify-content: center; }
.text-white-70 { color: rgba(255,255,255,0.7); }
.schedule-body { min-height: 200px; max-height: 300px; overflow-y: auto; }
.shift-item { background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-left: 3px solid #4361EE; border-radius: 6px; }
</style>