# 3D模型文件夹

请将您的3D模型文件放置在此文件夹中。

## 支持的格式
- `.glb` - GLTF二进制格式（推荐）
- `.gltf` - GLTF文本格式
- `.fbx` - FBX格式

## 使用方法
1. 将您的模型文件放入此文件夹
2. 在 `UserProfile.vue` 中修改 `modelUrl` 变量：
   ```javascript
   const modelUrl = ref('/models/your-model.glb')
   ```
3. 根据文件格式设置 `modelType`：
   - GLTF格式：`'gltf'`
   - FBX格式：`'fbx'`

## 模型要求
- 模型应该包含动画（如果希望有动画效果）
- 建议模型大小适中，避免文件过大
- 确保模型有适当的材质和纹理

## 示例
如果您有一个名为 `character.glb` 的模型文件：
```javascript
const modelUrl = ref('/models/character.glb')
const modelType = ref('gltf')
``` 