<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const user            = ref(null);
const timeOffRequests = ref([]);
const loading         = ref(false);
const selectedTab     = ref("pending");

const showDetailsDialog = ref(false);
const showActionDialog  = ref(false);
const selectedRequest   = ref(null);
const requestToAction   = ref(null);
const processing        = ref(false);

const snackbar        = ref(false);
const snackbarMessage = ref("");
const snackbarColor   = ref("success");

const headers = [
  { title: "Employee",   key: "employeeName", sortable: true  },
  { title: "Start Date", key: "startDate",    sortable: true  },
  { title: "End Date",   key: "endDate",      sortable: true  },
  { title: "Days",       key: "days",         sortable: true  },
  { title: "Reason",     key: "reason",       sortable: false },
  { title: "Status",     key: "status",       sortable: true  },
  { title: "Actions",    key: "actions",      sortable: false },
];

const filteredRequests = computed(() =>
  timeOffRequests.value.filter(r =>
    selectedTab.value === "all" ? true : r.status === selectedTab.value
  )
);

const requestsWithDetails = computed(() =>
  filteredRequests.value.map(r => {
    const start = new Date(Number(r.start_date || r.startDate));
    const end   = new Date(Number(r.end_date   || r.endDate));
    const days  = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return {
      ...r,
      startDate:    start.toLocaleDateString(),
      endDate:      end.toLocaleDateString(),
      days,
      employeeName: r.employeeName || r.employee_name || "Unknown",
    };
  })
);

const pendingCount = computed(() => timeOffRequests.value.filter(r => r.status === "pending").length);

onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadTimeOffRequests();
});

const loadTimeOffRequests = async () => {
  loading.value = true;
  try {
    const res             = await EmployerService.getAllTimeOffRequests();
    timeOffRequests.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading time off requests:", err);
    showSnackbar("Error loading time off requests", "error");
  } finally {
    loading.value = false;
  }
};

const openApproveDialog = (request) => {
  requestToAction.value = { ...request, actionType: 'approve' };
  showActionDialog.value = true;
};

const openDenyDialog = (request) => {
  requestToAction.value = { ...request, actionType: 'deny' };
  showActionDialog.value = true;
};

const confirmAction = async () => {
  if (!requestToAction.value) return;
  processing.value = true;
  try {
    const reqId = requestToAction.value.request_id || requestToAction.value.id;

    if (requestToAction.value.actionType === 'deny') {
      await EmployerService.denyTimeOffRequest(reqId);
      showSnackbar("Time off request denied", "info");
    } else {
      const res = await EmployerService.approveTimeOffRequest(reqId);
      const opened = res.data?.openedShifts || 0;
      // ✅ Tell employer how many shifts were cleared for reassignment
      showSnackbar(
        opened > 0
          ? `Approved! ${opened} shift${opened > 1 ? 's' : ''} are now open for reassignment.`
          : "Time off request approved!",
        "success"
      );
    }

    await loadTimeOffRequests();
    window.dispatchEvent(new Event('notifications-updated'));
  } catch (err) {
    console.error('Action error:', err);
    showSnackbar(`Error ${requestToAction.value.actionType === 'deny' ? 'denying' : 'approving'} request`, "error");
  } finally {
    processing.value   = false;
    showActionDialog.value = false;
    requestToAction.value  = null;
  }
};

const openDetailsDialog = (request) => {
  selectedRequest.value   = request;
  showDetailsDialog.value = true;
};

const getStatusColor = (status) => ({
  pending:  '#f57c00',
  approved: '#2e7d32',
  denied:   '#d32f2f',
}[status] || '#9e9e9e');

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message; snackbarColor.value = color; snackbar.value = true;
};
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <div class="mb-5">
        <h1 class="text-h4 font-weight-bold navy-text">Time Off Requests</h1>
        <p class="text-body-2 text-grey">
          Review and manage employee time off requests.
          Approving a request will automatically free up the employee's shifts for reassignment.
        </p>
      </div>

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

      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-0">
          <v-data-table :headers="headers" :items="requestsWithDetails" :loading="loading" items-per-page="10">
            <template #item.reason="{ item }">
              <div class="text-truncate" style="max-width:200px;">{{ item.reason || "No reason provided" }}</div>
            </template>
            <template #item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">{{ item.status }}</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="plain" color="#4361EE" @click="openDetailsDialog(item)" />
              <template v-if="item.status === 'pending'">
                <v-btn icon="mdi-check" size="small" variant="plain" color="#2e7d32" @click="openApproveDialog(item)" :loading="processing" />
                <v-btn icon="mdi-close" size="small" variant="plain" color="#d32f2f" @click="openDenyDialog(item)" :loading="processing" />
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

    <!-- Action Confirmation Dialog -->
    <v-dialog v-model="showActionDialog" max-width="440">
      <v-card rounded="lg" v-if="requestToAction">
        <v-card-title class="text-h6 pa-5 pb-4">
          {{ requestToAction.actionType === 'deny' ? 'Deny' : 'Approve' }} Time Off Request
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1 mb-2">
            {{ requestToAction.actionType === 'deny' ? 'Deny' : 'Approve' }} time off for
            <strong>{{ requestToAction.employeeName }}</strong>?
          </p>
          <p class="text-body-2 text-grey mb-3">{{ requestToAction.startDate }} – {{ requestToAction.endDate }}</p>

          <!-- Only show this notice for approvals -->
          <v-alert
            v-if="requestToAction.actionType === 'approve'"
            type="info" variant="tonal" density="compact" color="#12086F"
          >
            <div class="text-caption">
              Any shifts scheduled for this employee during this period will be
              <strong>automatically cleared</strong> and made available for other employees.
            </div>
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showActionDialog = false" :disabled="processing">Cancel</v-btn>
          <v-btn
            :color="requestToAction.actionType === 'deny' ? '#d32f2f' : '#2e7d32'"
            variant="flat" :loading="processing" @click="confirmAction"
          >
            {{ requestToAction.actionType === 'deny' ? 'Deny' : 'Approve' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
          <div class="mb-3"><div class="text-caption text-grey">Reason</div><div class="text-body-1">{{ selectedRequest.reason || "No reason provided" }}</div></div>
          <div class="mb-3"><div class="text-caption text-grey">Status</div><v-chip :color="getStatusColor(selectedRequest.status)" size="small" variant="tonal">{{ selectedRequest.status }}</v-chip></div>
          <div class="mb-3">
            <div class="text-caption text-grey">Submitted</div>
            <div class="text-body-2 text-grey">{{ new Date(Number(selectedRequest.created_at || selectedRequest.createdAt)).toLocaleString() }}</div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <template v-if="selectedRequest.status === 'pending'">
            <v-btn variant="tonal" color="#2e7d32" @click="openApproveDialog(selectedRequest); showDetailsDialog = false">Approve</v-btn>
            <v-btn variant="tonal" color="#d32f2f" @click="openDenyDialog(selectedRequest); showDetailsDialog = false">Deny</v-btn>
          </template>
          <v-spacer />
          <v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
</style>