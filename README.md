# Dokumentacja Deweloperska - pri_front

pri_front to aplikacja frontendowa System-PRI zbudowana w Vue 3 z Vue CLI, Pinia i Bootstrap 5. Komunikuje się z backendem Spring Boot przez REST API (axios). Jest ona częścią modułu ​https://github.com/b0bpri/PRI
## Struktura Projektu  
```
src/
├── assets/                 # CSS, obrazy, fonty
├── components/             # Reużywalne UI: timeline, datepicker wrappers
├── views/                  # Strony aplikacji (Dashboard, Login, Reports)
├── router/                 # index.js - Vue Router konfiguracja routów
├── stores/                 # Pinia stores (auth, data, notifications)
├── services/               # API clients (axios instances)
├── utils/                  # Helpers (formatters, validators)
├── App.vue                 # Root komponent z router-view
└── main.js                 # Bootstrap: Vue app, router, pinia, globals
```​
## Technologie i Zależności
Kategoria	Technologie	Zastosowanie  
Framework	Vue 3.2, Vue Router 4	SPA routing, komponenty  
State	Pinia 3	Global state (auth, data)  
UI	Bootstrap 5, Notivue 2	Styling, powiadomienia  
API	Axios 1.9	REST calls do Spring Boot  
Utils	VueDatePicker 12, vue-timeline-chart 4, js-cookie	UI components, timeline, cookies  
Build	Vue CLI 5	Dev/prod builds  
​
## Uruchomienie Lokalne

```
git clone https://github.com/b0bpri/pri_front.git
cd pri_front
npm install
npm add vue-timeline-chart
npm add notivue
npm run serv
```
## Proxy API w vue.config.js:

```
devServer: {
  proxy: { '/api': 'http://localhost:8081' }
}

Build: npm run build → dist/ do Nginx/Docker.​
State Management (Pinia)

Typowa struktura stores w src/stores/:

js
// stores/auth.js
import { defineStore } from 'pinia'
import { apiAuth } from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, token: jsCookie.get('token') }),
  actions: {
    async login(credentials) { /* axios.post('/api/auth') */ }
  }
})
```

Używaj w komponentach: const authStore = useAuthStore()  ​
API Services  

## src/services/api.js (egzample):

```
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = useAuthStore().token
  if (token) config.headers.Authorization = `Bearer ${token}`
})

export default api
```  
Endpoints: /api/auth/login, /api/pri/data (dopasuj do backendu).​
Routing

## src/router/index.js:

```
import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('@/views/Dashboard.vue') },
  { path: '/login', component: () => import('@/views/Login.vue') }
]
export default createRouter({ history: createWebHistory(), routes })
```

Guards: auth checks z Pinia.  ​
## Deployment Docker
  
docker-compose.yml znajduje się w pliku https://github.com/b0bpri/PRI    
```
docker-compose.yml  
  
services:
  frontend:
    build: .
    ports: ["80:80"]
  backend:  # osobny serwis
    image: pri-backend
```
​
## Konwencje Kodowania

    Komponenty: PascalCase, .vue, props/emit, slots.

    Composable: use* (np. useApi.js, useTimeline.js).

    CSS: Bootstrap classes + scoped SCSS.

    Lint: ESLint (vue/eslint-config), Prettier.

    Git: feature/pri-123-task, PR z changelog.
