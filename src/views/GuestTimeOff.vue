<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const selectedTab       = ref('pending');
const showDetailsDialog = ref(false);
const selectedRequest   = ref(null);

// ── HARDCODED DEMO DATA ───────────────────────────────────────────────────
const timeOffRequests = ref([
  { id: 't1', employeeName: 'Michael Chen',    startDate: 'Apr 28, 2026', endDate: 'Apr 30, 2026', days: 3, reason: 'Family event',         status: 'pending'  },
  { id: 't2', employeeName: 'Ashley Brown',    startDate: 'May 5, 2026',  endDate: 'May 6, 2026',  days: 2, reason: 'Doctor appointment',    status: 'pending'  },
  { id: 't3', employeeName: 'Sarah Johnson',   startDate: 'Apr 14, 2026', endDate: 'Apr 15, 2026', days: 2, reason: 'Vacation',              status: 'approved' },
  { id: 't4', employeeName: 'James Williams',  startDate: 'Apr 7, 2026',  endDate: 'Apr 7, 2026',  days: 1, reason: 'Personal obligation',   status: 'approved' },
  { id: 't5', employeeName: 'Emily Rodriguez', startDate: 'Mar 31, 2026', endDate: 'Apr 1, 2026',  days: 2, reason: 'Travel',                status: 'denied'   },
]);

const headers = [
  { title: 'Employee',   key: 'employeeName', sortable: true  },
  { title: 'Start Date', key: 'startDate',    sortable: true  },
  { title: 'End Date',   key: 'endDate',      sortable: true  },
  { title: 'Days',       key: 'days',         sortable: true  },
  { title: 'Reason',     key: 'reason',       sortable: false },
  { title: 'Status',     key: 'status',       sortable: true  },
  { title: 'Actions',    key: 'actions',      sortable: false },
];

const filteredRequests = computed(() => {
  if (selectedTab.value === 'all') return timeOffRequests.value;
  return timeOffRequests.value.filter(r => r.status === selectedTab.value);
});

const pendingCount = computed(() => timeOffRequests.value.filter(r => r.status === 'pending').length);

const getStatusColor = (s) => ({ pending: '#f57c00', approved: '#2e7d32', denied: '#d32f2f' }[s] || '#9e9e9e');

const openDetails = (req) => { selectedRequest.value = req; showDetailsDialog.value = true; };
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Approve/deny actions are disabled.
      </v-alert>

      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Time Off Requests</h1>
        <p class="text-body-2 text-grey">Review and manage employee time off requests</p>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="pending">
            Pending
            <v-chip v-if="pendingCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-2">{{ pendingCount }}</v-chip>
          </v-tab>
          <v-tab value="approved">Approved</v-tab>
          <v-tab value="denied">Denied</v-tab>
          <v-tab value="all">All</v-tab>
        </v-tabs>
      </v-card>

      <!-- Table -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-0">
          <v-data-table :headers="headers" :items="filteredRequests" items-per-page="10">
            <template #[`item.reason`]="{ item }">
              <div class="text-truncate" style="max-width:200px;">{{ item.reason }}</div>
            </template>
            <template #[`item.status`]="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">{{ item.status }}</v-chip>
            </template>
            <template #[`item.actions`]="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="plain" color="#4361EE" @click="openDetails(item)" />
              <template v-if="item.status === 'pending'">
                <v-btn icon="mdi-check" size="small" variant="plain" color="#2e7d32" disabled />
                <v-btn icon="mdi-close" size="small" variant="plain" color="#d32f2f" disabled />
              </template>
            </template>
            <template #no-data>
              <div class="text-center pa-6">
                <v-icon size="48" class="mb-2 text-grey">mdi-calendar-remove</v-icon>
                <div class="text-body-2 text-grey">No {{ selectedTab }} requests</div>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

    </v-container>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedRequest">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Time Off Request Details</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3"><div class="text-caption text-grey">Employee</div><div class="text-body-1 font-weight-medium">{{ selectedRequest.employeeName }}</div></div>
          <v-row dense class="mb-3">
            <v-col cols="6"><div class="text-caption text-grey">Start Date</div><div class="text-body-1">{{ selectedRequest.startDate }}</div></v-col>
            <v-col cols="6"><div class="text-caption text-grey">End Date</div><div class="text-body-1">{{ selectedRequest.endDate }}</div></v-col>
          </v-row>
          <div class="mb-3"><div class="text-caption text-grey">Duration</div><div class="text-body-1">{{ selectedRequest.days }} day{{ selectedRequest.days > 1 ? 's' : '' }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Reason</div><div class="text-body-1">{{ selectedRequest.reason }}</div></div>
          <div><div class="text-caption text-grey">Status</div><v-chip :color="getStatusColor(selectedRequest.status)" size="small" variant="tonal" class="mt-1">{{ selectedRequest.status }}</v-chip></div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer /><v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
</style>