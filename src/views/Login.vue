<script setup>
import SocialLogin from "../components/SocialLogin.vue";
</script>

<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="15" sm="8" md="6" lg="5">
        <v-card class="pa-8" elevation="3">
          <!-- Header -->
          <div class="text-center mb-6">
            <v-icon size="64" color="primary" class="mb-4">mdi-calendar-clock</v-icon>
            <h1 class="text-h4 font-weight-black mb-1">TalonTime</h1>
            <p class="text-body-2 text-grey">"Talons Up, Scheduled Right"</p>
          </div>

          <!-- Social Login Component -->
          <SocialLogin />

          <!-- Footer -->
          <div class="text-center mt-6">
            <p class="text-caption text-grey">
              Secure login with Google Authentication
            </p>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>