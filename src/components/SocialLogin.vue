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
        // Fire event so Login.vue can show the blocked dialog
        window.dispatchEvent(new CustomEvent('shiftboard-login-blocked', { detail: data }));
        return;
      }

      // ── BEHAVIOR 2: Multiple workplaces — show picker ──────────────────
      if (data.needsWorkplaceSelect && Array.isArray(data.workplaces) && data.workplaces.length > 1) {
        window.dispatchEvent(new CustomEvent('shiftboard-login-success', { detail: data }));
        return;
      }

      // ── BEHAVIOR 3: Normal login — single workplace ────────────────────
      Utils.setStore("user", data);
      fName.value = data.fName;
      lName.value = data.lName;

      if (data.role === 'admin')    { router.push({ name: 'roleSelect' }); return; }
      if (data.role === 'employer') { router.push({ name: 'employerDashboard' }); return; }
      if (data.role === 'employee') { router.push({ name: 'employeeDashboard' }); return; }
      router.push({ name: 'login' });
    })
    .catch((error) => {
      console.log("Login error:", error);
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