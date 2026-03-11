<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import EmployerService from '../services/employerServices.js';
import Utils from '../config/utils.js';
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);
const loading = ref(false);

// Data
const taskLists = ref([]);
const completionHistory = ref([]);
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const tab = ref('today');

// Dialog states
const showCreateDialog = ref(false);
const showItemsDialog = ref(false);
const showAddItemDialog = ref(false);

// Form data
const newTask = ref({
  title: '',
  description: '',
  shiftType: 'all_day',
  recursDaily: false,
  isTemplate: false,
  priority: 'medium'
});

const newItem = ref({
  title: '',
  description: '',
  orderPosition: 1
});

const selectedTaskList = ref(null);

// Computed
const todayTasks = computed(() => {
  const today = new Date().setHours(0, 0, 0, 0);
  return taskLists.value.filter(t => {
    if (t.isTemplate || t.is_template) return false;
    const dueDate = t.dueDate ? new Date(Number(t.dueDate)).setHours(0, 0, 0, 0) : null;
    return dueDate === today || t.recursDaily || t.recurs_daily;
  });
});

const templateTasks = computed(() => {
  return taskLists.value.filter(t => t.isTemplate || t.is_template);
});

const yesterdayCompletions = computed(() => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const yesterdayTimestamp = yesterday.getTime();
  
  return completionHistory.value.filter(h => {
    const completedDate = new Date(Number(h.completedAt || h.completed_at));
    completedDate.setHours(0, 0, 0, 0);
    return completedDate.getTime() === yesterdayTimestamp;
  });
});

const yesterdayStats = computed(() => {
  const totalItems = completionHistory.value.length;
  const completed = yesterdayCompletions.value.length;
  const percentage = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
  return { total: totalItems, completed, percentage };
});

// Methods
const loadTaskLists = async () => {
  loading.value = true;
  try {
    const response = await EmployerService.getAllTaskLists();
    taskLists.value = response.data || [];
  } catch (error) {
    console.error('Error loading task lists:', error);
  } finally {
    loading.value = false;
  }
};

const loadCompletionHistory = async () => {
  try {
    const response = await EmployerService.getTaskCompletionHistory();
    completionHistory.value = response.data || [];
  } catch (error) {
    console.error('Error loading completion history:', error);
  }
};

const createTaskList = async () => {
  loading.value = true;
  try {
    await EmployerService.createTaskList({
      ...newTask.value,
      createdBy: user.value.user_id || user.value.id,
      locationId: user.value.work_location,
      createdAt: Date.now()
    });
    
    showCreateDialog.value = false;
    resetNewTask();
    await loadTaskLists();
  } catch (error) {
    console.error('Error creating task list:', error);
  } finally {
    loading.value = false;
  }
};

const openItemsDialog = async (taskList) => {
  selectedTaskList.value = taskList;
  showItemsDialog.value = true;
  await loadTaskListItems(taskList.tasklist_id || taskList.id);
};

const loadTaskListItems = async (tasklistId) => {
  try {
    const response = await EmployerService.getTaskListItems(tasklistId);
    if (selectedTaskList.value) {
      selectedTaskList.value.items = response.data || [];
    }
  } catch (error) {
    console.error('Error loading task items:', error);
  }
};

const addTaskItem = async () => {
  if (!selectedTaskList.value) return;
  
  try {
    await EmployerService.createTaskListItem({
      ...newItem.value,
      tasklistId: selectedTaskList.value.tasklist_id || selectedTaskList.value.id,
      status: 'pending',
      createdAt: Date.now()
    });
    
    showAddItemDialog.value = false;
    resetNewItem();
    await loadTaskListItems(selectedTaskList.value.tasklist_id || selectedTaskList.value.id);
  } catch (error) {
    console.error('Error adding task item:', error);
  }
};

const toggleItemCompletion = async (item) => {
  try {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    await EmployerService.updateTaskListItem(item.item_id || item.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? Date.now() : null,
      completedBy: newStatus === 'completed' ? (user.value.user_id || user.value.id) : null
    });
    
    await loadTaskListItems(selectedTaskList.value.tasklist_id || selectedTaskList.value.id);
    await loadCompletionHistory();
  } catch (error) {
    console.error('Error toggling item completion:', error);
  }
};

const deleteTaskList = async (id) => {
  if (!confirm('Are you sure you want to delete this task list?')) return;
  
  try {
    await EmployerService.deleteTaskList(id);
    await loadTaskLists();
  } catch (error) {
    console.error('Error deleting task list:', error);
  }
};

const deleteTaskItem = async (itemId) => {
  if (!confirm('Are you sure you want to delete this item?')) return;
  
  try {
    await EmployerService.deleteTaskListItem(itemId);
    await loadTaskListItems(selectedTaskList.value.tasklist_id || selectedTaskList.value.id);
  } catch (error) {
    console.error('Error deleting task item:', error);
  }
};

