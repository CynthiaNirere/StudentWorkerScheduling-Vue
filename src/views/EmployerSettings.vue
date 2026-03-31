<script setup>
import { ref, onMounted, watch } from "vue";
import { useTheme } from 'vuetify';
import Utils from "../config/utils";
import EmployerLayout from '../components/EmployerLayout.vue';

const theme = useTheme();
const user  = ref(null);

// ✅ Dark mode as a simple switch — same as employee
const darkMode = ref(false);

const notificationPreferences = ref({
  emailNotifications: false,
  smsNotifications: false,
  shiftReminders: true,
  swapRequests: true,
  scheduleChanges: true,
  timeOffRequests: true,
});

const snackbar        = ref(false);
const snackbarMessage = ref("");
const snackbarColor   = ref("success");

onMounted(() => {
  user.value = Utils.getStore("user");
  const savedTheme = localStorage.getItem('themePreference') || localStorage.getItem('theme') || 'light';
  darkMode.value          = savedTheme === 'dark';
  theme.global.name.value = savedTheme;

  const savedPrefs = localStorage.getItem('notificationPreferences');
  if (savedPrefs) {
    try { notificationPreferences.value = { ...notificationPreferences.value, ...JSON.parse(savedPrefs) }; } catch {}
  }
});

// ✅ Instant apply on toggle — same pattern as employee
watch(darkMode, (val) => {
  theme.global.name.value = val ? 'dark' : 'light';
  localStorage.setItem('themePreference', val ? 'dark' : 'light');
  localStorage.setItem('theme', val ? 'dark' : 'light');
});

const saveNotificationPreferences = () => {
  localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences.value));
  showSnackbar("Notification preferences saved!", "success");
};

const showSnackbar = (msg, color = "success") => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6" style="max-width: 800px;">

      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">Settings & Notifications</h1>
        <p class="text-body-2 text-grey">Manage your preferences and notification settings</p>
      </div>

      <!-- Appearance — ✅ now a switch like employee -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-palette-outline</v-icon>Appearance
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="d-flex align-center justify-space-between">
            <div>
              <p class="text-body-2 font-weight-medium mb-0">Dark Mode</p>
              <p class="text-caption text-grey mb-0">Switch between light and dark theme. Changes apply immediately.</p>
            </div>
            <v-switch v-model="darkMode" color="#12086F" hide-details />
          </div>
        </v-card-text>
      </v-card>

      <!-- Notification Preferences -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-bell-outline</v-icon>Notification Preferences
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" class="mb-5" color="#4361EE">
            Preferences are saved locally. Backend integration coming soon.
          </v-alert>
          <div class="text-subtitle-2 font-weight-bold mb-3">Channels</div>
          <v-checkbox v-model="notificationPreferences.emailNotifications" label="Email notifications" hint="Receive emails for important updates" persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.smsNotifications" label="SMS notifications" hint="Receive texts for urgent updates" persistent-hint color="#12086F" density="compact" />
          <v-divider class="my-4" />
          <div class="text-subtitle-2 font-weight-bold mb-3">Notification Types</div>
          <v-checkbox v-model="notificationPreferences.shiftReminders" label="Shift reminders" persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.swapRequests" label="Shift swap requests" persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.timeOffRequests" label="Time off requests" persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.scheduleChanges" label="Schedule changes" persistent-hint color="#12086F" density="compact" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn color="#12086F" variant="flat" @click="saveNotificationPreferences">Save Preferences</v-btn>
        </v-card-actions>
      </v-card>

      <!-- Account -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-shield-account-outline</v-icon>Account
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Role</div>
              <v-chip size="small" color="#12086F" variant="tonal" class="mt-1">{{ user?.role || 'employer' }}</v-chip>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Authentication</div>
              <v-chip size="small" color="secondary" variant="tonal" class="mt-1">Google OAuth</v-chip>
            </v-col>
          </v-row>
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mt-4">
            To update your profile, go to <strong>Profile</strong>. To sign out, use the account icon in the top right.
          </v-alert>
        </v-card-text>
      </v-card>

    </v-container>
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
</style>