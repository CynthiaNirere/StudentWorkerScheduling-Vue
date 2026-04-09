<template>
  <DashboardLayout>
    <!-- TOP NAVIGATION BAR -->
    <div class="workplace-header d-flex justify-space-between align-center mb-6 pa-4 bg-primary">
      <div>
        <h1 class="text-h4 font-weight-bold text-white">
          <v-icon class="mr-2" color="white">mdi-office-building</v-icon>
          {{ selectedWorkplace ? 'Managers Dashboard' : 'Workplace' }}
        </h1>
        <p class="text-body-2 text-white opacity-90">
          {{ selectedWorkplace ? `Managing ${selectedWorkplace.name}` : 'Select a workplace to manage or configure settings' }}
        </p>
      </div>

      <v-menu location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon>
            <v-avatar color="white" size="48">
              <span class="text-h6 text-primary font-weight-bold">{{ getUserInitials() }}</span>
            </v-avatar>
          </v-btn>
        </template>
        <v-card min-width="250">
          <v-card-text class="text-center pa-4">
            <v-avatar color="primary" size="64" class="mb-3">
              <span class="text-h4 font-weight-bold text-white">{{ getUserInitials() }}</span>
            </v-avatar>
            <h3 class="text-h6 mb-1">{{ getUserName() }}</h3>
            <p class="text-caption text-medium-emphasis mb-2">{{ getUserEmail() }}</p>
            <v-chip size="small" color="error" class="mb-4">{{ getUserRole() }}</v-chip>
            <v-divider class="my-3" />
            <v-btn color="error" variant="tonal" block @click="handleLogout" prepend-icon="mdi-logout">
              Logout
            </v-btn>
          </v-card-text>
        </v-card>
      </v-menu>
    </div>

    <v-container fluid class="pa-6">

      <!-- MANAGERS VIEW -->
      <div v-if="selectedWorkplace">
        <div class="mb-6">
          <h3 class="text-h6 font-weight-medium mb-3">Quick Actions</h3>
          <div class="d-flex gap-3">
            <v-btn color="primary" prepend-icon="mdi-account-plus" @click="openAddManagerDialog">Add New Manager</v-btn>
            <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" @click="backToWorkplaces">Back to Workplaces</v-btn>
          </div>
        </div>

        <v-card elevation="2">
          <v-card-title class="bg-primary text-white d-flex align-center">
            <v-icon start>mdi-account-tie</v-icon>Managers
          </v-card-title>
          <div v-if="loading" class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="64" />
            <p class="mt-4 text-h6">Loading managers...</p>
          </div>
          <v-table v-else>
            <thead>
              <tr>
                <th class="text-left font-weight-bold">NAME</th>
                <th class="text-left font-weight-bold">EMAIL</th>
                <th class="text-left font-weight-bold">PHONE</th>
                <th class="text-left font-weight-bold">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredManagers.length === 0">
                <td colspan="4" class="text-center py-8 text-medium-emphasis">
                  <v-icon size="48" color="grey" class="mb-2">mdi-account-off</v-icon>
                  <p class="text-h6">No managers found</p>
                  <p class="text-body-2">Click "Add New Manager" to get started!</p>
                </td>
              </tr>
              <tr v-for="manager in filteredManagers" :key="manager.user_id">
                <td class="font-weight-medium">{{ manager.first_name }} {{ manager.last_name }}</td>
                <td>{{ manager.email }}</td>
                <td>{{ manager.phone_number || 'N/A' }}</td>
                <td>
                  <v-btn variant="outlined" size="small" color="primary" class="mr-2" prepend-icon="mdi-pencil" @click="openEditManagerDialog(manager)">Edit</v-btn>
                  <v-btn variant="outlined" size="small" color="error" prepend-icon="mdi-delete" @click="confirmDeleteManager(manager)">Delete</v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <!-- Add Manager Dialog -->
        <v-dialog v-model="showAddManagerDialog" max-width="600px" persistent>
          <v-card>
            <v-card-title class="bg-primary text-white">
              <div class="d-flex justify-space-between align-center">
                <span class="text-h5">Add New Manager</span>
                <v-btn icon variant="text" color="white" @click="closeAddManagerDialog"><v-icon>mdi-close</v-icon></v-btn>
              </div>
            </v-card-title>
            <v-card-text class="pt-4">
              <v-form>
                <v-row>
                  <v-col cols="6"><v-text-field v-model="newManager.firstName" label="First Name *" variant="outlined" required /></v-col>
                  <v-col cols="6"><v-text-field v-model="newManager.lastName" label="Last Name *" variant="outlined" required /></v-col>
                </v-row>
                <v-text-field v-model="newManager.email" label="Email *" type="email" variant="outlined" required />
                <v-text-field v-model="newManager.phoneNumber" label="Phone Number" variant="outlined" />
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="closeAddManagerDialog">Cancel</v-btn>
              <v-btn color="primary" @click="addManager" :disabled="!newManager.firstName || !newManager.lastName || !newManager.email">Add Manager</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Edit Manager Dialog -->
        <v-dialog v-model="showEditManagerDialog" max-width="600px" persistent>
          <v-card>
            <v-card-title class="bg-primary text-white">
              <div class="d-flex justify-space-between align-center">
                <span class="text-h5">Edit Manager</span>
                <v-btn icon variant="text" color="white" @click="closeEditManagerDialog"><v-icon>mdi-close</v-icon></v-btn>
              </div>
            </v-card-title>
            <v-card-text class="pt-4">
              <v-form>
                <v-row>
                  <v-col cols="6"><v-text-field v-model="editManager.firstName" label="First Name *" variant="outlined" required /></v-col>
                  <v-col cols="6"><v-text-field v-model="editManager.lastName" label="Last Name *" variant="outlined" required /></v-col>
                </v-row>
                <v-text-field v-model="editManager.email" label="Email *" type="email" variant="outlined" required />
                <v-text-field v-model="editManager.phoneNumber" label="Phone Number" variant="outlined" />
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="closeEditManagerDialog">Cancel</v-btn>
              <v-btn color="primary" @click="saveEditManager" :disabled="!editManager.firstName || !editManager.lastName || !editManager.email">Save Changes</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete Manager Dialog -->
        <v-dialog v-model="showDeleteManagerDialog" max-width="500px">
          <v-card>
            <v-card-title class="bg-error text-white d-flex align-center">
              <v-icon color="white" class="mr-2">mdi-alert-circle</v-icon>Delete Manager
            </v-card-title>
            <v-card-text class="pt-6">
              <div v-if="managerToDelete" class="text-center">
                <v-icon size="64" color="error" class="mb-4">mdi-account-remove</v-icon>
                <p class="text-h6 mb-2">Are you sure you want to delete this manager?</p>
                <p class="text-body-1 font-weight-bold">{{ managerToDelete.first_name }} {{ managerToDelete.last_name }}</p>
                <p class="text-caption text-medium-emphasis">{{ managerToDelete.email }}</p>
                <v-alert type="warning" variant="tonal" class="mt-4"><strong>Warning:</strong> This action cannot be undone.</v-alert>
              </div>
            </v-card-text>
            <v-card-actions class="px-6 pb-6">
              <v-spacer />
              <v-btn variant="text" @click="showDeleteManagerDialog = false; managerToDelete = null">Cancel</v-btn>
              <v-btn color="error" @click="deleteManager" prepend-icon="mdi-delete">Delete Manager</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>

      <!-- WORKPLACE SELECTION VIEW -->
      <div v-else>
        <h2 class="text-h5 mb-4">Business Areas</h2>
        <v-row>
          <v-col v-for="area in businessAreas" :key="area.location_id" cols="12" md="6" lg="4">
            <v-card elevation="2" class="text-center pa-6 hover-card">
              <v-avatar size="80" color="accent" class="mb-4">
                <span class="text-h4 text-white font-weight-bold">{{ getInitials(area.name) }}</span>
              </v-avatar>

              <h3 class="text-h6 mb-2">{{ area.name }}</h3>

              <v-list dense class="bg-transparent">
                <v-list-item class="px-0">
                  <v-list-item-title class="text-caption text-medium-emphasis">
                    • {{ getEmployeeCount(area.location_id) }} Employees
                  </v-list-item-title>
                </v-list-item>
                <v-list-item class="px-0">
                  <v-list-item-title class="text-caption text-medium-emphasis">
                    • {{ getManagerCount(area.location_id) }} Managers
                  </v-list-item-title>
                </v-list-item>
              </v-list>

              <!-- Three action buttons -->
              <div class="d-flex gap-2 mt-4">
                <!-- Manage (gear) -->
                <v-btn color="primary" variant="outlined" @click="openManageDialog(area)" size="default">
                  <v-icon>mdi-cog</v-icon>
                </v-btn>

                <!-- Select & Continue (managers view) -->
                <v-btn color="primary" variant="flat" class="flex-grow-1" @click="selectWorkplace(area)">
                  <v-icon start>mdi-account-tie</v-icon>Managers
                </v-btn>

                <!-- Login as this Workplace (impersonate) -->
                <v-btn
                  color="warning"
                  variant="flat"
                  :loading="impersonating === area.location_id"
                  @click="loginAsWorkplace(area)"
                  title="Login as this workplace"
                >
                  <v-icon>mdi-login-variant</v-icon>
                </v-btn>
              </div>

              <!-- Tooltip hint under impersonate button -->
              <p class="text-caption text-medium-emphasis mt-2">
                <v-icon size="12">mdi-information-outline</v-icon>
                Use <v-icon size="12" color="warning">mdi-login-variant</v-icon> to view as this workplace's employer
              </p>
            </v-card>
          </v-col>

          <!-- Add New Workplace Card -->
          <v-col cols="12" md="6" lg="4">
            <v-card elevation="2" class="text-center pa-6 d-flex align-center justify-center hover-card"
              style="min-height: 320px; cursor: pointer;" @click="showAddDialog = true">
              <div>
                <v-icon size="64" color="primary" class="mb-4">mdi-plus-circle</v-icon>
                <h3 class="text-h6 text-primary">Add Workplace</h3>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Add Business Area Dialog -->
      <v-dialog v-model="showAddDialog" max-width="500px" persistent>
        <v-card>
          <v-card-title class="bg-primary text-white">
            <div class="d-flex justify-space-between align-center">
              <span class="text-h5">Add New Business Area</span>
              <v-btn icon variant="text" color="white" @click="closeAddDialog"><v-icon>mdi-close</v-icon></v-btn>
            </div>
          </v-card-title>
          <v-card-text class="pt-4">
            <v-text-field v-model="newArea.name" label="Name *" variant="outlined" placeholder="Enter full name" required />
            <v-text-field v-model="newArea.address" label="Address *" variant="outlined" placeholder="Enter address" required />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeAddDialog">Cancel</v-btn>
            <v-btn color="primary" @click="addBusinessArea" :disabled="!newArea.name || !newArea.address">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Manage Business Area Dialog -->
      <v-dialog v-model="showManageDialog" max-width="700px" persistent>
        <v-card>
          <v-card-title class="bg-primary text-white d-flex justify-space-between align-center pa-4">
            <span class="text-h5">Manage {{ selectedArea?.name }}</span>
            <v-btn icon variant="text" color="white" @click="closeManageDialog"><v-icon>mdi-close</v-icon></v-btn>
          </v-card-title>
          <v-card-text class="pt-4">
            <v-tabs v-model="manageTab" color="primary" class="mb-4">
              <v-tab value="edit">Edit Details</v-tab>
              <v-tab value="danger">Delete</v-tab>
            </v-tabs>
            <v-window v-model="manageTab">
              <v-window-item value="edit">
                <v-form class="mt-4">
                  <v-text-field v-model="editArea.name" label="Name *" variant="outlined" required hint="Enter workplace name" persistent-hint />
                  <v-text-field v-model="editArea.address" label="Address *" variant="outlined" required class="mt-4" hint="Enter workplace address" persistent-hint />
                  <v-btn color="primary" @click="updateBusinessArea" class="mt-6">Save Changes</v-btn>
                </v-form>
              </v-window-item>

              <v-window-item value="danger">
                <div class="mt-4">
                  <v-alert type="warning" variant="tonal" class="mb-4"><strong>Warning:</strong> Deleting this workplace is permanent and cannot be undone.</v-alert>
                  <v-card variant="outlined" color="error">
                    <v-card-text>
                      <div class="d-flex align-center justify-space-between">
                        <div>
                          <h3 class="text-h6 mb-1">Delete this workplace</h3>
                          <p class="text-caption text-medium-emphasis">This will permanently delete {{ selectedArea?.name }} and all associated data.</p>
                        </div>
                        <v-btn color="error" @click="confirmDelete">Delete Workplace</v-btn>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </v-window-item>
            </v-window>
          </v-card-text>
          <v-card-actions class="px-4 pb-4">
            <v-spacer /><v-btn variant="text" @click="closeManageDialog">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="showSuccess" color="success" :timeout="3000">{{ successMessage }}</v-snackbar>
      <v-snackbar v-model="showError"   color="error"   :timeout="3000">{{ errorMessage }}</v-snackbar>
    </v-container>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import businessAreaServices from '../services/businessAreaServices';
