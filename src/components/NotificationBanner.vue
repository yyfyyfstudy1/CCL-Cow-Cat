<template>
  <transition name="slide-fade">
    <div v-if="showDataUpdateNotification" class="notification-banner">
      <div class="banner-content">
        <span class="material-icons">refresh</span>
        <span>数据已更新至最新版本 ({{ lastUpdated }})</span>
      </div>
      <button @click="hideNotification" class="close-btn">×</button>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useData } from '../services/useData.js';

const { data } = useData();
const showDataUpdateNotification = ref(false);
const lastUpdated = ref('');
const lastRefreshTime = ref('');

// 监听数据更新
watch(() => data.lastUpdated, (newUpdateTime) => {
  if (newUpdateTime && newUpdateTime !== lastUpdated.value) {
    // 检查是否是真正的刷新（通过比较刷新时间）
    const currentRefreshTime = localStorage.getItem('excel_last_refresh');
    if (currentRefreshTime && currentRefreshTime !== lastRefreshTime.value) {
      lastUpdated.value = newUpdateTime;
      lastRefreshTime.value = currentRefreshTime;
      showDataUpdateNotification.value = true;
      
      // 3秒后自动隐藏
      setTimeout(() => {
        showDataUpdateNotification.value = false;
      }, 3000);
    }
  }
}, { immediate: true });

const hideNotification = () => {
  showDataUpdateNotification.value = false;
};
</script>

<style scoped>
.notification-banner {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #4CAF50;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 30000;
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: 90vw;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.5s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translate(-50%, -100px);
  opacity: 0;
}
</style>
