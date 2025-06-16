import { db } from './firebase';
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';

const POLL_DOC_ID = 'mp3_features'; // 投票结果存储的文档ID

/**
 * 记录用户投票
 * @param {'need_mp3' | 'no_mp3'} option 用户选择的选项
 */
export async function recordMp3Vote(option) {
    const pollRef = doc(db, 'polls', POLL_DOC_ID);
    
    try {
        await updateDoc(pollRef, {
            [option]: increment(1)
        });
    } catch (e) {
        // 如果文档不存在，创建它并设置初始值
        if (e.code === 'not-found') {
            await setDoc(pollRef, {
                need_mp3: 0,
                no_mp3: 0,
                [option]: 1 // 设置用户选择的选项为1
            });
        } else {
            console.error("记录MP3投票失败:", e);
            throw e; 
        }
    }
}

/**
 * 获取当前的投票结果
 * @returns {Promise<{need_mp3: number, no_mp3: number}>} 投票结果对象
 */
export async function getMp3PollResults() {
    const pollRef = doc(db, 'polls', POLL_DOC_ID);
    const docSnap = await getDoc(pollRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return { need_mp3: 0, no_mp3: 0 };
    }
} 