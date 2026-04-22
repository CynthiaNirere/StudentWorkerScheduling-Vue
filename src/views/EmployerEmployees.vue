<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user   = ref(null);

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

// ── PIN management ────────────────────────────────────────────────────────
const editEmployeePin = ref('0000');
const savingPin       = ref(false);
const showPin         = ref(false);   // toggle PIN visibility in edit dialog

const employeeRoles = ref([]);
const rolesToAdd    = ref([]);
const addingRole    = ref(false);

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
const emailCheckLoading = ref(false);
const foundByEmail      = ref(null);

const newEmployee = ref({ first_name: '', last_name: '', email: '', phone_number: '', selectedRoles: [] });
const editForm    = ref({ first_name: '', last_name: '', email: '', phone_number: '', job_role: '' });

const headers = [
  { title: "Name",      key: "name",        sortable: true  },
  { title: "Email",     key: "email",        sortable: true  },
  { title: "Phone",     key: "phone_number", sortable: true  },
  { title: "Job Roles", key: "roles",        sortable: false },
  { title: "Actions",   key: "actions",      sortable: false, align: "end" },
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

const loadEmployees = async () => {
  loading.value = true;
  try {
    const res       = await EmployerService.getAllEmployees();
    const allUsers  = Array.isArray(res.data) ? res.data : [];
    const currentId = user.value?.user_id || user.value?.userId;
    const list      = allUsers.filter(u => u.role === 'employee' && (u.user_id || u.userId) !== currentId);
    for (const emp of list) {
      try {
        const r = await EmployerService.getUserRoles(emp.user_id || emp.userId, user.value?.work_location);
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
    const res           = await EmployerService.getUserRoles(userId, user.value?.work_location);
    employeeRoles.value = Array.isArray(res.data) ? res.data : [];
  } catch { employeeRoles.value = []; }
  finally { loadingRoles.value = false; }
};

// ── ADD DIALOG ────────────────────────────────────────────────────────────
const openAddDialog = () => {
  addStep.value = 'search'; nameQuery.value = ''; searchResults.value = [];
  searchDone.value = false; selectedExisting.value = null; foundByEmail.value = null;
  emailCheckLoading.value = false;
  newEmployee.value = { first_name: '', last_name: '', email: '', phone_number: '', selectedRoles: [] };
  showAddDialog.value = true;
};

const handleNameSearch = async () => {
  if (nameQuery.value.trim().length < 2) return;
  searchLoading.value = true; searchDone.value = false;
  try {
    const res           = await EmployerService.searchEmployeesByName(nameQuery.value.trim());
    searchResults.value = Array.isArray(res.data) ? res.data : [];
    searchDone.value    = true;
  } catch { searchResults.value = []; searchDone.value = true; }
  finally { searchLoading.value = false; }
};

const selectExistingEmployee = (emp) => {
  selectedExisting.value = emp;
  newEmployee.value = { first_name: emp.fName || emp.first_name || '', last_name: emp.lName || emp.last_name || '', email: emp.email || '', phone_number: emp.phone_number || '', selectedRoles: [] };
  addStep.value = 'manual';
};

const goManual = () => {
  selectedExisting.value = null;
  const parts = nameQuery.value.trim().split(/\s+/);
  newEmployee.value = { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '', email: '', phone_number: '', selectedRoles: [] };
  addStep.value = 'manual';
};

const handleAssignExisting = async () => {
  if (!selectedExisting.value) return;
  assigning.value = true;
  try {
    await EmployerService.assignEmployeeToWorkplace(selectedExisting.value.user_id || selectedExisting.value.userId);
    showSnackbar(`${selectedExisting.value.fName} ${selectedExisting.value.lName} added!`, 'success');
    showAddDialog.value = false; foundByEmail.value = null;
    await loadEmployees();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error assigning employee', 'error');
  } finally { assigning.value = false; }
};

const handleEmailCheck = async () => {
  const email = newEmployee.value.email?.trim();
  if (!email || !email.includes('@')) { foundByEmail.value = null; return; }
  emailCheckLoading.value = true; foundByEmail.value = null;
  try {
    const res = await EmployerService.findByEmail(email);
    if (res.data?.user_id) {
      foundByEmail.value = res.data;
      newEmployee.value.first_name   = res.data.fName || res.data.first_name || newEmployee.value.first_name;
      newEmployee.value.last_name    = res.data.lName || res.data.last_name  || newEmployee.value.last_name;
      newEmployee.value.phone_number = res.data.phone_number || newEmployee.value.phone_number;
    }
  } catch (err) {
    if (err.response?.status !== 404) console.warn('Email check error:', err.message);
    foundByEmail.value = null;
  } finally { emailCheckLoading.value = false; }
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
    const locationId  = user.value?.work_location || user.value?.impersonatedLocation;

    if (res.data?.alreadyExisted) {
      const existingUserId = createdUser?.user_id || createdUser?.userId;
      if (existingUserId && locationId) {
        try {
          const rolesRes = await EmployerService.getUserRoles(existingUserId, locationId);
          const existingRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
          for (const role of existingRoles) { try { await EmployerService.removeRoleFromUser(existingUserId, role.job_role_id); } catch {} }
        } catch {}
        for (let i = 0; i < newEmployee.value.selectedRoles.length; i++) {
          const role = newEmployee.value.selectedRoles[i]; const isPrimary = i === 0;
          try {
            if (typeof role === 'string') {
              const created = await EmployerService.createJobRole({ title: role.trim(), location_id: locationId });
              await EmployerService.addRoleToUser(existingUserId, { jobRoleId: created.data.job_role_id, isPrimary });
            } else { await EmployerService.addRoleToUser(existingUserId, { jobRoleId: role.job_role_id, isPrimary }); }
          } catch {}
        }
        await loadJobRoles();
      }
      showSnackbar(`${createdUser?.fName || newEmployee.value.first_name} added to your workplace!`, "success");
      showAddDialog.value = false;
      newEmployee.value = { first_name: '', last_name: '', email: '', phone_number: '', selectedRoles: [] };
      selectedExisting.value = null;
      await loadEmployees(); return;
    }

    if (newUserId && newEmployee.value.selectedRoles.length > 0) {
      for (let i = 0; i < newEmployee.value.selectedRoles.length; i++) {
        const role = newEmployee.value.selectedRoles[i]; const isPrimary = i === 0;
        try {
          if (typeof role === 'string') {
            const created = await EmployerService.createJobRole({ title: role.trim(), location_id: locationId });
            await EmployerService.addRoleToUser(newUserId, { jobRoleId: created.data.job_role_id, isPrimary });
          } else { await EmployerService.addRoleToUser(newUserId, { jobRoleId: role.job_role_id, isPrimary }); }
        } catch {}
      }
      await loadJobRoles();
    }
    showSnackbar("Employee added successfully!", "success");
    showAddDialog.value = false;
    newEmployee.value   = { first_name: '', last_name: '', email: '', phone_number: '', selectedRoles: [] };
    await loadEmployees();
  } catch (err) {
    showSnackbar(err.response?.data?.message || err.message || "Error adding employee", "error");
  } finally { saving.value = false; }
};

// ── EDIT ──────────────────────────────────────────────────────────────────
const openEditDialog = async (employee) => {
  selectedEmployee.value = employee;
  editForm.value = {
    first_name:   employee.fName || employee.first_name || '',
    last_name:    employee.lName || employee.last_name  || '',
    email:        employee.email || '',
    phone_number: employee.phone_number || '',
    job_role:     employee.job_role || '',
  };
  editEmployeePin.value = '0000';
  showPin.value         = false;
  showEditDialog.value  = true;
  // Load roles and PIN in parallel
  await Promise.all([
    loadEmployeeRoles(employee.user_id || employee.userId),
    (async () => {
      try {
        const pinRes = await EmployerService.getEmployeeKioskPin(employee.user_id || employee.userId);
        editEmployeePin.value = pinRes.data?.kioskPin || '0000';
      } catch { editEmployeePin.value = '0000'; }
    })(),
  ]);
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
      if (matched) { try { await EmployerService.addRoleToUser(empId, { jobRoleId: matched.job_role_id, isPrimary: true }); } catch {} }
    }
    showSnackbar("Employee updated!", "success");
    showEditDialog.value = false;
    await loadEmployees();
  } catch { showSnackbar("Error updating employee", "error"); }
  finally { saving.value = false; }
};

