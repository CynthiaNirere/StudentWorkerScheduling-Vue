<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const shifts = ref([]);
const employees = ref([]);
const availability = ref([]);
const jobRoles = ref([]);
const taskLists = ref([]);
const templates = ref([]);
const selectedWeek = ref(new Date());
const loadingShifts = ref(false);
const loadingTemplates = ref(false);

const viewMode = ref('week');

const showShiftDialog = ref(false);
const showDeleteDialog = ref(false);
const shiftToDelete = ref(null);
const showSaveTemplateDialog = ref(false);
const showLoadTemplateDialog = ref(false);
const creatingShift = ref(false);
const deleting = ref(false);
const savingTemplate = ref(false);
const loadingTemplate = ref(false);

const editMode = ref(false);
const selectedShift = ref(null);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const templateName = ref("");
const templateDescription = ref("");
const selectedTemplateId = ref(null);
const shiftCreationStep = ref(1);

const shiftForm = ref({
  date: "", startHour: "9", startMinute: "00", startAmPm: "AM",
  endHour: "5", endMinute: "00", endAmPm: "PM",
  userId: "", jobRole: "", notes: "", assignedTasks: [], allowEmpty: false
});

watch(selectedWeek, () => { loadShifts(); });

// ── WEEK DAYS ─────────────────────────────────────────────────────────────
const weekDays = computed(() => {
  const sunday = new Date(selectedWeek.value);
  sunday.setDate(sunday.getDate() - sunday.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    const dayDateString = day.toISOString().split('T')[0];

    const dayShifts = shifts.value.filter(shift => {
      const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
      const y = shiftDate.getFullYear();
      const m = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const d = String(shiftDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === dayDateString;
    }).sort((a, b) => (a.start_time || a.startTime) - (b.start_time || b.startTime));

    return {
      date: day, dateString: dayDateString,
      dayName: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i],
      dayShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],
      dayOfMonth: day.getDate(),
      month: day.toLocaleDateString('en-US', { month: 'short' }),
      isToday: dayDateString === new Date().toISOString().split('T')[0],
      shifts: dayShifts
    };
  });
});

// ── MONTH DAYS ────────────────────────────────────────────────────────────
const monthDays = computed(() => {
  const base = new Date(selectedWeek.value);
  const year = base.getFullYear();
  const month = base.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const ds = date.toISOString().split('T')[0];
    const dayShifts = shifts.value.filter(shift => {
      const sd = new Date(Number(shift.shiftTime || shift.shift_time));
      return sd.toISOString().split('T')[0] === ds;
    }).sort((a, b) => (a.start_time || a.startTime) - (b.start_time || b.startTime));
    days.push({
      date, dateString: ds,
      dayOfMonth: d,
      dayShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()],
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      isToday: ds === new Date().toISOString().split('T')[0],
      shifts: dayShifts
    });
  }
  return days;
});

const todayDay = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  return weekDays.value.find(d => d.dateString === today) || weekDays.value[0];
});

const displayDays = computed(() => {
  if (viewMode.value === 'day')   return [todayDay.value];
  if (viewMode.value === 'month') return monthDays.value;
  return weekDays.value;
});

const gridCols = computed(() => {
  if (viewMode.value === 'day') return 1;
  return 7;
});

