<template>
  <DashboardLayout>
    <v-container fluid class="pa-6">
      <h1 class="text-h4 font-weight-bold mb-6">Profile & Settings</h1>

      <v-card max-width="900" class="mx-auto pa-8">
        <v-form @submit.prevent="saveProfile">
          <v-row>
            <v-col cols="12" md="6">
              <label class="text-subtitle-1 font-weight-medium mb-2 d-block">First Name</label>
              <v-text-field
                v-model="profile.firstName"
                variant="outlined"
                placeholder="First Name"
                density="comfortable"
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <label class="text-subtitle-1 font-weight-medium mb-2 d-block">Last Name</label>
              <v-text-field
                v-model="profile.lastName"
                variant="outlined"
                placeholder="Last Name"
                density="comfortable"
                required
              ></v-text-field>
            </v-col>
          </v-row>

          <!-- Email Field -->
          <div class="mb-6">
            <label class="text-subtitle-1 font-weight-medium mb-2 d-block">Email</label>
            <v-text-field
              v-model="profile.email"
              variant="outlined"
              placeholder="admin@university.edu"
              density="comfortable"
              type="email"
              required
            ></v-text-field>
          </div>

          <!-- Phone Number -->
          <div class="mb-6">
            <label class="text-subtitle-1 font-weight-medium mb-2 d-block">Phone Number</label>
            <v-text-field
              v-model="profile.phoneNumber"
              variant="outlined"
              placeholder="(555) 123-4567"
              density="comfortable"
            ></v-text-field>
          </div>

          <!-- Age -->
          <div class="mb-6">
            <label class="text-subtitle-1 font-weight-medium mb-2 d-block">Age</label>
            <v-text-field
              v-model="profile.age"
              variant="outlined"
              placeholder="25"
              density="comfortable"
              type="number"
            ></v-text-field>
          </div>

          <!-- Bio -->
          <div class="mb-6">
            <label class="text-subtitle-1 font-weight-medium mb-2 d-block">Bio</label>
            <v-textarea
              v-model="profile.bio"
              variant="outlined"
              placeholder="Tell us about yourself..."
              density="comfortable"
              rows="4"
            ></v-textarea>
          </div>

          <!-- Role Field (Read-only) -->
          <div class="mb-6">
            <label class="text-subtitle-1 font-weight-medium mb-2 d-block">Role</label>
            <v-text-field
              v-model="profile.role"
              variant="outlined"
              placeholder="System Administrator"
              density="comfortable"
              disabled
            ></v-text-field>
          </div>

          <!-- Work Location (if applicable) -->
          <div class="mb-6" v-if="businessAreas.length > 0 && (user?.role === 'employee' || user?.role === 'employer')">
            <label class="text-subtitle-1 font-weight-medium mb-2 d-block">Work Location</label>
            <v-select
              v-model="profile.workLocation"
              :items="businessAreas"
              item-title="name"
              item-value="location_id"
              variant="outlined"
              placeholder="Select Work Location"
              density="comfortable"
            ></v-select>
          </div>

          <!-- Action Buttons -->
          <div class="d-flex gap-3">
            <v-btn
              type="submit"
              color="primary"
              size="large"
              min-width="120"
            >
              Save
            </v-btn>
            <v-btn
              variant="outlined"
              size="large"
              min-width="120"
              @click="resetForm"
            >
              Cancel
            </v-btn>
          </div>
        </v-form>

        <!-- Last Updated Footer -->
        <v-divider class="my-6"></v-divider>
        <div class="text-center text-caption text-grey">
          Last Updated: {{ lastUpdated }}
        </div>
      </v-card>

      <!-- Success Snackbar -->
      <v-snackbar
        v-model="showSuccess"
        color="success"
        :timeout="3000"
      >
        Profile updated successfully!
      </v-snackbar>

      <!-- Error Snackbar -->
      <v-snackbar
        v-model="showError"
        color="error"
        :timeout="3000"
      >
        {{ errorMessage }}
      </v-snackbar>
    </v-container>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import Utils from '../config/utils';
import adminServices from '../services/adminViewServices';
import businessAreaServices from '../services/businessAreaServices';

const router = useRouter();
const user = ref(null);
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');
const businessAreas = ref([]);

const profile = ref({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  age: '',
  bio: '',
  role: '',
  workLocation: null
});

const originalProfile = ref({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  age: '',
  bio: '',
  role: '',
  workLocation: null
});

const lastUpdated = computed(() => {
  const now = new Date();
  return now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
});

const saveProfile = async () => {
  try {
    if (!profile.value.firstName || !profile.value.lastName || !profile.value.email) {
      errorMessage.value = 'Please fill in all required fields';
      showError.value = true;
      return;
    }

    // Prepare update data
    const updateData = {
      first_name: profile.value.firstName,
      last_name: profile.value.lastName,
      email: profile.value.email,
      phone_number: profile.value.phoneNumber || '',
      age: profile.value.age ? parseInt(profile.value.age) : null,
      bio: profile.value.bio || '',
      work_location: profile.value.workLocation
    };

    // Update via API
    await adminServices.updateUser(user.value.userId || user.value.user_id, updateData);

    // Update localStorage
    user.value.fName = profile.value.firstName;
    user.value.lName = profile.value.lastName;
    user.value.email = profile.value.email;
    user.value.phone_number = profile.value.phoneNumber;
    user.value.age = profile.value.age;
    user.value.bio = profile.value.bio;
    user.value.work_location = profile.value.workLocation;
    
    Utils.setStore('user', user.value);
    
    // Update original profile
    originalProfile.value = { ...profile.value };
    
    showSuccess.value = true;
  } catch (error) {
    console.error('Error saving profile:', error);
    errorMessage.value = 'Unable to save profile. Please try again.';
    showError.value = true;
  }
};

const resetForm = () => {
  profile.value = { ...originalProfile.value };
};

const getRoleDisplay = (role) => {
  const roleMap = {
    'admin': 'System Administrator',
    'employer': 'Manager',
    'employee': 'Employee'
  };
  return roleMap[role] || role;
};

const loadBusinessAreas = async () => {
  try {
    const response = await businessAreaServices.getAll();
    businessAreas.value = response.data;
  } catch (error) {
    console.error('Error loading business areas:', error);
  }
};

onMounted(async () => {
  user.value = Utils.getStore('user');
  
  if (!user.value) {
    router.push({ name: 'login' });
    return;
  }

  // Load business areas
  await loadBusinessAreas();

  // Initialize profile with user data
  profile.value = {
    firstName: user.value.fName || user.value.first_name || '',
    lastName: user.value.lName || user.value.last_name || '',
    email: user.value.email || '',
    phoneNumber: user.value.phone_number || '',
    age: user.value.age || '',
    bio: user.value.bio || '',
    role: getRoleDisplay(user.value.role),
    workLocation: user.value.work_location || null
  };

  // Store original values
  originalProfile.value = { ...profile.value };
});
</script>

<style scoped>
.gap-3 {
  gap: 12px;
}

label {
  color: rgba(0, 0, 0, 0.87);
}

:deep(.v-field--disabled) {
  opacity: 0.6;
}
</style>