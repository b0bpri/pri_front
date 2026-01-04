<template>
  <div class="no-group-container">
    <div class="no-group-card">
      <h1>Brak przypisanej grupy</h1>
      <p class="message">
        Nie jesteś członkiem żadnej grupy projektowej.
      </p>
      <p class="submessage">
        Skontaktuj się z promotorem, aby zostać przypisanym do grupy.
      </p>
      <div class="info-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>Dostęp do modułów systemu jest możliwy tylko dla studentów przypisanych do grup.</span>
      </div>
      <button @click="handleLogout" class="logout-button">
        Wyloguj się
      </button>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router';
import authStore from '@/stores/authStore';
import '../css/NoGroup.css';

export default {
  name: 'NoGroup',
  setup() {
    const router = useRouter();

    const handleLogout = () => {
      authStore.logout();
      router.push({ name: 'Home' });
    };

    return {
      handleLogout
    };
  }
};
</script>
