<template>
    <Header />
    <main class="main">
        <router-view />
    </main>
    <Analytics />

</template>

<script setup>
import Header from './components/Header.vue';
import { Analytics } from '@vercel/analytics/vue';
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
</style>
