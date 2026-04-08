<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const employees    = ref([]);
const jobRoles     = ref([]);
const loading      = ref(false);
const loadingRoles = ref(false);
const search       = ref("");

const showAddDialog         = ref(false);
const showEditDialog        = ref(false);
const showDetailsDialog     = ref(false);
const showDeleteDialog      = ref(false);
const showManageRolesDialog = ref(false);
const selectedEmployee      = ref(null);
const employeeToDelete      = ref(null);
const saving   = ref(false);
const deleting = ref(false);

const employeeRoles   = ref([]);
const selectedNewRole = ref(null);
const makePrimary     = ref(false);
const addingRole      = ref(false);

// ── INLINE ROLE CREATION STATE ────────────────────────────────────────────
const showCreateRoleField = ref(false);   // toggles the "new role" text input
const newRoleTitle        = ref('');       // what the employer types
const creatingRole        = ref(false);    // spinner while saving

const snackbar        = ref(false);
const snackbarMessage = ref("");
const snackbarColor   = ref("success");

// ── ADD DIALOG STATE ──────────────────────────────────────────────────────
const addStep          = ref('search');
const nameQuery        = ref('');
const searchResults    = ref([]);
const searchLoading    = ref(false);
const searchDone       = ref(false);
const selectedExisting = ref(null);
const assigning        = ref(false);

const newEmployee = ref({ first_name: '', last_name: '', email: '', phone_number: '', job_role: '' });
const editForm    = ref({ first_name: '', last_name: '', email: '', phone_number: '', job_role: '' });

const headers = [
  { title: "Name",      key: "name",         sortable: true },
  { title: "Email",     key: "email",         sortable: true },
  { title: "Phone",     key: "phone_number",  sortable: true },
  { title: "Job Roles", key: "roles",         sortable: false },
  { title: "Actions",   key: "actions",       sortable: false, align: "end" },
];

const jobRoleSuggestions = computed(() => {
  const backendRoles = jobRoles.value.map(r => r.title);
  const empRoles     = employees.value.map(e => e.job_role).filter(r => r && r !== 'Not assigned');
  return [...new Set([...backendRoles, ...empRoles])].sort();
});

const employeesWithName = computed(() =>
  employees.value.map(e => ({
    ...e,
    name:     `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`.trim() || 'Unnamed',
    job_role: e.job_role || 'Not assigned',
    jobRoles: e.jobRoles || [],
  }))
);

const availableRolesToAdd = computed(() => {
  const assignedIds = employeeRoles.value.map(r => r.job_role_id);
  return jobRoles.value.filter(r => !assignedIds.includes(r.job_role_id));
});

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadEmployees(), loadJobRoles()]);
});

// ── LOADERS ───────────────────────────────────────────────────────────────
const loadEmployees = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllEmployees();
    const allUsers      = Array.isArray(res.data) ? res.data : [];
    const currentUserId = user.value?.user_id || user.value?.userId;
    const list          = allUsers.filter(u => u.role === 'employee' && (u.user_id || u.userId) !== currentUserId);
    for (const emp of list) {
      try {
        const r = await EmployerService.getUserRoles(emp.user_id || emp.userId);
        emp.jobRoles = Array.isArray(r.data) ? r.data : [];
      } catch { emp.jobRoles = []; }
    }
    employees.value = list;
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
    const res      = await EmployerService.getAllJobRoles();
    jobRoles.value = Array.isArray(res.data) ? res.data : [];
  } catch { jobRoles.value = []; }
  finally { loadingRoles.value = false; }
};

const loadEmployeeRoles = async (userId) => {
  loadingRoles.value = true;
  try {
    const res           = await EmployerService.getUserRoles(userId);
    employeeRoles.value = Array.isArray(res.data) ? res.data : [];
  } catch { employeeRoles.value = []; }
  finally { loadingRoles.value = false; }
};

// ── ADD DIALOG ────────────────────────────────────────────────────────────
const openAddDialog = () => {
  addStep.value          = 'search';
  nameQuery.value        = '';
  searchResults.value    = [];
  searchDone.value       = false;
  selectedExisting.value = null;
  newEmployee.value      = { first_name: '', last_name: '', email: '', phone_number: '', job_role: '' };
  showAddDialog.value    = true;
};

