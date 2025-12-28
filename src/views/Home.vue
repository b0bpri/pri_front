<template>
  <div class="wrapper">
    <div class="card">
      <h2 class="title">Logowanie</h2>
      <form @submit.prevent="login" class="login-form">
        <div class="form-group">
          <label for="username">Nazwa użytkownika:</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            placeholder="Wprowadź nazwę użytkownika"
            required
          />
        </div>
        <div class="form-group">
          <label for="password">Hasło:</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Wprowadź hasło"
            required
          />
        </div>
        <button type="submit" class="login-btn">Zaloguj się</button>
      </form>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      
      <div class="divider">
        <span>LUB SZYBKIE LOGOWANIE</span>
      </div>
      
      <h2 class="title">Wybierz rolę</h2>
      <div class="button-group">
        <button class="role-btn" @click="loginAsStudent">Zaloguj jako Student: Tomasz Wasyłyk</button>
        <button class="role-btn" @click="loginAsPromoter">Zaloguj jako Promotor: Patryk Żywica</button>
      </div>
      <div class="button-group mt-10">
        <button class="role-btn alt-btn" @click="loginAsAlternateStudent">Zaloguj jako Student: Katarzyna Strzyżewska</button>
        <button class="role-btn alt-btn" @click="loginAsAlternatePromoter">Zaloguj jako Promotor: Marcin Szczepański</button>
      </div>
    </div>
  </div>
</template>

<script>
import authStore from '/src/stores/authStore';
import { useRouter } from 'vue-router';
import axios from 'axios';

