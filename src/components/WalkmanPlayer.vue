<template>
    <div class="walkman-player-wrapper" :class="{ expanded: showSettings }">
        <div class="player-main">
            <button class="collapse-btn" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? '展开' : '折叠'">
                <span class="material-icons">{{ isCollapsed ? 'expand_less' : 'expand_more' }}</span>
            </button>
            <div v-show="!isCollapsed">
                <div class="dialog-header">
                    <span v-if="currentQid" class="qid-span">{{ currentQid }}</span>
                    <span class="title-span">{{ currentQidTitle }}</span>
                    <span style="margin-left:16px;">{{ currentDialogIndex + 1 }}/{{ currentDialogs.length }}</span>
                    <button class="settings-btn" @click="showSettings = true" title="设置"><span class="material-icons">settings</span></button>
                </div>
                <div class="dialog-content">
                    <template v-if="!currentQid">
                        <div class="select-qid-tip">请选择任意题目播放</div>
                    </template>
                    <template v-else>
                        <!-- 原文 -->
                        <div class="dialog-text">
                            <div style="font-weight:600;">原文</div>
                            <div style="margin-bottom:8px;">{{ currentDialog.original?.text || '' }}</div>
                            <audio
                                    v-if="audioSrc(currentDialog.original?.audio)"
                                    ref="audioRef"
                                    :src="audioSrc(currentDialog.original?.audio)"
                                    :playbackRate="Number(playbackRate)"
                                    @ended="onAudioEnded"
                                    @error="onAudioError('原文')"
                            />
                        </div>
                        <!-- 译文 -->
                        <div class="dialog-text">
                            <div style="font-weight:600;">参考翻译</div>
                            <div>{{ currentDialog.translation?.text || '' }}</div>
                            <audio
                                    v-if="audioSrc(currentDialog.translation?.audio)"
                                    ref="transAudioRef"
                                    :src="audioSrc(currentDialog.translation?.audio)"
                                    :playbackRate="Number(playbackRate)"
                                    @ended="onTransAudioEnded"
                                    @error="onAudioError('译文')"
                            />
                        </div>
                    </template>
                </div>
            </div>
            <div class="dialog-controls">
                <button class="circle-btn" @click="playPrevQid" :disabled="!canPrevQid" title="上一题"><span class="material-icons">skip_previous</span></button>
                <button class="circle-btn" @click="prevDialog" :disabled="currentDialogIndex === 0" title="上一片段"><span class="material-icons">chevron_left</span></button>
                <button class="circle-btn main-play" @click="togglePlay">
                    <span class="material-icons" style="font-size:32px;">{{ isPlaying ? 'pause_circle' : 'play_circle' }}</span>
                </button>
                <button class="circle-btn" @click="nextDialog" :disabled="currentDialogIndex === currentDialogs.length - 1" title="下一片段"><span class="material-icons">chevron_right</span></button>
                <button class="circle-btn" @click="playNextQid" :disabled="!canNextQid" title="下一题"><span class="material-icons">skip_next</span></button>
            </div>
        </div>
        <transition name="fade">
            <div v-if="showSettings" class="settings-modal">
                <div class="settings-modal-content">
                    <div class="settings-modal-header">
                        <span>播放器设置</span>
                        <button class="close-btn" @click="showSettings = false"><span class="material-icons">close</span></button>
                    </div>
                    <div class="bar-section">
                        <label>
                            <input type="checkbox" v-model="autoNext" /> 自动播放下一题
                        </label>
                    </div>
                    <div class="bar-section">
                        <label>片段间隔（秒）：
                            <input type="number" min="0" v-model.number="segmentGap" style="width:50px;" />
                        </label>
                    </div>
                    <div class="bar-section">
                        <label>题目间隔（秒）：
                            <input type="number" min="0" v-model.number="dialogGap" style="width:50px;" />
                        </label>
                    </div>
                    <div class="bar-section">
                        <label>播放速度：
                            <select v-model="playbackRate">
                                <option value="0.75">0.75x</option>
                                <option value="1">1x</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                                <option value="2">2x</option>
                            </select>
                        </label>
                    </div>
                    <div class="bar-section">
                        <label>最大连续播放篇数：
                            <input type="number" min="1" v-model.number="maxContinuous" style="width:50px;" />
                        </label>
                    </div>
                    <div class="bar-section">
                        <label>片段重复次数：
                            <input type="number" min="1" v-model.number="repeatCount" style="width:50px;" />
                        </label>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useData } from '../services/useData.js'

