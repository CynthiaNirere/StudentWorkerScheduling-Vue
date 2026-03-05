<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const loading = ref(true);
const employees = ref([]);
const searchQuery = ref('');

const DEMO_USER = {
  userId: 'demo-employer',
  user_id: 'demo-employer',
  email: 'demo@shiftboard.com',
  fName: 'Demo',
  lName: 'Manager',
  role: 'employer',
  work_location: null,
  token: 'demo-token'
};

onMounted(async () => {
  const isGuest = localStorage.getItem('isGuest');
  if (!isGuest) {
    router.push({ name: 'landing' });
    return;
  }
  
  localStorage.setItem('user', JSON.stringify(DEMO_USER));
  await loadEmployees();
});

const loadEmployees = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllEmployees();
    const allEmployees = Array.isArray(res.data) ? res.data : [];
    
    // ✅ FILTER: Only show first 5 demo employees
    employees.value = allEmployees
      .filter(emp => (emp.user_id || emp.userId || '').startsWith('demo-emp-'))
      .slice(0, 5);
  } catch (err) {
    console.error('Error loading employees:', err);
  } finally {
    loading.value = false;
  }
};

const filteredEmployees = computed(() => {
  if (!searchQuery.value) return employees.value;
  
  const query = searchQuery.value.toLowerCase();
  return employees.value.filter(emp => {
    const name = `${emp.first_name || emp.fName} ${emp.last_name || emp.lName}`.toLowerCase();
    const email = (emp.email || '').toLowerCase();
    return name.includes(query) || email.includes(query);
  });
});

const exitGuestMode = () => {
  localStorage.removeItem('isGuest');
  localStorage.removeItem('user');
  router.push({ name: 'landing' });
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">
      <!-- Guest Mode Banner -->
      <v-alert type="info" variant="tonal" prominent class="mb-6">
        <div class="d-flex align-center justify-space-between">
          <div>
            <v-icon size="large" class="mr-3">mdi-eye-outline</v-icon>
            <strong>Guest Mode</strong> - Viewing demo employee data
          </div>
          <v-btn color="primary" variant="outlined" @click="exitGuestMode">
            Exit Guest Mode
          </v-btn>
        </div>
      </v-alert>

      <!-- Header -->
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Employee Management</h1>
          <p class="text-subtitle-1 text-medium-emphasis">
            Manage your team members and their job roles
          </p>
        </div>
        
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" disabled>
          ADD EMPLOYEE
        </v-btn>
      </div>

      <!-- Search Bar -->
      <v-text-field
        v-model="searchQuery"
        prepend-inner-icon="mdi-magnify"
        label="Search employees"
        variant="outlined"
        density="comfortable"
        class="mb-6"
        clearable
        hide-details
      />

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Employee Table -->
      <v-card v-else variant="outlined" rounded="lg">
        <v-table>
          <thead>
            <tr>
              <th class="text-left">Name</th>
              <th class="text-left">Email</th>
              <th class="text-left">Phone</th>
              <th class="text-left">Job Role</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredEmployees.length === 0">
              <td colspan="5" class="text-center py-8 text-grey">
                No employees found
              </td>
            </tr>
            <tr v-for="employee in filteredEmployees" :key="employee.user_id || employee.userId">
              <td>
                <div class="d-flex align-center">
                  <v-avatar size="32" color="primary" class="mr-3">
                    <span class="text-white text-caption font-weight-bold">
                      {{ (employee.first_name || employee.fName || '').charAt(0) }}{{ (employee.last_name || employee.lName || '').charAt(0) }}
                    </span>
                  </v-avatar>
                  <span class="font-weight-medium">
                    {{ employee.first_name || employee.fName }} {{ employee.last_name || employee.lName }}
                  </span>
                </div>
              </td>
              <td>{{ employee.email }}</td>
              <td>{{ employee.phone_number || '-' }}</td>
              <td>
                <v-chip size="small" variant="tonal" color="grey">
                  Not assigned
                </v-chip>
              </td>
              <td>
                <div class="d-flex justify-center gap-2">
                  <v-btn icon size="small" variant="text" color="primary" disabled>
                    <v-icon>mdi-eye</v-icon>
                  </v-btn>
                  <v-btn icon size="small" variant="text" color="primary" disabled>
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon size="small" variant="text" color="primary" disabled>
                    <v-icon>mdi-calendar-clock</v-icon>
                  </v-btn>
                  <v-btn icon size="small" variant="text" color="error" disabled>
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.gap-2 {
  gap: 8px;
}

th {
  font-weight: 600 !important;
  color: #12086F !important;
}
</style>