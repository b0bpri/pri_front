<template>
  <div class="wrapper">
    <div class="card">
      <div class="header-container">
        <h2 class="title">Przegląd rozdziałów - {{ groupName }}</h2>
        <button v-if="isPromoter" class="back-btn" @click="goBack">
          <i class="icon-back"></i> Powrót
        </button>
        <div style="position: absolute; top: 1rem; right: 1rem; z-index: 1000; display: flex; gap: 0.5rem;">
          <ToggleTextBox
              content="This is what the page is for."
          />
        </div>
      </div>

      <div class="subheader-container" style="position: relative;"> <!-- Contains the thesis title -->
        <h3 class="subtitle">Tytuł pracy: {{ thesisTitle }}</h3>
        <h6 class="subtitle">Tytuł &#127468;&#127463: {{ thesisTitleEng }}</h6>
        <h3 v-if="chapterTitle" class="subtitle">Tytuł chapteru: {{ chapterTitle }}</h3>
        <h6 v-if="chapterTitleEng" class="subtitle">Tytuł &#127468;&#127463: {{ chapterTitleEng }}</h6>
        <button class="thesis-checklist-btn" @click="goToThesisChecklist" title="Checklista dla całej pracy">
          <i class="icon-checklist"></i> Checklista dla całej pracy
        </button>
      </div>

      <!-- Dropdown: Student's list for promoter -->
      <div class="student-selector" v-if="isPromoter">
        <strong class="form-label">Student z grupy {{ groupName }}:</strong>
        <select v-model="selectedStudentId" class="dropdown-content" @change="fetchStudentFiles">
          <option disabled value="">-- wybierz --</option>
          <option v-for="student in students" :key="student.id" :value="student.id">{{ getStudentDisplayName(student) }}</option>
        </select>
      </div>

      <!-- Upload -->

      <div class="upload-section" style="position: relative;">
        <h3>Prześlij materiały</h3>
        <div style="position: absolute; top: 0.5rem; right: 0.5rem; display: flex; gap: 0.5rem;">
          <ToggleTextBox
              content="Information about sending files."
          />
        </div>
        <!-- Information message for promoters who are not supervisors -->
        <div v-if="isPromoter && !isSupervisor" class="warning-message">
          <p>Nie jesteś promotorem tej grupy. Możesz przeglądać pliki, ale nie możesz przesyłać nowych plików ani komentować.</p>
        </div>

        <!-- OneNote/File for promoter -->
        <div v-if="isPromoter && isSupervisor" class="upload-toggle">
          <label class="toggle-option" :class="{ 'active-file': !isLinkMode }">
            <input type="radio" v-model="isLinkMode" :value="false">
            Plik
          </label>
          <label class="toggle-option" :class="{ 'active-onenote': isLinkMode }">
            <input type="radio" v-model="isLinkMode" :value="true">
            Link OneNote
          </label>
        </div>
        <!-- Sending File -->
        <div v-if="(!isPromoter || isSupervisor) && !isLinkMode">
          <input type="file" class="file-input" ref="fileInput" @change="handleFileChange" />
          <div class="upload-buttons">
            <button
                class="btn btn-primary file-btn"
                :disabled="!selectedFile || (isPromoter && !selectedStudentId)"
                @click="uploadFile"
            >
              Wyślij plik
            </button>
            <button
                v-if="!isPromoter"
                class="btn btn-secondary multi-author-btn"
                :disabled="!selectedFile"
                @click="openMultiAuthorModal"
            >
              Wyślij pracę wieloautorską
            </button>
            <button
                v-if="isPromoter && isSupervisor"
                class="btn btn-secondary multi-author-btn"
                :disabled="!selectedFile"
                @click="openPromoterMultiAuthorModal"
            >
              Wyślij plik wieloautorski
            </button>
          </div>
        </div>        <!-- OneNote link  -->
        <div v-if="isLinkMode && isPromoter && isSupervisor" class="link-input-container">
          <input
              type="text"
              class="link-input"
              v-model="oneNoteLink"
              placeholder="Wklej link do OneNote"
          />
          <div class="upload-buttons">
            <button
                class="btn btn-primary onenote-btn"
                :disabled="!oneNoteLink || !selectedStudentId"
                @click="shareOneNoteLink"
            >
              Udostępnij link
            </button>
            <button
                class="btn btn-secondary multi-author-btn"
                :disabled="!oneNoteLink"
                @click="openPromoterMultiAuthorLinkModal"
            >
              Udostępnij link wieloautorski
            </button>
          </div>
        </div>

      </div>

      <!-- Files table -->
      <table class="table" v-if="displayFiles.length > 0">
        <thead>
        <tr>
          <th>Wysłane przez</th>
          <th>Nazwa pliku</th>
          <th>Data przesłania</th>
          <th>Akcje
            <div style="position: relative; margin-top: -1.8rem; font-weight: normal;">
              <ToggleTextBox
                  content="Information about the table and its actions."

              />
            </div>
          </th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(file, index) in displayFiles" :key="index" :class="index % 2 === 0 ? 'row-light' : ''">
          <td>{{ file.senderName || 'Nieznany' }}</td>
          <td>{{ getDisplayName(file) }}</td>
          <td>{{ formatDate(file.uploadedAt) }}</td>
          <td class="actions-cell">
            <button class="action-btn preview-btn" @click="previewFile(file)">
              Podgląd
            </button>
            <button v-if="isUploadedByPromoter(file)" class="action-btn checklist-btn" @click="goToFileChecklist(file)">
              Checklista
            </button>
            <button class="action-btn comment-btn" @click="openCommentModal(file)">
              Komentarz
            </button>
          </td>
        </tr>
        </tbody>
      </table>

      <!-- No data -->
      <p v-else-if="isPromoter && selectedStudentId">Brak przesłanych plików dla wybranego studenta.</p>
      <p v-else-if="!isPromoter">Brak przesłanych plików.</p>
      <p v-else>Wybierz studenta, aby zobaczyć pliki.</p>
    </div>

    <!-- Promoter comments modal -->
    <div class="modal" v-if="showCommentModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Komentarz do pliku: {{ selectedFileForComment ? selectedFileForComment.name : '' }}</h3>
          <button class="modal-close" @click="closeCommentModal">&times;</button>
        </div>
        <div class="modal-body">
          <textarea
              class="comment-textarea"
              v-model="fileComment"
              :readonly="!isPromoter"
              :placeholder="isPromoter ? 'Wpisz komentarz lub link do OneNote...' : 'Brak komentarza od promotora'"
          ></textarea>

          <div v-if="isPromoter">
            <p class="hint-text">Możesz dodać link do OneNote lub bezpośredni komentarz do pliku.</p>
          </div>

          <div v-if="fileComment && fileComment.includes('http')">
            <a :href="extractUrl(fileComment)" target="_blank" class="onenote-link">
              Otwórz link do notatki
            </a>
          </div>

          <div class="modal-footer">
            <p v-if="commentSuccess" class="success-message">Komentarz zapisany pomyślnie!</p>
            <button v-if="isPromoter && isSupervisor" class="btn btn-primary" @click="saveComment">Zapisz komentarz</button>
            <button class="btn btn-secondary" @click="closeCommentModal">Zamknij</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Multi author selection modal -->
    <div class="modal" v-if="showMultiAuthorModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Wybierz współautorów pracy</h3>
          <button class="modal-close" @click="closeMultiAuthorModal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="info-text">
            Wybierz członków grupy, z którymi chcesz przesłać ten plik.
          </p>

          <div v-if="loadingGroupMembers" class="loading-text">
            Ładowanie członków grupy...
          </div>

          <div v-else-if="groupMembers.length === 0" class="error-text">
            Nie znaleziono innych członków grupy.
          </div>

          <div v-else class="group-members-list">
            <div
                v-for="member in groupMembers"
                :key="member.id"
                class="member-item"
            >
              <label class="member-checkbox">
                <input
                    type="checkbox"
                    :value="member.id"
                    v-model="selectedCoAuthors"
                    :disabled="member.id === userId"
                />
                <span class="member-name">
                  {{ getStudentDisplayName(member) }}
                  <span v-if="member.id === userId" class="current-user-label">(Ty)</span>
                </span>
              </label>
            </div>
          </div>

          <div v-if="selectedCoAuthors.length === 0" class="validation-error">
            Musisz wybrać co najmniej jednego współautora.
          </div>

          <div class="modal-footer">
            <button
                class="btn btn-primary"
                :disabled="selectedCoAuthors.length === 0 || loadingGroupMembers"
                @click="uploadMultiAuthorFile"
            >
              Wyślij plik wieloautorski
            </button>
            <button class="btn btn-secondary" @click="closeMultiAuthorModal">Anuluj</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dla wyboru studentów przez promotora - plik -->
    <div class="modal" v-if="showPromoterMultiAuthorModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Wybierz studentów do wysłania pliku</h3>
          <button class="modal-close" @click="closePromoterMultiAuthorModal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="info-text">
            Wybierz studentów z grupy, którym chcesz przesłać ten plik.
          </p>

          <div v-if="loadingGroupMembers" class="loading-text">
            Ładowanie studentów...
          </div>

          <div v-else-if="students.length === 0" class="error-text">
            Nie znaleziono studentów w tej grupie.
          </div>

          <div v-else class="group-members-list">
            <div
                v-for="student in students"
                :key="student.id"
                class="member-item"
            >
              <label class="member-checkbox">
                <input
                    type="checkbox"
                    :value="student.id"
                    v-model="promoterSelectedStudents"
                />
                <span class="member-name">
                  {{ getStudentDisplayName(student) }}
                </span>
              </label>
            </div>
          </div>

          <div v-if="promoterSelectedStudents.length === 0" class="validation-error">
            Musisz wybrać co najmniej jednego studenta.
          </div>

          <div class="modal-footer">
            <button
                class="btn btn-primary"
                :disabled="promoterSelectedStudents.length === 0 || loadingGroupMembers"
                @click="uploadPromoterMultiAuthorFile"
            >
              Wyślij plik wieloautorski
            </button>
            <button class="btn btn-secondary" @click="closePromoterMultiAuthorModal">Anuluj</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dla wyboru studentów przez promotora - OneNote link -->
    <div class="modal" v-if="showPromoterMultiAuthorLinkModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Wybierz studentów do udostępnienia linku</h3>
          <button class="modal-close" @click="closePromoterMultiAuthorLinkModal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="info-text">
            Wybierz studentów z grupy, którym chcesz udostępnić link OneNote.
          </p>

          <div v-if="loadingGroupMembers" class="loading-text">
            Ładowanie studentów...
          </div>

          <div v-else-if="students.length === 0" class="error-text">
            Nie znaleziono studentów w tej grupie.
          </div>

          <div v-else class="group-members-list">
            <div
                v-for="student in students"
                :key="student.id"
                class="member-item"
            >
              <label class="member-checkbox">
                <input
                    type="checkbox"
                    :value="student.id"
                    v-model="promoterSelectedStudents"
                />
                <span class="member-name">
                  {{ getStudentDisplayName(student) }}
                </span>
              </label>
            </div>
          </div>

          <div v-if="promoterSelectedStudents.length === 0" class="validation-error">
            Musisz wybrać co najmniej jednego studenta.
          </div>

          <div class="modal-footer">
            <button
                class="btn btn-primary"
                :disabled="promoterSelectedStudents.length === 0 || loadingGroupMembers"
                @click="sharePromoterMultiAuthorLink"
            >
              Udostępnij link wieloautorski
            </button>
            <button class="btn btn-secondary" @click="closePromoterMultiAuthorLinkModal">Anuluj</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import authStore from '/src/stores/authStore.js';
