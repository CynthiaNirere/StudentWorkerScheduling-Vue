import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

// Auth
import Login from "./views/Login.vue";
import SignUp from "./views/SignUp.vue";

// Admin
import AdminViewDashboard from "./views/adminViewDashboard.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ========================================
    // Public Routes
    // ========================================
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
    
    // ========================================
    // Admin Routes
    // ========================================
    {
      path: "/admin/dashboard",
      name: "adminViewDashboard",
      component: AdminViewDashboard,
      meta: { requiresAuth: true, role: "admin" },
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
  const requiredRole = to.meta.role;

  // If route requires auth and user is not logged in
  if (requiresAuth && !user) {
    console.log("Not authenticated, redirecting to signup");
    next({ name: "signup" });
    return;
  }

  // If route requires specific role and user doesn't have it
  if (requiresAuth && requiredRole && user.role !== requiredRole) {
    console.log(`Access denied. Required: ${requiredRole}, User: ${user.role}`);
    next({ name: "login" });
    return;
  }

  // Allow navigation
  next();
});

export default router;