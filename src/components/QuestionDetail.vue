<template>
    <div class="container">
        <a class="back" @click="$router.back()">← 返回</a>

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
            <!-- 对话内容 -->
            <div v-for="(dialog, idx) in dialogs" :key="idx" class="section">
                <div class="dialog-header-row">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <h3 style="margin:0;">对话 {{ idx + 1 }}</h3>
                        <template v-if="dialog.original.isQuestion == 1">
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
                        <button class="toggle-btn" @click="toggleDialog(idx, 'original')">
                            {{ isDialogOpen(idx, 'original') ? '隐藏' : '显示' }}
                        </button>
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
                        <button class="toggle-btn" @click="toggleDialog(idx, 'translation')">
                            {{ isDialogOpen(idx, 'translation') ? '隐藏' : '显示' }}
                        </button>
                    </div>
                    <transition name="fade">
                        <p v-if="isDialogOpen(idx, 'translation')" class="content-text">
                            {{ dialog.translation.text }}
                        </p>
                    </transition>
                    <audio :src="audioSrc(dialog.translation.audio)" controls class="audio" />
                </div>

                <!-- 录音部分 -->
                <div class="recording-section">
                    <div class="record-btn-container">
                        <button
                            class="record-btn"
                            :class="{
                                recording: isRecording,
                                'api-loading': isApiLoading && !isRecording
                            }"
                            :disabled="isApiLoading && !isRecording"
                            @click="isRecording ? stopRecording() : startRecording(idx)"
                        >
                            <span class="material-icons">{{ isRecording ? 'stop' : 'mic' }}</span>
                            {{ isRecording ? '停止录音' : (isApiLoading ? '处理中...' : '开始录音') }}
                        </button>

                        <!-- 新增取消按钮 -->
                        <button
                            v-if="isRecording"
                            class="cancel-btn"
                            @click="cancelRecording"
                            title="取消录音"
                        >
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div v-if="recordingsList[idx]?.length">
                        <div class="recording-header">
                            <span class="label">当前录音</span>
                        </div>

                        <div class="recordings-list">
                            <div v-for="(recording, rIdx) in recordingsList[idx]"
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
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useData } from '../services/useData.js'
import { checkTranslation, transcribeAudio } from '../services/openai.js'
import { googleDriveService } from '../services/googleDrive.js'
import { addFavorite, removeFavorite, getAllFavorites } from '../services/favorites.js'
import { markAsLearned } from '../services/learned.js'

const route = useRoute()
const qid = route.params.qid

// 状态
const error = ref(null)
const isRecording = ref(false)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const chimeAudio = ref(null)

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

// 收藏相关
const favoriteIds = ref([])

// 页面数据（改为 ref）
const pageTitle = ref('Untitled')
const pageIntro = ref(null)
const pageType  = ref('')
const pageDate  = ref('')
const pageExtraMention = ref('')
const pageQid = ref(null) // 新增：用于存储当前显示的题号
const dialogs = ref([]) // 依然是 ref

const isFavoritesMode = computed(() => route.name === 'myFavorites' || route.params.mode === 'favorites')

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
  return rel ? `${S3_BASE_URL}/audio${rel}` : '';
}

// 统一的数据加载函数
async function loadPageData() {
  error.value = null
  try {
    await loadExcel() // 确保 Excel 数据已加载

    if (isFavoritesMode.value) {
      // 收藏模式：加载所有收藏id，构造dialogs
      const ids = await getAllFavorites()
      dialogs.value = ids.map(id => {
        const originalRow = data.rows.find(r => String(r.id) === String(id))
        const translationRow = data.rows.find(r => String(r.id) === String(Number(id) + 1))

        return {
          original: {
            text: originalRow?.text || '',
            audio: originalRow?.audio1 || '',
            isQuestion: 1, // 收藏的对话都视为问题类型
            id: id,
            associatedQid: originalRow?.qid || null,
            associatedTitle: originalRow?.title || '未知题目'
          },
          translation: {
            text: translationRow?.text || '',
            audio: translationRow?.audio1 || ''
          }
        }
      })
      pageTitle.value = '我的收藏对话' // 收藏页面标题
      // 其他收藏页面特有的标题/信息可以设置，这里暂不设置 intro, type, date, extraMention
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
            translation: { text: t.text, audio: t.audio1 }
          })
        }
      }
      dialogs.value = arr
    }

    // 无论哪种模式，都加载收藏状态
    await loadFavorites()

  } catch (e) {
    console.error('加载页面数据失败:', e)
    error.value = e.message
  }
}

