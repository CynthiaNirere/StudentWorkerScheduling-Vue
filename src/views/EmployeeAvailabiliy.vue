<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';
import ClassScheduleModal from '../components/classSchedulemodal.vue';

const user = ref(null);

// Class Schedule Modal
const showScheduleModal = ref(false);

// ── LOCATION ──────────────────────────────────────────────────────────────
const locations        = ref([]);
const selectedLocation = ref(null);
const loadingLocations = ref(false);

const loadLocations = async () => {
  loadingLocations.value = true;
  try {
    const res = await EmployeeService.getBusinessAreas();
    locations.value = Array.isArray(res.data) ? res.data : [];
    const userLoc = user.value?.work_location;
    if (userLoc && locations.value.length) {
      const match = locations.value.find(l => (l.location_id || l.locationId) === userLoc);
      selectedLocation.value = match
        ? (match.location_id || match.locationId)
        : (locations.value[0].location_id || locations.value[0].locationId);
    } else if (locations.value.length) {
      selectedLocation.value = locations.value[0].location_id || locations.value[0].locationId;
    }
  } catch (err) {
    console.error('Error loading locations:', err);
  } finally {
    loadingLocations.value = false;
  }
};

const selectedLocationName = computed(() => {
  if (!selectedLocation.value) return 'My Workplace';
  const loc = locations.value.find(l => (l.location_id || l.locationId) === selectedLocation.value);
  return loc?.name || 'My Workplace';
});

// ── DAY INDEX HELPERS ─────────────────────────────────────────────────────
const calIdxToDbDay = (calIdx) => (calIdx + 1) % 7;
const dbDayToCalIdx = (dbDay)  => (dbDay  + 6) % 7;

// ── WEEK NAVIGATION ───────────────────────────────────────────────────────
const currentWeekStart = ref(getMonday(new Date()));

