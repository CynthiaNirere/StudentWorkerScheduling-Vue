<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils.js";
import EmployeeService from "../services/employeeServices.js";
import EmployeeLayout from "../components/EmployeeLayout.vue";

const user = ref(null);
const loading = ref(false);
const processing = ref(false);
const selectedTab = ref("available");

const allSwaps = ref([]);
const myShifts = ref([]);

const showDetailsDialog = ref(false);
const selectedSwap = ref(null);
const showAcceptDialog = ref(false);
const swapToAccept = ref(null);

const showCreateDialog = ref(false);
const submitting = ref(false);
const swapForm = ref({ shiftId: '', reason: '' });

const snackbar = ref(false);
const snackMsg = ref("");
const snackColor = ref("success");

const userId = computed(() => user.value?.user_id || user.value?.userId);

// Available swaps = pending swaps from OTHER employees that I can accept
const availableSwaps = computed(() =>
  swapsWithDetails.value.filter((s) => {
    const reqUserId = s.swapUser?.requestingUser?.id || s.swapUser?.requesting_user_id;
    return s.status === "pending" && reqUserId !== userId.value;
  })
);

// My swap requests = swaps I created
const mySwapRequests = computed(() =>
  swapsWithDetails.value.filter((s) => {
    const reqUserId = s.swapUser?.requestingUser?.id || s.swapUser?.requesting_user_id;
    return reqUserId === userId.value;
  })
);

// Swaps I accepted (awaiting manager approval)
const acceptedByMe = computed(() =>
  swapsWithDetails.value.filter((s) => {
    const accUserId = s.swapUser?.acceptingUser?.id || s.swapUser?.accepting_user_id;
    return accUserId === userId.value && s.status === "accepted";
  })
);

const filteredSwaps = computed(() => {
  if (selectedTab.value === "available") return availableSwaps.value;
  if (selectedTab.value === "mine") return mySwapRequests.value;
  if (selectedTab.value === "accepted") return acceptedByMe.value;
  return swapsWithDetails.value;
});

const swapsWithDetails = computed(() =>
  allSwaps.value.map((swap) => {
    const shift = swap.shift;
    const shiftDate = shift
      ? new Date(Number(shift.shiftTime)).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "N/A";
    const shiftTime = shift
      ? `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`
      : "N/A";

    return {
      ...swap,
      shiftDate,
      shiftTime,
      requestingEmployee:
        swap.requestingUserName || swap.swapUser?.requestingUser
          ? `${swap.swapUser?.requestingUser?.fName || ""} ${swap.swapUser?.requestingUser?.lName || ""}`.trim() || swap.requestingUserName || "Unknown"
          : "Unknown",
      acceptingEmployee: swap.acceptingUserName
        ? swap.acceptingUserName
        : swap.status === "rejected"
          ? "Rejected"
          : "Open",
    };
  })
);

const availableCount = computed(() => availableSwaps.value.length);
const myCount = computed(() => mySwapRequests.value.length);

const myShiftOptions = computed(() =>
  myShifts.value.map((s) => {
    const d = new Date(Number(s.shiftTime || s.shift_time));
    const start = formatTime(s.startTime || s.start_time);
    const end = formatTime(s.endTime || s.end_time);
    return {
      title: `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${start} – ${end}`,
      value: s.shift_id || s.id,
    };
  })
);

onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    const [swapRes, shiftRes] = await Promise.all([
      EmployeeService.getMySwapRequests(),
      EmployeeService.getMyShifts(),
    ]);
    allSwaps.value = Array.isArray(swapRes.data) ? swapRes.data : [];
    const allShifts = Array.isArray(shiftRes.data) ? shiftRes.data : [];
    myShifts.value = allShifts.filter(
      (s) => (s.user_id || s.userId) === userId.value
    );
  } catch (err) {
    console.error("Error loading swaps:", err);
    showSnackbar("Error loading swap requests", "error");
  } finally {
    loading.value = false;
  }
};

const openDetailsDialog = (swap) => {
  selectedSwap.value = swap;
  showDetailsDialog.value = true;
};

const openAcceptDialog = (swap) => {
  swapToAccept.value = swap;
  showAcceptDialog.value = true;
};

