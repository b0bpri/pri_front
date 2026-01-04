<template>
  <div class="toggle-container" @mouseleave="startHideTimer">
    <button
        class="toggle-button"
        @click="toggleText"
        @mouseenter="cancelHideTimer"
    >
      &#9432
    </button>
    <div
        v-show="isVisible"
        class="text-box"
        :class="{ 'fade-out': isFadingOut }"
        @mouseenter="cancelHideTimer"
        @mouseleave="startHideTimer"
        @transitionend="onTransitionEnd"
    >
      <p>{{ content }}</p>
    </div>
  </div>
</template>

<!-- The component works on mouse hovering. This will not work properly on telephones -->

<script setup>
import { ref } from 'vue';
import '../css/ToggleTextBox.css';

const props = defineProps({
  //Text that will be displayed
  content: {
    type: String,
    default: 'This is the text that will be displayed.'
  }
});

const isVisible = ref(false);
const isFadingOut = ref(false);
let hideTimer = null;

const toggleText = () => {
  if (isVisible.value) {
    startFadeOut();
  } else {
    isVisible.value = true;
    isFadingOut.value = false;
  }
};

const startHideTimer = () => {
  cancelHideTimer();
  if (isVisible.value && !isFadingOut.value) {
    hideTimer = setTimeout(() => {
      startFadeOut();
    }, 5000); // 5 seconds
  }
};

const startFadeOut = () => {
  isFadingOut.value = true;
  // The actual hiding happens in the transitionend event
};

const onTransitionEnd = (event) => {
  if (event.propertyName === 'opacity' && isFadingOut.value) {
    isVisible.value = false;
    isFadingOut.value = false;
  }
};

const cancelHideTimer = () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  isFadingOut.value = false;
};
</script>