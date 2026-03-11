<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const employees = ref([]);
const jobRoles = ref([]);
const loading = ref(false);
const loadingRoles = ref(false);
const search = ref("");

const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showDetailsDialog = ref(false);
const showDeleteDialog = ref(false);
const showManageRolesDialog = ref(false); // ✅ NEW
const selectedEmployee = ref(null);
const employeeToDelete = ref(null);
const saving = ref(false);
const deleting = ref(false);

// ✅ NEW: For managing roles
const employeeRoles = ref([]);
const selectedNewRole = ref(null);
const makePrimary = ref(false);
const addingRole = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const newEmployee = ref({
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  job_role: "",
});

const editForm = ref({
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  job_role: "",
});

// ✅ UPDATED: Headers with Roles column
const headers = [
  { title: "Name", key: "name", sortable: true },
  { title: "Email", key: "email", sortable: true },
  { title: "Phone", key: "phone_number", sortable: true },
  { title: "Job Roles", key: "roles", sortable: false }, // ✅ NEW
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

const jobRoleSuggestions = computed(() => {
  const backendRoles = jobRoles.value.map(r => r.title);
  const employeeRoles = employees.value
    .map(e => e.job_role)
    .filter(r => r && r !== 'Not assigned');
  const allRoles = [...new Set([...backendRoles, ...employeeRoles])];
  return allRoles.sort();
});

// ✅ UPDATED: Include jobRoles array for each employee
const employeesWithName = computed(() => {
  const currentUserId = user.value?.user_id || user.value?.userId;
  return employees.value
    .filter(e => {
      const empId = e.user_id || e.userId;
      return empId !== currentUserId && e.role === 'employee';
    })
    .map((e) => ({
      ...e,
      name: `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`.trim() || 'Unnamed',
      job_role: e.job_role || 'Not assigned',
      jobRoles: e.jobRoles || [], // ✅ NEW: Multiple roles
    }));
});

// ✅ NEW: Available roles to add (exclude already assigned)
const availableRolesToAdd = computed(() => {
  const assignedRoleIds = employeeRoles.value.map(r => r.job_role_id);
  return jobRoles.value.filter(r => !assignedRoleIds.includes(r.job_role_id));
});

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadEmployees(), loadJobRoles()]);
});

// ✅ UPDATED: Load employees with their roles
const loadEmployees = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllEmployees();
    const allUsers = Array.isArray(res.data) ? res.data : [];
    const currentUserId = user.value?.user_id || user.value?.userId;
    
    const employeesList = allUsers.filter(u => {
      const empId = u.user_id || u.userId;
      return u.role === 'employee' && empId !== currentUserId;
    });
    
    // ✅ NEW: Load roles for each employee
    for (const emp of employeesList) {
      try {
        const rolesRes = await EmployerService.getUserRoles(emp.user_id || emp.userId);
        emp.jobRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      } catch (err) {
        console.error(`Error loading roles for ${emp.user_id}:`, err);
        emp.jobRoles = [];
      }
    }
    
    employees.value = employeesList;
  } catch (err) {
    console.error("Error loading employees:", err);
    showSnackbar("Error loading employees", "error");
  } finally {
    loading.value = false;
  }
};

const loadJobRoles = async () => {
  loadingRoles.value = true;
  try {
    const res = await EmployerService.getAllJobRoles();
    jobRoles.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading job roles:", err);
    jobRoles.value = [];
  } finally {
    loadingRoles.value = false;
  }
};

// ✅ NEW: Load roles for specific employee
const loadEmployeeRoles = async (userId) => {
  loadingRoles.value = true;
  try {
    const res = await EmployerService.getUserRoles(userId);
    employeeRoles.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading employee roles:", err);
    employeeRoles.value = [];
  } finally {
    loadingRoles.value = false;
  }
};

// ✅ NEW: Open manage roles dialog
const openManageRolesDialog = async (employee) => {
  selectedEmployee.value = employee;
  selectedNewRole.value = null;
  makePrimary.value = false;
  await loadEmployeeRoles(employee.user_id || employee.userId);
  showManageRolesDialog.value = true;
};

// ✅ NEW: Add role to employee
const handleAddRole = async () => {
  if (!selectedNewRole.value) {
    showSnackbar("Please select a role", "error");
    return;
  }
  
  addingRole.value = true;
  try {
    await EmployerService.addRoleToUser(
      selectedEmployee.value.user_id || selectedEmployee.value.userId,
      {
        jobRoleId: selectedNewRole.value,
        isPrimary: makePrimary.value
      }
    );
    
    showSnackbar("Role added successfully!", "success");
    selectedNewRole.value = null;
    makePrimary.value = false;
    
    await loadEmployeeRoles(selectedEmployee.value.user_id || selectedEmployee.value.userId);
    await loadEmployees(); // Refresh main table
  } catch (err) {
    console.error("Error adding role:", err);
    const errorMsg = err.response?.data?.message || "Error adding role";
    showSnackbar(errorMsg, "error");
  } finally {
    addingRole.value = false;
  }
};

