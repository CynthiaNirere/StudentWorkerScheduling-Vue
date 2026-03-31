<script setup>
import { ref, onMounted, watch } from "vue";
import { useTheme } from 'vuetify';
import Utils from "../config/utils";
import EmployerLayout from '../components/EmployerLayout.vue';

const theme = useTheme();
const user = ref(null);

const themePreference = ref('light');
const notificationPreferences = ref({
  emailNotifications: false,
  smsNotifications: false,
  shiftReminders: true,
  swapRequests: true,
  scheduleChanges: true,
  timeOffRequests: true,
});

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

onMounted(() => {
  user.value = Utils.getStore("user");
  const savedTheme = localStorage.getItem('themePreference') || 'light';
  themePreference.value = savedTheme;
  theme.global.name.value = savedTheme;

  const savedPrefs = localStorage.getItem('notificationPreferences');
  if (savedPrefs) {
    try { notificationPreferences.value = { ...notificationPreferences.value, ...JSON.parse(savedPrefs) }; } catch {}
  }
});

watch(themePreference, (newTheme) => {
  theme.global.name.value = newTheme;
  localStorage.setItem('themePreference', newTheme);
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

      <!-- Appearance -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-palette-outline</v-icon>
          Appearance
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="text-subtitle-2 font-weight-bold mb-3">Theme</div>
          <v-btn-toggle v-model="themePreference" color="#12086F" variant="outlined" mandatory divided style="width: 100%">
            <v-btn value="light" style="flex: 1">
              <v-icon start>mdi-white-balance-sunny</v-icon>Light Mode
            </v-btn>
            <v-btn value="dark" style="flex: 1">
              <v-icon start>mdi-moon-waning-crescent</v-icon>Dark Mode
            </v-btn>
          </v-btn-toggle>
          <div class="text-caption text-medium-emphasis mt-2">Changes apply immediately.</div>
        </v-card-text>
      </v-card>

      <!-- Notification Channels -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-bell-outline</v-icon>
          Notification Preferences
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
          <v-checkbox v-model="notificationPreferences.shiftReminders" label="Shift reminders" hint="Reminders about upcoming shifts" persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.swapRequests" label="Shift swap requests" hint="When an employee requests a swap" persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.timeOffRequests" label="Time off requests" hint="When an employee submits time off" persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.scheduleChanges" label="Schedule changes" hint="When schedules are published or modified" persistent-hint color="#12086F" density="compact" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn color="#12086F" variant="flat" @click="saveNotificationPreferences">Save Preferences</v-btn>
        </v-card-actions>
      </v-card>

      <!-- Account Info (role only, no IDs) -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-shield-account-outline</v-icon>
          Account
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-medium-emphasis">Role</div>
                <v-chip size="small" color="#12086F" variant="tonal" class="mt-1">{{ user?.role || 'employer' }}</v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="mb-3">
                <div class="text-caption text-medium-emphasis">Authentication</div>
                <v-chip size="small" color="secondary" variant="tonal" class="mt-1">Google OAuth</v-chip>
              </div>
            </v-col>
          </v-row>
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE">
            To update your name, phone number, or email, go to <strong>Profile</strong>.
          </v-alert>
        </v-card-text>
      </v-card>
    </v-container>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }
</style>