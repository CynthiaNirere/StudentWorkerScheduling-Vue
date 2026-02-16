import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

// Views
import SignUp from "./views/SignUp.vue";
import Login from "./views/Login.vue";
import RoleSelect from "./views/RoleSelect.vue";

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
      path: "/role-select",
      name: "roleSelect",
      component: RoleSelect,
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

  // If route requires auth and user is not logged in
  if (requiresAuth && !user) {
    console.log("Not authenticated, redirecting to signup");
    next({ name: "signup" });
    return;
  }

  // Allow navigation
  next();
});

export default router;