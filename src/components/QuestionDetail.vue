<template>
    <div class="container">
        <a class="back" @click="handleBack">← 返回</a>

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
            <div v-if="!isFavoritesMode">
                <div class="title-section">
                    <h2 class="title">{{ pageTitle }}</h2>
                    <div class="tags">
                        <span v-if="pageType" class="tag type-tag">{{ pageType }}</span>
                        <span v-if="pageDate" class="tag date-tag">{{ pageDate }}</span>
                    </div>
                </div>
                <p class="qid">题号：{{ pageQid }}</p>
                <!-- 额外提示信息 -->
                <div v-if="pageExtraMention" class="extra-mention">
                    {{ pageExtraMention }}
                </div>
                <!-- 简介音频 -->
                <div v-if="pageIntro" class="section">
                    <h3>简介</h3>
                    <audio :src="audioSrc(pageIntro)" controls class="audio" />
                </div>
            </div>
            <!-- 新增：收藏模式下的页面头部和排序按钮 -->
            <div v-else class="favorites-header">
                <h2 class="title">{{ pageTitle }}</h2>
                <div class="sort-controls">
                    <button class="sort-btn" @click="toggleSortMode">
                        排序：<span>{{ currentSortMode === 'createdAt' ? '添加时间' : '熟练度' }}</span>
                    </button>
                    <button class="sort-order-btn" @click="toggleSortOrder">
                        <span class="material-icons sort-icon">
                            {{ sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward' }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- 对话内容 -->
            <div v-for="(dialog, idx) in sortedDialogs" :key="dialog.original.id" class="section">
                <!-- 收藏模式下显示添加时间 -->
                <div v-if="isFavoritesMode && dialog.createdAt" class="favorite-created-at" style="color:#888;font-size:13px;margin-bottom:4px;">
                  添加时间：{{ new Date(dialog.createdAt).toLocaleString() }}
                </div>
                <div class="dialog-header-row">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <h3 style="margin:0;">
                          对话
                          <template v-if="isFavoritesMode">
                            {{ getGlobalDialogIndex(dialog) }}
                          </template>
                          <template v-else>
                            {{ idx + 1 }}
                          </template>
                        </h3>
                        <template v-if="dialog.original.isQuestion == 1 && isLoggedIn">
                            <button v-if="!isFavoritesMode"
                                class="favorite-btn"
                                :title="favoriteIds.includes(String(dialog.original.id)) ? '取消收藏' : '收藏对话'"
                                @click="toggleFavorite(dialog.original.id)"
                                style="background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;"
                            >
                                <span class="material-icons"
                                    :style="{color: favoriteIds.includes(String(dialog.original.id)) ? '#e74c3c' : '#bbb'}">
                                    {{ favoriteIds.includes(String(dialog.original.id)) ? 'favorite' : 'favorite_border' }}
                                </span>
                            </button>
                            <span v-else class="material-icons" style="color:#e74c3c;vertical-align:middle;margin-left:4px;">favorite</span>
                            <!-- 新增：收藏模式下的熟练度星级显示 -->
                            <div v-if="isFavoritesMode"
                                class="star-rating"
                                @mouseenter="showMasteryTooltip = true"
                                @mouseleave="showMasteryTooltip = false"
                            >
                                <span v-for="n in 5" :key="n"
                                    class="material-icons star-icon"
                                    :class="{ 'filled': n <= dialog.mastery }"
                                    @click="updateMastery(dialog.original.id, n)">
                                    {{ n <= dialog.mastery ? 'star' : 'star_border' }}
                                </span>
                                <div v-if="showMasteryTooltip" class="mastery-tooltip">
                                    根据你现在的熟练度点亮星星
                                </div>
                            </div>
                            <!-- 新增：笔记图标 -->
                            <button v-if="dialog.original.isQuestion == 1"
                                class="notes-icon-btn"
                                :title="dialog.showNotes ? '隐藏笔记' : '显示笔记'"
                                @click="toggleNotesSection(dialog)"
                            >
                                <span class="material-icons">notes</span>
                                <span class="notes-text" v-if="dialog.dialogNotes.length > 0">{{ dialog.dialogNotes.length }} 条笔记</span>
                            </button>
                        </template>
                    </div>

                    <!-- 收藏模式下的来源链接，靠右显示 -->
                    <div v-if="isFavoritesMode && dialog.original.associatedQid" class="dialog-source-right">
                        来源：
                        <router-link :to="{ name: 'dialog', params: { qid: dialog.original.associatedQid } }" class="source-link">
                          {{ dialog.original.associatedQid }}
                          {{ dialog.original.associatedTitle }}

                        </router-link>
                    </div>
                </div>

                <!-- 原文部分 -->
                <div class="dialog-part">
                    <div class="content-header">
                        <div class="label">原文</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button v-if="isDialogOpen(idx, 'original')" class="action-btn" title="复制原文" @click="copyText(dialog.original.text, 'original', idx)">
                                <span class="material-icons">{{ copyStatus[getCopyKey('original', idx)] ? 'check' : 'content_copy' }}</span>
                            </button>
                            <button class="toggle-btn" @click="toggleDialog(idx, 'original')">
                                {{ isDialogOpen(idx, 'original') ? '隐藏' : '显示' }}
                            </button>
                        </div>
                    </div>
                    <transition name="fade">
                        <p v-if="isDialogOpen(idx, 'original')" class="content-text">
                            {{ dialog.original.text }}
                        </p>
                    </transition>
                    <audio
                        :src="audioSrc(dialog.original.audio)"
                        controls
                        class="audio"
                        @ended="handleOriginalAudioEnd(idx)"
                    />
                </div>

                <!-- 翻译部分 -->
                <div class="dialog-part">
                    <div class="content-header">
                        <div class="label">参考翻译</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button v-if="isDialogOpen(idx, 'translation')" class="action-btn" title="复制翻译" @click="copyText(dialog.translation.text, 'translation', idx)">
                                <span class="material-icons">{{ copyStatus[getCopyKey('translation', idx)] ? 'check' : 'content_copy' }}</span>
                            </button>
                            <button class="toggle-btn" @click="toggleDialog(idx, 'translation')">
                                {{ isDialogOpen(idx, 'translation') ? '隐藏' : '显示' }}
                            </button>
                        </div>
                    </div>
                    <transition name="fade">
                        <p v-if="isDialogOpen(idx, 'translation')" class="content-text">
                            {{ dialog.translation.text }}
                        </p>
                    </transition>
                    <audio :src="audioSrc(dialog.translation.audio)" controls class="audio" />
                </div>

                <!-- 新增：笔记部分 -->
                <div v-if="dialog.showNotes" class="notes-section">
                    <div class="notes-header">
                        <h4>我的笔记 ({{ dialog.dialogNotes.length }})</h4>
                        <button class="toggle-btn" @click="toggleNotesSection(dialog)">
                            隐藏
                        </button>
                    </div>

                    <div v-if="notesError" class="notes-error">
                        {{ notesError }}
                    </div>

                    <!-- 添加新笔记 -->
                    <div class="add-note-container">
                        <div class="note-input-row">
                            <div class="note-input-wrapper">
                                <textarea
                                    v-model="newNoteText[dialog.original.id]"
                                    placeholder="记录你的笔记... (输入内容后会自动显示智能补全，按Tab键接受补全)"
                                    class="note-textarea"
                                    rows="3"
                                    @keydown="handleNoteKeydown($event, dialog)"
                                    @input="handleNoteInput($event, dialog)"
                                    :ref="el => setNoteTextareaRef(el, dialog.original.id)"
                                ></textarea>
                            </div>
                        </div>

                        <!-- 智能补全显示 -->
                        <template v-if="showInlineCompletion[dialog.original.id] && inlineCompletion[dialog.original.id]">
                            <div class="completion-hint-top-outer">点击或按Tab下方提示框补全</div>
                            <div class="external-completion"
                                 @click="applyInlineCompletion(dialog)"
                                 style="cursor: pointer;"
                            >
                                <span class="material-icons">auto_awesome</span>
                                <div class="completion-text-wrapper">
                                    <span class="completion-prefix">{{ newNoteText[dialog.original.id] }}</span>
                                    <span class="completion-suggestion">{{ inlineCompletion[dialog.original.id] }}</span>
                                </div>
                            </div>
                        </template>

                        <div class="note-actions-row">
                            <button
                                class="add-note-btn"
                                @click="handleAddNote(dialog)"
                                :disabled="!newNoteText[dialog.original.id] || newNoteText[dialog.original.id].trim().length === 0"
                            >
                                保存笔记
                            </button>
                        </div>

                        <!-- 提示错误信息 -->
                        <div v-if="suggestionError[dialog.original.id]" class="suggestion-error">
                            {{ suggestionError[dialog.original.id] }}
                        </div>
                    </div>

                    <!-- 笔记列表 -->
                    <div v-if="dialog.dialogNotes.length > 0" class="notes-list">
                        <div v-for="note in dialog.dialogNotes" :key="note.id" class="note-item">
                            <template v-if="editingNoteId === note.id">
                                <textarea
                                    v-model="editingNoteText"
                                    class="note-textarea edit-mode"
                                    rows="3"
                                ></textarea>
                                <div class="note-actions-edit-mode">
                                    <button class="action-btn save-btn" @click="handleSaveNote(dialog, note.id)" title="保存">
                                        <span class="material-icons">check</span>
                                    </button>
                                    <button class="action-btn cancel-btn" @click="handleCancelEdit" title="取消">
                                        <span class="material-icons">close</span>
                                    </button>
                                </div>
                            </template>
                            <template v-else>
                                <p class="note-text">{{ note.text }}</p>
                                <div class="note-footer">
                                    <span class="note-timestamp">{{ new Date(note.createdAt).toLocaleString() }}</span>
                                    <div class="note-actions">
                                        <button class="action-btn" @click="handleEditNote(note)" title="编辑">
                                            <span class="material-icons">edit</span>
                                        </button>
                                        <button class="action-btn" @click="handleDeleteNote(dialog, note.id)" title="删除">
                                            <span class="material-icons">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                    <div v-else class="empty-notes">
                        <p>还没有笔记，快来记录吧！</p>
                    </div>
                </div>

                <!-- 录音部分 -->
                <div class="recording-section">
                    <div class="record-btn-container">
                        <button
                            class="record-btn"
                            :class="{
                                recording: isRecording,
                                'api-loading': isApiLoading && !isRecording,
                                'no-bg': isApiLoading && currentTranscribingDialogId === idx
                            }"
                            :disabled="isApiLoading && !isRecording"
                            @click="isRecording ? stopRecording() : startRecording(idx)"
                        >
                            <template v-if="isRecording">
                                <span class="material-icons">stop</span>
                                停止录音
                            </template>
                            <template v-else-if="isApiLoading && currentTranscribingDialogId === idx">
                                <span v-if="transcribingStatus === 'transcribing'">
                                    <Vue3Lottie :animationLink="'/lottie/loading.json'" :loop="true" style="width:65px;height:65px;display:inline-block;vertical-align:middle;" />
                                    <span style="font-size:16px;margin-left:8px;">语音转录中...</span>
                                </span>
                                <span v-else-if="transcribingStatus === 'scoring'">
                                    <Vue3Lottie :animationLink="'/lottie/ai-score.json'" :loop="true" style="width:65px;height:65px;display:inline-block;vertical-align:middle;" />
                                    <span style="font-size:16px;margin-left:8px;">AI打分中...</span>
                                </span>
                                <span v-else>
                                    <Vue3Lottie :animationLink="'/lottie/loading.json'" :loop="true" style="width:65px;height:65px;display:inline-block;vertical-align:middle;" />
                                    <span style="font-size:16px;margin-left:8px;">处理中...</span>
                                </span>
                            </template>
                            <template v-else>
                                <span class="material-icons">mic</span>
                                开始录音
                            </template>
                        </button>
                        <button
                            v-if="isRecording"
                            class="cancel-btn"
                            @click="cancelRecording"
                            title="取消录音"
                            style="margin-left: 12px;"
                        >
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div v-if="recordingsList[idx]?.length">
                        <div class="recording-header">
                            <span class="label">当前录音</span>
                        </div>

                        <div class="recordings-list">
                            <div v-for="(recording, rIdx) in (recordingsList[idx] ? [...recordingsList[idx]].reverse() : [])"
                                :key="rIdx"
                                class="recording-item"
                            >
                                <div class="recording-controls">
                                    <audio :src="recording.url" controls class="recording-audio"></audio>
                                    <div class="recording-actions">
                                        <button class="action-btn" @click="deleteRecording(idx, rIdx)">
                                            <span class="material-icons">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="recording-text">{{ recording.text || '未转录' }}</div>
                                <div class="recording-time">{{ recording.timestamp }}</div>

                                <!-- AI 翻译检查结果 -->
                                <div v-if="recording.aiCheck" class="ai-check">
                                    <div class="ai-check-header">
                                        <span>AI 翻译评估</span>
                                        <div class="score" v-if="extractScore(recording.aiCheck)">
                                            {{ extractScore(recording.aiCheck) }}分
                                        </div>
                                    </div>
                                    <pre class="ai-check-content">{{ recording.aiCheck }}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- 错误弹窗 -->
        <div v-if="showRecordError" class="record-error-toast">
            {{ recordError }}
        </div>
        <div v-if="isFavoritesMode && totalPages > 1" class="pagination-bar-new">
            <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">&lt;</button>
            <template v-for="(p, idx) in paginationRange" :key="idx">
              <button
                v-if="p !== '...'"
                class="page-btn"
                :class="{ active: p === currentPage }"
                @click="currentPage = p"
                :disabled="p === currentPage"
              >{{ p }}</button>
              <span v-else class="page-ellipsis">...</span>
            </template>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">&gt;</button>
            <input v-model="jumpPageInput" type="number" min="1" :max="totalPages" class="page-jump-input" @keydown.enter="handleJumpPage" placeholder="跳转页" />
            <button class="page-btn" @click="handleJumpPage">跳转</button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useData } from '../services/useData.js'
