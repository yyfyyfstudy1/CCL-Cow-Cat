<template>
    <div class="container">
        <div v-if="error" class="error">
            <h3>加载失败</h3>
            <p>{{ error }}</p>
            <button @click="retryLoad" class="retry-btn">重试</button>
        </div>

        <div v-else-if="!data.loaded" class="loading">
            <div class="spinner"></div>
            加载中...
        </div>

        <div v-else>
            <QuestionHeader 
                :pageTitle="pageTitle"
                :pageType="pageType"
                :pageDate="pageDate"
                :pageQid="pageQid"
                :pageExtraMention="pageExtraMention"
                :pageIntro="pageIntro"
                :isFavoritesMode="isFavoritesMode"
                :sortOrder="sortOrder"
                :audioSrc="audioSrc"
                @toggle-sort-order="toggleSortOrder"
            />

            <!-- 对话内容 -->
            <DialogItem
                v-for="(dialog, idx) in sortedDialogs"
                :key="dialog.original.id"
                :dialog="dialog"
                :localIndex="idx"
                :globalDialogIndex="getGlobalDialogIndex(dialog)"
                :isFavoritesMode="isFavoritesMode"
                :isLoggedIn="isLoggedIn"
                :favoriteIds="favoriteIds"
                :dialogStates="dialogStates"
                :audioSrc="audioSrc"
                :recordings="recordingsList[idx]"
                :isRecording="isRecording"
                :isApiLoading="isApiLoading"
                :transcribingStatus="transcribingStatus"
                :currentTranscribingDialogId="currentTranscribingDialogId"
                :notesError="notesError"
                :newNoteText="newNoteText[dialog.original.id] || ''"
                :autoCompletionEnabled="autoCompletionEnabled"
                :showInlineCompletion="showInlineCompletion[dialog.original.id]"
                :inlineCompletion="inlineCompletion[dialog.original.id]"
                :suggestionError="suggestionError[dialog.original.id]"
                :editingNoteId="editingNoteId"
                :editingNoteText="editingNoteText"
                @toggle-favorite="toggleFavorite"
                @update-mastery="updateMastery"
                @toggle-notes="toggleNotesSection"
                @toggle-dialog="(type) => toggleDialog(idx, type)"
                @original-audio-end="() => handleOriginalAudioEnd(idx)"
                @start-recording="startRecording"
                @stop-recording="stopRecording"
                @cancel-recording="cancelRecording"
                @delete-recording="deleteRecording"
                @show-settings="showNoteSettings = true"
                @add-note="handleAddNote"
                @apply-completion="applyInlineCompletion"
                @note-keydown="handleNoteKeydown"
                @note-input="handleNoteInput"
                @save-note="handleSaveNote"
                @cancel-edit="handleCancelEdit"
                @edit-note="handleEditNote"
                @delete-note="handleDeleteNote"
                @update:newNoteText="(id, value) => newNoteText[id] = value"
                @update:editingNoteText="(value) => editingNoteText = value"
            />
        </div>
        
        <!-- 错误弹窗 -->
        <div v-if="showRecordError" class="record-error-toast">
            {{ recordError }}
        </div>
        
        <!-- 笔记设置模态框 -->
        <NoteSettingsModal
            :showNoteSettings="showNoteSettings"
            :autoCompletionEnabled="autoCompletionEnabled"
            @close="showNoteSettings = false"
            @update:autoCompletionEnabled="(value) => { autoCompletionEnabled = value; saveNoteSettings() }"
        />
        
        <PaginationBar
            :isFavoritesMode="isFavoritesMode"
            :currentPage="currentPage"
            :totalPages="totalPages"
            @page-change="(page) => currentPage = page"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useData } from '../services/useData.js'
import { QuestionHeader, DialogItem, PaginationBar, NoteSettingsModal } from './QuestionDetail'
import { checkTranslation, transcribeAudio, getNoteSuggestions, getSmartCompletion } from '../services/openai.js'
import { addFavorite, removeFavorite, getAllFavorites } from '../services/favorites.js'
import { markAsLearned } from '../services/learned.js'
import { getNotes, getBatchNotes, addNote, updateNote, deleteNote, saveDialogContent } from '../services/notes.js'
import { getAuth, onAuthStateChanged } from 'firebase/auth' // 导入 Firebase Auth
import { uploadAudioToLambda } from '@/services/googleDrive'
import { saveNotesSettings, getNotesSettings } from '../services/userSettings.js'
import autosize from 'autosize'
import { nextTick } from 'vue'
import { addPracticeLog } from '@/services/practiceLogs'

const route = useRoute()
const router = useRouter()
const qid = route.params.qid

// 状态
const error = ref(null)
const isRecording = ref(false)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const chimeAudio = ref(null)

// 新增：登录状态
const isLoggedIn = ref(false)

// 新增：鼠标悬停提示状态
const showMasteryTooltip = ref(false)

// 新增：排序模式状态
const currentSortMode = ref('createdAt') // 默认按添加时间排序
// 新增：排序方向状态
const sortOrder = ref('desc') // 默认降序

// 新增：笔记相关状态
const newNoteText = ref({}) // 存储每个对话的新笔记内容
const editingNoteId = ref(null) // 当前正在编辑的笔记ID
const editingNoteText = ref('') // 当前正在编辑的笔记内容
const notesError = ref(null); // 笔记操作的错误信息

// 新增：笔记智能提示相关状态
const noteSuggestions = ref({}) // 存储每个对话的笔记提示
const isGettingSuggestions = ref({}) // 存储每个对话是否正在获取提示
const suggestionError = ref({}) // 存储每个对话的提示错误信息