function getMonday(d) {
  const date = new Date(d);
  const day  = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

const weekLabel = computed(() => {
  const s = currentWeekStart.value;
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
});

const prevWeek = () => {
  const d = new Date(currentWeekStart.value);
  d.setDate(d.getDate() - 7);
  currentWeekStart.value = d;
  loadAvailabilityForWeek();
};
const nextWeek = () => {
  const d = new Date(currentWeekStart.value);
  d.setDate(d.getDate() + 7);
  currentWeekStart.value = d;
  loadAvailabilityForWeek();
};

// ── CALENDAR CONFIG ───────────────────────────────────────────────────────
const CAL_START = 6 * 60;
const CAL_END   = 23 * 60;
const CAL_RANGE = CAL_END - CAL_START;
const ROW_H     = 32;
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

// ── AVAILABILITY DATA ─────────────────────────────────────────────────────
const allWeeks = reactive({});
const weekKey  = computed(() => currentWeekStart.value.toISOString().split('T')[0]);

const weekDays = computed(() => {
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return labels.map((label, i) => {
    const date = new Date(currentWeekStart.value);
    date.setDate(currentWeekStart.value.getDate() + i);
    return { label, dateNum: date.getDate() };
  });
});

watch(weekKey, (key) => {
  if (!allWeeks[key]) allWeeks[key] = [[], [], [], [], [], [], []];
}, { immediate: true });

watch(selectedLocation, () => {
  allWeeks[weekKey.value] = [[], [], [], [], [], [], []];
  if (user.value) loadAvailabilityForWeek();
});

const availability = computed(() => allWeeks[weekKey.value] || [[], [], [], [], [], [], []]);

const toMin     = (str) => { if (!str) return 0; const [h, m] = str.split(':').map(Number); return h * 60 + m; };
const minToTime = (min) => { const h = Math.floor(min / 60); const m = min % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
const toDisplay = (min) => { const h = Math.floor(min / 60) % 12 || 12; const m = min % 60; const ampm = Math.floor(min / 60) >= 12 ? 'PM' : 'AM'; return `${h}:${String(m).padStart(2, '0')} ${ampm}`; };

const removeSlot = (day, idx) => { allWeeks[weekKey.value][day].splice(idx, 1); };

const blockStyle = (slot) => ({
  position: 'absolute',
  top:    `${((slot.s - CAL_START) / CAL_RANGE) * 100}%`,
  height: `${((slot.e - slot.s)   / CAL_RANGE) * 100}%`,
  left: '3px', right: '3px',
  minHeight: '14px',
});

// ── EDIT DIALOG with "Apply to multiple days" ─────────────────────────────
const showEditDialog  = ref(false);
const editingDay      = ref(-1);
const editingSlotIdx  = ref(-1);
const editStart       = ref('');
const editEnd         = ref('');

// Multi-day apply: checkboxes for each day of the week
const applyToDays = ref([false, false, false, false, false, false, false]);
const DAY_LABELS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Quick presets for multi-day apply
const applyPresets = [
  { label: 'Mon–Fri', days: [0,1,2,3,4] },
  { label: 'Mon/Wed/Fri', days: [0,2,4] },
  { label: 'Tue/Thu', days: [1,3] },
  { label: 'Weekends', days: [5,6] },
];

const applyPreset = (preset) => {
  applyToDays.value = [false, false, false, false, false, false, false];
  preset.days.forEach(i => { applyToDays.value[i] = true; });
};

const openEditSlot = (dayIdx, slotIdx, e) => {
  if (e) e.stopPropagation();
  const slot           = allWeeks[weekKey.value][dayIdx][slotIdx];
  editingDay.value     = dayIdx;
  editingSlotIdx.value = slotIdx;
  editStart.value      = minToTime(slot.s);
  editEnd.value        = minToTime(slot.e);
  // Pre-check the current day
  applyToDays.value = [false, false, false, false, false, false, false];
  applyToDays.value[dayIdx] = true;
  showEditDialog.value = true;
};

const saveEditSlot = () => {
  const s = toMin(editStart.value);
  const e = toMin(editEnd.value);
  if (!editStart.value || !editEnd.value || e <= s) return;

  // Apply to all selected days
  const selectedDays = applyToDays.value
    .map((checked, i) => checked ? i : -1)
    .filter(i => i >= 0);

  if (selectedDays.length === 0) {
    // fallback: just update the original day/slot
    allWeeks[weekKey.value][editingDay.value][editingSlotIdx.value] = { s, e };
  } else {
    selectedDays.forEach(dayIdx => {
      if (dayIdx === editingDay.value) {
        // Update existing slot
        allWeeks[weekKey.value][dayIdx][editingSlotIdx.value] = { s, e };
      } else {
        // Add new slot to other days (avoid duplicates)
        const existing = allWeeks[weekKey.value][dayIdx];
        const dupe = existing.find(slot => slot.s === s && slot.e === e);
        if (!dupe) existing.push({ s, e });
      }
    });
  }

  showEditDialog.value = false;
};

const deleteEditSlot = () => {
  allWeeks[weekKey.value][editingDay.value].splice(editingSlotIdx.value, 1);
  showEditDialog.value = false;
};

// ── ADD NEW SLOT DIALOG (separate from edit, with multi-day support) ──────
const showAddDialog  = ref(false);
const addStart       = ref('09:00');
const addEnd         = ref('17:00');
const addToDays      = ref([false, false, false, false, false, false, false]);

const openAddDialog = (dayIdx) => {
  addStart.value  = '09:00';
  addEnd.value    = '17:00';
  addToDays.value = [false, false, false, false, false, false, false];
  addToDays.value[dayIdx] = true;
  showAddDialog.value = true;
};

const applyAddPreset = (preset) => {
  addToDays.value = [false, false, false, false, false, false, false];
  preset.days.forEach(i => { addToDays.value[i] = true; });
};

const saveAddSlot = () => {
  const s = toMin(addStart.value);
  const e = toMin(addEnd.value);
  if (!addStart.value || !addEnd.value || e <= s) return;

  const selectedDays = addToDays.value
    .map((checked, i) => checked ? i : -1)
    .filter(i => i >= 0);

  selectedDays.forEach(dayIdx => {
    const existing = allWeeks[weekKey.value][dayIdx];
    const dupe = existing.find(slot => slot.s === s && slot.e === e);
    if (!dupe) existing.push({ s, e });
  });

  showAddDialog.value = false;
};

// ── DRAG ──────────────────────────────────────────────────────────────────
const dragging  = ref(false);
const dragDay   = ref(-1);
const dragStart = ref(0);
const dragCur   = ref(0);
const dayRefs   = [];

const rowFromClientY = (dayIdx, clientY) => {
  const el = dayRefs[dayIdx];
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  return Math.max(0, Math.min(ROWS - 1, Math.floor((clientY - rect.top) / ROW_H)));
};

const onDayMouseDown = (dayIdx, e) => {
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
  if (eMin > sMin) {
    // After dragging, open the add dialog pre-filled with those times so user can apply to multiple days
    addStart.value  = minToTime(sMin);
    addEnd.value    = minToTime(eMin);
    addToDays.value = [false, false, false, false, false, false, false];
    addToDays.value[dragDay.value] = true;
    showAddDialog.value = true;
  }
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
    top: `${((sMin - CAL_START) / CAL_RANGE) * 100}%`,
    height: `${((eMin - sMin) / CAL_RANGE) * 100}%`,
    left: '3px', right: '3px',
    background: 'rgba(67, 97, 238, 0.2)',
    borderLeft: '3px solid #4361EE',
    borderRadius: '4px',
    zIndex: 5,
    pointerEvents: 'none',
    minHeight: '14px',
  };
};

// ── LOAD FROM BACKEND ─────────────────────────────────────────────────────
const loadAvailabilityForWeek = async () => {
  try {
    const userId = user.value?.user_id || user.value?.userId;
    const res    = await EmployeeService.getMyAvailability(userId, selectedLocation.value);
    const avail  = Array.isArray(res.data) ? res.data : [];
    allWeeks[weekKey.value] = [[], [], [], [], [], [], []];
    avail.forEach(a => {
      const dbDay  = a.day_of_week ?? a.dayOfWeek;
      const calIdx = dbDayToCalIdx(dbDay);
      const s      = a.start_time ?? a.startTime;
      const e      = a.end_time   ?? a.endTime;
      if (calIdx >= 0 && calIdx <= 6 && s != null && e != null) {
        allWeeks[weekKey.value][calIdx].push({ s, e, availId: a.id ?? a.availability_id });
      }
    });
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
  if (!selectedLocation.value) {
    snackMsg.value = 'Please select a location first'; snackColor.value = 'error'; snackbar.value = true; return;
  }
  submitting.value = true;
  try {
    const userId   = user.value?.user_id || user.value?.userId;
    const weekData = allWeeks[weekKey.value];

    const existing     = await EmployeeService.getMyAvailability(userId, selectedLocation.value);
    const existingList = Array.isArray(existing.data) ? existing.data : [];
    for (const a of existingList) {
      await EmployeeService.deleteAvailability(a.id ?? a.availability_id);
    }

    for (let calIdx = 0; calIdx < weekData.length; calIdx++) {
      const dbDay = calIdxToDbDay(calIdx);
      for (const slot of weekData[calIdx]) {
        await EmployeeService.createAvailability({
          userId,
          dayOfWeek:   dbDay,
          startTime:   slot.s,
          endTime:     slot.e,
          isAvailable: true,
          locationId:  selectedLocation.value,
          createdAt:   Date.now(),
        });
      }
    }

    try {
      await EmployeeService.createNotification({
        userId,
        type:        'availability',
        title:       'Availability Updated',
        description: `${user.value?.fName || 'An employee'} updated their availability for ${selectedLocationName.value}.`,
      });
    } catch {}

    snackMsg.value   = `Availability saved for ${selectedLocationName.value}!`;
    snackColor.value = 'success';
    await loadAvailabilityForWeek();
  } catch (err) {
    console.error('Error submitting availability:', err);
    snackMsg.value   = 'Failed to save availability';
    snackColor.value = 'error';
  } finally {
    submitting.value = false;
    snackbar.value   = true;
  }
};

// Open Class Schedule Modal
const viewMyClassSchedule = () => {
  showScheduleModal.value = true;
};

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await Promise.all([loadLocations(), loadAvailabilityForWeek()]);
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup',   onWindowMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup',   onWindowMouseUp);
});
</script>

