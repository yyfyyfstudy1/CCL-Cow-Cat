<template>
  <div v-if="showNotes" class="notes-section">
    <div class="notes-header">
      <h4>我的笔记 ({{ dialogNotes.length }})</h4>
      <button class="toggle-btn" @click="$emit('toggle-notes')">
        隐藏
      </button>
    </div>

    <div v-if="notesError" class="notes-error">
      {{ notesError }}
    </div>

    <!-- 添加新笔记 -->
    <div class="add-note-container">
      <div class="note-input-header">
        <div class="note-input-label">添加笔记</div>
        <div class="note-settings">
          <button 
            class="note-settings-btn" 
            @click="$emit('show-settings')"
            title="笔记设置"
          >
            <span class="material-icons">settings</span>
          </button>
        </div>
      </div>
      <div class="note-input-row">
        <div class="note-input-wrapper">
          <textarea
            :value="newNoteText"
            :placeholder="autoCompletionEnabled ? '记录你的笔记... (输入内容后会自动显示智能补全，按Tab键接受补全)' : '记录你的笔记...'"
            class="note-textarea"
            rows="3"
            @keydown="handleNoteKeydown"
            @input="handleNoteInput"
            :ref="setNoteTextareaRef"
          ></textarea>
        </div>
      </div>

      <!-- 智能补全显示 -->
      <template v-if="autoCompletionEnabled && showInlineCompletion && inlineCompletion">
        <div class="completion-hint-top-outer">点击或按Tab下方提示框补全</div>
        <div class="external-completion"
             @click="$emit('apply-completion')"
             style="cursor: pointer;"
        >
          <span class="material-icons">auto_awesome</span>
          <div class="completion-text-wrapper">
            <span class="completion-prefix">{{ newNoteText }}</span>
            <span class="completion-suggestion">{{ inlineCompletion }}</span>
          </div>
        </div>
      </template>

      <div class="note-actions-row">
        <button
          class="add-note-btn"
          @click="$emit('add-note')"
          :disabled="!newNoteText || newNoteText.trim().length === 0"
        >
          保存笔记
        </button>
      </div>

      <!-- 提示错误信息 -->
      <div v-if="suggestionError" class="suggestion-error">
        {{ suggestionError }}
      </div>
    </div>

    <!-- 笔记列表 -->
    <div v-if="dialogNotes.length > 0" class="notes-list">
      <div v-for="note in dialogNotes" :key="note.id" class="note-item">
        <template v-if="editingNoteId === note.id">
          <textarea
            :value="editingNoteText"
            @input="$emit('update:editingNoteText', $event.target.value)"
            class="note-textarea edit-mode"
            rows="3"
          ></textarea>
          <div class="note-actions-edit-mode">
            <button class="action-btn save-btn" @click="$emit('save-note', note.id)" title="保存">
              <span class="material-icons">check</span>
            </button>
            <button class="action-btn cancel-btn" @click="$emit('cancel-edit')" title="取消">
              <span class="material-icons">close</span>
            </button>
          </div>
        </template>
        <template v-else>
          <p class="note-text">{{ note.text }}</p>
          <div class="note-footer">
            <span class="note-timestamp">{{ new Date(note.createdAt).toLocaleString() }}</span>
            <div class="note-actions">
              <button class="action-btn" @click="$emit('edit-note', note)" title="编辑">
                <span class="material-icons">edit</span>
              </button>
              <button class="action-btn" @click="$emit('delete-note', note.id)" title="删除">
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
</template>

<script setup>
import { nextTick } from 'vue'
import autosize from 'autosize'

const props = defineProps({
  showNotes: Boolean,
  dialogNotes: Array,
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
  'toggle-notes',
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

function setNoteTextareaRef(el) {
  if (el) {
    autosize(el)
  }
}

function handleNoteKeydown(event) {
  emit('note-keydown', event)
}

function handleNoteInput(event) {
  emit('update:newNoteText', event.target.value)
  emit('note-input', event)
}
</script>

<style scoped>
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

.note-settings {
  display: flex;
  align-items: center;
}

.note-settings-btn {
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

.note-settings-btn:hover {
  color: #007bff;
  background-color: #f0f0f0;
}

.note-settings-btn .material-icons {
  font-size: 18px;
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
  justify-content: flex-end;
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

.suggestion-error {
  margin-top: 8px;
  padding: 8px 12px;
  background: #e9f5ff;
  color: #0056b3;
  border: 1px solid #bce0fd;
  border-radius: 4px;
  font-size: 12px;
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
  margin-left: 4px;
}

.completion-text-wrapper {
  display: block;
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
</style>
