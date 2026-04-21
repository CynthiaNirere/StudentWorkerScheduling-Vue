<template>
  <v-dialog v-model="dialog" max-width="900px" @click:outside="closeDialog">
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white py-4">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-school</v-icon>
          <span class="text-h5">Class Schedule</span>
        </div>
        <v-btn icon variant="text" @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- User Name -->
        <div class="text-h6 mb-4">{{ userName }}</div>

        <!-- Term Selector -->
        <v-select
          v-model="selectedTerm"
          :items="availableTerms"
          item-title="label"
          item-value="code"
          label="Select Term"
          variant="outlined"
          density="comfortable"
          class="mb-6"
          :loading="loadingTerms"
        ></v-select>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="mt-4 text-grey">Loading schedule...</p>
        </div>

        <!-- Error State -->
        <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- Schedule Content -->
        <div v-else-if="schedule && schedule.length > 0">
          <!-- Weekly Overview (TOP) -->
          <div class="mb-6">
            <h3 class="text-h6 mb-3">📅 Weekly Schedule Overview</h3>
            <v-card variant="outlined">
              <v-card-text>
                <v-row>
                  <v-col
                    v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']"
                    :key="day"
                    cols="12"
                    sm="6"
                    md="2"
                  >
                    <div class="text-center mb-2">
                      <strong>{{ day }}</strong>
                    </div>
                    <div class="d-flex flex-column gap-1">
                      <v-chip
                        v-for="(time, idx) in getTimesForDay(day)"
                        :key="idx"
                        size="small"
                        color="primary"
                        variant="outlined"
                        class="text-caption"
                      >
                        {{ time }}
                      </v-chip>
                      <span v-if="getTimesForDay(day).length === 0" class="text-caption text-grey">
                        No classes
                      </span>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </div>

          <!-- Course List (Expandable) -->
          <div>
            <h3 class="text-h6 mb-3">📚 Courses ({{ schedule.length }})</h3>
            <v-expansion-panels variant="accordion">
              <v-expansion-panel
                v-for="(course, index) in schedule"
                :key="index"
                elevation="1"
              >
                <!-- Course Title (Collapsed) -->
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100 pr-4">
                    <div>
                      <strong>{{ course.title }}</strong>
                      <div class="text-caption text-grey">{{ course.courseNumber }}</div>
                    </div>
                    <div class="d-flex gap-1">
                      <v-chip
                        v-for="day in getDaysForCourse(course)"
                        :key="day"
                        size="x-small"
                        color="primary"
                        variant="tonal"
                      >
                        {{ day }}
                      </v-chip>
                    </div>
                  </div>
                </v-expansion-panel-title>

                <!-- Course Details (Expanded) -->
                <v-expansion-panel-text>
                  <v-divider class="mb-4"></v-divider>

                  <!-- Meeting Times -->
                  <div class="mb-3">
                    <strong class="d-block mb-2">Meeting Times:</strong>
                    <div class="d-flex flex-wrap gap-2">
                      <v-chip
                        v-for="(meeting, idx) in course.meetingTimes"
                        :key="idx"
                        color="primary"
                        variant="outlined"
                      >
                        {{ meeting.days }}: {{ meeting.startTime }} - {{ meeting.endTime }}
                      </v-chip>
                    </div>
                  </div>

                  <!-- Instructor(s) -->
                  <div class="mb-3">
                    <strong class="d-block mb-2">Instructor(s):</strong>
                    <ul class="pl-4">
                      <li v-for="(instructor, idx) in course.instructors" :key="idx">
                        {{ instructor.name }}
                        <span v-if="instructor.email" class="text-grey">
                          ({{ instructor.email }})
                        </span>
                      </li>
                    </ul>
                  </div>

                  <!-- Dates -->
                  <div class="text-caption text-grey">
                    {{ formatDate(course.startDate) }} - {{ formatDate(course.endDate) }}
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </div>

        <!-- No Schedule -->
        <v-alert v-else type="info" variant="tonal">
          No class schedule found for this term.
        </v-alert>
      </v-card-text>

      <!-- Footer -->
      <v-card-actions class="px-6 pb-4">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="closeDialog">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { getClassSchedule, getAvailableTerms } from '@/services/classScheduleServices';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  userId: {
    type: [String, Number],
    required: true
  },
  userName: {
    type: String,
    default: 'Student'
  }
});

const emit = defineEmits(['update:modelValue']);

const dialog = ref(props.modelValue);
const schedule = ref([]);
const availableTerms = ref([]);
const selectedTerm = ref('2026SP');
const loading = ref(false);
const loadingTerms = ref(false);
const error = ref(null);

// Watch for prop changes
watch(() => props.modelValue, (newVal) => {
  dialog.value = newVal;
  if (newVal) {
    loadTerms();
    loadSchedule();
  }
});

// Watch for dialog changes
watch(dialog, (newVal) => {
  emit('update:modelValue', newVal);
});

// Watch for term changes
watch(selectedTerm, () => {
  loadSchedule();
});

// Load available terms
const loadTerms = async () => {
  loadingTerms.value = true;
  try {
    const response = await getAvailableTerms();
    availableTerms.value = response.terms || [];
    if (availableTerms.value.length > 0 && !selectedTerm.value) {
      selectedTerm.value = availableTerms.value[0].code;
    }
  } catch (err) {
    console.error('Error loading terms:', err);
  } finally {
    loadingTerms.value = false;
  }
};

// Load class schedule
const loadSchedule = async () => {
  if (!props.userId || !selectedTerm.value) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await getClassSchedule(props.userId, selectedTerm.value);
    schedule.value = response.schedule || [];
  } catch (err) {
    console.error('Error loading schedule:', err);
    error.value = err.response?.data?.message || 'Failed to load class schedule';
    schedule.value = [];
  } finally {
    loading.value = false;
  }
};

const getTimesForDay = (day) => {
  const times = [];
  const dayMap = {
    'Mon': 'M',
    'Tue': 'TU',
    'Wed': 'W',
    'Thu': 'TH',
    'Fri': 'F'
  };
  
  const dayCode = dayMap[day];
  
  schedule.value.forEach(course => {
    course.meetingTimes.forEach(meeting => {
      // Parse days properly - split "MTWTHF" into ["M","TU","W","TH","F"]
      const dayMatches = meeting.days.match(/M(?!O)|TU|W|TH|F/g) || [];
      
      if (dayMatches.includes(dayCode)) {
        times.push(`${meeting.startTime}-${meeting.endTime}`);
      }
    });
  });
  
  // Sort times chronologically
  return times.sort();
};

// Get day chips for a course
const getDaysForCourse = (course) => {
  const daysSet = new Set();
  course.meetingTimes.forEach(meeting => {
    // Parse days string like "MTWTHF" into individual days
    const dayString = meeting.days;
    const dayMatches = dayString.match(/M(?!O)|TU|W|TH|F/g) || [];
    dayMatches.forEach(day => daysSet.add(day));
  });
  return Array.from(daysSet);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Close dialog
const closeDialog = () => {
  dialog.value = false;
};
</script>

<style scoped>
.gap-1 {
  gap: 0.25rem;
}

.gap-2 {
  gap: 0.5rem;
}

.w-100 {
  width: 100%;
}
</style>