<template>
    <div :class="['container', { 'with-walkman-padding': $route.path === '/walkman' }]" :style="$route.path === '/walkman' ? { paddingBottom: walkmanPadding + 'px' } : {}">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:24px">
            对话列表
        </h1>

        <div v-if="error" class="error">
            <h3>加载失败</h3>
            <p>{{ error }}</p>
            <button @click="retryLoad" class="retry-btn">重试</button>
        </div>

        <div v-else-if="!data.loaded" class="loading">
            <div class="spinner"></div>
            加载中...
        </div>

        <template v-else>
            <!-- 筛选面板 -->
            <FilterPanel
                :types="availableTypes"
                :tags="availableTags"
                v-model:filters="filters"
                @random="loadRandomQuestion"
            />

            <div v-if="!filteredList.length" class="empty-state">
                没有找到符合条件的题目
            </div>

            <ul v-else class="question-list">
                <li v-for="q in paged" :key="q.qid" class="question-item">
                    <div class="question-content" @click="toDetail(q.qid)">
                        <div class="left-content">
                            <span class="title">{{ q.title }}</span>
                            <div class="tags">
                                <span v-if="q.type" class="tag type-tag">{{ q.type }}</span>
                                <span v-if="q.date" class="tag date-tag">{{ q.date }}</span>
                                <span v-if="q.questionTag" class="tag tag-question">{{ q.questionTag }}</span>
                            </div>
                        </div>
                        <div class="right-content">
                            <template v-if="isLoggedIn">
                                <div class="progress-bar-container">
                                    <div class="progress-bar"
                                         :style="{
                                            width: getCompletionPercentage(q.qid) + '% ',
                                            backgroundColor: getCompletionPercentage(q.qid) === 100 ? '#4CAF50' : '#ffc107'
                                        }">
                                    </div>
                                </div>
                                <span class="completion-text">{{ getCompletionPercentage(q.qid) }}%</span>
                            </template>
                            <span v-else class="login-prompt">登录查看完成度</span>
                            <span class="qid">题号: {{ q.qid }}</span>
                        </div>
                    </div>
                </li>
            </ul>

            <div v-if="pages > 1" class="pagination">
                <button
                    v-for="p in pages"
                    :key="p"
                    :class="['page-btn', { active: p === cur }]"
                    @click="cur = p"
                >
                    {{ p }}
                </button>
            </div>
        </template>

        <!-- WalkmanPlayer 只在 /walkman 路由下显示 -->
        <WalkmanPlayer v-if="$route.path === '/walkman'" :qid-list="paged.map(q => q.qid)" v-model:currentQid="selectedQid" />
    </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useData } from '../services/useData.js';
import FilterPanel from './FilterPanel.vue';
import { getAllLearned } from '../services/learned.js'
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { defineProps, defineEmits } from 'vue';
import WalkmanPlayer from './WalkmanPlayer.vue';

const props = defineProps({
    isWalkmanMode: { type: Boolean, default: false },
});
const emit = defineEmits(['playQid']);

const $route = useRoute();

const router = useRouter();
const cur = ref(1);
const per = 25;
const error = ref(null);
const filters = ref({
    type: [],
    period: '',
    studyStatus: '',
    tag: []
});

// 监听筛选条件变化，重置页码
watch(filters, () => {
    cur.value = 1;
}, { deep: true });

const { loadExcel, data } = useData();

const learnedDialogs = ref({});
const isLoggedIn = ref(false);
const walkmanPadding = ref(300)
const selectedQid = ref(null)

function updatePadding() {
    walkmanPadding.value = window.isWalkmanCollapsed ? 80 : 300
}

onMounted(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
        isLoggedIn.value = !!user;
        if (user) {
            loadLearnedDialogs();
        } else {
            learnedDialogs.value = {};
        }
    });

    window.addEventListener('walkman-collapse-change', updatePadding)
    updatePadding()
})
onUnmounted(() => {
    window.removeEventListener('walkman-collapse-change', updatePadding)
})

async function retryLoad() {
    error.value = null;
    try {
        await loadExcel();
        if (isLoggedIn.value) {
            await loadLearnedDialogs();
        }
    } catch (err) {
        error.value = err.message;
    }
}

// 初始加载
retryLoad();

async function loadLearnedDialogs() {
    try {
        learnedDialogs.value = await getAllLearned();
    } catch (e) {
        console.error("加载已学对话失败:", e);
        learnedDialogs.value = {};
    }
}

// 计算每个题目的完成度
function getCompletionPercentage(qid) {
    const qidLearned = learnedDialogs.value[qid];
    if (!qidLearned) return 0;

    const learnedCount = Object.keys(qidLearned).length;
    // 计算实际对话数量：(总行数 - 1) / 2
    // -1 是因为第一行是题目信息
    // /2 是因为每两行组成一个对话（原文和译文）
    const totalDialogs = Math.floor((data.byQid[qid]?.length - 1) / 2);
    return Math.min(100, Math.floor((learnedCount / totalDialogs) * 100));
}

// 获取所有可用的类型
const availableTypes = computed(() => {
    const types = new Set();
    Object.values(data.byQid).forEach(rows => {
        if (rows[0]?.type) {
            types.add(rows[0].type);
        }
    });
    return Array.from(types);
});