// 新增：内联智能补全相关状态
const showInlineCompletion = ref({}) // 控制是否显示内联补全
const inlineCompletion = ref({}) // 存储内联补全内容
const completionDebounceTimer = ref({}) // 防抖定时器

// 新增：笔记设置相关状态
const showNoteSettings = ref(false) // 控制笔记设置模态框显示
const autoCompletionEnabled = ref(true) // 默认启用智能补全

// 存储所有录音及其转录
// recordingsList: { [dialogIdx]: [ { url, text, timestamp, aiCheck } ] }
const recordingsList = ref({})
// 控制"显示/隐藏"对话原文/译文
const dialogStates = ref({})

// 新增：API 调用状态
const isApiLoading = ref(false)

// 新增：取消标志
const isCancelled = ref(false)

// 添加提示框状态
const showNotification = ref(false)

const { loadData, data } = useData()
const S3_BASE_URL = "https://cclcowcatresource.s3.ap-southeast-2.amazonaws.com";
const S3_AUDIO_PATH = import.meta.env.VITE_S3_AUDIO_PATH || '/audio';

// 收藏相关
const favoriteIds = ref([])
const favoriteMasteries = ref({}); // 新增：存储收藏对话的熟练度

// 分页相关（仅收藏模式）
const pageSize = 20
const currentPage = ref(1)
const totalPages = ref(1)
const allFavoriteItems = ref([]) // 所有收藏元数据


// 页面数据（改为 ref）
const pageTitle = ref('Untitled')
const pageIntro = ref(null)
const pageType  = ref('')
const pageDate  = ref('')
const pageExtraMention = ref('')
const pageQid = ref(null) // 新增：用于存储当前显示的题号
const dialogs = ref([]) // 依然是 ref

const isFavoritesMode = computed(() => route.name === 'myFavorites' || route.params.mode === 'favorites')

// 新增：根据排序模式计算排序后的对话列表
const sortedDialogs = computed(() => {
  if (!isFavoritesMode.value || !dialogs.value.length) {
    return dialogs.value
  }

  // 创建一个副本以避免直接修改原始数组
  const sorted = [...dialogs.value]

  if (currentSortMode.value === 'createdAt') {
    // 按添加时间排序
    return sorted.sort((a, b) => {
      const valA = a.createdAt || 0
      const valB = b.createdAt || 0
      return sortOrder.value === 'desc' ? valB - valA : valA - valB
    })
  } else if (currentSortMode.value === 'mastery') {
    // 按熟练度排序
    return sorted.sort((a, b) => {
      const valA = a.mastery || 0
      const valB = b.mastery || 0
      return sortOrder.value === 'desc' ? valB - valA : valA - valB
    })
  } else {
    return dialogs.value
  }
})

// 复制按钮状态：{ 'original-对话idx': false, 'translation-对话idx': false }
const copyStatus = ref({})

function getCopyKey(type, idx) {
  return `${type}-${idx}`
}

function copyText(text, type, idx) {
  if (!text) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {}
    document.body.removeChild(textarea);
  }
  // 设置勾号状态
  const key = getCopyKey(type, idx)
  copyStatus.value[key] = true
  setTimeout(() => {
    copyStatus.value[key] = false
  }, 2000)
}

async function retryLoad() {
  error.value = null
  try { await loadFromFirestore() }
  catch (e) { error.value = e.message }
}
retryLoad()

function getDialogKey(idx, type) {
  return `${idx}-${type}`
}
function toggleDialog(idx, type) {
  const k = getDialogKey(idx, type)
  dialogStates.value[k] = !dialogStates.value[k]
}
function isDialogOpen(idx, type) {
  return !!dialogStates.value[getDialogKey(idx, type)]
}
function audioSrc(rel) {
  return rel ? `${S3_BASE_URL}${S3_AUDIO_PATH}${rel}` : '';
}

// 新增：加载所有收藏元数据并排序
async function loadAllFavoritesMeta() {
  const favoriteItems = await getAllFavorites() // 只拿id/mastery/createdAt
  // 全局排序
  favoriteItems.sort((a, b) => {
    if (currentSortMode.value === 'createdAt') {
      return sortOrder.value === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    } else if (currentSortMode.value === 'mastery') {
      return sortOrder.value === 'desc' ? b.mastery - a.mastery : a.mastery - b.mastery
    }
    return 0
  })
  allFavoriteItems.value = favoriteItems
  totalPages.value = Math.max(1, Math.ceil(favoriteItems.length / pageSize))
  favoriteIds.value = favoriteItems.map(item => String(item.id))
  favoriteMasteries.value = favoriteItems.reduce((acc, item) => {
    acc[String(item.id)] = item.mastery
    return acc
  }, {})
}

