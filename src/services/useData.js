import { reactive, readonly } from 'vue';
import { db } from './firebase';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';

const state = reactive({
    loaded: false,
    error: null,
    rows: [],
    byQid: {},
    questions: [], // 新增：题目基本信息
    dialogs: [],   // 新增：对话内容
    lastUpdated: null,
    isRefreshing: false
});

// 检查是否需要强制刷新（超过1天）
function shouldForceRefresh() {
    const lastRefreshTime = localStorage.getItem('firestore_last_refresh');
    if (!lastRefreshTime) {
        console.log('首次访问，需要刷新数据');
        return true;
    }
    
    const now = new Date().getTime();
    const lastRefresh = parseInt(lastRefreshTime);
    const oneDayInMs = 24 * 60 * 60 * 1000; // 1天的毫秒数
    const timeSinceLastRefresh = now - lastRefresh;
    
    console.log(`距离上次刷新: ${Math.round(timeSinceLastRefresh / (1000 * 60 * 60))} 小时`);
    
    if (timeSinceLastRefresh > oneDayInMs) {
        console.log('超过1天，需要刷新数据');
        return true;
    } else {
        console.log('未超过1天，使用缓存数据');
        return false;
    }
}

/**
 * 从 Firestore 加载数据
 */
async function loadFromFirestore(forceRefresh = false) {
    const needsForceRefresh = forceRefresh || shouldForceRefresh();
    
    if (needsForceRefresh) {
        state.loaded = false;
        state.error = null;
        state.rows = [];
        state.byQid = {};
        state.questions = [];
        state.dialogs = [];
        state.isRefreshing = true;
        
        localStorage.setItem('firestore_last_refresh', new Date().getTime().toString());
    }
    
    if (state.loaded && !needsForceRefresh) return;

    try {
        console.log('开始从 Firestore 加载数据...');
        
        // 并行加载题目和对话数据
        const [questionsSnapshot, dialogsSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'questions'), orderBy('qid'))),
            getDocs(query(collection(db, 'dialogs'), orderBy('qid'), orderBy('order')))
        ]);

        // 处理题目数据
        const questions = [];
        questionsSnapshot.forEach(doc => {
            questions.push({ ...doc.data(), docId: doc.id });
        });

        // 处理对话数据
        const dialogs = [];
        dialogsSnapshot.forEach(doc => {
            dialogs.push({ ...doc.data(), docId: doc.id });
        });

        console.log(`成功加载 ${questions.length} 个题目，${dialogs.length} 条对话`);

        // 转换为兼容原有格式的数据结构
        const { rows, byQid } = convertToLegacyFormat(questions, dialogs);

        // 更新状态
        state.questions = questions;
        state.dialogs = dialogs;
        state.rows = rows;
        state.byQid = byQid;
        state.loaded = true;
        state.lastUpdated = new Date().toLocaleString('zh-CN');
        state.isRefreshing = false;

        console.log(`数据已按 qid 分组，共 ${Object.keys(state.byQid).length} 个题目`);

    } catch (err) {
        console.error('从 Firestore 加载数据失败:', err);
        state.error = err.message;
        state.isRefreshing = false;
    }
}

/**
 * 将 Firestore 数据转换为兼容原有格式的数据结构
 */
function convertToLegacyFormat(questions, dialogs) {
    const rows = [];
    const byQid = {};

    // 按 qid 分组对话
    const dialogsByQid = dialogs.reduce((acc, dialog) => {
        if (!acc[dialog.qid]) {
            acc[dialog.qid] = [];
        }
        acc[dialog.qid].push(dialog);
        return acc;
    }, {});

    // 为每个题目创建兼容格式的数据
    questions.forEach(question => {
        const qid = question.qid;
        const questionDialogs = dialogsByQid[qid] || [];
        
        // 添加题目信息行（第一行）
        const questionRow = {
            qid,
            title: question.title,
            text: '', // 题目信息行没有具体文本
            audio1: null,
            audio2: null,
            type: question.type,
            date: question.date,
            extraMention: question.extraMention,
            questionTag: question.questionTag,
            id: `question_${qid}`,
            isQuestion: 0 // 题目信息行
        };
        
        rows.push(questionRow);
        
        if (!byQid[qid]) {
            byQid[qid] = [];
        }
        byQid[qid].push(questionRow);

        // 添加对话内容行
        questionDialogs
            .sort((a, b) => a.order - b.order) // 确保按顺序排列
            .forEach(dialog => {
                const dialogRow = {
                    qid,
                    title: question.title,
                    text: dialog.text,
                    audio1: dialog.audio1,
                    audio2: dialog.audio2,
                    type: question.type,
                    date: question.date,
                    extraMention: question.extraMention,
                    questionTag: question.questionTag,
                    id: dialog.id,
                    isQuestion: dialog.isQuestion
                };
                
                rows.push(dialogRow);
                byQid[qid].push(dialogRow);
            });
    });

    return { rows, byQid };
}

/**
 * 设置实时监听器（可选功能）
 */
function setupRealtimeListeners() {
    console.log('设置 Firestore 实时监听器...');
    
    // 监听题目变化
    const questionsUnsubscribe = onSnapshot(
        query(collection(db, 'questions'), orderBy('qid')),
        (snapshot) => {
            console.log('题目数据发生变化，自动更新...');
            loadFromFirestore(true); // 强制刷新
        },
        (error) => {
            console.error('题目监听器错误:', error);
        }
    );

    // 监听对话变化
    const dialogsUnsubscribe = onSnapshot(
        query(collection(db, 'dialogs'), orderBy('qid'), orderBy('order')),
        (snapshot) => {
            console.log('对话数据发生变化，自动更新...');
            loadFromFirestore(true); // 强制刷新
        },
        (error) => {
            console.error('对话监听器错误:', error);
        }
    );

    // 返回取消监听的函数
    return () => {
        questionsUnsubscribe();
        dialogsUnsubscribe();
    };
}

/**
 * 强制刷新数据
 */
async function refreshData() {
    return await loadFromFirestore(true);
}

/**
 * 获取指定题目的详细信息
 */
function getQuestionByQid(qid) {
    return state.questions.find(q => q.qid === qid);
}

/**
 * 获取指定题目的所有对话
 */
function getDialogsByQid(qid) {
    return state.dialogs
        .filter(d => d.qid === qid)
        .sort((a, b) => a.order - b.order);
}

/**
 * 搜索题目（支持标题、类型、标签搜索）
 */
function searchQuestions(searchTerm) {
    if (!searchTerm) return state.questions;
    
    const term = searchTerm.toLowerCase();
    return state.questions.filter(q => 
        q.title.toLowerCase().includes(term) ||
        q.type.toLowerCase().includes(term) ||
        q.questionTag.toLowerCase().includes(term)
    );
}

// 兼容原有接口的函数名
const loadExcel = loadFromFirestore;
const refreshExcel = refreshData;

export function useData() {
    return {
        // 兼容原有接口
        loadExcel,
        refreshExcel,
        data: readonly(state),
        
        // 新增的 Firestore 专用接口
        loadFromFirestore,
        refreshData,
        setupRealtimeListeners,
        getQuestionByQid,
        getDialogsByQid,
        searchQuestions
    };
}