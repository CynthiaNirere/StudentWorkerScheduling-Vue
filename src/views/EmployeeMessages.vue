<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const user    = ref(null);
const loading = ref(false);
const inbox   = ref([]);
const sent    = ref([]);
const selectedTab = ref('inbox');

const showComposeDialog = ref(false);
const composing = ref(false);
const composeForm = ref({ subject: '', message: '' });

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

// ── COMPUTED ──────────────────────────────────────────────────────────────
const messages = computed(() => selectedTab.value === 'inbox' ? inbox.value : sent.value);
const unreadCount = computed(() => inbox.value.filter(m => !m.is_read).length);

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await loadMessages();
});

const loadMessages = async () => {
  loading.value = true;
  try {
    const [inboxRes, sentRes] = await Promise.all([
      EmployeeService.getInbox(),
      EmployeeService.getSentMessages(),
    ]);
    inbox.value = Array.isArray(inboxRes.data) ? inboxRes.data : [];
    sent.value  = Array.isArray(sentRes.data) ? sentRes.data : [];
  } catch (err) {
    console.error('Error loading messages:', err);
    showSnackbar('Error loading messages', 'error');
  } finally {
    loading.value = false;
  }
};

const markRead = async (msg) => {
  if (msg.is_read) return;
  try {
    await EmployeeService.markMessageAsRead(msg.message_id);
    msg.is_read = true;
  } catch (err) {
    console.error('Error marking message read:', err);
  }
};

const deleteMsg = async (msg) => {
  try {
    await EmployeeService.deleteMessage(msg.message_id);
    showSnackbar('Message deleted', 'success');
    await loadMessages();
  } catch (err) {
    showSnackbar('Error deleting message', 'error');
  }
};

// Employee can only reply/compose to employer — no recipient select needed
// Messages go to employer (broadcast-style from employee perspective)
const sendMessage = async () => {
  if (!composeForm.value.message.trim()) {
    showSnackbar('Message is required', 'error');
    return;
  }
  composing.value = true;
  try {
    await EmployeeService.sendMessage({
      subject: composeForm.value.subject || 'Message',
      message: composeForm.value.message,
      messageType: 'direct',
      // recipientId intentionally left null — goes to employer/manager
    });
    showSnackbar('Message sent!', 'success');
    showComposeDialog.value = false;
    composeForm.value = { subject: '', message: '' };
    await loadMessages();
  } catch (err) {
    showSnackbar(err.response?.data?.message || 'Error sending message', 'error');
  } finally {
    composing.value = false;
  }
};

const formatTimestamp = (ts) => {
  if (!ts) return '';
  const d = new Date(Number(ts));
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const showSnackbar = (msg, color = 'success') => { snackMsg.value = msg; snackColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployeeLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Messages</h1>
          <p class="text-body-2 text-grey">Communicate with your manager and team</p>
        </div>
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-email-plus" @click="showComposeDialog = true">
          New Message
        </v-btn>
      </div>

      <!-- Tabs -->
      <v-card variant="outlined" rounded="lg" class="mb-4 navy-card">
        <v-tabs v-model="selectedTab" color="#12086F">
          <v-tab value="inbox">
            Inbox
            <v-chip v-if="unreadCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-2">{{ unreadCount }}</v-chip>
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
          <div v-else-if="messages.length === 0" class="text-center py-10">
            <v-icon size="64" color="grey-lighten-2" class="mb-3">mdi-email-outline</v-icon>
            <div class="text-body-1 text-grey">{{ selectedTab === 'inbox' ? 'Your inbox is empty' : 'No sent messages' }}</div>
          </div>
          <div v-else>
            <div
              v-for="msg in messages"
              :key="msg.message_id"
              class="message-item pa-4 mb-3"
              :class="{ 'message-unread': !msg.is_read && selectedTab === 'inbox' }"
              @click="markRead(msg)"
            >
              <div class="d-flex justify-space-between align-start mb-2">
                <div class="flex-grow-1">
                  <div class="d-flex align-center ga-2 mb-1">
                    <v-chip
                      :color="msg.message_type === 'broadcast' ? '#9C27B0' : '#4361EE'"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ msg.message_type === 'broadcast' ? 'Broadcast' : 'Direct' }}
                    </v-chip>
                    <v-chip v-if="!msg.is_read && selectedTab === 'inbox'" size="x-small" color="#f57c00" variant="flat">New</v-chip>
                  </div>
                  <div class="text-body-2 font-weight-bold navy-text mb-1">{{ msg.subject || 'No Subject' }}</div>
                  <div class="text-caption text-grey">
                    <template v-if="selectedTab === 'inbox'">From: {{ msg.sender_name || 'Manager' }}</template>
                    <template v-else>To: {{ msg.recipient_name || 'Manager' }}</template>
                    · {{ formatTimestamp(msg.created_at) }}
                  </div>
                </div>
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="deleteMsg(msg)" />
              </div>
              <p class="text-body-2 mb-0">{{ msg.message }}</p>
              <div v-if="msg.link_url" class="mt-2">
                <v-btn :href="msg.link_url" target="_blank" size="small" variant="tonal" color="#4361EE" prepend-icon="mdi-link">
                  Open Link
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Compose Dialog -->
    <v-dialog v-model="showComposeDialog" max-width="560">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">
          <v-icon start>mdi-email-plus</v-icon>New Message
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" color="#4361EE" class="mb-4">
            Your message will be sent to your manager.
          </v-alert>
          <v-text-field
            v-model="composeForm.subject"
            label="Subject (optional)"
            variant="outlined"
            density="compact"
            class="mb-3"
            color="#12086F"
          />
          <v-textarea
            v-model="composeForm.message"
            label="Message *"
            variant="outlined"
            density="compact"
            rows="4"
            color="#12086F"
            autofocus
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showComposeDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="composing" @click="sendMessage">Send</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.message-item { border: 1px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; transition: all 0.2s; }
.message-item:hover { border-color: #12086F; box-shadow: 0 2px 8px rgba(18,8,111,0.08); }
.message-unread { border-left: 4px solid #f57c00; background: #fff8f3; }
</style>