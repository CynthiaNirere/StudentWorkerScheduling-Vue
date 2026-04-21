<script setup>
import EmployerLayout from '../components/EmployerLayout.vue';

const profileForm = {
  first_name:  'Demo',
  last_name:   'Manager',
  email:       'demo@shiftboard.com',
  phone_number: '(405) 555-0000',
  workplace:   'The Brew Coffee Shop',
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6" style="max-width: 700px;">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — This profile is demo-only. Sign up to create your own.
      </v-alert>

      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">My Profile</h1>
        <p class="text-body-2 text-grey">Your personal information</p>
      </div>

      <!-- Avatar + Name Banner -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-card-text class="pa-6 d-flex align-center ga-5">
          <v-avatar size="72" color="#12086F">
            <span class="text-h5 font-weight-bold text-white">DM</span>
          </v-avatar>
          <div>
            <div class="text-h5 font-weight-bold navy-text">Demo Manager</div>
            <div class="text-body-2 text-grey">demo@shiftboard.com</div>
            <v-chip size="small" color="#12086F" variant="tonal" class="mt-1">Employer</v-chip>
          </div>
        </v-card-text>
      </v-card>

      <!-- Profile Form (read-only) -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Profile Information</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field :model-value="profileForm.first_name" label="First Name" variant="outlined" density="compact" color="#12086F" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="profileForm.last_name"  label="Last Name"  variant="outlined" density="compact" color="#12086F" readonly />
            </v-col>
          </v-row>
          <v-text-field :model-value="profileForm.email" label="Email" type="email" variant="outlined" density="compact" class="mb-3" color="#12086F" readonly>
            <template #append-inner><v-icon size="small" color="grey">mdi-lock</v-icon></template>
          </v-text-field>
          <v-text-field :model-value="profileForm.phone_number" label="Phone Number" variant="outlined" density="compact" class="mb-3" color="#12086F" readonly />
          <v-text-field :model-value="profileForm.workplace" label="Workplace" variant="outlined" density="compact" color="#12086F" readonly>
            <template #append-inner><v-icon size="small" color="grey">mdi-lock</v-icon></template>
          </v-text-field>
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mt-3">
            Sign up to manage your own profile and workplace.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 d-flex justify-end">
          <v-btn color="#12086F" variant="flat" disabled>Save Changes</v-btn>
        </v-card-actions>
      </v-card>

    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
</style>
