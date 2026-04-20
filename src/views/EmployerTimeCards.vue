<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const user = ref(null);
const clockRecords = ref([]);
const loading = ref(false);
const processing = ref(false);
const selectedTab = ref("needs-review");

const showDetailsDialog = ref(false);
const showEditDialog = ref(false);
const showRejectDialog = ref(false);
const selectedRecord = ref(null);
const rejectReason = ref('');

const editForm = ref({ clockInTime: "", clockOutTime: "", notes: "" });

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const headers = [
  { title: "Employee", key: "employeeName", sortable: true },
  { title: "Date", key: "date", sortable: true },
  { title: "Clock In", key: "clockInFormatted", sortable: false },
  { title: "Clock Out", key: "clockOutFormatted", sortable: false },
  { title: "Total Hours", key: "totalHours", sortable: true },
  { title: "Status", key: "status", sortable: true },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

const recordsWithDetails = computed(() =>
  clockRecords.value.map(r => {
    const clockIn  = r.clockInTime  || r.clock_in_time  || r.clockIn  || r.clock_in;
    const clockOut = r.clockOutTime || r.clock_out_time || r.clockOut || r.clock_out;
    const inDate  = clockIn  ? new Date(Number(clockIn))  : null;
    const outDate = clockOut ? new Date(Number(clockOut)) : null;
    let totalHours = '—';
    if (inDate && outDate) {
      totalHours = ((outDate - inDate) / (1000 * 60 * 60)).toFixed(2) + ' hrs';
    }
    return {
      ...r,
      date: inDate ? inDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—',
      clockInFormatted:  inDate  ? inDate.toLocaleTimeString('en-US',  { hour: 'numeric', minute: '2-digit' }) : '—',
      clockOutFormatted: outDate ? outDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Not clocked out',
      totalHours,
      employeeName: r.employee_name || r.employeeName || r.user_name || 'Unknown',
      status: r.status || 'pending',
      _clockInTime: clockIn,
      _clockOutTime: clockOut,
    };
  })
);

const filteredRecords = computed(() => {
  if (selectedTab.value === 'all') return recordsWithDetails.value;
  if (selectedTab.value === 'needs-review') return recordsWithDetails.value.filter(r => isPending(r));
  return recordsWithDetails.value.filter(r => r.status === selectedTab.value);
});

const pendingCount  = computed(() => recordsWithDetails.value.filter(r => isPending(r)).length);
const rejectedCount = computed(() => recordsWithDetails.value.filter(r => r.status === 'rejected').length);

const statusColor = (s) => ({ pending: '#f57c00', submitted: '#1565C0', approved: '#2e7d32', rejected: '#d32f2f', clocked_in: '#9C27B0', clocked_out: '#f57c00' }[s] || '#9e9e9e');
const statusLabel = (s) => ({ pending: 'Pending', submitted: 'Needs Review', approved: 'Approved', rejected: 'Denied', clocked_in: 'Clocked In', clocked_out: 'Not Clocked Out' }[s] || s);
const getRecordId = (r) => r?.id ?? r?.clock_id ?? r?.clockId ?? null;
const tsToLocal = (ts) => ts ? new Date(Number(ts)).toISOString().slice(0, 16) : '';
const isPending = (r) => r.status === 'pending' || r.status === 'clocked_out' || r.status === 'submitted';

onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadClockRecords();
});

const loadClockRecords = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllClockRecords();
    clockRecords.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    showSnackbar("Error loading time cards", "error");
  } finally {
    loading.value = false;
  }
};

const openDetails = (r) => { selectedRecord.value = r; showDetailsDialog.value = true; };
const openEdit = (r) => {
  selectedRecord.value = r;
  editForm.value = { clockInTime: tsToLocal(r._clockInTime), clockOutTime: tsToLocal(r._clockOutTime), notes: r.notes || '' };
  showEditDialog.value = true;
};
const openReject = (r) => { selectedRecord.value = r; rejectReason.value = ''; showRejectDialog.value = true; };

const handleApprove = async (r) => {
  processing.value = true;
  try {
    await EmployerService.approveClockRecord(getRecordId(r));
    showSnackbar("Time card approved!", "success");
    showDetailsDialog.value = false;
    await loadClockRecords();
  } catch { showSnackbar("Error approving time card", "error"); }
  finally { processing.value = false; }
};

const handleReject = async () => {
  processing.value = true;
  try {
    await EmployerService.rejectClockRecord(getRecordId(selectedRecord.value), rejectReason.value);
    showSnackbar("Time card rejected", "success");
    showRejectDialog.value = false;
    showDetailsDialog.value = false;
    await loadClockRecords();
  } catch { showSnackbar("Error rejecting time card", "error"); }
  finally { processing.value = false; }
};

const handleSaveEdit = async () => {
  if (!editForm.value.clockInTime) { showSnackbar("Clock-in time is required", "error"); return; }
  processing.value = true;
  try {
    await EmployerService.modifyClockRecord(getRecordId(selectedRecord.value), {
      clockInTime:  new Date(editForm.value.clockInTime).getTime(),
      clockOutTime: editForm.value.clockOutTime ? new Date(editForm.value.clockOutTime).getTime() : null,
      notes: editForm.value.notes || 'Modified by employer',
    });
    showSnackbar("Time card modified and approved!", "success");
    showEditDialog.value = false;
    showDetailsDialog.value = false;
    await loadClockRecords();
  } catch { showSnackbar("Error modifying time card", "error"); }
  finally { processing.value = false; }
};

