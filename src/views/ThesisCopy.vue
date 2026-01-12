<template>
  <div class="thesis-details-container">
    <div class="page-header">
      <h1 class="page-title">Elementy pracy: {{ groupName }}</h1>
      <button class="back-btn" @click="goBack">
        <i class="icon-back"></i> Powrót
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Ładowanie danych pracy...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button class="retry-btn" @click="fetchThesis">Spróbuj ponownie</button>
    </div>
    
    <div v-else class="thesis-content">
      <div v-if="!thesis" class="no-thesis">
        <p>Nie znaleziono danych pracy dla tej grupy.</p>
      </div>
      
      <div v-else class="thesis-elements">
        <!-- Tytuł -->
        <div class="thesis-element">
          <div class="element-header">
            <h3>Tytuł</h3>
            <button class="copy-btn" @click="copyToClipboard(thesis.title)">
              Kopiuj
            </button>
          </div>
          <div class="element-content">
            {{ thesis.title }}
          </div>
        </div>
        
        <!-- English Title -->
        <div class="thesis-element">
          <div class="element-header">
            <h3>Tytuł angielski</h3>
            <button class="copy-btn" @click="copyToClipboard(thesis.title_en)">
              Kopiuj
            </button>
          </div>
          <div class="element-content">
            {{ thesis.title_en }}
          </div>
        </div>
        
        <!-- Opis -->
        <div class="thesis-element">
          <div class="element-header">
            <h3>Opis</h3>
            <button class="copy-btn" @click="copyToClipboard(thesis.description)">
              Kopiuj
            </button>
          </div>
          <div class="element-content description">
            {{ thesis.description }}
          </div>
        </div>
        
        <!-- English Description -->
        <div class="thesis-element">
          <div class="element-header">
            <h3>Opis angielski</h3>
            <button class="copy-btn" @click="copyToClipboard(thesis.description_en)">
              Kopiuj
            </button>
          </div>
          <div class="element-content description">
            {{ thesis.description_en }}
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="copySuccess" class="copy-success-notification">
      Skopiowano do schowka!
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ThesisCopy',
  props: ['groupId'],
  data() {
    return {
      thesis: null,
      loading: true,
      error: null,
      groupName: '',
      copySuccess: false,
      copyTimeout: null
    };
  },
  created() {
    this.fetchThesis();
  },
  methods: {
    async fetchThesis() {
      this.loading = true;
      this.error = null;
      
      try {
        try {
          const groupsResponse = await axios.get(`/api/v1/view/groups?id=${this.groupId}`);
          // console.log('Group response with ID parameter:', groupsResponse.data);
          
          if (groupsResponse.data && groupsResponse.data.dtos && groupsResponse.data.dtos.length > 0) {
            const group = groupsResponse.data.dtos[0];
            if (group && group.name) {
              this.groupName = group.name;
              // console.log('Found group name from ID parameter:', this.groupName);
            }
          }
        } catch (groupError) {
          // console.warn('Could not fetch group with ID parameter:', groupError);

          try {
            const allGroupsResponse = await axios.get('/api/v1/view/groups');
            // console.log('All groups response:', allGroupsResponse.data);
            
            if (allGroupsResponse.data && allGroupsResponse.data.dtos) {
              const group = allGroupsResponse.data.dtos.find(g => g.project_id == this.groupId);
              if (group && group.name) {
                this.groupName = group.name;
                // console.log('Found group name from all groups:', this.groupName);
              }
            }
          } catch (allGroupsError) {
            // console.warn('Could not fetch all groups:', allGroupsError);
          }
        }

        // console.log('Fetching thesis details for project ID:', this.groupId);
        const response = await axios.get(`/api/v1/thesis/byProjectId/${this.groupId}`);
        // console.log('Thesis details response:', response.data);
        
        this.thesis = response.data;

        if (!this.groupName) {
          if (response.data && response.data.project && response.data.project.name) {
            this.groupName = response.data.project.name;
          } else if (response.data && response.data.group_name) {
            this.groupName = response.data.group_name;
          } else {
            this.groupName = 'Projekt #' + this.groupId;
          }
        }
      } catch (error) {
        // console.error('Error fetching thesis details:', error);
        this.error = 'Nie udało się pobrać danych pracy: ' + (error.response?.data?.message || error.message);
      } finally {
        this.loading = false;
      }
    },
    
    goBack() {
      this.$router.push({ name: 'GroupsPanel' });
    },
    
    copyToClipboard(text) {
      if (!text) {
        // console.warn('Attempted to copy empty text');
        return;
      }
      
      navigator.clipboard.writeText(text)
        .then(() => {
          // console.log('Text copied to clipboard');
          this.showCopySuccess();
        })
        .catch(err => {
          // console.error('Failed to copy text: ', err);
        });
    },
    
    showCopySuccess() {
      this.copySuccess = true;

      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }

      this.copyTimeout = setTimeout(() => {
        this.copySuccess = false;
      }, 3000);
    },
    
    getFormattedAuthors() {
      if (!this.thesis || !this.thesis.students || !this.thesis.students.length) {
        return '';
      }
      
      return this.thesis.students
        .map(student => `${student.fname} ${student.lname}`)
        .join(', ');
    },
    
    getSupervisorName() {
      if (!this.thesis || !this.thesis.supervisor) {
        return '';
      }
      
      const supervisor = this.thesis.supervisor;
      return `${supervisor.fname || supervisor.fName || ''} ${supervisor.lname || supervisor.lName || ''}`.trim();
    }
  }
};
</script>

<style scoped src="../css/ThesisCopy.css"></style>
