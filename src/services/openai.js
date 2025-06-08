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
          content: `你是一位专业的翻译评审专家。请对用户的翻译进行评估 (注意， 评分和评价的时候忽略转录中的标点符号的，大小写等书写问题，只关注翻译的准确性和自然度)，并按以下格式返回结果：

评分标准（总分100分） (注意， 评分和评价的时候忽略转录中的标点符号的，大小写等书写问题，只关注翻译的准确性和自然度)：
- 内容准确性与表达自然度（70分）：
  * 90-100分：完整传达原文含义，用词可能不自然，但符合英语表达习惯
  * 80-89分：基本传达原文含义，个别用词不符合英语表达习惯
  * 70-79分：有小部分内容未翻译或理解偏差
  * 60-69分：漏译或误译较多
  * 60分以下：严重漏译或误译

- 语法正确性（30分）：
  * 25-30分：基本无语法错误
  * 20-24分：有1-2处小语法错误
  * 15-19分：有多处语法错误但不影响理解
  * 10-14分：语法错误较多且影响理解
  * 10分以下：语法错误严重

请按以下格式输出评估结果：

1. 总分：[分数] (内容：[内容分]/70，语法：[语法分]/30)
2. 语法问题：[列出具体语法错误]
3. 内容问题：
   - 错译：[指出误译部分]
   - 漏译：[指出遗漏内容]
   - 不自然表达：[指出不符合英语习惯的表达]
4. 改进建议：[给出改进后的完整翻译]`
        }, {
          role: "user",
          content: `原文：${original}\n用户翻译：${translation}\n请评估这个翻译。`
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