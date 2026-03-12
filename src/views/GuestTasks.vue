<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const taskLists = ref([]);
const selectedList = ref(null);
const taskItems = ref([]);
const loading = ref(false);
const loadingItems = ref(false);

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
  await loadTaskLists();
});

const loadTaskLists = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllTaskLists();
    const allLists = Array.isArray(res.data) ? res.data : [];
    // Filter for demo lists only
    taskLists.value = allLists.filter(list => 
      (list.tasklist_id || list.id)?.toString().includes('demo') || 
      list.location_id === 1
    );
  } catch (err) {
    console.error('Error loading task lists:', err);
  } finally {
    loading.value = false;
  }
};

const loadTaskItems = async (listId) => {
  loadingItems.value = true;
  try {
    const res = await EmployerService.getTaskItemsByList(listId);
    taskItems.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error loading task items:', err);
  } finally {
    loadingItems.value = false;
  }
};

const selectList = async (list) => {
  selectedList.value = list;
  await loadTaskItems(list.tasklist_id || list.id);
};

const getPriorityColor = (priority) => {
  const colors = {
    low: '#9e9e9e',
    medium: '#4361EE',
    high: '#f57c00',
    urgent: '#d32f2f',
  };
  return colors[priority] || '#9e9e9e';
};

const getStatusColor = (status) => {
  const colors = {
    active: '#2e7d32',
    completed: '#12086F',
    archived: '#9e9e9e',
  };
  return colors[status] || '#9e9e9e';
};

const getTaskStatusColor = (status) => {
  const colors = {
    pending: '#9e9e9e',
    in_progress: '#4361EE',
    completed: '#2e7d32',
  };
  return colors[status] || '#9e9e9e';
};

const getTaskStatusIcon = (status) => {
  const icons = {
    pending: 'mdi-checkbox-blank-circle-outline',
    in_progress: 'mdi-progress-clock',
    completed: 'mdi-check-circle',
  };
  return icons[status] || 'mdi-checkbox-blank-circle-outline';
};

