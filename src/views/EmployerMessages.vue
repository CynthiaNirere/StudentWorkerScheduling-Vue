<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const user = ref(null);
const loading = ref(false);
const conversations = ref([]);
const activeConvo = ref(null);
const threadMessages = ref([]);
const threadLoading = ref(false);
const replyText = ref('');
const replying = ref(false);
const employees = ref([]);

const showComposeDialog = ref(false);
const showBroadcastDialog = ref(false);
const composing = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

const newMessage = ref({ recipientId: [], subject: "", message: "", linkUrl: "" });
const broadcastMessage = ref({ subject: "", message: "", linkUrl: "" });

const currentUserId = computed(() => user.value?.user_id || user.value?.userId);

onMounted(async () => {
  user.value = Utils.getStore("user");
  await Promise.all([loadEmployees(), loadConversations()]);
});

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const all = Array.isArray(res.data) ? res.data : [];
    employees.value = all.filter(u => {
      const empId = u.user_id || u.userId;
      return u.role === 'employee' && empId !== currentUserId.value;
    });
  } catch (err) {
    console.error("Error loading employees:", err);
  }
};

const loadConversations = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getConversations();
    conversations.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading conversations:", err);
    showSnackbar("Error loading conversations", "error");
  } finally {
    loading.value = false;
  }
};

const openConversation = async (convo) => {
  activeConvo.value = convo;
  threadLoading.value = true;
  threadMessages.value = [];
  replyText.value = '';
  try {
    const res = await EmployerService.getThread(convo.thread_id);
    const original = res.data.original;
    const replies = Array.isArray(res.data.replies) ? res.data.replies : [];
    threadMessages.value = [original, ...replies];
    convo.unread_count = 0;
    await nextTick();
    scrollToBottom();
  } catch (err) {
    console.error('Error loading thread:', err);
    showSnackbar('Error loading conversation', 'error');
  } finally {
    threadLoading.value = false;
  }
};

const sendReply = async () => {
  if (!replyText.value.trim() || !activeConvo.value) return;
  replying.value = true;
  try {
    const original = threadMessages.value[0];
    let replyTo = null;

    if (original.message_type === 'broadcast') {
      // Broadcast reply goes to ALL employees
      const empIds = employees.value.map(e => e.user_id || e.userId);
      if (empIds.length === 0) {
        showSnackbar('No employees found', 'error');
        replying.value = false;
        return;
      }
      replyTo = empIds;
    } else {
      replyTo = original.sender_id === currentUserId.value
        ? original.recipient_id
        : original.sender_id;
      if (!replyTo) replyTo = activeConvo.value.other_person?.id;
      if (!replyTo || replyTo === currentUserId.value) {
        showSnackbar('Could not determine recipient', 'error');
        replying.value = false;
        return;
      }
    }
    await EmployerService.sendMessage({
      recipientId: replyTo,
      subject: `Re: ${original.subject || 'No Subject'}`,
      message: replyText.value,
      messageType: original.message_type === 'broadcast' ? 'broadcast' : 'direct',
      parentMessageId: activeConvo.value.thread_id,
    });
    replyText.value = '';
    const res = await EmployerService.getThread(activeConvo.value.thread_id);
    const orig = res.data.original;
    const replies = Array.isArray(res.data.replies) ? res.data.replies : [];
    threadMessages.value = [orig, ...replies];
    await loadConversations();
    await nextTick();
    scrollToBottom();
  } catch (err) {
    console.error('Error sending reply:', err);
    showSnackbar('Error sending reply', 'error');
  } finally {
    replying.value = false;
  }
};

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
    showSnackbar("Message sent!", "success");
    showComposeDialog.value = false;
    newMessage.value = { recipientId: [], subject: "", message: "", linkUrl: "" };
    await loadConversations();
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
    await loadConversations();
  } catch (err) {
    console.error("Error broadcasting message:", err);
    showSnackbar("Error broadcasting message", "error");
  } finally {
    composing.value = false;
  }
};

