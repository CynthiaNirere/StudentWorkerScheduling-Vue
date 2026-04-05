<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Utils from '../config/utils'
import adminServices from '../services/adminViewServices'
import businessAreaServices from '../services/businessAreaServices'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import AuthServices from '../services/authServices'

const router = useRouter()

const user = ref(null)
const managers = ref([]) // ✅ CHANGED: Renamed from employees to managers
const businessAreas = ref([])
const currentBusinessArea = ref(null)
const loading = ref(true)
const error = ref(null)
const successMessage = ref(null)

const showAddManagerDialog = ref(false) // ✅ CHANGED
const showEditManagerDialog = ref(false) // ✅ CHANGED
const showDeleteDialog = ref(false)
const showChangeBusinessAreaDialog = ref(false)
const managerToDelete = ref(null) // ✅ CHANGED
const managerToEdit = ref(null) // ✅ CHANGED

const newManager = ref({ // ✅ CHANGED
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  role: 'employer', // ✅ CHANGED: Default to employer
  workLocation: null
})

const editManager = ref({ // ✅ CHANGED
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  role: '',
  workLocation: null
})

const managerCount = computed(() => managers.value.length) // ✅ CHANGED

const showSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = null
  }, 3000)
}

const loadBusinessAreas = async () => {
  try {
    const response = await businessAreaServices.getAll()
    businessAreas.value = response.data
    
    // Check if workplace is selected
    if (!currentBusinessArea.value && businessAreas.value.length > 0) {
      // No workplace selected, redirect to workplace selection
      router.push({ name: 'workplace' })
      return
    }
    
    // If workplace is selected, load managers
    if (currentBusinessArea.value) {
      await loadManagers()
    }
  } catch (err) {
    console.error("❌ Error loading business areas:", err)
    error.value = 'Unable to load business areas. Please try again.'
  } finally {
    loading.value = false
  }
}

