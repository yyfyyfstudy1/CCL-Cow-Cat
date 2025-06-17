import { db } from './firebase'
import { getAuth } from 'firebase/auth'
import { doc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, orderBy, limit, setDoc } from 'firebase/firestore'

const NOTES_LIMIT = 10; // 每个对话最多10条笔记

// 获取指定对话的所有笔记
export async function getNotes(dialogId) {
  const user = getAuth().currentUser
  if (!user) throw new Error('未登录')
  const notesColRef = collection(db, 'users', user.uid, 'dialogs', String(dialogId), 'notes')
  const q = query(notesColRef, orderBy('createdAt', 'desc')) // 按创建时间降序排列
  const snap = await getDocs(q)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

// 添加笔记
export async function addNote(dialogId, text) {
  const user = getAuth().currentUser
  if (!user) throw new Error('未登录')

  const notesColRef = collection(db, 'users', user.uid, 'dialogs', String(dialogId), 'notes')
  
  // 检查现有笔记数量
  const existingNotesSnap = await getDocs(notesColRef)
  if (existingNotesSnap.docs.length >= NOTES_LIMIT) {
    throw new Error(`每个对话最多只能有 ${NOTES_LIMIT} 条笔记。`)
  }

  await addDoc(notesColRef, {
    text,
    createdAt: Date.now()
  })
}

// 新增：保存对话原文和翻译内容到对话文档
export async function saveDialogContent(dialogId, originalText, translationText, qid = null, title = '', type = '') {
  const user = getAuth().currentUser
  if (!user) throw new Error('未登录')
  const dialogRef = doc(db, 'users', user.uid, 'dialogs', String(dialogId))
  await setDoc(dialogRef, { originalText, translationText, qid, title, type }, { merge: true })
}

// 更新笔记
export async function updateNote(dialogId, noteId, newText) {
  const user = getAuth().currentUser
  if (!user) throw new Error('未登录')
  const noteRef = doc(db, 'users', user.uid, 'dialogs', String(dialogId), 'notes', noteId)
  await updateDoc(noteRef, {
    text: newText,
    updatedAt: Date.now()
  })
}

// 删除笔记
export async function deleteNote(dialogId, noteId) {
  const user = getAuth().currentUser
  if (!user) throw new Error('未登录')
  const noteRef = doc(db, 'users', user.uid, 'dialogs', String(dialogId), 'notes', noteId)
  await deleteDoc(noteRef)
} 