const handleNameSearch = async () => {
  if (nameQuery.value.trim().length < 2) return;
  searchLoading.value = true;
  searchDone.value    = false;
  try {
    const res           = await EmployerService.searchEmployeesByName(nameQuery.value.trim());
    searchResults.value = Array.isArray(res.data) ? res.data : [];
    searchDone.value    = true;
  } catch (err) {
    console.error('Search error:', err);
    searchResults.value = [];
    searchDone.value    = true;
  } finally {
    searchLoading.value = false;
  }
};

const selectExistingEmployee = (emp) => {
  selectedExisting.value = emp;
  addStep.value          = 'preview';
};

const goManual = () => {
  const parts = nameQuery.value.trim().split(/\s+/);
  newEmployee.value = {
    first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '',
    email: '', phone_number: '', job_role: '',
  };
  addStep.value = 'manual';
};

const handleAssignExisting = async () => {
  if (!selectedExisting.value) return;
  assigning.value = true;
  try {
    await EmployerService.assignEmployeeToWorkplace(selectedExisting.value.user_id || selectedExisting.value.userId);
    showSnackbar(`${selectedExisting.value.fName} ${selectedExisting.value.lName} added to your workplace!`, 'success');
    showAddDialog.value = false;
    await loadEmployees();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error assigning employee', 'error');
  } finally {
    assigning.value = false;
  }
};

const handleAddEmployee = async () => {
  if (!newEmployee.value.first_name || !newEmployee.value.email) {
    showSnackbar("First name and email are required", "error"); return;
  }
  saving.value = true;
  try {
    const res         = await EmployerService.createEmployee({ ...newEmployee.value, role: 'employee', work_location: user.value?.work_location });
    const createdUser = res.data?.user || res.data;
    const newUserId   = createdUser?.user_id || createdUser?.userId;

    if (newEmployee.value.job_role && newUserId) {
      const matched = jobRoles.value.find(r => r.title === newEmployee.value.job_role);
      if (matched) {
        try { await EmployerService.addRoleToUser(newUserId, { jobRoleId: matched.job_role_id, isPrimary: true }); } catch {}
      }
    }
    showSnackbar("Employee added successfully!", "success");
    showAddDialog.value = false;
    newEmployee.value   = { first_name: '', last_name: '', email: '', phone_number: '', job_role: '' };
    await loadEmployees();
  } catch (err) {
    showSnackbar(err.response?.data?.message || err.message || "Error adding employee", "error");
  } finally {
    saving.value = false;
  }
};

// ── EDIT ──────────────────────────────────────────────────────────────────
const openEditDialog = (employee) => {
  selectedEmployee.value = employee;
  editForm.value = {
    first_name: employee.fName || employee.first_name || '',
    last_name:  employee.lName || employee.last_name  || '',
    email:      employee.email || '',
    phone_number: employee.phone_number || '',
    job_role:   employee.job_role || '',
  };
  showEditDialog.value = true;
};

const handleEditEmployee = async () => {
  if (!editForm.value.first_name || !editForm.value.email) {
    showSnackbar("First name and email are required", "error"); return;
  }
  saving.value = true;
  try {
    const empId = selectedEmployee.value.user_id || selectedEmployee.value.userId;
    await EmployerService.updateEmployee(empId, editForm.value);
    if (editForm.value.job_role) {
      const matched = jobRoles.value.find(r => r.title === editForm.value.job_role);
      if (matched) {
        try { await EmployerService.addRoleToUser(empId, { jobRoleId: matched.job_role_id, isPrimary: true }); } catch {}
      }
    }
    showSnackbar("Employee updated successfully!", "success");
    showEditDialog.value = false;
    await loadEmployees();
  } catch { showSnackbar("Error updating employee", "error"); }
  finally { saving.value = false; }
};

// ── MANAGE ROLES ──────────────────────────────────────────────────────────
const openManageRolesDialog = async (employee) => {
  selectedEmployee.value    = employee;
  selectedNewRole.value     = null;
  makePrimary.value         = false;
  showCreateRoleField.value = false;
  newRoleTitle.value        = '';
  await loadEmployeeRoles(employee.user_id || employee.userId);
  showManageRolesDialog.value = true;
};