const currentWeekLabel = computed(() => {
  if (viewMode.value === 'day') {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (viewMode.value === 'month') {
    return new Date(selectedWeek.value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const start = weekDays.value[0];
  const end   = weekDays.value[6];
  if (start.month === end.month) return `${start.month} ${start.dayOfMonth} – ${end.dayOfMonth}, ${start.date.getFullYear()}`;
  return `${start.month} ${start.dayOfMonth} – ${end.month} ${end.dayOfMonth}, ${start.date.getFullYear()}`;
});

const timeOptions = {
  hours: Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')),
  minutes: ['00','15','30','45'],
  ampm: ['AM','PM']
};

const availableEmployees = computed(() => {
  if (!shiftForm.value.date) return employees.value;
  // Parse date string YYYY-MM-DD to avoid UTC timezone issues
  const [year, month, day] = shiftForm.value.date.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const dayOfWeek = selectedDate.getDay();
  const startMinutes = timeToMinutes(shiftForm.value.startHour, shiftForm.value.startMinute, shiftForm.value.startAmPm);
  const endMinutes   = timeToMinutes(shiftForm.value.endHour,   shiftForm.value.endMinute,   shiftForm.value.endAmPm);
  if (startMinutes >= endMinutes) return employees.value;
  return employees.value.filter(emp => {
    const empId = emp.user_id || emp.userId;
    const empAvail = availability.value.filter(a => {
      const aUserId    = a.user_id  || a.userId;
      const aDayOfWeek = a.day_of_week || a.dayOfWeek;
      const isAvail    = a.is_available !== undefined ? a.is_available : true;
      return aUserId === empId && aDayOfWeek === dayOfWeek && isAvail;
    });
    if (!empAvail.length) return false;
    const buf = 30;
    return empAvail.some(slot => {
      const aStart = slot.start_time || slot.startTime;
      const aEnd   = slot.end_time   || slot.endTime;
      return (aStart - buf) <= startMinutes && (aEnd + buf) >= endMinutes;
    });
  });
});

const templateTaskLists = computed(() =>
  taskLists.value.filter(t => {
    const isT = t.is_template ?? t.isTemplate;
    return isT === true || isT === 1 || isT === '1';
  })
);

// ── DATA LOADING ──────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadShifts(), loadEmployees(), loadAvailability(), loadJobRoles(), loadTaskLists(), loadTemplates()]);
});

const loadShifts = async () => {
  loadingShifts.value = true;
  try {
    const res = await EmployerService.getAllShifts();
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch { showSnackbar("Error loading shifts", "error"); }
  finally { loadingShifts.value = false; }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const allUsers = Array.isArray(res.data) ? res.data : [];
    const currentUserId = user.value?.user_id || user.value?.userId;
    const list = allUsers.filter(u => u.role === 'employee' && (u.user_id || u.userId) !== currentUserId);
    for (const emp of list) {
      try { const r = await EmployerService.getUserRoles(emp.user_id || emp.userId); emp.jobRoles = Array.isArray(r.data) ? r.data : []; }
      catch { emp.jobRoles = []; }
    }
    employees.value = list;
  } catch {}
};

const loadAvailability = async () => {
  try { const res = await EmployerService.getAllAvailability(); availability.value = Array.isArray(res.data) ? res.data : []; } catch {}
};
const loadJobRoles = async () => {
  try { const res = await EmployerService.getAllJobRoles(); jobRoles.value = Array.isArray(res.data) ? res.data : []; } catch {}
};
const loadTaskLists = async () => {
  try { const res = await EmployerService.getAllTaskLists(); taskLists.value = Array.isArray(res.data) ? res.data : []; } catch {}
};
const loadTemplates = async () => {
  loadingTemplates.value = true;
  try { const res = await EmployerService.getAllTemplates(); templates.value = Array.isArray(res.data) ? res.data : []; }
  catch {} finally { loadingTemplates.value = false; }
};

// ── NAVIGATION ────────────────────────────────────────────────────────────
const previousPeriod = () => {
  const d = new Date(selectedWeek.value);
  if (viewMode.value === 'month') d.setMonth(d.getMonth() - 1);
  else d.setDate(d.getDate() - 7);
  selectedWeek.value = d;
};
const nextPeriod = () => {
  const d = new Date(selectedWeek.value);
  if (viewMode.value === 'month') d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + 7);
  selectedWeek.value = d;
};
const goToToday = () => { selectedWeek.value = new Date(); };

// ── SHIFT ACTIONS ─────────────────────────────────────────────────────────
const openCreateShiftForDay = (day) => {
  editMode.value = false; selectedShift.value = null; shiftCreationStep.value = 1;
  shiftForm.value = { date: day.dateString, startHour: "9", startMinute: "00", startAmPm: "AM", endHour: "5", endMinute: "00", endAmPm: "PM", userId: "", jobRole: "", notes: "", assignedTasks: [], allowEmpty: false };
  showShiftDialog.value = true;
};

