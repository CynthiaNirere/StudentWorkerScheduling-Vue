<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";

const router = useRouter();
const user = ref(null);

// ─── DATA ─────────────────────────────────────────────────────────────────
const employees = ref([]);
const loading = ref(false);
const search = ref("");

// ─── MODALS ───────────────────────────────────────────────────────────────
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showDetailsDialog = ref(false);
const selectedEmployee = ref(null);
const saving = ref(false);

// ─── SNACKBAR ─────────────────────────────────────────────────────────────
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

// ─── FORMS ────────────────────────────────────────────────────────────────
const newEmployee = ref({
  fName: "",
  lName: "",
  email: "",
  phone_number: "",
  password_hash: "",
  role: "employee",
});

const editForm = ref({
  fName: "",
  lName: "",
  email: "",
  phone_number: "",
  role: "employee",
});

// ─── TABLE HEADERS ────────────────────────────────────────────────────────
const headers = [
  { title: "Name", key: "name", sortable: true },
  { title: "Email", key: "email", sortable: true },
  { title: "Phone", key: "phone_number", sortable: true },
  { title: "Role", key: "role", sortable: true },
  { title: "Status", key: "is_active", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

// ─── COMPUTED ─────────────────────────────────────────────────────────────
const employeesWithName = computed(() => {
  return employees.value.map((e) => ({
    ...e,
    name: `${e.fName} ${e.lName}`,
  }));
});

// ─── LIFECYCLE ────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadEmployees();
});

// ─── LOADERS ──────────────────────────────────────────────────────────────
const loadEmployees = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllEmployees();
    employees.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading employees:", err);
    showSnackbar("Error loading employees", "error");
  } finally {
    loading.value = false;
  }
};

// ─── ACTIONS ──────────────────────────────────────────────────────────────
const handleAddEmployee = async () => {
  if (!newEmployee.value.fName || !newEmployee.value.email || !newEmployee.value.password_hash) {
    showSnackbar("First name, email, and password are required", "error");
    return;
  }

  saving.value = true;
  try {
    await EmployerService.createEmployee(newEmployee.value);
    showSnackbar("Employee added successfully!", "success");
    showAddDialog.value = false;
    newEmployee.value = {
      fName: "",
      lName: "",
      email: "",
      phone_number: "",
      password_hash: "",
      role: "employee",
    };
    await loadEmployees();
  } catch (err) {
    showSnackbar("Error adding employee", "error");
  } finally {
    saving.value = false;
  }
};

const openEditDialog = (employee) => {
  selectedEmployee.value = employee;
  editForm.value = {
    fName: employee.fName,
    lName: employee.lName,
    email: employee.email,
    phone_number: employee.phone_number || "",
    role: employee.role,
  };
  showEditDialog.value = true;
};

const handleEditEmployee = async () => {
  if (!editForm.value.fName || !editForm.value.email) {
    showSnackbar("First name and email are required", "error");
    return;
  }

  saving.value = true;
  try {
    await EmployerService.updateEmployee(selectedEmployee.value.user_id, editForm.value);
    showSnackbar("Employee updated successfully!", "success");
    showEditDialog.value = false;
    await loadEmployees();
  } catch (err) {
    showSnackbar("Error updating employee", "error");
  } finally {
    saving.value = false;
  }
};

const handleDeleteEmployee = async (employee) => {
  if (!confirm(`Delete employee ${employee.fName} ${employee.lName}?`)) return;

  try {
    await EmployerService.deleteEmployee(employee.user_id);
    showSnackbar("Employee deleted", "success");
    await loadEmployees();
  } catch (err) {
    showSnackbar("Error deleting employee", "error");
  }
};

const openDetailsDialog = (employee) => {
  selectedEmployee.value = employee;
  showDetailsDialog.value = true;
};

