import { db } from './firebase'
import { getAuth } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

/**
 * 保存用户的播放器设置
 * @param {object} settings 播放器设置对象
 */
export async function savePlayerSettings(settings) {
  const user = getAuth().currentUser
  if (!user) return // 如果用户未登录，则不执行任何操作

  // 创建一个纯净的 JavaScript 对象，避免传入 Proxy
  const settingsToSave = { ...settings };

  try {
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'player')
    await setDoc(settingsRef, settingsToSave, { merge: true })
  } catch (error) {
    console.error("保存用户设置失败:", error)
  }
}

/**
 * 获取用户的播放器设置
 * @returns {Promise<object|null>} 返回设置对象，如果不存在则返回 null
 */
export async function getPlayerSettings() {
  const user = getAuth().currentUser
  if (!user) return null // 如果用户未登录，则返回 null

  try {
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'player')
    const docSnap = await getDoc(settingsRef)

    if (docSnap.exists()) {
      return docSnap.data()
    } else {
      return null // 没有找到设置文档
    }
  } catch (error) {
    console.error("获取用户设置失败:", error)
    return null
  }
}

/**
 * 保存用户的笔记设置
 * @param {object} settings 笔记设置对象
 */
export async function saveNotesSettings(settings) {
  const user = getAuth().currentUser
  if (!user) return // 如果用户未登录，则不执行任何操作

  // 创建一个纯净的 JavaScript 对象，避免传入 Proxy
  const settingsToSave = { ...settings };

  try {
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'notes')
    await setDoc(settingsRef, settingsToSave, { merge: true })
  } catch (error) {
    console.error("保存笔记设置失败:", error)
  }
}

/**
 * 获取用户的笔记设置
 * @returns {Promise<object|null>} 返回设置对象，如果不存在则返回 null
 */
export async function getNotesSettings() {
  const user = getAuth().currentUser
  if (!user) return null // 如果用户未登录，则返回 null

  try {
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'notes')
    const docSnap = await getDoc(settingsRef)

    if (docSnap.exists()) {
      return docSnap.data()
    } else {
      return null // 没有找到设置文档
    }
  } catch (error) {
    console.error("获取笔记设置失败:", error)
    return null
  }
} 