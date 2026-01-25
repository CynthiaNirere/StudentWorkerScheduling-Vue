<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils";

const router = useRouter();
const user = ref(null);

onMounted(() => {
  user.value = Utils.getStore("user");
});
</script>

<template>
  <v-container>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Admin Dashboard</v-toolbar-title>
    </v-toolbar>
    <br />
    <v-alert type="info">
      Welcome, {{ user?.fName }} {{ user?.lName }}!
    </v-alert>
    <br />
    <v-row>
      <v-col cols="12" md="4">
        <v-card @click="router.push({ name: 'userManagement' })" hover>
          <v-card-title class="text-h5">User Management</v-card-title>
          <v-card-text>Manage system users and roles</v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card @click="router.push({ name: 'exerciseManagement' })" hover>
          <v-card-title class="text-h5">Exercise Management</v-card-title>
          <v-card-text>Manage exercise library and categories</v-card-text>
        </v-card>
      </v-col>
      
       <v-col cols="12" md="4">
        <v-card @click="router.push({ name: 'exercisePlansManagement' })" hover>
          <v-card-title class="text-h5">Exercise Plans</v-card-title>
          <v-card-text>Create and manage exercise plans and routines</v-card-text>
        </v-card>
      </v-col>
      
    </v-row>
  </v-container>
</template>