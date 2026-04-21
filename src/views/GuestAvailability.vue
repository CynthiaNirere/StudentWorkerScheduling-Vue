<script setup>
import { ref, computed } from 'vue';
import EmployerLayout from '../components/EmployerLayout.vue';

const selectedEmployee = ref(null);

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── HARDCODED DEMO DATA ───────────────────────────────────────────────────
const employees = ref([
  { user_id: 'e1', first_name: 'Sarah',   last_name: 'Johnson'   },
  { user_id: 'e2', first_name: 'Michael', last_name: 'Chen'      },
  { user_id: 'e3', first_name: 'Emily',   last_name: 'Rodriguez' },
  { user_id: 'e4', first_name: 'James',   last_name: 'Williams'  },
  { user_id: 'e5', first_name: 'Ashley',  last_name: 'Brown'     },
  { user_id: 'e6', first_name: 'David',   last_name: 'Martinez'  },
]);

// day_of_week: 0=Sun … 6=Sat, times in minutes from midnight
const availability = ref([
  { user_id: 'e1', day_of_week: 1, start_time: 480,  end_time: 960  },
  { user_id: 'e1', day_of_week: 3, start_time: 480,  end_time: 960  },
  { user_id: 'e1', day_of_week: 5, start_time: 420,  end_time: 840  },

  { user_id: 'e2', day_of_week: 1, start_time: 840,  end_time: 1200 },
  { user_id: 'e2', day_of_week: 2, start_time: 480,  end_time: 960  },
  { user_id: 'e2', day_of_week: 4, start_time: 480,  end_time: 960  },

  { user_id: 'e3', day_of_week: 0, start_time: 600,  end_time: 1080 },
  { user_id: 'e3', day_of_week: 2, start_time: 840,  end_time: 1260 },
  { user_id: 'e3', day_of_week: 5, start_time: 420,  end_time: 840  },

  { user_id: 'e4', day_of_week: 1, start_time: 420,  end_time: 900  },
  { user_id: 'e4', day_of_week: 2, start_time: 420,  end_time: 900  },
  { user_id: 'e4', day_of_week: 6, start_time: 600,  end_time: 1080 },

  { user_id: 'e5', day_of_week: 3, start_time: 900,  end_time: 1260 },
  { user_id: 'e5', day_of_week: 4, start_time: 480,  end_time: 720  },
  { user_id: 'e5', day_of_week: 5, start_time: 840,  end_time: 1260 },

  { user_id: 'e6', day_of_week: 0, start_time: 480,  end_time: 960  },
  { user_id: 'e6', day_of_week: 3, start_time: 420,  end_time: 900  },
  { user_id: 'e6', day_of_week: 6, start_time: 1080, end_time: 1320 },
]);

const availabilityGrid = computed(() => {
  const filtered = selectedEmployee.value
    ? employees.value.filter(e => e.user_id === selectedEmployee.value)
    : employees.value;

  return filtered.map(emp => {
    const empAvail = availability.value.filter(a => a.user_id === emp.user_id);
    const schedule = {};
    daysOfWeek.forEach((day, idx) => {
      schedule[day] = empAvail
        .filter(a => a.day_of_week === idx)
        .map(a => ({ start: formatTime(a.start_time), end: formatTime(a.end_time) }));
    });
    return {
      employeeName: `${emp.first_name} ${emp.last_name}`,
      employeeId: emp.user_id,
      schedule,
    };
  });
});

const formatTime = (minutes) => {
  const h    = Math.floor(minutes / 60);
  const m    = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''}${ampm}`;
};
</script>

<template>
  <EmployerLayout :isGuest="true">
    <v-container fluid class="pa-6">

      <!-- Guest Banner -->
      <v-alert type="info" variant="tonal" class="mb-5" density="compact">
        <v-icon start>mdi-eye-outline</v-icon>
        <strong>Guest Preview</strong> — Read-only demo. Add/edit/delete actions are disabled.
      </v-alert>

      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold navy-text">Employee Availability</h1>
          <p class="text-body-2 text-grey">View when employees are available to work</p>
        </div>
        <div class="d-flex align-center ga-3">
          <v-btn color="#12086F" prepend-icon="mdi-plus" size="small" disabled>Add Availability</v-btn>
          <v-select
            v-model="selectedEmployee"
            :items="employees"
            :item-title="e => `${e.first_name} ${e.last_name}`"
            item-value="user_id"
            label="Filter by employee"
            variant="outlined"
            density="compact"
            style="max-width: 250px"
            clearable
            color="#12086F"
          />
        </div>
      </div>

      <!-- Grid -->
      <v-card variant="outlined" rounded="lg" class="navy-card">
        <div class="pa-4 grid-scroll-wrapper">
          <div class="availability-grid-header">
            <div class="employee-column">Employee</div>
            <div v-for="day in daysOfWeek" :key="day" class="day-column">{{ day }}</div>
          </div>

          <div v-for="row in availabilityGrid" :key="row.employeeId" class="availability-grid-row">
            <div class="employee-column">
              <div class="font-weight-medium">{{ row.employeeName }}</div>
            </div>
            <div v-for="day in daysOfWeek" :key="day" class="day-column">
              <div v-if="row.schedule[day].length === 0" class="in-class">
                <v-icon size="12" class="mr-1">mdi-school</v-icon>In Class
              </div>
              <div v-else v-for="(slot, i) in row.schedule[day]" :key="i" class="available-slot">
                {{ slot.start }} – {{ slot.end }}
              </div>
            </div>
          </div>

          <div v-if="availabilityGrid.length === 0" class="text-center pa-6">
            <v-icon size="48" class="mb-2 text-grey">mdi-calendar-clock</v-icon>
            <div class="text-body-2 text-grey">No availability data</div>
          </div>
        </div>
      </v-card>

      <v-alert type="info" variant="tonal" class="mt-4" color="#4361EE">
        <strong>Tip:</strong> "In Class" means no availability is set for that day.
      </v-alert>

    </v-container>
  </EmployerLayout>
</template>

<style scoped>
.navy-text { color: #12086F !important; }
.navy-card { border-color: #e0e0e0; box-shadow: 0 1px 3px rgba(18,8,111,0.05); }
.availability-grid-header,
.availability-grid-row {
  display: grid;
  grid-template-columns: 200px repeat(7, 1fr);
  gap: 8px;
  border-bottom: 1px solid #e8e8e8;
}
.availability-grid-header {
  background: linear-gradient(135deg, #12086F 0%, #2B354F 100%);
  color: white; font-weight: 600; font-size: 13px;
  padding: 12px 8px; border-bottom: 2px solid #12086F; border-radius: 8px 8px 0 0;
}
.availability-grid-row { padding: 12px 8px; transition: background 0.15s; }
.availability-grid-row:hover { background: #fafafa; }
.employee-column, .day-column {
  display: flex; flex-direction: column; align-items: flex-start; justify-content: center; min-height: 50px;
}
.employee-column { font-weight: 500; padding-right: 12px; border-right: 1px solid #e8e8e8; }
.day-column { padding: 0 8px; }
.grid-scroll-wrapper { overflow-x: auto; min-width: 0; }
.available-slot {
  background: #e8f5e9; color: #2e7d32; padding: 3px 6px; border-radius: 4px;
  font-size: 11px; margin-bottom: 3px; white-space: nowrap; border-left: 3px solid #2e7d32;
}
.in-class {
  color: #5c6bc0; font-size: 11px; font-style: italic;
  display: flex; align-items: center; background: #f3f4fb;
  padding: 3px 6px; border-radius: 4px; border-left: 3px solid #9fa8da;
}
</style>