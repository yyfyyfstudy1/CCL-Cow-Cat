<template>
  <div class="recording-section">
    <div class="record-btn-container">
      <button
        class="record-btn"
        :class="{
          recording: isRecording,
          'api-loading': isApiLoading && !isRecording,
          'no-bg': isApiLoading && currentTranscribingDialogId === dialogIndex
        }"
        :disabled="isApiLoading && !isRecording"
        @click="isRecording ? $emit('stop-recording') : $emit('start-recording', dialogIndex)"
      >
        <template v-if="isRecording">
          <span class="material-icons">stop</span>
          停止录音
        </template>
        <template v-else-if="isApiLoading && currentTranscribingDialogId === dialogIndex">
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
        @click="$emit('cancel-recording')"
        title="取消录音"
        style="margin-left: 12px;"
      >
        <span class="material-icons">close</span>
      </button>
    </div>

    <div v-if="recordings?.length">
      <div class="recording-header">
        <span class="label">当前录音</span>
      </div>

      <div class="recordings-list">
        <div v-for="(recording, rIdx) in reversedRecordings"
          :key="rIdx"
          class="recording-item"
        >
          <div class="recording-controls">
            <audio :src="recording.url" controls class="recording-audio"></audio>
            <div class="recording-actions">
              <button class="action-btn" @click="$emit('delete-recording', dialogIndex, rIdx)">
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
</template>

<script setup>
import { computed } from 'vue'
import { Vue3Lottie } from 'vue3-lottie'

const props = defineProps({
  dialogIndex: Number,
  recordings: Array,
  isRecording: Boolean,
  isApiLoading: Boolean,
  transcribingStatus: String,
  currentTranscribingDialogId: Number
})

const emit = defineEmits(['start-recording', 'stop-recording', 'cancel-recording', 'delete-recording'])

const reversedRecordings = computed(() => {
  return props.recordings ? [...props.recordings].reverse() : []
})

// 从 AI 评估结果中提取分数
function extractScore(aiCheck) {
  if (!aiCheck) return null
  const match = aiCheck.match(/总分：([\d]+)/)
  return match ? match[1] : null
}
</script>

<style scoped>
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

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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

.label {
  font-weight: 600;
  color: #666;
}
</style>
