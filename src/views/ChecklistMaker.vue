<template>
  <div class="wrapper">
    <div class="card">
      <!-- Header -->
      <div class="header-container">
        <h2 class="title">Kreator Checklist</h2>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading">
        Ładowanie...
      </div>

      <!-- Main content -->
      <div v-else class="content">
        <!-- Template type selector -->
        <div class="template-section">
          <h3>Typ szablonu checklist</h3>
          <div class="template-type-selector">
            <label class="type-option" :class="{ 'active': templateType === 'chapter' }">
              <input type="radio" v-model="templateType" value="chapter" @change="loadExistingTemplate">
              Szablon dla rozdziałów
            </label>
            <label class="type-option" :class="{ 'active': templateType === 'thesis' }">
              <input type="radio" v-model="templateType" value="thesis" @change="loadExistingTemplate">
              Szablon dla całej pracy
            </label>
          </div>
        </div>

        <!-- Existing template display -->
        <div v-if="existingTemplate.length > 0" class="existing-template-section">
          <h3>Aktualny szablon</h3>
          <div class="existing-template-list">
            <div 
              v-for="(item, index) in existingTemplate" 
              :key="index"
              class="existing-template-item"
            >
              <span class="template-number">{{ index + 1 }}.</span>
              <span class="template-text">{{ item }}</span>
            </div>
          </div>
          <button class="btn btn-secondary" @click="loadTemplateToEditor">
            Załaduj do edycji
          </button>
        </div>

        <!-- Questions section -->
        <div class="questions-section">
          <div class="questions-header">
            <h3>Pytania w checklist</h3>
            <button v-if="isEditing" class="btn btn-secondary" @click="addQuestion">
              <i class="icon-plus"></i> Dodaj pytanie
            </button>
          </div>

          <div v-if="questions.length === 0" class="no-questions">
            Brak pytań. Kliknij "Dodaj pytanie" aby rozpocząć.
          </div>

          <!-- Questions list -->
          <div v-else class="questions-list">
            <div 
              v-for="(question, index) in questions" 
              :key="question.id || index"
              class="question-item"
            >
              <div class="question-number">{{ index + 1 }}.</div>
              
              <div class="question-content">
                <!-- Question text -->
                <div class="question-text-section">
                  <label :for="`question-${index}`" class="question-label">Pytanie:</label>
                  <textarea
                    :id="`question-${index}`"
                    v-model="question.text"
                    class="question-textarea"
                    placeholder="Wpisz treść pytania..."
                    rows="2"
                    maxlength="500"
                  ></textarea>
                </div>

                <!-- Question options -->
                <div class="question-options">
                  <!-- Options removed - keeping structure for future use -->
                </div>
              </div>

              <!-- Question actions -->
              <div class="question-actions">
                <button 
                  v-if="index > 0"
                  class="btn-icon move-up" 
                  @click="moveQuestion(index, -1)"
                  title="Przesuń w górę"
                >
                  ↑
                </button>
                <button 
                  v-if="index < questions.length - 1"
                  class="btn-icon move-down" 
                  @click="moveQuestion(index, 1)"
                  title="Przesuń w dół"
                >
                  ↓
                </button>
                <button 
                  class="btn-icon delete" 
                  @click="toggleDeleteConfirm(index, $event)"
                  title="Usuń pytanie"
                >
                  🗑️
                </button>
                
                <!-- Delete confirmation popup -->
                <div 
                  v-if="showDeleteConfirmation && deleteIndex === index" 
                  class="delete-popup"
                  :style="deletePopupStyle"
                >
                  <div class="popup-content">
                    <p>Usunąć pytanie?</p>
                    <div class="popup-actions">
                      <button class="popup-btn cancel" @click="cancelDelete">Nie</button>
                      <button class="popup-btn confirm" @click="confirmDelete">Tak</button>
                    </div>
                  </div>
                  <div class="popup-arrow"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview section -->
        <div v-if="questions.length > 0" class="preview-section">
          <h3>Podgląd checklist</h3>
          <div class="preview-checklist">
            <div 
              v-for="(question, index) in questions" 
              :key="index"
              class="preview-question"
            >
              <div class="preview-checkbox">
                <input type="checkbox" disabled />
              </div>
              <div class="preview-text">
                {{ question.text }}
              </div>
            </div>
          </div>
        </div>

        <!-- Success message -->
        <div v-if="successMessage" class="success-message action-success">
          {{ successMessage }}
        </div>

        <!-- Action buttons -->
        <div class="action-buttons">
          <button 
            class="btn btn-primary"
            :disabled="!isValidTemplate || saving"
            @click="saveTemplate"
          >
            <span v-if="saving">Zapisywanie...</span>
            <span v-else>Zapisz szablon</span>
          </button>

          <button class="btn btn-secondary" @click="clearTemplate">
            Wyczyść
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import authStore from '../stores/authStore';
import '../css/ChecklistMaker.css';

