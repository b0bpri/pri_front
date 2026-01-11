<template>
  <div class="wrapper">
    <div class="card">
      <h2 class="title">Logowanie</h2>
      <form @submit.prevent="login" class="login-form">
        <div class="form-group">
          <label for="username">Nazwa użytkownika:</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            placeholder="Wprowadź nazwę użytkownika"
            required
          />
        </div>
        <div class="form-group">
          <label for="password">Hasło:</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Wprowadź hasło"
            required
          />
        </div>
        <button type="submit" class="login-btn">Zaloguj się</button>
      </form>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      
      <!-- SZYBKIE LOGOWANIE - ZAKOMENTOWANE
      <div class="divider">
        <span>LUB SZYBKIE LOGOWANIE</span>
      </div>
      
      <h2 class="title">Wybierz rolę</h2>
      <div class="button-group">
        <button class="role-btn" @click="loginAsStudent">Zaloguj jako Student: Tomasz Wasyłyk</button>
        <button class="role-btn" @click="loginAsPromoter">Zaloguj jako Promotor: Patryk Żywica</button>
      </div>
      <div class="button-group mt-10">
        <button class="role-btn alt-btn" @click="loginAsAlternateStudent">Zaloguj jako Student: Katarzyna Strzyżewska</button>
        <button class="role-btn alt-btn" @click="loginAsAlternatePromoter">Zaloguj jako Promotor: Marcin Szczepański</button>
      </div>
      -->
    </div>
  </div>
</template>

<script>
import authStore from '/src/stores/authStore';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { clearRouterCache } from '../router/index';

export default {
  name: 'Home',
  data() {
    return {
      username: '',
      password: '',
      errorMessage: ''
    };
  },
  created() {
    console.log('========================================');
    console.log('🚀 FRONTEND VERSION CHECK - Home.vue');
    console.log('✅ Nowa wersja z poprawkami JWT - 2026-01-12 - v1.0.2');
    console.log('========================================');
  },
  setup() {
    const router = useRouter();
    return { router };
  },
  methods: {
    async login() {
      this.errorMessage = '';
      try {
        // Login to get user details
        const loginResponse = await axios.post('/api/v1/auth/login', {
          username: this.username,
          password: this.password
        });
        
        const userData = loginResponse.data;
        console.log('Login successful:', userData);
        
        // Extract user information from new API format
        const token = userData.token;
        const userId = userData.id;
        const firstName = userData.first_name || '';
        const lastName = userData.last_name || '';
        const isPromoter = userData.is_promoter || false;
        
        // Save to authStore 
        authStore.setUser(isPromoter, userId, firstName, lastName, token);
        
        // Clear router cache on new login
        clearRouterCache();
        
        // Redirect based on role - router guard will handle the rest
        if (isPromoter) {
          this.router.push('/groups-panel');
        } else {
          // Let router guard handle student redirection
          this.router.push('/groups-panel');
        }
      } catch (error) {
        console.error('Login error:', error);
        this.errorMessage = error.response?.data?.message || 'Nie udało się zalogować. Sprawdź dane logowania.';
      }
    }

    /* SZYBKIE LOGOWANIE - ZAKOMENTOWANE
    async loginAsStudent() {
      this.errorMessage = '';
      authStore.setUser(false, 30, 'Tomasz', 'Wasyłyk');
      console.log('Student login successful:', authStore);
      
      // Clear router cache and let router guard handle redirection
      clearRouterCache();
      this.router.push('/groups-panel');
    },

    async loginAsPromoter() {
      this.errorMessage = '';
      authStore.setUser(true, 1, 'Patryk', 'Żywica');
      console.log('Promoter login successful:', authStore);
      
      // Clear router cache on new login
      clearRouterCache();
      this.router.push('/groups-panel');
    },
    
    async loginAsAlternateStudent() {
      this.errorMessage = '';
      authStore.setUser(false, 28, 'Katarzyna', 'Strzyżewska');
      console.log('Alternate student login successful:', authStore);
      
      // Clear router cache and let router guard handle redirection
      clearRouterCache();
      this.router.push('/groups-panel');
    },
    
    async loginAsAlternatePromoter() {
      this.errorMessage = '';
      authStore.setUser(true, 32, 'Marcin', 'Szczepański');
      console.log('Alternate promoter login successful:', authStore);
      
      // Clear router cache on new login
      clearRouterCache();
      this.router.push('/groups-panel');
    }
    */
  }
};
</script>

<style scoped src="../css/Home.css"></style>
