'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Round1GradingResult, GrammarError } from '@/types/ielts';
import { markErrorsInText } from '@/lib/textHighlight';
import { planManager } from '@/lib/planManager';


const WeeklyFocus = dynamic(() => import('@/components/WeeklyFocus'), { ssr: false });
const PlanDashboard = dynamic(() => import('@/components/PlanDashboard'), { ssr: false });

interface ResultData {
  question: string;
  result: Round1GradingResult;
}

function ResultContent() {
  const router = useRouter();
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem('round1Data');
    if (storedData) {
      try {
        setResultData(JSON.parse(storedData));
      } catch {
        setError('无法解析结果数据');
      }
    } else {
      setError('没有结果数据，请先提交文章');
    }
  }, []);

  // Scroll to error element
  const scrollToError = useCallback((errorId: string) => {
    if (!leftPanelRef.current) return;

    const element = leftPanelRef.current.querySelector(`[data-error-id="${errorId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-4', 'ring-yellow-400', 'bg-yellow-100');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-yellow-400', 'bg-yellow-100');
      }, 1500);
    }
  }, []);

  // Extract dimension scores from Round 1 result
  const extractDimensions = (result: Round1GradingResult) => {
    const bs = result.grading_result.band_scores;
    return {
      tr: bs.task_achievement,
      cc: bs.coherence_cohesion,
      lr: bs.lexical_resource,
      gra: bs.grammatical_range,
    };
  };

  // Update plan manager with current score and dimensions (Round 1 only records history)
  useEffect(() => {
    if (!resultData) return;
    planManager.init();
    const result = resultData.result;
    const overall = result.grading_result.overall_band;
    const dimensions = extractDimensions(result);
    // 只在第一轮时更新当前分数，第二轮由 compare 页面调用
    planManager.updateCurrentScore(overall, dimensions, 'first');
  }, [resultData]);

  const handleGoToEdit = () => {
    if (resultData) {
      const dataToPass = {
        question: resultData.question,
        user_answer: resultData.result.user_answer,
        grading_result: resultData.result.grading_result,
        metadata: resultData.result.metadata
      };
      sessionStorage.setItem('editData', JSON.stringify(dataToPass));
      router.push('/edit');
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

  if (!resultData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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

  const result = resultData.result;
  const grading = result.grading_result;
  const scores = grading.band_scores;
  const logicAnalysis = grading.logic_analysis;

  // Extended error type with metadata
  interface ExtendedGrammarError extends GrammarError {
    _category: string;
    _idx: number;
  }

  // Collect all grammar errors from all categories
  const grammarErrors: ExtendedGrammarError[] = [];
  const errorCategories = [
    'third_person_singular', 'tense', 'part_of_speech', 'preposition',
    'redundant_preposition', 'infinitive', 'article', 'noun_plural', 'sentence_fluency'
  ];

  if (grading.grammar_errors) {
    const ge = grading.grammar_errors as unknown as Record<string, GrammarError[]>;
    errorCategories.forEach((cat) => {
      const errors = ge[cat] || [];
      errors.forEach((err, idx) => {
        grammarErrors.push({ ...err, _category: cat, _idx: idx });
      });
    });
  }

  // Get user's viewpoint and missing angles
  const userViewpoint = logicAnalysis?.user_position || grading.detailed_feedback?.introduction || '';
  const missingAngles = logicAnalysis?.missing_angles || [];
  const optimalOutline = logicAnalysis?.optimal_outline || [];

  const criteria = [
    { name: 'TR 任务完成', key: 'task_achievement', score: scores.task_achievement, fullName: 'Task Response' },
    { name: 'CC 连贯与衔接', key: 'coherence_cohesion', score: scores.coherence_cohesion, fullName: 'Coherence & Cohesion' },
    { name: 'LR 词汇资源', key: 'lexical_resource', score: scores.lexical_resource, fullName: 'Lexical Resource' },
    { name: 'GRA 语法范围', key: 'grammatical_range', score: scores.grammatical_range, fullName: 'Grammatical Range' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 7) return '优秀';
    if (score >= 6) return '良好';
    if (score >= 5) return '一般';
    return '待提高';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      {/* 添加看板 */}
  <div className="max-w-7xl mx-auto px-4 pt-4">
    <PlanDashboard />
  </div>
  <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-900 mb-2">
            Round 1 批改结果
          </h1>
        </div>

        {/* Main Content - Two Columns */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Original Text with Highlights */}
          <div className="lg:w-1/2 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">原文标注</h2>
            <div
              ref={leftPanelRef}
              className="bg-gray-50 rounded-xl p-4 min-h-[500px] max-h-[80vh] overflow-y-auto font-mono text-sm leading-relaxed"
            >
              {result.user_answer.split('\n').map((line, lineIdx) => {
                const segments = markErrorsInText(line, grammarErrors);

                return (
                  <div
                    key={lineIdx}
                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                  >
                    {segments.map((seg, segIdx) => {
                      if (!seg.isError) {
                        return <span key={segIdx}>{seg.text}</span>;
                      }

                      const errorIdx = grammarErrors.findIndex(
                        e => e.original?.toLowerCase() === seg.text.toLowerCase()
                      );

                      return (
                        <mark
                          key={`${lineIdx}-${segIdx}`}
                          data-error-id={errorIdx >= 0 ? `error-${errorIdx}` : undefined}
                          className="bg-red-200 text-red-700 px-1 rounded cursor-pointer hover:bg-red-300 transition-colors"
                          onClick={() => errorIdx >= 0 && scrollToError(`error-${errorIdx}`)}
                        >
                          {seg.text}
                        </mark>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-200 text-red-700 rounded">error word</span>
                <span className="text-gray-600">点击跳转到错误</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded"></span>
                <span className="text-gray-600">高亮闪烁</span>
              </div>
            </div>
          </div>

          {/* Right Panel - Annotations */}
          <div className="lg:w-1/2 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            {/* Overall Score */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="text-center">
                <p className="text-gray-500 text-sm">总分</p>
                <p className="text-5xl font-bold text-indigo-600">{grading.overall_band}</p>
                <p className="text-gray-400 text-xs">{getScoreLabel(grading.overall_band)}</p>
              </div>
            </div>

            {/* Four Criteria Scores */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">四项评分</h3>
              <div className="space-y-4">
                {criteria.map((item) => (
                  <div
                    key={item.key}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-semibold text-gray-700">{item.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{item.fullName}</span>
                      </div>
                      <span className={`font-bold text-lg ${
                        item.score >= 7 ? 'text-green-600' :
                        item.score >= 5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {item.score}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getScoreColor(item.score)} rounded-full transition-all`}
                        style={{ width: `${(item.score / 9) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{getScoreLabel(item.score)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Focus - 懒加载 */}
            <WeeklyFocus />

            {/* Grammar Errors (9 Categories) */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-red-600 mb-4">语法错误</h3>
              {grammarErrors.length > 0 ? (
                <div className="space-y-3">
                  {grammarErrors.map((err, idx) => (
                    <div
                      key={`grammar-${idx}`}
                      className="bg-red-50 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors border-l-4 border-red-500"
                      onClick={() => scrollToError(`error-${idx}`)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-red-600 font-medium line-through">{err.original}</p>
                          {err.correction && (
                            <p className="text-green-600 font-medium mt-1">→ {err.correction}</p>
                          )}
                          {err.reason && (
                            <p className="text-gray-500 text-sm mt-1">原因: {err.reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">未发现语法错误</p>
              )}
            </div>

            {/* Logical Analysis - User Viewpoint (Yellow highlight) */}
            {userViewpoint && (
              <div className="bg-yellow-50 rounded-2xl shadow-xl p-6 border-l-4 border-yellow-400">
                <h3 className="text-lg font-bold text-yellow-700 mb-4">用户主观点</h3>
                <div className="bg-yellow-100 rounded-xl p-4">
                  <p className="text-gray-800 font-medium leading-relaxed">{userViewpoint}</p>
                </div>
              </div>
            )}

            {/* Missing Angles Analysis */}
            {missingAngles.length > 0 && (
              <div className="bg-orange-50 rounded-2xl shadow-xl p-6 border-l-4 border-orange-400">
                <h3 className="text-lg font-bold text-orange-700 mb-4">缺失论证角度</h3>
                <div className="space-y-3">
                  {missingAngles.map((angle, idx) => (
                    <div
                      key={`missing-${idx}`}
                      className="bg-orange-100 rounded-xl p-3 flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        !
                      </span>
                      <p className="text-gray-700">{angle}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6 Optimal Sub-arguments */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">6条最优分论点</h3>
              <div className="space-y-3">
                {optimalOutline.map((arg, idx) => (
                  <div
                    key={`arg-${idx}`}
                    className={`rounded-xl p-4 transition-colors ${
                      arg.status === '缺失'
                        ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                        : 'bg-green-50 border-l-4 border-green-500 hover:bg-green-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        arg.status === '缺失' ? 'bg-gray-400 text-white' : 'bg-green-500 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className={`font-medium ${arg.status === '缺失' ? 'text-gray-400' : 'text-gray-700'}`}>
                          {arg.claim}
                          {arg.status === '缺失' && (
                            <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">缺失</span>
                          )}
                        </p>
                        {arg.status !== '缺失' && (
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <p><span className="font-medium text-green-700">原因:</span> {arg.reason}</p>
                            <p><span className="font-medium text-green-700">例证:</span> {arg.evidence}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Comment & Suggestions */}
            <div className="bg-indigo-50 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-indigo-900 mb-4">总评与建议</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 leading-relaxed">{grading.writing_feedback?.overall_comment || '暂无总评'}</p>
                </div>
                {grading.writing_feedback?.suggested_improvements && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">改进建议:</h4>
                    <ul className="space-y-2">
                      {grading.writing_feedback.suggested_improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-600">
                          <span className="text-indigo-500">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGoToEdit}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
            >
              去修改
            </button>

            {/* Metadata */}
            <div className="text-center text-sm text-gray-500">
              <p>处理时间: {result.metadata?.processing_time_ms}ms | 模型: {result.metadata?.model_used}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
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
      <ResultContent />
    </Suspense>
  );
}