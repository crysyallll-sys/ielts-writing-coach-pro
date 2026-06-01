import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

/**
 * Extracts JSON candidate strings from model output using multiple fallback patterns.
 */
function extractAllJSONCandidates(text: string): string[] {
  if (!text) return [];

  const candidates: string[] = [];

  for (const match of Array.from(text.matchAll(/```json\s*\n?([\s\S]*?)\n?\s*```/gi))) {
    if (match[1]) candidates.push(match[1].trim());
  }

  for (const match of Array.from(text.matchAll(/```\s*\n?([\s\S]*?)\n?\s*```/gi))) {
    if (match[1]) candidates.push(match[1].trim());
  }

  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    const range = extractBalancedBraces(text.slice(firstBrace));
    if (range) candidates.push(range);
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      candidates.push(trimmed);
    }
  }

  return Array.from(new Set(candidates));
}

/**
 * Extracts a balanced {...} substring starting at the given offset.
 */
function extractBalancedBraces(text: string): string | null {
  if (!text || text[0] !== '{') return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.substring(0, i + 1);
      }
    }
  }

  return null;
}

/**
 * Deep-clean a raw JSON string so JSON.parse() can succeed.
 */
function deepCleanJSON(jsonString: string): string {
  if (!jsonString) return '';

  let s = jsonString;

  s = s.replace(/[\uFEFF\u200B\u2060\u180E]/g, '');
  s = s.replace(/^```json\s*/gim, '');
  s = s.replace(/^```\s*/gim, '');
  s = s.replace(/```$/gim, '');
  s = s.replace(/[\r\n]+/g, ' ');
  s = s.replace(/[\x00-\x1F\x7F]/g, '');
  s = s.replace(/,\s*([\]}])/g, '$1');
  s = fixInnerQuotes(s);
  s = s.replace(/:\s*'([^']*)'/g, ': "$1"');
  s = s.replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":');
  s = s.replace(/([\w]+):/g, '"$1":');

  const startIdx = s.indexOf('{');
  const endIdx = s.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    s = s.substring(startIdx, endIdx + 1);
  } else {
    return '';
  }

  s = s.replace(/:\s*([a-zA-Z_][^\s,}]*)(\s*[,}])/g, ': "$1"$2');
  s = s.replace(/`/g, '');
  s = s.replace(/\s+/g, ' ');

  return s.trim();
}

/**
 * Iterates character-by-character, rebuilding with inner quotes fixed.
 */
function fixInnerQuotes(s: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < s.length) {
    if (s[i] === '"') {
      result.push('"');
      i++;
      const inString = true;

      while (i < s.length && inString) {
        if (s[i] === '\\') {
          result.push(s[i]);
          result.push(s[i + 1] || '');
          i += 2;
          continue;
        }

        if (s[i] === '"') {
          result.push('"');
          i++;
          break;
        }

        if (s[i] === '"') {
          result.push('\\"');
          i++;
          continue;
        }

        result.push(s[i]);
        i++;
      }
    } else {
      result.push(s[i]);
      i++;
    }
  }

  return result.join('');
}

/**
 * Truncates to the last position where } or ] appears AND depth is balanced.
 */
function truncateBalanced(text: string): string {
  if (!text) return '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastValidEnd = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        lastValidEnd = i;
        break;
      }
    }
  }

  if (lastValidEnd > 0) {
    return text.substring(0, lastValidEnd + 1);
  }

  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const cutoff = Math.max(lastBrace, lastBracket);
  return cutoff > 0 ? text.substring(0, cutoff + 1) : '';
}

/**
 * Tries to parse text as JSON; applies deep cleaning + multiple strategies.
 */
function robustParse(text: string): {
  parsed: unknown | null;
  error: string | null;
  debugInfo: {
    strategiesAttempted: string[];
    finalPreview: string;
  };
} {
  const strategiesAttempted: string[] = [];

  const tryParse = (candidate: string, label: string): unknown | null => {
    strategiesAttempted.push(label);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  };

  let result = tryParse(text, 'raw');
  if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: text.substring(0, 200) } };

  const candidates = extractAllJSONCandidates(text);
  for (const c of candidates) {
    result = tryParse(c, `extract(${c.substring(0, 30)}...)`);
    if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: c.substring(0, 200) } };

    const cleaned = deepCleanJSON(c);
    result = tryParse(cleaned, `deepClean(${cleaned.substring(0, 30)}...)`);
    if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: cleaned.substring(0, 200) } };

    const truncated = truncateBalanced(cleaned);
    result = tryParse(truncated, `truncate(${truncated.substring(0, 30)}...)`);
    if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: truncated.substring(0, 200) } };
  }

  const deepCleanedFull = deepCleanJSON(text);
  result = tryParse(deepCleanedFull, 'deepClean(full)');
  if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: deepCleanedFull.substring(0, 200) } };

  const truncated = truncateBalanced(text);
  result = tryParse(truncated, 'truncate(full)');
  if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: truncated.substring(0, 200) } };

  const truncatedCleaned = truncateBalanced(deepCleanedFull);
  result = tryParse(truncatedCleaned, 'truncate(deepCleaned)');
  if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: truncatedCleaned.substring(0, 200) } };

  return {
    parsed: null,
    error: `All ${strategiesAttempted.length} strategies failed`,
    debugInfo: { strategiesAttempted, finalPreview: text.substring(0, 200) }
  };
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
      fs.readFileSync(process.cwd() + '/src/prompts/round2_system.txt', 'utf-8')
    ).catch(() => null);

    const userPrompt = `Please evaluate the following IELTS Writing Task 2 response.

**Question/Prompt:**
${question}

**User's Answer:**
${user_answer}

Provide your evaluation in JSON format only. Do NOT include any Markdown formatting, explanatory text, or anything outside the JSON object. Your response must be a valid JSON object starting with { and ending with }.`;

    console.log('【reevaluate】开始调用模型 API...');
    const response = await openai.chat.completions.create({
      model: 'qwen3.7-max',
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt || 'You are an expert IELTS Writing examiner. IMPORTANT: Output ONLY valid JSON, no markdown, no explanation.' },
        { role: 'user', content: userPrompt }
      ]
    });

    const responseText = response.choices[0]?.message?.content || '';

    console.log('【reevaluate】模型返回原始内容:');
    console.log(responseText);
    console.log('【reevaluate】模型响应 finish_reason:', response.choices[0]?.finish_reason);

    const { parsed, error, debugInfo } = robustParse(responseText);

    if (!parsed) {
      console.error('【reevaluate】所有 JSON 解析策略均失败');
      console.error('【reevaluate】错误:', error);
      console.error('【reevaluate】尝试过的策略:', debugInfo.strategiesAttempted.join(', '));
      console.error('【reevaluate】最终预览:', debugInfo.finalPreview);

      return NextResponse.json({
        success: false,
        error: '模型响应格式异常，请重试',
        debug_info: {
          strategiesAttempted: debugInfo.strategiesAttempted,
          lastError: error,
          preview: debugInfo.finalPreview,
          responseLength: responseText.length,
          responseStartsWith: responseText.substring(0, 500)
        }
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user_answer,
        grading_result: parsed,
        metadata: {
          question_type: 'round2',
          processing_time_ms: Date.now() - startTime,
          model_used: 'qwen3.7-max'
        }
      }
    });
  } catch (error) {
    console.error('【reevaluate】API 错误详情:', error);
    console.error('【reevaluate】错误堆栈:', error instanceof Error ? error.stack : 'no stack');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 200 });
  }
}