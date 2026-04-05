<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);
const loading = ref(false);
const saving = ref(false);

const profileForm = ref({ first_name: "", last_name: "", email: "", phone_number: "", workplace: "" });

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

onMounted(async () => {
  user.value = Utils.getStore("user");
  if (user.value) await loadUserProfile();
});

const loadUserProfile = async () => {
  loading.value = true;
  try {
    const userId = user.value.user_id || user.value.userId;
    const res = await EmployerService.getEmployeeById(userId);
    if (res.data) {
      const u = res.data;
      // Load workplace name if available
      let workplaceName = '';
      if (u.work_location) {
        try {
          const locRes = await EmployerService.getLocationById(u.work_location);
          workplaceName = locRes.data?.name || '';
        } catch {}
      }
      profileForm.value = {
        first_name: u.fName || u.first_name || "",
        last_name: u.lName || u.last_name || "",
        email: u.email || "",
        phone_number: u.phone_number || "",
        workplace: workplaceName,
      };
      Utils.setStore("user", { ...user.value, fName: u.fName || u.first_name, lName: u.lName || u.last_name, email: u.email, phone_number: u.phone_number });
    }
  } catch (err) {
    profileForm.value = {
      first_name: user.value.fName || user.value.first_name || "",
      last_name: user.value.lName || user.value.last_name || "",
      email: user.value.email || "",
      phone_number: user.value.phone_number || "",
      workplace: "",
    };
  } finally {
    loading.value = false;
  }
};

const handleSaveProfile = async () => {
  if (!profileForm.value.first_name || !profileForm.value.email) {
    showSnackbar("First name and email are required", "error"); return;
  }
  saving.value = true;
  try {
    const userId = user.value.user_id || user.value.userId;
    await EmployerService.updateEmployee(userId, {
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      email: profileForm.value.email,
      phone_number: profileForm.value.phone_number || null,
    });
    Utils.setStore("user", {
      ...user.value,
      fName: profileForm.value.first_name,
      lName: profileForm.value.last_name,
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      email: profileForm.value.email,
      phone_number: profileForm.value.phone_number,
    });
    showSnackbar("Profile updated successfully!", "success");
  } catch (err) {
    showSnackbar("Error updating profile", "error");
  } finally {
    saving.value = false;
  }
};

const showSnackbar = (msg, color = "success") => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6" style="max-width: 700px;">
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">My Profile</h1>
        <p class="text-body-2 text-grey">Your personal information</p>
      </div>

      <div v-if="loading" class="text-center pa-6">
        <v-progress-circular indeterminate color="#12086F" size="32" />
      </div>

      <template v-else>
        <!-- Avatar + Name Banner -->
        <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
          <v-card-text class="pa-6 d-flex align-center ga-5">
            <v-avatar size="72" color="#12086F">
              <span class="text-h5 font-weight-bold text-white">
                {{ (profileForm.first_name[0] || '') + (profileForm.last_name[0] || '') }}
              </span>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold navy-text">{{ profileForm.first_name }} {{ profileForm.last_name }}</div>
              <div class="text-body-2 text-grey">{{ profileForm.email }}</div>
              <v-chip size="small" color="#12086F" variant="tonal" class="mt-1">Employer</v-chip>
            </div>
          </v-card-text>
        </v-card>

        <!-- Profile Form -->
        <v-card variant="outlined" rounded="lg" class="navy-card">
          <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Profile Information</v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="profileForm.first_name" label="First Name *" variant="outlined" density="compact" color="#12086F" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="profileForm.last_name" label="Last Name" variant="outlined" density="compact" color="#12086F" />
              </v-col>
            </v-row>
            <v-text-field v-model="profileForm.email" label="Email" type="email" variant="outlined" density="compact" class="mb-3" color="#12086F" readonly>
              <template #append-inner><v-icon size="small" color="grey">mdi-lock</v-icon></template>
            </v-text-field>
            <v-text-field v-model="profileForm.phone_number" label="Phone Number" variant="outlined" density="compact" class="mb-3" color="#12086F" placeholder="(555) 123-4567" />
            <v-text-field v-model="profileForm.workplace" label="Workplace" variant="outlined" density="compact" color="#12086F" readonly>
              <template #append-inner><v-icon size="small" color="grey">mdi-lock</v-icon></template>
            </v-text-field>
            <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mt-3">
              Email and workplace are managed by your organization and cannot be changed here.
            </v-alert>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4 d-flex justify-space-between">
            <v-btn variant="tonal" color="#12086F" prepend-icon="mdi-cog-outline" @click="$router.push({ name: 'employerSettings' })">
              Settings & Notifications
            </v-btn>
            <v-btn color="#12086F" variant="flat" :loading="saving" @click="handleSaveProfile">Save Changes</v-btn>
          </v-card-actions>
        </v-card>
      </template>
    </v-container>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }
</style>