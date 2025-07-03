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
            <!-- 总练习次数 -->
            <div class="stat-card">
                <div class="stat-header">
                    <span class="material-icons">fitness_center</span>
                    <h3>总练习次数</h3>
                </div>
                <div class="stat-content">
                    <p class="stat-value">{{ totalPracticeCount }}</p>
                </div>
            </div>
            <!-- 今日练习次数 -->
            <div class="stat-card">
                <div class="stat-header">
                    <span class="material-icons">today</span>
                    <h3>今日练习次数</h3>
                </div>
                <div class="stat-content">
                    <p class="stat-value">{{ todayPracticeCount }}</p>
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
                    <div v-if="listenedDialogCount === 0" class="empty-state">
                        <span class="material-icons">headphones</span>
                        <p>暂无已听对话</p>
                    </div>
                    <div v-else class="stats-display">
                        <p class="stat-value">{{ listenedDialogCount }}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="charts-section">
            <div ref="lineChartRef" style="width:100%;height:320px;margin-bottom:32px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(34,197,94,0.08);"></div>
            <teleport to="body">
                <div v-if="showHourChart" :style="hourChartModalStyle" @click.self="closeHourChart">
                    <div :style="hourChartBoxStyle">
                        <div style="position:absolute;right:16px;top:12px;z-index:2;">
                            <button @click="closeHourChart" style="background:#2563eb;color:#fff;border:none;padding:4px 18px;border-radius:6px;cursor:pointer;font-size:16px;">关闭</button>
                        </div>
                        <div style="font-size:18px;font-weight:bold;color:#2563eb;text-align:center;margin-bottom:12px;">{{ hourChartData.date }} 每小时练习次数</div>
                        <div ref="barTimeChartRef" style="width:420px;max-width:80vw;height:320px;"></div>
                    </div>
                </div>
            </teleport>
            <div ref="barTopQuestionsRef" style="width:100%;height:320px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(245,158,66,0.08);"></div>
            <div ref="scoreChartRef" style="width:100%;height:320px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(59,130,246,0.08);margin-top:32px;"></div>
            <div style="display:flex;gap:32px;margin-top:32px;">
                <div ref="pieTypeCountRef" style="flex:1;min-width:260px;height:400px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(99,102,241,0.08);"></div>
                <div ref="pieTypePracticeRef" style="flex:1;min-width:260px;height:400px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(244,63,94,0.08);"></div>
            </div>
        </div>
        <canvas v-if="showFirework" ref="fireworkCanvas" class="firework-canvas"></canvas>
        <div v-if="showPraise" class="praise-tip animate__animated" :class="praiseAnimClass">
            {{ praiseText }}
        </div>
        <div v-if="comboCount > 1 && showComboTip" class="combo-tip animate__animated animate__tada" :class="comboFlashClass">
            完美翻译
            {{ comboCount }} 连击！！！！
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted, computed } from 'vue';
import { getAuth } from 'firebase/auth';
import { getAllFavorites } from '../services/favorites';
import { getAllLearned } from '../services/learned.js';
import { getAllListeningProgress } from '../services/listeningProgress.js';
import { useRouter } from 'vue-router';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { fetchNotesCount } from '../services/notes.js';
import { getAllPracticeLogs, getTodayPracticeLogs, subscribeToPracticeLogs } from '../services/practiceLogs'
import * as echarts from 'echarts'
import confetti from 'canvas-confetti'
import 'animate.css'

const userEmail = ref('');
const favoriteIds = ref([]);
const learnedDialogCount = ref(0);
const listenedDialogCount = ref(0);
const notesCount = ref(0);
const router = useRouter();
const totalPracticeCount = ref(0)
const todayPracticeCount = ref(0)
const lineChartRef = ref(null)
const barTimeChartRef = ref(null)
const barTopQuestionsRef = ref(null)
const showHourChart = ref(false)
const hourChartData = ref({ labels: [], counts: [], date: '' })
const hourChartModalStyle = `
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s;
`
const hourChartBoxStyle = `
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  padding: 32px 24px 24px 24px;
  min-width: 340px;
  max-width: 90vw;
  max-height: 90vh;
  animation: popIn 0.2s;
  position: relative;
`
const pieTypeCountRef = ref(null)
const pieTypePracticeRef = ref(null)
const scoreChartRef = ref(null)
const showFirework = ref(false)
const showPraise = ref(false)
const showComboTip = ref(false)
const praiseText = ref('')
const praiseAnimClass = ref('animate__bounceInRight')
const comboCount = ref(0)
let comboTimer = null
const lastComboScore = ref(false)

