<script setup>
import { ref, onMounted } from "vue";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";

const router = useRouter();
const fName = ref("");
const lName = ref("");
const user = ref({});
const useMockLogin = ref(true); // Set to true for testing, false for production

const loginWithGoogle = () => {
  // TEMPORARY: Mock login for testing employee dashboard
  if (useMockLogin.value) {
    handleMockLogin();
    return;
  }

  // Real Google login
  window.handleCredentialResponse = handleCredentialResponse;
  const client = import.meta.env.VITE_APP_CLIENT_ID;
  console.log(client);
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

const handleMockLogin = () => {
  // Mock employee user for testing
  user.value = {
    user_id: 'mock-employee-001',
    fName: 'Tessy',
    lName: 'Mugisha',
    email: 'tessy.p.mugisha@eagles.oc.edu',
    role: 'employee' // This is the key - forces redirect to dashboard
  };
  
  Utils.setStore("user", user.value);
  fName.value = user.value.fName;
  lName.value = user.value.lName;
  
  console.log('Mock login successful:', user.value.email, 'Role:', user.value.role);
  
  // Redirect based on role
  if (user.value.role === 'admin') {
    router.push({ name: 'roleSelect' });
  } else if (user.value.role === 'employee') {
    router.push({ name: 'employeeDashboard' });
  } else {
    alert(`Welcome ${user.value.fName} ${user.value.lName}! Role: ${user.value.role}`);
  }
};

const handleCredentialResponse = async (response) => {
  let token = {
    credential: response.credential,
  };
  await AuthServices.loginUser(token)
    .then((response) => {
      user.value = response.data;
      Utils.setStore("user", user.value);
      fName.value = user.value.fName;
      lName.value = user.value.lName;
      
      console.log('User logged in:', user.value.email, 'Role:', user.value.role);
      
      // Redirect based on role
      if (user.value.role === 'admin') {
        router.push({ name: 'roleSelect' });
      } else if (user.value.role === 'employee') {
        router.push({ name: 'employeeDashboard' });
      } else {
        alert(`Welcome ${user.value.fName} ${user.value.lName}! Role: ${user.value.role}`);
      }
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
    <!-- Show this when using real Google login -->
    <v-row justify="center" v-if="!useMockLogin">
      <div display="flex" id="parent_id"></div>
    </v-row>
    
    <!-- Show this when using mock login (for testing) -->
    <v-row justify="center" v-if="useMockLogin">
      <v-card class="pa-4" elevation="0">
        <p class="text-caption text-grey text-center mb-2">
          🧪 Mock Login (Testing Mode)
        </p>
        <p class="text-body-2 text-center">
          Auto-logging in as Employee...
        </p>
      </v-card>
    </v-row>
  </div>
</template>