import adminServices from '../services/adminViewServices';
import AuthServices from '../services/authServices';
import Utils from '../config/utils';

const router = useRouter();

const businessAreas   = ref([]);
const employees       = ref([]);
const selectedWorkplace = ref(null);
const loading           = ref(false);
const impersonating     = ref(null); // holds locationId while loading

const showAddDialog          = ref(false);
const showManageDialog       = ref(false);
const showDeleteDialog       = ref(false);
const showSuccess            = ref(false);
const showError              = ref(false);
const successMessage         = ref('');
const errorMessage           = ref('');
const manageTab              = ref('edit');
const selectedArea           = ref(null);

const showAddManagerDialog    = ref(false);
const showEditManagerDialog   = ref(false);
const showDeleteManagerDialog = ref(false);
const managerToDelete         = ref(null);

const newArea    = ref({ name: '', address: '' });
const editArea   = ref({ name: '', address: '' });
const newManager = ref({ firstName: '', lastName: '', email: '', phoneNumber: '' });
const editManager = ref({ userId: '', firstName: '', lastName: '', email: '', phoneNumber: '' });

const filteredManagers = computed(() => {
  if (!selectedWorkplace.value) return [];
  return employees.value.filter(e => e.role === 'employer' && e.work_location === selectedWorkplace.value.location_id);
});

