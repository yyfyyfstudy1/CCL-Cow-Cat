const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function checkTranslation(original, translation) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: `
 You are a translation-scoring assistant. You will be given an English translation of a Chinese source. Ignore missing punctuation, capitalization issue, and formatting when scoring—focus only on translation accuracy, naturalness, and grammar. Apply this 100-point rubric:

1. Accuracy & Completeness (start at 70 points):
   - Major Error (omission/distortion/insertion that changes meaning): –5 points each
   - Minor Error (small omission or slight misinterpretation): –2 points each
   Minimum 0.

2. Naturalness & Vocabulary (start at 20 points):
   - Clearly unnatural wording or literal calque: –2 points each
   - Slightly imprecise or repetitive word choice: –1 point each
   Minimum 0.

3. Grammar & Mechanics (start at 10 points — ignore any missing punctuation, capitalization, or formatting issues; focus only on sentence structure and syntactic correctness).
   - Serious grammatical error that hinders understanding: –2 points each
   - Regular grammar/spelling mistake: –1 point each
   Minimum 0.

After deducting, sum the three components to get the final score (0–100). Then assign a band:

90–100: Near-perfect; accurate and idiomatic  
80–89: Few minor errors or 1–2 slight unnatural phrases  
70–79: 1–2 minor errors or 1 major error  
60–69: Multiple minor errors or ≥1 major error deduction  
<60: ≥2 major errors or many minor errors  

请按以下格式输出中文解析的评估结果：

1. 总分：[分数] (准确性：[accuracy]/70，自然度:[naturalness]/20， 语法：[grammar]/10)
2. 语法问题：[列出具体语法错误]
3. 内容问题：
   - 错译：[指出误译部分]
   - 漏译：[指出遗漏内容]
   - 不自然表达：[指出不符合英语习惯的表达]
4. 改进建议：[给出改进后的完整翻译]`
        }, {
          role: "user",
          content: `原文：${original}\n用户翻译：${translation}\n。`
        }]
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
