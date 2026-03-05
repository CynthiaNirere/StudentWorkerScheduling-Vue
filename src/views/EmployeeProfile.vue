<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';

const router       = useRouter();
const user         = ref(null);
const rail         = ref(true);
const businessArea = ref('The Brew');
const saving       = ref(false);

// ── FORM STATE ────────────────────────────────────────────────────────────
const form = ref({
  fName: '',
  lName: '',
  email: '',
  role:  '',
  bio:   '',
});

// ── SKILLS ────────────────────────────────────────────────────────────────
const skills    = ref([]);
const newSkill  = ref('');

const addSkill = () => {
  const s = newSkill.value.trim();
  if (s && !skills.value.includes(s)) skills.value.push(s);
  newSkill.value = '';
};
const removeSkill = (idx) => skills.value.splice(idx, 1);

// ── CERTIFICATIONS ────────────────────────────────────────────────────────
const certifications = ref([]);
const newCert        = ref('');

const addCert = () => {
  const c = newCert.value.trim();
  if (c && !certifications.value.includes(c)) certifications.value.push(c);
  newCert.value = '';
};
const removeCert = (idx) => certifications.value.splice(idx, 1);

// ── SAVE ──────────────────────────────────────────────────────────────────
const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

const saveProfile = async () => {
  saving.value = true;
  await new Promise(r => setTimeout(r, 600));
  const updated = {
    ...user.value,
    fName:          form.value.fName,
    lName:          form.value.lName,
    bio:            form.value.bio,
    skills:         [...skills.value],
    certifications: [...certifications.value],
  };
  Utils.setStore('user', updated);
  user.value   = updated;
  saving.value = false;
  snackMsg.value   = 'Profile saved!';
  snackColor.value = 'success';
  snackbar.value   = true;
};

// ── COMPUTED ──────────────────────────────────────────────────────────────
const userInitials = computed(() =>
  (form.value.fName?.[0] || '') + (form.value.lName?.[0] || '') || 'E'
);

const roleColor = computed(() => {
  switch (form.value.role) {
    case 'admin':    return 'error';
    case 'employer': return 'warning';
    default:         return '#12086F';
  }
});

const logout = () => { Utils.setStore('user', null); router.push('/login'); };

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(() => {
  user.value = Utils.getStore('user');
  if (user.value) {
    form.value = {
      fName: user.value.fName || '',
      lName: user.value.lName || '',
      email: user.value.email || '',
      role:  user.value.role  || 'employee',
      bio:   user.value.bio   || '',
    };
    skills.value         = [...(user.value.skills         || [])];
    certifications.value = [...(user.value.certifications || [])];
  }
});
</script>

