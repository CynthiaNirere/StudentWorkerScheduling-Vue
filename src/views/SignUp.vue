<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthServices from '../services/authServices';

const router = useRouter();
const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');

const handleSignUp = async () => {
  // Clear previous errors
  error.value = '';
  
  // Validate inputs
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields';
    return;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    error.value = 'Please enter a valid email address';
    return;
  }
  
  // Validate password length
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters';
    return;
  }
  
  try {
    loading.value = true;
    
    const userData = {
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value
    };
    
    // Call your signup API
    const response = await AuthServices.signUp(userData);
    
    console.log('Sign up successful:', response.data);
    
    // Redirect to login or dashboard
    router.push({ name: 'login' });
    
  } catch (err) {
    console.error('Sign up error:', err);
    error.value = err.response?.data?.message || 'Sign up failed. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container fluid class="signup-container fill-height">
    <v-row align="center" justify="center" class="fill-height">
      <v-col cols="12" sm="10" md="8" lg="6" xl="5">
        <!-- Logo Section -->
        <div class="text-center mb-8">
          <img 
            src="/oc-logo-white.png" 
            alt="Oklahoma Christian University" 
            class="university-logo mb-4"
          />
        </div>

        <!-- Sign Up Card -->
        <v-card elevation="3" class="signup-card pa-8">
          <!-- Header -->
          <div class="text-center mb-6">
            <h1 class="text-h4 font-weight-bold mb-2">TalonTime</h1>
            <p class="text-subtitle-1 text-grey">"Talons Up, Scheduled Right"</p>
          </div>

          <div class="text-center mb-6">
            <p class="text-body-2 text-grey">Welcome! Set Up Account Here</p>
          </div>

          <!-- Error Message -->
          <v-alert 
            v-if="error" 
            type="error" 
            variant="tonal" 
            class="mb-4"
            closable
            @click:close="error = ''"
          >
            {{ error }}
          </v-alert>

          <!-- Sign Up Form -->
          <v-form @submit.prevent="handleSignUp">
            <h2 class="text-h5 mb-4">Sign Up</h2>
            
            <!-- Email Input -->
            <div class="mb-4">
              <label class="text-body-2 font-weight-medium mb-2 d-block">
                Email Address
              </label>
              <v-text-field
                v-model="email"
                type="email"
                placeholder="your.email@university.edu"
                variant="outlined"
                density="comfortable"
                hide-details
                :disabled="loading"
              ></v-text-field>
            </div>

            <!-- Password Input -->
            <div class="mb-4">
              <label class="text-body-2 font-weight-medium mb-2 d-block">
                Create a Password
              </label>
              <v-text-field
                v-model="password"
                type="password"
                placeholder="Enter your password"
                variant="outlined"
                density="comfortable"
                hide-details
                :disabled="loading"
              ></v-text-field>
            </div>

            <!-- Remember Me Checkbox -->
            <div class="mb-6">
              <v-checkbox
                v-model="rememberMe"
                label="Remember me"
                hide-details
                density="compact"
                :disabled="loading"
              ></v-checkbox>
            </div>

            <!-- Sign Up Button -->
            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="loading"
              :disabled="loading"
              class="signup-btn"
            >
              Sign Up
            </v-btn>
          </v-form>

          <!-- Login Link -->
          <div class="text-center mt-6">
            <p class="text-body-2">
              Already have an account? 
              <router-link 
                :to="{ name: 'login' }" 
                class="text-primary font-weight-medium text-decoration-none"
              >
                Log In
              </router-link>
            </p>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.signup-container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.university-logo {
  max-width: 250px;
  height: auto;
}

.signup-card {
  max-width: 680px;
  margin: 0 auto;
  background: white;
}

.signup-btn {
  background-color: #80162B !important;
  color: white !important;
  text-transform: none;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.signup-btn:hover {
  background-color: #6b1325 !important;
}

/* Input styling to match your design */
:deep(.v-field) {
  border-radius: 4px;
}

:deep(.v-field__input) {
  padding: 12px 16px;
}

:deep(.v-checkbox .v-label) {
  font-size: 14px;
}
</style>