<script setup>
import { ref, computed, onMounted } from 'vue';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';
import EmployeeLayout from '../components/EmployeeLayout.vue';

const user    = ref(null);
const threads = ref([]);
const loading = ref(false);

const openThread     = ref(null);
const threadMessages = ref([]);
const replyText      = ref('');
const sendingReply   = ref(false);

const showComposeDialog = ref(false);
const composing         = ref(false);
const composeRecipient  = ref('manager');
const composeMessage    = ref('');
const composeSubject    = ref('');

const selectedTab = ref('direct');

const snackbar   = ref(false);
const snackMsg   = ref('');
const snackColor = ref('success');

const myId = computed(() => user.value?.user_id || user.value?.userId);

const unreadCount = computed(() =>
  threads.value.reduce((sum, t) => sum + (t.unreadCount || 0), 0)
);

const displayedThreads = computed(() => {
  if (selectedTab.value === 'broadcast') return threads.value.filter(t => t.type === 'broadcast');
  return threads.value.filter(t => t.type !== 'broadcast');
});

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
    const inbox = Array.isArray(inboxRes.data) ? inboxRes.data : [];
    const sent  = Array.isArray(sentRes.data)  ? sentRes.data  : [];
    threads.value = buildThreads([...inbox, ...sent]);
  } catch { showSnackbar('Error loading messages', 'error'); }
  finally { loading.value = false; }
};

const deleteThread = async (thread) => {
  try {
    for (const m of thread.messages) {
      try { await EmployeeService.deleteMessage(m.message_id); } catch {}
    }
    if (openThread.value?.threadKey === thread.threadKey) openThread.value = null;
    showSnackbar('Conversation deleted', 'success');
    await loadMessages();
  } catch { showSnackbar('Error deleting conversation', 'error'); }
};

const buildThreads = (messages) => {
  // Deduplicate by message_id — prevents inbox+sent overlap
  const seen = new Set();
  const unique = messages.filter(m => {
    if (seen.has(m.message_id)) return false;
    seen.add(m.message_id);
    return true;
  });

  const me = myId.value;
  const map = new Map();
  unique.forEach(m => {
    // Thread key: use thread_id if available, otherwise group by
    // the pair of participants + subject so different conversations
    // with the same subject between different people don't merge
    const pair = [m.sender_id, m.recipient_id].filter(Boolean).sort().join('-');
    const key  = m.thread_id || `conv-${pair}-${m.subject || 'no-subject'}`;
    if (!map.has(key)) {
      map.set(key, {
        threadKey: key, subject: m.subject || 'No Subject',
        type: m.message_type || 'direct', messages: [],
        latestAt: 0, unreadCount: 0, participants: new Set(),
        lastMessage: null,
      });
    }
    const t = map.get(key);
    t.messages.push(m);
    const ts = Number(m.created_at || 0);
    if (ts > t.latestAt) { t.latestAt = ts; t.lastMessage = m; }
    if (!m.is_read && m.sender_id !== me) t.unreadCount++;
    // Only add the OTHER person's name (like a phone — you don't see your own name)
    if (m.sender_name && m.sender_id !== me)       t.participants.add(m.sender_name);
    if (m.recipient_name && m.recipient_id !== me)  t.participants.add(m.recipient_name);
  });
  return [...map.values()]
    .sort((a, b) => b.latestAt - a.latestAt)
    .map(t => ({ ...t, participants: [...t.participants].filter(Boolean) }));
};

const openChat = async (thread) => {
  openThread.value     = thread;
  threadMessages.value = thread.messages.sort((a, b) => Number(a.created_at) - Number(b.created_at));
  replyText.value      = '';
  for (const m of thread.messages.filter(m => !m.is_read)) {
    try { await EmployeeService.markMessageAsRead(m.message_id); } catch {}
  }
  thread.unreadCount = 0;
};

const sendReply = async () => {
  if (!replyText.value.trim() || !openThread.value) return;
  sendingReply.value = true;
  try {
    const lastMsg     = openThread.value.messages[openThread.value.messages.length - 1];
    const recipientId = (lastMsg?.sender_id || lastMsg?.senderId) !== myId.value
      ? (lastMsg?.sender_id || lastMsg?.senderId)
      : (lastMsg?.recipient_id || lastMsg?.recipientId);

    await EmployeeService.sendMessage({
      recipientId,
      subject:     openThread.value.subject,
      message:     replyText.value.trim(),
      messageType: 'direct',
      thread_id:   openThread.value.threadKey,
    });
    replyText.value = '';
    await loadMessages();
    const refreshed = threads.value.find(t => t.threadKey === openThread.value.threadKey);
    if (refreshed) openChat(refreshed);
  } catch { showSnackbar('Error sending reply', 'error'); }
  finally { sendingReply.value = false; }
};

