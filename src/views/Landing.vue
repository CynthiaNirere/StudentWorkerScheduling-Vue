<template>
  <v-app>
    <v-container fluid class="landing-container pa-0">
      <div class="landing-hero">
        <div class="hero-content text-center">
          <v-avatar size="120" color="primary" class="mb-6">
            <v-icon size="80" color="white">mdi-calendar-clock</v-icon>
          </v-avatar>
          
          <h1 class="text-h2 font-weight-bold mb-4 text-white">
            Welcome to ShiftBoard
          </h1>
          
          <p class="text-h5 mb-8 text-white opacity-90">
            Smart scheduling for student workers
          </p>
          
          <div class="d-flex flex-column align-center gap-4">
            <v-btn
              size="x-large"
              color="white"
              variant="flat"
              prepend-icon="mdi-login"
              @click="goToLogin"
              min-width="300"
            >
              Login with Google
            </v-btn>
            
            <v-btn
              size="x-large"
              color="white"
              variant="outlined"
              prepend-icon="mdi-eye-outline"
              @click="viewAsGuest"
              min-width="300"
            >
              View as Guest
            </v-btn>
          </div>
          
          <p class="text-caption text-white mt-6 opacity-75">
            Guest mode provides a demo view with sample data
          </p>
        </div>
      </div>
      
      <!-- Features Section -->
      <v-container class="py-12">
        <v-row>
          <v-col cols="12" md="4">
            <div class="text-center">
              <v-icon size="64" color="primary">mdi-calendar-multiple</v-icon>
              <h3 class="text-h6 font-weight-bold mt-4 mb-2">Easy Scheduling</h3>
              <p class="text-body-2">Create and manage shifts effortlessly</p>
            </div>
          </v-col>
          
          <v-col cols="12" md="4">
            <div class="text-center">
              <v-icon size="64" color="primary">mdi-account-group</v-icon>
              <h3 class="text-h6 font-weight-bold mt-4 mb-2">Team Management</h3>
              <p class="text-body-2">Manage your workforce efficiently</p>
            </div>
          </v-col>
          
          <v-col cols="12" md="4">
            <div class="text-center">
              <v-icon size="64" color="primary">mdi-bell-ring</v-icon>
              <h3 class="text-h6 font-weight-bold mt-4 mb-2">Real-time Alerts</h3>
              <p class="text-body-2">Stay updated with instant notifications</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-container>
  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goToLogin = () => {
  router.push({ name: 'login' });
};

const viewAsGuest = () => {
  console.log('👁️ Setting up guest mode...');
  
  // ✅ Set guest flag
  localStorage.setItem('isGuest', 'true');
  
  // ✅ Set demo user data
  const DEMO_USER = {
    userId: 'demo-employer',
    user_id: 'demo-employer',
    email: 'demo@shiftboard.com',
    fName: 'Demo',
    lName: 'Manager',
    role: 'guest',
    isGuest: true,
    work_location: null,
    token: 'demo-token'
  };
  
  localStorage.setItem('user', JSON.stringify(DEMO_USER));
  
  console.log('✅ Guest mode set up, navigating to dashboard...');
  
  // ✅ Navigate to guest dashboard
  router.push({ path: '/guest' });
};
</script>

<style scoped>
.landing-container {
  min-height: 100vh;
}

.landing-hero {
  background: linear-gradient(135deg, #12086F 0%, #2B35AF 50%, #4361EE 100%);
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.hero-content {
  max-width: 800px;
}

.opacity-90 {
  opacity: 0.9;
}

.opacity-75 {
  opacity: 0.75;
}

.gap-4 {
  gap: 16px;
}
</style>