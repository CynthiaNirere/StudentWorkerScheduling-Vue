<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const user      = ref(null);
const employees = ref([]);
const threads   = ref([]);
const loading   = ref(false);
const composing = ref(false);

// ── THREAD / CHAT VIEW ────────────────────────────────────────────────────
const openThread    = ref(null);
const threadMessages = ref([]);
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

const myId = computed(() => user.value?.user_id || user.value?.userId);

// ── COMPUTED ──────────────────────────────────────────────────────────────
const directUnreadCount = computed(() =>
  threads.value.filter(t => t.type !== 'broadcast').reduce((sum, t) => sum + (t.unreadCount || 0), 0)
);
const broadcastUnreadCount = computed(() =>
  threads.value.filter(t => t.type === 'broadcast').reduce((sum, t) => sum + (t.unreadCount || 0), 0)
);

const displayedThreads = computed(() => {
  if (selectedTab.value === 'broadcast') return threads.value.filter(t => t.type === 'broadcast');
  return threads.value.filter(t => t.type !== 'broadcast');
});

// ── LIFECYCLE ─────────────────────────────────────────────────────────────
let pollTimer = null;

onMounted(async () => {
  user.value = Utils.getStore('user');
  await Promise.all([loadEmployees(), loadMessages()]);
  pollTimer = setInterval(pollMessages, 10000);
});

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });

