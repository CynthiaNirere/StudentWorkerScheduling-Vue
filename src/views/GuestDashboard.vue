<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();

// ── HARDCODED DEMO DATA ───────────────────────────────────────────────────
const DEMO_EMPLOYEES = [
  { id: 'e1', name: 'Sarah Johnson',   role: 'Barista' },
  { id: 'e2', name: 'Michael Chen',    role: 'Cashier' },
  { id: 'e3', name: 'Emily Rodriguez', role: 'Barista' },
  { id: 'e4', name: 'James Williams',  role: 'Shift Lead' },
  { id: 'e5', name: 'Ashley Brown',    role: 'Cashier' },
  { id: 'e6', name: 'David Martinez',  role: 'Barista' },
];

const DEMO_SHIFTS = (() => {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  sunday.setHours(0, 0, 0, 0);

  const raw = [
    // Sun
    { dayOffset: 0, start: 480,  end: 960,  employee: 'Sarah Johnson',   status: 'published' },
    // Mon
    { dayOffset: 1, start: 420,  end: 840,  employee: 'Michael Chen',    status: 'published' },
    { dayOffset: 1, start: 840,  end: 1260, employee: 'Emily Rodriguez', status: 'published' },
    // Tue
    { dayOffset: 2, start: 480,  end: 960,  employee: 'James Williams',  status: 'published' },
    { dayOffset: 2, start: 960,  end: 1200, employee: 'Ashley Brown',    status: 'draft'     },
    // Wed
    { dayOffset: 3, start: 420,  end: 900,  employee: 'David Martinez',  status: 'published' },
    { dayOffset: 3, start: 900,  end: 1260, employee: 'Sarah Johnson',   status: 'published' },
    // Thu
    { dayOffset: 4, start: 480,  end: 960,  employee: 'Michael Chen',    status: 'published' },
    // Fri
    { dayOffset: 5, start: 420,  end: 840,  employee: 'Emily Rodriguez', status: 'published' },
    { dayOffset: 5, start: 840,  end: 1260, employee: 'James Williams',  status: 'published' },
    { dayOffset: 5, start: 480,  end: 720,  employee: 'Ashley Brown',    status: 'draft'     },
    // Sat
    { dayOffset: 6, start: 600,  end: 1080, employee: 'David Martinez',  status: 'published' },
    { dayOffset: 6, start: 1080, end: 1320, employee: 'Sarah Johnson',   status: 'published' },
  ];

  return raw.map((s, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + s.dayOffset);
    return { ...s, shift_id: i + 1, shiftTime: date.getTime() };
  });
})();

const clockedInCount = ref(3);
const schedulePublished = ref(true);

// ── WEEK DAYS ─────────────────────────────────────────────────────────────
const weekDays = computed(() => {
  const days  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const full  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today  = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  sunday.setHours(0, 0, 0, 0);

  return days.map((short, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    const shifts = DEMO_SHIFTS.filter(s => {
      const sd = new Date(s.shiftTime);
      return sd.toISOString().split('T')[0] === dateString;
    }).sort((a, b) => a.start - b.start);

    return {
      short, full: full[i], dateNum: date.getDate(),
      monthShort: date.toLocaleDateString('en-US', { month: 'short' }),
      shifts,
      isToday: date.toDateString() === today.toDateString(),
    };
  });
});

// ── STAT CARDS ────────────────────────────────────────────────────────────
const statCards = computed(() => [
  { label: 'Employees',       value: DEMO_EMPLOYEES.length, icon: 'mdi-account-group',      color: '#12086F', bg: '#eef2ff' },
  { label: 'Shifts This Week',value: DEMO_SHIFTS.length,    icon: 'mdi-calendar-check',     color: '#4361EE', bg: '#e8eeff' },
  { label: 'Pending Time Off', value: 2,                    icon: 'mdi-calendar-remove',    color: '#f57c00', bg: '#fff3e0' },
  { label: 'Swap Requests',    value: 1,                    icon: 'mdi-swap-horizontal',    color: '#9C27B0', bg: '#f3e5f5' },
]);

const formatTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  const h    = Math.floor(minutes / 60);
  const m    = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — This is a read-only demo. Sign up to manage your own workplace.
      </v-alert>

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Dashboard</h1>
          <p class="text-body-2 text-grey">
            Welcome back, Demo Manager!
            <v-chip size="x-small" color="#2e7d32" variant="tonal" class="ml-2">
              <v-icon start size="14">mdi-circle</v-icon>
              {{ clockedInCount }} clocked in now
            </v-chip>
          </p>
        </div>
        <v-chip :color="schedulePublished ? '#2e7d32' : '#f57c00'" variant="tonal" size="small">
          <v-icon start size="18">{{ schedulePublished ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
          Schedule {{ schedulePublished ? 'Published' : 'Draft' }}
        </v-chip>
      </div>

      <!-- Stat Cards -->
      <v-row class="mb-6">
        <v-col v-for="card in statCards" :key="card.label" cols="12" sm="6" lg="3">
          <v-card variant="outlined" rounded="lg" class="navy-card stat-card pa-4">
            <div class="d-flex align-center ga-4">
              <div class="stat-icon-wrap" :style="{ background: card.bg }">
                <v-icon :color="card.color" size="28">{{ card.icon }}</v-icon>
              </div>
              <div>
                <div class="text-h4 font-weight-bold" :style="{ color: card.color }">{{ card.value }}</div>
                <div class="text-caption text-grey">{{ card.label }}</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions (disabled) -->
      <v-row class="mb-6">
        <v-col cols="12" sm="4">
          <v-btn block color="#12086F" variant="flat" size="large" disabled>
            <v-icon start>mdi-calendar-edit</v-icon>Manage Schedule
          </v-btn>
        </v-col>
        <v-col cols="12" sm="4">
          <v-btn block color="#4361EE" variant="outlined" size="large" disabled>
            <v-icon start>mdi-account-plus</v-icon>Manage Employees
          </v-btn>
        </v-col>
        <v-col cols="12" sm="4">
          <v-btn block color="#9C27B0" variant="outlined" size="large" disabled>
            <v-icon start>mdi-credit-card-clock-outline</v-icon>Review Time Cards
          </v-btn>
        </v-col>
      </v-row>

      <!-- This Week's Schedule -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-title class="d-flex align-center justify-space-between pa-4">
          <span class="text-body-1 font-weight-bold navy-text">
            <v-icon start size="22">mdi-calendar-week</v-icon>This Week's Schedule
          </span>
          <v-btn size="small" color="#12086F" variant="tonal" disabled>
            Open Full Schedule
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div class="week-grid">
            <div v-for="day in weekDays" :key="day.short"
              class="week-col" :class="{ 'week-col--today': day.isToday }">

              <!-- Day header -->
              <div class="week-header">
                <div class="text-overline font-weight-bold text-white" style="font-size:13px;">{{ day.short }}</div>
                <div class="text-h6 font-weight-black text-white">{{ day.dateNum }}</div>
                <div class="text-caption text-white" style="opacity:0.7; font-size:12px;">{{ day.monthShort }}</div>
              </div>

              <!-- Shifts -->
              <div class="week-body">
                <div v-if="day.shifts.length === 0" class="empty-day">
                  <v-icon size="26" color="grey-lighten-2">mdi-calendar-blank-outline</v-icon>
                  <span class="text-caption text-grey" style="font-size:13px;">No shifts</span>
                </div>
                <div v-for="shift in day.shifts" :key="shift.shift_id" class="mini-shift">
                  <div class="mini-shift-time">{{ formatTime(shift.start) }}</div>
                  <div class="mini-shift-name text-truncate">{{ shift.employee }}</div>
                  <v-chip v-if="shift.status === 'draft'" size="x-small" color="#f57c00" variant="tonal"
                    style="font-size:11px; height:20px;">Draft</v-chip>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text  { color: #12086F !important; }
.navy-card  { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.stat-card  { transition: all 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(18,8,111,0.12) !important; }
.stat-icon-wrap { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }

.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; background: #f5f5f5; padding: 8px; border-radius: 12px; }
.week-col  { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.week-col--today { outline: 2px solid #4361EE; }

.week-header {
  background: linear-gradient(135deg, #12086F, #2B354F);
  padding: 14px 8px; text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.week-col--today .week-header { background: linear-gradient(135deg, #4361EE, #5B73F0); }

.week-body { padding: 8px; min-height: 140px; max-height: 280px; overflow-y: auto; }
.empty-day { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 16px 4px; }
.mini-shift { background: #f0f4ff; border-left: 3px solid #4361EE; border-radius: 4px; padding: 4px 6px; margin-bottom: 4px; }
.mini-shift-time { font-size: 13px; font-weight: 700; color: #12086F; }
.mini-shift-name { font-size: 13px; color: #444; max-width: 100%; }
</style>