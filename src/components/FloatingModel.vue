<template>
  <div 
    ref="containerRef" 
    class="floating-model-container"
    :style="containerStyle"
    @mousedown="startDrag"
    @touchstart="startDrag"
  >
    <div ref="modelRef" class="model-canvas"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, defineExpose } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const props = defineProps({
  modelUrl: {
    type: String,
    required: true,
    default: ''
  },
  modelType: {
    type: String,
    default: 'gltf', // 'gltf' 或 'fbx'
    validator: (value) => ['gltf', 'fbx'].includes(value)
  },
  size: {
    type: Number,
    default: 200
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
});

const containerRef = ref(null);
const modelRef = ref(null);

// 拖拽相关状态
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const currentPosition = ref({ x: props.position.x, y: props.position.y });

// Three.js 相关
let scene, camera, renderer, mixer, clock;
let model = null;
const animations = ref([]);
let currentAction = null;
let finishedListener = null;

const containerStyle = computed(() => ({
  position: 'fixed',
  left: `${currentPosition.value.x}px`,
  bottom: `${currentPosition.value.y}px`,
  width: `${props.size}px`,
  height: `${props.size}px`,
  cursor: isDragging.value ? 'grabbing' : 'grab',
  zIndex: 1000,
  userSelect: 'none'
}));

// 初始化Three.js场景
function initThreeJS() {
  // 创建场景
  scene = new THREE.Scene();
  scene.background = null; // 彻底透明

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    props.size / props.size,
    0.01,
    1000
  );
  camera.position.z = 7; // 拉远距离，避免动作裁剪

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ 
    alpha: true,
    antialias: true,
    premultipliedAlpha: false
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0); // 透明
  renderer.setClearAlpha?.(0);
  renderer.setSize(props.size, props.size);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // 添加到DOM
  if (modelRef.value) {
    modelRef.value.appendChild(renderer.domElement);
  }

  // 添加更亮的光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 4); // 更亮
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(10, 10, 10);
  directionalLight.castShadow = false;
  scene.add(directionalLight);

  // 初始化时钟（用于动画）
  clock = new THREE.Clock();
}

// 加载模型
function loadModel() {
  if (!props.modelUrl) {
    console.warn('模型URL未提供，显示默认几何体');
    createDefaultGeometry();
    return;
  }

  if (props.modelType === 'gltf') {
    const loader = new GLTFLoader();
    loader.load(
      props.modelUrl,
      (gltf) => {
        model = gltf.scene;
        scene.add(model);
        animations.value = gltf.animations;
        mixer = new THREE.AnimationMixer(model);
        playAnimation(1); // 默认播放动画2（index=1，待机）

        // 调整模型大小和位置
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 10 / maxDim; // 更大
        model.scale.setScalar(scale);

        // 居中模型
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));

        // 强制所有Mesh材质不透明并调亮，并加emissive
        model.traverse((child) => {
          if (child.isMesh) {
            if (child.material) {
              child.material.transparent = false;
              child.material.opacity = 1;
              if (child.material.color) child.material.color.set(0xffffff);
              if (child.material.emissive) child.material.emissive.set(0x444444);
            }
          }
        });

        console.log('GLTF模型加载成功');
      },
      (progress) => {
        console.log('加载进度:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('GLTF模型加载失败:', error);
        createDefaultGeometry();
      }
    );
  } else if (props.modelType === 'fbx') {
    const loader = new FBXLoader();
    loader.load(
      props.modelUrl,
      (fbx) => {
        model = fbx;
        scene.add(model);
        animations.value = fbx.animations;
        mixer = new THREE.AnimationMixer(model);
        playAnimation(1); // 默认播放动画2（index=1，待机）

        // 调整模型大小和位置
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 10 / maxDim; // 更大
        model.scale.setScalar(scale);

        // 居中模型
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));

        // 强制所有Mesh材质不透明并调亮，并加emissive
        model.traverse((child) => {
          if (child.isMesh) {
            if (child.material) {
              child.material.transparent = false;
              child.material.opacity = 1;
              if (child.material.color) child.material.color.set(0xffffff);
              if (child.material.emissive) child.material.emissive.set(0x444444);
            }
          }
        });

        console.log('FBX模型加载成功');
      },
      (progress) => {
        console.log('加载进度:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('FBX模型加载失败:', error);
        createDefaultGeometry();
      }
    );
  }
}

