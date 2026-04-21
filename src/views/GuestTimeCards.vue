<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const selectedTab       = ref('pending');
const showDetailsDialog = ref(false);
const selectedRecord    = ref(null);

// ── HARDCODED DEMO DATA ───────────────────────────────────────────────────
const clockRecords = ref([
  { id: 'c1', employeeName: 'Sarah Johnson',   date: 'Mon, Apr 21', clockInFormatted: '7:02 AM', clockOutFormatted: '2:08 PM',  totalHours: '7.10 hrs', status: 'pending',  notes: '' },
  { id: 'c2', employeeName: 'Michael Chen',    date: 'Mon, Apr 21', clockInFormatted: '1:58 PM', clockOutFormatted: '9:03 PM',  totalHours: '7.08 hrs', status: 'pending',  notes: '' },
  { id: 'c3', employeeName: 'Emily Rodriguez', date: 'Tue, Apr 22', clockInFormatted: '7:00 AM', clockOutFormatted: '2:00 PM',  totalHours: '7.00 hrs', status: 'approved', notes: '' },
  { id: 'c4', employeeName: 'James Williams',  date: 'Tue, Apr 22', clockInFormatted: '8:01 AM', clockOutFormatted: '3:45 PM',  totalHours: '7.73 hrs', status: 'approved', notes: '' },
  { id: 'c5', employeeName: 'Ashley Brown',    date: 'Wed, Apr 23', clockInFormatted: '2:00 PM', clockOutFormatted: 'Not clocked out', totalHours: '—',      status: 'clocked_out', notes: 'Forgot to clock out' },
  { id: 'c6', employeeName: 'David Martinez',  date: 'Fri, Apr 18', clockInFormatted: '7:05 AM', clockOutFormatted: '1:55 PM',  totalHours: '6.83 hrs', status: 'rejected', notes: 'Incorrect hours — employee was not scheduled' },
]);

const headers = [
  { title: 'Employee',    key: 'employeeName',       sortable: true  },
  { title: 'Date',        key: 'date',               sortable: true  },
  { title: 'Clock In',    key: 'clockInFormatted',   sortable: false },
  { title: 'Clock Out',   key: 'clockOutFormatted',  sortable: false },
  { title: 'Total Hours', key: 'totalHours',         sortable: true  },
  { title: 'Status',      key: 'status',             sortable: true  },
  { title: 'Actions',     key: 'actions',            sortable: false, align: 'end' },
];

const filteredRecords = computed(() => {
  if (selectedTab.value === 'all') return clockRecords.value;
  return clockRecords.value.filter(r => r.status === selectedTab.value);
});

const pendingCount = computed(() =>
  clockRecords.value.filter(r => r.status === 'pending' || r.status === 'clocked_out').length
);

const isPending = (r) => r.status === 'pending' || r.status === 'clocked_out';

const statusColor = (s) => ({ pending: '#f57c00', approved: '#2e7d32', rejected: '#d32f2f', clocked_in: '#9C27B0', clocked_out: '#f57c00' }[s] || '#9e9e9e');
const statusLabel = (s) => ({ pending: 'Pending Review', approved: 'Approved', rejected: 'Rejected', clocked_in: 'Clocked In', clocked_out: 'Awaiting Review' }[s] || s);

const openDetails = (r) => { selectedRecord.value = r; showDetailsDialog.value = true; };
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Approve/modify/reject actions are disabled.
      </v-alert>

      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Time Cards</h1>
        <p class="text-body-2 text-grey">Review, approve, modify, or reject submitted employee time cards</p>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="pending">
            Pending
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
          <v-data-table :headers="headers" :items="filteredRecords" items-per-page="15">
            <template #[`item.status`]="{ item }">
              <v-chip :color="statusColor(item.status)" size="small" variant="tonal">{{ statusLabel(item.status) }}</v-chip>
            </template>
            <template #[`item.totalHours`]="{ item }">
              <span :class="item.totalHours === '—' ? 'text-grey' : 'font-weight-medium navy-text'">{{ item.totalHours }}</span>
            </template>
            <template #[`item.actions`]="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="plain" color="#4361EE" @click="openDetails(item)" />
              <template v-if="isPending(item)">
                <v-btn icon="mdi-check"   size="small" variant="plain" color="#2e7d32" disabled />
                <v-btn icon="mdi-pencil"  size="small" variant="plain" color="#f57c00" disabled />
                <v-btn icon="mdi-close"   size="small" variant="plain" color="#d32f2f" disabled />
              </template>
            </template>
            <template #no-data>
              <div class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-2" class="mb-3">mdi-credit-card-clock-outline</v-icon>
                <div class="text-body-1 text-grey">No time cards found</div>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

    </v-container>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedRecord">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Time Card Details</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3"><div class="text-caption text-grey">Employee</div><div class="text-body-1 font-weight-medium">{{ selectedRecord.employeeName }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Date</div><div class="text-body-1">{{ selectedRecord.date }}</div></div>
          <v-row dense class="mb-3">
            <v-col cols="6"><div class="text-caption text-grey">Clock In</div><div class="text-body-1">{{ selectedRecord.clockInFormatted }}</div></v-col>
            <v-col cols="6"><div class="text-caption text-grey">Clock Out</div><div class="text-body-1">{{ selectedRecord.clockOutFormatted }}</div></v-col>
          </v-row>
          <div class="mb-3"><div class="text-caption text-grey">Total Hours</div><div class="text-h6 font-weight-bold navy-text">{{ selectedRecord.totalHours }}</div></div>
          <div v-if="selectedRecord.notes" class="mb-3"><div class="text-caption text-grey">Notes</div><div class="text-body-2">{{ selectedRecord.notes }}</div></div>
          <div><div class="text-caption text-grey">Status</div><v-chip :color="statusColor(selectedRecord.status)" size="small" variant="tonal" class="mt-1">{{ statusLabel(selectedRecord.status) }}</v-chip></div>
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