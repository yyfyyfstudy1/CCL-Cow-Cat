import { db } from './firebase';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, getDocs, query, where, onSnapshot } from 'firebase/firestore';

/**
 * 记录一次练习
 * @param {string} questionId 题目ID
 * @param {string} questionTitle 题目标题
 * @param {string|number} questionNumber 题号
 * @param {string} questionType 题目类型
 * @param {number} score AI评分
 */
export async function addPracticeLog(questionId, questionTitle = '', questionNumber = '', questionType = '', score = null) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('未登录');
  const logData = {
    questionId,
    questionTitle,
    questionNumber,
    questionType,
    timestamp: serverTimestamp(),
  };
  
  // 只有当评分存在且有效时才添加
  if (score !== null && score !== undefined && !isNaN(score)) {
    logData.score = score;
  }
  
  await addDoc(collection(db, 'users', user.uid, 'practiceLogs'), logData);
}

// 获取所有练习记录
export async function getAllPracticeLogs() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('未登录');
  const q = query(collection(db, 'users', user.uid, 'practiceLogs'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 获取今日练习记录
export async function getTodayPracticeLogs() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('未登录');
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, 'users', user.uid, 'practiceLogs'),
    where('timestamp', '>=', start)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 实时监听练习日志变化
export function subscribeToPracticeLogs(callback) {
  const user = getAuth().currentUser;
  if (!user) return () => {};
  
  const unsubscribe = onSnapshot(
    collection(db, 'users', user.uid, 'practiceLogs'),
    (snapshot) => {
      // 按timestamp升序排序
      const logs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const ta = a.timestamp?.seconds ? a.timestamp.seconds : (a.timestamp?.toDate ? a.timestamp.toDate().getTime() / 1000 : 0);
          const tb = b.timestamp?.seconds ? b.timestamp.seconds : (b.timestamp?.toDate ? b.timestamp.toDate().getTime() / 1000 : 0);
          return ta - tb;
        });
      callback(logs);
    },
    (error) => {
      console.error('监听练习日志失败:', error);
    }
  );
  
  return unsubscribe;
} 