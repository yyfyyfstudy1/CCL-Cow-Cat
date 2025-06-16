<template>
    <header class="header">
        <div class="container">
            <router-link to="/" class="logo-container">
                <img src="/logo.svg" alt="CCL奶牛猫" class="logo" />
                <span class="site-title">CCL奶牛猫</span>
            </router-link>
            <div class="header-right-icons">
                <router-link to="/" class="icon-button" title="题目列表">
                    <span class="material-icons">menu_book</span>
                </router-link>
                <UserAvatar />
            </div>
        </div>
    </header>
</template>

<script setup>
import UserAvatar from './UserAvatar.vue';
</script>

<style scoped>
.header {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    height: 46px;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
}

.logo-container {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: inherit;
}

.logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
}

.site-title {
    font-size: 20px;
    font-weight: 600;
    color: #333;
}

.header-right-icons {
    display: flex;
    align-items: center;
    gap: 16px; /* 调整图标与头像之间的间距 */
}

.icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px; /* 与头像保持一致 */
    height: 40px; /* 与头像保持一致 */
    border-radius: 50%;
    color: #666;
    text-decoration: none;
    transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
    background-color: #f8f8f8; /* 新增：灰色背景 */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 新增：与头像相似的阴影 */
}

.icon-button:hover {
    background-color: #f0f0f0;
    color: #333;
}

.icon-button .material-icons {
    font-size: 28px; /* 调整图标大小，使其在40px容器中更协调 */
}
</style> 