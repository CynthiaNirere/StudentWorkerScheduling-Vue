<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';
import { useNotifications } from '../composables/useNotifications.js';

const router = useRouter();
const user   = ref(null);
const loading = ref(true);

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────
const { notifications, dismissNotification, handleNotificationAction } = useNotifications();

const notifColor = (notif) => {
  const msg = (notif.message || '').toLowerCase();
  const title = (notif.title || '').toLowerCase();
  if (msg.includes('approved') || title.includes('approved')) return '#2e7d32';
  if (msg.includes('denied') || title.includes('denied') || notif.urgent) return '#d32f2f';
  return '#f9a825'; // pending / informational
};

const notifBg = (notif) => {
  const c = notifColor(notif);
  if (c === '#2e7d32') return '#f1faf3';
  if (c === '#d32f2f') return '#fff5f5';
  return '#fffde7';
};

// ── SHIFT REQUESTS ─────────────────────────────────────────────────────────
const timeOffRequests = ref([]);
const swapRequests    = ref([]);

const allRequests = computed(() => [
  ...timeOffRequests.value.map(r => ({ ...r, _kind: 'timeoff' })),
  ...swapRequests.value.map(r => ({ ...r, _kind: 'swap' })),
].slice(0, 5));

const reqStatusColor = (status) => ({
  approved: '#2e7d32',
  pending:  '#f9a825',
  denied:   '#d32f2f',
  accepted: '#2e7d32',
}[status] || '#9e9e9e');

// ── CERTIFICATIONS ─────────────────────────────────────────────────────────
const certifications = ref([]);
const certError      = ref('');
const viewingCert    = ref(null);
const showCertViewer = ref(false);
const ALLOWED_TYPES  = ['application/pdf','image/jpeg','image/png','image/gif','image/webp'];
const certInput      = ref(null);

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

// ── LOAD ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  if (!user.value) { loading.value = false; return; }

  certifications.value = [...(user.value.certifications || [])];

  const userId = user.value.user_id || user.value.userId;
  try {
    const [toRes, swapRes] = await Promise.all([
      EmployeeService.getMyTimeOffRequests(),
      EmployeeService.getMySwapRequests(),
    ]);
    const allTo   = Array.isArray(toRes.data)   ? toRes.data   : [];
    const allSwap = Array.isArray(swapRes.data) ? swapRes.data : [];
    timeOffRequests.value = allTo.filter(r => (r.user_id || r.userId) === userId);
    swapRequests.value    = allSwap;
  } catch (err) {
    console.error('Hub load error:', err);
  } finally {
    loading.value = false;
  }
});