// Toggle between "pick existing role" and "create new role"
const toggleCreateRole = () => {
  showCreateRoleField.value = !showCreateRoleField.value;
  if (showCreateRoleField.value) {
    selectedNewRole.value = null; // clear dropdown when switching to create mode
  } else {
    newRoleTitle.value = '';
  }
};

// Create a brand-new role for this location, then immediately assign it
const handleCreateAndAssignRole = async () => {
  if (!newRoleTitle.value.trim()) {
    showSnackbar("Please enter a role title", "error"); return;
  }

  const locationId = user.value?.work_location || user.value?.impersonatedLocation;
  if (!locationId) {
    showSnackbar("No workplace location found", "error"); return;
  }

  creatingRole.value = true;
  try {
    // 1. Create the role scoped to this location
    const createRes = await EmployerService.createJobRole({
      title:       newRoleTitle.value.trim(),
      location_id: locationId,
    });

    const newRole = createRes.data;
    const newRoleId = newRole.job_role_id;

    // 2. Assign it to the employee
    await EmployerService.addRoleToUser(
      selectedEmployee.value.user_id || selectedEmployee.value.userId,
      { jobRoleId: newRoleId, isPrimary: makePrimary.value }
    );

    showSnackbar(`Role "${newRoleTitle.value.trim()}" created and assigned!`, "success");

    // 3. Refresh everything
    newRoleTitle.value        = '';
    showCreateRoleField.value = false;
    makePrimary.value         = false;
    await loadJobRoles(); // reload so new role appears in dropdown next time
    await loadEmployeeRoles(selectedEmployee.value.user_id || selectedEmployee.value.userId);
    await loadEmployees();

  } catch (err) {
    showSnackbar(err.response?.data?.message || "Error creating role", "error");
  } finally {
    creatingRole.value = false;
  }
};

const handleAddRole = async () => {
  if (!selectedNewRole.value) { showSnackbar("Please select a role", "error"); return; }
  addingRole.value = true;
  try {
    await EmployerService.addRoleToUser(
      selectedEmployee.value.user_id || selectedEmployee.value.userId,
      { jobRoleId: selectedNewRole.value, isPrimary: makePrimary.value }
    );
    showSnackbar("Role added successfully!", "success");
    selectedNewRole.value = null;
    makePrimary.value     = false;
    await loadEmployeeRoles(selectedEmployee.value.user_id || selectedEmployee.value.userId);
    await loadEmployees();
  } catch (err) {
    showSnackbar(err.response?.data?.message || "Error adding role", "error");
  } finally { addingRole.value = false; }
};

const handleRemoveRole = async (roleId) => {
  if (employeeRoles.value.length === 1) { showSnackbar("Cannot remove the last role", "error"); return; }
  try {
    await EmployerService.removeRoleFromUser(selectedEmployee.value.user_id || selectedEmployee.value.userId, roleId);
    showSnackbar("Role removed!", "success");
    await loadEmployeeRoles(selectedEmployee.value.user_id || selectedEmployee.value.userId);
    await loadEmployees();
  } catch { showSnackbar("Error removing role", "error"); }
};

const handleSetPrimary = async (roleId) => {
  try {
    await EmployerService.setPrimaryRole(selectedEmployee.value.user_id || selectedEmployee.value.userId, roleId);
    showSnackbar("Primary role updated!", "success");
    await loadEmployeeRoles(selectedEmployee.value.user_id || selectedEmployee.value.userId);
    await loadEmployees();
  } catch { showSnackbar("Error setting primary role", "error"); }
};

// ── DELETE ────────────────────────────────────────────────────────────────
const openDeleteDialog = (employee) => { employeeToDelete.value = employee; showDeleteDialog.value = true; };

const confirmDelete = async () => {
  if (!employeeToDelete.value) return;
  deleting.value = true;
  try {
    await EmployerService.deleteEmployee(employeeToDelete.value.user_id || employeeToDelete.value.userId);
    showSnackbar("Employee deleted successfully", "success");
    await loadEmployees();
  } catch { showSnackbar("Error deleting employee", "error"); }
  finally { deleting.value = false; showDeleteDialog.value = false; employeeToDelete.value = null; }
};