const nextStep = () => {
  if (shiftCreationStep.value === 1) {
    if (!shiftForm.value.jobRole) { showSnackbar("Please select a job role", "error"); return; }
    shiftCreationStep.value = 2;
  }
};
const previousStep = () => { if (shiftCreationStep.value > 1) shiftCreationStep.value--; };

const timeToMinutes = (hour, minute, ampm) => {
  let h = parseInt(hour); const m = parseInt(minute);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const hour24 = Math.floor(minutes / 60); const minute = minutes % 60;
  let hour12 = hour24 % 12; if (hour12 === 0) hour12 = 12;
  return { hour: hour12.toString().padStart(2, '0'), minute: minute.toString().padStart(2, '0'), ampm: hour24 >= 12 ? 'PM' : 'AM' };
};

const handleSaveShift = async () => {
  if (creatingShift.value) return;
  if (!shiftForm.value.allowEmpty && !shiftForm.value.userId) { showSnackbar("Please assign an employee or enable 'Create Empty Shift'", "error"); return; }
  if (!shiftForm.value.date || !shiftForm.value.jobRole) { showSnackbar("Please fill in all required fields", "error"); return; }
  const startMinutes = timeToMinutes(shiftForm.value.startHour, shiftForm.value.startMinute, shiftForm.value.startAmPm);
  const endMinutes   = timeToMinutes(shiftForm.value.endHour,   shiftForm.value.endMinute,   shiftForm.value.endAmPm);
  if (endMinutes <= startMinutes) { showSnackbar("End time must be after start time", "error"); return; }
  creatingShift.value = true;
  try {
    const [year, month, day] = shiftForm.value.date.split('-').map(Number);
    const shiftDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    const shiftData = {
      shiftTime:   shiftDate.getTime(),
      startTime:   startMinutes,
      endTime:     endMinutes,
      userId:      shiftForm.value.allowEmpty ? null : shiftForm.value.userId,
      jobRoleId:   shiftForm.value.jobRole,
      notes:       shiftForm.value.notes || "",
      status:      'draft',
      locationId:  user.value?.work_location || 1,
      createdBy:   user.value?.user_id || user.value?.userId
    };
    if (editMode.value && selectedShift.value) {
      await EmployerService.updateShift(selectedShift.value.shift_id || selectedShift.value.id, shiftData);
      if (shiftForm.value.assignedTasks.length > 0) {
        try { await EmployerService.bulkAssignTasksToShift(selectedShift.value.shift_id || selectedShift.value.id, shiftForm.value.assignedTasks); } catch {}
      }
      showSnackbar("Shift updated successfully!", "success");
    } else {
      const shiftRes = await EmployerService.createShift(shiftData);
      const createdShiftId = shiftRes.data?.shift_id || shiftRes.data?.id;
      if (shiftForm.value.assignedTasks.length > 0 && createdShiftId) {
        try { await EmployerService.bulkAssignTasksToShift(createdShiftId, shiftForm.value.assignedTasks); } catch {}
      }
      showSnackbar("Shift created successfully!", "success");
    }
    showShiftDialog.value = false; shiftCreationStep.value = 1; await loadShifts();
  } catch { showSnackbar(editMode.value ? "Error updating shift" : "Error creating shift", "error"); }
  finally { creatingShift.value = false; }
};

const openEditShift = async (shift) => {
  editMode.value = true; selectedShift.value = shift; shiftCreationStep.value = 1;
  const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
  const startTime = minutesToTime(shift.start_time || shift.startTime);
  const endTime   = minutesToTime(shift.end_time   || shift.endTime);
  let assignedTasks = [];
  try { const r = await EmployerService.getShiftTasks(shift.shift_id || shift.id); if (Array.isArray(r.data)) assignedTasks = r.data.map(st => st.tasklist_id || st.tasklistId); } catch {}
  shiftForm.value = {
    date: shiftDate.toISOString().split('T')[0],
    startHour: startTime.hour, startMinute: startTime.minute, startAmPm: startTime.ampm,
    endHour: endTime.hour,     endMinute: endTime.minute,     endAmPm: endTime.ampm,
    userId: shift.user_id || shift.userId || "",
    jobRole: shift.job_role_id || shift.jobRoleId || "",
    notes: shift.notes || "",
    assignedTasks,
    allowEmpty: !shift.user_id && !shift.userId
  };
  showShiftDialog.value = true;
};

