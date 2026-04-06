<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const user      = ref(null);
const employees = ref([]);
const threads   = ref([]); // grouped conversations
const loading   = ref(false);
const composing = ref(false);

// ── THREAD / CHAT VIEW ────────────────────────────────────────────────────
const openThread    = ref(null); // the thread currently open
const threadMessages = ref([]);   // messages in that thread
const replyText     = ref('');
const sendingReply  = ref(false);

// ── COMPOSE ───────────────────────────────────────────────────────────────
const showComposeDialog    = ref(false);
const showBroadcastDialog  = ref(false);
const selectedTab          = ref('inbox');

const newMessage = ref({ recipientIds: [], subject: '', message: '', linkUrl: '' });
const broadcastMessage = ref({ subject: '', message: '', linkUrl: '' });

const snackbar        = ref(false);
const snackbarMessage = ref('');
const snackbarColor   = ref('success');

// ── COMPUTED ──────────────────────────────────────────────────────────────
const unreadCount = computed(() =>
  threads.value.reduce((sum, t) => sum + (t.unreadCount || 0), 0)
);

const displayedThreads = computed(() => {
  if (selectedTab.value === 'broadcast') return threads.value.filter(t => t.type === 'broadcast');
  return threads.value.filter(t => t.type !== 'broadcast');
});

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
onMounted(async () => {
  user.value = Utils.getStore('user');
  await Promise.all([loadEmployees(), loadMessages()]);
});

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const all = Array.isArray(res.data) ? res.data : [];
    const myId = user.value?.user_id || user.value?.userId;
    employees.value = all.filter(u => u.role === 'employee' && (u.user_id || u.userId) !== myId);
  } catch {}
};

const loadMessages = async () => {
  loading.value = true;
  try {
    const [inboxRes, sentRes] = await Promise.all([
      EmployerService.getInbox(),
      EmployerService.getSentMessages(),
    ]);
    const inbox = Array.isArray(inboxRes.data) ? inboxRes.data : [];
    const sent  = Array.isArray(sentRes.data)  ? sentRes.data  : [];
    threads.value = buildThreads([...inbox, ...sent]);
  } catch { showSnackbar('Error loading messages', 'error'); }
  finally { loading.value = false; }
};

// Group messages into threads by subject + participants
const buildThreads = (messages) => {
  // ✅ Deduplicate by message_id first — prevents inbox+sent overlap
  const seen = new Set();
  const unique = messages.filter(m => {
    if (seen.has(m.message_id)) return false;
    seen.add(m.message_id);
    return true;
  });

  const map = new Map();
  unique.forEach(m => {
    const key = m.thread_id || m.subject || `msg-${m.message_id}`;
    if (!map.has(key)) {
      map.set(key, {
        threadKey:   key,
        subject:     m.subject || 'No Subject',
        type:        m.message_type || 'direct',
        messages:    [],
        latestAt:    0,
        unreadCount: 0,
        participants: new Set(),
      });
    }
    const t = map.get(key);
    t.messages.push(m);
    const ts = Number(m.created_at || 0);
    if (ts > t.latestAt) t.latestAt = ts;
    if (!m.is_read && m.sender_id !== (user.value?.user_id || user.value?.userId)) t.unreadCount++;
    if (m.sender_name)    t.participants.add(m.sender_name);
    if (m.recipient_name) t.participants.add(m.recipient_name);
  });
  return [...map.values()]
    .sort((a, b) => b.latestAt - a.latestAt)
    .map(t => ({ ...t, participants: [...t.participants].filter(Boolean) }));
};

const openChat = async (thread) => {
  openThread.value = thread;
  threadMessages.value = thread.messages.sort((a, b) => Number(a.created_at) - Number(b.created_at));
  replyText.value = '';
  // Mark unread as read
  for (const m of thread.messages.filter(m => !m.is_read)) {
    try { await EmployerService.markMessageAsRead(m.message_id); } catch {}
  }
  thread.unreadCount = 0;
};

const sendReply = async () => {
  if (!replyText.value.trim() || !openThread.value) return;
  sendingReply.value = true;
  try {
    // Find the other participant to reply to
    const myId = user.value?.user_id || user.value?.userId;
    const lastMsg = openThread.value.messages[openThread.value.messages.length - 1];
    const recipientId = lastMsg?.sender_id !== myId ? lastMsg?.sender_id : lastMsg?.recipient_id;

    await EmployerService.sendMessage({
      recipientId:  recipientId ? [recipientId] : null,
      subject:      openThread.value.subject,
      message:      replyText.value.trim(),
      messageType:  openThread.value.type || 'direct',
      thread_id:    openThread.value.threadKey,
    });
    replyText.value = '';
    await loadMessages();
    // Refresh open thread
    const refreshed = threads.value.find(t => t.threadKey === openThread.value.threadKey);
    if (refreshed) openChat(refreshed);
  } catch { showSnackbar('Error sending reply', 'error'); }
  finally { sendingReply.value = false; }
};

