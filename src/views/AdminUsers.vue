<script setup>
import { ref, onMounted } from "vue";
import UserServices from "../services/userServices";
import { useRouter } from "vue-router";

const router = useRouter();
const valid = ref(true);
const users = ref([]);
const search = ref("");
const newUser = ref({
  fName: "",
  lName: "",
  email: "",
  role: "",
});
const selectedUser = ref(null);
const showAddDialog = ref(false);
const showEditDialog = ref(false);

// ✨ NEW: Beautiful confirmation and notification
const showDeleteDialog = ref(false);
const userToDelete = ref(null);
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

// Role options
const roles = [
  { title: "Admin", value: "admin" },
  { title: "Coach", value: "coach" },
  { title: "Athlete", value: "athlete" },
];

// Table headers
const headers = [
  { title: 'ID', key: 'id' },
  { title: 'First Name', key: 'fName' },
  { title: 'Last Name', key: 'lName' },
  { title: 'Email', key: 'email' },
  { title: 'Role', key: 'role' },
  { title: 'Actions', key: 'actions', sortable: false }
];

// ✨ Show notification snackbar
const showNotification = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

// Load all users
const fetchUsers = async () => {
  try {
    const response = await UserServices.getAllUsers();
    users.value = response.data;
  } catch (error) {
    showNotification("Error loading users: " + error.message, "error");
    console.error("Error fetching users:", error);
  }
};

// Create user
const saveUser = async () => {
  try {
    await UserServices.createUser(newUser.value);
    showNotification("User created successfully!");
    newUser.value = { fName: "", lName: "", email: "", role: "" };
    showAddDialog.value = false;
    fetchUsers();
  } catch (error) {
    showNotification(
      "Error creating user: " + (error.response?.data?.message || error.message),
      "error"
    );
  }
};

// Select user to edit
const editUser = (item) => {
  const user = item.raw || item;
  selectedUser.value = { ...user };
  showEditDialog.value = true;
};

// Update user
const updateUser = async () => {
  try {
    await UserServices.updateUser(selectedUser.value.id, selectedUser.value);
    showNotification("User updated successfully!");
    showEditDialog.value = false;
    selectedUser.value = null;
    fetchUsers();
  } catch (error) {
    showNotification(
      "Error updating user: " + (error.response?.data?.message || error.message),
      "error"
    );
  }
};

// ✨ NEW: Confirm delete with beautiful dialog
const confirmDeleteUser = (item) => {
  const user = item.raw || item;
  userToDelete.value = user;
  showDeleteDialog.value = true;
};

// ✨ NEW: Execute delete
const deleteUser = async () => {
  if (!userToDelete.value) return;

  try {
    await UserServices.deleteUser(userToDelete.value.id);
    showNotification("User deleted successfully!");
    showDeleteDialog.value = false;
    userToDelete.value = null;
    fetchUsers();
  } catch (error) {
    showNotification(
      "Error deleting user: " + (error.response?.data?.message || error.message),
      "error"
    );
    showDeleteDialog.value = false;
    userToDelete.value = null;
  }
};

// Cancel actions
const cancelAdd = () => {
  newUser.value = { fName: "", lName: "", email: "", role: "" };
  showAddDialog.value = false;
};

const cancelEdit = () => {
  selectedUser.value = null;
  showEditDialog.value = false;
};

