<template>
  <div v-if="show" class="highlight-overlay" @click="close">
    <div class="highlight-box" :style="highlightStyle"></div>
    <div class="popup-box" :style="popupStyle">
      <div class="popup-content">
        <p>{{ text }}</p>
      </div>
      <div class="popup-arrow" :style="arrowStyle"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  show: Boolean,
  targetSelector: String,
  text: String,
});

const emit = defineEmits(['close']);

const highlightStyle = ref({});
const popupStyle = ref({});
const arrowStyle = ref({});
let resizeObserver = null;

const updatePosition = () => {
  const targetElement = document.querySelector(props.targetSelector);
  if (!targetElement) {
    console.warn(`[FeatureHighlight] Target not found: ${props.targetSelector}`);
    close();
    return;
  }

  const rect = targetElement.getBoundingClientRect();
  const padding = 8;

  highlightStyle.value = {
    top: `${rect.top - padding}px`,
    left: `${rect.left - padding}px`,
    width: `${rect.width + padding * 2}px`,
    height: `${rect.height + padding * 2}px`,
  };
  
  const popupWidth = 280;
  const popupTop = rect.bottom + 18;
  let popupLeft = rect.left + rect.width / 2 - popupWidth / 2;
  
  if (popupLeft < 10) popupLeft = 10;
  if (popupLeft + popupWidth > window.innerWidth - 10) {
    popupLeft = window.innerWidth - popupWidth - 10;
  }

  popupStyle.value = {
    top: `${popupTop}px`,
    left: `${popupLeft}px`,
    width: `${popupWidth}px`,
  };

  arrowStyle.value = {
    left: `${rect.left + rect.width / 2 - popupLeft - 10}px`,
  };
};

const setupObservers = () => {
    const targetElement = document.querySelector(props.targetSelector);
    if (!targetElement) return;

    resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(targetElement);
    window.addEventListener('resize', updatePosition);
};

const cleanupObservers = () => {
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    window.removeEventListener('resize', updatePosition);
};

watch(() => props.show, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden';
    nextTick(() => {
        updatePosition();
        setupObservers();
    });
  } else {
    document.body.style.overflow = '';
    cleanupObservers();
  }
});

const close = () => {
  emit('close');
};

onUnmounted(() => {
    document.body.style.overflow = '';
    cleanupObservers();
})
</script>

<style scoped>
.highlight-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 19000;
  cursor: pointer;
}

.highlight-box {
  position: absolute;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
  transition: all 0.3s ease-in-out;
  pointer-events: none;
}

.popup-box {
  position: absolute;
  background: #333;
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease-in-out;
  pointer-events: none; /* Let clicks pass through to the overlay */
}

.popup-arrow {
  position: absolute;
  top: -10px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #333;
}

.popup-content p {
  margin: 0;
  line-height: 1.6;
  font-size: 15px;
}
</style> 