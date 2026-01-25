<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import Utils from '../config/utils'
import userServices from '../services/userServices'
import athleteServices from '../services/athleteServices'
import exerciseServices from '../services/exerciseServices'

const router = useRouter()
const store = useStore()

const user = ref(null)
const currentUser = computed(() => store.state.currentUser || store.state.loginUser)

const athletes = ref([])
const loading = ref(true)
const error = ref(null)
const successMessage = ref(null)

const showAddAthleteDialog = ref(false)
const showDeleteDialog = ref(false)
const athleteToDelete = ref(null)
const newAthlete = ref({
  firstName: '',
  lastName: '',
  email: '',
  age: null,
  gender: '',
  sportType: '',
  team: '',
  bio: ''
})

const athleteCount = computed(() => athletes.value.length)

const exerciseCount = computed(() => {
  const stored = Utils.getStore('exerciseCount')
  return stored !== null && stored !== undefined ? stored : 0
})

const planCount = computed(() => {
  const stored = Utils.getStore('trainingPlans')
  return stored !== null && stored !== undefined ? stored : 0
})

const showSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = null
  }, 3000)
}

const loadAthletes = async () => {
  try {
    loading.value = true
    error.value = null
    const coachId = user.value?.id || user.value?.userId
    console.log("🔍 Loading athletes for coach:", coachId)
    
    const response = await athleteServices.getAthletesByCoach(coachId)
    console.log("✅ Athletes loaded:", response.data)
    
    // Filter out any invalid athletes
    athletes.value = response.data.filter(athlete => {
      if (!athlete.user_id) {
        console.warn("⚠️ Athlete missing user_id:", athlete)
        return false
      }
      return true
    })
    
    Utils.setStore('athleteCount', athletes.value.length)
  } catch (err) {
    console.error("❌ Error loading athletes:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/'), 2000)
    } else {
      error.value = 'Unable to load athletes. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const openAddAthleteDialog = () => {
  showAddAthleteDialog.value = true
  newAthlete.value = {
    firstName: '',
    lastName: '',
    email: '',
    age: null,
    gender: '',
    sportType: '',
    team: '',
    bio: ''
  }
}

const closeAddAthleteDialog = () => {
  showAddAthleteDialog.value = false
}

const addAthlete = async () => {
  if (!newAthlete.value.firstName || !newAthlete.value.lastName || !newAthlete.value.email) {
    error.value = 'Please fill in all required fields'
    return
  }

  try {
    const coachId = user.value?.id || user.value?.userId
    
    const athleteData = {
      fName: newAthlete.value.firstName,
      lName: newAthlete.value.lastName,
      email: newAthlete.value.email,
      password: 'defaultPassword123',
      role: 'athlete',
      age: newAthlete.value.age,
      gender: newAthlete.value.gender,
      sport_type: newAthlete.value.sportType,
      team: newAthlete.value.team,
      bio: newAthlete.value.bio,
      coachId: coachId
    }

    console.log("📝 Creating athlete:", athleteData)
    const response = await userServices.createUser(athleteData)
    console.log("✅ Athlete created:", response.data)
    
    athletes.value.push(response.data)
    Utils.setStore('athleteCount', athletes.value.length)
    
    closeAddAthleteDialog()
    showSuccess('Athlete added successfully')
  } catch (err) {
    console.error("❌ Error creating athlete:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/'), 2000)
    } else if (err.response?.status === 400) {
      error.value = 'Email already exists. Please use a different email.'
    } else {
      error.value = err.response?.data?.message || 'Unable to add athlete. Please try again.'
    }
  }
}

const viewAthleteDetails = (athleteId) => {
  console.log("👀 Viewing athlete details, ID:", athleteId)
  
  if (!athleteId) {
    console.error("❌ No athlete ID provided!")
    error.value = "Cannot view athlete details - invalid athlete ID"
    return
  }
  
  router.push({ name: 'athleteDetail', params: { id: athleteId } })
}

const confirmDeleteAthlete = (athlete) => {
  console.log("🗑️ Confirming delete for athlete:", athlete)
  
  if (!athlete.user_id) {
    console.error("❌ No user_id for athlete:", athlete)
    error.value = "Cannot delete athlete - invalid athlete ID"
    return
  }
  
  athleteToDelete.value = athlete
  showDeleteDialog.value = true
}

const deleteAthlete = async () => {
  if (!athleteToDelete.value) return

  try {
    console.log("🗑️ Deleting athlete:", athleteToDelete.value.user_id)
    
    await userServices.deleteUser(athleteToDelete.value.user_id)
    athletes.value = athletes.value.filter(a => a.user_id !== athleteToDelete.value.user_id)
    Utils.setStore('athleteCount', athletes.value.length)
    showDeleteDialog.value = false
    athleteToDelete.value = null
    
    console.log("✅ Athlete deleted")
    showSuccess('Athlete deleted successfully')
  } catch (err) {
    console.error("❌ Error deleting athlete:", err)
    if (err.response?.status === 401) {
      error.value = 'Session expired. Please log in again.'
      setTimeout(() => router.push('/'), 2000)
    } else {
      error.value = 'Unable to delete athlete. Please try again.'
    }
  }
}

const goToExercises = () => {
  router.push({ name: 'coach-exercises' })
}

const goToPlans = () => {
  router.push({ name: 'coach-plans' })
}

const getInitials = (firstName, lastName) => {
  if (!firstName || !lastName) return '??'
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

onMounted(async () => {
  user.value = Utils.getStore("user") || currentUser.value
  
  if (!user.value) {
    router.push('/')
  } else if (user.value.role !== 'coach') {
    error.value = 'Access denied. Coach role required.'
    setTimeout(() => router.push('/'), 2000)
  } else {
    await loadAthletes()
  }
})
</script>

<template>
  <v-container>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Coach Dashboard</v-toolbar-title>
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
        <v-card color="info" dark @click="goToExercises" style="cursor: pointer">
          <v-card-text>
            <div class="text-h6">Exercises</div>
            <div class="text-h3 font-weight-bold">{{ exerciseCount }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card color="warning" dark @click="goToPlans" style="cursor: pointer">
          <v-card-text>
            <div class="text-h6">Training Plans</div>
            <div class="text-h3 font-weight-bold">{{ planCount }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <br />

    <!-- Athletes Section -->
    <v-card>
      <v-card-text>
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <div class="text-h5 font-weight-bold">My Athletes</div>
            <div class="text-caption text-grey">Manage your athletes and track their progress</div>
          </div>
          <v-btn color="primary" @click="openAddAthleteDialog">
            <v-icon left>mdi-plus</v-icon>
            Add Athlete
          </v-btn>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">Loading athletes...</p>
        </div>

        <!-- Athletes Grid -->
        <v-row v-else-if="athletes.length > 0">
          <v-col v-for="athlete in athletes" :key="athlete.user_id" cols="12" sm="6" md="4">
            <v-card elevation="2" hover>
              <v-card-text>
                <div class="d-flex align-center mb-3">
                  <v-avatar color="primary" size="48" class="mr-3">
                    <span class="text-h6">{{ getInitials(athlete.first_name, athlete.last_name) }}</span>
                  </v-avatar>
                  <div>
                    <div class="text-h6 font-weight-bold">{{ athlete.first_name }} {{ athlete.last_name }}</div>
                    <div class="text-caption text-grey">{{ athlete.email }}</div>
                  </div>
                </div>

                <v-divider class="my-3"></v-divider>

                <div class="d-flex justify-space-between mb-2">
                  <span class="text-body-2">Sport</span>
                  <span class="font-weight-bold">{{ athlete.sport_type || '-' }}</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-body-2">Team</span>
                  <span class="font-weight-bold">{{ athlete.team || '-' }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-body-2">Workouts</span>
                  <span class="font-weight-bold">{{ athlete.totalWorkouts || 0 }}</span>
                </div>
              </v-card-text>

              <v-card-actions>
                <v-btn 
                  variant="text" 
                  color="primary" 
                  @click="viewAthleteDetails(athlete.user_id)"
                  :disabled="!athlete.user_id"
                >
                  View Details
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn 
                  icon 
                  size="small" 
                  color="error" 
                  @click="confirmDeleteAthlete(athlete)"
                  :disabled="!athlete.user_id"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Empty State -->
        <v-alert v-else type="info" variant="tonal">
          No athletes yet. Click "Add Athlete" to get started!
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Add Athlete Dialog -->
    <v-dialog v-model="showAddAthleteDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <div class="d-flex justify-space-between align-center">
            <span class="text-h5">Add New Athlete</span>
            <v-btn icon variant="text" @click="closeAddAthleteDialog">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-card-text class="pt-4">
          <v-form>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="newAthlete.firstName"
                  label="First Name *"
                  variant="outlined"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newAthlete.lastName"
                  label="Last Name *"
                  variant="outlined"
                  required
                ></v-text-field>
              </v-col>
            </v-row>

            <v-text-field
              v-model="newAthlete.email"
              label="Email *"
              type="email"
              variant="outlined"
              required
            ></v-text-field>

            <v-row>
              <v-col cols="4">
                <v-text-field
                  v-model.number="newAthlete.age"
                  label="Age"
                  type="number"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="newAthlete.gender"
                  label="Gender"
                  :items="['Male', 'Female', 'Other']"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="newAthlete.sportType"
                  label="Sport Type"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-text-field
              v-model="newAthlete.team"
              label="Team"
              variant="outlined"
            ></v-text-field>

            <v-textarea
              v-model="newAthlete.bio"
              label="Bio"
              variant="outlined"
              rows="3"
            ></v-textarea>

            <v-alert type="info" variant="tonal" density="compact">
              <small><strong>Note:</strong> Once added, you can manage this athlete's profile, exercise goals, and track their progress from the athlete detail page.</small>
            </v-alert>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeAddAthleteDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="addAthlete"
            :disabled="!newAthlete.firstName || !newAthlete.lastName || !newAthlete.email"
          >
            Add Athlete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Athlete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon left color="white">mdi-alert-circle</v-icon>
          Delete Athlete
        </v-card-title>

        <v-card-text class="pt-6">
          <div v-if="athleteToDelete" class="text-center">
            <v-icon size="64" color="error" class="mb-4">mdi-account-remove</v-icon>
            <p class="text-h6 mb-2">Are you sure you want to delete this athlete?</p>
            <p class="text-body-1 font-weight-bold">{{ athleteToDelete.first_name }} {{ athleteToDelete.last_name }}</p>
            <p class="text-caption text-grey">{{ athleteToDelete.email }}</p>
            <v-alert type="warning" variant="tonal" class="mt-4">
              <strong>Warning:</strong> This action cannot be undone. All athlete data, goals, and workout history will be permanently deleted.
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions class="px-6 pb-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false; athleteToDelete = null">
            Cancel
          </v-btn>
          <v-btn color="error" @click="deleteAthlete">
            <v-icon left>mdi-delete</v-icon>
            Delete Athlete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>