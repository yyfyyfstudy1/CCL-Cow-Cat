<template>
  <div class="mobile-drawing-board">
    <!-- 悬浮工具按钮 -->
    <div 
      v-if="isMobile"
      class="floating-tool-btn"
      @click="toggleDrawingBoard"
      :class="{ active: isDrawingBoardOpen }"
    >
      <span class="material-icons">{{ isDrawingBoardOpen ? 'close' : 'edit' }}</span>
    </div>

    <!-- 手写画板 -->
    <transition name="slide-up">
      <div 
        v-if="isMobile && isDrawingBoardOpen" 
        class="drawing-board-container"
      >
        <div class="drawing-board-header">
          <h3>手写笔记</h3>
          <div class="drawing-controls">
            <button 
              class="control-btn"
              @click="clearCanvas"
              title="清除画板"
            >
              <span class="material-icons">clear</span>
            </button>
            <button 
              class="control-btn"
              @click="saveDrawing"
              title="保存笔记"
            >
              <span class="material-icons">save</span>
            </button>
            <button 
              class="control-btn"
              @click="toggleDrawingBoard"
              title="关闭"
            >
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <div class="drawing-board-content">
          <canvas 
            ref="canvasRef"
            class="drawing-canvas"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="stopDrawing"
          ></canvas>
        </div>

        <div class="drawing-tools">
          <div class="tool-group">
            <button 
              v-for="color in colors" 
              :key="color"
              class="color-btn"
              :style="{ backgroundColor: color }"
              :class="{ active: currentColor === color }"
              @click="setColor(color)"
              :title="color"
            ></button>
          </div>
          <div class="tool-group">
            <button 
              v-for="size in brushSizes" 
              :key="size"
              class="size-btn"
              :class="{ active: currentSize === size }"
              @click="setSize(size)"
              :title="`画笔大小: ${size}px`"
            >
              <div class="size-indicator" :style="{ width: size + 'px', height: size + 'px' }"></div>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 保存成功提示 -->
    <div v-if="showSaveSuccess" class="save-success-toast">
      <span class="material-icons">check_circle</span>
      <span>笔记已保存</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'

// 响应式状态
const isMobile = ref(false)
const isDrawingBoardOpen = ref(false)
const canvasRef = ref(null)
const isDrawing = ref(false)
const currentColor = ref('#000000')
const currentSize = ref(3)
const showSaveSuccess = ref(false)

// 画板配置
const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500']
const brushSizes = [1, 3, 5, 8, 12]

// Canvas 上下文
let ctx = null
let lastX = 0
let lastY = 0

// 检测移动设备
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

// 切换画板显示
const toggleDrawingBoard = () => {
  isDrawingBoardOpen.value = !isDrawingBoardOpen.value
  if (isDrawingBoardOpen.value) {
    nextTick(() => {
      initCanvas()
    })
  }
}

// 初始化画板
const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 设置画布大小
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height

  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = currentColor.value
    ctx.lineWidth = currentSize.value
  }
}

// 开始绘制
const startDrawing = (e) => {
  isDrawing.value = true
  const rect = canvasRef.value.getBoundingClientRect()
  lastX = e.clientX - rect.left
  lastY = e.clientY - rect.top
}

// 绘制
const draw = (e) => {
  if (!isDrawing.value || !ctx) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()

  lastX = x
  lastY = y
}

// 停止绘制
const stopDrawing = () => {
  isDrawing.value = false
}

// 触摸事件处理
const handleTouchStart = (e) => {
  e.preventDefault()
  const touch = e.touches[0]
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY
  })
  startDrawing(mouseEvent)
}

const handleTouchMove = (e) => {
  e.preventDefault()
  const touch = e.touches[0]
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  })
  draw(mouseEvent)
}

// 设置颜色
const setColor = (color) => {
  currentColor.value = color
  if (ctx) {
    ctx.strokeStyle = color
  }
}

// 设置画笔大小
const setSize = (size) => {
  currentSize.value = size
  if (ctx) {
    ctx.lineWidth = size
  }
}

// 清除画板
const clearCanvas = () => {
  if (ctx && canvasRef.value) {
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  }
}

// 保存画板内容
const saveDrawing = () => {
  if (!canvasRef.value) return

  try {
    // 将画板内容转换为图片
    const dataURL = canvasRef.value.toDataURL('image/png')
    
    // 创建下载链接
    const link = document.createElement('a')
    link.download = `手写笔记_${new Date().toLocaleString().replace(/[\/\s:]/g, '_')}.png`
    link.href = dataURL
    link.click()

    // 显示保存成功提示
    showSaveSuccess.value = true
    setTimeout(() => {
      showSaveSuccess.value = false
    }, 2000)

  } catch (error) {
    console.error('保存画板失败:', error)
  }
}

// 监听窗口大小变化
const handleResize = () => {
  checkMobile()
  if (isDrawingBoardOpen.value) {
    nextTick(() => {
      initCanvas()
    })
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.mobile-drawing-board {
  position: relative;
}

/* 悬浮工具按钮 */
.floating-tool-btn {
  position: fixed;
  bottom: 100px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1000;
}

.floating-tool-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
}

.floating-tool-btn.active {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
}

.floating-tool-btn .material-icons {
  font-size: 24px;
}

/* 画板容器 */
.drawing-board-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70vh;
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  z-index: 999;
  display: flex;
  flex-direction: column;
}

/* 画板头部 */
.drawing-board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 20px 20px 0 0;
}

.drawing-board-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.drawing-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #fff;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-btn:hover {
  background: #f0f0f0;
  color: #333;
  transform: scale(1.05);
}

.control-btn .material-icons {
  font-size: 18px;
}

/* 画板内容 */
.drawing-board-content {
  flex: 1;
  padding: 16px;
  overflow: hidden;
}

.drawing-canvas {
  width: 100%;
  height: 100%;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  background: white;
  cursor: crosshair;
  touch-action: none;
}

/* 工具栏 */
.drawing-tools {
  padding: 16px 20px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
  display: flex;
  gap: 16px;
  align-items: center;
}

.tool-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ddd;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.color-btn:hover {
  transform: scale(1.1);
}

.color-btn.active {
  border-color: #333;
  transform: scale(1.1);
}

.size-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ddd;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.size-btn:hover {
  border-color: #333;
}

.size-btn.active {
  border-color: #333;
  background: #f0f0f0;
}

.size-indicator {
  background: #333;
  border-radius: 50%;
}

/* 动画效果 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* 保存成功提示 */
.save-success-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10000;
  animation: fadeInOut 2s ease-in-out;
}

.save-success-toast .material-icons {
  font-size: 20px;
  color: #4caf50;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0; }
  20%, 80% { opacity: 1; }
}

/* 移动端适配 */
@media (max-width: 480px) {
  .floating-tool-btn {
    bottom: 80px;
    right: 16px;
    width: 52px;
    height: 52px;
  }

  .drawing-board-container {
    height: 75vh;
  }

  .drawing-board-header {
    padding: 12px 16px;
  }

  .drawing-board-header h3 {
    font-size: 16px;
  }

  .control-btn {
    width: 32px;
    height: 32px;
  }

  .control-btn .material-icons {
    font-size: 16px;
  }

  .drawing-tools {
    padding: 12px 16px;
    gap: 12px;
  }

  .color-btn,
  .size-btn {
    width: 28px;
    height: 28px;
  }
}
</style> 