const props = defineProps({
  qidList: { type: Array, default: () => [] },
  currentQid: { type: String, default: '' }
})

const emit = defineEmits(['update:currentQid'])

/* ---------- 用户可调参数 ---------- */
const autoNext      = ref(false)  // 默认关闭自动跳转
const segmentGap    = ref(3)
const dialogGap     = ref(3)
const playbackRate  = ref(1)
const maxContinuous = ref(50)
const repeatCount   = ref(1)
/* ---------------------------------- */

/* -------------- 状态 -------------- */
const { data }           = useData()
const currentQid         = ref(null)
const currentDialogs     = ref([])
const currentDialogIndex = ref(0)

const isPlaying      = ref(false)   // 播放按钮状态
const isTransPlaying = ref(false)   // 是否在播译文
const audioRef       = ref(null)    // 原文 audio DOM
const transAudioRef  = ref(null)    // 译文 audio DOM
const autoPlayTimer  = ref(null)
const showSettings   = ref(false)
const repeatTimes    = ref(0)
const isCollapsed    = ref(false)
/* ---------------------------------- */

/* -------------- 常量 -------------- */
const S3_BASE_URL   = 'https://cclcowcatresource.s3.ap-southeast-2.amazonaws.com'
const S3_AUDIO_PATH = import.meta.env.VITE_S3_AUDIO_PATH || '/audio/'
/* ---------------------------------- */

/* ---------- 计算属性 ---------- */
const allQids = computed(() => props.qidList && props.qidList.length ? props.qidList : Object.keys(data.byQid));
const currentQidValue = computed(() => props.currentQid || currentQid.value);
const currentQidIndex = computed(() => allQids.value.indexOf(currentQidValue.value));
const canNextQid = computed(() => currentQidIndex.value !== -1 && currentQidIndex.value < allQids.value.length - 1);
const canPrevQid = computed(() => currentQidIndex.value > 0);
const currentDialog     = computed(() => currentDialogs.value[currentDialogIndex.value] || {})
const currentQidTitle   = computed(() => {
    if (!currentQidValue.value) return ''
    const rows = data.byQid[currentQidValue.value]
    return rows && rows[0] ? rows[0].title : ''
})
/* -------------------------------- */

/* ---------- 辅助函数 ---------- */
function audioSrc(rel) {
    return rel ? `${S3_BASE_URL}${S3_AUDIO_PATH}${rel}` : ''
}

// **一次性暂停页面内所有 <audio> 元素**
function pauseAllAudios(reset = false) {
    document.querySelectorAll('audio').forEach(a => {
        a.pause()
        if (reset) a.currentTime = 0
    })
}
/* -------------------------------- */

/* ============== 核心控制 ============== */
function stopAudio() {
    pauseAllAudios(true)           // 1. 全面停止
    if (autoPlayTimer.value) {     // 2. 清计时器
        clearTimeout(autoPlayTimer.value)
        autoPlayTimer.value = null
    }
    isPlaying.value      = false   // 3. 状态复位
    isTransPlaying.value = false
}

