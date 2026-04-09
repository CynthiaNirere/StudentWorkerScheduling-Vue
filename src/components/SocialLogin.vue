<script setup>
import { ref, onMounted } from "vue";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";

const router = useRouter();
const fName = ref("");
const lName = ref("");
const user  = ref({});

const loginWithGoogle = () => {
  window.handleCredentialResponse = handleCredentialResponse;
  const client = import.meta.env.VITE_APP_CLIENT_ID;
  window.google.accounts.id.initialize({
    client_id: client,
    cancel_on_tap_outside: false,
    auto_select: false,
    callback: window.handleCredentialResponse,
  });
  window.google.accounts.id.renderButton(document.getElementById("parent_id"), {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    width: 400,
  });
};

const handleCredentialResponse = async (response) => {
  console.log("🔐 Google credential received");

  let token = { credential: response.credential };

  try {
    const loginResponse = await AuthServices.loginUser(token);
    console.log("📦 Login response from backend:", loginResponse);

    user.value = loginResponse;

    fName.value = user.value.fName || user.value.first_name;
    lName.value = user.value.lName || user.value.last_name;

    // ── BLOCKED: no workplace assigned ────────────────────────────────
    if (user.value.blocked) {
      console.log("🚫 User blocked — no workplace");
      window.dispatchEvent(new CustomEvent('shiftboard-login-blocked', {
        detail: {
          fName:  user.value.fName,
          reason: user.value.reason || 'no_workplace',
        }
      }));
      return;
    }

    // ── GUEST: not in system ──────────────────────────────────────────
    if (user.value.isGuest || user.value.role === 'guest') {
      console.log("👤 Guest login");
      Utils.setStore("user", user.value);
      localStorage.setItem('token', user.value.token);
      localStorage.setItem('isGuest', 'true');
      router.push({ name: 'guestDashboard' });
      return;
    }

    // ── NEEDS WORKPLACE PICKER ────────────────────────────────────────
    if (user.value.needsWorkplaceSelect && Array.isArray(user.value.workplaces) && user.value.workplaces.length > 1) {
      console.log(`🏢 Multi-workplace user — ${user.value.workplaces.length} locations`);
      // Store base user data (without a chosen work_location yet)
      Utils.setStore("user", user.value);
      localStorage.setItem('token', user.value.token);
      localStorage.setItem('isGuest', 'false');
      window.dispatchEvent(new CustomEvent('shiftboard-login-success', { detail: user.value }));
      return;
    }

    // ── NORMAL LOGIN ──────────────────────────────────────────────────
    Utils.setStore("user", user.value);
    localStorage.setItem('token', user.value.token);
    localStorage.setItem('isGuest', 'false');

    console.log('✅ Normal login for:', fName.value, '| role:', user.value.role);

    if (user.value.role === 'admin') {
      router.push({ name: 'workplace' });
    } else if (user.value.role === 'employer') {
      router.push({ name: 'employerDashboard' });
    } else if (user.value.role === 'employee') {
      router.push({ name: 'employeeDashboard' });
    } else {
      router.push({ name: 'guestDashboard' });
    }

  } catch (error) {
    console.error("❌ Login error:", error);
    const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
    alert(errorMessage);
  }
};

onMounted(() => {
  console.log("🚀 SocialLogin component mounted");
  loginWithGoogle();
});
</script>

<template>
  <div class="signup-buttons">
    <v-row justify="center">
      <div display="flex" id="parent_id"></div>
    </v-row>
  </div>
</template>