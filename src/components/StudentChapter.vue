<template>
  <div class="student-chapter">
    <form @submit.prevent="saveChapter">
      <div class="form-group">
        <label for="title">Tytuł rozdziału</label>
        <input
          id="title"
          v-model="chapter.title"
          :readonly="readonly || chapterAccepted"
          class="form-control"
        />
      </div>
      <div class="form-group">
        <label for="titleEng">Tytuł rozdziału ENG</label>
        <input
          id="titleEng"
          v-model="chapter.title_en"
          :readonly="readonly || chapterAccepted"
          class="form-control"
        />
      </div>
      <div class="form-group">
        <label for="description">Opis rozdziału</label>
        <textarea
          id="description"
          v-model="chapter.description"
          :readonly="readonly || chapterAccepted"
          class="form-control"
        ></textarea>
      </div>
      <div class="form-group">
        <label for="descriptionEng">Opis rozdziału ENG</label>
        <textarea
          id="descriptionEng"
          v-model="chapter.description_en"
          :readonly="readonly || chapterAccepted"
          class="form-control"
        ></textarea>
      </div>
      <div class="form-group">
        <label for="promoterComment">Komentarz promotora do rozdziału</label>
        <textarea
          id="promoterComment"
          v-model="chapter.supervisor_comment"
          :readonly="readonly || !isPromoter || chapterAccepted"
          class="form-control"
        ></textarea>
      </div>
      <button v-if="!chapterAccepted && !readonly" type="submit" class="btn btn-primary">Zapisz rozdział</button>
      <button 
        v-if="isPromoter && !chapterAccepted && !readonly"
        type="button"
        class="btn btn-success"
        @click="acceptChapter"
      >
        Akceptuj rozdział
      </button>
      <p v-if="chapterAccepted" class="accepted-message">
        Rozdział został zaakceptowany i nie można go już edytować.
      </p>
    </form>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script>
import authStore from '/src/stores/authStore.js';
import axios from 'axios';
import '../css/StudentChapter.css';

