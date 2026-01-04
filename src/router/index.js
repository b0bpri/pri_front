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
import NoGroup from '@/views/NoGroup.vue'


const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/no-group',
    name: 'NoGroup',
    component: NoGroup,
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

// Cache for groups and thesis status to reduce API calls
const cache = {
  groups: null,
  groupsTimestamp: 0,
  thesisStatus: {},
  thesisTimestamp: {},
  CACHE_DURATION: 30000 // 30 seconds
};

// Helper function to get cached or fetch groups
const getGroupsWithCache = async () => {
  const now = Date.now();
  
  if (cache.groups && (now - cache.groupsTimestamp < cache.CACHE_DURATION)) {
    console.log('[Cache] Using cached groups');
    return cache.groups;
  }
  
  console.log('[Cache] Fetching fresh groups');
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get('/api/v1/view/groups/all');
    let groups = [];
    if (response.data && Array.isArray(response.data.dtos)) {
      groups = response.data.dtos;
    } else if (response.data && Array.isArray(response.data)) {
      groups = response.data;
    }
    
    cache.groups = groups;
    cache.groupsTimestamp = now;
    return groups;
  } catch (error) {
    console.error('[Cache] Error fetching groups:', error);
    return [];
  }
};

// Helper function to get cached or fetch thesis status
const getThesisStatusWithCache = async (projectId) => {
  const now = Date.now();
  const cacheKey = projectId.toString();
  
  if (cache.thesisStatus[cacheKey] && 
      (now - (cache.thesisTimestamp[cacheKey] || 0) < cache.CACHE_DURATION)) {
    console.log('[Cache] Using cached thesis status for project:', projectId);
    return cache.thesisStatus[cacheKey];
  }
  
  console.log('[Cache] Fetching fresh thesis status for project:', projectId);
  try {
    const axios = (await import('axios')).default;
    const thesisResponse = await axios.get(`/api/v1/thesis/byProjectId/${projectId}`);
    const status = thesisResponse.data.approval_status || thesisResponse.data.status || 'PENDING';
    
    cache.thesisStatus[cacheKey] = status;
    cache.thesisTimestamp[cacheKey] = now;
    return status;
  } catch (error) {
    console.warn('[Cache] Error fetching thesis status:', error);
    return 'PENDING';
  }
};

// Function to clear cache
export function clearRouterCache() {
  console.log('[Cache] Clearing router cache');
  cache.groups = null;
  cache.groupsTimestamp = 0;
  cache.thesisStatus = {};
  cache.thesisTimestamp = {};
}

// Helper function to get student's group
const getStudentGroup = async (authStore) => {
  const groups = await getGroupsWithCache();
  return groups.find(group => 
    group.students && Array.isArray(group.students) && 
    group.students.some(student => student.id === authStore.userId)
  );
};

// Helper function to get thesis status (uses cache)
const getThesisStatus = async (projectId) => {
  return await getThesisStatusWithCache(projectId);
};

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

  // Allow access to home page for everyone
  if (to.name === 'Home') {
    // If logged in and trying to access Home, redirect to appropriate page
    if (authStore.userId) {
      console.log('[Router Guard] Already logged in, redirecting from Home');
      if (authStore.isPromoter) {
        next({ name: 'GroupsPanel' });
        return;
      } else {
        // For students, check if they belong to a group
        const studentGroup = await getStudentGroup(authStore);
        
        if (!studentGroup) {
          console.log('[Router Guard] Student has no group, redirecting to NoGroup');
          next({ name: 'NoGroup' });
          return;
        }

        // Student has a group, check thesis status and redirect appropriately
        if (studentGroup.project_id) {
          const thesisStatus = await getThesisStatus(studentGroup.project_id);
          const isThesisAccepted = thesisStatus === 'APPROVED';

          if (isThesisAccepted) {
            console.log('[Router Guard] Student with accepted thesis, redirecting to ChaptersPreview');
            next({ 
              name: 'ChaptersPreview', 
              params: { id: studentGroup.project_id.toString() },
              query: { 
                name: studentGroup.name || 'Unknown Group'
              }
            });
          } else {
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
        } else {
          // Student has group but no project_id - redirect to NoGroup
          next({ name: 'NoGroup' });
          return;
        }
      }
    } else {
      // Not logged in, allow access to Home
      next();
      return;
    }
  }

  // Allow access to NoGroup page for logged in users
  if (to.name === 'NoGroup' && authStore.userId) {
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

  // For students - check if they belong to a group before allowing any access
  const studentGroup = await getStudentGroup(authStore);
  
  if (!studentGroup || !studentGroup.project_id) {
    console.log('[Router Guard] Student has no group, blocking access to:', to.name);
    next({ name: 'NoGroup' });
    return;
  }

  console.log('[Router Guard] Student belongs to group:', studentGroup.name);
  
  // Restrict ChecklistMaker to promoters only
  if (to.meta?.requiresPromoter && !authStore.isPromoter) {
    console.log('[Router Guard] Route requires promoter, access denied');
    next({ name: 'NoGroup' });
    return;
  }
  
  // Block students from accessing GroupsPanel directly
  if (to.name === 'GroupsPanel') {
    console.log('[Router Guard] Student attempting to access GroupsPanel, redirecting based on thesis status');
    
    const thesisStatus = await getThesisStatus(studentGroup.project_id);
    const isThesisAccepted = thesisStatus === 'APPROVED';

    if (isThesisAccepted) {
      console.log('[Router Guard] Redirecting to ChaptersPreview');
      next({ 
        name: 'ChaptersPreview', 
        params: { id: studentGroup.project_id.toString() },
        query: { 
          name: studentGroup.name || 'Unknown Group'
        }
      });
    } else {
      console.log('[Router Guard] Redirecting to Thesis');
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
  
  // Check for restricted views for students - Thesis access
  if (to.name === 'Thesis') {
    console.log('[Router Guard] Student accessing Thesis, checking if thesis is accepted');
    
    const thesisStatus = await getThesisStatus(studentGroup.project_id);
    const isThesisAccepted = thesisStatus === 'APPROVED';

    if (isThesisAccepted) {
      console.log('[Router Guard] Thesis accepted, redirecting to ChaptersPreview');
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
  
  // Block students from accessing ChaptersPreview if thesis is not accepted
  if (to.name === 'ChaptersPreview') {
    console.log('[Router Guard] Student accessing ChaptersPreview, checking if thesis is accepted');
    
    const thesisStatus = await getThesisStatus(studentGroup.project_id);
    const isThesisAccepted = thesisStatus === 'APPROVED';

    if (!isThesisAccepted) {
      console.log('[Router Guard] Thesis not accepted, redirecting to Thesis view');
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
  
  // Default allow
  console.log('[Router Guard] Access granted to:', to.name);
  next();
});

export default router
