<template>
    <div v-if="showModal" class="mp3-poll-modal-overlay">
        <div class="mp3-poll-modal-content">
            <h3>MP3 功能投票</h3>
            <p class="poll-description">你认为是否有必要在网站中增加MP3随身听功能吗？加上MP3功能会方便你的备考吗？</p>

            <div v-if="!hasVoted" class="vote-options">
                <button class="vote-btn primary" @click="vote('need_mp3')">需要MP3</button>
                <button class="vote-btn secondary" @click="vote('no_mp3')">不需要MP3</button>
            </div>

            <div v-else class="poll-results">
                <h4>当前投票结果</h4>
                <div class="result-item">
                    <span>需要MP3: {{ pollResults.need_mp3 }} 票 ({{ needMp3Percentage }}%)</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" :style="{ width: needMp3Percentage + '%', backgroundColor: '#4CAF50' }"></div>
                    </div>
                </div>
                <div class="result-item">
                    <span>不需要MP3: {{ pollResults.no_mp3 }} 票 ({{ noMp3Percentage }}%)</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" :style="{ width: noMp3Percentage + '%', backgroundColor: '#f44336' }"></div>
                    </div>
                </div>
                <p class="total-votes">总票数: {{ totalVotes }}</p>
            </div>

            <button class="close-btn" @click="closeModal">关闭</button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { recordMp3Vote, getMp3PollResults } from '../services/mp3Poll.js';

const props = defineProps({
    show: Boolean
});

const showModal = ref(false);
const hasVoted = ref(false);
const pollResults = ref({ need_mp3: 0, no_mp3: 0 });

const POLL_STORAGE_KEY = 'hasShownMp3Poll'; // 用于本地存储的键

watch(() => props.show, (newVal) => {
    if (newVal) {
        const shown = localStorage.getItem(POLL_STORAGE_KEY);
        if (!shown) {
            showModal.value = true;
            loadPollResults(); // 首次显示时加载当前结果
        } else {
            hasVoted.value = true; // 如果已显示过，假设已投票（或至少已查看结果）
            loadPollResults(); // 已显示过也加载结果，以便用户再次进入查看
        }
    }
}, { immediate: true });

const totalVotes = computed(() => pollResults.value.need_mp3 + pollResults.value.no_mp3);

const needMp3Percentage = computed(() => {
    if (totalVotes.value === 0) return 0;
    return Math.round((pollResults.value.need_mp3 / totalVotes.value) * 100);
});

const noMp3Percentage = computed(() => {
    if (totalVotes.value === 0) return 0;
    return Math.round((pollResults.value.no_mp3 / totalVotes.value) * 100);
});

async function vote(option) {
    try {
        await recordMp3Vote(option);
        hasVoted.value = true;
        localStorage.setItem(POLL_STORAGE_KEY, 'true'); // 标记为已显示/已投票
        await loadPollResults(); // 投票后刷新结果
    } catch (error) {
        console.error("投票失败:", error);
        alert("投票失败，请稍后再试。");
    }
}

async function loadPollResults() {
    try {
        pollResults.value = await getMp3PollResults();
    } catch (error) {
        console.error("加载投票结果失败:", error);
        pollResults.value = { need_mp3: 0, no_mp3: 0 };
    }
}

function closeModal() {
    showModal.value = false;
    localStorage.setItem(POLL_STORAGE_KEY, 'true'); // 确保关闭时也标记为已显示
}
</script>

<style scoped>
.mp3-poll-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000; /* 确保在最上层 */
}

.mp3-poll-modal-content {
    background-color: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    max-width: 450px;
    width: 90%;
    text-align: center;
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}

.mp3-poll-modal-content h3 {
    font-size: 24px;
    color: #333;
    margin-bottom: 15px;
}

.poll-description {
    font-size: 15px;
    color: #666;
    margin-bottom: 25px;
    line-height: 1.6;
}

.vote-options {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 25px;
}

.vote-btn {
    padding: 12px 25px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.2s;
    font-weight: 600;
}

.vote-btn.primary {
    background-color: #007bff;
    color: white;
}

.vote-btn.primary:hover {
    background-color: #0056b3;
    transform: translateY(-2px);
}

.vote-btn.secondary {
    background-color: #f0f0f0;
    color: #333;
}

.vote-btn.secondary:hover {
    background-color: #e0e0e0;
    transform: translateY(-2px);
}

.poll-results h4 {
    font-size: 18px;
    color: #333;
    margin-bottom: 20px;
}

.result-item {
    margin-bottom: 15px;
    text-align: left;
}

.result-item span {
    font-size: 15px;
    color: #555;
    display: block;
    margin-bottom: 5px;
}

.progress-bar-container {
    width: 100%;
    height: 12px;
    background-color: #eee;
    border-radius: 6px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    border-radius: 6px;
    transition: width 0.5s ease-in-out;
}

.total-votes {
    font-size: 14px;
    color: #888;
    margin-top: 20px;
}

.close-btn {
    margin-top: 25px;
    padding: 10px 20px;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 15px;
    transition: background-color 0.2s;
}

.close-btn:hover {
    background-color: #5a6268;
}
</style>
