<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

// ─── DATA ─────────────────────────────────────────────────────────────────
const taskLists = ref([]);
const selectedList = ref(null);
const taskItems = ref([]);
const employees = ref([]);
const loading = ref(false);
const loadingItems = ref(false);

// ─── MODALS ───────────────────────────────────────────────────────────────
const showCreateListDialog = ref(false);
const showAddItemDialog = ref(false);
const creatingList = ref(false);
const addingItem = ref(false);

// ─── SNACKBAR ─────────────────────────────────────────────────────────────
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

// ─── FORMS ────────────────────────────────────────────────────────────────
const newList = ref({
  title: "",
  description: "",
  priority: "medium",
});

const newItem = ref({
  title: "",
  description: "",
  assignedTo: "",
});

// ─── LIFECYCLE ────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadTaskLists(), loadEmployees()]);
});

// ─── LOADERS ──────────────────────────────────────────────────────────────
const loadTaskLists = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllTaskLists();
    taskLists.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading task lists:", err);
    showSnackbar("Error loading task lists", "error");
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
    console.error("Error loading task items:", err);
    showSnackbar("Error loading task items", "error");
  } finally {
    loadingItems.value = false;
  }
};

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const all = Array.isArray(res.data) ? res.data : [];
    employees.value = all.filter((u) => u.role === "employee");
  } catch (err) {
    console.error("Error loading employees:", err);
  }
};

// ─── ACTIONS ──────────────────────────────────────────────────────────────
const handleCreateList = async () => {
  if (!newList.value.title) {
    showSnackbar("Title is required", "error");
    return;
  }

  creatingList.value = true;
  try {
    await EmployerService.createTaskList({
      ...newList.value,
      createdAt: Date.now(),
    });
    showSnackbar("Task list created!", "success");
    showCreateListDialog.value = false;
    newList.value = { title: "", description: "", priority: "medium" };
    await loadTaskLists();
  } catch (err) {
    showSnackbar("Error creating task list", "error");
  } finally {
    creatingList.value = false;
  }
};

const handleAddItem = async () => {
  if (!newItem.value.title) {
    showSnackbar("Title is required", "error");
    return;
  }

  addingItem.value = true;
  try {
    await EmployerService.createTaskItem({
      tasklistId: selectedList.value.tasklist_id,
      ...newItem.value,
      createdAt: Date.now(),
      orderPosition: taskItems.value.length + 1,
    });
    showSnackbar("Task item added!", "success");
    showAddItemDialog.value = false;
    newItem.value = { title: "", description: "", assignedTo: "" };
    await loadTaskItems(selectedList.value.tasklist_id);
  } catch (err) {
    showSnackbar("Error adding task item", "error");
  } finally {
    addingItem.value = false;
  }
};

const handleCompleteItem = async (item) => {
  try {
    await EmployerService.completeTaskItem(item.item_id);
    showSnackbar("Task marked as complete!", "success");
    await loadTaskItems(selectedList.value.tasklist_id);
  } catch (err) {
    showSnackbar("Error completing task", "error");
  }
};

const handleCompleteList = async (list) => {
  if (!confirm(`Mark "${list.title}" as completed?`)) return;

  try {
    await EmployerService.completeTaskList(list.tasklist_id);
    showSnackbar("Task list completed!", "success");
    await loadTaskLists();
  } catch (err) {
    showSnackbar("Error completing list", "error");
  }
};

const handleArchiveList = async (list) => {
  if (!confirm(`Archive "${list.title}"?`)) return;

  try {
    await EmployerService.archiveTaskList(list.tasklist_id);
    showSnackbar("Task list archived!", "success");
    await loadTaskLists();
  } catch (err) {
    showSnackbar("Error archiving list", "error");
  }
};

const handleDeleteList = async (list) => {
  if (!confirm(`Delete "${list.title}"? This will also delete all items in this list.`)) return;

  try {
    await EmployerService.deleteTaskList(list.tasklist_id);
    showSnackbar("Task list deleted", "success");
    if (selectedList.value?.tasklist_id === list.tasklist_id) {
      selectedList.value = null;
      taskItems.value = [];
    }
    await loadTaskLists();
  } catch (err) {
    showSnackbar("Error deleting list", "error");
  }
};

