

import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";
// Views
import SignUp from "./views/SignUp.vue";
import Login from "./views/Login.vue";
import RoleSelect from "./views/RoleSelect.vue";
import EmployerDashboard from "./views/EmployerDashboard.vue";
import EmployeeDashboard from "./views/EmployeeDashboard.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/signup",
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
      component: () => import("./views/EmployerSchedule.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/employees",
      name: "employerEmployees",
      component: () => import("./views/EmployerEmployees.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/availability",
      name: "employerAvailability",
      component: () => import("./views/EmployerAvailability.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/time-off",
      name: "employerTimeOff",
      component: () => import("./views/EmployerTimeOff.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/tasks",
      name: "employerTasks",
      component: () => import("./views/EmployerTasks.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/swaps",
      name: "employerSwaps",
      component: () => import("./views/EmployerSwaps.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/employer/profile",
      name: "employerProfile",
      component: () => import("./views/EmployerProfile.vue"),
      meta: { requiresAuth: true },
    },

    {
      path: "/role-select",
      name: "roleSelect",
      component: RoleSelect,
      meta: { requiresAuth: true },
    },
    {
      path: "/dashboard",
      name: "employeeDashboard",
      component: EmployeeDashboard,
      meta: { requiresAuth: true },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/signup",
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