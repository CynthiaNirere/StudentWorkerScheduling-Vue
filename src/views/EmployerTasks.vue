<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const taskLists = ref([]);
const selectedList = ref(null);
const taskItems = ref([]);
const employees = ref([]);
const loading = ref(false);
const loadingItems = ref(false);

const showCreateListDialog = ref(false);
const showAddItemDialog = ref(false);
const showDeleteDialog = ref(false);
const listToDelete = ref(null);
const creatingList = ref(false);
const addingItem = ref(false);
const deleting = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

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

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadTaskLists(), loadEmployees()]);
});

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
    const currentUserId = user.value?.user_id || user.value?.userId;
    employees.value = all.filter((u) => {
      const empId = u.user_id || u.userId;
      return u.role === "employee" && empId !== currentUserId;
    });
  } catch (err) {
    console.error("Error loading employees:", err);
  }
};

const handleCreateList = async () => {
  if (!newList.value.title) {
    showSnackbar("Title is required", "error");
    return;
  }

  creatingList.value = true;
  try {
    await EmployerService.createTaskList({
      ...newList.value,
      createdBy: user.value?.user_id || user.value?.userId,
      locationId: user.value?.work_location || 1,
      createdAt: Date.now(),
    });
    showSnackbar("Task list created!", "success");
    showCreateListDialog.value = false;
    newList.value = { title: "", description: "", priority: "medium" };
    await loadTaskLists();
  } catch (err) {
    console.error('Create list error:', err);
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
      tasklistId: selectedList.value.tasklist_id || selectedList.value.id,
      ...newItem.value,
      status: 'pending',
      createdAt: Date.now(),
    });
    showSnackbar("Task item added!", "success");
    showAddItemDialog.value = false;
    newItem.value = { title: "", description: "", assignedTo: "" };
    await loadTaskItems(selectedList.value.tasklist_id || selectedList.value.id);
  } catch (err) {
    console.error('Add item error:', err);
    showSnackbar("Error adding task item", "error");
  } finally {
    addingItem.value = false;
  }
};

const handleCompleteItem = async (item) => {
  try {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    await EmployerService.updateTaskItem(item.item_id || item.id, { status: newStatus });
    showSnackbar(newStatus === 'completed' ? "Task marked as complete!" : "Task marked as pending", "success");
    await loadTaskItems(selectedList.value.tasklist_id || selectedList.value.id);
  } catch (err) {
    console.error('Complete item error:', err);
    showSnackbar("Error updating task", "error");
  }
};

const openDeleteDialog = (list) => {
  listToDelete.value = list;
  showDeleteDialog.value = true;
};

const confirmDeleteList = async () => {
  if (!listToDelete.value) return;
  
  deleting.value = true;
  try {
    await EmployerService.deleteTaskList(listToDelete.value.tasklist_id || listToDelete.value.id);
    showSnackbar("Task list deleted", "success");
    if (selectedList.value?.tasklist_id === listToDelete.value.tasklist_id) {
      selectedList.value = null;
      taskItems.value = [];
    }
    await loadTaskLists();
  } catch (err) {
    console.error('Delete list error:', err);
    showSnackbar("Error deleting list", "error");
  } finally {
    deleting.value = false;
    showDeleteDialog.value = false;
    listToDelete.value = null;
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
          <h1 class="text-h4 font-weight-bold navy-text">Task Management</h1>
          <p class="text-body-2 text-grey">
            Create and manage task lists for your team
          </p>
        </div>
        <v-btn
          color="#12086F"
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
                      @click.stop="openDeleteDialog(list)"
                    />
                  </template>
                </v-list-item>
              </v-list>

              <div v-if="taskLists.length === 0" class="text-center pa-6">
                <v-icon size="48" class="mb-2 text-grey">mdi-clipboard-list-outline</v-icon>
                <div class="text-body-2 text-grey">No task lists yet</div>
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
                    :key="item.item_id || item.id"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="item.status === 'completed'"
                        @update:model-value="handleCompleteItem(item)"
                        color="#12086F"
                      />
                    </template>
                    
                    <v-list-item-title :class="item.status === 'completed' ? 'text-decoration-line-through text-grey' : ''">
                      {{ item.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="item.description" class="text-caption">
                      {{ item.description }}
                    </v-list-item-subtitle>
                    <v-list-item-subtitle v-if="item.assigned_to || item.assignedTo" class="text-caption">
                      Assigned to: {{ item.assigned_to || item.assignedTo }}
                    </v-list-item-subtitle>
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

    <!-- Create List Dialog -->
    <v-dialog v-model="showCreateListDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
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
            color="#12086F"
          />
          <v-textarea
            v-model="newList.description"
            label="Description"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
            color="#12086F"
          />
          <v-select
            v-model="newList.priority"
            :items="['low', 'medium', 'high', 'urgent']"
            label="Priority"
            variant="outlined"
            density="compact"
            color="#12086F"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCreateListDialog = false">Cancel</v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            :loading="creatingList"
            @click="handleCreateList"
          >
            Create List
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Item Dialog -->
    <v-dialog v-model="showAddItemDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
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
            color="#12086F"
          />
          <v-textarea
            v-model="newItem.description"
            label="Description"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
            color="#12086F"
          />
          <v-select
            v-model="newItem.assignedTo"
            :items="employees"
            :item-title="(e) => `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`"
            item-value="user_id"
            label="Assign to (optional)"
            variant="outlined"
            density="compact"
            clearable
            color="#12086F"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddItemDialog = false">Cancel</v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            :loading="addingItem"
            @click="handleAddItem"
          >
            Add Item
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg" v-if="listToDelete">
        <v-card-title class="text-h6 pa-5 pb-4">Confirm Delete</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">
            Are you sure you want to delete <strong>{{ listToDelete.title }}</strong>?
          </p>
          <p class="text-body-2 text-grey mt-2">
            This will also delete all items in this list. This action cannot be undone.
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false" :disabled="deleting">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            @click="confirmDeleteList"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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