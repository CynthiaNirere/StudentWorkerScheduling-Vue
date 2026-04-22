<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const user          = ref(null);
const loading       = ref(false);
const assignedTasks = ref([]);   // from /task-assignments/my-today

const showItemsDialog = ref(false);
const selectedTask    = ref(null);
const selectedItems   = ref([]);
const loadingItems    = ref(false);

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

// ── COMPUTED ──────────────────────────────────────────────────────────────
const completedCount = computed(() =>
  selectedItems.value.filter(i => i.status === 'completed').length
);

const progressPct = computed(() =>
  selectedItems.value.length
    ? Math.round((completedCount.value / selectedItems.value.length) * 100)
    : 0
);

const priorityConfig = {
  urgent: { color: 'error',   icon: 'mdi-alert-circle' },
  high:   { color: 'warning', icon: 'mdi-arrow-up-circle' },
  medium: { color: 'info',    icon: 'mdi-minus-circle' },
  low:    { color: 'success', icon: 'mdi-arrow-down-circle' },
};

const getPriorityColor = p => priorityConfig[p]?.color || 'grey';
const getPriorityIcon  = p => priorityConfig[p]?.icon  || 'mdi-flag';
const getItemId        = item => item?.item_id ?? item?.id ?? null;
const getTaskId        = task => task?.tasklist_id ?? task?.tasklistId ?? task?.id ?? null;

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadMyTasks();
});

const loadMyTasks = async () => {
  loading.value = true;
  try {
    const res = await EmployeeService.getMyTodayTasks();   // hits /task-assignments/my-today
    assignedTasks.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Error loading tasks:', err);
    showSnackbar('Error loading tasks', 'error');
  } finally {
    loading.value = false;
  }
};

const openTask = async (task) => {
  selectedTask.value    = task;
  selectedItems.value   = [];
  showItemsDialog.value = true;
  loadingItems.value    = true;
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

const markDone = async (item) => {
  const itemId = getItemId(item);
  if (!itemId || item.status === 'completed') return;
  try {
    await EmployeeService.completeTaskItem(itemId);
    const idx = selectedItems.value.findIndex(i => getItemId(i) === itemId);
    if (idx !== -1) {
      selectedItems.value[idx] = {
        ...selectedItems.value[idx],
        status:      'completed',
        completedBy: user.value?.user_id || user.value?.userId,
        completedAt: Date.now(),
      };
    }
    showSnackbar('Marked as done!', 'success');
  } catch {
    showSnackbar('Error completing task', 'error');
  }
};

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
  } catch {
    showSnackbar('Error reopening task', 'error');
  }
};

const showSnackbar = (msg, color = 'success') => {
  snackMsg.value = msg; snackColor.value = color; snackbar.value = true;
};
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">My Tasks</h1>
        <p class="text-body-2 text-grey">Tasks assigned to you for today</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="#12086F" size="48" />
        <div class="text-body-2 text-grey mt-3">Loading your tasks…</div>
      </div>

      <template v-else>
        <!-- No tasks state -->
        <div v-if="assignedTasks.length === 0" class="text-center py-16">
          <v-icon size="80" color="grey-lighten-2" class="mb-4">mdi-clipboard-check-outline</v-icon>
          <div class="text-h6 text-grey mb-2">No tasks assigned for today</div>
          <p class="text-body-2 text-grey">Your manager will assign tasks to you when needed</p>
        </div>

        <!-- Task cards -->
        <v-row v-else>
          <v-col
            v-for="task in assignedTasks"
            :key="task.assignment_id || getTaskId(task)"
            cols="12" sm="6" lg="4"
          >
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
                  <v-icon :color="getPriorityColor(task.priority)" size="20" class="ml-2">
                    {{ getPriorityIcon(task.priority) }}
                  </v-icon>
                </div>

                <div class="d-flex flex-wrap ga-1 mt-3">
                  <v-chip size="x-small" :color="getPriorityColor(task.priority)" variant="tonal">
                    {{ task.priority || 'medium' }}
                  </v-chip>
                  <v-chip v-if="task.recurs_daily || task.recursDaily" size="x-small" color="teal" variant="tonal">
                    <v-icon start size="x-small">mdi-repeat</v-icon>Daily
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
        <v-card-title class="pa-5 pb-3 d-flex align-center justify-space-between">
          <div>
            <div class="text-body-1 font-weight-bold navy-text">{{ selectedTask.title }}</div>
            <div class="text-caption text-grey mt-1">{{ selectedTask.description }}</div>
          </div>
          <div class="d-flex align-center ga-2">
            <v-chip v-if="selectedItems.length" size="small" color="#12086F" variant="tonal">
              {{ completedCount }}/{{ selectedItems.length }} done
            </v-chip>
            <v-btn icon="mdi-close" size="small" variant="text" @click="showItemsDialog = false" />
          </div>
        </v-card-title>

        <!-- Progress bar -->
        <v-progress-linear
          v-if="selectedItems.length"
          :model-value="progressPct"
          color="#12086F"
          height="4"
          rounded
        />

        <v-divider />

        <v-card-text class="pa-0" style="max-height: 460px; overflow-y: auto;">
          <div v-if="loadingItems" class="text-center py-10">
            <v-progress-circular indeterminate color="#12086F" size="32" />
          </div>
          <div v-else-if="selectedItems.length === 0" class="text-center pa-10">
            <v-icon size="52" color="grey-lighten-2" class="mb-3">mdi-clipboard-outline</v-icon>
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
                <!-- Checkbox-style icon -->
                <v-icon
                  :color="item.status === 'completed' ? 'success' : 'grey-lighten-2'"
                  size="22"
                  class="flex-shrink-0"
                >
                  {{ item.status === 'completed' ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                </v-icon>

                <div class="flex-grow-1">
                  <div
                    class="text-body-2 font-weight-medium"
                    :class="item.status === 'completed'
                      ? 'text-decoration-line-through text-grey'
                      : 'navy-text'"
                  >{{ item.title }}</div>
                  <div v-if="item.description" class="text-caption text-grey mt-1">{{ item.description }}</div>
                </div>

                <!-- Action -->
                <div class="flex-shrink-0">
                  <v-btn
                    v-if="item.status !== 'completed'"
                    size="small"
                    color="#12086F"
                    variant="flat"
                    class="text-none"
                    @click="markDone(item)"
                  >Done</v-btn>
                  <v-btn
                    v-else
                    size="small"
                    color="grey"
                    variant="tonal"
                    class="text-none"
                    @click="reopenItem(item)"
                  >Undo</v-btn>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn variant="text" @click="showItemsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">
      {{ snackMsg }}
    </v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.task-card {
  border-color: #e8e8e8;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}
.task-card:hover {
  border-color: #12086F;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(18,8,111,0.12);
}
.task-accent { height: 4px; width: 100%; }
.task-item-row {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}
.task-item-row:hover { background: #fafafa; }
.task-item-row:last-child { border-bottom: none; }
.task-item-done { background: #f0fdf4; }
.v-theme--dark .task-item-done  { background: #1a2e1a; }
.v-theme--dark .task-item-row:hover { background: #2a2a3e; }
.v-theme--dark .navy-text { color: #a8b4ff !important; }
</style>