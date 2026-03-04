<script setup>
import { ref, computed, onMounted } from "vue";
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
const selectedDay = ref(null);
const loadingShifts = ref(false);
const loadingAvailability = ref(false);

const showCreateShiftDialog = ref(false);
const showDeleteDialog = ref(false);
const shiftToDelete = ref(null);
const showEditShiftDialog = ref(false);
const selectedShift = ref(null);
const creatingShift = ref(false);
const deleting = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

// NEW: Separate hour/minute/ampm for better UX
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

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadEmployees(), loadJobRoles(), loadAllAvailability()]);
  await loadShifts();
});

const weekDays = computed(() => {
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const sunday = getMonday(selectedWeek.value);

  return labels.map((label, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    
    // Get shifts for this day
    const dayShifts = shifts.value.filter((s) => {
      const shiftTime = s.shiftTime || s.shift_time;
      const d = new Date(Number(shiftTime));
      return d.toDateString() === date.toDateString();
    });
    
    // SORT SHIFTS BY START TIME (earliest to latest)
    const sortedShifts = dayShifts.sort((a, b) => {
      const aStart = a.start_time || a.startTime;
      const bStart = b.start_time || b.startTime;
      return aStart - bStart;
    });
    
    return { label, dateNum: date.getDate(), fullDate: date, dayOfWeek: i, shifts: sortedShifts };
  });
});

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const schedulePublished = computed(() =>
  shifts.value.some((s) => s.status === "published")
);

// Convert 12-hour time to minutes
const convertToMinutes = (hour, minute, ampm) => {
  let h = parseInt(hour);
  const m = parseInt(minute);
  
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  
  return h * 60 + m;
};

// Get computed start/end times for availability filtering
const shiftStartMinutes = computed(() => 
  convertToMinutes(newShift.value.startHour, newShift.value.startMinute, newShift.value.startAmPm)
);

const shiftEndMinutes = computed(() => 
  convertToMinutes(newShift.value.endHour, newShift.value.endMinute, newShift.value.endAmPm)
);

// SMART FILTERING with time-based availability
const availableEmployees = computed(() => {
  if (!selectedDay.value) return employees.value;
  
  const dayOfWeek = selectedDay.value.dayOfWeek;
  const shiftStart = shiftStartMinutes.value;
  const shiftEnd = shiftEndMinutes.value;
  
  const hasTime = shiftStart > 0 || shiftEnd > 0;
  
  return employees.value.filter(emp => {
    const empId = emp.user_id || emp.userId;
    const empAvailability = availability.value.filter(a => 
      (a.userId || a.user_id) === empId && 
      (a.dayOfWeek || a.day_of_week) === dayOfWeek &&
      (a.isActive || a.is_active) === 1
    );
    
    if (empAvailability.length === 0) return false;
    
    if (hasTime && shiftStart > 0 && shiftEnd > 0 && shiftEnd > shiftStart) {
      const buffer = 30;
      const shiftStartWithBuffer = shiftStart - buffer;
      const shiftEndWithBuffer = shiftEnd + buffer;
      
      const hasOverlap = empAvailability.some(slot => {
        const availStart = slot.startTime || slot.start_time;
        const availEnd = slot.endTime || slot.end_time;
        return availStart <= shiftStartWithBuffer && availEnd >= shiftEndWithBuffer;
      });
      
      return hasOverlap;
    }
    
    return true;
  }).map(emp => {
    const empId = emp.user_id || emp.userId;
    const empAvailability = availability.value.filter(a => 
      (a.userId || a.user_id) === empId && 
      (a.dayOfWeek || a.day_of_week) === dayOfWeek
    );
    return {
      ...emp,
      availabilitySlots: empAvailability
    };
  });
});

const loadShifts = async () => {
  loadingShifts.value = true;
  try {
    const monday = getMonday(selectedWeek.value);
    const startDate = monday.getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000;

    const res = await EmployerService.getShiftsByWeek(startDate, endDate);
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading shifts:", err);
    shifts.value = [];
  } finally {
    loadingShifts.value = false;
  }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const all = Array.isArray(res.data) ? res.data : [];
    const currentUserId = user.value?.user_id || user.value?.userId;
    employees.value = all.filter((u) => {
      const empId = u.user_id || u.userId;
      return u.role === "employee" && empId !== currentUserId;
    });
  } catch (err) {
    console.error("Error loading employees:", err);
  }
};

