<script setup>
import { ref, onMounted } from "vue";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";

const router = useRouter();
const fName = ref("");
const lName = ref("");
const user = ref({});

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
  let token = {
    credential: response.credential,
  };
  
  await AuthServices.loginUser(token)
    .then((response) => {
      user.value = response;
      Utils.setStore("user", user.value);
      fName.value = user.value.fName;
      lName.value = user.value.lName;
      
      console.log('✅ Login successful:', user.value);
      
      // ✅ Route based on role with guest handling
      if (user.value.isGuest || user.value.role === 'guest') {
        console.log('👤 Guest user detected - redirecting to guest dashboard');
        router.push({ name: 'guestDashboard' });
      } else if (user.value.role === 'admin') {
        console.log('👑 Admin user - redirecting to role select');
        router.push({ name: 'roleSelect' });
      } else if (user.value.role === 'employer') {
        console.log('🏢 Employer user - redirecting to employer dashboard');
        router.push({ name: 'employerDashboard' });
      } else if (user.value.role === 'employee') {
        console.log('👤 Employee user - redirecting to employee dashboard');
        router.push({ name: 'employeeDashboard' });
      } else {
        // Fallback - treat unknown roles as guests
        console.log('⚠️ Unknown role - redirecting to guest dashboard');
        router.push({ name: 'guestDashboard' });
      }
    })
    .catch((error) => {
      console.error("❌ Login error:", error);
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