import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Round2GradingResult } from '@/types/ielts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
});

/**
 * Extracts JSON candidate strings from model output using multiple fallback patterns.
 * Returns an array of candidates sorted by extraction confidence (best first).
 */
function extractAllJSONCandidates(text: string): string[] {
  if (!text) return [];

  const candidates: string[] = [];

  // 1) ```json\n{...}\n``` with newlines
  for (const match of Array.from(text.matchAll(/```json\s*\n?([\s\S]*?)\n?\s*```/gi))) {
    if (match[1]) candidates.push(match[1].trim());
  }

  // 2) ``` {...} ```
  for (const match of Array.from(text.matchAll(/```\s*\n?([\s\S]*?)\n?\s*```/gi))) {
    if (match[1]) candidates.push(match[1].trim());
  }

  // 3) First {...} range (greedy, handles nested braces)
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    const range = extractBalancedBraces(text.slice(firstBrace));
    if (range) candidates.push(range);
  }

  // 4) Lines that look like JSON objects (start with {)
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      candidates.push(trimmed);
    }
  }

  // Deduplicate
  return Array.from(new Set(candidates));
}

/**
 * Extracts a balanced {...} substring starting at the given offset.
 * Uses a stack to track open/close braces and returns the minimal valid range.
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
 *
 * Problems handled:
 * - Markdown fences: ```json, ```
 * - Trailing commas: { "a": 1, }
 * - Unquoted keys: { myKey: "value" }
 * - Single-quoted strings: { "key": 'value' }
 * - Unescaped quotes in strings: { "key": "va"lue" }
 * - Backtick-quoted strings
 * - control / invisible characters
 * - Non-JSON text before first { or after last }
 * - Unquoted bare values: { "key": someWord }
 */
function deepCleanJSON(jsonString: string): string {
  if (!jsonString) return '';

  let s = jsonString;

  // Step 0: strip BOM and other invisible chars
  s = s.replace(/[\uFEFF\u200B\u2060\u180E]/g, '');

  // Step 1: strip markdown fences (```json, ```)
  s = s.replace(/^```json\s*/gim, '');
  s = s.replace(/^```\s*/gim, '');
  s = s.replace(/```$/gim, '');

  // Step 2: normalize line endings to spaces (so bare newlines don't break tokenization)
  s = s.replace(/[\r\n]+/g, ' ');

  // Step 3: remove control characters
  s = s.replace(/[\x00-\x1F\x7F]/g, '');

  // Step 4: remove trailing commas before ] or }
  s = s.replace(/,\s*([\]}])/g, '$1');

  // Step 5: escape unescaped double quotes INSIDE string values
  // This is the trickiest part. We token-scan and rebuild string values.
  s = fixInnerQuotes(s);

  // Step 6: replace single-quoted string values with double-quoted
  s = s.replace(/:\s*'([^']*)'/g, ': "$1"');

  // Step 7: quote unquoted keys { key: → { "key":
  s = s.replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":');

  // Step 8: fix remaining unquoted keys like "word:"
  s = s.replace(/([\w]+):/g, '"$1":');

  // Step 9: extract only the JSON portion
  const startIdx = s.indexOf('{');
  const endIdx = s.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    s = s.substring(startIdx, endIdx + 1);
  } else {
    return '';
  }

  // Step 10: fix bare unquoted values: : word, or : word}
  s = s.replace(/:\s*([a-zA-Z_][^\s,}]*)(\s*[,}])/g, ': "$1"$2');

  // Step 11: remove any remaining backtick fences
  s = s.replace(/`/g, '');

  // Step 12: collapse excess whitespace inside string values
  // (already normalized newlines above, but clean up multiple spaces)
  s = s.replace(/\s+/g, ' ');

  return s.trim();
}

/**
 * Iterates through the string character-by-character, rebuilding it with inner quotes fixed.
 * This handles cases like: { "key": "va"lue" } → { "key": "va\"lue" }
 */
function fixInnerQuotes(s: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < s.length) {
    // Detect string: "..."
    if (s[i] === '"') {
      result.push('"');
      i++;
      const inString = true;

      while (i < s.length && inString) {
        if (s[i] === '\\') {
          // Escaped char — copy both chars
          result.push(s[i]);
          result.push(s[i + 1] || '');
          i += 2;
          continue;
        }

        if (s[i] === '"') {
          // End of string
          result.push('"');
          i++;
          break;
        }

        if (s[i] === '"') {
          // Unescaped quote INSIDE string — escape it
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

  // Fallback: simple truncation at last } or ]
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const cutoff = Math.max(lastBrace, lastBracket);
  return cutoff > 0 ? text.substring(0, cutoff + 1) : '';
}

/**
 * Tries to parse text as JSON; applies deep cleaning + multiple strategies.
 * Returns { parsed, error, debugInfo }
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

  // Strategy 0: raw text
  let result = tryParse(text, 'raw');
  if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: text.substring(0, 200) } };

  // Strategy 1–N: try each extracted candidate (raw + deepClean)
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

  // Strategy: deepClean on full original text
  const deepCleanedFull = deepCleanJSON(text);
  result = tryParse(deepCleanedFull, 'deepClean(full)');
  if (result !== null) return { parsed: result, error: null, debugInfo: { strategiesAttempted, finalPreview: deepCleanedFull.substring(0, 200) } };

  // Strategy: truncate then try
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

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'MiniMax-M2.7',
      max_tokens: 4096,
      system: systemPrompt || 'You are an expert IELTS Writing examiner. IMPORTANT: Output ONLY valid JSON, no markdown, no explanation.',
      messages: [{ role: 'user', content: userPrompt }]
    });

    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    console.log('=== [reevaluate] Raw model response ===');
    console.log(responseText.substring(0, 1000));
    console.log('=== End raw response ===');

    const { parsed, error, debugInfo } = robustParse(responseText);

    if (!parsed) {
      console.error('=== [reevaluate] All JSON strategies failed ===');
      console.error('Error:', error);
      console.error('Strategies:', debugInfo.strategiesAttempted.join(', '));
      console.error('Preview:', debugInfo.finalPreview);

      return NextResponse.json({
        success: false,
        error: '模型响应格式异常，请重试',
        debug_info: {
          strategiesAttempted: debugInfo.strategiesAttempted,
          lastError: error,
          preview: debugInfo.finalPreview,
          responseLength: responseText.length,
          responseStartsWith: responseText.substring(0, 200)
        }
      }, { status: 200 });
    }

    const gradingResult: Round2GradingResult = {
      user_answer,
      grading_result: parsed as Round2GradingResult['grading_result'],
      metadata: {
        question_type: 'round2',
        processing_time_ms: Date.now() - startTime,
        model_used: 'MiniMax-M2.7'
      }
    };

    return NextResponse.json({ success: true, data: gradingResult });
  } catch (error) {
    console.error('=== [reevaluate] Unexpected error ===', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 200 });
  }
}