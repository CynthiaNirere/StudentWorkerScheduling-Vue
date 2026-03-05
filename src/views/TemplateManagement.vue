<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";
import EmployerService from "../services/employerServices.js";
import EmployerLayout from '../components/EmployerLayout.vue';

const router = useRouter();
const user = ref(null);

const templates = ref([]);
const loading = ref(false);
const showDeleteDialog = ref(false);
const showApplyDialog = ref(false);
const templateToDelete = ref(null);
const templateToApply = ref(null);
const applyWeekStart = ref("");
const deleting = ref(false);
const applying = ref(false);

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("success");

onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadTemplates();
});

const loadTemplates = async () => {
  loading.value = true;
  try {
    const res = await EmployerService.getAllTemplates();
    templates.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error loading templates:", err);
    showSnackbar("Error loading templates", "error");
  } finally {
    loading.value = false;
  }
};

const openDeleteDialog = (template) => {
  templateToDelete.value = template;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!templateToDelete.value) return;
  
  deleting.value = true;
  try {
    await EmployerService.deleteTemplate(templateToDelete.value.id || templateToDelete.value.template_id);
    showSnackbar("Template deleted successfully", "success");
    await loadTemplates();
  } catch (err) {
    console.error('Delete error:', err);
    showSnackbar("Error deleting template", "error");
  } finally {
    deleting.value = false;
    showDeleteDialog.value = false;
    templateToDelete.value = null;
  }
};

const openApplyDialog = (template) => {
  templateToApply.value = template;
  const today = new Date();
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (7 - today.getDay()));
  applyWeekStart.value = nextSunday.toISOString().split('T')[0];
  showApplyDialog.value = true;
};

