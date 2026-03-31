<script setup>
import { ref, computed, onMounted } from 'vue';
import EmployerService from '../services/employerServices.js';
import Utils from '../config/utils.js';
import EmployerLayout from '../components/EmployerLayout.vue';

const user = ref(null);
const loading = ref(false);
const savingItem = ref(false);

const taskLists = ref([]);
const tab = ref('all');

const showCreateDialog = ref(false);
const showItemsDialog = ref(false);
const showAddItemDialog = ref(false);
const showDeleteConfirm = ref(false);
const taskToDelete = ref(null);

const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('success');

const newTask = ref({
  title: '',
  description: '',
  shiftType: 'all_day',
  recursDaily: false,
  isTemplate: false,
  priority: 'medium'
});

const newItem = ref({ title: '', description: '' });
const selectedTaskList = ref(null);

// ─── COMPUTED ──────────────────────────────────────────────────────────────

const todayTasks = computed(() =>
  taskLists.value.filter(t => {
    if (t.isTemplate || t.is_template) return false;
    return t.recursDaily || t.recurs_daily;
  })
);

const templateTasks = computed(() =>
  taskLists.value.filter(t => t.isTemplate || t.is_template)
);

const priorityConfig = {
  urgent: { color: 'error', icon: 'mdi-alert-circle' },
  high:   { color: 'warning', icon: 'mdi-arrow-up-circle' },
  medium: { color: 'info', icon: 'mdi-minus-circle' },
  low:    { color: 'success', icon: 'mdi-arrow-down-circle' },
};

const getPriorityColor = p => priorityConfig[p]?.color || 'grey';
const getPriorityIcon  = p => priorityConfig[p]?.icon  || 'mdi-circle';

// ─── HELPERS ───────────────────────────────────────────────────────────────

// ✅ FIX: Resolve the real PK regardless of naming convention
const getTaskId = (task) => task?.tasklist_id ?? task?.tasklistId ?? task?.id ?? null;
const getItemId = (item) => item?.item_id ?? item?.itemId ?? item?.id ?? null;

const showSnackbar = (msg, color = 'success') => {
  snackbarMessage.value = msg;
  snackbarColor.value = color;
  snackbar.value = true;
};

// ─── DATA LOADING ──────────────────────────────────────────────────────────

const loadTaskLists = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllTaskLists();
    taskLists.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error loading task lists:', err);
    showSnackbar('Error loading task lists', 'error');
  } finally {
    loading.value = false;
  }
};

// ✅ FIX: Use correct PK field to load items
const loadTaskListItems = async (task) => {
  const id = getTaskId(task);
  if (!id) {
    console.error('Cannot load items: no valid task ID found', task);
    return;
  }
  try {
    // Try the correct endpoint first
    const res = await EmployerService.getTaskItemsByList(id);
    const items = Array.isArray(res.data) ? res.data : [];
    selectedTaskList.value = { ...task, items };
  } catch (err) {
    console.error('Error loading task items:', err);
    showSnackbar('Error loading task items', 'error');
    selectedTaskList.value = { ...task, items: [] };
  }
};

// ─── TASK LIST ACTIONS ─────────────────────────────────────────────────────

const createTaskList = async () => {
  if (!newTask.value.title.trim()) {
    showSnackbar('Title is required', 'error');
    return;
  }
  loading.value = true;
  try {
    const userId = user.value?.user_id || user.value?.userId || user.value?.id;
    await EmployerService.createTaskList({
      title: newTask.value.title,
      description: newTask.value.description || null,
      shiftType: newTask.value.shiftType,
      recursDaily: newTask.value.recursDaily,
      isTemplate: newTask.value.isTemplate,
      priority: newTask.value.priority,
      locationId: user.value?.work_location || null,
      createdBy: userId,
      createdAt: Date.now()
    });
    showSnackbar('Task list created!', 'success');
    showCreateDialog.value = false;
    resetNewTask();
    await loadTaskLists();
  } catch (err) {
    console.error('Error creating task list:', err);
    showSnackbar('Error creating task list', 'error');
  } finally {
    loading.value = false;
  }
};

const openItemsDialog = async (task) => {
  selectedTaskList.value = { ...task, items: [] };
  showItemsDialog.value = true;
  await loadTaskListItems(task);
};

