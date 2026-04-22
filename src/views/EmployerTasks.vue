<script setup>
import { ref, computed, onMounted } from 'vue';
import EmployerService from '../services/employerServices.js';
import Utils from '../config/utils.js';
import EmployerLayout from '../components/EmployerLayout.vue';

const user       = ref(null);
const loading    = ref(false);
const savingItem = ref(false);
const assigning  = ref(false);

const taskLists = ref([]);
const employees = ref([]);
const shifts    = ref([]);

// Dialogs
const showCreateDialog  = ref(false);
const showItemsDialog   = ref(false);
const showAddItemDialog = ref(false);
const showAssignDialog  = ref(false);
const showDeleteConfirm = ref(false);
const taskToDelete      = ref(null);
const selectedTaskList  = ref(null);

const snackbar        = ref(false);
const snackbarMessage = ref('');
const snackbarColor   = ref('success');

// Yesterday audit
const yesterdayData    = ref([]);
const loadingYesterday = ref(false);
const expandedRows     = ref(new Set());
const showYesterday    = ref(false);

// Forms
const newTask = ref({ title: '', description: '', priority: 'medium', recursDaily: false });
const newItem = ref({ title: '', description: '' });
const assignForm = ref({
  tasklistId: null, employeeIds: [], shiftId: null,
  assignedDate: new Date().toISOString().split('T')[0],
});

// Computed
const priorityConfig = {
  urgent: { color: 'error',   icon: 'mdi-alert-circle',      label: 'Urgent'  },
  high:   { color: 'warning', icon: 'mdi-arrow-up-circle',   label: 'High'    },
  medium: { color: 'info',    icon: 'mdi-minus-circle',      label: 'Medium'  },
  low:    { color: 'success', icon: 'mdi-arrow-down-circle', label: 'Low'     },
};
const getPriorityColor = p => priorityConfig[p]?.color || 'grey';
const getPriorityIcon  = p => priorityConfig[p]?.icon  || 'mdi-circle';
const getPriorityLabel = p => priorityConfig[p]?.label || 'Medium';

const getTaskId = t => t?.tasklist_id ?? t?.tasklistId ?? t?.id ?? null;
const getItemId = i => i?.item_id ?? i?.itemId ?? i?.id ?? null;

const employeeOptions = computed(() =>
  employees.value.map(e => ({
    title: `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`.trim() || e.email,
    value: e.user_id || e.userId,
  }))
);

const taskOptions = computed(() =>
  taskLists.value.map(t => ({ title: t.title, value: getTaskId(t) }))
);

const shiftOptions = computed(() =>
  shifts.value.map(s => {
    const d = new Date(Number(s.shiftTime || s.shift_time));
    return {
      title: `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtMin(s.startTime || s.start_time)} – ${fmtMin(s.endTime || s.end_time)}`,
      value: s.shift_id || s.id,
    };
  })
);

const yesterdaySummary = computed(() => {
  const total     = yesterdayData.value.reduce((s, a) => s + a.total_items, 0);
  const completed = yesterdayData.value.reduce((s, a) => s + a.completed_items, 0);
  return { total, completed, pct: total ? Math.round((completed / total) * 100) : 0 };
});

