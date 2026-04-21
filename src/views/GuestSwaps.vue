<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const selectedTab       = ref('pending');
const showDetailsDialog = ref(false);
const selectedSwap      = ref(null);

// ── HARDCODED DEMO DATA ───────────────────────────────────────────────────
const swapRequests = ref([
  {
    id: 's1', shiftDate: 'Mon, Apr 21', shiftTime: '7AM - 2PM',
    requestingEmployee: 'Sarah Johnson', acceptingEmployee: 'Michael Chen',
    reason: 'Doctor appointment', status: 'accepted',
  },
  {
    id: 's2', shiftDate: 'Wed, Apr 23', shiftTime: '2PM - 9PM',
    requestingEmployee: 'Emily Rodriguez', acceptingEmployee: 'Pending',
    reason: 'Family event', status: 'pending',
  },
  {
    id: 's3', shiftDate: 'Fri, Apr 18', shiftTime: '8AM - 3PM',
    requestingEmployee: 'Ashley Brown', acceptingEmployee: 'David Martinez',
    reason: 'Class conflict', status: 'approved',
  },
  {
    id: 's4', shiftDate: 'Sat, Apr 19', shiftTime: '10AM - 5PM',
    requestingEmployee: 'James Williams', acceptingEmployee: 'Sarah Johnson',
    reason: 'Personal obligation', status: 'rejected',
  },
]);

const headers = [
  { title: 'Shift Date',           key: 'shiftDate',           sortable: true  },
  { title: 'Shift Time',           key: 'shiftTime',           sortable: false },
  { title: 'Requesting Employee',  key: 'requestingEmployee',  sortable: true  },
  { title: 'Accepting Employee',   key: 'acceptingEmployee',   sortable: true  },
  { title: 'Reason',               key: 'reason',              sortable: false },
  { title: 'Status',               key: 'status',              sortable: true  },
  { title: 'Actions',              key: 'actions',             sortable: false },
];

const filteredSwaps = computed(() => {
  if (selectedTab.value === 'all') return swapRequests.value;
  if (selectedTab.value === 'pending') return swapRequests.value.filter(s => s.status === 'pending' || s.status === 'accepted');
  return swapRequests.value.filter(s => s.status === selectedTab.value);
});

const pendingCount = computed(() => swapRequests.value.filter(s => s.status === 'pending' || s.status === 'accepted').length);

const getStatusColor = (s) => ({ pending: '#f57c00', accepted: '#4361EE', approved: '#2e7d32', rejected: '#d32f2f' }[s] || '#9e9e9e');
const getStatusLabel = (s) => ({ pending: 'Pending', accepted: 'Awaiting Approval', approved: 'Approved', rejected: 'Rejected' }[s] || s);

const openDetails = (swap) => { selectedSwap.value = swap; showDetailsDialog.value = true; };
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Approve/reject actions are disabled.
      </v-alert>

      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Shift Swap Requests</h1>
        <p class="text-body-2 text-grey">Review and approve shift swap requests</p>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="pending">
            Pending Approval
            <v-chip v-if="pendingCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-2">{{ pendingCount }}</v-chip>
          </v-tab>
          <v-tab value="approved">Approved</v-tab>
          <v-tab value="rejected">Rejected</v-tab>
          <v-tab value="all">All</v-tab>
        </v-tabs>
      </v-card>

      <!-- Table -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-0">
          <v-data-table :headers="headers" :items="filteredSwaps" items-per-page="10">
            <template #[`item.reason`]="{ item }">
              <div class="text-truncate" style="max-width:200px;">{{ item.reason }}</div>
            </template>
            <template #[`item.status`]="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">{{ getStatusLabel(item.status) }}</v-chip>
            </template>
            <template #[`item.actions`]="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="plain" color="#4361EE" @click="openDetails(item)" />
              <v-btn v-if="item.status === 'accepted'" icon="mdi-check" size="small" variant="plain" color="#2e7d32" disabled />
              <v-btn v-if="item.status === 'pending' || item.status === 'accepted'" icon="mdi-close" size="small" variant="plain" color="#d32f2f" disabled />
            </template>
            <template #no-data>
              <div class="text-center pa-6">
                <v-icon size="48" class="mb-2 text-grey">mdi-swap-horizontal</v-icon>
                <div class="text-body-2 text-grey">No {{ selectedTab }} swap requests</div>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

    </v-container>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedSwap">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Shift Swap Request Details</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3"><div class="text-caption text-grey">Shift</div><div class="text-body-1 font-weight-medium">{{ selectedSwap.shiftDate }} • {{ selectedSwap.shiftTime }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Requesting Employee</div><div class="text-body-1">{{ selectedSwap.requestingEmployee }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Accepting Employee</div><div class="text-body-1">{{ selectedSwap.acceptingEmployee }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Reason</div><div class="text-body-1">{{ selectedSwap.reason }}</div></div>
          <div><div class="text-caption text-grey">Status</div><v-chip :color="getStatusColor(selectedSwap.status)" size="small" variant="tonal" class="mt-1">{{ getStatusLabel(selectedSwap.status) }}</v-chip></div>
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