const scrollToBottom = () => {
  const el = document.querySelector('.chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
};

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(Number(ts));
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatChatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(Number(ts));
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

<template>
  <EmployerLayout>
    <div class="messaging-container">
      <!-- Conversation List (Left Panel) -->
      <div class="convo-list">
        <div class="convo-header pa-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <h2 class="text-h6 font-weight-bold navy-text">Messages</h2>
            <v-btn icon="mdi-plus" size="small" color="#12086F" variant="tonal" @click="showComposeDialog = true" />
          </div>
          <v-btn block size="small" color="#9C27B0" variant="tonal" prepend-icon="mdi-bullhorn" @click="showBroadcastDialog = true">
            Broadcast
          </v-btn>
        </div>
        <v-divider />

        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="#12086F" size="28" />
        </div>

        <div v-else-if="conversations.length === 0" class="text-center py-10 px-4">
          <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-message-outline</v-icon>
          <div class="text-body-2 text-grey">No conversations yet</div>
          <v-btn size="small" color="#12086F" variant="tonal" class="mt-3" @click="showComposeDialog = true">
            Start a conversation
          </v-btn>
        </div>

        <div v-else class="convo-items">
          <div
            v-for="convo in conversations"
            :key="convo.thread_id"
            class="convo-item pa-3"
            :class="{
              'convo-active': activeConvo?.thread_id === convo.thread_id,
              'convo-unread': convo.unread_count > 0
            }"
            @click="openConversation(convo)"
          >
            <div class="d-flex ga-3 align-start">
              <v-avatar :color="convo.message_type === 'broadcast' ? '#9C27B0' : '#12086F'" size="40">
                <span class="text-white text-body-2 font-weight-bold">{{ convo.other_person?.initials || '?' }}</span>
              </v-avatar>
              <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex justify-space-between align-center">
                  <span class="text-body-2 font-weight-bold text-truncate" style="max-width: 140px;">
                    {{ convo.other_person?.name || 'Unknown' }}
                  </span>
                  <span class="text-caption text-grey flex-shrink-0">{{ formatTime(convo.last_message_time) }}</span>
                </div>
                <div class="text-caption font-weight-medium text-grey-darken-1 mb-1">{{ convo.subject || 'No Subject' }}</div>
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption text-grey text-truncate" style="max-width: 160px;">
                    {{ convo.last_message }}
                  </span>
                  <v-badge v-if="convo.unread_count > 0" :content="convo.unread_count" color="#f57c00" inline />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat View (Right Panel) -->
      <div class="chat-panel">
        <template v-if="!activeConvo">
          <div class="d-flex flex-column align-center justify-center" style="height: 100%;">
            <v-icon size="80" color="grey-lighten-2" class="mb-4">mdi-message-text-outline</v-icon>
            <div class="text-h6 text-grey-lighten-1 mb-2">Select a conversation</div>
            <div class="text-body-2 text-grey">Choose a conversation from the left or start a new one</div>
          </div>
        </template>
        <template v-else>
          <!-- Chat Header -->
          <div class="chat-header pa-4 d-flex align-center ga-3">
            <v-btn icon="mdi-arrow-left" size="small" variant="text" class="d-md-none" @click="activeConvo = null" />
            <v-avatar :color="activeConvo.message_type === 'broadcast' ? '#9C27B0' : '#12086F'" size="36">
              <span class="text-white text-body-2 font-weight-bold">{{ activeConvo.other_person?.initials || '?' }}</span>
            </v-avatar>
            <div>
              <div class="text-body-1 font-weight-bold navy-text">{{ activeConvo.other_person?.name || 'Unknown' }}</div>
              <div class="text-caption text-grey">{{ activeConvo.subject || 'Conversation' }}</div>
            </div>
            <v-spacer />
            <v-chip v-if="activeConvo.message_type === 'broadcast'" size="x-small" color="#9C27B0" variant="tonal">Broadcast</v-chip>
          </div>
          <v-divider />

          <!-- Chat Messages -->
          <div class="chat-messages pa-4">
            <div v-if="threadLoading" class="text-center py-8">
              <v-progress-circular indeterminate color="#12086F" size="28" />
            </div>
            <template v-else>
              <div
                v-for="msg in threadMessages"
                :key="msg.message_id"
                class="mb-3 d-flex"
                :class="msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="chat-bubble pa-3"
                  :class="msg.sender_id === currentUserId ? 'bubble-mine' : 'bubble-theirs'"
                >
                  <div v-if="msg.sender_id !== currentUserId" class="text-caption font-weight-bold mb-1" style="color: #4361EE;">
                    {{ msg.sender_name }}
                  </div>
                  <div class="text-body-2">{{ msg.message }}</div>
                  <div class="text-caption text-right mt-1" style="opacity: 0.7;">{{ formatChatTime(msg.created_at) }}</div>
                </div>
              </div>
            </template>
          </div>

          <!-- Reply Input -->
          <v-divider />
          <div class="chat-input pa-3 d-flex ga-2 align-center">
            <v-text-field
              v-model="replyText"
              placeholder="Type a message..."
              variant="outlined"
              density="compact"
              hide-details
              color="#12086F"
              rounded="pill"
              class="flex-grow-1"
              @keyup.enter="sendReply"
            />
            <v-btn
              icon="mdi-send"
              color="#12086F"
              variant="flat"
              size="small"
              :loading="replying"
              :disabled="!replyText.trim()"
              @click="sendReply"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Compose Message Dialog -->
    <v-dialog v-model="showComposeDialog" max-width="560">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-message-plus</v-icon>New Conversation
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
          <v-text-field v-model="newMessage.subject" label="Subject" variant="outlined" density="compact" class="mb-3" placeholder="Optional" color="#12086F" />
          <v-textarea v-model="newMessage.message" label="Message *" variant="outlined" density="compact" rows="3" class="mb-3" color="#12086F" />
          <v-text-field v-model="newMessage.linkUrl" label="Link (optional)" variant="outlined" density="compact" placeholder="https://..." color="#12086F" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showComposeDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="composing" @click="handleSendMessage">Send</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Broadcast Dialog -->
    <v-dialog v-model="showBroadcastDialog" max-width="560">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-bullhorn</v-icon>Broadcast to All Employees
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" color="#9C27B0" class="mb-4">
            This message will be sent to all {{ employees.length }} employees
          </v-alert>
          <v-text-field v-model="broadcastMessage.subject" label="Subject" variant="outlined" density="compact" class="mb-3" placeholder="Announcement" color="#9C27B0" />
          <v-textarea v-model="broadcastMessage.message" label="Message *" variant="outlined" density="compact" rows="3" class="mb-3" color="#9C27B0" />
          <v-text-field v-model="broadcastMessage.linkUrl" label="Link (optional)" variant="outlined" density="compact" placeholder="https://..." color="#9C27B0" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showBroadcastDialog = false">Cancel</v-btn>
          <v-btn color="#9C27B0" variant="flat" :loading="composing" @click="handleBroadcast">Send Broadcast</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
      {{ snackbarMessage }}
    </v-snackbar>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }

.messaging-container {
  display: flex;
  height: calc(100vh - 64px);
  background: #f5f5f5;
}

.convo-list {
  width: 340px;
  min-width: 340px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.convo-header { background: white; }

.convo-items {
  overflow-y: auto;
  flex: 1;
}

.convo-item {
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}

.convo-item:hover { background: #f5f5ff; }

.convo-active {
  background: #ede7f6 !important;
  border-left: 3px solid #12086F;
}

.convo-unread { background: #fff8f0; }

.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}

.chat-header { background: white; }

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.chat-bubble {
  max-width: 70%;
  border-radius: 16px;
  word-break: break-word;
}

.bubble-mine {
  background: #12086F;
  color: white;
  border-bottom-right-radius: 4px;
}

.bubble-theirs {
  background: white;
  color: #333;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 4px;
}

.chat-input { background: white; }
</style>