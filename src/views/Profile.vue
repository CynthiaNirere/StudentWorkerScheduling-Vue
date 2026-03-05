<template>
  <v-app>
    <!-- Sidebar -->
    <v-navigation-drawer
      permanent
      :rail="rail"
      @mouseenter="rail = false"
      @mouseleave="rail = true"
      class="profile-sidebar"
      width="280"
    >
      <div class="sidebar-header d-flex align-center pa-4" style="min-height: 64px; background: rgba(0,0,0,0.15);">
        <template v-if="!rail">
          <div>
            <h2 class="text-h6 font-weight-bold text-white mb-0">ShiftBoard</h2>
          </div>
        </template>
        <v-icon v-else size="32" color="white">mdi-calendar-clock</v-icon>
      </div>

      <v-divider style="border-color: rgba(255,255,255,0.2)" />

      <v-list nav class="px-2 mt-2">
        <v-list-item
          v-for="item in navItems"
          :key="item.title"
          :prepend-icon="item.icon"
          :title="item.title"
          :active="item.active"
          rounded="lg"
          class="mb-1 nav-item"
          @click="item.route ? router.push(item.route) : null"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- App Bar -->
    <v-app-bar color="white" elevation="0" style="border-bottom: 1px solid #e0e0e0;" density="compact">
      <v-spacer />

      <!-- Notification Bell -->
      <v-menu location="bottom" v-model="showNotificationsMenu">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon class="mr-1">
            <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error">
              <v-icon>mdi-bell</v-icon>
            </v-badge>
          </v-btn>
        </template>
        <v-card min-width="400" max-width="500" style="max-height:500px;overflow-y:auto">
          <v-card-title class="text-h6 font-weight-bold pa-4">Notifications</v-card-title>
          <v-divider />
          <div v-if="notifications.length === 0" class="text-center pa-6">
            <p class="text-grey">No notifications</p>
          </div>
          <div v-else>
            <div v-for="n in notifications" :key="n.id" class="pa-4" style="border-bottom:1px solid #f0f0f0">
              <div class="d-flex ga-3">
                <v-icon color="primary" size="large">{{ n.icon }}</v-icon>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-start mb-1">
                    <p class="text-body-2 font-weight-bold mb-0">{{ n.type }}</p>
                    <v-btn icon size="x-small" variant="text" @click="dismissNotification(n.id)">
                      <v-icon size="small">mdi-close</v-icon>
                    </v-btn>
                  </div>
                  <p class="text-body-2 mb-1">{{ n.message }}</p>
                  <p class="text-caption text-grey mb-2">{{ n.timestamp }}</p>
                  <v-btn v-if="n.action" size="small" color="primary" variant="flat" @click="handleNotificationAction(n.id)">
                    {{ n.action }}
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-menu>

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
              <v-avatar size="48" color="#12086F" class="text-caption font-weight-bold text-white mb-2">
                {{ userInitials }}
              </v-avatar>
              <p class="text-body-2 font-weight-bold mb-0">{{ profile.firstName }} {{ profile.lastName }}</p>
              <p class="text-caption text-grey">{{ profile.email }}</p>
            </div>
            <v-divider class="mb-2" />
            <v-list density="compact" class="pa-0">
              <v-list-item prepend-icon="mdi-account" title="Profile" @click="router.push('/profile')" />
              <v-list-item prepend-icon="mdi-logout" title="Sign Out" class="text-error" @click="handleLogout" />
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-app-bar>

    <!-- Main Content -->
    <v-main style="background: #f5f5f5;">
      <v-container fluid class="pa-6">
        <h1 class="text-h4 font-weight-bold mb-6">Profile & Settings</h1>

        <v-card max-width="700" class="mx-auto">
          <!-- Avatar / header section -->
          <v-card-text class="text-center pt-8 pb-4">
            <v-avatar color="#12086F" size="96" class="mb-4">
              <span class="text-white font-weight-bold text-h4">{{ userInitials }}</span>
            </v-avatar>
            <h2 class="text-h5 font-weight-bold mt-2">{{ profile.firstName }} {{ profile.lastName }}</h2>
            <p class="text-body-2 text-grey-darken-1 mt-1">{{ profile.email }}</p>
            <v-chip size="small" :color="roleColor" class="mt-2">{{ profile.role }}</v-chip>
          </v-card-text>

          <v-divider></v-divider>

          <!-- Editable fields -->
          <v-card-text class="pa-6">
            <!-- Bio -->
            <div class="mb-6">
              <div class="d-flex align-center justify-space-between mb-2">
                <label class="text-subtitle-1 font-weight-medium">Bio</label>
                <v-btn v-if="!editingBio" size="small" variant="tonal" color="primary" prepend-icon="mdi-pencil" @click="editingBio = true">Edit</v-btn>
                <div v-else class="d-flex gap-2">
                  <v-btn size="small" color="primary" variant="flat" @click="saveBio">Save</v-btn>
                  <v-btn size="small" variant="outlined" @click="cancelBio">Cancel</v-btn>
                </div>
              </div>
              <div v-if="!editingBio" class="bio-display pa-3 rounded">
                <p class="text-body-2 mb-0" style="white-space: pre-wrap;">{{ profile.bio }}</p>
              </div>
              <v-textarea
                v-else
                v-model="profile.bio"
                variant="outlined"
                density="comfortable"
                rows="4"
                autofocus
              ></v-textarea>
            </div>

            <!-- Skills & Certificates -->
            <div class="mb-4">
              <label class="text-subtitle-1 font-weight-medium mb-2 d-block">Skills & Certificates</label>
              <div class="d-flex flex-wrap gap-2 mb-3">
                <v-chip
                  v-for="(skill, i) in profile.skills"
                  :key="i"
                  closable
                  color="primary"
                  variant="tonal"
                  @click:close="removeSkill(i)"
                >
                  {{ skill }}
                </v-chip>
              </div>
              <div class="d-flex gap-2">
                <v-text-field
                  v-model="newSkill"
                  variant="outlined"
                  placeholder="Add a skill or certificate..."
                  density="comfortable"
                  hide-details
                  @keydown.enter.prevent="addSkill"
                ></v-text-field>
                <v-btn color="primary" variant="tonal" height="48" @click="addSkill">Add</v-btn>
              </div>
            </div>
          </v-card-text>

          <v-divider></v-divider>
          <div class="text-center text-caption text-grey py-3">
            Last updated: {{ lastUpdated }}
          </div>
        </v-card>
      </v-container>
    </v-main>

    <v-snackbar v-model="showSuccess" color="success" :timeout="3000">
      Profile updated successfully!
    </v-snackbar>
    <v-snackbar v-model="showError" color="error" :timeout="3000">
      {{ errorMessage }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils';
import AuthServices from '../services/authServices';
import adminServices from '../services/adminViewServices';
import { useNotifications } from '../composables/useNotifications.js';

const router = useRouter();
const user = ref(null);
const rail = ref(true);
const showNotificationsMenu = ref(false);
const { notifications, unreadCount, dismissNotification, handleNotificationAction } = useNotifications();
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');
const newSkill = ref('');
const editingBio = ref(false);

const profile = ref({
  firstName: '',
  lastName: '',
  email: '',
  bio: '',
  role: '',
  skills: []
});

const originalProfile = ref({});

const userInitials = computed(() => {
  const first = profile.value.firstName?.[0] || '';
  const last = profile.value.lastName?.[0] || '';
  return `${first}${last}`.toUpperCase();
});

const roleColor = computed(() => {
  const r = user.value?.role;
  if (r === 'admin') return 'error';
  if (r === 'employer') return 'primary';
  return 'success';
});

const lastUpdated = computed(() => {
  return new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
});

const navItems = computed(() => {
  const role = user.value?.role;
  if (role === 'employer') {
    return [
      { title: 'Dashboard', icon: 'mdi-view-dashboard', route: '/employer' },
      { title: 'Schedule', icon: 'mdi-calendar', route: { name: 'employerSchedule' } },
      { title: 'Employees', icon: 'mdi-account-group', route: { name: 'employerEmployees' } },
      { title: 'Availability', icon: 'mdi-clock-outline', route: { name: 'employerAvailability' } },
      { title: 'Time Off', icon: 'mdi-calendar-remove', route: { name: 'employerTimeOff' } },
      { title: 'Swaps', icon: 'mdi-swap-horizontal', route: { name: 'employerSwaps' } },
      { title: 'Tasks', icon: 'mdi-checkbox-marked-circle-outline', route: { name: 'employerTasks' } },
      { title: 'Profile', icon: 'mdi-account-circle-outline', route: null, active: true }
    ];
  } else if (role === 'admin') {
    return [
      { title: 'Dashboard', icon: 'mdi-view-dashboard', route: '/admin' },
      { title: 'Profile', icon: 'mdi-account-circle-outline', route: null, active: true }
    ];
  }
  // employee (default)
  return [
    { title: 'Dashboard', icon: 'mdi-view-dashboard', route: '/employee' },
    { title: 'My Availability', icon: 'mdi-clock-outline', route: { name: 'employeeAvailability' } },
    { title: 'Team Schedule', icon: 'mdi-calendar-month', route: { name: 'employeeSchedule' } },
    { title: 'Profile', icon: 'mdi-account-circle-outline', route: null, active: true }
  ];
});

const getRoleDisplay = (role) => {
  const map = { admin: 'System Administrator', employer: 'Manager', employee: 'Employee' };
  return map[role] || role;
};

const addSkill = () => {
  const skill = newSkill.value.trim();
  if (skill && !profile.value.skills.includes(skill)) {
    profile.value.skills.push(skill);
    newSkill.value = '';
  }
};

const removeSkill = (index) => {
  profile.value.skills.splice(index, 1);
};

const handleLogout = async () => {
  try {
    await AuthServices.logoutUser(user.value);
  } catch (err) {
    console.warn('Logout error:', err);
  } finally {
    Utils.removeItem('user');
    router.push({ name: 'login' });
  }
};

const saveBio = async () => {
  await saveProfile();
  editingBio.value = false;
};

const cancelBio = () => {
  profile.value.bio = originalProfile.value.bio;
  editingBio.value = false;
};

const saveProfile = async () => {
  try {
    const updateData = {
      bio: profile.value.bio || '',
      skills: profile.value.skills
    };

    await adminServices.updateUser(user.value.userId || user.value.user_id, updateData);

    user.value.bio = profile.value.bio;
    user.value.skills = profile.value.skills;
    Utils.setStore('user', user.value);

    originalProfile.value = { ...profile.value, skills: [...profile.value.skills] };
    showSuccess.value = true;
  } catch (error) {
    console.error('Error saving profile:', error);
    errorMessage.value = 'Unable to save profile. Please try again.';
    showError.value = true;
  }
};

const resetForm = () => {
  profile.value = { ...originalProfile.value, skills: [...originalProfile.value.skills] };
};

onMounted(() => {
  user.value = Utils.getStore('user');
  if (!user.value) {
    router.push({ name: 'login' });
    return;
  }

  profile.value = {
    firstName: user.value.fName || user.value.first_name || '',
    lastName: user.value.lName || user.value.last_name || '',
    email: user.value.email || '',
    bio: user.value.bio || 'Hi! I\'m a student worker at The Brew. I enjoy working with people and keeping things running smoothly during busy shifts.',
    role: getRoleDisplay(user.value.role),
    skills: user.value.skills?.length ? user.value.skills : ['Customer Service', 'Cash Handling', 'Food Safety Certificate']
  };

  originalProfile.value = { ...profile.value, skills: [...profile.value.skills] };
});
</script>

<style scoped>
.profile-sidebar {
  background: linear-gradient(180deg, #12086F 0%, #2B354F 100%) !important;
}

.profile-sidebar :deep(.v-list-item__prepend .v-icon) {
  color: white !important;
  opacity: 1 !important;
}

.profile-sidebar :deep(.v-list-item-title) {
  color: white !important;
}

.profile-sidebar :deep(.v-list-item--active) {
  background: rgba(255, 255, 255, 0.15) !important;
}

.sidebar-header {
  min-height: 64px;
}

.nav-item {
  margin-bottom: 4px;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
label { color: rgba(0, 0, 0, 0.87); }
.bio-display {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  min-height: 80px;
}
</style>
