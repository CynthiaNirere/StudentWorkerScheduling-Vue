<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const search = ref('');
const showDetailsDialog = ref(false);
const selectedEmployee  = ref(null);

// ── HARDCODED DEMO DATA ───────────────────────────────────────────────────
const employees = ref([
  {
    user_id: 'e1', first_name: 'Sarah',   last_name: 'Johnson',
    email: 'sarah.j@example.com',   phone_number: '(405) 555-0101',
    jobRoles: [{ role_title: 'Barista',    is_primary: true  }, { role_title: 'Cashier',    is_primary: false }],
  },
  {
    user_id: 'e2', first_name: 'Michael', last_name: 'Chen',
    email: 'michael.c@example.com', phone_number: '(405) 555-0102',
    jobRoles: [{ role_title: 'Cashier',    is_primary: true  }],
  },
  {
    user_id: 'e3', first_name: 'Emily',   last_name: 'Rodriguez',
    email: 'emily.r@example.com',   phone_number: '(405) 555-0103',
    jobRoles: [{ role_title: 'Barista',    is_primary: true  }],
  },
  {
    user_id: 'e4', first_name: 'James',   last_name: 'Williams',
    email: 'james.w@example.com',   phone_number: '(405) 555-0104',
    jobRoles: [{ role_title: 'Shift Lead', is_primary: true  }, { role_title: 'Barista',    is_primary: false }],
  },
  {
    user_id: 'e5', first_name: 'Ashley',  last_name: 'Brown',
    email: 'ashley.b@example.com',  phone_number: '(405) 555-0105',
    jobRoles: [{ role_title: 'Cashier',    is_primary: true  }],
  },
  {
    user_id: 'e6', first_name: 'David',   last_name: 'Martinez',
    email: 'david.m@example.com',   phone_number: '(405) 555-0106',
    jobRoles: [{ role_title: 'Barista',    is_primary: true  }],
  },
]);

const headers = [
  { title: 'Name',      key: 'name',         sortable: true  },
  { title: 'Email',     key: 'email',         sortable: true  },
  { title: 'Phone',     key: 'phone_number',  sortable: false },
  { title: 'Job Roles', key: 'roles',         sortable: false },
  { title: 'Actions',   key: 'actions',       sortable: false, align: 'end' },
];

const employeesWithName = computed(() =>
  employees.value.map(e => ({
    ...e,
    name: `${e.first_name} ${e.last_name}`,
  }))
);

const openDetailsDialog = (emp) => {
  selectedEmployee.value = emp;
  showDetailsDialog.value = true;
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Add/edit/remove actions are disabled.
      </v-alert>

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Employee Management</h1>
          <p class="text-body-2 text-grey">View your team members and their job roles</p>
        </div>
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-plus" size="large" disabled>
          Add Employee
        </v-btn>
      </div>

      <!-- Table -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-0">
          <v-data-table :headers="headers" :items="employeesWithName" :search="search" items-per-page="10">
            <template #top>
              <div class="pa-4 pb-0">
                <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" label="Search employees"
                  variant="outlined" density="compact" hide-details clearable color="#12086F" />
              </div>
            </template>

            <template #[`item.roles`]="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-chip v-for="(role, i) in (item.jobRoles || []).slice(0, 2)" :key="i"
                  size="x-small" :color="role.is_primary ? '#12086F' : '#4361EE'" variant="tonal">
                  {{ role.role_title }}
                  <v-icon v-if="role.is_primary" size="x-small" class="ml-1">mdi-star</v-icon>
                </v-chip>
              </div>
            </template>

            <template #[`item.actions`]="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="text" color="#4361EE"
                @click="openDetailsDialog(item)" />
              <v-btn icon="mdi-pencil"  size="small" variant="text" color="#4361EE" disabled />
              <v-btn icon="mdi-delete"  size="small" variant="text" color="error"   disabled />
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

    </v-container>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedEmployee">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Employee Details</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3">
            <div class="text-caption text-grey">Name</div>
            <div class="text-body-1 font-weight-medium">{{ selectedEmployee.first_name }} {{ selectedEmployee.last_name }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Email</div>
            <div class="text-body-1">{{ selectedEmployee.email }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Phone</div>
            <div class="text-body-1">{{ selectedEmployee.phone_number }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Job Roles</div>
            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip v-for="(role, i) in selectedEmployee.jobRoles" :key="i"
                size="small" :color="role.is_primary ? '#12086F' : '#4361EE'" variant="tonal">
                {{ role.role_title }}
                <v-icon v-if="role.is_primary" size="small" class="ml-1">mdi-star</v-icon>
              </v-chip>
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
</style>