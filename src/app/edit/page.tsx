'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { highlightText } from '@/lib/textHighlight';

interface EditData {
  question: string;
  user_answer: string;
  grading_result: {
    overview: { key_features: string[]; summary: string };
    detailed_feedback: {
      introduction: string;
      body_paragraphs: string[];
      conclusion: string;
    };
    band_scores: {
      task_achievement: number;
      coherence_cohesion: number;
      lexical_resource: number;
      grammatical_range: number;
    };
    overall_band: number;
    writing_feedback: {
      overall_band: number;
      band_score_analysis: {
        grammatical_range: { score: number; feedback: string; examples: string[] };
        lexical_resource: { score: number; feedback: string; examples: string[] };
        coherence_cohesion: { score: number; feedback: string; examples: string[] };
        task_achievement: { score: number; feedback: string; examples: string[] };
      };
      overall_comment: string;
      suggested_improvements: string[];
    };
  };
  metadata: {
    question_type: string;
    processing_time_ms: number;
    model_used: string;
  };
}

function EditContent() {
  const router = useRouter();
  const [editData, setEditData] = useState<EditData | null>(null);
  const [editedAnswer, setEditedAnswer] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read data from sessionStorage instead of URL params
    const storedData = sessionStorage.getItem('editData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData) as EditData;
        setEditData(parsed);
        setEditedAnswer(parsed.user_answer);
        const words = parsed.user_answer.trim().split(/\s+/).filter((w: string) => w.length > 0);
        setWordCount(parsed.user_answer.trim() ? words.length : 0);
      } catch (e) {
        console.error('Failed to parse editData:', e);
        setError('无法解析数据');
      }
    } else {
      setError('没有数据，请先完成 Round 1 批改');
    }
  }, []);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEditedAnswer(text);
    const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0);
    setWordCount(text.trim() ? words.length : 0);
  };

  const handleSubmit = async () => {
    if (!editData || !editedAnswer.trim()) {
      alert('请填写修改后的文章');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/reevaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: editData.question,
          user_answer: editedAnswer,
          previous_result: {
            user_answer: editData.user_answer,
            grading_result: editData.grading_result,
            metadata: editData.metadata
          }
        }),
      });

      const result = await response.json();
      console.log('reevaluate API 返回:', result);

      if (result.success && result.data) {
        const compareData = {
          round1: {
            user_answer: editData.user_answer,
            grading_result: editData.grading_result,
            metadata: editData.metadata
          },
          round2: result.data,
        };
        console.log('compareData 存储内容:', compareData);
        // Use sessionStorage instead of URL params to avoid 431 error
        sessionStorage.setItem('compareData', JSON.stringify(compareData));
        router.push('/compare');
      } else {
        console.error('API 返回失败:', result.error);
        alert(`批改失败: ${result.error}`);
      }
    } catch (err) {
      console.error('提交失败:', err);
      alert('提交失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">出错了</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!editData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const originalText = editData.user_answer;
  const grammarErrors = editData.grading_result.writing_feedback.band_score_analysis.grammatical_range.examples || [];

  // Build line-by-line view with highlighted error words
  const renderHighlightedLines = () => {
    return originalText.split('\n').map((line, lineIdx) => {
      const segments = highlightText(line, grammarErrors);
      return (
        <div key={lineIdx} className="p-2 rounded hover:bg-gray-100 transition-colors">
          {segments.map((seg, segIdx) =>
            seg.isError ? (
              <mark key={segIdx} className="bg-red-200 text-red-800 rounded px-0.5">{seg.text}</mark>
            ) : (
              <span key={segIdx}>{seg.text}</span>
            )
          )}
        </div>
      );
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-900">修改文章</h1>
          <p className="text-gray-600 mt-2">请修改您的文章，修复红色标注的语法错误</p>
        </div>

        {/* Header with score and errors count */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">上一轮总分</p>
              <p className="text-3xl font-bold text-indigo-600">
                {editData.grading_result.overall_band}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">语法错误数</p>
              <p className="text-3xl font-bold text-red-500">
                {grammarErrors.length}
              </p>
            </div>
          </div>
        </div>

        {/* Question Display */}
        {editData.question && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-700 mb-2">题目</h2>
            <p className="text-gray-600">{editData.question}</p>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Side - Original Text with Error Highlights */}
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">原文（语法错误已标注）</h2>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm whitespace-pre-wrap">
              {renderHighlightedLines()}
            </div>

            {/* Error List */}
            {grammarErrors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-red-600 mb-3">语法错误详情</h3>
                <ul className="space-y-2">
                  {grammarErrors.map((err, idx) => (
                    <li key={idx} className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                      <span className="font-bold">{idx + 1}. </span>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Side - Editable Text Area */}
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">修改后的文章</h2>
              <span className="text-sm text-gray-500">
                字数: <span className="font-semibold text-indigo-600">{wordCount}</span>
              </span>
            </div>
            <textarea
              value={editedAnswer}
              onChange={handleAnswerChange}
              placeholder="在此修改您的文章..."
              className="w-full h-96 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-800 font-mono text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full mt-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              提交中...
            </span>
          ) : (
            '提交二次批改'
          )}
        </button>
      </div>
    </main>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <EditContent />
    </Suspense>
  );
}