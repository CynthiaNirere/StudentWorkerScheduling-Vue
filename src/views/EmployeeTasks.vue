<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const user        = ref(null);
const loading     = ref(false);
const taskLists   = ref([]);
const todayShifts = ref([]); // my shifts today

const showItemsDialog = ref(false);
const selectedTask    = ref(null);
const selectedItems   = ref([]);
const loadingItems    = ref(false);

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

// ── TODAY'S DATE STRING ───────────────────────────────────────────────────
const todayStr = new Date().toISOString().split('T')[0];

// ── COMPUTED ──────────────────────────────────────────────────────────────
// Only show tasks linked to the employee's shift today.
// Falls back to showing all unassigned tasks if no shift today.
const myTodayShiftIds = computed(() =>
  todayShifts.value.map(s => s.shift_id || s.id).filter(Boolean).map(String)
);

const assignedTasks = computed(() => {
  const userId = user.value?.user_id || user.value?.userId;

  return taskLists.value.filter(t => {
    // If linked to a shift, only show if that shift is one of my shifts today
    const taskShiftId = t.shiftId || t.shift_id;
    if (taskShiftId) {
      return myTodayShiftIds.value.includes(String(taskShiftId));
    }
    // If no shift link but assigned to me directly, show it
    const assignedTo = t.assignedTo || t.assigned_to;
    if (assignedTo) return String(assignedTo) === String(userId);
    // General unlinked tasks — show only if I have a shift today
    return myTodayShiftIds.value.length > 0;
  });
});

const completedCount = computed(() =>
  selectedItems.value.filter(i => i.status === 'completed').length
);

const priorityConfig = {
  urgent: { color: 'error',   icon: 'mdi-alert-circle' },
  high:   { color: 'warning', icon: 'mdi-arrow-up-circle' },
  medium: { color: 'info',    icon: 'mdi-minus-circle' },
  low:    { color: 'success', icon: 'mdi-arrow-down-circle' },
};

const getPriorityColor = p => priorityConfig[p]?.color || 'grey';
const getPriorityIcon  = p => priorityConfig[p]?.icon  || 'mdi-flag';
const getItemId = (item) => item?.item_id ?? item?.id ?? null;
const getTaskId = (task) => task?.tasklist_id ?? task?.tasklistId ?? task?.id ?? null;

// Get name of who completed an item
const getCompleterName = (item) => {
  const completedBy = item.completedBy || item.completed_by;
  if (!completedBy) return null;
  const myId = user.value?.user_id || user.value?.userId;
  if (String(completedBy) === String(myId)) return 'You';
  // Otherwise show generic reference — full name would need a users lookup
  return `Team member #${completedBy}`;
};

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadAll();
});

const loadAll = async () => {
  loading.value = true;
  try {
    const userId = user.value?.user_id || user.value?.userId;

    // Load shifts and tasks in parallel
    const [shiftRes, taskRes] = await Promise.all([
      EmployeeService.getMyShifts(),
      EmployeeService.getMyTaskLists(),
    ]);

    const allShifts = Array.isArray(shiftRes.data) ? shiftRes.data : [];

    // Filter to only today's shifts for this employee
    todayShifts.value = allShifts.filter(s => {
      const shiftDate = new Date(Number(s.shiftTime || s.shift_time));
      const isToday   = shiftDate.toISOString().split('T')[0] === todayStr;
      const isMine    = String(s.user_id || s.userId) === String(userId);
      return isToday && isMine;
    });

    taskLists.value = Array.isArray(taskRes.data) ? taskRes.data : [];

  } catch (err) {
    console.error('Error loading tasks:', err);
    showSnackbar('Error loading tasks', 'error');
  } finally {
    loading.value = false;
  }
};

const openTask = async (task) => {
  selectedTask.value  = task;
  selectedItems.value = [];
  showItemsDialog.value = true;
  loadingItems.value  = true;
  try {
    const id  = getTaskId(task);
    const res = await EmployeeService.getTaskItems(id);
    selectedItems.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error loading task items:', err);
    showSnackbar('Error loading task items', 'error');
  } finally {
    loadingItems.value = false;
  }
};

// Mark done — records who completed it
const markDone = async (item) => {
  const itemId = getItemId(item);
  if (!itemId || item.status === 'completed') return;
  try {
    const myId = user.value?.user_id || user.value?.userId;
    // Use the complete endpoint which records completedBy on the backend
    await EmployeeService.completeTaskItem(itemId);
    // Update locally with current user as completer
    const idx = selectedItems.value.findIndex(i => getItemId(i) === itemId);
    if (idx !== -1) {
      selectedItems.value[idx] = {
        ...selectedItems.value[idx],
        status:      'completed',
        completedBy: myId,
        completedAt: Date.now(),
      };
    }
    showSnackbar('Task marked as done!', 'success');
  } catch (err) {
    showSnackbar('Error completing task', 'error');
  }
};

// Reopen a completed task
const reopenItem = async (item) => {
  const itemId = getItemId(item);
  if (!itemId) return;
  try {
    await EmployeeService.updateTaskItem(itemId, { status: 'active', completedBy: null, completedAt: null });
    const idx = selectedItems.value.findIndex(i => getItemId(i) === itemId);
    if (idx !== -1) {
      selectedItems.value[idx] = { ...selectedItems.value[idx], status: 'active', completedBy: null };
    }
    showSnackbar('Task reopened', 'info');
  } catch (err) {
    showSnackbar('Error reopening task', 'error');
  }
};