<template>
  <EmployeeLayout>
    <!-- Class Schedule Modal -->
    <ClassScheduleModal 
      v-model="showScheduleModal" 
      :userId="user?.user_id || user?.userId"
      :userName="`${user?.fName || ''} ${user?.lName || ''}`"
    />

    <v-container fluid class="pa-6">

      <div class="mb-4">
        <h1 class="text-h4 font-weight-bold navy-text">My Availability</h1>
        <p class="text-body-2 text-grey mb-0">
          Drag on the calendar to mark your available hours, or use the
          <strong>+ Add</strong> button to set the same time across multiple days at once.
        </p>
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

      <v-row align="start">

        <!-- LEFT: Summary -->
        <v-col cols="12" md="3">
          <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
            <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
              <v-icon size="18" color="#12086F">mdi-calendar-check-outline</v-icon>
              This Week's Hours
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-3">
              <div v-for="(slots, dayIdx) in availability" :key="dayIdx" class="summary-day">
                <span class="summary-day-lbl">{{ ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dayIdx] }}</span>
                <div class="summary-slots">
                  <span v-if="slots.length === 0" class="text-caption text-disabled">—</span>
                  <div v-else v-for="(slot, slotIdx) in slots" :key="slotIdx" class="summary-slot">
                    <span class="text-caption font-weight-medium navy-text">
                      {{ toDisplay(slot.s) }} – {{ toDisplay(slot.e) }}
                    </span>
                    <div class="d-flex">
                      <v-btn icon="mdi-pencil" size="x-small" variant="plain" density="compact" @click="openEditSlot(dayIdx, slotIdx)" />
                      <v-btn icon="mdi-close"  size="x-small" variant="plain" density="compact" @click="removeSlot(dayIdx, slotIdx)" />
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
            <v-divider />
            <!-- Quick add button with multi-day support -->
            <v-card-text class="pa-3 pb-2">
              <v-btn block color="#4361EE" variant="tonal" prepend-icon="mdi-plus" @click="openAddDialog(0)" size="small">
                Add Time Slot (multiple days)
              </v-btn>
            </v-card-text>
            <v-card-actions class="pa-3 pt-1">
              <v-btn
                block
                color="#12086F"
                variant="flat"
                :loading="submitting"
                :disabled="!availability.some(d => d.length > 0)"
                @click="submitAvailability"
              >
                Save & Notify Employer
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- 📚 View My Class Schedule Button -->
          <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
            <v-card-text class="pa-3">
              <v-btn
                block
                color="primary"
                variant="outlined"
                prepend-icon="mdi-school"
                @click="viewMyClassSchedule"
              >
                View My Class Schedule
              </v-btn>
            </v-card-text>
          </v-card>

          <v-card variant="outlined" rounded="lg" class="navy-card">
            <v-card-text class="pa-4">
              <v-alert density="compact" variant="tonal" color="#12086F" class="mb-0 text-caption">
                <template #prepend><v-icon size="14">mdi-lightbulb-outline</v-icon></template>
                Tip: Use "Add Time Slot" to apply the same hours to Mon, Wed, Fri or any combination at once.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- RIGHT: Calendar -->
        <v-col cols="12" md="9">
          <v-card variant="outlined" rounded="lg" class="navy-card">
            <v-card-text class="pa-3">
              <div class="cal-outer" :style="{ height: (CAL_H + 60) + 'px' }">
                <div class="time-axis" :style="{ height: CAL_H + 'px', marginTop: '60px' }">
                  <div v-for="lbl in timeLabels" :key="lbl.text" class="time-lbl" :style="{ top: lbl.topPct + '%' }">{{ lbl.text }}</div>
                </div>
                <div class="cal-grid">
                  <div v-for="(day, dayIdx) in weekDays" :key="'h'+day.label" class="cal-hdr" @click="openAddDialog(dayIdx)" style="cursor:pointer;">
                    <span class="hdr-name">{{ day.label }}</span>
                    <span class="hdr-num">{{ day.dateNum }}</span>
                    <v-icon size="14" color="rgba(255,255,255,0.8)" class="mt-1">mdi-plus</v-icon>
                  </div>
                  <div
                    v-for="(day, dayIdx) in weekDays"
                    :key="'b'+day.label"
                    :ref="el => { if (el) dayRefs[dayIdx] = el }"
                    class="cal-body"
                    :style="{ height: CAL_H + 'px' }"
                    @mousedown="onDayMouseDown(dayIdx, $event)"
                  >
                    <div v-for="n in ROWS + 1" :key="n" class="grid-line"
                      :class="{ 'grid-line--hour': (n - 1) % 2 === 0 }"
                      :style="{ top: ((n - 1) * ROW_H) + 'px' }" />
                    <div
                      v-for="(slot, slotIdx) in availability[dayIdx]"
                      :key="slotIdx"
                      class="avail-block"
                      :style="blockStyle(slot)"
                      @mousedown.stop
                      @click.stop="openEditSlot(dayIdx, slotIdx, $event)"
                    >
                      <span class="block-text">{{ toDisplay(slot.s) }}<br>{{ toDisplay(slot.e) }}</span>
                      <v-icon class="block-edit-icon" size="12" color="#1e3a5f">mdi-pencil</v-icon>
                    </div>
                    <div v-if="previewStyle(dayIdx)" :style="previewStyle(dayIdx)" />
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- EDIT EXISTING SLOT DIALOG (with multi-day apply) -->
    <v-dialog v-model="showEditDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Edit Availability Slot</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense class="mb-4">
            <v-col cols="6">
              <v-text-field v-model="editStart" label="Start Time" type="time" variant="outlined" density="compact" color="#12086F" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="editEnd" label="End Time" type="time" variant="outlined" density="compact" color="#12086F" />
            </v-col>
          </v-row>

          <!-- Apply to multiple days -->
          <div class="text-caption font-weight-bold text-grey-darken-2 mb-2">Apply this time to:</div>

          <!-- Quick presets -->
          <div class="d-flex flex-wrap ga-1 mb-3">
            <v-chip
              v-for="preset in applyPresets"
              :key="preset.label"
              size="x-small"
              variant="tonal"
              color="#12086F"
              style="cursor:pointer;"
              @click="applyPreset(preset)"
            >
              {{ preset.label }}
            </v-chip>
          </div>

          <!-- Day checkboxes -->
          <div class="day-checkbox-grid">
            <v-checkbox
              v-for="(label, i) in DAY_LABELS"
              :key="i"
              v-model="applyToDays[i]"
              :label="label"
              color="#12086F"
              density="compact"
              hide-details
            />
          </div>
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

    <!-- ADD NEW SLOT DIALOG (multi-day) -->
    <v-dialog v-model="showAddDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Add Availability</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense class="mb-4">
            <v-col cols="6">
              <v-text-field v-model="addStart" label="Start Time" type="time" variant="outlined" density="compact" color="#12086F" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="addEnd" label="End Time" type="time" variant="outlined" density="compact" color="#12086F" />
            </v-col>
          </v-row>

          <div class="text-caption font-weight-bold text-grey-darken-2 mb-2">Apply to which days:</div>

          <!-- Quick presets -->
          <div class="d-flex flex-wrap ga-1 mb-3">
            <v-chip
              v-for="preset in applyPresets"
              :key="preset.label"
              size="x-small"
              variant="tonal"
              color="#12086F"
              style="cursor:pointer;"
              @click="applyAddPreset(preset)"
            >
              {{ preset.label }}
            </v-chip>
          </div>

          <!-- Day checkboxes -->
          <div class="day-checkbox-grid">
            <v-checkbox
              v-for="(label, i) in DAY_LABELS"
              :key="i"
              v-model="addToDays[i]"
              :label="label"
              color="#12086F"
              density="compact"
              hide-details
            />
          </div>

          <v-alert v-if="!addToDays.some(Boolean)" type="warning" variant="tonal" density="compact" class="mt-3">
            <div class="text-caption">Select at least one day.</div>
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :disabled="!addToDays.some(Boolean)" @click="saveAddSlot">Add Slot</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="4000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0 !important; box-shadow: 0 1px 3px rgba(18,8,111,0.05) !important; }

