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
            <div class="title-section">
                <h2 class="title">{{ title }}</h2>
                <div class="tags">
                    <span v-if="type" class="tag type-tag">{{ type }}</span>
                    <span v-if="date" class="tag date-tag">{{ date }}</span>
                </div>
            </div>
            <p class="qid">题号：{{ qid }}</p>
            
            <!-- 额外提示信息 -->
            <div v-if="extraMention" class="extra-mention">
                {{ extraMention }}
            </div>

            <!-- 简介音频 -->
            <div v-if="intro" class="section">
                <h3>简介</h3>
                <audio :src="audioSrc(intro)" controls class="audio" />
            </div>

            <!-- 对话内容 -->
            <div v-for="(dialog, idx) in dialogs" :key="idx" class="section">
                <h3>对话 {{ idx + 1 }}</h3>
                
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
                        <div class="label">翻译</div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useData } from '../services/useData.js'
import { checkTranslation } from '../services/openai.js'
import { googleDriveService } from '../services/googleDrive.js'

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

const { loadExcel, data } = useData()
async function retryLoad() {
  error.value = null
  try { await loadExcel() }
  catch (e) { error.value = e.message }
}
retryLoad()

// 从 data.byQid 中读取当前 qid 的行
const rows = computed(() => data.byQid[qid] || [])
const title = computed(() => rows.value[0]?.title || 'Untitled')
const intro = computed(() => rows.value[0]?.audio1 || null)
const type  = computed(() => rows.value[0]?.type  || '')
const date  = computed(() => rows.value[0]?.date  || '')
const extraMention = computed(() => rows.value[0]?.extraMention || '')
// 每两行构造一条对话：原文 + 译文
const dialogs = computed(() => {
  const arr = []
  for (let i = 1; i < rows.value.length; i += 2) {
    const o = rows.value[i], t = rows.value[i + 1]
    if (o && t) {
      arr.push({
        original:    { text: o.text, audio: o.audio1 },
        translation: { text: t.text, audio: t.audio1 }
      })
    }
  }
  return arr
})

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
  return rel ? `/audio${rel}` : ''
}

onMounted(() => {
  chimeAudio.value = new Audio('/chime.mp4')
})
onUnmounted(() => {
  // 卸载时释放所有 Blob URL
  Object.values(recordingsList.value)
    .flat()
    .forEach(r => URL.revokeObjectURL(r.url))
})

/**
 * 根据对话原文内容自动选择识别语言
 * 英文原文则 en-US，否则用 zh-CN
 */
function detectLang(dialogId) {
  const txt = dialogs.value[dialogId]?.original.text || ''
  console.log(txt)
  console.log("wdwdwdwd")
  return /[A-Za-z]/.test(txt) ? 'zh-CN' : 'en-US' 
}

/**
 * 开始录音并进行语音识别
 */
async function startRecording(dialogId) {
  try {
    isCancelled.value = false  // 重置取消标志
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = new MediaRecorder(stream)
    mediaRecorder.value = rec
    audioChunks.value = []
    rec.ondataavailable = e => audioChunks.value.push(e.data)

    // 3. 准备 SpeechRecognition
    const lang = detectLang(dialogId)
    const recognizer = new webkitSpeechRecognition()
    recognizer.continuous = true
    recognizer.interimResults = false
    recognizer.lang = lang

    let finalText = ''
    recognizer.onresult = ev => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) {
          finalText += ev.results[i][0].transcript
        }
      }
    }
    recognizer.onerror = () => { /* 可以记录错误 */ }

    const pStop = new Promise(res => rec.onstop = res)
    const pEnd  = new Promise(res => recognizer.onend = res)

    rec.start()
    recognizer.start()
    isRecording.value = true

    await pStop
    recognizer.stop()
    await pEnd

    // 如果是取消录音，直接返回
    if (isCancelled.value) {
      return
    }

    const blob = new Blob(audioChunks.value, { type: 'audio/wav' })
    const url  = URL.createObjectURL(blob)

    // 获取原文内容并调用 API
    const originalText = dialogs.value[dialogId]?.original.text || ''
    const translatedText = finalText.trim() || '未转录'

    let aiCheckResult = null
    try {
      isApiLoading.value = true
      aiCheckResult = await checkTranslation(originalText, translatedText)

      // 生成文件名（使用当前时间，精确到分钟）
      const now = new Date()
      const filename = now.toISOString().replace(/[:.]/g, '-').split('.')[0] + '.wav'

      // 上传到 Google Drive
      const uploadResult = await googleDriveService.uploadAudio(blob, filename)
    //   console.log('文件已上传到 Google Drive:', uploadResult.webViewLink)

    } catch (err) {
    //   console.error('AI 翻译检查或上传失败:', err)
    //   aiCheckResult = '翻译检查失败'
    } finally {
      isApiLoading.value = false
    }

    if (!recordingsList.value[dialogId]) recordingsList.value[dialogId] = []
    recordingsList.value[dialogId].push({
      url,
      text: translatedText,
      timestamp: new Date().toLocaleString(),
      aiCheck: aiCheckResult
    })

  } catch (err) {
    console.error('录音/识别失败', err)
    alert('无法访问麦克风或识别服务，请检查权限和浏览器支持')
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
</style>
