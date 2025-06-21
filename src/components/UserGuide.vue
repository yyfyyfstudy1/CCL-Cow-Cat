<template>
  <div v-if="show" class="guide-overlay" @click="endGuide">
    <div class="highlight-box" :style="highlightStyle"></div>
    <div class="popup-box" :style="popupStyle" @click.stop>
      <div class="popup-content">
        <p>{{ currentStep.text }}</p>
      </div>
      <div class="popup-nav">
        <span class="step-counter">{{ currentStepIndex + 1 }} / {{ steps.length }}</span>
        <button class="nav-btn" @click="prevStep" :disabled="currentStepIndex === 0">上一步</button>
        <button class="nav-btn primary" @click="nextStep">{{ isLastStep ? '完成' : '下一步' }}</button>
      </div>
      <div class="popup-arrow" :style="arrowStyle"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  steps: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['close']);

const currentStepIndex = ref(0);
const highlightStyle = ref({});
const popupStyle = ref({});
const arrowStyle = ref({});

const currentStep = computed(() => props.steps[currentStepIndex.value]);
const isLastStep = computed(() => currentStepIndex.value === props.steps.length - 1);

const updateHighlight = () => {
  if (!currentStep.value) return;

  const targetElement = document.querySelector(currentStep.value.selector);
  if (!targetElement) {
    console.warn(`[UserGuide] Target element not found: ${currentStep.value.selector}`);
    endGuide();
    return;
  }

  const rect = targetElement.getBoundingClientRect();
  const padding = 10;

  highlightStyle.value = {
    top: `${rect.top - padding}px`,
    left: `${rect.left - padding}px`,
    width: `${rect.width + padding * 2}px`,
    height: `${rect.height + padding * 2}px`,
  };

  const popupWidth = 300;
  const popupTop = rect.bottom + 20;
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

const startGuide = () => {
  currentStepIndex.value = 0;
  nextTick(updateHighlight);
};

const nextStep = () => {
  if (isLastStep.value) {
    endGuide();
  } else {
    currentStepIndex.value++;
  }
};

const prevStep = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--;
  }
};

const endGuide = () => {
  emit('close');
};

watch(() => props.show, (newValue) => {
  if (newValue) {
    startGuide();
  }
});

watch(currentStepIndex, () => {
  nextTick(updateHighlight);
});

</script>

<style scoped>
.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 20000;
}

.highlight-box {
  position: absolute;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease-in-out;
  pointer-events: none;
}

.popup-box {
  position: absolute;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease-in-out;
  color: #333;
}

.popup-arrow {
  position: absolute;
  top: -10px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid white;
}

.popup-content p {
  margin: 0 0 15px 0;
  line-height: 1.6;
}

.popup-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-counter {
  font-size: 14px;
  color: #888;
}

.nav-btn {
  border: 1px solid #ccc;
  background: #f0f0f0;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
}

.nav-btn.primary {
  background-color: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 