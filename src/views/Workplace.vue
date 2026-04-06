<template>
  <DashboardLayout>
    <!-- ✅ TOP NAVIGATION BAR -->
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

      <!-- Profile Menu in Far Right -->
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
              <span class="text-h4 font-weight-bold text-white">
                {{ getUserInitials() }}
              </span>
            </v-avatar>
            
            <h3 class="text-h6 mb-1">{{ getUserName() }}</h3>
            <p class="text-caption text-medium-emphasis mb-2">{{ getUserEmail() }}</p>
            
            <v-chip size="small" color="error" class="mb-4">
              {{ getUserRole() }}
            </v-chip>

            <v-divider class="my-3"></v-divider>

            <v-btn 
              color="error" 
              variant="tonal"
              block 
              @click="handleLogout" 
              prepend-icon="mdi-logout"
            >
              Logout
            </v-btn>
          </v-card-text>
        </v-card>
      </v-menu>
    </div>

    <v-container fluid class="pa-6">
      <!-- ✅ MANAGERS VIEW - Shows when workplace is selected -->
      <div v-if="selectedWorkplace">
        <!-- Quick Actions -->
        <div class="mb-6">
          <h3 class="text-h6 font-weight-medium mb-3">Quick Actions</h3>
          <div class="d-flex gap-3">
            <v-btn color="primary" prepend-icon="mdi-account-plus" @click="openAddManagerDialog">
              Add New Manager
            </v-btn>
            <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" @click="backToWorkplaces">
              Back to Workplaces
            </v-btn>
          </div>
        </div>

        <!-- Managers Table -->
        <v-card elevation="2">
          <v-card-title class="bg-primary text-white d-flex align-center">
            <v-icon start>mdi-account-tie</v-icon>
            Managers
          </v-card-title>
          
          <div v-if="loading" class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
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
                  <v-btn 
                    variant="outlined" 
                    size="small"
                    color="primary"
                    class="mr-2"
                    prepend-icon="mdi-pencil"
                    @click="openEditManagerDialog(manager)"
                  >
                    Edit
                  </v-btn>
                  <v-btn 
                    variant="outlined" 
                    size="small" 
                    color="error"
                    prepend-icon="mdi-delete"
                    @click="confirmDeleteManager(manager)"
                  >
                    Delete
                  </v-btn>
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
                <v-btn icon variant="text" color="white" @click="closeAddManagerDialog">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
            </v-card-title>

            <v-card-text class="pt-4">
              <v-form>
                <v-row>
                  <v-col cols="6">
                    <v-text-field v-model="newManager.firstName" label="First Name *" variant="outlined" required></v-text-field>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="newManager.lastName" label="Last Name *" variant="outlined" required></v-text-field>
                  </v-col>
                </v-row>

                <v-text-field v-model="newManager.email" label="Email *" type="email" variant="outlined" required></v-text-field>
                <v-text-field v-model="newManager.phoneNumber" label="Phone Number" variant="outlined"></v-text-field>
              </v-form>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn variant="text" @click="closeAddManagerDialog">Cancel</v-btn>
              <v-btn color="primary" @click="addManager" :disabled="!newManager.firstName || !newManager.lastName || !newManager.email">
                Add Manager
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Edit Manager Dialog -->
        <v-dialog v-model="showEditManagerDialog" max-width="600px" persistent>
          <v-card>
            <v-card-title class="bg-primary text-white">
              <div class="d-flex justify-space-between align-center">
                <span class="text-h5">Edit Manager</span>
                <v-btn icon variant="text" color="white" @click="closeEditManagerDialog">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
            </v-card-title>

            <v-card-text class="pt-4">
              <v-form>
                <v-row>
                  <v-col cols="6">
                    <v-text-field v-model="editManager.firstName" label="First Name *" variant="outlined" required></v-text-field>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="editManager.lastName" label="Last Name *" variant="outlined" required></v-text-field>
                  </v-col>
                </v-row>

                <v-text-field v-model="editManager.email" label="Email *" type="email" variant="outlined" required></v-text-field>
                <v-text-field v-model="editManager.phoneNumber" label="Phone Number" variant="outlined"></v-text-field>
              </v-form>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn variant="text" @click="closeEditManagerDialog">Cancel</v-btn>
              <v-btn color="primary" @click="saveEditManager" :disabled="!editManager.firstName || !editManager.lastName || !editManager.email">
                Save Changes
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete Manager Dialog -->
        <v-dialog v-model="showDeleteManagerDialog" max-width="500px">
          <v-card>
            <v-card-title class="bg-error text-white d-flex align-center">
              <v-icon color="white" class="mr-2">mdi-alert-circle</v-icon>
              Delete Manager
            </v-card-title>

            <v-card-text class="pt-6">
              <div v-if="managerToDelete" class="text-center">
                <v-icon size="64" color="error" class="mb-4">mdi-account-remove</v-icon>
                <p class="text-h6 mb-2">Are you sure you want to delete this manager?</p>
                <p class="text-body-1 font-weight-bold">{{ managerToDelete.first_name }} {{ managerToDelete.last_name }}</p>
                <p class="text-caption text-medium-emphasis">{{ managerToDelete.email }}</p>
                <v-alert type="warning" variant="tonal" class="mt-4">
                  <strong>Warning:</strong> This action cannot be undone.
                </v-alert>
              </div>
            </v-card-text>

            <v-card-actions class="px-6 pb-6">
              <v-spacer></v-spacer>
              <v-btn variant="text" @click="showDeleteManagerDialog = false; managerToDelete = null">Cancel</v-btn>
              <v-btn color="error" @click="deleteManager" prepend-icon="mdi-delete">Delete Manager</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>

      <!-- ✅ WORKPLACE SELECTION VIEW - Shows when no workplace selected -->
      <div v-else>
        <h2 class="text-h5 mb-4">Business Areas</h2>

        <!-- Business Areas Grid -->
        <v-row>
          <v-col
            v-for="area in businessAreas"
            :key="area.location_id"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card elevation="2" class="text-center pa-6 hover-card">
              <v-avatar size="80" color="accent" class="mb-4">
                <span class="text-h4 text-white font-weight-bold">
                  {{ getInitials(area.name) }}
                </span>
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

              <div class="d-flex gap-2 mt-4">
                <v-btn color="primary" variant="flat" class="flex-grow-1" @click="selectWorkplace(area)">
                  <v-icon start>mdi-check-circle</v-icon>
                  Select & Continue
                </v-btn>
                
                <v-btn color="primary" variant="outlined" @click="openManageDialog(area)">
                  <v-icon>mdi-cog</v-icon>
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <!-- Add New Workplace Card -->
          <v-col cols="12" md="6" lg="4">
            <v-card elevation="2" class="text-center pa-6 d-flex align-center justify-center hover-card" style="min-height: 320px; cursor: pointer;" @click="showAddDialog = true">
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
              <v-btn icon variant="text" color="white" @click="closeAddDialog">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pt-4">
            <v-text-field v-model="newArea.name" label="Name *" variant="outlined" placeholder="Enter full name" required></v-text-field>
            <v-text-field v-model="newArea.address" label="Address *" variant="outlined" placeholder="Enter address" required></v-text-field>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
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
      <v-btn icon variant="text" color="white" @click="closeManageDialog">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text class="pt-4">
      <v-tabs v-model="manageTab" color="primary" class="mb-4">
        <v-tab value="edit">Edit Details</v-tab>
        <v-tab value="managers">Managers</v-tab>
        <v-tab value="danger">Delete</v-tab>
      </v-tabs>

      <v-window v-model="manageTab">
        <!-- Edit Details Tab -->
        <v-window-item value="edit">
          <v-form class="mt-4">
            <v-text-field
              v-model="editArea.name"
              label="Name *"
              variant="outlined"
              required
              hint="Enter workplace name"
              persistent-hint
            ></v-text-field>

            <v-text-field
              v-model="editArea.address"
              label="Address *"
              variant="outlined"
              required
              class="mt-4"
              hint="Enter workplace address"
              persistent-hint
            ></v-text-field>

            <v-btn color="primary" @click="updateBusinessArea" class="mt-6">
              Save Changes
            </v-btn>
          </v-form>
        </v-window-item>

        <!-- Managers Tab -->
        <v-window-item value="managers">
          <div class="mt-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-4">Managers at {{ selectedArea?.name }}</h3>
            
            <v-list v-if="getManagers(selectedArea?.location_id).length > 0">
              <v-list-item v-for="manager in getManagers(selectedArea?.location_id)" :key="manager.user_id" class="mb-2">
                <template v-slot:prepend>
                  <v-avatar color="secondary" size="40">
                    <span class="text-white font-weight-bold">
                      {{ manager.first_name[0] }}{{ manager.last_name[0] }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ manager.first_name }} {{ manager.last_name }}</v-list-item-title>
                <v-list-item-subtitle>{{ manager.email }}</v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn icon variant="text" color="error" @click="removeManager(manager)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>

            <v-alert v-else type="info" variant="tonal" class="mb-4">
              No managers assigned to this workplace yet.
            </v-alert>

            <v-divider class="my-4"></v-divider>

            <h4 class="text-subtitle-2 font-weight-bold mb-3">Assign New Manager</h4>
            <v-select
              v-model="selectedManagerToAdd"
              :items="availableManagers"
              item-title="fullName"
              item-value="user_id"
              label="Select Manager"
              variant="outlined"
              density="comfortable"
            ></v-select>
            <v-btn color="primary" @click="assignManager" :disabled="!selectedManagerToAdd" class="mt-2">
              Assign Manager
            </v-btn>
          </div>
        </v-window-item>

        <!-- Danger Zone Tab -->
        <v-window-item value="danger">
          <div class="mt-4">
            <v-alert type="warning" variant="tonal" class="mb-4">
              <strong>Warning:</strong> Deleting this workplace is permanent and cannot be undone.
            </v-alert>

            <v-card variant="outlined" color="error">
              <v-card-text>
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <h3 class="text-h6 mb-1">Delete this workplace</h3>
                    <p class="text-caption text-medium-emphasis">
                      This will permanently delete {{ selectedArea?.name }} and all associated data.
                    </p>
                  </div>
                  <v-btn color="error" @click="confirmDelete">
                    Delete Workplace
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </v-window-item>
      </v-window>
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-spacer></v-spacer>
      <v-btn variant="text" @click="closeManageDialog">Close</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>

      <!-- Success Snackbar -->
      <v-snackbar v-model="showSuccess" color="success" :timeout="3000">
        {{ successMessage }}
      </v-snackbar>

      <!-- Error Snackbar -->
      <v-snackbar v-model="showError" color="error" :timeout="3000">
        {{ errorMessage }}
      </v-snackbar>
    </v-container>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import businessAreaServices from '../services/businessAreaServices';