function onAudioEnded() {
    // 原文音频播完后自动播放译文
    if (transAudioRef.value) {
        isTransPlaying.value = true
        transAudioRef.value.currentTime = 0
        transAudioRef.value.playbackRate = Number(playbackRate.value)
        transAudioRef.value.play().catch(err => {
            if (import.meta.env.DEV) {
                console.warn('[Walkman] 译文播放失败', err)
            }
        })
    } else {
        // 没有译文音频，直接结束
        isPlaying.value = false
        isTransPlaying.value = false
    }
}

// 新增 replayCurrentAudio 只重播当前片段
function replayCurrentAudio() {
    isPlaying.value = true
    isTransPlaying.value = false
    nextTick(() => {
        if (audioRef.value) {
            audioRef.value.currentTime  = 0
            audioRef.value.playbackRate = Number(playbackRate.value)
            audioRef.value.play().catch(err => {
                if (import.meta.env.DEV) {
                    console.warn('[Walkman] 原文播放失败', err)
                }
            })
        }
    })
}

// 修改 onTransAudioEnded
function onTransAudioEnded() {
    isTransPlaying.value = false
    isPlaying.value = false
    repeatTimes.value++
    if (repeatTimes.value < repeatCount.value) {
        // 只重播当前片段，不重置计数
        setTimeout(() => {
            replayCurrentAudio()
        }, segmentGap.value * 1000)
        return
    }
    // 片段重复次数已满，继续原有逻辑
    repeatTimes.value = 0
    if (currentDialogIndex.value < currentDialogs.value.length - 1) {
        autoPlayTimer.value = setTimeout(() => {
            nextDialog()
        }, segmentGap.value * 1000)
    } else {
        if (autoNext.value) {
            autoPlayTimer.value = setTimeout(() => {
                playNextQid()
            }, dialogGap.value * 1000)
        }
    }
}

// 修改 playCurrent，重置 repeatTimes
function playCurrent() {
    stopAudio()                    // 确保没有遗漏音频
    isPlaying.value = true
    isTransPlaying.value = false
    repeatTimes.value = 0
    nextTick(() => {
        if (audioRef.value) {
            audioRef.value.currentTime  = 0
            audioRef.value.playbackRate = Number(playbackRate.value)
            audioRef.value.play().catch(err => {
                if (import.meta.env.DEV) {
                    console.warn('[Walkman] 原文播放失败', err)
                }
            })
        }
    })
}

function pauseCurrent() {
    isPlaying.value = false
    pauseAllAudios()               // 只暂停，不复位进度
    if (autoPlayTimer.value) {
        clearTimeout(autoPlayTimer.value)
        autoPlayTimer.value = null
    }
}

function playNextQid() {
    const idx = allQids.value.indexOf(currentQidValue.value)
    if (idx !== -1 && idx < allQids.value.length - 1) {
        handlePlayQid(allQids.value[idx + 1])
    } else {
        stopAudio()
    }
}

function playPrevQid() {
    const idx = allQids.value.indexOf(currentQidValue.value)
    if (idx > 0) {
        handlePlayQid(allQids.value[idx - 1])
    } else {
        stopAudio()
    }
}
/* ===================================== */

/* ----------- 组件事件 & 生命周期 ----------- */
function handlePlayQid(qid) {
    stopAudio()
    currentQid.value = qid
    emit('update:currentQid', qid)
    const rows    = data.byQid[qid] || []
    const dialogs = []
    for (let i = 1; i < rows.length; i += 2) {
        const o = rows[i], t = rows[i + 1]
        if (o && t) {
            dialogs.push({
                original:    { text: o.text, audio: o.audio1, isQuestion: o.isQuestion, id: o.id },
                translation: { text: t.text, audio: t.audio1 },
                qid,
            })
        }
    }
    currentDialogs.value     = dialogs
    currentDialogIndex.value = 0
    nextTick(playCurrent)
}

function onPlayQidEvent(e) {
    handlePlayQid(e.detail)
}

onMounted(() => {
    console.log('[Walkman] mounted', Date.now())
    window.addEventListener('walkman-play-qid', onPlayQidEvent)
})
onUnmounted(() => window.removeEventListener('walkman-play-qid', onPlayQidEvent))
/* ------------------------------------------ */

