<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';
import ClassScheduleModal from '../components/classSchedulemodal.vue';

const user = ref(null);

const availability    = ref([]);
const employees       = ref([]);
const loading         = ref(false);
const selectedEmployee = ref(null);

// Class Schedule Modal
const showScheduleModal = ref(false);
const selectedUserId = ref('');
const selectedUserName = ref('');

const snackbar = ref(false);
const snackbar        = ref(false);
const snackbarMessage = ref("");
const snackbarColor   = ref("success");

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const showAddDialog    = ref(false);
const showEditDialog   = ref(false);
const showDeleteDialog = ref(false);
const processing       = ref(false);
const itemToDelete     = ref(null);

const defaultForm    = { userId: null, dayOfWeek: null, startTime: null, endTime: null };
const addForm        = ref({ userIds: [], daysOfWeek: [], startTime: null, endTime: null });
const editForm = ref({ ...defaultForm, id: null });

const dayOptions = daysOfWeek.map((label, index) => ({ title: label, value: index }));

const timeOptions = (() => {
  const opts = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    const h    = Math.floor(m / 60);
    const min  = m % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    opts.push({ title: `${hour}:${String(min).padStart(2, '0')} ${ampm}`, value: m });
  }
  return opts;
})();

// ── The employer's location from their session ────────────────────────────
const employerLocationId = computed(() =>
  user.value?.work_location || user.value?.impersonatedLocation || null
);

const availabilityGrid = computed(() => {
  const currentUserId = user.value?.user_id || user.value?.userId;
  const filteredEmployees = selectedEmployee.value
    ? employees.value.filter((e) => (e.user_id || e.userId) === selectedEmployee.value)
    : employees.value.filter((e) => (e.user_id || e.userId) !== currentUserId);

  return filteredEmployees.map((employee) => {
    const empId = employee.user_id || employee.userId;
    const employeeAvailability = availability.value.filter(
      (a) => (a.user_id || a.userId) === empId && (a.is_active || a.isActive)
    );

    const weekSchedule = {};
    daysOfWeek.forEach((day, index) => {
      const dayAvail = employeeAvailability.filter((a) => {
        const d = a.day_of_week ?? a.dayOfWeek;
        return d === index;
      });
      weekSchedule[day] = dayAvail.map((a) => ({
        id:        a.id || a.availability_id,
        start:     formatTime(a.start_time || a.startTime),
        end:       formatTime(a.end_time   || a.endTime),
        startTime: a.start_time || a.startTime,
        endTime:   a.end_time   || a.endTime,
        dayOfWeek: a.day_of_week ?? a.dayOfWeek,
        userId:    a.user_id || a.userId,
      }));
    });

    return {
      employeeName: `${employee.fName || employee.first_name || ''} ${employee.lName || employee.last_name || ''}`.trim(),
      employeeId: empId,
      schedule: weekSchedule,
    };
  });
});

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadAvailability(), loadEmployees()]);
});

