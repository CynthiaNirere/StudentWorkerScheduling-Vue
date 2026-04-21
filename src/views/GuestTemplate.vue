<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();

// ── HARDCODED DEMO TEMPLATES ──────────────────────────────────────────────
const templates = ref([
  {
    id: 1,
    name: 'Standard Week',
    description: 'Typical 5-day schedule with opening and closing shifts for a full team.',
    shiftCount: 14,
    createdAt: 'Jan 15, 2026',
  },
  {
    id: 2,
    name: 'Weekend Heavy',
    description: 'Extra staffing on Friday evening through Sunday for peak hours.',
    shiftCount: 10,
    createdAt: 'Feb 3, 2026',
  },
  {
    id: 3,
    name: 'Minimal Crew',
    description: 'Skeleton schedule for slow weeks — holidays or low-traffic periods.',
    shiftCount: 6,
    createdAt: 'Mar 20, 2026',
  },
]);
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Applying or creating templates is disabled.
      </v-alert>

      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Schedule Templates</h1>
          <p class="text-body-2 text-grey">Manage and apply reusable weekly schedule templates</p>
        </div>
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-arrow-left"
          @click="router.push({ name: 'guestSchedule' })">
          Back to Schedule
        </v-btn>
      </div>

      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-4">
          <v-row>
            <v-col v-for="template in templates" :key="template.id" cols="12" md="6" lg="4">
              <v-card variant="outlined" rounded="lg" class="template-card" hover>
                <v-card-title class="d-flex align-center justify-space-between pa-4 pb-3">
                  <div class="text-body-1 font-weight-bold navy-text">{{ template.name }}</div>
                  <v-btn icon="mdi-dots-vertical" size="small" variant="plain" disabled />
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4">
                  <div class="text-body-2 mb-3">{{ template.description }}</div>
                  <div class="d-flex flex-wrap ga-2 mb-3">
                    <v-chip size="small" color="#4361EE" variant="tonal">
                      <v-icon start size="small">mdi-calendar-clock</v-icon>
                      {{ template.shiftCount }} shifts
                    </v-chip>
                    <v-chip size="small" color="#9e9e9e" variant="tonal">
                      <v-icon start size="small">mdi-clock-outline</v-icon>
                      {{ template.createdAt }}
                    </v-chip>
                  </div>
                  <v-btn color="#9C27B0" variant="tonal" block prepend-icon="mdi-calendar-check" disabled>
                    Apply Template
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- How Templates Work -->
      <v-card variant="outlined" rounded="lg" class="mt-4 navy-card">
        <v-card-text class="pa-4">
          <div class="d-flex align-start ga-3">
            <v-icon color="#4361EE" size="32">mdi-information-outline</v-icon>
            <div>
              <div class="text-body-1 font-weight-bold mb-2">How Templates Work</div>
              <ul class="text-body-2 text-grey pl-4" style="line-height:1.8;">
                <li>Templates save the structure of your weekly schedule</li>
                <li>Click "Apply Template" to create shifts for any week</li>
                <li>Shifts are created as drafts — you can edit before publishing</li>
                <li>Edit templates to rename or update their descriptions</li>
                <li>Great for recurring weekly schedules!</li>
              </ul>
            </div>
          </div>
        </v-card-text>
      </v-card>

    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.template-card { transition: all 0.2s; border-color: #e0e0e0; }
.template-card:hover { border-color: #9C27B0; box-shadow: 0 4px 12px rgba(156,39,176,0.15); transform: translateY(-2px); }
</style>