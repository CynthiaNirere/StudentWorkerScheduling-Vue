<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

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

const showOverlapDialog = ref(false);
const overlapWarnings = ref([]);
const pendingShiftData = ref(null);

const editMode = ref(false);
const selectedShift = ref(null);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const templateName = ref("");
const templateDescription = ref("");
const selectedTemplateId = ref(null);
const shiftCreationStep = ref(1);
const showAllEmployees  = ref(false);
const step1Mode         = ref('all');

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
    const dayDateString = toLocalDateStr(day);

    const dayShifts = shifts.value.filter(shift => {
      const raw = shift.shift_time ?? shift.shiftTime;
      if (!raw) return false;
      const shiftDate = new Date(Number(raw));
      if (isNaN(shiftDate.getTime())) return false;
      const y = shiftDate.getFullYear();
      const m = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const d = String(shiftDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === dayDateString;
    }).sort((a, b) => (a.start_time ?? a.startTime ?? 0) - (b.start_time ?? b.startTime ?? 0));

    return {
      date: day, dateString: dayDateString,
      dayName: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i],
      dayShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],
      dayOfMonth: day.getDate(),
      month: day.toLocaleDateString('en-US', { month: 'short' }),
      isToday: dayDateString === toLocalDateStr(new Date()),
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
    const ds = toLocalDateStr(date);
    const dayShifts = shifts.value.filter(shift => {
      const raw = shift.shift_time ?? shift.shiftTime;
      if (!raw) return false;
      const sd = new Date(Number(raw));
      if (isNaN(sd.getTime())) return false;
      return toLocalDateStr(sd) === ds;
    }).sort((a, b) => (a.start_time ?? a.startTime ?? 0) - (b.start_time ?? b.startTime ?? 0));
    days.push({
      date, dateString: ds, dayOfMonth: d,
      dayShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()],
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      isToday: ds === toLocalDateStr(new Date()),
      shifts: dayShifts
    });
  }
  return days;
});

const todayDay = computed(() => {
  const today = toLocalDateStr(new Date());
  return weekDays.value.find(d => d.dateString === today) || weekDays.value[0];
});

const displayDays = computed(() => {
  if (viewMode.value === 'day')   return [todayDay.value];
  if (viewMode.value === 'month') return monthDays.value;
  return weekDays.value;
});

const currentWeekLabel = computed(() => {
  if (viewMode.value === 'day')
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (viewMode.value === 'month')
    return new Date(selectedWeek.value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const start = weekDays.value[0];
  const end   = weekDays.value[6];
  if (start.month === end.month) return `${start.month} ${start.dayOfMonth} – ${end.dayOfMonth}, ${start.date.getFullYear()}`;
  return `${start.month} ${start.dayOfMonth} – ${end.month} ${end.dayOfMonth}, ${start.date.getFullYear()}`;
});

const timeOptions = {
  hours:   Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')),
  minutes: ['00','15','30','45'],
  ampm:    ['AM','PM']
};

const selectedRoleName = computed(() => {
  if (!shiftForm.value.jobRole) return '';
  const role = jobRoles.value.find(r => r.job_role_id === shiftForm.value.jobRole);
  return role ? role.title : '';
});

const availableEmployees = computed(() => {
  if (!shiftForm.value.date) return getEmployeePool();
  const [year, month, day] = shiftForm.value.date.split('-').map(Number);
  const dayOfWeek    = new Date(year, month - 1, day).getDay();
  const startMinutes = timeToMinutes(shiftForm.value.startHour, shiftForm.value.startMinute, shiftForm.value.startAmPm);
  const endMinutes   = timeToMinutes(shiftForm.value.endHour,   shiftForm.value.endMinute,   shiftForm.value.endAmPm);
  if (startMinutes >= endMinutes) return getEmployeePool();
  return getEmployeePool().filter(emp => {
    const empId    = emp.user_id || emp.userId;
    const empAvail = availability.value.filter(a => {
      const aUserId    = a.user_id    || a.userId;
      const aDayOfWeek = a.day_of_week !== undefined ? a.day_of_week : a.dayOfWeek;
      return String(aUserId) === String(empId) && Number(aDayOfWeek) === dayOfWeek;
    });
    if (empAvail.length === 0) return false;
    return empAvail.some(slot => {
      const aStart = slot.start_time !== undefined ? slot.start_time : (slot.startTime || 0);
      const aEnd   = slot.end_time   !== undefined ? slot.end_time   : (slot.endTime   || 1440);
      return aStart < endMinutes && aEnd > startMinutes;
    });
  });
});

const getEmployeePool = () => {
  if (step1Mode.value === 'all' || showAllEmployees.value || !shiftForm.value.jobRole) return employees.value;
  const selectedRoleId = String(shiftForm.value.jobRole);
  return employees.value.filter(emp => {
    const roles = emp.jobRoles || [];
    return roles.some(r => String(r.job_role_id) === selectedRoleId || String(r.jobRoleId) === selectedRoleId);
  });
};

const getEmpRoleNames = (emp) => {
  const roles = emp.jobRoles || [];
  const names = [...new Set(roles.map(r => r.role_title || r.title || '').filter(Boolean))];
  return names.length ? names : (emp.job_role ? [emp.job_role] : []);
};

const getEmpDisplayName = (emp) => {
  const name  = `${emp.fName || emp.first_name || ''} ${emp.lName || emp.last_name || ''}`.trim();
  const names = getEmpRoleNames(emp);
  return names.length ? `${name} (${names.join(' · ')})` : name;
};

const templateTaskLists = computed(() =>
  taskLists.value.filter(t => {
    const isT = t.is_template ?? t.isTemplate;
    return isT === true || isT === 1 || isT === '1';
  })
);

const groupShiftsByTime = (dayShifts) => {
  if (!dayShifts.length) return [];
  const groups = [];
  const used = new Set();
  for (let i = 0; i < dayShifts.length; i++) {
    if (used.has(i)) continue;
    const sA = dayShifts[i];
    const group = [sA];
    used.add(i);
    const startA = sA.start_time ?? sA.startTime ?? 0;
    const endA   = sA.end_time   ?? sA.endTime   ?? 0;
    for (let j = i + 1; j < dayShifts.length; j++) {
      if (used.has(j)) continue;
      const sB = dayShifts[j];
      const startB = sB.start_time ?? sB.startTime ?? 0;
      const endB   = sB.end_time   ?? sB.endTime   ?? 0;
      if (startB < endA && endB > startA) { group.push(sB); used.add(j); }
    }
    groups.push(group);
  }
  return groups;
};

const colorLegend = computed(() => {
  const usedRoleIds = new Set(shifts.value.map(s => s.job_role_id || s.jobRoleId).filter(Boolean));
  return jobRoles.value
    .filter(r => usedRoleIds.has(r.job_role_id))
    .map(r => ({ name: r.title, bg: getColorByRoleId(r.job_role_id), border: getBorderByRoleId(r.job_role_id) }));
});

const SHIFT_BG_COLORS     = ['#E3F2FD','#E8F5E9','#FFF9C4','#FFE0B2','#F3E5F5','#FCE4EC'];
const SHIFT_BORDER_COLORS = ['#1976D2','#2e7d32','#f57c00','#ff6f00','#7b1fa2','#c2185b'];
const getColorByRoleId  = (id) => SHIFT_BG_COLORS[(id || 0) % 6];
const getBorderByRoleId = (id) => SHIFT_BORDER_COLORS[(id || 0) % 6];

// ── DATA LOADING ──────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadShifts(), loadEmployees(), loadAvailability(), loadJobRoles(), loadTaskLists(), loadTemplates()]);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup',   onDragEnd);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup',   onDragEnd);
});

