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

const showAddDialog     = ref(false);
const showSearchDialog  = ref(false);
const searchQuery       = ref('');
const searchResults     = ref([]);
const searching         = ref(false);
const searchDone        = ref(false);
const assigning         = ref(false);
const showEditDialog = ref(false);
const showDetailsDialog = ref(false);
const showDeleteDialog = ref(false);
const showManageRolesDialog = ref(false);
const selectedEmployee = ref(null);
const employeeToDelete = ref(null);
const saving = ref(false);
const deleting = ref(false);

const employeeRoles = ref([]);
const selectedNewRole = ref(null);
const makePrimary = ref(false);
const addingRole = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const newEmployee = ref({ first_name: "", last_name: "", email: "", phone_number: "", job_roles: [] });
const editForm = ref({ first_name: "", last_name: "", email: "", phone_number: "", job_roles: [] });

const headers = [
  { title: "Name", key: "name", sortable: true },
  { title: "Email", key: "email", sortable: true },
  { title: "Phone", key: "phone_number", sortable: true },
  { title: "Job Roles", key: "roles", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

const jobRoleSuggestions = computed(() => {
  const backendRoles = jobRoles.value.map(r => r.title);
  const empRoles = employees.value.flatMap(e => (e.jobRoles || []).map(r => r.role_title)).filter(Boolean);
  return [...new Set([...backendRoles, ...empRoles])].sort();
});

const employeesWithName = computed(() =>
  employees.value.map((e) => ({
    ...e,
    name: `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`.trim() || 'Unnamed',
    job_role: e.job_role || 'Not assigned',
    jobRoles: e.jobRoles || [],
  }))
);

const availableRolesToAdd = computed(() => {
  const assignedRoleIds = employeeRoles.value.map(r => r.job_role_id);
  return jobRoles.value.filter(r => !assignedRoleIds.includes(r.job_role_id));
});

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadEmployees(), loadJobRoles()]);
});

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
    const workLocation = user.value?.work_location;
    for (const emp of employeesList) {
      try {
        const rolesRes = await EmployerService.getUserRoles(emp.user_id || emp.userId, workLocation);
        emp.jobRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      } catch {
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
    jobRoles.value = [];
  } finally {
    loadingRoles.value = false;
  }
};

const loadEmployeeRoles = async (userId) => {
  loadingRoles.value = true;
  try {
    const res = await EmployerService.getUserRoles(userId);
    employeeRoles.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    employeeRoles.value = [];
  } finally {
    loadingRoles.value = false;
  }
};

const openManageRolesDialog = async (employee) => {
  selectedEmployee.value = employee;
  selectedNewRole.value = null;
  makePrimary.value = false;
  await loadEmployeeRoles(employee.user_id || employee.userId);
  showManageRolesDialog.value = true;
};

const handleAddRole = async () => {
  if (!selectedNewRole.value) { showSnackbar("Please select or type a role", "error"); return; }
  addingRole.value = true;
  try {
    let roleId;
    if (typeof selectedNewRole.value === 'object' && selectedNewRole.value.job_role_id) {
      roleId = selectedNewRole.value.job_role_id;
    } else if (typeof selectedNewRole.value === 'number') {
      roleId = selectedNewRole.value;
    } else {
      const roleName = typeof selectedNewRole.value === 'string' ? selectedNewRole.value : selectedNewRole.value?.title;
      roleId = await resolveOrCreateRole(roleName);
    }
    if (!roleId) { showSnackbar("Could not resolve role", "error"); addingRole.value = false; return; }
    await EmployerService.addRoleToUser(selectedEmployee.value.user_id || selectedEmployee.value.userId, { jobRoleId: roleId, isPrimary: makePrimary.value });
    showSnackbar("Role added successfully!", "success");
    selectedNewRole.value = null;
    makePrimary.value = false;
    await Promise.all([loadEmployeeRoles(selectedEmployee.value.user_id || selectedEmployee.value.userId), loadJobRoles(), loadEmployees()]);
  } catch (err) {
    console.error('Error adding role:', err);
    showSnackbar(err.response?.data?.message || "Error adding role", "error");
  } finally {
    addingRole.value = false;
  }
};