// 获取所有可用的标签
const availableTags = computed(() => {
    const tags = new Set();
    Object.values(data.byQid).forEach(rows => {
        if (rows[0]?.questionTag) {
            tags.add(rows[0].questionTag);
        }
    });
    return Array.from(tags);
});

// 根据日期筛选
function isWithinPeriod(dateStr, period) {
    // 如果没有选择时间段，显示所有内容（包括空日期）
    if (!period) return true;

    // 如果选择了时间段但日期为空，不显示
    if (!dateStr) return false;

    try {
        const now = new Date();
        // 处理日期格式 YY-MM-DD
        const [year, month, day] = dateStr.split(/[-\/]/).map(Number);
        // 将两位数年份转换为四位数（假设20xx年）
        const fullYear = 2000 + year;
        const questionDate = new Date(fullYear, month - 1, day);

        if (isNaN(questionDate.getTime())) {
            console.warn('Invalid date:', dateStr);
            return false; // 如果日期无效，在筛选时不显示
        }

        const months = {
            '1m': 1,
            '3m': 3,
            '6m': 6
        };

        const monthDiff = months[period];
        if (!monthDiff) return true;

        const cutoff = new Date(now.getFullYear(), now.getMonth() - monthDiff, now.getDate());
        return questionDate >= cutoff;
    } catch (err) {
        console.error('Date parsing error:', err);
        return false; // 如果发生错误，在筛选时不显示
    }
}

// 筛选后的列表
const filteredList = computed(() => {
    return Object.entries(data.byQid)
        .map(([qid, rows]) => ({
            qid,
            title: rows[0]?.title || '未命名',
            type: rows[0]?.type || '',
            date: rows[0]?.date || '',
            questionTag: rows[0]?.questionTag || ''
        }))
        .filter(item => {
            // 类型筛选：如果选择了类型，则必须匹配其中之一
            const typeMatch = !filters.value.type.length || filters.value.type.includes(item.type);
            // 标签筛选：如果选择了标签，则必须匹配其中之一
            const tagMatch = !filters.value.tag.length || filters.value.tag.includes(item.questionTag);
            // 日期筛选
            const dateMatch = isWithinPeriod(item.date, filters.value.period);
            return typeMatch && tagMatch && dateMatch;
        });
});

// 分页
const pages = computed(() => Math.max(1, Math.ceil(filteredList.value.length / per)));
const paged = computed(() => {
    const start = (cur.value - 1) * per;
    return filteredList.value.slice(start, start + per);
});

// 随机选择一题
function loadRandomQuestion() {
    const questions = filteredList.value;
    if (questions.length) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        const randomQuestion = questions[randomIndex];
        toDetail(randomQuestion.qid);
    }
}

function toDetail(qid) {
    selectedQid.value = qid
    if (props.isWalkmanMode) {
        window.dispatchEvent(new CustomEvent('walkman-play-qid', { detail: qid }));
    } else {
        router.push({ name: 'dialog', params: { qid } });
    }
}
</script>

<style scoped>
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}
.with-walkman-padding {
    /* padding-bottom 由内联 style 控制 */
}

.error {
    background: #fff5f5;
    border: 1px solid #feb2b2;
    color: #c53030;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
}

.error h3 {
    font-weight: 600;
    margin-bottom: 8px;
}

.retry-btn {
    margin-top: 12px;
    padding: 8px 16px;
    background: #c53030;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.retry-btn:hover {
    background: #9b2c2c;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #666;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    margin: 0 auto 20px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: #666;
    background: #f8f9fa;
    border-radius: 8px;
}

.question-list {
    list-style: none;
    padding: 0;
}

.question-item {
    margin-bottom: 12px;
}

.question-content {
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
}

.question-content:hover {
    background: #e9ecef;
    transform: translateY(-2px);
}

.left-content {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

.title {
    font-size: 16px;
    color: #333;
    font-weight: 600;
    word-break: break-word;
    white-space: normal;
    max-width: 320px;
    line-height: 1.4;
}

.tags {
    display: flex;
    gap: 4px;
}

.tag {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
}

.type-tag {
    background-color: #e8f5e9;
    color: #2e7d32;
}

.date-tag {
    background-color: #fff8e1;
    color: #f57f17;
}

.tag-question {
    background-color: #e3f2fd;
    color: #1976d2;
}

.qid {
    color: #666;
    font-size: 12px;
}

.right-content {
    display: flex;
    align-items: center;
    gap: 6px;
}

.progress-bar-container {
    width: 80px; /* 进度条容器宽度 */
    height: 8px; /* 进度条容器高度 */
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease-in-out, background-color 0.3s ease-in-out;
}

.completion-text {
    font-size: 12px;
    color: #333;
    font-weight: 500;
    min-width: 32px;
}

.login-prompt {
    font-size: 11px;
    color: #999;
    text-align: center;
    width: 90px;
    flex-shrink: 0;
}

.pagination {
    margin-top: 32px;
    display: flex;
    justify-content: center;
    gap: 8px;
}

.page-btn {
    padding: 8px 12px;
    border: 1px solid #dee2e6;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.page-btn:hover {
    background: #e9ecef;
}

.page-btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}
</style>