const formatStatus = (status) => {
  const formatted = {
    pending: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return formatted[status] || status;
};

const getEmployeeName = (employeeId) => {
  if (!employeeId) return null;
  // Return demo employee names based on ID
  const demoNames = {
    'emp-10-sarah': 'Sarah Johnson',
    'emp-11-michael': 'Michael Chen',
    'emp-12-emily': 'Emily Rodriguez',
    'emp-13-james': 'James Williams',
    'emp-14-ashley': 'Ashley Brown',
    'emp-15-david': 'David Martinez',
    'emp-16-jessica': 'Jessica Taylor',
    'emp-17-ryan': 'Ryan Anderson',
    'emp-18-madison': 'Madison Lee',
    'emp-19-chris': 'Christopher White',
  };
  return demoNames[employeeId] || employeeId;
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
            <strong>Guest Mode</strong> - Viewing demo task lists (read-only)
          </div>
          <v-btn color="primary" variant="outlined" @click="exitGuestMode">
            Exit Guest Mode
          </v-btn>
        </div>
      </v-alert>

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Task Management</h1>
          <p class="text-body-2 text-grey">
            Create and manage task lists for your team
          </p>
        </div>
        <v-btn
          color="#12086F"
          variant="flat"
          prepend-icon="mdi-plus"
          disabled
        >
          Create Task List
        </v-btn>
      </div>

      <v-row>
        <!-- Task Lists -->
        <v-col cols="12" md="4">
          <v-card variant="outlined" rounded="lg" class="navy-card">
            <v-card-title class="text-body-1 font-weight-bold pa-4 pb-3">
              Task Lists
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-0">
              <v-list>
                <v-list-item
                  v-for="list in taskLists"
                  :key="list.tasklist_id || list.id"
                  :active="(selectedList?.tasklist_id || selectedList?.id) === (list.tasklist_id || list.id)"
                  @click="selectList(list)"
                  class="cursor-pointer"
                >
                  <v-list-item-title class="font-weight-medium">
                    {{ list.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    <v-chip
                      :color="getPriorityColor(list.priority)"
                      size="x-small"
                      variant="tonal"
                      class="mr-1"
                    >
                      {{ list.priority }}
                    </v-chip>
                    <v-chip
                      :color="getStatusColor(list.status)"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ list.status }}
                    </v-chip>
                  </v-list-item-subtitle>
                  
                  <template #append>
                    <v-btn 
                      icon="mdi-delete" 
                      size="small" 
                      variant="plain"
                      color="#d32f2f"
                      disabled
                    />
                  </template>
                </v-list-item>
              </v-list>

              <div v-if="loading" class="text-center pa-6">
                <v-progress-circular indeterminate color="#12086F" size="28" />
              </div>

              <div v-else-if="taskLists.length === 0" class="text-center pa-6">
                <v-icon size="48" class="mb-2 text-grey">mdi-clipboard-list-outline</v-icon>
                <div class="text-body-2 text-grey">No task lists available</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Task Items -->
        <v-col cols="12" md="8">
          <v-card variant="outlined" rounded="lg" class="navy-card">
            <div v-if="!selectedList" class="pa-6 text-center">
              <v-icon size="64" class="mb-2 text-grey">mdi-format-list-checks</v-icon>
              <div class="text-body-1 text-grey">Select a task list to view items</div>
            </div>

            <template v-else>
              <v-card-title class="pa-4 pb-3 d-flex align-center justify-space-between">
                <div>
                  <div class="text-body-1 font-weight-bold">{{ selectedList.title }}</div>
                  <div class="text-caption text-grey">{{ selectedList.description }}</div>
                </div>
                <v-btn
                  color="#12086F"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-plus"
                  disabled
                >
                  Add Item
                </v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-0">
                <v-list>
                  <v-list-item
                    v-for="item in taskItems"
                    :key="item.item_id || item.id"
                  >
                    <template #prepend>
                      <v-icon
                        :icon="getTaskStatusIcon(item.status)"
                        :color="getTaskStatusColor(item.status)"
                        size="24"
                        style="opacity: 0.6; cursor: not-allowed;"
                      />
                    </template>
                    
                    <v-list-item-title 
                      :class="item.status === 'completed' ? 'text-decoration-line-through text-grey' : ''"
                    >
                      {{ item.title }}
                    </v-list-item-title>
                    
                    <v-list-item-subtitle class="text-caption">
                      <div v-if="item.description" class="mb-1">{{ item.description }}</div>
                      <div class="d-flex ga-2 align-center flex-wrap">
                        <v-chip
                          :color="getTaskStatusColor(item.status)"
                          size="x-small"
                          variant="tonal"
                        >
                          {{ formatStatus(item.status) }}
                        </v-chip>
                        <v-chip
                          v-if="item.assigned_to || item.assignedTo"
                          color="#4361EE"
                          size="x-small"
                          variant="tonal"
                          prepend-icon="mdi-account"
                        >
                          {{ getEmployeeName(item.assigned_to || item.assignedTo) }}
                        </v-chip>
                      </div>
                    </v-list-item-subtitle>

                    <template #append>
                      <v-btn
                        icon="mdi-dots-vertical"
                        size="small"
                        variant="plain"
                        disabled
                      />
                    </template>
                  </v-list-item>
                </v-list>

                <div v-if="loadingItems" class="text-center pa-6">
                  <v-progress-circular indeterminate color="#12086F" size="28" />
                </div>

                <div v-else-if="taskItems.length === 0" class="text-center pa-6">
                  <v-icon size="48" class="mb-2 text-grey">mdi-checkbox-blank-outline</v-icon>
                  <div class="text-body-2 text-grey">No items in this list</div>
                </div>
              </v-card-text>
            </template>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text {
  color: #12086F !important;
}

.navy-card {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05);
}

.cursor-pointer {
  cursor: pointer;
}
</style>