const handleRemoveRole = async (roleId) => {
  if (employeeRoles.value.length === 1) { showSnackbar("Cannot remove the last role", "error"); return; }
  try {
    await EmployerService.removeRoleFromUser(selectedEmployee.value.user_id || selectedEmployee.value.userId, roleId);
    showSnackbar("Role removed successfully!", "success");
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

const resolveOrCreateRole = async (roleName) => {
  if (!roleName || typeof roleName !== 'string' || !roleName.trim()) return null;
  const trimmed = roleName.trim();
  const existing = jobRoles.value.find(r => r.title.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing.job_role_id;
  try {
    const res = await EmployerService.createJobRole({ title: trimmed, location_id: user.value?.work_location });
    const created = res.data;
    jobRoles.value.push(created);
    return created.job_role_id;
  } catch (err) {
    console.error(`Error creating role "${trimmed}":`, err);
    showSnackbar(`Could not create role "${trimmed}"`, 'error');
    return null;
  }
};

const handleAddEmployee = async () => {
  if (!newEmployee.value.first_name || !newEmployee.value.email) {
    showSnackbar("First name and email are required", "error"); return;
  }
  saving.value = true;
  try {
    const res = await EmployerService.createEmployee({ ...newEmployee.value, role: 'employee', work_location: user.value?.work_location });
    const createdUser = res.data?.user || res.data;
    const newUserId = createdUser?.user_id || createdUser?.userId;
    if (newUserId && newEmployee.value.job_roles.length > 0) {
      for (let i = 0; i < newEmployee.value.job_roles.length; i++) {
        const roleId = await resolveOrCreateRole(newEmployee.value.job_roles[i]);
        if (roleId) {
          try { await EmployerService.addRoleToUser(newUserId, { jobRoleId: roleId, isPrimary: i === 0 }); } catch (e) { console.error('Error assigning role:', e); }
        }
      }
    }
    showSnackbar("Employee added successfully!", "success");
    showAddDialog.value = false;
    newEmployee.value = { first_name: "", last_name: "", email: "", phone_number: "", job_roles: [] };
    await loadEmployees();
  } catch (err) { console.error('Error adding employee:', err); showSnackbar("Error adding employee", "error"); }
  finally { saving.value = false; }
};

const openEditDialog = (employee) => {
  selectedEmployee.value = employee;
  editForm.value = {
    first_name: employee.fName || employee.first_name || "",
    last_name: employee.lName || employee.last_name || "",
    email: employee.email || "",
    phone_number: employee.phone_number || "",
    job_roles: (employee.jobRoles || []).map(r => r.role_title),
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

    const currentRoles = selectedEmployee.value.jobRoles || [];
    const currentTitles = currentRoles.map(r => r.role_title);
    const desiredTitles = editForm.value.job_roles || [];

    const toRemove = currentRoles.filter(r => !desiredTitles.includes(r.role_title));
    const toAdd = desiredTitles.filter(t => !currentTitles.includes(t));

    for (const role of toRemove) {
      if (currentRoles.length - toRemove.length + toAdd.length > 0) {
        try { await EmployerService.removeRoleFromUser(empId, role.job_role_id); } catch (e) { console.error('Error removing role:', e); }
      }
    }
    for (let i = 0; i < toAdd.length; i++) {
      const roleId = await resolveOrCreateRole(toAdd[i]);
      if (roleId) {
        const isPrimary = currentRoles.length === 0 && toRemove.length === 0 && i === 0;
        try { await EmployerService.addRoleToUser(empId, { jobRoleId: roleId, isPrimary }); } catch (e) { console.error('Error adding role:', e); }
      }
    }

    showSnackbar("Employee updated successfully!", "success");
    showEditDialog.value = false;
    await loadEmployees();
  } catch (err) { console.error('Error updating employee:', err); showSnackbar("Error updating employee", "error"); }
  finally { saving.value = false; }
};

const openDeleteDialog = (employee) => { employeeToDelete.value = employee; showDeleteDialog.value = true; };

const confirmDelete = async () => {
  if (!employeeToDelete.value) return;
  deleting.value = true;
  try {
    await EmployerService.removeFromWorkplace(employeeToDelete.value.user_id || employeeToDelete.value.userId);
    showSnackbar("Employee removed from your workplace", "success");
    await loadEmployees();
  } catch { showSnackbar("Error removing employee", "error"); }
  finally { deleting.value = false; showDeleteDialog.value = false; employeeToDelete.value = null; }
};

const openSearchDialog = () => {
  searchQuery.value   = '';
  searchResults.value = [];
  searchDone.value    = false;
  showSearchDialog.value = true;
};

const runSearch = async () => {
  if (!searchQuery.value.trim()) return;
  searching.value = true;
  searchDone.value = false;
  try {
    const res = await EmployerService.searchEmployees(searchQuery.value.trim());
    searchResults.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    searchResults.value = [];
  } finally {
    searching.value  = false;
    searchDone.value = true;
  }
};

const handleAssign = async (foundUser) => {
  assigning.value = true;
  try {
    await EmployerService.assignToWorkplace(foundUser.user_id || foundUser.userId);
    showSnackbar(`${foundUser.fName} ${foundUser.lName} added to your workplace!`, 'success');
    showSearchDialog.value = false;
    await loadEmployees();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error adding employee', 'error');
  } finally {
    assigning.value = false;
  }
};

const openDetailsDialog = (employee) => { selectedEmployee.value = employee; showDetailsDialog.value = true; };
const viewEmployeeSchedule = (employee) => router.push({ name: "employerSchedule", query: { employeeId: employee.user_id || employee.userId } });
const showSnackbar = (message, color = "success") => { snackbarMessage.value = message; snackbarColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Employee Management</h1>
          <p class="text-body-2 text-grey">Manage your team members and their job roles</p>
        </div>
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-plus" size="large" @click="openSearchDialog">
          Add Employee
        </v-btn>
      </div>

      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-0">
          <v-data-table :headers="headers" :items="employeesWithName" :search="search" :loading="loading" items-per-page="10">
            <template #top>
              <div class="pa-4 pb-0">
                <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search employees" variant="outlined" density="compact" hide-details clearable color="#12086F" />
              </div>
            </template>

            <template #[`item.roles`]="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-chip v-for="role in (item.jobRoles || []).slice(0, 2)" :key="role.user_job_role_id" size="x-small" :color="role.is_primary ? '#12086F' : '#4361EE'" variant="tonal">
                  {{ role.role_title }}
                  <v-icon v-if="role.is_primary" size="x-small" class="ml-1">mdi-star</v-icon>
                </v-chip>
                <v-chip v-if="(item.jobRoles || []).length > 2" size="x-small" variant="text" color="#666">+{{ (item.jobRoles || []).length - 2 }}</v-chip>
                <v-chip v-if="(item.jobRoles || []).length === 0" size="x-small" color="#9e9e9e" variant="tonal">No roles</v-chip>
              </div>
            </template>

            <template #[`item.actions`]="{ item }">
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="props" />
                </template>
                <v-list density="compact">
                  <v-list-item @click="openDetailsDialog(item)" prepend-icon="mdi-eye"><v-list-item-title>View Details</v-list-item-title></v-list-item>
                  <v-list-item @click="openEditDialog(item)" prepend-icon="mdi-pencil"><v-list-item-title>Edit Info</v-list-item-title></v-list-item>
                  <v-list-item @click="openManageRolesDialog(item)" prepend-icon="mdi-briefcase-account"><v-list-item-title>Manage Roles</v-list-item-title></v-list-item>
                  <v-divider class="my-1" />
                  <v-list-item @click="openDeleteDialog(item)" prepend-icon="mdi-delete" class="text-error"><v-list-item-title>Delete</v-list-item-title></v-list-item>
                </v-list>
              </v-menu>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Search-first Add Employee Dialog -->
    <v-dialog v-model="showSearchDialog" max-width="520" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-2 navy-text d-flex align-center ga-2">
          <v-icon color="#12086F">mdi-account-plus</v-icon> Add Employee
        </v-card-title>
        <v-card-subtitle class="px-5 pb-3 text-grey">Search by name to add someone already in the system, or add them manually if they're new.</v-card-subtitle>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="d-flex ga-2 mb-4">
            <v-text-field
              v-model="searchQuery"
              label="Search by first or last name"
              variant="outlined"
              density="compact"
              hide-details
              color="#12086F"
              clearable
              @keyup.enter="runSearch"
            />
            <v-btn color="#12086F" variant="flat" :loading="searching" @click="runSearch">Search</v-btn>
          </div>

          <div v-if="searching" class="text-center py-6">
            <v-progress-circular indeterminate color="#12086F" />
          </div>
          <div v-else-if="searchDone && searchResults.length === 0" class="text-center py-6">
            <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-account-question</v-icon>
            <div class="text-body-2 text-grey">No one found for "{{ searchQuery }}"</div>
            <div class="text-caption text-grey">They might not have an account yet.</div>
          </div>
          <div v-else-if="searchResults.length > 0" class="d-flex flex-column ga-2">
            <v-card
              v-for="found in searchResults"
              :key="found.user_id"
              variant="outlined"
              rounded="lg"
              class="pa-3 d-flex align-center justify-space-between"
            >
              <div>
                <div class="text-body-2 font-weight-bold navy-text">{{ found.fName }} {{ found.lName }}</div>
                <div class="text-caption text-grey">{{ found.email }}</div>
                <div v-if="found.phone_number" class="text-caption text-grey">{{ found.phone_number }}</div>
              </div>
              <v-btn
                v-if="!found.alreadyAtLocation"
                color="#12086F"
                variant="flat"
                size="small"
                :loading="assigning"
                @click="handleAssign(found)"
              >Add</v-btn>
              <v-chip v-else size="small" color="success" variant="tonal">Already added</v-chip>
            </v-card>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="tonal" color="#12086F" prepend-icon="mdi-account-edit" @click="showSearchDialog = false; showAddDialog = true">Add Manually Instead</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showSearchDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Manual Add Employee Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Add New Employee</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="newEmployee.first_name" label="First Name *" variant="outlined" density="compact" color="#12086F" /></v-col>
            <v-col cols="6"><v-text-field v-model="newEmployee.last_name" label="Last Name" variant="outlined" density="compact" color="#12086F" /></v-col>
          </v-row>
          <v-text-field v-model="newEmployee.email" label="Email *" type="email" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-text-field v-model="newEmployee.phone_number" label="Phone Number" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-combobox v-model="newEmployee.job_roles" :items="jobRoleSuggestions" label="Job Roles" variant="outlined" density="compact" multiple chips closable-chips hint="Select existing or type new role name, press Enter to add" persistent-hint color="#12086F" clearable :loading="loadingRoles" no-data-text="Type a new role name and press Enter" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="saving" @click="handleAddEmployee">Add Employee</v-btn>
        </v-card-actions>
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
            <v-col cols="6"><v-text-field v-model="editForm.last_name" label="Last Name" variant="outlined" density="compact" color="#12086F" /></v-col>
          </v-row>
          <v-text-field v-model="editForm.email" label="Email *" type="email" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-text-field v-model="editForm.phone_number" label="Phone Number" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-combobox v-model="editForm.job_roles" :items="jobRoleSuggestions" label="Job Roles" variant="outlined" density="compact" multiple chips closable-chips hint="Select existing or type new role name, press Enter to add" persistent-hint color="#12086F" clearable :loading="loadingRoles" no-data-text="Type a new role name and press Enter" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="saving" @click="handleEditEmployee">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Manage Roles Dialog -->
    <v-dialog v-model="showManageRolesDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Manage Roles — {{ selectedEmployee?.fName || selectedEmployee?.first_name }} {{ selectedEmployee?.lName || selectedEmployee?.last_name }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
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
                  <div class="flex-grow-1">
                    <div class="d-flex align-center ga-2 mb-1">
                      <v-icon :color="role.is_primary ? '#12086F' : '#4361EE'">mdi-briefcase</v-icon>
                      <span class="font-weight-bold">{{ role.role_title }}</span>
                      <v-chip v-if="role.is_primary" size="x-small" color="#12086F" variant="tonal">
                        <v-icon size="x-small" class="mr-1">mdi-star</v-icon>Primary
                      </v-chip>
                    </div>
                  </div>
                  <div class="d-flex ga-1">
                    <v-btn v-if="!role.is_primary" icon size="x-small" variant="text" color="#f57c00" @click="handleSetPrimary(role.job_role_id)">
                      <v-icon>mdi-star-outline</v-icon>
                      <v-tooltip activator="parent" location="top">Set as Primary</v-tooltip>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="#d32f2f" @click="handleRemoveRole(role.job_role_id)" :disabled="employeeRoles.length === 1">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </v-card>
            </div>
          </div>
          <v-divider class="my-4" />
          <div>
            <div class="text-subtitle-2 mb-2 navy-text">Add New Role</div>
            <v-combobox v-model="selectedNewRole" :items="availableRolesToAdd" item-title="title" item-value="job_role_id" label="Select or type a new role" variant="outlined" density="compact" class="mb-3" color="#12086F" no-data-text="Type a new role name and press Enter" hint="Pick from list or type a new role" persistent-hint return-object />
            <v-checkbox v-model="makePrimary" label="Set as primary role" color="#12086F" density="compact" hide-details class="mb-3" :disabled="!selectedNewRole" />
            <v-btn color="#12086F" variant="flat" block :loading="addingRole" :disabled="!selectedNewRole" @click="handleAddRole" prepend-icon="mdi-plus">Add Role</v-btn>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showManageRolesDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Confirm Delete</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">Are you sure you want to delete <strong>{{ (employeeToDelete?.fName || employeeToDelete?.first_name || '') }} {{ (employeeToDelete?.lName || employeeToDelete?.last_name || '') }}</strong>?</p>
          <p class="text-body-2 text-grey mt-2">They will be removed from your workplace. Their account will not be deleted.</p>
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
          <div class="mb-3"><div class="text-caption text-grey">Name</div><div class="text-body-1 font-weight-medium">{{ selectedEmployee.fName || selectedEmployee.first_name }} {{ selectedEmployee.lName || selectedEmployee.last_name }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Email</div><div class="text-body-1">{{ selectedEmployee.email }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Phone</div><div class="text-body-1">{{ selectedEmployee.phone_number || "N/A" }}</div></div>
          <div class="mb-3">
            <div class="text-caption text-grey">Job Roles</div>
            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip v-for="role in (selectedEmployee.jobRoles || [])" :key="role.user_job_role_id" size="small" :color="role.is_primary ? '#12086F' : '#4361EE'" variant="tonal">
                {{ role.role_title }}<v-icon v-if="role.is_primary" size="small" class="ml-1">mdi-star</v-icon>
              </v-chip>
              <v-chip v-if="(selectedEmployee.jobRoles || []).length === 0" size="small" color="#9e9e9e" variant="tonal">No roles assigned</v-chip>
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="tonal" color="#12086F" @click="viewEmployeeSchedule(selectedEmployee)">View Schedule</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }
</style>