const confirmAccept = async () => {
  if (!swapToAccept.value) return;
  processing.value = true;
  try {
    const swapId = swapToAccept.value.swap_id || swapToAccept.value.id;
    await EmployeeService.acceptSwapRequest(swapId, userId.value);
    showSnackbar("You accepted this shift swap! Awaiting manager approval.", "success");
    window.dispatchEvent(new Event("notifications-updated"));
    await loadData();
  } catch (err) {
    console.error("Accept error:", err);
    showSnackbar(err.response?.data?.message || "Error accepting swap", "error");
  } finally {
    processing.value = false;
    showAcceptDialog.value = false;
    swapToAccept.value = null;
  }
};

const openCreateDialog = () => {
  swapForm.value = { shiftId: '', reason: '' };
  showCreateDialog.value = true;
};

const submitSwapRequest = async () => {
  if (!swapForm.value.shiftId) {
    showSnackbar('Please select a shift', 'error');
    return;
  }
  submitting.value = true;
  try {
    await EmployeeService.createSwapRequest({
      originalShiftId: swapForm.value.shiftId,
      reason: swapForm.value.reason || null,
    });
    showSnackbar('Shift swap request submitted!', 'success');
    showCreateDialog.value = false;
    window.dispatchEvent(new Event('notifications-updated'));
    await loadData();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error submitting swap request', 'error');
  } finally {
    submitting.value = false;
  }
};

const cancelMySwap = async (swap) => {
  try {
    const swapId = swap.swap_id || swap.id;
    await EmployeeService.cancelSwapRequest(swapId);
    showSnackbar("Swap request cancelled", "success");
    await loadData();
  } catch (err) {
    showSnackbar("Error cancelling request", "error");
  }
};

const getStatusColor = (status) => {
  const colors = {
    pending: "#f57c00",
    accepted: "#4361EE",
    approved: "#2e7d32",
    rejected: "#d32f2f",
    cancelled: "#9e9e9e",
  };
  return colors[status] || "#9e9e9e";
};