const loadShifts = async () => {
  loadingShifts.value = true;
  try { const res = await EmployerService.getAllShifts(); shifts.value = Array.isArray(res.data) ? res.data : []; }
  catch { showSnackbar("Error loading shifts", "error"); }
  finally { loadingShifts.value = false; }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const allUsers = Array.isArray(res.data) ? res.data : [];
    const currentUserId = user.value?.user_id || user.value?.userId;
    const list = allUsers.filter(u => u.role === 'employee' && (u.user_id || u.userId) !== currentUserId);
    for (const emp of list) {
      try { const locationId = user.value?.work_location || user.value?.impersonatedLocation; const r = await EmployerService.getUserRoles(emp.user_id || emp.userId, locationId); emp.jobRoles = Array.isArray(r.data) ? r.data : []; }
      catch { emp.jobRoles = []; }
    }
    employees.value = list;
  } catch {}
};

const loadAvailability = async () => { try { const res = await EmployerService.getAllAvailability(); availability.value = Array.isArray(res.data) ? res.data : []; } catch {} };
const loadJobRoles     = async () => { try { const res = await EmployerService.getAllJobRoles();     jobRoles.value     = Array.isArray(res.data) ? res.data : []; } catch {} };
const loadTaskLists    = async () => { try { const res = await EmployerService.getAllTaskLists();    taskLists.value    = Array.isArray(res.data) ? res.data : []; } catch {} };
const loadTemplates    = async () => {
  loadingTemplates.value = true;
  try { const res = await EmployerService.getAllTemplates(); templates.value = Array.isArray(res.data) ? res.data : []; }
  catch {} finally { loadingTemplates.value = false; }
};

// ── NAVIGATION ────────────────────────────────────────────────────────────
const previousPeriod = () => {
  const d = new Date(selectedWeek.value);
  if (viewMode.value === 'month') d.setMonth(d.getMonth() - 1); else d.setDate(d.getDate() - 7);
  selectedWeek.value = d;
};
const nextPeriod = () => {
  const d = new Date(selectedWeek.value);
  if (viewMode.value === 'month') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 7);
  selectedWeek.value = d;
};
const goToToday = () => { selectedWeek.value = new Date(); };

// ── SHIFT ACTIONS ─────────────────────────────────────────────────────────
const openCreateShiftForDay = (day) => {
  editMode.value = false; selectedShift.value = null; shiftCreationStep.value = 1; showAllEmployees.value = false; step1Mode.value = 'all';
  shiftForm.value = { date: day.dateString, startHour: "9", startMinute: "00", startAmPm: "AM", endHour: "5", endMinute: "00", endAmPm: "PM", userId: "", jobRole: "", notes: "", assignedTasks: [], allowEmpty: false };
  showShiftDialog.value = true;
};

const nextStep     = () => { if (shiftCreationStep.value === 1) { shiftCreationStep.value = 2; } };
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

const checkForOverlaps = (shiftData) => {
  const warnings = [];
  const editingId = editMode.value ? (selectedShift.value?.shift_id || selectedShift.value?.id) : null;
  const sameDayShifts = shifts.value.filter(s => {
    const sId = s.shift_id || s.id;
    if (editingId && sId === editingId) return false;
    const raw = s.shift_time ?? s.shiftTime;
    if (!raw) return false;
    const d = new Date(Number(raw));
    const newD = new Date(Number(shiftData.shiftTime));
    return !isNaN(d.getTime()) && toLocalDateStr(d) === toLocalDateStr(newD);
  });
  for (const existing of sameDayShifts) {
    const existStart = existing.start_time ?? existing.startTime ?? 0;
    const existEnd   = existing.end_time   ?? existing.endTime   ?? 0;
    if (!(shiftData.startTime < existEnd && shiftData.endTime > existStart)) continue;
    if ((existing.job_role_id || existing.jobRoleId) === shiftData.jobRoleId)
      warnings.push(`Role conflict: Another ${getJobRoleName(existing)} shift (${getEmployeeName(existing)}) overlaps this time (${formatTime(existStart)} – ${formatTime(existEnd)})`);
    if (shiftData.userId && (existing.user_id || existing.userId) === shiftData.userId)
      warnings.push(`Double-booking: ${getEmployeeName(existing)} is already scheduled ${formatTime(existStart)} – ${formatTime(existEnd)} that day`);
  }
  return warnings;
};

const handleSaveShift = async () => {
  if (creatingShift.value) return;
  if (step1Mode.value === 'role' && !shiftForm.value.jobRole) { showSnackbar("Please select a job role for this shift", "error"); return; }
  if (!shiftForm.value.allowEmpty && !shiftForm.value.userId) { showSnackbar("Please assign an employee or enable 'Create Empty Shift'", "error"); return; }
  if (!shiftForm.value.date) { showSnackbar("Please select a date", "error"); return; }
  const startMinutes = timeToMinutes(shiftForm.value.startHour, shiftForm.value.startMinute, shiftForm.value.startAmPm);
  const endMinutes   = timeToMinutes(shiftForm.value.endHour,   shiftForm.value.endMinute,   shiftForm.value.endAmPm);
  if (endMinutes <= startMinutes) { showSnackbar("End time must be after start time", "error"); return; }
  const [year, month, day] = shiftForm.value.date.split('-').map(Number);
  const shiftData = {
    shiftTime:  new Date(year, month - 1, day, 12, 0, 0, 0).getTime(),
    startTime:  startMinutes, endTime: endMinutes,
    userId:     shiftForm.value.allowEmpty ? null : shiftForm.value.userId,
    jobRoleId:  shiftForm.value.jobRole || null,
    notes:      shiftForm.value.notes || "", status: 'draft',
    locationId: user.value?.work_location || 1,
    createdBy:  user.value?.user_id || user.value?.userId
  };
  const warnings = checkForOverlaps(shiftData);
  if (warnings.length > 0) { overlapWarnings.value = warnings; pendingShiftData.value = shiftData; showOverlapDialog.value = true; return; }
  await doSaveShift(shiftData);
};

