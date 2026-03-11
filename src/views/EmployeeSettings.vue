<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import Utils from '../config/utils.js';

const router = useRouter();
const theme  = useTheme();
const user   = ref(null);
const rail   = ref(true);

// ── PROFILE (phone) ───────────────────────────────────────────────────────
const phone      = ref('');
const phoneSaving = ref(false);
const phoneSnack  = ref(false);

const savePhone = async () => {
  phoneSaving.value = true;
  await new Promise(r => setTimeout(r, 500));
  const updated = { ...user.value, phone: phone.value };
  Utils.setStore('user', updated);
  user.value = updated;
  phoneSaving.value = false;
  phoneSnack.value  = true;
};

// ── URGENT COMMUNICATIONS ─────────────────────────────────────────────────
const urgentPref     = ref('email');   // 'email' | 'phone'
const urgentSaving   = ref(false);
const urgentSnack    = ref(false);

const saveUrgentPref = async () => {
  urgentSaving.value = true;
  await new Promise(r => setTimeout(r, 500));
  const updated = { ...user.value, urgentContact: urgentPref.value };
  Utils.setStore('user', updated);
  user.value = updated;
  urgentSaving.value = false;
  urgentSnack.value  = true;
};

// ── APPEARANCE ────────────────────────────────────────────────────────────
const darkMode = ref(false);

const toggleDarkMode = (val) => {
  theme.global.name.value = val ? 'dark' : 'light';
  localStorage.setItem('theme', val ? 'dark' : 'light');
};

// ── SIGN OUT ──────────────────────────────────────────────────────────────
const signOutDialog = ref(false);

const confirmSignOut = () => {
  Utils.setStore('user', null);
  router.push('/login');
};

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(() => {
  user.value = Utils.getStore('user');
  if (user.value) {
    phone.value      = user.value.phone        || '';
    urgentPref.value = user.value.urgentContact || 'email';
  }
  const saved = localStorage.getItem('theme');
  if (saved) {
    darkMode.value             = saved === 'dark';
    theme.global.name.value    = saved;
  }
});
</script>