const cancelDelete = () => {
  userToDelete.value = null;
  showDeleteDialog.value = false;
};

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <v-container>
    <v-card class="mx-auto" max-width="1200">
      <!-- Header -->
      <v-card-title class="text-h4 font-weight-bold pa-6">
        User Management
        <v-spacer></v-spacer>
        <v-btn 
          color="primary" 
          size="large"
          @click="showAddDialog = true"
          prepend-icon="mdi-plus"
        >
          Add User
        </v-btn>
      </v-card-title>
      
      <v-card-subtitle class="text-h6 pa-6 pt-0 text-grey">
        Manage system users and roles
      </v-card-subtitle>

      <!-- Users Table -->
      <v-card-text class="pa-6 pt-0">
        <v-data-table
          :headers="headers"
          :items="users"
          :search="search"
          class="elevation-1"
          :items-per-page="10"
        >
          <!-- Search -->
          <template v-slot:top>
            <v-text-field
              v-model="search"
              append-inner-icon="mdi-magnify"
              label="Search users"
              single-line
              hide-details
              class="mb-4"
            ></v-text-field>
          </template>

          <!-- Role Column -->
          <template v-slot:item.role="{ item }">
            <v-chip
              :color="
                (item.raw || item).role === 'admin' ? 'error' : 
                (item.raw || item).role === 'coach' ? 'primary' : 
                'success'
              "
              size="small"
            >
              {{ (item.raw || item).role }}
            </v-chip>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <v-btn
              color="primary"
              size="small"
              variant="tonal"
              class="mr-2"
              @click="editUser(item)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              color="error"
              size="small"
              variant="tonal"
              @click="confirmDeleteUser(item)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add User Dialog -->
    <v-dialog v-model="showAddDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon left color="white">mdi-account-plus</v-icon>
          Add New User
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form v-model="valid">
            <v-text-field
              v-model="newUser.fName"
              label="First Name *"
              variant="outlined"
              :counter="50"
              required
            ></v-text-field>
            <v-text-field
              v-model="newUser.lName"
              label="Last Name *"
              variant="outlined"
              :counter="50"
              required
            ></v-text-field>
            <v-text-field
              v-model="newUser.email"
              label="Email *"
              variant="outlined"
              type="email"
              required
            ></v-text-field>
            <v-select
              v-model="newUser.role"
              :items="roles"
              item-title="title"
              item-value="value"
              label="Role *"
              variant="outlined"
              required
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelAdd">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!valid || !newUser.fName || !newUser.lName || !newUser.email || !newUser.role"
            @click="saveUser"
          >
            <v-icon left>mdi-check</v-icon>
            Save User
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit User Dialog -->
    <v-dialog v-model="showEditDialog" max-width="600px" persistent>
      <v-card v-if="selectedUser">
        <v-card-title class="bg-primary text-white">
          <v-icon left color="white">mdi-account-edit</v-icon>
          Edit User
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form v-model="valid">
            <v-text-field
              v-model="selectedUser.fName"
              label="First Name *"
              variant="outlined"
              :counter="50"
              required
            ></v-text-field>
            <v-text-field
              v-model="selectedUser.lName"
              label="Last Name *"
              variant="outlined"
              :counter="50"
              required
            ></v-text-field>
            <v-text-field
              v-model="selectedUser.email"
              label="Email *"
              variant="outlined"
              type="email"
              required
            ></v-text-field>
            <v-select
              v-model="selectedUser.role"
              :items="roles"
              item-title="title"
              item-value="value"
              label="Role *"
              variant="outlined"
              required
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!valid"
            @click="updateUser"
          >
            <v-icon left>mdi-check</v-icon>
            Update User
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✨ Beautiful Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon left color="white">mdi-alert-circle</v-icon>
          Confirm Delete
        </v-card-title>

        <v-card-text class="pt-6">
          <div v-if="userToDelete" class="text-center">
            <v-icon size="64" color="error" class="mb-4">mdi-account-remove</v-icon>
            <p class="text-h6 mb-2">Are you sure you want to delete this user?</p>
            <v-card variant="tonal" color="grey-lighten-4" class="pa-4 my-4">
              <div class="text-body-1 font-weight-bold">
                {{ userToDelete.fName }} {{ userToDelete.lName }}
              </div>
              <div class="text-caption text-grey">{{ userToDelete.email }}</div>
              <v-chip :color="userToDelete.role === 'admin' ? 'error' : userToDelete.role === 'coach' ? 'primary' : 'success'" size="small" class="mt-2">
                {{ userToDelete.role }}
              </v-chip>
            </v-card>
            <v-alert type="warning" variant="tonal" density="compact">
              <strong>Warning:</strong> This action cannot be undone. All user data will be permanently removed.
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions class="px-6 pb-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelDelete">
            Cancel
          </v-btn>
          <v-btn color="error" @click="deleteUser">
            <v-icon left>mdi-delete</v-icon>
            Delete User
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✨ Beautiful Snackbar Notification -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
      location="top"
      elevation="24"
    >
      <div class="d-flex align-center">
        <v-icon 
          :icon="snackbarColor === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'" 
          class="mr-3"
        ></v-icon>
        <span>{{ snackbarMessage }}</span>
      </div>
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<style scoped>
/* Custom styles if needed */
</style>