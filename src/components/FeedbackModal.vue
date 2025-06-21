<template>
  <transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>意见反馈</h3>
          <button class="close-btn" @click="$emit('close')">&times;</button>
        </div>
        <div class="modal-body">
          <textarea
            v-model="feedbackText"
            class="feedback-textarea"
            placeholder="请在此输入您的宝贵意见或建议..."
            :disabled="isLoading || isSuccess"
          ></textarea>
          <p v-if="error" class="error-message">{{ error }}</p>
          <div v-if="isSuccess" class="success-message">
            <span class="material-icons">check_circle</span>
            <p>感谢您的反馈！</p>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="submit-btn"
            @click="handleSubmit"
            :disabled="!feedbackText.trim() || isLoading || isSuccess"
          >
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>{{ isSuccess ? '已发送' : '提交反馈' }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue';
import { addFeedback } from '../services/feedback.js';

const props = defineProps({
  show: Boolean,
});
const emit = defineEmits(['close']);

const feedbackText = ref('');
const isLoading = ref(false);
const isSuccess = ref(false);
const error = ref('');

watch(() => props.show, (newValue) => {
  if (newValue) {
    // Reset state when modal opens
    feedbackText.value = '';
    isLoading.value = false;
    isSuccess.value = false;
    error.value = '';
  }
});

const handleSubmit = async () => {
  if (!feedbackText.value.trim()) return;

  isLoading.value = true;
  error.value = '';

  try {
    await addFeedback(feedbackText.value);
    isSuccess.value = true;
    setTimeout(() => {
      emit('close');
    }, 1500); // Auto close after success
  } catch (e) {
    error.value = e.message || "提交失败，请稍后重试。";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 520px;
  animation: slide-up 0.3s ease-out;
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #aaa;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;
}
.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 24px;
}

.feedback-textarea {
  width: 100%;
  min-height: 150px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.feedback-textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background-color: #4a90e2;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}
.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.submit-btn:hover:not(:disabled) {
  background-color: #357abd;
}

.error-message {
  color: #d9534f;
  margin-top: 10px;
  font-size: 0.9rem;
}

.success-message {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #5cb85c;
  padding: 20px 0;
}
.success-message .material-icons {
  font-size: 48px;
  margin-bottom: 8px;
}

.spinner {
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  width: 18px;
  height: 18px;
  animation: spin 1s ease-in-out infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slide-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
</style> 