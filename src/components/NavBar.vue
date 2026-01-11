<template>
  <div class="layout-container">
    <!-- SIDEBAR for Promoter
    <div
      v-if="authStore.isPromoter"
      ref="sidebar"
      :class="['sidebar', sidebarOpen ? 'show' : '']"
    >
      <div class="sidebar-header">
        <h5 class="sidebar-title">Menu</h5>
      </div>
      <div class="sidebar-body">
        <ul class="sidebar-menu">
          <li class="sidebar-item">
            <router-link to="/" class="sidebar-link">Home</router-link>
          </li>
          <li class="sidebar-item">
            <router-link 
              to="/groups-panel" 
              class="sidebar-link" 
              title="Główny widok. Sprawdź grupy i ich studentów oraz etapy w jakich znajdują się ich prace."
            >Panel grup</router-link>
          </li>
          <li class="sidebar-item">
            <router-link 
              to="/checklist-maker" 
              class="sidebar-link" 
              title="Twórz własne szablony checklist, które będą używane do oceny prac studentów."
            >Kreator checklist</router-link>
          </li>
        </ul>
      </div>
    </div>
    -->

    <!-- Main content area -->
    <div class="main-content">
      <nav
        class="navbar navbar-expand-lg navbar-dark bg-primary px-3 shadow"
      >
        <!-- HAMBURGER MENU Promoters
        <button v-if="authStore.isPromoter" class="btn btn-primary me-3" @click.stop="toggleSidebar">
          ☰
        </button>
        -->
        <a class="navbar-brand fw-bold" href="#">PRI</a>

        <!-- Promoter navigation tabs -->
        <div v-if="authStore.isPromoter" class="nav-tabs-container ms-3 d-flex gap-4">
          <a 
            class="nav-tab" 
            :class="{ 'active': isCurrentRoute('GroupsPanel') }"
            @click.prevent="navigateToGroupsPanel"
            href="#"
          >
            Panel grup
          </a>
          <a 
            class="nav-tab" 
            :class="{ 'active': isCurrentRoute('ChecklistMaker') }"
            @click.prevent="navigateToChecklistMaker"
            href="#"
          >
            Kreator checklist
          </a>
        </div>

        <!-- Student navigation tabs - only when thesis is accepted -->
        <div v-if="!authStore.isPromoter && isStudentThesisAccepted" class="nav-tabs-container ms-3 d-flex gap-4">
          <a 
            class="nav-tab" 
            :class="{ 'active': isCurrentRoute('ChaptersPreview') }"
            @click.prevent="navigateToChapters"
            href="#"
          >
            Przegłąd wersji
          </a>
          <a 
            class="nav-tab" 
            :class="{ 'active': isCurrentRoute('Timeline') }"
            @click.prevent="navigateToTimeline"
            href="#"
          >
            Timeline
          </a>
        </div>

        <!-- User info and logout -->
        <div class="ms-auto d-flex align-items-center text-white">
          <i class="bi bi-person-circle fs-4 me-2"></i>
          <div class="d-flex flex-column me-3">
            <span>{{ user.name }}</span>
            <small class="text-light">{{ user.role }}</small>
          </div>
          <button v-if="authStore.userId" class="btn btn-outline-light btn-sm" @click="logout">
            Wyloguj
          </button>
        </div>
      </nav>
      
      <!-- Router view will be rendered here by the parent App.vue -->
      <div class="content-wrapper">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
import authStore from '/src/stores/authStore.js';
import axios from 'axios';
import '../css/NavBar.css';

export default {
  name: 'NavBar',
  data() {
    return {
      sidebarOpen: false,
      authStore: authStore,
      isStudentThesisAccepted: false,
      studentProjectId: null,
      studentThesisId: null
    };
  },
  computed: {
    user() {
      if (!authStore.userId) {
        return {
          name: 'Gość',
          role: 'Niezalogowany'
        };
      }
      
      const name = authStore.fname && authStore.lname 
        ? `${authStore.fname} ${authStore.lname}` 
        : 'Nieznany użytkownik';
      
      const role = authStore.isPromoter ? 'Promotor' : 'Student';
      
      return {
        name: name,
        role: role
      };
    }
  },
  async created() {
    // Check thesis status for students
    if (!authStore.isPromoter && authStore.userId) {
      await this.checkStudentThesisStatus();
    }
  },
  watch: {
    // Watch for changes in auth state
    'authStore.userId'() {
      if (!authStore.isPromoter && authStore.userId) {
        this.checkStudentThesisStatus();
      } else {
        this.isStudentThesisAccepted = false;
        this.studentProjectId = null;
        this.studentThesisId = null;
      }
    }
  },
  methods: {
    async checkStudentThesisStatus() {
      try {
        // Get student's group
        const response = await axios.get('/api/v1/view/groups/all');
        let groups = [];
        if (response.data && Array.isArray(response.data.dtos)) {
          groups = response.data.dtos;
        } else if (response.data && Array.isArray(response.data)) {
          groups = response.data;
        }

        const studentGroup = groups.find(group => 
          group.students && Array.isArray(group.students) && 
          group.students.some(student => student.id === authStore.userId)
        );

        if (studentGroup && studentGroup.project_id) {
          this.studentProjectId = studentGroup.project_id;
          
          // Check thesis status
          let groupWithThesisStatus = { ...studentGroup };
          
          if (!studentGroup.thesis_status && !studentGroup.isThesisAccepted && !studentGroup.thesisAccepted) {
            try {
              const thesisResponse = await axios.get(`/api/v1/thesis/byProjectId/${studentGroup.project_id}`);
              const thesisData = thesisResponse.data;
              groupWithThesisStatus.thesis_status = thesisData.approval_status || thesisData.status || 'PENDING';
              this.studentThesisId = thesisData.id;
            } catch (thesisError) {
              console.warn('Could not fetch thesis status:', thesisError);
              groupWithThesisStatus.thesis_status = 'PENDING';
            }
          }

          this.isStudentThesisAccepted = groupWithThesisStatus.thesis_status === 'APPROVED';
        }
      } catch (error) {
        console.error('Error checking student thesis status:', error);
        this.isStudentThesisAccepted = false;
      }
    },

    navigateToChapters() {
      if (this.studentProjectId) {
        this.$router.push({
          name: 'ChaptersPreview',
          params: { id: this.studentProjectId.toString() }
        });
      }
    },

    navigateToTimeline() {
      if (this.studentThesisId) {
        this.$router.push({
          name: 'Timeline',
          params: { thesisId: this.studentThesisId.toString() }
        });
      }
    },

    navigateToGroupsPanel() {
      this.$router.push({ name: 'GroupsPanel' });
    },

    navigateToChecklistMaker() {
      this.$router.push({ name: 'ChecklistMaker' });
    },

    isCurrentRoute(routeName) {
      return this.$route.name === routeName;
    },

    /* TOGGLE SIDEBAR 
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    */
    logout() {
      authStore.logout();
      this.$router.push('/');
      /* SIDEBAR 
      if (this.sidebarOpen) {
        this.toggleSidebar();
      }
      */
    }
  }
}
</script>