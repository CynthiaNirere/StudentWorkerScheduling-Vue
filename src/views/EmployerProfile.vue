<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from 'vuetify';  // ✅ ADD THIS
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const theme = useTheme();  // ✅ ADD THIS
const user = ref(null);

const loading = ref(false);
const saving = ref(false);

const profileForm = ref({
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
});

// NEW: Notification preferences + Theme preference
const notificationPreferences = ref({
  emailNotifications: false,
  smsNotifications: false,
  shiftReminders: true,
  swapRequests: true,
  scheduleChanges: true,
});

// ✅ ADD THIS: Theme preference
const themePreference = ref('light');

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

onMounted(async () => {
  user.value = Utils.getStore("user");
  if (user.value) {
    await loadUserProfile();
    
    // Load notification preferences from localStorage
    const savedPrefs = localStorage.getItem('notificationPreferences');
    if (savedPrefs) {
      try {
        notificationPreferences.value = JSON.parse(savedPrefs);
      } catch (err) {
        console.error('Error loading notification preferences:', err);
      }
    }
    
    // ✅ ADD THIS: Load theme preference
    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme) {
      themePreference.value = savedTheme;
      theme.global.name.value = savedTheme;
    }
  }
});

// ✅ ADD THIS: Watch for theme changes
watch(themePreference, (newTheme) => {
  theme.global.name.value = newTheme;
  localStorage.setItem('themePreference', newTheme);
  console.log('Theme changed to:', newTheme);
});

const loadUserProfile = async () => {
  loading.value = true;
  try {
    const userId = user.value.user_id || user.value.userId;
    const res = await EmployerService.getEmployeeById(userId);
    
    if (res.data) {
      const userData = res.data;
      profileForm.value = {
        first_name: userData.fName || userData.first_name || "",
        last_name: userData.lName || userData.last_name || "",
        email: userData.email || "",
        phone_number: userData.phone_number || "",
      };
      
      const updatedUser = {
        ...user.value,
        fName: userData.fName || userData.first_name,
        lName: userData.lName || userData.last_name,
        first_name: userData.fName || userData.first_name,
        last_name: userData.lName || userData.last_name,
        email: userData.email,
        phone_number: userData.phone_number,
      };
      Utils.setStore("user", updatedUser);
      user.value = updatedUser;
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    profileForm.value = {
      first_name: user.value.fName || user.value.first_name || "",
      last_name: user.value.lName || user.value.last_name || "",
      email: user.value.email || "",
      phone_number: user.value.phone_number || "",
    };
  } finally {
    loading.value = false;
  }
};

const handleSaveProfile = async () => {
  if (!profileForm.value.first_name || !profileForm.value.email) {
    showSnackbar("First name and email are required", "error");
    return;
  }

  saving.value = true;
  try {
    const userId = user.value.user_id || user.value.userId;
    
    const updateData = {
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      email: profileForm.value.email,
      phone_number: profileForm.value.phone_number || null,
    };
    
    console.log('Updating profile with:', updateData);
    
    await EmployerService.updateEmployee(userId, updateData);
    
    const updatedUser = { 
      ...user.value, 
      fName: profileForm.value.first_name,
      lName: profileForm.value.last_name,
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      email: profileForm.value.email,
      phone_number: profileForm.value.phone_number,
    };
    
    Utils.setStore("user", updatedUser);
    user.value = updatedUser;
    
    console.log('Profile updated, phone number saved:', profileForm.value.phone_number);
    
    showSnackbar("Profile updated successfully!", "success");
  } catch (err) {
    console.error('Update profile error:', err);
    showSnackbar("Error updating profile", "error");
  } finally {
    saving.value = false;
  }
};

const saveNotificationPreferences = async () => {
  try {
    localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences.value));
    console.log('Saving notification preferences:', notificationPreferences.value);
    showSnackbar("Notification preferences saved!", "success");
  } catch (err) {
    console.error('Error saving preferences:', err);
    showSnackbar("Error saving preferences", "error");
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
          Manage your account information and preferences
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center pa-6">
        <v-progress-circular indeterminate color="#12086F" size="32" />
        <div class="text-body-2 text-grey mt-3">Loading profile...</div>
      </div>

      <template v-else>
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
              readonly
            />
            <v-text-field
              v-model="profileForm.phone_number"
              label="Phone Number"
              variant="outlined"
              density="compact"
              class="mb-3"
              color="#12086F"
              placeholder="(555) 123-4567"
              hint="Your phone number will be saved when you click Save Changes"
              persistent-hint
            />
            <v-alert type="info" variant="tonal" density="compact" color="#4361EE">
              Authentication is managed through Google. You cannot change your email here.
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
                  <div class="text-caption text-grey">Phone Number (Saved)</div>
                  <div class="text-body-2">
                    {{ user?.phone_number || profileForm.phone_number || "Not set" }}
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- ✅ NEW: Appearance Settings -->
        <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
          <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
            Appearance
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <div class="text-subtitle-2 font-weight-bold mb-3">Theme</div>
            <v-btn-toggle
              v-model="themePreference"
              color="#12086F"
              variant="outlined"
              mandatory
              divided
              class="mb-3"
            >
              <v-btn value="light" class="flex-grow-1">
                <v-icon start>mdi-white-balance-sunny</v-icon>
                Light Mode
              </v-btn>
              <v-btn value="dark" class="flex-grow-1">
                <v-icon start>mdi-moon-waning-crescent</v-icon>
                Dark Mode
              </v-btn>
            </v-btn-toggle>
            <div class="text-caption text-grey">
              Choose your preferred color theme. Changes apply immediately.
            </div>
          </v-card-text>
        </v-card>

        <!-- Notification Preferences -->
        <v-card variant="outlined" rounded="lg" class="navy-card">
          <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
            Notification Preferences
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <v-alert type="info" variant="tonal" class="mb-4" color="#4361EE">
              Notification preferences are saved locally. Backend integration coming soon!
            </v-alert>
            
            <div class="mb-3">
              <div class="text-subtitle-2 font-weight-bold mb-2">Notification Channels</div>
              <v-checkbox
                v-model="notificationPreferences.emailNotifications"
                label="Email notifications"
                hint="Receive email notifications for important updates"
                persistent-hint
                color="#12086F"
                density="compact"
              />
              <v-checkbox
                v-model="notificationPreferences.smsNotifications"
                label="SMS notifications"
                hint="Receive text message notifications for urgent updates"
                persistent-hint
                color="#12086F"
                density="compact"
              />
            </div>

            <v-divider class="my-4" />

            <div class="mb-3">
              <div class="text-subtitle-2 font-weight-bold mb-2">Notification Types</div>
              <v-checkbox
                v-model="notificationPreferences.shiftReminders"
                label="Shift reminders"
                hint="Get reminded about upcoming shifts"
                persistent-hint
                color="#12086F"
                density="compact"
              />
              <v-checkbox
                v-model="notificationPreferences.swapRequests"
                label="Swap requests"
                hint="Notifications for shift swap requests"
                persistent-hint
                color="#12086F"
                density="compact"
              />
              <v-checkbox
                v-model="notificationPreferences.scheduleChanges"
                label="Schedule changes"
                hint="Be notified when schedules are published or changed"
                persistent-hint
                color="#12086F"
                density="compact"
              />
            </div>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4 justify-end">
            <v-btn
              color="#12086F"
              variant="flat"
              @click="saveNotificationPreferences"
            >
              Save Preferences
            </v-btn>
          </v-card-actions>
        </v-card>
      </template>

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