// ── LOAD — scoped to this employer's location ─────────────────────────────
// The backend now filters by location_id so The Brew never sees Gym rows.
const loadAvailability = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllAvailability();
    availability.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading availability:", err);
    showSnackbar("Error loading availability", "error");
  } finally {
    loading.value = false;
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

const formatTime = (minutes) => {
  if (minutes === undefined || minutes === null) return "";
  const h    = Math.floor(minutes / 60);
  const m    = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value   = color;
  snackbar.value        = true;
};

// Open Class Schedule Modal
const viewClassSchedule = (employee) => {
  selectedUserId.value = employee.employeeId;
  selectedUserName.value = employee.employeeName;
  showScheduleModal.value = true;
};

const openAddDialog = () => {
  addForm.value       = { userIds: [], daysOfWeek: [], startTime: null, endTime: null };
  showAddDialog.value = true;
};

// ── ADD — includes locationId so the row is scoped to this workplace ──────
const handleAdd = async () => {
  const { userIds, daysOfWeek, startTime, endTime } = addForm.value;
  if (!userIds.length || !daysOfWeek.length || startTime === null || endTime === null) {
    showSnackbar('Please select at least one employee, one day, and both times', 'error');
    return;
  }
  if (startTime >= endTime) {
    showSnackbar('End time must be after start time', 'error');
    return;
  }
  processing.value = true;
  let created = 0;
  try {
    for (const userId of userIds) {
      for (const dayOfWeek of daysOfWeek) {
        await EmployerService.createAvailability({
          userId, dayOfWeek, startTime, endTime,
          locationId: employerLocationId.value,
        });
        created++;
      }
    }
    showSnackbar(`${created} availability slot(s) added successfully`);
    showAddDialog.value = false;
    await loadAvailability();
  } catch (err) {
    showSnackbar('Error adding availability', 'error');
  } finally {
    processing.value = false;
  }
};

const openEditDialog = (slot) => {
  editForm.value       = { id: slot.id, userId: slot.userId, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime };
  showEditDialog.value = true;
};

const handleEdit = async () => {
  if (editForm.value.dayOfWeek === null || !editForm.value.startTime || !editForm.value.endTime) {
    showSnackbar('Please fill in all fields', 'error');
    return;
  }
  processing.value = true;
  try {
    await EmployerService.updateAvailability(editForm.value.id, {
      dayOfWeek: editForm.value.dayOfWeek,
      startTime: editForm.value.startTime,
      endTime:   editForm.value.endTime,
    });
    showSnackbar('Availability updated successfully');
    showEditDialog.value = false;
    await loadAvailability();
  } catch (err) {
    showSnackbar('Error updating availability', 'error');
  } finally {
    processing.value = false;
  }
};

const openDeleteDialog = (slot) => {
  itemToDelete.value    = slot;
  showDeleteDialog.value = true;
};

const handleDelete = async () => {
  if (!itemToDelete.value) return;
  processing.value = true;
  try {
    await EmployerService.deleteAvailability(itemToDelete.value.id);
    showSnackbar('Availability deleted successfully');
    showDeleteDialog.value = false;
    itemToDelete.value     = null;
    await loadAvailability();
  } catch (err) {
    showSnackbar('Error deleting availability', 'error');
  } finally {
    processing.value = false;
  }
};
</script>

<template>
  <EmployerLayout>
    <!-- Class Schedule Modal -->
    <ClassScheduleModal 
      v-model="showScheduleModal" 
      :userId="selectedUserId"
      :userName="selectedUserName"
    />

    <v-container fluid class="pa-6">
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Employee Availability</h1>
          <p class="text-body-2 text-grey">Manage when employees are available to work</p>
        </div>
        <div class="d-flex align-center ga-3">
          <v-btn color="#12086F" prepend-icon="mdi-plus" size="small" @click="openAddDialog">Add Availability</v-btn>
          <v-select
            v-model="selectedEmployee"
            :items="employees"
            :item-title="(e) => `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`"
            item-value="user_id"
            label="Filter by employee"
            variant="outlined"
            density="compact"
            style="max-width: 250px"
            clearable
            color="#12086F"
          />
        </div>
      </div>

      <v-card v-if="loading" variant="outlined" rounded="lg" class="pa-6 text-center navy-card">
        <v-progress-circular indeterminate color="#12086F" size="32" />
      </v-card>

      <v-card v-else variant="outlined" rounded="lg" class="navy-card">
        <div class="pa-4 grid-scroll-wrapper">
          <div class="availability-grid-header">
            <div class="employee-column">Employee</div>
            <div v-for="day in daysOfWeek" :key="day" class="day-column">{{ day }}</div>
          </div>

          <div v-for="row in availabilityGrid" :key="row.employeeId" class="availability-grid-row">
            <div class="employee-column">
              <div class="d-flex align-center justify-space-between w-100">
                <div class="font-weight-medium">{{ row.employeeName }}</div>
                <!-- 📚 Class Schedule Button -->
                <v-btn 
                  size="x-small" 
                  color="primary" 
                  variant="outlined"
                  prepend-icon="mdi-school"
                  @click="viewClassSchedule(row)"
                  class="ml-2"
                >
                  Class Schedule
                </v-btn>
              </div>
            </div>
            <div v-for="day in daysOfWeek" :key="day" class="day-column">
              <div v-if="row.schedule[day].length === 0" class="in-class">
                <v-icon size="12" class="mr-1">mdi-school</v-icon>
                In Class
              </div>
              <div
                v-else
                v-for="(slot, index) in row.schedule[day]"
                :key="index"
                class="available-slot"
              >
                <span>{{ slot.start }} - {{ slot.end }}</span>
                <span class="slot-actions">
                  <v-btn icon size="x-small" variant="text" color="#2e7d32" density="compact" @click.stop="openEditDialog(slot)">
                    <v-icon size="12">mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon size="x-small" variant="text" color="error" density="compact" @click.stop="openDeleteDialog(slot)">
                    <v-icon size="12">mdi-delete</v-icon>
                  </v-btn>
                </span>
              </div>
            </div>
          </div>

          <div v-if="availabilityGrid.length === 0" class="text-center pa-6">
            <v-icon size="48" class="mb-2 text-grey">mdi-calendar-clock</v-icon>
            <div class="text-body-2 text-grey">No availability data</div>
          </div>
        </div>
      </v-card>

      <v-alert type="info" variant="tonal" class="mt-4" color="#4361EE">
        <strong>Tip:</strong> Click "Class Schedule" next to any employee to view their course schedule and plan shifts accordingly.
      </v-alert>

      <!-- Add Dialog -->
      <v-dialog v-model="showAddDialog" max-width="560">
        <v-card rounded="lg">
          <v-card-title class="navy-text font-weight-bold pa-5 pb-2">Add Employee Availability</v-card-title>
          <v-card-text class="pa-5 pt-2">

            <!-- Employees -->
            <div class="text-caption font-weight-medium text-grey-darken-1 mb-1">Employees <span class="text-caption text-grey">(select one or more)</span></div>
            <v-select
              v-model="addForm.userIds"
              :items="employees"
              :item-title="(e) => `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`"
              :item-value="(e) => e.user_id || e.userId"
              label="Select employees"
              variant="outlined"
              density="compact"
              class="mb-4"
              color="#12086F"
              multiple
              chips
              closable-chips
            >
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #prepend="{ isSelected }">
                    <v-checkbox-btn :model-value="isSelected" color="#12086F" />
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <!-- Days of week -->
            <div class="text-caption font-weight-medium text-grey-darken-1 mb-2">Days of Week <span class="text-caption text-grey">(select one or more)</span></div>
            <div class="d-flex flex-wrap ga-2 mb-4">
              <v-chip
                v-for="opt in dayOptions"
                :key="opt.value"
                :color="addForm.daysOfWeek.includes(opt.value) ? '#12086F' : undefined"
                :variant="addForm.daysOfWeek.includes(opt.value) ? 'flat' : 'outlined'"
                :prepend-icon="addForm.daysOfWeek.includes(opt.value) ? 'mdi-check' : undefined"
                size="small"
                class="cursor-pointer"
                @click="addForm.daysOfWeek.includes(opt.value)
                  ? addForm.daysOfWeek.splice(addForm.daysOfWeek.indexOf(opt.value), 1)
                  : addForm.daysOfWeek.push(opt.value)"
              >{{ opt.title.slice(0, 3) }}</v-chip>
            </div>

            <!-- Times -->
            <v-row dense>
              <v-col cols="6">
                <v-select v-model="addForm.startTime" :items="timeOptions" label="Start Time" variant="outlined" density="compact" color="#12086F" />
              </v-col>
              <v-col cols="6">
                <v-select v-model="addForm.endTime" :items="timeOptions" label="End Time" variant="outlined" density="compact" color="#12086F" />
              </v-col>
            </v-row>

            <div v-if="addForm.userIds.length && addForm.daysOfWeek.length" class="text-caption text-grey mt-3">
              <v-icon size="14" class="mr-1" color="#12086F">mdi-information</v-icon>
              This will create <strong>{{ addForm.userIds.length * addForm.daysOfWeek.length }}</strong> availability slot(s)
            </div>
          </v-card-text>
          <v-card-actions class="pa-5 pt-0">
            <v-spacer />
            <v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
            <v-btn color="#12086F" variant="flat" :loading="processing" @click="handleAdd">Add</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Edit Dialog -->
      <v-dialog v-model="showEditDialog" max-width="500">
        <v-card rounded="lg">
          <v-card-title class="navy-text font-weight-bold">Edit Availability</v-card-title>
          <v-card-text>
            <v-select v-model="editForm.dayOfWeek" :items="dayOptions" label="Day of Week" variant="outlined" density="compact" class="mb-3" color="#12086F" />
            <v-select v-model="editForm.startTime" :items="timeOptions" label="Start Time"  variant="outlined" density="compact" class="mb-3" color="#12086F" />
            <v-select v-model="editForm.endTime"   :items="timeOptions" label="End Time"    variant="outlined" density="compact" color="#12086F" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
            <v-btn color="#12086F" :loading="processing" @click="handleEdit">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Dialog -->
      <v-dialog v-model="showDeleteDialog" max-width="400">
        <v-card rounded="lg">
          <v-card-title class="text-h6">Delete Availability</v-card-title>
          <v-card-text>Are you sure you want to delete this availability slot?</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
            <v-btn color="error" :loading="processing" @click="handleDelete">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
      {{ snackbarMessage }}
    </v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }
