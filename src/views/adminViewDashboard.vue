<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Utils from '../config/utils'
import adminServices from '../services/adminViewServices'
import businessAreaServices from '../services/businessAreaServices'
import DashboardLayout from '../layouts/DashboardLayout.vue'

const router = useRouter()

const user = ref(null)
const employees = ref([])
const businessAreas = ref([])
const currentBusinessArea = ref(null)
const loading = ref(true)
const error = ref(null)
const successMessage = ref(null)

const showAddEmployeeDialog = ref(false)
const showDeleteDialog = ref(false)
const showChangeBusinessAreaDialog = ref(false)
const showAddBusinessAreaDialog = ref(false)
const employeeToDelete = ref(null)

const newEmployee = ref({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  role: 'employee',
  workLocation: null
})

const newBusinessArea = ref({
  name: '',
  address: ''
})

const employeeCount = computed(() => employees.value.length)

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
    
    // Set default business area if exists
    if (businessAreas.value.length > 0) {
      currentBusinessArea.value = businessAreas.value[0]
      await loadEmployees()
    }
  } catch (err) {
    console.error("❌ Error loading business areas:", err)
    error.value = 'Unable to load business areas. Please try again.'
  }
}

const loadEmployees = async () => {
  try {
    loading.value = true
    error.value = null
    
    const response = await adminServices.getAllUsers()
    console.log("✅ Employees loaded:", response.data)
    
    // Filter employees by current business area if set
    employees.value = response.data.filter(emp => {
      if (!currentBusinessArea.value) return true
      return emp.work_location === currentBusinessArea.value.location_id
    })
    
  } catch (err) {
    console.error("❌ Error loading employees:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/login'), 2000)
    } else {
      error.value = 'Unable to load employees. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const openAddEmployeeDialog = () => {
  showAddEmployeeDialog.value = true
  newEmployee.value = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'employee',
    workLocation: currentBusinessArea.value?.location_id || null
  }
}

const closeAddEmployeeDialog = () => {
  showAddEmployeeDialog.value = false
}

const openAddBusinessAreaDialog = () => {
  showAddBusinessAreaDialog.value = true
  newBusinessArea.value = {
    name: '',
    address: ''
  }
}

const closeAddBusinessAreaDialog = () => {
  showAddBusinessAreaDialog.value = false
}

const addBusinessArea = async () => {
  console.log("Attempting to create business area with data:", newBusinessArea.value)
  if (!newBusinessArea.value.name || !newBusinessArea.value.address) {
    error.value = 'Please fill in all required fields'
    return
  }

  try {
    const response = await businessAreaServices.create(newBusinessArea.value)
    console.log("✅ Business area created:", response.data)
    
    businessAreas.value.push(response.data)
    
    // Set as current business area if it's the first one
    if (businessAreas.value.length === 1) {
      currentBusinessArea.value = response.data
      await loadEmployees()
    }
    
    closeAddBusinessAreaDialog()
    showSuccess('Business area added successfully')
  } catch (err) {
    console.error("❌ Error creating business area:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/login'), 2000)
    } else {
      error.value = err.response?.data?.message || 'Unable to add business area. Please try again.'
    }
  }
}

const addEmployee = async () => {
  if (!newEmployee.value.firstName || !newEmployee.value.lastName || !newEmployee.value.email) {
    error.value = 'Please fill in all required fields'
    return
  }

  try {
    const employeeData = {
      first_name: newEmployee.value.firstName,
      last_name: newEmployee.value.lastName,
      email: newEmployee.value.email,
      phone_number: newEmployee.value.phoneNumber,
      role: newEmployee.value.role,
      work_location: newEmployee.value.workLocation
    }

    console.log("📝 Creating employee:", employeeData)
    const response = await adminServices.createUser(employeeData)
    console.log("✅ Employee created:", response.data)
    
    employees.value.push(response.data)
    
    closeAddEmployeeDialog()
    showSuccess('Employee added successfully')
  } catch (err) {
    console.error("❌ Error creating employee:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/login'), 2000)
    } else if (err.response?.status === 400) {
      error.value = 'Email already exists. Please use a different email.'
    } else {
      error.value = err.response?.data?.message || 'Unable to add employee. Please try again.'
    }
  }
}

const confirmDeleteEmployee = (employee) => {
  console.log("🗑️ Confirming delete for employee:", employee)
  employeeToDelete.value = employee
  showDeleteDialog.value = true
}

const deleteEmployee = async () => {
  if (!employeeToDelete.value) return

  try {
    console.log("🗑️ Deleting employee:", employeeToDelete.value.user_id)
    
    await adminServices.deleteUser(employeeToDelete.value.user_id)
    employees.value = employees.value.filter(e => e.user_id !== employeeToDelete.value.user_id)
    showDeleteDialog.value = false
    employeeToDelete.value = null
    
    console.log("✅ Employee deleted")
    showSuccess('Employee deleted successfully')
  } catch (err) {
    console.error("❌ Error deleting employee:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/login'), 2000)
    } else {
      error.value = 'Unable to delete employee. Please try again.'
    }
  }
}

const openChangeBusinessAreaDialog = () => {
  showChangeBusinessAreaDialog.value = true
}

const changeBusinessArea = async (businessArea) => {
  currentBusinessArea.value = businessArea
  showChangeBusinessAreaDialog.value = false
  await loadEmployees()
  showSuccess(`Switched to ${businessArea.name}`)
}

const getStatusColor = (role) => {
  switch(role) {
    case 'admin': return 'error'
    case 'employee': return 'success'
    default: return 'grey'
  }
}

const getStatusText = (role) => {
  return role === 'admin' ? 'Active' : 'Active'
}

onMounted(async () => {
  user.value = Utils.getStore("user")
  
  if (!user.value) {
    router.push('/login')
  } else if (user.value.role !== 'admin') {
    error.value = 'Access denied. Admin role required.'
    setTimeout(() => router.push('/login'), 2000)
  } else {
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
          <v-chip v-if="currentBusinessArea" class="mt-2" color="primary" variant="outlined">
            {{ currentBusinessArea.name }}
          </v-chip>
        </div>
        <v-avatar color="primary" size="48">
          <span class="text-h6">{{ user?.fName?.[0] }}{{ user?.lName?.[0] }}</span>
        </v-avatar>
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
      <div class="mb-6">
        <h2 class="text-h5 font-weight-medium">{{ currentBusinessArea?.name || 'The Brew' }}</h2>
      </div>

      <!-- Quick Actions -->
      <div class="mb-6">
        <h3 class="text-subtitle-1 font-weight-medium mb-3">Quick Actions:</h3>
        <div class="d-flex gap-3">
          <v-btn color="primary" @click="openAddEmployeeDialog">
            Add New Employee
          </v-btn>
          <v-btn color="secondary" @click="openAddBusinessAreaDialog">
            Add Business Area
          </v-btn>
          <v-btn variant="outlined" @click="openChangeBusinessAreaDialog">
            Change Business Area
          </v-btn>
        </div>
      </div>

      <!-- Employees Table -->
      <v-card elevation="2">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">Loading employees...</p>
        </div>

        <!-- Table -->
        <v-table v-else>
          <thead>
            <tr>
              <th class="text-left font-weight-bold">NAME</th>
              <th class="text-left font-weight-bold">ROLE</th>
              <th class="text-left font-weight-bold">STATUS</th>
              <th class="text-left font-weight-bold">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="employees.length === 0">
              <td colspan="4" class="text-center py-8 text-grey">
                No employees found. Click "Add New Employee" to get started!
              </td>
            </tr>
            <tr v-for="employee in employees" :key="employee.user_id">
              <td>{{ employee.first_name }} {{ employee.last_name }}</td>
              <td class="text-capitalize">{{ employee.role }}</td>
              <td>
                <v-chip 
                  :color="getStatusColor(employee.role)" 
                  size="small"
                  variant="tonal"
                >
                  {{ getStatusText(employee.role) }}
                </v-chip>
              </td>
              <td>
                <v-btn 
                  variant="outlined" 
                  size="small" 
                  class="mr-2"
                  @click="() => {}"
                >
                  Edit
                </v-btn>
                <v-btn 
                  variant="outlined" 
                  size="small" 
                  color="error"
                  @click="confirmDeleteEmployee(employee)"
                >
                  Delete
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <!-- Add Employee Dialog -->
      <v-dialog v-model="showAddEmployeeDialog" max-width="600px" persistent>
        <v-card>
          <v-card-title class="bg-primary">
            <div class="d-flex justify-space-between align-center">
              <span class="text-h5">Add New Employee</span>
              <v-btn icon variant="text" @click="closeAddEmployeeDialog">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pt-4">
            <v-form>
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="newEmployee.firstName"
                    label="First Name *"
                    variant="outlined"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="newEmployee.lastName"
                    label="Last Name *"
                    variant="outlined"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-text-field
                v-model="newEmployee.email"
                label="Email *"
                type="email"
                variant="outlined"
                required
              ></v-text-field>

              <v-text-field
                v-model="newEmployee.phoneNumber"
                label="Phone Number"
                variant="outlined"
              ></v-text-field>

              <v-select
                v-model="newEmployee.role"
                label="Role *"
                :items="['admin', 'employee']"
                variant="outlined"
                required
              ></v-select>

              <v-select
                v-model="newEmployee.workLocation"
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
            <v-btn variant="text" @click="closeAddEmployeeDialog">Cancel</v-btn>
            <v-btn 
              color="primary" 
              @click="addEmployee"
              :disabled="!newEmployee.firstName || !newEmployee.lastName || !newEmployee.email"
            >
              Add Employee
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Employee Dialog -->
      <v-dialog v-model="showDeleteDialog" max-width="500px">
        <v-card>
          <v-card-title class="bg-error text-white">
            <v-icon left color="white">mdi-alert-circle</v-icon>
            Delete Employee
          </v-card-title>

          <v-card-text class="pt-6">
            <div v-if="employeeToDelete" class="text-center">
              <v-icon size="64" color="error" class="mb-4">mdi-account-remove</v-icon>
              <p class="text-h6 mb-2">Are you sure you want to delete this employee?</p>
              <p class="text-body-1 font-weight-bold">{{ employeeToDelete.first_name }} {{ employeeToDelete.last_name }}</p>
              <p class="text-caption text-grey">{{ employeeToDelete.email }}</p>
              <v-alert type="warning" variant="tonal" class="mt-4">
                <strong>Warning:</strong> This action cannot be undone.
              </v-alert>
            </div>
          </v-card-text>

          <v-card-actions class="px-6 pb-6">
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="showDeleteDialog = false; employeeToDelete = null">
              Cancel
            </v-btn>
            <v-btn color="error" @click="deleteEmployee">
              <v-icon left>mdi-delete</v-icon>
              Delete Employee
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

      <!-- Add Business Area Dialog -->
      <v-dialog v-model="showAddBusinessAreaDialog" max-width="500px" persistent>
        <v-card>
          <v-card-title class="bg-secondary">
            <div class="d-flex justify-space-between align-center">
              <span class="text-h5">Add New Business Area</span>
              <v-btn icon variant="text" @click="closeAddBusinessAreaDialog">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pt-4">
            <v-form>
              <v-text-field
                v-model="newBusinessArea.name"
                label="Business Area Name *"
                variant="outlined"
                required
                placeholder="e.g., Main Office, Library Services"
              ></v-text-field>

              <v-textarea
                v-model="newBusinessArea.address"
                label="Address *"
                variant="outlined"
                required
                rows="3"
                placeholder="e.g., 123 Main St, Campus City, State 12345"
              ></v-textarea>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="closeAddBusinessAreaDialog">Cancel</v-btn>
            <v-btn 
              color="secondary" 
              @click="addBusinessArea"
              :disabled="!newBusinessArea.name || !newBusinessArea.address"
            >
              Add Business Area
            </v-btn>
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
</style>