// 监听路由变化，重新加载数据
watch(() => route.fullPath, (newPath, oldPath) => {
  if (newPath !== oldPath) {
    loadPageData()
  }
}, { immediate: true })

// 首次加载（由 watch immediate 触发，但确保其他初始化）
onMounted(() => {
  chimeAudio.value = new Audio('/chime.mp4')
  const hasShownNotification = localStorage.getItem('hasShownNotification')
  if (!hasShownNotification) {
    showNotification.value = true
  }
})
onUnmounted(() => {
  // 卸载时释放所有 Blob URL
  Object.values(recordingsList.value)
    .flat()
    .forEach(r => URL.revokeObjectURL(r.url))
})

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

    // 如果是取消录音，直接返回
    if (isCancelled.value) {
      return
    }

    const blob = new Blob(audioChunks.value, {
      type: 'audio/mp4'
    })
    const url = URL.createObjectURL(blob)

    // 获取原文内容
    const originalText = dialogs.value[dialogId]?.original.text || ''
    let translatedText = '未转录'
    let aiCheckResult = null

    try {
      isApiLoading.value = true

      // 调用音频转录服务
      const translatedText = await transcribeAudio(
        blob,
        detectLang(dialogId),
        detectLang(dialogId) === 'zh' ? '请返回简体中文' : 'Please return in English'
      )
      const trimmedText = translatedText.trim()

      // AI 翻译评估
      aiCheckResult = await checkTranslation(originalText, trimmedText)

      // 记录已学对话
      const dialog = dialogs.value[dialogId]
      if (dialog?.original?.id) {
        await markAsLearned(route.params.qid, String(dialog.original.id))
      }

      // 生成文件名（使用当前时间，精确到分钟）
      const now = new Date()
      const filename = now.toISOString().replace(/[:.]/g, '-').split('.')[0] + '.wav'

      // 异步上传到 Google Drive
      const blobCopy = blob.slice(0)
      Promise.resolve().then(async () => {
        try {
          // 转换为 WAV 格式
          const wavBlob = await convertToWav(blobCopy)
          const uploadResult = await googleDriveService.uploadAudio(wavBlob, filename)
        } catch (err) {
          // console.error('Google Drive 上传失败:', err)
        }
      })

      if (!recordingsList.value[dialogId]) recordingsList.value[dialogId] = []
      recordingsList.value[dialogId].push({
        url,
        text: trimmedText,
        timestamp: new Date().toLocaleString(),
        aiCheck: aiCheckResult
      })

    } catch (err) {
      console.error('语音转录或翻译检查失败:', err)
      aiCheckResult = '转录或翻译检查失败'
    } finally {
      isApiLoading.value = false
    }

  } catch (err) {
    console.error('录音失败', err)
    alert('无法访问麦克风，请检查权限')
  } finally {
    if (mediaRecorder.value) {
      mediaRecorder.value.stream.getTracks().forEach(t => t.stop())
    }
    isRecording.value = false
    isApiLoading.value = false
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
  const match = aiCheck.match(/总分：(\d+)/);
  return match ? match[1] : null;
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
    favoriteIds.value = (await getAllFavorites()).map(String)
    console.log('收藏id:', favoriteIds.value)
  } catch (e) {
    console.error('加载收藏失败:', e)
    favoriteIds.value = []
  }
}

async function toggleFavorite(id) {
  const strId = String(id)
  if (favoriteIds.value.includes(strId)) {
    await removeFavorite(strId)
  } else {
    await addFavorite(strId)
  }
  await loadFavorites()
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
    opacity: 0.7;
    cursor: not-allowed;
    transform: none !important;
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
</style>