import { checkTranslation, transcribeAudio, getNoteSuggestions, getSmartCompletion } from '../services/openai.js'
import { addFavorite, removeFavorite, getAllFavorites } from '../services/favorites.js'
import { markAsLearned } from '../services/learned.js'
import { getNotes, addNote, updateNote, deleteNote, saveDialogContent } from '../services/notes.js'
import { getAuth, onAuthStateChanged } from 'firebase/auth' // 导入 Firebase Auth
import { uploadAudioToLambda } from '@/services/googleDrive'
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

const { loadExcel, data } = useData()
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

// 新增：分页跳转输入
const jumpPageInput = ref('')

// 新增：美观分页页码生成逻辑
const paginationRange = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const delta = 2 // 当前页前后显示的页数
  const range = []
  let left = Math.max(1, current - delta)
  let right = Math.min(total, current + delta)

  if (current <= delta + 2) {
    right = Math.min(total, 1 + 2 * delta + 1)
  }
  if (current >= total - delta - 1) {
    left = Math.max(1, total - 2 * delta - 1)
  }

  for (let i = left; i <= right; i++) {
    range.push(i)
  }
  if (left > 2) {
    range.unshift('...')
    range.unshift(1)
  } else {
    for (let i = 1; i < left; i++) range.unshift(i)
  }
  if (right < total - 1) {
    range.push('...')
    range.push(total)
  } else {
    for (let i = right + 1; i <= total; i++) range.push(i)
  }
  return range
})

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
  try { await loadExcel() }
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
}

