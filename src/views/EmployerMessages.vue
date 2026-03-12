<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';
const user = ref(null);

const employees = ref([]);
const inbox = ref([]);
const sentMessages = ref([]);
const loading = ref(false);
const selectedTab = ref("inbox");

const showComposeDialog = ref(false);
const showBroadcastDialog = ref(false);
const composing = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const newMessage = ref({
  recipientId: [],
  subject: "",
  message: "",
  linkUrl: ""
});

const broadcastMessage = ref({
  subject: "",
  message: "",
  linkUrl: ""
});

const unreadCount = computed(() => 
  inbox.value.filter(m => !m.is_read).length
);

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadEmployees(), loadMessages()]);
});

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const all = Array.isArray(res.data) ? res.data : [];
    const currentUserId = user.value?.user_id || user.value?.userId;
    employees.value = all.filter(u => {
      const empId = u.user_id || u.userId;
      return u.role === 'employee' && empId !== currentUserId;
    });
  } catch (err) {
    console.error("Error loading employees:", err);
  }
};

const loadMessages = async () => {
  loading.value = true;
  try {
    const [inboxRes, sentRes] = await Promise.all([
      EmployerService.getInbox(),
      EmployerService.getSentMessages()
    ]);
    
    inbox.value = Array.isArray(inboxRes.data) ? inboxRes.data : [];
    sentMessages.value = Array.isArray(sentRes.data) ? sentRes.data : [];
    
  } catch (err) {
    console.error("Error loading messages:", err);
    showSnackbar("Error loading messages", "error");
  } finally {
    loading.value = false;
  }
};

const messages = computed(() => {
  return selectedTab.value === 'inbox' ? inbox.value : sentMessages.value;
});

const handleSendMessage = async () => {
  if (!newMessage.value.message || newMessage.value.recipientId.length === 0) {
    showSnackbar("Recipient and message are required", "error");
    return;
  }
  
  composing.value = true;
  try {
    await EmployerService.sendMessage({
      recipientId: newMessage.value.recipientId,
      subject: newMessage.value.subject || "Message",
      message: newMessage.value.message,
      messageType: 'direct',
      linkUrl: newMessage.value.linkUrl || null
    });
    
    showSnackbar("Message sent successfully!", "success");
    showComposeDialog.value = false;
    newMessage.value = { recipientId: [], subject: "", message: "", linkUrl: "" };
    await loadMessages();
    
  } catch (err) {
    console.error("Error sending message:", err);
    showSnackbar("Error sending message", "error");
  } finally {
    composing.value = false;
  }
};

const handleBroadcast = async () => {
  if (!broadcastMessage.value.message) {
    showSnackbar("Message is required", "error");
    return;
  }
  
  composing.value = true;
  try {
    await EmployerService.broadcastMessage({
      subject: broadcastMessage.value.subject || "Announcement",
      message: broadcastMessage.value.message,
      linkUrl: broadcastMessage.value.linkUrl || null
    });
    
    showSnackbar("Broadcast sent to all employees!", "success");
    showBroadcastDialog.value = false;
    broadcastMessage.value = { subject: "", message: "", linkUrl: "" };
    await loadMessages();
    
  } catch (err) {
    console.error("Error broadcasting message:", err);
    showSnackbar("Error broadcasting message", "error");
  } finally {
    composing.value = false;
  }
};

const markAsRead = async (messageId) => {
  try {
    await EmployerService.markMessageAsRead(messageId);
    await loadMessages();
  } catch (err) {
    console.error("Error marking message as read:", err);
  }
};

