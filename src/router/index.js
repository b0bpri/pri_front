import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue' 
import GroupsPanel from '@/views/GroupsPanel.vue'
import ChaptersPreview from '@/views/ChaptersPreview.vue'
import Checklist from '@/views/Checklist.vue'
import ChecklistMaker from '@/views/ChecklistMaker.vue'
import Thesis from '@/views/Thesis.vue'
import ThesisCopy from '@/views/ThesisCopy.vue'
import StudentChapter from '@/components/StudentChapter.vue'
import Timeline from '@/views/Timeline.vue'


const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/groups-panel',
    name: 'GroupsPanel',
    component: GroupsPanel,
  },
  {
    path: '/chapters-preview/:id',
    name: 'ChaptersPreview',
    component: ChaptersPreview,
    props: true,
  },
  {
    path: '/checklist/file/:chapterVersionId',
    name: 'FileChecklist',
    component: Checklist,
    props: route => ({
      chapterVersionId: route.params.chapterVersionId,
      ...route.query
    }),
  },
  {
    path: '/checklist-maker',
    name: 'ChecklistMaker',
    component: ChecklistMaker,
    meta: { requiresPromoter: true },
  },
  {
    path: '/thesis/:groupId', 
    name: 'Thesis',
    component: Thesis,
    props: true,
  },
  {
    path: '/chapter/:groupId/:chapterId?', 
    name: 'StudentChapter',
    component: StudentChapter,
    props: true,
  },
  {
    path: '/thesis-copy/:groupId',
    name: 'ThesisCopy',
    component: ThesisCopy,
    props: true,
  },
  {
    path: '/timeline/:thesisId',
    name: 'Timeline',
    component: Timeline,
    props: true
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation protection based on user role
router.beforeEach(async (to, from, next) => {
  const { default: authStore } = await import('@/stores/authStore');
  
  // Small delay for authStore to initialize
  await new Promise(resolve => setTimeout(resolve, 50));
  
  console.log('[Router Guard] Current auth state:', {
    userId: authStore.userId,
    isPromoter: authStore.isPromoter,
    target: to.name
  });

  // If trying to access Home and already logged in, redirect
  if (to.name === 'Home' && authStore.userId) {
    console.log('[Router Guard] Already logged in, redirecting from Home');
    if (authStore.isPromoter) {
      next({ name: 'GroupsPanel' });
    } else {
      // For students, check thesis status and redirect appropriately
      try {
        const axios = (await import('axios')).default;
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
          // Check thesis status
          let groupWithThesisStatus = { ...studentGroup };
          
          if (!studentGroup.thesis_status && !studentGroup.isThesisAccepted && !studentGroup.thesisAccepted) {
            try {
              const thesisResponse = await axios.get(`/api/v1/thesis/byProjectId/${studentGroup.project_id}`);
              const thesisData = thesisResponse.data;
              groupWithThesisStatus.thesis_status = thesisData.approval_status || 'PENDING';
            } catch (thesisError) {
              console.warn('Could not fetch thesis status:', thesisError);
              groupWithThesisStatus.thesis_status = 'PENDING';
            }
          }

          const isThesisAccepted = groupWithThesisStatus.thesis_status === 'APPROVED';

          if (isThesisAccepted) {
            // If thesis is accepted, redirect to ChaptersPreview
            console.log('[Router Guard] Student with accepted thesis, redirecting to ChaptersPreview');
            next({ 
              name: 'ChaptersPreview', 
              params: { id: studentGroup.project_id.toString() },
              query: { 
                name: studentGroup.name || 'Unknown Group'
              }
            });
          } else {
            // If thesis is not accepted, redirect to Thesis view
            console.log('[Router Guard] Student with non-accepted thesis, redirecting to Thesis');
            next({ 
              name: 'Thesis', 
              params: { groupId: studentGroup.project_id.toString() },
              query: { 
                name: studentGroup.name || 'Unknown Group'
              }
            });
          }
          return;
        }
      } catch (error) {
        console.error('[Router Guard] Error checking student status:', error);
        // Fallback to Thesis view on error
        next({ name: 'GroupsPanel' });
        return;
      }
    }
    return;
  }

  // Allow access to home page for everyone
  if (to.name === 'Home') {
    next();
    return;
  }
  
  // Check if user is logged in
  if (!authStore.userId) {
    console.log('[Router Guard] Not logged in, redirecting to Home');
    next({ name: 'Home' });
    return;
  }
  
  // Allow promoters to access all routes
  if (authStore.isPromoter) {
    console.log('[Router Guard] Promoter access granted');
    next();
    return;
  }
  
  // Restrict ChecklistMaker to promoters only
  if (to.meta?.requiresPromoter && !authStore.isPromoter) {
    console.log('[Router Guard] Route requires promoter, access denied');
    next({ name: 'Home' });
    return;
  }
  
  // Block students from accessing GroupsPanel directly
  if (to.name === 'GroupsPanel' && !authStore.isPromoter) {
    console.log('[Router Guard] Student attempting to access GroupsPanel, checking thesis status for redirect');
    try {
      const axios = (await import('axios')).default;
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
        let groupWithThesisStatus = { ...studentGroup };
        
        if (!studentGroup.thesis_status && !studentGroup.isThesisAccepted && !studentGroup.thesisAccepted) {
          try {
            const thesisResponse = await axios.get(`/api/v1/thesis/byProjectId/${studentGroup.project_id}`);
            const thesisData = thesisResponse.data;
            groupWithThesisStatus.thesis_status = thesisData.approval_status || thesisData.status || 'PENDING';
          } catch (thesisError) {
            console.warn('Could not fetch thesis status:', thesisError);
            groupWithThesisStatus.thesis_status = 'PENDING';
          }
        }

        const isThesisAccepted = groupWithThesisStatus.thesis_status === 'APPROVED';

        if (isThesisAccepted) {
          console.log('[Router Guard] Student trying to access GroupsPanel with accepted thesis, redirecting to ChaptersPreview');
          next({ 
            name: 'ChaptersPreview', 
            params: { id: studentGroup.project_id.toString() },
            query: { 
              name: studentGroup.name || 'Unknown Group'
            }
          });
        } else {
          console.log('[Router Guard] Student trying to access GroupsPanel with non-accepted thesis, redirecting to Thesis');
          next({ 
            name: 'Thesis', 
            params: { groupId: studentGroup.project_id.toString() },
            query: { 
              name: studentGroup.name || 'Unknown Group'
            }
          });
        }
        return;
      }
    } catch (error) {
      console.error('[Router Guard] Error checking student status for GroupsPanel:', error);
      next({ name: 'Home' });
      return;
    }
  }
  
  // Check for restricted views for students - Thesis access
  if (to.name === 'Thesis' && !authStore.isPromoter) {
    console.log('[Router Guard] Student accessing Thesis, checking acceptance');
    try {
      // Check if student's thesis is already accepted
      const axios = (await import('axios')).default;
      
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
        // Check thesis status
        let groupWithThesisStatus = { ...studentGroup };
        
        if (!studentGroup.thesis_status && !studentGroup.isThesisAccepted && !studentGroup.thesisAccepted) {
          try {
            const thesisResponse = await axios.get(`/api/v1/thesis/byProjectId/${studentGroup.project_id}`);
            const thesisData = thesisResponse.data;
            groupWithThesisStatus.thesis_status = thesisData.approval_status || thesisData.status || 'PENDING';
          } catch (thesisError) {
            console.warn('Could not fetch thesis status:', thesisError);
            groupWithThesisStatus.thesis_status = 'PENDING';
          }
        }

        // Use the same logic as GroupsPanel for checking thesis acceptance
        const isThesisAccepted = groupWithThesisStatus.thesis_status === 'APPROVED';

        if (isThesisAccepted) {
          // Redirect to ChaptersPreview if thesis is accepted and they're trying to access Thesis
          console.log('Student with accepted thesis attempting to access Thesis view, redirecting to ChaptersPreview');
          next({ 
            name: 'ChaptersPreview', 
            params: { id: studentGroup.project_id.toString() },
            query: { 
              name: studentGroup.name || 'Unknown Group'
            }
          });
          return;
        }
        // If thesis is not accepted, allow access to Thesis view
      }
    } catch (error) {
      console.error('Error checking thesis status in route guard:', error);
    }
  }
  
  // Block students from accessing ChaptersPreview if thesis is not accepted
  if (to.name === 'ChaptersPreview' && !authStore.isPromoter) {
    console.log('[Router Guard] Student accessing ChaptersPreview, checking acceptance');
    try {
      const axios = (await import('axios')).default;
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
        let groupWithThesisStatus = { ...studentGroup };
        
        if (!studentGroup.thesis_status && !studentGroup.isThesisAccepted && !studentGroup.thesisAccepted) {
          try {
            const thesisResponse = await axios.get(`/api/v1/thesis/byProjectId/${studentGroup.project_id}`);
            const thesisData = thesisResponse.data;
            groupWithThesisStatus.thesis_status = thesisData.approval_status || thesisData.status || 'PENDING';
          } catch (thesisError) {
            console.warn('Could not fetch thesis status:', thesisError);
            groupWithThesisStatus.thesis_status = 'PENDING';
          }
        }

        const isThesisAccepted = groupWithThesisStatus.thesis_status === 'APPROVED';

        if (!isThesisAccepted) {
          // For students with non-accepted thesis, redirect to Thesis view
          console.log('Student with non-accepted thesis attempting to access ChaptersPreview, redirecting to Thesis view');
          next({ 
            name: 'Thesis', 
            params: { groupId: studentGroup.project_id.toString() },
            query: { 
              name: studentGroup.name || 'Unknown Group'
            }
          });
          return;
        }
        // If thesis is accepted, allow access to ChaptersPreview
      }
    } catch (error) {
      console.error('Error checking ChaptersPreview access:', error);
    }
  }
  
  // Default allow
  console.log('[Router Guard] Access granted to:', to.name);
  next();
});

export default router