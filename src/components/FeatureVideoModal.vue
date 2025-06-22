<template>
  <transition name="slide-down">
    <div v-if="visible" class="gif-modal-overlay">
      <div class="gif-modal-center">
        <div class="gif-modal-topbar dark">
          <span class="topbar-text dark">智能Tab：最懂你的笔记补全</span>
          <button class="close-x dark" @click="closeModal" aria-label="关闭">×</button>
        </div>
        <img src="/new-function.gif" alt="新功能介绍" class="gif-img-center" />
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'FeatureVideoModal',
  props: {
    visible: {
      type: Boolean,
      required: true
    }
  },
  methods: {
    closeModal() {
      this.$emit('close');
    }
  }
}
</script>

<style scoped>
.gif-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.55);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}
.gif-modal-center {
  background: rgba(255,255,255,0.98);
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  padding: 0;
  position: relative;
  display: inline-block;
  max-width: 80vw;
  max-height: 80vh;
}
.gif-modal-topbar.dark {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 12px 0 18px;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  background: #181818;
  border-bottom: 1px solid #222;
}
.topbar-text.dark {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  letter-spacing: 0.2px;
}
.gif-img-center {
  display: block;
  max-width: 80vw;
  max-height: calc(80vh - 38px);
  border-radius: 0 0 16px 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.10);
  margin: 0;
  background: #fff;
}
.close-x.dark {
  background: rgba(255,255,255,0.10);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 22px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
  margin-left: 12px;
}
.close-x.dark:hover {
  background: #fff;
  color: #409eff;
}
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.4s cubic-bezier(.25,.8,.25,1);
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: translateY(-40px);
}
</style> 