import { reactive, readonly } from 'vue';
import { db } from './firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const state = reactive({
    loaded: false,
    error: null,
    rows: [],
    byQid: {},
    questions: [],
    dialogs: []
});

/**
 * 从 Firestore 加载数据
 */
async function loadData() {
    if (state.loaded) return;

    try {
        console.log('从 Firestore 加载数据...');
        
        // 加载题目和对话数据
        const [questionsSnapshot, dialogsSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'questions'), orderBy('qid'))),
            getDocs(query(collection(db, 'dialogs'), orderBy('qid'), orderBy('order')))
        ]);

        // 处理数据
        const questions = [];
        questionsSnapshot.forEach(doc => {
            questions.push({ ...doc.data(), docId: doc.id });
        });

        const dialogs = [];
        dialogsSnapshot.forEach(doc => {
            dialogs.push({ ...doc.data(), docId: doc.id });
        });

        // 转换为原有格式
        const { rows, byQid } = convertData(questions, dialogs);

        // 更新状态
        state.questions = questions;
        state.dialogs = dialogs;
        state.rows = rows;
        state.byQid = byQid;
        state.loaded = true;

        console.log(`加载完成：${questions.length} 个题目，${dialogs.length} 条对话`);

    } catch (err) {
        console.error('加载数据失败:', err);
        state.error = err.message;
    }
}

/**
 * 转换数据格式
 */
function convertData(questions, dialogs) {
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

    // 处理每个题目
    questions.forEach(question => {
        const qid = question.qid;
        const questionDialogs = dialogsByQid[qid] || [];
        
        // 题目信息行
        const questionRow = {
            qid,
            title: question.title,
            text: '',
            audio1: null,
            audio2: null,
            type: question.type,
            date: question.date,
            extraMention: question.extraMention,
            questionTag: question.questionTag,
            id: `question_${qid}`,
            isQuestion: 0
        };
        
        rows.push(questionRow);
        
        if (!byQid[qid]) {
            byQid[qid] = [];
        }
        byQid[qid].push(questionRow);

        // 对话内容行
        questionDialogs
            .sort((a, b) => a.order - b.order)
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
 * 刷新数据
 */
async function refreshData() {
    state.loaded = false;
    return await loadData();
}

/**
 * 根据题号获取题目
 */
function getQuestion(qid) {
    return state.questions.find(q => q.qid === qid);
}

/**
 * 根据题号获取对话
 */
function getDialogs(qid) {
    return state.dialogs
        .filter(d => d.qid === qid)
        .sort((a, b) => a.order - b.order);
}

export function useData() {
    return {
        loadData,
        refreshData,
        getQuestion,
        getDialogs,
        data: readonly(state)
    };
}