import adminServices from '../services/adminViewServices';
import Utils from '../config/utils';
import AuthServices from '../services/authServices';

const router = useRouter();
const businessAreas = ref([]);
const employees = ref([]);
const selectedWorkplace = ref(null);
const loading = ref(false);

const showAddDialog = ref(false);
const showManageDialog = ref(false);
const showDeleteDialog = ref(false);
const showSuccess = ref(false);
const showError = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const manageTab = ref('edit');
const selectedArea = ref(null);
const selectedManagerToAdd = ref(null);

const showAddManagerDialog = ref(false);
const showEditManagerDialog = ref(false);
const showDeleteManagerDialog = ref(false);
const managerToDelete = ref(null);

const newArea = ref({ name: '', address: '' });
const editArea = ref({ name: '', address: '' });

const newManager = ref({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: ''
});

const editManager = ref({
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: ''
});

// ✅ Computed: Filter managers for selected workplace
const filteredManagers = computed(() => {
  if (!selectedWorkplace.value) return [];
  
  return employees.value.filter(emp => 
    emp.role === 'employer' && 
    emp.work_location === selectedWorkplace.value.location_id
  );
});

const getUserInitials = () => {
  const user = Utils.getStore('user');
  if (!user) return 'U';
  return `${user.fName?.[0] || ''}${user.lName?.[0] || ''}`.toUpperCase();
};

