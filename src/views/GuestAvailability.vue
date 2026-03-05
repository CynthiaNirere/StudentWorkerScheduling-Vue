<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const loading = ref(true);
const employees = ref([]);
const availabilityData = ref([]);

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

const daysOfWeek = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

onMounted(async () => {
  const isGuest = localStorage.getItem('isGuest');
  if (!isGuest) {
    router.push({ name: 'landing' });
    return;
  }
  
  localStorage.setItem('user', JSON.stringify(DEMO_USER));
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    const [empRes, availRes] = await Promise.all([
      EmployerService.getAllEmployees(),
      EmployerService.getAllAvailability()
    ]);
    
    const allEmployees = Array.isArray(empRes.data) ? empRes.data : [];
    employees.value = allEmployees
      .filter(emp => (emp.user_id || emp.userId || '').startsWith('demo-emp-'))
      .slice(0, 5);
    
    availabilityData.value = Array.isArray(availRes.data) ? availRes.data : [];
  } catch (err) {
    console.error('Error loading data:', err);
  } finally {
    loading.value = false;
  }
};

const getAvailabilityForEmployee = (employeeId, dayOfWeek) => {
  const availability = availabilityData.value.filter(a => 
    (a.user_id || a.userId) === employeeId && 
    (a.day_of_week || a.dayOfWeek) === dayOfWeek
  );
  
  if (availability.length === 0) {
    return { text: 'Unavailable', color: 'transparent', textColor: 'grey' };
  }
  
  return availability.map(a => {
    const startTime = formatTime(a.start_time || a.startTime);
    const endTime = formatTime(a.end_time || a.endTime);
    return {
      text: `${startTime} - ${endTime}`,
      color: '#e8f5e9',
      textColor: '#2e7d32'
    };
  });
};

const formatTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
};

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
            <strong>Guest Mode</strong> - Viewing demo availability data
          </div>
          <v-btn color="primary" variant="outlined" @click="exitGuestMode">
            Exit Guest Mode
          </v-btn>
        </div>
      </v-alert>

      <!-- Header -->
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Employee Availability</h1>
          <p class="text-subtitle-1 text-medium-emphasis">
            Manage when employees are available to work
          </p>
        </div>
        
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" disabled>
          ADD AVAILABILITY
        </v-btn>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Availability Grid -->
      <v-card v-else variant="outlined" rounded="lg" class="availability-card">
        <v-table class="availability-table">
          <thead>
            <tr>
              <th class="employee-column">Employee</th>
              <th v-for="day in daysOfWeek" :key="day.value" class="text-center">
                {{ day.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="employees.length === 0">
              <td :colspan="daysOfWeek.length + 1" class="text-center py-8 text-grey">
                No employees found
              </td>
            </tr>
            <tr v-for="employee in employees" :key="employee.user_id || employee.userId">
              <td class="employee-column">
                <span class="font-weight-medium">
                  {{ employee.first_name || employee.fName }} {{ employee.last_name || employee.lName }}
                </span>
              </td>
              <td v-for="day in daysOfWeek" :key="day.value" class="availability-cell">
                <template v-if="Array.isArray(getAvailabilityForEmployee(employee.user_id || employee.userId, day.value))">
                  <v-chip
                    v-for="(slot, idx) in getAvailabilityForEmployee(employee.user_id || employee.userId, day.value)"
                    :key="idx"
                    :color="slot.color"
                    :text-color="slot.textColor"
                    size="small"
                    class="availability-chip"
                  >
                    {{ slot.text }}
                  </v-chip>
                </template>
                <span v-else class="text-grey text-caption">
                  {{ getAvailabilityForEmployee(employee.user_id || employee.userId, day.value).text }}
                </span>
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

.availability-card {
  overflow-x: auto;
}

.availability-table thead tr {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
}

.availability-table thead th {
  color: white !important;
  font-weight: 600 !important;
  padding: 16px 12px !important;
  border-bottom: 2px solid #e0e0e0 !important;
}

.employee-column {
  min-width: 150px;
  font-weight: 600 !important;
  color: #12086F !important;
}

.availability-cell {
  text-align: center;
  padding: 12px 8px !important;
  vertical-align: middle;
}

.availability-chip {
  font-weight: 500 !important;
  border: 1px solid #2e7d32;
}
</style>