<template>
    <div v-if="showNotification" class="notification">
        <div class="notification-content">
            <p>根据一些朋友反馈，已经修复了音频转录中英文混乱，在Iphone和微信的浏览器中无法录音的问题，大家可以刷新一下网站。</p>
            <button @click="closeNotification" class="notification-close">知道了</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showNotification = ref(false)

onMounted(() => {
    const hasShownNotification = localStorage.getItem('hasShownNotification')
    if (!hasShownNotification) {
        showNotification.value = true
    }
})

function closeNotification() {
    showNotification.value = false
    localStorage.setItem('hasShownNotification', 'true')
}
</script>

<style scoped>
.notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 90%;
    max-width: 600px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    margin-bottom: 20px;
}

.notification-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.notification-content p {
    margin: 0;
    color: #333;
    line-height: 1.5;
}

.notification-close {
    align-self: flex-end;
    padding: 8px 16px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.notification-close:hover {
    background: #1565c0;
}
</style> 