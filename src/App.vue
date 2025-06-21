<template>
    <div class="app">
        <Header />
        <main class="main">
            <div style="padding-top: 56px;">
                <template v-if="$route.path === '/walkman'">
                    <QuestionList :isWalkmanMode="true" />
                </template>
                <template v-else>
                    <router-view />
                </template>
            </div>
        </main>
    </div>
    <Analytics />
    <NotificationBanner @closed="handleNotificationClosed" />
    <Mp3PollModal :show="showMp3Poll" />
    <LoginModal :is-open="isLoginModalOpen" @close="isLoginModalOpen = false" @login-success="isLoginModalOpen = false" />
    <UserGuide :show="showGuide" :steps="guideSteps" @close="handleGuideClose" />
    <FeedbackModal :show="showFeedbackModal" @close="showFeedbackModal = false" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Header from './components/Header.vue';
import { Analytics } from '@vercel/analytics/vue';
import UserAvatar from './components/UserAvatar.vue';
import Mp3PollModal from './components/Mp3PollModal.vue';
import NotificationBanner from './components/NotificationBanner.vue';
import QuestionList from './components/QuestionList.vue';
import WalkmanPlayer from './components/WalkmanPlayer.vue';
import LoginModal from './components/LoginModal.vue';
import UserGuide from './components/UserGuide.vue';
import FeedbackModal from './components/FeedbackModal.vue';
import { useEventBus } from './services/eventBus.js';

const { on } = useEventBus();
const showMp3Poll = ref(false);
const isLoginModalOpen = ref(false);
const showGuide = ref(false);
const showFeedbackModal = ref(false);

const guideSteps = [
    {
        selector: '.icon-button[title="题目列表"]',
        text: '这里是题目列表，您可以点击这里浏览所有的对话题目。'
    },
    {
        selector: '.icon-button[title="随身听"]',
        text: '这里是随身听模式，开启后可以像听播客一样连续收听所有对话内容。'
    },
    {
        selector: '.icon-button[title="反馈"]',
        text: '如果您有任何意见或建议，可以点击这里告诉我们。'
    },
    {
        selector: '.user-avatar-container',
        text: '点击这里可以登录、注册、查看您的个人资料或退出登录。'
    }
];

const handleGuideClose = () => {
    showGuide.value = false;
    localStorage.setItem('hasSeenUserGuide', 'true');
};

function handleNotificationClosed() {
    showMp3Poll.value = true;
}

const openLoginModal = () => {
    isLoginModalOpen.value = true;
};

onMounted(() => {
    on('open-login-modal', openLoginModal);
    on('start-user-guide', () => {
        showGuide.value = true;
    });
    on('open-feedback-modal', () => {
        showFeedbackModal.value = true;
    });

    if (localStorage.getItem('hasSeenUserGuide') !== 'true') {
        setTimeout(() => {
            showGuide.value = true;
        }, 500);
    }
});

// Optional: unregister on unmount, though for App.vue it's less critical
// onUnmounted(() => {
//   // a way to unregister is needed in eventBus
// });
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