// Removed: availableManagers computed property (was used only in managers tab)

// ── Helpers ───────────────────────────────────────────────────────────────
const getUserInitials = () => { const u = Utils.getStore('user'); return u ? `${u.fName?.[0] || ''}${u.lName?.[0] || ''}`.toUpperCase() : 'U'; };
const getUserName     = () => { const u = Utils.getStore('user'); return u ? `${u.fName || ''} ${u.lName || ''}`.trim() : 'User'; };
const getUserEmail    = () => Utils.getStore('user')?.email || '';
const getUserRole     = () => Utils.getStore('user')?.role || 'user';

const getInitials      = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
const getEmployeeCount = (lid)  => employees.value.filter(e => e.work_location === lid && e.role === 'employee').length;
const getManagerCount  = (lid)  => employees.value.filter(e => e.work_location === lid && e.role === 'employer').length;

// ── Login as Workplace (impersonate) ──────────────────────────────────────
const loginAsWorkplace = async (area) => {
  impersonating.value = area.location_id;
  try {
    const currentUser = Utils.getStore('user');

    // Save the real admin session so we can restore it on exit
    localStorage.setItem('adminToken',    currentUser.token);
    localStorage.setItem('adminUserData', JSON.stringify(currentUser));

    const res = await AuthServices.impersonate({ locationId: area.location_id });
    const data = res.data;

    // Store the impersonation session
    Utils.setStore('user', data);
    localStorage.setItem('token', data.token);
    localStorage.setItem('isImpersonating', 'true');
    localStorage.setItem('impersonatedLocationName', area.name);

    successMessage.value = `Entering ${area.name} as employer view...`;
    showSuccess.value    = true;

    // Small delay so snackbar is visible, then navigate
    setTimeout(() => {
      router.push({ name: 'employerDashboard' });
    }, 800);

  } catch (err) {
    console.error('Impersonation error:', err);
    errorMessage.value = err.response?.data?.message || 'Failed to enter workplace view';
    showError.value    = true;
  } finally {
    impersonating.value = null;
  }
};

