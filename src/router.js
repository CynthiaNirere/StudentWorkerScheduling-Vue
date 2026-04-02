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
import AdminViewDashboard from "./views/adminViewDashboard.vue";
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
import Workplace from "./views/Workplace.vue";
import Profile from "./views/Profile.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "landing", component: Landing, meta: { requiresAuth: false } },
    { path: "/guest", name: "guestDashboard", component: GuestDashboard, meta: { requiresAuth: false } },
    { path: "/guest/schedule", name: "guestSchedule", component: GuestSchedule, meta: { requiresAuth: false } },
    { path: "/guest/employees", name: "guestEmployees", component: GuestEmployees, meta: { requiresAuth: false } },
    { path: "/guest/availability", name: "guestAvailability", component: GuestAvailability, meta: { requiresAuth: false } },
    { path: "/guest/time-off", name: "guestTimeOff", component: GuestTimeOff, meta: { requiresAuth: false } },
    { path: "/guest/swaps", name: "guestSwaps", component: GuestSwaps, meta: { requiresAuth: false } },
    { path: "/guest/tasks", name: "guestTasks", component: GuestTasks, meta: { requiresAuth: false } },
    { path: "/guest/alerts", name: "guestAlerts", component: GuestAlerts, meta: { requiresAuth: false } },
    { path: "/guest/messages", name: "guestMessages", component: GuestMessages, meta: { requiresAuth: false } },
    { path: "/guest/templates", name: "guestTemplates", component: GuestTemplate, meta: { requiresAuth: false } },
    { path: "/signup", name: "signup", component: SignUp, meta: { requiresAuth: false } },
    { path: "/login", name: "login", component: Login, meta: { requiresAuth: false } },
    { path: "/role-select", name: "roleSelect", component: RoleSelect, meta: { requiresAuth: true } },
    { path: "/workplace", name: "workplace", component: Workplace, meta: { requiresAuth: true } },
    { path: "/profile", name: "profile", component: Profile, meta: { requiresAuth: true } },
    { path: "/admin", name: "adminViewDashboard", component: AdminViewDashboard, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/employee", redirect: "/employee/dashboard" },
    { path: "/employee/dashboard", name: "employeeDashboard", component: EmployeeDashboard, meta: { requiresAuth: true } },
    { path: "/employee/availability", name: "employeeAvailability", component: EmployeeAvailability, meta: { requiresAuth: true } },
    { path: "/employee/schedule", name: "employeeSchedule", component: EmployeeSchedule, meta: { requiresAuth: true } },
    { path: "/employee/profile", name: "employeeProfile", component: EmployeeProfile, meta: { requiresAuth: true } },
    { path: "/employee/settings", name: "employeeSettings", component: EmployeeSettings, meta: { requiresAuth: true } },
    { path: "/employee/time-requests", name: "employeeTimeRequests", component: EmployeeTimeRequests, meta: { requiresAuth: true } },
    { path: "/employee/time-cards", name: "employeeTimeCards", component: EmployeeTimeCards, meta: { requiresAuth: true } },
    { path: "/employee/tasks", name: "employeeTasks", component: EmployeeTasks, meta: { requiresAuth: true } },
    { path: "/employee/messages", name: "employeeMessages", component: EmployeeMessages, meta: { requiresAuth: true } },
    { path: "/employee/swaps", name: "employeeSwaps", component: EmployeeSwaps, meta: { requiresAuth: true } },
    { path: "/business-area-select", name: "businessAreaSelect", component: BusinessAreaSelect, meta: { requiresAuth: true } },
    { path: "/employer", redirect: "/employer/dashboard" },
    { path: "/employer/dashboard", name: "employerDashboard", component: EmployerDashboard, meta: { requiresAuth: true } },
    { path: "/employer/schedule", name: "employerSchedule", component: EmployerSchedule, meta: { requiresAuth: true } },
    { path: "/employer/employees", name: "employerEmployees", component: EmployerEmployees, meta: { requiresAuth: true } },
    { path: "/employer/availability", name: "employerAvailability", component: EmployerAvailability, meta: { requiresAuth: true } },
    { path: "/employer/time-off", name: "employerTimeOff", component: EmployerTimeOff, meta: { requiresAuth: true } },
    { path: "/employer/tasks", name: "employerTasks", component: EmployerTasks, meta: { requiresAuth: true } },
    { path: "/employer/swaps", name: "employerSwaps", component: EmployerSwaps, meta: { requiresAuth: true } },
    { path: "/employer/alerts", name: "employerAlerts", component: EmployerAlerts, meta: { requiresAuth: true } },
    { path: "/employer/messages", name: "employerMessages", component: EmployerMessages, meta: { requiresAuth: true } },
    { path: "/employer/profile", name: "employerProfile", component: EmployerProfile, meta: { requiresAuth: true } },
    { path: "/employer/templates", name: "employerTemplates", component: TemplateManagement, meta: { requiresAuth: true } },
    { path: "/employer/settings", name: "employerSettings", component: EmployerSettings, meta: { requiresAuth: true } },
    { path: "/employer/time-cards", name: "employerTimeCards", component: EmployerTimeCards, meta: { requiresAuth: true } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach((to, from, next) => {
  const user = Utils.getStore("user");
  const isGuest = localStorage.getItem("isGuest") === "true";
  const requiresAuth = to.meta.requiresAuth;
  if (to.name?.startsWith("guest") && isGuest) { next(); return; }
  if (requiresAuth && !user) { next({ name: "login" }); return; }
  next();
});

export default router;