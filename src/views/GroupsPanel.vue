<script setup>
import { ref } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

</script>


<template>
  <div class="groups-container">
    <div class="page-header">
      <h1 class="page-title">Grupy projektowe</h1>
      <button v-if="isPromoter" class="reload-groups-btn" @click="reloadGroups">
        <i class="icon-reload"></i> Odśwież grupy
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <input type="text" class="search-input" placeholder="Przeszukaj grupy..." v-model="searchTerm">
      </div>
      <div class="filter-group">
        <select class="filter-select" v-model="selectedSupervisor">
          <option value="">Wszyscy promotorzy</option>
          <option v-for="supervisor in supervisors" :key="supervisor" :value="supervisor">
            {{ supervisor }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading groups -->
    <div v-if="loading" class="loading-state">
      <p>Ładowanie grup projektów...</p>
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="error-state">
      <p class="error-message">{{ errorMessage }}</p>
      <button class="retry-btn" @click="fetchGroups">Spróbuj ponownie</button>
    </div>
    
    <!-- Success Message -->
    <div v-if="successMessage" class="success-state">
      <p class="success-message">{{ successMessage }}</p>
    </div>

    <!-- Group table -->
    <div v-else class="table-container">
      <table class="groups-table">
        <thead>
          <tr>
            <th class="sortable" @click="sortBy('name')">
              Nazwa Grupy
              <span class="sort-indicator" :class="getSortClass('name')"></span>
            </th>
            <th class="sortable" @click="sortBy('supervisor')">
              Promotor
              <span class="sort-indicator" :class="getSortClass('supervisor')"></span>
            </th>
            <th class="status-align">Status pracy</th>
            <th class="sortable" @click="sortBy('defenseDate')">
              Data Obrony
              <span class="sort-indicator" :class="getSortClass('defenseDate')"></span>
            </th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in filteredGroups" :key="group.project_id" 
              class="group-row" 
              :class="{
                'user-group': isUserInGroup(group), 
                'restricted-group': !isUserInGroup(group) && !isPromoter,
                'supervisor-group': isPromoter && isGroupSupervisor(group)
              }"
              @click="selectGroup(group)">
            <td class="group-name">
              <div class="name-cell">
                <span class="project-name">{{ group.name }}</span>
                <span v-if="isUserInGroup(group) && !isPromoter" class="member-badge">Twoja grupa</span>
                <span v-if="isPromoter && isGroupSupervisor(group)" class="supervisor-badge">Twoja grupa</span>
              </div>
            </td>
            <td class="supervisor-cell">
              <span class="supervisor-name">{{ group.supervisor.lname || 'Nieprzypisany' }}</span>
            </td>
            <td class="status-cell">
              <span class="status-badge" :class="getThesisStatusClass(group)">
                {{ getThesisStatusText(group) }}
              </span>
            </td>
            <td class="status-cell">
              <span class="supervisor-name">{{group.defence_date || 'Nieprzypisana' }}</span>
            </td>
            <td class="actions-cell">
              <div class="action-buttons">
                <button class="action-btn primary" 
                        @click.stop="viewGroup(group)"
                        :disabled="!isUserInGroup(group) && !isPromoter"
                        :class="{'disabled-btn': !isUserInGroup(group) && !isPromoter}">
                  <i class="icon-eye"></i>
                  {{ isUserInGroup(group) || isPromoter ? (isThesisAccepted(group) ? 'Rozdziały' : 'Praca dyplomowa') : 'Brak dostępu' }}
                </button>

                <button v-if="isThesisAccepted(group) && (isUserInGroup(group) || isPromoter)"
                        class="action-btn primary"
                        @click.stop="viewTimeline(group)"
                        :disabled="!isGroupSupervisor(group) && isPromoter"
                        :class="{'disabled-btn': !isGroupSupervisor(group) && isPromoter}">
                  <i class="icon-eye"></i>
                  {{ (isUserInGroup(group) || isPromoter) && isThesisAccepted(group) ? 'Oś czasu' : 'Brak dostępu' }}
                </button>

                <button v-if="isPromoter && isThesisAccepted(group) && !isGroupSupervisor(group)"
                        class="action-btn secondary copy-btn disabled-btn"
                        disabled
                        title="Możesz edytować tylko grupy, których jesteś promotorem">
                  <i class="icon-copy"></i>
                  Kopiuj elementy
                </button>

                <button v-if="isPromoter && isThesisAccepted(group) && isGroupSupervisor(group)"
                        class="action-btn secondary copy-btn"
                        @click.stop="viewThesisDetails(group)">
                  <i class="icon-copy"></i>
                  Kopiuj elementy
                </button>

                <button v-if="isThesisAccepted(group) && (isUserInGroup(group) || isPromoter)"
                        class="action-btn primary"
                        @click.stop="showThesisDefenseModal(group)"
                        :disabled="!isGroupSupervisor(group) && isPromoter"
                        :class="{'disabled-btn': !isGroupSupervisor(group) && isPromoter}">
                  <i class="icon-timeline"></i>
                  {{ (isUserInGroup(group) || isPromoter) && isThesisAccepted(group) ? 'Ustal termin obrony' : 'Brak dostępu' }}
                </button>

                <button v-if="isPromoter && isThesisAccepted(group) && isGroupSupervisor(group)"
                        class="action-btn secondary"
                        @click.stop="openGradeModal(group)">
                  <i class="icon-grade"></i>
                  Dodaj ocenę opisową
                </button>

              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div v-if="filteredGroups.length === 0" class="empty-state">
        <p>Nie znaleziono grup projektów powiązanych z twoim wyszukaniem.</p>
      </div>
    </div>
  </div>

  <!-- AI generated -->
  <div class="modal fade" id="defenseDateModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Ustal termin obrony</h5>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Wybierz datę:</label>
            <VueDatePicker
                v-model="date"
                :min-date="new Date()"
                :formats="{ input: 'dd.MM.yyyy - HH:mm', preview: 'dd.MM.yyyy - HH:mm' }"/>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Zamknij</button>
          <button type="button" class="btn btn-primary" @click="saveDefenseDate(selectedGroup)">Zapisz</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Grade Modal -->
  <div class="modal fade" id="gradeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Dodaj ocenę opisową - {{ selectedGroup?.name }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-info mb-3">
            <i class="icon-info"></i> <strong>Uwaga:</strong> Ocena opisowa nie jest widoczna dla studentów.
          </div>
          <div class="mb-3">
            <label for="gradeDescription" class="form-label">Opis oceny:</label>
            <textarea
                id="gradeDescription"
                class="form-control"
                v-model="gradeDescription"
                rows="8"
                placeholder="Wprowadź ocenę opisową pracy dyplomowej..."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <p class="me-auto mb-0 grade-modal-message" :class="[gradeModalError ? 'error-message' : 'success-message', { 'invisible': !gradeModalMessage }]">
            {{ gradeModalMessage || 'placeholder' }}
          </p>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
          <button type="button" class="btn btn-primary" @click="saveGrade">Zapisz</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import authStore from '/src/stores/authStore.js';
