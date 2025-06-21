<template>
  <transition name="slide-fade">
    <div v-if="newVersionAvailable" class="update-banner">
      <div class="banner-content">
        <span class="material-icons">rocket_launch</span>
        <span>网站已更新，请刷新以体验新功能。</span>
      </div>
      <button @click="refreshPage" class="refresh-btn">立即刷新</button>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const newVersionAvailable = ref(false);
const currentVersion = ref(null);

const checkForUpdates = async () => {
  try {
    const response = await fetch('/version.json?t=' + new Date().getTime());
    if (!response.ok) return;
    
    const newVersionData = await response.json();
    
    if (currentVersion.value && newVersionData.version !== currentVersion.value) {
      newVersionAvailable.value = true;
    } else {
      currentVersion.value = newVersionData.version;
    }
  } catch (error) {
    console.error('[VersionChecker] Error checking for updates:', error);
  }
};

const refreshPage = () => {
  window.location.reload(true);
};

onMounted(() => {
  checkForUpdates(); // Initial check
  setInterval(checkForUpdates, 10 * 60 * 1000); // Check every 10 minutes
});
</script>

<style scoped>
.update-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 30000;
  display: flex;
  align-items: center;
  gap: 20px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.refresh-btn {
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}
.refresh-btn:hover {
  background-color: #357abd;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.5s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translate(-50%, 100px);
  opacity: 0;
}
</style> 