const confirmSaveWithOverlap = async () => { showOverlapDialog.value = false; if (pendingShiftData.value) { await doSaveShift(pendingShiftData.value); pendingShiftData.value = null; } };
const cancelOverlapSave = () => { showOverlapDialog.value = false; pendingShiftData.value = null; };

const doSaveShift = async (shiftData) => {
  creatingShift.value = true;
  try {
    if (editMode.value && selectedShift.value) {
      await EmployerService.updateShift(selectedShift.value.shift_id || selectedShift.value.id, shiftData);
      if (shiftForm.value.assignedTasks.length > 0) try { await EmployerService.bulkAssignTasksToShift(selectedShift.value.shift_id || selectedShift.value.id, shiftForm.value.assignedTasks); } catch {}
      showSnackbar("Shift updated successfully!", "success");
    } else {
      const shiftRes = await EmployerService.createShift(shiftData);
      const createdShiftId = shiftRes.data?.shift_id || shiftRes.data?.id;
      if (shiftForm.value.assignedTasks.length > 0 && createdShiftId) try { await EmployerService.bulkAssignTasksToShift(createdShiftId, shiftForm.value.assignedTasks); } catch {}
      showSnackbar("Shift created successfully!", "success");
    }
    showShiftDialog.value = false; shiftCreationStep.value = 1; await loadShifts();
  } catch { showSnackbar(editMode.value ? "Error updating shift" : "Error creating shift", "error"); }
  finally { creatingShift.value = false; }
};

const openEditShift = async (shift) => {
  editMode.value = true; selectedShift.value = shift; shiftCreationStep.value = 1; showAllEmployees.value = false; step1Mode.value = shift.job_role_id || shift.jobRoleId ? 'role' : 'all';
  const raw = shift.shift_time ?? shift.shiftTime;
  const shiftDate = new Date(Number(raw));
  const startTime = minutesToTime(shift.start_time ?? shift.startTime);
  const endTime   = minutesToTime(shift.end_time   ?? shift.endTime);
  let assignedTasks = [];
  try { const r = await EmployerService.getShiftTasks(shift.shift_id || shift.id); if (Array.isArray(r.data)) assignedTasks = r.data.map(st => st.tasklist_id || st.tasklistId); } catch {}
  shiftForm.value = {
    date: toLocalDateStr(shiftDate),
    startHour: startTime.hour, startMinute: startTime.minute, startAmPm: startTime.ampm,
    endHour: endTime.hour, endMinute: endTime.minute, endAmPm: endTime.ampm,
    userId: shift.user_id || shift.userId || "", jobRole: shift.job_role_id || shift.jobRoleId || "",
    notes: shift.notes || "", assignedTasks, allowEmpty: !shift.user_id && !shift.userId
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
    const weekShifts = shifts.value.filter(s => { const raw = s.shift_time ?? s.shiftTime; if (!raw) return false; const d = new Date(Number(raw)); return weekDays.value.some(day => day.dateString === toLocalDateStr(d)); });
    for (const s of weekShifts) { if (s.status === 'draft') await EmployerService.updateShift(s.shift_id || s.id, { status: 'published' }); }
    showSnackbar("Schedule published!", "success"); await loadShifts();
  } catch { showSnackbar("Error publishing schedule", "error"); }
};

const openSaveTemplateDialog = () => {
  const weekShifts = shifts.value.filter(s => { const raw = s.shift_time ?? s.shiftTime; if (!raw) return false; const d = new Date(Number(raw)); return weekDays.value.some(day => day.dateString === toLocalDateStr(d)); });
  if (!weekShifts.length) { showSnackbar("No shifts to save as template", "error"); return; }
  showSaveTemplateDialog.value = true;
};

const handleSaveTemplate = async () => {
  if (!templateName.value) { showSnackbar("Template name is required", "error"); return; }
  savingTemplate.value = true;
  try {
    const weekShifts = shifts.value.filter(s => { const raw = s.shift_time ?? s.shiftTime; if (!raw) return false; const d = new Date(Number(raw)); return weekDays.value.some(day => day.dateString === toLocalDateStr(d)); });
    const templateData = weekShifts.map(s => { const d = new Date(Number(s.shift_time ?? s.shiftTime)); return { dayOfWeek: d.getDay(), startTime: s.start_time ?? s.startTime, endTime: s.end_time ?? s.endTime, jobRoleId: s.job_role_id || s.jobRoleId, notes: s.notes || "" }; });
    await EmployerService.createTemplate({ name: templateName.value, description: templateDescription.value || "", locationId: user.value?.work_location || 1, createdBy: user.value?.user_id || user.value?.userId, templateData: JSON.stringify(templateData), isActive: true });
    showSnackbar("Template saved!", "success"); showSaveTemplateDialog.value = false; templateName.value = ""; templateDescription.value = ""; await loadTemplates();
  } catch { showSnackbar("Error saving template", "error"); }
  finally { savingTemplate.value = false; }
};

