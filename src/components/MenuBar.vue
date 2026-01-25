<script setup>
import ocLogo from "/oc-logo-white.png";
import { ref, onMounted } from "vue";
import Utils from "../config/utils";
import AuthServices from "../services/authServices";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref(null);
const title = ref("Exercise Tracker");
const initials = ref("");
const name = ref("");
const logoURL = ref("");

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

// Get dashboard route based on user role
const getDashboardRoute = () => {
  if (!user.value) return { name: "login" };
  switch (user.value.role) {
    case "admin":
      return { name: "adminDashboard" };
    case "coach":
      return { name: "coachDashboard" };
    case "athlete":
      return { name: "athleteDashboard" };
    default:
      return { name: "login" };
  }
};

onMounted(() => {
  logoURL.value = ocLogo;
  resetMenu();
});
</script>

<template>
  <v-app-bar color="primary" elevation="2">
    <!-- Logo -->
    <router-link :to="getDashboardRoute()" style="text-decoration: none">
      <v-img
        class="mx-3"
        :src="logoURL"
        height="45"
        width="45"
        cover
      ></v-img>
    </router-link>
    
    <!-- App Title -->
    <v-toolbar-title>{{ title }}</v-toolbar-title>
    
    <v-spacer></v-spacer>
    
    <!-- ========================================
         ADMIN MENU
         ======================================== -->
    <template v-if="user && user.role === 'admin'">
      <v-btn class="mx-2" :to="{ name: 'adminDashboard' }" variant="text">
        
        Dashboard
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'userManagement' }" variant="text">
        
        Users
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'exerciseManagement' }" variant="text">
        
        Exercises
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'exercisePlansManagement' }" variant="text">
       
        Plans
      </v-btn>
    </template>
    
    <!-- ========================================
         COACH MENU (ADDED!)
         ======================================== -->
    <template v-else-if="user && user.role === 'coach'">
      <v-btn class="mx-2" :to="{ name: 'coachDashboard' }" variant="text">
        
        Dashboard
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'coach-exercises' }" variant="text">
        
        Exercises
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'coach-plans' }" variant="text">
        
        Plans
      </v-btn>
    </template>
    
    <!-- ========================================
         ATHLETE MENU
         ======================================== -->
    <template v-else-if="user && user.role === 'athlete'">
      <v-btn class="mx-2" :to="{ name: 'athleteDashboard' }" variant="text">
        
        Dashboard
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'athleteProfile' }" variant="text">
        
        Profile
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'recordExercise' }" variant="text">
        
        Record
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'athleteGoals' }" variant="text">
        
        Goals
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'viewExerciseResults' }" variant="text">
        
        Results
      </v-btn>
      <v-btn class="mx-2" :to="{ name: 'athleteAssignedPlans' }" variant="text">
        
        Plans
      </v-btn>
    </template>
    
    <!-- ========================================
         USER PROFILE MENU
         ======================================== -->
    <v-menu v-if="user" location="bottom">
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
                  : user.role === 'coach'
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