import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

// ─── IMPORTS ──────────────────────────────────────────────────────────────
import Landing from "./views/Landing.vue"; 
import GuestDashboard from "./views/GuestDashboard.vue";  
import GuestSchedule from "./views/GuestSchedule.vue";  
import GuestEmployees from './views/GuestEmployees.vue';
import GuestAvailability from './views/GuestAvailability.vue';
import GuestTimeOff from './views/GuestTimeOff.vue';
import GuestSwaps from './views/GuestSwaps.vue';
import Login from "./views/Login.vue";
import SignUp from "./views/SignUp.vue";
import RoleSelect from "./views/RoleSelect.vue";
import AdminViewDashboard from "./views/adminViewDashboard.vue";
import EmployeeDashboard from "./views/EmployeeDashboard.vue";
import EmployeeAvailability from "./views/EmployeeAvailabiliy.vue";
import EmployeeSchedule from "./views/EmployeeSchedule.vue";
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

// ─── ROUTER ───────────────────────────────────────────────────────────────
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ─── LANDING & GUEST ROUTES ────────────────────────────────────────
    {
      path: "/",
      name: "landing",  //  CHANGED from redirect to actual landing page
      component: Landing,
      meta: { requiresAuth: false },
    },
    {
      path: "/guest",  //  ADDED
      name: "guestDashboard",
      component: GuestDashboard,
      meta: { requiresAuth: false },
    },
    // ─── AUTH ROUTES ───────────────────────────────────────────────────
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
    {
      path: "/employee/schedule",
      name: "employeeSchedule",
      component: EmployeeSchedule,
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
    {
  path: "/guest/schedule",
  name: "guestSchedule",
  component: GuestSchedule,
  meta: { requiresAuth: false },
    },
    {
  path: "/guest/employees",
  name: "guestEmployees",
  component: GuestEmployees,
  meta: { requiresAuth: false },
},
{
  path: "/guest/availability",
  name: "guestAvailability",
  component: GuestAvailability,
  meta: { requiresAuth: false },
},
{
  path: "/guest/time-off",
  name: "guestTimeOff",
  component: GuestTimeOff,
  meta: { requiresAuth: false },
},
{
  path: "/guest/swaps",
  name: "guestSwaps",
  component: GuestSwaps,
  meta: { requiresAuth: false },
},
    // ─── CATCH ALL ──────────────────────────────────────────────────────
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",  //  CHANGED to redirect to landing instead of login
    },
  ],
});

router.beforeEach((to, from, next) => {
  const user = Utils.getStore("user");
  const isGuest = localStorage.getItem("isGuest");  // 
  const requiresAuth = to.meta.requiresAuth;

  // Allow guest mode to access guestDashboard  // 
  if (to.name === "guestDashboard" && isGuest) {
    next();
    return;
  }

  if (requiresAuth && !user) {
    console.log("Not authenticated, redirecting to login");
    next({ name: "login" });
    return;
  }

  next();
});

export default router;