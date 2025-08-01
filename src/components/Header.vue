<template>
    <header class="header">
        <div class="container">
            <router-link to="/" class="logo-container">
                <img src="/logo.svg" alt="CCL奶牛猫" class="logo" />
                <span class="site-title">CCL奶牛猫</span>
            </router-link>
            <div class="header-right-icons">
                <button @click="startGuide" class="icon-button" title="帮助">
                    <span class="material-icons">help_outline</span>
                </button>
                <router-link to="/" class="icon-button" title="题目列表">
                    <span class="material-icons">menu_book</span>
                </router-link>
                <router-link to="/walkman" class="icon-button" title="随身听">
                    <span class="material-icons">headphones</span>
                </router-link>
                <button @click="openFeedback" class="icon-button" title="反馈">
                    <span class="material-icons">campaign</span>
                </button>
                <button v-if="!isMobile" @click="toggleFullScreen" class="icon-button" title="全屏/还原">
                    <span class="material-icons">
                        {{ isFullScreen ? 'fullscreen_exit' : 'fullscreen' }}
                    </span>
                </button>
                <UserAvatar />
            </div>
        </div>
    </header>
</template>

<script setup>
import UserAvatar from './UserAvatar.vue';
import { useEventBus } from '../services/eventBus.js';
import { ref, onMounted, onUnmounted, computed } from 'vue';

const { emit } = useEventBus();

const isFullScreen = ref(false);

const isMobile = computed(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
});

function toggleFullScreen() {
    if (!isFullScreen.value) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
            el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

function fullscreenChangeHandler() {
    isFullScreen.value = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );
}

onMounted(() => {
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);
});

onUnmounted(() => {
    document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
    document.removeEventListener('webkitfullscreenchange', fullscreenChangeHandler);
    document.removeEventListener('mozfullscreenchange', fullscreenChangeHandler);
    document.removeEventListener('MSFullscreenChange', fullscreenChangeHandler);
});

const startGuide = () => {
    emit('start-user-guide');
}

const openFeedback = () => {
    emit('open-feedback-modal');
}
</script>

<style scoped>
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    padding: 12px 0;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo-container {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: inherit;
    gap: 12px;
}

.logo {
    width: 32px;
    height: 32px;
}

.site-title {
    font-size: 20px;
    font-weight: 600;
    color: #333;
}

.header-right-icons {
    display: flex;
    align-items: center;
    gap: 8px;
}

.icon-button {
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    color: #666;
    text-decoration: none;
}

.icon-button:hover {
    background-color: #f5f5f5;
    color: #333;
}

.icon-button .material-icons {
    font-size: 28px; /* 调整图标大小，使其在40px容器中更协调 */
}

@media (max-width: 768px) {
    .container {
        padding: 0 16px;
    }
    
    .site-title {
        font-size: 18px;
    }
    
    .header-right-icons {
        gap: 4px;
    }
    
    .icon-button {
        width: 36px;
        height: 36px;
    }
    
    .icon-button .material-icons {
        font-size: 24px;
    }
}
</style>
