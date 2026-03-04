<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const employees = ref([]);
const loading = ref(false);
const search = ref("");

const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showDetailsDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedEmployee = ref(null);
const employeeToDelete = ref(null);
const saving = ref(false);
const deleting = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const newEmployee = ref({
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  job_role: "", // NEW: Job role as text field
});

const editForm = ref({
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  job_role: "", // NEW: Job role as text field
});

const headers = [
  { title: "Name", key: "name", sortable: true },
  { title: "Email", key: "email", sortable: true },
  { title: "Phone", key: "phone_number", sortable: true },
  { title: "Job Role", key: "job_role", sortable: true }, // CHANGED: From "Role" to "Job Role"
  { title: "Actions", key: "actions", sortable: false },
];

const employeesWithName = computed(() => {
  const currentUserId = user.value?.user_id || user.value?.userId;
  return employees.value
    .filter(e => {
      const empId = e.user_id || e.userId;
      return empId !== currentUserId && e.role === 'employee'; // Only show employees
    })
    .map((e) => ({
      ...e,
      name: `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`.trim() || 'Unnamed',
      job_role: e.job_role || 'Not assigned', // Display job role
    }));
});

onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadEmployees();
});

const loadEmployees = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllEmployees();
    console.log('Employees loaded:', res.data);
    employees.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading employees:", err);
    showSnackbar("Error loading employees", "error");
  } finally {
    loading.value = false;
  }
};

const handleAddEmployee = async () => {
  if (!newEmployee.value.first_name || !newEmployee.value.email) {
    showSnackbar("First name and email are required", "error");
    return;
  }

  saving.value = true;
  try {
    await EmployerService.createEmployee({
      ...newEmployee.value,
      role: 'employee', // Always create as employee
    });
    showSnackbar("Employee added successfully!", "success");
    showAddDialog.value = false;
    newEmployee.value = {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      job_role: "",
    };
    await loadEmployees();
  } catch (err) {
    console.error('Add employee error:', err);
    showSnackbar("Error adding employee", "error");
  } finally {
    saving.value = false;
  }
};

const openEditDialog = (employee) => {
  selectedEmployee.value = employee;
  editForm.value = {
    first_name: employee.fName || employee.first_name || "",
    last_name: employee.lName || employee.last_name || "",
    email: employee.email || "",
    phone_number: employee.phone_number || "",
    job_role: employee.job_role || "", // Load job role
  };
  showEditDialog.value = true;
};

const handleEditEmployee = async () => {
  if (!editForm.value.first_name || !editForm.value.email) {
    showSnackbar("First name and email are required", "error");
    return;
  }

  saving.value = true;
  try {
    await EmployerService.updateEmployee(selectedEmployee.value.user_id || selectedEmployee.value.userId, editForm.value);
    showSnackbar("Employee updated successfully!", "success");
    showEditDialog.value = false;
    await loadEmployees();
  } catch (err) {
    console.error('Update employee error:', err);
    showSnackbar("Error updating employee", "error");
  } finally {
    saving.value = false;
  }
};

const openDeleteDialog = (employee) => {
  employeeToDelete.value = employee;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!employeeToDelete.value) return;
  
  deleting.value = true;
  try {
    await EmployerService.deleteEmployee(employeeToDelete.value.user_id || employeeToDelete.value.userId);
    showSnackbar("Employee deleted successfully", "success");
    await loadEmployees();
  } catch (err) {
    console.error('Delete employee error:', err);
    showSnackbar("Error deleting employee", "error");
  } finally {
    deleting.value = false;
    showDeleteDialog.value = false;
    employeeToDelete.value = null;
  }
};

const openDetailsDialog = (employee) => {
  selectedEmployee.value = employee;
  showDetailsDialog.value = true;
};