// 新增：只加载当前页的题目和答案
async function loadCurrentPageDialogs() {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  const pageItems = allFavoriteItems.value.slice(start, end)

  dialogs.value = pageItems.map(item => {
    const id = String(item.id)
    // 找到原始对话行（题目）
    const originalRow = data.rows.find(r => String(r.id) === id)
    // 找到对应的答案行
    let translationRow = null
    if (originalRow) {
      const rowsForQid = data.byQid[originalRow.qid] || []
      const originalIndex = rowsForQid.findIndex(r => String(r.id) === id)
      if (originalIndex !== -1) {
        if (originalIndex + 1 < rowsForQid.length) {
          translationRow = rowsForQid[originalIndex + 1]
        }
      }
    }
    return {
      original: {
        text: originalRow?.text || '',
        audio: originalRow?.audio1 || '',
        isQuestion: 1,
        id: id,
        associatedQid: originalRow?.qid || null,
        associatedTitle: originalRow?.title || '未知题目'
      },
      translation: {
        text: translationRow?.text || '',
        audio: translationRow?.audio1 || ''
      },
      mastery: item.mastery,
      createdAt: item.createdAt,
      showNotes: false,
      dialogNotes: [],
      qid: originalRow?.qid || null,
      title: originalRow?.title || '未知题目',
      type: originalRow?.type || ''
    }
  })

  // 分页切换时重置局部状态
  dialogStates.value = {}
  showMasteryTooltip.value = false
  copyStatus.value = {}
  recordingsList.value = {}
  newNoteText.value = {}
  showInlineCompletion.value = {}
  inlineCompletion.value = {}
  completionDebounceTimer.value = {}
  editingNoteId.value = null
  editingNoteText.value = ''
  notesError.value = null
  noteSuggestions.value = {}
  isGettingSuggestions.value = {}
  suggestionError.value = {}
  noteTextareaRefs.value = {}
  
  // 清除所有定时器
  Object.values(completionDebounceTimer.value).forEach(timer => {
    if (timer) clearTimeout(timer)
  })
}

// 统一的数据加载函数
async function loadPageData() {
  error.value = null
  try {
    await loadData() // 确保数据已加载

    if (!isLoggedIn.value && isFavoritesMode.value) {
        pageTitle.value = '我的收藏对话 (请登录)';
        dialogs.value = []; // 清空对话列表
        return; // 提前退出
    }

    if (isFavoritesMode.value) {
      // 分页收藏模式
      await loadAllFavoritesMeta()
      await loadCurrentPageDialogs()
      pageTitle.value = '我的收藏对话'
    } else {
      // 普通模式：根据 qid 加载数据
      const currentQid = route.params.qid
      pageQid.value = currentQid // 更新 pageQid
      const rowsForQid = data.byQid[currentQid] || []

      if (rowsForQid.length === 0) {
        throw new Error(`找不到题号为 ${currentQid} 的对话。`)
      }

      pageTitle.value = rowsForQid[0]?.title || 'Untitled'
      pageIntro.value = rowsForQid[0]?.audio1 || null
      pageType.value  = rowsForQid[0]?.type  || ''
      pageDate.value  = rowsForQid[0]?.date  || ''
      pageExtraMention.value = rowsForQid[0]?.extraMention || ''

      // 构造对话列表
      const arr = []
      for (let i = 1; i < rowsForQid.length; i += 2) {
        const o = rowsForQid[i], t = rowsForQid[i + 1]
        if (o && t) {
          arr.push({
            original:    { text: o.text, audio: o.audio1, isQuestion: o.isQuestion, id: o.id },
            translation: { text: t.text, audio: t.audio1 },
            showNotes: false, // 默认不显示笔记部分
            dialogNotes: [], // 初始化空笔记列表
            qid: currentQid, // 将当前页面的qid保存到每个对话对象
            title: pageTitle.value, // 将当前页面的title保存到每个对话对象
            type: pageType.value // 将当前页面的type保存到每个对话对象
          })
        }
      }
      dialogs.value = arr
    }

    // 无论哪种模式，都加载收藏状态
    await loadFavorites()

    // 批量加载所有对话的笔记
    await loadAllNotes()

  } catch (e) {
    console.error('加载页面数据失败:', e)
    error.value = e.message
  }
}

// 监听分页、排序变化，自动加载当前页
watch([currentPage, currentSortMode, sortOrder], async ([newPage, newSort, newOrder], [oldPage, oldSort, oldOrder]) => {
  if (isFavoritesMode.value) {
    cleanupRecording()
    await loadAllFavoritesMeta()
    await loadCurrentPageDialogs()
    // 批量加载笔记
    await loadAllNotes()
  }
})

// 监听路由变化，重置分页
watch(() => route.fullPath, (newPath, oldPath) => {
  if (newPath !== oldPath) {
    currentPage.value = 1
    loadPageData()
  }
}, { immediate: true })

// 首次加载（由 watch immediate 触发，但确保其他初始化）
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = !!user
    // 登录状态变化时重新加载页面数据，以更新收藏/笔记可见性
    loadPageData()
    // 加载笔记设置
    if (user) {
      loadNoteSettings()
    }
  })

  chimeAudio.value = new Audio('/chime.mp4')
  const hasShownNotification = localStorage.getItem('hasShownNotification')
  if (!hasShownNotification) {
    showNotification.value = true
  }
  // 自动恢复音频加载
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

function cleanupRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stream.getTracks().forEach(track => track.stop())
    isRecording.value = false
    isApiLoading.value = false
    transcribingStatus.value = 'idle'
    currentTranscribingDialogId.value = null
    audioChunks.value = []
  }
}

onBeforeUnmount(() => {
  cleanupRecording()
})

onUnmounted(() => {
  // 卸载时释放所有 Blob URL
  Object.values(recordingsList.value)
    .flat()
    .forEach(r => URL.revokeObjectURL(r.url))
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // 重新加载所有 audio 元素
    const audios = document.querySelectorAll('audio');
    audios.forEach(audio => {
      audio.load();
    });
  }
}

/**
 * 根据对话原文内容自动选择识别语言
 * 英文原文则 en-US，否则用 zh-CN 原文是中文，就要转成英语。原文是英语，转译中文
 */
