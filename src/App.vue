<template>
    <div class="app">
        <Header />
        <main class="main">
            <div style="padding-top: 56px;">
                <router-view />
            </div>
        </main>
    </div>
    <Analytics />
    <Mp3PollModal :show="showMp3Poll" />
    <LoginModal :is-open="isLoginModalOpen" @close="isLoginModalOpen = false" @login-success="isLoginModalOpen = false" />
    <UserGuide :show="showGuide" :steps="guideSteps" @close="handleGuideClose" />
    <FeedbackModal :show="showFeedbackModal" @close="showFeedbackModal = false" />
    <VersionChecker />
    <FeatureVideoModal :visible="showFeatureVideo" @close="handleClose" />
    <MobileDrawingBoard />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Header from './components/Header.vue';
import { Analytics } from '@vercel/analytics/vue';
import UserAvatar from './components/UserAvatar.vue';
import Mp3PollModal from './components/Mp3PollModal.vue';
import NotificationBanner from './components/NotificationBanner.vue';
import LoginModal from './components/LoginModal.vue';
import UserGuide from './components/UserGuide.vue';
import FeedbackModal from './components/FeedbackModal.vue';
import VersionChecker from './components/VersionChecker.vue';
import FeatureVideoModal from './components/FeatureVideoModal.vue';
import MobileDrawingBoard from './components/MobileDrawingBoard.vue';
import { useEventBus } from './services/eventBus.js';
import { useData } from './services/useData.js';

const { loadExcel } = useData();

const { on } = useEventBus();
const showMp3Poll = ref(false);
const isLoginModalOpen = ref(false);
const showGuide = ref(false);
const showFeedbackModal = ref(false);
const showFeatureVideo = ref(false);

const isMobile = ref(window.innerWidth < 768);
const showBanner = ref(false); // 取消NotificationBanner弹窗

const guideSteps = [
    {
        selector: '.icon-button[title="题目列表"]',
        text: '这里是题目列表，可以点击这里浏览所有的对话题目'
    },
    {
        selector: '.icon-button[title="随身听"]',
        text: '这里是随身听模式，开启后可以像听播客一样连续收听所有对话内容'
    },
    {
        selector: '.icon-button[title="反馈"]',
        text: '如果有任何建议或者使用上的问题，可以点击这里告诉我'
    },
    {
        selector: '.user-avatar-container',
        text: '点击这里可以登录、注册、查看你的个人收藏'
    }
];

const handleGuideClose = () => {
    showGuide.value = false;
    localStorage.setItem('hasSeenUserGuide', 'true');
    if (isMobile.value) {
        showBanner.value = true; // Show banner after guide is closed on mobile
    }
};

function handleNotificationClosed() {
    // showMp3Poll.value = true; // 暂时禁用问卷调查
}

const openLoginModal = () => {
    isLoginModalOpen.value = true;
};

const FEATURE_VIDEO_VERSION = '2024-07-29'; // 有新视频时修改此版本号

onMounted(() => {
    const onResize = () => isMobile.value = window.innerWidth < 768;
    window.addEventListener('resize', onResize);
    onUnmounted(() => window.removeEventListener('resize', onResize));

    const hasSeenGuide = localStorage.getItem('hasSeenUserGuide') === 'true';
    const watchedVersion = localStorage.getItem('featureVideoVersion');
    if (watchedVersion !== FEATURE_VIDEO_VERSION) {
        showFeatureVideo.value = true;
    } else if (!hasSeenGuide) {
        setTimeout(() => {
            showGuide.value = true;
        }, 500);
    }

    loadExcel();
    on('open-login-modal', openLoginModal);
    on('start-user-guide', () => {
        showGuide.value = true;
    });
    on('open-feedback-modal', () => {
        showFeedbackModal.value = true;
    });
});

const handleClose = () => {
    // localStorage.setItem('featureVideoVersion', FEATURE_VIDEO_VERSION);
    showFeatureVideo.value = false;
    if (localStorage.getItem('hasSeenUserGuide') !== 'true') {
        setTimeout(() => {
            showGuide.value = true;
        }, 100);
    }
};
</script>

<style>
body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f8f9fa;
}

.main {
    margin-top: 64px;  /* 为固定定位的header留出空间 */
    min-height: calc(100vh - 64px);
}

.app {
    min-height: 100vh;
    background: #f5f6fa;
}

.header {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 16px 0;
}

.header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    margin: 0;
    font-size: 24px;
    color: #333;
}
</style>