// ✅ NEW: Remove role from employee
const handleRemoveRole = async (roleId) => {
  if (employeeRoles.value.length === 1) {
    showSnackbar("Cannot remove the last role", "error");
    return;
  }
  
  try {
    await EmployerService.removeRoleFromUser(
      selectedEmployee.value.user_id || selectedEmployee.value.userId,
      roleId
    );
    
    showSnackbar("Role removed successfully!", "success");
    await loadEmployeeRoles(selectedEmployee.value.user_id || selectedEmployee.value.userId);
    await loadEmployees();
  } catch (err) {
    console.error("Error removing role:", err);
    showSnackbar("Error removing role", "error");
  }
};

// ✅ NEW: Set primary role
const handleSetPrimary = async (roleId) => {
  try {
    await EmployerService.setPrimaryRole(
      selectedEmployee.value.user_id || selectedEmployee.value.userId,
      roleId
    );
    
    showSnackbar("Primary role updated!", "success");
    await loadEmployeeRoles(selectedEmployee.value.user_id || selectedEmployee.value.userId);
    await loadEmployees();
  } catch (err) {
    console.error("Error setting primary role:", err);
    showSnackbar("Error setting primary role", "error");
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
      role: 'employee',
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
    job_role: employee.job_role || "",
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

            <!-- ✅ NEW: Job Roles Column -->
            <template #[`item.roles`]="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-chip
                  v-for="role in (item.jobRoles || []).slice(0, 2)"
                  :key="role.user_job_role_id"
                  size="x-small"
                  :color="role.is_primary ? '#12086F' : '#4361EE'"
                  variant="tonal"
                >
                  {{ role.role_title }}
                  <v-icon v-if="role.is_primary" size="x-small" class="ml-1">mdi-star</v-icon>
                </v-chip>
                <v-chip
                  v-if="(item.jobRoles || []).length > 2"
                  size="x-small"
                  variant="text"
                  color="#666"
                >
                  +{{ (item.jobRoles || []).length - 2 }}
                </v-chip>
                <v-chip
                  v-if="(item.jobRoles || []).length === 0"
                  size="x-small"
                  color="#9e9e9e"
                  variant="tonal"
                >
                  No roles
                </v-chip>
              </div>
            </template>

            <!-- ✅ UPDATED: Actions with Manage Roles -->
            <template #[`item.actions`]="{ item }">
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="props" />
                </template>
                <v-list density="compact">
                  <v-list-item @click="openDetailsDialog(item)" prepend-icon="mdi-eye">
                    <v-list-item-title>View Details</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="openEditDialog(item)" prepend-icon="mdi-pencil">
                    <v-list-item-title>Edit Info</v-list-item-title>
                  </v-list-item>
                  
                  <!-- ✅ NEW: Manage Roles option -->
                  <v-list-item @click="openManageRolesDialog(item)" prepend-icon="mdi-briefcase-account">
                    <v-list-item-title>Manage Roles</v-list-item-title>
                  </v-list-item>
                  
                  <v-divider class="my-1" />
                  <v-list-item @click="openDeleteDialog(item)" prepend-icon="mdi-delete" class="text-error">
                    <v-list-item-title>Delete</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
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
          <v-autocomplete
            v-model="newEmployee.job_role"
            :items="jobRoleSuggestions"
            label="Job Role"
            variant="outlined"
            density="compact"
            placeholder="Type or select a role"
            hint="You can add multiple roles after creating the employee"
            persistent-hint
            color="#12086F"
            clearable
            :loading="loadingRoles"
          >
            <template #prepend-item>
              <v-list-item v-if="jobRoleSuggestions.length > 0">
                <v-list-item-title class="text-caption text-grey">
                  <v-icon size="small" class="mr-1">mdi-information</v-icon>
                  Select existing or type new role
                </v-list-item-title>
              </v-list-item>
              <v-divider class="my-2"></v-divider>
            </template>
            <template #no-data>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">
                  Type to add a new job role
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-autocomplete>
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
          <v-autocomplete
            v-model="editForm.job_role"
            :items="jobRoleSuggestions"
            label="Job Role"
            variant="outlined"
            density="compact"
            placeholder="Type or select a role"
            hint="Use 'Manage Roles' for multiple roles"
            persistent-hint
            color="#12086F"
            clearable
            :loading="loadingRoles"
          >
            <template #prepend-item>
              <v-list-item v-if="jobRoleSuggestions.length > 0">
                <v-list-item-title class="text-caption text-grey">
                  <v-icon size="small" class="mr-1">mdi-information</v-icon>
                  Select existing or type new role
                </v-list-item-title>
              </v-list-item>
              <v-divider class="my-2"></v-divider>
            </template>
            <template #no-data>
              <v-list-item>
                <v-list-item-title class="text-caption text-grey">
                  Type to add a new job role
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-autocomplete>
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

    <!-- ✅ NEW: Manage Roles Dialog -->
    <v-dialog v-model="showManageRolesDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Manage Roles - {{ selectedEmployee?.fName || selectedEmployee?.first_name }} {{ selectedEmployee?.lName || selectedEmployee?.last_name }}
        </v-card-title>
        <v-divider />
        
        <v-card-text class="pa-5">
          <!-- Current Roles -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2 navy-text">Current Roles</div>
            
            <div v-if="loadingRoles" class="text-center py-4">
              <v-progress-circular indeterminate color="#12086F" size="24" />
            </div>
            
            <div v-else-if="employeeRoles.length === 0" class="text-caption text-grey pa-4 text-center">
              <v-icon size="48" class="mb-2">mdi-briefcase-off-outline</v-icon>
              <div>No roles assigned yet</div>
            </div>
            
            <div v-else class="d-flex flex-column ga-2">
              <v-card
                v-for="role in employeeRoles"
                :key="role.user_job_role_id"
                variant="outlined"
                class="pa-3"
              >
                <div class="d-flex align-center justify-space-between">
                  <div class="flex-grow-1">
                    <div class="d-flex align-center ga-2 mb-1">
                      <v-icon :color="role.is_primary ? '#12086F' : '#4361EE'">
                        mdi-briefcase
                      </v-icon>
                      <span class="font-weight-bold">{{ role.role_title }}</span>
                      <v-chip
                        v-if="role.is_primary"
                        size="x-small"
                        color="#12086F"
                        variant="tonal"
                      >
                        <v-icon size="x-small" class="mr-1">mdi-star</v-icon>
                        Primary
                      </v-chip>
                    </div>
                    <div v-if="role.role_description" class="text-caption text-grey">
                      {{ role.role_description }}
                    </div>
                  </div>
                  
                  <div class="d-flex ga-1">
                    <v-btn
                      v-if="!role.is_primary"
                      icon
                      size="x-small"
                      variant="text"
                      color="#f57c00"
                      @click="handleSetPrimary(role.job_role_id)"
                    >
                      <v-icon>mdi-star-outline</v-icon>
                      <v-tooltip activator="parent" location="top">Set as Primary</v-tooltip>
                    </v-btn>
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      color="#d32f2f"
                      @click="handleRemoveRole(role.job_role_id)"
                      :disabled="employeeRoles.length === 1"
                    >
                      <v-icon>mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="top">
                        {{ employeeRoles.length === 1 ? 'Cannot remove last role' : 'Remove Role' }}
                      </v-tooltip>
                    </v-btn>
                  </div>
                </div>
              </v-card>
            </div>
          </div>

          <v-divider class="my-4" />

          <!-- Add New Role -->
          <div>
            <div class="text-subtitle-2 mb-2 navy-text">Add New Role</div>
            
            <v-select
              v-model="selectedNewRole"
              :items="availableRolesToAdd"
              item-title="title"
              item-value="job_role_id"
              label="Select Role"
              variant="outlined"
              density="compact"
              class="mb-3"
              color="#12086F"
              :disabled="availableRolesToAdd.length === 0"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-icon>mdi-briefcase</v-icon>
                  </template>
                  <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                  <v-list-item-subtitle v-if="item.raw.description">
                    {{ item.raw.description }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
              <template #no-data>
                <v-list-item>
                  <v-list-item-title class="text-caption text-grey">
                    All available roles are already assigned
                  </v-list-item-title>
                </v-list-item>
              </template>
            </v-select>

            <v-checkbox
              v-model="makePrimary"
              label="Set as primary role"
              color="#12086F"
              density="compact"
              hide-details
              class="mb-3"
              :disabled="!selectedNewRole"
            />

            <v-btn
              color="#12086F"
              variant="flat"
              block
              :loading="addingRole"
              :disabled="!selectedNewRole"
              @click="handleAddRole"
              prepend-icon="mdi-plus"
            >
              Add Role
            </v-btn>
          </div>
        </v-card-text>
        
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showManageRolesDialog = false">Close</v-btn>
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
            <div class="text-caption text-grey">Job Roles</div>
            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip
                v-for="role in (selectedEmployee.jobRoles || [])"
                :key="role.user_job_role_id"
                size="small"
                :color="role.is_primary ? '#12086F' : '#4361EE'"
                variant="tonal"
              >
                {{ role.role_title }}
                <v-icon v-if="role.is_primary" size="small" class="ml-1">mdi-star</v-icon>
              </v-chip>
              <v-chip
                v-if="(selectedEmployee.jobRoles || []).length === 0"
                size="small"
                color="#9e9e9e"
                variant="tonal"
              >
                No roles assigned
              </v-chip>
            </div>
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