function detectLang(dialogId) {
  const txt = dialogs.value[dialogId]?.original.text || ''
  // console.log('detectLang================')
  // console.log(txt)
  // console.log(/[A-Za-z]/.test(txt) ? 'zh' : 'en')
  return /[A-Za-z]/.test(txt) ? 'zh' : 'en'
}

async function convertToWav(audioBlob) {
  try {
    // 创建音频上下文
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // 将 Blob 转换为 ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer()

    // 解码音频数据
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // 创建离线音频上下文
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    // 创建音频源
    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineContext.destination)
    source.start(0)

    // 渲染音频
    const renderedBuffer = await offlineContext.startRendering()

    // 将音频数据转换为 WAV 格式
    const wavBlob = await audioBufferToWav(renderedBuffer)

    return wavBlob
  } catch (err) {
    console.error('音频转换失败:', err)
    return audioBlob // 如果转换失败，返回原始音频
  }
}

// 将 AudioBuffer 转换为 WAV 格式
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels
  const length = buffer.length * numOfChan * 2
  const buffer2 = new ArrayBuffer(44 + length)
  const view = new DataView(buffer2)
  const channels = []
  let sample
  let offset = 0
  let pos = 0

  // 写入 WAV 文件头
  setUint32(0x46464952)                         // "RIFF"
  setUint32(36 + length)                        // 文件长度
  setUint32(0x45564157)                         // "WAVE"
  setUint32(0x20746d66)                         // "fmt " chunk
  setUint32(16)                                 // 长度 = 16
  setUint16(1)                                  // PCM (uncompressed)
  setUint16(numOfChan)
  setUint32(buffer.sampleRate)
  setUint32(buffer.sampleRate * 2 * numOfChan)  // avg. bytes/sec
  setUint16(numOfChan * 2)                      // block-align
  setUint16(16)                                 // 16-bit
  setUint32(0x61746164)                         // "data" - chunk
  setUint32(length)                             // chunk length

  // 写入音频数据
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  while (pos < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos]))
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
      view.setInt16(44 + offset, sample, true)
      offset += 2
    }
    pos++
  }

  return new Blob([buffer2], { type: 'audio/wav' })

  function setUint16(data) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data) {
    view.setUint32(pos, data, true)
    pos += 4
  }
}

/**
 * 开始录音并进行语音识别
 */
async function startRecording(dialogId) {
  try {
    recordError.value = '' // 开始录音时清空错误
    showRecordError.value = false
    isCancelled.value = false
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        channelCount: 1
      }
    })

    const rec = new MediaRecorder(stream, {
      mimeType: 'audio/mp4',
      audioBitsPerSecond: 128000
    })

    mediaRecorder.value = rec
    audioChunks.value = []
    rec.ondataavailable = e => audioChunks.value.push(e.data)

    const pStop = new Promise(res => rec.onstop = res)

    rec.start()
    isRecording.value = true

    await pStop

    if (isCancelled.value) {
      return
    }

    const blob = new Blob(audioChunks.value, {
      type: 'audio/mp4'
    })
    const url = URL.createObjectURL(blob)

    // ====== 新增：节流逻辑，判断录音时长 ======
    const audio = new Audio(url)
    const duration = await new Promise((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration)
      })
    })
    if (!duration || duration < 2) {
      recordError.value = '录音时间太短，请录制2秒以上的语音。'
      showRecordError.value = true
      setTimeout(() => { showRecordError.value = false }, 2000)
      // 释放资源
      URL.revokeObjectURL(url)
      return
    }
    // ====== 节流逻辑结束 ======

    const originalText = dialogs.value[dialogId]?.original.text || ''
    let translatedText = '未转录'
    let aiCheckResult = null

    try {
      isApiLoading.value = true
      transcribingStatus.value = 'transcribing'
      currentTranscribingDialogId.value = dialogId

      // 1. 转录
      const translatedText = await transcribeAudio(
        blob,
        detectLang(dialogId),
        detectLang(dialogId) === 'zh' ? '请返回简体中文' : 'Please return in English'
      )
      const trimmedText = translatedText.trim()

      // 2. AI打分
      transcribingStatus.value = 'scoring'
      aiCheckResult = await checkTranslation(originalText, trimmedText)

      // 3. 记录已学
      const dialog = dialogs.value[dialogId]
      if (dialog?.original?.id) {
        if (!isFavoritesMode.value) {
          await markAsLearned(route.params.qid, String(dialog.original.id))
        }
      }

      // 4. 上传
      const now = new Date()
      const filename = now.toISOString().replace(/[:.]/g, '-').split('.')[0] + '.wav'
      const blobCopy = blob.slice(0)
      Promise.resolve().then(async () => {
        try {
          const wavBlob = await convertToWav(blobCopy)
          await uploadAudioToLambda(wavBlob, filename)
        } catch (err) {}
      })
      // === 新增：记录练习日志 ===
      try {
        // 提取AI评分
        let score = extractScore(aiCheckResult);
        let accuracy = extractAccuracy(aiCheckResult);
        let accuracyMax = extractAccuracyMax(aiCheckResult);
        let fluency = extractFluency(aiCheckResult);
        let fluencyMax = extractFluencyMax(aiCheckResult);
        let grammar = extractGrammar(aiCheckResult);
        let grammarMax = extractGrammarMax(aiCheckResult);
        // 单项为0分时赋1分
        if (accuracy !== null && Number(accuracy) === 0) accuracy = 1;
        if (fluency !== null && Number(fluency) === 0) fluency = 1;
        if (grammar !== null && Number(grammar) === 0) grammar = 1;
        if (score !== null && Number(score) === 0) score = 1;
        // 获取当前对话
        const dialog = dialogs.value[dialogId];

        await addPracticeLog(
          isFavoritesMode.value ? dialog.qid : route.params.qid,
          isFavoritesMode.value ? dialog.title : pageTitle.value,
          isFavoritesMode.value ? dialog.qid : pageQid.value,
          isFavoritesMode.value ? dialog.type : pageType.value,
          score ? parseInt(score) : null,
          accuracy ? parseInt(accuracy) : null,
          accuracyMax ? parseInt(accuracyMax) : null,
          fluency ? parseInt(fluency) : null,
          fluencyMax ? parseInt(fluencyMax) : null,
          grammar ? parseInt(grammar) : null,
          grammarMax ? parseInt(grammarMax) : null
        )
        if (isFavoritesMode.value) {

        }
      } catch (e) {
      }
      // ===
      if (!recordingsList.value[dialogId]) recordingsList.value[dialogId] = []
      recordingsList.value[dialogId].push({
        url,
        text: trimmedText,
        timestamp: new Date().toLocaleString(),
        aiCheck: aiCheckResult
      })

    } catch (err) {
      // aiCheckResult = '转录或翻译检查失败'
      recordError.value = '语音转录或AI打分失败，请检查网络或稍后重试，再次点击"开始录音"可重新尝试。'
      showRecordError.value = true
      setTimeout(() => { showRecordError.value = false }, 3000)
    } finally {
      isApiLoading.value = false
      transcribingStatus.value = 'idle'
      currentTranscribingDialogId.value = null
    }

  } catch (err) {
    alert('无法访问麦克风，请检查权限')
  } finally {
    if (mediaRecorder.value) {
      mediaRecorder.value.stream.getTracks().forEach(t => t.stop())
    }
    isRecording.value = false
    isApiLoading.value = false
    transcribingStatus.value = 'idle'
    currentTranscribingDialogId.value = null
  }
}

