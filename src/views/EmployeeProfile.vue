<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const router = useRouter();
const user   = ref(null);
const loading = ref(false);
const saving  = ref(false);

const phone  = ref('');
const jobRole = ref('');

// Certifications (local file store)
const certifications  = ref([]);
const certError       = ref('');
const ALLOWED_TYPES   = ['application/pdf','image/jpeg','image/png','image/gif','image/webp'];
const viewingCert     = ref(null);
const showCertViewer  = ref(false);

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

const userInitials = computed(() => {
  if (!user.value) return '?';
  return (user.value.fName?.[0] || user.value.first_name?.[0] || '') +
         (user.value.lName?.[0] || user.value.last_name?.[0] || '');
});

const fullName = computed(() => {
  if (!user.value) return '';
  return `${user.value.fName || user.value.first_name || ''} ${user.value.lName || user.value.last_name || ''}`.trim();
});

onMounted(async () => {
  user.value = Utils.getStore('user');
  if (!user.value) return;

  phone.value = user.value.phone_number || user.value.phone || '';
  certifications.value = [...(user.value.certifications || [])];

  // Load job role
  loading.value = true;
  try {
    const userId = user.value.user_id || user.value.userId;
    const rolesRes = await EmployeeService.getUserRoles(userId);
    const roles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
    const primary = roles.find(r => r.is_primary) || roles[0];
    jobRole.value = primary?.role_title || '';
  } catch (err) {
    console.error('Error loading roles:', err);
  } finally {
    loading.value = false;
  }
});

const savePhone = async () => {
  saving.value = true;
  try {
    const userId = user.value.user_id || user.value.userId;
    await EmployeeService.updateProfile(userId, { phone_number: phone.value });
    const updated = { ...user.value, phone_number: phone.value, phone: phone.value };
    Utils.setStore('user', updated);
    user.value = updated;
    showSnackbar('Phone number saved!', 'success');
  } catch (err) {
    showSnackbar('Error saving phone number', 'error');
  } finally {
    saving.value = false;
  }
};

const saveCertsToBackend = async (list) => {
  try {
    const userId = user.value.user_id || user.value.userId;
    await EmployeeService.updateCertifications(userId, list);
    const updated = { ...user.value, certifications: list };
    Utils.setStore('user', updated);
    user.value = updated;
  } catch (err) {
    console.warn('Could not persist certifications:', err.message);
  }
};