// 创建默认几何体（当模型加载失败时显示）
function createDefaultGeometry() {
  // 创建一个旋转的立方体作为占位符
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshLambertMaterial({ 
    color: 0x00ff88,
    transparent: true,
    opacity: 0.9
  });
  model = new THREE.Mesh(geometry, material);
  scene.add(model);
  
  // 添加简单的旋转动画
  const animate = () => {
    if (model) {
      model.rotation.x += 0.01;
      model.rotation.y += 0.01;
    }
    requestAnimationFrame(animate);
  };
  animate();
  
  console.log('显示默认几何体');
}

// 切换动画片段，支持只播一遍和结束回调
function playAnimation(index, once = false, onComplete = null) {
  if (!animations.value[index] || !mixer) return;
  if (currentAction) {
    currentAction.stop();
    // 移除旧的finished监听
    if (finishedListener) {
      mixer.removeEventListener('finished', finishedListener);
      finishedListener = null;
    }
  }
  currentAction = mixer.clipAction(animations.value[index]);
  currentAction.reset().play();
  if (once) {
    currentAction.setLoop(THREE.LoopOnce, 1);
    currentAction.clampWhenFinished = true;
    if (onComplete) {
      finishedListener = function () {
        onComplete();
        mixer.removeEventListener('finished', finishedListener);
        finishedListener = null;
      };
      mixer.addEventListener('finished', finishedListener);
    }
  } else {
    currentAction.setLoop(THREE.LoopRepeat);
    currentAction.clampWhenFinished = false;
    // 确保没有finished监听
    if (finishedListener) {
      mixer.removeEventListener('finished', finishedListener);
      finishedListener = null;
    }
  }
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);

  // 更新动画混合器
  if (mixer) {
    const delta = clock.getDelta();
    mixer.update(delta);
  }

  // 渲染场景
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// 拖拽功能
function startDrag(event) {
  event.preventDefault();
  isDragging.value = true;
  
  const rect = containerRef.value.getBoundingClientRect();
  const clientX = event.clientX || (event.touches && event.touches[0].clientX);
  const clientY = event.clientY || (event.touches && event.touches[0].clientY);
  
  dragOffset.value = {
    x: clientX - rect.left,
    y: clientY - rect.top
  };

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('touchmove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchend', stopDrag);
}

function onDrag(event) {
  if (!isDragging.value) return;
  
  event.preventDefault();
  const clientX = event.clientX || (event.touches && event.touches[0].clientX);
  const clientY = event.clientY || (event.touches && event.touches[0].clientY);
  
  const newX = window.innerWidth - clientX + dragOffset.value.x;
  const newY = window.innerHeight - clientY + dragOffset.value.y;
  
  // 限制在屏幕范围内
  currentPosition.value.x = Math.max(0, Math.min(window.innerWidth - props.size, newX));
  currentPosition.value.y = Math.max(0, Math.min(window.innerHeight - props.size, newY));
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchend', stopDrag);
}

// 窗口大小改变时调整
function handleResize() {
  if (camera && renderer) {
    camera.aspect = props.size / props.size;
    camera.updateProjectionMatrix();
    renderer.setSize(props.size, props.size);
  }
}

onMounted(() => {
  initThreeJS();
  loadModel();
  animate();
  
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  
  if (renderer) {
    renderer.dispose();
  }
  
  if (mixer) {
    mixer.stopAllAction();
  }
  
  if (modelRef.value && renderer) {
    modelRef.value.removeChild(renderer.domElement);
  }
});

defineExpose({ playAnimation });
</script>

<style scoped>
.floating-model-container {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: none;
  background: transparent !important;
  border: none;
  transition: none;
}

.floating-model-container:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.model-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
}

.model-canvas canvas {
  border-radius: 12px;
  background: transparent !important;
}
</style> 