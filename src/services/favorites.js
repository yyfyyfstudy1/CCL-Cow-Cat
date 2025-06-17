import { db } from './firebase'
import { getAuth } from 'firebase/auth'
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs } from 'firebase/firestore'

// 收藏对话
export async function addFavorite(dialogId, mastery = 0) {
  const user = getAuth().currentUser
  if (!user) throw new Error('未登录')
  const id = String(dialogId)
  await setDoc(doc(db, 'users', user.uid, 'favorites', id), { id, createdAt: Date.now(), mastery })
}

// 取消收藏
export async function removeFavorite(dialogId) {
  const user = getAuth().currentUser
  if (!user) throw new Error('未登录')
  const id = String(dialogId)
  await deleteDoc(doc(db, 'users', user.uid, 'favorites', id))
}

// 判断是否已收藏
export async function isFavorite(dialogId) {
  const user = getAuth().currentUser
  if (!user) return false
  const id = String(dialogId)
  const ref = doc(db, 'users', user.uid, 'favorites', id)
  const snap = await getDoc(ref)
  return snap.exists()
}

// 获取所有收藏
export async function getAllFavorites() {
  const user = getAuth().currentUser
  if (!user) throw new Error('未登录')
  const col = collection(db, 'users', user.uid, 'favorites')
  const snap = await getDocs(col)
  return snap.docs.map(doc => ({ id: doc.data().id, mastery: doc.data().mastery || 0, createdAt: doc.data().createdAt }))
} 