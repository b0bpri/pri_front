<template>
  <div id="app">
    <NavBar>
      <router-view />
    </NavBar>
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


//changes

<style>
body {
  margin: 0;
}
</style>
