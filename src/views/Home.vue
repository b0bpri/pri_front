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
    },

    async loginAsStudent() {
      this.errorMessage = '';
      try {
        const response = await axios.get('/api/v1/users');
        const students = response.data;
        const student = students.find(s => s.id === 30);

        if (!student) {
          throw new Error('Student not found');
        }

        let firstName = student.fName || student.fname || student.firstName || student.f_name || '';
        let lastName = student.lName || student.lname || student.lastName || student.l_name || '';

        if (!firstName || !lastName) {
          console.warn('Student data:', student);
          throw new Error('Student name data is incomplete');
        }

        authStore.setUser(false, 30, firstName, lastName);
        console.log('Student login successful:', authStore);
        
        // Clear router cache and let router guard handle redirection
        clearRouterCache();
        this.router.push('/groups-panel');
      } catch (error) {
        console.error('Error logging in as student:', error);
        this.errorMessage = `Nie udało się zalogować jako student: ${error.message}`;
      }
    },

    async loginAsPromoter() {
      this.errorMessage = '';
      try {
        const response = await axios.get('/api/v1/users');
        const students = response.data;
        const promoter = students.find(s => s.id === 1); 

        if (!promoter) {
          throw new Error('Promoter not found');
        }

        let firstName = promoter.fName || promoter.fname || promoter.firstName || promoter.f_name || '';
        let lastName = promoter.lName || promoter.lname || promoter.lastName || promoter.l_name || '';

        if (!firstName || !lastName) {
          console.warn('Promoter data:', promoter);
          throw new Error('Promoter name data is incomplete');
        }

        authStore.setUser(true, 1, firstName, lastName);
        console.log('Promoter login successful:', authStore);
        
        // Clear router cache on new login
        clearRouterCache();
        this.router.push('/groups-panel');
      } catch (error) {
        console.error('Error logging in as promoter:', error);
        this.errorMessage = `Nie udało się zalogować jako promotor: ${error.message}`;
      }
    },
    
    async loginAsAlternateStudent() {
      this.errorMessage = '';
      try {
        const response = await axios.get('/api/v1/users');
        const students = response.data;
        const student = students.find(s => s.id === 28);

        if (!student) {
          throw new Error('Student not found');
        }

        let firstName = student.fName || student.fname || student.firstName || student.f_name || '';
        let lastName = student.lName || student.lname || student.lastName || student.l_name || '';

        if (!firstName || !lastName) {
          console.warn('Student data:', student);
          throw new Error('Student name data is incomplete');
        }

        authStore.setUser(false, 28, firstName, lastName);
        console.log('Alternate student login successful:', authStore);
        
        // Clear router cache and let router guard handle redirection
        clearRouterCache();
        this.router.push('/groups-panel');
      } catch (error) {
        console.error('Error logging in as alternate student:', error);
        this.errorMessage = `Nie udało się zalogować jako student: ${error.message}`;
      }
    },
    
    async loginAsAlternatePromoter() {
      this.errorMessage = '';
      try {
        const response = await axios.get('/api/v1/users');
        const students = response.data;
        const promoter = students.find(s => s.id === 32); 

        if (!promoter) {
          throw new Error('Promoter not found');
        }

        let firstName = promoter.fName || promoter.fname || promoter.firstName || promoter.f_name || '';
        let lastName = promoter.lName || promoter.lname || promoter.lastName || promoter.l_name || '';

        if (!firstName || !lastName) {
          console.warn('Promoter data:', promoter);
          throw new Error('Promoter name data is incomplete');
        }

        authStore.setUser(true, 32, firstName, lastName);
        console.log('Alternate promoter login successful:', authStore);
        
        // Clear router cache on new login
        clearRouterCache();
        this.router.push('/groups-panel');
      } catch (error) {
        console.error('Error logging in as alternate promoter:', error);
        this.errorMessage = `Nie udało się zalogować jako promotor: ${error.message}`;
      }
    }
  }
};
</script>

<style scoped src="../css/Home.css"></style>
