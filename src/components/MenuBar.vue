<script setup>
import { ref, onMounted } from "vue";
import Utils from "../config/utils";
import AuthServices from "../services/authServices";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref(null);
const title = ref("TalonTime");
const initials = ref("");
const name = ref("");

const resetMenu = () => {
  user.value = Utils.getStore("user");
  if (user.value) {
    initials.value =
      (user.value.fName?.[0] || "") + (user.value.lName?.[0] || "");
    name.value = `${user.value.fName || ""} ${user.value.lName || ""}`.trim();
  }
};

const logout = async () => {
  try {
    await AuthServices.logoutUser(user.value);
  } catch (err) {
    console.warn("Logout error:", err);
  } finally {
    Utils.removeItem("user");
    router.push({ name: "login" });
  }
};

onMounted(() => {
  resetMenu();
});
</script>

<template>
  <!-- Only show app bar if user is logged in AND NOT on login/signup/roleSelect pages -->
  <v-app-bar 
    v-if="user && $route.name !== 'employeeDashboard' && $route.name !== 'employeeAvailability' && $route.name !== 'employerProfile' && $route.name !== 'login' && $route.name !== 'signup' && $route.name !== 'roleSelect'"
    color="primary" 
    elevation="2"
  >
    <!-- App Title -->
    <v-toolbar-title class="mx-4">{{ title }}</v-toolbar-title>
    
    <v-spacer></v-spacer>
    
    <!-- User info chip -->
    <v-chip color="secondary" class="mx-2">
      {{ user.role }}
    </v-chip>
    
    <!-- User Profile Menu -->
    <v-menu location="bottom">
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props" icon>
          <v-avatar color="secondary">
            <span class="font-weight-bold">{{ initials }}</span>
          </v-avatar>
        </v-btn>
      </template>
      
      <v-card min-width="200">
        <v-card-text>
          <div class="text-center">
            <v-avatar color="secondary" class="mt-2 mb-2" size="large">
              <span class="font-weight-bold">{{ initials }}</span>
            </v-avatar>
            <h3>{{ name }}</h3>
            <p class="text-caption mt-1">{{ user.email }}</p>
            <v-chip
              size="small"
              :color="
                user.role === 'admin'
                  ? 'error'
                  : user.role === 'employer'
                  ? 'primary'
                  : 'success'
              "
              class="my-2"
            >
              {{ user.role }}
            </v-chip>
            <v-divider class="my-3"></v-divider>
            <v-btn variant="text" color="error" block @click="logout">
              <v-icon start>mdi-logout</v-icon>
              Logout
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-menu>
  </v-app-bar>
</template>

<style scoped>
.v-btn {
  text-transform: none;
}
</style>