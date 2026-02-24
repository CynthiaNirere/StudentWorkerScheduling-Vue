<script setup>
import SocialLogin from "../components/SocialLogin.vue";
</script>

<template>
  <div class="login-page">
    <span class="bg-icon ic-1 mdi mdi-calendar-month-outline"></span>
    <span class="bg-icon ic-2 mdi mdi-clock-outline"></span>
    <span class="bg-icon ic-3 mdi mdi-bell-outline"></span>
    <span class="bg-icon ic-4 mdi mdi-clipboard-check-outline"></span>
    <span class="bg-icon ic-5 mdi mdi-chart-bar"></span>
    <span class="bg-icon ic-6 mdi mdi-account-group-outline"></span>

    <div class="login-card">
      <div class="login-header">
        <div class="logo-mark">S</div>
        <h1 class="app-name">ShiftBoard</h1>
        <p class="tagline">Smart scheduling for student workers</p>
      </div>

      <div class="login-divider"></div>

      <SocialLogin />

      <p class="login-footer">Secure login with Google Authentication</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #d6e4f7 0%, #c2d5f0 30%, #a8c4e8 60%, #8eb3e0 100%);
  position: relative;
  overflow: hidden;
}

.bg-icon {
  position: absolute;
  pointer-events: none;
  color: rgba(18, 8, 111, 0.25);
}

.ic-1 { top: 15%; left: 10%; font-size: 56px; transform: rotate(-10deg); }
.ic-2 { top: 30%; right: 12%; font-size: 48px; transform: rotate(8deg); }
.ic-3 { bottom: 20%; left: 8%; font-size: 44px; transform: rotate(5deg); }
.ic-4 { bottom: 30%; right: 15%; font-size: 40px; transform: rotate(-6deg); }
.ic-5 { top: 10%; right: 30%; font-size: 36px; transform: rotate(12deg); }
.ic-6 { bottom: 12%; left: 30%; font-size: 42px; transform: rotate(-4deg); }

.login-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 48px 40px 36px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(18, 8, 111, 0.1);
  text-align: center;
}

.logo-mark {
  width: 56px;
  height: 56px;
  background: #12086f;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
}

.app-name {
  font-size: 28px;
  font-weight: 700;
  color: #12086f;
  margin: 0 0 6px;
  letter-spacing: -0.3px;
}

.tagline {
  font-size: 14px;
  color: #4361ee;
  margin: 0;
}

.login-divider {
  height: 1px;
  background: rgba(18, 8, 111, 0.1);
  margin: 28px 0;
}

.login-footer {
  font-size: 12px;
  color: #4895ef;
  margin: 24px 0 0;
}
</style>