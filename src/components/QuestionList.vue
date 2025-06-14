<template>
    <div class="container">
        <NotificationBanner />
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
                            </div>
                        </div>
                        <span class="qid">题号: {{ q.qid }}</span>
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
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useData } from '../services/useData.js';
import FilterPanel from './FilterPanel.vue';
import NotificationBanner from './NotificationBanner.vue'

const router = useRouter();
const cur = ref(1);
const per = 25;
const error = ref(null);
const filters = ref({
    type: [],
    period: '',
    studyStatus: ''
});

// 监听筛选条件变化，重置页码
watch(filters, () => {
    cur.value = 1;
}, { deep: true });

const { loadExcel, data } = useData();

async function retryLoad() {
    error.value = null;
    try {
        await loadExcel();
    } catch (err) {
        error.value = err.message;
    }
}

// 初始加载
retryLoad();

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
            date: rows[0]?.date || ''
        }))
        .filter(item => {
            // 类型筛选：如果选择了类型，则必须匹配其中之一
            const typeMatch = !filters.value.type.length || filters.value.type.includes(item.type);
            // 日期筛选
            const dateMatch = isWithinPeriod(item.date, filters.value.period);
            return typeMatch && dateMatch;
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
    router.push({ name: 'dialog', params: { qid } });
}
</script>

<style scoped>
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
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
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.question-content:hover {
    background: #e9ecef;
    transform: translateY(-2px);
}

.left-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.title {
    font-size: 16px;
    color: #333;
}

.tags {
    display: flex;
    gap: 8px;
}

.tag {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
}

.type-tag {
    background-color: #e8f5e9;
    color: #2e7d32;
}

.date-tag {
    background-color: #fff8e1;
    color: #f57f17;
}

.qid {
    color: #666;
    font-size: 14px;
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