const getStatusLabel = (status) => {
  const labels = {
    pending: "Open",
    accepted: "Awaiting Approval",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
};

const formatTime = (minutes) => {
  if (minutes === undefined || minutes === null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
};

const showSnackbar = (msg, color = "success") => {
  snackMsg.value = msg;
  snackColor.value = color;
  snackbar.value = true;
};
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Shift Swaps</h1>
          <p class="text-body-2 text-grey">
            Browse open swaps from coworkers or manage your own requests
          </p>
        </div>
        <v-btn
          color="#12086F"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
        >
          Request a Swap
        </v-btn>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="available">
            Available Swaps
            <v-chip
              v-if="availableCount > 0"
              size="x-small"
              color="#f57c00"
              variant="tonal"
              class="ml-2"
            >
              {{ availableCount }}
            </v-chip>
          </v-tab>
          <v-tab value="mine">
            My Requests
            <v-chip
              v-if="myCount > 0"
              size="x-small"
              color="#12086F"
              variant="tonal"
              class="ml-2"
            >
              {{ myCount }}
            </v-chip>
          </v-tab>
          <v-tab value="accepted">Accepted by Me</v-tab>
          <v-tab value="all">All</v-tab>
        </v-tabs>
      </v-card>

      <!-- Swap list -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-4">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" size="32" />
          </div>

          <div v-else-if="filteredSwaps.length === 0" class="text-center py-10">
            <v-icon size="64" color="grey-lighten-2" class="mb-3">mdi-swap-horizontal</v-icon>
            <div class="text-body-1 text-grey">
              {{ selectedTab === 'available' ? 'No open swaps from coworkers right now' : 'No swap requests found' }}
            </div>
          </div>

          <div v-else>
            <div
              v-for="swap in filteredSwaps"
              :key="swap.swap_id || swap.id"
              class="swap-item pa-4 mb-3"
            >
              <div class="d-flex ga-3 align-start">
                <v-avatar color="#f57c00" size="40">
                  <v-icon color="white">mdi-swap-horizontal</v-icon>
                </v-avatar>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-start mb-1">
                    <div>
                      <div class="text-body-2 font-weight-bold navy-text">
                        {{ swap.shiftDate }} · {{ swap.shiftTime }}
                      </div>
                      <div class="text-caption text-grey">
                        Requested by <strong>{{ swap.requestingEmployee }}</strong>
                      </div>
                      <div v-if="swap.acceptingEmployee !== 'Open'" class="text-caption text-grey">
                        Accepted by <strong>{{ swap.acceptingEmployee }}</strong>
                      </div>
                    </div>
                    <v-chip
                      :color="getStatusColor(swap.status)"
                      size="small"
                      variant="tonal"
                    >
                      {{ getStatusLabel(swap.status) }}
                    </v-chip>
                  </div>
                  <div v-if="swap.reason" class="text-caption text-grey mt-1">
                    <strong>Reason:</strong> {{ swap.reason }}
                  </div>
                </div>

                <!-- Actions -->
                <div class="d-flex ga-1 align-center">
                  <v-btn
                    icon="mdi-eye"
                    size="small"
                    variant="plain"
                    color="#4361EE"
                    @click="openDetailsDialog(swap)"
                  />
                  <!-- Accept button: only on available swaps -->
                  <v-btn
                    v-if="swap.status === 'pending' && (swap.swapUser?.requestingUser?.id || swap.swapUser?.requesting_user_id) !== userId"
                    color="#2e7d32"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-check"
                    @click="openAcceptDialog(swap)"
                  >
                    Accept
                  </v-btn>
                  <!-- Cancel button: only on my pending swaps -->
                  <v-btn
                    v-if="swap.status === 'pending' && (swap.swapUser?.requestingUser?.id || swap.swapUser?.requesting_user_id) === userId"
                    icon="mdi-close"
                    size="small"
                    variant="plain"
                    color="#d32f2f"
                    @click="cancelMySwap(swap)"
                  />
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Accept Confirmation Dialog -->
    <v-dialog v-model="showAcceptDialog" max-width="420">
      <v-card rounded="lg" v-if="swapToAccept">
        <v-card-title class="text-h6 pa-5 pb-4 navy-text">Accept Shift Swap</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">
            You are accepting to take over this shift from
            <strong>{{ swapToAccept.requestingEmployee }}</strong>.
          </p>
          <div class="mt-3 pa-3" style="background: #f5f5f5; border-radius: 8px;">
            <div class="text-body-2 font-weight-bold">{{ swapToAccept.shiftDate }}</div>
            <div class="text-body-2">{{ swapToAccept.shiftTime }}</div>
            <div v-if="swapToAccept.reason" class="text-caption text-grey mt-1">{{ swapToAccept.reason }}</div>
          </div>
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mt-4">
            After you accept, a manager still needs to approve the swap before it's final.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAcceptDialog = false" :disabled="processing">Cancel</v-btn>
          <v-btn color="#2e7d32" variant="flat" :loading="processing" @click="confirmAccept">
            Accept Swap
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="500">
      <v-card rounded="lg" v-if="selectedSwap">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Shift Swap Details
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="mb-3">
            <div class="text-caption text-grey">Shift</div>
            <div class="text-body-1 font-weight-medium">
              {{ selectedSwap.shiftDate }} · {{ selectedSwap.shiftTime }}
            </div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Requested By</div>
            <div class="text-body-1">{{ selectedSwap.requestingEmployee }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Accepted By</div>
            <div class="text-body-1">{{ selectedSwap.acceptingEmployee }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Reason</div>
            <div class="text-body-1">{{ selectedSwap.reason || "No reason provided" }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-grey">Status</div>
            <v-chip :color="getStatusColor(selectedSwap.status)" size="small" variant="tonal">
              {{ getStatusLabel(selectedSwap.status) }}
            </v-chip>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn
            v-if="selectedSwap.status === 'pending' && (selectedSwap.swapUser?.requestingUser?.id || selectedSwap.swapUser?.requesting_user_id) !== userId"
            color="#2e7d32"
            variant="tonal"
            @click="openAcceptDialog(selectedSwap); showDetailsDialog = false"
          >
            Accept
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create Swap Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="pa-5 pb-4 navy-text font-weight-bold">
          <v-icon start>mdi-swap-horizontal</v-icon>
          Request Shift Swap
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-select
            v-model="swapForm.shiftId"
            :items="myShiftOptions"
            label="Select Shift to Swap *"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
            :no-data-text="'No upcoming shifts found'"
          />
          <v-textarea
            v-model="swapForm.reason"
            label="Reason (optional)"
            variant="outlined"
            density="compact"
            rows="2"
            color="#12086F"
          />
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mt-3">
            Your coworkers will see this swap and can accept it. A manager will then approve or reject.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="submitting" @click="submitSwapRequest">
            Submit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">
      {{ snackMsg }}
    </v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text {
  color: #12086f !important;
}
.navy-card {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05);
}
.swap-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  transition: all 0.2s;
}
.swap-item:hover {
  border-color: #12086f;
  box-shadow: 0 2px 8px rgba(18, 8, 111, 0.08);
}
</style>
