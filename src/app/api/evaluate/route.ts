import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || '[https://dashscope.aliyuncs.com/compatible-mode/v1](https://dashscope.aliyuncs.com/compatible-mode/v1)',
});

// 安全解析大模型返回的 JSON 数据
function parseJSONSafely(text: string): unknown | null {
  try {
    // 1. 优先策略：因为开启了 json_object 模式，直接去除两端空白进行解析
    const trimmed = text.trim();
    return JSON.parse(trimmed);
  } catch (e) {
    console.log('【evaluate】直接 JSON.parse 失败，尝试提取 {} 核心区间...', e);
    try {
      // 2. 兜底策略一：防止模型前后夹带了极少数解释性文本，强行截取第一个 { 到最后一个 }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
      }
    } catch (e2) {
      console.error('【evaluate】基础截取解析依然失败:', e2);
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { question, user_answer } = body;

    if (!question || !user_answer) {
      return NextResponse.json(
        { success: false, error: 'Missing question or user_answer' },
        { status: 400 }
      );
    }

    const systemPrompt = await import('fs').then(fs =>
      fs.readFileSync(process.cwd() + '/src/prompts/round1_system.txt', 'utf-8')
    ).catch(() => null);

    const userPrompt = `Please evaluate the following IELTS Writing Task 1 response.

**Question/Prompt:**
${question}

**User's Answer:**
${user_answer}

Provide your evaluation in JSON format.`;

    console.log('【evaluate】开始调用模型 API...');
    const response = await openai.chat.completions.create({
      model: 'qwen3.7-max',
      max_tokens: 4096,
      temperature: 0.1, // 降低随机性，让模型严格按照 JSON 结构输出
      response_format: { type: 'json_object' }, // 强制模型输出纯 JSON 字符串
      messages: [
        { role: 'system', content: systemPrompt || 'You are an expert IELTS Writing examiner.' },
        { role: 'user', content: userPrompt }
      ]
    });

    const responseText = response.choices[0]?.message?.content || '';

    console.log('【evaluate】模型返回原始内容:');
    console.log(responseText);
    console.log('【evaluate】模型响应 finish_reason:', response.choices[0]?.finish_reason);

    // 运行优化后的安全解析逻辑
    let parsedResult = parseJSONSafely(responseText);

    // 3. 兜底策略二：如果前面都失败了，且文本包含 {，说明可能存在格式微损，进行最后的正则纠错防线
    if (!parsedResult && responseText.includes('{')) {
      console.log('【evaluate】核心解析失败，启动终极正则修复防线...');
      const start = responseText.indexOf('{');
      const end = responseText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        try {
          const jsonStr = responseText.substring(start, end + 1);
          const fixed = jsonStr
            .replace(/,[\s\r\n]*([\]}])/g, '$1') // 移除数组或对象末尾多余的非规范逗号
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // 补全漏掉的双引号键名
            .replace(/:\s*'([^']*)'/g, ': "$1"'); // 将非规范的单引号值转换为双引号
          parsedResult = JSON.parse(fixed);
          console.log('【evaluate】终极正则修复成功！');
        } catch (finalError) {
          console.error('【evaluate】终极修复依然失败:', finalError);
        }
      }
    }

    if (!parsedResult) {
      console.error('【evaluate】所有 JSON 解析策略均失败');
      return NextResponse.json({
        success: false,
        error: 'Failed to parse model response',
        raw_response: responseText.substring(0, 2000)
      }, { status: 500 });
    }

    console.log('【evaluate】最终返回成功结果');

    return NextResponse.json({
      success: true,
      data: {
        user_answer,
        grading_result: parsedResult,
        metadata: {
          question_type: 'round1',
          processing_time_ms: Date.now() - startTime,
          model_used: 'qwen3.7-max'
        }
      }
    });
  } catch (error) {
    console.error('【evaluate】API 错误详情:', error);
    console.error('【evaluate】错误堆栈:', error instanceof Error ? error.stack : 'no stack');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}