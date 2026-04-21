<script setup>
import { ref, computed, onMounted } from 'vue';
import EmployerService from '../services/employerServices.js';
import Utils from '../config/utils.js';
import EmployerLayout from '../components/EmployerLayout.vue';

const user     = ref(null);
const loading  = ref(false);
const savingItem = ref(false);

const taskLists  = ref([]);
const employees  = ref([]);
const shifts     = ref([]);
const tab        = ref('all');

const showCreateDialog  = ref(false);
const showItemsDialog   = ref(false);
const showAddItemDialog = ref(false);
const showDeleteConfirm = ref(false);
const taskToDelete      = ref(null);

const snackbar        = ref(false);
const snackbarMessage = ref('');
const snackbarColor   = ref('success');

// ── NEW TASK FORM ─────────────────────────────────────────────────────────
// Tasks are assigned to a SHIFT (not individual employees).
// Anyone working that shift can complete the tasks.
const newTask = ref({
  title: '',
  description: '',
  shiftType: 'all_day',
  recursDaily: false,
  isTemplate: false,
  priority: 'medium',
  shiftId: null,
});

const newItem = ref({ title: '', description: '' });
const selectedTaskList = ref(null);


const templateTasks = computed(() =>
  taskLists.value.filter(t => t.isTemplate || t.is_template)
);

const allNonTemplateTasks = computed(() =>
  taskLists.value.filter(t => !(t.isTemplate || t.is_template))
);

const priorityConfig = {
  urgent: { color: 'error',   icon: 'mdi-alert-circle' },
  high:   { color: 'warning', icon: 'mdi-arrow-up-circle' },
  medium: { color: 'info',    icon: 'mdi-minus-circle' },
  low:    { color: 'success', icon: 'mdi-arrow-down-circle' },
};
const getPriorityColor = p => priorityConfig[p]?.color || 'grey';
const getPriorityIcon  = p => priorityConfig[p]?.icon  || 'mdi-circle';

const getTaskId = (task) => task?.tasklist_id ?? task?.tasklistId ?? task?.id ?? null;
const getItemId = (item) => item?.item_id ?? item?.itemId ?? item?.id ?? null;

// Shift display helper
const getShiftLabel = (shiftId) => {
  if (!shiftId) return null;
  const s = shifts.value.find(sh => (sh.shift_id || sh.id) === shiftId);
  if (!s) return null;
  const d = new Date(Number(s.shiftTime || s.shift_time));
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatMinutes(s.startTime || s.start_time)} – ${formatMinutes(s.endTime || s.end_time)}`;
};

const formatMinutes = (min) => {
  if (!min && min !== 0) return '';
  const h = Math.floor(min / 60); const m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2,'0')}${h >= 12 ? 'PM' : 'AM'}`;
};

// Get the name of who completed an item
const getCompleterName = (item) => {
  const completedBy = item.completedBy || item.completed_by;
  if (!completedBy) return null;
  const emp = employees.value.find(e => (e.user_id || e.userId) === completedBy);
  if (emp) return `${emp.fName || emp.first_name || ''} ${emp.lName || emp.last_name || ''}`.trim();
  // Could be the employer themselves
  const myId = user.value?.user_id || user.value?.userId;
  if (String(completedBy) === String(myId)) {
    const u = user.value;
    return `${u.fName || u.first_name || ''} ${u.lName || u.last_name || ''}`.trim() || 'You';
  }
  return `User #${completedBy}`;
};

const shiftOptions = computed(() =>
  shifts.value.map(s => {
    const d = new Date(Number(s.shiftTime || s.shift_time));
    return {
      title: `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatMinutes(s.startTime || s.start_time)} – ${formatMinutes(s.endTime || s.end_time)}`,
      value: s.shift_id || s.id,
    };
  })
);

const showSnackbar = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true; };

// ── DATA LOADING ──────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await Promise.all([loadTaskLists(), loadEmployees(), loadShifts()]);
});

