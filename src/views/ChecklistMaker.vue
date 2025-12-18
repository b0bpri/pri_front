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
        <!-- Checklist template selector -->
        <div class="template-section">
          <h3>Wybierz szablon checklist</h3>
          <select v-model="selectedTemplateId" class="template-selector" @change="loadTemplate">
            <option value="">-- Utwórz nowy szablon --</option>
            <option v-for="template in templates" :key="template.id" :value="template.id">
              {{ template.name }} ({{ template.questions.length }} pytań)
            </option>
          </select>
        </div>

        <!-- Template name input -->
        <div class="template-name-section">
          <label for="templateName" class="form-label">Nazwa szablonu:</label>
          <input 
            id="templateName"
            v-model="templateName" 
            type="text" 
            class="template-name-input"
            placeholder="Np. Szablon checklist dla prac magisterskich"
            maxlength="100"
          />
        </div>

        <!-- Questions section -->
        <div class="questions-section">
          <div class="questions-header">
            <h3>Pytania w checklist</h3>
            <button class="btn btn-secondary" @click="addQuestion">
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
            <span v-else>{{ selectedTemplateId ? 'Aktualizuj szablon' : 'Zapisz szablon' }}</span>
          </button>

          <button 
            v-if="selectedTemplateId"
            class="btn btn-danger"
            :disabled="saving"
            @click="toggleTemplateDeleteConfirm($event)"
          >
            Usuń szablon
          </button>
          
          <!-- Template delete confirmation popup -->
          <div 
            v-if="showTemplateDeleteConfirmation" 
            class="delete-popup template-delete-popup"
            :style="templateDeletePopupStyle"
          >
            <div class="popup-content">
              <p>Usunąć szablon?</p>
              <div class="popup-actions">
                <button class="popup-btn cancel" @click="cancelTemplateDelete">Nie</button>
                <button class="popup-btn confirm" @click="confirmTemplateDelete">Tak</button>
              </div>
            </div>
          </div>

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
      templates: [],
      selectedTemplateId: '',
      templateName: '',
      
      // Questions data
      questions: [],
      questionCounter: 0,
      
      // Modal state
      showDeleteConfirmation: false,
      questionToDelete: null,
      deleteIndex: -1,
      deletePopupStyle: {},
      
      // Template deletion popup state
      showTemplateDeleteConfirmation: false,
      templateDeletePopupStyle: {}
    };
  },
  
  computed: {
    isValidTemplate() {
      return this.templateName.trim().length > 0 && 
             this.questions.length > 0 && 
             this.questions.every(q => q.text.trim().length > 0);
    },
    
    isPromoter() {
      return authStore && authStore.isPromoter === true;
    }
  },
  
  created() {
    this.$nextTick(() => {
      // Check if user is promoter
      if (!this.isPromoter) {
        this.$router.push({ name: 'Home' });
        return;
      }
      
      this.loadTemplates();
    });
  },
  
  methods: {
    async loadTemplates() {
      this.loading = true;
      try {
        // TODO: Replace with actual API call when backend is ready
        // const response = await axios.get('/api/v1/checklist/templates');
        // this.templates = response.data;
        
        // Mock data for now
        this.templates = [
          {
            id: 1,
            name: 'Szablon podstawowy',
            questions: [
              { id: 1, text: 'Student nadał tytuł pracy' },
              { id: 2, text: 'Praca zawiera wprowadzenie' }
            ]
          }
        ];
        
        this.loading = false;
      } catch (error) {
        console.error('Error loading templates:', error);
        this.errorMessage = 'Nie udało się załadować szablonów checklist.';
        this.loading = false;
      }
    },
    
    loadTemplate() {
      if (!this.selectedTemplateId) {
        this.clearTemplate();
        return;
      }
      
      const template = this.templates.find(t => t.id == this.selectedTemplateId);
      if (template) {
        this.templateName = template.name;
        this.questions = template.questions.map(q => ({ ...q }));
        this.questionCounter = Math.max(...this.questions.map(q => q.id || 0), 0);
      }
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
        const templateData = {
          id: this.selectedTemplateId || null,
          name: this.templateName.trim(),
          questions: this.questions.map((q, index) => ({
            id: q.id,
            text: q.text.trim(),
            order: index + 1
          }))
        };
        
        // TODO: Replace with actual API call when backend is ready
        // if (this.selectedTemplateId) {
        //   await axios.put(`/api/v1/checklist/templates/${this.selectedTemplateId}`, templateData);
        // } else {
        //   const response = await axios.post('/api/v1/checklist/templates', templateData);
        //   this.selectedTemplateId = response.data.id;
        // }
        
        console.log('Template data to save:', templateData);
        
        this.successMessage = this.selectedTemplateId ? 
          'Szablon został zaktualizowany!' : 
          'Szablon został zapisany!';
        
        // Simulate successful save
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        
        await this.loadTemplates();
        
      } catch (error) {
        console.error('Error saving template:', error);
        this.errorMessage = 'Nie udało się zapisać szablonu checklist.';
      } finally {
        this.saving = false;
      }
    },
    
    async deleteTemplate() {
      if (!this.selectedTemplateId) return;
      
      this.saving = true;
      try {
        // TODO: Replace with actual API call when backend is ready
        // await axios.delete(`/api/v1/checklist/templates/${this.selectedTemplateId}`);
        
        console.log('Deleting template:', this.selectedTemplateId);
        
        this.successMessage = 'Szablon został usunięty!';
        this.clearTemplate();
        await this.loadTemplates();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        
      } catch (error) {
        console.error('Error deleting template:', error);
        this.errorMessage = 'Nie udało się usunąć szablonu.';
      } finally {
        this.saving = false;
      }
    },
    
    clearTemplate() {
      this.selectedTemplateId = '';
      this.templateName = '';
      this.questions = [];
      this.questionCounter = 0;
    }
  }
};
</script>