const handleApplyTemplate = async () => {
  if (!applyWeekStart.value) {
    showSnackbar("Please select a week start date", "error");
    return;
  }
  
  applying.value = true;
  try {
    const [year, month, day] = applyWeekStart.value.split('-').map(Number);
    const weekStart = new Date(year, month - 1, day, 12, 0, 0, 0);
    const startTimestamp = weekStart.getTime();
    
    const templateId = templateToApply.value.id || templateToApply.value.template_id;
    const res = await EmployerService.applyTemplate(templateId, startTimestamp);
    
    if (res.data && res.data.shifts) {
      const shiftsToCreate = res.data.shifts;
      
      for (const shift of shiftsToCreate) {
        await EmployerService.createShift(shift);
      }
      
      showSnackbar(`${shiftsToCreate.length} shifts created successfully!`, "success");
      showApplyDialog.value = false;
      router.push({ name: 'employerSchedule' });
    }
  } catch (err) {
    console.error('Apply template error:', err);
    showSnackbar("Error applying template", "error");
  } finally {
    applying.value = false;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  return new Date(Number(timestamp)).toLocaleDateString();
};

const getShiftCount = (template) => {
  if (!template.template_data && !template.templateData) return 0;
  const data = template.template_data || template.templateData;
  return Array.isArray(data) ? data.length : 0;
};

const showSnackbar = (message, color = "success") => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

const goToSchedule = () => {
  router.push({ name: 'employerSchedule' });
};
</script>

<template>
  <EmployerLayout>
    <v-container fluid class="pa-6">
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Schedule Templates</h1>
          <p class="text-body-2 text-grey">Manage and apply reusable weekly schedule templates</p>
        </div>
        <v-btn color="#12086F" variant="flat" prepend-icon="mdi-arrow-left" @click="goToSchedule">
          Back to Schedule
        </v-btn>
      </div>

      <v-card variant="outlined" rounded="lg" class="navy-card">
        <v-card-text class="pa-4">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="#12086F" size="32" />
          </div>

          <div v-else-if="templates.length === 0" class="text-center py-8">
            <v-icon size="64" class="mb-2 text-grey">mdi-file-document-outline</v-icon>
            <div class="text-body-1 text-grey mb-2">No templates yet</div>
            <div class="text-body-2 text-grey mb-4">
              Create a schedule and save it as a template to reuse it later
            </div>
            <v-btn color="#12086F" variant="tonal" @click="goToSchedule">Go to Schedule</v-btn>
          </div>

          <v-row v-else>
            <v-col v-for="template in templates" :key="template.id || template.template_id" cols="12" md="6" lg="4">
              <v-card variant="outlined" rounded="lg" class="template-card" hover>
                <v-card-title class="d-flex align-center justify-space-between pa-4 pb-3">
                  <div class="text-body-1 font-weight-bold navy-text">{{ template.name }}</div>
                  <v-menu>
                    <template #activator="{ props }">
                      <v-btn icon="mdi-dots-vertical" size="small" variant="plain" v-bind="props" />
                    </template>
                    <v-list density="compact">
                      <v-list-item @click="openApplyDialog(template)">
                        <v-list-item-title>
                          <v-icon size="small" class="mr-2">mdi-calendar-check</v-icon>
                          Apply to Week
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="openDeleteDialog(template)">
                        <v-list-item-title class="text-error">
                          <v-icon size="small" class="mr-2">mdi-delete</v-icon>
                          Delete
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-card-title>
                
                <v-divider />
                
                <v-card-text class="pa-4">
                  <div v-if="template.description" class="text-body-2 mb-3">
                    {{ template.description }}
                  </div>
                  
                  <div class="d-flex flex-wrap ga-2 mb-3">
                    <v-chip size="small" color="#4361EE" variant="tonal">
                      <v-icon start size="small">mdi-calendar-clock</v-icon>
                      {{ getShiftCount(template) }} shifts
                    </v-chip>
                    <v-chip size="small" color="#9e9e9e" variant="tonal">
                      <v-icon start size="small">mdi-clock-outline</v-icon>
                      {{ formatDate(template.created_at || template.createdAt) }}
                    </v-chip>
                  </div>
                  
                  <v-btn color="#9C27B0" variant="tonal" block prepend-icon="mdi-calendar-check" @click="openApplyDialog(template)">
                    Apply Template
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card variant="outlined" rounded="lg" class="mt-4 navy-card">
        <v-card-text class="pa-4">
          <div class="d-flex align-start ga-3">
            <v-icon color="#4361EE" size="32">mdi-information-outline</v-icon>
            <div>
              <div class="text-body-1 font-weight-bold mb-2">How Templates Work</div>
              <ul class="text-body-2 text-grey">
                <li>Templates save the structure of your weekly schedule</li>
                <li>Click "Apply Template" to create shifts for any week</li>
                <li>Shifts are created as drafts - you can edit before publishing</li>
                <li>Great for recurring weekly schedules!</li>
              </ul>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <v-dialog v-model="showApplyDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="text-body-1 font-weight-bold pa-5 pb-4 navy-text">Apply Template to Week</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div v-if="templateToApply" class="mb-4">
            <div class="text-caption text-grey">Template</div>
            <div class="text-body-1 font-weight-medium">{{ templateToApply.name }}</div>
            <div class="text-caption text-grey">{{ getShiftCount(templateToApply) }} shifts will be created</div>
          </div>
          
          <v-text-field v-model="applyWeekStart" label="Week Start Date (Sunday) *" type="date" variant="outlined" density="compact" color="#12086F" hint="Select the Sunday to start the week" persistent-hint />
          
          <v-alert type="info" variant="tonal" density="compact" class="mt-4">
            Shifts will be created for the full week starting from this date. All shifts will be created as drafts.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showApplyDialog = false">Cancel</v-btn>
          <v-btn color="#9C27B0" variant="flat" :loading="applying" @click="handleApplyTemplate">Apply Template</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg" v-if="templateToDelete">
        <v-card-title class="text-h6 pa-5 pb-4">Confirm Delete</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <p class="text-body-1">Are you sure you want to delete <strong>{{ templateToDelete.name }}</strong>?</p>
          <p class="text-body-2 text-grey mt-2">This action cannot be undone.</p>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false" :disabled="deleting">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">Delete</v-btn>
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
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18, 8, 111, 0.05); }
.template-card { transition: all 0.2s; border-color: #e0e0e0; }
.template-card:hover { border-color: #9C27B0; box-shadow: 0 4px 12px rgba(156, 39, 176, 0.15); transform: translateY(-2px); }
</style>