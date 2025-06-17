const LAMBDA_UPLOAD_URL = import.meta.env.VITE_LAMBDA_UPLOAD_URL; // 您的Lambda函数URL

// 获取客户端IP地址（可重用）
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('获取IP地址失败:', error);
        return 'unknown-ip';
    }
}

/**
 * 将音频 Blob 上传到 AWS Lambda，由 Lambda 转发到 Google Drive
 * @param {Blob} audioBlob 音频 Blob 数据
 * @param {string} filename 文件名
 * @returns {Promise<{fileId: string, webViewLink: string}>} 上传文件的信息
 */
export async function uploadAudioToLambda(audioBlob, filename) {
    if (!LAMBDA_UPLOAD_URL) {
        throw new Error('Lambda 上传 URL 未配置。请在 .env 文件中设置 VITE_LAMBDA_UPLOAD_URL。');
    }

    try {
        // 将 Blob 转换为 Base64 字符串
        const reader = new FileReader();
        const base64Audio = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
                // 移除Data URL前缀 (e.g., "data:audio/webm;base64,")
                resolve(reader.result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });

        const clientIP = await getClientIP();

        const payload = {
            audioBase64: base64Audio,
            filename: filename,
            clientIP: clientIP
        };

        const response = await fetch(LAMBDA_UPLOAD_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Lambda 上传失败: ${errorData.message || '未知错误'}`);
        }

        const result = await response.json();

        if (result.fileId && result.webViewLink) {
            return { fileId: result.fileId, webViewLink: result.webViewLink };
        } else {
            throw new Error(`Lambda 返回数据无效: ${JSON.stringify(result)}`);
        }

    } catch (error) {
        console.error('通过 Lambda 上传音频失败:', error);
        throw error;
    }
}

// 导出 GoogleDriveService 实例，但现在它是一个空对象或不再需要
// export const googleDriveService = new GoogleDriveService();
