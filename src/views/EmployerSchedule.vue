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
const selectedWeek = ref(new Date());
const loadingShifts = ref(false);

const showCreateShiftDialog = ref(false);
const showDeleteDialog = ref(false);
const shiftToDelete = ref(null);
const showEditShiftDialog = ref(false);
const selectedShift = ref(null);
const showSaveTemplateDialog = ref(false);
const creatingShift = ref(false);
const deleting = ref(false);
const savingTemplate = ref(false);

const templateSavedForWeek = ref(false);
const savedTemplateWeek = ref(null);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const templateName = ref("");
const templateDescription = ref("");

const newShift = ref({
  date: "",
  startHour: "9",
  startMinute: "00",
  startAmPm: "AM",
  endHour: "5",
  endMinute: "00",
  endAmPm: "PM",
  userId: "",
  jobRole: "",
  notes: "",
});

const editShift = ref({
  date: "",
  startHour: "9",
  startMinute: "00",
  startAmPm: "AM",
  endHour: "5",
  endMinute: "00",
  endAmPm: "PM",
  userId: "",
  jobRole: "",
  notes: "",
});

watch(selectedWeek, (newWeek) => {
  const weekKey = getWeekKey(newWeek);
  if (savedTemplateWeek.value !== weekKey) {
    templateSavedForWeek.value = false;
  }
  loadShifts();
});

const getWeekKey = (date) => {
  const sunday = new Date(date);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.getTime();
};

const weekDays = computed(() => {
  const sunday = new Date(selectedWeek.value);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    
    // ✅ FIX: Use date string comparison to avoid timezone issues
    const dayDateString = day.toISOString().split('T')[0];
    
    const dayShifts = shifts.value.filter(shift => {
      const shiftTimestamp = Number(shift.shiftTime || shift.shift_time);
      const shiftDate = new Date(shiftTimestamp);
      
      // ✅ FIX: Compare using local date strings, not UTC
      const year = shiftDate.getFullYear();
      const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const date = String(shiftDate.getDate()).padStart(2, '0');
      const shiftDateString = `${year}-${month}-${date}`;
      
      return shiftDateString === dayDateString;
    }).sort((a, b) => {
      const timeA = a.start_time || a.startTime;
      const timeB = b.start_time || b.startTime;
      return timeA - timeB;
    });
    
    return {
      date: day,
      dateString: dayDateString,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
      dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      dayOfMonth: day.getDate(),
      month: day.toLocaleDateString('en-US', { month: 'short' }),
      isToday: dayDateString === new Date().toISOString().split('T')[0],
      shifts: dayShifts
    };
  });
});

const currentWeekLabel = computed(() => {
  const start = weekDays.value[0];
  const end = weekDays.value[6];
  
  if (start.month === end.month) {
    return `${start.month} ${start.dayOfMonth} - ${end.dayOfMonth}, ${start.date.getFullYear()}`;
  }
  return `${start.month} ${start.dayOfMonth} - ${end.month} ${end.dayOfMonth}, ${start.date.getFullYear()}`;
});

const timeOptions = {
  hours: Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')),
  minutes: ['00', '15', '30', '45'],
  ampm: ['AM', 'PM']
};

// ✅ NEW: Get available employees based on selected day and time
const availableEmployees = computed(() => {
  if (!newShift.value.date) return employees.value;
  
  const selectedDate = new Date(newShift.value.date);
  const dayOfWeek = selectedDate.getDay();
  
  const startMinutes = timeToMinutes(newShift.value.startHour, newShift.value.startMinute, newShift.value.startAmPm);
  const endMinutes = timeToMinutes(newShift.value.endHour, newShift.value.endMinute, newShift.value.endAmPm);
  
  // If no valid time range selected, return all employees
  if (startMinutes >= endMinutes) return employees.value;
  
  return employees.value.filter(emp => {
    const empId = emp.user_id || emp.userId;
    
    // Find availability for this employee on this day of week
    const empAvailability = availability.value.filter(avail => {
      const availUserId = avail.user_id || avail.userId;
      const availDayOfWeek = avail.day_of_week || avail.dayOfWeek;
      const isAvailable = avail.is_available !== undefined ? avail.is_available : true;
      
      return availUserId === empId && availDayOfWeek === dayOfWeek && isAvailable;
    });
    
    // If no availability set for this day, don't show employee
    if (empAvailability.length === 0) return false;
    
    // Check if any availability slot covers the shift time (with 30min buffer)
    const buffer = 30;
    return empAvailability.some(slot => {
      const availStart = slot.start_time || slot.startTime;
      const availEnd = slot.end_time || slot.endTime;
      
      return (availStart - buffer) <= startMinutes && (availEnd + buffer) >= endMinutes;
    });
  });
});

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadShifts(), loadEmployees(), loadAvailability(), loadJobRoles()]);
});

