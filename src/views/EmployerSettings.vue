<script setup>
import { ref, onMounted, watch } from "vue";
import { useTheme } from 'vuetify';
import { useRouter } from 'vue-router';
import Utils from "../config/utils";
import EmployerLayout from '../components/EmployerLayout.vue';
import EmployerService from '../services/employerServices.js';

const router = useRouter();
const theme = useTheme();
const user  = ref(null);
const darkMode = ref(false);

// ── KIOSK PIN MANAGEMENT ──────────────────────────────────────────────────
const kioskPin = ref('');
const confirmKioskPin = ref('');
const savingPin = ref(false);
const showPinFields = ref(false);
const currentStoredPin = ref('');

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

const saveKioskPin = () => {
  if (!kioskPin.value || kioskPin.value.length !== 4 || !/^\d{4}$/.test(kioskPin.value)) {
    showSnackbar('PIN must be exactly 4 digits', 'error'); return;
  }
  if (kioskPin.value !== confirmKioskPin.value) {
    showSnackbar('PINs do not match', 'error'); return;
  }
  savingPin.value = true;
  setTimeout(() => {
    localStorage.setItem('kioskExitPin', kioskPin.value);
    currentStoredPin.value = kioskPin.value;
    kioskPin.value = '';
    confirmKioskPin.value = '';
    showPinFields.value = false;
    savingPin.value = false;
    showSnackbar('Kiosk exit PIN updated!', 'success');
  }, 300);
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
  currentStoredPin.value = localStorage.getItem('kioskExitPin') || '1234';
});

watch(darkMode, (val) => {
  theme.global.name.value = val ? 'dark' : 'light';
  localStorage.setItem('themePreference', val ? 'dark' : 'light');
  localStorage.setItem('theme', val ? 'dark' : 'light');
});

const saveNotificationPreferences = async () => {
  try {
    // Save email notification preference to backend
    if (notificationPreferences.value.emailNotifications !== undefined) {
      await EmployerService.updateEmailNotifications(
        user.value.id,
        notificationPreferences.value.emailNotifications
      );
    }
    
    // Save other preferences to localStorage
    localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences.value));
    window.dispatchEvent(new CustomEvent('notif-prefs-updated'));
    showSnackbar("Notification preferences saved!", "success");
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    showSnackbar("Error saving preferences", "error");
  }
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

      <!-- Work Device + Kiosk PIN -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-laptop</v-icon>Work Device & Kiosk
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 text-grey mb-4">
            Register this laptop as the work device. Employees can only clock in from a registered work device.
            The kiosk exit PIN prevents employees from leaving kiosk mode.
          </p>

          <v-alert v-if="isWorkDevice" type="success" variant="tonal" density="compact" class="mb-4">
            <v-icon start>mdi-check-circle</v-icon>
            This device is registered — employees can clock in here.
          </v-alert>
          <v-alert v-else type="warning" variant="tonal" density="compact" class="mb-4">
            <v-icon start>mdi-alert-circle-outline</v-icon>
            This device is not registered. Employees cannot clock in from here.
          </v-alert>

          <!-- Device registration buttons -->
          <v-btn
            v-if="!isWorkDevice"
            color="#12086F"
            variant="flat"
            prepend-icon="mdi-laptop-account"
            @click="registerWorkDevice"
            class="mb-4"
          >
            Register This Device
          </v-btn>
          <div v-else class="d-flex ga-3 flex-wrap mb-4">
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

          <!-- Kiosk EXIT PIN management -->
          <v-divider class="mb-4" />
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <p class="text-body-2 font-weight-medium mb-0">Kiosk Exit PIN</p>
              <p class="text-caption text-grey mb-0">
                Employees must enter this PIN to exit kiosk mode. Current PIN: <strong>{{ currentStoredPin.replace(/./g, '●') }}</strong>
              </p>
            </div>
            <v-btn
              size="small"
              :color="showPinFields ? 'grey' : '#12086F'"
              variant="tonal"
              :prepend-icon="showPinFields ? 'mdi-close' : 'mdi-lock-reset'"
              @click="showPinFields = !showPinFields; kioskPin = ''; confirmKioskPin = ''"
            >
              {{ showPinFields ? 'Cancel' : 'Change PIN' }}
            </v-btn>
          </div>

          <v-expand-transition>
            <div v-if="showPinFields">
              <v-row dense>
                <v-col cols="6">
                  <v-text-field
                    v-model="kioskPin"
                    label="New PIN (4 digits)"
                    variant="outlined"
                    density="compact"
                    type="password"
                    maxlength="4"
                    color="#12086F"
                    :rules="[v => /^\d{4}$/.test(v) || '4 digits required']"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="confirmKioskPin"
                    label="Confirm PIN"
                    variant="outlined"
                    density="compact"
                    type="password"
                    maxlength="4"
                    color="#12086F"
                    :rules="[v => v === kioskPin || 'PINs must match']"
                  />
                </v-col>
              </v-row>
              <v-btn
                color="#12086F"
                variant="flat"
                prepend-icon="mdi-content-save"
                :loading="savingPin"
                @click="saveKioskPin"
                class="mt-1"
              >
                Save PIN
              </v-btn>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

    </v-container>
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }

/* Dark mode card and text overrides */
.v-theme--dark .navy-card {
  border-color: #333 !important;
  background: #1e1e2e !important;
}
.v-theme--dark .navy-text {
  color: #a8b4ff !important;
}
.v-theme--dark .v-card {
  background: #1e1e2e !important;
  color: #e0e0e0 !important;
}
.v-theme--dark .v-card-text p,
.v-theme--dark .v-card-text .text-grey {
  color: #9ca3af !important;
}
.v-theme--dark .v-divider {
  border-color: #333 !important;
}
.v-theme--dark .v-list-item {
  background: #1e1e2e !important;
  color: #e0e0e0 !important;
}
.v-theme--dark .v-label {
  color: #e0e0e0 !important;
}
</style>