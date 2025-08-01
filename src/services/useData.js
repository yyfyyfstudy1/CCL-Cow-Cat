import { reactive, readonly } from 'vue';
import * as XLSX from 'xlsx';

const state = reactive({
    loaded: false,
    error: null,
    rows: [],
    byQid: {},
    lastUpdated: null, // 添加最后更新时间
    isRefreshing: false // 添加刷新状态
});

const S3_BASE_URL = "https://cclcowcatresource.s3.ap-southeast-2.amazonaws.com";

// 检查是否需要强制刷新（超过1天）
function shouldForceRefresh() {
    const lastRefreshTime = localStorage.getItem('excel_last_refresh');
    if (!lastRefreshTime) {
        console.log('首次访问，需要刷新数据');
        return true; // 首次访问，需要刷新
    }
    
    const now = new Date().getTime();
    const lastRefresh = parseInt(lastRefreshTime);
    const oneDayInMs = 24 * 60 * 60 * 1000; // 1天的毫秒数
    const timeSinceLastRefresh = now - lastRefresh;
    
    console.log(`距离上次刷新: ${Math.round(timeSinceLastRefresh / (1000 * 60 * 60))} 小时`);
    
    if (timeSinceLastRefresh > oneDayInMs) {
        console.log('超过1天，需要刷新数据');
        return true;
    } else {
        console.log('未超过1天，使用缓存数据');
        return false;
    }
}

async function loadExcel(forceRefresh = false) {
    // 检查是否需要强制刷新
    const needsForceRefresh = forceRefresh || shouldForceRefresh();
    
    // 如果是强制刷新，重置状态
    if (needsForceRefresh) {
        state.loaded = false;
        state.error = null;
        state.rows = [];
        state.byQid = {};
        state.isRefreshing = true;
        
        // 记录刷新时间
        localStorage.setItem('excel_last_refresh', new Date().getTime().toString());
    }
    
    // 如果已经加载且不需要强制刷新，直接返回
    if (state.loaded && !needsForceRefresh) return;

    try {
        console.log('开始加载 Excel 文件...');
        console.log(S3_BASE_URL);
        
        // 添加时间戳参数避免浏览器缓存
        const timestamp = new Date().getTime();
        const res = await fetch(`${S3_BASE_URL}/excel/output_filled2.xlsx?t=${timestamp}`);

        if (!res.ok) {
            throw new Error(`Failed to fetch Excel file: ${res.status} ${res.statusText}`);
        }

        console.log('Excel 文件获取成功，开始解析...');
        const blob = await res.blob(); // 将响应转换为 Blob 对象
        const ab = await blob.arrayBuffer(); // 将 Blob 转换为 ArrayBuffer
        const wb = XLSX.read(ab, { type: 'array' });

        if (!wb.SheetNames.length) {
            throw new Error('Excel 文件中没有工作表');
        }

        console.log('工作表名称:', wb.SheetNames);
        const sheet = wb.Sheets[wb.SheetNames[0]];

        // 将 Excel 数据转换为数组，并指定列名
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: ['qid', 'title', 'text', 'audio1', 'audio2', 'type', 'date', 'extraMention', 'questionTag', 'id', 'isQuestion'],
            range: 1  // 跳过标题行
        });

        if (!rows.length) {
            throw new Error('Excel 工作表中没有数据');
        }

        console.log(`成功读取 ${rows.length} 行数据`);
        console.log('数据示例:', rows[0]);
        console.log('extraMention 示例:', rows[0]?.extraMention);

        // 过滤掉空行
        state.rows = rows.filter(row => row.qid && row.qid.toString().trim());

        // 按 qid 分组
        state.byQid = state.rows.reduce((acc, row) => {
            const qid = row.qid.toString().trim();
            if (!acc[qid]) {
                acc[qid] = [];
            }
            acc[qid].push(row);
            return acc;
        }, {});

        console.log(`数据已按 qid 分组，共 ${Object.keys(state.byQid).length} 个题目`);
        state.loaded = true;
        state.lastUpdated = new Date().toLocaleString('zh-CN');
        state.isRefreshing = false;

    } catch (err) {
        console.error('加载 Excel 文件失败:', err);
        state.error = err.message;
        state.isRefreshing = false;
    }
}

// 添加一个强制刷新Excel数据的函数
async function refreshExcel() {
    return await loadExcel(true);
}

export function useData() {
    return {
        loadExcel,
        refreshExcel,
        data: readonly(state)
    };
}
