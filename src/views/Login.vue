<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import SocialLogin from "../components/SocialLogin.vue";
import Utils from "../config/utils.js";

const router = useRouter();

// ── WORKPLACE PICKER ──────────────────────────────────────────────────────
const showWorkplacePicker = ref(false);
const availableWorkplaces = ref([]);
const selectedWorkplace   = ref(null);
const pendingUserData     = ref(null);
const pickingWorkplace    = ref(false);

// ── BLOCKED ───────────────────────────────────────────────────────────────
const showBlockedDialog = ref(false);
const blockedUserName   = ref('');

const handleLoginSuccess = (event) => {
  const data = event.detail;

  if (data.needsWorkplaceSelect && Array.isArray(data.workplaces) && data.workplaces.length > 1) {
    pendingUserData.value     = data;
    availableWorkplaces.value = data.workplaces;
    showWorkplacePicker.value = true;
    return;
  }

  // Single workplace — SocialLogin already stored user and redirects,
  // but handle as fallback just in case
  completeLogin(data, data.work_location);
};

const handleLoginBlocked = (event) => {
  const data = event?.detail || {};
  blockedUserName.value   = data.fName || '';
  showBlockedDialog.value = true;
};

const completeLogin = (userData, workLocation) => {
  const toStore = { ...userData, work_location: workLocation };
  Utils.setStore('user', toStore);

  if (userData.role === 'admin')    { router.push({ name: 'roleSelect' });        return; }
  if (userData.role === 'employer') { router.push({ name: 'employerDashboard' }); return; }
  router.push({ name: 'employeeDashboard' });
};

const confirmWorkplace = () => {
  if (!selectedWorkplace.value || !pendingUserData.value) return;
  pickingWorkplace.value = true;

  // Find the full workplace object so we can store location name too
  const wp = availableWorkplaces.value.find(
    w => (w.location_id || w.id) === selectedWorkplace.value
  );

  const userData = {
    ...pendingUserData.value,
    work_location:      selectedWorkplace.value,
    work_location_name: wp?.name || '',
  };

  Utils.setStore('user', userData);
  showWorkplacePicker.value = false;
  pickingWorkplace.value    = false;

  if (userData.role === 'admin')    { router.push({ name: 'roleSelect' });        return; }
  if (userData.role === 'employer') { router.push({ name: 'employerDashboard' }); return; }
  router.push({ name: 'employeeDashboard' });
};

const goToGuest = () => {
  // Clear any stale user data first
  localStorage.removeItem('user');
  localStorage.setItem('isGuest', 'true');
  showBlockedDialog.value = false;

  // ✅ Try router first, fall back to window.location for AWS deployment
  try {
    const resolved = router.resolve({ name: 'guestDashboard' });
    if (resolved && resolved.name !== '404' && resolved.matched.length > 0) {
      router.push({ name: 'guestDashboard' });
    } else {
      // Route name not found — use path directly
      console.warn('guestDashboard route not found by name, using path');
      window.location.href = '/guest';
    }
  } catch (err) {
    console.error('Router push failed:', err);
    window.location.href = '/guest';
  }
};

const tryDifferentAccount = () => {
  // Clear everything so Google picks show again
  localStorage.removeItem('user');
  localStorage.removeItem('isGuest');
  showBlockedDialog.value = false;

  // Force Google to show account picker again
  try {
    window.google?.accounts?.id?.disableAutoSelect();
    window.google?.accounts?.id?.prompt();
  } catch {}
};

onMounted(() => {
  window.addEventListener('shiftboard-login-success', handleLoginSuccess);
  window.addEventListener('shiftboard-login-blocked', handleLoginBlocked);
});

onUnmounted(() => {
  window.removeEventListener('shiftboard-login-success', handleLoginSuccess);
  window.removeEventListener('shiftboard-login-blocked', handleLoginBlocked);
});
</script>

