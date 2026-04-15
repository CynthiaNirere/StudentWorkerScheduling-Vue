import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

import Landing from "./views/Landing.vue";
import GuestDashboard from "./views/GuestDashboard.vue";
import GuestSchedule from "./views/GuestSchedule.vue";
import GuestEmployees from './views/GuestEmployees.vue';
import GuestAvailability from './views/GuestAvailability.vue';
import GuestTimeOff from './views/GuestTimeOff.vue';
import GuestSwaps from './views/GuestSwaps.vue';
import GuestTasks from './views/GuestTasks.vue';
import GuestTemplate from './views/GuestTemplate.vue';
import GuestAlerts from './views/GuestAlerts.vue';
import GuestMessages from './views/GuestMessages.vue';
import Login from "./views/Login.vue";
import SignUp from "./views/SignUp.vue";
import RoleSelect from "./views/RoleSelect.vue";
import EmployeeDashboard from "./views/EmployeeDashboard.vue";
import EmployeeAvailability from "./views/EmployeeAvailabiliy.vue";
import EmployeeSchedule from "./views/EmployeeSchedule.vue";
import EmployeeProfile from "./views/EmployeeProfile.vue";
import EmployeeSettings from "./views/EmployeeSettings.vue";
import EmployeeTimeRequests from "./views/EmployeeTimeRequests.vue";
import EmployeeTimeCards from "./views/EmployeeTimeCards.vue";
import EmployeeTasks from "./views/EmployeeTasks.vue";
import EmployeeMessages from "./views/EmployeeMessages.vue";
import EmployeeSwaps from "./views/EmployeeSwaps.vue";
import EmployeeHub from "./views/EmployeeHub.vue";
import BusinessAreaSelect from "./views/BusinessAreaSelect.vue";
import EmployerDashboard from "./views/EmployerDashboard.vue";
import EmployerSchedule from "./views/EmployerSchedule.vue";
import EmployerEmployees from "./views/EmployerEmployees.vue";
import EmployerAvailability from "./views/EmployerAvailability.vue";
import EmployerTimeOff from "./views/EmployerTimeOff.vue";
import EmployerTasks from "./views/EmployerTasks.vue";
import EmployerSwaps from "./views/EmployerSwaps.vue";
import EmployerProfile from "./views/EmployerProfile.vue";
import TemplateManagement from "./views/TemplateManagement.vue";
import EmployerAlerts from "./views/EmployerAlerts.vue";
import EmployerMessages from "./views/EmployerMessages.vue";
import EmployerSettings from "./views/EmployerSettings.vue";
import EmployerTimeCards from "./views/EmployerTimeCards.vue";
import ClockKiosk from "./views/ClockKiosk.vue";
import Workplace from "./views/Workplace.vue";
import Profile from "./views/Profile.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ─── LANDING & GUEST ROUTES ────────────────────────────────────────
    {
      path: "/",
      name: "landing",
      component: Landing,
      meta: { requiresAuth: false },
    },
    {
      path: "/guest",
      name: "guestDashboard",
      component: GuestDashboard,
      meta: { requiresAuth: false },
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
    {
      path: "/guest/tasks",
      name: "guestTasks",
      component: GuestTasks,
      meta: { requiresAuth: false },
    },
    {
      path: "/guest/alerts",
      name: "guestAlerts",
      component: GuestAlerts,
      meta: { requiresAuth: false },
    },
    {
      path: "/guest/messages",
      name: "guestMessages",
      component: GuestMessages,
      meta: { requiresAuth: false },
    },
    {
      path: "/guest/templates",
      name: "guestTemplates",
      component: GuestTemplate,
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
      path: "/profile",  
      name: "profile",
      component: Profile,
      meta: { requiresAuth: true },
    },
    
    // ─── ADMIN ROUTES ──────────────────────────────────────────────────
    {
      path: "/admin",
      redirect: "/admin/workplace",
    },
    {
      path: "/admin/workplace",
      name: "workplace",
      component: Workplace,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    
    // ─── EMPLOYEE ROUTES ────────────────────────────────────────────────
    {
      path: "/employee",
      redirect: "/employee/dashboard",
    },
    {
      path: "/employee/hub",
      name: "employeeHub",
      component: EmployeeHub,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/dashboard",
      name: "employeeDashboard",
      component: EmployeeDashboard,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/availability",
      name: "employeeAvailability",
      component: EmployeeAvailability,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/schedule",
      name: "employeeSchedule",
      component: EmployeeSchedule,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/profile",
      name: "employeeProfile",
      component: EmployeeProfile,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/settings",
      name: "employeeSettings",
      component: EmployeeSettings,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/time-requests",
      name: "employeeTimeRequests",
      component: EmployeeTimeRequests,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/time-cards",
      name: "employeeTimeCards",
      component: EmployeeTimeCards,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/tasks",
      name: "employeeTasks",
      component: EmployeeTasks,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/messages",
      name: "employeeMessages",
      component: EmployeeMessages,
      meta: { requiresAuth: true, role: 'employee' },
    },
    {
      path: "/employee/swaps",
      name: "employeeSwaps",
      component: EmployeeSwaps,
      meta: { requiresAuth: true, role: 'employee' },
    },
    
    // ─── EMPLOYER ROUTES ────────────────────────────────────────────────
    {
      path: "/business-area-select",
      name: "businessAreaSelect",
      component: BusinessAreaSelect,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer",
      redirect: "/employer/dashboard",
    },
    {
      path: "/employer/dashboard",
      name: "employerDashboard",
      component: EmployerDashboard,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/schedule",
      name: "employerSchedule",
      component: EmployerSchedule,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/employees",
      name: "employerEmployees",
      component: EmployerEmployees,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/availability",
      name: "employerAvailability",
      component: EmployerAvailability,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/time-off",
      name: "employerTimeOff",
      component: EmployerTimeOff,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/tasks",
      name: "employerTasks",
      component: EmployerTasks,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/swaps",
      name: "employerSwaps",
      component: EmployerSwaps,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/alerts",
      name: "employerAlerts",
      component: EmployerAlerts,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/messages",
      name: "employerMessages",
      component: EmployerMessages,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/profile",
      name: "employerProfile",
      component: EmployerProfile,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/templates",
      name: "employerTemplates",
      component: TemplateManagement,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/settings",
      name: "employerSettings",
      component: EmployerSettings,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/time-cards",
      name: "employerTimeCards",
      component: EmployerTimeCards,
      meta: { requiresAuth: true, role: 'employer' },
    },
    {
      path: "/employer/clock-kiosk",
      name: "clockKiosk",
      component: ClockKiosk,
      meta: { requiresAuth: true, role: 'employer' },
    },
    
    // ─── CATCH ALL ──────────────────────────────────────────────────────
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

//  ENHANCED ROUTE GUARD - Handles page refresh and prevents jumping
router.beforeEach((to, from, next) => {
  console.log('🔍 Navigation:', { from: from.name, to: to.name });
  
  const user = Utils.getStore("user");
  const isGuest = localStorage.getItem("isGuest") === "true";
  const requiresAuth = to.meta.requiresAuth;
  const requiresAdmin = to.meta.requiresAdmin;
  const requiredRole = to.meta.role;

  console.log('👤 User:', user);
  console.log('🔐 Requires auth:', requiresAuth);
  console.log('👁️ Is guest:', isGuest);

  // PUBLIC ROUTES - Always allow
  if (!requiresAuth) {
    console.log(' Public route - allowing access');
    next();
    return;
  }

  //  GUEST USERS - Redirect to guest dashboard
  if (isGuest && requiresAuth) {
    console.log(' Guest trying to access protected route');
    next({ name: 'guestDashboard' });
    return;
  }

  //  NOT LOGGED IN - Redirect to login
  if (!user && requiresAuth) {
    console.log(' No user - redirecting to login');
    next({ name: "login" });
    return;
  }

  //  ADMIN ROLE CHECK
  if (requiresAdmin && user?.role !== 'admin') {
    console.log(' Not admin - redirecting based on role');
    if (user?.role === 'employer') {
      next({ name: 'employerDashboard' });
    } else if (user?.role === 'employee') {
      next({ name: 'employeeDashboard' });
    } else {
      next({ name: 'landing' });
    }
    return;
  }

  if (requiredRole && user?.role !== requiredRole) {
    console.log(` Wrong role: user is ${user?.role}, route requires ${requiredRole}`);
    
    // Redirect to appropriate dashboard based on actual role
    if (user?.role === 'admin') {
      next({ name: 'workplace' });
    } else if (user?.role === 'employer') {
      next({ name: 'employerDashboard' });
    } else if (user?.role === 'employee') {
      next({ name: 'employeeDashboard' });
    } else {
      next({ name: 'landing' });
    }
    return;
  }

  console.log(' Navigation allowed');
  next();
});

export default router;