const openDetailsDialog    = (emp) => { selectedEmployee.value = emp; showDetailsDialog.value = true; };
const viewEmployeeSchedule = (emp) => router.push({ name: "employerSchedule", query: { employeeId: emp.user_id || emp.userId } });
const showSnackbar = (msg, color = "success") => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Employee Management</h1>
          <p class="text-body-2 text-grey">Manage your team members and their job roles</p>
        </div>
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-plus" size="large" @click="openAddDialog">
          Add Employee
        </v-btn>
      </div>

      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-0">
          <v-data-table :headers="headers" :items="employeesWithName" :search="search" :loading="loading" items-per-page="10">
            <template #top>
              <div class="pa-4 pb-0">
                <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search employees"
                  variant="outlined" density="compact" hide-details clearable color="#12086F" />
              </div>
            </template>

            <template #[`item.roles`]="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-chip v-for="role in (item.jobRoles || []).slice(0, 2)" :key="role.user_job_role_id"
                  size="x-small" :color="role.is_primary ? '#12086F' : '#4361EE'" variant="tonal">
                  {{ role.role_title }}
                  <v-icon v-if="role.is_primary" size="x-small" class="ml-1">mdi-star</v-icon>
                </v-chip>
                <v-chip v-if="(item.jobRoles || []).length > 2" size="x-small" variant="text" color="#666">
                  +{{ (item.jobRoles || []).length - 2 }}
                </v-chip>
                <v-chip v-if="(item.jobRoles || []).length === 0" size="x-small" color="#9e9e9e" variant="tonal">
                  No roles
                </v-chip>
              </div>
            </template>

            <template #[`item.actions`]="{ item }">
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="props" />
                </template>
                <v-list density="compact">
                  <v-list-item @click="openDetailsDialog(item)"    prepend-icon="mdi-eye"><v-list-item-title>View Details</v-list-item-title></v-list-item>
                  <v-list-item @click="openEditDialog(item)"        prepend-icon="mdi-pencil"><v-list-item-title>Edit Info</v-list-item-title></v-list-item>
                  <v-list-item @click="openManageRolesDialog(item)" prepend-icon="mdi-briefcase-account"><v-list-item-title>Manage Roles</v-list-item-title></v-list-item>
                  <v-divider class="my-1" />
                  <v-list-item @click="openDeleteDialog(item)" prepend-icon="mdi-delete" class="text-error"><v-list-item-title>Remove</v-list-item-title></v-list-item>
                </v-list>
              </v-menu>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- ═══════════════════════════════════════════════════════════════════
         ADD EMPLOYEE DIALOG
    ════════════════════════════════════════════════════════════════════════ -->
    <v-dialog v-model="showAddDialog" max-width="520" persistent>
      <v-card rounded="lg">

        <!-- STEP 1: Search -->
        <template v-if="addStep === 'search'">
          <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text d-flex align-center ga-2">
            <v-icon color="#12086F">mdi-account-search</v-icon>Add Employee
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <p class="text-body-2 text-grey mb-4">Search by name to add someone already in the system, or add them manually if they're new.</p>
            <div class="d-flex ga-2">
              <v-text-field v-model="nameQuery" label="Search by first or last name" variant="outlined" density="compact"
                color="#12086F" hide-details clearable prepend-inner-icon="mdi-magnify"
                @keyup.enter="handleNameSearch" class="flex-grow-1" />
              <v-btn color="#12086F" variant="flat" :loading="searchLoading"
                :disabled="nameQuery.trim().length < 2" @click="handleNameSearch">Search</v-btn>
            </div>

            <div v-if="searchLoading" class="text-center py-6">
              <v-progress-circular indeterminate color="#12086F" size="32" />
            </div>

            <div v-else-if="searchDone">
              <div v-if="searchResults.length > 0" class="mt-4">
                <div class="text-caption text-grey mb-2">{{ searchResults.length }} result{{ searchResults.length > 1 ? 's' : '' }} found — click to add</div>
                <div v-for="emp in searchResults" :key="emp.user_id || emp.userId"
                  class="search-result-row pa-3 mb-2 rounded-lg"
                  :class="emp.alreadyAtLocation ? 'result-disabled' : 'result-clickable'"
                  @click="!emp.alreadyAtLocation && selectExistingEmployee(emp)">
                  <div class="d-flex align-center ga-3">
                    <v-avatar size="36" color="#12086F">
                      <span class="text-white text-caption font-weight-bold">{{ emp.fName?.[0] || '' }}{{ emp.lName?.[0] || '' }}</span>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <div class="text-body-2 font-weight-bold">{{ emp.fName }} {{ emp.lName }}</div>
                      <div class="text-caption text-grey">{{ emp.email }}</div>
                    </div>
                    <v-chip v-if="emp.alreadyAtLocation" size="x-small" color="success" variant="tonal">
                      <v-icon start size="x-small">mdi-check</v-icon>Already here
                    </v-chip>
                    <v-icon v-else color="#12086F" size="20">mdi-chevron-right</v-icon>
                  </div>
                </div>
              </div>

              <div v-else class="mt-4 text-center pa-4 no-results-box rounded-lg">
                <v-icon size="40" color="grey-lighten-2" class="mb-2">mdi-account-question</v-icon>
                <p class="text-body-2 font-weight-medium mb-1">No one found for "{{ nameQuery }}"</p>
                <p class="text-caption text-grey">They might not have an account yet.</p>
              </div>

              <v-btn block variant="tonal" color="#4361EE" class="mt-4" prepend-icon="mdi-account-plus" @click="goManual">
                Add manually instead
              </v-btn>
            </div>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4">
            <v-spacer /><v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
          </v-card-actions>
        </template>

        <!-- STEP 2: Preview & assign existing -->
        <template v-if="addStep === 'preview' && selectedExisting">
          <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text d-flex align-center ga-2">
            <v-btn icon size="x-small" variant="text" @click="addStep = 'search'" class="mr-1"><v-icon>mdi-arrow-left</v-icon></v-btn>
            Confirm Assignment
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <div class="preview-card pa-4 rounded-lg mb-4">
              <div class="d-flex align-center ga-3 mb-3">
                <v-avatar size="52" color="#12086F">
                  <span class="text-white font-weight-bold">{{ selectedExisting.fName?.[0] || '' }}{{ selectedExisting.lName?.[0] || '' }}</span>
                </v-avatar>
                <div>
                  <div class="text-body-1 font-weight-bold navy-text">{{ selectedExisting.fName }} {{ selectedExisting.lName }}</div>
                  <div class="text-caption text-grey">{{ selectedExisting.email }}</div>
                </div>
              </div>
              <v-divider class="my-2" />
              <div v-if="selectedExisting.phone_number" class="d-flex align-center ga-2 mt-2">
                <v-icon size="16" color="#666">mdi-phone</v-icon>
                <span class="text-body-2">{{ selectedExisting.phone_number }}</span>
              </div>
              <div v-if="selectedExisting.work_location" class="d-flex align-center ga-2 mt-2">
                <v-icon size="16" color="#666">mdi-map-marker</v-icon>
                <span class="text-caption text-grey">Also works at another location</span>
              </div>
            </div>
            <v-alert type="info" variant="tonal" density="compact" class="text-body-2">
              This person already has an account. They'll be added without creating a duplicate record.
            </v-alert>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4">
            <v-btn variant="text" @click="addStep = 'search'">Back</v-btn>
            <v-spacer />
            <v-btn color="#12086F" variant="flat" :loading="assigning" @click="handleAssignExisting">
              <v-icon start>mdi-account-plus</v-icon>Add to My Workplace
            </v-btn>
          </v-card-actions>
        </template>

        <!-- STEP 3: Manual entry -->
        <template v-if="addStep === 'manual'">
          <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text d-flex align-center ga-2">
            <v-btn icon size="x-small" variant="text" @click="addStep = 'search'" class="mr-1"><v-icon>mdi-arrow-left</v-icon></v-btn>
            New Employee
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <v-row dense>
              <v-col cols="6"><v-text-field v-model="newEmployee.first_name" label="First Name *" variant="outlined" density="compact" color="#12086F" /></v-col>
              <v-col cols="6"><v-text-field v-model="newEmployee.last_name"  label="Last Name"   variant="outlined" density="compact" color="#12086F" /></v-col>
            </v-row>
            <v-text-field v-model="newEmployee.email"        label="Email *"       type="email" variant="outlined" density="compact" class="mb-3" color="#12086F" />
            <v-text-field v-model="newEmployee.phone_number" label="Phone Number"              variant="outlined" density="compact" class="mb-3" color="#12086F" />
            <v-autocomplete v-model="newEmployee.job_role" :items="jobRoleSuggestions" label="Job Role (optional)"
              variant="outlined" density="compact" hint="You can manage roles after creating the employee"
              persistent-hint color="#12086F" clearable :loading="loadingRoles" />
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4">
            <v-btn variant="text" @click="addStep = 'search'">Back</v-btn>
            <v-spacer />
            <v-btn color="#12086F" variant="flat" :loading="saving" @click="handleAddEmployee">Create Employee</v-btn>
          </v-card-actions>
        </template>
      </v-card>
    </v-dialog>

    <!-- Edit Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Edit Employee</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="editForm.first_name" label="First Name *" variant="outlined" density="compact" color="#12086F" /></v-col>
            <v-col cols="6"><v-text-field v-model="editForm.last_name"  label="Last Name"   variant="outlined" density="compact" color="#12086F" /></v-col>
          </v-row>
          <v-text-field v-model="editForm.email"        label="Email *"     type="email" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-text-field v-model="editForm.phone_number" label="Phone Number"             variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-autocomplete v-model="editForm.job_role" :items="jobRoleSuggestions" label="Job Role"
            variant="outlined" density="compact" hint="Use 'Manage Roles' for multiple roles"
            persistent-hint color="#12086F" clearable :loading="loadingRoles" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="saving" @click="handleEditEmployee">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══════════════════════════════════════════════════════════════════
         MANAGE ROLES DIALOG — with inline role creation
    ════════════════════════════════════════════════════════════════════════ -->
    <v-dialog v-model="showManageRolesDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Manage Roles — {{ selectedEmployee?.fName || selectedEmployee?.first_name }} {{ selectedEmployee?.lName || selectedEmployee?.last_name }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">

          <!-- Current roles -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2 navy-text">Current Roles</div>
            <div v-if="loadingRoles" class="text-center py-4"><v-progress-circular indeterminate color="#12086F" size="24" /></div>
            <div v-else-if="employeeRoles.length === 0" class="text-caption text-grey pa-4 text-center">
              <v-icon size="48" class="mb-2">mdi-briefcase-off-outline</v-icon>
              <div>No roles assigned yet</div>
            </div>
            <div v-else class="d-flex flex-column ga-2">
              <v-card v-for="role in employeeRoles" :key="role.user_job_role_id" variant="outlined" class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center ga-2">
                    <v-icon :color="role.is_primary ? '#12086F' : '#4361EE'">mdi-briefcase</v-icon>
                    <span class="font-weight-bold">{{ role.role_title }}</span>
                    <v-chip v-if="role.is_primary" size="x-small" color="#12086F" variant="tonal">
                      <v-icon size="x-small" class="mr-1">mdi-star</v-icon>Primary
                    </v-chip>
                  </div>
                  <div class="d-flex ga-1">
                    <v-btn v-if="!role.is_primary" icon size="x-small" variant="text" color="#f57c00"
                      @click="handleSetPrimary(role.job_role_id)">
                      <v-icon>mdi-star-outline</v-icon>
                      <v-tooltip activator="parent" location="top">Set as Primary</v-tooltip>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="#d32f2f"
                      @click="handleRemoveRole(role.job_role_id)" :disabled="employeeRoles.length === 1">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </v-card>
            </div>
          </div>

          <v-divider class="my-4" />

          <!-- Add role section -->
          <div>
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-subtitle-2 navy-text">Add Role</div>
              <!-- Toggle between pick existing / create new -->
              <v-btn
                size="x-small"
                :variant="showCreateRoleField ? 'flat' : 'tonal'"
                :color="showCreateRoleField ? '#4361EE' : '#12086F'"
                @click="toggleCreateRole"
                prepend-icon="mdi-plus-circle"
              >
                {{ showCreateRoleField ? 'Cancel new role' : 'Create new role' }}
              </v-btn>
            </div>

            <!-- MODE A: Pick from existing roles for this location -->
            <template v-if="!showCreateRoleField">
              <div v-if="availableRolesToAdd.length === 0" class="text-caption text-grey mb-3 pa-3 rounded-lg" style="background:#f5f5f5;">
                <v-icon size="16" class="mr-1">mdi-information-outline</v-icon>
                All available roles for this location are already assigned.
                Use "Create new role" to add a custom one.
              </div>
              <v-select
                v-else
                v-model="selectedNewRole"
                :items="availableRolesToAdd"
                item-title="title"
                item-value="job_role_id"
                label="Select an existing role"
                variant="outlined"
                density="compact"
                class="mb-3"
                color="#12086F"
              />
              <v-checkbox v-model="makePrimary" label="Set as primary role" color="#12086F"
                density="compact" hide-details class="mb-3" :disabled="!selectedNewRole" />
              <v-btn color="#12086F" variant="flat" block :loading="addingRole"
                :disabled="!selectedNewRole" @click="handleAddRole" prepend-icon="mdi-plus">
                Assign Role
              </v-btn>
            </template>

            <!-- MODE B: Create a brand-new role for this location -->
            <template v-else>
              <v-alert type="info" variant="tonal" density="compact" class="mb-3 text-body-2">
                This will create a new role for your workplace and immediately assign it to this employee.
              </v-alert>
              <v-text-field
                v-model="newRoleTitle"
                label="New role title *"
                placeholder="e.g. Barista, Swim Guard, Front Desk"
                variant="outlined"
                density="compact"
                color="#12086F"
                class="mb-3"
                @keyup.enter="handleCreateAndAssignRole"
              />
              <v-checkbox v-model="makePrimary" label="Set as primary role" color="#12086F"
                density="compact" hide-details class="mb-3" :disabled="!newRoleTitle.trim()" />
              <v-btn color="#4361EE" variant="flat" block :loading="creatingRole"
                :disabled="!newRoleTitle.trim()" @click="handleCreateAndAssignRole"
                prepend-icon="mdi-briefcase-plus">
                Create & Assign Role
              </v-btn>
            </template>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer /><v-btn variant="text" @click="showManageRolesDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Confirm Remove</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">Remove <strong>{{ (employeeToDelete?.fName || employeeToDelete?.first_name || '') }} {{ (employeeToDelete?.lName || employeeToDelete?.last_name || '') }}</strong> from your workplace?</p>
          <p class="text-body-2 text-grey mt-2">This will delete their account entirely. If they work at multiple locations, consider reassigning instead.</p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false" :disabled="deleting">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedEmployee">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Employee Details</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3">
            <div class="text-caption text-grey">Name</div>
            <div class="text-body-1 font-weight-medium">{{ selectedEmployee.fName || selectedEmployee.first_name }} {{ selectedEmployee.lName || selectedEmployee.last_name }}</div>
          </div>
          <div class="mb-3"><div class="text-caption text-grey">Email</div><div class="text-body-1">{{ selectedEmployee.email }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Phone</div><div class="text-body-1">{{ selectedEmployee.phone_number || "N/A" }}</div></div>
          <div class="mb-3">
            <div class="text-caption text-grey">Job Roles</div>
            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip v-for="role in (selectedEmployee.jobRoles || [])" :key="role.user_job_role_id"
                size="small" :color="role.is_primary ? '#12086F' : '#4361EE'" variant="tonal">
                {{ role.role_title }}<v-icon v-if="role.is_primary" size="small" class="ml-1">mdi-star</v-icon>
              </v-chip>
              <v-chip v-if="(selectedEmployee.jobRoles || []).length === 0" size="small" color="#9e9e9e" variant="tonal">No roles assigned</v-chip>
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="tonal" color="#12086F" @click="viewEmployeeSchedule(selectedEmployee)">View Schedule</v-btn>
          <v-spacer /><v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
      {{ snackbarMessage }}
    </v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }

.search-result-row { border: 1px solid #e0e0e0; transition: all 0.15s; }
.result-clickable { cursor: pointer; }
.result-clickable:hover { background: #eef2ff; border-color: #12086F; }
.result-disabled { opacity: 0.55; cursor: default; background: #fafafa; }

.no-results-box { background: #fafafa; border: 1px dashed #e0e0e0; }
.preview-card { background: #f8f9ff; border: 1px solid #c7d2fe; }
</style>