// ✅ FIX: Send correct tasklistId field that backend expects
const addTaskItem = async () => {
  if (!newItem.value.title.trim()) {
    showSnackbar('Task title is required', 'error');
    return;
  }

  const taskId = getTaskId(selectedTaskList.value);
  if (!taskId) {
    showSnackbar('Cannot add item: task list ID not found', 'error');
    console.error('selectedTaskList has no valid ID:', selectedTaskList.value);
    return;
  }

  savingItem.value = true;
  try {
    await EmployerService.createTaskItem({
      tasklistId: taskId,   // ✅ backend expects 'tasklistId'
      title: newItem.value.title.trim(),
      description: newItem.value.description || null,
    });
    showSnackbar('Task item added!', 'success');
    showAddItemDialog.value = false;
    resetNewItem();
    await loadTaskListItems(selectedTaskList.value);
  } catch (err) {
    console.error('Error adding task item:', err);
    showSnackbar('Error adding task item', 'error');
  } finally {
    savingItem.value = false;
  }
};

const toggleItemCompletion = async (item) => {
  const itemId = getItemId(item);
  if (!itemId) return;
  try {
    const newStatus = item.status === 'completed' ? 'active' : 'completed';
    await EmployerService.updateTaskItem(itemId, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? Date.now() : null,
    });
    await loadTaskListItems(selectedTaskList.value);
  } catch (err) {
    console.error('Error toggling completion:', err);
    showSnackbar('Error updating item', 'error');
  }
};

const deleteTaskItem = async (item) => {
  const itemId = getItemId(item);
  if (!itemId) return;
  try {
    await EmployerService.deleteTaskItem(itemId);
    showSnackbar('Item deleted', 'success');
    await loadTaskListItems(selectedTaskList.value);
  } catch (err) {
    console.error('Error deleting task item:', err);
    showSnackbar('Error deleting item', 'error');
  }
};

const confirmDeleteTaskList = (task) => {
  taskToDelete.value = task;
  showDeleteConfirm.value = true;
};

const deleteTaskList = async () => {
  const id = getTaskId(taskToDelete.value);
  if (!id) return;
  try {
    await EmployerService.deleteTaskList(id);
    showSnackbar('Task list deleted', 'success');
    showDeleteConfirm.value = false;
    taskToDelete.value = null;
    if (showItemsDialog.value) showItemsDialog.value = false;
    await loadTaskLists();
  } catch (err) {
    console.error('Error deleting task list:', err);
    showSnackbar('Error deleting task list', 'error');
  }
};

// ─── RESET HELPERS ─────────────────────────────────────────────────────────

const resetNewTask = () => {
  newTask.value = { title: '', description: '', shiftType: 'all_day', recursDaily: false, isTemplate: false, priority: 'medium' };
};

const resetNewItem = () => {
  newItem.value = { title: '', description: '' };
};

const completedCount = (task) => {
  const items = task.items || [];
  return items.filter(i => i.status === 'completed').length;
};

onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadTaskLists();
});
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Task Management</h1>
          <p class="text-body-2 text-grey">Create and manage task lists for your team</p>
        </div>
        <v-btn color="#12086F" prepend-icon="mdi-plus" size="large" @click="showCreateDialog = true">
          New Task List
        </v-btn>
      </div>

      <!-- Tabs -->
      <v-tabs v-model="tab" color="#12086F" class="mb-5" density="comfortable">
        <v-tab value="all">
          <v-icon start size="small">mdi-format-list-checkbox</v-icon>
          All Lists
          <v-chip size="x-small" class="ml-2" color="#12086F" variant="tonal">{{ taskLists.length }}</v-chip>
        </v-tab>
        <v-tab value="today">
          <v-icon start size="small">mdi-calendar-today</v-icon>
          Daily
          <v-chip v-if="todayTasks.length" size="x-small" class="ml-2" color="success" variant="tonal">{{ todayTasks.length }}</v-chip>
        </v-tab>
        <v-tab value="templates">
          <v-icon start size="small">mdi-content-save</v-icon>
          Templates
          <v-chip v-if="templateTasks.length" size="x-small" class="ml-2" color="#9C27B0" variant="tonal">{{ templateTasks.length }}</v-chip>
        </v-tab>
      </v-tabs>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="40" />
      </div>

      <template v-else>
        <!-- ALL TASKS TAB -->
        <v-window v-model="tab">
          <v-window-item value="all">
            <v-row v-if="taskLists.length > 0">
              <v-col v-for="task in taskLists" :key="getTaskId(task)" cols="12" sm="6" lg="4">
                <v-card
                  variant="outlined"
                  rounded="lg"
                  class="task-card"
                  hover
                  @click="openItemsDialog(task)"
                >
                  <div class="task-card-accent" :class="`bg-${getPriorityColor(task.priority)}`" />
                  <v-card-text class="pa-4">
                    <div class="d-flex align-start justify-space-between mb-2">
                      <div class="flex-grow-1 mr-2">
                        <div class="text-body-1 font-weight-bold navy-text mb-1">{{ task.title }}</div>
                        <p v-if="task.description" class="text-caption text-grey mb-0">{{ task.description }}</p>
                      </div>
                      <v-btn
                        icon="mdi-delete"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click.stop="confirmDeleteTaskList(task)"
                      />
                    </div>

                    <div class="d-flex flex-wrap ga-1 mt-3">
                      <v-chip size="x-small" :color="getPriorityColor(task.priority)" variant="tonal">
                        <v-icon start size="x-small">{{ getPriorityIcon(task.priority) }}</v-icon>
                        {{ task.priority || 'medium' }}
                      </v-chip>
                      <v-chip v-if="task.isTemplate || task.is_template" size="x-small" color="#9C27B0" variant="tonal">
                        <v-icon start size="x-small">mdi-content-save</v-icon>
                        Template
                      </v-chip>
                      <v-chip v-if="task.recursDaily || task.recurs_daily" size="x-small" color="teal" variant="tonal">
                        <v-icon start size="x-small">mdi-sync</v-icon>
                        Daily
                      </v-chip>
                      <v-chip size="x-small" color="grey" variant="tonal">
                        {{ (task.shiftType || task.shift_type || 'all day').replace('_', ' ') }}
                      </v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <div v-else class="text-center py-16">
              <v-icon size="72" color="grey-lighten-2" class="mb-4">mdi-clipboard-text-outline</v-icon>
              <div class="text-h6 text-grey mb-2">No task lists yet</div>
              <p class="text-body-2 text-grey mb-6">Create your first task list to get your team organized</p>
              <v-btn color="#12086F" prepend-icon="mdi-plus" @click="showCreateDialog = true">Create Task List</v-btn>
            </div>
          </v-window-item>

          <!-- TODAY/DAILY TAB -->
          <v-window-item value="today">
            <v-row v-if="todayTasks.length > 0">
              <v-col v-for="task in todayTasks" :key="getTaskId(task)" cols="12" sm="6" lg="4">
                <v-card variant="outlined" rounded="lg" class="task-card" hover @click="openItemsDialog(task)">
                  <div class="task-card-accent bg-teal" />
                  <v-card-text class="pa-4">
                    <div class="text-body-1 font-weight-bold navy-text mb-1">{{ task.title }}</div>
                    <p v-if="task.description" class="text-caption text-grey">{{ task.description }}</p>
                    <v-chip size="x-small" color="teal" variant="tonal" class="mt-2">
                      <v-icon start size="x-small">mdi-sync</v-icon>
                      Recurs Daily
                    </v-chip>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <div v-else class="text-center py-16">
              <v-icon size="72" color="grey-lighten-2" class="mb-4">mdi-calendar-check-outline</v-icon>
              <div class="text-h6 text-grey">No daily recurring tasks</div>
              <p class="text-body-2 text-grey mt-2">Create a task list and enable "Recurs Daily" to see it here</p>
            </div>
          </v-window-item>

          <!-- TEMPLATES TAB -->
          <v-window-item value="templates">
            <v-row v-if="templateTasks.length > 0">
              <v-col v-for="task in templateTasks" :key="getTaskId(task)" cols="12" sm="6" lg="4">
                <v-card variant="outlined" rounded="lg" class="task-card template-glow" hover @click="openItemsDialog(task)">
                  <div class="task-card-accent bg-purple" />
                  <v-card-text class="pa-4">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="text-body-1 font-weight-bold navy-text">{{ task.title }}</div>
                      <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="confirmDeleteTaskList(task)" />
                    </div>
                    <p v-if="task.description" class="text-caption text-grey">{{ task.description }}</p>
                    <v-chip size="x-small" color="#9C27B0" variant="tonal" class="mt-2">
                      <v-icon start size="x-small">mdi-content-save</v-icon>
                      Reusable Template
                    </v-chip>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <div v-else class="text-center py-16">
              <v-icon size="72" color="grey-lighten-2" class="mb-4">mdi-content-save-outline</v-icon>
              <div class="text-h6 text-grey">No templates yet</div>
              <p class="text-body-2 text-grey mt-2">Check "Save as Template" when creating a task list</p>
            </div>
          </v-window-item>
        </v-window>
      </template>
    </v-container>

    <!-- ── CREATE TASK LIST DIALOG ─────────────────────────────────────── -->
    <v-dialog v-model="showCreateDialog" max-width="560">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-plus-circle</v-icon>
          Create Task List
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="newTask.title"
            label="Title *"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
            autofocus
          />
          <v-textarea
            v-model="newTask.description"
            label="Description"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
            color="#12086F"
          />
          <v-row dense class="mb-2">
            <v-col cols="6">
              <v-select
                v-model="newTask.priority"
                :items="['low','medium','high','urgent']"
                label="Priority"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="newTask.shiftType"
                :items="['morning','afternoon','evening','closing','all_day']"
                label="Shift Type"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
          </v-row>
          <v-checkbox v-model="newTask.recursDaily" label="Recurs Daily" color="#12086F" density="compact" hide-details class="mb-1" />
          <v-checkbox v-model="newTask.isTemplate" label="Save as Template (reusable)" color="#9C27B0" density="compact" hide-details />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCreateDialog = false; resetNewTask()">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="loading" @click="createTaskList">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── TASK ITEMS DIALOG ───────────────────────────────────────────── -->
    <v-dialog v-model="showItemsDialog" max-width="680">
      <v-card rounded="lg" v-if="selectedTaskList">
        <v-card-title class="pa-5 pb-3 d-flex align-center justify-space-between">
          <div>
            <div class="text-body-1 font-weight-bold navy-text">{{ selectedTaskList.title }}</div>
            <div class="text-caption text-grey mt-1">{{ selectedTaskList.description }}</div>
          </div>
          <div class="d-flex ga-2 align-center">
            <v-chip
              v-if="selectedTaskList.items?.length"
              size="small"
              color="#12086F"
              variant="tonal"
            >
              {{ completedCount(selectedTaskList) }}/{{ selectedTaskList.items.length }} done
            </v-chip>
            <v-btn icon="mdi-close" size="small" variant="text" @click="showItemsDialog = false" />
          </div>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-0" style="max-height: 420px; overflow-y: auto;">
          <!-- Items list -->
          <div v-if="selectedTaskList.items?.length > 0">
            <div
              v-for="item in selectedTaskList.items"
              :key="getItemId(item)"
              class="task-item-row pa-4"
              :class="{ 'task-item-done': item.status === 'completed' }"
            >
              <div class="d-flex align-center ga-3">
                <v-checkbox
                  :model-value="item.status === 'completed'"
                  @update:model-value="toggleItemCompletion(item)"
                  hide-details
                  density="compact"
                  color="#12086F"
                />
                <div class="flex-grow-1">
                  <div
                    class="text-body-2 font-weight-medium"
                    :class="item.status === 'completed' ? 'text-decoration-line-through text-grey' : 'navy-text'"
                  >
                    {{ item.title }}
                  </div>
                  <div v-if="item.description" class="text-caption text-grey">{{ item.description }}</div>
                </div>
                <v-chip v-if="item.status === 'completed'" size="x-small" color="success" variant="tonal">Done</v-chip>
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="deleteTaskItem(item)" />
              </div>
            </div>
          </div>
          <div v-else class="text-center pa-10">
            <v-icon size="56" color="grey-lighten-2" class="mb-3">mdi-clipboard-outline</v-icon>
            <div class="text-body-2 text-grey">No items yet. Add your first task below.</div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 justify-space-between">
          <v-btn
            prepend-icon="mdi-plus"
            color="#12086F"
            variant="tonal"
            @click="showAddItemDialog = true"
          >
            Add Item
          </v-btn>
          <v-btn variant="text" @click="showItemsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── ADD ITEM DIALOG ─────────────────────────────────────────────── -->
    <v-dialog v-model="showAddItemDialog" max-width="460">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Add Task Item
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="newItem.title"
            label="Task Title *"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
            autofocus
            @keyup.enter="addTaskItem"
          />
          <v-textarea
            v-model="newItem.description"
            label="Description (optional)"
            variant="outlined"
            density="compact"
            rows="2"
            color="#12086F"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddItemDialog = false; resetNewItem()">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="savingItem" @click="addTaskItem">Add Item</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── DELETE CONFIRM ──────────────────────────────────────────────── -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Delete Task List</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          Are you sure you want to delete <strong>{{ taskToDelete?.title }}</strong>? This cannot be undone.
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="deleteTaskList">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
      {{ snackbarMessage }}
    </v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }

.task-card {
  border-color: #e8e8e8;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  position: relative;
}
.task-card:hover {
  border-color: #12086F;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(18, 8, 111, 0.12);
}
.task-card-accent {
  height: 4px;
  width: 100%;
}
.template-glow:hover {
  border-color: #9C27B0;
  box-shadow: 0 6px 20px rgba(156, 39, 176, 0.15);
}
.task-item-row {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}
.task-item-row:hover { background: #fafafa; }
.task-item-row:last-child { border-bottom: none; }
.task-item-done { background: #f9f9f9; }
</style>