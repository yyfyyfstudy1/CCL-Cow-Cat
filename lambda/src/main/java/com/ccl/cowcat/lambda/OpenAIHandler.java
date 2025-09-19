package com.ccl.cowcat.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import java.io.IOException;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class OpenAIHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {
    private static final String OPENAI_API_KEY = System.getenv("OPENAI_API_KEY");
    private static final String CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
    private static final String TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
    private static final String WHISPER_URL = "https://api.openai.com/v1/audio/speech";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final OkHttpClient client = new OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build();

    @Override
    public Map<String, Object> handleRequest(Map<String, Object> input, Context context) {
        try {
            // 1) 拿到原始 body 字符串
            String rawBody = (String) input.get("body");
            if (rawBody == null) {
                throw new IllegalArgumentException("Missing HTTP body");
            }

            // 2) 把 JSON body 转成 Map
            Map<String,Object> payload = objectMapper.readValue(
                    rawBody, new TypeReference<Map<String,Object>>(){});

            // 3) 从 payload 拿真正的参数
            String endpoint = (String) payload.get("endpoint");
            if (endpoint == null) {
                throw new IllegalArgumentException("endpoint parameter is required");
            }

            switch (endpoint) {
                case "chat":
                    return handleChatCompletions(payload);
                case "transcription":
                    return handleTranscription(payload);
                case "whisper":
                    return handleWhisper(payload);
                case "noteSuggestions":
                    return handleNoteSuggestions(payload);
                case "smartCompletion":
                    return handleSmartCompletion(payload);
                case "notesSummary":
                    return handleNotesSummary(payload);
                default:
                    throw new IllegalArgumentException("Unsupported endpoint: " + endpoint);
            }
        } catch (IOException e) {
            throw new RuntimeException("Error calling OpenAI API", e);
        }
    }

    private Map<String, Object> handleChatCompletions(Map<String, Object> input) throws IOException {
        // 构建请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-4o");

        // 构建消息数组
        Map<String, String> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content", getSystemPrompt());

        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", String.format("original：%s\ntranslation：%s\n。",
            input.get("original"),
            input.get("translation")));

        requestBody.put("messages", new Object[]{systemMessage, userMessage});

        // 发送请求到OpenAI
        Request request = new Request.Builder()
            .url(CHAT_COMPLETIONS_URL)
            .addHeader("Authorization", "Bearer " + OPENAI_API_KEY)
            .addHeader("Content-Type", "application/json")
            .post(RequestBody.create(objectMapper.writeValueAsString(requestBody),
                MediaType.parse("application/json")))
            .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            return objectMapper.readValue(responseBody, Map.class);
        }
    }

    private Map<String, Object> handleTranscription(Map<String, Object> input) throws IOException {
        // 获取音频文件的base64编码
        String audioBase64 = (String) input.get("audio");
        if (audioBase64 == null) {
            throw new IllegalArgumentException("audio parameter is required for transcription");
        }

        // 获取语言和提示词参数
        String language = (String) input.get("language");
        String prompt = (String) input.get("prompt");

        // 构建multipart请求
        MultipartBody.Builder builder = new MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", "audio.mp3",
                RequestBody.create(MediaType.parse("audio/mpeg"),
                    java.util.Base64.getDecoder().decode(audioBase64)))
            .addFormDataPart("model", "whisper-1")
            .addFormDataPart("response_format", "text");

        // 添加可选参数
        if (language != null) {
            builder.addFormDataPart("language", language);
        }
        if (prompt != null) {
            builder.addFormDataPart("prompt", prompt);
        }

        // 发送请求到OpenAI
        Request request = new Request.Builder()
            .url(TRANSCRIPTIONS_URL)
            .addHeader("Authorization", "Bearer " + OPENAI_API_KEY)
            .post(builder.build())
            .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            Map<String, Object> result = new HashMap<>();
            result.put("text", responseBody);
            return result;
        }
    }

    private Map<String, Object> handleWhisper(Map<String, Object> input) throws IOException {
        // 构建请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "tts-1");
        requestBody.put("input", input.get("text"));
        requestBody.put("voice", input.get("voice"));
        requestBody.put("response_format", "mp3");

        // 发送请求到OpenAI
        Request request = new Request.Builder()
            .url(WHISPER_URL)
            .addHeader("Authorization", "Bearer " + OPENAI_API_KEY)
            .addHeader("Content-Type", "application/json")
            .post(RequestBody.create(objectMapper.writeValueAsString(requestBody),
                MediaType.parse("application/json")))
            .build();

        try (Response response = client.newCall(request).execute()) {
            // 将音频数据转换为base64
            byte[] audioBytes = response.body().bytes();
            String base64Audio = java.util.Base64.getEncoder().encodeToString(audioBytes);

            Map<String, Object> result = new HashMap<>();
            result.put("audio", base64Audio);
            return result;
        }
    }

    private Map<String, Object> handleNoteSuggestions(Map<String, Object> input) throws IOException {
        // 构建请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-4o");

        // 构建消息数组
        Map<String, String> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content", getNoteSuggestionsSystemPrompt());

        String originalText = (String) input.get("originalText");
        String translationText = (String) input.get("translationText");
        String aiCheckResult = (String) input.get("aiCheckResult");
        String currentNoteText = (String) input.get("currentNoteText");

        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", String.format("原文：%s\n参考翻译：%s\nAI评估结果：%s\n当前笔记内容：%s",
            originalText != null ? originalText : "",
            translationText != null ? translationText : "",
            aiCheckResult != null ? aiCheckResult : "",
            currentNoteText != null ? currentNoteText : ""));

        requestBody.put("messages", new Object[]{systemMessage, userMessage});

        // 发送请求到OpenAI
        Request request = new Request.Builder()
            .url(CHAT_COMPLETIONS_URL)
            .addHeader("Authorization", "Bearer " + OPENAI_API_KEY)
            .addHeader("Content-Type", "application/json")
            .post(RequestBody.create(objectMapper.writeValueAsString(requestBody),
                MediaType.parse("application/json")))
            .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            return objectMapper.readValue(responseBody, Map.class);
        }
    }

    private Map<String, Object> handleSmartCompletion(Map<String, Object> input) throws IOException {
        // 构建请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-4o-mini");

        // 构建消息数组
        Map<String, String> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content", getSmartCompletionSystemPrompt());

        String originalText = (String) input.get("originalText");
        String translationText = (String) input.get("translationText");
        String aiCheckResult = (String) input.get("aiCheckResult");
        String currentInput = (String) input.get("currentInput");

        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", String.format("原文：%s\n参考翻译：%s\nAI评估结果：%s\n用户当前输入：%s",
            originalText != null ? originalText : "",
            translationText != null ? translationText : "",
            aiCheckResult != null ? aiCheckResult : "",
            currentInput != null ? currentInput : ""));

        requestBody.put("messages", new Object[]{systemMessage, userMessage});

        // 发送请求到OpenAI
        Request request = new Request.Builder()
            .url(CHAT_COMPLETIONS_URL)
            .addHeader("Authorization", "Bearer " + OPENAI_API_KEY)
            .addHeader("Content-Type", "application/json")
            .post(RequestBody.create(objectMapper.writeValueAsString(requestBody),
                MediaType.parse("application/json")))
            .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            return objectMapper.readValue(responseBody, Map.class);
        }
    }

    private Map<String, Object> handleNotesSummary(Map<String, Object> input) throws IOException {
        // 1. 获取 notes 数组
        Object notesObj = input.get("notes");
        if (notesObj == null || !(notesObj instanceof List)) {
            throw new IllegalArgumentException("notes 数组参数缺失或格式错误");
        }
        List<Map<String, Object>> notes = (List<Map<String, Object>>) notesObj;

        // 2. 拼接 prompt
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("你是一个学习笔记整理助手。请根据以下每条笔记的原文、翻译和用户笔记内容，帮用户总结本页的学习重点、易错点、表达亮点和建议，输出为结构化的中文 markdown，总结要条理清晰、分点罗列，适合直接作为学习复盘笔记。");
        for (int i = 0; i < notes.size(); i++) {
            Map<String, Object> n = notes.get(i);
            promptBuilder.append("\n\n【笔记").append(i + 1).append("】\n原文：")
                .append(n.getOrDefault("dialogOriginal", "")).append("\n翻译：")
                .append(n.getOrDefault("dialogTranslation", "")).append("\n我的笔记：")
                .append(n.getOrDefault("text", ""));
        }
        String prompt = promptBuilder.toString();

        // 3. 构建 OpenAI 请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-4o");

        Map<String, String> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content", "你是一个学习笔记整理助手，擅长将多条学习笔记内容总结为结构化、条理清晰的中文 markdown，总结要突出重点、易错点、表达亮点和建议。");

        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", prompt);

        requestBody.put("messages", new Object[]{systemMessage, userMessage});

        // 4. 发送请求到OpenAI
        Request request = new Request.Builder()
            .url(CHAT_COMPLETIONS_URL)
            .addHeader("Authorization", "Bearer " + OPENAI_API_KEY)
            .addHeader("Content-Type", "application/json")
            .post(RequestBody.create(objectMapper.writeValueAsString(requestBody),
                MediaType.parse("application/json")))
            .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            return objectMapper.readValue(responseBody, Map.class);
        }
    }

    private String getSystemPrompt() {
        return """
You are a translation‐scoring assistant. You will be given two inputs:
1. original: the source text.
2. translation: the user's translation of original.

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
4. 改进建议：[给出改进后的完整翻译]""";
    }

    private String getNoteSuggestionsSystemPrompt() {
        return """
You are a note-suggesting assistant for language learning. You will be given four inputs:
1. originalText: the source text.
2. translationText: the user's translation of originalText.
3. aiCheckResult: the result of AI checking the translation.
4. currentNoteText: the current content of the note.

Your task is to suggest multiple note completions based on the given inputs. The suggestions should help the user learn from their translation practice.

Guidelines for note suggestions:
1. Focus on key learning points from the AI assessment
2. Highlight grammar mistakes, vocabulary issues, or translation problems
3. Provide specific examples and corrections
4. Include useful phrases or expressions to remember
5. Keep each suggestion concise but informative
6. If there are no significant issues, suggest general learning tips
7. Provide 3-5 different suggestions, each on a separate line

Please output the suggested notes in the following format:

笔记内容：语法错误：注意时态一致性，这里应该用过去时而不是现在时
笔记内容：词汇学习：记住"take care of"这个常用短语，表示"照顾、处理"
笔记内容：表达改进：可以用更自然的表达方式，比如"make sure to"代替"ensure"

Each suggestion should be in Chinese and should be directly usable as a learning note. Provide different types of suggestions (grammar, vocabulary, expression, etc.) to give users variety.""";
    }

    private String getSmartCompletionSystemPrompt() {
        return """
You are a smart completion assistant for language learning. You will be given four inputs:
1. originalText: the source text.
2. translationText: the user's translation of originalText.
3. aiCheckResult: the result of AI checking the translation (may be empty).
4. currentInput: the text the user is currently typing.

Your task is to provide smart completion suggestions based on the user's input and the available context.

Guidelines for smart completion:
1. Analyze the user's current input to understand what they're trying to write
2. If aiCheckResult is available, use it to identify translation errors or missing content
3. If aiCheckResult is empty, analyze the originalText and translationText to identify potential learning points
4. Look for common translation patterns, vocabulary, or grammar points from the text
5. Guess the user's intention and provide the most likely completion to help the user write the correct note
6. Provide completion for professional vocabulary that appears in the context
7. Focus on correcting translation errors, providing missing translations, or highlighting learning points
8. Keep the completion concise and relevant to the current input

Examples:
- If the user types "trauma", and there is a noun "trauma insurance" in the context, suggest "trauma insurance"
- If the user types "社区居家", and there is a noun "社区居家护士" in the context, suggest "社区居家护士"
- If user types "family reunion visa" and this was mistranslated in translationText, suggest "应该翻译为家庭团聚签证"
- If user types "basic groceries" and this was mistranslated in translationText, suggest "应该翻译为基本的生活用品"
- If user types "Surely you've thoughts" this was mistranslated in translationText, suggest "表达的是我相信你已经有一些好的主意了"
- If user types "连锁超市" and this was mistranslated in translationText, suggest "应该翻译为chain supermarkets"
- If user types "创伤保险" and this was mistranslated in translationText, suggest "应该翻译为Trauma Insurance"
- If user types "心脏病" and this was mistranslated in translationText, suggest "应该翻译为heart disease"
- If user types "为什么使用complicated" and this is translated as "complex" in translationText, suggest "complex 描述本质上多层次、多要素的系统、现象或问题, 例如complex relationship"
- If the user enters "为什么使用retain" and it is translated as "remain" in translationText, it is suggested that "retain 表示保留、继续拥有，例如 retain ownership；remain 强调状态保持不变"
- If user types "给我一些as soon as possible的例子" and suggests some examples of how to use this phrase
- If the user enters "总结词汇", all professional vocabulary in the entire sentence will be listed


Please output ONLY the completion text, nothing else. If no relevant completion is needed, return empty string.

The completion should be in Chinese and should directly follow the user's current input.""";
    }
}