const showSnackbar = (msg, color = "success") => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">

      <!-- ✅ Header only — summary chips removed -->
      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Time Cards</h1>
        <p class="text-body-2 text-grey">Review, approve, modify, or reject submitted employee time cards</p>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="needs-review">
            Needs Review
            <v-chip v-if="pendingCount > 0" size="x-small" color="#1565C0" variant="tonal" class="ml-2">{{ pendingCount }}</v-chip>
          </v-tab>
          <v-tab value="approved">Approved</v-tab>
          <v-tab value="rejected">
            Denied
            <v-chip v-if="rejectedCount > 0" size="x-small" color="#d32f2f" variant="tonal" class="ml-2">{{ rejectedCount }}</v-chip>
          </v-tab>
          <v-tab value="all">All</v-tab>
        </v-tabs>
      </v-card>

      <!-- Table -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-0">
          <v-data-table :headers="headers" :items="filteredRecords" :loading="loading" items-per-page="15">
            <template #item.status="{ item }">
              <v-chip :color="statusColor(item.status)" size="small" variant="tonal">{{ statusLabel(item.status) }}</v-chip>
            </template>
            <template #item.totalHours="{ item }">
              <span :class="item.totalHours === '—' ? 'text-grey' : 'font-weight-medium navy-text'">{{ item.totalHours }}</span>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="plain" color="#4361EE" @click="openDetails(item)" />
              <template v-if="isPending(item)">
                <v-btn icon="mdi-check" size="small" variant="plain" color="#2e7d32" :loading="processing" @click="handleApprove(item)" />
                <v-btn icon="mdi-pencil" size="small" variant="plain" color="#f57c00" @click="openEdit(item)" />
                <v-btn icon="mdi-close" size="small" variant="plain" color="#d32f2f" @click="openReject(item)" />
              </template>
            </template>
            <template #no-data>
              <div class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-2" class="mb-3">mdi-credit-card-clock-outline</v-icon>
                <div class="text-body-1 text-grey mb-1">No time cards found</div>
                <div class="text-caption text-grey">Time cards submitted by employees will appear here</div>
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
          <div class="mb-3"><div class="text-caption text-grey">Status</div><v-chip :color="statusColor(selectedRecord.status)" size="small" variant="tonal" class="mt-1">{{ statusLabel(selectedRecord.status) }}</v-chip></div>
          <div v-if="selectedRecord.status === 'rejected' && (selectedRecord.rejectionReason || selectedRecord.rejection_reason)" class="pa-3 rejection-box">
            <div class="text-caption font-weight-bold mb-1" style="color:#b71c1c">Manager's Note:</div>
            <div class="text-body-2" style="color:#b71c1c">{{ selectedRecord.rejectionReason || selectedRecord.rejection_reason }}</div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <template v-if="isPending(selectedRecord)">
            <v-btn color="#2e7d32" variant="tonal" :loading="processing" @click="handleApprove(selectedRecord)"><v-icon start>mdi-check</v-icon>Approve</v-btn>
            <v-btn color="#f57c00" variant="tonal" @click="openEdit(selectedRecord); showDetailsDialog = false"><v-icon start>mdi-pencil</v-icon>Modify</v-btn>
            <v-btn color="#d32f2f" variant="tonal" @click="openReject(selectedRecord); showDetailsDialog = false"><v-icon start>mdi-close</v-icon>Reject</v-btn>
          </template>
          <v-spacer /><v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modify Dialog -->
    <v-dialog v-model="showEditDialog" max-width="480">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Modify Time Card</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4">Modifying will mark this time card as approved after saving.</v-alert>
          <v-text-field v-model="editForm.clockInTime" label="Clock In *" type="datetime-local" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-text-field v-model="editForm.clockOutTime" label="Clock Out" type="datetime-local" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-textarea v-model="editForm.notes" label="Reason for modification" variant="outlined" density="compact" rows="2" color="#12086F" placeholder="e.g. Employee forgot to clock out" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="#f57c00" variant="flat" :loading="processing" @click="handleSaveEdit">Save & Approve</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reject Dialog -->
    <v-dialog v-model="showRejectDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-5 pb-4">Reject Time Card</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-2 mb-4">Rejecting time card for <strong>{{ selectedRecord?.employeeName }}</strong>. They will need to resubmit.</p>
          <v-textarea v-model="rejectReason" label="Reason for rejection (optional)" variant="outlined" density="compact" rows="2" color="#d32f2f" placeholder="e.g. Incorrect hours, missing clock-out..." />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showRejectDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="processing" @click="handleReject">Reject</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }
.rejection-box { background: #fff5f5; border-left: 3px solid #d32f2f; border-radius: 0 6px 6px 0; }

/* Dark mode */
.v-theme--dark .navy-text { color: #C5CAE9 !important; }
.v-theme--dark .navy-card { border-color: #37474F !important; }
.v-theme--dark .rejection-box { background: #1a0505; border-left-color: #ef5350; }
.v-theme--dark .rejection-box .text-body-2,
.v-theme--dark .rejection-box .text-caption { color: #EF9A9A !important; }
</style>