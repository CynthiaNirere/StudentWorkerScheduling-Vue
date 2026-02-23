<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

// ─── DATA ─────────────────────────────────────────────────────────────────
const timeOffRequests = ref([]);
const loading = ref(false);
const selectedTab = ref("pending");

// ─── MODALS ───────────────────────────────────────────────────────────────
const showDetailsDialog = ref(false);
const selectedRequest = ref(null);
const processing = ref(false);

// ─── SNACKBAR ─────────────────────────────────────────────────────────────
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

// ─── TABLE HEADERS ────────────────────────────────────────────────────────
const headers = [
  { title: "Employee", key: "employeeName", sortable: true },
  { title: "Start Date", key: "startDate", sortable: true },
  { title: "End Date", key: "endDate", sortable: true },
  { title: "Days", key: "days", sortable: true },
  { title: "Reason", key: "reason", sortable: false },
  { title: "Status", key: "status", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

// ─── COMPUTED ─────────────────────────────────────────────────────────────
const filteredRequests = computed(() => {
  return timeOffRequests.value.filter((r) => {
    if (selectedTab.value === "all") return true;
    return r.status === selectedTab.value;
  });
});

const requestsWithDetails = computed(() => {
  return filteredRequests.value.map((r) => {
    const start = new Date(Number(r.start_date));
    const end = new Date(Number(r.end_date));
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      ...r,
      startDate: start.toLocaleDateString(),
      endDate: end.toLocaleDateString(),
      days,
      employeeName: r.employeeName || "Unknown",
    };
  });
});

const pendingCount = computed(() =>
  timeOffRequests.value.filter((r) => r.status === "pending").length
);

// ─── LIFECYCLE ────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadTimeOffRequests();
});

// ─── LOADERS ──────────────────────────────────────────────────────────────
const loadTimeOffRequests = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllTimeOffRequests();
    timeOffRequests.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading time off requests:", err);
    showSnackbar("Error loading time off requests", "error");
  } finally {
    loading.value = false;
  }
};

// ─── ACTIONS ──────────────────────────────────────────────────────────────
const handleApprove = async (request) => {
  if (!confirm(`Approve time off request for ${request.employeeName}?`)) return;

  processing.value = true;
  try {
    await EmployerService.approveTimeOffRequest(request.request_id);
    showSnackbar("Time off request approved!", "success");
    await loadTimeOffRequests();
  } catch (err) {
    showSnackbar("Error approving request", "error");
  } finally {
    processing.value = false;
  }
};

const handleDeny = async (request) => {
  if (!confirm(`Deny time off request for ${request.employeeName}?`)) return;

  processing.value = true;
  try {
    await EmployerService.denyTimeOffRequest(request.request_id);
    showSnackbar("Time off request denied", "success");
    await loadTimeOffRequests();
  } catch (err) {
    showSnackbar("Error denying request", "error");
  } finally {
    processing.value = false;
  }
};

const openDetailsDialog = (request) => {
  selectedRequest.value = request;
  showDetailsDialog.value = true;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
const getStatusColor = (status) => {
  const colors = {
    pending: "warning",
    approved: "success",
    denied: "error",
  };
  return colors[status] || "default";
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

<template>
  <EmployerLayout>
      <v-container fluid class="pa-6">
        
        <!-- Header -->
        <div class="mb-5">
          <h1 class="text-h5 font-weight-bold">Time Off Requests</h1>
          <p class="text-body-2 text-medium-emphasis">
            Review and manage employee time off requests
          </p>
        </div>

        <!-- Tabs -->
        <v-card variant="outlined" rounded="lg" class="mb-4">
          <v-tabs v-model="selectedTab" color="#7b1c2e">
            <v-tab value="pending">
              Pending
              <v-chip
                v-if="pendingCount > 0"
                size="x-small"
                color="warning"
                class="ml-2"
              >
                {{ pendingCount }}
              </v-chip>
            </v-tab>
            <v-tab value="approved">Approved</v-tab>
            <v-tab value="denied">Denied</v-tab>
            <v-tab value="all">All</v-tab>
          </v-tabs>
        </v-card>

        <!-- Requests Table -->
        <v-card variant="outlined" rounded="lg">
          <v-card-text class="pa-0">
            <v-data-table
              :headers="headers"
              :items="requestsWithDetails"
              :loading="loading"
              items-per-page="10"
            >
              <template #item.reason="{ item }">
                <div class="text-truncate" style="max-width: 200px;">
                  {{ item.reason || "No reason provided" }}
                </div>
              </template>

              <template #item.status="{ item }">
                <v-chip
                  :color="getStatusColor(item.status)"
                  size="small"
                  variant="tonal"
                >
                  {{ item.status }}
                </v-chip>
              </template>

              <template #item.actions="{ item }">
                <v-btn
                  icon="mdi-eye"
                  size="small"
                  variant="plain"
                  @click="openDetailsDialog(item)"
                />
                <template v-if="item.status === 'pending'">
                  <v-btn
                    icon="mdi-check"
                    size="small"
                    variant="plain"
                    color="success"
                    @click="handleApprove(item)"
                    :loading="processing"
                  />
                  <v-btn
                    icon="mdi-close"
                    size="small"
                    variant="plain"
                    color="error"
                    @click="handleDeny(item)"
                    :loading="processing"
                  />
                </template>
              </template>

              <template #no-data>
                <div class="text-center pa-6">
                  <v-icon size="48" class="mb-2 text-disabled">mdi-calendar-remove</v-icon>
                  <div class="text-body-2 text-medium-emphasis">No {{ selectedTab }} requests</div>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

      </v-container>
   

    <!-- ─── DETAILS DIALOG ───────────────────────────────────────────────── -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedRequest">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Time Off Request Details
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Employee</div>
            <div class="text-body-1 font-weight-medium">
              {{ selectedRequest.employeeName }}
            </div>
          </div>
          <v-row dense class="mb-3">
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Start Date</div>
              <div class="text-body-1">{{ selectedRequest.startDate }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">End Date</div>
              <div class="text-body-1">{{ selectedRequest.endDate }}</div>
            </v-col>
          </v-row>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Duration</div>
            <div class="text-body-1">{{ selectedRequest.days }} day{{ selectedRequest.days > 1 ? 's' : '' }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Reason</div>
            <div class="text-body-1">{{ selectedRequest.reason || "No reason provided" }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Status</div>
            <v-chip :color="getStatusColor(selectedRequest.status)" size="small" variant="tonal">
              {{ selectedRequest.status }}
            </v-chip>
          </div>
          <div v-if="selectedRequest.approved_by" class="mb-3">
            <div class="text-caption text-medium-emphasis">
              {{ selectedRequest.status === 'approved' ? 'Approved By' : 'Denied By' }}
            </div>
            <div class="text-body-2">{{ selectedRequest.approved_by }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Submitted</div>
            <div class="text-body-2 text-disabled">
              {{ new Date(Number(selectedRequest.created_at)).toLocaleString() }}
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <template v-if="selectedRequest.status === 'pending'">
            <v-btn
              variant="tonal"
              color="success"
              @click="handleApprove(selectedRequest)"
              :loading="processing"
            >
              Approve
            </v-btn>
            <v-btn
              variant="tonal"
              color="error"
              @click="handleDeny(selectedRequest)"
              :loading="processing"
            >
              Deny
            </v-btn>
          </template>
          <v-spacer />
          <v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ─── SNACKBAR ─────────────────────────────────────────────────────── -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbarMessage }}
    </v-snackbar>

  </EmployerLayout>
</template>