// ── Standard auth ─────────────────────────────────────────────────────────
const handleLogout = async () => {
  try {
    const user = Utils.getStore('user');
    await AuthServices.logoutUser({ token: user?.token });
  } catch {}
  finally {
    Utils.removeItem('user');
    localStorage.clear();
    sessionStorage.clear();
    if (window.google?.accounts) window.google.accounts.id.disableAutoSelect();
    router.push({ name: 'login' });
  }
};

// ── Data loading ──────────────────────────────────────────────────────────
const loadBusinessAreas = async () => {
  try {
    const res = await businessAreaServices.getAll();
    businessAreas.value = res.data;
  } catch (err) {
    errorMessage.value = 'Failed to load business areas';
    showError.value    = true;
  }
};

const loadEmployees = async () => {
  try {
    loading.value = true;
    const res     = await adminServices.getAllUsers();
    employees.value = res.data;
  } catch (err) {
    console.error('Error loading employees:', err);
  } finally {
    loading.value = false;
  }
};

// ── Workplace selection ───────────────────────────────────────────────────
const selectWorkplace = (area) => {
  selectedWorkplace.value = area;
  localStorage.setItem('selectedWorkplace', JSON.stringify(area));
};

const backToWorkplaces = () => {
  selectedWorkplace.value = null;
  localStorage.removeItem('selectedWorkplace');
};

