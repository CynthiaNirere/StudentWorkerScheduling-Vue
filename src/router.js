import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

// ─── IMPORTS ──────────────────────────────────────────────────────────────
import Login from "./views/Login.vue";
import SignUp from "./views/SignUp.vue";
import RoleSelect from "./views/RoleSelect.vue";
import AdminViewDashboard from "./views/adminViewDashboard.vue";
import EmployeeDashboard from "./views/EmployeeDashboard.vue";
import BusinessAreaSelect from "./views/BusinessAreaSelect.vue";
import EmployerDashboard from "./views/EmployerDashboard.vue";
import EmployerSchedule from "./views/EmployerSchedule.vue";
import EmployerEmployees from "./views/EmployerEmployees.vue";
import EmployerAvailability from "./views/EmployerAvailability.vue";
import EmployerTimeOff from "./views/EmployerTimeOff.vue";
import EmployerTasks from "./views/EmployerTasks.vue";
import EmployerSwaps from "./views/EmployerSwaps.vue";
import EmployerProfile from "./views/EmployerProfile.vue";

// ─── ROUTER ───────────────────────────────────────────────────────────────
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/login",
    },
    {
      // Keep /signup but redirect to login — we use Google OAuth only
      path: "/signup",
      name: "signup",
      redirect: "/login",
    },
    {
      path: "/login",
      name: "login",
      component: Login,
      meta: { requiresAuth: false },
    },
    {
      path: "/role-select",
      name: "roleSelect",
      component: RoleSelect,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    // ─── EMPLOYER / MANAGER ROUTES ─────────────────────────────────────
    {
      path: "/admin",
      name: "adminViewDashboard",
      component: AdminViewDashboard, 
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    // ─── EMPLOYEE ROUTES ────────────────────────────────────────────────
    {
      path: "/employee",
      redirect: "/employee/dashboard",
    },
    {
      path: "/employee/dashboard",
      name: "employeeDashboard",
      component: EmployeeDashboard,
      meta: { requiresAuth: true },
    },
    // ─── EMPLOYER ROUTES ────────────────────────────────────────────────
    { path: "/business-area-select",
      name: "businessAreaSelect",
      component: BusinessAreaSelect,
      meta: { requiresAuth: true },
    },
    {
      path: "/employer",
      redirect: "/employer/dashboard",
    },
    {
      path: "/employer/dashboard",
      name: "employerDashboard",
      component: EmployerDashboard,
      meta: { requiresAuth: true, requiresRole: ["employer", "admin"] },
    },
    {
      path: "/employer/schedule",
      name: "employerSchedule",
      component: EmployerSchedule,
      meta: { requiresAuth: true, requiresRole: ["employer", "admin"] },
    },
    {
      path: "/employer/employees",
      name: "employerEmployees",
      component: EmployerEmployees,
      meta: { requiresAuth: true, requiresRole: ["employer", "admin"] },
    },
    {
      path: "/employer/availability",
      name: "employerAvailability",
      component: EmployerAvailability,
      meta: { requiresAuth: true, requiresRole: ["employer", "admin"] },
    },
    {
      path: "/employer/time-off",
      name: "employerTimeOff",
      component: EmployerTimeOff,
      meta: { requiresAuth: true, requiresRole: ["employer", "admin"] },
    },
    {
      path: "/employer/tasks",
      name: "employerTasks",
      component: EmployerTasks,
      meta: { requiresAuth: true, requiresRole: ["employer", "admin"] },
    },
    {
      path: "/employer/swaps",
      name: "employerSwaps",
      component: EmployerSwaps,
      meta: { requiresAuth: true, requiresRole: ["employer", "admin"] },
    },
    {
      path: "/employer/profile",
      name: "employerProfile",
      component: EmployerProfile,
      meta: { requiresAuth: true, requiresRole: ["employer", "admin"] },
    },
    // ─── ADMIN ROUTES ──────────────────────────────────────────────────
    {
      path: "/admin",
      name: "adminViewDashboard",
      component: AdminViewDashboard,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    // ─── CATCH-ALL ─────────────────────────────────────────────────────
    {
      path: "/:pathMatch(.*)*",
      redirect: "/login",
    },
  ],
});

// ─── NAVIGATION GUARD ─────────────────────────────────────────────────────
router.beforeEach((to, from, next) => {
  const user = Utils.getStore("user");
  const requiresAuth = to.meta.requiresAuth;
  const requiresAdmin = to.meta.requiresAdmin;
  const requiresRole = to.meta.requiresRole; // array of allowed roles

  // 1. Not logged in → send to login
  if (requiresAuth && !user) {
    console.log("Not authenticated → /login");
    next({ name: "login" });
    return;
  }

  // 2. Route requires admin role specifically
  if (requiresAdmin && user?.role !== "admin") {
    console.log("Not admin → /login");
    next({ name: "login" });
    return;
  }

  // 3. Route requires one of a set of roles
  if (requiresRole && !requiresRole.includes(user?.role)) {
    console.log(`Role "${user?.role}" not allowed → /login`);
    next({ name: "login" });
    return;
  }

  // 4. Already logged in and trying to visit /login → redirect by role
  if (to.name === "login" && user) {
    redirectByRole(user, next);
    return;
  }

  next();
});

// ─── ROLE-BASED REDIRECT HELPER ───────────────────────────────────────────
export function redirectByRole(user, next) {
  if (!user) {
    next({ name: "login" });
    return;
  }
  switch (user.role) {
    case "admin":
      // Admin sees role-select to choose admin view vs manager view
      next({ name: "roleSelect" });
      break;
    case "employer":
      next({ name: "employerDashboard" });
      break;
    case "employee":
      // When employee dashboard exists, redirect there
      // For now fall through to employer as placeholder
      next({ name: "employerDashboard" });
      break;
    default:
      next({ name: "login" });
  }
}

export default router;