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
</template>

<script setup>
import { ref } from 'vue';
import Header from './components/Header.vue';
import { Analytics } from '@vercel/analytics/vue';
import UserAvatar from './components/UserAvatar.vue';
import Mp3PollModal from './components/Mp3PollModal.vue';
import NotificationBanner from './components/NotificationBanner.vue';
import QuestionList from './components/QuestionList.vue';
import WalkmanPlayer from './components/WalkmanPlayer.vue';

const showMp3Poll = ref(false);

function handleNotificationClosed() {
    showMp3Poll.value = true;
}
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