const fmtMin = (min) => {
  if (!min && min !== 0) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'PM' : 'AM'}`;
};

const showSnackbar = (msg, color = 'success') => {
  snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true;
};
const completedCount = task => (task.items || []).filter(i => i.status === 'completed').length;
const toggleRow = (id) => {
  if (expandedRows.value.has(id)) expandedRows.value.delete(id);
  else expandedRows.value.add(id);
};
const yesterdayDate = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

// Load
onMounted(async () => {
  user.value = Utils.getStore('user');
  await Promise.all([loadTaskLists(), loadEmployees(), loadShifts()]);
});

const loadTaskLists = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllTaskLists();
    taskLists.value = Array.isArray(res.data) ? res.data : [];
  } catch { showSnackbar('Error loading task lists', 'error'); }
  finally { loading.value = false; }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const all = Array.isArray(res.data) ? res.data : [];
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

const loadYesterdayAudit = async () => {
  loadingYesterday.value = true;
  yesterdayData.value    = [];
  try {
    const res = await EmployerService.getYesterdayTaskAudit();
    yesterdayData.value = Array.isArray(res.data) ? res.data : [];
  } catch { showSnackbar('Error loading audit', 'error'); }
  finally { loadingYesterday.value = false; }
};

const toggleYesterday = () => {
  showYesterday.value = !showYesterday.value;
  if (showYesterday.value && yesterdayData.value.length === 0) loadYesterdayAudit();
};

// Task CRUD
const createTaskList = async () => {
  if (!newTask.value.title.trim()) { showSnackbar('Title is required', 'error'); return; }
  loading.value = true;
  try {
    const userId = user.value?.user_id || user.value?.userId;
    await EmployerService.createTaskList({
      title: newTask.value.title, description: newTask.value.description || null,
      priority: newTask.value.priority, recursDaily: newTask.value.recursDaily,
      locationId: user.value?.work_location || null, createdBy: userId, createdAt: Date.now(),
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

const loadTaskListItems = async (task) => {
  const id = getTaskId(task);
  if (!id) return;
  try {
    const res = await EmployerService.getTaskItemsByList(id);
    selectedTaskList.value = { ...task, items: Array.isArray(res.data) ? res.data : [] };
  } catch {
    showSnackbar('Error loading items', 'error');
    selectedTaskList.value = { ...task, items: [] };
  }
};

const addTaskItem = async () => {
  if (!newItem.value.title.trim()) { showSnackbar('Title required', 'error'); return; }
  const taskId = getTaskId(selectedTaskList.value);
  if (!taskId) return;
  savingItem.value = true;
  try {
    await EmployerService.createTaskItem({
      tasklistId: taskId, title: newItem.value.title.trim(),
      description: newItem.value.description || null, status: 'active',
    });
    showSnackbar('Item added!', 'success');
    showAddItemDialog.value = false;
    resetNewItem();
    await loadTaskListItems(selectedTaskList.value);
  } catch { showSnackbar('Error adding item', 'error'); }
  finally { savingItem.value = false; }
};

const toggleItemCompletion = async (item) => {
  const itemId = getItemId(item);
  if (!itemId) return;
  try {
    const newStatus = item.status === 'completed' ? 'active' : 'completed';
    const myId = user.value?.user_id || user.value?.userId;
    await EmployerService.updateTaskItem(itemId, {
      status: newStatus,
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
    taskToDelete.value = null;
    if (showItemsDialog.value) showItemsDialog.value = false;
    await loadTaskLists();
  } catch { showSnackbar('Error deleting', 'error'); }
};

const openAssignDialog = (task = null) => {
  assignForm.value = {
    tasklistId: task ? getTaskId(task) : null, employeeIds: [], shiftId: null,
    assignedDate: new Date().toISOString().split('T')[0],
  };
  showAssignDialog.value = true;
};

const submitAssignment = async () => {
  if (!assignForm.value.tasklistId || assignForm.value.employeeIds.length === 0) {
    showSnackbar('Select a task list and at least one employee', 'error'); return;
  }
  assigning.value = true;
  try {
    const assignedDate = new Date(assignForm.value.assignedDate).getTime();
    await EmployerService.bulkAssignTask({
      tasklistId: assignForm.value.tasklistId,
      employeeIds: assignForm.value.employeeIds,
      shiftId: assignForm.value.shiftId || null,
      assignedDate,
    });
    showSnackbar(`Assigned to ${assignForm.value.employeeIds.length} employee(s)!`, 'success');
    showAssignDialog.value = false;
  } catch (err) {
    showSnackbar(err?.response?.data?.message || 'Error assigning task', 'error');
  } finally { assigning.value = false; }
};

const resetNewTask = () => { newTask.value = { title: '', description: '', priority: 'medium', recursDaily: false }; };
const resetNewItem = () => { newItem.value = { title: '', description: '' }; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Task Management</h1>
          <p class="text-body-2 text-grey">Create task lists and assign them to employees by day</p>
        </div>
        <div class="d-flex ga-2 flex-wrap">
          <v-btn color="#12086F" variant="tonal" prepend-icon="mdi-history" @click="toggleYesterday">
            {{ showYesterday ? 'Hide' : "Yesterday's" }} Audit
          </v-btn>
          <v-btn color="#12086F" variant="tonal" prepend-icon="mdi-account-check" @click="openAssignDialog()">
            Assign Task
          </v-btn>
          <v-btn color="#12086F" prepend-icon="mdi-plus" @click="showCreateDialog = true">
            New Task List
          </v-btn>
        </div>
      </div>

      <!-- Yesterday Audit (collapsible) -->
      <v-expand-transition>
        <div v-if="showYesterday" class="mb-6">
          <div v-if="loadingYesterday" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" size="36" />
          </div>
          <template v-else>
            <v-card v-if="yesterdayData.length > 0" variant="tonal" color="#12086F" rounded="lg" class="mb-4 pa-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-body-1 font-weight-bold" style="color:white;">{{ yesterdayDate() }}</div>
                  <div class="text-caption" style="color:rgba(255,255,255,0.8);">
                    {{ yesterdaySummary.completed }} of {{ yesterdaySummary.total }} items completed across {{ yesterdayData.length }} assignment(s)
                  </div>
                </div>
                <div class="text-h4 font-weight-bold" style="color:white;">{{ yesterdaySummary.pct }}%</div>
              </div>
              <v-progress-linear :model-value="yesterdaySummary.pct" color="white" bg-color="rgba(255,255,255,0.25)" rounded height="8" />
            </v-card>
            <div v-if="yesterdayData.length === 0" class="text-center py-8">
              <v-icon size="56" color="grey-lighten-2" class="mb-3">mdi-history</v-icon>
              <div class="text-body-1 text-grey">No tasks were assigned yesterday</div>
            </div>
            <v-card v-for="row in yesterdayData" :key="row.assignment_id" variant="outlined" rounded="lg" class="mb-3">
              <div class="d-flex align-center pa-4" style="cursor:pointer;" @click="toggleRow(row.assignment_id)">
                <v-chip size="small" :color="row.completion_pct === 100 ? 'success' : row.completion_pct >= 50 ? 'warning' : 'error'" variant="flat" class="mr-3 font-weight-bold">{{ row.completion_pct }}%</v-chip>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold navy-text">{{ row.employee_name }}</div>
                  <div class="text-caption text-grey">{{ row.tasklist_title }}</div>
                </div>
                <div class="text-caption text-grey mr-3">{{ row.completed_items }}/{{ row.total_items }} items</div>
                <v-chip size="x-small" :color="getPriorityColor(row.priority)" variant="tonal" class="mr-2">{{ getPriorityLabel(row.priority) }}</v-chip>
                <v-icon size="18" color="grey">{{ expandedRows.has(row.assignment_id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </div>
              <div v-if="expandedRows.has(row.assignment_id)">
                <v-divider />
                <div v-if="row.items.length === 0" class="pa-4 text-caption text-grey">No items in this task list.</div>
                <div v-for="item in row.items" :key="item.item_id" class="d-flex align-center pa-3 px-4 audit-item-row">
                  <v-icon size="16" :color="item.status === 'completed' ? 'success' : 'grey-lighten-2'" class="mr-3">{{ item.status === 'completed' ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
                  <div class="flex-grow-1">
                    <span class="text-body-2" :class="item.status === 'completed' ? 'text-decoration-line-through text-grey' : 'navy-text'">{{ item.title }}</span>
                  </div>
                  <div v-if="item.status === 'completed'" class="text-caption" style="color:#2e7d32;">✓ {{ item.completed_by_name || 'Team member' }}</div>
                  <div v-else class="text-caption text-grey">Not completed</div>
                </div>
              </div>
            </v-card>
          </template>
        </div>
      </v-expand-transition>

      <!-- Task Lists -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="40" />
      </div>
      <template v-else>
        <div v-if="taskLists.length === 0" class="text-center py-16">
          <v-icon size="72" color="grey-lighten-2" class="mb-4">mdi-clipboard-text-outline</v-icon>
          <div class="text-h6 text-grey mb-2">No task lists yet</div>
          <p class="text-body-2 text-grey mb-4">Create a task list and assign it to employees for their shift day</p>
          <v-btn color="#12086F" prepend-icon="mdi-plus" @click="showCreateDialog = true">Create First Task List</v-btn>
        </div>
        <v-row v-else>
          <v-col v-for="task in taskLists" :key="getTaskId(task)" cols="12" sm="6" lg="4">
            <v-card variant="outlined" rounded="lg" class="task-card" hover>
              <div class="task-card-accent" :class="`bg-${getPriorityColor(task.priority)}`" />
              <v-card-text class="pa-4">
                <div class="d-flex align-start justify-space-between mb-2">
                  <div class="flex-grow-1 mr-2" style="cursor:pointer;" @click="openItemsDialog(task)">
                    <div class="text-body-1 font-weight-bold navy-text mb-1">{{ task.title }}</div>
                    <p v-if="task.description" class="text-caption text-grey mb-0">{{ task.description }}</p>
                  </div>
                  <div class="d-flex ga-1">
                    <v-tooltip text="Assign to employee" location="top">
                      <template #activator="{ props }">
                        <v-btn v-bind="props" icon="mdi-account-plus" size="x-small" variant="text" color="#12086F" @click.stop="openAssignDialog(task)" />
                      </template>
                    </v-tooltip>
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="confirmDeleteTaskList(task)" />
                  </div>
                </div>
                <div class="d-flex flex-wrap ga-1 mt-2">
                  <v-chip size="x-small" :color="getPriorityColor(task.priority)" variant="tonal">
                    <v-icon start size="x-small">{{ getPriorityIcon(task.priority) }}</v-icon>{{ getPriorityLabel(task.priority) }}
                  </v-chip>
                  <v-chip v-if="task.recursDaily || task.recurs_daily" size="x-small" color="teal" variant="tonal">
                    <v-icon start size="x-small">mdi-repeat</v-icon>Daily
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>

    <!-- CREATE -->
    <v-dialog v-model="showCreateDialog" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text"><v-icon start>mdi-plus-circle</v-icon>New Task List</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field v-model="newTask.title" label="Title *" variant="outlined" density="compact" class="mb-3" color="#12086F" autofocus />
          <v-textarea v-model="newTask.description" label="Description (optional)" variant="outlined" density="compact" rows="2" class="mb-3" color="#12086F" />
          <v-select v-model="newTask.priority" :items="[{title:'Low',value:'low'},{title:'Medium',value:'medium'},{title:'High',value:'high'},{title:'Urgent',value:'urgent'}]" label="Priority" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-checkbox v-model="newTask.recursDaily" label="Recurs Daily" color="#12086F" density="compact" hide-details />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4"><v-spacer /><v-btn variant="text" @click="showCreateDialog=false;resetNewTask()">Cancel</v-btn><v-btn color="#12086F" variant="flat" :loading="loading" @click="createTaskList">Create</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ASSIGN -->
    <v-dialog v-model="showAssignDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text"><v-icon start>mdi-account-check</v-icon>Assign Task to Employee(s)</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" color="#12086F" density="compact" class="mb-4">
            <div class="text-caption">Employees only see tasks assigned directly to them.</div>
          </v-alert>
          <v-select v-model="assignForm.tasklistId" :items="taskOptions" label="Task List *" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-select v-model="assignForm.employeeIds" :items="employeeOptions" label="Employee(s) *" variant="outlined" density="compact" class="mb-3" color="#12086F" multiple chips closable-chips />
          <v-select v-model="assignForm.shiftId" :items="shiftOptions" label="Link to Shift (optional)" variant="outlined" density="compact" class="mb-3" color="#9C27B0" clearable />
          <v-text-field v-model="assignForm.assignedDate" label="Date *" type="date" variant="outlined" density="compact" color="#12086F" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4"><v-spacer /><v-btn variant="text" @click="showAssignDialog=false">Cancel</v-btn><v-btn color="#12086F" variant="flat" :loading="assigning" @click="submitAssignment">Assign</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ITEMS -->
    <v-dialog v-model="showItemsDialog" max-width="640">
      <v-card rounded="lg" v-if="selectedTaskList">
        <v-card-title class="pa-5 pb-3 d-flex align-center justify-space-between">
          <div>
            <div class="text-body-1 font-weight-bold navy-text">{{ selectedTaskList.title }}</div>
            <div class="text-caption text-grey mt-1">{{ selectedTaskList.description }}</div>
          </div>
          <div class="d-flex ga-2 align-center">
            <v-chip v-if="selectedTaskList.items?.length" size="small" color="#12086F" variant="tonal">{{ completedCount(selectedTaskList) }}/{{ selectedTaskList.items.length }} done</v-chip>
            <v-btn icon="mdi-close" size="small" variant="text" @click="showItemsDialog=false" />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0" style="max-height:460px;overflow-y:auto;">
          <div v-if="selectedTaskList.items?.length > 0">
            <div v-for="item in selectedTaskList.items" :key="getItemId(item)" class="task-item-row pa-4" :class="{'task-item-done':item.status==='completed'}">
              <div class="d-flex align-center ga-3">
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-medium mb-1" :class="item.status==='completed'?'text-decoration-line-through text-grey':'navy-text'">{{ item.title }}</div>
                  <div v-if="item.description" class="text-caption text-grey">{{ item.description }}</div>
                </div>
                <div class="d-flex align-center ga-2">
                  <v-btn v-if="item.status!=='completed'" size="small" color="#12086F" variant="tonal" prepend-icon="mdi-check" class="text-none" @click="toggleItemCompletion(item)">Mark Done</v-btn>
                  <v-btn v-else size="small" color="success" variant="flat" prepend-icon="mdi-check-circle" class="text-none" @click="toggleItemCompletion(item)">Done</v-btn>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="deleteTaskItem(item)" />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center pa-10">
            <v-icon size="52" color="grey-lighten-2" class="mb-3">mdi-clipboard-outline</v-icon>
            <div class="text-body-2 text-grey">No items yet — add some below</div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-space-between">
          <v-btn prepend-icon="mdi-plus" color="#12086F" variant="tonal" @click="showAddItemDialog=true">Add Item</v-btn>
          <v-btn variant="text" @click="showItemsDialog=false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ADD ITEM -->
    <v-dialog v-model="showAddItemDialog" max-width="460">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Add Task Item</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field v-model="newItem.title" label="Task Title *" variant="outlined" density="compact" class="mb-3" color="#12086F" autofocus @keyup.enter="addTaskItem" />
          <v-textarea v-model="newItem.description" label="Description (optional)" variant="outlined" density="compact" rows="2" color="#12086F" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4"><v-spacer /><v-btn variant="text" @click="showAddItemDialog=false;resetNewItem()">Cancel</v-btn><v-btn color="#12086F" variant="flat" :loading="savingItem" @click="addTaskItem">Add</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DELETE -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Delete Task List</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">Are you sure you want to delete <strong>{{ taskToDelete?.title }}</strong>? This cannot be undone.</v-card-text>
        <v-divider />
        <v-card-actions class="pa-4"><v-spacer /><v-btn variant="text" @click="showDeleteConfirm=false">Cancel</v-btn><v-btn color="error" variant="flat" @click="deleteTaskList">Delete</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.task-card { border-color: #e8e8e8; transition: all 0.2s; overflow: hidden; position: relative; }
.task-card:hover { border-color: #12086F; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(18,8,111,0.12); }
.task-card-accent { height: 4px; width: 100%; }
.task-item-row { border-bottom: 1px solid #f0f0f0; transition: background 0.15s; }
.task-item-row:hover { background: #fafafa; }
.task-item-row:last-child { border-bottom: none; }
.task-item-done { background: #f0fdf4; }
.audit-item-row { border-top: 1px solid #f5f5f5; }
.audit-item-row:hover { background: #fafafa; }
.v-theme--dark .task-item-done { background: #1a2e1a; }
.v-theme--dark .task-item-row:hover { background: #2a2a3e; }
.v-theme--dark .navy-text { color: #a8b4ff !important; }
</style>