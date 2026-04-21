<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const tab              = ref('all');
const showItemsDialog  = ref(false);
const selectedTaskList = ref(null);

// ── HARDCODED DEMO DATA ───────────────────────────────────────────────────
const taskLists = ref([
  {
    id: 1, title: 'Opening Checklist', description: 'Tasks to complete at store opening',
    priority: 'high', shiftType: 'morning', recursDaily: true, isTemplate: false,
    shiftLabel: 'Mon, Apr 21 · 7:00AM – 2:00PM',
    items: [
      { id: 1, title: 'Unlock and disarm security system', status: 'completed', completedBy: 'Sarah Johnson' },
      { id: 2, title: 'Turn on all equipment and run diagnostics', status: 'completed', completedBy: 'Sarah Johnson' },
      { id: 3, title: 'Restock condiment station', status: 'active', completedBy: null },
      { id: 4, title: 'Check and log fridge temperatures', status: 'active', completedBy: null },
      { id: 5, title: 'Count opening till', status: 'completed', completedBy: 'James Williams' },
    ],
  },
  {
    id: 2, title: 'Closing Checklist', description: 'Tasks to complete before store closes',
    priority: 'high', shiftType: 'closing', recursDaily: true, isTemplate: false,
    shiftLabel: 'Mon, Apr 21 · 2:00PM – 9:00PM',
    items: [
      { id: 6,  title: 'Clean and sanitize all surfaces',   status: 'active',     completedBy: null },
      { id: 7,  title: 'Empty and clean all trash cans',    status: 'active',     completedBy: null },
      { id: 8,  title: 'Count and balance register',        status: 'active',     completedBy: null },
      { id: 9,  title: 'Restock supplies for next morning', status: 'active',     completedBy: null },
      { id: 10, title: 'Arm security system and lock up',   status: 'active',     completedBy: null },
    ],
  },
  {
    id: 3, title: 'Weekly Deep Clean', description: 'Deep cleaning tasks done every Thursday',
    priority: 'medium', shiftType: 'all_day', recursDaily: false, isTemplate: false,
    shiftLabel: 'Thu, Apr 24 · 8:00AM – 5:00PM',
    items: [
      { id: 11, title: 'Clean behind all equipment',      status: 'active',     completedBy: null },
      { id: 12, title: 'Descale espresso machines',       status: 'active',     completedBy: null },
      { id: 13, title: 'Mop storage and back office',     status: 'active',     completedBy: null },
    ],
  },
]);

const templateLists = ref([
  {
    id: 4, title: 'Standard Opening (Template)', description: 'Reusable opening shift template',
    priority: 'medium', shiftType: 'morning', recursDaily: false, isTemplate: true,
    shiftLabel: null,
    items: [
      { id: 14, title: 'Unlock store',          status: 'active', completedBy: null },
      { id: 15, title: 'Start equipment',       status: 'active', completedBy: null },
      { id: 16, title: 'Prepare workstations',  status: 'active', completedBy: null },
    ],
  },
]);

const allNonTemplate = computed(() => taskLists.value);

const priorityConfig = {
  urgent: { color: 'error',   icon: 'mdi-alert-circle' },
  high:   { color: 'warning', icon: 'mdi-arrow-up-circle' },
  medium: { color: 'info',    icon: 'mdi-minus-circle' },
  low:    { color: 'success', icon: 'mdi-arrow-down-circle' },
};
const getPriorityColor = p => priorityConfig[p]?.color || 'grey';
const getPriorityIcon  = p => priorityConfig[p]?.icon  || 'mdi-circle';

const completedCount = (list) => list.items.filter(i => i.status === 'completed').length;