const loadManagers = async () => { // ✅ CHANGED: Renamed function
  try {
    loading.value = true
    error.value = null
    
    const response = await adminServices.getAllUsers()
    console.log("✅ All users loaded:", response.data)
    
    // ✅ CHANGED: Filter for employers/managers only in current business area
    managers.value = response.data.filter(user => {
      const isEmployer = user.role === 'employer'
      const isInCurrentLocation = currentBusinessArea.value 
        ? user.work_location === currentBusinessArea.value.location_id 
        : true
      
      return isEmployer && isInCurrentLocation
    })
    
    console.log("✅ Managers filtered:", managers.value)
    
  } catch (err) {
    console.error("❌ Error loading managers:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/login'), 2000)
    } else {
      error.value = 'Unable to load managers. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const openAddManagerDialog = () => { // ✅ CHANGED
  showAddManagerDialog.value = true
  newManager.value = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'employer', // ✅ Always employer
    workLocation: currentBusinessArea.value?.location_id || null
  }
}

const closeAddManagerDialog = () => { // ✅ CHANGED
  showAddManagerDialog.value = false
}

const openEditManagerDialog = (manager) => { // ✅ CHANGED
  console.log("✏️ Opening edit dialog for manager:", manager)
  managerToEdit.value = manager
  editManager.value = {
    userId: manager.user_id,
    firstName: manager.first_name,
    lastName: manager.last_name,
    email: manager.email,
    phoneNumber: manager.phone_number || '',
    role: manager.role,
    workLocation: manager.work_location
  }
  showEditManagerDialog.value = true
}

const closeEditManagerDialog = () => { // ✅ CHANGED
  showEditManagerDialog.value = false
  managerToEdit.value = null
}

const saveEditManager = async () => { // ✅ CHANGED
  if (!editManager.value.firstName || !editManager.value.lastName || !editManager.value.email) {
    error.value = 'Please fill in all required fields'
    return
  }

  try {
    const managerData = {
      first_name: editManager.value.firstName,
      last_name: editManager.value.lastName,
      email: editManager.value.email,
      phone_number: editManager.value.phoneNumber,
      role: editManager.value.role,
      work_location: editManager.value.workLocation
    }

    console.log("✏️ Updating manager:", editManager.value.userId, managerData)
    const response = await adminServices.updateUser(editManager.value.userId, managerData)
    console.log("✅ Manager updated:", response.data)
    
    const index = managers.value.findIndex(m => m.user_id === editManager.value.userId)
    if (index !== -1) {
      managers.value[index] = {
        ...managers.value[index],
        first_name: editManager.value.firstName,
        last_name: editManager.value.lastName,
        email: editManager.value.email,
        phone_number: editManager.value.phoneNumber,
        role: editManager.value.role,
        work_location: editManager.value.workLocation
      }
    }
    
    closeEditManagerDialog()
    showSuccess('Manager updated successfully')
  } catch (err) {
    console.error("❌ Error updating manager:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/login'), 2000)
    } else if (err.response?.status === 400) {
      error.value = 'Email already exists. Please use a different email.'
    } else {
      error.value = err.response?.data?.message || 'Unable to update manager. Please try again.'
    }
  }
}

const addManager = async () => { // ✅ CHANGED
  if (!newManager.value.firstName || !newManager.value.lastName || !newManager.value.email) {
    error.value = 'Please fill in all required fields'
    return
  }

  try {
    const managerData = {
      first_name: newManager.value.firstName,
      last_name: newManager.value.lastName,
      email: newManager.value.email,
      phone_number: newManager.value.phoneNumber,
      role: 'employer', // ✅ ALWAYS employer
      work_location: newManager.value.workLocation
    }

    console.log("📝 Creating manager:", managerData)
    const response = await adminServices.createUser(managerData)
    console.log("✅ Manager created:", response.data)
    
    managers.value.push(response.data)
    
    closeAddManagerDialog()
    showSuccess('Manager added successfully')
  } catch (err) {
    console.error("❌ Error creating manager:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/login'), 2000)
    } else if (err.response?.status === 400) {
      error.value = 'Email already exists. Please use a different email.'
    } else {
      error.value = err.response?.data?.message || 'Unable to add manager. Please try again.'
    }
  }
}

const confirmDeleteManager = (manager) => { // ✅ CHANGED
  console.log("🗑️ Confirming delete for manager:", manager)
  managerToDelete.value = manager
  showDeleteDialog.value = true
}

const deleteManager = async () => { // ✅ CHANGED
  if (!managerToDelete.value) return

  try {
    console.log("🗑️ Deleting manager:", managerToDelete.value.user_id)
    
    await adminServices.deleteUser(managerToDelete.value.user_id)
    managers.value = managers.value.filter(m => m.user_id !== managerToDelete.value.user_id)
    showDeleteDialog.value = false
    managerToDelete.value = null
    
    console.log("✅ Manager deleted")
    showSuccess('Manager deleted successfully')
  } catch (err) {
    console.error("❌ Error deleting manager:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/login'), 2000)
    } else {
      error.value = 'Unable to delete manager. Please try again.'
    }
  }
}

const openChangeBusinessAreaDialog = () => {
  showChangeBusinessAreaDialog.value = true
}

const changeBusinessArea = async (businessArea) => {
  currentBusinessArea.value = businessArea
  // Save to localStorage
  localStorage.setItem('selectedWorkplace', JSON.stringify(businessArea))
  showChangeBusinessAreaDialog.value = false
  await loadManagers()
  showSuccess(`Switched to ${businessArea.name}`)
}

const getStatusColor = (role) => {
  return 'secondary' // ✅ All managers get secondary color
}

const getStatusText = (role) => {
  return 'Active'
}

const getRoleColor = (role) => {
  const colorMap = {
    'admin': 'error',
    'employer': 'secondary',
    'employee': 'success'
  };
  return colorMap[role] || 'primary';
}

const handleLogout = async () => {
  try {
    await AuthServices.logoutUser({ token: user.value?.token });
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
}

onMounted(async () => {
  user.value = Utils.getStore("user")
  
  if (!user.value) {
    router.push('/login')
  } else if (user.value.role !== 'admin') {
    error.value = 'Access denied. Admin role required.'
    setTimeout(() => router.push('/login'), 2000)
  } else {
    // Check if a workplace is already selected
    const savedWorkplace = localStorage.getItem('selectedWorkplace')
    if (savedWorkplace) {
      try {
        currentBusinessArea.value = JSON.parse(savedWorkplace)
      } catch (e) {
        console.error('Error parsing saved workplace:', e)
      }
    }
    await loadBusinessAreas()
  }
})
</script>

<template>
  <DashboardLayout>
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold">Dashboard</h1>
          <v-chip v-if="currentBusinessArea" class="mt-2" color="accent" variant="outlined">
            {{ currentBusinessArea.name }}
          </v-chip>
        </div>
        
        <!-- User Profile Menu with Logout -->
        <v-menu location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" icon>
              <v-avatar color="primary" size="48">
                <span class="text-h6 text-white">{{ user?.fName?.[0] }}{{ user?.lName?.[0] }}</span>
              </v-avatar>
            </v-btn>
          </template>

          <v-card min-width="250" color="surface">
            <v-card-text>
              <div class="text-center">
                <v-avatar color="primary" class="mt-2 mb-3" size="large">
                  <span class="text-h5 font-weight-bold text-white">
                    {{ user?.fName?.[0] }}{{ user?.lName?.[0] }}
                  </span>
                </v-avatar>
                <h3 class="mb-1">{{ user?.fName }} {{ user?.lName }}</h3>
                <p class="text-caption text-medium-emphasis mb-2">{{ user?.email }}</p>
                <v-chip
                  size="small"
                  :color="getRoleColor(user?.role)"
                  class="mb-3"
                >
                  {{ user?.role }}
                </v-chip>
                <v-divider class="my-3"></v-divider>
                <v-btn variant="text" color="error" block @click="handleLogout" prepend-icon="mdi-logout">
                  Logout
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-menu>
      </div>

      <!-- Success Message -->
      <v-alert v-if="successMessage" type="success" class="mb-4" closable @click:close="successMessage = null">
        {{ successMessage }}
      </v-alert>

      <!-- Error Message -->
      <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
        {{ error }}
      </v-alert>

      <!-- Business Area Name -->
      <div class="mb-6" v-if="currentBusinessArea">
        <h2 class="text-h5 font-weight-medium">{{ currentBusinessArea.name }}</h2>
      </div>

      <!-- Quick Actions -->
      <div class="mb-6" v-if="currentBusinessArea">
        <h3 class="text-subtitle-1 font-weight-medium mb-3">Quick Actions:</h3>
        <div class="d-flex gap-3">
          <v-btn color="primary" @click="openAddManagerDialog">
            Add New Manager
          </v-btn>
          <v-btn variant="outlined" color="primary" @click="openChangeBusinessAreaDialog">
            Change Business Area
          </v-btn>
        </div>
      </div>

      <!-- Managers Table -->
      <v-card elevation="2" v-if="currentBusinessArea">
        <v-card-title class="bg-primary text-white">
          <v-icon start>mdi-account-tie</v-icon>
          Managers
        </v-card-title>
        
        <div v-if="loading" class="text-center py-12">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">Loading managers...</p>
        </div>

        <v-table v-else>
          <thead>
            <tr>
              <th class="text-left font-weight-bold">NAME</th>
              <th class="text-left font-weight-bold">EMAIL</th>
              <th class="text-left font-weight-bold">PHONE</th>
              <th class="text-left font-weight-bold">STATUS</th>
              <th class="text-left font-weight-bold">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="managers.length === 0">
              <td colspan="5" class="text-center py-8 text-medium-emphasis">
                No managers found. Click "Add New Manager" to get started!
              </td>
            </tr>
            <tr v-for="manager in managers" :key="manager.user_id">
              <td>{{ manager.first_name }} {{ manager.last_name }}</td>
              <td>{{ manager.email }}</td>
              <td>{{ manager.phone_number || 'N/A' }}</td>
              <td>
                <v-chip 
                  :color="getStatusColor(manager.role)" 
                  size="small"
                  variant="tonal"
                >
                  {{ getStatusText(manager.role) }}
                </v-chip>
              </td>
              <td>
                <v-btn 
                  variant="outlined" 
                  size="small"
                  color="primary"
                  class="mr-2"
                  @click="openEditManagerDialog(manager)"
                >
                  Edit
                </v-btn>
                <v-btn 
                  variant="outlined" 
                  size="small" 
                  color="error"
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
                  <v-text-field
                    v-model="newManager.firstName"
                    label="First Name *"
                    variant="outlined"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="newManager.lastName"
                    label="Last Name *"
                    variant="outlined"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-text-field
                v-model="newManager.email"
                label="Email *"
                type="email"
                variant="outlined"
                required
              ></v-text-field>

              <v-text-field
                v-model="newManager.phoneNumber"
                label="Phone Number"
                variant="outlined"
              ></v-text-field>

              <v-select
                v-model="newManager.workLocation"
                label="Work Location *"
                :items="businessAreas"
                item-title="name"
                item-value="location_id"
                variant="outlined"
                required
              ></v-select>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="closeAddManagerDialog">Cancel</v-btn>
            <v-btn 
              color="primary" 
              @click="addManager"
              :disabled="!newManager.firstName || !newManager.lastName || !newManager.email || !newManager.workLocation"
            >
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
                  <v-text-field
                    v-model="editManager.firstName"
                    label="First Name *"
                    variant="outlined"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="editManager.lastName"
                    label="Last Name *"
                    variant="outlined"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-text-field
                v-model="editManager.email"
                label="Email *"
                type="email"
                variant="outlined"
                required
              ></v-text-field>

              <v-text-field
                v-model="editManager.phoneNumber"
                label="Phone Number"
                variant="outlined"
              ></v-text-field>

              <v-select
                v-model="editManager.workLocation"
                label="Work Location"
                :items="businessAreas"
                item-title="name"
                item-value="location_id"
                variant="outlined"
              ></v-select>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="closeEditManagerDialog">Cancel</v-btn>
            <v-btn 
              color="primary" 
              @click="saveEditManager"
              :disabled="!editManager.firstName || !editManager.lastName || !editManager.email"
            >
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Manager Dialog -->
      <v-dialog v-model="showDeleteDialog" max-width="500px">
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
            <v-btn variant="text" @click="showDeleteDialog = false; managerToDelete = null">
              Cancel
            </v-btn>
            <v-btn color="error" @click="deleteManager" prepend-icon="mdi-delete">
              Delete Manager
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Change Business Area Dialog -->
      <v-dialog v-model="showChangeBusinessAreaDialog" max-width="500px">
        <v-card>
          <v-card-title class="bg-primary text-white">
            Select Business Area
          </v-card-title>

          <v-card-text class="pt-4">
            <v-list>
              <v-list-item
                v-for="area in businessAreas"
                :key="area.location_id"
                @click="changeBusinessArea(area)"
                :active="currentBusinessArea?.location_id === area.location_id"
                active-class="bg-accent"
              >
                <v-list-item-title>{{ area.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ area.address }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="showChangeBusinessAreaDialog = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </DashboardLayout>
</template>

<style scoped>
.gap-3 {
  gap: 12px;
}

.bg-accent {
  background-color: rgba(67, 97, 238, 0.15) !important;
}
</style>