const loadShifts = async () => {
  loadingShifts.value = true;
  try {
    const res = await EmployerService.getAllShifts();
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading shifts:", err);
    showSnackbar("Error loading shifts", "error");
  } finally {
    loadingShifts.value = false;
  }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const allUsers = Array.isArray(res.data) ? res.data : [];
    const currentUserId = user.value?.user_id || user.value?.userId;
    employees.value = allUsers.filter(u => {
      const empId = u.user_id || u.userId;
      return u.role === 'employee' && empId !== currentUserId;
    });
  } catch (err) {
    console.error("Error loading employees:", err);
  }
};

const loadAvailability = async () => {
  try {
    const res = await EmployerService.getAllAvailability();
    availability.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading availability:", err);
  }
};

const loadJobRoles = async () => {
  try {
    const res = await EmployerService.getAllJobRoles();
    jobRoles.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading job roles:", err);
  }
};

const previousWeek = () => {
  const newDate = new Date(selectedWeek.value);
  newDate.setDate(newDate.getDate() - 7);
  selectedWeek.value = newDate;
};

const nextWeek = () => {
  const newDate = new Date(selectedWeek.value);
  newDate.setDate(newDate.getDate() + 7);
  selectedWeek.value = newDate;
};

const openCreateShiftForDay = (day) => {
  newShift.value.date = day.dateString;
  showCreateShiftDialog.value = true;
};

const timeToMinutes = (hour, minute, ampm) => {
  let h = parseInt(hour);
  const m = parseInt(minute);
  
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  
  return {
    hour: hour12.toString().padStart(2, '0'),
    minute: minute.toString().padStart(2, '0'),
    ampm: ampm
  };
};

const handleCreateShift = async () => {
  if (!newShift.value.date || !newShift.value.userId || !newShift.value.jobRole) {
    showSnackbar("Please fill in all required fields", "error");
    return;
  }

  const startMinutes = timeToMinutes(newShift.value.startHour, newShift.value.startMinute, newShift.value.startAmPm);
  const endMinutes = timeToMinutes(newShift.value.endHour, newShift.value.endMinute, newShift.value.endAmPm);

  if (endMinutes <= startMinutes) {
    showSnackbar("End time must be after start time", "error");
    return;
  }

  creatingShift.value = true;
  try {
    const [year, month, day] = newShift.value.date.split('-').map(Number);
    const shiftDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    
    await EmployerService.createShift({
      shiftTime: shiftDate.getTime(),
      startTime: startMinutes,
      endTime: endMinutes,
      userId: newShift.value.userId,
      jobRoleId: newShift.value.jobRole,
      notes: newShift.value.notes || "",
      status: 'draft',
      locationId: user.value?.work_location || 1,
      createdBy: user.value?.user_id || user.value?.userId
    });

    showSnackbar("Shift created successfully!", "success");
    showCreateShiftDialog.value = false;
    
    newShift.value = {
      date: "",
      startHour: "9",
      startMinute: "00",
      startAmPm: "AM",
      endHour: "5",
      endMinute: "00",
      endAmPm: "PM",
      userId: "",
      jobRole: "",
      notes: "",
    };
    
    await loadShifts();
  } catch (err) {
    console.error('Create shift error:', err);
    showSnackbar("Error creating shift", "error");
  } finally {
    creatingShift.value = false;
  }
};

