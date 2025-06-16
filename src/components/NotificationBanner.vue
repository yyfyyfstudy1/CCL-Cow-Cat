<template>
    <div v-if="showNotification" class="notification">
        <div class="notification-content">
            <p>备考期间突然发现还是要有个人错题集功能，所以就加上了。大家可以随意注册一下登录使用，也可以不登录，其他都没变。有几个哥们儿强烈想要MP3功能，决定让大家投个票，如果大部分人觉得需要后面我就加上吧。。</p>
            <button @click="closeNotification" class="notification-close">知道了</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showNotification = ref(false)

const emit = defineEmits(['closed'])

onMounted(() => {
    const hasShownNotification = localStorage.getItem('hasShownNotification_v2')
    if (!hasShownNotification) {
        showNotification.value = true
    } else {
        emit('closed')
    }
})

function closeNotification() {
    showNotification.value = false
    localStorage.setItem('hasShownNotification_v2', 'true')
    emit('closed')
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