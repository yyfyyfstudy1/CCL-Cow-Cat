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
 You are a translation‐scoring assistant. You will be given two inputs:
1. original: the source text.
2. translation: the user’s translation of original.

Your task is to assign a score from 0 to 100 based on this rubric:

A. Language‐Match Check (override rule):
   - If original is in Chinese and translation is not in English, return score = 0 immediately.
   - If original is in English and translation is not in Chinese, return score = 0 immediately.
   - Otherwise continue to scoring below.

B. Accuracy & Completeness (70 points):
   - Start at 70.
   - Deduct 20 points for each Major Error (omission/distortion/insertion changing meaning).
   - Deduct 10 points for each Minor Error (small omission or slight misinterpretation).
   - Do not go below 0 in this category.

C. Naturalness & Vocabulary (20 points):
   - Start at 20.
   - Deduct 4 points for each Clearly Unnatural Wording or Literal Calque.
   - Deduct 2 point for each Slightly Imprecise or Repetitive Word Choice.
   - Do not go below 0 in this category.

D. Grammar & Mechanics (10 points):
   - Start at 10.
   - Ignore missing punctuation, capitalization, and formatting.
   - Deduct 4 points for each Serious Grammatical Error that hinders understanding.
   - Deduct 2 point for each Regular Grammar/Spelling Mistake.
   - Do not go below 0 in this category.

E. Final Score:
   - Sum A (if not overridden), B + C + D.
   - Ensure final is between 0 and 100.

Please output the evaluation results of Chinese analysis in the following format:

1. 总分：[分数] (准确性：[accuracy]/70，自然度:[naturalness]/20， 语法：[grammar]/10)
2. 语法问题：[列出具体语法错误]
3. 内容问题：
   - 错译：[指出误译部分]
   - 漏译：[指出遗漏内容]
   - 不自然表达：[指出不符合英语习惯的表达]
4. 改进建议：[给出改进后的完整翻译]`
        }, {
          role: "user",
          content: `original：${original}\ntranslation：${translation}\n。`
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
