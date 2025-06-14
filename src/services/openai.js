const LAMBDA_URL = import.meta.env.VITE_LAMBDA_URL;

export async function checkTranslation(original, translation) {
  try {
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
  } catch (error) {
    console.error('Lambda API error:', error);
    throw error;
  }
}

export async function transcribeAudio(audioBlob, language, prompt) {
  try {
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
  } catch (error) {
    console.error('Lambda API error:', error);
    throw error;
  }
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
