<template>
    <div class="profile-container">
        <div class="profile-header">
            <h1>Personal Profile</h1>
            <div class="user-info">
                <span class="material-icons">account_circle</span>
                <span class="email">{{ userEmail }}</span>
            </div>
        </div>

        <div class="stats-grid">
            <!-- 收藏对话 -->
            <div class="stat-card is-clickable" @click="goToFavorites">
                <div class="stat-header">
                    <span class="material-icons">favorite</span>
                    <h3>收藏对话</h3>
                </div>
                <div class="stat-content">
                    <div v-if="favoriteIds.length === 0" class="empty-state">
                        <span class="material-icons">favorite_border</span>
                        <p>暂无收藏对话</p>
                    </div>
                    <div v-else class="stats-display">
                        <p class="stat-value">{{ favoriteIds.length }}</p>

                    </div>
                </div>
            </div>
            
                 <!-- 已练对话 -->
                 <div class="stat-card">
                <div class="stat-header">
                    <span class="material-icons">mic</span>
                    <h3>已练对话</h3>
                </div>
                <div class="stat-content">
                    <div v-if="learnedDialogCount === 0" class="empty-state">
                        <span class="material-icons">mic</span>
                        <p>暂无已练对话</p>
                    </div>
                    <div v-else class="stats-display">
                        <p class="stat-value">{{ learnedDialogCount }}</p>
                    </div>
                </div>
            </div>
            <!-- 对话笔记 -->
            <div class="stat-card">
                <div class="stat-header">
                    <span class="material-icons">note</span>
                    <h3>对话笔记</h3>
                </div>
                <div class="stat-content">
                    <div v-if="notesCount === 0" class="empty-state">
                        <span class="material-icons">note</span>
                        <p>暂无对话笔记</p>
                    </div>
                    <div v-else class="stats-display">
                        <p class="stat-value">{{ notesCount }}</p>
                    </div>
                </div>
            </div>
            
            <!-- 已听对话 -->
            <div class="stat-card">
                <div class="stat-header">
                    <span class="material-icons">headphones</span>
                    <h3>已听对话</h3>
                </div>
                <div class="stat-content">
                    <div class="empty-state">
                        <span class="material-icons">headphones</span>
                        <p>暂无已听对话</p>
                    </div>
                </div>
                <div class="overlay"><span class="overlay-text">功能未上线</span></div>
            </div>

       

            
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAuth } from 'firebase/auth';
import { getAllFavorites } from '../services/favorites';
import { getAllLearned } from '../services/learned.js';
import { useRouter } from 'vue-router';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

const userEmail = ref('');
const favoriteIds = ref([]);
const learnedDialogCount = ref(0);
const notesCount = ref(0);
const router = useRouter();

onMounted(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
        userEmail.value = user.email;
    }
});

onMounted(async () => {
    try {
        favoriteIds.value = await getAllFavorites();
    } catch (e) {
        console.error("加载收藏失败:", e);
        favoriteIds.value = [];
    }
});

onMounted(async () => {
    try {
        const allLearned = await getAllLearned();
        let totalLearned = 0;
        for (const qid in allLearned) {
            totalLearned += Object.keys(allLearned[qid]).length;
        }
        learnedDialogCount.value = totalLearned;
    } catch (e) {
        console.error("加载已学对话失败:", e);
        learnedDialogCount.value = 0;
    }
});

onMounted(async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
        try {
            let totalNotes = 0;
            const dialogsColRef = collection(db, 'users', user.uid, 'dialogs');
            const dialogsSnapshot = await getDocs(dialogsColRef);

            for (const dialogDoc of dialogsSnapshot.docs) {
                const notesColRef = collection(db, 'users', user.uid, 'dialogs', dialogDoc.id, 'notes');
                const notesSnapshot = await getDocs(notesColRef);
                totalNotes += notesSnapshot.docs.length;
            }
            notesCount.value = totalNotes;
        } catch (e) {
            console.error("加载笔记总数失败:", e);
            notesCount.value = 0;
        }
    }
});

function goToFavorites() {
    router.push('/my-favorites');
}
</script>

<style scoped>
.profile-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
}

.profile-header {
    margin-bottom: 40px;
    text-align: center;
}

.profile-header h1 {
    font-size: 32px;
    color: #333;
    margin-bottom: 16px;
}

.user-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #666;
}

.user-info .material-icons {
    font-size: 24px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 24px;
}

.stat-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    min-height: 150px;
    display: flex;
    flex-direction: column;
    position: relative;
}

.stat-card.is-clickable {
    cursor: pointer;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.stat-card.is-clickable:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.stat-header .material-icons {
    font-size: 22px;
    color: #1976d2;
}

.stat-header h3 {
    font-size: 16px;
    color: #333;
    margin: 0;
}

.stat-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    text-align: center;
}

.empty-state .material-icons {
    font-size: 36px;
    margin-bottom: 8px;
}

.empty-state p {
    margin: 0;
    font-size: 13px;
}

.stats-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.stat-value {
    font-size: 36px;
    font-weight: 700;
    color: #333;
    margin: 0;
    line-height: 1em;
}

.stat-label {
    font-size: 14px;
    color: #666;
    margin: 0;
    line-height: 1em;
}

/* 遮罩层样式 */
.overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(200, 200, 200, 0.7); /* 半透明灰色 */
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    cursor: not-allowed; /* 表示不可点击 */
}

.overlay-text {
    color: #666;
    font-weight: bold;
    font-size: 16px;
}
</style> 