export default {
  name: 'Home',
  data() {
    return {
      username: '',
      password: '',
      errorMessage: ''
    };
  },
  setup() {
    const router = useRouter();

    return { router };
  },
  methods: {
    async login() {
      this.errorMessage = '';
      try {
        const response = await axios.post('/api/v1/auth/login', {
          username: this.username,
          password: this.password
        });
        
        console.log('Login successful:', response.data);
        
        // Handle successful login, will need to set user data in authStore
        this.router.push('/groups-panel');
      } catch (error) {
        console.error('Login error:', error);
        this.errorMessage = error.response?.data?.message || 'Nie udało się zalogować. Sprawdź dane logowania.';
      }
    },

    async loginAsStudent() {
      this.errorMessage = '';
      try {
        const response = await axios.get('/api/v1/users');
        const students = response.data;
        const student = students.find(s => s.id === 30);

        if (!student) {
          throw new Error('Student not found');
        }

        let firstName = student.fName || student.fname || student.firstName || student.f_name || '';
        let lastName = student.lName || student.lname || student.lastName || student.l_name || '';

        if (!firstName || !lastName) {
          console.warn('Student data:', student);
          throw new Error('Student name data is incomplete');
        }

        authStore.setUser(false, 30, firstName, lastName);
        console.log('Student login successful:', authStore);
        await this.redirectStudentToChapters(30);
      } catch (error) {
        console.error('Error logging in as student:', error);
        this.errorMessage = `Nie udało się zalogować jako student: ${error.message}`;
      }
    },

    async loginAsPromoter() {
      this.errorMessage = '';
      try {
        const response = await axios.get('/api/v1/users');
        const students = response.data;
        const promoter = students.find(s => s.id === 1); 

        if (!promoter) {
          throw new Error('Promoter not found');
        }

        let firstName = promoter.fName || promoter.fname || promoter.firstName || promoter.f_name || '';
        let lastName = promoter.lName || promoter.lname || promoter.lastName || promoter.l_name || '';

        if (!firstName || !lastName) {
          console.warn('Promoter data:', promoter);
          throw new Error('Promoter name data is incomplete');
        }

        authStore.setUser(true, 1, firstName, lastName);
        console.log('Promoter login successful:', authStore);
        this.router.push('/groups-panel');
      } catch (error) {
        console.error('Error logging in as promoter:', error);
        this.errorMessage = `Nie udało się zalogować jako promotor: ${error.message}`;
      }
    },
    
    async loginAsAlternateStudent() {
      this.errorMessage = '';
      try {
        const response = await axios.get('/api/v1/users');
        const students = response.data;
        const student = students.find(s => s.id === 28);

        if (!student) {
          throw new Error('Student not found');
        }

        let firstName = student.fName || student.fname || student.firstName || student.f_name || '';
        let lastName = student.lName || student.lname || student.lastName || student.l_name || '';

        if (!firstName || !lastName) {
          console.warn('Student data:', student);
          throw new Error('Student name data is incomplete');
        }

        authStore.setUser(false, 28, firstName, lastName);
        console.log('Alternate student login successful:', authStore);
        await this.redirectStudentToChapters(28);
      } catch (error) {
        console.error('Error logging in as alternate student:', error);
        this.errorMessage = `Nie udało się zalogować jako student: ${error.message}`;
      }
    },
    
    async loginAsAlternatePromoter() {
      this.errorMessage = '';
      try {
        const response = await axios.get('/api/v1/users');
        const students = response.data;
        const promoter = students.find(s => s.id === 32); 

        if (!promoter) {
          throw new Error('Promoter not found');
        }

        let firstName = promoter.fName || promoter.fname || promoter.firstName || promoter.f_name || '';
        let lastName = promoter.lName || promoter.lname || promoter.lastName || promoter.l_name || '';

        if (!firstName || !lastName) {
          console.warn('Promoter data:', promoter);
          throw new Error('Promoter name data is incomplete');
        }

        authStore.setUser(true, 32, firstName, lastName);
        console.log('Alternate promoter login successful:', authStore);
        this.router.push('/groups-panel');
      } catch (error) {
        console.error('Error logging in as alternate promoter:', error);
        this.errorMessage = `Nie udało się zalogować jako promotor: ${error.message}`;
      }
    },

    async redirectStudentToChapters(studentId) {
      try {
        // Fetch all groups to find which group this student belongs to
        const response = await axios.get('/api/v1/view/groups/all');
        
        let groups = [];
        if (response.data && Array.isArray(response.data.dtos)) {
          groups = response.data.dtos;
        } else if (response.data && Array.isArray(response.data)) {
          groups = response.data;
        }

        // Find the group logged in student belongs to
        const studentGroup = groups.find(group => 
          group.students && Array.isArray(group.students) && 
          group.students.some(student => student.id === studentId)
        );

        if (studentGroup && studentGroup.project_id) {
          console.log('Found student group:', studentGroup);
          
          // Check if thesis is accepted 
          let groupWithThesisStatus = { ...studentGroup };
          
          // Fetch thesis status if not already present
          if (!studentGroup.thesis_status && !studentGroup.isThesisAccepted && !studentGroup.thesisAccepted) {
            try {
              const thesisResponse = await axios.get(`/api/v1/thesis/byProjectId/${studentGroup.project_id}`);
              const thesisData = thesisResponse.data;
              console.log('Thesis response for project:', studentGroup.project_id, thesisData);
              
              groupWithThesisStatus.thesis_status = thesisData.approval_status || thesisData.status || 'PENDING';
            } catch (thesisError) {
              console.warn('Could not fetch thesis status, defaulting to PENDING:', thesisError);
              groupWithThesisStatus.thesis_status = 'PENDING';
            }
          }

          // Use the same logic as GroupsPanel for checking thesis acceptance
          const isThesisAccepted = groupWithThesisStatus.thesis_status === 'APPROVED';

          console.log('Thesis status:', groupWithThesisStatus.thesis_status, 'Is accepted:', isThesisAccepted);
          
          if (isThesisAccepted) {
            // Redirect to ChaptersPreview if thesis is accepted
            console.log('Redirecting to ChaptersPreview for accepted thesis');
            this.router.push({ 
              name: 'ChaptersPreview', 
              params: { id: studentGroup.project_id.toString() },
              query: { 
                name: studentGroup.name || 'Unknown Group'
              }
            });
          } else {
            // Redirect to Thesis view if thesis is not accepted yet
            console.log('Redirecting to Thesis view for non-accepted thesis');
            this.router.push({ 
              name: 'Thesis', 
              params: { groupId: studentGroup.project_id.toString() },
              query: { 
                name: studentGroup.name || 'Unknown Group'
              }
            });
          }
        } else {
          console.warn('Student does not belong to any group, redirecting to groups panel');
          this.router.push('/groups-panel');
        }
      } catch (error) {
        console.error('Error redirecting student to chapters:', error);
        this.router.push('/groups-panel');
      }
    }
  }
};
</script>

<style scoped src="../css/Home.css"></style>