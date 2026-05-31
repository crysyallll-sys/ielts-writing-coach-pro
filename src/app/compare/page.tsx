'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Round1GradingResult, Round2GradingResult } from '@/types/ielts';

interface CompareData {
  round1: Round1GradingResult;
  round2: Round2GradingResult;
}

function CompareContent() {
  const router = useRouter();
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read data from sessionStorage instead of URL params
    const storedData = sessionStorage.getItem('compareData');
    console.log('读取到的 sessionStorage.compareData:', storedData);
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        console.log('解析后的 compareData:', parsed);
        setCompareData(parsed);
      } catch (e) {
        console.error('解析 compareData 失败:', e);
        setError('无法解析对比数据: ' + (e as Error).message);
      }
    } else {
      console.error('sessionStorage 中找不到 compareData');
      setError('没有数据，请先完成批改');
    }
  }, []);

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

  if (!compareData) {
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

  const { round1, round2 } = compareData;
  const round1Score = round1.grading_result.overall_band;
  const round2Score = round2.grading_result.final_band_score.overall_band;
  const scoreDiff = round2Score - round1Score;

  const round1Scores = round1.grading_result.band_scores;
  const round2Scores = round2.grading_result.final_band_score.breakdown;

  const criteria = [
    {
      name: '任务完成',
      round1Key: 'task_achievement',
      round2Key: 'task_response',
      round1Score: round1Scores.task_achievement,
      round2Score: round2Scores.task_response,
      feedback: round2.grading_result.detailed_feedback.specific_improvements.slice(0, 2),
    },
    {
      name: '连贯与衔接',
      round1Key: 'coherence_cohesion',
      round2Key: 'coherence_cohesion',
      round1Score: round1Scores.coherence_cohesion,
      round2Score: round2Scores.coherence_cohesion,
      feedback: round2.grading_result.detailed_feedback.specific_improvements.slice(2, 4),
    },
    {
      name: '词汇资源',
      round1Key: 'lexical_resource',
      round2Key: 'lexical_resource',
      round1Score: round1Scores.lexical_resource,
      round2Score: round2Scores.lexical_resource,
      feedback: round2.grading_result.detailed_feedback.specific_improvements.slice(4, 6),
    },
    {
      name: '语法范围',
      round1Key: 'grammatical_range',
      round2Key: 'grammatical_range',
      round1Score: round1Scores.grammatical_range,
      round2Score: round2Scores.grammatical_range,
      feedback: round2.grading_result.detailed_feedback.specific_improvements.slice(6, 8),
    },
  ];

  // Calculate error fix stats
  const totalRound1Errors = round1.grading_result.writing_feedback.band_score_analysis.grammatical_range.examples.length +
    round1.grading_result.writing_feedback.band_score_analysis.lexical_resource.examples.length;
  const round2Errors = round2.grading_result.detailed_feedback.weaknesses.length;
  const fixedErrors = Math.max(0, totalRound1Errors - round2Errors);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-4">
            对比结果
          </h1>

          {/* Score Change */}
          <div className="bg-white rounded-2xl shadow-xl p-6 inline-block">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">第一轮</p>
                <p className="text-4xl font-bold text-gray-600">{round1Score}</p>
              </div>
              <div className="flex items-center gap-2">
                <svg className={`w-8 h-8 ${scoreDiff >= 0 ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {scoreDiff >= 0 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  )}
                </svg>
                <span className={`text-2xl font-bold ${scoreDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {scoreDiff >= 0 ? '+' : ''}{scoreDiff}
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">第二轮</p>
                <p className="text-4xl font-bold text-indigo-600">{round2Score}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Fix Statistics */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">错误修复统计</h2>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{fixedErrors}</p>
              <p className="text-sm text-gray-500">已修复</p>
            </div>
            <span className="text-2xl text-gray-400">/</span>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600">{totalRound1Errors}</p>
              <p className="text-sm text-gray-500">总错误数</p>
            </div>
          </div>
          <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${totalRound1Errors > 0 ? (fixedErrors / totalRound1Errors) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Unfixed Errors */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              仍存在的问题
            </h2>
            {round2.grading_result.detailed_feedback.weaknesses.length > 0 ? (
              <ul className="space-y-2">
                {round2.grading_result.detailed_feedback.weaknesses.map((weakness, index) => (
                  <li key={index} className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                    • {weakness}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">太好了，没有未修复的错误！</p>
            )}
          </div>

          {/* Optimization Suggestions */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.3 3.3 0 01-1.5.5 1 1 0 11-2 0 5 5 0 015 5 1 1 0 01-1 1h-1a1 1 0 110-2h1a3 3 0 003-3 1 1 0 011-1zm0-2a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              优化建议
            </h2>
            {round2.grading_result.detailed_feedback.specific_improvements.length > 0 ? (
              <ul className="space-y-2">
                {round2.grading_result.detailed_feedback.specific_improvements.slice(0, 4).map((improvement, index) => (
                  <li key={index} className="text-blue-600 bg-blue-50 p-3 rounded-lg text-sm">
                    • {improvement}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">暂无优化建议</p>
            )}
          </div>
        </div>

        {/* Criteria Details */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">四项评分详情</h2>
          <div className="space-y-6">
            {criteria.map((criteria) => {
              const diff = criteria.round2Score - criteria.round1Score;
              return (
                <div key={criteria.name} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700">{criteria.name}</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">{criteria.round1Score}</span>
                      <svg className={`w-5 h-5 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {diff >= 0 ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        )}
                      </svg>
                      <span className={`font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {criteria.round2Score} ({diff >= 0 ? '+' : ''}{diff})
                      </span>
                    </div>
                  </div>
                  {criteria.feedback.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {criteria.feedback.map((fb, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                          {fb}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">进步总结</h2>
          <div className="space-y-3">
            {round2.grading_result.detailed_feedback.strengths.map((strength, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
                  ✓
                </span>
                <span className="text-gray-700">{strength}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-white rounded-xl text-center">
            <p className="text-lg text-gray-700">
              您的写作能力正在提升！
              {scoreDiff > 0 && ` 本轮提升了 ${scoreDiff} 分，继续保持！`}
              {scoreDiff === 0 && ' 保持稳定，继续努力！'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
        >
          继续练习
        </button>

        {/* Metadata */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Round 1: {round1.metadata.processing_time_ms}ms | Round 2: {round2.metadata.processing_time_ms}ms</p>
        </div>
      </div>
    </main>
  );
}

export default function ComparePage() {
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
      <CompareContent />
    </Suspense>
  );
}