// 统一的数据加载函数
async function loadPageData() {
  error.value = null
  try {
    await loadExcel() // 确保 Excel 数据已加载

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

    // 在 dialogs.value 填充后，加载每个对话的笔记以显示初始计数
    for (const dialog of dialogs.value) {
      if (dialog.original && dialog.original.id) {
        await loadNotes(dialog); // 这将填充 dialog.dialogNotes
      }
    }

  } catch (e) {
    console.error('加载页面数据失败:', e)
    error.value = e.message
  }
}

// 监听分页、排序变化，自动加载当前页
watch([currentPage, currentSortMode, sortOrder], async ([newPage, newSort, newOrder], [oldPage, oldSort, oldOrder]) => {
  if (isFavoritesMode.value) {
    await loadAllFavoritesMeta()
    await loadCurrentPageDialogs()
    // 加载笔记
    for (const dialog of dialogs.value) {
      if (dialog.original && dialog.original.id) {
        await loadNotes(dialog)
      }
    }
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
  })

  chimeAudio.value = new Audio('/chime.mp4')
  const hasShownNotification = localStorage.getItem('hasShownNotification')
  if (!hasShownNotification) {
    showNotification.value = true
  }
  // 自动恢复音频加载
  document.addEventListener('visibilitychange', handleVisibilityChange)
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

// 新增：加载笔记函数
async function loadNotes(dialog) {
  notesError.value = null; // 清除之前的错误
  if (!dialog || !dialog.original || !dialog.original.id) return; // 没有对话或ID则不加载笔记
  try {
    dialog.dialogNotes = await getNotes(dialog.original.id);
    // console.log(`对话 ${dialog.original.id} 的笔记已加载:`, dialog.dialogNotes);
  } catch (e) {
    // console.error(`加载对话 ${dialog.original.id} 笔记失败:`, e);
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

    if (showInlineCompletion.value[dialogId] && inlineCompletion.value[dialogId]) {
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

function handleBack() {
    // 检查是否有保存的状态需要传递回去
    const savedState = {
        page: route.query.page,
        filters: route.query.filters
    };

    // 如果有保存的状态，返回到QuestionList并传递状态
    if (savedState.page || savedState.filters) {
        router.push({
            path: '/',
            query: savedState
        });
    } else {
        // 没有保存的状态，使用默认的返回行为
        router.back();
    }
}

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

function handleJumpPage() {
  let page = parseInt(jumpPageInput.value)
  if (isNaN(page)) return
  if (page < 1) page = 1
  if (page > totalPages.value) page = totalPages.value
  currentPage.value = page
  jumpPageInput.value = ''
}

// 新增：全局对话序号（仅收藏模式）
function getGlobalDialogIndex(dialog) {
  if (!isFavoritesMode.value) return null
  // 在全局排序后的 allFavoriteItems 中查找该对话的全局序号
  const idx = allFavoriteItems.value.findIndex(item => String(item.id) === String(dialog.original.id))
  return idx !== -1 ? idx + 1 : null
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

.back {
    display: inline-block;
    color: #666;
    text-decoration: none;
    margin-bottom: 24px;
    cursor: pointer;
}

.back:hover {
    color: #333;
}

.title {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
}

.qid {
    color: #666;
    margin-bottom: 24px;
}

.section {
    margin-bottom: 32px;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
}

h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
}

.dialog-part {
    margin-bottom: 20px;
    background: white;
    border-radius: 4px;
    padding: 16px;
}

.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.label {
    font-weight: 600;
    color: #666;
}

.toggle-btn {
    padding: 6px 12px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 14px;
}

.toggle-btn:hover {
    background: #0056b3;
}

.content-text {
    margin: 0 0 12px;
    line-height: 1.5;
    color: #333;
}

.audio {
    width: 100%;
    margin: 10px 0;
}

.audio::-webkit-media-controls-panel {
    background-color: #e3f2fd;
}

.audio::-webkit-media-controls-play-button {
    border-radius: 50%;
}

.audio::-webkit-media-controls-timeline {
    background-color: #e3f2fd;
}

.audio::-webkit-media-controls-timeline::-webkit-slider-thumb {
    background-color: #1976d2;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.title-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 4px;
}

.tags {
    display: flex;
    gap: 12px;
    align-items: center;
}

.tag {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
}

.type-tag {
    background-color: #e8f5e9;
    color: #2e7d32;
}

.date-tag {
    background-color: #fff8e1;
    color: #f57f17;
}

.recording-section {
    margin-top: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
}

.recording-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.record-btn-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
}

.record-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 32px;
    border: none;
    border-radius: 30px;
    background: #e3f2fd;
    color: #1976d2;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 16px;
    min-width: 160px;
}

.record-btn:hover:not(:disabled) {
    background: #bbdefb;
    transform: scale(1.05);
}

.record-btn:disabled {
    cursor: not-allowed;
    transform: none !important;
}

.record-btn:disabled:not(.no-bg) {
    opacity: 0.7;
}

.record-btn.recording {
    background: #ffebee;
    color: #d32f2f;
    animation: pulse 1.5s infinite;
}

.record-btn.api-loading {
    background: #f5f5f5;
    color: #757575;
}

.record-btn.no-bg {
    background: transparent !important;
    box-shadow: none !important;
}

.record-btn .material-icons {
    font-size: 24px;
}

.recordings-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.recording-item {
    background: white;
    border-radius: 8px;
    padding: 12px;
}

.recording-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.recording-audio {
    width: 100%;
    height: 40px;
}

.recording-audio::-webkit-media-controls-panel {
    background-color: #f1f8e9;
}

.recording-audio::-webkit-media-controls-current-time-display,
.recording-audio::-webkit-media-controls-time-remaining-display {
    color: #2e7d32;
}


.recording-audio::-webkit-media-controls-timeline::-webkit-slider-thumb {
    background-color: #2e7d32;
}

/* Firefox 样式 */
.recording-audio::-moz-range-track {
    background-color: #c5e1a5;
}

.recording-audio::-moz-range-thumb {
    background-color: #2e7d32;
}

.recording-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 16px;
    background: #f5f5f5;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    background: #e0e0e0;
    color: #d32f2f;
}

.recording-text {
    margin-top: 8px;
    color: #666;
    font-size: 14px;
}

.recording-time {
    margin-top: 4px;
    color: #999;
    font-size: 12px;
}

.material-icons {
    font-size: 20px;
}

.transcript-container {
    margin: 8px 0;
    padding: 8px;
    background-color: #f8f9fa;
    border-radius: 4px;
}

.transcript-text {
    font-size: 14px;
    line-height: 1.4;
    color: #333;
}

.interim-transcript {
    color: #666;
    font-style: italic;
    margin-left: 8px;
}

.recording-item {
    position: relative;
    margin-bottom: 16px;
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 8px;
}

.current-recording {
    border: 2px solid #4CAF50;
    margin-bottom: 16px;
}

.transcript-text {
    margin: 8px 0;
    padding: 8px;
    background-color: #f5f5f5;
    border-radius: 4px;
    font-size: 14px;
    color: #333;
    line-height: 1.4;
}

.interim-transcript {
    color: #666;
    font-style: italic;
    margin-left: 8px;
}

.recording-item {
    position: relative;
    margin-bottom: 16px;
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 8px;
}

.ai-check {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}

.ai-check-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #2E7D32;
  margin-bottom: 8px;
}