const getUserName = () => {
  const user = Utils.getStore('user');
  if (!user) return 'User';
  return `${user.fName || ''} ${user.lName || ''}`.trim();
};

const getUserEmail = () => {
  const user = Utils.getStore('user');
  return user?.email || '';
};

const getUserRole = () => {
  const user = Utils.getStore('user');
  return user?.role || 'user';
};

const handleLogout = async () => {
  try {
    const user = Utils.getStore('user');
    await AuthServices.logoutUser({ token: user?.token });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    Utils.removeItem('user');
    localStorage.clear();
    sessionStorage.clear();
    
    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
    
    router.push({ name: 'login' });
  }
};

const loadBusinessAreas = async () => {
  try {
    const response = await businessAreaServices.getAll();
    businessAreas.value = response.data;
  } catch (err) {
    console.error('Error loading business areas:', err);
    errorMessage.value = 'Failed to load business areas';
    showError.value = true;
  }
};

const loadEmployees = async () => {
  try {
    loading.value = true;
    const response = await adminServices.getAllUsers();
    employees.value = response.data;
    console.log('✅ Loaded employees:', employees.value);
  } catch (err) {
    console.error('Error loading employees:', err);
  } finally {
    loading.value = false;
  }
};

// ✅ Select workplace and show managers
const selectWorkplace = (area) => {
  selectedWorkplace.value = area;
  localStorage.setItem('selectedWorkplace', JSON.stringify(area));
  console.log('✅ Selected workplace:', area);
  console.log('✅ Filtered managers:', filteredManagers.value);
};