const onCertFileChange = (e) => {
  certError.value = '';
  const file = e.target.files?.[0];
  if (!file) return;
  if (!ALLOWED_TYPES.includes(file.type)) {
    certError.value = 'Only PDF and image files are accepted.';
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    certifications.value.push({ name: file.name, date: new Date().toLocaleDateString(), dataUrl: reader.result, mimeType: file.type });
    await saveCertsToBackend([...certifications.value]);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

const removeCert = async (idx) => {
  certifications.value.splice(idx, 1);
  await saveCertsToBackend([...certifications.value]);
};

const openCertViewer = (cert) => {
  viewingCert.value = cert;
  showCertViewer.value = true;
};

const showSnackbar = (msg, color = 'success') => { snackMsg.value = msg; snackColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6" style="max-width: 800px;">

      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">My Profile</h1>
        <p class="text-body-2 text-grey">Your personal information</p>
      </div>

      <!-- Avatar banner -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
        <v-card-text class="pa-5 d-flex align-center ga-5">
          <v-avatar size="72" color="#12086F">
            <span class="text-h5 font-weight-bold text-white">{{ userInitials }}</span>
          </v-avatar>
          <div>
            <div class="text-h5 font-weight-bold navy-text">{{ fullName }}</div>
            <div class="text-body-2 text-grey">{{ user?.email }}</div>
            <div class="d-flex ga-2 mt-1">
              <v-chip size="small" color="#12086F" variant="tonal">{{ user?.role || 'employee' }}</v-chip>
              <v-chip v-if="jobRole" size="small" color="#4361EE" variant="tonal">{{ jobRole }}</v-chip>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Read-only info -->
      <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
        <v-card-title class="text-body-1 font-weight-bold pa-4 navy-text">
          <v-icon start size="18">mdi-account-outline</v-icon>Personal Information
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6">
              <v-text-field :model-value="user?.fName || user?.first_name" label="First Name" variant="outlined" density="compact" readonly color="#12086F">
                <template #append-inner><v-icon size="small" color="grey">mdi-lock</v-icon></template>
              </v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field :model-value="user?.lName || user?.last_name" label="Last Name" variant="outlined" density="compact" readonly color="#12086F">
                <template #append-inner><v-icon size="small" color="grey">mdi-lock</v-icon></template>
              </v-text-field>
            </v-col>
          </v-row>
          <v-text-field :model-value="user?.email" label="Email" variant="outlined" density="compact" readonly color="#12086F" class="mb-3">
            <template #append-inner><v-icon size="small" color="grey">mdi-lock</v-icon></template>
          </v-text-field>

          <!-- ✅ Phone number — editable -->
          <v-text-field
            v-model="phone"
            label="Phone Number"
            variant="outlined"
            density="compact"
            color="#12086F"
            placeholder="(555) 123-4567"
            hint="This is the only field you can edit"
            persistent-hint
            prepend-inner-icon="mdi-phone-outline"
          />
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mt-3">
            Name and email are managed by your organization and cannot be changed here.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 justify-end">
          <v-btn color="#12086F" variant="flat" :loading="saving" @click="savePhone">Save Phone Number</v-btn>
        </v-card-actions>
      </v-card>

      <!-- Certifications -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-title class="text-body-1 font-weight-bold pa-4 navy-text">
          <v-icon start size="18">mdi-certificate-outline</v-icon>Certifications & Files
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-4">
            <v-btn color="#12086F" variant="tonal" prepend-icon="mdi-upload" @click="$refs.certInput.click()">
              Upload File
            </v-btn>
            <input ref="certInput" type="file" accept=".pdf,image/*" style="display:none" @change="onCertFileChange" />
            <p class="text-caption text-grey mt-1">Accepted: PDF, JPEG, PNG, GIF, WEBP</p>
            <v-alert v-if="certError" type="error" density="compact" variant="tonal" class="mt-2">{{ certError }}</v-alert>
          </div>

          <div v-if="certifications.length === 0" class="text-center pa-6">
            <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-file-outline</v-icon>
            <p class="text-caption text-grey">No files uploaded yet</p>
          </div>

          <v-list v-else density="compact" class="pa-0">
            <v-list-item
              v-for="(cert, i) in certifications"
              :key="i"
              :prepend-icon="cert.mimeType === 'application/pdf' ? 'mdi-file-pdf-box' : 'mdi-file-image'"
              rounded="lg"
              class="mb-2"
              style="border: 1px solid #e0e0e0;"
            >
              <v-list-item-title class="text-body-2 font-weight-medium">{{ cert.name }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption text-grey">Uploaded {{ cert.date }}</v-list-item-subtitle>
              <template #append>
                <v-btn icon="mdi-eye" size="small" variant="text" color="#4361EE" @click="openCertViewer(cert)" />
                <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" @click="removeCert(i)" />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- File Viewer Dialog -->
    <v-dialog v-model="showCertViewer" max-width="800">
      <v-card rounded="lg" v-if="viewingCert">
        <v-card-title class="pa-4 d-flex align-center justify-space-between navy-text">
          {{ viewingCert.name }}
          <v-btn icon="mdi-close" size="small" variant="text" @click="showCertViewer = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <img v-if="viewingCert.mimeType !== 'application/pdf'" :src="viewingCert.dataUrl" style="max-width:100%; border-radius:8px;" />
          <iframe v-else :src="viewingCert.dataUrl" style="width:100%; height:500px; border:none; border-radius:8px;" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
</style>