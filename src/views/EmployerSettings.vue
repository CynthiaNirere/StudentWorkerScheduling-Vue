<script setup>
import { ref, onMounted, watch } from "vue";
import { useTheme } from 'vuetify';
import { useRouter } from 'vue-router';
import Utils from "../config/utils";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();

const theme = useTheme();
const user  = ref(null);

const darkMode = ref(false);

const notificationPreferences = ref({
  emailNotifications: false,
  smsNotifications: false,
  shiftReminders: true,
  swapRequests: true,
  scheduleChanges: true,
  timeOffRequests: true,
});

const isWorkDevice = ref(false);

const registerWorkDevice = () => {
  localStorage.setItem('isWorkDevice', 'true');
  isWorkDevice.value = true;
  showSnackbar('This device is now registered as a work device.', 'success');
};

const unregisterWorkDevice = () => {
  localStorage.removeItem('isWorkDevice');
  isWorkDevice.value = false;
  showSnackbar('Work device registration removed.', 'success');
};

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
  isWorkDevice.value = localStorage.getItem('isWorkDevice') === 'true';
});

watch(darkMode, (val) => {
  theme.global.name.value = val ? 'dark' : 'light';
  localStorage.setItem('themePreference', val ? 'dark' : 'light');
  localStorage.setItem('theme', val ? 'dark' : 'light');
});

const saveNotificationPreferences = () => {
  localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences.value));
  window.dispatchEvent(new CustomEvent('notif-prefs-updated'));
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
            Notification types control which alerts appear in your bell icon.
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

      <!-- Work Device -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-laptop</v-icon>Work Device
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 text-grey mb-4">
            Register this laptop as the work device. Employees can only clock in from a registered work device.
          </p>
          <v-alert
            v-if="isWorkDevice"
            type="success"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <v-icon start>mdi-check-circle</v-icon>
            This device is registered — employees can clock in here.
          </v-alert>
          <v-alert
            v-else
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <v-icon start>mdi-alert-circle-outline</v-icon>
            This device is not registered. Employees cannot clock in from here.
          </v-alert>
          <v-btn
            v-if="!isWorkDevice"
            color="#12086F"
            variant="flat"
            prepend-icon="mdi-laptop-account"
            @click="registerWorkDevice"
          >
            Register This Device
          </v-btn>
          <div v-else class="d-flex ga-3 flex-wrap">
            <v-btn
              color="#2E7D32"
              variant="flat"
              prepend-icon="mdi-clock-check-outline"
              size="large"
              @click="router.push({ name: 'clockKiosk' })"
            >
              Start Clock-In Mode
            </v-btn>
            <v-btn
              color="error"
              variant="tonal"
              prepend-icon="mdi-laptop-off"
              @click="unregisterWorkDevice"
            >
              Remove Registration
            </v-btn>
          </div>
        </v-card-text>
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