/** 手动停止录音 */
function stopRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
  }
}

/** 删除某条录音 */
function deleteRecording(dialogId, idx) {
  const list = recordingsList.value[dialogId]
  if (list) {
    URL.revokeObjectURL(list[idx].url)
    list.splice(idx, 1)
  }
}

/** 原文音频播完后播放提示音，再启动录音 */
function handleOriginalAudioEnd(idx) {
  if (chimeAudio.value) {
    chimeAudio.value.play().then(() => {
      chimeAudio.value.onended = () => startRecording(idx)
    }).catch(() => startRecording(idx))
  } else {
    startRecording(idx)
  }
}

// 从 AI 评估结果中提取分数
function extractScore(aiCheck) {
  if (!aiCheck) return null;
  const match = aiCheck.match(/总分：([\d]+)/);
  return match ? match[1] : null;
}
// 新增：提取准确分、自然度、语法分及其满分
function extractAccuracy(aiCheck) {
  if (!aiCheck) return null;
  const match = aiCheck.match(/准确[性分]：?(\d+)\/(\d+)/);
  return match ? match[1] : null;
}
function extractAccuracyMax(aiCheck) {
  if (!aiCheck) return null;
  const match = aiCheck.match(/准确[性分]：?(\d+)\/(\d+)/);
  return match ? match[2] : null;
}
function extractFluency(aiCheck) {
  if (!aiCheck) return null;
  const match = aiCheck.match(/自然度[:：]?(\d+)\/(\d+)/);
  return match ? match[1] : null;
}
function extractFluencyMax(aiCheck) {
  if (!aiCheck) return null;
  const match = aiCheck.match(/自然度[:：]?(\d+)\/(\d+)/);
  return match ? match[2] : null;
}
function extractGrammar(aiCheck) {
  if (!aiCheck) return null;
  const match = aiCheck.match(/语法[:：]?(\d+)\/(\d+)/);
  return match ? match[1] : null;
}
function extractGrammarMax(aiCheck) {
  if (!aiCheck) return null;
  const match = aiCheck.match(/语法[:：]?(\d+)\/(\d+)/);
  return match ? match[2] : null;
}

function cancelRecording() {
  if (mediaRecorder.value && isRecording.value) {
    isCancelled.value = true  // 设置取消标志
    mediaRecorder.value.stream.getTracks().forEach(track => track.stop())
    isRecording.value = false
    audioChunks.value = []
  }
}

// 关闭提示框并存储状态
function closeNotification() {
    showNotification.value = false
    localStorage.setItem('hasShownNotification', 'true')
}

async function loadFavorites() {
  try {
    const favoriteItems = await getAllFavorites()
    favoriteIds.value = favoriteItems.map(item => String(item.id))
    favoriteMasteries.value = favoriteItems.reduce((acc, item) => {
      acc[String(item.id)] = item.mastery
      return acc
    }, {})

    // dialogs.value = favoriteItems.map(item => ({
    //   original: { id: item.id }, // 仅需要id用于查找，实际显示依赖sortedDialogs
    //   mastery: item.mastery,
    //   createdAt: item.createdAt
    // }));

  } catch (e) {
    favoriteIds.value = []
    favoriteMasteries.value = {}
    // dialogs.value = [] // 加载失败时清空对话列表 - 这行也不再需要，因为dialogs由loadPageData负责
  }
}

async function toggleFavorite(id) {
  const strId = String(id)
  if (favoriteIds.value.includes(strId)) {
    await removeFavorite(strId)
  } else {
    // 新增收藏时，默认熟练度为 0
    await addFavorite(strId, 0)
  }
  await loadFavorites()
}

