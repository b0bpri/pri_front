import { reactive, watch } from 'vue';
import Cookies from 'js-cookie';

const AUTH_KEY = 'authState';

const loadAuthState = () => {
  try {
    const savedState = Cookies.get(AUTH_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      console.log('Loaded auth state from cookies:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading auth state from cookies:', error);
    Cookies.remove(AUTH_KEY);
  }
  return { isPromoter: false, userId: null, fname: '', lname: '', token: null };
};

const authStore = reactive(loadAuthState());

watch(
  () => ({ ...authStore }),
  (newState) => {
    if (newState.userId) {
      console.log('Saving auth state to cookies:', newState);
      Cookies.set(AUTH_KEY, JSON.stringify(newState), { expires: 1/24 }); //1hour 
    } else {
      console.log('Removing auth state from cookies');
      Cookies.remove(AUTH_KEY);
    }
  },
  { deep: true }
);

authStore.setUser = (isPromoter, userId, fname, lname, token = null) => {
  console.log('Setting user:', { isPromoter, userId, fname, lname, token: token ? '***' : null });
  authStore.isPromoter = isPromoter;
  authStore.userId = userId;
  authStore.fname = fname;
  authStore.lname = lname;
  authStore.token = token;
};

authStore.logout = () => {
  console.log('Logging out user');
  authStore.isPromoter = false;
  authStore.userId = null;
  authStore.fname = '';
  authStore.lname = '';
  authStore.token = null;
};

console.log('AuthStore initialized:', { ...authStore });

export default authStore;