let unsubscribe = null;
const charts = {
  lineChart: null,
  barChart: null,
  pieTypeCount: null,
  pieTypePractice: null,
  scoreChart: null
}
let currentLogs = []; // 存储当前练习数据

const comboFlashClass = computed(() => {
  if (comboCount.value >= 5) return 'combo-flash-5';
  if (comboCount.value === 4) return 'combo-flash-4';
  if (comboCount.value === 3) return 'combo-flash-3';
  if (comboCount.value === 2) return 'combo-flash-2';
  return '';
});

// 更新图表的函数
function updateCharts(allLogs) {
  // 保存当前数据供点击事件使用
  currentLogs = allLogs;

  // 更新统计数据
  totalPracticeCount.value = allLogs.length;

  // 计算今日练习次数
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayLogs = allLogs.filter(log => {
    if (!log.timestamp) return false;
    const dateObj = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp.seconds ? log.timestamp.seconds * 1000 : log.timestamp);
    return dateObj >= start;
  });
  todayPracticeCount.value = todayLogs.length;

  // 数据处理
  const dayMap = {};
  const questionMap = {};
  const typePracticeMap = {}; // 类型-练习次数
  const typeQuestionSet = {}; // 类型-题目集合

  // 评分数据
  const scoreData = [];
  let practiceIndex = 1;
  let lastScore = null;

  allLogs.forEach(log => {
    if (!log.timestamp) return;
    const dateObj = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp.seconds ? log.timestamp.seconds * 1000 : log.timestamp);
    // 按天
    const dayStr = dateObj.toISOString().slice(0, 10);
    dayMap[dayStr] = (dayMap[dayStr] || 0) + 1;
    // 题目统计
    const qid = log.questionId || '未知';
    const qtitle = log.questionTitle || qid;
    const key = qid + ' ' + qtitle;
    questionMap[key] = (questionMap[key] || 0) + 1;
    // 类型统计
    const type = log.questionType || '未知类型';
    typePracticeMap[type] = (typePracticeMap[type] || 0) + 1;
    if (!typeQuestionSet[type]) typeQuestionSet[type] = new Set();
    typeQuestionSet[type].add(qid);

    // 评分数据（只包含有评分的记录）
    if (log.score !== null && log.score !== undefined && !isNaN(log.score)) {
      scoreData.push({
        value: [practiceIndex, log.score],
        questionNumber: log.questionNumber || '',
        questionTitle: log.questionTitle || ''
      });
      lastScore = log.score;
    }
    practiceIndex++;
  });

  // 饼图数据
  const typeCountData = Object.entries(typeQuestionSet).map(([type, set]) => ({ name: type, value: set.size }));
  const typePracticeData = Object.entries(typePracticeMap).map(([type, value]) => ({ name: type, value }));

  // 折线图数据
  const dayLabels = Object.keys(dayMap).sort();
  const dayCounts = dayLabels.map(d => dayMap[d]);

  // 柱状图（题目前10）
  const topQuestions = Object.entries(questionMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topQLabels = topQuestions.map(([k]) => k);
  const topQCounts = topQuestions.map(([, v]) => v);

  // 更新折线图
  if (charts.lineChart) {
    charts.lineChart.setOption({
      xAxis: { data: dayLabels },
      series: [{ data: dayCounts }]
    });
  }

  // 更新柱状图
  if (charts.barChart) {
    charts.barChart.setOption({
      xAxis: { data: topQLabels },
      series: [{ data: topQCounts }]
    });
  }

  // 更新饼图
  if (charts.pieTypeCount) {
    charts.pieTypeCount.setOption({
      series: [{ data: typeCountData }]
    });
  }

  if (charts.pieTypePractice) {
    charts.pieTypePractice.setOption({
      series: [{ data: typePracticeData }]
    });
  }

  // 更新评分折线图
  if (charts.scoreChart) {
    let dataZoom = [];
    let start = 0, end = 100;
    if (scoreData.length > 20) {
      // 动态计算：总是显示最后20个点
      start = 100 * (scoreData.length - 20) / scoreData.length;
      end = 100;
      dataZoom = [
        {
          type: 'inside',
          xAxisIndex: 0,
          start: start,
          end: end,
          zoomLock: true // 锁定缩放，只允许平移
        }
      ];
    }
    charts.scoreChart.setOption({
      series: [{ data: scoreData }],
      dataZoom
    });
  }

  // 评分特效逻辑
  if (scoreData.length > 0) {
    const latestScore = scoreData[scoreData.length - 1].value[1];
    const prevScore = scoreData.length > 1 ? scoreData[scoreData.length - 2].value[1] : null;
    console.log('最新评分:', latestScore, '上一个评分:', prevScore, 'comboCount:', comboCount.value);

    if (latestScore > 80) {
      triggerFirework();
      if (prevScore !== null && prevScore > 80) {
        comboCount.value++;
        showComboTip.value = false;
        nextTick(() => {
          showComboTip.value = true;
          setTimeout(() => { showComboTip.value = false }, 2000);
        });
        console.log('连击触发，comboCount:', comboCount.value);
        // 连击时不再显示"完美翻译"
      } else {
        comboCount.value = 1;
        showPraiseTip('太棒了！完美的翻译');
        console.log('首次高分，显示完美翻译');
      }
      // 不再设置combo计时器
    } else {
      comboCount.value = 0;
      showComboTip.value = false;
      console.log('评分未达标，comboCount归零');
    }
  }
}