<template>
  <v-app>

    <!-- ── Sidebar ──────────────────────────────────────────────────────── -->
    <v-navigation-drawer
      :rail="rail"
      @mouseenter="rail = false"
      @mouseleave="rail = true"
      permanent width="280"
      class="employee-sidebar"
    >
      <div class="d-flex align-center pa-4" style="min-height:64px;background:rgba(0,0,0,0.15)">
        <template v-if="!rail">
          <div>
            <h2 class="text-h6 font-weight-bold text-white mb-0">ShiftBoard</h2>
            <p class="text-caption text-white mb-0" style="opacity:.8">{{ businessArea }}</p>
          </div>
        </template>
        <v-icon v-else size="32" color="white">mdi-calendar-clock</v-icon>
      </div>
      <v-divider style="border-color:rgba(255,255,255,0.2)" />
      <v-list nav class="px-2 mt-2">
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeDashboard' })" />
        <v-list-item prepend-icon="mdi-clock-outline" title="My Availability" rounded="lg" class="mb-1"
          @click="router.push({ name: 'employeeAvailability' })" />
        <v-list-item prepend-icon="mdi-calendar-clock" title="Shift Requests" rounded="lg" class="mb-1" />
        <v-list-item prepend-icon="mdi-checkbox-marked-circle-outline" title="My Tasks" rounded="lg" class="mb-1" />
        <v-list-item prepend-icon="mdi-account-circle-outline" title="Profile" active rounded="lg" class="mb-1" />
      </v-list>
    </v-navigation-drawer>

    <!-- ── App Bar ───────────────────────────────────────────────────────── -->
    <v-app-bar color="white" elevation="0" style="border-bottom:1px solid #e0e0e0" density="compact">
      <v-spacer />
      <v-menu location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon size="small" class="mr-2">
            <v-avatar size="36" color="#12086F" class="text-caption font-weight-bold text-white">
              {{ userInitials }}
            </v-avatar>
          </v-btn>
        </template>
        <v-card min-width="200">
          <v-card-text class="pa-4">
            <div class="text-center mb-3">
              <v-avatar size="48" color="#12086F" class="text-caption font-weight-bold text-white mb-2">{{ userInitials }}</v-avatar>
              <p class="text-body-2 font-weight-bold mb-0">{{ form.fName }} {{ form.lName }}</p>
              <p class="text-caption text-grey">{{ form.email }}</p>
            </div>
            <v-divider class="mb-2" />
            <v-list density="compact" class="pa-0">
              <v-list-item prepend-icon="mdi-account" title="Profile" @click="() => {}" />
              <v-list-item prepend-icon="mdi-logout" title="Sign Out" class="text-error" @click="logout" />
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- ── Main ─────────────────────────────────────────────────────────── -->
    <v-main style="background:#f5f5f5">
      <v-container fluid class="pa-6" style="max-width:900px">

        <!-- Page header -->
        <div class="d-flex justify-space-between align-center mb-6">
          <div>
            <h1 class="text-h4 font-weight-bold navy-text">My Profile</h1>
            <p class="text-body-2 text-grey mb-0">Manage your personal information and skills</p>
          </div>
          <v-btn color="#12086F" variant="flat" size="large" :loading="saving" @click="saveProfile">
            Save Changes
          </v-btn>
        </div>

        <v-row>

          <!-- ── LEFT: Avatar + Role ──────────────────────────────────────── -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" rounded="lg" class="navy-card text-center pa-6">
              <v-avatar size="96" color="#12086F" class="mb-4">
                <span class="text-h5 font-weight-bold text-white">{{ userInitials }}</span>
              </v-avatar>
              <h2 class="text-h6 font-weight-bold mb-1">{{ form.fName }} {{ form.lName }}</h2>
              <p class="text-body-2 text-grey mb-3">{{ form.email }}</p>
              <v-chip :color="roleColor" variant="tonal" size="small" class="text-capitalize mb-4">
                {{ form.role }}
              </v-chip>
              <v-divider class="mb-4" />
              <p class="text-caption text-grey mb-2 text-left font-weight-bold">SKILLS</p>
              <div class="d-flex flex-wrap ga-1 mb-4">
                <v-chip
                  v-for="(skill, i) in skills"
                  :key="i"
                  size="small"
                  color="#12086F"
                  variant="tonal"
                  closable
                  @click:close="removeSkill(i)"
                >{{ skill }}</v-chip>
                <span v-if="skills.length === 0" class="text-caption text-disabled">No skills added yet</span>
              </div>
              <p class="text-caption text-grey mb-2 text-left font-weight-bold">CERTIFICATIONS</p>
              <div class="d-flex flex-wrap ga-1">
                <v-chip
                  v-for="(cert, i) in certifications"
                  :key="i"
                  size="small"
                  color="success"
                  variant="tonal"
                  closable
                  @click:close="removeCert(i)"
                >{{ cert }}</v-chip>
                <span v-if="certifications.length === 0" class="text-caption text-disabled">No certifications added yet</span>
              </div>
            </v-card>
          </v-col>

          <!-- ── RIGHT: Edit form ─────────────────────────────────────────── -->
          <v-col cols="12" md="8">

            <!-- Personal Info -->
            <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
              <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
                <v-icon size="18" color="#12086F">mdi-account-edit-outline</v-icon>
                Personal Information
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-5">
                <v-row dense>
                  <v-col cols="6">
                    <v-text-field
                      v-model="form.fName"
                      label="First Name"
                      variant="outlined"
                      density="compact"
                      color="#12086F"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="form.lName"
                      label="Last Name"
                      variant="outlined"
                      density="compact"
                      color="#12086F"
                    />
                  </v-col>
                </v-row>
                <v-text-field
                  v-model="form.email"
                  label="Email Address"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                  class="mb-3"
                  prepend-inner-icon="mdi-email-outline"
                />
                <v-text-field
                  v-model="form.role"
                  label="Role"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                  readonly
                  prepend-inner-icon="mdi-shield-account-outline"
                  hint="Your role is assigned by your employer"
                  persistent-hint
                />
              </v-card-text>
            </v-card>

            <!-- Bio -->
            <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
              <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
                <v-icon size="18" color="#12086F">mdi-text-account</v-icon>
                Bio
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-5">
                <v-textarea
                  v-model="form.bio"
                  label="Tell us about yourself…"
                  variant="outlined"
                  density="compact"
                  color="#12086F"
                  rows="4"
                  counter="300"
                  maxlength="300"
                  no-resize
                />
              </v-card-text>
            </v-card>

            <!-- Skills -->
            <v-card variant="outlined" rounded="lg" class="navy-card mb-4">
              <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
                <v-icon size="18" color="#12086F">mdi-star-outline</v-icon>
                Skills
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-5">
                <div class="d-flex ga-2 mb-4">
                  <v-text-field
                    v-model="newSkill"
                    label="Add a skill (e.g. Barista, POS System)"
                    variant="outlined"
                    density="compact"
                    color="#12086F"
                    hide-details
                    @keyup.enter="addSkill"
                  />
                  <v-btn color="#12086F" variant="flat" :disabled="!newSkill.trim()" @click="addSkill">
                    Add
                  </v-btn>
                </div>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="(skill, i) in skills"
                    :key="i"
                    color="#12086F"
                    variant="tonal"
                    closable
                    @click:close="removeSkill(i)"
                  >{{ skill }}</v-chip>
                  <span v-if="skills.length === 0" class="text-caption text-disabled">No skills yet — add one above</span>
                </div>
              </v-card-text>
            </v-card>

            <!-- Certifications -->
            <v-card variant="outlined" rounded="lg" class="navy-card">
              <v-card-title class="text-subtitle-1 font-weight-bold pa-4 navy-text d-flex align-center ga-2">
                <v-icon size="18" color="#12086F">mdi-certificate-outline</v-icon>
                Certifications
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-5">
                <div class="d-flex ga-2 mb-4">
                  <v-text-field
                    v-model="newCert"
                    label="Add a certification (e.g. Food Safety, First Aid)"
                    variant="outlined"
                    density="compact"
                    color="#12086F"
                    hide-details
                    @keyup.enter="addCert"
                  />
                  <v-btn color="#12086F" variant="flat" :disabled="!newCert.trim()" @click="addCert">
                    Add
                  </v-btn>
                </div>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="(cert, i) in certifications"
                    :key="i"
                    color="success"
                    variant="tonal"
                    closable
                    @click:close="removeCert(i)"
                  >{{ cert }}</v-chip>
                  <span v-if="certifications.length === 0" class="text-caption text-disabled">No certifications yet — add one above</span>
                </div>
              </v-card-text>
            </v-card>

          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">
      {{ snackMsg }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
/* ── Sidebar ────────────────────────────────────────────────────────────── */
.employee-sidebar { background: linear-gradient(180deg, #12086F 0%, #2B354F 100%) !important; }
.employee-sidebar :deep(.v-list-item__prepend .v-icon) { color: white !important; opacity: 1 !important; }
.employee-sidebar :deep(.v-list-item-title) { color: white !important; }
.employee-sidebar :deep(.v-list-item) { transition: all 0.2s; }
.employee-sidebar :deep(.v-list-item:hover) { background-color: rgba(255,255,255,0.1) !important; }
.employee-sidebar :deep(.v-list-item--active) { background-color: rgba(255,255,255,0.14) !important; }

/* ── Utilities ──────────────────────────────────────────────────────────── */
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0 !important; box-shadow: 0 1px 3px rgba(18,8,111,0.05) !important; }
</style>
