<template>
    <div class="user-avatar-container">
        <div class="avatar" @click="toggleDropdown">
            <img v-if="user" :src="getAvatarUrl()" alt="用户头像" />
            <img v-else :src="defaultAvatar" alt="默认头像" />
        </div>

        <div v-if="showDropdown" class="dropdown-menu">
            <template v-if="user">
                <div class="user-info">
                    <span class="email">{{ user.email }}</span>
                </div>
                <div class="dropdown-divider"></div>
                <router-link to="/profile" class="dropdown-item">
                    <span class="material-icons">person</span>
                    个人资料
                </router-link>
                <button class="dropdown-item" @click="handleLogout">
                    <span class="material-icons">logout</span>
                    退出登录
                </button>
            </template>
            <template v-else>
                <button class="dropdown-item" @click="showLoginModal">
                    <span class="material-icons">login</span>
                    登录
                </button>
            </template>
        </div>

        <!-- 登录模态框 -->
        <LoginModal 
            :is-open="isLoginModalOpen" 
            @close="closeLoginModal"
            @login-success="handleLoginSuccess"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import LoginModal from './LoginModal.vue'

const router = useRouter()
const auth = getAuth()
const user = ref(null)
const showDropdown = ref(false)
const isLoginModalOpen = ref(false)
const defaultAvatar = '/default-avatar.png'
const userDefaultAvatar = '/user-default-avatar.png'

// 监听认证状态
onMounted(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        user.value = currentUser
    })
    onUnmounted(() => unsubscribe())
})

function getAvatarUrl() {
    if (!user.value) return defaultAvatar
    if (user.value.photoURL) return user.value.photoURL
    return userDefaultAvatar
}

// 切换下拉菜单
function toggleDropdown() {
    showDropdown.value = !showDropdown.value
}

// 点击外部关闭下拉菜单
function handleClickOutside(event) {
    if (!event.target.closest('.user-avatar-container')) {
        showDropdown.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})

// 显示登录模态框
function showLoginModal() {
    isLoginModalOpen.value = true
    showDropdown.value = false
}

// 关闭登录模态框
function closeLoginModal() {
    isLoginModalOpen.value = false
}

// 处理登录成功
function handleLoginSuccess() {
    closeLoginModal()
}

// 处理退出登录
async function handleLogout() {
    try {
        await signOut(auth)
        showDropdown.value = false
        router.push('/')
    } catch (error) {
        console.error('退出登录失败:', error)
    }
}
</script>

<style scoped>
.user-avatar-container {
    position: relative;
}

.avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
}

.avatar:hover {
    transform: scale(1.05);
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    z-index: 1000;
    animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.user-info {
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
}

.email {
    color: #666;
    font-size: 14px;
}

.dropdown-divider {
    height: 1px;
    background: #eee;
    margin: 4px 0;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    color: #333;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.2s;
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    font-size: 14px;
}

.dropdown-item:hover {
    background-color: #f5f5f5;
}

.dropdown-item .material-icons {
    font-size: 18px;
    color: #666;
}

.dropdown-item:hover .material-icons {
    color: #4a90e2;
}
</style> 