// ✅ Go back to workplace selection
const backToWorkplaces = () => {
  selectedWorkplace.value = null;
  localStorage.removeItem('selectedWorkplace');
};

const getInitials = (name) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
};

const getEmployeeCount = (locationId) => {
  return employees.value.filter(emp => emp.work_location === locationId && emp.role === 'employee').length;
};

const getManagerCount = (locationId) => {
  return employees.value.filter(emp => emp.work_location === locationId && emp.role === 'employer').length;
};

const getManagers = (locationId) => {
  return employees.value.filter(emp => emp.work_location === locationId && emp.role === 'employer');
};

const availableManagers = computed(() => {
  return employees.value
    .filter(emp => emp.role === 'employer' && emp.work_location !== selectedArea.value?.location_id)
    .map(emp => ({ ...emp, fullName: `${emp.first_name} ${emp.last_name}` }));
});

// ✅ Manager CRUD operations
const openAddManagerDialog = () => {
  showAddManagerDialog.value = true;
  newManager.value = { firstName: '', lastName: '', email: '', phoneNumber: '' };
};

const closeAddManagerDialog = () => {
  showAddManagerDialog.value = false;
};

const addManager = async () => {
  if (!newManager.value.firstName || !newManager.value.lastName || !newManager.value.email) {
    errorMessage.value = 'Please fill in all required fields';
    showError.value = true;
    return;
  }

  try {
    const managerData = {
      first_name: newManager.value.firstName,
      last_name: newManager.value.lastName,
      email: newManager.value.email,
      phone_number: newManager.value.phoneNumber,
      role: 'employer',
      work_location: selectedWorkplace.value.location_id
    };

    await adminServices.createUser(managerData);
    await loadEmployees();
    closeAddManagerDialog();
    successMessage.value = 'Manager added successfully!';
    showSuccess.value = true;
  } catch (err) {
    console.error('Error adding manager:', err);
    errorMessage.value = err.response?.status === 400 ? 'Email already exists' : 'Failed to add manager';
    showError.value = true;
  }
};

const openEditManagerDialog = (manager) => {
  editManager.value = {
    userId: manager.user_id,
    firstName: manager.first_name,
    lastName: manager.last_name,
    email: manager.email,
    phoneNumber: manager.phone_number || ''
  };
  showEditManagerDialog.value = true;
};

const closeEditManagerDialog = () => {
  showEditManagerDialog.value = false;
};

const saveEditManager = async () => {
  try {
    const managerData = {
      first_name: editManager.value.firstName,
      last_name: editManager.value.lastName,
      email: editManager.value.email,
      phone_number: editManager.value.phoneNumber
    };

    await adminServices.updateUser(editManager.value.userId, managerData);
    await loadEmployees();
    closeEditManagerDialog();
    successMessage.value = 'Manager updated successfully!';
    showSuccess.value = true;
  } catch (err) {
    console.error('Error updating manager:', err);
    errorMessage.value = 'Failed to update manager';
    showError.value = true;
  }
};