const sendNewMessage = async () => {
  if (!newMessage.value.message || newMessage.value.recipientIds.length === 0) {
    showSnackbar('Recipient and message are required', 'error'); return;
  }
  composing.value = true;
  try {
    await EmployerService.sendMessage({
      recipientId:  newMessage.value.recipientIds,
      subject:      newMessage.value.subject || 'Message',
      message:      newMessage.value.message,
      messageType:  'direct',
      linkUrl:      newMessage.value.linkUrl || null,
    });
    showSnackbar('Message sent!', 'success');
    showComposeDialog.value = false;
    newMessage.value = { recipientIds: [], subject: '', message: '', linkUrl: '' };
    await loadMessages();
  } catch { showSnackbar('Error sending message', 'error'); }
  finally { composing.value = false; }
};

const sendBroadcast = async () => {
  if (!broadcastMessage.value.message) { showSnackbar('Message is required', 'error'); return; }
  composing.value = true;
  try {
    await EmployerService.broadcastMessage({
      subject:  broadcastMessage.value.subject || 'Announcement',
      message:  broadcastMessage.value.message,
      linkUrl:  broadcastMessage.value.linkUrl || null,
    });
    showSnackbar('Broadcast sent to all employees!', 'success');
    showBroadcastDialog.value = false;
    broadcastMessage.value = { subject: '', message: '', linkUrl: '' };
    await loadMessages();
  } catch { showSnackbar('Error broadcasting message', 'error'); }
  finally { composing.value = false; }
};

