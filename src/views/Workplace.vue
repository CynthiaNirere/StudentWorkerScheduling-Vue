<template>
  <DashboardLayout>
    <v-container fluid class="pa-6">
      <h1 class="text-h4 font-weight-bold mb-6">Workplace</h1>

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
              <v-list-item class="px-0">
                <v-list-item-title class="text-caption text-medium-emphasis">
                  • Main Campus
                </v-list-item-title>
              </v-list-item>
            </v-list>

            <v-btn
              color="primary"
              block
              class="mt-4"
              @click="openManageDialog(area)"
            >
              Manage
            </v-btn>
          </v-card>
        </v-col>

        <!-- Add New Workplace Card -->
        <v-col cols="12" md="6" lg="4">
          <v-card
            elevation="2"
            class="text-center pa-6 d-flex align-center justify-center hover-card"
            style="min-height: 300px; cursor: pointer;"
            @click="showAddDialog = true"
          >
            <div>
              <v-icon size="64" color="primary" class="mb-4">
                mdi-plus-circle
              </v-icon>
              <h3 class="text-h6 text-primary">Add Workplace</h3>
            </div>
          </v-card>
        </v-col>
      </v-row>

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
            <v-text-field
              v-model="newArea.name"
              label="Name *"
              variant="outlined"
              placeholder="Enter full name"
              required
            ></v-text-field>

            <v-text-field
              v-model="newArea.address"
              label="Address *"
              variant="outlined"
              placeholder="Enter address"
              required
            ></v-text-field>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="closeAddDialog">Cancel</v-btn>
            <v-btn 
              color="primary" 
              @click="addBusinessArea"
              :disabled="!newArea.name || !newArea.address"
            >
              Save
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Manage Business Area Dialog -->
      <v-dialog v-model="showManageDialog" max-width="700px" persistent>
        <v-card>
          <v-card-title class="bg-primary text-white">
            <div class="d-flex justify-space-between align-center">
              <span class="text-h5">Manage {{ selectedArea?.name }}</span>
              <v-btn icon variant="text" color="white" @click="closeManageDialog">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pt-4">
            <v-tabs v-model="manageTab" color="primary">
              <v-tab value="edit">Edit Details</v-tab>
              <v-tab value="managers">Managers</v-tab>
              <v-tab value="danger">Danger Zone</v-tab>
            </v-tabs>

            <v-window v-model="manageTab" class="mt-4">
              <!-- Edit Details Tab -->
              <v-window-item value="edit">
                <v-form>
                  <v-text-field
                    v-model="editArea.name"
                    label="Name *"
                    variant="outlined"
                    required
                  ></v-text-field>

                  <v-text-field
                    v-model="editArea.address"
                    label="Address *"
                    variant="outlined"
                    required
                  ></v-text-field>

                  <v-btn color="primary" @click="updateBusinessArea" class="mt-2">
                    Save Changes
                  </v-btn>
                </v-form>
              </v-window-item>

              <!-- Managers Tab -->
              <v-window-item value="managers">
                <h3 class="text-subtitle-1 font-weight-bold mb-4">Managers at {{ selectedArea?.name }}</h3>
                
                <v-list v-if="getManagers(selectedArea?.location_id).length > 0">
                  <v-list-item
                    v-for="manager in getManagers(selectedArea?.location_id)"
                    :key="manager.user_id"
                    class="mb-2"
                  >
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
                      <v-btn
                        icon
                        variant="text"
                        color="error"
                        @click="removeManager(manager)"
                      >
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
                <v-btn 
                  color="primary" 
                  @click="assignManager"
                  :disabled="!selectedManagerToAdd"
                  class="mt-2"
                >
                  Assign Manager
                </v-btn>
              </v-window-item>

              <!-- Danger Zone Tab -->
              <v-window-item value="danger">
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
                      <v-btn
                        color="error"
                        @click="confirmDelete"
                      >
                        Delete Workplace
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-window-item>
            </v-window>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="closeManageDialog">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Confirmation Dialog -->
      <v-dialog v-model="showDeleteDialog" max-width="500px">
        <v-card>
          <v-card-title class="bg-error text-white">
            <v-icon color="white" class="mr-2">mdi-alert-circle</v-icon>
            Delete Workplace
          </v-card-title>

          <v-card-text class="pt-6">
            <div class="text-center">
              <v-icon size="64" color="error" class="mb-4">mdi-delete-alert</v-icon>
              <p class="text-h6 mb-2">Are you sure you want to delete this workplace?</p>
              <p class="text-body-1 font-weight-bold">{{ selectedArea?.name }}</p>
              <v-alert type="error" variant="tonal" class="mt-4">
                <strong>This action cannot be undone!</strong> All employees will be unassigned from this location.
              </v-alert>
            </div>
          </v-card-text>

          <v-card-actions class="px-6 pb-6">
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
            <v-btn color="error" @click="deleteBusinessArea" prepend-icon="mdi-delete">
              Delete Workplace
            </v-btn>
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

