import { reactive, readonly } from 'vue';
import * as XLSX from 'xlsx';

const state = reactive({
    loaded: false,
    error: null,
    rows: [],
    byQid: {}
});

const S3_BASE_URL = "https://cclcowcatresource.s3.ap-southeast-2.amazonaws.com";

async function loadExcel() {
    if (state.loaded) return;

    try {
        console.log('开始加载 Excel 文件...');
        console.log(S3_BASE_URL);
        const res = await fetch(`${S3_BASE_URL}/excel/output_filled.xlsx`);
        
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
            header: ['qid', 'title', 'text', 'audio1', 'audio2', 'type', 'date', 'extraMention', 'isQuestion', 'id'],
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

    } catch (err) {
        console.error('加载 Excel 文件失败:', err);
        state.error = err.message;
    }
}

export function useData() {
    return {
        loadExcel,
        data: readonly(state)
    };
}