const openDeleteDialog = (shift) => { shiftToDelete.value = shift; showDeleteDialog.value = true; };

const confirmDelete = async () => {
  if (!shiftToDelete.value) return;
  deleting.value = true;
  try { await EmployerService.deleteShift(shiftToDelete.value.shift_id || shiftToDelete.value.id); showSnackbar("Shift deleted", "success"); await loadShifts(); }
  catch { showSnackbar("Error deleting shift", "error"); }
  finally { deleting.value = false; showDeleteDialog.value = false; shiftToDelete.value = null; }
};

const publishSchedule = async () => {
  try {
    const weekShifts = shifts.value.filter(s => { const d = new Date(Number(s.shiftTime || s.shift_time)); return weekDays.value.some(day => day.dateString === d.toISOString().split('T')[0]); });
    for (const s of weekShifts) { if (s.status === 'draft') await EmployerService.updateShift(s.shift_id || s.id, { status: 'published' }); }
    showSnackbar("Schedule published!", "success"); await loadShifts();
  } catch { showSnackbar("Error publishing schedule", "error"); }
};

const openSaveTemplateDialog = () => {
  const weekShifts = shifts.value.filter(s => { const d = new Date(Number(s.shiftTime || s.shift_time)); return weekDays.value.some(day => day.dateString === d.toISOString().split('T')[0]); });
  if (!weekShifts.length) { showSnackbar("No shifts to save as template", "error"); return; }
  showSaveTemplateDialog.value = true;
};

const handleSaveTemplate = async () => {
  if (!templateName.value) { showSnackbar("Template name is required", "error"); return; }
  savingTemplate.value = true;
  try {
    const weekShifts = shifts.value.filter(s => { const d = new Date(Number(s.shiftTime || s.shift_time)); return weekDays.value.some(day => day.dateString === d.toISOString().split('T')[0]); });
    const templateData = weekShifts.map(s => { const d = new Date(Number(s.shiftTime || s.shift_time)); return { dayOfWeek: d.getDay(), startTime: s.start_time || s.startTime, endTime: s.end_time || s.endTime, jobRoleId: s.job_role_id || s.jobRoleId, notes: s.notes || "" }; });
    await EmployerService.createTemplate({ name: templateName.value, description: templateDescription.value || "", locationId: user.value?.work_location || 1, createdBy: user.value?.user_id || user.value?.userId, templateData: JSON.stringify(templateData), isActive: true });
    showSnackbar("Template saved!", "success"); showSaveTemplateDialog.value = false; templateName.value = ""; templateDescription.value = "";
    await loadTemplates();
  } catch { showSnackbar("Error saving template", "error"); }
  finally { savingTemplate.value = false; }
};

const openLoadTemplateDialog = () => {
  if (!templates.value.length) { showSnackbar("No templates available", "error"); return; }
  showLoadTemplateDialog.value = true;
};

const handleLoadTemplate = async () => {
  if (!selectedTemplateId.value) { showSnackbar("Please select a template", "error"); return; }
  loadingTemplate.value = true;
  try {
    const [year, month, day] = weekDays.value[0].dateString.split('-').map(Number);
    const startTimestamp = new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
    await EmployerService.applyTemplate(selectedTemplateId.value, startTimestamp);
    showSnackbar("Template loaded!", "success"); showLoadTemplateDialog.value = false; selectedTemplateId.value = null; await loadShifts();
  } catch { showSnackbar("Error loading template", "error"); }
  finally { loadingTemplate.value = false; }
};

const getEmployeeName = (shift) => {
  const userId = shift.user_id || shift.userId;
  if (!userId) return "Unassigned";
  const emp = employees.value.find(e => (e.user_id || e.userId) === userId);
  if (!emp) return "Unassigned";
  return `${emp.fName || emp.first_name || ''} ${emp.lName || emp.last_name || ''}`.trim();
};

const getJobRoleName = (shift) => {
  const roleId = shift.job_role_id || shift.jobRoleId;
  const role = jobRoles.value.find(r => r.job_role_id === roleId);
  return role ? role.title : "Unknown";
};