export default {
  name: 'ChecklistMaker',
  data() {
    return {
      loading: true,
      saving: false,
      errorMessage: '',
      successMessage: '',
      
      // Template data
      templateType: 'chapter', // 'thesis' or 'chapter'
      existingTemplate: [], // Existing template from API
      
      // Questions data
      questions: [],
      questionCounter: 0,
      isEditing: false, // Track if template is being edited
      
      // Modal state
      showDeleteConfirmation: false,
      questionToDelete: null,
      deleteIndex: -1,
      deletePopupStyle: {}
    };
  },
  
  computed: {
    isValidTemplate() {
      return this.questions.length > 0 && 
             this.questions.every(q => q.text.trim().length > 0);
    },
    
    isPromoter() {
      return authStore && authStore.isPromoter === true;
    }
  },
  
  created() {
    this.$nextTick(async () => {
      // Check if user is promoter
      if (!this.isPromoter) {
        this.$router.push({ name: 'Home' });
        return;
      }
      
      // Load existing template
      await this.loadExistingTemplate();
      
      this.loading = false;
    });
  },
  
  methods: {
    async loadExistingTemplate() {
      try {
        const endpoint = this.templateType === 'thesis' 
          ? '/api/v1/view/checklistTemplates/thesis/'
          : '/api/v1/view/checklistTemplates/chapter/';
        
        const response = await axios.get(endpoint);
        console.log(`Loaded ${this.templateType} template:`, response.data);
        
        this.existingTemplate = response.data || [];
        
        // Reset editing state when switching templates
        this.questions = [];
        this.questionCounter = 0;
        this.isEditing = false;
        
      } catch (error) {
        console.error('Error loading template:', error);
        this.existingTemplate = [];
        // Reset editing state on error too
        this.questions = [];
        this.questionCounter = 0;
        this.isEditing = false;
        // Don't show error message if template doesn't exist yet
        if (error.response?.status !== 404) {
          this.errorMessage = 'Nie udało się załadować istniejącego szablonu.';
        }
      }
    },

    loadTemplateToEditor() {
      // Load existing template into editor
      this.questions = this.existingTemplate.map((text, index) => ({
        id: this.questionCounter + index + 1,
        text: text
      }));
      this.questionCounter += this.existingTemplate.length;
      this.isEditing = true;
      
      this.successMessage = 'Szablon załadowany do edycji.';
      setTimeout(() => {
        this.successMessage = '';
      }, 2000);
    },

    addQuestion() {
      this.questionCounter++;
      this.questions.push({
        id: this.questionCounter,
        text: ''
      });
    },
    
    toggleDeleteConfirm(index, event) {
      if (this.showDeleteConfirmation && this.deleteIndex === index) {
        this.cancelDelete();
        return;
      }
      
      this.deleteIndex = index;
      this.questionToDelete = this.questions[index];
      
      // Use absolute positioning relative to the question actions container
      this.deletePopupStyle = {
        position: 'absolute',
        top: '0px',
        right: '60px', // Position to the left of the delete button
        zIndex: 1000
      };
      
      this.showDeleteConfirmation = true;
      
      // Close popup when clicking outside
      this.$nextTick(() => {
        document.addEventListener('click', this.handleOutsideClick);
      });
    },
    
    handleOutsideClick(event) {
      if (!event.target.closest('.delete-popup') && !event.target.closest('.btn-icon.delete')) {
        this.cancelDelete();
      }
    },
    
    confirmDelete() {
      if (this.deleteIndex >= 0 && this.deleteIndex < this.questions.length) {
        this.questions.splice(this.deleteIndex, 1);
      }
      this.cancelDelete();
    },
    
    cancelDelete() {
      this.showDeleteConfirmation = false;
      this.questionToDelete = null;
      this.deleteIndex = -1;
      this.deletePopupStyle = {};
      document.removeEventListener('click', this.handleOutsideClick);
    },
    
    toggleTemplateDeleteConfirm(event) {
      if (this.showTemplateDeleteConfirmation) {
        this.cancelTemplateDelete();
        return;
      }
      
      const buttonRect = event.target.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // Position popup above the delete template button
      this.templateDeletePopupStyle = {
        position: 'fixed',
        top: `${buttonRect.top + scrollY - 60}px`,
        left: `${buttonRect.left + scrollX}px`,
        zIndex: 1000
      };
      
      this.showTemplateDeleteConfirmation = true;
      
      // Close popup when clicking outside
      this.$nextTick(() => {
        document.addEventListener('click', this.handleTemplateDeleteOutsideClick);
      });
    },
    
    handleTemplateDeleteOutsideClick(event) {
      if (!event.target.closest('.template-delete-popup') && !event.target.closest('.btn.btn-danger')) {
        this.cancelTemplateDelete();
      }
    },
    
    async confirmTemplateDelete() {
      this.cancelTemplateDelete();
      await this.deleteTemplate();
    },
    
    cancelTemplateDelete() {
      this.showTemplateDeleteConfirmation = false;
      this.templateDeletePopupStyle = {};
      document.removeEventListener('click', this.handleTemplateDeleteOutsideClick);
    },
    
    moveQuestion(index, direction) {
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < this.questions.length) {
        const question = this.questions.splice(index, 1)[0];
        this.questions.splice(newIndex, 0, question);
      }
    },
    
    async saveTemplate() {
      if (!this.isValidTemplate) return;
      
      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      try {
        // Prepare array of question strings
        const questionsArray = this.questions.map(q => q.text.trim());
        
        console.log(`Saving ${this.templateType} template with questions:`, questionsArray);
        
        // Choose endpoint based on template type
        const endpoint = this.templateType === 'thesis' 
          ? '/api/v1/post/thesisChecklistTemplate/'
          : '/api/v1/post/chapterChecklistTemplate/';
        
        const response = await axios.post(endpoint, questionsArray);
        console.log('Template save response:', response.data);
        
        this.successMessage = `Szablon dla ${this.templateType === 'thesis' ? 'pracy' : 'rozdziałów'} został zapisany!`;
        
        // Reload template to show updated version
        await this.loadExistingTemplate();
        
        // Clear editor after successful save
        this.questions = [];
        this.questionCounter = 0;
        this.isEditing = false;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        
      } catch (error) {
        console.error('Error saving template:', error);
        this.errorMessage = 'Nie udało się zapisać szablonu checklist.';
        if (error.response?.data) {
          this.errorMessage += ` (${error.response.data})`;
        }
      } finally {
        this.saving = false;
      }
    },
    
    clearTemplate() {
      this.questions = [];
      this.questionCounter = 0;
      this.isEditing = false;
    }
  }
};
</script>