onMounted(async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    userEmail.value = user.email;

    // Fetch all data in parallel
    try {
        const [favorites, allLearned, allListened, notes] = await Promise.all([
            getAllFavorites(),
            getAllLearned(),
            getAllListeningProgress(),
            fetchNotesCount()
        ]);

        favoriteIds.value = favorites;

        let totalLearned = 0;
        for (const qid in allLearned) {
            totalLearned += Object.keys(allLearned[qid]).length;
        }
        learnedDialogCount.value = totalLearned;

        let totalListened = 0;
        for (const qid in allListened) {
            totalListened += Object.keys(allListened[qid]).length;
        }
        listenedDialogCount.value = totalListened;

        notesCount.value = notes;

        // 初始化图表
        await nextTick();

        // 折线图（主色#22c55e）
        if (lineChartRef.value) {
            charts.lineChart = echarts.init(lineChartRef.value);
            charts.lineChart.setOption({
                title: { text: '每日练习次数', left: 'center', top: 20, textStyle: { fontSize: 16, fontWeight: 'bold', color: '#22c55e' } },
                tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#22c55e', textStyle: { color: '#222' } },
                grid: { left: 40, right: 20, top: 60, bottom: 40 },
                xAxis: {
                  type: 'category',
                  data: [],
                  axisLabel: {
                    fontSize: 14,
                    color: '#333',
                    overflow: 'truncate',
                    width: 80,
                    showMaxLabel: true,
                    showMinLabel: true,
                    formatter: function(value) {
                      return value.length > 10 ? value.slice(0, 10) + '...' : value;
                    }
                  },
                  axisLine: { lineStyle: { color: '#22c55e' } }
                },
                yAxis: {
                  type: 'value',
                  axisLabel: { fontSize: 14, color: '#333' },
                  splitLine: { lineStyle: { color: '#eee' } },
                  axisLine: { lineStyle: { color: '#22c55e' } }
                },
                series: [{
                  data: [],
                  type: 'line',
                  smooth: true,
                  symbol: 'circle',
                  symbolSize: 10,
                  lineStyle: { width: 4, color: '#22c55e' },
                  itemStyle: {
                    color: '#22c55e',
                    borderColor: '#fff',
                    borderWidth: 2,
                    shadowBlur: 8,
                    shadowColor: 'rgba(34,197,94,0.2)'
                  },
                  areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: 'rgba(34,197,94,0.18)' },
                      { offset: 1, color: 'rgba(34,197,94,0.01)' }
                    ])
                  }
                }]
            });
            // 监听点击事件
            charts.lineChart.on('click', function(params) {
                if (params.componentType === 'series' && params.seriesType === 'line') {
                    const clickedDate = params.name;
                    // 统计该天的每小时分布
                    const hourMap = {};
                    // 使用当前实时数据
                    currentLogs.forEach(log => {
                        if (!log.timestamp) return;
                        const dateObj = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp.seconds ? log.timestamp.seconds * 1000 : log.timestamp);
                        const dayStr = dateObj.toISOString().slice(0, 10);
                        if (dayStr === clickedDate) {
                            const hour = dateObj.getHours();
                            hourMap[hour] = (hourMap[hour] || 0) + 1;
                        }
                    });
                    const hourLabels = Object.keys(hourMap).map(h => h.padStart(2, '0') + ':00');
                    const hourCounts = Object.keys(hourMap).map(h => hourMap[h]);
                    hourChartData.value = { labels: hourLabels, counts: hourCounts, date: clickedDate };
                    showHourChart.value = true;
                    // 渲染小时柱状图
                    nextTick(() => {
                        if (barTimeChartRef.value) {
                            const chart2 = echarts.init(barTimeChartRef.value);
                            chart2.setOption({
                                title: { text: `${clickedDate} 每小时练习次数`, left: 'center', textStyle: { fontSize: 14, color: '#2563eb', fontWeight: 'bold' } },
                                tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#2563eb', textStyle: { color: '#222' } },
                                grid: { left: 40, right: 20, top: 60, bottom: 40 },
                                xAxis: {
                                  type: 'category',
                                  data: hourLabels,
                                  axisLabel: {
                                    fontSize: 14,
                                    color: '#333',
                                    overflow: 'truncate',
                                    width: 60,
                                    showMaxLabel: true,
                                    showMinLabel: true,
                                    formatter: function(value) {
                                      return value.length > 5 ? value.slice(0, 5) + '...' : value;
                                    }
                                  },
                                  axisLine: { lineStyle: { color: '#2563eb' } }
                                },
                                yAxis: {
                                  type: 'value',
                                  axisLabel: { fontSize: 14, color: '#333' },
                                  splitLine: { lineStyle: { color: '#eee' } },
                                  axisLine: { lineStyle: { color: '#2563eb' } }
                                },
                                series: [{
                                  data: hourCounts,
                                  type: 'bar',
                                  itemStyle: {
                                    borderRadius: [8, 8, 0, 0],
                                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                      { offset: 0, color: '#60a5fa' },
                                      { offset: 1, color: '#2563eb' }
                                    ])
                                  },
                                  barWidth: 28
                                }]
                            });
                        }
                    });
                }
            });
        }

        // 柱状图（题目前10，主色#f59e42）
        if (barTopQuestionsRef.value) {
            charts.barChart = echarts.init(barTopQuestionsRef.value);
            charts.barChart.setOption({
                title: { text: '练习次数最多的前10题', left: 'center', top: 20, textStyle: { fontSize: 16, color: '#f59e42', fontWeight: 'bold' } },
                tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f59e42', textStyle: { color: '#222' } },
                grid: { left: 40, right: 20, top: 60, bottom: 40 },
                xAxis: {
                  type: 'category',
                  data: [],
                  axisLabel: {
                    interval: 0,
                    fontSize: 14,
                    color: '#333',
                    overflow: 'truncate',
                    width: 90,
                    showMaxLabel: true,
                    showMinLabel: true,
                    formatter: function(value) {
                      return value.length > 10 ? value.slice(0, 10) + '...' : value;
                    }
                  },
                  axisLine: { lineStyle: { color: '#f59e42' } }
                },
                yAxis: {
                  type: 'value',
                  axisLabel: { fontSize: 14, color: '#333' },
                  splitLine: { lineStyle: { color: '#eee' } },
                  axisLine: { lineStyle: { color: '#f59e42' } }
                },
                series: [{
                  data: [],
                  type: 'bar',
                  itemStyle: {
                    borderRadius: [8, 8, 0, 0],
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#fbbf24' },
                      { offset: 1, color: '#f59e42' }
                    ])
                  },
                  barWidth: 28
                }]
            });
        }

        // 饼图：类型-题数
        if (pieTypeCountRef.value) {
            charts.pieTypeCount = echarts.init(pieTypeCountRef.value);
            charts.pieTypeCount.setOption({
                title: { text: '不同类型题目数量分布', left: 'center', top: 20, textStyle: { fontSize: 14, color: '#6366f1' } },
                tooltip: { trigger: 'item' },
                legend: { bottom: 2, left: 'center' },
                series: [{
                    name: '题目数量',
                    type: 'pie',
                    radius: ['35%', '65%'],
                    center: ['50%', '55%'],
                    avoidLabelOverlap: true,
                    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
                    label: {
                        show: true,
                        position: 'outside',
                        fontSize: 12,
                        formatter: '{b}: {c}'
                    },
                    labelLine: {
                        show: true,
                        length: 15,
                        length2: 10
                    },
                    data: []
                }]
            });
        }

        // 饼图：类型-练习次数
        if (pieTypePracticeRef.value) {
            charts.pieTypePractice = echarts.init(pieTypePracticeRef.value);
            charts.pieTypePractice.setOption({
                title: { text: '不同类型题目练习次数分布', left: 'center', top: 20, textStyle: { fontSize: 14, color: '#f43f5e' } },
                tooltip: { trigger: 'item' },
                legend: { bottom: 2, left: 'center' },
                series: [{
                    name: '练习次数',
                    type: 'pie',
                    radius: ['35%', '65%'],
                    center: ['50%', '55%'],
                    avoidLabelOverlap: true,
                    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
                    label: {
                        show: true,
                        position: 'outside',
                        fontSize: 12,
                        formatter: '{b}: {c}'
                    },
                    labelLine: {
                        show: true,
                        length: 15,
                        length2: 10
                    },
                    data: []
                }]
            });
        }

        // 评分折线图
        if (scoreChartRef.value) {
            charts.scoreChart = echarts.init(scoreChartRef.value);
            charts.scoreChart.setOption({
                title: { text: '实时练习评分', left: 'center', top: 20, textStyle: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' } },
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: '#fff',
                    borderColor: '#3b82f6',
                    textStyle: { color: '#222' },
                    formatter: function(params) {
                        const data = params[0];
                        const questionNumber = data.data.questionNumber || '';
                        const questionTitle = data.data.questionTitle || '';
                        let title = `第${data.value[0]}次练习<br/>评分: ${data.value[1]}`;
                        if (questionNumber && questionTitle) {
                            title += `<br/>题号: ${questionNumber}<br/>题目: ${questionTitle}`;
                        }
                        return title;
                    }
                },
                grid: { left: 40, right: 20, top: 60, bottom: 40 },
                xAxis: {
                    type: 'value',
                    nameLocation: 'middle',
                    nameGap: 30,
                    nameTextStyle: { color: '#6b7280', fontSize: 14 },
                    axisLabel: { fontSize: 14, color: '#6b7280' },
                    axisLine: { lineStyle: { color: '#e5e7eb' } },
                    splitLine: { show: false }
                },
                yAxis: {
                    type: 'value',
                    name: '评分',
                    nameLocation: 'middle',
                    nameGap: 40,
                    nameTextStyle: { color: '#6b7280', fontSize: 14 },
                    min: 0,
                    max: 100,
                    axisLabel: { fontSize: 14, color: '#6b7280' },
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: '#f3f4f6' } }
                },
                dataZoom: [], // 默认不显示dataZoom，后续updateCharts会动态设置
                series: [{
                    name: '评分',
                    type: 'line',
                    data: [],
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: 'rgba(244,63,94,0.95)' },    // 红
                            { offset: 0.33, color: 'rgba(245,158,66,0.88)' },// 橙
                            { offset: 0.66, color: 'rgba(34,197,94,0.82)' }, // 绿
                            { offset: 1, color: 'rgba(59,130,246,0.78)' }    // 蓝
                        ]),
                        width: 4,
                        shadowColor: 'rgba(59, 130, 246, 0.3)',
                        shadowBlur: 10
                    },
                    itemStyle: {
                        color: '#3b82f6',
                        borderColor: '#fff',
                        borderWidth: 3,
                        shadowColor: 'rgba(59, 130, 246, 0.4)',
                        shadowBlur: 8
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: 'rgba(244,63,94,0.95)' },    // 红
                            { offset: 0.33, color: 'rgba(245,158,66,0.88)' },// 橙
                            { offset: 0.66, color: 'rgba(34,197,94,0.82)' }, // 绿
                            { offset: 1, color: 'rgba(59,130,246,0.78)' }    // 蓝
                        ])
                    }
                }]
            });
        }

        // 设置实时监听
        unsubscribe = subscribeToPracticeLogs((logs) => {
            updateCharts(logs);
        });

    } catch (e) {
        console.error("加载个人资料数据失败:", e);
        favoriteIds.value = [];
        learnedDialogCount.value = 0;
        listenedDialogCount.value = 0;
        notesCount.value = 0;
        totalPracticeCount.value = 0;
        todayPracticeCount.value = 0;
    }
});