const formatTime = (minutes) => {
  if (minutes === undefined || minutes === null) return '';
  const hour24 = Math.floor(minutes / 60); const minute = minutes % 60;
  let hour12 = hour24 % 12; if (hour12 === 0) hour12 = 12;
  return `${hour12}:${minute.toString().padStart(2, '0')}${hour24 >= 12 ? 'PM' : 'AM'}`;
};

const getShiftColor       = (shift) => ['#E3F2FD','#E8F5E9','#FFF9C4','#FFE0B2','#F3E5F5','#FCE4EC'][(shift.job_role_id || shift.jobRoleId || 0) % 6];
const getShiftBorderColor = (shift) => ['#1976D2','#2e7d32','#f57c00','#ff6f00','#7b1fa2','#c2185b'][(shift.job_role_id || shift.jobRoleId || 0) % 6];

const showSnackbar = (message, color = "success") => { snackbarMessage.value = message; snackbarColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Schedule</h1>
          <p class="text-body-2 text-grey mb-0">{{ currentWeekLabel }}</p>
        </div>
        <div class="d-flex align-center ga-2 flex-wrap">
          <v-btn size="small" color="#4361EE" variant="flat" prepend-icon="mdi-download" @click="openLoadTemplateDialog">Load Template</v-btn>
          <v-btn size="small" color="#9C27B0" variant="flat" prepend-icon="mdi-content-save" @click="openSaveTemplateDialog">Save Template</v-btn>
          <v-btn size="small" color="#12086F" variant="flat" prepend-icon="mdi-publish" @click="publishSchedule">Publish</v-btn>
        </div>
      </div>

      <!-- Nav bar -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <div class="pa-3 d-flex align-center justify-space-between">
          <div class="d-flex align-center ga-1">
            <v-btn icon="mdi-chevron-left" variant="text" color="#12086F" size="small" @click="previousPeriod" />
            <v-btn icon="mdi-chevron-right" variant="text" color="#12086F" size="small" @click="nextPeriod" />
            <v-btn variant="outlined" color="#12086F" size="small" class="ml-1" @click="goToToday">Today</v-btn>
          </div>

          <span class="text-subtitle-1 font-weight-bold navy-text">{{ currentWeekLabel }}</span>

          <v-btn-toggle v-model="viewMode" color="#12086F" variant="outlined" mandatory divided density="compact">
            <v-btn value="day" size="small"><v-icon size="14" class="mr-1">mdi-calendar-today</v-icon>Day</v-btn>
            <v-btn value="week" size="small"><v-icon size="14" class="mr-1">mdi-calendar-week</v-icon>Week</v-btn>
            <v-btn value="month" size="small"><v-icon size="14" class="mr-1">mdi-calendar-month</v-icon>Month</v-btn>
          </v-btn-toggle>
        </div>
      </v-card>

      <!-- Month weekday headers -->
      <div v-if="viewMode === 'month'" class="month-header-row mb-1">
        <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="month-header-cell">{{ d }}</div>
      </div>

      <!-- Calendar -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-progress-linear v-if="loadingShifts" indeterminate color="#12086F" />

        <div
          class="calendar-grid"
          :style="{
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            minHeight: viewMode === 'month' ? 'auto' : '600px'
          }"
        >
          <!-- Column headers (week/day only) -->
          <template v-if="viewMode !== 'month'">
            <div
              v-for="day in displayDays"
              :key="'header-' + day.dateString"
              class="calendar-header"
              :class="{ 'today-header': day.isToday }"
            >
              <div class="day-name">{{ viewMode === 'day' ? day.dayName : day.dayShort }}</div>
              <div class="day-date">
                <span class="date-number">{{ day.dayOfMonth }}</span>
                <span class="date-month">{{ day.month }}</span>
              </div>
            </div>
          </template>

          <!-- Day cells -->
          <div
            v-for="day in displayDays"
            :key="'day-' + day.dateString"
            class="calendar-day"
            :class="{
              'today-cell': day.isToday,
              'calendar-day--month': viewMode === 'month'
            }"
          >
            <!-- Month view: date number inside cell -->
            <div v-if="viewMode === 'month'" class="month-date-num" :class="{ 'today-num': day.isToday }">
              {{ day.dayOfMonth }}
            </div>

            <div class="shifts-container">
              <!-- ✅ SHIFT CARD — shows start → end time, larger action buttons -->
              <div
                v-for="shift in day.shifts"
                :key="shift.shift_id || shift.id"
                class="shift-card"
                :style="{ backgroundColor: getShiftColor(shift), borderLeftColor: getShiftBorderColor(shift) }"
              >
                <!-- Time range row -->
                <div class="shift-time-row">
                  <span class="shift-time-start">{{ formatTime(shift.start_time || shift.startTime) }}</span>
                  <span class="shift-time-arrow">→</span>
                  <span class="shift-time-end">{{ formatTime(shift.end_time || shift.endTime) }}</span>
                </div>

                <!-- Employee name -->
                <div class="shift-employee" :class="{ 'shift-unassigned': getEmployeeName(shift) === 'Unassigned' }">
                  {{ getEmployeeName(shift) }}
                </div>

                <!-- Job role (hidden in month view) -->
                <div v-if="viewMode !== 'month'" class="shift-role">
                  {{ getJobRoleName(shift) }}
                </div>

                <!-- Draft badge -->
                <div v-if="shift.status === 'draft'" class="shift-draft-badge">Draft</div>

                <!-- ✅ Action buttons — always visible, larger hit area -->
                <div class="shift-actions">
                  <v-tooltip text="Edit shift" location="top">
                    <template #activator="{ props }">
                      <button v-bind="props" class="shift-action-btn shift-action-edit" @click.stop="openEditShift(shift)">
                        <v-icon size="14">mdi-pencil</v-icon>
                      </button>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Delete shift" location="top">
                    <template #activator="{ props }">
                      <button v-bind="props" class="shift-action-btn shift-action-delete" @click.stop="openDeleteDialog(shift)">
                        <v-icon size="14">mdi-delete</v-icon>
                      </button>
                    </template>
                  </v-tooltip>
                </div>
              </div>

              <!-- Add shift button -->
              <div class="add-shift-area" @click="openCreateShiftForDay(day)">
                <v-icon size="14" color="#12086F">mdi-plus</v-icon>
                <span class="add-shift-text">{{ viewMode === 'month' ? '' : 'Add Shift' }}</span>
              </div>
            </div>
          </div>
        </div>
      </v-card>
    </v-container>

    <!-- Create/Edit Shift Dialog -->
    <v-dialog v-model="showShiftDialog" max-width="700" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text d-flex align-center justify-space-between">
          <span>{{ editMode ? 'Edit Shift' : 'Create New Shift' }} — Step {{ shiftCreationStep }} of 2</span>
          <v-btn icon="mdi-close" size="small" variant="text" @click="showShiftDialog = false; shiftCreationStep = 1" />
        </v-card-title>
        <v-stepper v-model="shiftCreationStep" flat>
          <v-stepper-header>
            <v-stepper-item :complete="shiftCreationStep > 1" :value="1" title="Select Role" />
            <v-divider />
            <v-stepper-item :value="2" title="Assign & Tasks" />
          </v-stepper-header>
        </v-stepper>
        <v-divider />
        <v-card-text class="pa-5">
          <div v-if="shiftCreationStep === 1">
            <v-alert type="info" variant="tonal" density="compact" color="#12086F" class="mb-4">
              <div class="text-caption"><v-icon size="small" class="mr-1">mdi-information</v-icon>Select which job role this shift is for</div>
            </v-alert>
            <v-select v-model="shiftForm.jobRole" :items="jobRoles" item-title="title" item-value="job_role_id" label="Job Role *" variant="outlined" density="comfortable" color="#12086F" prepend-icon="mdi-briefcase" />
          </div>
          <div v-if="shiftCreationStep === 2">
            <v-text-field v-model="shiftForm.date" label="Date" type="date" variant="outlined" density="compact" class="mb-3" color="#12086F" readonly />
            <div class="mb-3">
              <div class="text-caption text-grey mb-2">Start Time</div>
              <v-row dense>
                <v-col cols="4"><v-select v-model="shiftForm.startHour"   :items="timeOptions.hours"   label="Hour"  variant="outlined" density="compact" color="#12086F" /></v-col>
                <v-col cols="4"><v-select v-model="shiftForm.startMinute" :items="timeOptions.minutes" label="Min"   variant="outlined" density="compact" color="#12086F" /></v-col>
                <v-col cols="4"><v-select v-model="shiftForm.startAmPm"   :items="timeOptions.ampm"    label="AM/PM" variant="outlined" density="compact" color="#12086F" /></v-col>
              </v-row>
            </div>
            <div class="mb-3">
              <div class="text-caption text-grey mb-2">End Time</div>
              <v-row dense>
                <v-col cols="4"><v-select v-model="shiftForm.endHour"   :items="timeOptions.hours"   label="Hour"  variant="outlined" density="compact" color="#12086F" /></v-col>
                <v-col cols="4"><v-select v-model="shiftForm.endMinute" :items="timeOptions.minutes" label="Min"   variant="outlined" density="compact" color="#12086F" /></v-col>
                <v-col cols="4"><v-select v-model="shiftForm.endAmPm"   :items="timeOptions.ampm"    label="AM/PM" variant="outlined" density="compact" color="#12086F" /></v-col>
              </v-row>
            </div>
            <v-checkbox v-model="shiftForm.allowEmpty" label="Create empty shift (assign employee later)" color="#12086F" density="compact" hide-details class="mb-3" />
            <v-select
              v-model="shiftForm.userId"
              :items="availableEmployees"
              :item-title="(e) => { const name = `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`.trim(); const r = (e.jobRoles || []).find(r => r.is_primary); const rt = r?.role_title || e.job_role || ''; return rt ? `${name} (${rt})` : name; }"
              :item-value="(e) => e.user_id || e.userId"
              :label="shiftForm.allowEmpty ? 'Assign to Employee (optional)' : 'Assign to Employee *'"
              variant="outlined" density="compact" class="mb-3" color="#12086F"
              :disabled="shiftForm.allowEmpty" clearable
            >
              <template #prepend-item>
                <v-list-item>
                  <v-list-item-title :class="availableEmployees.length > 0 ? 'text-caption text-success' : 'text-caption text-error'">
                    <v-icon size="small" class="mr-1">{{ availableEmployees.length > 0 ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
                    {{ availableEmployees.length }} employee(s) available for this time
                  </v-list-item-title>
                </v-list-item>
                <v-divider class="my-2" />
              </template>
            </v-select>
            <v-divider class="mb-3" />
            <div class="text-caption text-grey mb-2">Assign Task Lists (optional)</div>
            <v-select v-model="shiftForm.assignedTasks" :items="templateTaskLists" item-title="title" item-value="tasklist_id" label="Task Lists" variant="outlined" density="compact" color="#12086F" multiple chips closable-chips />
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn v-if="shiftCreationStep > 1" variant="text" @click="previousStep" prepend-icon="mdi-chevron-left">Back</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showShiftDialog = false; shiftCreationStep = 1">Cancel</v-btn>
          <v-btn v-if="shiftCreationStep < 2" color="#12086F" variant="flat" @click="nextStep" append-icon="mdi-chevron-right">Next</v-btn>
          <v-btn v-else color="#12086F" variant="flat" :loading="creatingShift" @click="handleSaveShift" prepend-icon="mdi-check">
            {{ editMode ? 'Save Changes' : 'Create Shift' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Confirm Delete</v-card-title>
        <v-divider />
        <v-card-text class="pa-5"><p class="text-body-1">Are you sure you want to delete this shift?</p></v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false" :disabled="deleting">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Save Template Dialog -->
    <v-dialog v-model="showSaveTemplateDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Save as Template</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field v-model="templateName" label="Template Name *" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-textarea v-model="templateDescription" label="Description (optional)" variant="outlined" density="compact" rows="2" color="#12086F" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showSaveTemplateDialog = false">Cancel</v-btn>
          <v-btn color="#9C27B0" variant="flat" :loading="savingTemplate" @click="handleSaveTemplate">Save Template</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Load Template Dialog -->
    <v-dialog v-model="showLoadTemplateDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Load Template</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mb-4">
            <div class="text-caption">Shifts will be created for the current week as drafts.</div>
          </v-alert>
          <v-select v-model="selectedTemplateId" :items="templates" item-title="name" item-value="template_id" label="Select Template *" variant="outlined" density="compact" color="#12086F" :loading="loadingTemplates" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showLoadTemplateDialog = false">Cancel</v-btn>
          <v-btn color="#4361EE" variant="flat" :loading="loadingTemplate" @click="handleLoadTemplate" :disabled="!selectedTemplateId">Load Template</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }

.calendar-grid { display: grid; }

/* ── Column headers ────────────────────────────────────────────────────── */
.calendar-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white; padding: 12px 8px; text-align: center;
  border-right: 1px solid rgba(255,255,255,0.1);
  border-bottom: 2px solid #12086F;
}
.calendar-header:last-child { border-right: none; }
.today-header { background: linear-gradient(135deg, #4361EE 0%, #5B73F0 100%); }
.day-name { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 4px; }
.day-date { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
.date-number { font-size: 20px; font-weight: bold; line-height: 1; }
.date-month { font-size: 11px; opacity: 0.8; }

/* ── Day cells ─────────────────────────────────────────────────────────── */
.calendar-day {
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  min-height: 500px;
}
.calendar-day:last-child { border-right: none; }
.today-cell { background: #f0f4ff; }
.calendar-day--month { min-height: 110px !important; }

/* ── Month headers ─────────────────────────────────────────────────────── */
.month-header-row { display: grid; grid-template-columns: repeat(7, 1fr); }
.month-header-cell {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white; text-align: center; padding: 8px 4px;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  border-right: 1px solid rgba(255,255,255,0.1);
}
.month-header-cell:last-child { border-right: none; }
.month-date-num { font-size: 13px; font-weight: 700; color: #12086F; padding: 6px 8px 2px; }
.today-num {
  background: #12086F; color: white !important; border-radius: 50%;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  margin: 4px 6px 2px; padding: 0; font-size: 12px;
}

/* ── Shifts container ──────────────────────────────────────────────────── */
.shifts-container {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 100%;
}

/* ── Shift card ────────────────────────────────────────────────────────── */
.shift-card {
  background: white;
  border-left: 3px solid #4361EE;
  border-radius: 6px;
  padding: 7px 8px 6px;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  position: relative;
}
.shift-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(18,8,111,0.18);
}

/* ✅ Time range — start → end */
.shift-time-row {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 3px;
}
.shift-time-start,
.shift-time-end {
  font-size: 11px;
  font-weight: 700;
  color: #12086F;
}
.shift-time-arrow {
  font-size: 9px;
  color: #9ca3af;
  flex-shrink: 0;
}

/* Employee name */
.shift-employee {
  font-size: 11px;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}
.shift-unassigned {
  color: #f57c00;
  font-style: italic;
}

/* Job role */
.shift-role {
  font-size: 10px;
  color: #6b7280;
  margin-bottom: 4px;
}

/* Draft badge */
.shift-draft-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  background: rgba(245, 124, 0, 0.12);
  color: #b45309;
  border-radius: 3px;
  padding: 1px 5px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 4px;
}

/* ✅ Action buttons — always visible at bottom of card, proper size */
.shift-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  border-top: 1px solid rgba(0,0,0,0.06);
  padding-top: 5px;
}
.shift-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  background: transparent;
}
.shift-action-edit {
  color: #4361EE;
}
.shift-action-edit:hover {
  background: rgba(67, 97, 238, 0.1);
}
.shift-action-delete {
  color: #d32f2f;
}
.shift-action-delete:hover {
  background: rgba(211, 47, 47, 0.1);
}

/* ── Add shift area ────────────────────────────────────────────────────── */
.add-shift-area {
  margin-top: auto;
  padding: 8px;
  border: 1px dashed #c0c0c0;
  border-radius: 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.add-shift-area:hover { border-color: #12086F; background: rgba(18,8,111,0.03); }
.add-shift-text { font-size: 11px; font-weight: 500; color: #12086F; }
</style>