const deleteThread = async (thread) => {
  try {
    for (const m of thread.messages) {
      try { await EmployerService.deleteMessage(m.message_id); } catch {}
    }
    if (openThread.value?.threadKey === thread.threadKey) openThread.value = null;
    showSnackbar('Conversation deleted', 'success');
    await loadMessages();
  } catch { showSnackbar('Error deleting conversation', 'error'); }
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

const myId = computed(() => user.value?.user_id || user.value?.userId);

const showSnackbar = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6" style="max-width: 1100px;">

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Messages</h1>
          <p class="text-body-2 text-grey">Communicate with your team</p>
        </div>
        <div class="d-flex ga-2">
          <v-btn color="#9C27B0" variant="flat" prepend-icon="mdi-bullhorn" @click="showBroadcastDialog = true">Broadcast All</v-btn>
          <v-btn color="#12086F" variant="flat" prepend-icon="mdi-email-plus" @click="showComposeDialog = true">New Message</v-btn>
        </div>
      </div>

      <!-- Two-pane layout: thread list + chat -->
      <v-row style="height: calc(100vh - 200px); min-height: 500px;">

        <!-- ── LEFT: Thread list ──────────────────────────────────────────── -->
        <v-col cols="12" md="4" style="height:100%; overflow-y:auto;">
          <v-card variant="outlined" rounded="lg" class="navy-card" style="height:100%;">

            <v-tabs v-model="selectedTab" color="#12086F" density="compact">
              <v-tab value="inbox">
                Direct
                <v-chip v-if="unreadCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-1">{{ unreadCount }}</v-chip>
              </v-tab>
              <v-tab value="broadcast">Broadcast</v-tab>
            </v-tabs>
            <v-divider />

            <div v-if="loading" class="text-center pa-6">
              <v-progress-circular indeterminate color="#12086F" size="24" />
            </div>
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
                    <div class="text-caption text-grey text-truncate">{{ thread.participants.join(', ') || 'Team' }}</div>
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

        <!-- ── RIGHT: Chat window ─────────────────────────────────────────── -->
        <v-col cols="12" md="8" style="height:100%; display:flex; flex-direction:column;">
          <v-card variant="outlined" rounded="lg" class="navy-card" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
            <div v-if="!openThread" class="d-flex flex-column align-center justify-center" style="flex:1; color:#9ca3af;">
              <v-icon size="64" class="mb-3">mdi-message-text-outline</v-icon>
              <div class="text-body-1">Select a conversation to view</div>
              <div class="text-caption mt-1">or start a new one with the buttons above</div>
            </div>

            <template v-else>
              <!-- Chat header -->
              <div class="pa-4 d-flex align-center justify-space-between" style="border-bottom:1px solid #e0e0e0;">
                <div>
                  <div class="text-body-1 font-weight-bold navy-text">{{ openThread.subject }}</div>
                  <div class="text-caption text-grey">{{ openThread.participants.join(', ') }}</div>
                </div>
                <v-chip :color="openThread.type === 'broadcast' ? '#9C27B0' : '#4361EE'" size="x-small" variant="tonal">
                  {{ openThread.type === 'broadcast' ? 'Broadcast' : 'Direct' }}
                </v-chip>
              </div>

              <!-- Messages -->
              <div class="chat-messages pa-4" style="flex:1; overflow-y:auto;">
                <div
                  v-for="msg in threadMessages"
                  :key="msg.message_id"
                  class="chat-bubble-row mb-3"
                  :class="{ 'mine': (msg.sender_id || msg.senderId) === myId }"
                >
                  <div class="chat-bubble" :class="(msg.sender_id || msg.senderId) === myId ? 'bubble-mine' : 'bubble-theirs'">
                    <div class="text-caption font-weight-bold mb-1" :class="(msg.sender_id || msg.senderId) === myId ? 'text-white' : 'navy-text'">
                      {{ (msg.sender_id || msg.senderId) === myId ? 'You' : (msg.sender_name || 'Employee') }}
                    </div>
                    <div class="text-body-2" :class="(msg.sender_id || msg.senderId) === myId ? 'text-white' : ''">{{ msg.message }}</div>
                    <div class="text-caption mt-1 opacity-70" :class="(msg.sender_id || msg.senderId) === myId ? 'text-white' : 'text-grey'">
                      {{ formatTimestamp(msg.created_at) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Reply box — not shown for broadcast (one-way) -->
              <div v-if="openThread.type !== 'broadcast'" class="pa-3" style="border-top:1px solid #e0e0e0;">
                <div class="d-flex ga-2 align-end">
                  <v-textarea
                    v-model="replyText"
                    placeholder="Type a reply..."
                    variant="outlined"
                    density="compact"
                    rows="2"
                    hide-details
                    color="#12086F"
                    class="flex-grow-1"
                    @keydown.ctrl.enter="sendReply"
                  />
                  <v-btn color="#12086F" variant="flat" icon="mdi-send" :loading="sendingReply" @click="sendReply" />
                </div>
                <div class="text-caption text-grey mt-1">Ctrl+Enter to send</div>
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
            v-model="newMessage.recipientIds"
            :items="employees"
            :item-title="(e) => `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`.trim()"
            :item-value="(e) => e.user_id || e.userId"
            label="To (select one or more) *"
            variant="outlined" density="compact" multiple chips closable-chips class="mb-3" color="#12086F"
          />
          <v-text-field v-model="newMessage.subject" label="Subject" variant="outlined" density="compact" class="mb-3" color="#12086F" />
          <v-textarea v-model="newMessage.message" label="Message *" variant="outlined" density="compact" rows="4" class="mb-3" color="#12086F" />
          <v-text-field v-model="newMessage.linkUrl" label="Link (optional)" variant="outlined" density="compact" placeholder="https://..." color="#12086F" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showComposeDialog = false">Cancel</v-btn>
          <v-btn color="#12086F" variant="flat" :loading="composing" @click="sendNewMessage">Send</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Broadcast Dialog -->
    <v-dialog v-model="showBroadcastDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Broadcast to All Employees</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" density="compact" color="#9C27B0" class="mb-4">
            This message will be sent to all {{ employees.length }} employees. They cannot reply to a broadcast — use "New Message" for conversations.
          </v-alert>
          <v-text-field v-model="broadcastMessage.subject" label="Subject" variant="outlined" density="compact" class="mb-3" color="#9C27B0" />
          <v-textarea v-model="broadcastMessage.message" label="Message *" variant="outlined" density="compact" rows="4" class="mb-3" color="#9C27B0" />
          <v-text-field v-model="broadcastMessage.linkUrl" label="Link (optional)" variant="outlined" density="compact" placeholder="https://..." color="#9C27B0" />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showBroadcastDialog = false">Cancel</v-btn>
          <v-btn color="#9C27B0" variant="flat" :loading="composing" @click="sendBroadcast">Send Broadcast</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">{{ snackbarMessage }}</v-snackbar>
  </EmployerLayout>
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