const loadAllAvailability = async () => {
  loadingAvailability.value = true;
  try {
    const res = await EmployerService.getAllAvailability();
    availability.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading availability:", err);
    availability.value = [];
  } finally {
    loadingAvailability.value = false;
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

const openCreateShiftForDay = (day) => {
  selectedDay.value = day;
  newShift.value.date = day.fullDate.toISOString().split('T')[0];
  showCreateShiftDialog.value = true;
};

const handleCreateShift = async () => {
  if (!newShift.value.date) {
    showSnackbar("Please select a date", "error");
    return;
  }
  
  const startMinutes = shiftStartMinutes.value;
  const endMinutes = shiftEndMinutes.value;
  
  if (endMinutes <= startMinutes) {
    showSnackbar("End time must be after start time", "error");
    return;
  }
  
  if (!newShift.value.jobRole || newShift.value.jobRole.trim() === '') {
    showSnackbar("Please enter a job role", "error");
    return;
  }
  
  creatingShift.value = true;
  try {
    let jobRoleId = null;
    const trimmedRole = newShift.value.jobRole.trim();
    
    const existingRole = jobRoles.value.find(r => 
      r.title.toLowerCase() === trimmedRole.toLowerCase()
    );
    
    if (existingRole) {
      jobRoleId = existingRole.job_role_id;
    } else {
      if (jobRoles.value.length > 0) {
        jobRoleId = jobRoles.value[0].job_role_id;
        console.warn(`Job role "${trimmedRole}" not found, using default role`);
      } else {
        jobRoleId = 1;
      }
    }
    
    // CRITICAL TIMEZONE FIX: Parse as local date, not UTC
    const [year, month, day] = newShift.value.date.split('-').map(Number);
    const shiftDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    const shiftTime = shiftDate.getTime();
    
    console.log("Creating shift:", {
      date: newShift.value.date,
      shiftTime: shiftTime,
      dateCheck: new Date(shiftTime).toLocaleDateString()
    });
    
    await EmployerService.createShift({
      shiftTime,
      startTime: startMinutes,
      endTime: endMinutes,
      userId: newShift.value.userId || null,
      notes: newShift.value.notes || null,
      locationId: user.value?.work_location || 1,
      jobRoleId: jobRoleId,
      status: "draft",
      createdBy: user.value?.user_id || user.value?.userId || 'system',
      createdAt: Date.now(),
    });
    
    showSnackbar("Shift created successfully!", "success");
    showCreateShiftDialog.value = false;
    selectedDay.value = null;
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
    const errorMsg = err.response?.data?.message || err.message || "Error creating shift";
    showSnackbar(errorMsg, "error");
  } finally {
    creatingShift.value = false;
  }
};

const openDeleteDialog = (shift) => {
  shiftToDelete.value = shift;
  showDeleteDialog.value = true;
};

const confirmDeleteShift = async () => {
  if (!shiftToDelete.value) return;
  
  deleting.value = true;
  try {
    const shiftId = shiftToDelete.value.shift_id || shiftToDelete.value.shiftId || shiftToDelete.value.id;
    await EmployerService.deleteShift(shiftId);
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

const handlePublishSchedule = async () => {
  try {
    const unpublished = shifts.value.filter((s) => s.status === "draft");
    if (unpublished.length === 0) {
      showSnackbar("All shifts are already published", "info");
      return;
    }
    
    await Promise.all(unpublished.map((s) => {
      const shiftId = s.shift_id || s.shiftId || s.id;
      return EmployerService.publishShift(shiftId);
    }));
    showSnackbar("Schedule published successfully!", "success");
    await loadShifts();
  } catch (err) {
    console.error('Publish error:', err);
    showSnackbar("Error publishing schedule", "error");
  }
};

const openEditShift = (shift) => {
  selectedShift.value = shift;
  showEditShiftDialog.value = true;
};

const previousWeek = () => {
  const d = new Date(selectedWeek.value);
  d.setDate(d.getDate() - 7);
  selectedWeek.value = d;
  loadShifts();
};

const nextWeek = () => {
  const d = new Date(selectedWeek.value);
  d.setDate(d.getDate() + 7);
  selectedWeek.value = d;
  loadShifts();
};

const formatShiftTime = (minutes) => {
  if (minutes === undefined || minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
};

const formatDate = (timestamp) => {
  return new Date(Number(timestamp)).toLocaleDateString();
};

const getShiftColor = (shift) => {
  const jobRoleId = shift.job_role_id || shift.jobRoleId || 0;
  const colors = ["#E3F2FD", "#E8F5E9", "#FFF9C4", "#FFE0B2", "#F3E5F5"];
  return colors[jobRoleId % colors.length];
};

const getShiftBorderColor = (shift) => {
  const jobRoleId = shift.job_role_id || shift.jobRoleId || 0;
  const colors = ["#4361EE", "#2e7d32", "#f57c00", "#ff6f00", "#7b1fa2"];
  return colors[jobRoleId % colors.length];
};

const getEmployeeName = (shift) => {
  return shift.employee_name || shift.employeeName || "Unassigned";
};

const formatAvailabilitySlots = (employee) => {
  if (!employee.availabilitySlots || employee.availabilitySlots.length === 0) {
    return "No availability";
  }
  return employee.availabilitySlots.map(slot => {
    const start = formatShiftTime(slot.startTime || slot.start_time);
    const end = formatShiftTime(slot.endTime || slot.end_time);
    return `${start}-${end}`;
  }).join(", ");
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

const hours = Array.from({length: 12}, (_, i) => (i + 1).toString());
const minutes = ["00", "15", "30", "45"];
const ampmOptions = ["AM", "PM"];
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Weekly Schedule</h1>
          <p class="text-body-2 text-grey">
            Manage shifts for the week of {{ formatDate(getMonday(selectedWeek).getTime()) }}
          </p>
        </div>
        <div class="d-flex ga-3 align-center">
          <v-chip
            :color="schedulePublished ? '#2e7d32' : '#f57c00'"
            variant="tonal"
          >
            {{ schedulePublished ? "Published" : "Draft" }}
          </v-chip>
          <v-btn
            color="#4361EE"
            variant="outlined"
            @click="handlePublishSchedule"
            :disabled="schedulePublished"
          >
            Publish Schedule
          </v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            @click="showCreateShiftDialog = true"
          >
            Add Shift
          </v-btn>
        </div>
      </div>

      <!-- Week Navigation -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <div class="pa-4 d-flex align-center justify-space-between">
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            color="#12086F"
            @click="previousWeek"
          />
          <span class="text-subtitle-1 font-weight-semibold navy-text">
            {{ getMonday(selectedWeek).toLocaleDateString() }} - 
            {{ new Date(getMonday(selectedWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString() }}
          </span>
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            color="#12086F"
            @click="nextWeek"
          />
        </div>
      </v-card>

      <!-- Schedule Grid -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <div v-if="loadingShifts" class="pa-6 text-center">
          <v-progress-circular indeterminate color="#12086F" size="32" />
        </div>

        <div v-else class="schedule-grid pa-4">
          <div
            v-for="day in weekDays"
            :key="day.label"
            class="schedule-day"
          >
            <!-- Day Header -->
            <div class="schedule-day-header">
              <div class="text-body-2 font-weight-bold text-white">{{ day.label }}</div>
              <div class="text-caption text-white-80">{{ day.dateNum }}</div>
            </div>

            <!-- Shifts (SORTED BY TIME) -->
            <div class="schedule-day-body">
              <div
                v-for="shift in day.shifts"
                :key="shift.shift_id || shift.id"
                class="shift-card"
                :style="{ 
                  backgroundColor: getShiftColor(shift),
                  borderLeftColor: getShiftBorderColor(shift)
                }"
              >
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="text-caption font-weight-bold">
                    {{ formatShiftTime(shift.start_time || shift.startTime) }} - 
                    {{ formatShiftTime(shift.end_time || shift.endTime) }}
                  </span>
                  <div>
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
                <div class="text-caption">
                  {{ getEmployeeName(shift) }}
                </div>
                <div v-if="shift.notes" class="text-caption text-grey mt-1">
                  {{ shift.notes }}
                </div>
              </div>

              <!-- Empty state -->
              <div v-if="day.shifts.length === 0" class="text-center text-caption text-disabled py-4">
                No shifts
              </div>

              <!-- Add shift button -->
              <div
                class="add-shift-btn"
                @click="openCreateShiftForDay(day)"
              >
                + Add Shift
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
          <span v-if="selectedDay" class="text-body-2 text-grey ml-2">
            - {{ selectedDay.label }}, {{ selectedDay.fullDate.toLocaleDateString() }}
          </span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="newShift.date"
            label="Date *"
            type="date"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />
          
          <!-- Better Time Inputs with AM/PM -->
          <div class="text-caption text-grey mb-1">Start Time *</div>
          <v-row dense class="mb-3">
            <v-col cols="4">
              <v-select
                v-model="newShift.startHour"
                :items="hours"
                label="Hour"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="newShift.startMinute"
                :items="minutes"
                label="Min"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="newShift.startAmPm"
                :items="ampmOptions"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
          </v-row>
          
          <div class="text-caption text-grey mb-1">End Time *</div>
          <v-row dense class="mb-3">
            <v-col cols="4">
              <v-select
                v-model="newShift.endHour"
                :items="hours"
                label="Hour"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="newShift.endMinute"
                :items="minutes"
                label="Min"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="newShift.endAmPm"
                :items="ampmOptions"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
          </v-row>
          
          <v-text-field
            v-model="newShift.jobRole"
            label="Job Role *"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
            placeholder="e.g., Barista, Front Desk, Server"
          />
          
          <!-- Smart employee selector -->
          <v-select
            v-model="newShift.userId"
            :items="selectedDay ? availableEmployees : employees"
            :item-title="(e) => {
              const name = `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`;
              const avail = selectedDay && e.availabilitySlots ? ` (${formatAvailabilitySlots(e)})` : '';
              return name + avail;
            }"
            item-value="user_id"
            label="Assign Employee (optional)"
            variant="outlined"
            density="compact"
            clearable
            class="mb-3"
            color="#12086F"
          >
            <template #prepend-item v-if="selectedDay && availableEmployees.length > 0">
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">
                  <v-icon size="small" class="mr-1">mdi-information</v-icon>
                  {{ availableEmployees.length }} employee(s) available for this time
                </v-list-item-title>
              </v-list-item>
              <v-divider class="my-2"></v-divider>
            </template>
          </v-select>

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
          <v-btn variant="text" @click="showCreateShiftDialog = false; selectedDay = null">Cancel</v-btn>
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

    <!-- Delete Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Confirm Delete</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">
            Are you sure you want to delete this shift?
          </p>
          <p v-if="shiftToDelete" class="text-body-2 text-grey mt-2">
            <strong>{{ formatDate(shiftToDelete.shiftTime || shiftToDelete.shift_time) }}</strong><br>
            {{ formatShiftTime(shiftToDelete.start_time || shiftToDelete.startTime) }} - 
            {{ formatShiftTime(shiftToDelete.end_time || shiftToDelete.endTime) }}<br>
            {{ getEmployeeName(shiftToDelete) }}
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            @click="confirmDeleteShift"
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

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  overflow-x: auto;
}

.schedule-day {
  min-width: 140px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.schedule-day-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  padding: 10px 12px;
  text-align: center;
}

.text-white-80 {
  color: rgba(255, 255, 255, 0.8);
}

.schedule-day-body {
  padding: 8px;
  min-height: 400px;
}

.shift-card {
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid;
}

.shift-card:hover {
  opacity: 0.85;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(18, 8, 111, 0.1);
}

.add-shift-btn {
  width: 100%;
  padding: 6px;
  border: 1px dashed #4361EE;
  background: none;
  border-radius: 5px;
  font-size: 12px;
  color: #4361EE;
  cursor: pointer;
  text-align: center;
  margin-top: 8px;
  transition: all 0.15s;
}

.add-shift-btn:hover {
  border-color: #12086F;
  color: #12086F;
  background: rgba(18, 8, 111, 0.05);
}
</style>