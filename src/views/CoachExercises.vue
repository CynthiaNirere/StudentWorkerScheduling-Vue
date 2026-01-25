<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import Utils from '../config/utils'
import exerciseServices from '../services/exerciseServices'

const router = useRouter()
const store = useStore()

const user = ref(null)
const currentUser = computed(() => store.state.currentUser || store.state.loginUser)

// Active tab
const activeTab = ref('exercises')

// Statistics
const athleteCount = computed(() => {
  const stored = Utils.getStore('athleteCount')
  return stored !== null && stored !== undefined ? stored : 0
})

const exerciseCount = computed(() => {
  const stored = Utils.getStore('exerciseCount')
  return stored !== null && stored !== undefined ? stored : 0
})

const trainingPlans = computed(() => {
  const stored = Utils.getStore('trainingPlans')
  return stored !== null && stored !== undefined ? stored : 0
})

// Exercise management
const exercises = ref([])
const loading = ref(true)
const error = ref(null)
const successMessage = ref(null)
const searchQuery = ref('')
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const exerciseToDelete = ref(null)
const newExercise = ref({
  name: '',
  description: '',
  muscleGroups: '',
  equipment: ''
})

const filteredExercises = computed(() => {
  if (!searchQuery.value) return exercises.value
  
  const query = searchQuery.value.toLowerCase()
  return exercises.value.filter(exercise => 
    exercise.name.toLowerCase().includes(query) ||
    (exercise.description && exercise.description.toLowerCase().includes(query)) ||
    (exercise.muscleGroup && exercise.muscleGroup.toLowerCase().includes(query))
  )
})

const showSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = null
  }, 3000)
}

const changeTab = (tab) => {
  if (tab === 'athletes') {
    router.push({ name: 'coachDashboard' })
  } else if (tab === 'exercises') {
    activeTab.value = 'exercises'
  } else if (tab === 'plans') {
    router.push({ name: 'coach-plans' })
  }
}

const loadExercises = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await exerciseServices.getAllExercises()
    exercises.value = response.data
    Utils.setStore('exerciseCount', exercises.value.length)
  } catch (err) {
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/'), 2000)
    } else {
      error.value = 'Unable to load exercises. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const saveExercise = async () => {
  if (!newExercise.value.name || !newExercise.value.description) {
    error.value = 'Please fill in all required fields'
    return
  }

  try {
    const response = await exerciseServices.createExercise(newExercise.value)
    exercises.value.push(response.data)
    Utils.setStore('exerciseCount', exercises.value.length)
    closeAddDialog()
    showSuccess('Exercise created successfully')
  } catch (err) {
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/'), 2000)
    } else {
      error.value = err.response?.data?.message || 'Unable to create exercise. Please try again.'
    }
  }
}

const confirmDeleteExercise = (item) => {
  exerciseToDelete.value = item
  showDeleteDialog.value = true
}

const deleteExercise = async () => {
  if (!exerciseToDelete.value) return

  try {
    await exerciseServices.deleteExercise(exerciseToDelete.value.id)
    exercises.value = exercises.value.filter(e => e.id !== exerciseToDelete.value.id)
    Utils.setStore('exerciseCount', exercises.value.length)
    showDeleteDialog.value = false
    exerciseToDelete.value = null
    showSuccess('Exercise deleted successfully')
  } catch (err) {
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/'), 2000)
    } else {
      error.value = 'Unable to delete exercise. Please try again.'
    }
  }
}

const openAddDialog = () => {
  showAddDialog.value = true
}

const closeAddDialog = () => {
  showAddDialog.value = false
  newExercise.value = {
    name: '',
    description: '',
    muscleGroups: '',
    equipment: ''
  }
}

onMounted(async () => {
  user.value = Utils.getStore("user") || currentUser.value
  
  if (!user.value) {
    router.push('/')
  } else if (user.value.role !== 'coach') {
    error.value = 'Access denied. Coach role required.'
    setTimeout(() => router.push('/'), 2000)
  } else {
    await loadExercises()
  }
})
</script>