// 新增：更新熟练度函数
async function updateMastery(dialogId, newMastery) {
  const strId = String(dialogId)
  try {
    await addFavorite(strId, newMastery)
    // 找到对应的对话并更新其熟练度，实现实时显示
    const dialogToUpdate = dialogs.value.find(d => String(d.original.id) === strId)
    if (dialogToUpdate) {
      dialogToUpdate.mastery = newMastery
      // 也可以更新 favoriteMasteries.value 以保持数据一致性
      favoriteMasteries.value[strId] = newMastery
    }
    // 当熟练度更新时，确保 sortedDialogs 能够重新计算。
    // 如果当前是按熟练度排序，强制更新 dialogs.value 以触发 computed 重新计算。
    // 简单做法是重新赋值 dialogs.value，或者更新 dialogs.value 内部的元素。
    // 因为我们已经直接修改了 dialogToUpdate.mastery，Vue 会自动响应。
    console.log(`对话 ${strId} 的熟练度已更新为 ${newMastery}`)
  } catch (e) {
    console.error('更新熟练度失败:', e)
  }
}

// 新增：切换排序模式
function toggleSortMode() {
  currentSortMode.value = currentSortMode.value === 'createdAt' ? 'mastery' : 'createdAt'
  console.log(`排序模式已切换为: ${currentSortMode.value === 'createdAt' ? '添加时间' : '熟练度'}`)

  // 重新排序对话和录音
  if (isFavoritesMode.value) {
    // 保存原始顺序的录音列表
    const originalRecordings = { ...recordingsList.value }

    // 对对话进行排序
    dialogs.value.sort((a, b) => {
      if (currentSortMode.value === 'createdAt') {
        const timeA = a.createdAt || 0
        const timeB = b.createdAt || 0
        return sortOrder.value === 'desc' ? timeB - timeA : timeA - timeB
      } else if (currentSortMode.value === 'mastery') {
        const masteryA = a.mastery || 0
        const masteryB = b.mastery || 0
        return sortOrder.value === 'desc' ? masteryB - masteryA : masteryA - masteryB
      }
      return 0
    })

    // 重新映射录音列表到新的顺序
    const newRecordings = {}
    dialogs.value.forEach((dialog, newIndex) => {
      const originalIndex = dialog.original.id
      if (originalRecordings[originalIndex]) {
        newRecordings[newIndex] = originalRecordings[originalIndex]
      }
    })
    recordingsList.value = newRecordings
  }
}

// 新增：切换排序方向
function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  console.log(`排序方向已切换为: ${sortOrder.value === 'desc' ? '降序' : '升序'}`)

  // 重新排序对话和录音
  if (isFavoritesMode.value) {
    // 保存原始顺序的录音列表
    const originalRecordings = { ...recordingsList.value }

    // 对对话进行排序
    dialogs.value.sort((a, b) => {
      if (currentSortMode.value === 'createdAt') {
        const timeA = a.createdAt || 0
        const timeB = b.createdAt || 0
        return sortOrder.value === 'desc' ? timeB - timeA : timeA - timeB
      } else if (currentSortMode.value === 'mastery') {
        const masteryA = a.mastery || 0
        const masteryB = b.mastery || 0
        return sortOrder.value === 'desc' ? masteryB - masteryA : masteryA - masteryB
      }
      return 0
    })

    // 重新映射录音列表到新的顺序
    const newRecordings = {}
    dialogs.value.forEach((dialog, newIndex) => {
      const originalIndex = dialog.original.id
      if (originalRecordings[originalIndex]) {
        newRecordings[newIndex] = originalRecordings[originalIndex]
      }
    })
    recordingsList.value = newRecordings
  }
}

// 批量加载所有对话的笔记
async function loadAllNotes() {
  if (!isLoggedIn.value || !dialogs.value.length) return;
  
  notesError.value = null;
  
  try {
    // 收集所有对话ID
    const dialogIds = dialogs.value
      .filter(dialog => dialog.original && dialog.original.id)
      .map(dialog => dialog.original.id);
    
    if (dialogIds.length === 0) return;
    
    // 批量获取笔记
    const notesMap = await getBatchNotes(dialogIds);
    
    // 将笔记分配给对应的对话
    dialogs.value.forEach(dialog => {
      if (dialog.original && dialog.original.id) {
        dialog.dialogNotes = notesMap[dialog.original.id] || [];
      }
    });
    
    console.log(`批量加载完成：${dialogIds.length} 个对话的笔记`);
    
  } catch (e) {
    console.error('批量加载笔记失败:', e);
    notesError.value = e.message;
  }
}

// 单个加载笔记函数（用于动态更新）
async function loadNotes(dialog) {
  notesError.value = null;
  if (!dialog || !dialog.original || !dialog.original.id) return;
  try {
    dialog.dialogNotes = await getNotes(dialog.original.id);
  } catch (e) {
    notesError.value = e.message;
  }
}

// 新增：添加笔记函数
async function handleAddNote(dialog) {
  const dialogId = dialog.original.id;
  if (!newNoteText.value[dialogId] || !newNoteText.value[dialogId].trim()) return; // 笔记内容不能为空
  notesError.value = null; // 清除之前的错误
  try {
    await addNote(dialogId, newNoteText.value[dialogId]);
    await saveDialogContent(dialogId, dialog.original.text, dialog.translation.text, dialog.qid, dialog.title, dialog.type); // 将对话内容和元数据保存到对话文档
    newNoteText.value[dialogId] = ''; // 清空输入框
    await loadNotes(dialog); // 重新加载笔记
  } catch (e) {
    console.error(`添加笔记失败:`, e);
    notesError.value = e.message;
  }
}

