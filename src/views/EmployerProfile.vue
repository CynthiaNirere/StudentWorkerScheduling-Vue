<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const loading = ref(false);
const saving = ref(false);

const profileForm = ref({
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
});

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

onMounted(() => {
  user.value = Utils.getStore("user");
  if (user.value) {
    profileForm.value = {
      first_name: user.value.fName || user.value.first_name || "",
      last_name: user.value.lName || user.value.last_name || "",
      email: user.value.email || "",
      phone_number: user.value.phone_number || "",
    };
  }
});

const handleSaveProfile = async () => {
  if (!profileForm.value.first_name || !profileForm.value.email) {
    showSnackbar("First name and email are required", "error");
    return;
  }

  saving.value = true;
  try {
    const userId = user.value.user_id || user.value.userId;
    await EmployerService.updateEmployee(userId, profileForm.value);
    
    // Update stored user
    const updatedUser = { 
      ...user.value, 
      fName: profileForm.value.first_name,
      lName: profileForm.value.last_name,
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      email: profileForm.value.email,
      phone_number: profileForm.value.phone_number
    };
    Utils.setStore("user", updatedUser);
    user.value = updatedUser;
    
    showSnackbar("Profile updated successfully!", "success");
  } catch (err) {
    console.error('Update profile error:', err);
    showSnackbar("Error updating profile", "error");
  } finally {
    saving.value = false;
  }
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6" style="max-width: 900px;">
      <!-- Header -->
      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Profile & Settings</h1>
        <p class="text-body-2 text-grey">
          Manage your account information
        </p>
      </div>

      <!-- Profile Information -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Profile Information
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="profileForm.first_name"
                label="First Name *"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="profileForm.last_name"
                label="Last Name"
                variant="outlined"
                density="compact"
                color="#12086F"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model="profileForm.email"
            label="Email *"
            type="email"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />
          <v-text-field
            v-model="profileForm.phone_number"
            label="Phone Number"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE">
            Authentication is managed through Google. You cannot change your email or password here.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn
            color="#12086F"
            variant="flat"
            :loading="saving"
            @click="handleSaveProfile"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- Account Details -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Account Details
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-grey">User ID</div>
                <div class="text-body-2">{{ user?.user_id || user?.userId }}</div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-grey">Role</div>
                <v-chip size="small" color="#12086F" variant="tonal">
                  {{ user?.role }}
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-grey">Authentication Provider</div>
                <v-chip size="small" color="#4361EE" variant="tonal">
                  Google
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-grey">Last Login</div>
                <div class="text-body-2">
                  {{ user?.last_login ? new Date(Number(user.last_login)).toLocaleString() : "N/A" }}
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Notification Preferences -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Notification Preferences
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" class="mb-3" color="#4361EE">
            Notification preferences will be available in a future update.
          </v-alert>
          <v-checkbox
            label="Email notifications"
            disabled
            hint="Receive email notifications for shift changes, swap requests, etc."
            persistent-hint
            color="#12086F"
          />
          <v-checkbox
            label="SMS notifications"
            disabled
            hint="Receive text message notifications for urgent updates"
            persistent-hint
            color="#12086F"
          />
        </v-card-text>
      </v-card>

    </v-container>

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
</style>