onUnmounted(() => {
    if (unsubscribe) {
        unsubscribe();
    }
    if (charts.lineChart) {
        charts.lineChart.dispose();
    }
    if (charts.barChart) {
        charts.barChart.dispose();
    }
    if (charts.pieTypeCount) {
        charts.pieTypeCount.dispose();
    }
    if (charts.pieTypePractice) {
        charts.pieTypePractice.dispose();
    }
    if (charts.scoreChart) {
        charts.scoreChart.dispose();
    }
});

function goToFavorites() {
    router.push('/my-favorites');
}

function closeHourChart() {
    showHourChart.value = false;
}

function triggerFirework() {
  showFirework.value = true
  // 多点烟花
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      confetti({ origin: { x: Math.random(), y: Math.random() * 0.7 }, particleCount: 80, spread: 70 })
    }, i * 200)
  }
  setTimeout(() => { showFirework.value = false }, 2000)
}

function showPraiseTip(text) {
  praiseText.value = text
  showPraise.value = true
  praiseAnimClass.value = 'animate__bounceInRight'
  setTimeout(() => {
    praiseAnimClass.value = 'animate__fadeOutRight'
    setTimeout(() => { showPraise.value = false }, 800)
  }, 1800)
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

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes popIn {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.charts-section {
  margin-top: 48px;
  margin-bottom: 32px;
}
.firework-canvas {
  position: fixed;
  left: 0; top: 0; width: 100vw; height: 100vh;
  pointer-events: none; z-index: 9999;
}
.praise-tip {
  position: fixed; right: 40px; top: 40px;
  background: #fff; color: #2563eb; font-size: 28px; font-weight: bold;
  border-radius: 12px; box-shadow: 0 4px 16px rgba(59,130,246,0.12);
  padding: 18px 36px; z-index: 10000;
}
.combo-tip {
  position: fixed; right: 60px; top: 100px;
  color: #f43f5e; font-size: 40px; font-weight: bold;
  text-shadow: 0 2px 8px #fff, 0 4px 24px #f43f5e44;
  z-index: 10001;
}
@keyframes flash2 {
  0%, 100% { color: #f43f5e; text-shadow: 0 2px 8px #fff, 0 4px 24px #f43f5e44; }
  50% { color: #fff; text-shadow: 0 2px 16px #f43f5e, 0 4px 32px #fff; }
}
@keyframes flash3 {
  0%, 100% { color: #f59e42; text-shadow: 0 2px 12px #fff, 0 4px 32px #f59e4244; }
  50% { color: #fff; text-shadow: 0 2px 24px #f59e42, 0 4px 48px #fff; }
}
@keyframes flash4 {
  0%, 100% { color: #22c55e; text-shadow: 0 2px 16px #fff, 0 4px 40px #22c55e44; }
  50% { color: #fff; text-shadow: 0 2px 32px #22c55e, 0 4px 64px #fff; }
}
@keyframes flash5 {
  0% { color: #fff; background: linear-gradient(90deg, #f43f5e, #f59e42, #22c55e, #3b82f6, #f43f5e); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 16px #fff); }
  25% { color: #fff; background: linear-gradient(90deg, #3b82f6, #f43f5e, #f59e42, #22c55e, #3b82f6); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 32px #f59e42); }
  50% { color: #fff; background: linear-gradient(90deg, #22c55e, #3b82f6, #f43f5e, #f59e42, #22c55e); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 48px #22c55e); }
  75% { color: #fff; background: linear-gradient(90deg, #f59e42, #22c55e, #3b82f6, #f43f5e, #f59e42); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 64px #3b82f6); }
  100% { color: #fff; background: linear-gradient(90deg, #f43f5e, #f59e42, #22c55e, #3b82f6, #f43f5e); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 80px #f43f5e); }
}
.combo-flash-2 {
  animation: flash2 0.7s infinite;
}
.combo-flash-3 {
  animation: flash3 0.5s infinite;
  font-size: 48px;
}
.combo-flash-4 {
  animation: flash4 0.4s infinite;
  font-size: 56px;
  letter-spacing: 2px;
}
.combo-flash-5 {
  animation: flash5 0.3s infinite linear;
  font-size: 64px;
  letter-spacing: 4px;
  font-weight: 900;
  filter: brightness(1.2) drop-shadow(0 0 24px #fff);
}
</style>