const router = useRouter();
const businessAreas = ref([]);
const employees = ref([]);
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

const newArea = ref({
  name: '',
  address: ''
});

const editArea = ref({
  name: '',
  address: ''
});

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
    const response = await adminServices.getAllUsers();
    employees.value = response.data;
  } catch (err) {
    console.error('Error loading employees:', err);
  }
};

const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const getEmployeeCount = (locationId) => {
  return employees.value.filter(
    emp => emp.work_location === locationId && emp.role === 'employee'
  ).length;
};

const getManagerCount = (locationId) => {
  return employees.value.filter(
    emp => emp.work_location === locationId && emp.role === 'employer'
  ).length;
};

const getManagers = (locationId) => {
  return employees.value.filter(
    emp => emp.work_location === locationId && emp.role === 'employer'
  );
};

const availableManagers = computed(() => {
  // Get all managers/employers not assigned to the current location
  return employees.value
    .filter(emp => 
      emp.role === 'employer' && 
      emp.work_location !== selectedArea.value?.location_id
    )
    .map(emp => ({
      ...emp,
      fullName: `${emp.first_name} ${emp.last_name}`
    }));
});

const openManageDialog = (area) => {
  selectedArea.value = area;
  editArea.value = {
    name: area.name,
    address: area.address
  };
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
    errorMessage.value = 'Failed to add business area. Please try again.';
    showError.value = true;
  }
};

const updateBusinessArea = async () => {
  if (!editArea.value.name || !editArea.value.address) {
    errorMessage.value = 'Please fill in all required fields';
    showError.value = true;
    return;
  }

  try {
    await businessAreaServices.update(selectedArea.value.location_id, editArea.value);
    await loadBusinessAreas();
    successMessage.value = 'Business area updated successfully!';
    showSuccess.value = true;
    closeManageDialog();
  } catch (err) {
    console.error('Error updating business area:', err);
    errorMessage.value = 'Failed to update business area. Please try again.';
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
    errorMessage.value = 'Failed to assign manager. Please try again.';
    showError.value = true;
  }
};

const removeManager = async (manager) => {
  try {
    await adminServices.updateUser(manager.user_id, {
      work_location: null
    });
    await loadEmployees();
    successMessage.value = 'Manager removed successfully!';
    showSuccess.value = true;
  } catch (err) {
    console.error('Error removing manager:', err);
    errorMessage.value = 'Failed to remove manager. Please try again.';
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
    errorMessage.value = 'Failed to delete workplace. Please try again.';
    showError.value = true;
  }
};

onMounted(async () => {
  await Promise.all([loadBusinessAreas(), loadEmployees()]);
});
</script>

<style scoped>
.hover-card {
  transition: all 0.3s ease;
}

.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(18, 8, 111, 0.15) !important;
}
</style>