const openLoadTemplateDialog = () => { if (!templates.value.length) { showSnackbar("No templates available", "error"); return; } showLoadTemplateDialog.value = true; };
const handleLoadTemplate = async () => {
  if (!selectedTemplateId.value) { showSnackbar("Please select a template", "error"); return; }
  loadingTemplate.value = true;
  try {
    const [year, month, day] = weekDays.value[0].dateString.split('-').map(Number);
    await EmployerService.applyTemplate(selectedTemplateId.value, new Date(year, month - 1, day, 12, 0, 0, 0).getTime());
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
const getJobRoleName = (shift) => { const role = jobRoles.value.find(r => r.job_role_id === (shift.job_role_id || shift.jobRoleId)); return role ? role.title : "Unknown"; };
const formatTime = (minutes) => { if (minutes === undefined || minutes === null) return ''; const hour24 = Math.floor(minutes / 60); const minute = minutes % 60; let hour12 = hour24 % 12; if (hour12 === 0) hour12 = 12; return `${hour12}:${minute.toString().padStart(2, '0')}${hour24 >= 12 ? 'PM' : 'AM'}`; };
const getShiftColor       = (shift) => getColorByRoleId(shift.job_role_id || shift.jobRoleId || 0);
const getShiftBorderColor = (shift) => getBorderByRoleId(shift.job_role_id || shift.jobRoleId || 0);
const showSnackbar = (message, color = "success") => { snackbarMessage.value = message; snackbarColor.value = color; snackbar.value = true; };

// ── GOOGLE CALENDAR TIME GRID ──────────────────────────────────────────────
const GRID_START_HOUR = 5;   // 5 AM
const GRID_END_HOUR   = 23;  // 11 PM
const HOUR_HEIGHT_PX  = 60;  // px per hour (1 min = 1 px)

const timeGridHours = computed(() => {
  const hours = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    hours.push({ label: `${h12} ${ampm}`, minutes: h * 60 });
  }
  return hours;
});

// ── DRAG-TO-CREATE ───────────────────────────────────────────────────────
const SNAP_MINUTES   = 15;
const dragActive     = ref(false);
const dragDayStr     = ref('');
const dragStartMin   = ref(0);
const dragCurrentMin = ref(0);
const dayColRefs     = {};

const minutesFromY = (dateStr, clientY) => {
  const el = dayColRefs[dateStr];
  if (!el) return GRID_START_HOUR * 60;
  const rect   = el.getBoundingClientRect();
  const relY   = Math.max(0, clientY - rect.top);
  const rawMin = GRID_START_HOUR * 60 + (relY / HOUR_HEIGHT_PX) * 60;
  return Math.max(
    GRID_START_HOUR * 60,
    Math.min(GRID_END_HOUR * 60, Math.round(rawMin / SNAP_MINUTES) * SNAP_MINUTES)
  );
};

const onColMouseDown = (day, e) => {
  if (e.target.closest('.gcal-shift') || e.target.closest('.gcal-add-shift')) return;
  e.preventDefault();
  dragActive.value     = true;
  dragDayStr.value     = day.dateString;
  dragStartMin.value   = minutesFromY(day.dateString, e.clientY);
  dragCurrentMin.value = dragStartMin.value;
};

const onDragMove = (e) => {
  if (!dragActive.value) return;
  dragCurrentMin.value = minutesFromY(dragDayStr.value, e.clientY);
};

const onDragEnd = () => {
  if (!dragActive.value) return;
  dragActive.value = false;
  let sMin = Math.min(dragStartMin.value, dragCurrentMin.value);
  let eMin = Math.max(dragStartMin.value, dragCurrentMin.value);
  if (eMin - sMin < SNAP_MINUTES) eMin = sMin + 60; // short tap → 1-hour default
  eMin = Math.min(eMin, GRID_END_HOUR * 60);

  const day = displayDays.value.find(d => d.dateString === dragDayStr.value);
  dragDayStr.value = '';
  if (!day) return;

  const s  = minutesToTime(sMin);
  const en = minutesToTime(eMin);
  editMode.value = false; selectedShift.value = null;
  shiftCreationStep.value = 1; showAllEmployees.value = false; step1Mode.value = 'all';
  shiftForm.value = {
    date: day.dateString,
    startHour: s.hour, startMinute: s.minute, startAmPm: s.ampm,
    endHour: en.hour, endMinute: en.minute, endAmPm: en.ampm,
    userId: '', jobRole: '', notes: '', assignedTasks: [], allowEmpty: false,
  };
  showShiftDialog.value = true;
};

const dragGhostStyle = computed(() => {
  if (!dragActive.value) return null;
  const sMin = Math.min(dragStartMin.value, dragCurrentMin.value);
  const eMin = Math.max(dragStartMin.value, dragCurrentMin.value);
  const GRID_START = GRID_START_HOUR * 60;
  const timeLabel = `${formatTime(sMin)} – ${formatTime(eMin)}`;
  return {
    position: 'absolute',
    top:    `${(sMin - GRID_START) * (HOUR_HEIGHT_PX / 60)}px`,
    height: `${Math.max((eMin - sMin) * (HOUR_HEIGHT_PX / 60), 4)}px`,
    left: '2px', right: '2px',
    background:   'rgba(67,97,238,0.18)',
    border:       '2px solid #4361EE',
    borderRadius: '5px',
    zIndex: 6,
    pointerEvents: 'none',
    overflow: 'hidden',
    '--drag-label': JSON.stringify(timeLabel),
  };
});

const dragTimeLabel = computed(() => {
  if (!dragActive.value) return '';
  const sMin = Math.min(dragStartMin.value, dragCurrentMin.value);
  const eMin = Math.max(dragStartMin.value, dragCurrentMin.value);
  return `${formatTime(sMin)} – ${formatTime(eMin)}`;
});

// ── HOVER DETAIL CARD ────────────────────────────────────────────────────
const hoveredShift = ref(null);
const hoverRect    = ref(null);
let   hoverTimer   = null;

const showShiftHover = (e, shift) => {
  clearTimeout(hoverTimer);
  hoveredShift.value = shift;
  hoverRect.value    = e.currentTarget.getBoundingClientRect();
};
const hideShiftHover = () => {
  hoverTimer = setTimeout(() => { hoveredShift.value = null; }, 150);
};
const keepShiftHover = () => { clearTimeout(hoverTimer); };

const getDuration = (shift) => {
  const mins = (shift.end_time ?? shift.endTime ?? 0) - (shift.start_time ?? shift.startTime ?? 0);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};

const hoverCardStyle = computed(() => {
  if (!hoverRect.value) return {};
  const r     = hoverRect.value;
  const vW    = window.innerWidth;
  const vH    = window.innerHeight;
  const cardW = 270;
  const cardH = 290; // generous estimate — covers all content variants

  // Horizontal: prefer right of shift, flip left when not enough room
  const left = r.right + 14 + cardW <= vW ? r.right + 14 : r.left - cardW - 14;

  // Vertical: center card on the shift's midpoint, then clamp to viewport
  const shiftMid   = r.top + r.height / 2;
  const idealTop   = shiftMid - cardH / 2;
  const clampedTop = Math.max(8, Math.min(idealTop, vH - cardH - 8));

  return {
    position: 'fixed',
    top:  clampedTop + 'px',
    left: Math.max(8, left) + 'px',
    zIndex: 3000,
    width: cardW + 'px',
  };
});

const getPositionedShifts = (dayShifts) => {
  if (!dayShifts.length) return [];
  const GRID_START = GRID_START_HOUR * 60;

  // Step 1 — greedy column assignment (sort by start time)
  const sorted = [...dayShifts].sort((a, b) =>
    (a.start_time ?? a.startTime ?? 0) - (b.start_time ?? b.startTime ?? 0)
  );
  const columns = [];
  const items = sorted.map(shift => {
    const start = shift.start_time ?? shift.startTime ?? 0;
    const end   = shift.end_time   ?? shift.endTime   ?? 0;
    let col = columns.findIndex(colEnd => colEnd <= start);
    if (col === -1) { col = columns.length; columns.push(end); }
    else { columns[col] = end; }
    return { shift, col, start, end };
  });

  // Step 2 — connected-component clustering via BFS
  // Two shifts are connected if they overlap (directly or transitively).
  // All shifts in the same cluster must share the same _totalCols so
  // no visual collision occurs even through indirect chains (A-B-C).
  const n = items.length;
  const clusterOf = new Array(n).fill(-1);
  const overlaps  = (i, j) => items[i].start < items[j].end && items[i].end > items[j].start;
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (clusterOf[i] !== -1) continue;
    const queue = [i];
    clusterOf[i] = clusterId;
    let qi = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      for (let j = 0; j < n; j++) {
        if (clusterOf[j] === -1 && overlaps(cur, j)) {
          clusterOf[j] = clusterId;
          queue.push(j);
        }
      }
    }
    clusterId++;
  }

  // Step 3 — _totalCols per cluster = highest column index in cluster + 1
  const clusterMaxCol = new Array(clusterId).fill(0);
  items.forEach((item, i) => {
    clusterMaxCol[clusterOf[i]] = Math.max(clusterMaxCol[clusterOf[i]], item.col + 1);
  });

  // Step 4 — build positioned shift objects
  return items.map(({ shift, col, start, end }, i) => ({
    ...shift,
    _top:       Math.max(0, start - GRID_START) * (HOUR_HEIGHT_PX / 60),
    _height:    Math.max((end - start) * (HOUR_HEIGHT_PX / 60), 28),
    _col:       col,
    _totalCols: clusterMaxCol[clusterOf[i]],
  }));
};
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
          <div class="d-flex align-center ga-2">
            <v-btn-toggle v-model="viewMode" color="#12086F" variant="outlined" mandatory divided density="compact">
              <v-btn value="day"   size="small"><v-icon size="14" class="mr-1">mdi-calendar-today</v-icon>Day</v-btn>
              <v-btn value="week"  size="small"><v-icon size="14" class="mr-1">mdi-calendar-week</v-icon>Week</v-btn>
              <v-btn value="month" size="small"><v-icon size="14" class="mr-1">mdi-calendar-month</v-icon>Month</v-btn>
            </v-btn-toggle>
            <v-btn size="small" color="#12086F" variant="flat" prepend-icon="mdi-publish" @click="publishSchedule">Publish</v-btn>
          </div>
        </div>
      </v-card>

      <!-- Month weekday headers -->
      <div v-if="viewMode === 'month'" class="month-header-row mb-1">
        <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="month-header-cell">{{ d }}</div>
      </div>

      <!-- Calendar card -->
      <v-card variant="outlined" rounded="lg" class="navy-card overflow-hidden">
        <v-progress-linear v-if="loadingShifts" indeterminate color="#12086F" />

        <!-- ── Google Calendar time grid (week / day) ── -->
        <div v-if="viewMode !== 'month'" class="gcal-outer">
          <div class="gcal-inner">

            <!-- Sticky day-header row -->
            <div class="gcal-header-row">
              <div class="gcal-gutter-corner"></div>
              <div class="gcal-days-header">
                <div
                  v-for="day in displayDays"
                  :key="'gh-' + day.dateString"
                  class="gcal-day-header"
                  :class="{ 'gcal-day-header--today': day.isToday }"
                >
                  <div class="gcal-day-name">{{ viewMode === 'day' ? day.dayName : day.dayShort }}</div>
                  <div class="gcal-day-num-wrap">
                    <span class="gcal-day-num" :class="{ 'gcal-day-num--today': day.isToday }">{{ day.dayOfMonth }}</span>
                    <span class="gcal-day-month">{{ day.month }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Body: time gutter + scrollable day columns -->
            <div class="gcal-body-row">
              <!-- Hour labels -->
              <div class="gcal-gutter">
                <div v-for="hour in timeGridHours" :key="hour.minutes" class="gcal-hour-label">
                  {{ hour.label }}
                </div>
              </div>

              <!-- Day columns -->
              <div class="gcal-days-area">
                <div
                  v-for="day in displayDays"
                  :key="'gc-' + day.dateString"
                  :ref="el => { if (el) dayColRefs[day.dateString] = el }"
                  class="gcal-day-col"
                  :class="{
                    'gcal-day-col--today':    day.isToday,
                    'gcal-day-col--dragging': dragActive && dragDayStr === day.dateString,
                  }"
                  @mousedown.prevent="onColMouseDown(day, $event)"
                >
                  <!-- Hour rows: grid lines (hover highlight) -->
                  <div
                    v-for="hour in timeGridHours"
                    :key="'hr-' + hour.minutes"
                    class="gcal-hour-row"
                  ></div>

                  <!-- Drag ghost preview -->
                  <div
                    v-if="dragActive && dragDayStr === day.dateString"
                    class="gcal-drag-ghost"
                    :style="dragGhostStyle"
                  >
                    <span class="gcal-drag-label">{{ dragTimeLabel }}</span>
                  </div>

                  <!-- Absolutely-positioned shift blocks -->
                  <div
                    v-for="shift in getPositionedShifts(day.shifts)"
                    :key="shift.shift_id || shift.id"
                    class="gcal-shift"
                    :style="{
                      top:             shift._top + 'px',
                      height:          shift._height + 'px',
                      left:            `calc(${shift._col} / ${shift._totalCols} * 100% + 2px)`,
                      width:           `calc(100% / ${shift._totalCols} - 4px)`,
                      backgroundColor: getShiftColor(shift),
                      borderLeftColor: getShiftBorderColor(shift),
                    }"
                    @click.stop="openEditShift(shift)"
                    @mouseenter="showShiftHover($event, shift)"
                    @mouseleave="hideShiftHover"
                  >
                    <div class="gcal-shift-time">
                      {{ formatTime(shift.start_time ?? shift.startTime) }} – {{ formatTime(shift.end_time ?? shift.endTime) }}
                    </div>
                    <div class="gcal-shift-employee" :class="{ 'gcal-shift-unassigned': getEmployeeName(shift) === 'Unassigned' }">
                      {{ getEmployeeName(shift) }}
                    </div>
                    <div class="gcal-shift-role">{{ getJobRoleName(shift) }}</div>
                    <div v-if="shift.status === 'draft'" class="gcal-shift-draft">Draft</div>
                    <div class="gcal-shift-actions">
                      <button class="gcal-action-btn gcal-action-edit" @click.stop="openEditShift(shift)">
                        <v-icon size="12">mdi-pencil</v-icon>
                      </button>
                      <button class="gcal-action-btn gcal-action-delete" @click.stop="openDeleteDialog(shift)">
                        <v-icon size="12">mdi-delete</v-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Hover "+" to add shift -->
                  <div class="gcal-add-shift" @click.stop="openCreateShiftForDay(day)">
                    <v-icon size="16" color="#12086F">mdi-plus</v-icon>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        <!-- end Google Calendar grid -->

        <!-- ── Month view (compact card grid, unchanged) ── -->
        <div v-else class="calendar-scroll-wrapper">
          <div class="calendar-grid" style="grid-template-columns: repeat(7, 1fr);">
            <div
              v-for="day in displayDays"
              :key="'day-' + day.dateString"
              class="calendar-day calendar-day--month"
              :class="{ 'today-cell': day.isToday }"
            >
              <div class="month-date-num" :class="{ 'today-num': day.isToday }">{{ day.dayOfMonth }}</div>
              <div class="shifts-container">
                <div v-for="(group, gi) in groupShiftsByTime(day.shifts)" :key="'group-' + gi" class="shift-time-group">
                  <div
                    v-for="shift in group"
                    :key="shift.shift_id || shift.id"
                    class="shift-card"
                    :style="{ backgroundColor: getShiftColor(shift), borderLeftColor: getShiftBorderColor(shift) }"
                  >
                    <div class="shift-time-row">
                      <span class="shift-time-start">{{ formatTime(shift.start_time ?? shift.startTime) }}</span>
                      <span class="shift-time-arrow">→</span>
                      <span class="shift-time-end">{{ formatTime(shift.end_time ?? shift.endTime) }}</span>
                    </div>
                    <div class="shift-employee" :class="{ 'shift-unassigned': getEmployeeName(shift) === 'Unassigned' }">
                      {{ getEmployeeName(shift) }}
                    </div>
                    <div v-if="shift.status === 'draft'" class="shift-draft-badge">Draft</div>
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
                </div>
                <div class="add-shift-area" @click="openCreateShiftForDay(day)">
                  <v-icon size="14" color="#12086F">mdi-plus</v-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

      </v-card>

      <!-- Color Legend -->
      <div v-if="colorLegend.length > 0" class="mt-3 d-flex flex-wrap align-center ga-2">
        <span class="text-caption text-grey font-weight-medium mr-1">Legend:</span>
        <div v-for="item in colorLegend" :key="item.name" class="legend-item" :style="{ backgroundColor: item.bg, borderColor: item.border }">
          <span class="legend-dot" :style="{ backgroundColor: item.border }" />
          <span class="legend-label">{{ item.name }}</span>
        </div>
      </div>

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
            <div class="text-body-2 text-grey mb-3">Who do you want to assign this shift to?</div>
            <v-row dense class="mb-4">
              <v-col cols="6">
                <div
                  class="selection-card pa-4 rounded-lg d-flex flex-column align-center text-center cursor-pointer"
                  :class="{ 'selection-card--active': !shiftForm.jobRole && step1Mode === 'all' }"
                  style="border: 2px solid; border-color: inherit; min-height: 110px; justify-content: center;"
                  :style="step1Mode === 'all' ? 'border-color:#12086F; background:#f0effe;' : 'border-color:#e0e0e0; background:#fafafa;'"
                  @click="step1Mode = 'all'; shiftForm.jobRole = ''"
                >
                  <v-icon size="32" :color="step1Mode === 'all' ? '#12086F' : '#9e9e9e'" class="mb-2">mdi-account-group</v-icon>
                  <div class="text-subtitle-2 font-weight-bold" :style="step1Mode === 'all' ? 'color:#12086F' : 'color:#616161'">All Employees</div>
                  <div class="text-caption text-grey">See everyone available</div>
                </div>
              </v-col>
              <v-col cols="6">
                <div
                  class="selection-card pa-4 rounded-lg d-flex flex-column align-center text-center cursor-pointer"
                  :style="step1Mode === 'role' ? 'border: 2px solid #12086F; background:#f0effe;' : 'border: 2px solid #e0e0e0; background:#fafafa;'"
                  style="min-height: 110px; justify-content: center;"
                  @click="step1Mode = 'role'"
                >
                  <v-icon size="32" :color="step1Mode === 'role' ? '#12086F' : '#9e9e9e'" class="mb-2">mdi-briefcase-account</v-icon>
                  <div class="text-subtitle-2 font-weight-bold" :style="step1Mode === 'role' ? 'color:#12086F' : 'color:#616161'">Filter by Role</div>
                  <div class="text-caption text-grey">Only show qualified staff</div>
                </div>
              </v-col>
            </v-row>
            <v-select
              v-if="step1Mode === 'role'"
              v-model="shiftForm.jobRole"
              :items="jobRoles"
              item-title="title"
              item-value="job_role_id"
              label="Select Role"
              variant="outlined"
              density="comfortable"
              color="#12086F"
              prepend-icon="mdi-briefcase"
              clearable
              autofocus
            />
          </div>
          <div v-if="shiftCreationStep === 2">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center ga-1">
                <template v-if="!shiftForm.jobRole">
                  <v-icon size="16" color="#f57c00">mdi-account-group</v-icon>
                  <span class="text-caption" style="color:#f57c00;">Showing all employees (no role filter)</span>
                </template>
                <template v-else-if="!showAllEmployees">
                  <v-icon size="16" color="#4361EE">mdi-filter</v-icon>
                  <span class="text-caption" style="color:#4361EE;">Filtered: <strong>{{ selectedRoleName }}</strong> only</span>
                </template>
                <template v-else>
                  <v-icon size="16" color="#f57c00">mdi-account-group</v-icon>
                  <span class="text-caption" style="color:#f57c00;">Showing all employees</span>
                </template>
              </div>
              <v-btn
                v-if="shiftForm.jobRole"
                :color="showAllEmployees ? '#f57c00' : '#4361EE'"
                :variant="showAllEmployees ? 'flat' : 'tonal'"
                size="x-small"
                :prepend-icon="showAllEmployees ? 'mdi-filter-off' : 'mdi-account-group'"
                @click="showAllEmployees = !showAllEmployees"
              >
                {{ showAllEmployees ? 'Show role only' : 'Show all employees' }}
              </v-btn>
            </div>
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
              :item-title="getEmpDisplayName"
              :item-value="(e) => e.user_id || e.userId"
              :label="shiftForm.allowEmpty ? 'Assign to Employee (optional)' : 'Assign to Employee *'"
              variant="outlined" density="compact" class="mb-3" color="#12086F" :disabled="shiftForm.allowEmpty" clearable
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
              <template #item="{ item, props }">
                <v-list-item v-bind="props" :title="undefined">
                  <v-list-item-title class="text-body-2 font-weight-medium">
                    {{ `${item.raw.fName || item.raw.first_name || ''} ${item.raw.lName || item.raw.last_name || ''}`.trim() }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="getEmpRoleNames(item.raw).length">
                    <v-chip
                      v-for="role in getEmpRoleNames(item.raw)"
                      :key="role"
                      size="x-small"
                      color="#12086F"
                      variant="tonal"
                      class="mr-1"
                    >{{ role }}</v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
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
          <v-btn v-else color="#12086F" variant="flat" :loading="creatingShift" @click="handleSaveShift" prepend-icon="mdi-check">{{ editMode ? 'Save Changes' : 'Create Shift' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Overlap Warning Dialog -->
    <v-dialog v-model="showOverlapDialog" max-width="500" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 d-flex align-center ga-2" style="color:#f57c00;">
          <v-icon color="#f57c00">mdi-alert</v-icon>Schedule Conflict Detected
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 mb-3">The following conflicts were found for this shift:</p>
          <v-alert v-for="(warning, i) in overlapWarnings" :key="i" type="warning" variant="tonal" density="compact" class="mb-2">
            <div class="text-caption">{{ warning }}</div>
          </v-alert>
          <p class="text-body-2 mt-3">Do you want to save this shift anyway?</p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="cancelOverlapSave">Go Back</v-btn>
          <v-btn color="#f57c00" variant="flat" @click="confirmSaveWithOverlap">Save Anyway</v-btn>
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
          <v-alert type="warning" variant="tonal" density="compact" color="#f57c00" class="mb-4">
            <div class="text-caption font-weight-medium">
              <v-icon size="small" class="mr-1">mdi-alert</v-icon>
              Loading a template will <strong>delete all shifts currently on this week</strong> and replace them with the template's shifts. This cannot be undone.
            </div>
          </v-alert>
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

    <!-- ── Shift hover detail card ── -->
    <teleport to="body">
      <v-card
        v-if="hoveredShift"
        :style="hoverCardStyle"
        rounded="lg"
        elevation="10"
        class="shift-hover-card"
        @mouseenter="keepShiftHover"
        @mouseleave="hoveredShift = null"
      >
        <div class="shift-hover-accent" :style="{ background: getShiftBorderColor(hoveredShift) }"></div>
        <v-card-text class="pa-3">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2 font-weight-bold navy-text">
              {{ formatTime(hoveredShift.start_time ?? hoveredShift.startTime) }} – {{ formatTime(hoveredShift.end_time ?? hoveredShift.endTime) }}
            </span>
            <span class="text-caption text-grey">({{ getDuration(hoveredShift) }})</span>
          </div>
          <div class="d-flex align-center ga-1 mb-1">
            <v-icon size="14" color="#6b7280">mdi-account</v-icon>
            <span class="text-body-2">{{ getEmployeeName(hoveredShift) }}</span>
          </div>
          <div class="d-flex align-center ga-1 mb-1">
            <v-icon size="14" color="#6b7280">mdi-briefcase-outline</v-icon>
            <span class="text-body-2">{{ getJobRoleName(hoveredShift) }}</span>
          </div>
          <div v-if="hoveredShift.notes" class="d-flex align-center ga-1 mb-1">
            <v-icon size="14" color="#6b7280">mdi-note-text-outline</v-icon>
            <span class="text-caption text-grey">{{ hoveredShift.notes }}</span>
          </div>
          <v-chip
            size="x-small"
            :color="hoveredShift.status === 'published' ? '#2e7d32' : '#f57c00'"
            variant="tonal"
            class="mt-2"
          >{{ hoveredShift.status }}</v-chip>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-2">
          <v-btn size="x-small" variant="text" color="#4361EE" prepend-icon="mdi-pencil"
            @click="openEditShift(hoveredShift); hoveredShift = null">Edit</v-btn>
          <v-spacer />
          <v-btn size="x-small" variant="text" color="error" prepend-icon="mdi-delete"
            @click="openDeleteDialog(hoveredShift); hoveredShift = null">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </teleport>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }

/* ── Horizontal scroll wrapper ──────────────────────────────────────────── */
.calendar-scroll-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #c7d2fe transparent;
}
.calendar-scroll-wrapper::-webkit-scrollbar { height: 6px; }
.calendar-scroll-wrapper::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 3px; }
.calendar-scroll-wrapper::-webkit-scrollbar-track { background: transparent; }

