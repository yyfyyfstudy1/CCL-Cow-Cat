<template>
    <div v-if="isOpen" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
            <div class="modal-header">
                <h2>{{ isLogin ? '登录' : '注册' }}</h2>
                <button class="close-btn" @click="closeModal">×</button>
            </div>
            
            <div class="modal-body">
                <div class="form-inner">
                    <div class="form-group">
                        <label for="email">邮箱</label>
                        <input 
                            type="email" 
                            id="email" 
                            v-model="email" 
                            placeholder="请输入邮箱"
                            :class="{ 'error': emailError }"
                        >
                        <span class="error-message" v-if="emailError">{{ emailError }}</span>
                    </div>

                    <div class="form-group">
                        <label for="password">密码</label>
                        <input 
                            type="password" 
                            id="password" 
                            v-model="password" 
                            placeholder="请输入密码"
                            :class="{ 'error': passwordError }"
                        >
                        <span class="error-message" v-if="passwordError">{{ passwordError }}</span>
                    </div>

                    <div class="form-group" v-if="!isLogin">
                        <label for="confirmPassword">确认密码</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            v-model="confirmPassword" 
                            placeholder="请再次输入密码"
                            :class="{ 'error': confirmPasswordError }"
                        >
                        <span class="error-message" v-if="confirmPasswordError">{{ confirmPasswordError }}</span>
                    </div>

                    <div class="error-message" v-if="authError">{{ authError }}</div>

                    <button 
                        class="submit-btn" 
                        @click="handleSubmit"
                        :disabled="isLoading"
                    >
                        <span v-if="isLoading" class="loading-spinner"></span>
                        {{ isLogin ? '登录' : '注册' }}
                    </button>

                    <div class="switch-mode">
                        {{ isLogin ? '还没有账号？' : '已有账号？' }}
                        <button class="switch-btn" @click="toggleMode">
                            {{ isLogin ? '立即注册' : '去登录' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

const props = defineProps({
    isOpen: Boolean
})

const emit = defineEmits(['close', 'login-success'])

// 表单状态
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLogin = ref(true)
const isLoading = ref(false)
const authError = ref('')

// 错误状态
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')

// 验证函数
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
}

function validatePassword(password) {
    return password.length >= 6
}

function validateForm() {
    let isValid = true
    
    // 重置错误
    emailError.value = ''
    passwordError.value = ''
    confirmPasswordError.value = ''
    authError.value = ''

    // 验证邮箱
    if (!email.value) {
        emailError.value = '请输入邮箱'
        isValid = false
    } else if (!validateEmail(email.value)) {
        emailError.value = '请输入有效的邮箱地址'
        isValid = false
    }

    // 验证密码
    if (!password.value) {
        passwordError.value = '请输入密码'
        isValid = false
    } else if (!validatePassword(password.value)) {
        passwordError.value = '密码长度至少为6位'
        isValid = false
    }

    // 如果是注册模式，验证确认密码
    if (!isLogin.value) {
        if (!confirmPassword.value) {
            confirmPasswordError.value = '请确认密码'
            isValid = false
        } else if (confirmPassword.value !== password.value) {
            confirmPasswordError.value = '两次输入的密码不一致'
            isValid = false
        }
    }

    return isValid
}

async function handleSubmit() {
    if (!validateForm()) return

    isLoading.value = true
    const auth = getAuth()

    try {
        if (isLogin.value) {
            // 登录
            await signInWithEmailAndPassword(auth, email.value, password.value)
        } else {
            // 注册
            await createUserWithEmailAndPassword(auth, email.value, password.value)
        }
        emit('login-success')
        closeModal()
    } catch (error) {
        console.error('认证错误:', error)
        switch (error.code) {
            case 'auth/user-not-found':
                authError.value = '用户不存在'
                break
            case 'auth/wrong-password':
                authError.value = '密码错误'
                break
            case 'auth/email-already-in-use':
                authError.value = '该邮箱已被注册'
                break
            case 'auth/weak-password':
                authError.value = '密码强度太弱'
                break
            default:
                authError.value = '认证失败，请稍后重试'
        }
    } finally {
        isLoading.value = false
    }
}

function toggleMode() {
    isLogin.value = !isLogin.value
    // 重置表单
    email.value = ''
    password.value = ''
    confirmPassword.value = ''
    emailError.value = ''
    passwordError.value = ''
    confirmPasswordError.value = ''
    authError.value = ''
}

function closeModal() {
    emit('close')
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.modal-content {
    background: white;
    border-radius: 16px;
    width: 95%;
    max-width: 500px;
    max-height: 90vh;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: modalSlideIn 0.3s ease-out;
    display: flex;
    flex-direction: column;
}

@keyframes modalSlideIn {
    from {
        transform: translateY(-20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.modal-header {
    padding: 20px 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.modal-header h2 {
    margin: 0;
    color: #333;
    font-size: 1.3rem;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #666;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.close-btn:hover {
    color: #333;
}

.modal-body {
    padding: 32px 0;
    overflow-y: auto;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.form-inner {
    width: 100%;
    max-width: 300px;
    display: flex;
    flex-direction: column;
}

.form-group {
    margin-bottom: 16px;
}

label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-weight: 500;
    font-size: 0.98rem;
}

input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.98rem;
    transition: border-color 0.3s;
    background-color: #f8f9fa;
}

input:focus {
    outline: none;
    border-color: #4a90e2;
    background-color: #fff;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

input.error {
    border-color: #e74c3c;
}

.error-message {
    color: #e74c3c;
    font-size: 1rem;
    margin-top: 8px;
    display: block;
    padding-left: 4px;
}

.submit-btn {
    margin-top: 16px;
    display: block;
    margin-left: auto;
    margin-right: auto;
    width: 100%;
    padding: 10px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    font-weight: 500;
}

.submit-btn:hover:not(:disabled) {
    background: #357abd;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.2);
}

.submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #ffffff;
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.switch-mode {
    margin-top: 18px;
    text-align: center;
    color: #666;
    font-size: 0.98rem;
    padding: 10px 0;
    border-top: 1px solid #eee;
}

.switch-btn {
    background: none;
    border: none;
    color: #4a90e2;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0;
    margin-left: 4px;
    font-weight: 500;
}

.switch-btn:hover {
    text-decoration: underline;
}
</style> 