const openEditShift = (shift) => {
  selectedShift.value = shift;
  
  const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
  const startTime = minutesToTime(shift.start_time || shift.startTime);
  const endTime = minutesToTime(shift.end_time || shift.endTime);
  
  editShift.value = {
    date: shiftDate.toISOString().split('T')[0],
    startHour: startTime.hour,
    startMinute: startTime.minute,
    startAmPm: startTime.ampm,
    endHour: endTime.hour,
    endMinute: endTime.minute,
    endAmPm: endTime.ampm,
    userId: shift.user_id || shift.userId || "",
    jobRole: shift.job_role_id || shift.jobRoleId || "",
    notes: shift.notes || "",
  };
  
  showEditShiftDialog.value = true;
};

const handleUpdateShift = async () => {
  if (!editShift.value.userId || !editShift.value.jobRole) {
    showSnackbar("Please fill in all required fields", "error");
    return;
  }

  const startMinutes = timeToMinutes(editShift.value.startHour, editShift.value.startMinute, editShift.value.startAmPm);
  const endMinutes = timeToMinutes(editShift.value.endHour, editShift.value.endMinute, editShift.value.endAmPm);

  if (endMinutes <= startMinutes) {
    showSnackbar("End time must be after start time", "error");
    return;
  }

  creatingShift.value = true;
  try {
    const [year, month, day] = editShift.value.date.split('-').map(Number);
    const shiftDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    
    await EmployerService.updateShift(selectedShift.value.shift_id || selectedShift.value.id, {
      shiftTime: shiftDate.getTime(),
      startTime: startMinutes,
      endTime: endMinutes,
      userId: editShift.value.userId,
      jobRoleId: editShift.value.jobRole,
      notes: editShift.value.notes || "",
    });

    showSnackbar("Shift updated successfully!", "success");
    showEditShiftDialog.value = false;
    await loadShifts();
  } catch (err) {
    console.error('Update shift error:', err);
    showSnackbar("Error updating shift", "error");
  } finally {
    creatingShift.value = false;
  }
};

const openDeleteDialog = (shift) => {
  shiftToDelete.value = shift;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!shiftToDelete.value) return;
  
  deleting.value = true;
  try {
    await EmployerService.deleteShift(shiftToDelete.value.shift_id || shiftToDelete.value.id);
    showSnackbar("Shift deleted successfully", "success");
    await loadShifts();
  } catch (err) {
    console.error('Delete shift error:', err);
    showSnackbar("Error deleting shift", "error");
  } finally {
    deleting.value = false;
    showDeleteDialog.value = false;
    shiftToDelete.value = null;
  }
};

const publishSchedule = async () => {
  try {
    const weekShifts = shifts.value.filter(shift => {
      const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
      return weekDays.value.some(day => day.dateString === shiftDate.toISOString().split('T')[0]);
    });

    for (const shift of weekShifts) {
      if (shift.status === 'draft') {
        await EmployerService.updateShift(shift.shift_id || shift.id, { status: 'published' });
      }
    }

    showSnackbar("Schedule published successfully!", "success");
    await loadShifts();
  } catch (err) {
    console.error('Publish error:', err);
    showSnackbar("Error publishing schedule", "error");
  }
};

const openSaveTemplateDialog = () => {
  const weekShifts = shifts.value.filter(shift => {
    const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
    return weekDays.value.some(day => day.dateString === shiftDate.toISOString().split('T')[0]);
  });

  if (weekShifts.length === 0) {
    showSnackbar("No shifts to save as template", "error");
    return;
  }

  showSaveTemplateDialog.value = true;
};

const handleSaveTemplate = async () => {
  if (!templateName.value) {
    showSnackbar("Template name is required", "error");
    return;
  }

  savingTemplate.value = true;
  try {
    const weekShifts = shifts.value.filter(shift => {
      const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
      return weekDays.value.some(day => day.dateString === shiftDate.toISOString().split('T')[0]);
    });

    const templateData = weekShifts.map(shift => {
      const shiftDate = new Date(Number(shift.shiftTime || shift.shift_time));
      return {
        dayOfWeek: shiftDate.getDay(),
        startTime: shift.start_time || shift.startTime,
        endTime: shift.end_time || shift.endTime,
        jobRoleId: shift.job_role_id || shift.jobRoleId,
        notes: shift.notes || "",
      };
    });

    await EmployerService.createScheduleTemplate({
      name: templateName.value,
      description: templateDescription.value || "",
      locationId: user.value?.work_location || 1,
      templateData: templateData,
    });

    templateSavedForWeek.value = true;
    savedTemplateWeek.value = getWeekKey(selectedWeek.value);

    showSnackbar("Template saved successfully!", "success");
    showSaveTemplateDialog.value = false;
    templateName.value = "";
    templateDescription.value = "";

    router.push({ name: 'employerTemplates' });
  } catch (err) {
    console.error('Save template error:', err);
    showSnackbar("Error saving template", "error");
  } finally {
    savingTemplate.value = false;
  }
};