export default {
  name: 'StudentChapter',
  props: {
    groupId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      isPromoter: authStore.isPromoter,
      userId: authStore.userId,
      internalGroupId: null,
      readonly: false,
      chapter: {
        title: '',
        title_en: '',
        description: '',
        description_en: '',
        supervisor_comment: '',
        approval_status: 'false',
        user_id: null
      },
      chapterId: null,
      chapterAccepted: false,
      successMessage: '',
      errorMessage: ''
    };
  },
  watch: {
    groupId: {
      immediate: true,
      handler(newVal) {
        this.internalGroupId = newVal;
        console.log('Updated internalGroupId from prop:', this.internalGroupId);
      }
    }
  },
  methods: {
    setReadOnly(value) {
      console.log('Setting read-only mode:', value);
      this.readonly = value;
    },
    
    setGroupId(groupId) {
      this.internalGroupId = groupId;
      console.log('Setting group ID:', groupId);
    },
    
    async loadChapter(chapterId) {
      if (!chapterId) {
        this.errorMessage = 'Brak identyfikatora rozdziału.';
        return;
      }
      
      try {
        const response = await axios.get(`/api/v1/chapter/${chapterId}`);
        console.log('Fetched chapter data:', response.data);
        
        this.chapter = {
          ...response.data,
          title: response.data.title || '',
          title_en: response.data.title_en || '',
          description: response.data.description || '',
          description_en: response.data.description_en || '',
          supervisor_comment: response.data.supervisor_comment || '',
          user_id: response.data.userId || response.data.user_id || response.data.user_data_id,
          approval_status: response.data.approval_status || 'false'
        };
        
        this.chapterAccepted = 
          response.data.approval_status === 'APPROVED' || 
          response.data.approval_status === 'true' || 
          response.data.approval_status === true;
        this.chapterId = response.data.id;
        
        this.successMessage = '';
        this.errorMessage = '';
      } catch (error) {
        console.error('Błąd przy pobieraniu danych rozdziału:', error);
        this.errorMessage = 'Nie udało się pobrać danych rozdziału.';
      }
    },
    
    createNewChapter(userId) {
      console.log('Creating new chapter with groupId:', this.groupId, 'and userId:', userId);
      
      this.chapter = {
        title: '',
        title_en: '',
        description: '',
        description_en: '',
        supervisor_comment: '',
        approval_status: 'false',
        user_id: userId
      };
      this.chapterId = null;
      this.chapterAccepted = false;
      this.successMessage = '';
      this.errorMessage = '';
    },
    
    setGroupId(id) {
      if (id) {
        this.internalGroupId = id;
        console.log('Manually set internalGroupId to:', id);
      }
    },
    
    async saveChapter() {
      if (this.chapterAccepted) return;
      
      try {
        let projectId = this.internalGroupId;
        
        if (!projectId) {
          projectId = this.groupId;
          console.log('Using projectId from prop:', projectId);
        }

        if (!projectId && this.$route && this.$route.params) {
          projectId = this.$route.params.groupId;
          console.log('Using projectId from route params:', projectId);
        }
        
        if (!projectId && this.$parent && this.$parent.projectId) {
          projectId = this.$parent.projectId;
          console.log('Using projectId from parent component:', projectId);
        }
        
        if (!projectId) {
          console.error('Missing projectId. Sources checked:',
            'Direct prop:', this.groupId,
            'Route param:', this.$route && this.$route.params ? this.$route.params.groupId : 'N/A',
            'Parent prop:', this.$parent ? this.$parent.projectId : 'N/A');
          this.errorMessage = 'Brak identyfikatora projektu. Nie można zapisać rozdziału.';
          return;
        }
        
        const chapterData = {
          user_id: this.chapter.user_id || this.userId,
          project_id: parseInt(projectId),
          title: this.chapter.title || '',
          title_en: this.chapter.title_en || '',
          description: this.chapter.description || '',
          description_en: this.chapter.description_en || '',
          supervisor_comment: this.chapter.supervisor_comment || ''
        };
        
        console.log('Saving chapter data:', chapterData);
        
        let response;
        if (this.chapterId) {
          response = await axios.patch(`/api/v1/chapter/${this.chapterId}`, chapterData);
        } else {
          response = await axios.post('/api/v1/chapter', chapterData);
        }
        
        console.log('Chapter saved response:', response.data);
        
        if (response.data && response.data.id) {
          this.chapterId = response.data.id;
          this.chapter.approval_status = response.data.approval_status || 'false';          
          this.chapterAccepted = 
            this.chapter.approval_status === 'APPROVED' || 
            this.chapter.approval_status === 'true' || 
            this.chapter.approval_status === true;
        }
        
        this.successMessage = 'Rozdział został zapisany.';
        this.errorMessage = '';
      } catch (error) {
        console.error('Błąd przy zapisywaniu rozdziału:', error);
        if (error.response && error.response.data) {
          console.error('Response data:', error.response.data);
          
          if (typeof error.response.data === 'string') {
            this.errorMessage = `Nie udało się zapisać rozdziału: ${error.response.data}`;
          } else {
            this.errorMessage = `Nie udało się zapisać rozdziału. Kod błędu: ${error.response.status}`;
          }
        } else {
          this.errorMessage = 'Nie udało się zapisać rozdziału.';
        }
      }
      setTimeout(() => (this.successMessage = ''), 2000);
    },
    
    async acceptChapter() {
      try {
        if (!this.chapterId) {
          this.errorMessage = 'Brak identyfikatora rozdziału. Najpierw zapisz rozdział.';
          return;
        }
        
        console.log('Approving chapter with ID:', this.chapterId);
        let currentServerData;
        try {
          const chapterResponse = await axios.get(`/api/v1/chapter/${this.chapterId}`);
          currentServerData = chapterResponse.data;
          console.log('Current chapter data from server:', currentServerData);

          if (!currentServerData.title || !currentServerData.title_en || 
              !currentServerData.description || !currentServerData.description_en) {
            this.errorMessage = 'Nie można zaakceptować rozdziału - wszystkie pola (poza komentarzem) muszą być wypełnione w bazie danych.';
            return;
          }
        } catch (fetchError) {
          console.error('Error fetching current chapter data:', fetchError);
          this.errorMessage = 'Nie udało się pobrać aktualnych danych rozdziału.';
          return;
        }
        
        try {
          const approvalResponse = await axios.post(`/api/v1/chapter/${this.chapterId}/approve`);
          console.log('Chapter approval direct response:', approvalResponse.data);
          this.chapterAccepted = true;
          this.chapter.approval_status = 'true';
          this.successMessage = 'Rozdział został zaakceptowany.';
          
          return; 
        } catch (approvalError) {
          console.log('Direct approval endpoint not available, falling back to PATCH:', approvalError);
        }

        const approvalData = {
          approval_status: 'APPROVED', 
          title: currentServerData.title,
          title_en: currentServerData.title_en,
          description: currentServerData.description,
          description_en: currentServerData.description_en,
          supervisor_comment: currentServerData.supervisor_comment,
          user_id: currentServerData.user_data_id || currentServerData.user_id,
          project_id: currentServerData.project_id
        };

        const response = await axios.patch(`/api/v1/chapter/${this.chapterId}`, approvalData);
        console.log('Chapter approval response:', response.data);
        
        if (response.data) {
          this.chapterAccepted = true;
          this.chapter.approval_status = 'APPROVED';
        }
        
        this.successMessage = 'Rozdział został zaakceptowany.';
        this.errorMessage = '';
      } catch (error) {
        console.error('Błąd przy akceptacji rozdziału:', error);
        this.errorMessage = 'Nie udało się zaakceptować rozdziału.';
      }
      setTimeout(() => (this.successMessage = ''), 2000);
    },
    async rejectChapter() {
      this.errorMessage = 'Funkcja odrzucania rozdziału jest obecnie niedostępna.';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
  }
};
</script>