const loadEmployees = async () => {
  try {
    const res = await EmployerService.getAllEmployees();
    const all = Array.isArray(res.data) ? res.data : [];
    employees.value = all.filter(u => u.role === 'employee' && (u.user_id || u.userId) !== myId.value);
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

const buildThreads = (messages) => {
  const seen = new Set();
  const unique = messages.filter(m => {
    if (seen.has(m.message_id)) return false;
    seen.add(m.message_id);
    return true;
  });

  const me = myId.value;
  const map = new Map();
  unique.forEach(m => {
    const pair = [m.sender_id, m.recipient_id].filter(Boolean).sort().join('-');
    const key  = m.thread_id || `conv-${pair}-${m.subject || 'no-subject'}`;
    if (!map.has(key)) {
      map.set(key, {
        threadKey:   key,
        subject:     m.subject || 'No Subject',
        type:        m.message_type || 'direct',
        messages:    [],
        latestAt:    0,
        unreadCount: 0,
        participants: new Set(),
        lastMessage: null,
      });
    }
    const t = map.get(key);
    t.messages.push(m);
    const ts = Number(m.created_at || 0);
    if (ts > t.latestAt) { t.latestAt = ts; t.lastMessage = m; }
    if (!m.is_read && m.sender_id !== me) t.unreadCount++;
    if (m.sender_name && m.sender_id !== me)       t.participants.add(m.sender_name);
    if (m.recipient_name && m.recipient_id !== me)  t.participants.add(m.recipient_name);
  });
  return [...map.values()]
    .sort((a, b) => b.latestAt - a.latestAt)
    .map(t => ({ ...t, participants: [...t.participants].filter(Boolean) }));
};

const openChat = async (thread) => {
  openThread.value = thread;
  threadMessages.value = thread.messages.sort((a, b) => Number(a.created_at) - Number(b.created_at));
  replyText.value = '';
  const me = myId.value;
  const toMark = thread.messages.filter(m => !m.is_read && (m.sender_id || m.senderId) !== me);
  for (const m of toMark) {
    try {
      await EmployerService.markMessageAsRead(m.message_id);
      m.is_read = true;
    } catch {}
  }
  thread.unreadCount = 0;
};

const sendReply = async () => {
  if (!replyText.value.trim() || !openThread.value) return;
  sendingReply.value = true;
  try {
    const lastMsg = openThread.value.messages[openThread.value.messages.length - 1];
    const recipientId = lastMsg?.sender_id !== myId.value ? lastMsg?.sender_id : lastMsg?.recipient_id;

    if (!recipientId) {
      showSnackbar('Could not determine recipient', 'error');
      return;
    }

    await EmployerService.sendMessage({
      recipientId,
      subject:      openThread.value.subject,
      message:      replyText.value.trim(),
      messageType:  'direct',
      thread_id:    openThread.value.threadKey,
    });
    replyText.value = '';
    await loadMessages();
    const refreshed = threads.value.find(t => t.threadKey === openThread.value.threadKey);
    if (refreshed) openChat(refreshed);
  } catch (err) { console.error('Reply error:', err); showSnackbar('Error sending reply', 'error'); }
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

// NOTE: deleteThread removed — messages are not deleted, only archived/hidden
// This preserves the message record for accountability

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

const pollMessages = async () => {
  try {
    const [inboxRes, sentRes] = await Promise.all([
      EmployerService.getInbox(),
      EmployerService.getSentMessages(),
    ]);
    const inbox = Array.isArray(inboxRes.data) ? inboxRes.data : [];
    const sent  = Array.isArray(sentRes.data)  ? sentRes.data  : [];
    const currentKey = openThread.value?.threadKey;
    threads.value = buildThreads([...inbox, ...sent]);
    if (currentKey) {
      const refreshed = threads.value.find(t => t.threadKey === currentKey);
      if (refreshed) {
        openThread.value = refreshed;
        threadMessages.value = refreshed.messages.sort((a, b) => Number(a.created_at) - Number(b.created_at));
      }
    }
  } catch (e) { console.warn('Poll refresh failed:', e); }
};

const showSnackbar = (msg, color = 'success') => { snackbarMessage.value = msg; snackbarColor.value = color; snackbar.value = true; };
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Messages</h1>
          <p class="text-body-2 text-grey">Communicate with your team</p>
        </div>
        <div class="d-flex ga-2">
          <!-- Renamed from "Broadcast All" to "New Broadcast" -->
          <v-btn color="#9C27B0" variant="flat" prepend-icon="mdi-bullhorn" @click="showBroadcastDialog = true">New Broadcast</v-btn>
          <v-btn color="#12086F" variant="flat" prepend-icon="mdi-email-plus" @click="showComposeDialog = true">New Message</v-btn>
        </div>
      </div>

      <!-- Two-pane layout -->
      <v-row style="height: calc(100vh - 200px); min-height: 500px;">

        <!-- LEFT: Thread list -->
        <v-col cols="12" md="4" style="height:100%; overflow-y:auto;">
          <v-card variant="outlined" rounded="lg" class="navy-card" style="height:100%;">

            <v-tabs v-model="selectedTab" color="#12086F" density="compact">
              <v-tab value="inbox">
                Direct
                <v-chip v-if="directUnreadCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-1">{{ directUnreadCount }}</v-chip>
              </v-tab>
              <v-tab value="broadcast">
                Broadcasts
                <v-chip v-if="broadcastUnreadCount > 0" size="x-small" color="#f57c00" variant="tonal" class="ml-1">{{ broadcastUnreadCount }}</v-chip>
              </v-tab>
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
                    <div class="text-caption text-grey text-truncate" style="max-width: 200px;" v-if="thread.lastMessage">
                      {{ thread.lastMessage.sender_id === myId ? 'You: ' : '' }}{{ thread.lastMessage.message }}
                    </div>
                    <div class="text-caption text-grey">{{ formatTimestamp(thread.latestAt) }}</div>
                  </div>
                  <div class="d-flex flex-column align-end ga-1 ml-2">
                    <v-badge v-if="thread.unreadCount > 0" :content="thread.unreadCount" color="#f57c00" inline />
                    <!-- Delete button removed: messages are kept for accountability -->
                  </div>
                </div>
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- RIGHT: Chat window -->
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
                  <div class="text-caption text-grey">{{ openThread.participants.join(', ') || 'Team' }}</div>
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
                      {{ msg.sender_id === myId ? 'You' : (msg.sender_name || msg.recipient_name || 'Unknown') }}
                    </div>
                    <div class="text-body-2" :class="(msg.sender_id || msg.senderId) === myId ? 'text-white' : ''">{{ msg.message }}</div>
                    <div class="text-caption mt-1 opacity-70" :class="(msg.sender_id || msg.senderId) === myId ? 'text-white' : 'text-grey'">
                      {{ formatTimestamp(msg.created_at) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Reply box — not shown for broadcasts -->
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
              <div v-else class="pa-3 text-center" style="border-top:1px solid #e0e0e0;">
                <div class="text-caption text-grey">Broadcasts are one-way — employees receive this but cannot reply.</div>
              </div>
            </template>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Compose Dialog -->
    <v-dialog v-model="showComposeDialog" fullscreen transition="dialog-bottom-transition">
      <v-card rounded="0" class="d-flex flex-column" style="height:100%;">
        <v-toolbar color="#12086F" density="compact">
          <v-btn icon="mdi-close" variant="text" @click="showComposeDialog = false" />
          <v-toolbar-title class="text-body-1 font-weight-bold">New Message</v-toolbar-title>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="showComposeDialog = false">Cancel</v-btn>
          <v-btn variant="flat" color="white" class="text-none" :loading="composing" @click="sendNewMessage">Send</v-btn>
        </v-toolbar>
        <div class="flex-grow-1 d-flex justify-center" style="overflow-y:auto; background:#f8f9fc;">
          <div style="width:100%; max-width:720px; padding:32px 24px;">
            <v-card rounded="lg" class="pa-6" variant="outlined">
              <v-autocomplete
                v-model="newMessage.recipientIds"
                :items="employees"
                :item-title="(e) => `${e.fName || e.first_name || ''} ${e.lName || e.last_name || ''}`.trim()"
                :item-value="(e) => e.user_id || e.userId"
                label="To (search by name) *"
                variant="outlined" density="comfortable" multiple chips closable-chips class="mb-4" color="#12086F"
                no-data-text="No employees found"
              />
              <v-text-field v-model="newMessage.subject" label="Subject" variant="outlined" density="comfortable" class="mb-4" color="#12086F" />
              <v-textarea v-model="newMessage.message" label="Message *" variant="outlined" density="comfortable" rows="8" class="mb-4" color="#12086F" />
              <v-text-field v-model="newMessage.linkUrl" label="Link (optional)" variant="outlined" density="comfortable" placeholder="https://..." color="#12086F" />
            </v-card>
          </div>
        </div>
      </v-card>
    </v-dialog>

    <!-- New Broadcast Dialog (renamed from "Broadcast All") -->
    <v-dialog v-model="showBroadcastDialog" fullscreen transition="dialog-bottom-transition">
      <v-card rounded="0" class="d-flex flex-column" style="height:100%;">
        <v-toolbar color="#9C27B0" density="compact">
          <v-btn icon="mdi-close" variant="text" @click="showBroadcastDialog = false" />
          <v-toolbar-title class="text-body-1 font-weight-bold">New Broadcast</v-toolbar-title>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="showBroadcastDialog = false">Cancel</v-btn>
          <v-btn variant="flat" color="white" class="text-none" :loading="composing" @click="sendBroadcast">Send Broadcast</v-btn>
        </v-toolbar>
        <div class="flex-grow-1 d-flex justify-center" style="overflow-y:auto; background:#f8f9fc;">
          <div style="width:100%; max-width:720px; padding:32px 24px;">
            <v-alert type="info" variant="tonal" density="compact" color="#9C27B0" class="mb-5">
              This message will be sent to all {{ employees.length }} employees. They cannot reply to a broadcast — use "New Message" for conversations.
            </v-alert>
            <v-card rounded="lg" class="pa-6" variant="outlined">
              <v-text-field v-model="broadcastMessage.subject" label="Subject" variant="outlined" density="comfortable" class="mb-4" color="#9C27B0" />
              <v-textarea v-model="broadcastMessage.message" label="Message *" variant="outlined" density="comfortable" rows="8" class="mb-4" color="#9C27B0" />
              <v-text-field v-model="broadcastMessage.linkUrl" label="Link (optional)" variant="outlined" density="comfortable" placeholder="https://..." color="#9C27B0" />
            </v-card>
          </div>
        </div>
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

/* Dark mode */
.v-theme--dark .thread-row:hover { background: #2a2a3e; }
.v-theme--dark .thread-active { background: #1a1f3a !important; }
.v-theme--dark .thread-unread { background: #2e1f0a; }
.v-theme--dark .chat-messages { background: #1a1a2e; }
.v-theme--dark .bubble-theirs { background: #2a2a3e; border-color: #444; color: #e0e0e0; }
.v-theme--dark .navy-text { color: #a8b4ff !important; }
</style>