.score {
  font-size: 18px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 16px;
  background: #E8F5E9;
  color: #2E7D32;
}

.ai-check-content {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  margin: 0;
  padding: 12px;
  background: white;
  border-radius: 4px;
}

.cancel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #ffebee;
  color: #d32f2f;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #ef5350;
  color: white;
  transform: scale(1.1);
}

.cancel-btn .material-icons {
  font-size: 20px;
}

.extra-mention {
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    color: #856404;
    padding: 12px 20px;
    margin: 10px 0;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.5;
}

/* 添加提示框样式 */
.notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 90%;
    max-width: 600px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    margin-bottom: 20px;
}

.notification-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.notification-content p {
    margin: 0;
    color: #333;
    line-height: 1.5;
}

.notification-close {
    align-self: flex-end;
    padding: 8px 16px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.notification-close:hover {
    background: #1565c0;
}

.dialog-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between; /* 使得内部元素左右分散 */
    margin-bottom: 16px; /* 标题行和下面内容之间留空 */
}

.dialog-source-right {
    font-size: 14px;
    color: #666;
    flex-shrink: 0;
}

.source-link {
    color: #007bff;
    text-decoration: underline;
    cursor: pointer;
}

.source-link:hover {
    color: #0056b3;
}

/* 新增：星级评分样式 */
.star-rating {
    position: relative; /* 确保tooltip可以相对于它定位 */
    display: flex;
    align-items: center;
    margin-left: 8px;
}

