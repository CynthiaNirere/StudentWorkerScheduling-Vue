<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployerService from '../services/employerServices.js';
import { useNotifications } from '../composables/useNotifications.js';

const router       = useRouter();
const user         = ref(null);
const rail         = ref(true);
const businessArea = ref('The Brew');
const showNotifications = ref(false);
const { notifications, unreadCount, dismissNotification, handleNotificationAction } = useNotifications();

// ── WEEK NAVIGATION ───────────────────────────────────────────────────────
const currentWeekStart = ref(getMonday(new Date()));

function getMonday(d) {
  const date = new Date(d);
  const day  = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

const weekDays = computed(() => {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels.map((label, i) => {
    const date = new Date(currentWeekStart.value);
    date.setDate(currentWeekStart.value.getDate() + i);
    return { label, dateNum: date.getDate(), closed: i >= 5 };
  });
});

const weekLabel = computed(() => {
  const s = currentWeekStart.value;
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return `Week of ${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
});

const prevWeek = () => { 
  const d = new Date(currentWeekStart.value); 
  d.setDate(d.getDate() - 7); 
  currentWeekStart.value = d;
  loadAvailabilityForWeek(); // ✅ Reload when changing weeks
};

const nextWeek = () => { 
  const d = new Date(currentWeekStart.value); 
  d.setDate(d.getDate() + 7); 
  currentWeekStart.value = d;
  loadAvailabilityForWeek(); // ✅ Reload when changing weeks
};

// ── CALENDAR CONFIG ───────────────────────────────────────────────────────
const CAL_START = 8 * 60;   // 8:00 AM
const CAL_END   = 18 * 60;  // 6:00 PM
const CAL_RANGE = CAL_END - CAL_START;
const ROW_H     = 28;
const ROWS      = CAL_RANGE / 30;
const CAL_H     = ROWS * ROW_H;

const timeLabels = computed(() =>
  Array.from({ length: CAL_RANGE / 60 + 1 }, (_, i) => {
    const h    = CAL_START / 60 + i;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return { text: `${hour}${ampm}`, topPct: (i / (CAL_RANGE / 60)) * 100 };
  })
);

// ── AVAILABILITY DATA (per-week) ──────────────────────────────────────────
const allWeeks       = reactive({});
const submittedWeeks = reactive({});
const weekKey        = computed(() => currentWeekStart.value.toISOString().split('T')[0]);
const isSubmitted    = computed(() => !!submittedWeeks[weekKey.value]);

watch(weekKey, (key) => {
  if (!allWeeks[key]) allWeeks[key] = [[], [], [], [], [], [], []];
}, { immediate: true });

// Read-only computed for template iteration; all mutations go through allWeeks directly
const availability = computed(() => allWeeks[weekKey.value] || [[], [], [], [], [], [], []]);

const toMin = (str) => {
  if (!str) return 0;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
};

const minToTime = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const toDisplay = (min) => {
  const h    = Math.floor(min / 60) % 12 || 12;
  const m    = min % 60;
  const ampm = Math.floor(min / 60) >= 12 ? 'PM' : 'AM';
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

// Mutations always target allWeeks directly so Vue tracks them properly
const removeSlot = (day, idx) => {
  allWeeks[weekKey.value][day].splice(idx, 1);
};

const blockStyle = (slot) => ({
  position: 'absolute',
  top:    `${((slot.s - CAL_START) / CAL_RANGE) * 100}%`,
  height: `${((slot.e - slot.s)   / CAL_RANGE) * 100}%`,
  left: '3px', right: '3px',
  minHeight: '14px',
});

// ── EDIT SLOT DIALOG ──────────────────────────────────────────────────────
const showEditDialog  = ref(false);
const editingDay      = ref(-1);
const editingSlotIdx  = ref(-1);
const editStart       = ref('');
const editEnd         = ref('');

// e is optional so we can call from both the calendar block and the summary panel
const openEditSlot = (dayIdx, slotIdx, e) => {
  if (e) e.stopPropagation();
  if (isSubmitted.value) return;
  const slot           = allWeeks[weekKey.value][dayIdx][slotIdx];
  editingDay.value     = dayIdx;
  editingSlotIdx.value = slotIdx;
  editStart.value      = minToTime(slot.s);
  editEnd.value        = minToTime(slot.e);
  showEditDialog.value = true;
};

const saveEditSlot = () => {
  const s = toMin(editStart.value);
  const e = toMin(editEnd.value);
  if (!editStart.value || !editEnd.value || e <= s) return;
  allWeeks[weekKey.value][editingDay.value][editingSlotIdx.value] = { s, e };
  showEditDialog.value = false;
};

const deleteEditSlot = () => {
  allWeeks[weekKey.value][editingDay.value].splice(editingSlotIdx.value, 1);
  showEditDialog.value = false;
};

// ── DRAG ON CALENDAR ──────────────────────────────────────────────────────
const dragging  = ref(false);
const dragDay   = ref(-1);
const dragStart = ref(0);
const dragCur   = ref(0);
const dayRefs   = [];

const rowFromClientY = (dayIdx, clientY) => {
  const el = dayRefs[dayIdx];
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const y    = clientY - rect.top;
  return Math.max(0, Math.min(ROWS - 1, Math.floor(y / ROW_H)));
};

const onDayMouseDown = (dayIdx, e) => {
  // Block Sat/Sun and already-submitted weeks
  if (dayIdx >= 5 || isSubmitted.value) return;
  e.preventDefault();
  dragging.value  = true;
  dragDay.value   = dayIdx;
  dragStart.value = rowFromClientY(dayIdx, e.clientY);
  dragCur.value   = dragStart.value;
};

const onWindowMouseMove = (e) => {
  if (!dragging.value || dragDay.value < 0) return;
  dragCur.value = rowFromClientY(dragDay.value, e.clientY);
};

const onWindowMouseUp = () => {
  if (!dragging.value || dragDay.value < 0) { dragging.value = false; return; }
  const s    = Math.min(dragStart.value, dragCur.value);
  const e    = Math.max(dragStart.value, dragCur.value) + 1;
  const sMin = CAL_START + s * 30;
  const eMin = CAL_START + e * 30;
  if (eMin > sMin) allWeeks[weekKey.value][dragDay.value].push({ s: sMin, e: eMin });
  dragging.value = false;
  dragDay.value  = -1;
};

const previewStyle = (dayIdx) => {
  if (!dragging.value || dragDay.value !== dayIdx) return null;
  const s    = Math.min(dragStart.value, dragCur.value);
  const e    = Math.max(dragStart.value, dragCur.value) + 1;
  const sMin = CAL_START + s * 30;
  const eMin = CAL_START + e * 30;
  return {
    position: 'absolute',
    top:    `${((sMin - CAL_START) / CAL_RANGE) * 100}%`,
    height: `${((eMin - sMin)      / CAL_RANGE) * 100}%`,
    left: '3px', right: '3px',
    background:   'rgba(67, 97, 238, 0.2)',
    borderLeft:   '3px solid #4361EE',
    borderRadius: '4px',
    zIndex: 5,
    pointerEvents: 'none',
    minHeight: '14px',
  };
};

// ── FILE UPLOAD ───────────────────────────────────────────────────────────
const uploadedFile = ref(null);
const isDragOver   = ref(false);
const fileInputRef = ref(null);

const onFilePick = (e) => { uploadedFile.value = e.target.files[0] || null; };
const onFileDrop = (e) => {
  e.preventDefault();
  isDragOver.value   = false;
  uploadedFile.value = e.dataTransfer.files[0] || null;
};

const submitUpload = () => {
  snackMsg.value     = `"${uploadedFile.value.name}" submitted successfully!`;
  snackColor.value   = 'success';
  snackbar.value     = true;
  uploadedFile.value = null;
};

// ── BUSINESS HOURS ────────────────────────────────────────────────────────
const businessHours = [
  { day: 'Monday',    hours: '8:00 AM – 5:00 PM', open: true  },
  { day: 'Tuesday',   hours: '8:00 AM – 5:00 PM', open: true  },
  { day: 'Wednesday', hours: '8:00 AM – 3:00 PM', open: true  },
  { day: 'Thursday',  hours: '8:00 AM – 5:00 PM', open: true  },
  { day: 'Friday',    hours: '8:00 AM – 3:00 PM', open: true  },
  { day: 'Saturday',  hours: 'Closed',             open: false },
  { day: 'Sunday',    hours: 'Closed',             open: false },
];

// ✅ NEW: Load availability from database
const loadAvailabilityForWeek = async () => {
  try {
    const userId = user.value?.user_id || user.value?.userId;
    const res = await EmployerService.getAllAvailability();
    const allAvail = Array.isArray(res.data) ? res.data : [];
    
    // Filter for this employee
    const myAvail = allAvail.filter(avail => {
      const availUserId = avail.user_id || avail.userId;
      return availUserId === userId;
    });
    
    console.log('Loaded availability for employee:', userId, myAvail.length, 'records');
    
    // ✅ Initialize empty week
    allWeeks[weekKey.value] = [[], [], [], [], [], [], []];
    
    // ✅ Group by day of week
    myAvail.forEach(avail => {
      const dayIndex = avail.day_of_week || avail.dayOfWeek;
      const isAvailable = avail.is_available !== undefined ? avail.is_available : true;
      
      if (isAvailable && dayIndex >= 0 && dayIndex <= 6) {
        const startTime = avail.start_time || avail.startTime;
        const endTime = avail.end_time || avail.endTime;
        
        allWeeks[weekKey.value][dayIndex].push({
          s: startTime,
          e: endTime
        });
      }
    });
    
    // ✅ Check if this week was submitted
    const weekHasData = allWeeks[weekKey.value].some(day => day.length > 0);
    submittedWeeks[weekKey.value] = weekHasData;
    
    console.log('Week data loaded:', weekKey.value, 'Has data:', weekHasData);
    
  } catch (err) {
    console.error('Error loading availability:', err);
  }
};

// ── SUBMIT ────────────────────────────────────────────────────────────────
const submitting = ref(false);
const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

const submitAvailability = async () => {
  submitting.value = true;
  try {
    const userId = user.value?.user_id || user.value?.userId;
    const weekData = allWeeks[weekKey.value];
    console.log('DEBUG submit: userId=', userId, 'weekKey=', weekKey.value, 'weekData=', JSON.stringify(weekData));

    // ✅ Delete existing availability for this user first
    const res = await EmployerService.getAllAvailability();
    const allAvail = Array.isArray(res.data) ? res.data : [];
    const myAvail = allAvail.filter(avail => {
      const availUserId = avail.user_id || avail.userId;
      return availUserId === userId;
    });
    
    for (const avail of myAvail) {
      await EmployerService.deleteAvailability(avail.availability_id || avail.id);
    }

    for (let dayIndex = 0; dayIndex < weekData.length; dayIndex++) {
      for (const slot of weekData[dayIndex]) {
        const payload = {
          userId: userId,
          dayOfWeek: dayIndex,
          startTime: slot.s,
          endTime: slot.e,
          isAvailable: true,
          createdAt: Date.now(),
        };
        console.log('DEBUG posting slot:', JSON.stringify(payload));
        await EmployerService.createAvailability(payload);
      }
    }

    submittedWeeks[weekKey.value] = true;
    snackMsg.value   = 'Availability submitted for review!';
    snackColor.value = 'success';
    
    await loadAvailabilityForWeek();
    
  } catch (err) {
    console.error('Error submitting availability:', err);
    snackMsg.value   = 'Failed to submit availability';
    snackColor.value = 'error';
  } finally {
    submitting.value = false;
    snackbar.value   = true;
  }
};

// ── USER ──────────────────────────────────────────────────────────────────
const userInitials = computed(() => (user.value?.fName?.[0] || '') + (user.value?.lName?.[0] || '') || 'E');
const logout = () => { Utils.setStore('user', null); router.push('/login'); };

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  
  // ✅ Load saved availability on mount!
  await loadAvailabilityForWeek();
  
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup',   onWindowMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup',   onWindowMouseUp);
});
</script>

<template>
  <!-- Template stays exactly the same as before -->
  <v-app>
    <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
    <v-navigation-drawer
      :rail="rail"
      @mouseenter="rail = false"
      @mouseleave="rail = true"
      permanent width="280"
      class="employee-sidebar"
    >
      <div class="d-flex align-center pa-4" style="min-height:64px;background:rgba(0,0,0,0.15)">
        <template v-if="!rail">
          <div>
            <h2 class="text-h6 font-weight-bold text-white mb-0">ShiftBoard</h2>
            <p class="text-caption text-white mb-0" style="opacity:.8">{{ businessArea }}</p>
          </div>
        </template>
        <v-icon v-else size="32" color="white">mdi-calendar-clock</v-icon>
      </div>
      <v-divider style="border-color:rgba(255,255,255,0.2)" />
      <v-list nav class="px-2 mt-2">
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeDashboard' })" />
        <v-list-item prepend-icon="mdi-clock-outline" title="My Availability" active rounded="lg" class="mb-1" />
        <v-list-item prepend-icon="mdi-calendar-month" title="Team Schedule" rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeSchedule' })" />
        <v-list-item prepend-icon="mdi-account-circle-outline" title="Profile" rounded="lg" class="mb-1"
          @click="router.push({ name: 'profile' })" />
      </v-list>
    </v-navigation-drawer>

    <!-- ── App Bar ───────────────────────────────────────────────────────── -->
    <v-app-bar color="white" elevation="0" style="border-bottom:1px solid #e0e0e0" density="compact">
      <v-spacer />

      <!-- Notification Bell -->
      <v-menu location="bottom" v-model="showNotifications">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon class="mr-1">
            <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error">
              <v-icon>mdi-bell</v-icon>
            </v-badge>
          </v-btn>
        </template>
        <v-card min-width="400" max-width="500" style="max-height:500px;overflow-y:auto">
          <v-card-title class="text-h6 font-weight-bold pa-4">Notifications</v-card-title>
          <v-divider />
          <div v-if="notifications.length === 0" class="text-center pa-6">
            <p class="text-grey">No notifications</p>
          </div>
          <div v-else>
            <div v-for="n in notifications" :key="n.id" class="pa-4" style="border-bottom:1px solid #f0f0f0">
              <div class="d-flex ga-3">
                <v-icon color="primary" size="large">{{ n.icon }}</v-icon>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-start mb-1">
                    <p class="text-body-2 font-weight-bold mb-0">{{ n.type }}</p>
                    <v-btn icon size="x-small" variant="text" @click="dismissNotification(n.id)">
                      <v-icon size="small">mdi-close</v-icon>
                    </v-btn>
                  </div>
                  <p class="text-body-2 mb-1">{{ n.message }}</p>
                  <p class="text-caption text-grey mb-2">{{ n.timestamp }}</p>
                  <v-btn v-if="n.action" size="small" color="primary" variant="flat" @click="handleNotificationAction(n.id)">
                    {{ n.action }}
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-menu>

      <v-menu location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon size="small" class="mr-2">
            <v-avatar size="36" color="#12086F" class="text-caption font-weight-bold text-white">
              {{ userInitials }}
            </v-avatar>
          </v-btn>
        </template>
        <v-card min-width="200">
          <v-card-text class="pa-4">
            <div class="text-center mb-3">
              <v-avatar size="48" color="#12086F" class="text-caption font-weight-bold text-white mb-2">{{ userInitials }}</v-avatar>
              <p class="text-body-2 font-weight-bold mb-0">{{ user?.fName }} {{ user?.lName }}</p>
              <p class="text-caption text-grey">{{ user?.email }}</p>
            </div>
            <v-divider class="mb-2" />
            <v-list density="compact" class="pa-0">
              <v-list-item prepend-icon="mdi-account" title="Profile" @click="router.push({ name: 'profile' })" />
              <v-list-item prepend-icon="mdi-logout" title="Sign Out" class="text-error" @click="logout" />
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- ── Main ─────────────────────────────────────────────────────────── -->
    <v-main style="background:#f5f5f5">
      <v-container fluid class="pa-6">

        <!-- Page header -->
        <div class="mb-4">
          <h1 class="text-h4 font-weight-bold navy-text">My Availability</h1>
          <p class="text-body-2 text-grey mb-0">Drag on the calendar to mark your available hours</p>
        </div>

        <!-- Week navigation -->
        <div class="d-flex justify-space-between align-center mb-4">
          <v-btn variant="outlined" color="#12086F" size="small" @click="prevWeek">
            <v-icon start>mdi-chevron-left</v-icon>Previous Week
          </v-btn>
          <span class="text-subtitle-1 font-weight-bold navy-text">{{ weekLabel }}</span>
          <v-btn variant="outlined" color="#12086F" size="small" @click="nextWeek">
            Next Week<v-icon end>mdi-chevron-right</v-icon>
          </v-btn>
        </div>

        <!-- Main 3-column layout -->
        <v-row align="start">

          <!-- ── LEFT: Summary + Upload ─────────────────────────────────── -->
          <v-col cols="12" md="3">

            <!-- This week's hours summary -->
            <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
              <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
                <v-icon size="18" color="#12086F">mdi-calendar-check-outline</v-icon>
                This Week's Hours
                <v-spacer />
                <v-chip v-if="isSubmitted" size="x-small" color="success" variant="tonal">Submitted</v-chip>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-3">
                <div
                  v-for="(slots, dayIdx) in availability"
                  :key="dayIdx"
                  class="summary-day"
                >
                  <span class="summary-day-lbl" :class="{ 'text-disabled': dayIdx >= 5 }">
                    {{ ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dayIdx] }}
                  </span>
                  <div class="summary-slots">
                    <!-- Sat/Sun always closed -->
                    <span v-if="dayIdx >= 5" class="text-caption text-disabled">Closed</span>
                    <span v-else-if="slots.length === 0" class="text-caption text-disabled">—</span>
                    <div v-else v-for="(slot, slotIdx) in slots" :key="slotIdx" class="summary-slot">
                      <span class="text-caption font-weight-medium" :class="isSubmitted ? 'text-success' : 'navy-text'">
                        {{ toDisplay(slot.s) }} – {{ toDisplay(slot.e) }}
                      </span>
                      <!-- Edit + Remove when not submitted -->
                      <div v-if="!isSubmitted" class="d-flex">
                        <v-btn icon="mdi-pencil" size="x-small" variant="plain" density="compact"
                          @click="openEditSlot(dayIdx, slotIdx)" />
                        <v-btn icon="mdi-close" size="x-small" variant="plain" density="compact"
                          @click="removeSlot(dayIdx, slotIdx)" />
                      </div>
                      <!-- Checkmark when submitted -->
                      <v-icon v-else size="14" color="success">mdi-check-circle</v-icon>
                    </div>
                  </div>
                </div>
              </v-card-text>
              <v-divider />
              <v-card-actions class="pa-3">
                <v-btn
                  block
                  :color="isSubmitted ? 'success' : '#12086F'"
                  variant="flat"
                  :loading="submitting"
                  :disabled="(!availability.some(d => d.length > 0)) || isSubmitted"
                  @click="submitAvailability"
                >
                  {{ isSubmitted ? 'Submitted ✓' : 'Submit for Review' }}
                </v-btn>
              </v-card-actions>
            </v-card>

            <!-- Upload schedule -->
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
                <v-icon size="18" color="#12086F">mdi-upload-outline</v-icon>
                Upload Schedule
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-4">
                <div
                  class="upload-zone"
                  :class="{ 'upload-zone--over': isDragOver }"
                  @dragover.prevent="isDragOver = true"
                  @dragleave="isDragOver = false"
                  @drop="onFileDrop"
                  @click="fileInputRef.click()"
                >
                  <v-icon size="32" :color="isDragOver ? '#12086F' : '#9ca3af'">mdi-cloud-upload-outline</v-icon>
                  <p class="text-caption mt-2 mb-0" :class="isDragOver ? 'navy-text' : 'text-grey'">
                    {{ uploadedFile ? uploadedFile.name : 'Click or drag to upload' }}
                  </p>
                  <p class="text-caption text-grey mb-0">PNG, JPG, or PDF</p>
                </div>
                <input ref="fileInputRef" type="file" accept=".pdf,.png,.jpg,.jpeg" style="display:none" @change="onFilePick" />
                <div v-if="uploadedFile" class="d-flex ga-2 mt-3">
                  <v-btn size="small" color="#12086F" variant="flat" @click="submitUpload">Submit</v-btn>
                  <v-btn size="small" variant="outlined" color="error" @click="uploadedFile = null">Remove</v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- ── CENTER: Calendar ───────────────────────────────────────── -->
          <v-col cols="12" md="6">
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-text class="pa-3">
                <div class="cal-outer" :style="{ height: (CAL_H + 42) + 'px' }">

                  <!-- Time axis -->
                  <div class="time-axis" :style="{ height: CAL_H + 'px', marginTop: '42px' }">
                    <div
                      v-for="lbl in timeLabels"
                      :key="lbl.text"
                      class="time-lbl"
                      :style="{ top: lbl.topPct + '%' }"
                    >{{ lbl.text }}</div>
                  </div>

                  <!-- Day columns -->
                  <div class="cal-grid">
                    <!-- Headers -->
                    <div
                      v-for="day in weekDays"
                      :key="'h'+day.label"
                      class="cal-hdr"
                      :class="{ 'cal-hdr--closed': day.closed }"
                    >
                      <span class="hdr-name">{{ day.label }}</span>
                      <span class="hdr-num">{{ day.dateNum }}</span>
                    </div>

                    <!-- Bodies -->
                    <div
                      v-for="(day, dayIdx) in weekDays"
                      :key="'b'+day.label"
                      :ref="el => { if (el) dayRefs[dayIdx] = el }"
                      class="cal-body"
                      :class="{ 'cal-body--closed': day.closed, 'cal-body--submitted': isSubmitted && !day.closed }"
                      :style="{ height: CAL_H + 'px' }"
                      @mousedown="onDayMouseDown(dayIdx, $event)"
                    >
                      <!-- Hour grid lines -->
                      <div
                        v-for="n in ROWS + 1"
                        :key="n"
                        class="grid-line"
                        :class="{ 'grid-line--hour': (n - 1) % 2 === 0 }"
                        :style="{ top: ((n - 1) * ROW_H) + 'px' }"
                      />

                      <!-- Availability blocks -->
                      <div
                        v-for="(slot, slotIdx) in availability[dayIdx]"
                        :key="slotIdx"
                        class="avail-block"
                        :class="{ 'avail-block--submitted': isSubmitted }"
                        :style="blockStyle(slot)"
                        @mousedown.stop
                        @click.stop="openEditSlot(dayIdx, slotIdx, $event)"
                      >
                        <span class="block-text">
                          {{ toDisplay(slot.s) }}<br>{{ toDisplay(slot.e) }}
                        </span>
                        <v-icon v-if="!isSubmitted" class="block-edit-icon" size="12" color="#1e3a5f">mdi-pencil</v-icon>
                        <v-icon v-else size="12" color="#166534">mdi-check</v-icon>
                      </div>

                      <!-- Drag preview -->
                      <div v-if="previewStyle(dayIdx)" :style="previewStyle(dayIdx)" />
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- ── RIGHT: Business hours ──────────────────────────────────── -->
          <v-col cols="12" md="3">
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
                <v-icon size="18" color="#12086F">mdi-store-clock-outline</v-icon>
                Business Hours
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-3">
                <p class="text-caption text-grey mb-3">Work hours for <strong class="navy-text">{{ businessArea }}</strong>:</p>
                <div v-for="bh in businessHours" :key="bh.day" class="bh-row">
                  <span class="text-caption font-weight-medium" :class="bh.open ? 'navy-text' : 'text-grey'">
                    {{ bh.day }}
                  </span>
                  <span class="text-caption" :class="bh.open ? 'text-grey' : 'text-disabled'">
                    {{ bh.hours }}
                  </span>
                </div>
                <v-divider class="my-3" />
                <v-alert density="compact" variant="tonal" color="#12086F" class="text-caption">
                  <template #prepend><v-icon size="14">mdi-lightbulb-outline</v-icon></template>
                  Try to set hours within the business hours above.
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

        </v-row>
      </v-container>
    </v-main>

    <!-- ── Edit Slot Dialog ──────────────────────────────────────────────── -->
    <v-dialog v-model="showEditDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Edit Availability
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="editStart"
                label="Start Time"
                type="time"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="editEnd"
                label="End Time"
                type="time"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" color="error" @click="deleteEditSlot">Delete</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" @click="saveEditSlot">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">
      {{ snackMsg }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
/* Same CSS as before */
.employee-sidebar { background: linear-gradient(180deg, #12086F 0%, #2B354F 100%) !important; }
.employee-sidebar :deep(.v-list-item__prepend .v-icon) { color: white !important; opacity: 1 !important; }
.employee-sidebar :deep(.v-list-item-title) { color: white !important; }
.employee-sidebar :deep(.v-list-item) { transition: all 0.2s; }
.employee-sidebar :deep(.v-list-item:hover) { background-color: rgba(255,255,255,0.1) !important; }
.employee-sidebar :deep(.v-list-item--active) { background-color: rgba(255,255,255,0.14) !important; }

.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0 !important; box-shadow: 0 1px 3px rgba(18,8,111,0.05) !important; }

.summary-day {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 5px 0; border-bottom: 1px solid #f0f0f0;
}
.summary-day:last-child { border-bottom: none; }
.summary-day-lbl { width: 28px; font-size: 0.72rem; font-weight: 700; color: #12086F; flex-shrink: 0; padding-top: 3px; }
.summary-slots { flex: 1; min-width: 0; }
.summary-slot { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }

.upload-zone {
  border: 1.5px dashed #d1d5db; border-radius: 8px;
  padding: 18px 10px; text-align: center; cursor: pointer; transition: all 0.2s;
}
.upload-zone:hover, .upload-zone--over { border-color: #12086F; background: rgba(18,8,111,0.04); }

.cal-outer { display: flex; gap: 0; overflow-x: auto; position: relative; }

.time-axis { flex-shrink: 0; width: 36px; position: relative; }
.time-lbl {
  position: absolute; right: 4px;
  font-size: 0.58rem; color: #9ca3af;
  transform: translateY(-50%); line-height: 1; white-space: nowrap;
}

.cal-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: 42px auto;
  min-width: 350px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #e0e0e0;
  gap: 1px;
}

.cal-hdr {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 5px 4px; gap: 1px;
}
.cal-hdr--closed {
  background: #94a3b8 !important;
}
.hdr-name { font-size: 0.62rem; font-weight: 700; color: rgba(255,255,255,0.85); letter-spacing: .08em; text-transform: uppercase; }
.hdr-num  { font-size: 1rem; font-weight: 800; color: rgba(255,255,255,0.2); line-height: 1; }

.cal-body {
  background: white;
  position: relative;
  cursor: crosshair;
  user-select: none;
}

.cal-body--closed {
  background: #f1f5f9;
  cursor: not-allowed;
  pointer-events: none;
}
.cal-body--closed::after {
  content: 'Closed';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
  font-size: 0.6rem; font-weight: 700;
  color: #cbd5e1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}

.cal-body--submitted { cursor: default; }

.grid-line { position: absolute; left: 0; right: 0; height: 1px; background: #f3f4f6; pointer-events: none; }
.grid-line--hour { background: #e5e7eb; }

.avail-block {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-left: 3px solid #4361EE;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 2px 2px 2px 4px;
  z-index: 2;
  cursor: pointer;
}
.avail-block--submitted {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  border-left-color: #16a34a !important;
  cursor: default;
}
.avail-block:hover { opacity: 0.85; }
.avail-block--submitted:hover { opacity: 1; }
.block-text { font-size: 0.52rem; font-weight: 600; color: #1e3a5f; line-height: 1.3; }
.block-edit-icon { opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
.avail-block:not(.avail-block--submitted):hover .block-edit-icon { opacity: 1; }

.bh-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 0; border-bottom: 1px solid #f0f0f0;
}
.bh-row:last-child { border-bottom: none; }
</style>