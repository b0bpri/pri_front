import { createApp } from 'vue'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import router from './router'
import studentIcon from './assets/student_icon.png'
import { createNotivue } from 'notivue'
import 'notivue/notifications.css'
import 'notivue/animations.css'
import axios from 'axios'
import authStore from './stores/authStore'

const link = document.createElement('link')
link.rel = 'icon'
link.href = studentIcon
document.head.appendChild(link)

const notivue = createNotivue()

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true;

//JWT Interceprtor 
axios.interceptors.request.use(
  (config) => {
    const token = authStore.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const app = createApp(App)
app.use(router)
app.use(notivue)
app.mount('#app')

//123