.star-icon {
    font-size: 20px;
    color: #bbb;
    cursor: pointer;
    transition: color 0.2s;
}

.star-icon.filled {
    color: #f39c12; /* 填充星的颜色 */
}

.star-icon:hover {
    color: #f1c40f; /* 悬停颜色 */
}

/* 新增：熟练度提示框样式 */
.mastery-tooltip {
    position: absolute; /* 根据需要调整位置 */
    top: -35px; /* 根据需要调整位置 */
    left: 50%;
    transform: translateX(-50%);
    background-color: #333;
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10;
    opacity: 0.95;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.mastery-tooltip::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 100%; /* 指向下方 */
    transform: translateX(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: #333 transparent transparent transparent;
}

/* 新增：收藏页面头部样式 */
.favorites-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 10px 0;
}

.sort-controls {
    display: flex;
    align-items: center;
    gap: 8px; /* 排序按钮和图标之间的间距 */
}

.sort-btn {
    padding: 8px 16px;
    background: #ffffff; /* 白色背景 */
    color: #333; /* 黑色文字 */
    border: 1px solid #ccc; /* 浅灰色边框 */
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    display: flex; /* 使得内部的span可以在中间 */
    align-items: center;
}

.sort-btn:hover {
    background: #f0f0f0; /* 悬停时稍微变灰 */
    border-color: #999;
}