// ── SAVE PIN ──────────────────────────────────────────────────────────────
const saveEmployeePin = async () => {
  const pin = editEmployeePin.value;
  if (!pin || !/^\d{4}$/.test(pin)) {
    showSnackbar('PIN must be exactly 4 digits (numbers only)', 'error'); return;
  }
  savingPin.value = true;
  try {
    const empId = selectedEmployee.value?.user_id || selectedEmployee.value?.userId;
    await EmployerService.setEmployeeKioskPin(empId, pin);
    showSnackbar('PIN saved!', 'success');
  } catch { showSnackbar('Error saving PIN', 'error'); }
  finally { savingPin.value = false; }
};

// ── MANAGE ROLES ──────────────────────────────────────────────────────────
const openManageRolesDialog = async (employee) => {
  selectedEmployee.value      = employee;
  showManageRolesDialog.value = true;
  rolesToAdd.value            = [];
  await loadEmployeeRoles(employee.user_id || employee.userId);
};

const handleAssignRoles = async () => {
  if (rolesToAdd.value.length === 0) { showSnackbar("Select at least one role", "error"); return; }
  addingRole.value = true;
  const locationId = user.value?.work_location || user.value?.impersonatedLocation;
  const empId      = selectedEmployee.value.user_id || selectedEmployee.value.userId;
  try {
    for (const role of rolesToAdd.value) {
      if (typeof role === 'string') {
        const created = await EmployerService.createJobRole({ title: role.trim(), location_id: locationId });
        await EmployerService.addRoleToUser(empId, { jobRoleId: created.data.job_role_id, isPrimary: false });
      } else { await EmployerService.addRoleToUser(empId, { jobRoleId: role.job_role_id, isPrimary: false }); }
    }
    showSnackbar("Role(s) assigned!", "success");
    rolesToAdd.value = [];
    await loadJobRoles(); await loadEmployeeRoles(empId); await loadEmployees();
  } catch (err) { showSnackbar(err.response?.data?.message || "Error assigning roles", "error"); }
  finally { addingRole.value = false; }
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
const openDeleteDialog  = (employee) => { employeeToDelete.value = employee; showDeleteDialog.value = true; };
const confirmDelete     = async () => {
  if (!employeeToDelete.value) return;
  deleting.value = true;
  try {
    await EmployerService.removeFromWorkplace(employeeToDelete.value.user_id || employeeToDelete.value.userId);
    showSnackbar("Employee removed from your workplace", "success");
    await loadEmployees();
  } catch { showSnackbar("Error removing employee", "error"); }
  finally { deleting.value = false; showDeleteDialog.value = false; employeeToDelete.value = null; }
};

const employeeCerts  = ref([]);
const certsLoading   = ref(false);
const viewingCert    = ref(null);
const showCertViewer = ref(false);

const openDetailsDialog = async (emp) => {
  selectedEmployee.value  = emp;
  employeeCerts.value     = [];
  showDetailsDialog.value = true;
  certsLoading.value      = true;
  try {
    const res = await EmployerService.getEmployeeById(emp.user_id || emp.userId);
    employeeCerts.value = Array.isArray(res.data?.certifications) ? res.data.certifications : [];
  } catch { employeeCerts.value = []; }
  finally { certsLoading.value = false; }
};

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
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-plus" size="large" @click="openAddDialog">Add Employee</v-btn>
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
                  {{ role.role_title }}<v-icon v-if="role.is_primary" size="x-small" class="ml-1">mdi-star</v-icon>
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
                  <v-list-item @click="openDetailsDialog(item)"    prepend-icon="mdi-eye"><v-list-item-title>View Details</v-list-item-title></v-list-item>
                  <v-list-item @click="openEditDialog(item)"        prepend-icon="mdi-pencil"><v-list-item-title>Edit Info & PIN</v-list-item-title></v-list-item>
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

    <!-- ═══════════ ADD DIALOG ═══════════ -->
    <v-dialog v-model="showAddDialog" max-width="520" persistent>
      <v-card rounded="lg">
        <template v-if="addStep === 'search'">
          <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text d-flex align-center ga-2">
            <v-icon color="#12086F">mdi-account-search</v-icon>Add Employee
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <p class="text-body-2 text-grey mb-4">Search by name to add someone already in the system, or add them manually if they're new.</p>
            <div class="d-flex ga-2">
              <v-text-field v-model="nameQuery" label="Search by name" variant="outlined" density="compact" color="#12086F" hide-details clearable prepend-inner-icon="mdi-magnify" @keyup.enter="handleNameSearch" class="flex-grow-1" />
              <v-btn color="#12086F" variant="flat" :loading="searchLoading" :disabled="nameQuery.trim().length < 2" @click="handleNameSearch">Search</v-btn>
            </div>
            <div v-if="searchLoading" class="text-center py-6"><v-progress-circular indeterminate color="#12086F" size="32" /></div>
            <div v-else-if="searchDone">
              <div v-if="searchResults.length > 0" class="mt-4">
                <div class="text-caption text-grey mb-2">{{ searchResults.length }} result(s) — click to add</div>
                <div v-for="emp in searchResults" :key="emp.user_id || emp.userId" class="search-result-row pa-3 mb-2 rounded-lg" :class="emp.alreadyAtLocation ? 'result-disabled' : 'result-clickable'" @click="!emp.alreadyAtLocation && selectExistingEmployee(emp)">
                  <div class="d-flex align-center ga-3">
                    <v-avatar size="36" color="#12086F"><span class="text-white text-caption font-weight-bold">{{ emp.fName?.[0] || '' }}{{ emp.lName?.[0] || '' }}</span></v-avatar>
                    <div class="flex-grow-1">
                      <div class="text-body-2 font-weight-bold">{{ emp.fName }} {{ emp.lName }}</div>
                      <div class="text-caption text-grey">{{ emp.email }}</div>
                    </div>
                    <v-chip v-if="emp.alreadyAtLocation" size="x-small" color="success" variant="tonal"><v-icon start size="x-small">mdi-check</v-icon>Already here</v-chip>
                    <v-icon v-else color="#12086F" size="20">mdi-chevron-right</v-icon>
                  </div>
                </div>
              </div>
              <div v-else class="mt-4 text-center pa-4 no-results-box rounded-lg">
                <v-icon size="40" color="grey-lighten-2" class="mb-2">mdi-account-question</v-icon>
                <p class="text-body-2 font-weight-medium mb-1">No one found for "{{ nameQuery }}"</p>
                <p class="text-caption text-grey">They might not have an account yet.</p>
              </div>
              <v-btn block variant="tonal" color="#4361EE" class="mt-4" prepend-icon="mdi-account-plus" @click="goManual">Add manually instead</v-btn>
            </div>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4"><v-spacer /><v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn></v-card-actions>
        </template>

        <template v-if="addStep === 'manual'">
          <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text d-flex align-center ga-2">
            <v-icon color="#12086F" class="mr-2">mdi-account-plus</v-icon>Add Employee
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <v-row dense>
              <v-col cols="6"><v-text-field v-model="newEmployee.first_name" label="First Name *" variant="outlined" density="compact" color="#12086F" /></v-col>
              <v-col cols="6"><v-text-field v-model="newEmployee.last_name" label="Last Name" variant="outlined" density="compact" color="#12086F" /></v-col>
            </v-row>
            <v-text-field v-model="newEmployee.email" label="Email *" type="email" variant="outlined" density="compact" color="#12086F" :loading="emailCheckLoading" @blur="handleEmailCheck" @keyup.enter="handleEmailCheck" />
            <v-alert v-if="foundByEmail || selectedExisting" type="info" variant="tonal" density="compact" class="mb-3 mt-1 text-body-2" rounded="lg">
              <v-icon start size="small">mdi-account-check</v-icon>Details pre-filled from existing account.
            </v-alert>
            <div v-else class="mb-3" />
            <v-text-field v-model="newEmployee.phone_number" label="Phone Number" variant="outlined" density="compact" class="mb-3" color="#12086F" />
            <v-combobox v-model="newEmployee.selectedRoles" :items="jobRoles" item-title="title" return-object multiple chips closable-chips label="Assign Roles (optional)" variant="outlined" density="compact" color="#12086F" :loading="loadingRoles" hint="Select from list or type new role name and press Enter" persistent-hint>
              <template #chip="{ item, props }">
                <v-chip v-bind="props" :color="typeof item.raw === 'string' ? '#4361EE' : '#12086F'" variant="tonal" size="small">
                  <v-icon v-if="typeof item.raw === 'string'" start size="x-small">mdi-plus</v-icon>
                  {{ typeof item.raw === 'string' ? item.raw : item.raw.title }}
                </v-chip>
              </template>
            </v-combobox>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4">
            <v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
            <v-spacer />
            <v-btn color="#12086F" variant="flat" :loading="saving" @click="handleAddEmployee">{{ selectedExisting ? 'Add to My Workplace' : 'Create Employee' }}</v-btn>
          </v-card-actions>
        </template>
      </v-card>
    </v-dialog>

    <!-- ═══════════ EDIT DIALOG (includes PIN section) ═══════════ -->
    <v-dialog v-model="showEditDialog" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Edit — {{ selectedEmployee?.fName || selectedEmployee?.first_name }} {{ selectedEmployee?.lName || selectedEmployee?.last_name }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5" style="max-height:70vh;overflow-y:auto;">
          <!-- Basic info -->
          <v-row dense>
            <v-col cols="6"><v-text-field v-model="editForm.first_name" label="First Name *" variant="outlined" density="compact" color="#12086F" /></v-col>
            <v-col cols="6"><v-text-field v-model="editForm.last_name" label="Last Name" variant="outlined" density="compact" color="#12086F" /></v-col>
          </v-row>
          <v-text-field v-model="editForm.email" label="Email *" type="email" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-text-field v-model="editForm.phone_number" label="Phone Number" variant="outlined" density="compact" class="mb-3" color="#12086F" />

          <!-- Current roles -->
          <div class="text-caption text-grey mb-1">Assigned Roles</div>
          <div v-if="loadingRoles" class="d-flex align-center ga-2 mb-3"><v-progress-circular indeterminate size="16" width="2" color="#12086F" /><span class="text-caption text-grey">Loading roles...</span></div>
          <div v-else-if="employeeRoles.length === 0" class="mb-3"><v-chip size="small" color="grey" variant="tonal">No roles assigned</v-chip></div>
          <div v-else class="d-flex flex-wrap ga-1 mb-3">
            <v-chip v-for="role in employeeRoles" :key="role.user_job_role_id" size="small" :color="role.is_primary ? '#12086F' : '#4361EE'" variant="tonal">
              {{ role.role_title }}<v-icon v-if="role.is_primary" size="x-small" class="ml-1">mdi-star</v-icon>
            </v-chip>
          </div>
          <v-btn size="small" variant="tonal" color="#12086F" prepend-icon="mdi-briefcase-account" class="mb-4"
            @click="showEditDialog = false; openManageRolesDialog(selectedEmployee)">
            Manage Roles
          </v-btn>

          <!-- ── Kiosk PIN section ── -->
          <v-divider class="my-3" />
          <div class="text-body-2 font-weight-bold navy-text mb-2 d-flex align-center ga-2">
            <v-icon size="18" color="#12086F">mdi-lock-outline</v-icon>Kiosk PIN
          </div>
          <v-alert type="info" variant="tonal" color="#12086F" density="compact" class="mb-3">
            <div class="text-caption">
              This 4-digit PIN is what <strong>{{ selectedEmployee?.fName || 'the employee' }}</strong>
              enters at the clock-in kiosk. Default is <strong>0000</strong>.
            </div>
          </v-alert>
          <div class="d-flex align-center ga-3 mb-1">
            <v-otp-input
              v-model="editEmployeePin"
              length="4"
              :type="showPin ? 'text' : 'password'"
              color="#12086F"
              variant="outlined"
              style="max-width:240px;"
            />
            <v-btn
              :icon="showPin ? 'mdi-eye-off' : 'mdi-eye'"
              size="small" variant="text" color="#666"
              @click="showPin = !showPin"
            />
            <v-btn
              color="#12086F" variant="flat"
              :loading="savingPin"
              @click="saveEmployeePin"
              prepend-icon="mdi-content-save"
              class="text-none"
            >Save PIN</v-btn>
          </div>
          <p class="text-caption text-grey mt-1">Must be exactly 4 digits (numbers only).</p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="saving" @click="handleEditEmployee">Save Info</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══════════ MANAGE ROLES ═══════════ -->
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
              <v-icon size="48" class="mb-2">mdi-briefcase-off-outline</v-icon><div>No roles assigned yet</div>
            </div>
            <div v-else class="d-flex flex-column ga-2">
              <v-card v-for="role in employeeRoles" :key="role.user_job_role_id" variant="outlined" class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center ga-2">
                    <v-icon :color="role.is_primary ? '#12086F' : '#4361EE'">mdi-briefcase</v-icon>
                    <span class="font-weight-bold">{{ role.role_title }}</span>
                    <v-chip v-if="role.is_primary" size="x-small" color="#12086F" variant="tonal"><v-icon size="x-small" class="mr-1">mdi-star</v-icon>Primary</v-chip>
                  </div>
                  <div class="d-flex ga-1">
                    <v-btn v-if="!role.is_primary" icon size="x-small" variant="text" color="#f57c00" @click="handleSetPrimary(role.job_role_id)">
                      <v-icon>mdi-star-outline</v-icon><v-tooltip activator="parent" location="top">Set as Primary</v-tooltip>
                    </v-btn>
                    <v-btn icon size="x-small" variant="text" color="#d32f2f" @click="handleRemoveRole(role.job_role_id)" :disabled="employeeRoles.length === 1"><v-icon>mdi-delete</v-icon></v-btn>
                  </div>
                </div>
              </v-card>
            </div>
          </div>
          <v-divider class="my-4" />
          <div>
            <div class="text-subtitle-2 navy-text mb-2">Add Roles</div>
            <v-combobox v-model="rolesToAdd" :items="availableRolesToAdd" item-title="title" return-object multiple chips closable-chips label="Select or create roles" variant="outlined" density="compact" color="#12086F" :loading="loadingRoles" class="mb-3">
              <template #chip="{ item, props }">
                <v-chip v-bind="props" :color="typeof item.raw === 'string' ? '#4361EE' : '#12086F'" variant="tonal" size="small">
                  <v-icon v-if="typeof item.raw === 'string'" start size="x-small">mdi-plus</v-icon>
                  {{ typeof item.raw === 'string' ? item.raw : item.raw.title }}
                </v-chip>
              </template>
            </v-combobox>
            <v-btn color="#12086F" variant="flat" block :loading="addingRole" :disabled="rolesToAdd.length === 0" @click="handleAssignRoles" prepend-icon="mdi-briefcase-check">
              Assign {{ rolesToAdd.length > 1 ? `${rolesToAdd.length} Roles` : 'Role' }}
            </v-btn>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4"><v-spacer /><v-btn variant="text" @click="showManageRolesDialog = false">Close</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══════════ DELETE ═══════════ -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Confirm Remove</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">Remove <strong>{{ (employeeToDelete?.fName || employeeToDelete?.first_name || '') }} {{ (employeeToDelete?.lName || employeeToDelete?.last_name || '') }}</strong> from your workplace?</p>
          <p class="text-body-2 text-grey mt-2">They'll be removed from your workplace only. Their account remains intact.</p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false" :disabled="deleting">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══════════ DETAILS ═══════════ -->
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
          <v-divider class="my-3" />
          <div class="text-caption text-grey mb-2">Certifications & Files</div>
          <div v-if="certsLoading" class="d-flex align-center ga-2"><v-progress-circular indeterminate size="16" width="2" color="#12086F" /><span class="text-caption text-grey">Loading...</span></div>
          <div v-else-if="employeeCerts.length === 0" class="text-caption text-grey">No certifications uploaded.</div>
          <v-list v-else density="compact" class="pa-0">
            <v-list-item v-for="(cert, i) in employeeCerts" :key="i" :prepend-icon="cert.mimeType === 'application/pdf' ? 'mdi-file-pdf-box' : 'mdi-file-image'" rounded="lg" class="mb-1" style="border:1px solid #e0e0e0;">
              <v-list-item-title class="text-body-2 font-weight-medium">{{ cert.name }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption text-grey">Uploaded {{ cert.date }}</v-list-item-subtitle>
              <template #append>
                <v-btn icon="mdi-eye" size="small" variant="text" color="#4361EE" @click="viewingCert = cert; showCertViewer = true" />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="tonal" color="#12086F" @click="viewEmployeeSchedule(selectedEmployee)">View Schedule</v-btn>
          <v-spacer /><v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cert Viewer -->
    <v-dialog v-model="showCertViewer" max-width="800">
      <v-card rounded="lg" v-if="viewingCert">
        <v-card-title class="pa-4 d-flex align-center justify-space-between navy-text">
          {{ viewingCert.name }}
          <v-btn icon="mdi-close" size="small" variant="text" @click="showCertViewer = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <img v-if="viewingCert.mimeType !== 'application/pdf'" :src="viewingCert.dataUrl" style="max-width:100%;border-radius:8px;" />
          <iframe v-else :src="viewingCert.dataUrl" style="width:100%;height:520px;border:none;border-radius:8px;" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.search-result-row { border: 1px solid #e0e0e0; transition: all 0.15s; }
.result-clickable { cursor: pointer; }
.result-clickable:hover { background: #eef2ff; border-color: #12086F; }
.result-disabled { opacity: 0.55; cursor: default; background: #fafafa; }
.no-results-box { background: #fafafa; border: 1px dashed #e0e0e0; }
</style>