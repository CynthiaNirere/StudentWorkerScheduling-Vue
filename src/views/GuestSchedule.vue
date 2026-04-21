<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const viewMode     = ref('week');
const selectedWeek = ref(new Date());

// ── HARDCODED DEMO SHIFTS ─────────────────────────────────────────────────
const DEMO_SHIFTS = (() => {
  const today  = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  sunday.setHours(0, 0, 0, 0);

  const raw = [
    { dayOffset: 0, start: 480,  end: 960,  employee: 'Sarah Johnson',   role: 'Barista',    status: 'published' },
    { dayOffset: 1, start: 420,  end: 840,  employee: 'Michael Chen',    role: 'Cashier',    status: 'published' },
    { dayOffset: 1, start: 840,  end: 1260, employee: 'Emily Rodriguez', role: 'Barista',    status: 'published' },
    { dayOffset: 2, start: 480,  end: 960,  employee: 'James Williams',  role: 'Shift Lead', status: 'published' },
    { dayOffset: 2, start: 960,  end: 1200, employee: 'Ashley Brown',    role: 'Cashier',    status: 'draft'     },
    { dayOffset: 3, start: 420,  end: 900,  employee: 'David Martinez',  role: 'Barista',    status: 'published' },
    { dayOffset: 3, start: 900,  end: 1260, employee: 'Sarah Johnson',   role: 'Barista',    status: 'published' },
    { dayOffset: 4, start: 480,  end: 960,  employee: 'Michael Chen',    role: 'Cashier',    status: 'published' },
    { dayOffset: 5, start: 420,  end: 840,  employee: 'Emily Rodriguez', role: 'Barista',    status: 'published' },
    { dayOffset: 5, start: 840,  end: 1260, employee: 'James Williams',  role: 'Shift Lead', status: 'published' },
    { dayOffset: 5, start: 480,  end: 720,  employee: 'Ashley Brown',    role: 'Cashier',    status: 'draft'     },
    { dayOffset: 6, start: 600,  end: 1080, employee: 'David Martinez',  role: 'Barista',    status: 'published' },
    { dayOffset: 6, start: 1080, end: 1320, employee: 'Sarah Johnson',   role: 'Barista',    status: 'published' },
  ];

  return raw.map((s, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + s.dayOffset);
    return { id: i + 1, ...s, shiftTime: date.getTime(), jobRoleId: s.role === 'Shift Lead' ? 3 : s.role === 'Cashier' ? 2 : 1 };
  });
})();

// Role colors
const SHIFT_BG_COLORS     = ['#E3F2FD', '#E8F5E9', '#FFF9C4'];
const SHIFT_BORDER_COLORS = ['#1976D2', '#2e7d32', '#f57c00'];
const getColorByRoleId    = (id) => SHIFT_BG_COLORS[(id - 1) % 3];
const getBorderByRoleId   = (id) => SHIFT_BORDER_COLORS[(id - 1) % 3];

// ── WEEK DAYS ─────────────────────────────────────────────────────────────
const weekDays = computed(() => {
  const sunday = new Date(selectedWeek.value);
  sunday.setDate(sunday.getDate() - sunday.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    const ds = day.toISOString().split('T')[0];
    const dayShifts = DEMO_SHIFTS.filter(s => {
      const sd = new Date(s.shiftTime);
      return sd.toISOString().split('T')[0] === ds;
    }).sort((a, b) => a.start - b.start);

    return {
      dateString: ds, dayOfMonth: day.getDate(),
      dayShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],
      dayName:  ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i],
      month: day.toLocaleDateString('en-US', { month: 'short' }),
      isToday: ds === new Date().toISOString().split('T')[0],
      shifts: dayShifts,
    };
  });
});

const currentWeekLabel = computed(() => {
  const s = weekDays.value[0], e = weekDays.value[6];
  return s.month === e.month
    ? `${s.month} ${s.dayOfMonth} – ${e.dayOfMonth}, ${new Date(selectedWeek.value).getFullYear()}`
    : `${s.month} ${s.dayOfMonth} – ${e.month} ${e.dayOfMonth}, ${new Date(selectedWeek.value).getFullYear()}`;
});