/* -------------- 控制按钮 -------------- */
function togglePlay() {
    isPlaying.value ? pauseCurrent() : playCurrent()
}

function prevDialog() {
    if (currentDialogIndex.value === 0) return
    stopAudio()
    currentDialogIndex.value--
    playCurrent()
}

function nextDialog() {
    if (currentDialogIndex.value === currentDialogs.value.length - 1) return
    stopAudio()
    currentDialogIndex.value++
    playCurrent()
}
/* ------------------------------------- */

/* ----------- 统一错误提示 ----------- */
function onAudioError(type) {
    return () => {
        console.error(`[Walkman] ${type}音频加载失败`, {
            src: type === '原文' ? audioSrc(currentDialog.value.original?.audio) : audioSrc(currentDialog.value.translation?.audio),
            dialog: currentDialog.value,
        })
        alert(`${type}音频加载失败，请检查文件路径或格式`)
    }
}
/* ----------------------------------- */
</script>

  <style scoped>
  .walkman-player-wrapper {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
    background: #fff;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    transition: box-shadow 0.2s;
  }
  .player-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px 24px 24px 24px;
    position: relative;
  }
  .dialog-header {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .dialog-content {
    margin-bottom: 16px;
  }
  .dialog-text {
    margin-bottom: 10px;
  }
  .dialog-controls {
    display: flex;
    gap: 32px;
    justify-content: center;
    align-items: center;
    margin-top: 24px;
    padding-top: 12px;
    padding-bottom: 8px;
  }
  .circle-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: #f5f7fa;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #495057;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, color 0.2s;
    outline: none;
  }
  .circle-btn:disabled {
    background: #ececec;
    color: #b0b0b0;
    cursor: not-allowed;
    box-shadow: none;
  }
  .circle-btn:hover:not(:disabled) {
    background: #e3eafc;
    color: #1976d2;
    box-shadow: 0 4px 16px rgba(25,118,210,0.10);
  }
  .main-play {
    width: 68px;
    height: 68px;
    font-size: 36px;
    background: #e3eafc;
    color: #1976d2;
    box-shadow: 0 6px 24px rgba(25,118,210,0.12);
    margin: 0 12px;
  }
  .main-play:hover:not(:disabled) {
    background: #d1e0fa;
    color: #0d47a1;
  }
  .settings-btn {
    position: absolute;
    right: 32px;
    top: 24px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: #f5f7fa;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    color: #495057;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, color 0.2s;
    outline: none;
  }
  .settings-btn:hover {
    background: #e3eafc;
    color: #1976d2;
    box-shadow: 0 4px 16px rgba(25,118,210,0.10);
  }
  .settings-modal {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.18);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .settings-modal-content {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    padding: 28px 32px 20px 32px;
    min-width: 320px;
    max-width: 90vw;
  }
  .settings-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 18px;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 22px;
    color: #888;
    cursor: pointer;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, color 0.2s;
  }
  .close-btn:hover {
    background: #f0f0f0;
    color: #d32f2f;
  }
  .bar-section {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    margin-bottom: 8px;
  }
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.2s;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
  .select-qid-tip {
    text-align: center;
    color: #888;
    font-size: 18px;
    padding: 32px 0 32px 0;
  }
  .qid-span {
    margin-right: 12px;
    font-weight: 600;
    color: #1976d2;
  }
  .title-span {
    font-weight: 600;
  }
  .collapse-btn {
    position: absolute;
    left: -20px;
    top: 16px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #f5f7fa;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #495057;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, color 0.2s;
    outline: none;
    z-index: 10;
  }
  .collapse-btn:hover {
    background: #e3eafc;
    color: #1976d2;
    box-shadow: 0 4px 16px rgba(25,118,210,0.10);
  }
  </style>
