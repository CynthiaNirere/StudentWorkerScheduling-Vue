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
    auto_select: true,
    callback: window.handleCredentialResponse,
  });
  window.google.accounts.id.renderButton(document.getElementById("parent_id"), {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signup_with",
    width: 400,
  });
};

const handleCredentialResponse = async (response) => {
  let token = { credential: response.credential };

  await AuthServices.loginUser(token)
    .then((data) => {
      user.value = data;

      // ── BEHAVIOR 1: No workplace — blocked ─────────────────────────────
      if (data.blocked) {
        // ✅ Don't store user, don't clear guest flag yet — Login.vue handles this
        window.dispatchEvent(new CustomEvent('shiftboard-login-blocked', { detail: data }));
        return;
      }

      // ✅ Real login in progress — wipe any stale guest/user state immediately
      localStorage.removeItem('isGuest');
      localStorage.removeItem('user');

      // ── BEHAVIOR 2: Multiple workplaces — show picker ──────────────────
      if (data.needsWorkplaceSelect && Array.isArray(data.workplaces) && data.workplaces.length > 1) {
        window.dispatchEvent(new CustomEvent('shiftboard-login-success', { detail: data }));
        return;
      }

      // ── BEHAVIOR 3: Normal login — single workplace ────────────────────
      Utils.setStore("user", data);
      fName.value = data.fName || data.first_name || '';
      lName.value = data.lName || data.last_name  || '';

      if (data.role === 'admin')    { router.push({ name: 'roleSelect' });        return; }
      if (data.role === 'employer') { router.push({ name: 'employerDashboard' }); return; }
      if (data.role === 'employee') { router.push({ name: 'employeeDashboard' }); return; }

      // Fallback — shouldn't normally reach here
      router.push({ name: 'login' });
    })
    .catch((error) => {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    });
};

onMounted(() => {
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