<template>
  <v-container>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Coach Dashboard - Exercises</v-toolbar-title>
    </v-toolbar>

    <br />

    <!-- Success Message -->
    <v-alert v-if="successMessage" type="success" class="mb-4" closable @click:close="successMessage = null">
      {{ successMessage }}
    </v-alert>

    <!-- Error Message -->
    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-alert type="info">
      Welcome, Coach {{ user?.first_name || user?.fName }}!
    </v-alert>
    
    <br />

    <!-- Statistics Cards -->
    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-card color="primary" dark>
          <v-card-text>
            <div class="text-h6">My Athletes</div>
            <div class="text-h3 font-weight-bold">{{ athleteCount }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card color="info" dark>
          <v-card-text>
            <div class="text-h6">Exercises</div>
            <div class="text-h3 font-weight-bold">{{ exerciseCount }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card color="warning" dark>
          <v-card-text>
            <div class="text-h6">Training Plans</div>
            <div class="text-h3 font-weight-bold">{{ trainingPlans }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <br />

    <!-- Tab Navigation -->
    <v-card>
      <v-tabs
        v-model="activeTab"
        bg-color="white"
        color="primary"
      >
        <v-tab value="athletes" @click="changeTab('athletes')">Athletes</v-tab>
        <v-tab value="exercises" @click="changeTab('exercises')">Exercises</v-tab>
        <v-tab value="plans" @click="changeTab('plans')">Plans</v-tab>
      </v-tabs>

      <!-- Exercise Library Content -->
      <v-card-text>
        <!-- Header -->
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <div class="text-h5 font-weight-bold">Exercise Library</div>
            <div class="text-caption text-grey">Manage exercises for your training programs</div>
          </div>
          <v-btn color="primary" @click="openAddDialog">
            <v-icon left>mdi-plus</v-icon>
            Add Exercise
          </v-btn>
        </div>

        <!-- Search Bar -->
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search exercises..."
          variant="outlined"
          density="compact"
          class="mb-4"
          clearable
        ></v-text-field>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">Loading exercises...</p>
        </div>

        <!-- Exercise Cards -->
        <v-row v-else-if="filteredExercises.length > 0">
          <v-col v-for="exercise in filteredExercises" :key="exercise.id" cols="12" md="6">
            <v-card elevation="2" hover>
              <v-card-text>
                <div class="d-flex justify-space-between align-center mb-3">
                  <div>
                    <div class="text-h6 font-weight-bold">{{ exercise.name }}</div>
                  </div>
                  <v-btn 
                    icon 
                    size="small" 
                    color="error" 
                    variant="text"
                    @click="confirmDeleteExercise(exercise)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>

                <div class="text-body-2 text-grey mb-3">{{ exercise.description || 'No description' }}</div>

                <v-divider class="my-3"></v-divider>

                <div class="d-flex justify-space-between mb-2">
                  <span class="text-body-2">Muscle Groups</span>
                  <span class="font-weight-bold text-body-2">{{ exercise.muscleGroup || '-' }}</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-body-2">Equipment</span>
                  <span class="font-weight-bold text-body-2">{{ exercise.equipmentNeeded || '-' }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-body-2">Type</span>
                  <v-chip size="x-small" :color="exercise.isStandard ? 'default' : 'secondary'">
                    {{ exercise.isStandard ? 'Standard' : 'Custom' }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Empty State -->
        <v-alert v-else type="info" variant="tonal">
          <span v-if="searchQuery">No exercises found matching "{{ searchQuery }}"</span>
          <span v-else>No exercises available. Add your first exercise to get started!</span>
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Add Exercise Dialog -->
    <v-dialog v-model="showAddDialog" max-width="600px">
      <v-card>
        <v-card-title class="bg-primary text-white">
          <span class="text-h5">Add New Exercise</span>
        </v-card-title>

        <v-card-subtitle class="pt-2">
          Create a custom exercise
        </v-card-subtitle>

        <v-card-text class="pt-4">
          <v-form>
            <v-text-field
              v-model="newExercise.name"
              label="Exercise Name *"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              required
            ></v-text-field>

            <v-textarea
              v-model="newExercise.description"
              label="Description *"
              variant="outlined"
              density="comfortable"
              rows="3"
              class="mb-3"
              required
            ></v-textarea>

            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="newExercise.muscleGroups"
                  label="Muscle Groups"
                  placeholder="e.g., Chest, Triceps"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newExercise.equipment"
                  label="Equipment"
                  placeholder="e.g., Barbell, Dumbbells"
                  variant="outlined"
                  density="comfortable"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeAddDialog">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="saveExercise"
            :disabled="!newExercise.name || !newExercise.description"
          >
            Save Exercise
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Exercise Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon left color="white">mdi-alert-circle</v-icon>
          Delete Exercise
        </v-card-title>

        <v-card-text class="pt-6">
          <div v-if="exerciseToDelete" class="text-center">
            <v-icon size="64" color="error" class="mb-4">mdi-dumbbell</v-icon>
            <p class="text-h6 mb-2">Are you sure you want to delete this exercise?</p>
            <p class="text-body-1 font-weight-bold">{{ exerciseToDelete.name }}</p>
            <p class="text-caption text-grey mb-4">{{ exerciseToDelete.description }}</p>
            <v-alert type="warning" variant="tonal">
              <strong>Warning:</strong> This action cannot be undone. The exercise will be permanently removed from your library.
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions class="px-6 pb-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false; exerciseToDelete = null">
            Cancel
          </v-btn>
          <v-btn color="error" @click="deleteExercise">
            <v-icon left>mdi-delete</v-icon>
            Delete Exercise
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>