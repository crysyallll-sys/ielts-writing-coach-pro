import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Round1GradingResult } from '@/types/ielts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic',
});

function extractJSON(text: string): string | null {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON between curly braces
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}

function cleanJSON(jsonString: string): string {
  // Remove control characters except those valid in JSON
  let cleaned = jsonString.replace(/[\x00-\x1F\x7F]/g, '');

  // Fix common issues with the model output
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas
  cleaned = cleaned.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":'); // Add quotes to unquoted keys
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double quotes

  // Remove any non-JSON text before or after
  const startIndex = cleaned.indexOf('{');
  const endIndex = cleaned.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  }

  return cleaned;
}

function parseJSONSafely(text: string): unknown | null {
  try {
    const extracted = extractJSON(text);
    if (!extracted) return null;

    const cleaned = cleanJSON(extracted);
    return JSON.parse(cleaned);
  } catch {
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

    // Read system prompt from file
    const systemPrompt = await import('fs').then(fs =>
      fs.readFileSync(process.cwd() + '/src/prompts/round1_system.txt', 'utf-8')
    ).catch(() => null);

    const userPrompt = `Please evaluate the following IELTS Writing Task 1 response.

**Question/Prompt:**
${question}

**User's Answer:**
${user_answer}

Provide your evaluation in JSON format.`;

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'MiniMax-M2.7',
      max_tokens: 4096,
      system: systemPrompt || 'You are an expert IELTS Writing examiner.',
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Extract text from content blocks (skip thinking blocks)
    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    // Try to parse JSON, but be more tolerant of incomplete responses
    let parsedResult = parseJSONSafely(responseText);

    // If parsing failed but we have JSON-like content, try to fix it
    if (!parsedResult && responseText.includes('{')) {
      // Try to extract and fix the JSON
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[1]);
        } catch {
          // Try to find and parse the main JSON object
          const start = responseText.indexOf('{');
          const end = responseText.lastIndexOf('}');
          if (start !== -1 && end !== -1) {
            const jsonStr = responseText.substring(start, end + 1);
            // Fix common JSON issues
            const fixed = jsonStr
              .replace(/,\s*([\]}])/g, '$1')
              .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
              .replace(/:\s*'([^']*)'/g, ': "$1"');
            try {
              parsedResult = JSON.parse(fixed);
            } catch {
              // Still failed
            }
          }
        }
      }
    }

    if (!parsedResult) {
      // Fallback: return a structured error response
      return NextResponse.json({
        success: false,
        error: 'Failed to parse model response',
        raw_response: responseText.substring(0, 1000)
      }, { status: 500 });
    }

    const gradingResult: Round1GradingResult = {
      user_answer,
      grading_result: parsedResult as Round1GradingResult['grading_result'],
      metadata: {
        question_type: 'round1',
        processing_time_ms: Date.now() - startTime,
        model_used: 'MiniMax-M2.7'
      }
    };

    return NextResponse.json({
      success: true,
      data: gradingResult
    });
  } catch (error) {
    console.error('Round 1 evaluation error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}