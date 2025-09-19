<template>
  <div>
    <a class="back" @click="handleBack">← 返回</a>

    <!-- 普通模式头部 -->
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

    <!-- 收藏模式头部 -->
    <div v-else class="favorites-header">
      <h2 class="title">{{ pageTitle }}</h2>
      <div class="sort-controls">
        <button class="sort-btn" disabled>
          排序：<span>添加时间</span>
        </button>
        <button class="sort-order-btn" @click="$emit('toggle-sort-order')">
          <span class="material-icons sort-icon">
            {{ sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  pageTitle: String,
  pageType: String,
  pageDate: String,
  pageQid: String,
  pageExtraMention: String,
  pageIntro: String,
  isFavoritesMode: Boolean,
  sortOrder: String,
  audioSrc: Function
})

const emit = defineEmits(['toggle-sort-order'])

const router = useRouter()

function handleBack() {
  const route = router.currentRoute.value
  const savedState = {
    page: route.query.page,
    filters: route.query.filters
  }

  if (savedState.page || savedState.filters) {
    router.push({
      path: '/',
      query: savedState
    })
  } else {
    router.back()
  }
}
</script>

<style scoped>
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

.audio {
  width: 100%;
  margin: 10px 0;
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
  gap: 8px;
}

.sort-btn {
  padding: 8px 16px;
  background: #ffffff;
  color: #333;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.sort-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}

.sort-order-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
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
</style>