const openItems = (list) => { selectedTaskList.value = list; showItemsDialog.value = true; };
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Creating/editing tasks is disabled.
      </v-alert>

      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Task Management</h1>
          <p class="text-body-2 text-grey">Task lists assigned to shifts — anyone on that shift can complete them</p>
        </div>
        <v-btn color="#12086F" prepend-icon="mdi-plus" size="large" disabled>New Task List</v-btn>
      </div>

      <!-- Tabs -->
      <v-tabs v-model="tab" color="#12086F" class="mb-5" density="comfortable">
        <v-tab value="all">
          <v-icon start size="small">mdi-format-list-checkbox</v-icon>All Lists
          <v-chip size="x-small" class="ml-2" color="#12086F" variant="tonal">{{ allNonTemplate.length }}</v-chip>
        </v-tab>
        <v-tab value="templates">
          <v-icon start size="small">mdi-content-save</v-icon>Templates
          <v-chip v-if="templateLists.length" size="x-small" class="ml-2" color="#9C27B0" variant="tonal">{{ templateLists.length }}</v-chip>
        </v-tab>
      </v-tabs>

      <v-window v-model="tab">

        <!-- ALL LISTS -->
        <v-window-item value="all">
          <v-row>
            <v-col v-for="task in allNonTemplate" :key="task.id" cols="12" sm="6" lg="4">
              <v-card variant="outlined" rounded="lg" class="task-card" hover @click="openItems(task)">
                <div class="task-card-accent" :class="`bg-${getPriorityColor(task.priority)}`" />
                <v-card-text class="pa-4">
                  <div class="d-flex align-start justify-space-between mb-2">
                    <div class="flex-grow-1 mr-2">
                      <div class="text-body-1 font-weight-bold navy-text mb-1">{{ task.title }}</div>
                      <p v-if="task.description" class="text-caption text-grey mb-0">{{ task.description }}</p>
                    </div>
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" disabled />
                  </div>

                  <div class="d-flex align-center ga-1 mb-2">
                    <v-icon size="12" color="#9C27B0">mdi-calendar-clock</v-icon>
                    <span class="text-caption text-grey">{{ task.shiftLabel }}</span>
                  </div>

                  <!-- Progress -->
                  <div class="d-flex align-center ga-2 mb-2">
                    <v-progress-linear
                      :model-value="task.items.length ? (completedCount(task) / task.items.length) * 100 : 0"
                      color="#2e7d32" bg-color="#e0e0e0" rounded height="6" style="flex:1;" />
                    <span class="text-caption text-grey">{{ completedCount(task) }}/{{ task.items.length }}</span>
                  </div>

                  <div class="d-flex flex-wrap ga-1 mt-2">
                    <v-chip size="x-small" :color="getPriorityColor(task.priority)" variant="tonal">
                      <v-icon start size="x-small">{{ getPriorityIcon(task.priority) }}</v-icon>
                      {{ task.priority }}
                    </v-chip>
                    <v-chip v-if="task.recursDaily" size="x-small" color="teal" variant="tonal">
                      <v-icon start size="x-small">mdi-repeat</v-icon>Daily
                    </v-chip>
                    <v-chip size="x-small" color="grey" variant="tonal">{{ task.shiftType.replace('_',' ') }}</v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TEMPLATES -->
        <v-window-item value="templates">
          <v-row>
            <v-col v-for="task in templateLists" :key="task.id" cols="12" sm="6" lg="4">
              <v-card variant="outlined" rounded="lg" class="task-card template-glow" hover @click="openItems(task)">
                <div class="task-card-accent bg-purple" />
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-body-1 font-weight-bold navy-text">{{ task.title }}</div>
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" disabled />
                  </div>
                  <p v-if="task.description" class="text-caption text-grey">{{ task.description }}</p>
                  <v-chip size="x-small" color="#9C27B0" variant="tonal" class="mt-2">
                    <v-icon start size="x-small">mdi-content-save</v-icon>Reusable Template
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>

    </v-container>

    <!-- Items Dialog -->
    <v-dialog v-model="showItemsDialog" max-width="680">
      <v-card rounded="lg" v-if="selectedTaskList">
        <v-card-title class="pa-5 pb-3 d-flex align-center justify-space-between">
          <div>
            <div class="text-body-1 font-weight-bold navy-text">{{ selectedTaskList.title }}</div>
            <div class="text-caption text-grey mt-1">{{ selectedTaskList.description }}</div>
            <div class="d-flex ga-2 mt-1 flex-wrap">
              <v-chip v-if="selectedTaskList.shiftLabel" size="x-small" color="#9C27B0" variant="tonal">
                <v-icon start size="x-small">mdi-calendar-clock</v-icon>{{ selectedTaskList.shiftLabel }}
              </v-chip>
              <v-chip v-if="selectedTaskList.recursDaily" size="x-small" color="teal" variant="tonal">
                <v-icon start size="x-small">mdi-repeat</v-icon>Daily
              </v-chip>
            </div>
          </div>
          <div class="d-flex ga-2 align-center">
            <v-chip size="small" color="#12086F" variant="tonal">
              {{ completedCount(selectedTaskList) }}/{{ selectedTaskList.items.length }} done
            </v-chip>
            <v-btn icon="mdi-close" size="small" variant="text" @click="showItemsDialog = false" />
          </div>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-0" style="max-height:460px; overflow-y:auto;">
          <div v-for="item in selectedTaskList.items" :key="item.id"
            class="task-item-row pa-4" :class="{ 'task-item-done': item.status === 'completed' }">
            <div class="d-flex align-center ga-3">
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-medium mb-1"
                  :class="item.status === 'completed' ? 'text-decoration-line-through text-grey' : 'navy-text'">
                  {{ item.title }}
                </div>
                <div v-if="item.status === 'completed'" class="d-flex align-center ga-1">
                  <v-icon size="12" color="success">mdi-account-check</v-icon>
                  <span class="text-caption" style="color:#2e7d32;">Completed by <strong>{{ item.completedBy }}</strong></span>
                </div>
              </div>
              <v-btn v-if="item.status !== 'completed'" size="small" color="#12086F" variant="tonal"
                prepend-icon="mdi-check" class="text-none" disabled>Mark Done</v-btn>
              <v-btn v-else size="small" color="success" variant="flat"
                prepend-icon="mdi-check-circle" class="text-none" disabled>Done</v-btn>
            </div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 justify-space-between">
          <v-btn prepend-icon="mdi-plus" color="#12086F" variant="tonal" disabled>Add Item</v-btn>
          <v-btn variant="text" @click="showItemsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.task-card { border-color: #e8e8e8; cursor: pointer; transition: all 0.2s; overflow: hidden; position: relative; }
.task-card:hover { border-color: #12086F; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(18,8,111,0.12); }
.task-card-accent { height: 4px; width: 100%; }
.template-glow:hover { border-color: #9C27B0; box-shadow: 0 6px 20px rgba(156,39,176,0.15); }
.task-item-row { border-bottom: 1px solid #f0f0f0; }
.task-item-row:last-child { border-bottom: none; }
.task-item-done { background: #f0fdf4; }
</style>