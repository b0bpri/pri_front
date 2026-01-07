<template>
    <div class="wrapper">
        <div class="card">
            <div class="header-container">
                <h2 class="title">
                    {{ isThesisChecklist ? 'Checklista dla pracy' : `Checklista dla wersji #${chapterVersion || 'Unknown'}` }}
                </h2>
                <button class="back-btn" @click="goBack">
                    <i class="icon-back"></i> Powrót
                </button>
            </div>
            
            <div v-if="loading" class="loading-indicator">
                <p>Ładowanie checklisty...</p>
            </div>
            
            <div v-else-if="hasChecklistItems" class="checklist-content">
                <div class="checklist-summary">
                    <p class="total-points">Liczba punktów: {{ calculateTotalPoints() }}</p>
                    <p class="checklist-status" :class="{ 'passed': checklist.isPassed }">
                        Status: {{ checklist.isPassed ? 'Zaliczono' : 'Niezaliczono' }}
                    </p>
                </div>
                <div v-for="(item, index) in getChecklistItems()" :key="index" class="checklist-item">
                    <input 
                        type="checkbox" 
                        v-model="item.checked"
                        :disabled="!isPromoter"
                        @change="updateQuestionPoints(item)"
                    />
                    <span :class="{ 'completed': item.checked }">
                        {{ item.question }}
                        <small v-if="item.isCritical || item.is_critical" class="critical-badge">(Krytyczne)</small>
                        <small class="points-badge">{{ item.checked ? '+1' : '0' }} pkt</small>
                    </span>
                </div>
                <div class="actions">
                    <button v-if="isPromoter" class="save-btn" @click="saveChecklist">
                        Zapisz
                    </button>
                </div>
            </div>
            <div v-else>
                <p>Brak pytań na checkliście.</p>
                <div v-if="isPromoter" class="debug-info">
                    <h4>Informacje diagnostyczne (dla promotora):</h4>
                    <pre>{{ JSON.stringify(checklist, null, 2) }}</pre>
                </div>
            </div>
            
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
            <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
        </div>
    </div>
</template>

<script>
import axios from 'axios'
import authStore from '/src/stores/authStore';