const selectList = async (list) => {
  selectedList.value = list;
  await loadTaskItems(list.tasklist_id);
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
const getPriorityColor = (priority) => {
  const colors = {
    low: "default",
    medium: "info",
    high: "warning",
    urgent: "error",
  };
  return colors[priority] || "default";
};

const getStatusColor = (status) => {
  const colors = {
    active: "success",
    completed: "primary",
    archived: "default",
  };
  return colors[status] || "default";
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

<template>
  <EmployerLayout>
      <v-container fluid class="pa-6">
        
        <!-- Header -->
        <div class="d-flex align-center justify-space-between mb-5">
          <div>
            <h1 class="text-h5 font-weight-bold">Task Management</h1>
            <p class="text-body-2 text-medium-emphasis">
              Create and manage task lists for your team
            </p>
          </div>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            prepend-icon="mdi-plus"
            @click="showCreateListDialog = true"
          >
            Create Task List
          </v-btn>
        </div>

        <v-row>
          <!-- Task Lists -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" rounded="lg">
              <v-card-title class="text-body-1 font-weight-bold pa-4 pb-3">
                Task Lists
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-0">
                <v-list>
                  <v-list-item
                    v-for="list in taskLists"
                    :key="list.tasklist_id"
                    :active="selectedList?.tasklist_id === list.tasklist_id"
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
                      <v-menu>
                        <template #activator="{ props }">
                          <v-btn icon="mdi-dots-vertical" size="small" variant="plain" v-bind="props" />
                        </template>
                        <v-list density="compact">
                          <v-list-item @click="handleCompleteList(list)">
                            <template #prepend>
                              <v-icon size="small">mdi-check</v-icon>
                            </template>
                            <v-list-item-title>Complete</v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="handleArchiveList(list)">
                            <template #prepend>
                              <v-icon size="small">mdi-archive</v-icon>
                            </template>
                            <v-list-item-title>Archive</v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="handleDeleteList(list)">
                            <template #prepend>
                              <v-icon size="small" color="error">mdi-delete</v-icon>
                            </template>
                            <v-list-item-title class="text-error">Delete</v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </template>
                  </v-list-item>
                </v-list>

                <div v-if="taskLists.length === 0" class="text-center pa-6">
                  <v-icon size="48" class="mb-2 text-disabled">mdi-clipboard-list-outline</v-icon>
                  <div class="text-body-2 text-medium-emphasis">No task lists yet</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Task Items -->
          <v-col cols="12" md="8">
            <v-card variant="outlined" rounded="lg">
              <div v-if="!selectedList" class="pa-6 text-center">
                <v-icon size="64" class="mb-2 text-disabled">mdi-format-list-checks</v-icon>
                <div class="text-body-1 text-medium-emphasis">Select a task list to view items</div>
              </div>

              <template v-else>
                <v-card-title class="pa-4 pb-3 d-flex align-center justify-space-between">
                  <div>
                    <div class="text-body-1 font-weight-bold">{{ selectedList.title }}</div>
                    <div class="text-caption text-medium-emphasis">{{ selectedList.description }}</div>
                  </div>
                  <v-btn
                    color="#7b1c2e"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-plus"
                    @click="showAddItemDialog = true"
                  >
                    Add Item
                  </v-btn>
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-0">
                  <v-list>
                    <v-list-item
                      v-for="item in taskItems"
                      :key="item.item_id"
                    >
                      <template #prepend>
                        <v-checkbox-btn
                          :model-value="item.status === 'completed'"
                          @update:model-value="handleCompleteItem(item)"
                          color="#7b1c2e"
                        />
                      </template>
                      
                      <v-list-item-title :class="item.status === 'completed' ? 'text-decoration-line-through text-medium-emphasis' : ''">
                        {{ item.title }}
                      </v-list-item-title>
                      <v-list-item-subtitle v-if="item.description" class="text-caption">
                        {{ item.description }}
                      </v-list-item-subtitle>
                      <v-list-item-subtitle v-if="item.assigned_to" class="text-caption">
                        Assigned to: {{ item.assigned_to }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>

                  <div v-if="loadingItems" class="text-center pa-6">
                    <v-progress-circular indeterminate color="#7b1c2e" size="28" />
                  </div>

                  <div v-else-if="taskItems.length === 0" class="text-center pa-6">
                    <v-icon size="48" class="mb-2 text-disabled">mdi-checkbox-blank-outline</v-icon>
                    <div class="text-body-2 text-medium-emphasis">No items in this list</div>
                  </div>
                </v-card-text>
              </template>
            </v-card>
          </v-col>
        </v-row>

      </v-container>
    

    <v-dialog v-model="showCreateListDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Create Task List
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="newList.title"
            label="Title *"
            variant="outlined"
            density="compact"
            class="mb-3"
            placeholder="e.g., Opening Checklist"
          />
          <v-textarea
            v-model="newList.description"
            label="Description"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
          />
          <v-select
            v-model="newList.priority"
            :items="['low', 'medium', 'high', 'urgent']"
            label="Priority"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCreateListDialog = false">Cancel</v-btn>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            :loading="creatingList"
            @click="handleCreateList"
          >
            Create List
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


    <v-dialog v-model="showAddItemDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Add Task Item
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="newItem.title"
            label="Title *"
            variant="outlined"
            density="compact"
            class="mb-3"
            placeholder="e.g., Turn on lights"
          />
          <v-textarea
            v-model="newItem.description"
            label="Description"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
          />
          <v-select
            v-model="newItem.assignedTo"
            :items="employees"
            :item-title="(e) => `${e.fName} ${e.lName}`"
            item-value="user_id"
            label="Assign to (optional)"
            variant="outlined"
            density="compact"
            clearable
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddItemDialog = false">Cancel</v-btn>
          <v-btn
            color="#7b1c2e"
            variant="flat"
            :loading="addingItem"
            @click="handleAddItem"
          >
            Add Item
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── SNACKBAR ─────────────────────────────────────────────────────── -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbarMessage }}
    </v-snackbar>

  </EmployerLayout>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>