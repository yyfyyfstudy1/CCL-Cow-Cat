class GoogleDriveService {
    constructor() {
        this.rootFolderId = import.meta.env.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID;
        this.accessToken = null;
        this.clientIP = null;
    }

    // 获取客户端IP地址
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            // console.error('获取IP地址失败:', error);
            return 'unknown-ip';
        }
    }

    // 检查必需的环境变量是否都存在
    validateEnvironmentVariables() {
        const requiredEnvVars = [
            'VITE_GOOGLE_TYPE',
            'VITE_GOOGLE_PROJECT_ID',
            'VITE_GOOGLE_PRIVATE_KEY_ID',
            'VITE_GOOGLE_PRIVATE_KEY',
            'VITE_GOOGLE_CLIENT_EMAIL',
            'VITE_GOOGLE_CLIENT_ID',
            'VITE_GOOGLE_TOKEN_URI'
        ];

        const missingVars = requiredEnvVars.filter(varName => {
            const value = import.meta.env[varName];
            return value === undefined || value === null || value === '';
        });

        if (missingVars.length > 0) {
            throw new Error(`缺少必需的环境变量: ${missingVars.join(', ')}`);
        }
    }

    // 格式化日期为 "2024年03月21日" 格式
    formatFolderDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
    }

    // 格式化日期时间为 "20240321-1430" 格式
    formatFileName(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}${month}${day}-${hours}${minutes}`;
    }

    async initialize() {
        try {
            // 首先验证环境变量
            this.validateEnvironmentVariables();

            // 从环境变量获取服务账号信息
            const credentials = {
                type: import.meta.env.VITE_GOOGLE_TYPE,
                project_id: import.meta.env.VITE_GOOGLE_PROJECT_ID,
                private_key_id: import.meta.env.VITE_GOOGLE_PRIVATE_KEY_ID,
                private_key: (import.meta.env.VITE_GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
                client_email: import.meta.env.VITE_GOOGLE_CLIENT_EMAIL,
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                token_uri: import.meta.env.VITE_GOOGLE_TOKEN_URI
            };

            // 获取访问令牌
            const tokenResponse = await this.getAccessToken(credentials);
            this.accessToken = tokenResponse.access_token;
        } catch (error) {
            console.error('初始化 Google Drive 失败:', error);
            throw error;
        }
    }

    async getAccessToken(credentials) {
        const scope = 'https://www.googleapis.com/auth/drive.file';
        const jwt = await this.createJWT(credentials, scope);

        const response = await fetch(credentials.token_uri, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
        });

        if (!response.ok) {
            throw new Error('获取访问令牌失败');
        }

        return response.json();
    }

    async createJWT(credentials, scope) {
        const now = Math.floor(Date.now() / 1000);
        const expiry = now + 3600; // 1小时后过期

        const header = {
            alg: 'RS256',
            typ: 'JWT',
            kid: credentials.private_key_id
        };

        const claim = {
            iss: credentials.client_email,
            scope: scope,
            aud: credentials.token_uri,
            exp: expiry,
            iat: now
        };

        const headerStr = this.base64UrlEncode(JSON.stringify(header));
        const claimStr = this.base64UrlEncode(JSON.stringify(claim));
        const dataToSign = `${headerStr}.${claimStr}`;

        // 将PEM格式的私钥转换为CryptoKey
        const privateKey = await this.importPrivateKey(credentials.private_key);

        // 创建签名
        const signature = await window.crypto.subtle.sign(
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: { name: 'SHA-256' },
            },
            privateKey,
            new TextEncoder().encode(dataToSign)
        );

        // 将签名转换为Base64URL格式
        const signatureStr = this.base64UrlEncode(
            String.fromCharCode(...new Uint8Array(signature))
        );

        return `${headerStr}.${claimStr}.${signatureStr}`;
    }

    base64UrlEncode(str) {
        return btoa(str)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    async importPrivateKey(pemKey) {
        // 移除PEM头尾和换行符
        const pemContents = pemKey
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\n/g, '');

        // 解码Base64
        const binaryDer = atob(pemContents);
        const arrayBuffer = new Uint8Array(binaryDer.length);
        for (let i = 0; i < binaryDer.length; i++) {
            arrayBuffer[i] = binaryDer.charCodeAt(i);
        }

        // 导入密钥
        return window.crypto.subtle.importKey(
            'pkcs8',
            arrayBuffer,
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: { name: 'SHA-256' },
            },
            false,
            ['sign']
        );
    }

    async uploadAudio(audioBlob, filename) {
        if (!this.accessToken) {
            await this.initialize();
        }

        try {
            // 获取IP地址（如果还没有获取）
            if (!this.clientIP) {
                this.clientIP = await this.getClientIP();
            }

            // 获取当前日期作为子文件夹名（例如：2024年03月21日）
            const today = new Date();
            const dateFolderName = this.formatFolderDate(today);

            // 首先创建或获取IP文件夹
            const ipFolderId = await this.findOrCreateFolder(this.clientIP);

            // 然后在IP文件夹下创建或获取日期文件夹
            const dateFolderId = await this.findOrCreateFolder(dateFolderName, ipFolderId);

            // 生成文件名（例如：20240321-1430.wav）
            const baseFileName = this.formatFileName(today);
            const fullFileName = `${baseFileName}.wav`;

            // 创建文件元数据
            const metadata = {
                name: fullFileName,
                parents: [dateFolderId]  // 将文件放在日期文件夹下
            };

            // 创建 FormData
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', audioBlob);

            // 上传文件
            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    },
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('上传文件失败');
            }

            const result = await response.json();
            return {
                fileId: result.id,
                webViewLink: `https://drive.google.com/file/d/${result.id}/view`
            };
        } catch (error) {
            console.error('上传到 Google Drive 失败:', error);
            throw error;
        }
    }

    async findOrCreateFolder(folderName, parentFolderId = null) {
        try {
            // 构建查询条件
            let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;

            // 如果指定了父文件夹，在父文件夹中查找
            if (parentFolderId) {
                query += ` and '${parentFolderId}' in parents`;
            } else if (this.rootFolderId) {
                // 如果没有指定父文件夹，但有根文件夹ID，则在根文件夹中查找
                query += ` and '${this.rootFolderId}' in parents`;
            }

            // 查找文件夹
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('查找文件夹失败');
            }

            const result = await response.json();

            if (result.files.length > 0) {
                return result.files[0].id;
            }

            // 如果文件夹不存在，创建新文件夹
            const metadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: parentFolderId ? [parentFolderId] :
                        (this.rootFolderId ? [this.rootFolderId] : undefined)
            };

            const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            });

            if (!createResponse.ok) {
                throw new Error('创建文件夹失败');
            }

            const folder = await createResponse.json();
            return folder.id;
        } catch (error) {
            console.error('查找或创建文件夹失败:', error);
            throw error;
        }
    }
}

export const googleDriveService = new GoogleDriveService();
