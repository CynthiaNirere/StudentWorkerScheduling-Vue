import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

// Auth
import Login from "./views/Login.vue";

// Admin Views
import AdminDashboard from "./views/AdminDashboard.vue";
import AdminUsers from "./views/AdminUsers.vue";
import AdminExercises from "./views/AdminExercises.vue";
import AdminExercisePlans from "./views/AdminExercisePlans.vue";

// Athlete Views
import AthleteDashboard from "./views/AthleteDashboard.vue";
import AthleteProfile from "./views/AthleteProfile.vue";
import RecordExercise from "./views/RecordExercise.vue";
import AthleteGoals from "./views/AthleteGoals.vue";
import ViewExerciseResults from "./views/ViewExerciseResults.vue";
import ViewProgress from "./views/ViewProgress.vue";
import AthleteAssignedPlans from "./views/AthleteAssignedPlans.vue";

// Coach Views
import CoachDashboard from "./views/CoachDashboard.vue";
import CoachExercises from "./views/CoachExercises.vue";
import CoachPlans from "./views/CoachPlans.vue";
import AthleteDetail from "./views/AthleteDetails.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ========================================
    // Public Routes
    // ========================================
    {
      path: "/",
      redirect: "/login",
    },
    {
      path: "/login",
      name: "login",
      component: Login,
      meta: { requiresAuth: false },
    },

    // ========================================
    // Admin Routes
    // ========================================
    {
      path: "/admin/dashboard",
      name: "adminDashboard",
      component: AdminDashboard,
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/users",
      name: "userManagement",
      component: AdminUsers,
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/exercises",
      name: "exerciseManagement",
      component: AdminExercises,
      meta: { requiresAuth: true, role: "admin" },
    },
    {
      path: "/admin/exercise-plans",
      name: "exercisePlansManagement",
      component: AdminExercisePlans,
      meta: { requiresAuth: true, role: "admin" },
    },

    // ========================================
    // Coach Routes
    // ========================================
    {
      path: "/coach/dashboard",
      name: "coachDashboard",
      component: CoachDashboard,
      meta: { requiresAuth: true, role: "coach" },
    },
    {
      path: "/coach/exercises",
      name: "coach-exercises",
      component: CoachExercises,
      meta: { requiresAuth: true, role: "coach" },
    },
    {
      path: "/coach/plans",
      name: "coach-plans",
      component: CoachPlans,
      meta: { requiresAuth: true, role: "coach" },
    },
    {
      path: "/coach/athlete/:id",
      name: "athleteDetail",
      component: AthleteDetail,
      meta: { requiresAuth: true, role: "coach" },
    },

    // ========================================
    // Athlete Routes
    // ========================================
    {
      path: "/athlete/dashboard",
      name: "athleteDashboard",
      component: AthleteDashboard,
      meta: { requiresAuth: true, role: "athlete" },
    },
    {
      path: "/athlete/profile",
      name: "athleteProfile",
      component: AthleteProfile,
      meta: { requiresAuth: true, role: "athlete" },
    },
    {
      path: "/athlete/record-exercise",
      name: "recordExercise",
      component: RecordExercise,
      meta: { requiresAuth: true, role: "athlete" },
    },
    {
      path: "/athlete/goals",
      name: "athleteGoals",
      component: AthleteGoals,
      meta: { requiresAuth: true, role: "athlete" },
    },
    {
      path: "/athlete/exercise-results",
      name: "viewExerciseResults",
      component: ViewExerciseResults,
      meta: { requiresAuth: true, role: "athlete" },
    },
    {
      path: "/athlete/progress",
      name: "viewProgress",
      component: ViewProgress,
      meta: { requiresAuth: true, role: "athlete" },
    },
    {
  path: "/athlete/assigned-plans",
  name: "athleteAssignedPlans",
  component: AthleteAssignedPlans,
  meta: { requiresAuth: true, role: "athlete" }
},

   
    {
      path: "/:pathMatch(.*)*",
      redirect: "/login",
    },
  ],
});


router.beforeEach((to, from, next) => {
  const user = Utils.getStore("user");
  const requiresAuth = to.meta.requiresAuth;
  const requiredRole = to.meta.role;

  // If route requires auth and user is not logged in
  if (requiresAuth && !user) {
    console.log("Not authenticated, redirecting to login");
    next({ name: "login" });
    return;
  }

  // If route requires specific role and user doesn't have it
  if (requiresAuth && requiredRole && user.role !== requiredRole) {
    console.log(`Access denied. Required: ${requiredRole}, User: ${user.role}`);
    
    // Redirect to appropriate dashboard based on user role
    if (user.role === "admin") {
      next({ name: "adminDashboard" });
    } else if (user.role === "athlete") {
      next({ name: "athleteDashboard" });
    } else if (user.role === "coach") {
      next({ name: "coachDashboard" });
    } else {
      next({ name: "login" });
    }
    return;
  }

  // If user is logged in and trying to access login page, redirect to dashboard
  if (to.name === "login" && user) {
    if (user.role === "admin") {
      next({ name: "adminDashboard" });
    } else if (user.role === "athlete") {
      next({ name: "athleteDashboard" });
    } else if (user.role === "coach") {
      next({ name: "coachDashboard" });
    } else {
      next();
    }
    return;
  }

  // Allow navigation
  next();
});

export default router;