const confirmDeleteManager = (manager) => {
  managerToDelete.value = manager;
  showDeleteManagerDialog.value = true;
};

const deleteManager = async () => {
  try {
    await adminServices.deleteUser(managerToDelete.value.user_id);
    await loadEmployees();
    showDeleteManagerDialog.value = false;
    managerToDelete.value = null;
    successMessage.value = 'Manager deleted successfully!';
    showSuccess.value = true;
  } catch (err) {
    console.error('Error deleting manager:', err);
    errorMessage.value = 'Failed to delete manager';
    showError.value = true;
  }
};

// Business area management
const openManageDialog = (area) => {
  selectedArea.value = area;
  editArea.value = { name: area.name, address: area.address };
  manageTab.value = 'edit';
  showManageDialog.value = true;
};

const closeManageDialog = () => {
  showManageDialog.value = false;
  selectedArea.value = null;
  selectedManagerToAdd.value = null;
};

const closeAddDialog = () => {
  showAddDialog.value = false;
  newArea.value = { name: '', address: '' };
};

const addBusinessArea = async () => {
  if (!newArea.value.name || !newArea.value.address) {
    errorMessage.value = 'Please fill in all required fields';
    showError.value = true;
    return;
  }

  try {
    await businessAreaServices.create(newArea.value);
    showAddDialog.value = false;
    newArea.value = { name: '', address: '' };
    await loadBusinessAreas();
    successMessage.value = 'Business area added successfully!';
    showSuccess.value = true;
  } catch (err) {
    console.error('Error adding business area:', err);
    errorMessage.value = 'Failed to add business area';
    showError.value = true;
  }
};

const updateBusinessArea = async () => {
  try {
    await businessAreaServices.update(selectedArea.value.location_id, editArea.value);
    await loadBusinessAreas();
    successMessage.value = 'Business area updated successfully!';
    showSuccess.value = true;
    closeManageDialog();
  } catch (err) {
    console.error('Error updating business area:', err);
    errorMessage.value = 'Failed to update business area';
    showError.value = true;
  }
};

const assignManager = async () => {
  if (!selectedManagerToAdd.value) return;

  try {
    await adminServices.updateUser(selectedManagerToAdd.value, {
      work_location: selectedArea.value.location_id
    });
    await loadEmployees();
    successMessage.value = 'Manager assigned successfully!';
    showSuccess.value = true;
    selectedManagerToAdd.value = null;
  } catch (err) {
    console.error('Error assigning manager:', err);
    errorMessage.value = 'Failed to assign manager';
    showError.value = true;
  }
};

const removeManager = async (manager) => {
  try {
    await adminServices.updateUser(manager.user_id, { work_location: null });
    await loadEmployees();
    successMessage.value = 'Manager removed successfully!';
    showSuccess.value = true;
  } catch (err) {
    console.error('Error removing manager:', err);
    errorMessage.value = 'Failed to remove manager';
    showError.value = true;
  }
};

const confirmDelete = () => {
  showDeleteDialog.value = true;
};

const deleteBusinessArea = async () => {
  try {
    await businessAreaServices.delete(selectedArea.value.location_id);
    showDeleteDialog.value = false;
    closeManageDialog();
    await loadBusinessAreas();
    successMessage.value = 'Workplace deleted successfully!';
    showSuccess.value = true;
  } catch (err) {
    console.error('Error deleting business area:', err);
    errorMessage.value = 'Failed to delete workplace';
    showError.value = true;
  }
};

onMounted(async () => {
  await Promise.all([loadBusinessAreas(), loadEmployees()]);
  
  // Check if there's a saved workplace selection
  const saved = localStorage.getItem('selectedWorkplace');
  if (saved) {
    try {
      selectedWorkplace.value = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing saved workplace:', e);
    }
  }
});
</script>

<style scoped>
.workplace-header {
  border-radius: 8px;
  margin-bottom: 24px;
}

.opacity-90 {
  opacity: 0.9;
}

.hover-card {
  transition: all 0.3s ease;
}

.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(18, 8, 111, 0.15) !important;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>