const deleteMessage = async (messageId) => {
  try {
    await EmployerService.deleteMessage(messageId);
    showSnackbar("Message deleted", "success");
    await loadMessages();
  } catch (err) {
    console.error("Error deleting message:", err);
    showSnackbar("Error deleting message", "error");
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(Number(timestamp));
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit' 
  });
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
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Messages</h1>
          <p class="text-body-2 text-grey">
            Communicate with your team
          </p>
        </div>
        <div class="d-flex ga-2">
          <v-btn
            color="#9C27B0"
            variant="flat"
            prepend-icon="mdi-bullhorn"
            @click="showBroadcastDialog = true"
          >
            Broadcast
          </v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            prepend-icon="mdi-email-plus"
            @click="showComposeDialog = true"
          >
            New Message
          </v-btn>
        </div>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="inbox">
            Inbox
            <v-chip
              v-if="unreadCount > 0"
              size="x-small"
              color="#f57c00"
              variant="tonal"
              class="ml-2"
            >
              {{ unreadCount }}
            </v-chip>
          </v-tab>
          <v-tab value="sent">Sent</v-tab>
        </v-tabs>
      </v-card>

      <!-- Messages List -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-4">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" size="32" />
          </div>

          <div v-else-if="messages.length === 0" class="text-center py-8">
            <v-icon size="64" class="mb-2 text-grey">mdi-email-outline</v-icon>
            <div class="text-body-1 text-grey mb-2">No messages</div>
            <div class="text-body-2 text-grey">
              {{ selectedTab === 'inbox' ? 'Your inbox is empty' : 'No sent messages' }}
            </div>
          </div>

          <div v-else>
            <div
              v-for="message in messages"
              :key="message.message_id"
              class="message-item pa-4 mb-3"
              :class="{ 'message-unread': !message.is_read && selectedTab === 'inbox' }"
            >
              <div class="d-flex justify-space-between align-start mb-2">
                <div>
                  <v-chip
                    :color="message.message_type === 'broadcast' ? '#9C27B0' : '#4361EE'"
                    size="x-small"
                    variant="tonal"
                    class="mb-1"
                  >
                    {{ message.message_type === 'broadcast' ? 'Broadcast' : 'Direct' }}
                  </v-chip>
                  <div class="text-body-1 font-weight-bold navy-text mb-1">
                    {{ message.subject || 'No Subject' }}
                  </div>
                  <div class="text-caption text-grey">
                    <template v-if="selectedTab === 'inbox'">
                      From: {{ message.sender_name }}
                    </template>
                    <template v-else>
                      To: {{ message.recipient_name || 'All Employees' }}
                    </template>
                     · {{ formatTimestamp(message.created_at) }}
                  </div>
                </div>
                
                <div class="d-flex ga-1">
                  <v-btn
                    v-if="!message.is_read && selectedTab === 'inbox'"
                    icon="mdi-email-open"
                    size="x-small"
                    variant="text"
                    color="#4361EE"
                    @click="markAsRead(message.message_id)"
                  />
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="#d32f2f"
                    @click="deleteMessage(message.message_id)"
                  />
                </div>
              </div>
              
              <p class="text-body-2 mb-2">{{ message.message }}</p>
              
              <div v-if="message.link_url" class="mt-2">
                <v-btn
                  :href="message.link_url"
                  target="_blank"
                  size="small"
                  variant="tonal"
                  color="#4361EE"
                  prepend-icon="mdi-link"
                >
                  Open Link
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Compose Message Dialog -->
    <v-dialog v-model="showComposeDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          New Message
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-select
            v-model="newMessage.recipientId"
            :items="employees"
            :item-title="(e) => `${e.fName || e.first_name} ${e.lName || e.last_name}`"
            :item-value="(e) => e.user_id || e.userId"
            label="To *"
            variant="outlined"
            density="compact"
            multiple
            chips
            closable-chips
            class="mb-3"
            color="#12086F"
          />
          
          <v-text-field
            v-model="newMessage.subject"
            label="Subject"
            variant="outlined"
            density="compact"
            class="mb-3"
            placeholder="Optional"
            color="#12086F"
          />
          
          <v-textarea
            v-model="newMessage.message"
            label="Message *"
            variant="outlined"
            density="compact"
            rows="4"
            class="mb-3"
            color="#12086F"
          />
          
          <v-text-field
            v-model="newMessage.linkUrl"
            label="Link (optional)"
            variant="outlined"
            density="compact"
            placeholder="https://..."
            hint="Add a link to share"
            persistent-hint
            color="#12086F"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showComposeDialog = false">Cancel</v-btn>
          <v-btn
            color="#12086F"
            variant="flat"
            :loading="composing"
            @click="handleSendMessage"
          >
            Send Message
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Broadcast Dialog -->
    <v-dialog v-model="showBroadcastDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          Broadcast to All Employees
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" color="#9C27B0" class="mb-4">
            This message will be sent to all {{ employees.length }} employees
          </v-alert>
          
          <v-text-field
            v-model="broadcastMessage.subject"
            label="Subject"
            variant="outlined"
            density="compact"
            class="mb-3"
            placeholder="Announcement"
            color="#9C27B0"
          />
          
          <v-textarea
            v-model="broadcastMessage.message"
            label="Message *"
            variant="outlined"
            density="compact"
            rows="4"
            class="mb-3"
            color="#9C27B0"
          />
          
          <v-text-field
            v-model="broadcastMessage.linkUrl"
            label="Link (optional)"
            variant="outlined"
            density="compact"
            placeholder="https://..."
            hint="Add a link to share with everyone"
            persistent-hint
            color="#9C27B0"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showBroadcastDialog = false">Cancel</v-btn>
          <v-btn
            color="#9C27B0"
            variant="flat"
            :loading="composing"
            @click="handleBroadcast"
          >
            Send Broadcast
          </v-btn>
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

.message-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  transition: all 0.2s;
}

.message-item:hover {
  border-color: #12086F;
  box-shadow: 0 2px 8px rgba(18, 8, 111, 0.1);
}

.message-unread {
  border-left: 4px solid #f57c00;
  background: #fff8f3;
}
</style>