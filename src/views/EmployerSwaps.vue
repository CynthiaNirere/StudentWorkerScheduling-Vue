<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const swapRequests = ref([]);
const shifts = ref([]);
const loading = ref(false);
const selectedTab = ref("pending");

const showDetailsDialog = ref(false);
const showActionDialog = ref(false);
const selectedSwap = ref(null);
const swapToAction = ref(null);
const processing = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const headers = [
  { title: "Shift Date", key: "shiftDate", sortable: true },
  { title: "Shift Time", key: "shiftTime", sortable: false },
  { title: "Requesting Employee", key: "requestingEmployee", sortable: true },
  { title: "Accepting Employee", key: "acceptingEmployee", sortable: true },
  { title: "Reason", key: "reason", sortable: false },
  { title: "Status", key: "status", sortable: true },
  { title: "Actions", key: "actions", sortable: false },
];

const filteredSwaps = computed(() => {
  return swapRequests.value.filter((r) => {
    if (selectedTab.value === "all") return true;
    if (selectedTab.value === "pending") return r.status === "pending" || r.status === "accepted";
    return r.status === selectedTab.value;
  });
});

const swapsWithDetails = computed(() => {
  return filteredSwaps.value.map((swap) => {
    const shift = swap.shift;
    const shiftDate = shift ? new Date(Number(shift.shiftTime)).toLocaleDateString() : "N/A";
    const shiftTime = shift
      ? `${formatShiftTime(shift.startTime)} - ${formatShiftTime(shift.endTime)}`
      : "N/A";

    return {
      ...swap,
      shiftDate,
      shiftTime,
      requestingEmployee: swap.requestingUserName || "Unknown",
      acceptingEmployee: swap.acceptingUserName || "Pending",
    };
  });
});

const pendingCount = computed(() =>
  swapRequests.value.filter((r) => r.status === "pending" || r.status === "accepted").length
);

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadSwapRequests(), loadShifts()]);
});

const loadSwapRequests = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllShiftSwapRequests();
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
    const monday = getMonday(new Date());
    const startDate = monday.getTime() - (30 * 24 * 60 * 60 * 1000);
    const endDate = monday.getTime() + (60 * 24 * 60 * 60 * 1000);
    const res = await EmployerService.getShiftsByWeek(startDate, endDate);
    shifts.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading shifts:", err);
  }
};

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
};

const openApproveDialog = (swap) => {
  swapToAction.value = { ...swap, actionType: 'approve' };
  showActionDialog.value = true;
};

const openRejectDialog = (swap) => {
  swapToAction.value = { ...swap, actionType: 'reject' };
  showActionDialog.value = true;
};

const confirmAction = async () => {
  if (!swapToAction.value) return;
  
  processing.value = true;
  try {
    const swapId = swapToAction.value.swap_id || swapToAction.value.id;
    
    if (swapToAction.value.actionType === 'reject') {
      await EmployerService.rejectSwapRequest(swapId);
      showSnackbar("Shift swap rejected", "success");
    } else {
      await EmployerService.approveSwapRequest(swapId);
      showSnackbar("Shift swap approved!", "success");
    }
    
    await loadSwapRequests();
  } catch (err) {
    console.error('Action error:', err);
    showSnackbar(`Error ${swapToAction.value.actionType}ing swap`, "error");
  } finally {
    processing.value = false;
    showActionDialog.value = false;
    swapToAction.value = null;
  }
};

const openDetailsDialog = (swap) => {
  selectedSwap.value = swap;
  showDetailsDialog.value = true;
};

const findReplacement = (swap) => {
  router.push({
    name: "employerEmployees",
    query: { shiftId: swap.original_shift_id || swap.originalShiftId, action: "find-replacement" },
  });
};

const getStatusColor = (status) => {
  const colors = {
    pending: '#f57c00',
    accepted: '#4361EE',
    approved: '#2e7d32',
    rejected: '#d32f2f',
    cancelled: '#9e9e9e',
  };
  return colors[status] || '#9e9e9e';
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
        <h1 class="text-h4 font-weight-bold navy-text">Shift Swap Requests</h1>
        <p class="text-body-2 text-grey">
          Review and approve shift swap requests
        </p>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="pending">
            Pending Approval
            <v-chip
              v-if="pendingCount > 0"
              size="x-small"
              color="#f57c00"
              variant="tonal"
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
      <v-card variant="outlined" rounded="lg" class="navy-card">
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
                color="#4361EE"
                @click="openDetailsDialog(item)"
              />
              <template v-if="item.status === 'pending' || item.status === 'accepted'">
                <v-btn
                  icon="mdi-check"
                  size="small"
                  variant="plain"
                  color="#2e7d32"
                  @click="openApproveDialog(item)"
                  :loading="processing"
                />
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="plain"
                  color="#d32f2f"
                  @click="openRejectDialog(item)"
                  :loading="processing"
                />
              </template>
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

    <!-- Action Confirmation Dialog -->
    <v-dialog v-model="showActionDialog" max-width="400">
      <v-card rounded="lg" v-if="swapToAction">
        <v-card-title class="text-h6 pa-5 pb-4">
          {{ swapToAction.actionType === 'reject' ? 'Reject' : 'Approve' }} Swap
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">
            Are you sure you want to {{ swapToAction.actionType }} this shift swap request?
          </p>
          <p class="text-body-2 text-grey mt-2">
            <strong>{{ swapToAction.requestingEmployee }}</strong> → 
            <strong>{{ swapToAction.acceptingEmployee }}</strong><br>
            {{ swapToAction.shiftDate }} • {{ swapToAction.shiftTime }}
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showActionDialog = false" :disabled="processing">Cancel</v-btn>
          <v-btn
            :color="swapToAction.actionType === 'reject' ? '#d32f2f' : '#2e7d32'"
            variant="flat"
            :loading="processing"
            @click="confirmAction"
          >
            {{ swapToAction.actionType === 'reject' ? 'Reject' : 'Approve' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedSwap">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Shift Swap Request Details
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3">
            <div class="text-caption text-grey">Shift</div>
            <div class="text-body-1 font-weight-medium">
              {{ selectedSwap.shiftDate }} • {{ selectedSwap.shiftTime }}
            </div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Requesting Employee</div>
            <div class="text-body-1">{{ selectedSwap.requestingEmployee }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Accepting Employee</div>
            <div class="text-body-1">{{ selectedSwap.acceptingEmployee }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Reason</div>
            <div class="text-body-1">{{ selectedSwap.reason || "No reason provided" }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Status</div>
            <v-chip :color="getStatusColor(selectedSwap.status)" size="small" variant="tonal">
              {{ selectedSwap.status }}
            </v-chip>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Submitted</div>
            <div class="text-body-2 text-grey">
              {{ new Date(Number(selectedSwap.created_at || selectedSwap.createdAt)).toLocaleString() }}
            </div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <template v-if="selectedSwap.status === 'pending' || selectedSwap.status === 'accepted'">
            <v-btn
              variant="tonal"
              color="#2e7d32"
              @click="openApproveDialog(selectedSwap); showDetailsDialog = false"
              :loading="processing"
            >
              Approve
            </v-btn>
            <v-btn
              variant="tonal"
              color="#d32f2f"
              @click="openRejectDialog(selectedSwap); showDetailsDialog = false"
              :loading="processing"
            >
              Reject
            </v-btn>
          </template>
          <v-spacer />
          <v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

<style scoped>
.navy-text {
  color: #12086F !important;
}

.navy-card {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05);
}
</style>