.sort-order-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px; /* 固定宽度 */
    height: 36px; /* 固定高度 */
    background: #ffffff;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.sort-order-btn:hover {
    background: #f0f0f0;
    border-color: #999;
}

.sort-icon {
    font-size: 20px;
}

/* 新增：笔记图标和笔记部分样式 */
.notes-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    color: #666;
    transition: color 0.2s;
    margin-left: 8px;
    position: relative; /* For note count badge */
}

.notes-icon-btn:hover {
    color: #333;
}

.notes-icon-btn .material-icons {
    font-size: 20px;
}

.notes-text {
    font-size: 14px;
    color: #666;
}

.notes-section {
    margin-top: 24px;
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    border-radius: 12px;
    padding: 24px;
    border: 1px solid #e9ecef;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
}

.notes-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
}

.notes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e9ecef;
}

.notes-header h4 {
    margin: 0;
    font-size: 18px;
    color: #333;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.notes-header h4::before {
    content: '📝';
    font-size: 20px;
}

.add-note-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
}

.note-input-row {
    position: relative;
    display: flex;
    flex-direction: column;
}

.note-input-wrapper {
    position: relative;
    flex: 1;
}

.note-input-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.note-input-label {
    font-weight: 600;
    color: #333;
    font-size: 14px;
}

