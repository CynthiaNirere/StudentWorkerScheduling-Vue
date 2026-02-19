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
const locations = ref([]);
const jobRoles = ref([]);
const selectedLocation = ref(null);
const selectedWeek = ref(new Date());
const loadingShifts = ref(false);

const showCreateShiftDialog = ref(false);
const showEditShiftDialog = ref(false);
const selectedShift = ref(null);
const creatingShift = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const newShift = ref({
  date: "",
  startTime: "",
  endTime: "",
  userId: "",
  jobRoleId: "",
  notes: "",
});

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadEmployees(), loadLocations(), loadJobRoles()]);
  await loadShifts();
});

const weekDays = computed(() => {
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monday = getMonday(selectedWeek.value);

  return labels.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayShifts = shifts.value.filter((s) => {
      const d = new Date(Number(s.shiftTime));
      return d.toDateString() === date.toDateString();
    });
    return { label, dateNum: date.getDate(), fullDate: date, shifts: dayShifts };
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

const loadShifts = async () => {
  loadingShifts.value = true;
  try {
    const monday = getMonday(selectedWeek.value);
    const startDate = monday.getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000;

    const res = selectedLocation.value
      ? await EmployerService.getShiftsByLocation(selectedLocation.value)
      : await EmployerService.getShiftsByWeek(startDate, endDate);

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
    employees.value = all.filter((u) => u.role === "employee");
  } catch (err) {
    console.error("Error loading employees:", err);
  }
};

const loadLocations = async () => {
  try {
    const res = await EmployerService.getAllLocations();
    locations.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading locations:", err);
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

const handleCreateShift = async () => {
  if (!newShift.value.date || !newShift.value.startTime || !newShift.value.endTime) {
    showSnackbar("Please fill in date, start time, and end time", "error");
    return;
  }
  creatingShift.value = true;
  try {
    const shiftTime = new Date(newShift.value.date).getTime();
    await EmployerService.createShift({
      shiftTime,
      startTime: timeToMinutes(newShift.value.startTime),
      endTime: timeToMinutes(newShift.value.endTime),
      userId: newShift.value.userId || null,
      notes: newShift.value.notes || null,
      locationId: selectedLocation.value || user.value?.work_location || 1,
      jobRoleId: newShift.value.jobRoleId || 1,
      status: "draft",
      createdAt: Date.now(),
    });
    showSnackbar("Shift created successfully!", "success");
    showCreateShiftDialog.value = false;
    newShift.value = { date: "", startTime: "", endTime: "", userId: "", jobRoleId: "", notes: "" };
    loadShifts();
  } catch (err) {
    showSnackbar("Error creating shift", "error");
  } finally {
    creatingShift.value = false;
  }
};

const handleDeleteShift = async (shift) => {
  if (!confirm(`Delete shift on ${formatDate(shift.shiftTime)}?`)) return;
  try {
    await EmployerService.deleteShift(shift.shift_id);
    showSnackbar("Shift deleted", "success");
    loadShifts();
  } catch (err) {
    showSnackbar("Error deleting shift", "error");
  }
};

const handlePublishSchedule = async () => {
  try {
    const unpublished = shifts.value.filter((s) => s.status === "draft");
    await Promise.all(unpublished.map((s) => EmployerService.publishShift(s.shift_id)));
    showSnackbar("Schedule published!", "success");
    loadShifts();
  } catch (err) {
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


const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
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
  const colors = ["blue-lighten-4", "green-lighten-4", "yellow-lighten-4", "orange-lighten-4", "purple-lighten-4"];
  return colors[(shift.job_role_id || 0) % colors.length];
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
            <h1 class="text-h5 font-weight-bold">Weekly Schedule</h1>
            <p class="text-body-2 text-medium-emphasis">
              Manage shifts for the week of {{ formatDate(getMonday(selectedWeek).getTime()) }}
            </p>
          </div>
          <div class="d-flex ga-3 align-center">
            <v-select
              v-model="selectedLocation"
              :items="locations"
              item-title="name"
              item-value="location_id"
              label="Location"
              variant="outlined"
              density="compact"
              style="min-width: 200px"
              clearable
              @update:model-value="loadShifts"
            />
            <v-chip
              :color="schedulePublished ? 'success' : 'warning'"
              variant="tonal"
            >
              {{ schedulePublished ? "Published" : "Draft" }}
            </v-chip>
            <v-btn
              color="#7b1c2e"
              variant="flat"
              @click="handlePublishSchedule"
              :disabled="schedulePublished"
            >
              Publish Schedule
            </v-btn>
            <v-btn
              color="#7b1c2e"
              variant="outlined"
              @click="showCreateShiftDialog = true"
            >
              Add Shift
            </v-btn>
          </div>
        </div>

        <!-- Week Navigation -->
        <v-card variant="outlined" rounded="lg" class="mb-4">
          <div class="pa-4 d-flex align-center justify-space-between">
            <v-btn
              icon="mdi-chevron-left"
              variant="text"
              @click="previousWeek"
            />
            <span class="text-subtitle-1 font-weight-semibold">
              {{ getMonday(selectedWeek).toLocaleDateString() }} - 
              {{ new Date(getMonday(selectedWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString() }}
            </span>
            <v-btn
              icon="mdi-chevron-right"
              variant="text"
              @click="nextWeek"
            />
          </div>
        </v-card>

        <!-- Schedule Grid -->
        <v-card variant="outlined" rounded="lg">
          <div v-if="loadingShifts" class="pa-6 text-center">
            <v-progress-circular indeterminate color="#7b1c2e" size="32" />
          </div>

          <div v-else class="schedule-grid pa-4">
            <div
              v-for="day in weekDays"
              :key="day.label"
              class="schedule-day"
            >
              <!-- Day Header -->
              <div class="schedule-day-header">
                <div class="text-body-2 font-weight-bold">{{ day.label }}</div>
                <div class="text-caption text-medium-emphasis">{{ day.dateNum }}</div>
              </div>

              <!-- Time Slots (6am to 10pm) -->
              <div class="schedule-day-body">
                <div
                  v-for="shift in day.shifts"
                  :key="shift.shift_id"
                  class="shift-card"
                  :class="getShiftColor(shift)"
                >
                  <div class="d-flex justify-space-between align-center mb-1">
                    <span class="text-caption font-weight-bold">
                      {{ formatShiftTime(shift.startTime) }} - {{ formatShiftTime(shift.endTime) }}
                    </span>
                    <div>
                      <v-btn
                        icon="mdi-pencil"
                        size="x-small"
                        variant="plain"
                        @click="openEditShift(shift)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="x-small"
                        variant="plain"
                        @click="handleDeleteShift(shift)"
                      />
                    </div>
                  </div>
                  <div class="text-caption">
                    {{ shift.employeeName || "Unassigned" }}
                  </div>
                  <div v-if="shift.notes" class="text-caption text-medium-emphasis mt-1">
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
                  @click="newShift.date = day.fullDate.toISOString().split('T')[0]; showCreateShiftDialog = true"
                >
                  + Add Shift
                </div>
              </div>
            </div>
          </div>
        </v-card>

      </v-container>
   

    <v-dialog v-model="showCreateShiftDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
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
          />
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="newShift.startTime"
                label="Start Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newShift.endTime"
                label="End Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-select
            v-model="newShift.jobRoleId"
            :items="jobRoles"
            item-title="title"
            item-value="job_role_id"
            label="Job Role"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-select
            v-model="newShift.userId"
            :items="employees"
            :item-title="(e) => `${e.fName} ${e.lName}`"
            item-value="user_id"
            label="Assign Employee (optional)"
            variant="outlined"
            density="compact"
            clearable
            class="mb-3"
          />
          <v-textarea
            v-model="newShift.notes"
            label="Notes (optional)"
            variant="outlined"
            density="compact"
            rows="2"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCreateShiftDialog = false">Cancel</v-btn>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            :loading="creatingShift"
            @click="handleCreateShift"
          >
            Create Shift
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
  background: #f0f0f0;
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid #e8e8e8;
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
}

.shift-card:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.add-shift-btn {
  width: 100%;
  padding: 6px;
  border: 1px dashed #ccc;
  background: none;
  border-radius: 5px;
  font-size: 12px;
  color: #999;
  cursor: pointer;
  text-align: center;
  margin-top: 8px;
  transition: all 0.15s;
}

.add-shift-btn:hover {
  border-color: #7b1c2e;
  color: #7b1c2e;
}
</style>