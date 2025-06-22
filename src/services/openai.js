const LAMBDA_URL = import.meta.env.VITE_LAMBDA_URL;

// 通用重试函数
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // 最后一次尝试失败，抛出错误
      }
      
      // 计算延迟时间（指数退避）
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`API请求失败，${delay}ms后进行第${attempt + 1}次重试:`, error.message);
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function checkTranslation(original, translation) {
  return retryWithBackoff(async () => {
    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: 'chat',
        original,
        translation
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  });
}

export async function transcribeAudio(audioBlob, language, prompt) {
  return retryWithBackoff(async () => {
    // 将音频文件转换为base64
    const base64Audio = await fileToBase64(audioBlob);

    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: 'transcription',
        audio: base64Audio,
        language,
        prompt
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.text;
  });
}

// 新增：获取笔记智能提示
export async function getNoteSuggestions(originalText, translationText, aiCheckResult, currentNoteText = '') {
  return retryWithBackoff(async () => {
    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: 'noteSuggestions',
        originalText,
        translationText,
        aiCheckResult,
        currentNoteText
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  });
}

// 新增：获取智能补全
export async function getSmartCompletion(originalText, translationText, aiCheckResult, currentInput = '') {
  return retryWithBackoff(async () => {
    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: 'smartCompletion',
        originalText,
        translationText,
        aiCheckResult,
        currentInput
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  });
}

// 辅助函数：将文件转换为base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // 移除 Data URL 前缀（例如："data:audio/mpeg;base64,"）
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// 辅助函数：将base64转换为Blob
function base64ToBlob(base64, type = 'application/octet-stream') {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}