import { pushNotification, pushPromiseNotification } from '/src/components/NotivueNotification.vue';
import ToggleTextBox from "@/components/ToggleTextBox.vue";

export default {
  name: 'ChaptersPreview',
  components: {ToggleTextBox},
  data() {
    return {
      isPromoter: authStore.isPromoter,
      isSupervisor: false,
      supervisorId: null,
      thesisId: null,
      selectedStudentId: '',
      students: [],
      files: [],
      studentFiles: [],
      selectedFile: null,
      uploadSuccess: false,
      errorMessage: '',
      userId: authStore.userId,
      showCommentModal: false,
      selectedFileForComment: null,
      fileComment: '',
      commentSuccess: false,
      fileComments: {},
      projectId: null,
      groupName: '',
      isLinkMode: false,
      oneNoteLink: '',
      isVerifying: true,
      fileContentCache: new Map(),
      showMultiAuthorModal: false,
      groupMembers: [],
      selectedCoAuthors: [],
      loadingGroupMembers: false,
      thesisTitle: '',
      thesisTitleEng: '',
      chapterTitle: '',
      chapterTitleEng: '',
      // Promoter multi-author functionality
      showPromoterMultiAuthorModal: false,
      showPromoterMultiAuthorLinkModal: false,
      promoterSelectedStudents: [],
      isPromoterMultiAuthorMode: false
    };
  },
  computed: {
    displayFiles() {
      const files = this.isPromoter ? this.studentFiles : this.files;
      return [...files].sort((a, b) => {
        const dateA = new Date(a.uploadedAt).getTime();
        const dateB = new Date(b.uploadedAt).getTime();
        return dateB - dateA;
      });
    }
  },
  watch: {
    students: {
      immediate: true,
      handler(newStudents) {
        if (this.isPromoter && newStudents && newStudents.length === 1) {
          console.log('Auto-selecting the only student in group:', newStudents[0].id);
          this.selectedStudentId = newStudents[0].id;
          this.fetchStudentFiles();
        }
      }
    }
  },
  created() {
    this.isPromoter = authStore.isPromoter;
    this.userId = authStore.userId;
    this.projectId = this.$route.params.id;
    this.groupName = this.$route.query.name || 'Grupa projektowa';
    this.fetchThesisTitle();
    if (!this.isSupervisor) {
      this.fetchChapters();
    }

    this.isSupervisor = false;

    console.log('ChaptersPreview initialized with projectId:', this.projectId, 'Group name:', this.groupName);
    console.log('Is promoter (initial):', this.isPromoter, 'Is supervisor (initial): false - will verify from server');

    if (this.isPromoter && this.projectId) {
      this.verifySupervisorStatus();
    }

    // Always fetch supervisor ID to enable checklist filtering for both students and promoters
    if (this.projectId) {
      this.fetchSupervisorId();
    }

    if (this.userId && !this.isPromoter) {
      console.log('Fetching files for student user ID:', this.userId);
      this.fetchFiles();
    } else if (this.isPromoter) {
      console.log('Promoter detected - skipping initial file fetch. Files will load when student is selected.');
    } else {
      this.errorMessage = 'Brak zalogowanego użytkownika. Proszę zalogować się ponownie.';
    }

    if (this.projectId) {
      this.fetchStudents();
    } else {
      this.errorMessage = 'Brak identyfikatora projektu. Proszę przejść do widoku przez stronę grup.';
    }
  },
  methods: {

    goBack() {
      this.$router.push({ name: 'GroupsPanel' });
    },

    async fetchSupervisorId() {
      if (!this.projectId) {
        console.warn('Cannot fetch supervisor ID: missing project ID');
        return;
      }

      try {
        console.log('Fetching supervisor ID for project:', this.projectId);
        const response = await axios.get('/api/v1/view/groups/all');

        if (response.data && response.data.dtos && Array.isArray(response.data.dtos)) {
          const allGroups = response.data.dtos;
          console.log('All groups data for supervisor lookup:', allGroups);

          const targetGroup = allGroups.find(group =>
              group.project_id === Number(this.projectId) ||
              group.project_id === this.projectId
          );

          if (targetGroup && targetGroup.supervisor) {
            this.supervisorId = targetGroup.supervisor.id;
            console.log('Found supervisor ID for project:', this.projectId, '-> Supervisor ID:', this.supervisorId);
            console.log('Supervisor details:', targetGroup.supervisor);
          } else {
            console.warn('No supervisor found for project:', this.projectId);
          }
        }
      } catch (error) {
        console.error('Error fetching supervisor ID:', error);
      }
    },

    async verifySupervisorStatus() {
      this.isVerifying = true;

      if (!this.isPromoter) {
        this.isVerifying = false;
        return; s
      }

      if (!this.projectId) {
        console.warn('Cannot verify supervisor status: missing project ID');
        this.isSupervisor = false;
        this.isVerifying = false;
        return;
      }

      try {
        console.log('Verifying if user is supervisor for project:', this.projectId);
        const response = await axios.get('/api/v1/view/groups/all');

        if (response.data && response.data.dtos && Array.isArray(response.data.dtos)) {
          const allGroups = response.data.dtos;
          console.log('All groups data:', allGroups);

          const targetGroup = allGroups.find(group =>
              group.project_id === Number(this.projectId) ||
              group.project_id === this.projectId
          );

          if (targetGroup) {
            console.log('Found target group:', targetGroup);

            const supervisorId = targetGroup.supervisor?.id;
            const userId = Number(authStore.userId);

            // Store supervisor ID and thesis ID for later use
            this.supervisorId = supervisorId;
            this.thesisId = targetGroup.thesis_id;

            console.log('Group supervisor ID:', supervisorId, 'Current user ID:', userId);

            const isActualSupervisor = supervisorId === userId;

            if (this.isSupervisor !== isActualSupervisor) {
              console.warn(`Supervisor status mismatch - URL param: ${this.isSupervisor}, Actual: ${isActualSupervisor}`);
              this.isSupervisor = isActualSupervisor;

              if (!isActualSupervisor) {
                this.errorMessage = 'Nie jesteś promotorem tej grupy. Masz ograniczone uprawnienia.';
                setTimeout(() => {
                  this.errorMessage = '';
                }, 5000);
              }
            }
          } else {
            console.warn('Group not found with project ID:', this.projectId);
            this.isSupervisor = false;
            this.errorMessage = 'Grupa nie została znaleziona. Dostęp został ograniczony.';
            setTimeout(() => {
              this.errorMessage = '';
            }, 5000);
          }
        } else {
          console.warn('Unexpected response format from groups/all:', response.data);
          this.isSupervisor = false;
        }
      } catch (error) {
        console.error('Error verifying project supervisor:', error);
        // For safety, if we can't verify, we set supervisor status to false
        this.isSupervisor = false;
        this.errorMessage = 'Nie można zweryfikować uprawnień. Dostęp został ograniczony.';
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      } finally {
        this.isVerifying = false;
      }
    },

    getStudentDisplayName(student) {
      const firstName = student.fName || student.fname || student.firstName || student.f_name || '';
      const lastName = student.lName || student.lname || student.lastName || student.l_name || '';

      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      } else if (firstName) {
        return firstName;
      } else if (lastName) {
        return lastName;
      } else {
        return `Student ID: ${student.id}`;
      }
    },

    async fetchStudents() {
      if (!this.isPromoter) return;
      if (!this.projectId) {
        this.errorMessage = 'Brak identyfikatora projektu. Nie można pobrać studentów z grupy.';
        return;
      }

      try {
        console.log('Fetching students for project ID:', this.projectId);
        const response = await axios.get(`/api/v1/view/groups/students?id=${this.projectId}`);
        console.log('Students in group response:', response.data);

        if (Array.isArray(response.data)) {
          this.students = response.data;
        } else {
          console.warn('Unexpected response format for students:', response.data);
          this.students = [];
        }

        if (this.students.length === 0) {
          console.warn('No students found in the group with ID:', this.projectId);
        } else {
          console.log('Found', this.students.length, 'students in the group');
        }
      } catch (error) {
        console.error('Błąd przy pobieraniu studentów z grupy:', error);
        this.errorMessage = 'Nie udało się pobrać listy studentów z grupy.';
        this.students = [];
      }
    },

    async fetchFiles() {
      if (this.isPromoter) {
        console.log('Promoter attempting to call fetchFiles - this should use fetchStudentFiles instead');
        return;
      }

      if (!this.userId) {
        this.errorMessage = 'Brak ID użytkownika. Proszę zalogować się ponownie.';
        return;
      }
      try {
        console.log('Fetching files for user ID:', this.userId);
        const response = await axios.get(`/api/v1/view/version/byOwner/${this.userId}`);

        // Handle the new response format
        if (response.data && response.data.versions) {
          this.files = await this.mapFiles(response.data.versions);
        } else if (response.data && Array.isArray(response.data)) {
          this.files = await this.mapFiles(response.data);
        } else {
          console.warn('Unexpected response format:', response.data);
          this.files = [];
        }

        console.log('Files fetched:', this.files);
        this.uploadSuccess = false;
        this.errorMessage = '';

      } catch (error) {
        console.error('Błąd przy pobieraniu plików:', error);

        if (error.response?.status === 500) {
          this.errorMessage = 'Błąd serwera - prawdopodobnie brak rozdziału dla tego użytkownika. Skontaktuj się z administratorem.';
        } else {
          this.errorMessage = 'Nie udało się pobrać plików.';
        }

        this.files = [];
      }
    },

    async fetchStudentFiles() {
      if (!this.selectedStudentId) {
        this.studentFiles = [];
        return;
      }
      try {
        console.log('Fetching files for student ID:', this.selectedStudentId);
        const response = await axios.get(`/api/v1/view/version/byOwner/${this.selectedStudentId}`);

        if (response.data && response.data.versions) {
          this.studentFiles = await this.mapFiles(response.data.versions);
        } else if (response.data && Array.isArray(response.data)) {
          this.studentFiles = await this.mapFiles(response.data);
        } else {
          console.warn('Unexpected response format:', response.data);
          this.studentFiles = [];
        }

        console.log('Student files fetched:', this.studentFiles);

        const chapters = await this.fetchChapters();

        // Find the chapter that belongs to the selected student
        const studentChapter = chapters.find(chapter =>
            chapter.owner_id === this.selectedStudentId
        );

        // Set the chapter title if found, otherwise show a message
        if (studentChapter) {
          this.chapterTitle = studentChapter.title || 'Brak tytułu';
          this.chapterTitleEng = studentChapter.title_en || 'Brak tytułu angielskiego';
        } else {
          this.chapterTitle = 'Brak przypisanego rozdziału';
          this.chapterTitleEng = 'Brak przypisanego rozdziału';
          console.warn('No chapter found for student:', this.selectedStudentId);
        }

      } catch (error) {
        console.error('Błąd przy pobieraniu plików studenta:', error);

        if (error.response?.status === 500) {
          this.errorMessage = 'Błąd serwera - prawdopodobnie brak rozdziału dla tego studenta.';
        } else {
          this.errorMessage = 'Nie udało się pobrać plików studenta.';
        }

        this.studentFiles = [];
      }
    },

    async getFileNameFromContent(fileId) {
      if (this.fileContentCache.has(fileId)) {
        return this.fileContentCache.get(fileId);
      }

      try {
        const response = await axios.get(`/api/v1/file-content/${fileId}`);
        const fileName = response.data.fileName || response.data.file_name || null;
        this.fileContentCache.set(fileId, fileName);
        return fileName;
      } catch (error) {
        console.log('Could not fetch file content for filename:', error);
        this.fileContentCache.set(fileId, null);
        return null;
      }
    },

    async mapFiles(versions) {
      console.log('Raw versions from API:', versions);

      if (!versions || !Array.isArray(versions) || versions.length === 0) {
        console.warn('No versions data received or empty array');
        return [];
      }

      versions.forEach((version, index) => {
        console.log(`Version ${index} data structure:`, JSON.stringify(version, null, 2));

        console.log(`Version ${index} uploader:`, version.uploader || version.userdataid || version.uploaderId || 'Not found');

        if (version.uploader) {
          console.log(`Uploader details for version ${index}:`, version.uploader);
        }
      });

      return versions.map((version) => {
        console.log('Processing version:', version);
        let chapterVersionId = version.id;
        let fileId = version.fileId || version.file_id;

        console.log('Version IDs extracted:', {
          chapterVersionId: chapterVersionId,
          fileId: fileId
        });

        let fileName = version.name || version.file_name || 'Brak Nazwy';

        if (version.link) {
          const linkParts = version.link.split('/');
          fileId = linkParts[linkParts.length - 1];
        }

        let senderName = 'Nieznany';
        let uploaderId = null;

        console.log('Uploader fields in version:', {
          directUploader: version.uploader,
          userdataid: version.userdataid,
          uploaderId: version.uploaderId,
          uploaderFName: version.uploaderFName,
          uploaderLName: version.uploaderLName,
          upload_time: version.upload_time,
          date: version.date
        });

        if (version.uploader) {
          senderName = `${version.uploader.fName || version.uploader.fname || ''} ${version.uploader.lName || version.uploader.lname || ''}`.trim();
          uploaderId = version.uploader.id;
        } else if (version.userdataid) {
          senderName = `${version.userdataid.fName || version.userdataid.fname || ''} ${version.userdataid.lName || version.userdataid.lname || ''}`.trim();
          uploaderId = version.userdataid.id;
        } else if (version.uploaderFName && version.uploaderLName) {
          senderName = `${version.uploaderFName} ${version.uploaderLName}`.trim();
          uploaderId = version.uploaderId;
        } else if (version.uploader_fname && version.uploader_lname) {
          senderName = `${version.uploader_fname} ${version.uploader_lname}`.trim();
          uploaderId = version.uploader_id || version.uploaderId;
        } else if (version.uploaderId) {
          uploaderId = version.uploaderId;
          const uploader = this.students.find(s => s.id === Number(uploaderId));
          if (uploader) {
            senderName = this.getStudentDisplayName(uploader);
          }
        }

        if (senderName === 'Nieznany' && uploaderId) {
          senderName = `Użytkownik ID: ${uploaderId}`;
        }

        const ownerId = version.owner?.id || version.ownerId || version.owner_id;
        const uploadDate = version.upload_time || version.uploadedAt || version.date || new Date().toISOString();

        console.log('Mapped file:', {
          id: fileId,
          name: fileName,
          uploadedAt: uploadDate,
          senderName: senderName,
          uploaderId: uploaderId,
          ownerId: ownerId,
          link: version.link,
          chapterVersionId: version.versionId || version.version_id || version.id || fileId
        });

        return {
          id: fileId,
          chapterVersionId: chapterVersionId,
          name: fileName,
          uploadedAt: uploadDate,
          senderName: senderName,
          uploaderId: uploaderId,
          ownerId: ownerId,
          link: version.link
        };
      });
    },

    isUploadedByPromoter(file) {
      // Check if file was uploaded by the supervisor (promoter)
      if (!file.uploaderId || !this.supervisorId) {
        return false;
      }

      // Convert to numbers to ensure proper comparison
      const uploaderId = Number(file.uploaderId);
      const supervisorId = Number(this.supervisorId);

      console.log('Checking if file uploaded by promoter:', {
        fileName: file.name,
        uploaderId: uploaderId,
        supervisorId: supervisorId,
        isPromoterUpload: uploaderId === supervisorId
      });

      return uploaderId === supervisorId;
    },

    handleFileChange(event) {
      this.selectedFile = event.target.files[0];
      this.uploadSuccess = false;
      this.errorMessage = '';
    },

    async uploadFile() {
      if (this.isPromoter) {
        await this.verifySupervisorStatus();
      }

      if (this.isPromoter && !this.isSupervisor) {
        this.errorMessage = 'Nie masz uprawnień do przesyłania plików tej grupie. Możesz przesyłać pliki tylko grupom, których jesteś promotorem.';
        return;
      }

      const file = this.selectedFile;
      if (!file) {
        this.errorMessage = 'Nie wybrano pliku.';
        return;
      }
      let uploaderId, ownerId;

      try {
        uploaderId = Number(authStore.userId);
        ownerId = this.isPromoter ?
            Number(this.selectedStudentId) :
            Number(authStore.userId);
      } catch (error) {
        this.errorMessage = 'Błąd konwersji ID użytkownika.';
        return;
      }

      if (!uploaderId || uploaderId <= 0 || !Number.isInteger(uploaderId)) {
        this.errorMessage = 'Nieprawidłowe ID użytkownika przesyłającego.';
        console.error('Invalid uploaderId:', authStore.userId, 'converted to:', uploaderId);
        return;
      }

      if (!ownerId || ownerId <= 0 || !Number.isInteger(ownerId)) {
        this.errorMessage = 'Nieprawidłowe ID właściciela pliku.';
        console.error('Invalid ownerId:', this.selectedStudentId, 'converted to:', ownerId);
        return;
      }

      if (this.isPromoter && (!this.selectedStudentId || this.selectedStudentId === '')) {
        this.errorMessage = 'Proszę wybrać studenta.';
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      formData.append('uploaderId', uploaderId.toString());
      formData.append('ownerId', ownerId.toString());

      console.log('=== UPLOAD DEBUG INFO ===');
      console.log('Original authStore.userId:', authStore.userId, typeof authStore.userId);
      console.log('Original selectedStudentId:', this.selectedStudentId, typeof this.selectedStudentId);
      console.log('Converted uploaderId:', uploaderId, typeof uploaderId);
      console.log('Converted ownerId:', ownerId, typeof ownerId);
      console.log('isPromoter:', this.isPromoter);
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      try {
        // Single author upload
        const url = `/api/v1/file?uploaderId=${uploaderId.toString()}&ownerId=${ownerId.toString()}`;
        console.log('Request URL:', url);
        console.log('FormData contains:', {
          file: file.name,
          uploaderId: uploaderId.toString(),
          ownerId: ownerId.toString()
        });

        console.log('AuthStore user info:', {
          userId: authStore.userId,
          userName: authStore.userName,
          isPromoter: authStore.isPromoter
        });

        const response = await axios.post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        });

        console.log('Upload response:', response.data, response.status);

        if (response.status === 200 && response.data && response.data > 0) {
          this.uploadSuccess = true;
          this.errorMessage = '';
          this.selectedFile = null;
          if (this.$refs.fileInput) {
            this.$refs.fileInput.value = '';
          }

          if (this.isPromoter) {
            await this.fetchStudentFiles();
          } else {
            await this.fetchFiles();
          }
          pushNotification('Plik został przesłany pomyślnie.', 'success');
        } else {
          throw new Error(`Upload failed. Server returned: ${response.data}`);
        }

      } catch (error) {
        console.error('Upload error details:', error);

        let errorMessage = 'Nie udało się przesłać pliku.';

        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 400) {
            errorMessage = 'Nieprawidłowe dane. Sprawdź czy wybrano właściwego studenta.';
          } else if (status === 500) {
            errorMessage = 'Błąd serwera. Spróbuj ponownie później.';
          } else {
            errorMessage = `Błąd serwera (${status}): ${data?.message || 'Nieznany błąd'}`;
          }

          console.error('Server error:', {
            status: status,
            data: data,
            uploaderId: uploaderId,
            ownerId: ownerId
          });

        } else if (error.request) {
          errorMessage = 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Przekroczono limit czasu przesyłania. Spróbuj ponownie.';
        } else {
          errorMessage = `Błąd: ${error.message}`;
        }

        this.errorMessage = errorMessage;
        this.uploadSuccess = false;
      }
    },

    async shareOneNoteLink() {
      if (this.isPromoter) {
        await this.verifySupervisorStatus();
      }

      if (this.isPromoter && !this.isSupervisor) {
        this.errorMessage = 'Nie masz uprawnień do udostępniania linków tej grupie. Możesz udostępniać linki tylko grupom, których jesteś promotorem.';
        return;
      }

      if (!this.oneNoteLink) {
        this.errorMessage = 'Proszę wprowadzić link OneNote.';
        return;
      }

      if (!this.selectedStudentId) {
        this.errorMessage = 'Proszę wybrać studenta.';
        return;
      }

      let uploaderId, ownerId;

      try {
        uploaderId = Number(authStore.userId);
        ownerId = Number(this.selectedStudentId);
      } catch (error) {
        this.errorMessage = 'Błąd konwersji ID użytkownika.';
        return;
      }

      if (!uploaderId || uploaderId <= 0 || !Number.isInteger(uploaderId)) {
        this.errorMessage = 'Nieprawidłowe ID promotora.';
        return;
      }

      if (!ownerId || ownerId <= 0 || !Number.isInteger(ownerId)) {
        this.errorMessage = 'Nieprawidłowe ID studenta.';
        return;
      }

      const linkData = {
        owner_user_data_id: ownerId,
        uploader_user_data_id: uploaderId,
        link: this.oneNoteLink
      };

      let apiUrl = '';

      try {
        console.log('=== ONENOTE LINK DEBUG INFO ===');
        console.log('Original authStore.userId:', authStore.userId, typeof authStore.userId);
        console.log('Original selectedStudentId:', this.selectedStudentId, typeof this.selectedStudentId);
        console.log('Converted uploaderId:', uploaderId, typeof uploaderId);
        console.log('Converted ownerId:', ownerId, typeof ownerId);
        console.log('isPromoter:', this.isPromoter);
        console.log('Link details:', {
          url: this.oneNoteLink
        });

        console.log('Preparing to send OneNote link:', linkData);

        const chapters = await this.fetchChapters();

        if (!chapters || chapters.length === 0) {
          this.errorMessage = 'Nie znaleziono rozdziałów dla tego projektu. Proszę najpierw utworzyć rozdział.';
          return;
        }

        const studentChapter = chapters.find(chapter =>
            chapter.owner_id === Number(this.selectedStudentId)
        );

        if (!studentChapter) {
          console.warn('No chapter found for student ID:', this.selectedStudentId);
          console.log('Available chapters:', chapters);
          this.errorMessage = 'Nie znaleziono rozdziału dla wybranego studenta. Proszę najpierw utworzyć rozdział dla tego studenta.';
          return;
        }

        const chapterId = studentChapter.id;
        console.log('Using chapter ID for student:', chapterId, 'Student ID:', this.selectedStudentId);

        if (!chapterId) {
          this.errorMessage = 'Nie znaleziono ID rozdziału. Proszę najpierw utworzyć rozdział.';
          return;
        }

        apiUrl = `/api/v1/chapter/addVersionWithLink?chapterIds=${chapterId}`;
        console.log('Request URL:', apiUrl);

        const response = await axios.post(apiUrl, linkData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        if (response.status === 200 || response.status === 201) {
          this.uploadSuccess = true;
          this.errorMessage = '';
          this.oneNoteLink = '';

          await this.fetchStudentFiles();

          console.log('OneNote link added successfully:', response.data);
        } else {
          throw new Error(`Link sharing failed. Server returned: ${response.data}`);
        }

      } catch (error) {
        console.error('Error sharing OneNote link:', error);

        let errorMessage = 'Nie udało się udostępnić linku.';

        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 400) {
            errorMessage = 'Nieprawidłowe dane. Sprawdź poprawność linku i wybranego studenta.';
          } else if (status === 404) {
            errorMessage = 'Nie znaleziono rozdziału o podanym ID. Proszę utworzyć rozdział przed dodaniem linku.';
          } else if (status === 500) {
            errorMessage = 'Błąd serwera przy przetwarzaniu żądania. Szczegóły w konsoli.';

            if (data && data.message && data.message.includes('must not be null')) {
              errorMessage = 'Nie znaleziono rozdziału o podanym ID. Proszę utworzyć rozdział przed dodaniem linku.';
            }
          } else {
            errorMessage = `Błąd serwera (${status}): ${data?.message || 'Nieznany błąd'}`;
          }

          console.error('Server error details:', {
            status: status,
            data: data,
            url: apiUrl,
            requestBody: linkData
          });
        } else if (error.request) {
          errorMessage = 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.';
        } else if (error.message) {
          errorMessage = `Błąd: ${error.message}`;
        }

        this.errorMessage = errorMessage;
        this.uploadSuccess = false;
      }
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },

    getDisplayName(file) {
      if (file.name && file.name !== 'Brak Nazwy') {
        return file.name;
      }

      if (file.link) {
        const matches = file.link.match(/target%28[^%]+\.one%7C[^%]+%2F([^%]+)%7C/);

        if (matches && matches[1]) {
          return decodeURIComponent(matches[1].replace(/\+/g, ' '));
        }

        const altMatches = file.link.match(/%2F([^%]+\.pdf|[^%]+\.docx|[^%]+\.xlsx|[^%]+\.pptx|[^%]+\.txt)%7C/);
        if (altMatches && altMatches[1]) {
          return decodeURIComponent(altMatches[1].replace(/\+/g, ' '));
        }

        return 'Link OneNote';
      }

      return 'Brak Nazwy';
    },

    previewFile(file) {
      console.log('Previewing file:', file);
      if (file.link) {
        window.open(file.link, '_blank');
      } else if (file.id) {
        window.open(`/api/v1/download/${file.id}`, '_blank');
      } else {
        this.errorMessage = 'Nie można otworzyć pliku - brak linku.';
      }
    },

    goToFileChecklist(file) {
      if (!file.chapterVersionId) {
        console.error('No chapter version ID available for file:', file);
        this.errorMessage = 'Nie można otworzyć checklisty - brak ID wersji rozdziału.';
        return;
      }

      console.log(`Navigating to checklist with chapter version ID: ${file.chapterVersionId}`);
      this.$router.push({
        name: 'FileChecklist',
        params: { chapterVersionId: file.chapterVersionId }
      });
    },

    goToThesisChecklist() {
      if (!this.thesisId) {
        console.error('No thesis ID available');
        this.errorMessage = 'Nie można otworzyć checklisty - brak ID pracy.';
        return;
      }

      console.log(`Navigating to thesis checklist for thesis ID: ${this.thesisId}`);
      this.$router.push({
        name: 'FileChecklist',
        params: { chapterVersionId: this.thesisId },
        query: { type: 'thesis' }
      });
    },

    goToStudentChecklist() {
      if (!this.userId) {
        this.errorMessage = 'Brak ID użytkownika. Proszę zalogować się ponownie.';
        return;
      }
      this.$router.push(`/checklist/${this.userId}`);
    },

    async openCommentModal(file) {
      this.selectedFileForComment = file;
      this.showCommentModal = true;
      const versionId = file.chapterVersionId || file.id;
      console.log(`Opening comment modal for version ID: ${versionId}`);
      await this.fetchFileComment(versionId);
    },

    closeCommentModal() {
      this.showCommentModal = false;
      this.selectedFileForComment = null;
    },

    async fetchFileComment(versionId) {
      console.log(`Fetching comments for version ID: ${versionId}`);

      if (this.fileComments[versionId]) {
        this.fileComment = this.fileComments[versionId];
        return;
      }

      try {
        const response = await axios.get(`/api/v1/view/version/${versionId}/comment`);
        console.log('Comment API response:', response.data);

        if (response.data && response.data.text) {
          // Single comment object returned
          this.fileComment = response.data.text || '';
          console.log('Comment found:', response.data);
        } else {
          this.fileComment = '';
          console.log('No comment found for version:', versionId);
        }

        this.fileComments[versionId] = this.fileComment;
      } catch (error) {
        console.error('Error fetching comments:', error);

        // Handle 404 specifically - it just means no comments exist yet
        if (error.response?.status === 404) {
          console.log('No comments found (404) - this is normal for files without comments');
          this.fileComment = '';
          this.fileComments[versionId] = '';
        } else {
          // Other errors show a more specific message
          console.error('Unexpected error fetching comments:', error);
          this.fileComment = '';

          // Only show error message for non-404 errors
          if (error.response?.status !== 404) {
            this.errorMessage = 'Nie udało się pobrać komentarza do pliku.';
          }
        }
      }
    },

    async saveComment() {
      if (this.isPromoter) {
        await this.verifySupervisorStatus();
      }

      if (this.isPromoter && !this.isSupervisor) {
        this.errorMessage = 'Nie masz uprawnień do dodawania komentarzy do plików tej grupy. Możesz komentować tylko pliki grup, których jesteś promotorem.';
        return;
      }

      if (!this.selectedFileForComment) {
        this.errorMessage = 'Brak pliku. Nie można zapisać komentarza.';
        return;
      }

      const versionId = this.selectedFileForComment.chapterVersionId || this.selectedFileForComment.id;
      if (!versionId) {
        this.errorMessage = 'Brak ID wersji pliku. Nie można zapisać komentarza.';
        return;
      }

      try {
        let existingCommentId = null;

        try {
          console.log('Checking for existing comments first...');
          const versionIdForCheck = this.selectedFileForComment.chapterVersionId || this.selectedFileForComment.id;
          const existingCommentsResponse = await axios.get(`/api/v1/view/comments?versionId=${versionIdForCheck}`);

          if (existingCommentsResponse.data &&
              existingCommentsResponse.data.comments &&
              existingCommentsResponse.data.comments.length > 0) {
            existingCommentId = existingCommentsResponse.data.comments[0].id;
            console.log(`Found existing comment with ID: ${existingCommentId}`);
          }
        } catch (checkError) {
          console.log('Error checking for existing comments:', checkError);
        }

        // Get chapter_id by finding which chapter the file belongs to
        let chapterId = null;
        try {
          const chapters = await this.fetchChapters();
          if (chapters && chapters.length > 0) {
            // For promoters, find chapter belonging to selected student
            if (this.isPromoter && this.selectedStudentId) {
              const studentChapter = chapters.find(chapter =>
                  chapter.owner_id === Number(this.selectedStudentId)
              );
              chapterId = studentChapter ? studentChapter.id : null;
            }
            // For students, find their own chapter
            else if (!this.isPromoter) {
              const userChapter = chapters.find(chapter =>
                  chapter.owner_id === Number(this.userId)
              );
              chapterId = userChapter ? userChapter.id : null;
            }
            // Fallback: use first chapter
            if (!chapterId && chapters.length > 0) {
              chapterId = chapters[0].id;
            }
          }
          console.log('Found chapter_id for comment:', chapterId);
        } catch (chapterError) {
          console.error('Error fetching chapter_id for comment:', chapterError);
        }

        if (!chapterId) {
          this.errorMessage = 'Nie można znaleźć rozdziału dla tego pliku. Nie można dodać komentarza.';
          return;
        }

        if (existingCommentId) {
          try {
            console.log(`Updating existing comment ${existingCommentId} with text: ${this.fileComment}`);
            const updateResponse = await axios.post(`/api/v1/update/comment`, {
              id: existingCommentId,
              text: this.fileComment
            });

            if (updateResponse.status === 200) {
              const versionId = this.selectedFileForComment.chapterVersionId || this.selectedFileForComment.id;
              this.fileComments[versionId] = this.fileComment;
              this.commentSuccess = true;
              console.log('Comment updated successfully');
              setTimeout(() => {
                this.commentSuccess = false;
                this.closeCommentModal();
              }, 1500);

              return;
            }
          } catch (updateError) {
            console.error('Failed to update comment:', updateError);
          }
        }

        const commentDto = {
          text: this.fileComment,
          uploader_id: parseInt(authStore.userId),
          chapter_id: parseInt(chapterId),
          version_id: parseInt(this.selectedFileForComment.chapterVersionId || this.selectedFileForComment.id),
          fname: authStore.fname || "",
          lname: authStore.lname || ""
        };

        console.log('Current auth store state:', {
          userId: authStore.userId,
          fname: authStore.fname,
          lname: authStore.lname
        });

        if (existingCommentId) {
          commentDto.id = parseInt(existingCommentId);
        }

        console.log('Creating new comment with updated format:', commentDto);

        const response = await axios.post('/api/v1/post/comment', commentDto);
        console.log('Save comment response:', response);

        if (response.status === 200 || response.status === 201) {
          const versionId = this.selectedFileForComment.chapterVersionId || this.selectedFileForComment.id;
          this.fileComments[versionId] = this.fileComment;
          this.commentSuccess = true;
          console.log('Comment saved successfully');
          setTimeout(() => {
            this.commentSuccess = false;
            this.closeCommentModal();
          }, 1500);

          const versionIdForFetch = this.selectedFileForComment.chapterVersionId || this.selectedFileForComment.id;
          await this.fetchFileComment(versionIdForFetch);
        } else {
          throw new Error(`Server returned unexpected status: ${response.status}`);
        }
      } catch (error) {
        console.error('Błąd przy zapisywaniu komentarza:', error);

        let errorMsg = 'Nie udało się zapisać komentarza.';

        if (error.response) {
          const status = error.response.status;
          console.error('Response error:', error.response.data);

          if (status === 400) {
            errorMsg = 'Nieprawidłowy format danych komentarza.';
          } else if (status === 500) {
            if (typeof error.response.data === 'string' && error.response.data.includes('duplicate')) {
              errorMsg = 'Ten komentarz już istnieje. Spróbuj zaktualizować istniejący komentarz.';
            } else {
              errorMsg = 'Błąd serwera przy zapisywaniu komentarza.';
            }
          }
        }

        this.errorMessage = errorMsg;
      }
    },

    extractUrl(text) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = text.match(urlRegex);
      return matches ? matches[0] : '#';
    },

    async fetchChapters() {
      if (!this.projectId) {
        console.error('No project ID available to fetch chapters');
        return [];
      }

      try {
        console.log('Fetching chapters for project:', this.projectId);
        const response = await axios.get(`/api/v1/chapter/${this.projectId}/all`);

        if (response.data && Array.isArray(response.data)) {
          console.log('Chapters fetched successfully:', response.data);

          // If user is not a supervisor, set the chapter title from their own data
          if (!this.isSupervisor && response.data.length > 0) {
            const studentChapter = response.data.find(chapter =>
                chapter.owner_id === this.userId
            );

            if (studentChapter) {
              this.chapterTitle = studentChapter.title || 'Brak tytułu';
              this.chapterTitleEng = studentChapter.title_en || 'Brak tytułu angielskiego';
            } else {
              this.chapterTitle = 'Brak przypisanego rozdziału';
              this.chapterTitleEng = 'No chapter assigned';
            }
          }

          return response.data;
        } else {
          console.warn('Unexpected response format from chapters endpoint:', response.data);
          return [];
        }
      } catch (error) {
        console.error('Error fetching chapters:', error);
        return [];
      }
    },

    async deleteComment(commentId) {
      try {
        console.log('Attempting to delete comment ID:', commentId);
        const response = await axios.get(`/api/v1/view/comment?id=${commentId}`);
        console.log('Delete comment response:', response.data);

        if (response.data === true) {
          const versionId = this.selectedFileForComment.chapterVersionId || this.selectedFileForComment.id;
          await this.fetchFileComment(versionId);
          return true;
        } else {
          throw new Error('Failed to delete comment');
        }
      } catch (error) {
        console.error('Błąd przy usuwaniu komentarza:', error);
        this.errorMessage = `Nie udało się usunąć komentarza: ${error.message}`;
        return false;
      }
    },

    // Multi-author functionality methods
    async openMultiAuthorModal() {
      if (!this.selectedFile) {
        this.errorMessage = 'Najpierw wybierz plik do przesłania.';
        return;
      }

      this.showMultiAuthorModal = true;
      this.selectedCoAuthors = [];
      await this.fetchGroupMembers();
    },

    closeMultiAuthorModal() {
      this.showMultiAuthorModal = false;
      this.selectedCoAuthors = [];
      this.groupMembers = [];
    },

    async fetchGroupMembers() {
      this.loadingGroupMembers = true;
      try {
        if (!this.projectId) {
          this.errorMessage = 'Brak identyfikatora projektu. Nie można pobrać członków grupy.';
          return;
        }

        console.log('Fetching group members for project ID:', this.projectId);
        const response = await axios.get(`/api/v1/view/groups/students?id=${this.projectId}`);
        console.log('Groups response:', response.data);

        if (Array.isArray(response.data)) {
          const allMembers = response.data;
          console.log('Found group members:', allMembers);

          // Filter out logged in user and get other members
          this.groupMembers = allMembers.filter(member =>
              member.id !== Number(this.userId)
          );

          console.log('Group members (excluding logged in user):', this.groupMembers);

          if (this.groupMembers.length === 0) {
            this.errorMessage = 'Nie znaleziono innych członków w Twojej grupie.';
          }
        } else {
          console.warn('Unexpected response format:', response.data);
          this.errorMessage = 'Nieoczekiwany format odpowiedzi z serwera.';
        }
      } catch (error) {
        console.error('Error fetching group members:', error);
        this.errorMessage = 'Nie udało się pobrać listy członków grupy.';
        this.groupMembers = [];
      } finally {
        this.loadingGroupMembers = false;
      }
    },

    async uploadMultiAuthorFile() {
      if (this.selectedCoAuthors.length === 0) {
        this.errorMessage = 'Musisz wybrać co najmniej jednego współautora.';
        return;
      }

      const file = this.selectedFile;
      if (!file) {
        this.errorMessage = 'Nie wybrano pliku.';
        return;
      }

      try {
        const uploaderId = Number(this.userId);
        // Include logged in user in the list of owners
        const ownerIds = [uploaderId, ...this.selectedCoAuthors.map(id => Number(id))];

        console.log('Multi-author upload:', {
          uploaderId: uploaderId,
          ownerIds: ownerIds,
          fileName: file.name
        });

        const formData = new FormData();
        formData.append('file', file);

        // Build query string with multiple ownerId parameters
        const ownerIdParams = ownerIds.map(id => `ownerId=${id}`).join('&');
        const url = `/api/v1/file?${ownerIdParams}&uploaderId=${uploaderId}`;

        console.log('Multi-author upload URL:', url);

        const response = await axios.post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        });

        if (response.status === 200 && response.data && response.data > 0) {
          this.uploadSuccess = true;
          this.errorMessage = '';
          this.selectedFile = null;
          if (this.$refs.fileInput) {
            this.$refs.fileInput.value = '';
          }

          this.closeMultiAuthorModal();

          // Refresh files after upload
          if (this.isPromoter) {
            await this.fetchStudentFiles();
          } else {
            await this.fetchFiles();
          }
        } else {
          throw new Error(`Multi-author upload failed. Server returned: ${response.data}`);
        }

      } catch (error) {
        console.error('Multi-author upload error:', error);
        this.errorMessage = 'Nie udało się przesłać pliku wieloautorskiego.';
      }
    },

    // Promoter multi-author methods
    async openPromoterMultiAuthorModal() {
      this.loadingGroupMembers = true;
      this.errorMessage = '';

      try {
        await this.fetchGroupMembers();
        this.showPromoterMultiAuthorModal = true;
      } catch (error) {
        console.error('Error opening promoter multi-author modal:', error);
        this.errorMessage = 'Nie udało się pobrać listy studentów.';
      } finally {
        this.loadingGroupMembers = false;
      }
    },

    closePromoterMultiAuthorModal() {
      this.showPromoterMultiAuthorModal = false;
      this.promoterSelectedStudents = [];
    },

    async uploadPromoterMultiAuthorFile() {
      if (this.promoterSelectedStudents.length === 0) {
        this.errorMessage = 'Musisz wybrać co najmniej jednego studenta.';
        return;
      }

      const file = this.selectedFile;
      if (!file) {
        this.errorMessage = 'Nie wybrano pliku.';
        return;
      }

      try {
        const uploaderId = Number(this.userId);
        const selectedStudentIds = this.promoterSelectedStudents.map(id => Number(id));

        console.log('Promoter multi-author upload:', {
          uploaderId: uploaderId,
          studentIds: selectedStudentIds,
          fileName: file.name
        });

        const formData = new FormData();
        formData.append('file', file);

        // Build query string with multiple ownerId parameters for selected students
        const ownerIdParams = selectedStudentIds.map(id => `ownerId=${id}`).join('&');
        const url = `/api/v1/file?${ownerIdParams}&uploaderId=${uploaderId}`;

        console.log('Promoter multi-author upload URL:', url);

        const response = await axios.post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        });

        if (response.status === 200 && response.data && response.data > 0) {
          this.uploadSuccess = true;
          this.errorMessage = '';
          this.selectedFile = null;
          if (this.$refs.fileInput) {
            this.$refs.fileInput.value = '';
          }

          this.closePromoterMultiAuthorModal();

          // Refresh files after upload
          if (this.isPromoter) {
            await this.fetchStudentFiles();
          } else {
            await this.fetchFiles();
          }
        } else {
          throw new Error(`Promoter multi-author upload failed. Server returned: ${response.data}`);
        }

      } catch (error) {
        console.error('Promoter multi-author upload error:', error);
        this.errorMessage = 'Nie udało się przesłać pliku wieloautorskiego.';
      }
    },

    async openPromoterMultiAuthorLinkModal() {
      this.loadingGroupMembers = true;
      this.errorMessage = '';

      try {
        await this.fetchGroupMembers();
        this.showPromoterMultiAuthorLinkModal = true;
      } catch (error) {
        console.error('Error opening promoter multi-author link modal:', error);
        this.errorMessage = 'Nie udało się pobrać listy studentów.';
      } finally {
        this.loadingGroupMembers = false;
      }
    },

    closePromoterMultiAuthorLinkModal() {
      this.showPromoterMultiAuthorLinkModal = false;
      this.promoterSelectedStudents = [];
    },

    async sharePromoterMultiAuthorLink() {
      console.log('=== PROMOTER MULTI-AUTHOR LINK SHARE CALLED ===');

      if (this.promoterSelectedStudents.length === 0) {
        console.log('No students selected');
        this.errorMessage = 'Musisz wybrać co najmniej jednego studenta.';
        return;
      }

      if (!this.oneNoteLink || this.oneNoteLink.trim() === '') {
        console.log('No OneNote link provided');
        this.errorMessage = 'Musisz podać link do OneNote.';
        return;
      }

      console.log('Selected students:', this.promoterSelectedStudents);
      console.log('OneNote link:', this.oneNoteLink);

      try {
        const uploaderId = Number(this.userId);
        const selectedStudentIds = this.promoterSelectedStudents.map(id => Number(id));

        console.log('Promoter multi-author link share:', {
          uploaderId: uploaderId,
          studentIds: selectedStudentIds,
          oneNoteLink: this.oneNoteLink
        });

        // Get chapters for all selected students
        const chapters = await this.fetchChapters();

        if (!chapters || chapters.length === 0) {
          this.errorMessage = 'Nie znaleziono rozdziałów dla tego projektu. Proszę najpierw utworzyć rozdziały.';
          return;
        }

        // Find chapters for all selected students
        const studentChapterIds = [];
        for (const studentId of selectedStudentIds) {
          const studentChapter = chapters.find(chapter => chapter.owner_id === Number(studentId));
          if (studentChapter) {
            studentChapterIds.push(studentChapter.id);
          } else {
            console.warn('No chapter found for student ID:', studentId);
          }
        }

        if (studentChapterIds.length === 0) {
          this.errorMessage = 'Nie znaleziono rozdziałów dla wybranych studentów. Proszę najpierw utworzyć rozdziały.';
          return;
        }

        console.log('Found chapters for students:', studentChapterIds);

        // Prepare request body for each student
        const promises = selectedStudentIds.map(async (studentId) => {
          const studentChapter = chapters.find(chapter => chapter.owner_id === Number(studentId));
          if (!studentChapter) {
            throw new Error(`No chapter found for student ${studentId}`);
          }

          const linkData = {
            owner_user_data_id: Number(studentId),
            uploader_user_data_id: uploaderId,
            link: this.oneNoteLink
          };

          const apiUrl = `/api/v1/chapter/addVersionWithLink?chapterIds=${studentChapter.id}`;
          console.log('Multi-author link request URL:', apiUrl);
          console.log('Multi-author link data:', linkData);

          return axios.post(apiUrl, linkData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          });
        });

        console.log('Executing', promises.length, 'API requests...');

        // Execute all requests
        const responses = await Promise.all(promises);

        console.log('All responses received:', responses.map(r => ({ status: r.status, data: r.data })));

        // Check if all requests were successful
        const allSuccessful = responses.every(response =>
            response.status === 200 || response.status === 201
        );

        if (allSuccessful) {
          this.uploadSuccess = true;
          this.errorMessage = '';
          this.oneNoteLink = '';

          this.closePromoterMultiAuthorLinkModal();

          // Refresh files after sharing
          if (this.selectedStudentId) {
            await this.fetchStudentFiles();
          }

          console.log('Multi-author OneNote links shared successfully');
        } else {
          throw new Error('Some requests failed');
        }

      } catch (error) {
        console.error('Promoter multi-author link share error:', error);

        let errorMessage = 'Nie udało się udostępnić linku wieloautorskiego.';

        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          console.error('API Error:', { status, data });

          if (status === 400) {
            errorMessage = 'Nieprawidłowe dane. Sprawdź poprawność linku i wybranych studentów.';
          } else if (status === 404) {
            errorMessage = 'Nie znaleziono rozdziałów dla wybranych studentów.';
          } else if (status === 500) {
            errorMessage = 'Błąd serwera przy przetwarzaniu żądania.';
          } else {
            errorMessage = `Błąd serwera (${status}): ${data?.message || 'Nieznany błąd'}`;
          }
        } else if (error.message) {
          errorMessage = `Błąd: ${error.message}`;
        }

        this.errorMessage = errorMessage;
        console.log('Error message set:', this.errorMessage);
      }
    },
    async fetchThesisTitle() {
      if (!this.projectId) return;

      try {
        const response = await axios.get(`/api/v1/thesis/byProjectId/${this.projectId}`);
        //const response = await axios.get(`/api/v1/chapter/${this.projectId}/all`);
        if (response.data) {
          this.thesisTitle = response.data.title || response.data.name || 'Brak tytułu';
          this.thesisTitleEng = response.data.title_en || response.data.name_en || 'Brak tytułu angielskiego';
          console.log('Fetched thesis title:', this.thesisTitle);
        }
      } catch (error) {
        console.error('Error fetching thesis title:', error);
        this.thesisTitle = 'ERROR, thesis title not found';
      }
    },



  },
};
</script>

<style scoped src="../css/ChaptersPreview.css"></style>