.ai-completion-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
    animation: shimmer 2s infinite;
}

.ai-completion-badge .material-icons {
    font-size: 14px;
}

@keyframes shimmer {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
}

.note-textarea {
    flex: 1;
    width: 100%;
    padding: 10px;
    border-radius: 4px;
    font-size: 14px;
    resize: vertical;
    min-height: 60px;
    background: white;
    z-index: 1;
    position: relative;
    color: #333;
    border: 1px solid #ddd;
    transition: border-color 0.3s ease;
}

.note-textarea:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.note-textarea.edit-mode {
    border-color: #007bff;
}

.note-actions-row {
    display: flex;
    justify-content: flex-end; /* Align button to the right */
    margin-top: 12px;
}

.add-note-btn {
    padding: 8px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.3s ease;
    font-size: 14px;
    font-weight: 500;
}

.add-note-btn:hover:not(:disabled) {
    background: #0056b3;
}

.add-note-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #ccc;
    transform: none;
    box-shadow: none;
}

.suggestion-btn {
    padding: 0;
    background: transparent;
    color: #ffc107; /* 黄色灯泡 */
    border: 1px solid #ffc107;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.suggestion-btn:hover:not(:disabled) {
    background: #fff3cd;
    color: #e0a800;
    border-color: #e0a800;
}

.suggestion-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: transparent;
    color: #999;
    border-color: #999;
}

.suggestion-content {
    margin-top: 10px;
    padding: 12px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 6px;
}

.suggestion-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 600;
    color: #856404;
}

.suggestion-header .material-icons {
    font-size: 18px;
    color: #ffc107;
}

.suggestion-close-btn {
    margin-left: auto;
    padding: 4px;
    background: transparent;
    color: #856404;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.suggestion-close-btn:hover {
    background: #ffeaa7;
    color: #6c5ce7;
}

.suggestion-text {
    margin-bottom: 10px;
    font-size: 14px;
    line-height: 1.5;
    color: #856404;
    white-space: pre-wrap;
}

.use-suggestion-btn {
    padding: 6px 12px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.use-suggestion-btn:hover {
    background: #218838;
}

.use-suggestion-btn .material-icons {
    font-size: 16px;
}

.suggestion-error {
    margin-top: 8px;
    padding: 8px 12px;
    background: #e9f5ff;
    color: #0056b3;
    border: 1px solid #bce0fd;
    border-radius: 4px;
    font-size: 12px;
}

.rotating {
    animation: rotate 1s linear infinite;
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.notes-list {
    border-top: 1px solid #eee;
    padding-top: 20px;
}

.note-item {
    background: white;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: box-shadow 0.2s ease-in-out;
}

.note-item:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.08);
}

.note-item:last-child {
    margin-bottom: 0;
}

.note-text {
    margin: 0;
    line-height: 1.6;
    color: #333;
    white-space: pre-wrap;
}

.note-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.note-timestamp {
    font-size: 12px;
    color: #999;
}

.note-actions {
    display: flex;
    gap: 5px;
}

.action-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    transition: color 0.2s;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}

.action-btn:hover {
    color: #007bff;
    background-color: #f0f0f0;
}

