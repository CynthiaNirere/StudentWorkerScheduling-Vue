<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const selectedTab  = ref('inbox');
const openThread   = ref(null);

// ── HARDCODED DEMO THREADS ────────────────────────────────────────────────
const threads = ref([
  {
    threadKey: 't1',
    subject: 'Schedule change this Friday',
    type: 'direct',
    participants: ['Sarah Johnson'],
    latestAt: Date.now() - 1000 * 60 * 15,
    unreadCount: 1,
    lastMessage: { message: 'Is it okay if I come in an hour late?', sender_id: 'e1' },
    messages: [
      { message_id: 1, sender_id: 'e1', sender_name: 'Sarah Johnson', message: "Hey, I had a question about Friday's shift.", created_at: Date.now() - 1000 * 60 * 60 * 2, is_read: true  },
      { message_id: 2, sender_id: 'e1', sender_name: 'Sarah Johnson', message: 'Is it okay if I come in an hour late? I have a doctor appointment.', created_at: Date.now() - 1000 * 60 * 15, is_read: false },
    ],
  },
  {
    threadKey: 't2',
    subject: 'Weekend availability',
    type: 'direct',
    participants: ['Michael Chen'],
    latestAt: Date.now() - 1000 * 60 * 60 * 4,
    unreadCount: 0,
    lastMessage: { message: "No problem, I'll cover it.", sender_id: 'demo-employer' },
    messages: [
      { message_id: 3, sender_id: 'e2', sender_name: 'Michael Chen', message: 'Can someone cover my Saturday shift?', created_at: Date.now() - 1000 * 60 * 60 * 5, is_read: true },
      { message_id: 4, sender_id: 'demo-employer', sender_name: 'You', message: "No problem, I'll cover it.", created_at: Date.now() - 1000 * 60 * 60 * 4, is_read: true },
    ],
  },
  {
    threadKey: 't3',
    subject: 'Team Announcement',
    type: 'broadcast',
    participants: ['All Employees'],
    latestAt: Date.now() - 1000 * 60 * 60 * 24,
    unreadCount: 0,
    lastMessage: { message: "This week's schedule is now published!", sender_id: 'demo-employer' },
    messages: [
      { message_id: 5, sender_id: 'demo-employer', sender_name: 'You', message: "This week's schedule is now published! Please review your shifts.", created_at: Date.now() - 1000 * 60 * 60 * 24, is_read: true },
    ],
  },
]);

const displayedThreads = computed(() => {
  if (selectedTab.value === 'broadcast') return threads.value.filter(t => t.type === 'broadcast');
  return threads.value.filter(t => t.type !== 'broadcast');
});

const directUnreadCount    = computed(() => threads.value.filter(t => t.type !== 'broadcast').reduce((s, t) => s + t.unreadCount, 0));
const broadcastUnreadCount = computed(() => threads.value.filter(t => t.type === 'broadcast').reduce((s, t) => s + t.unreadCount, 0));

const threadMessages = computed(() =>
  openThread.value
    ? [...openThread.value.messages].sort((a, b) => Number(a.created_at) - Number(b.created_at))
    : []
);

const openChat = (thread) => { openThread.value = thread; };

const formatTimestamp = (ts) => {
  if (!ts) return '';
  const diff = Date.now() - Number(ts);
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  return new Date(Number(ts)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const myId = 'demo-employer';
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Sending messages is disabled.
      </v-alert>

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Messages</h1>
          <p class="text-body-2 text-grey">Communicate with your team</p>
        </div>
        <div class="d-flex ga-2">
          <v-btn color="#9C27B0" variant="flat" prepend-icon="mdi-bullhorn" disabled>New Broadcast</v-btn>
          <v-btn color="#12086F" variant="flat" prepend-icon="mdi-email-plus" disabled>New Message</v-btn>
        </div>
      </div>

      <!-- Two-pane layout -->
      <v-row style="height: calc(100vh - 240px); min-height: 500px;">

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

            <div v-for="thread in displayedThreads" :key="thread.threadKey"
              class="thread-row pa-3"
              :class="{ 'thread-active': openThread?.threadKey === thread.threadKey, 'thread-unread': thread.unreadCount > 0 }"
              @click="openChat(thread)">
              <div class="d-flex align-start justify-space-between">
                <div class="flex-grow-1 min-width-0">
                  <div class="d-flex align-center ga-1 mb-1">
                    <v-icon size="12" :color="thread.type === 'broadcast' ? '#9C27B0' : '#4361EE'">
                      {{ thread.type === 'broadcast' ? 'mdi-bullhorn' : 'mdi-message-text' }}
                    </v-icon>
                    <span class="text-caption font-weight-bold navy-text text-truncate">{{ thread.subject }}</span>
                  </div>
                  <div class="text-caption text-grey text-truncate">{{ thread.participants.join(', ') }}</div>
                  <div class="text-caption text-grey text-truncate" style="max-width:200px;" v-if="thread.lastMessage">
                    {{ thread.lastMessage.sender_id === myId ? 'You: ' : '' }}{{ thread.lastMessage.message }}
                  </div>
                  <div class="text-caption text-grey">{{ formatTimestamp(thread.latestAt) }}</div>
                </div>
                <v-badge v-if="thread.unreadCount > 0" :content="thread.unreadCount" color="#f57c00" inline />
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
                <div v-for="msg in threadMessages" :key="msg.message_id"
                  class="chat-bubble-row mb-3"
                  :class="{ 'mine': msg.sender_id === myId }">
                  <div class="chat-bubble" :class="msg.sender_id === myId ? 'bubble-mine' : 'bubble-theirs'">
                    <div class="text-caption font-weight-bold mb-1" :class="msg.sender_id === myId ? 'text-white' : 'navy-text'">
                      {{ msg.sender_id === myId ? 'You' : msg.sender_name }}
                    </div>
                    <div class="text-body-2" :class="msg.sender_id === myId ? 'text-white' : ''">{{ msg.message }}</div>
                    <div class="text-caption mt-1 opacity-70" :class="msg.sender_id === myId ? 'text-white' : 'text-grey'">
                      {{ formatTimestamp(msg.created_at) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Reply box — disabled in guest -->
              <div class="pa-3 text-center" style="border-top:1px solid #e0e0e0;">
                <div class="text-caption text-grey">
                  <v-icon size="14" class="mr-1">mdi-lock-outline</v-icon>
                  Sending messages is disabled in guest mode.
                </div>
              </div>
            </template>
          </v-card>
        </v-col>
      </v-row>

    </v-container>
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