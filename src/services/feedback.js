import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * 添加用户反馈到 Firestore
 * @param {string} text - 用户反馈的文本内容
 * @returns {Promise<void>}
 */
export async function addFeedback(text) {
    const auth = getAuth();
    const user = auth.currentUser;

    const feedbackData = {
        text,
        createdAt: serverTimestamp(),
        userInfo: {
            uid: user ? user.uid : 'anonymous',
            email: user ? user.email : 'anonymous',
            userAgent: navigator.userAgent,
        }
    };

    try {
        await addDoc(collection(db, 'feedback'), feedbackData);
    } catch (error) {
        console.error("保存反馈失败:", error);
        throw new Error("无法提交反馈，请稍后重试。");
    }
} 