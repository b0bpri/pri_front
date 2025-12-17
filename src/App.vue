<template>
  <div id="app">
    <NavBar />
    <router-view />
    <NotivueNotification />
  </div>
</template>

<script>
import NavBar from './components/NavBar.vue'
import NotivueNotification from './components/NotivueNotification.vue'

export default {
  name: 'App',
  components: {
    NavBar,
    NotivueNotification
  }
}
</script>

<style>
body {
  margin: 0;
}
</style>
