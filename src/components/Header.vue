<template>
    <header class="header">
        <div class="container">
            <router-link to="/" class="logo-container">
                <img src="/logo.svg" alt="CCL奶牛猫" class="logo" />
                <span class="site-title">CCL奶牛猫</span>
            </router-link>
        </div>
    </header>
</template>

<style scoped>
.header {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 12px 20px;
}

.logo-container {
    display: flex;
    align-items: center;
    gap: 12px;
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
</style> 