.summary-day { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f0f0f0; }
.summary-day:last-child { border-bottom: none; }
.summary-day-lbl { width: 28px; font-size: 0.72rem; font-weight: 700; color: #12086F; flex-shrink: 0; padding-top: 3px; }
.summary-slots { flex: 1; min-width: 0; }
.summary-slot { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }

/* Multi-day checkboxes in a grid */
.day-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.cal-outer { display: flex; gap: 0; overflow-x: auto; position: relative; }
.time-axis { flex-shrink: 0; width: 36px; position: relative; }
.time-lbl { position: absolute; right: 4px; font-size: 0.58rem; color: #9ca3af; transform: translateY(-50%); line-height: 1; white-space: nowrap; }

.cal-grid {
  flex: 1; display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: 60px auto;
  min-width: 420px;
  border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;
  background: #e0e0e0; gap: 1px;
}

.cal-hdr { background: linear-gradient(135deg, #12086F 0%, #2B354F 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px 4px; gap: 1px; }
.cal-hdr:hover { background: linear-gradient(135deg, #2B354F 0%, #4361EE 100%); }
.hdr-name { font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.9); letter-spacing: .08em; text-transform: uppercase; }
.hdr-num  { font-size: 1.3rem; font-weight: 800; color: white; line-height: 1; }

.cal-body { background: white; position: relative; cursor: crosshair; user-select: none; }
.grid-line { position: absolute; left: 0; right: 0; height: 1px; background: #f3f4f6; pointer-events: none; }
.grid-line--hour { background: #e5e7eb; }

.avail-block { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 3px solid #4361EE; border-radius: 4px; overflow: hidden; display: flex; align-items: flex-start; justify-content: space-between; padding: 2px 2px 2px 4px; z-index: 2; cursor: pointer; }
.avail-block:hover { opacity: 0.85; }
.block-text { font-size: 0.52rem; font-weight: 600; color: #1e3a5f; line-height: 1.3; }
.block-edit-icon { opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
.avail-block:hover .block-edit-icon { opacity: 1; }

/* Dark mode */
.v-theme--dark .navy-text { color: #C5CAE9 !important; }
.v-theme--dark .navy-card { border-color: #37474F !important; }
.v-theme--dark .summary-day { border-bottom-color: #37474F; }
.v-theme--dark .summary-day-lbl { color: #C5CAE9; }
.v-theme--dark .cal-body { background: #1E1E2E; }
.v-theme--dark .grid-line { background: #2a2a3e; }
.v-theme--dark .grid-line--hour { background: #37474F; }
.v-theme--dark .avail-block { background: linear-gradient(135deg, #1a237e55, #1a237e88); border-left-color: #7B68EE; }
.v-theme--dark .block-text { color: #C5CAE9; }
.v-theme--dark .time-lbl { color: #78909C; }
.v-theme--dark .cal-grid { background: #37474F; border-color: #37474F; }
</style>