const viewEmployeeSchedule = (employee) => {
  router.push({
    name: "employerSchedule",
    query: { employeeId: employee.user_id },
  });
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

<template>
  <v-app>
    <v-main style="background: #f5f5f5;">
      <v-container fluid class="pa-6">
        
        <!-- Header -->
        <div class="d-flex align-center justify-space-between mb-5">
          <div>
            <h1 class="text-h5 font-weight-bold">Employee Management</h1>
            <p class="text-body-2 text-medium-emphasis">
              Manage your team members
            </p>
          </div>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            prepend-icon="mdi-plus"
            @click="showAddDialog = true"
          >
            Add Employee
          </v-btn>
        </div>

        <!-- Employee Table -->
        <v-card variant="outlined" rounded="lg">
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
                  />
                </div>
              </template>

              <template #item.role="{ item }">
                <v-chip
                  :color="item.role === 'employer' ? 'primary' : 'default'"
                  size="small"
                  variant="tonal"
                >
                  {{ item.role }}
                </v-chip>
              </template>

              <template #item.is_active="{ item }">
                <v-chip
                  :color="item.is_active ? 'success' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  {{ item.is_active ? "Active" : "Inactive" }}
                </v-chip>
              </template>

              <template #item.actions="{ item }">
                <v-btn
                  icon="mdi-eye"
                  size="small"
                  variant="plain"
                  @click="openDetailsDialog(item)"
                />
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="plain"
                  @click="openEditDialog(item)"
                />
                <v-btn
                  icon="mdi-calendar"
                  size="small"
                  variant="plain"
                  @click="viewEmployeeSchedule(item)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="plain"
                  color="error"
                  @click="handleDeleteEmployee(item)"
                />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

      </v-container>
    </v-main>

    <!-- ─── ADD EMPLOYEE DIALOG ──────────────────────────────────────────── -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Add New Employee
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="newEmployee.fName"
                label="First Name *"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newEmployee.lName"
                label="Last Name"
                variant="outlined"
                density="compact"
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
          />
          <v-text-field
            v-model="newEmployee.phone_number"
            label="Phone Number"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-model="newEmployee.password_hash"
            label="Temporary Password *"
            type="password"
            variant="outlined"
            density="compact"
            class="mb-3"
            hint="Employee can change this after first login"
            persistent-hint
          />
          <v-select
            v-model="newEmployee.role"
            :items="['employee', 'employer']"
            label="Role"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            :loading="saving"
            @click="handleAddEmployee"
          >
            Add Employee
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── EDIT EMPLOYEE DIALOG ─────────────────────────────────────────── -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Edit Employee
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="editForm.fName"
                label="First Name *"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="editForm.lName"
                label="Last Name"
                variant="outlined"
                density="compact"
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
          />
          <v-text-field
            v-model="editForm.phone_number"
            label="Phone Number"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-select
            v-model="editForm.role"
            :items="['employee', 'employer']"
            label="Role"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            :loading="saving"
            @click="handleEditEmployee"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── DETAILS DIALOG ───────────────────────────────────────────────── -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedEmployee">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Employee Details
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Name</div>
            <div class="text-body-1 font-weight-medium">
              {{ selectedEmployee.fName }} {{ selectedEmployee.lName }}
            </div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Email</div>
            <div class="text-body-1">{{ selectedEmployee.email }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Phone</div>
            <div class="text-body-1">{{ selectedEmployee.phone_number || "N/A" }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Role</div>
            <v-chip :color="selectedEmployee.role === 'employer' ? 'primary' : 'default'" size="small" variant="tonal">
              {{ selectedEmployee.role }}
            </v-chip>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Status</div>
            <v-chip :color="selectedEmployee.is_active ? 'success' : 'error'" size="small" variant="tonal">
              {{ selectedEmployee.is_active ? "Active" : "Inactive" }}
            </v-chip>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">User ID</div>
            <div class="text-body-2 text-disabled">{{ selectedEmployee.user_id }}</div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn
            variant="tonal"
            color="#7b1c2e"
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

  </v-app>
</template>