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
  
  let token = {
    credential: response.credential,
  };
  
  try {
    const loginResponse = await AuthServices.loginUser(token);
    
    console.log("📦 Login response from backend:", loginResponse);
    
    user.value = loginResponse;
    
    // ✅ Store user data in localStorage
    Utils.setStore("user", user.value);
    localStorage.setItem('token', user.value.token);
    localStorage.setItem('isGuest', user.value.isGuest ? 'true' : 'false');
    
    fName.value = user.value.fName || user.value.first_name;
    lName.value = user.value.lName || user.value.last_name;
    
    console.log('✅ Login successful for:', fName.value, lName.value);
    console.log('👤 User role:', user.value.role);
    console.log('🏢 Work location:', user.value.work_location);
    
    // ✅ Route based on role with guest handling
    if (user.value.isGuest || user.value.role === 'guest') {
      console.log('👤 Guest user detected - redirecting to guest dashboard');
      router.push({ name: 'guestDashboard' });
    } else if (user.value.role === 'admin') {
      console.log('👑 Admin user - redirecting to workplace selection');
      router.push({ name: 'workplace' });
    } else if (user.value.role === 'employer') {
      console.log('🏢 Employer user - redirecting to workplace selection');
      router.push({ name: 'workplace' });
    } else if (user.value.role === 'employee') {
      console.log('👤 Employee user - redirecting to employee dashboard');
      router.push({ name: 'employeeDashboard' });
    } else {
      console.log('⚠️ Unknown role:', user.value.role, '- redirecting to guest dashboard');
      router.push({ name: 'guestDashboard' });
    }
  } catch (error) {
    console.error("❌ Login error:", error);
    console.error("❌ Error details:", error.response?.data);
    
    // Show user-friendly error message
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