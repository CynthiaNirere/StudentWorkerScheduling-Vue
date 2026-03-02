<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const availability = ref([]);
const employees = ref([]);
const loading = ref(false);
const selectedEmployee = ref(null);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
      const storedDay = index === 0 ? 6 : index - 1;
      const dayAvail = employeeAvailability.filter((a) => {
        const d = a.day_of_week ?? a.dayOfWeek;
        return d === index || d === storedDay;
      });
      weekSchedule[day] = dayAvail.map((a) => ({
        start: formatTime(a.start_time || a.startTime),
        end: formatTime(a.end_time || a.endTime),
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

const loadAvailability = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllAvailability();
    console.log("DEBUG availability raw response:", res.data);
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
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

const viewEmployeeDetails = (employeeId) => {
  router.push({
    name: "employerEmployees",
    query: { employeeId },
  });
};
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Employee Availability</h1>
          <p class="text-body-2 text-grey">
            View when employees are available to work
          </p>
        </div>
        <v-select
          v-model="selectedEmployee"
          :items="employees"
          :item-title="(e) => `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`"
          item-value="user_id"
          label="Filter by employee"
          variant="outlined"
          density="compact"
          style="max-width: 300px"
          clearable
          color="#12086F"
        />
      </div>

      <!-- Loading -->
      <v-card v-if="loading" variant="outlined" rounded="lg" class="pa-6 text-center navy-card">
        <v-progress-circular indeterminate color="#12086F" size="32" />
      </v-card>

      <!-- Availability Grid -->
      <v-card v-else variant="outlined" rounded="lg" class="navy-card">
        <div class="pa-4">
          <div class="availability-grid-header">
            <div class="employee-column">Employee</div>
            <div v-for="day in daysOfWeek" :key="day" class="day-column">
              {{ day }}
            </div>
          </div>

          <div
            v-for="row in availabilityGrid"
            :key="row.employeeId"
            class="availability-grid-row"
          >
            <div class="employee-column">
              <div class="font-weight-medium">{{ row.employeeName }}</div>
              <v-btn
                size="x-small"
                variant="text"
                color="#4361EE"
                @click="viewEmployeeDetails(row.employeeId)"
              >
                View Details
              </v-btn>
            </div>
            
            <div v-for="day in daysOfWeek" :key="day" class="day-column">
              <div v-if="row.schedule[day].length === 0" class="unavailable">
                Unavailable
              </div>
              <div
                v-else
                v-for="(slot, index) in row.schedule[day]"
                :key="index"
                class="available-slot"
              >
                {{ slot.start }} - {{ slot.end }}
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="availabilityGrid.length === 0" class="text-center pa-6">
            <v-icon size="48" class="mb-2 text-grey">mdi-calendar-clock</v-icon>
            <div class="text-body-2 text-grey">No availability data</div>
          </div>
        </div>
      </v-card>

      <!-- Info Alert -->
      <v-alert type="info" variant="tonal" class="mt-4" color="#4361EE">
        <strong>Tip:</strong> Use this view to quickly see who's available when scheduling shifts. 
        Filter by employee to see their full weekly availability.
      </v-alert>
    </v-container>

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

.availability-grid-header,
.availability-grid-row {
  display: grid;
  grid-template-columns: 200px repeat(7, 1fr);
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

.availability-grid-row {
  padding: 12px 8px;
  transition: background 0.15s;
}

.availability-grid-row:hover {
  background: #fafafa;
}

.employee-column,
.day-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 50px;
}

.employee-column {
  font-weight: 500;
  padding-right: 12px;
  border-right: 1px solid #e8e8e8;
}

.day-column {
  padding: 0 8px;
}

.available-slot {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  margin-bottom: 4px;
  white-space: nowrap;
  border-left: 3px solid #2e7d32;
}

.unavailable {
  color: #999;
  font-size: 12px;
  font-style: italic;
}
</style>