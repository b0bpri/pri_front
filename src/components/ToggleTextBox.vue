<!-- The component works on mouse hovering. This will not work properly on telephones -->

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

<script setup>
import { ref } from 'vue';

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

<style scoped>
.toggle-container {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 100;
}

.toggle-button {
  font-size: 2em;
  width: 1.2em;
  height: 1.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 50%;  /* Makes it a circle */
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle-button:hover {
  background-color: #45a049;
}

.text-box {
  background-color: #f8f9fa;
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  max-width: 800px;
  min-width: 200px;
  width: max-content;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: absolute;
  right: 100%;
  top: 0;
  z-index: 10;
  opacity: 1;
  transition: opacity 0.5s ease-in-out;
  margin-right: 1rem;
}

.text-box.fade-out {
  opacity: 0;
  pointer-events: none;
}

</style>