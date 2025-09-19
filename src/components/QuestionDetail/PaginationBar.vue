<template>
  <div v-if="isFavoritesMode && totalPages > 1" class="pagination-bar-new">
    <button class="page-btn" :disabled="currentPage === 1" @click="$emit('page-change', currentPage - 1)">&lt;</button>
    <template v-for="(p, idx) in paginationRange" :key="idx">
      <button
        v-if="p !== '...'"
        class="page-btn"
        :class="{ active: p === currentPage }"
        @click="$emit('page-change', p)"
        :disabled="p === currentPage"
      >{{ p }}</button>
      <span v-else class="page-ellipsis">...</span>
    </template>
    <button class="page-btn" :disabled="currentPage === totalPages" @click="$emit('page-change', currentPage + 1)">&gt;</button>
    <input 
      v-model="jumpPageInput" 
      type="number" 
      min="1" 
      :max="totalPages" 
      class="page-jump-input" 
      @keydown.enter="handleJumpPage" 
      placeholder="跳转页" 
    />
    <button class="page-btn" @click="handleJumpPage">跳转</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isFavoritesMode: Boolean,
  currentPage: Number,
  totalPages: Number
})

const emit = defineEmits(['page-change'])

const jumpPageInput = ref('')

// 分页页码生成逻辑
const paginationRange = computed(() => {
  const total = props.totalPages
  const current = props.currentPage
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

function handleJumpPage() {
  let page = parseInt(jumpPageInput.value)
  if (isNaN(page)) return
  if (page < 1) page = 1
  if (page > props.totalPages) page = props.totalPages
  emit('page-change', page)
  jumpPageInput.value = ''
}
</script>

<style scoped>
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