.availability-grid-header,
.availability-grid-row {
  display: grid;
  grid-template-columns: 250px repeat(7, 1fr);
  gap: 8px;
  border-bottom: 1px solid #e8e8e8;
}
.availability-grid-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white;
  font-weight: 600;
  font-size: 13px;
  padding: 12px 8px;
  border-bottom: 2px solid #12086F;
  border-radius: 8px 8px 0 0;
}
.availability-grid-row { padding: 12px 8px; transition: background 0.15s; }
.availability-grid-row:hover { background: #fafafa; }
.employee-column, .day-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 50px;
}
.employee-column { font-weight: 500; padding-right: 12px; border-right: 1px solid #e8e8e8; }
.day-column { padding: 0 8px; }
.grid-scroll-wrapper { overflow-x: auto; min-width: 0; }
.available-slot {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-bottom: 3px;
  white-space: nowrap;
  border-left: 3px solid #2e7d32;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.available-slot .slot-actions { display: none; margin-left: 2px; }
.available-slot:hover .slot-actions { display: inline-flex; }
.in-class {
  color: #5c6bc0;
  font-size: 11px;
  font-style: italic;
  display: flex;
  align-items: center;
  background: #f3f4fb;
  padding: 3px 6px;
  border-radius: 4px;
  border-left: 3px solid #9fa8da;
}
</style>