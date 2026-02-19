<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

// ─── DATA ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const saving = ref(false);

// ─── FORMS ────────────────────────────────────────────────────────────────
const profileForm = ref({
  fName: "",
  lName: "",
  email: "",
  phone_number: "",
});

// ─── SNACKBAR ─────────────────────────────────────────────────────────────
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

// ─── LIFECYCLE ────────────────────────────────────────────────────────────
onMounted(() => {
  user.value = Utils.getStore("user");
  if (user.value) {
    profileForm.value = {
      fName: user.value.fName || "",
      lName: user.value.lName || "",
      email: user.value.email || "",
      phone_number: user.value.phone_number || "",
    };
  }
});

// ─── ACTIONS ──────────────────────────────────────────────────────────────
const handleSaveProfile = async () => {
  if (!profileForm.value.fName || !profileForm.value.email) {
    showSnackbar("First name and email are required", "error");
    return;
  }

  saving.value = true;
  try {
    await EmployerService.updateEmployee(user.value.user_id, profileForm.value);
    
    // Update stored user
    const updatedUser = { ...user.value, ...profileForm.value };
    Utils.setStore("user", updatedUser);
    user.value = updatedUser;
    
    showSnackbar("Profile updated successfully!", "success");
  } catch (err) {
    showSnackbar("Error updating profile", "error");
  } finally {
    saving.value = false;
  }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
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
        <h1 class="text-h5 font-weight-bold">Profile & Settings</h1>
        <p class="text-body-2 text-medium-emphasis">
          Manage your account information
        </p>
      </div>

      <!-- Profile Information -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Profile Information
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="profileForm.fName"
                label="First Name *"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="profileForm.lName"
                label="Last Name"
                variant="outlined"
                density="compact"
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
          />
          <v-text-field
            v-model="profileForm.phone_number"
            label="Phone Number"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-alert type="info" variant="tonal" density="compact">
            Authentication is managed through Google. You cannot change your email or password here.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn
            color="#7b1c2e"
            variant="flat"
            :loading="saving"
            @click="handleSaveProfile"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- Account Details -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Account Details
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-medium-emphasis">User ID</div>
                <div class="text-body-2">{{ user?.user_id }}</div>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-medium-emphasis">Role</div>
                <v-chip size="small" color="primary" variant="tonal">
                  {{ user?.role }}
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-medium-emphasis">Authentication Provider</div>
                <v-chip size="small" color="info" variant="tonal">
                  Google
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-medium-emphasis">Last Login</div>
                <div class="text-body-2">
                  {{ user?.last_login ? new Date(Number(user.last_login)).toLocaleString() : "N/A" }}
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Notification Preferences -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Notification Preferences
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" class="mb-3">
            Notification preferences will be available in a future update.
          </v-alert>
          <v-checkbox
            label="Email notifications"
            disabled
            hint="Receive email notifications for shift changes, swap requests, etc."
            persistent-hint
          />
          <v-checkbox
            label="SMS notifications"
            disabled
            hint="Receive text message notifications for urgent updates"
            persistent-hint
          />
        </v-card-text>
      </v-card>

      <!-- Danger Zone -->
      <v-card variant="outlined" rounded="lg" border="error">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 text-error">
          Danger Zone
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 mb-3">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <v-btn
            color="error"
            variant="outlined"
            disabled
          >
            Delete Account
          </v-btn>
        </v-card-text>
      </v-card>

    </v-container>

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