<template>
  <div class="section">
    <!-- 收藏模式下显示添加时间 -->
    <div v-if="isFavoritesMode && dialog.createdAt" class="favorite-created-at" style="color:#888;font-size:13px;margin-bottom:4px;">
      添加时间：{{ new Date(dialog.createdAt).toLocaleString() }}
    </div>
    <div class="dialog-header-row">
      <div style="display:flex;align-items:center;gap:8px;">
        <h3 style="margin:0;">
          对话
          <template v-if="isFavoritesMode">
            {{ globalDialogIndex }}
          </template>
          <template v-else>
            {{ localIndex + 1 }}
          </template>
        </h3>
        <template v-if="dialog.original.isQuestion == 1 && isLoggedIn">
          <button v-if="!isFavoritesMode"
            class="favorite-btn"
            :title="favoriteIds.includes(String(dialog.original.id)) ? '取消收藏' : '收藏对话'"
            @click="$emit('toggle-favorite', dialog.original.id)"
            style="background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;"
          >
            <span class="material-icons"
              :style="{color: favoriteIds.includes(String(dialog.original.id)) ? '#e74c3c' : '#bbb'}">
              {{ favoriteIds.includes(String(dialog.original.id)) ? 'favorite' : 'favorite_border' }}
            </span>
          </button>
          <span v-else class="material-icons" style="color:#e74c3c;vertical-align:middle;margin-left:4px;">favorite</span>
          <!-- 收藏模式下的熟练度星级显示 -->
          <div v-if="isFavoritesMode"
            class="star-rating"
            @mouseenter="showMasteryTooltip = true"
            @mouseleave="showMasteryTooltip = false"
          >
            <span v-for="n in 5" :key="n"
              class="material-icons star-icon"
              :class="{ 'filled': n <= dialog.mastery }"
              @click="$emit('update-mastery', dialog.original.id, n)">
              {{ n <= dialog.mastery ? 'star' : 'star_border' }}
            </span>
            <div v-if="showMasteryTooltip" class="mastery-tooltip">
              根据你现在的熟练度点亮星星
            </div>
          </div>
          <!-- 笔记图标 -->
          <button v-if="dialog.original.isQuestion == 1"
            class="notes-icon-btn"
            :title="dialog.showNotes ? '隐藏笔记' : '显示笔记'"
            @click="$emit('toggle-notes', dialog)"
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
          <button v-if="isDialogOpen('original')" class="action-btn" title="复制原文" @click="copyText(dialog.original.text, 'original')">
            <span class="material-icons">{{ copyStatus.original ? 'check' : 'content_copy' }}</span>
          </button>
          <button class="toggle-btn" @click="$emit('toggle-dialog', 'original')">
            {{ isDialogOpen('original') ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>
      <transition name="fade">
        <p v-if="isDialogOpen('original')" class="content-text">
          {{ dialog.original.text }}
        </p>
      </transition>
      <audio
        :src="audioSrc(dialog.original.audio)"
        controls
        class="audio"
        @ended="$emit('original-audio-end')"
      />
    </div>

    <!-- 翻译部分 -->
    <div class="dialog-part">
      <div class="content-header">
        <div class="label">参考翻译</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button v-if="isDialogOpen('translation')" class="action-btn" title="复制翻译" @click="copyText(dialog.translation.text, 'translation')">
            <span class="material-icons">{{ copyStatus.translation ? 'check' : 'content_copy' }}</span>
          </button>
          <button class="toggle-btn" @click="$emit('toggle-dialog', 'translation')">
            {{ isDialogOpen('translation') ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>
      <transition name="fade">
        <p v-if="isDialogOpen('translation')" class="content-text">
          {{ dialog.translation.text }}
        </p>
      </transition>
      <audio :src="audioSrc(dialog.translation.audio)" controls class="audio" />
    </div>

    <!-- 笔记部分 -->
    <NotesSection
      v-if="dialog.original.isQuestion == 1"
      :showNotes="dialog.showNotes"
      :dialogNotes="dialog.dialogNotes"
      :notesError="notesError"
      :newNoteText="newNoteText"
      :autoCompletionEnabled="autoCompletionEnabled"
      :showInlineCompletion="showInlineCompletion"
      :inlineCompletion="inlineCompletion"
      :suggestionError="suggestionError"
      :editingNoteId="editingNoteId"
      :editingNoteText="editingNoteText"
      @toggle-notes="$emit('toggle-notes', dialog)"
      @show-settings="$emit('show-settings')"
      @add-note="$emit('add-note', dialog)"
      @apply-completion="$emit('apply-completion', dialog)"
      @note-keydown="$emit('note-keydown', $event, dialog)"
      @note-input="$emit('note-input', $event, dialog)"
      @save-note="$emit('save-note', dialog, $event)"
      @cancel-edit="$emit('cancel-edit')"
      @edit-note="$emit('edit-note', $event)"
      @delete-note="$emit('delete-note', dialog, $event)"
      @update:newNoteText="$emit('update:newNoteText', dialog.original.id, $event)"
      @update:editingNoteText="$emit('update:editingNoteText', $event)"
    />

    <!-- 录音部分 -->
    <RecordingSection
      :dialogIndex="localIndex"
      :recordings="recordings"
      :isRecording="isRecording"
      :isApiLoading="isApiLoading"
      :transcribingStatus="transcribingStatus"
      :currentTranscribingDialogId="currentTranscribingDialogId"
      @start-recording="$emit('start-recording', $event)"
      @stop-recording="$emit('stop-recording')"
      @cancel-recording="$emit('cancel-recording')"
      @delete-recording="$emit('delete-recording', $event, arguments[1])"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NotesSection from './NotesSection.vue'
import RecordingSection from './RecordingSection.vue'

const props = defineProps({
  dialog: Object,
  localIndex: Number,
  globalDialogIndex: Number,
  isFavoritesMode: Boolean,
  isLoggedIn: Boolean,
  favoriteIds: Array,
  dialogStates: Object,
  audioSrc: Function,
  recordings: Array,
  isRecording: Boolean,
  isApiLoading: Boolean,
  transcribingStatus: String,
  currentTranscribingDialogId: Number,
  notesError: String,
  newNoteText: String,
  autoCompletionEnabled: Boolean,
  showInlineCompletion: Boolean,
  inlineCompletion: String,
  suggestionError: String,
  editingNoteId: String,
  editingNoteText: String
})

const emit = defineEmits([
  'toggle-favorite',
  'update-mastery',
  'toggle-notes',
  'toggle-dialog',
  'original-audio-end',
  'start-recording',
  'stop-recording',
  'cancel-recording',
  'delete-recording',
  'show-settings',
  'add-note',
  'apply-completion',
  'note-keydown',
  'note-input',
  'save-note',
  'cancel-edit',
  'edit-note',
  'delete-note',
  'update:newNoteText',
  'update:editingNoteText'
])

const showMasteryTooltip = ref(false)
const copyStatus = ref({
  original: false,
  translation: false
})

function isDialogOpen(type) {
  const key = `${props.localIndex}-${type}`
  return !!props.dialogStates[key]
}

function copyText(text, type) {
  if (!text) return
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
    } catch (err) {}
    document.body.removeChild(textarea)
  }
  // 设置勾号状态
  copyStatus.value[type] = true
  setTimeout(() => {
    copyStatus.value[type] = false
  }, 2000)
}
</script>

<style scoped>
.section {
  margin-bottom: 32px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.dialog-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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

.star-rating {
  position: relative;
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
  color: #f39c12;
}

.star-icon:hover {
  color: #f1c40f;
}

.mastery-tooltip {
  position: absolute;
  top: -35px;
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
  top: 100%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: #333 transparent transparent transparent;
}

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
  position: relative;
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

.content-text {
  margin: 0 0 12px;
  line-height: 1.5;
  color: #333;
}

.audio {
  width: 100%;
  margin: 10px 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.material-icons {
  font-size: 20px;
}

h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}
</style>