const sendNewMessage = async () => {
  if (!composeMessage.value.trim()) { showSnackbar('Message is required', 'error'); return; }
  composing.value = true;
  try {
    const isBroadcast = composeRecipient.value === 'all';
    await EmployeeService.sendMessage({
      subject:     composeSubject.value || 'Message',
      message:     composeMessage.value.trim(),
      messageType: isBroadcast ? 'broadcast' : 'direct',
      recipientId: null, // null = manager (backend handles routing for direct)
    });
    showSnackbar(isBroadcast ? 'Message sent to all employees!' : 'Message sent to your manager!', 'success');
    showComposeDialog.value = false;
    composeMessage.value = '';
    composeSubject.value = '';
    composeRecipient.value = 'manager';
    await loadMessages();
  } catch { showSnackbar('Error sending message', 'error'); }
  finally { composing.value = false; }
};

const formatTimestamp = (ts) => {
  if (!ts) return '';
  const d    = new Date(Number(ts));
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
    <v-container fluid class="pa-6" style="max-width: 1100px;">

      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Messages</h1>
          <p class="text-body-2 text-grey">Message your manager or your whole workplace</p>
        </div>
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-email-plus" @click="showComposeDialog = true">New Message</v-btn>
      </div>

      <v-row style="height: calc(100vh - 200px); min-height: 500px;">

        <!-- Thread list -->
        <v-col cols="12" md="4" style="height:100%; overflow-y:auto;">
          <v-card variant="outlined" rounded="lg" class="navy-card" style="height:100%;">
            <v-tabs v-model="selectedTab" color="#12086F" density="compact">
              <v-tab value="direct">
                Direct
                <v-chip v-if="unreadCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-1">{{ unreadCount }}</v-chip>
              </v-tab>
              <v-tab value="broadcast">Broadcast</v-tab>
            </v-tabs>
            <v-divider />
            <div v-if="loading" class="text-center pa-6"><v-progress-circular indeterminate color="#12086F" size="24" /></div>
            <div v-else-if="displayedThreads.length === 0" class="text-center pa-8">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-email-outline</v-icon>
              <div class="text-body-2 text-grey">No conversations yet</div>
            </div>
            <div v-else>
              <div
                v-for="thread in displayedThreads"
                :key="thread.threadKey"
                class="thread-row pa-3"
                :class="{ 'thread-active': openThread?.threadKey === thread.threadKey, 'thread-unread': thread.unreadCount > 0 }"
                @click="openChat(thread)"
              >
                <div class="d-flex align-start justify-space-between">
                  <div class="flex-grow-1 min-width-0">
                    <div class="d-flex align-center ga-1 mb-1">
                      <v-icon size="12" :color="thread.type === 'broadcast' ? '#9C27B0' : '#4361EE'">
                        {{ thread.type === 'broadcast' ? 'mdi-bullhorn' : 'mdi-message-text' }}
                      </v-icon>
                      <span class="text-caption font-weight-bold navy-text text-truncate">{{ thread.subject }}</span>
                    </div>
                    <div class="text-caption text-grey text-truncate">{{ thread.participants.join(', ') || 'Manager' }}</div>
                    <div class="text-caption text-grey text-truncate" style="max-width: 200px;" v-if="thread.lastMessage">
                      {{ thread.lastMessage.sender_id === myId ? 'You: ' : '' }}{{ thread.lastMessage.message }}
                    </div>
                    <div class="text-caption text-grey">{{ formatTimestamp(thread.latestAt) }}</div>
                  </div>
                  <div class="d-flex flex-column align-end ga-1 ml-2">
                    <v-badge v-if="thread.unreadCount > 0" :content="thread.unreadCount" color="#f57c00" inline />
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="deleteThread(thread)" />
                  </div>
                </div>
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- Chat window -->
        <v-col cols="12" md="8" style="height:100%; display:flex; flex-direction:column;">
          <v-card variant="outlined" rounded="lg" class="navy-card" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
            <div v-if="!openThread" class="d-flex flex-column align-center justify-center" style="flex:1; color:#9ca3af;">
              <v-icon size="64" class="mb-3">mdi-message-text-outline</v-icon>
              <div class="text-body-1">Select a conversation to view</div>
            </div>

            <template v-else>
              <div class="pa-4 d-flex align-center justify-space-between" style="border-bottom:1px solid #e0e0e0;">
                <div>
                  <div class="text-body-1 font-weight-bold navy-text">{{ openThread.subject }}</div>
                  <div class="text-caption text-grey">{{ openThread.participants.join(', ') }}</div>
                </div>
                <v-chip :color="openThread.type === 'broadcast' ? '#9C27B0' : '#4361EE'" size="x-small" variant="tonal">
                  {{ openThread.type === 'broadcast' ? 'Broadcast' : 'Direct' }}
                </v-chip>
              </div>

              <div class="chat-messages pa-4" style="flex:1; overflow-y:auto;">
                <div v-for="msg in threadMessages" :key="msg.message_id" class="chat-bubble-row mb-3" :class="{ 'mine': (msg.sender_id || msg.senderId) === myId }">
                  <div class="chat-bubble" :class="(msg.sender_id || msg.senderId) === myId ? 'bubble-mine' : 'bubble-theirs'">
                    <div class="text-caption font-weight-bold mb-1" :class="(msg.sender_id || msg.senderId) === myId ? 'text-white' : 'navy-text'">
                      {{ msg.sender_id === myId ? 'You' : (msg.sender_name || msg.recipient_name || 'Unknown') }}
                    </div>
                    <div class="text-body-2" :class="(msg.sender_id || msg.senderId) === myId ? 'text-white' : ''">{{ msg.message }}</div>
                    <div class="text-caption mt-1 opacity-70" :class="(msg.sender_id || msg.senderId) === myId ? 'text-white' : 'text-grey'">{{ formatTimestamp(msg.created_at) }}</div>
                  </div>
                </div>
              </div>

              <div v-if="openThread.type !== 'broadcast'" class="pa-3" style="border-top:1px solid #e0e0e0;">
                <div class="d-flex ga-2 align-end">
                  <v-textarea v-model="replyText" placeholder="Type a reply..." variant="outlined" density="compact" rows="2" hide-details color="#12086F" class="flex-grow-1" @keydown.ctrl.enter="sendReply" />
                  <v-btn color="#12086F" variant="flat" icon="mdi-send" :loading="sendingReply" @click="sendReply" />
                </div>
                <div class="text-caption text-grey mt-1">Ctrl+Enter to send</div>
              </div>
              <div v-else class="pa-3 text-center" style="border-top:1px solid #e0e0e0;">
                <div class="text-caption text-grey">Broadcasts are one-way — you cannot reply to this message.</div>
              </div>
            </template>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Compose Dialog -->
    <v-dialog v-model="showComposeDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">New Message</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-select
            v-model="composeRecipient"
            :items="[
              { title: 'My Manager', value: 'manager' },
              { title: 'All Employees', value: 'all' },
            ]"
            label="Send to *"
            variant="outlined" density="compact" class="mb-3" color="#12086F"
          />
          <v-alert v-if="composeRecipient === 'all'" type="info" variant="tonal" density="compact" color="#9C27B0" class="mb-3">
            This message will be sent to all employees at your workplace.
          </v-alert>
          <v-text-field v-model="composeSubject" label="Subject" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-textarea v-model="composeMessage" label="Message *" variant="outlined" density="compact" rows="4" class="mb-3" color="#12086F" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showComposeDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="composing" @click="sendNewMessage">Send</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" location="bottom right">{{ snackMsg }}</v-snackbar>
  </EmployeeLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.thread-row { border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.15s; }
.thread-row:hover { background: #f5f5f5; }
.thread-active { background: #eef2ff !important; border-left: 3px solid #12086F; }
.thread-unread { background: #fff8f3; border-left: 3px solid #f57c00; }
.chat-messages { background: #f8f9fc; }
.chat-bubble-row { display: flex; }
.chat-bubble-row.mine { justify-content: flex-end; }
.chat-bubble { max-width: 70%; padding: 10px 14px; border-radius: 12px; }
.bubble-mine { background: #12086F; border-bottom-right-radius: 4px; }
.bubble-theirs { background: white; border: 1px solid #e0e0e0; border-bottom-left-radius: 4px; }
.opacity-70 { opacity: 0.7; }
.min-width-0 { min-width: 0; }
</style>