.scroll-hint { border-bottom: 1px solid #f0f0f0; background: #fafafa; }

.calendar-grid { display: grid; }

.calendar-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white; padding: 12px 8px; text-align: center;
  border-right: 1px solid rgba(255,255,255,0.1); border-bottom: 2px solid #12086F;
}
.calendar-header:last-child { border-right: none; }
.today-header { background: linear-gradient(135deg, #4361EE 0%, #5B73F0 100%); }
.day-name { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 4px; }
.day-date { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
.date-number { font-size: 20px; font-weight: bold; line-height: 1; }
.date-month { font-size: 11px; opacity: 0.8; }

.calendar-day { border-right: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; background: #fafafa; min-height: 500px; }
.calendar-day:last-child { border-right: none; }
.today-cell { background: #f0f4ff; }
.calendar-day--month { min-height: 110px !important; }

.month-header-row { display: grid; grid-template-columns: repeat(7, 1fr); }
.month-header-cell { background: linear-gradient(135deg, #12086F 0%, #2B354F 100%); color: white; text-align: center; padding: 8px 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.1); }
.month-header-cell:last-child { border-right: none; }
.month-date-num { font-size: 13px; font-weight: 700; color: #12086F; padding: 6px 8px 2px; }
.today-num { background: #12086F; color: white !important; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: 4px 6px 2px; padding: 0; font-size: 12px; }

.shifts-container { padding: 6px; display: flex; flex-direction: column; gap: 5px; min-height: 100%; }

.shift-time-group { display: flex; flex-direction: row; gap: 4px; }
.shift-time-group .shift-card { flex: 1; min-width: 0; }

.shift-card { background: white; border-left: 3px solid #4361EE; border-radius: 6px; padding: 7px 8px 6px; cursor: pointer; transition: box-shadow 0.15s, transform 0.15s; position: relative; }
.shift-card:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(18,8,111,0.18); }

.shift-time-row { display: flex; align-items: center; gap: 3px; margin-bottom: 3px; }
.shift-time-start, .shift-time-end { font-size: 11px; font-weight: 700; color: #12086F; }
.shift-time-arrow { font-size: 9px; color: #9ca3af; flex-shrink: 0; }
.shift-employee { font-size: 11px; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px; }
.shift-unassigned { color: #f57c00; font-style: italic; }
.shift-role { font-size: 10px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.shift-draft-badge { display: inline-block; font-size: 9px; font-weight: 700; background: rgba(245,124,0,0.12); color: #b45309; border-radius: 3px; padding: 1px 5px; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

.shift-actions { display: flex; gap: 4px; margin-top: 4px; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 5px; }
.shift-action-btn { flex: 1; display: flex; align-items: center; justify-content: center; height: 26px; border: none; border-radius: 4px; cursor: pointer; transition: background 0.15s; background: transparent; }
.shift-action-edit { color: #4361EE; }
.shift-action-edit:hover { background: rgba(67,97,238,0.1); }
.shift-action-delete { color: #d32f2f; }
.shift-action-delete:hover { background: rgba(211,47,47,0.1); }

.add-shift-area { margin-top: auto; padding: 8px; border: 1px dashed #c0c0c0; border-radius: 6px; text-align: center; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px; }
.add-shift-area:hover { border-color: #12086F; background: rgba(18,8,111,0.03); }
.add-shift-text { font-size: 11px; font-weight: 500; color: #12086F; }

.legend-item { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px 3px 6px; border-radius: 20px; border: 1px solid; font-size: 11px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-label { font-size: 11px; font-weight: 500; color: #374151; }

/* Dark mode */
.v-theme--dark .calendar-day { background: #1e1e2e; border-color: #333; }
.v-theme--dark .today-cell { background: #1a1f3a; }
.v-theme--dark .shift-card { background: #2a2a3e; }
.v-theme--dark .shift-employee { color: #e0e0e0; }
.v-theme--dark .shift-time-start, .v-theme--dark .shift-time-end { color: #a8b4ff; }
.v-theme--dark .shift-role { color: #9ca3af; }
.v-theme--dark .navy-text { color: #a8b4ff !important; }
.v-theme--dark .add-shift-area { border-color: #444; }
.v-theme--dark .add-shift-text { color: #a8b4ff; }
.v-theme--dark .legend-label { color: #e0e0e0; }
.v-theme--dark .scroll-hint { background: #1e1e2e; border-color: #333; }
.v-theme--dark .calendar-scroll-wrapper { scrollbar-color: #333 transparent; }

/* ── Google Calendar time-grid ─────────────────────────────────────────────── */
.gcal-outer {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 720px;
  scrollbar-width: thin;
  scrollbar-color: #c7d2fe transparent;
}
.gcal-outer::-webkit-scrollbar { width: 6px; height: 6px; }
.gcal-outer::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 3px; }

.gcal-inner {
  display: flex;
  flex-direction: column;
  min-width: 700px;
}

/* ── Sticky header row ── */
.gcal-header-row {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(255,255,255,0.12);
}
.gcal-gutter-corner {
  width: 56px;
  min-width: 56px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
}
.gcal-days-header { display: flex; flex: 1; }
.gcal-day-header {
  flex: 1;
  min-width: 100px;
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white;
  text-align: center;
  padding: 8px 4px 10px;
  border-right: 1px solid rgba(255,255,255,0.08);
}
.gcal-day-header:last-child { border-right: none; }
.gcal-day-header--today { background: linear-gradient(135deg, #4361EE 0%, #5B73F0 100%); }
.gcal-day-name { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; opacity: 0.85; margin-bottom: 4px; }
.gcal-day-num-wrap { display: flex; align-items: center; justify-content: center; gap: 4px; }
.gcal-day-num { font-size: 22px; font-weight: bold; line-height: 1; }
.gcal-day-num--today {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  background: white; color: #4361EE; font-size: 17px;
}
.gcal-day-month { font-size: 10px; opacity: 0.75; }

/* ── Body row (gutter + day columns) ── */
.gcal-body-row { display: flex; }

.gcal-gutter {
  width: 56px;
  min-width: 56px;
  flex-shrink: 0;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
}
.gcal-hour-label {
  height: 60px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 3px 8px 0 0;
  font-size: 10px;
  color: #9ca3af;
  font-weight: 500;
  border-bottom: 1px solid #f3f4f6;
  box-sizing: border-box;
  user-select: none;
}

/* ── Day columns ── */
.gcal-days-area { display: flex; flex: 1; }
.gcal-day-col {
  flex: 1;
  min-width: 100px;
  position: relative;
  border-right: 1px solid #e5e7eb;
}
.gcal-day-col:last-child { border-right: none; }
.gcal-day-col--today { background: #f8f9ff; }

.gcal-hour-row {
  height: 60px;
  border-bottom: 1px solid #f0f0f2;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.1s;
}
.gcal-hour-row:hover { background: rgba(18,8,111,0.03); }

/* ── Shift blocks ── */
.gcal-shift {
  position: absolute;
  border-left: 3px solid #4361EE;
  border-radius: 5px;
  padding: 3px 6px 3px 5px;
  overflow: hidden;
  cursor: pointer;
  z-index: 3;
  box-shadow: 0 1px 3px rgba(0,0,0,0.10);
  transition: box-shadow 0.15s, z-index 0s;
}
.gcal-shift:hover {
  box-shadow: 0 4px 14px rgba(18,8,111,0.22);
  z-index: 8;
}
.gcal-shift-time {
  font-size: 10px; font-weight: 700; color: #12086F;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4;
}
.gcal-shift-employee {
  font-size: 11px; color: #1f2937;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
  font-weight: 500;
}
.gcal-shift-unassigned { color: #f57c00; font-style: italic; }
.gcal-shift-role {
  font-size: 10px; color: #6b7280;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;
}
.gcal-shift-draft {
  display: inline-block; font-size: 8px; font-weight: 700;
  background: rgba(245,124,0,0.14); color: #b45309;
  border-radius: 2px; padding: 0 3px; text-transform: uppercase; letter-spacing: 0.3px;
  margin-top: 2px;
}

/* Edit/Delete buttons — shown on hover */
.gcal-shift-actions {
  position: absolute; top: 2px; right: 2px;
  display: none; gap: 1px;
  background: rgba(255,255,255,0.82);
  border-radius: 3px; padding: 1px;
}
.gcal-shift:hover .gcal-shift-actions { display: flex; }
.gcal-action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: none; border-radius: 3px;
  cursor: pointer; background: transparent; transition: background 0.1s;
}
.gcal-action-edit  { color: #4361EE; }
.gcal-action-edit:hover  { background: rgba(67,97,238,0.15); }
.gcal-action-delete { color: #d32f2f; }
.gcal-action-delete:hover { background: rgba(211,47,47,0.15); }

/* ── Drag-to-create ── */
.gcal-day-col { cursor: crosshair; }
.gcal-day-col--dragging { cursor: ns-resize !important; user-select: none; }
.gcal-shift { cursor: pointer; }
.gcal-drag-ghost {
  pointer-events: none;
  display: flex;
  align-items: flex-start;
  padding: 3px 5px;
}
.gcal-drag-label {
  font-size: 10px;
  font-weight: 700;
  color: #4361EE;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Hover "+" button per column */
.gcal-add-shift {
  position: absolute; bottom: 10px; right: 8px;
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(18,8,111,0.09);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; opacity: 0; transition: opacity 0.2s; z-index: 4;
}
.gcal-day-col:hover .gcal-add-shift { opacity: 1; }

/* ── Shift hover detail card ── */
.shift-hover-card {
  pointer-events: auto;
  animation: hover-card-in 0.12s ease-out;
}
@keyframes hover-card-in {
  from { opacity: 0; transform: translateX(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateX(0)   scale(1);    }
}
.shift-hover-accent {
  height: 5px;
  border-radius: 8px 8px 0 0;
}

/* Dark mode — gcal */
.v-theme--dark .gcal-gutter { background: #1e1e2e; border-color: #333; }
.v-theme--dark .gcal-hour-label { color: #6b7280; border-color: #2a2a3e; }
.v-theme--dark .gcal-day-col { border-color: #333; }
.v-theme--dark .gcal-day-col--today { background: #1a1f3a; }
.v-theme--dark .gcal-hour-row { border-color: #2a2a3e; }
.v-theme--dark .gcal-shift { box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
.v-theme--dark .gcal-shift-time { color: #a8b4ff; }
.v-theme--dark .gcal-shift-employee { color: #e0e0e0; }
.v-theme--dark .gcal-shift-role { color: #9ca3af; }
.v-theme--dark .gcal-shift-actions { background: rgba(30,30,46,0.85); }
.v-theme--dark .gcal-outer { scrollbar-color: #333 transparent; }
</style>