const getEmployeeName = (shift) => {
  const userId = shift.user_id || shift.userId;
  const employee = employees.value.find(e => (e.user_id || e.userId) === userId);
  if (!employee) return "Unassigned";
  return `${employee.fName || employee.first_name || ''} ${employee.lName || employee.last_name || ''}`.trim();
};

const getJobRoleName = (shift) => {
  const roleId = shift.job_role_id || shift.jobRoleId;
  const role = jobRoles.value.find(r => r.job_role_id === roleId);
  return role ? role.title : "Unknown";
};

const formatTime = (minutes) => {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minute.toString().padStart(2, '0')}${ampm}`;
};

const getShiftColor = (shift) => {
  const roleId = shift.job_role_id || shift.jobRoleId || 0;
  const colors = ['#E3F2FD', '#E8F5E9', '#FFF9C4', '#FFE0B2', '#F3E5F5', '#FCE4EC'];
  return colors[roleId % colors.length];
};

const getShiftBorderColor = (shift) => {
  const roleId = shift.job_role_id || shift.jobRoleId || 0;
  const colors = ['#1976D2', '#2e7d32', '#f57c00', '#ff6f00', '#7b1fa2', '#c2185b'];
  return colors[roleId % colors.length];
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Weekly Schedule</h1>
          <p class="text-body-2 text-grey">{{ currentWeekLabel }}</p>
        </div>
        <div class="d-flex ga-2">
          <v-btn
            color="#9C27B0"
            variant="flat"
            prepend-icon="mdi-content-save"
            @click="openSaveTemplateDialog"
            :disabled="templateSavedForWeek"
          >
            <span v-if="templateSavedForWeek">Template Saved ✓</span>
            <span v-else>Save as Template</span>
          </v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            prepend-icon="mdi-publish"
            @click="publishSchedule"
          >
            Publish Schedule
          </v-btn>
        </div>
      </div>

      <!-- Week Navigation -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <div class="pa-3 d-flex align-center justify-space-between">
          <v-btn icon="mdi-chevron-left" variant="text" color="#12086F" size="small" @click="previousWeek" />
          <span class="text-subtitle-1 font-weight-bold navy-text">{{ currentWeekLabel }}</span>
          <v-btn icon="mdi-chevron-right" variant="text" color="#12086F" size="small" @click="nextWeek" />
        </div>
      </v-card>

      <!-- Calendar Grid -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-progress-linear v-if="loadingShifts" indeterminate color="#12086F" />
        
        <div class="calendar-grid">
          <!-- Calendar Headers -->
          <div
            v-for="day in weekDays"
            :key="'header-' + day.dateString"
            class="calendar-header"
            :class="{ 'today-header': day.isToday }"
          >
            <div class="day-name">{{ day.dayName }}</div>
            <div class="day-date">
              <span class="date-number">{{ day.dayOfMonth }}</span>
              <span class="date-month">{{ day.month }}</span>
            </div>
          </div>

          <!-- Calendar Day Cells -->
          <div
            v-for="day in weekDays"
            :key="'day-' + day.dateString"
            class="calendar-day"
            :class="{ 'today-cell': day.isToday }"
          >
            <!-- Shifts for this day -->
            <div class="shifts-container">
              <div
                v-for="shift in day.shifts"
                :key="shift.shift_id || shift.id"
                class="shift-card"
                :style="{
                  backgroundColor: getShiftColor(shift),
                  borderLeftColor: getShiftBorderColor(shift)
                }"
                @click="openEditShift(shift)"
              >
                <div class="shift-time">
                  {{ formatTime(shift.start_time || shift.startTime) }}
                </div>
                <div class="shift-employee">
                  {{ getEmployeeName(shift) }}
                </div>
                <div class="shift-actions" @click.stop>
                  <v-btn
                    icon="mdi-pencil"
                    size="x-small"
                    variant="plain"
                    color="#4361EE"
                    @click="openEditShift(shift)"
                  />
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="plain"
                    color="#d32f2f"
                    @click="openDeleteDialog(shift)"
                  />
                </div>
              </div>

              <!-- Empty state / Add button -->
              <div class="add-shift-area" @click="openCreateShiftForDay(day)">
                <v-icon size="16" color="#12086F">mdi-plus</v-icon>
                <span class="add-shift-text">Add Shift</span>
              </div>
            </div>
          </div>
        </div>
      </v-card>
    </v-container>

    <!-- Create Shift Dialog -->
    <v-dialog v-model="showCreateShiftDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Create New Shift
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="newShift.date"
            label="Date"
            type="date"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />

          <div class="mb-3">
            <div class="text-caption text-grey mb-2">Start Time</div>
            <v-row dense>
              <v-col cols="4">
                <v-select
                  v-model="newShift.startHour"
                  :items="timeOptions.hours"
                  label="Hour"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="newShift.startMinute"
                  :items="timeOptions.minutes"
                  label="Minute"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="newShift.startAmPm"
                  :items="timeOptions.ampm"
                  label="AM/PM"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
            </v-row>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey mb-2">End Time</div>
            <v-row dense>
              <v-col cols="4">
                <v-select
                  v-model="newShift.endHour"
                  :items="timeOptions.hours"
                  label="Hour"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="newShift.endMinute"
                  :items="timeOptions.minutes"
                  label="Minute"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="newShift.endAmPm"
                  :items="timeOptions.ampm"
                  label="AM/PM"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
            </v-row>
          </div>

          <v-select
            v-model="newShift.userId"
            :items="availableEmployees"
            :item-title="(e) => `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`"
            :item-value="(e) => e.user_id || e.userId"
            label="Assign to Employee *"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          >
            <template #prepend-item>
              <v-list-item v-if="availableEmployees.length > 0">
                <v-list-item-title class="text-caption text-success">
                  <v-icon size="small" class="mr-1">mdi-check-circle</v-icon>
                  {{ availableEmployees.length }} employee(s) available for this time
                </v-list-item-title>
              </v-list-item>
              <v-list-item v-else>
                <v-list-item-title class="text-caption text-error">
                  <v-icon size="small" class="mr-1">mdi-alert-circle</v-icon>
                  No employees available for this day/time
                </v-list-item-title>
              </v-list-item>
              <v-divider class="my-2"></v-divider>
            </template>
            <template #no-data>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">
                  Select a date and time first to see available employees
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-select>

          <v-select
            v-model="newShift.jobRole"
            :items="jobRoles"
            item-title="title"
            item-value="job_role_id"
            label="Job Role *"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />

          <v-textarea
            v-model="newShift.notes"
            label="Notes (optional)"
            variant="outlined"
            density="compact"
            rows="2"
            color="#12086F"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCreateShiftDialog = false">Cancel</v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            :loading="creatingShift"
            @click="handleCreateShift"
          >
            Create Shift
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Shift Dialog -->
    <v-dialog v-model="showEditShiftDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Edit Shift
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="editShift.date"
            label="Date"
            type="date"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />

          <div class="mb-3">
            <div class="text-caption text-grey mb-2">Start Time</div>
            <v-row dense>
              <v-col cols="4">
                <v-select
                  v-model="editShift.startHour"
                  :items="timeOptions.hours"
                  label="Hour"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="editShift.startMinute"
                  :items="timeOptions.minutes"
                  label="Minute"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="editShift.startAmPm"
                  :items="timeOptions.ampm"
                  label="AM/PM"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
            </v-row>
          </div>

          <div class="mb-3">
            <div class="text-caption text-grey mb-2">End Time</div>
            <v-row dense>
              <v-col cols="4">
                <v-select
                  v-model="editShift.endHour"
                  :items="timeOptions.hours"
                  label="Hour"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="editShift.endMinute"
                  :items="timeOptions.minutes"
                  label="Minute"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="editShift.endAmPm"
                  :items="timeOptions.ampm"
                  label="AM/PM"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                />
              </v-col>
            </v-row>
          </div>

          <v-select
            v-model="editShift.userId"
            :items="employees"
            :item-title="(e) => `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`"
            :item-value="(e) => e.user_id || e.userId"
            label="Assign to Employee *"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />

          <v-select
            v-model="editShift.jobRole"
            :items="jobRoles"
            item-title="title"
            item-value="job_role_id"
            label="Job Role *"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />

          <v-textarea
            v-model="editShift.notes"
            label="Notes (optional)"
            variant="outlined"
            density="compact"
            rows="2"
            color="#12086F"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showEditShiftDialog = false">Cancel</v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            :loading="creatingShift"
            @click="handleUpdateShift"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Save Template Dialog -->
    <v-dialog v-model="showSaveTemplateDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Save as Template
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mb-4">
            <div class="text-caption">
              <v-icon size="small" class="mr-1">mdi-information</v-icon>
              This will save {{ shifts.filter(s => weekDays.some(d => d.dateString === new Date(Number(s.shiftTime || s.shift_time)).toISOString().split('T')[0])).length }} shifts as a reusable template
            </div>
          </v-alert>

          <v-text-field
            v-model="templateName"
            label="Template Name *"
            variant="outlined"
            density="compact"
            class="mb-3"
            placeholder="e.g., Standard Week, Holiday Schedule"
            color="#12086F"
          />

          <v-textarea
            v-model="templateDescription"
            label="Description (optional)"
            variant="outlined"
            density="compact"
            rows="2"
            placeholder="Describe when to use this template"
            color="#12086F"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showSaveTemplateDialog = false">Cancel</v-btn>
          <v-btn
            color="#9C27B0"
            variant="flat"
            :loading="savingTemplate"
            @click="handleSaveTemplate"
          >
            Save Template
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Confirm Delete</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">
            Are you sure you want to delete this shift?
          </p>
          <p class="text-body-2 text-grey mt-2">
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false" :disabled="deleting">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            @click="confirmDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.navy-card {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05);
}

/* ===================================
   CALENDAR GRID LAYOUT
   =================================== */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  /* ✅ REMOVED: min-height: 600px; - Now grows with content */
}

/* Calendar Headers */
.calendar-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white;
  padding: 12px 8px;
  text-align: center;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 2px solid #12086F;
}

.calendar-header:last-child {
  border-right: none;
}

.today-header {
  background: linear-gradient(135deg, #4361EE 0%, #5B73F0 100%);
}

.day-name {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.day-date {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.date-number {
  font-size: 20px;
  font-weight: bold;
  line-height: 1;
}

.date-month {
  font-size: 11px;
  opacity: 0.8;
}

/* Calendar Day Cells */
.calendar-day {
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  /* ✅ REMOVED: min-height: 500px; - Now compact! */
  transition: background-color 0.2s;
}

.calendar-day:hover {
  background: #f5f5f5;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.today-cell {
  background: #f0f4ff;
}

.shifts-container {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* ✅ REMOVED: height: 100%; - Now compact and grows with shifts */
  min-height: 120px; /* Small minimum for Add Shift button */
}

/* Shift Cards */
.shift-card {
  background: white;
  border-left: 3px solid #4361EE;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
}

.shift-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(18, 8, 111, 0.15);
}

.shift-card:hover .shift-actions {
  opacity: 1;
}

.shift-time {
  font-size: 12px;
  font-weight: bold;
  color: #12086F;
  margin-bottom: 3px;
}

.shift-employee {
  font-size: 11px;
  color: #333;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shift-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  padding: 2px;
}

/* Add Shift Area */
.add-shift-area {
  margin-top: auto;
  padding: 12px;
  border: 1px dashed #c0c0c0;
  border-radius: 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #666;
}

.add-shift-area:hover {
  border-color: #12086F;
  background: rgba(18, 8, 111, 0.03);
}

.add-shift-text {
  font-size: 12px;
  font-weight: 500;
  color: #12086F;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .calendar-grid {
    font-size: 11px;
  }
  
  .shift-card {
    padding: 6px;
  }
  
  .shift-time {
    font-size: 11px;
  }
  
  .shift-employee {
    font-size: 10px;
  }
}
</style>