.action-btn .material-icons {
    font-size: 18px;
}

.save-btn {
    background-color: transparent;
    color: #007bff;
    border: 1px solid #007bff;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    padding: 0;
}

.save-btn:hover {
    background-color: #e9f5ff;
    color: #0056b3;
    border-color: #0056b3;
}

.cancel-btn {
    background-color: transparent;
    color: #6c757d;
    border: 1px solid #6c757d;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    padding: 0;
}

.cancel-btn:hover {
    background-color: #f8f9fa;
    color: #343a40;
    border-color: #343a40;
}

.empty-notes {
    text-align: center;
    padding: 20px;
    color: #999;
    background: #f0f0f0;
    border-radius: 4px;
}

.notes-error {
    background-color: #e9f5ff;
    color: #0056b3;
    border: 1px solid #bce0fd;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 15px;
    font-size: 14px;
}

.note-actions-edit-mode {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
}

/* Tab自动补全样式 */
.tab-completion {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
}

.completion-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #eee;
    font-size: 12px;
    color: #666;
}

.completion-header .material-icons {
    font-size: 16px;
    color: #007bff;
}

.completion-close-btn {
    margin-left: auto;
    padding: 2px;
    background: transparent;
    color: #666;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.completion-close-btn:hover {
    background: #e9ecef;
    color: #333;
}

.completion-list {
    max-height: 250px;
    overflow-y: auto;
}

.completion-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 1px solid #f8f9fa;
}

.completion-item:last-child {
    border-bottom: none;
}

.completion-item:hover {
    background: #f8f9fa;
}

.completion-item.selected {
    background: #e3f2fd;
    color: #1976d2;
}

.completion-text {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
    white-space: pre-wrap;
}

.completion-hint {
    font-size: 11px;
    color: #999;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 8px;
}

/* 内联智能补全样式 */
.inline-completion {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    color: #333;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    z-index: 2;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    padding: 10px;
    margin: 0;
    display: flex;
    align-items: flex-start;
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.completion-prefix {
    color: #333;
    opacity: 1;
}

.completion-suggestion {
    color: #007bff;
    opacity: 0.7;
    font-weight: 500;
    background: linear-gradient(90deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 123, 255, 0.05) 100%);
    padding: 2px 4px;
    border-radius: 3px;
    border-left: 2px solid #007bff;
    margin-left: 2px;
}

.inline-completion-hint {
    position: absolute;
    top: 5px;
    right: 5px;
    background: #007bff;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    opacity: 0.9;
    box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.external-completion {
    margin-top: 12px;
    padding: 12px;
    background: #e9f5ff;
    border-left: 4px solid #007bff;
    border-radius: 0 6px 6px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #333;
    animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.external-completion .material-icons {
    font-size: 20px;
    color: #007bff;
}

.external-completion .completion-text-wrapper {
    flex-grow: 1;
}

.completion-prefix {
    font-weight: 500;
    color: #333;
}

.completion-suggestion {
    opacity: 0.6;
    font-weight: 500;
    color: #0056b3;
    margin-left: 4px; /* Add a small space for better separation */
}

.external-completion .completion-hint {
    background: #007bff;
    color: white;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
}

.completion-text-wrapper {
    display: block; /* Change from flex to block to allow natural text flow */
}

.external-completion.mobile-tap:hover {
    background: #f0f7ff;
}

.completion-hint-top-outer {
    text-align: left;
    font-size: 13px;
    color: #409eff;
    font-weight: 500;
    margin-bottom: 2px;
    letter-spacing: 0.2px;
    margin-top: 8px;
}

.pagination-bar-new {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 24px 0;
}

.page-btn {
  min-width: 38px;
  height: 38px;
  border: none;
  border-radius: 12px;
  background: #f6f8fa;
  color: #333;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  margin: 0 2px;
  outline: none;
}

.page-btn.active,
.page-btn:disabled {
  background: #409eff;
  color: #fff;
  font-weight: bold;
  cursor: default;
}

.page-btn:disabled:not(.active) {
  background: #eaeaea;
  color: #bbb;
}

.page-ellipsis {
  min-width: 38px;
  text-align: center;
  color: #888;
  font-size: 18px;
  user-select: none;
}

.page-jump-input {
  width: 60px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #d0d7de;
  text-align: center;
  font-size: 15px;
  margin-left: 8px;
  margin-right: 2px;
}
</style>