const viewEmployeeSchedule = (employee) => {
  router.push({
    name: "employerSchedule",
    query: { employeeId: employee.user_id || employee.userId },
  });
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
          <h1 class="text-h4 font-weight-bold navy-text">Employee Management</h1>
          <p class="text-body-2 text-grey">
            Manage your team members and their job roles
          </p>
        </div>
        <v-btn
          color="#12086F"
          variant="flat"
          prepend-icon="mdi-plus"
          size="large"
          @click="showAddDialog = true"
        >
          Add Employee
        </v-btn>
      </div>

      <!-- Employee Table -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-0">
          <v-data-table
            :headers="headers"
            :items="employeesWithName"
            :search="search"
            :loading="loading"
            items-per-page="10"
          >
            <template #top>
              <div class="pa-4 pb-0">
                <v-text-field
                  v-model="search"
                  prepend-inner-icon="mdi-magnify"
                  label="Search employees"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  color="#12086F"
                />
              </div>
            </template>

            <template #item.job_role="{ item }">
              <v-chip
                :color="item.job_role === 'Not assigned' ? '#9e9e9e' : '#4361EE'"
                size="small"
                variant="tonal"
              >
                {{ item.job_role }}
              </v-chip>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                icon="mdi-eye"
                size="small"
                variant="plain"
                color="#4361EE"
                @click="openDetailsDialog(item)"
              />
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="plain"
                color="#4361EE"
                @click="openEditDialog(item)"
              />
              <v-btn
                icon="mdi-calendar"
                size="small"
                variant="plain"
                color="#4361EE"
                @click="viewEmployeeSchedule(item)"
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="plain"
                color="#d32f2f"
                @click="openDeleteDialog(item)"
              />
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Add Employee Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Add New Employee
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="newEmployee.first_name"
                label="First Name *"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newEmployee.last_name"
                label="Last Name"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model="newEmployee.email"
            label="Email *"
            type="email"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />
          <v-text-field
            v-model="newEmployee.phone_number"
            label="Phone Number"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />
          <!-- NEW: Job Role as text field -->
          <v-text-field
            v-model="newEmployee.job_role"
            label="Job Role"
            variant="outlined"
            density="compact"
            placeholder="e.g., Barista, Front Desk, Advocate"
            hint="Enter the job role for this employee"
            persistent-hint
            color="#12086F"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            :loading="saving"
            @click="handleAddEmployee"
          >
            Add Employee
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Employee Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Edit Employee
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="editForm.first_name"
                label="First Name *"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="editForm.last_name"
                label="Last Name"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model="editForm.email"
            label="Email *"
            type="email"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />
          <v-text-field
            v-model="editForm.phone_number"
            label="Phone Number"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />
          <!-- NEW: Job Role as text field (not dropdown) -->
          <v-text-field
            v-model="editForm.job_role"
            label="Job Role"
            variant="outlined"
            density="compact"
            placeholder="e.g., Barista, Front Desk, Advocate"
            hint="Enter the job role for this employee"
            persistent-hint
            color="#12086F"
          />
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mt-3">
            System roles (employee/employer) cannot be changed here.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            :loading="saving"
            @click="handleEditEmployee"
          >
            Save Changes
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
            Are you sure you want to delete 
            <strong>{{ (employeeToDelete?.fName || employeeToDelete?.first_name || '') }} {{ (employeeToDelete?.lName || employeeToDelete?.last_name || '') }}</strong>?
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

    <!-- Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedEmployee">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Employee Details
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3">
            <div class="text-caption text-grey">Name</div>
            <div class="text-body-1 font-weight-medium">
              {{ selectedEmployee.fName || selectedEmployee.first_name }} {{ selectedEmployee.lName || selectedEmployee.last_name }}
            </div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Email</div>
            <div class="text-body-1">{{ selectedEmployee.email }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Phone</div>
            <div class="text-body-1">{{ selectedEmployee.phone_number || "N/A" }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Job Role</div>
            <v-chip :color="selectedEmployee.job_role ? '#4361EE' : '#9e9e9e'" size="small" variant="tonal">
              {{ selectedEmployee.job_role || "Not assigned" }}
            </v-chip>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">User ID</div>
            <div class="text-body-2 text-grey">{{ selectedEmployee.user_id || selectedEmployee.userId }}</div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn
            variant="tonal"
            color="#12086F"
            @click="viewEmployeeSchedule(selectedEmployee)"
          >
            View Schedule
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
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
</style>