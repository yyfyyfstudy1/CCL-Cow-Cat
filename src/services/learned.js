import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// 记录用户已学对话
export async function markAsLearned(qid, dialogId) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const userLearnedRef = doc(db, 'users', user.uid, 'learned', qid);
    const learnedDoc = await getDoc(userLearnedRef);
    
    if (learnedDoc.exists()) {
        // 如果文档已存在，更新对话ID
        await setDoc(userLearnedRef, {
            [dialogId]: true
        }, { merge: true });
    } else {
        // 如果文档不存在，创建新文档
        await setDoc(userLearnedRef, {
            [dialogId]: true
        });
    }
}

// 获取用户所有已学对话
export async function getAllLearned() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return {};

    const learnedRef = collection(db, 'users', user.uid, 'learned');
    const snapshot = await getDocs(learnedRef);
    
    const result = {};
    snapshot.forEach(doc => {
        result[doc.id] = doc.data();
    });
    
    return result;
}

// 检查特定对话是否已学
export async function isLearned(qid, dialogId) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return false;

    const userLearnedRef = doc(db, 'users', user.uid, 'learned', qid);
    const learnedDoc = await getDoc(userLearnedRef);
    
    if (!learnedDoc.exists()) return false;
    
    const data = learnedDoc.data();
    return !!data[dialogId];
} 