// 新增：开始编辑笔记
function handleEditNote(note) {
  editingNoteId.value = note.id;
  editingNoteText.value = note.text;
}

// 新增：保存编辑后的笔记
async function handleSaveNote(dialog, noteId) {
  const dialogId = dialog.original.id;
  if (!editingNoteText.value.trim()) {
    notesError.value = '笔记内容不能为空';
    return; // 笔记内容不能为空
  }
  notesError.value = null; // 清除之前的错误
  try {
    await updateNote(dialogId, noteId, editingNoteText.value);
    editingNoteId.value = null; // 清除编辑状态
    editingNoteText.value = '';
    await loadNotes(dialog); // 重新加载笔记
  } catch (e) {
    console.error(`更新笔记失败:`, e);
    notesError.value = e.message;
  }
}

// 新增：取消编辑笔记
function handleCancelEdit() {
  editingNoteId.value = null;
  editingNoteText.value = '';
}

// 新增：删除笔记函数
async function handleDeleteNote(dialog, noteId) {
  const dialogId = dialog.original.id;
  if (!confirm('确定删除这条笔记吗？')) return; // 确认删除
  notesError.value = null; // 清除之前的错误
  try {
    await deleteNote(dialogId, noteId);
    await loadNotes(dialog); // 重新加载笔记
  } catch (e) {
    console.error(`删除笔记失败:`, e);
    notesError.value = e.message;
  }
}

// 新增：切换笔记部分显示/隐藏，并按需加载笔记
function toggleNotesSection(dialog) {
  dialog.showNotes = !dialog.showNotes;
  if (dialog.showNotes && dialog.dialogNotes.length === 0) {
    // 只有当笔记部分显示且笔记列表为空时才加载
    loadNotes(dialog);
  }
  nextTick(() => {
    const el = noteTextareaRefs.value[dialog.original.id]
    if (el) autosize.update(el)
  })
}

// 新增：获取笔记智能提示
async function getNoteSuggestion(dialog) {
  const dialogId = dialog.original.id;
  if (!dialogId) return;

  try {
    isGettingSuggestions.value[dialogId] = true;
    suggestionError.value[dialogId] = null;

    // 获取最新的录音和AI检查结果
    const dialogIndex = dialogs.value.findIndex(d => String(d.original.id) === String(dialogId));
    const latestRecording = dialogIndex !== -1 ?
      recordingsList.value[dialogIndex]?.[recordingsList.value[dialogIndex].length - 1] : null;
    const aiCheckResult = latestRecording?.aiCheck || '';

    const suggestion = await getNoteSuggestions(
      dialog.original.text,
      dialog.translation.text,
      aiCheckResult,
      newNoteText.value[dialogId] || ''
    );

    // 提取笔记内容（去掉"笔记内容："前缀）
    const noteContent = suggestion.replace(/^笔记内容：/, '').trim();
    noteSuggestions.value[dialogId] = noteContent;

  } catch (e) {
    console.error('获取笔记提示失败:', e);
    suggestionError.value[dialogId] = '获取智能提示失败，请稍后重试';
  } finally {
    isGettingSuggestions.value[dialogId] = false;
  }
}

// 新增：使用智能提示
function useSuggestion(dialog) {
  const dialogId = dialog.original.id;
  if (noteSuggestions.value[dialogId]) {
    newNoteText.value[dialogId] = noteSuggestions.value[dialogId];
    clearSuggestion(dialogId);
  }
}

// 新增：清除智能提示
function clearSuggestion(dialogId) {
  noteSuggestions.value[dialogId] = null;
  suggestionError.value[dialogId] = null;
}

// 新增：处理笔记输入事件（智能补全）
async function handleNoteInput(event, dialog) {
  const dialogId = dialog.original.id;

  // 如果智能补全功能被禁用，直接返回
  if (!autoCompletionEnabled.value) {
    return;
  }

  // 清除之前的定时器
  if (completionDebounceTimer.value[dialogId]) {
    clearTimeout(completionDebounceTimer.value[dialogId]);
  }

  const text = event.target.value; // 获取当前输入框的最新文本
  // 如果输入内容为空，则隐藏补全提示
  if (!text || text.trim().length === 0) {
    hideInlineCompletion(dialogId);
    return;
  }

  // 当输入字符过少时，不发送请求，避免频繁调用
  if (text.trim().length < 3) {
      return;
  }

  // 防抖处理，500ms后获取补全
  completionDebounceTimer.value[dialogId] = setTimeout(async () => {
    try {
        // 在执行前再次获取最新的文本内容，以防延迟期间发生变化
        const currentText = newNoteText.value[dialogId];
        // 再次检查，确保文本不为空且足够长
        if (currentText && currentText.trim().length >= 3) {
            await getInlineCompletion(dialog, currentText);
        } else {
            hideInlineCompletion(dialogId);
        }
    } catch (e) {
      console.error('获取智能补全失败:', e);
    }
  }, 250); // 延迟增加到 500ms
}

// 新增：处理笔记键盘事件（Tab键补全）
function handleNoteKeydown(event, dialog) {
  const dialogId = dialog.original.id;

  if (event.key === 'Tab') {
    event.preventDefault();

    // 只有在启用智能补全时才处理Tab键补全
    if (autoCompletionEnabled.value && showInlineCompletion.value[dialogId] && inlineCompletion.value[dialogId]) {
      // 应用内联补全
      applyInlineCompletion(dialog);
    }
  } else if (event.key === 'Escape') {
    hideInlineCompletion(dialogId);
  }
}

