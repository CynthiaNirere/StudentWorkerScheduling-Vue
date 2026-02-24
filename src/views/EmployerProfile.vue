<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import businessAreaServices from "../services/businessAreaServices.js";

const router = useRouter();
const user = ref(null);
const businessArea = ref('');
const saving = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const profileForm = ref({
  name: "",
  email: "",
  workplace: "",
  hoursOfOperation: "",
});

onMounted(async () => {
  user.value = Utils.getStore("user");

  if (user.value) {
    profileForm.value = {
      name: `${user.value.fName || ''} ${user.value.lName || ''}`.trim(),
      email: user.value.email || "",
      workplace: "",
      hoursOfOperation: "Monday-Friday: 8:00 AM - 10:00 PM"
    };

    if (user.value.work_location) {
      try {
        const response = await businessAreaServices.getById(user.value.work_location);
        const area = response.data || response;
        profileForm.value.workplace = area.name || "";
        businessArea.value = area.name || "";
      } catch (err) {
        console.error("Error fetching workplace:", err);
        const selectedArea = Utils.getStore("selectedBusinessArea");
        profileForm.value.workplace = selectedArea?.name || "";
        businessArea.value = selectedArea?.name || "";
      }
    }
  }
});

const handleSaveProfile = async () => {
  if (!profileForm.value.name || !profileForm.value.email) {
    showSnackbar("Name and email are required", "error");
    return;
  }

  saving.value = true;
  try {
    const nameParts = profileForm.value.name.split(' ');
    const updateData = {
      fName: nameParts[0] || '',
      lName: nameParts.slice(1).join(' ') || '',
      email: profileForm.value.email,
      phone_number: user.value.phone_number || '',
    };

    await EmployerService.updateEmployee(user.value.user_id, updateData);

    const updatedUser = { ...user.value, ...updateData };
    Utils.setStore("user", updatedUser);
    user.value = updatedUser;

    showSnackbar("Profile updated successfully!", "success");
  } catch (err) {
    showSnackbar("Error updating profile", "error");
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  if (user.value) {
    profileForm.value = {
      name: `${user.value.fName || ''} ${user.value.lName || ''}`.trim(),
      email: user.value.email || "",
      workplace: businessArea.value || "",
      hoursOfOperation: "Monday-Friday: 8:00 AM - 10:00 PM"
    };
  }
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

const navigateTo = (routeName) => {
  router.push({ name: routeName });
};
</script>

<template>
  <div class="profile-container">
    <v-navigation-drawer permanent class="sidebar">
      <div class="sidebar-header pa-4">
        <h2 class="text-h6 font-weight-bold text-white">TalonTime</h2>
        <p class="text-caption text-white-80 mt-2 mb-0">{{ businessArea }}</p>
      </div>

      <v-divider></v-divider>

      <v-list nav>
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" @click="navigateTo('employerDashboard')"></v-list-item>
        <v-list-item prepend-icon="mdi-calendar-clock" title="Schedule" @click="navigateTo('employerSchedule')"></v-list-item>
        <v-list-item prepend-icon="mdi-account-group" title="Employees" @click="navigateTo('employerEmployees')"></v-list-item>
        <v-list-item prepend-icon="mdi-clock-check" title="Availability Review" @click="navigateTo('employerAvailability')"></v-list-item>
        <v-list-item prepend-icon="mdi-check-circle" title="Approvals"></v-list-item>
        <v-list-item prepend-icon="mdi-checkbox-marked-circle-outline" title="Tasks" @click="navigateTo('employerTasks')"></v-list-item>
        <v-list-item prepend-icon="mdi-calendar" title="Calendar"></v-list-item>
        <v-list-item prepend-icon="mdi-file-document-outline" title="Profile" active color="primary"></v-list-item>
      </v-list>

      <v-spacer></v-spacer>

      <v-list nav class="pb-4">
        <v-list-item prepend-icon="mdi-logout" title="Sign Out" @click="() => { Utils.setStore('user', null); router.push('/login'); }"></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <div class="main-content">
      <div class="profile-header pa-6">
        <h1 class="text-h4 font-weight-bold">Profile</h1>
      </div>

      <div class="profile-form pa-6 d-flex justify-center">
        <v-card class="profile-card" elevation="2">
          <v-card-text class="pa-6">
            <v-form>
              <v-text-field v-model="profileForm.name" label="Name" variant="outlined" class="mb-4" prepend-inner-icon="mdi-account"></v-text-field>
              <v-text-field v-model="profileForm.email" label="Email" type="email" variant="outlined" class="mb-4 greyed-out-field" prepend-inner-icon="mdi-email" readonly></v-text-field>
              <v-text-field v-model="profileForm.workplace" label="Workplace" variant="outlined" class="mb-4 greyed-out-field" prepend-inner-icon="mdi-office-building" readonly></v-text-field>
              <v-text-field v-model="profileForm.hoursOfOperation" label="Hours of Operation" variant="outlined" class="mb-6" prepend-inner-icon="mdi-clock-time-four"></v-text-field>

              <div class="d-flex justify-end gap-3">
                <v-btn variant="outlined" @click="handleCancel" class="cancel-btn">Cancel</v-btn>
                <v-btn color="primary" variant="flat" :loading="saving" @click="handleSaveProfile" class="save-btn">Save Changes</v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </div>
    </div>
  </div>

  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
    {{ snackbarMessage }}
  </v-snackbar>
</template>

<style scoped>
.profile-container {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.sidebar {
  width: 280px;
  background: linear-gradient(to bottom, #12086f, #0d0660);
  color: white;
}

.sidebar-header {
  background-color: rgba(0, 0, 0, 0.1);
}

.white-80 {
  color: rgba(255, 255, 255, 0.8);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.profile-header {
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.profile-card {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 700px;
}

.save-btn {
  min-width: 120px;
  background-color: #12086f !important;
  color: white !important;
}

.cancel-btn {
  min-width: 120px;
  border-color: #12086f !important;
  color: #12086f !important;
}

.v-field--focused .v-field__outline {
  border-color: #12086f;
}

.greyed-out-field :deep(.v-field__field) {
  background-color: transparent !important;
}

.greyed-out-field :deep(.v-field__input) {
  color: #9e9e9e !important;
  cursor: not-allowed !important;
}

.greyed-out-field :deep(.v-field__outline) {
  border-color: #bdbdbd !important;
}

.greyed-out-field :deep(.v-label) {
  color: #9e9e9e !important;
}

.greyed-out-field :deep(.v-icon) {
  color: #9e9e9e !important;
}
</style>