const colorLegend = [
  { name: 'Barista',    bg: SHIFT_BG_COLORS[0], border: SHIFT_BORDER_COLORS[0] },
  { name: 'Cashier',   bg: SHIFT_BG_COLORS[1], border: SHIFT_BORDER_COLORS[1] },
  { name: 'Shift Lead',bg: SHIFT_BG_COLORS[2], border: SHIFT_BORDER_COLORS[2] },
];

const previousWeek = () => { const d = new Date(selectedWeek.value); d.setDate(d.getDate() - 7); selectedWeek.value = d; };
const nextWeek     = () => { const d = new Date(selectedWeek.value); d.setDate(d.getDate() + 7); selectedWeek.value = d; };
const goToToday    = () => { selectedWeek.value = new Date(); };

const formatTime = (minutes) => {
  const h24 = Math.floor(minutes / 60), m = minutes % 60;
  let h12 = h24 % 12; if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2,'0')}${h24 >= 12 ? 'PM' : 'AM'}`;
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Creating/editing shifts is disabled.
      </v-alert>

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Schedule</h1>
          <p class="text-body-2 text-grey mb-0">{{ currentWeekLabel }}</p>
        </div>
        <div class="d-flex align-center ga-2">
          <v-btn size="small" color="#4361EE" variant="flat" prepend-icon="mdi-download" disabled>Load Template</v-btn>
          <v-btn size="small" color="#9C27B0" variant="flat" prepend-icon="mdi-content-save" disabled>Save Template</v-btn>
        </div>
      </div>

      <!-- Nav bar -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <div class="pa-3 d-flex align-center justify-space-between">
          <div class="d-flex align-center ga-1">
            <v-btn icon="mdi-chevron-left"  variant="text" color="#12086F" size="small" @click="previousWeek" />
            <v-btn icon="mdi-chevron-right" variant="text" color="#12086F" size="small" @click="nextWeek" />
            <v-btn variant="outlined" color="#12086F" size="small" class="ml-1" @click="goToToday">Today</v-btn>
          </div>
          <span class="text-subtitle-1 font-weight-bold navy-text">{{ currentWeekLabel }}</span>
          <div class="d-flex align-center ga-2">
            <v-btn size="small" color="#12086F" variant="flat" prepend-icon="mdi-publish" disabled>Publish</v-btn>
          </div>
        </div>
      </v-card>

      <!-- Calendar -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <div class="scroll-hint d-flex align-center ga-1 pa-2 pl-3">
          <v-icon size="13" color="#9ca3af">mdi-gesture-swipe-horizontal</v-icon>
          <span class="text-caption text-grey">Scroll sideways to see all days</span>
        </div>

        <div class="calendar-scroll-wrapper">
          <div class="calendar-grid" style="grid-template-columns: repeat(7, minmax(160px, 1fr)); min-height: 600px;">

            <!-- Headers -->
            <div v-for="day in weekDays" :key="'h-' + day.dateString"
              class="calendar-header" :class="{ 'today-header': day.isToday }">
              <div class="day-name">{{ day.dayShort }}</div>
              <div class="day-date">
                <span class="date-number">{{ day.dayOfMonth }}</span>
                <span class="date-month">{{ day.month }}</span>
              </div>
            </div>

            <!-- Day cells -->
            <div v-for="day in weekDays" :key="'d-' + day.dateString"
              class="calendar-day" :class="{ 'today-cell': day.isToday }">
              <div class="shifts-container">
                <div v-for="shift in day.shifts" :key="shift.id"
                  class="shift-card"
                  :style="{ backgroundColor: getColorByRoleId(shift.jobRoleId), borderLeftColor: getBorderByRoleId(shift.jobRoleId) }">
                  <div class="shift-time-row">
                    <span class="shift-time-start">{{ formatTime(shift.start) }}</span>
                    <span class="shift-time-arrow">→</span>
                    <span class="shift-time-end">{{ formatTime(shift.end) }}</span>
                  </div>
                  <div class="shift-employee">{{ shift.employee }}</div>
                  <div class="shift-role">{{ shift.role }}</div>
                  <div v-if="shift.status === 'draft'" class="shift-draft-badge">Draft</div>
                </div>

                <div v-if="day.shifts.length === 0" class="empty-day-area">
                  <v-icon size="22" color="grey-lighten-2">mdi-calendar-blank-outline</v-icon>
                  <span class="text-caption text-grey">No shifts</span>
                </div>

                <!-- Add Shift — disabled -->
                <div class="add-shift-area add-shift-disabled">
                  <v-icon size="14" color="#9ca3af">mdi-plus</v-icon>
                  <span class="add-shift-text" style="color:#9ca3af;">Add Shift</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </v-card>

      <!-- Legend -->
      <div class="mt-3 d-flex flex-wrap align-center ga-2">
        <span class="text-caption text-grey font-weight-medium mr-1">Legend:</span>
        <div v-for="item in colorLegend" :key="item.name"
          class="legend-item" :style="{ backgroundColor: item.bg, borderColor: item.border }">
          <span class="legend-dot" :style="{ backgroundColor: item.border }" />
          <span class="legend-label">{{ item.name }}</span>
        </div>
      </div>

    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }

.calendar-scroll-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: #c7d2fe transparent; }
.calendar-scroll-wrapper::-webkit-scrollbar { height: 6px; }
.calendar-scroll-wrapper::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 3px; }
.calendar-grid { display: grid; }
.scroll-hint { border-bottom: 1px solid #f0f0f0; background: #fafafa; }

.calendar-header { background: linear-gradient(135deg,#12086F,#2B354F); color:white; padding:12px 8px; text-align:center; border-right:1px solid rgba(255,255,255,0.1); border-bottom:2px solid #12086F; }
.calendar-header:last-child { border-right:none; }
.today-header { background: linear-gradient(135deg,#4361EE,#5B73F0); }
.day-name { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:.9; margin-bottom:4px; }
.day-date { display:flex; align-items:baseline; justify-content:center; gap:4px; }
.date-number { font-size:20px; font-weight:bold; }
.date-month  { font-size:11px; opacity:.8; }

.calendar-day { border-right:1px solid #e0e0e0; border-bottom:1px solid #e0e0e0; background:#fafafa; }
.calendar-day:last-child { border-right:none; }
.today-cell { background:#f0f4ff; }

.shifts-container { padding:6px; display:flex; flex-direction:column; gap:5px; min-height:100%; }
.shift-card { background:white; border-left:3px solid #4361EE; border-radius:6px; padding:7px 8px 6px; }
.shift-time-row { display:flex; align-items:center; gap:3px; margin-bottom:3px; }
.shift-time-start, .shift-time-end { font-size:11px; font-weight:700; color:#12086F; }
.shift-time-arrow { font-size:9px; color:#9ca3af; }
.shift-employee { font-size:11px; color:#1f2937; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:2px; }
.shift-role { font-size:10px; color:#6b7280; margin-bottom:4px; }
.shift-draft-badge { display:inline-block; font-size:9px; font-weight:700; background:rgba(245,124,0,.12); color:#b45309; border-radius:3px; padding:1px 5px; text-transform:uppercase; }

.empty-day-area { display:flex; flex-direction:column; align-items:center; gap:4px; padding:16px 4px; }
.add-shift-area { margin-top:auto; padding:8px; border:1px dashed #c0c0c0; border-radius:6px; text-align:center; display:flex; align-items:center; justify-content:center; gap:4px; }
.add-shift-disabled { cursor:not-allowed; opacity:.5; }
.add-shift-text { font-size:11px; font-weight:500; }

.legend-item { display:inline-flex; align-items:center; gap:5px; padding:3px 8px 3px 6px; border-radius:20px; border:1px solid; font-size:11px; }
.legend-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.legend-label { font-size:11px; font-weight:500; color:#374151; }
</style>