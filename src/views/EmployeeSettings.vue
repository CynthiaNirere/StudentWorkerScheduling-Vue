<script setup>
import { ref, onMounted, watch } from 'vue';
import { useTheme } from 'vuetify';
import Utils from '../config/utils.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const theme = useTheme();
const user  = ref(null);

const darkMode     = ref(false);
const urgentPref   = ref('email');
const urgentSaving = ref(false);

const notificationPreferences = ref({
  shiftReminders: true,
  swapRequests: true,
  timeOffRequests: true,
  scheduleChanges: true,
});

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

onMounted(() => {
  user.value = Utils.getStore('user');
  const saved = localStorage.getItem('themePreference') || localStorage.getItem('theme');
  if (saved) { darkMode.value = saved === 'dark'; theme.global.name.value = saved; }
  if (user.value?.urgentContact) urgentPref.value = user.value.urgentContact;

  const savedPrefs = localStorage.getItem('notificationPreferences');
  if (savedPrefs) {
    try { notificationPreferences.value = { ...notificationPreferences.value, ...JSON.parse(savedPrefs) }; } catch {}
  }
});

watch(darkMode, (val) => {
  theme.global.name.value = val ? 'dark' : 'light';
  localStorage.setItem('themePreference', val ? 'dark' : 'light');
  localStorage.setItem('theme', val ? 'dark' : 'light');
});

const saveUrgentPref = async () => {
  urgentSaving.value = true;
  await new Promise(r => setTimeout(r, 400));
  Utils.setStore('user', { ...user.value, urgentContact: urgentPref.value });
  user.value = Utils.getStore('user');
  urgentSaving.value = false;
  showSnackbar('Communication preference saved!');
};

const saveNotificationPreferences = () => {
  localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences.value));
  window.dispatchEvent(new CustomEvent('notif-prefs-updated'));
  showSnackbar('Notification preferences saved!');
};

const showSnackbar = (msg, color = 'success') => { snackMsg.value = msg; snackColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6" style="max-width: 700px;">

      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">Settings & Notifications</h1>
        <p class="text-body-2 text-grey">Manage your preferences</p>
      </div>

      <!-- Appearance -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
        <v-card-title class="text-body-1 font-weight-bold pa-4 navy-text">
          <v-icon start size="18">mdi-palette-outline</v-icon>Appearance
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

      <!-- Urgent Communications -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
        <v-card-title class="text-body-1 font-weight-bold pa-4 navy-text">
          <v-icon start size="18">mdi-bell-alert-outline</v-icon>Urgent Communications
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 text-grey mb-4">How should we contact you for urgent shift changes?</p>
          <v-radio-group v-model="urgentPref" color="#12086F" class="mb-4">
            <v-radio value="email">
              <template #label>
                <div class="d-flex align-center ga-2">
                  <v-icon size="18">mdi-email-outline</v-icon>
                  <span>Email <span class="text-caption text-grey">({{ user?.email }})</span></span>
                </div>
              </template>
            </v-radio>
            <v-radio value="phone" :disabled="!user?.phone_number">
              <template #label>
                <div class="d-flex align-center ga-2">
                  <v-icon size="18">mdi-phone-outline</v-icon>
                  <span>
                    Phone
                    <span v-if="user?.phone_number" class="text-caption text-grey">({{ user.phone_number }})</span>
                    <span v-else class="text-caption text-error"> — add phone number in Profile first</span>
                  </span>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
          <v-btn color="#12086F" variant="flat" :loading="urgentSaving" @click="saveUrgentPref">Save Preference</v-btn>
        </v-card-text>
      </v-card>

      <!-- Notification Types -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
        <v-card-title class="text-body-1 font-weight-bold pa-4 navy-text">
          <v-icon start size="18">mdi-bell-outline</v-icon>Notification Types
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" class="mb-4" color="#4361EE">
            Choose which notification types appear in your bell icon.
          </v-alert>
          <v-checkbox v-model="notificationPreferences.shiftReminders" label="Shift reminders" color="#12086F" density="compact" class="mb-1" hide-details />
          <v-checkbox v-model="notificationPreferences.swapRequests" label="Shift swap requests" color="#12086F" density="compact" class="mb-1" hide-details />
          <v-checkbox v-model="notificationPreferences.timeOffRequests" label="Time off requests" color="#12086F" density="compact" class="mb-1" hide-details />
          <v-checkbox v-model="notificationPreferences.scheduleChanges" label="Schedule changes" color="#12086F" density="compact" hide-details />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn color="#12086F" variant="flat" @click="saveNotificationPreferences">Save Preferences</v-btn>
        </v-card-actions>
      </v-card>

    </v-container>
    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
</style>