<script setup>
import { ref, watch, onMounted } from 'vue';
import { useTheme } from 'vuetify';
import EmployerLayout from '../components/EmployerLayout.vue';

const theme   = useTheme();
const darkMode = ref(false);

// Notification prefs — visual only in guest mode
const notificationPreferences = ref({
  emailNotifications: false,
  smsNotifications:   false,
  shiftReminders:     true,
  swapRequests:       true,
  scheduleChanges:    true,
  timeOffRequests:    true,
});

const snackbar        = ref(false);
const snackbarMessage = ref('');
const snackbarColor   = ref('success');

onMounted(() => {
  const saved = localStorage.getItem('themePreference') || localStorage.getItem('theme') || 'light';
  darkMode.value          = saved === 'dark';
  theme.global.name.value = saved;
});

// Dark mode actually toggles — same logic as EmployerSettings
watch(darkMode, (val) => {
  theme.global.name.value = val ? 'dark' : 'light';
  localStorage.setItem('themePreference', val ? 'dark' : 'light');
  localStorage.setItem('theme',           val ? 'dark' : 'light');
});

const showSnackbar = (msg, color = 'success') => {
  snackbarMessage.value = msg;
  snackbarColor.value   = color;
  snackbar.value        = true;
};

const saveNotificationPreferences = () => {
  // Visual feedback only — nothing is persisted for guests
  showSnackbar('Preferences saved for this session!', 'success');
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6" style="max-width: 800px;">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Dark mode works! Other settings are visual demo only.
      </v-alert>

      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">Settings & Notifications</h1>
        <p class="text-body-2 text-grey">Manage your preferences and notification settings</p>
      </div>

      <!-- Appearance — FULLY FUNCTIONAL -->
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

      <!-- Notification Preferences — visual demo -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-bell-outline</v-icon>Notification Preferences
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" class="mb-5" color="#4361EE">
            Notification types control which alerts appear in your bell icon.
          </v-alert>
          <div class="text-subtitle-2 font-weight-bold mb-3">Channels</div>
          <v-checkbox v-model="notificationPreferences.emailNotifications" label="Email notifications" hint="Receive emails for important updates" persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.smsNotifications"   label="SMS notifications"   hint="Receive texts for urgent updates"     persistent-hint color="#12086F" density="compact" />
          <v-divider class="my-4" />
          <div class="text-subtitle-2 font-weight-bold mb-3">Notification Types</div>
          <v-checkbox v-model="notificationPreferences.shiftReminders"   label="Shift reminders"      persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.swapRequests"     label="Shift swap requests"  persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.timeOffRequests"  label="Time off requests"    persistent-hint color="#12086F" density="compact" class="mb-1" />
          <v-checkbox v-model="notificationPreferences.scheduleChanges"  label="Schedule changes"     persistent-hint color="#12086F" density="compact" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn color="#12086F" variant="flat" @click="saveNotificationPreferences">Save Preferences</v-btn>
        </v-card-actions>
      </v-card>

      <!-- Work Device & Kiosk — disabled in guest -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-laptop</v-icon>Work Device & Kiosk
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
            <v-icon start>mdi-lock-outline</v-icon>
            Work device registration and kiosk mode are only available to registered employers.
          </v-alert>
          <p class="text-body-2 text-grey mb-4">
            Register a laptop as the work device so employees can clock in from it.
            Set a kiosk exit PIN to prevent employees from leaving kiosk mode.
          </p>
          <v-btn color="#12086F" variant="flat" prepend-icon="mdi-laptop-account" disabled>
            Register This Device
          </v-btn>
        </v-card-text>
      </v-card>

    </v-container>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
      {{ snackbarMessage }}
    </v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }

.v-theme--dark .navy-card  { border-color: #333 !important; background: #1e1e2e !important; }
.v-theme--dark .navy-text  { color: #a8b4ff !important; }
.v-theme--dark .v-card     { background: #1e1e2e !important; color: #e0e0e0 !important; }
.v-theme--dark .v-divider  { border-color: #333 !important; }
</style>