// 新增：获取内联智能补全
async function getInlineCompletion(dialog, currentText) {
  const dialogId = dialog.original.id;

  try {
    console.log('开始获取智能补全:', { dialogId, currentText });

    // 获取最新的录音和AI检查结果
    // 需要找到对话在数组中的索引来获取录音数据
    const dialogIndex = dialogs.value.findIndex(d => String(d.original.id) === String(dialogId));
    const latestRecording = dialogIndex !== -1 ?
      recordingsList.value[dialogIndex]?.[recordingsList.value[dialogIndex].length - 1] : null;
    const aiCheckResult = latestRecording?.aiCheck || '';

    console.log('获取到的上下文:', {
      dialogIndex,
      originalText: dialog.original.text,
      translationText: dialog.translation.text,
      aiCheckResult: aiCheckResult,
      currentInput: currentText,
      recordingsList: recordingsList.value[dialogIndex]
    });

    // 即使没有AI检查结果，也尝试提供智能补全
    // 基于原文、翻译和用户当前输入来生成补全
    const completion = await getSmartCompletion(
      dialog.original.text,
      dialog.translation.text,
      aiCheckResult,
      currentText
    );

    console.log('获取到的补全结果:', completion);

    if (completion && completion.trim().length > 0) {
      inlineCompletion.value[dialogId] = completion;
      showInlineCompletion.value[dialogId] = true;
      console.log('设置内联补全:', { dialogId, completion });
    } else {
      hideInlineCompletion(dialogId);
      console.log('隐藏内联补全，无有效补全内容');
    }

  } catch (e) {
    console.error('获取智能补全失败:', e);
    hideInlineCompletion(dialogId);
  }
}

// 新增：应用内联补全
function applyInlineCompletion(dialog) {
  const dialogId = dialog.original.id;
  if (inlineCompletion.value[dialogId]) {
    newNoteText.value[dialogId] = newNoteText.value[dialogId] + inlineCompletion.value[dialogId];
    hideInlineCompletion(dialogId);
  }
}

// 新增：隐藏内联补全
function hideInlineCompletion(dialogId) {
  showInlineCompletion.value[dialogId] = false;
  inlineCompletion.value[dialogId] = null;
}

const transcribingStatus = ref('idle') // 'idle' | 'transcribing' | 'scoring' | 'done'
const currentTranscribingDialogId = ref(null)
const recordError = ref('')
const showRecordError = ref(false)


const noteTextareaRefs = ref({})

function setNoteTextareaRef(el, id) {
  if (el) {
    noteTextareaRefs.value[id] = el
    autosize(el)
  }
}

watch(newNoteText, (val) => {
  nextTick(() => {
    Object.entries(noteTextareaRefs.value).forEach(([id, el]) => {
      if (el) autosize.update(el)
    })
  })
}, { deep: true })

const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);


// 新增：全局对话序号（仅收藏模式）
function getGlobalDialogIndex(dialog) {
  if (!isFavoritesMode.value) return null
  // 在全局排序后的 allFavoriteItems 中查找该对话的全局序号
  const idx = allFavoriteItems.value.findIndex(item => String(item.id) === String(dialog.original.id))
  return idx !== -1 ? idx + 1 : null
}

// 新增：加载笔记设置
async function loadNoteSettings() {
  try {
    if (isLoggedIn.value) {
      // 用户已登录，从云端加载设置
      const settings = await getNotesSettings()
      if (settings) {
        autoCompletionEnabled.value = settings.autoCompletionEnabled ?? true
      } else {
        // 如果云端没有设置，尝试从本地存储加载
        const localSetting = localStorage.getItem('noteAutoCompletionEnabled')
        autoCompletionEnabled.value = localSetting !== null ? localSetting === 'true' : true
      }
    } else {
      // 用户未登录，从本地存储加载设置
      const localSetting = localStorage.getItem('noteAutoCompletionEnabled')
      autoCompletionEnabled.value = localSetting !== null ? localSetting === 'true' : true
    }
  } catch (e) {
    console.error('加载笔记设置失败:', e)
    // 出错时从本地存储加载，如果也没有则使用默认值
    const localSetting = localStorage.getItem('noteAutoCompletionEnabled')
    autoCompletionEnabled.value = localSetting !== null ? localSetting === 'true' : true
  }
}

// 新增：保存笔记设置
async function saveNoteSettings() {
  try {
    // 如果用户已登录，保存到云端
    if (isLoggedIn.value) {
      await saveNotesSettings({
        autoCompletionEnabled: autoCompletionEnabled.value
      })
    }
    // 同时保存到本地存储作为备份
    localStorage.setItem('noteAutoCompletionEnabled', autoCompletionEnabled.value.toString())
  } catch (e) {
    console.error('保存笔记设置失败:', e)
  }
}
</script>

<style scoped>
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.error {
    background: #fff5f5;
    border: 1px solid #feb2b2;
    color: #c53030;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
}

.error h3 {
    font-weight: 600;
    margin-bottom: 8px;
}

.retry-btn {
    margin-top: 12px;
    padding: 8px 16px;
    background: #c53030;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.retry-btn:hover {
    background: #9b2c2c;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #666;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    margin: 0 auto 20px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.record-error-toast {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  background: #fff0f0;
  color: #d32f2f;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 16px 32px;
  font-size: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  animation: fadeInOut 3s;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
</style>