const loadTaskLists = async () => {
  loading.value = true;
  try {
    const res  = await EmployerService.getAllTaskLists();
    taskLists.value = Array.isArray(res.data) ? res.data : [];
  } catch { showSnackbar('Error loading task lists', 'error'); }
  finally { loading.value = false; }
};

const loadEmployees = async () => {
  try {
    const res  = await EmployerService.getAllEmployees();
    const all  = Array.isArray(res.data) ? res.data : [];
    const myId = user.value?.user_id || user.value?.userId;
    employees.value = all.filter(u => u.role === 'employee' && (u.user_id || u.userId) !== myId);
  } catch {}
};

const loadShifts = async () => {
  try {
    const res = await EmployerService.getAllShifts();
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch {}
};

const loadTaskListItems = async (task) => {
  const id = getTaskId(task);
  if (!id) return;
  try {
    const res   = await EmployerService.getTaskItemsByList(id);
    const items = Array.isArray(res.data) ? res.data : [];
    selectedTaskList.value = { ...task, items };
  } catch { showSnackbar('Error loading task items', 'error'); selectedTaskList.value = { ...task, items: [] }; }
};

// ── TASK LIST ACTIONS ─────────────────────────────────────────────────────
const createTaskList = async () => {
  if (!newTask.value.title.trim()) { showSnackbar('Title is required', 'error'); return; }
  loading.value = true;
  try {
    const userId = user.value?.user_id || user.value?.userId;
    await EmployerService.createTaskList({
      title:       newTask.value.title,
      description: newTask.value.description || null,
      shiftType:   newTask.value.shiftType,
      recursDaily: newTask.value.recursDaily,
      isTemplate:  newTask.value.isTemplate,
      priority:    newTask.value.priority,
      shiftId:     newTask.value.shiftId || null,  // assigned to shift, not a person
      locationId:  user.value?.work_location || null,
      createdBy:   userId,
      createdAt:   Date.now(),
    });
    showSnackbar('Task list created!', 'success');
    showCreateDialog.value = false;
    resetNewTask();
    await loadTaskLists();
  } catch { showSnackbar('Error creating task list', 'error'); }
  finally { loading.value = false; }
};

const openItemsDialog = async (task) => {
  selectedTaskList.value = { ...task, items: [] };
  showItemsDialog.value  = true;
  await loadTaskListItems(task);
};

const addTaskItem = async () => {
  if (!newItem.value.title.trim()) { showSnackbar('Task title is required', 'error'); return; }
  const taskId = getTaskId(selectedTaskList.value);
  if (!taskId) { showSnackbar('Cannot add item: task list ID not found', 'error'); return; }
  savingItem.value = true;
  try {
    await EmployerService.createTaskItem({
      tasklistId:  taskId,
      title:       newItem.value.title.trim(),
      description: newItem.value.description || null,
      status:      'active',
    });
    showSnackbar('Task item added!', 'success');
    showAddItemDialog.value = false;
    resetNewItem();
    await loadTaskListItems(selectedTaskList.value);
  } catch { showSnackbar('Error adding task item', 'error'); }
  finally { savingItem.value = false; }
};

// Toggle: active ↔ completed, recording who did it
const toggleItemCompletion = async (item) => {
  const itemId = getItemId(item);
  if (!itemId) return;
  try {
    const newStatus = item.status === 'completed' ? 'active' : 'completed';
    const myId = user.value?.user_id || user.value?.userId;
    await EmployerService.updateTaskItem(itemId, {
      status:      newStatus,
      completedBy: newStatus === 'completed' ? myId : null,
      completedAt: newStatus === 'completed' ? Date.now() : null,
    });
    await loadTaskListItems(selectedTaskList.value);
  } catch { showSnackbar('Error updating item', 'error'); }
};

const deleteTaskItem = async (item) => {
  const itemId = getItemId(item);
  if (!itemId) return;
  try {
    await EmployerService.deleteTaskItem(itemId);
    showSnackbar('Item deleted', 'success');
    await loadTaskListItems(selectedTaskList.value);
  } catch { showSnackbar('Error deleting item', 'error'); }
};

const confirmDeleteTaskList = (task) => { taskToDelete.value = task; showDeleteConfirm.value = true; };

const deleteTaskList = async () => {
  const id = getTaskId(taskToDelete.value);
  if (!id) return;
  try {
    await EmployerService.deleteTaskList(id);
    showSnackbar('Task list deleted', 'success');
    showDeleteConfirm.value = false;
    taskToDelete.value      = null;
    if (showItemsDialog.value) showItemsDialog.value = false;
    await loadTaskLists();
  } catch { showSnackbar('Error deleting task list', 'error'); }
};

const resetNewTask = () => {
  newTask.value = { title: '', description: '', shiftType: 'all_day', recursDaily: false, isTemplate: false, priority: 'medium', shiftId: null };
};
const resetNewItem = () => { newItem.value = { title: '', description: '' }; };
const completedCount = (task) => (task.items || []).filter(i => i.status === 'completed').length;
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">

      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Task Management</h1>
          <p class="text-body-2 text-grey">Create task lists and assign them to shifts — anyone on that shift can complete them</p>
        </div>
        <v-btn color="#12086F" prepend-icon="mdi-plus" size="large" @click="showCreateDialog = true">New Task List</v-btn>
      </div>

      <!-- Only two tabs: All Lists and Templates (removed Daily) -->
      <v-tabs v-model="tab" color="#12086F" class="mb-5" density="comfortable">
        <v-tab value="all">
          <v-icon start size="small">mdi-format-list-checkbox</v-icon>All Lists
          <v-chip size="x-small" class="ml-2" color="#12086F" variant="tonal">{{ allNonTemplateTasks.length }}</v-chip>
        </v-tab>
        <v-tab value="templates">
          <v-icon start size="small">mdi-content-save</v-icon>Templates
          <v-chip v-if="templateTasks.length" size="x-small" class="ml-2" color="#9C27B0" variant="tonal">{{ templateTasks.length }}</v-chip>
        </v-tab>
      </v-tabs>

      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="40" />
      </div>

      <template v-else>
        <v-window v-model="tab">

          <!-- ALL LISTS -->
          <v-window-item value="all">
            <v-row v-if="allNonTemplateTasks.length > 0">
              <v-col v-for="task in allNonTemplateTasks" :key="getTaskId(task)" cols="12" sm="6" lg="4">
                <v-card variant="outlined" rounded="lg" class="task-card" hover @click="openItemsDialog(task)">
                  <div class="task-card-accent" :class="`bg-${getPriorityColor(task.priority)}`" />
                  <v-card-text class="pa-4">
                    <div class="d-flex align-start justify-space-between mb-2">
                      <div class="flex-grow-1 mr-2">
                        <div class="text-body-1 font-weight-bold navy-text mb-1">{{ task.title }}</div>
                        <p v-if="task.description" class="text-caption text-grey mb-0">{{ task.description }}</p>
                      </div>
                      <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="confirmDeleteTaskList(task)" />
                    </div>

                    <!-- Shift link -->
                    <div v-if="task.shiftId || task.shift_id" class="d-flex align-center ga-1 mb-2">
                      <v-icon size="12" color="#9C27B0">mdi-calendar-clock</v-icon>
                      <span class="text-caption text-grey">{{ getShiftLabel(task.shiftId || task.shift_id) || 'Linked to shift' }}</span>
                    </div>
                    <div v-else class="d-flex align-center ga-1 mb-2">
                      <v-icon size="12" color="#6b7280">mdi-calendar-blank</v-icon>
                      <span class="text-caption text-grey">Not linked to a shift</span>
                    </div>

                    <div class="d-flex flex-wrap ga-1 mt-2">
                      <v-chip size="x-small" :color="getPriorityColor(task.priority)" variant="tonal">
                        <v-icon start size="x-small">{{ getPriorityIcon(task.priority) }}</v-icon>
                        {{ task.priority || 'medium' }}
                      </v-chip>
                      <v-chip v-if="task.recursDaily || task.recurs_daily" size="x-small" color="teal" variant="tonal">
                        <v-icon start size="x-small">mdi-repeat</v-icon>Daily
                      </v-chip>
                      <v-chip size="x-small" color="grey" variant="tonal">{{ (task.shiftType || task.shift_type || 'all day').replace('_', ' ') }}</v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <div v-else class="text-center py-16">
              <v-icon size="72" color="grey-lighten-2" class="mb-4">mdi-clipboard-text-outline</v-icon>
              <div class="text-h6 text-grey mb-2">No task lists yet</div>
              <v-btn color="#12086F" prepend-icon="mdi-plus" @click="showCreateDialog = true">Create Task List</v-btn>
            </div>
          </v-window-item>

          <!-- TEMPLATES -->
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
                      <v-icon start size="x-small">mdi-content-save</v-icon>Reusable Template
                    </v-chip>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <div v-else class="text-center py-16">
              <v-icon size="72" color="grey-lighten-2" class="mb-4">mdi-content-save-outline</v-icon>
              <div class="text-h6 text-grey">No templates yet</div>
            </div>
          </v-window-item>
        </v-window>
      </template>
    </v-container>

    <!-- CREATE DIALOG -->
    <v-dialog v-model="showCreateDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-plus-circle</v-icon>Create Task List
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" color="#12086F" class="mb-4">
            <div class="text-caption">
              <v-icon size="small" class="mr-1">mdi-information</v-icon>
              Tasks are assigned to a <strong>shift</strong>, not a specific person. Anyone working that shift can complete them.
            </div>
          </v-alert>

          <v-text-field v-model="newTask.title" label="Title *" variant="outlined" density="compact" class="mb-3" color="#12086F" autofocus />
          <v-textarea v-model="newTask.description" label="Description" variant="outlined" density="compact" rows="2" class="mb-3" color="#12086F" />
          <v-row dense class="mb-3">
            <v-col cols="6">
              <v-select v-model="newTask.priority" :items="['low','medium','high','urgent']" label="Priority" variant="outlined" density="compact" color="#12086F" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="newTask.shiftType" :items="['morning','afternoon','evening','closing','all_day']" label="Shift Type" variant="outlined" density="compact" color="#12086F" />
            </v-col>
          </v-row>

          <!-- Shift connection (replaces employee assignment) -->
          <v-select
            v-model="newTask.shiftId"
            :items="shiftOptions"
            label="Connect to Shift (optional)"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#9C27B0"
            clearable
            prepend-inner-icon="mdi-calendar-clock"
            hint="Links this task list to a specific shift"
            persistent-hint
          />

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

    <!-- ITEMS DIALOG -->
    <v-dialog v-model="showItemsDialog" max-width="680">
      <v-card rounded="lg" v-if="selectedTaskList">
        <v-card-title class="pa-5 pb-3 d-flex align-center justify-space-between">
          <div>
            <div class="text-body-1 font-weight-bold navy-text">{{ selectedTaskList.title }}</div>
            <div class="text-caption text-grey mt-1">{{ selectedTaskList.description }}</div>
            <div class="d-flex ga-2 mt-1 flex-wrap">
              <v-chip v-if="selectedTaskList.shiftId || selectedTaskList.shift_id" size="x-small" color="#9C27B0" variant="tonal">
                <v-icon start size="x-small">mdi-calendar-clock</v-icon>
                {{ getShiftLabel(selectedTaskList.shiftId || selectedTaskList.shift_id) }}
              </v-chip>
              <v-chip v-if="selectedTaskList.recursDaily || selectedTaskList.recurs_daily" size="x-small" color="teal" variant="tonal">
                <v-icon start size="x-small">mdi-repeat</v-icon>Daily
              </v-chip>
            </div>
          </div>
          <div class="d-flex ga-2 align-center">
            <v-chip v-if="selectedTaskList.items?.length" size="small" color="#12086F" variant="tonal">
              {{ completedCount(selectedTaskList) }}/{{ selectedTaskList.items.length }} done
            </v-chip>
            <v-btn icon="mdi-close" size="small" variant="text" @click="showItemsDialog = false" />
          </div>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-0" style="max-height: 460px; overflow-y: auto;">
          <div v-if="selectedTaskList.items?.length > 0">
            <div
              v-for="item in selectedTaskList.items"
              :key="getItemId(item)"
              class="task-item-row pa-4"
              :class="{ 'task-item-done': item.status === 'completed' }"
            >
              <div class="d-flex align-center ga-3">
                <div class="flex-grow-1">
                  <div
                    class="text-body-2 font-weight-medium mb-1"
                    :class="item.status === 'completed' ? 'text-decoration-line-through text-grey' : 'navy-text'"
                  >
                    {{ item.title }}
                  </div>
                  <div v-if="item.description" class="text-caption text-grey mb-1">{{ item.description }}</div>

                  <!-- Who completed it -->
                  <div v-if="item.status === 'completed'" class="d-flex align-center ga-1">
                    <v-icon size="12" color="success">mdi-account-check</v-icon>
                    <span class="text-caption" style="color:#2e7d32;">
                      Completed by <strong>{{ getCompleterName(item) || 'Unknown' }}</strong>
                    </span>
                  </div>
                </div>

                <!-- Better check-off button -->
                <div class="d-flex align-center ga-2">
                  <v-btn
                    v-if="item.status !== 'completed'"
                    size="small"
                    color="#12086F"
                    variant="tonal"
                    prepend-icon="mdi-check"
                    @click="toggleItemCompletion(item)"
                    class="text-none"
                  >
                    Mark Done
                  </v-btn>
                  <v-btn
                    v-else
                    size="small"
                    color="success"
                    variant="flat"
                    prepend-icon="mdi-check-circle"
                    @click="toggleItemCompletion(item)"
                    class="text-none"
                  >
                    Done
                  </v-btn>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="deleteTaskItem(item)" />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center pa-10">
            <v-icon size="56" color="grey-lighten-2" class="mb-3">mdi-clipboard-outline</v-icon>
            <div class="text-body-2 text-grey">No items yet. Add some tasks below.</div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 justify-space-between">
          <v-btn prepend-icon="mdi-plus" color="#12086F" variant="tonal" @click="showAddItemDialog = true">Add Item</v-btn>
          <v-btn variant="text" @click="showItemsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ADD ITEM DIALOG -->
    <v-dialog v-model="showAddItemDialog" max-width="460">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Add Task Item</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field v-model="newItem.title" label="Task Title *" variant="outlined" density="compact" class="mb-3" color="#12086F" autofocus @keyup.enter="addTaskItem" />
          <v-textarea v-model="newItem.description" label="Description (optional)" variant="outlined" density="compact" rows="2" color="#12086F" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddItemDialog = false; resetNewItem()">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="savingItem" @click="addTaskItem">Add Item</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DELETE CONFIRM -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Delete Task List</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">Are you sure you want to delete <strong>{{ taskToDelete?.title }}</strong>? This cannot be undone.</v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="deleteTaskList">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.task-card { border-color: #e8e8e8; cursor: pointer; transition: all 0.2s; overflow: hidden; position: relative; }
.task-card:hover { border-color: #12086F; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(18,8,111,0.12); }
.task-card-accent { height: 4px; width: 100%; }
.template-glow:hover { border-color: #9C27B0; box-shadow: 0 6px 20px rgba(156,39,176,0.15); }
.task-item-row { border-bottom: 1px solid #f0f0f0; transition: background 0.15s; }
.task-item-row:hover { background: #fafafa; }
.task-item-row:last-child { border-bottom: none; }
.task-item-done { background: #f0fdf4; }

/* Dark mode */
.v-theme--dark .task-item-done { background: #1a2e1a; }
.v-theme--dark .task-item-row:hover { background: #2a2a3e; }
.v-theme--dark .navy-text { color: #a8b4ff !important; }
</style>