const showSnackbar = (msg, color = 'success') => { snackMsg.value = msg; snackColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">My Tasks</h1>
        <p class="text-body-2 text-grey">Tasks for your shift today</p>
      </div>

      <!-- Today's shift context -->
      <v-alert
        v-if="todayShifts.length > 0"
        type="success"
        variant="tonal"
        density="compact"
        color="#12086F"
        class="mb-4"
        icon="mdi-calendar-check"
      >
        <div class="text-caption">
          You have {{ todayShifts.length }} shift{{ todayShifts.length > 1 ? 's' : '' }} today.
          Showing tasks assigned to your shift{{ todayShifts.length > 1 ? 's' : '' }}.
        </div>
      </v-alert>
      <v-alert
        v-else-if="!loading"
        type="info"
        variant="tonal"
        density="compact"
        color="#4361EE"
        class="mb-4"
        icon="mdi-calendar-blank"
      >
        <div class="text-caption">You have no shifts scheduled for today.</div>
      </v-alert>

      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="40" />
      </div>

      <template v-else>
        <div v-if="assignedTasks.length === 0" class="text-center py-16">
          <v-icon size="72" color="grey-lighten-2" class="mb-4">mdi-clipboard-check-outline</v-icon>
          <div class="text-h6 text-grey mb-2">No tasks for today</div>
          <p class="text-body-2 text-grey">Tasks assigned to your shift will appear here</p>
        </div>

        <v-row v-else>
          <v-col v-for="task in assignedTasks" :key="getTaskId(task)" cols="12" sm="6" lg="4">
            <v-card
              variant="outlined"
              rounded="lg"
              class="task-card"
              hover
              @click="openTask(task)"
            >
              <div class="task-accent" :class="`bg-${getPriorityColor(task.priority)}`" />
              <v-card-text class="pa-4">
                <div class="d-flex align-start justify-space-between mb-2">
                  <div class="flex-grow-1">
                    <div class="text-body-1 font-weight-bold navy-text mb-1">{{ task.title }}</div>
                    <p v-if="task.description" class="text-caption text-grey mb-0">{{ task.description }}</p>
                  </div>
                  <v-icon :color="getPriorityColor(task.priority)" size="20" class="ml-2">{{ getPriorityIcon(task.priority) }}</v-icon>
                </div>
                <div class="d-flex flex-wrap ga-1 mt-3">
                  <v-chip size="x-small" :color="getPriorityColor(task.priority)" variant="tonal">{{ task.priority || 'medium' }}</v-chip>
                  <v-chip v-if="task.recursDaily || task.recurs_daily" size="x-small" color="teal" variant="tonal">
                    <v-icon start size="x-small">mdi-repeat</v-icon>Daily
                  </v-chip>
                  <v-chip size="x-small" color="grey" variant="tonal">
                    {{ (task.shiftType || task.shift_type || 'all day').replace('_', ' ') }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>

    <!-- Task Items Dialog -->
    <v-dialog v-model="showItemsDialog" max-width="620">
      <v-card rounded="lg" v-if="selectedTask">
        <v-card-title class="pa-5 pb-3 d-flex align-center justify-space-between navy-text">
          <div>
            <div class="text-body-1 font-weight-bold">{{ selectedTask.title }}</div>
            <div class="text-caption text-grey mt-1">{{ selectedTask.description }}</div>
          </div>
          <div class="d-flex align-center ga-2">
            <v-chip v-if="selectedItems.length" size="small" color="#12086F" variant="tonal">
              {{ completedCount }}/{{ selectedItems.length }} done
            </v-chip>
            <v-btn icon="mdi-close" size="small" variant="text" @click="showItemsDialog = false" />
          </div>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-0" style="max-height: 450px; overflow-y: auto;">
          <div v-if="loadingItems" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" size="28" />
          </div>
          <div v-else-if="selectedItems.length === 0" class="text-center pa-8">
            <v-icon size="48" color="grey-lighten-2" class="mb-3">mdi-clipboard-outline</v-icon>
            <div class="text-body-2 text-grey">No items in this task list</div>
          </div>
          <div v-else>
            <div
              v-for="item in selectedItems"
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
                  <div v-if="item.status === 'completed'" class="d-flex align-center ga-1 mt-1">
                    <v-icon size="12" color="success">mdi-account-check</v-icon>
                    <span class="text-caption" style="color:#2e7d32;">
                      Completed by <strong>{{ getCompleterName(item) || 'a team member' }}</strong>
                    </span>
                  </div>
                </div>

                <!-- Action buttons -->
                <div class="flex-shrink-0">
                  <v-btn
                    v-if="item.status !== 'completed'"
                    size="small"
                    color="#12086F"
                    variant="flat"
                    prepend-icon="mdi-check"
                    class="text-none"
                    @click="markDone(item)"
                  >
                    Mark Done
                  </v-btn>
                  <v-btn
                    v-else
                    size="small"
                    color="success"
                    variant="tonal"
                    prepend-icon="mdi-check-circle"
                    class="text-none"
                    @click="reopenItem(item)"
                  >
                    Done
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-progress-linear
            v-if="selectedItems.length > 0"
            :model-value="(completedCount / selectedItems.length) * 100"
            color="#12086F"
            rounded
            height="6"
            class="flex-grow-1 mr-3"
          />
          <v-btn variant="text" @click="showItemsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.task-card { border-color: #e8e8e8; cursor: pointer; transition: all 0.2s; overflow: hidden; }
.task-card:hover { border-color: #12086F; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(18,8,111,0.12); }
.task-accent { height: 4px; width: 100%; }
.task-item-row { border-bottom: 1px solid #f0f0f0; transition: background 0.15s; }
.task-item-row:hover { background: #fafafa; }
.task-item-row:last-child { border-bottom: none; }
.task-item-done { background: #f0fdf4; }

/* Dark mode */
.v-theme--dark .task-item-done { background: #1a2e1a; }
.v-theme--dark .task-item-row:hover { background: #2a2a3e; }
.v-theme--dark .navy-text { color: #a8b4ff !important; }
</style>