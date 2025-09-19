<template>
  <div v-if="showNoteSettings" class="note-settings-modal">
    <div class="note-settings-content">
      <div class="note-settings-header">
        <span>笔记设置</span>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="note-settings-body">
        <div class="setting-item">
          <label class="setting-label">
            <input 
              type="checkbox" 
              :checked="autoCompletionEnabled" 
              @change="$emit('update:autoCompletionEnabled', $event.target.checked)"
            />
            <span class="setting-text">启用智能补全</span>
          </label>
          <div class="setting-description">
            开启后，在输入笔记时会自动提供智能补全建议
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  showNoteSettings: Boolean,
  autoCompletionEnabled: Boolean
})

const emit = defineEmits(['close', 'update:autoCompletionEnabled'])
</script>

<style scoped>
.note-settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.note-settings-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 24px;
  min-width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.note-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.note-settings-header span {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.note-settings-header .close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.note-settings-header .close-btn:hover {
  background: #f0f0f0;
  color: #d32f2f;
}

.note-settings-header .material-icons {
  font-size: 20px;
}

.note-settings-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 16px;
  color: #333;
}

.setting-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.setting-text {
  font-weight: 500;
}

.setting-description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  margin-left: 30px;
}
</style>
