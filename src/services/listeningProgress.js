import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * 标记指定对话为已收听
 * @param {string} qid - 问题ID
 * @param {string} dialogId - 对话ID
 */
export async function markAsListened(qid, dialogId) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !qid || !dialogId) return;

    const progressRef = doc(db, 'users', user.uid, 'listening_progress', qid);

    try {
        await setDoc(progressRef, { [dialogId]: true }, { merge: true });
    } catch (error) {
        console.error("标记收听进度失败:", error);
    }
}

/**
 * 获取用户所有的收听进度
 * @returns {Promise<object>} 返回所有收听进度
 */
export async function getAllListeningProgress() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return {};

    try {
        const progressColRef = collection(db, 'users', user.uid, 'listening_progress');
        const snapshot = await getDocs(progressColRef);
        
        const result = {};
        snapshot.forEach(doc => {
            result[doc.id] = doc.data();
        });
        
        return result;
    } catch (error) {
        console.error("获取收听进度失败:", error);
        return {};
    }
} 