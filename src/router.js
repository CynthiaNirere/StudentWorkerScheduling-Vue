import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

// ─── IMPORTS ──────────────────────────────────────────────────────────────
import Login from "./views/Login.vue";
import SignUp from "./views/SignUp.vue";
import RoleSelect from "./views/RoleSelect.vue";
import AdminViewDashboard from "./views/adminViewDashboard.vue";
import EmployeeDashboard from "./views/EmployeeDashboard.vue";
import EmployeeAvailability from "./views/EmployeeAvailabiliy.vue";
import BusinessAreaSelect from "./views/BusinessAreaSelect.vue";
import EmployerDashboard from "./views/EmployerDashboard.vue";
import EmployerSchedule from "./views/EmployerSchedule.vue";
import EmployerEmployees from "./views/EmployerEmployees.vue";
import EmployerAvailability from "./views/EmployerAvailability.vue";
import EmployerTimeOff from "./views/EmployerTimeOff.vue";
import EmployerTasks from "./views/EmployerTasks.vue";
import EmployerSwaps from "./views/EmployerSwaps.vue";
import EmployerProfile from "./views/EmployerProfile.vue";
import Workplace from "./views/Workplace.vue";  
import Profile from "./views/Profile.vue";  

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/login",
    },
    {
      path: "/signup",
      name: "signup",
      component: SignUp,
      meta: { requiresAuth: false },
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
      meta: { requiresAuth: true },
    },
    // ─── SHARED ROUTES (All Authenticated Users) ───────────────────────
    {
      path: "/workplace",  
      name: "workplace",
      component: Workplace,
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",  
      name: "profile",
      component: Profile,
      meta: { requiresAuth: true },
    },
    // ─── ADMIN ROUTES ──────────────────────────────────────────────────
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
    {
      path: "/employee/availability",
      name: "employeeAvailability",
      component: EmployeeAvailability,
      meta: { requiresAuth: true },
    },
    // ─── EMPLOYER ROUTES ────────────────────────────────────────────────
    {
      path: "/business-area-select",
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
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/schedule",
      name: "employerSchedule",
      component: EmployerSchedule,
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/employees",
      name: "employerEmployees",
      component: EmployerEmployees,
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/availability",
      name: "employerAvailability",
      component: EmployerAvailability,
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/time-off",
      name: "employerTimeOff",
      component: EmployerTimeOff,
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/tasks",
      name: "employerTasks",
      component: EmployerTasks,
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/swaps",
      name: "employerSwaps",
      component: EmployerSwaps,
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/profile",
      name: "employerProfile",
      component: EmployerProfile,
      meta: { requiresAuth: true },
    },
    // ─── CATCH ALL ──────────────────────────────────────────────────────
    {
      path: "/:pathMatch(.*)*",
      redirect: "/login",
    },
  ],
});

router.beforeEach((to, from, next) => {
  const user = Utils.getStore("user");
  const requiresAuth = to.meta.requiresAuth;

  if (requiresAuth && !user) {
    console.log("Not authenticated, redirecting to login");
    next({ name: "login" });
    return;
  }

  next();
});

export default router;