// ── CERTIFICATIONS ACTIONS ─────────────────────────────────────────────────
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
  reader.onload = () => {
    certifications.value.push({
      name: file.name,
      date: new Date().toLocaleDateString(),
      dataUrl: reader.result,
      mimeType: file.type,
    });
    const updated = { ...user.value, certifications: [...certifications.value] };
    Utils.setStore('user', updated);
    user.value = updated;
    showSnack('File uploaded!', 'success');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

const removeCert = (idx) => {
  certifications.value.splice(idx, 1);
  const updated = { ...user.value, certifications: [...certifications.value] };
  Utils.setStore('user', updated);
  user.value = updated;
};

const openCertViewer = (cert) => {
  viewingCert.value  = cert;
  showCertViewer.value = true;
};

const showSnack = (msg, color = 'success') => {
  snackMsg.value   = msg;
  snackColor.value = color;
  snackbar.value   = true;
};
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-h4 font-weight-bold navy-text">My Hub</h1>
        <p class="text-body-2 text-grey">Everything you need in one place.</p>
      </div>

      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="#12086F" size="48" />
      </div>

      <template v-else>
        <v-row>

          <!-- ── NOTIFICATIONS ──────────────────────────────────────────── -->
          <v-col cols="12" md="6">
            <v-card variant="outlined" rounded="lg" class="hub-card h-100">
              <v-card-title class="pa-4 d-flex align-center justify-space-between">
                <span class="text-body-1 font-weight-bold navy-text">
                  <v-icon start size="18">mdi-bell-outline</v-icon>Notifications
                </span>
                <v-chip v-if="notifications.length" size="x-small" color="#12086F" variant="tonal">
                  {{ notifications.length }}
                </v-chip>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-3">
                <div v-if="notifications.length === 0" class="text-center py-8">
                  <v-icon size="44" color="grey-lighten-2" class="mb-2">mdi-bell-check-outline</v-icon>
                  <p class="text-caption text-grey">All caught up!</p>
                </div>
                <div
                  v-for="notif in notifications"
                  :key="notif.id"
                  class="notif-row pa-3 mb-2 rounded d-flex align-start ga-3"
                  :style="{ background: notifBg(notif), borderLeft: `3px solid ${notifColor(notif)}` }"
                >
                  <v-icon :color="notifColor(notif)" size="20" class="mt-1">{{ notif.icon }}</v-icon>
                  <div class="flex-grow-1">
                    <div class="text-body-2 font-weight-bold">{{ notif.title }}</div>
                    <div class="text-caption text-grey">{{ notif.message }}</div>
                    <div class="text-caption mt-1" :style="{ color: notifColor(notif) }">
                      {{ notif.timestamp }}
                    </div>
                  </div>
                  <v-btn
                    icon="mdi-close" size="x-small" variant="text"
                    @click="dismissNotification(notif.id)"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- ── SHIFT REQUESTS ─────────────────────────────────────────── -->
          <v-col cols="12" md="6">
            <v-card variant="outlined" rounded="lg" class="hub-card h-100">
              <v-card-title class="pa-4 d-flex align-center justify-space-between">
                <span class="text-body-1 font-weight-bold navy-text">
                  <v-icon start size="18">mdi-calendar-clock</v-icon>Shift Requests
                </span>
                <v-btn
                  size="small" color="#12086F" variant="flat"
                  @click="router.push({ name: 'employeeTimeRequests' })"
                >
                  <v-icon start size="16">mdi-plus</v-icon>Request Shift
                </v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-3">
                <div v-if="allRequests.length === 0" class="text-center py-8">
                  <v-icon size="44" color="grey-lighten-2" class="mb-2">mdi-calendar-check-outline</v-icon>
                  <p class="text-caption text-grey">No requests yet</p>
                </div>
                <div
                  v-for="req in allRequests"
                  :key="(req.request_id || req.swap_id || req.id)"
                  class="request-row pa-3 mb-2 rounded d-flex align-center justify-space-between cursor-pointer"
                  @click="router.push({ name: 'employeeTimeRequests' })"
                >
                  <div class="d-flex align-center ga-2">
                    <v-icon
                      size="18"
                      :color="req._kind === 'swap' ? '#f57c00' : '#4361EE'"
                    >
                      {{ req._kind === 'swap' ? 'mdi-swap-horizontal' : 'mdi-calendar-remove' }}
                    </v-icon>
                    <div>
                      <div class="text-body-2 font-weight-medium">
                        {{ req._kind === 'swap' ? 'Shift Swap' : 'Time Off' }}
                      </div>
                      <div class="text-caption text-grey">
                        {{ req._kind === 'timeoff'
                          ? new Date(Number(req.start_date || req.startDate)).toLocaleDateString()
                          : (req.status || 'pending') }}
                      </div>
                    </div>
                  </div>
                  <v-chip
                    :color="reqStatusColor(req.status)"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ req.status || 'pending' }}
                  </v-chip>
                </div>
                <v-btn
                  v-if="allRequests.length > 0"
                  block variant="tonal" color="#12086F" size="small" class="mt-2"
                  @click="router.push({ name: 'employeeTimeRequests' })"
                >
                  View All Requests
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- ── SHARED WITH ME ─────────────────────────────────────────── -->
          <v-col cols="12" md="6">
            <v-card variant="outlined" rounded="lg" class="hub-card h-100">
              <v-card-title class="pa-4 d-flex align-center justify-space-between">
                <span class="text-body-1 font-weight-bold navy-text">
                  <v-icon start size="18">mdi-folder-account-outline</v-icon>Shared With Me
                </span>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-3">
                <div class="text-center py-8">
                  <v-icon size="44" color="grey-lighten-2" class="mb-2">mdi-folder-open-outline</v-icon>
                  <p class="text-caption text-grey">No files shared with you yet</p>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- ── CERTIFICATIONS ─────────────────────────────────────────── -->
          <v-col cols="12" md="6">
            <v-card variant="outlined" rounded="lg" class="hub-card h-100">
              <v-card-title class="pa-4 d-flex align-center justify-space-between">
                <span class="text-body-1 font-weight-bold navy-text">
                  <v-icon start size="18">mdi-certificate-outline</v-icon>Certifications
                </span>
                <v-btn
                  size="small" color="#12086F" variant="tonal"
                  prepend-icon="mdi-upload"
                  @click="certInput.click()"
                >
                  Upload
                </v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-3">
                <input
                  ref="certInput"
                  type="file"
                  accept=".pdf,image/*"
                  style="display:none"
                  @change="onCertFileChange"
                />
                <v-alert v-if="certError" type="error" density="compact" variant="tonal" class="mb-3">
                  {{ certError }}
                </v-alert>

                <div v-if="certifications.length === 0" class="text-center py-8">
                  <v-icon size="44" color="grey-lighten-2" class="mb-2">mdi-file-outline</v-icon>
                  <p class="text-caption text-grey">No certifications uploaded yet</p>
                  <p class="text-caption text-grey">Accepted: PDF, JPEG, PNG, GIF, WEBP</p>
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
          </v-col>

        </v-row>
      </template>
    </v-container>

    <!-- Cert viewer dialog -->
    <v-dialog v-model="showCertViewer" max-width="800">
      <v-card rounded="lg" v-if="viewingCert">
        <v-card-title class="pa-4 d-flex align-center justify-space-between navy-text">
          {{ viewingCert.name }}
          <v-btn icon="mdi-close" size="small" variant="text" @click="showCertViewer = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <img
            v-if="viewingCert.mimeType !== 'application/pdf'"
            :src="viewingCert.dataUrl"
            style="max-width:100%; border-radius:8px;"
          />
          <iframe
            v-else
            :src="viewingCert.dataUrl"
            style="width:100%; height:500px; border:none; border-radius:8px;"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">
      {{ snackMsg }}
    </v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text  { color: #12086F !important; }
.hub-card   { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.notif-row  { transition: opacity 0.15s; }
.request-row {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.15s;
}
.request-row:hover { background: #f0f4ff; border-color: #12086F; }
.cursor-pointer { cursor: pointer; }
</style>