import { Modal } from 'bootstrap';
import '../css/GroupsPanel.css';

export default {
  name: 'GroupsPanel',
  data() {
    return {
      groups: [],
      loading: false,
      errorMessage: '',
      successMessage: '',
      searchTerm: '',
      selectedSupervisor: '',
      sortField: 'name',
      sortDirection: 'asc',
      userGroups: [], 
      userId: authStore.userId,
      isPromoter: authStore.isPromoter,
      selectedGroup: null,
      gradeDescription: '',
      gradeModal: null,
      gradeModalMessage: '',
      gradeModalError: false,
      date: null
    };
  },
  computed: {
    supervisors() {
      const supervisors = new Set();
      this.groups.forEach(group => {
        if (group.supervisor && group.supervisor.lname) {
          supervisors.add(group.supervisor.lname);
        }
      });
      return Array.from(supervisors).sort();
    },
    filteredGroups() {
      let filtered = this.groups.filter(group => !!group.project_id);

      // Search term
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(group => 
          group.name.toLowerCase().includes(term) ||
          (group.supervisor && group.supervisor.lname && group.supervisor.lname.toLowerCase().includes(term))
        );
      }

      // Promoter filter
      if (this.selectedSupervisor) {
        filtered = filtered.filter(group => 
          group.supervisor && group.supervisor.lname === this.selectedSupervisor
        );
      }

      return filtered;
    },
    visibleColumnsCount() {
      return 3;
    },
    totalItems() {
      return this.filteredGroups.length;
    },
  },
  async created() {
    await this.fetchGroups();
  },
   methods: {
    async fetchGroups() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        const response = await axios.get('/api/v1/view/groups/all');
        
        console.log('Groups API response:', response.data);
        
        let processedGroups = [];
        if (response.data && Array.isArray(response.data.dtos)) {
          processedGroups = response.data.dtos;
        } else if (response.data && Array.isArray(response.data)) {
          processedGroups = response.data;
        } else {
          console.warn('Unexpected response format:', response.data);
          processedGroups = [];
        }
        this.groups = await this.fetchThesisStatuses(processedGroups);
        //this.groups = await this.fetchDefenceDates(processedGroups);
        if (!this.isPromoter && this.userId) {
          this.extractUserGroupsFromData();
        }
        
        console.log('Processed groups with thesis status:', this.groups);
      } catch (error) {
        console.error('Error fetching groups:', error);
        this.errorMessage = 'Nie udało się pobrać grup projektów: ' + (error.response?.data?.message || error.message);
        this.groups = [];
      } finally {
        this.loading = false;
      }
    },
    async fetchDefenceDates(groups){
      try {
        const groupsWithDefenceDates = await Promise.all(groups.map(async (group) => {
          if (!group.project_id) {
            return group;
          }
        }));
        try {
          const response = await axios.get(`/api/v1/chapter/getDefence/${group.project_id}`);

          console.log(`Defence date for group ${group.name}:`, response.data);

          return {
            ...group,
            defence_date: response.data.date || 'PENDING'
          };
        }
        catch (error) {
          console.error('Error fetching dates:', error);
        }
      }
      catch(error){
        console.error('Error fetching groups:', error);
      }
    },
    
    async fetchThesisStatuses(groups) {
      try {
        const groupsWithStatus = await Promise.all(groups.map(async (group) => {
          if (group.thesis_status || group.isThesisAccepted || group.thesisAccepted) {
            return group;
          }
          
          if (!group.project_id) {
            return group;
          }
          
          try {
            const response = await axios.get(`/api/v1/thesis/byProjectId/${group.project_id}`);
            
            console.log(`Thesis status for group ${group.name}:`, response.data);
            
            return {
              ...group,
              thesis_id: response.data.id,
              thesis_status: response.data.approval_status || response.data.status || 'PENDING'
            };
          } catch (error) {
            console.warn(`Could not fetch thesis status for group ${group.name}:`, error);
            return {
              ...group,
              thesis_status: 'PENDING',
              thesis_error: true
            };
          }
        }));
        
        return groupsWithStatus;
      } catch (error) {
        console.error('Error fetching thesis statuses:', error);
        return groups; 
      }
    },
 
    async fetchUserGroups() {
      this.extractUserGroupsFromData();
    },

    extractUserGroupsFromData() {
      try {
        if (!this.userId) return;
        
        console.log('Extracting user group membership from groups data');
        const userGroupIds = this.groups
          .filter(group => 
            group.students && Array.isArray(group.students) && 
            group.students.some(student => student.id === this.userId)
          )
          .map(group => group.project_id);
        
        this.userGroups = userGroupIds;
        console.log('User belongs to groups with IDs:', this.userGroups);
      } catch (error) {
        console.error('Error extracting user groups:', error);
        this.userGroups = [];
      }
    },
    
    isUserInGroup(group) {
      if (this.isPromoter) return true;
      
      const groupId = group.project_id;
      return this.userGroups.includes(groupId);
    },
    
    isGroupSupervisor(group) {
      if (!this.isPromoter || !group || !group.supervisor) {
        return false;
      }
      
      // Check if the current user (promoter) is the supervisor of this group
      return group.supervisor.id === Number(authStore.userId);
    },
    
    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
    },
    
    getSortClass(field) {
      if (this.sortField !== field) return '';
      return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
    },

    selectGroup(group) {
      // Only handle clicks for groups the user has access to
      if (this.isPromoter || this.isUserInGroup(group)) {
        console.log('Selected group:', group);
      }
    },
    getSupervisorName(supervisor) {
      if (!supervisor) return 'Nieprzypisany';
      
      const firstName = supervisor.fName || supervisor.fname || '';
      const lastName = supervisor.lName || supervisor.lname || '';
      
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      } else if (firstName || lastName) {
        return firstName || lastName;
      } else {
        return 'Nieprzypisany';
      }
    },
    
    async viewGroup(group) {
      if (!group || !group.project_id) {
        console.error('Cannot view group: Invalid project_id', group);
        return;
      }

      if (!this.isPromoter && !this.isUserInGroup(group)) {
        console.warn('Student attempted to access a group they are not a member of:', group.project_id);
        this.errorMessage = 'Brak dostępu do pracy i rozdziałów tej grupy. Możesz przeglądać tylko grupy, których jesteś członkiem.';
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
        return;
      }

      try {
        const refreshedGroup = await this.refreshThesisStatus(group);
        group = refreshedGroup || group;
      } catch (error) {
        console.warn('Failed to refresh thesis status:', error);
      }
      
      console.log('Navigating to group with project_id:', group.project_id);
      console.log('Group details:', {
        name: group.name,
        thesis_status: group.thesis_status,
        isThesisAccepted: this.isThesisAccepted(group)
      });
      
      const isThesisAccepted = this.isThesisAccepted(group);
      const isSupervisor = this.isGroupSupervisor(group);
      console.log('Is thesis accepted:', isThesisAccepted, 'Redirecting to:', isThesisAccepted ? 'ChaptersPreview' : 'Thesis');
      console.log('Is current promoter the supervisor:', isSupervisor);
      
      if (isThesisAccepted) {
        this.$router.push({ 
          name: 'ChaptersPreview', 
          params: { id: group.project_id.toString() },
          query: { 
            name: group.name || 'Unknown Group'
          }
        });
      } else {
        this.$router.push({ 
          name: 'Thesis', 
          params: { groupId: group.project_id.toString() },
          query: { 
            name: group.name || 'Unknown Group'
          }
        });
      }
    },
    async viewTimeline(group) {
      if (!group || !group.project_id) {
        console.error('Cannot view group: Invalid project_id', group);
        return;
      }

      if (!this.isPromoter && !this.isUserInGroup(group)) {
        console.warn('Student attempted to access a timeline they are not a member of:', group.project_id);
        this.errorMessage = 'Brak dostępu do podglądu timelineu tej grupy. Możesz przeglądać tylko grupy, których jesteś członkiem.';
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
        return;
      }

      console.log('Navigating to timeline with project_id:', group.project_id);
      console.log('Group details:', {
        name: group.name,
        thesis_status: group.thesis_status,
        isThesisAccepted: this.isThesisAccepted(group)
      });

      const isThesisAccepted = this.isThesisAccepted(group);
      const isSupervisor = this.isGroupSupervisor(group);
      console.log('Is thesis accepted:', isThesisAccepted);
      console.log('Is current promoter the supervisor:', isSupervisor);

      if (isThesisAccepted) {
        try {
          const response = await axios.get(`/api/v1/thesis/byProjectId/${group.project_id}`);
          const thesisId = response.data.id;
          
          if (!thesisId) {
            console.error('No thesis ID found for project ID:', group.project_id);
            this.errorMessage = 'Nie udało się znaleźć pracy dyplomowej dla tej grupy.';
            setTimeout(() => {
              this.errorMessage = '';
            }, 5000);
            return;
          }
          
          console.log('Retrieved thesis ID:', thesisId, 'for project ID:', group.project_id);

          this.$router.push({
            name: 'Timeline',
            params: { thesisId: thesisId.toString() },
            query: { 
              name: group.name || 'Unknown Group',
              isSupervisor: isSupervisor.toString()
            }
          });
        } catch (error) {
          console.error('Error fetching thesis ID:', error);
          this.errorMessage = 'Nie udało się pobrać danych pracy dyplomowej.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      }
    },


    showThesisDefenseModal(group) {
      this.selectedGroup = group;
      const modal = new Modal(document.getElementById('defenseDateModal'));
      modal.show();
    },
    
    async openGradeModal(group) {
      this.selectedGroup = group;
      this.gradeDescription = '';
      this.gradeModalMessage = '';
      this.gradeModalError = false;
      
      // Get existing review if available
      if (group.thesis_id) {
        try {
          console.log('Fetching review for thesis_id:', group.thesis_id);
          const response = await axios.get(`/api/v1/thesis/${group.thesis_id}/review`);
          console.log('Review response:', response.data);
          if (response.data && response.data.review) {
            this.gradeDescription = response.data.review;
            console.log('Loaded review content:', this.gradeDescription);
          } else {
            console.log('No review in response');
          }
        } catch (error) {
          if (error.response && error.response.status !== 404) {
            console.error('Błąd podczas pobierania oceny opisowej:', error);
          } else {
            console.log('No review found (404)');
          }
        }
      } else {
        console.warn('No thesis_id for group:', group.name);
      }

      if (!this.gradeModal) {
        this.gradeModal = new Modal(document.getElementById('gradeModal'));
      }
      this.gradeModal.show();
    },
    
    async saveGrade() {
      if (!this.selectedGroup) {
        return;
      }
      
      if (!this.gradeDescription.trim()) {
        this.gradeModalMessage = 'Opis oceny nie może być pusty.';
        this.gradeModalError = true;
        setTimeout(() => {
          this.gradeModalMessage = '';
        }, 3000);
        return;
      }
      
      if (!this.selectedGroup.thesis_id) {
        this.gradeModalMessage = 'Brak ID pracy dyplomowej.';
        this.gradeModalError = true;
        setTimeout(() => {
          this.gradeModalMessage = '';
        }, 3000);
        return;
      }
      
      try {
        console.log('Saving review for thesis_id:', this.selectedGroup.thesis_id);
        console.log('Review content:', this.gradeDescription);
        
        await axios.put(`/api/v1/thesis/${this.selectedGroup.thesis_id}/review`, {
          review_content: this.gradeDescription
        });
        
        console.log('Review saved successfully');
        
        this.gradeModalMessage = 'Ocena opisowa została zapisana.';
        this.gradeModalError = false;
        setTimeout(() => {
          this.gradeModalMessage = '';
        }, 3000);
      } catch (error) {
        console.error('Błąd podczas zapisywania oceny opisowej:', error);
        console.error('Error response:', error.response?.data);
        this.gradeModalMessage = 'Nie udało się zapisać oceny opisowej.';
        this.gradeModalError = true;
        setTimeout(() => {
          this.gradeModalMessage = '';
        }, 5000);
      }
    },
    
    async saveDefenseDate(group) {
      console.log('Saving defense date for group:', group.project_id);

      if (!this.isPromoter || !group || !group.project_id) {
        return;
      }

      // Check if the current promoter is the supervisor of this group
      if (!this.isGroupSupervisor(group)) {
        console.warn('Promoter attempted to access thesis details of a group they are not supervising:', group.project_id);
        this.errorMessage = 'Możesz edytować tylko grupy, których jesteś promotorem.';
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
        return;
      }
      //adjust date format
      const adjustedDate = new Date(this.date);
      if (this.date) {
        //May be off by an hour (timezone)
        adjustedDate.setHours(adjustedDate.getHours() + 1);
        console.log('Formatted date:', adjustedDate.toISOString());
      }
      try {
        const url = `/api/v1/chapter/addDefence`;
        console.log('Request URL:', url);
        const response = await axios.post(url, {
          chapter_id: group.project_id,
          date: adjustedDate.toISOString(),
          comment: 'test'
        });
        console.log('Response data:', response.data);
        console.log('FormData contains:', {
          chapter_id: group.project_id,
          date: adjustedDate.toISOString(),
          comment: 'test'
        });
        // Refresh the groups list to show the updated defense date
        await this.fetchGroups();

      } catch (error) {
        console.error('Error saving defense date:', error);
        this.errorMessage = 'Wystąpił błąd podczas zapisywania daty obrony: ' +
            (error.response?.data?.message || error.message);
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    },
    isThesisAccepted(group) {
      console.log('Checking thesis acceptance for group:', group.name, 'Status:', group.thesis_status);
      
      return group.thesis_status === 'APPROVED';
    },
    
    getThesisStatusText(group) {
      if (this.isThesisAccepted(group)) {
        return 'Zaakceptowana';
      } else if (group.thesis_status === 'REJECTED' || group.thesis_status === 'rejected') {
        return 'Odrzucona';
      } else if (group.thesis_status === 'SUBMITTED' || group.thesis_status === 'submitted') {
        return 'Złożona';
      } else {
        return 'Oczekująca';
      }
    },
    
    getThesisStatusClass(group) {
      if (this.isThesisAccepted(group)) {
        return 'status-accepted';
      } else if (group.thesis_status === 'REJECTED' || group.thesis_status === 'rejected') {
        return 'status-rejected';
      } else if (group.thesis_status === 'SUBMITTED' || group.thesis_status === 'submitted') {
        return 'status-submitted';
      } else {
        return 'status-pending';
      }
    },
    
    async refreshThesisStatus(group) {
      if (!group || !group.project_id) {
        console.error('Cannot refresh thesis status: Invalid project_id', group);
        return group;
      }
      
      try {
        const response = await axios.get(`/api/v1/thesis/byProjectId/${group.project_id}`);
        console.log('Refreshed thesis status:', response.data);
        
        return {
          ...group,
          thesis_status: response.data.approval_status || response.data.status || 'PENDING'
        };
      } catch (error) {
        console.error('Error refreshing thesis status:', error);
        return group;
      }
    },
  
    async submitThesis(thesisData) {
      try {
        const response = await axios.post('/api/v1/thesis/submit', thesisData);
        console.log('Thesis submitted successfully:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error submitting thesis:', error);
        throw error;
      }
    },

    async updateThesisStatus(thesisId, projectId, newStatus) {
      try {
        const response = await axios.post('/api/v1/thesis/status/update', {
          thesis_id: thesisId,
          project_id: projectId,
          status: newStatus
        });
        console.log('Thesis status updated successfully:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error updating thesis status:', error);
        throw error;
      }
    },
    
    viewThesisDetails(group) {
      if (!this.isPromoter || !group || !group.project_id) {
        return;
      }
      
      // Check if the current promoter is the supervisor of this group
      if (!this.isGroupSupervisor(group)) {
        console.warn('Promoter attempted to access thesis details of a group they are not supervising:', group.project_id);
        this.errorMessage = 'Możesz edytować tylko grupy, których jesteś promotorem.';
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
        return;
      }
      
      console.log('Navigating to thesis details view for group:', group.name);
      this.$router.push({ 
        name: 'ThesisCopy', 
        params: { groupId: group.project_id.toString() }
      });
    },
    
    async reloadGroups() {
      if (!this.isPromoter) {
        return;
      }
      
      try {
        this.loading = true;
        this.errorMessage = ''; 
        
        const supervisorId = authStore.userId;
        
        if (!supervisorId) {
          throw new Error('Brak ID promotora. Zaloguj się ponownie.');
        }

        const response = await axios.post('/api/v1/reloadGroups', {
          supervisord_user_data_id: supervisorId
        });
        
        console.log('Groups reload response:', response.data);
        
        this.successMessage = 'Grupy zostały odświeżone pomyślnie. Wszystkie prace i rozdziały zostały wyczyszczone.';
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
        
        await this.fetchGroups();
        
      } catch (error) {
        console.error('Error reloading groups:', error);
        this.errorMessage = 'Nie udało się odświeżyć grup: ' + (error.response?.data?.message || error.message);
      } finally {
        this.loading = false;
      }
    }
  }
};


</script>

<style scoped src="../css/GroupsPanel.css"></style>