export default {
    name: 'Checklist',
    props: {
        chapterVersionId: {
            type: [String, Number],
            required: true
        },
        type: {
            type: String,
            default: 'chapter'
        }
    },
    data() {
        return {
            isPromoter: authStore.isPromoter,
            chapterVersion: null, 
            checklist: { 
                id: null,
                isPassed: false,
                checklistQuestionModels: [] 
            },
            errorMessage: '',
            successMessage: '',
            loading: false,
            projectId: null
        }
    },
    computed: {
        hasChecklistItems() {
            return (this.checklist.checklistQuestionModels && this.checklist.checklistQuestionModels.length > 0) || 
                   (this.checklist.models && this.checklist.models.length > 0);
        },
        isThesisChecklist() {
            return this.$route.query.type === 'thesis' || this.type === 'thesis';
        }
    },
    created() {
        if (this.chapterVersionId) {
            // Extract ID if it's in format "thesis-3"
            const idString = String(this.chapterVersionId);
            if (idString.startsWith('thesis-')) {
                this.chapterVersion = idString.replace('thesis-', '');
            } else {
                this.chapterVersion = this.chapterVersionId;
            }
            console.log('Setting chapter version to:', this.chapterVersion, '(isThesis:', this.$route.query.type === 'thesis', ')');
            this.fetchChecklist();
            try {
                const referrer = document.referrer;
                const match = referrer.match(/\/chapters-preview\/(\d+)/);
                if (match && match[1]) {
                    this.projectId = match[1];
                    console.log('Retrieved projectId from referrer:', this.projectId);
                }
            } catch (e) {
                console.error('Error getting projectId from referrer:', e);
            }
        } else {
            console.error('No chapterVersionId provided to Checklist component');
            this.errorMessage = 'Nie można załadować checklisty: brak ID wersji';
        }
    },
    methods: {
        goBack() {
            if (this.projectId) {
                this.$router.push({ name: 'ChaptersPreview', params: { id: this.projectId } });
            } else {
                this.$router.go(-1);
            }
        },
        getChecklistItems() {
            if (this.checklist.checklistQuestionModels && this.checklist.checklistQuestionModels.length > 0) {
                return this.checklist.checklistQuestionModels;
            } else if (this.checklist.models && this.checklist.models.length > 0) {
                return this.checklist.models;
            }
            return [];
        },
        async fetchChecklist() {
            if (!this.chapterVersion) {
                console.error('Cannot fetch checklist: ID is missing');
                this.errorMessage = 'Nie można załadować checklisty: brak ID';
                return;
            }
            
            // Determine endpoint based on type
            const endpoint = this.isThesisChecklist 
                ? `/api/v1/view/thesis/${this.chapterVersion}/note/`
                : `/api/v1/view/version/${this.chapterVersion}/note/`;
            
            console.log(`Fetching ${this.isThesisChecklist ? 'thesis' : 'chapter'} checklist from:`, endpoint);
            this.loading = true;
            try {               
                const response = await axios.get(endpoint);
                console.log('Checklist response:', response.data);
                
                console.log('Response structure:', JSON.stringify(response.data, null, 2));
                
                if (response.data && Object.keys(response.data).length > 0) {
                    this.checklist = response.data;         
                    
                    if (this.checklist.models && this.checklist.models.length > 0) {
                        console.log(`Processing ${this.checklist.models.length} checklist items`);
                        
                        this.checklist.models.forEach(question => { 
                            // Handle new 'passed' field instead of 'points'
                            question.checked = question.passed || false;
                            question.points = question.passed ? 1 : 0;
                            console.log(`Question ${question.id} loaded with passed: ${question.passed}, checked: ${question.checked}`);
                        });
                        
                        if (!this.checklist.checklistQuestionModels) {
                            this.checklist.checklistQuestionModels = this.checklist.models;
                        }
                    } else {
                        console.warn('No checklist models found in the response');
                    }
                } else {
                    console.warn('Empty response data received');
                    this.checklist = {
                        id: null,
                        isPassed: false,
                        models: [],
                        checklistQuestionModels: []
                    };
                }
                
                this.updateChecklistPassedStatus();
                
            } catch (error) {
                console.error('Error fetching checklist:', error);
                
                // Handle 404 specifically - no checklist exists yet
                if (error.response?.status === 404) {
                    console.log('No checklist found (404) - this is normal for files without checklists');
                    this.checklist = {
                        id: null,
                        isPassed: false,
                        models: [],
                        checklistQuestionModels: []
                    };
                    this.errorMessage = '';
                } else if (error.response?.status === 500) {
                    
                    const errorData = error.response.data;
                    if (typeof errorData === 'string' && errorData.includes('NullPointerException')) {
                        console.log('Backend null pointer - no checklist exists for this version');
                        this.checklist = {
                            id: null,
                            isPassed: false,
                            models: [],
                            checklistQuestionModels: []
                        };
                        this.errorMessage = '';
                    } else {
                        this.errorMessage = 'Błąd serwera przy pobieraniu checklisty.';
                    }
                } else {
                    this.errorMessage = 'Nie udało się pobrać checklisty.';
                }
            } finally {
                this.loading = false;
            }
        },
        
        updateQuestionPoints(question) {
            const isChecked = Boolean(question.checked);
            question.points = isChecked ? 1 : 0;
            
            if (question.hasOwnProperty('passed')) {
                question.passed = isChecked;
            }

            console.log(`Question ${question.id || 'new'} updated:`, {
                question: question.question,
                checked: isChecked,
                points: question.points,
                critical: question.critical || question.isCritical || question.is_critical || false
            });
            
            this.updateChecklistPassedStatus();
        },
        
        updateChecklistPassedStatus() {
            const items = this.getChecklistItems();
            if (!items || items.length === 0) {
                this.checklist.isPassed = false;
                console.log('No items to check, setting isPassed to false');
                return;
            }

            const allChecked = items.every(q => q.points > 0);
            this.checklist.isPassed = allChecked;
            
            console.log(`Checklist pass status updated: ${this.checklist.isPassed} (all checked: ${allChecked})`);
        },

        calculateTotalPoints() {
            const items = this.getChecklistItems();
            if (!items || items.length === 0) {
                console.log('No checklist items to calculate points');
                return 0;
            }
            const totalPoints = items.reduce((total, question) => {
                return total + (question.points || 0);
            }, 0);
            
            console.log('Total points calculated:', totalPoints, 'from', items.length, 'items');
            return totalPoints;
        },

        verifyChanges(originalItems) {
            const currentItems = this.getChecklistItems();

            const originalMap = {};
            originalItems.forEach(item => {
                const key = item.id ? item.id : item.question;
                originalMap[key] = {
                    question: item.question,
                    points: item.points,
                    checked: item.checked || item.passed
                };
            });
            
            let changeCount = 0;
            const mismatchedItems = [];
            
            currentItems.forEach(item => {
                const key = item.id ? item.id : item.question;
                
                if (originalMap[key]) {
                    const original = originalMap[key];
                    if (original.points !== item.points || original.checked !== (item.checked || item.passed)) {
                        changeCount++;
                        mismatchedItems.push({
                            id: item.id,
                            question: item.question,
                            originalPoints: original.points,
                            currentPoints: item.points,
                            originalChecked: original.checked,
                            currentChecked: item.checked || item.passed
                        });
                    }
                }
            });
            
            if (changeCount === 0) {
                console.warn('No changes detected after save! This might indicate a backend issue or field name mismatch.');
                console.log('Check the backend logs to see if the data is being received correctly.');
            } else {
                console.log(`Verified ${changeCount} changes were saved successfully.`);
                console.log('Changed items:', mismatchedItems);
            }
        },

        createChecklistDto(items) {
            const itemId = parseInt(this.chapterVersion, 10);
            
            console.log(`Creating ${this.isThesisChecklist ? 'thesis' : 'chapter'} checklist DTO with ID: ${itemId}`);
            const modelsArray = items.map(item => {
                const isChecked = Boolean(item.checked || item.passed || item.points > 0);
                
                const resultItem = {
                    ...(item.id && { id: item.id }),
                    question: item.question,
                    passed: isChecked
                };
                
                console.log(`Saving item "${item.question}":`, {
                    id: item.id || 'new',
                    passed: isChecked
                });
                
                return resultItem;
            });

            const dto = {
                uploadTime: new Date(), 
                models: modelsArray
            };

            // Add appropriate ID based on checklist type
            if (this.isThesisChecklist) {
                dto.thesisId = itemId;
            } else {
                dto.versionId = itemId;
            }
            
            // Add checklist id if updating existing
            if (this.checklist?.id) {
                dto.id = this.checklist.id;
                // console.log('Checklist has ID - updating existing:', this.checklist.id);
            } else {
                // console.log('Checklist has no ID - this might cause issues');
                // console.log('Checklist object:', this.checklist);
            }

            // console.log("Final DTO structure:", JSON.stringify(dto, null, 2));
            
            return dto;
        },

        async saveChecklist() {
            if (!this.isPromoter) return;
            this.loading = true;
            this.errorMessage = '';
            this.successMessage = '';
            
            if (!this.chapterVersion) {
                console.error('Cannot save checklist: chapter version ID is missing');
                this.errorMessage = 'Nie można zapisać checklisty: brak ID wersji';
                this.loading = false;
                return;
            }
            
            try {
                const items = this.getChecklistItems();
                const checklistDto = this.createChecklistDto(items);

                // console.log('Saving checklist with structure:', JSON.stringify(checklistDto, null, 2));
                
                // Don't override headers - let axios interceptor add JWT token
                const response = await axios.post('/api/v1/post/note', checklistDto);
                console.log('Save response:', response);
                
                if (response.data === true || response.data) {
                    this.successMessage = 'Checklist została zapisana pomyślnie.';
                    setTimeout(() => {
                        this.successMessage = '';
                    }, 3000);

                    // Refresh checklist from backend to get updated data
                    await this.fetchChecklist();
                } else {
                    throw new Error(`Unexpected response from server: ${response.data}`);
                }
            } catch (error) {
                console.error('Error saving checklist:', error);
         
                let errorMsg = 'Nie udało się zapisać checklisty';
                if (error.response && error.response.status) {
                    errorMsg += ` (kod błędu: ${error.response.status})`;
                    
                    if (error.response.status === 500) {
                        const errorData = error.response.data;
                        if (typeof errorData === 'string' && errorData.includes('NullPointerException')) {
                            console.log('Backend null pointer - attempting to continue...');
                            errorMsg = 'Błąd serwera: brak danych kontekstu. Spróbuj ponownie.';
                        }
                    }
                    
                    if (error.response.data) {
                        console.error('Error details:', error.response.data);
                        
                        if (typeof error.response.data === 'string') {
                            errorMsg += `: ${error.response.data}`;
                        } else if (error.response.data.message) {
                            errorMsg += `: ${error.response.data.message}`;
                        }
                    }
                }
                
                if (error.message) {
                    errorMsg += `: ${error.message}`;
                }
                this.errorMessage = errorMsg;

                setTimeout(() => {
                    this.errorMessage = '';
                }, 5000);
            } finally {
                this.loading = false;
            }
        }
    }
}
</script>

<style scoped src="../css/Checklist.css"></style>