<template>
  <div class="login-page">
    <span class="bg-icon ic-1 mdi mdi-calendar-month-outline"></span>
    <span class="bg-icon ic-2 mdi mdi-clock-outline"></span>
    <span class="bg-icon ic-3 mdi mdi-bell-outline"></span>
    <span class="bg-icon ic-4 mdi mdi-clipboard-check-outline"></span>
    <span class="bg-icon ic-5 mdi mdi-chart-bar"></span>
    <span class="bg-icon ic-6 mdi mdi-account-group-outline"></span>

    <div class="login-card">
      <div class="login-header">
        <div class="logo-mark">S</div>
        <h1 class="app-name">ShiftBoard</h1>
        <p class="tagline">Smart scheduling for student workers</p>
      </div>
      <div class="login-divider"></div>
      <SocialLogin />
      <p class="login-footer">Secure login with Google Authentication</p>
    </div>

    <!-- ── WORKPLACE PICKER ─────────────────────────────────────────────── -->
    <v-dialog v-model="showWorkplacePicker" max-width="440" persistent>
      <v-card rounded="xl">
        <v-card-text class="pa-6 text-center">
          <div class="logo-mark mx-auto mb-4">S</div>
          <h2 class="text-h6 font-weight-bold mb-1" style="color:#12086F;">Select Workplace</h2>
          <p class="text-body-2 text-grey mb-5">
            You're linked to multiple workplaces. Which one would you like to sign in to?
          </p>

          <v-radio-group v-model="selectedWorkplace" color="#12086F" class="text-left">
            <v-radio
              v-for="wp in availableWorkplaces"
              :key="wp.location_id || wp.id"
              :value="wp.location_id || wp.id"
              class="workplace-radio mb-2"
            >
              <template #label>
                <div class="d-flex align-center ga-3 py-1">
                  <v-icon color="#12086F">mdi-map-marker-outline</v-icon>
                  <div>
                    <div class="text-body-2 font-weight-bold" style="color:#12086F;">{{ wp.name }}</div>
                    <div v-if="wp.address" class="text-caption text-grey">{{ wp.address }}</div>
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>

          <v-btn block color="#12086F" variant="flat" size="large" rounded="lg"
            :disabled="!selectedWorkplace" :loading="pickingWorkplace"
            class="mt-2" @click="confirmWorkplace">
            Continue
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- ── BLOCKED DIALOG ──────────────────────────────────────────────── -->
    <v-dialog v-model="showBlockedDialog" max-width="420" persistent>
      <v-card rounded="xl">
        <v-card-text class="pa-6 text-center">
          <v-icon size="56" color="#f57c00" class="mb-3">mdi-lock-outline</v-icon>
          <h2 class="text-h6 font-weight-bold mb-2" style="color:#12086F;">
            No Workplace Found<span v-if="blockedUserName">, {{ blockedUserName }}</span>
          </h2>
          <p class="text-body-2 text-grey mb-2">
            Your account isn't linked to any workplace yet.
          </p>
          <p class="text-body-2 text-grey mb-5">
            Ask your supervisor to add you. Once added, sign in again and you'll be directed to your dashboard.
          </p>
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mb-5 text-left">
            <strong>In the meantime</strong>, you can explore ShiftBoard as a guest to see how it works.
          </v-alert>

          <v-btn block color="#4361EE" variant="flat" rounded="lg" size="large"
            class="mb-3" @click="goToGuest">
            <v-icon start>mdi-eye-outline</v-icon>Continue as Guest
          </v-btn>
          <v-btn block variant="outlined" color="#12086F" rounded="lg"
            @click="tryDifferentAccount">
            Try a Different Account
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(160deg, #d6e4f7 0%, #c2d5f0 30%, #a8c4e8 60%, #8eb3e0 100%);
  position: relative; overflow: hidden;
}
.bg-icon { position: absolute; pointer-events: none; color: rgba(18, 8, 111, 0.25); }
.ic-1 { top: 15%; left: 10%; font-size: 56px; transform: rotate(-10deg); }
.ic-2 { top: 30%; right: 12%; font-size: 48px; transform: rotate(8deg); }
.ic-3 { bottom: 20%; left: 8%; font-size: 44px; transform: rotate(5deg); }
.ic-4 { bottom: 30%; right: 15%; font-size: 40px; transform: rotate(-6deg); }
.ic-5 { top: 10%; right: 30%; font-size: 36px; transform: rotate(12deg); }
.ic-6 { bottom: 12%; left: 30%; font-size: 42px; transform: rotate(-4deg); }

.login-card {
  position: relative; z-index: 1;
  background: rgba(255,255,255,0.75); backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.6); border-radius: 20px;
  padding: 48px 40px 36px; width: 100%; max-width: 420px;
  box-shadow: 0 8px 32px rgba(18,8,111,0.1); text-align: center;
}
.logo-mark {
  width: 56px; height: 56px; background: #12086f; color: #fff;
  font-size: 28px; font-weight: 700; border-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;
}
.app-name  { font-size: 28px; font-weight: 700; color: #12086f; margin: 0 0 6px; }
.tagline   { font-size: 14px; color: #4361ee; margin: 0; }
.login-divider { height: 1px; background: rgba(18,8,111,0.1); margin: 28px 0; }
.login-footer  { font-size: 12px; color: #4895ef; margin: 24px 0 0; }

.workplace-radio {
  border: 1px solid #e0e0e0; border-radius: 8px;
  padding: 4px 12px; transition: border-color 0.15s;
}
.workplace-radio:hover { border-color: #12086F; }
</style>