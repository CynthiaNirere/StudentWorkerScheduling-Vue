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
      user.value = response.data;  // ✅ FIXED: Use response.data
      Utils.setStore("user", user.value);
      fName.value = user.value.fName;
      lName.value = user.value.lName;
      
      // Route based on role
      if (user.value.role === 'admin') {
        router.push({ name: 'roleSelect' });
      } else if (user.value.role === 'employer') {
        router.push({ name: 'employerDashboard' });
      } else if (user.value.role === 'employee') {
        router.push({ name: 'employeeDashboard' });
      } else {
        router.push({ name: 'login' });
      }
    })
    .catch((error) => {
      console.log("Login error:", error);
      console.log("Error details:", error.response);
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