// ── Manager CRUD ──────────────────────────────────────────────────────────
const openAddManagerDialog  = () => { newManager.value = { firstName: '', lastName: '', email: '', phoneNumber: '' }; showAddManagerDialog.value = true; };
const closeAddManagerDialog = () => { showAddManagerDialog.value = false; };

const addManager = async () => {
  if (!newManager.value.firstName || !newManager.value.lastName || !newManager.value.email) {
    errorMessage.value = 'Please fill in all required fields'; showError.value = true; return;
  }
  try {
    await adminServices.createUser({ first_name: newManager.value.firstName, last_name: newManager.value.lastName, email: newManager.value.email, phone_number: newManager.value.phoneNumber, role: 'employer', work_location: selectedWorkplace.value.location_id });
    await loadEmployees();
    closeAddManagerDialog();
    successMessage.value = 'Manager added successfully!'; showSuccess.value = true;
  } catch (err) {
    errorMessage.value = err.response?.status === 400 ? 'Email already exists' : 'Failed to add manager'; showError.value = true;
  }
};

const openEditManagerDialog  = (m) => { editManager.value = { userId: m.user_id, firstName: m.first_name, lastName: m.last_name, email: m.email, phoneNumber: m.phone_number || '' }; showEditManagerDialog.value = true; };
const closeEditManagerDialog = () => { showEditManagerDialog.value = false; };

const saveEditManager = async () => {
  try {
    await adminServices.updateUser(editManager.value.userId, { first_name: editManager.value.firstName, last_name: editManager.value.lastName, email: editManager.value.email, phone_number: editManager.value.phoneNumber });
    await loadEmployees();
    closeEditManagerDialog();
    successMessage.value = 'Manager updated successfully!'; showSuccess.value = true;
  } catch { errorMessage.value = 'Failed to update manager'; showError.value = true; }
};

const confirmDeleteManager = (m) => { managerToDelete.value = m; showDeleteManagerDialog.value = true; };

const deleteManager = async () => {
  try {
    await adminServices.deleteUser(managerToDelete.value.user_id);
    await loadEmployees();
    showDeleteManagerDialog.value = false; managerToDelete.value = null;
    successMessage.value = 'Manager deleted successfully!'; showSuccess.value = true;
  } catch { errorMessage.value = 'Failed to delete manager'; showError.value = true; }
};

// ── Business area management ──────────────────────────────────────────────
const openManageDialog  = (area) => { selectedArea.value = area; editArea.value = { name: area.name, address: area.address }; manageTab.value = 'edit'; showManageDialog.value = true; };
const closeManageDialog = () => { showManageDialog.value = false; selectedArea.value = null; };
const closeAddDialog    = () => { showAddDialog.value = false; newArea.value = { name: '', address: '' }; };

const addBusinessArea = async () => {
  if (!newArea.value.name || !newArea.value.address) { errorMessage.value = 'Please fill in all required fields'; showError.value = true; return; }
  try {
    await businessAreaServices.create(newArea.value);
    showAddDialog.value = false; newArea.value = { name: '', address: '' };
    await loadBusinessAreas();
    successMessage.value = 'Business area added successfully!'; showSuccess.value = true;
  } catch { errorMessage.value = 'Failed to add business area'; showError.value = true; }
};

const updateBusinessArea = async () => {
  try {
    await businessAreaServices.update(selectedArea.value.location_id, editArea.value);
    await loadBusinessAreas();
    successMessage.value = 'Business area updated successfully!'; showSuccess.value = true;
    closeManageDialog();
  } catch { errorMessage.value = 'Failed to update business area'; showError.value = true; }
};

// Removed: assignManager and removeManager functions (were used only in managers tab)

const confirmDelete = () => { showDeleteDialog.value = true; };

const deleteBusinessArea = async () => {
  try {
    await businessAreaServices.delete(selectedArea.value.location_id);
    showDeleteDialog.value = false; closeManageDialog();
    await loadBusinessAreas();
    successMessage.value = 'Workplace deleted successfully!'; showSuccess.value = true;
  } catch { errorMessage.value = 'Failed to delete workplace'; showError.value = true; }
};

onMounted(async () => {
  await Promise.all([loadBusinessAreas(), loadEmployees()]);
  const saved = localStorage.getItem('selectedWorkplace');
  if (saved) { try { selectedWorkplace.value = JSON.parse(saved); } catch {} }
});
</script>

<style scoped>
.workplace-header { border-radius: 8px; margin-bottom: 24px; }
.opacity-90 { opacity: 0.9; }
.hover-card { transition: all 0.3s ease; }
.hover-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(18, 8, 111, 0.15) !important; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
</style>