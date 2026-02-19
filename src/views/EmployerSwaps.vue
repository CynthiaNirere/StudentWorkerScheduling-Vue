<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

// ─── DATA ─────────────────────────────────────────────────────────────────
const swapRequests = ref([]);
const shifts = ref([]);
const loading = ref(false);
const selectedTab = ref("pending");

// ─── MODALS ───────────────────────────────────────────────────────────────
const showDetailsDialog = ref(false);
const selectedSwap = ref(null);
const processing = ref(false);

// ─── SNACKBAR ─────────────────────────────────────────────────────────────
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

// ─── TABLE HEADERS ────────────────────────────────────────────────────────
const headers = [
  { title: "Shift Date", key: "shiftDate", sortable: true },
  { title: "Shift Time", key: "shiftTime", sortable: false },
  { title: "Requesting Employee", key: "requestingEmployee", sortable: true },
  { title: "Accepting Employee", key: "acceptingEmployee", sortable: true },
  { title: "Reason", key: "reason", sortable: false },
  { title: "Status", key: "status", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

// ─── COMPUTED ─────────────────────────────────────────────────────────────
const filteredSwaps = computed(() => {
  return swapRequests.value.filter((r) => {
    if (selectedTab.value === "all") return true;
    if (selectedTab.value === "pending") return r.status === "pending" || r.status === "accepted";
    return r.status === selectedTab.value;
  });
});

const swapsWithDetails = computed(() => {
  return filteredSwaps.value.map((swap) => {
    const shift = shifts.value.find((s) => s.shift_id === swap.original_shift_id);
    const shiftDate = shift ? new Date(Number(shift.shiftTime)).toLocaleDateString() : "N/A";
    const shiftTime = shift
      ? `${formatShiftTime(shift.startTime)} - ${formatShiftTime(shift.endTime)}`
      : "N/A";

    return {
      ...swap,
      shiftDate,
      shiftTime,
      requestingEmployee: swap.requesting_user_name || "Unknown",
      acceptingEmployee: swap.accepting_user_name || "Pending",
    };
  });
});

const pendingCount = computed(() =>
  swapRequests.value.filter((r) => r.status === "pending" || r.status === "accepted").length
);

// ─── LIFECYCLE ────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadSwapRequests(), loadShifts()]);
});

// ─── LOADERS ──────────────────────────────────────────────────────────────
const loadSwapRequests = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllSwapRequests();
    swapRequests.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading swap requests:", err);
    showSnackbar("Error loading swap requests", "error");
  } finally {
    loading.value = false;
  }
};

const loadShifts = async () => {
  try {
    const res = await EmployerService.getAllShifts();
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading shifts:", err);
  }
};

// ─── ACTIONS ──────────────────────────────────────────────────────────────
const handleApprove = async (swap) => {
  if (!confirm(`Approve this shift swap request?`)) return;

  processing.value = true;
  try {
    await EmployerService.approveSwapRequest(swap.swap_id);
    showSnackbar("Shift swap approved!", "success");
    await loadSwapRequests();
  } catch (err) {
    showSnackbar("Error approving swap", "error");
  } finally {
    processing.value = false;
  }
};

const handleReject = async (swap) => {
  if (!confirm(`Reject this shift swap request?`)) return;

  processing.value = true;
  try {
    await EmployerService.rejectSwapRequest(swap.swap_id);
    showSnackbar("Shift swap rejected", "success");
    await loadSwapRequests();
  } catch (err) {
    showSnackbar("Error rejecting swap", "error");
  } finally {
    processing.value = false;
  }
};

const openDetailsDialog = (swap) => {
  selectedSwap.value = swap;
  showDetailsDialog.value = true;
};

const findReplacement = (swap) => {
  router.push({
    name: "employerEmployees",
    query: { shiftId: swap.original_shift_id, action: "find-replacement" },
  });
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
const getStatusColor = (status) => {
  const colors = {
    pending: "warning",
    accepted: "info",
    approved: "success",
    rejected: "error",
    cancelled: "default",
  };
  return colors[status] || "default";
};

const formatShiftTime = (minutes) => {
  if (minutes === undefined || minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
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
          <h1 class="text-h5 font-weight-bold">Shift Swap Requests</h1>
          <p class="text-body-2 text-medium-emphasis">
            Review and approve shift swap requests
          </p>
        </div>

        <!-- Tabs -->
        <v-card variant="outlined" rounded="lg" class="mb-4">
          <v-tabs v-model="selectedTab" color="#7b1c2e">
            <v-tab value="pending">
              Pending Approval
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
            <v-tab value="rejected">Rejected</v-tab>
            <v-tab value="all">All</v-tab>
          </v-tabs>
        </v-card>

        <!-- Swap Requests Table -->
        <v-card variant="outlined" rounded="lg">
          <v-card-text class="pa-0">
            <v-data-table
              :headers="headers"
              :items="swapsWithDetails"
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
                <template v-if="item.status === 'pending' || item.status === 'accepted'">
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
                    @click="handleReject(item)"
                    :loading="processing"
                  />
                </template>
              </template>

              <template #no-data>
                <div class="text-center pa-6">
                  <v-icon size="48" class="mb-2 text-disabled">mdi-swap-horizontal</v-icon>
                  <div class="text-body-2 text-medium-emphasis">No {{ selectedTab }} swap requests</div>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

      </v-container>
   

    <!-- ─── DETAILS DIALOG ───────────────────────────────────────────────── -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedSwap">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4">
          Shift Swap Request Details
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Shift</div>
            <div class="text-body-1 font-weight-medium">
              {{ selectedSwap.shiftDate }} • {{ selectedSwap.shiftTime }}
            </div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Requesting Employee</div>
            <div class="text-body-1">{{ selectedSwap.requestingEmployee }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Accepting Employee</div>
            <div class="text-body-1">{{ selectedSwap.acceptingEmployee }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Reason</div>
            <div class="text-body-1">{{ selectedSwap.reason || "No reason provided" }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Status</div>
            <v-chip :color="getStatusColor(selectedSwap.status)" size="small" variant="tonal">
              {{ selectedSwap.status }}
            </v-chip>
          </div>
          <div v-if="selectedSwap.approved_by" class="mb-3">
            <div class="text-caption text-medium-emphasis">Approved/Rejected By</div>
            <div class="text-body-2">{{ selectedSwap.approved_by }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Submitted</div>
            <div class="text-body-2 text-disabled">
              {{ new Date(Number(selectedSwap.created_at)).toLocaleString() }}
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <template v-if="selectedSwap.status === 'pending' || selectedSwap.status === 'accepted'">
            <v-btn
              variant="tonal"
              color="success"
              @click="handleApprove(selectedSwap)"
              :loading="processing"
            >
              Approve
            </v-btn>
            <v-btn
              variant="tonal"
              color="error"
              @click="handleReject(selectedSwap)"
              :loading="processing"
            >
              Reject
            </v-btn>
            <v-btn
              variant="tonal"
              @click="findReplacement(selectedSwap)"
            >
              Find Replacement
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