<template>
  <v-app>

    <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
    <v-navigation-drawer
      :rail="rail"
      @mouseenter="rail = false"
      @mouseleave="rail = true"
      permanent width="280"
      class="employee-sidebar"
    >
      <div class="d-flex align-center pa-4" style="min-height:64px;background:rgba(0,0,0,0.15)">
        <template v-if="!rail">
          <div>
            <h2 class="text-h6 font-weight-bold text-white mb-0">ShiftBoard</h2>
          </div>
        </template>
        <v-icon v-else size="32" color="white">mdi-calendar-clock</v-icon>
      </div>
      <v-divider style="border-color:rgba(255,255,255,0.2)" />
      <v-list nav class="px-2 mt-2">
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeDashboard' })" />
        <v-list-item prepend-icon="mdi-clock-outline" title="My Availability" rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeAvailability' })" />
        <v-list-item prepend-icon="mdi-calendar-month" title="Team Schedule" rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeSchedule' })" />
        <v-list-item prepend-icon="mdi-account-circle-outline" title="Profile" rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeProfile' })" />
        <v-list-item prepend-icon="mdi-cog-outline" title="Settings" active rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeSettings' })" />
      </v-list>
    </v-navigation-drawer>

    <!-- ── App Bar ───────────────────────────────────────────────────────── -->
    <v-app-bar color="white" elevation="0" style="border-bottom:1px solid #e0e0e0" density="compact">
      <v-spacer />
      <v-menu location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon size="small" class="mr-2">
            <v-avatar size="36" color="#12086F" class="text-caption font-weight-bold text-white">
              {{ (user?.fName?.[0] || '') + (user?.lName?.[0] || '') || 'E' }}
            </v-avatar>
          </v-btn>
        </template>
        <v-card min-width="200">
          <v-card-text class="pa-4">
            <div class="text-center mb-3">
              <v-avatar size="48" color="#12086F" class="text-caption font-weight-bold text-white mb-2">
                {{ (user?.fName?.[0] || '') + (user?.lName?.[0] || '') || 'E' }}
              </v-avatar>
              <p class="text-body-2 font-weight-bold mb-0">{{ user?.fName }} {{ user?.lName }}</p>
              <p class="text-caption text-grey">{{ user?.email }}</p>
            </div>
            <v-divider class="mb-2" />
            <v-list density="compact" class="pa-0">
              <v-list-item prepend-icon="mdi-account" title="Profile" @click="router.push({ name: 'employeeProfile' })" />
              <v-list-item prepend-icon="mdi-logout" title="Sign Out" class="text-error" @click="signOutDialog = true" />
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- ── Main ─────────────────────────────────────────────────────────── -->
    <v-main style="background:#f5f5f5">
      <v-container fluid class="pa-6" style="max-width:700px">

        <div class="mb-6">
          <h1 class="text-h4 font-weight-bold navy-text">Settings</h1>
          <p class="text-body-2 text-grey mb-0">Manage your account preferences</p>
        </div>

        <!-- ── 1. Profile ──────────────────────────────────────────────── -->
        <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
            <v-icon size="18" color="#12086F">mdi-account-outline</v-icon>
            Profile
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <p class="text-body-2 text-grey mb-4">Update your contact details.</p>
            <v-text-field
              v-model="phone"
              label="Phone Number"
              variant="outlined"
              density="compact"
              color="#12086F"
              prepend-inner-icon="mdi-phone-outline"
              placeholder="+1 (555) 000-0000"
              hint="Used for urgent notifications"
              persistent-hint
              class="mb-4"
            />
            <v-btn color="#12086F" variant="flat" :loading="phoneSaving" @click="savePhone">
              Save Phone Number
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- ── 2. Urgent Communications ────────────────────────────────── -->
        <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
            <v-icon size="18" color="#12086F">mdi-bell-alert-outline</v-icon>
            Urgent Communications
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <p class="text-body-2 text-grey mb-4">
              How should we contact you for urgent shift changes or alerts?
            </p>
            <v-radio-group v-model="urgentPref" color="#12086F" class="mb-4">
              <v-radio label="Email" value="email">
                <template #label>
                  <div class="d-flex align-center ga-2">
                    <v-icon size="18">mdi-email-outline</v-icon>
                    <span>Email <span class="text-caption text-grey">({{ user?.email }})</span></span>
                  </div>
                </template>
              </v-radio>
              <v-radio value="phone" :disabled="!phone">
                <template #label>
                  <div class="d-flex align-center ga-2">
                    <v-icon size="18">mdi-phone-outline</v-icon>
                    <span>
                      Phone number
                      <span v-if="phone" class="text-caption text-grey">({{ phone }})</span>
                      <span v-else class="text-caption text-error"> — add a phone number above first</span>
                    </span>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
            <v-btn color="#12086F" variant="flat" :loading="urgentSaving" @click="saveUrgentPref">
              Save Preference
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- ── 3. Appearance ────────────────────────────────────────────── -->
        <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
            <v-icon size="18" color="#12086F">mdi-palette-outline</v-icon>
            Appearance
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <div class="d-flex align-center justify-space-between">
              <div>
                <p class="text-body-2 font-weight-medium mb-0">Dark Mode</p>
                <p class="text-caption text-grey mb-0">Switch between light and dark theme</p>
              </div>
              <v-switch
                v-model="darkMode"
                color="#12086F"
                hide-details
                @update:model-value="toggleDarkMode"
              />
            </div>
          </v-card-text>
        </v-card>

        <!-- ── 4. Sign Out ──────────────────────────────────────────────── -->
        <v-card variant="outlined" rounded="lg" class="navy-card">
          <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
            <v-icon size="18" color="#12086F">mdi-logout</v-icon>
            Sign Out
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <p class="text-body-2 text-grey mb-4">End your current session and return to the login page.</p>
            <v-btn color="error" variant="tonal" prepend-icon="mdi-logout" @click="signOutDialog = true">
              Sign Out
            </v-btn>
          </v-card-text>
        </v-card>

      </v-container>
    </v-main>

    <!-- ── Sign Out Confirmation Dialog ─────────────────────────────────── -->
    <v-dialog v-model="signOutDialog" max-width="360">
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4">Sign out?</v-card-title>
        <v-card-text class="pa-4 pt-0 text-body-2 text-grey">
          You'll be redirected to the login page.
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="signOutDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmSignOut">Sign Out</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Snackbars ─────────────────────────────────────────────────────── -->
    <v-snackbar v-model="phoneSnack" color="success" timeout="3000" location="bottom right">
      Phone number saved!
    </v-snackbar>
    <v-snackbar v-model="urgentSnack" color="success" timeout="3000" location="bottom right">
      Communication preference saved!
    </v-snackbar>

  </v-app>
</template>

<style scoped>
.employee-sidebar { background: linear-gradient(180deg, #12086F 0%, #2B354F 100%) !important; }
.employee-sidebar :deep(.v-list-item__prepend .v-icon) { color: white !important; opacity: 1 !important; }
.employee-sidebar :deep(.v-list-item-title) { color: white !important; }
.employee-sidebar :deep(.v-list-item) { transition: all 0.2s; }
.employee-sidebar :deep(.v-list-item:hover) { background-color: rgba(255,255,255,0.1) !important; }
.employee-sidebar :deep(.v-list-item--active) { background-color: rgba(255,255,255,0.14) !important; }
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0 !important; box-shadow: 0 1px 3px rgba(18,8,111,0.05) !important; }
</style>