const resetNewTask = () => {
  newTask.value = {
    title: '',
    description: '',
    shiftType: 'all_day',
    recursDaily: false,
    isTemplate: false,
    priority: 'medium'
  };
};

const resetNewItem = () => {
  newItem.value = {
    title: '',
    description: '',
    orderPosition: 1
  };
};

const getPriorityColor = (priority) => {
  const colors = {
    low: 'green',
    medium: 'blue',
    high: 'orange',
    urgent: 'red'
  };
  return colors[priority] || 'grey';
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(Number(timestamp)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadTaskLists();
  await loadCompletionHistory();
});
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold" style="color: #12086F;">Task Management</h1>
          <p class="text-subtitle-1 text-grey">Manage daily tasks and templates</p>
        </div>
        <v-btn color="#12086F" @click="showCreateDialog = true" prepend-icon="mdi-plus">
          Create Task List
        </v-btn>
      </div>

      <!-- Yesterday's Performance Summary -->
      <v-card class="mb-6" color="blue-grey-lighten-5">
        <v-card-text>
          <div class="d-flex align-center ga-4">
            <v-icon size="48" color="blue-grey-darken-2">mdi-chart-timeline-variant</v-icon>
            <div class="flex-grow-1">
              <h3 class="text-h6 font-weight-bold mb-1">Yesterday's Task Completion</h3>
              <v-progress-linear
                :model-value="yesterdayStats.percentage"
                height="24"
                color="success"
                rounded
              >
                <template v-slot:default>
                  <strong class="text-white">{{ yesterdayStats.completed }}/{{ yesterdayStats.total }} tasks ({{ yesterdayStats.percentage }}%)</strong>
                </template>
              </v-progress-linear>
            </div>
            <v-chip
              :color="yesterdayStats.percentage >= 80 ? 'success' : yesterdayStats.percentage >= 50 ? 'warning' : 'error'"
              size="large"
            >
              <v-icon start>{{ yesterdayStats.percentage >= 80 ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
              {{ yesterdayStats.percentage }}%
            </v-chip>
          </div>
        </v-card-text>
      </v-card>

      <!-- Tabs -->
      <v-tabs v-model="tab" color="#12086F" class="mb-4">
        <v-tab value="today">
          <v-icon start>mdi-calendar-today</v-icon>
          Today's Tasks
        </v-tab>
        <v-tab value="templates">
          <v-icon start>mdi-content-save</v-icon>
          Templates
        </v-tab>
        <v-tab value="all">
          <v-icon start>mdi-format-list-checkbox</v-icon>
          All Tasks
        </v-tab>
      </v-tabs>

      <!-- Tab Content -->
      <v-window v-model="tab">
        <!-- Today's Tasks -->
        <v-window-item value="today">
          <v-row>
            <v-col v-for="task in todayTasks" :key="task.tasklist_id || task.id" cols="12" md="6" lg="4">
              <v-card hover @click="openItemsDialog(task)" class="task-card">
                <v-card-title class="d-flex align-center">
                  <v-icon :color="getPriorityColor(task.priority)" class="mr-2">
                    mdi-flag
                  </v-icon>
                  {{ task.title }}
                  <v-spacer />
                  <v-chip v-if="task.recursDaily || task.recurs_daily" size="x-small" color="purple" variant="tonal">
                    <v-icon start size="x-small">mdi-sync</v-icon>
                    Daily
                  </v-chip>
                </v-card-title>
                <v-card-text>
                  <p class="text-grey mb-2">{{ task.description || 'No description' }}</p>
                  <div class="d-flex align-center ga-2">
                    <v-chip size="small" variant="tonal">
                      {{ (task.shiftType || task.shift_type || 'all_day').replace('_', ' ') }}
                    </v-chip>
                    <v-chip size="small" color="grey" variant="tonal">
                      {{ task.items?.length || 0 }} items
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col v-if="todayTasks.length === 0" cols="12">
              <v-card class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-1">mdi-clipboard-check-outline</v-icon>
                <h3 class="text-h6 mt-4 text-grey">No tasks for today</h3>
                <p class="text-grey">Create a new task list or template to get started</p>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- Templates -->
        <v-window-item value="templates">
          <v-row>
            <v-col v-for="task in templateTasks" :key="task.tasklist_id || task.id" cols="12" md="6" lg="4">
              <v-card hover @click="openItemsDialog(task)" class="task-card">
                <v-card-title class="d-flex align-center">
                  <v-icon color="purple" class="mr-2">mdi-content-save</v-icon>
                  {{ task.title }}
                  <v-spacer />
                  <v-btn icon size="small" variant="text" @click.stop="deleteTaskList(task.tasklist_id || task.id)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <p class="text-grey mb-2">{{ task.description || 'No description' }}</p>
                  <v-chip size="small" color="grey" variant="tonal">
                    {{ task.items?.length || 0 }} items
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col v-if="templateTasks.length === 0" cols="12">
              <v-card class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-1">mdi-content-save-outline</v-icon>
                <h3 class="text-h6 mt-4 text-grey">No templates yet</h3>
                <p class="text-grey">Create reusable task templates for common workflows</p>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- All Tasks -->
        <v-window-item value="all">
          <v-card>
            <v-table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in taskLists" :key="task.tasklist_id || task.id">
                  <td>
                    <strong>{{ task.title }}</strong>
                    <v-chip v-if="task.isTemplate || task.is_template" size="x-small" color="purple" variant="tonal" class="ml-2">
                      Template
                    </v-chip>
                  </td>
                  <td>
                    <v-chip :color="getPriorityColor(task.priority)" size="small">
                      {{ task.priority }}
                    </v-chip>
                  </td>
                  <td>{{ (task.shiftType || task.shift_type || 'all_day').replace('_', ' ') }}</td>
                  <td>
                    <v-chip :color="task.status === 'completed' ? 'success' : 'grey'" size="small">
                      {{ task.status }}
                    </v-chip>
                  </td>
                  <td>{{ formatDate(task.dueDate || task.due_date) }}</td>
                  <td>
                    <v-btn icon size="small" variant="text" @click="openItemsDialog(task)">
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
                    <v-btn icon size="small" variant="text" @click="deleteTaskList(task.tasklist_id || task.id)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-window-item>
      </v-window>

      <!-- Create Task List Dialog -->
      <v-dialog v-model="showCreateDialog" max-width="600">
        <v-card>
          <v-card-title class="text-h5 font-weight-bold">Create Task List</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newTask.title"
              label="Title"
              required
              class="mb-3"
            />
            <v-textarea
              v-model="newTask.description"
              label="Description"
              rows="3"
              class="mb-3"
            />
            <v-select
              v-model="newTask.shiftType"
              :items="['morning', 'afternoon', 'evening', 'closing', 'all_day']"
              label="Shift Type"
              class="mb-3"
            />
            <v-select
              v-model="newTask.priority"
              :items="['low', 'medium', 'high', 'urgent']"
              label="Priority"
              class="mb-3"
            />
            <v-checkbox
              v-model="newTask.recursDaily"
              label="Recurs Daily"
              hide-details
              class="mb-2"
            />
            <v-checkbox
              v-model="newTask.isTemplate"
              label="Save as Template"
              hide-details
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="showCreateDialog = false">Cancel</v-btn>
            <v-btn color="#12086F" @click="createTaskList">Create</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Task Items Dialog -->
      <v-dialog v-model="showItemsDialog" max-width="800">
        <v-card v-if="selectedTaskList">
          <v-card-title class="text-h5 font-weight-bold d-flex align-center">
            <v-icon class="mr-2" :color="getPriorityColor(selectedTaskList.priority)">mdi-flag</v-icon>
            {{ selectedTaskList.title }}
            <v-spacer />
            <v-btn icon size="small" @click="showItemsDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-subtitle class="mt-2">
            {{ selectedTaskList.description }}
          </v-card-subtitle>
          <v-divider />
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-4">
              <h3 class="text-h6">Task Items</h3>
              <v-btn size="small" color="#12086F" @click="showAddItemDialog = true">
                <v-icon start>mdi-plus</v-icon>
                Add Item
              </v-btn>
            </div>
            
            <v-list v-if="selectedTaskList.items && selectedTaskList.items.length > 0">
              <v-list-item
                v-for="item in selectedTaskList.items"
                :key="item.item_id || item.id"
                class="mb-2"
              >
                <template v-slot:prepend>
                  <v-checkbox
                    :model-value="item.status === 'completed'"
                    @update:model-value="toggleItemCompletion(item)"
                    hide-details
                  />
                </template>
                <v-list-item-title :class="{ 'text-decoration-line-through text-grey': item.status === 'completed' }">
                  {{ item.title }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="item.description">
                  {{ item.description }}
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-chip v-if="item.completedAt || item.completed_at" size="x-small" color="success" variant="tonal">
                    {{ formatDate(item.completedAt || item.completed_at) }}
                  </v-chip>
                  <v-btn icon size="small" variant="text" @click="deleteTaskItem(item.item_id || item.id)">
                    <v-icon size="small">mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            
            <v-card v-else class="text-center pa-6 bg-grey-lighten-4">
              <v-icon size="48" color="grey-lighten-1">mdi-clipboard-outline</v-icon>
              <p class="text-grey mt-2 mb-0">No items yet. Add some tasks to get started!</p>
            </v-card>
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- Add Task Item Dialog -->
      <v-dialog v-model="showAddItemDialog" max-width="500">
        <v-card>
          <v-card-title class="text-h6">Add Task Item</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newItem.title"
              label="Task Title"
              required
              class="mb-3"
            />
            <v-textarea
              v-model="newItem.description"
              label="Description (optional)"
              rows="2"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="showAddItemDialog = false">Cancel</v-btn>
            <v-btn color="#12086F" @click="addTaskItem">Add</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.task-card {
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>