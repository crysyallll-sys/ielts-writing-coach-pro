'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { planManager } from '@/lib/planManager';

const PlanDashboard = dynamic(() => import('@/components/PlanDashboard'), { ssr: false });

// 弹窗组件
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-indigo-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {children}
        </div>
        <div className="p-4 border-t text-right">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">关闭</button>
        </div>
      </div>
    </div>
  );
}

function CompareContent() {
  const router = useRouter();
  const [compareData, setCompareData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingErrors, setRemainingErrors] = useState<any[]>([]);
  const [peelSuggestions, setPeelSuggestions] = useState<any[]>([]);
  
  // 弹窗状态
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [optimalOutline, setOptimalOutline] = useState<any[]>([]);
  const [strengthsList, setStrengthsList] = useState<string[]>([]);
  const [improvementScore, setImprovementScore] = useState('');

// 👇 在这里添加映射函数
const mapToGrammarKnowledge = (weakness: string): string => {
  const lower = weakness.toLowerCase();
  
  if (lower.includes('subject-verb') || lower.includes('主谓') || lower.includes('三单')) {
    return '主谓一致（三单）';
  }
  if (lower.includes('tense') || lower.includes('时态')) {
    return '动词时态';
  }
  if (lower.includes('article') || lower.includes('冠词') || lower.includes('a/an')) {
    return '冠词用法';
  }
  if (lower.includes('punctuation') || lower.includes('标点')) {
    return '标点符号';
  }
  if (lower.includes('plural') || lower.includes('单复数') || lower.includes('可数')) {
    return '名词单复数';
  }
  if (lower.includes('preposition') || lower.includes('介词')) {
    return '介词搭配';
  }
  if (lower.includes('sentence fragment') || lower.includes('不完整') || lower.includes('缺谓语')) {
    return '句子完整性（不缺成分）';
  }
  if (lower.includes('clause') || lower.includes('定语从句') || lower.includes('which/that')) {
    return '定语从句判断词';
  }
  if (lower.includes('word order') || lower.includes('语序')) {
    return '语序';
  }
  if (lower.includes('collocation') || lower.includes('搭配')) {
    return '词汇搭配';
  }
  if (lower.includes('repetitive') || lower.includes('重复')) {
    return '避免重复用词';
  }
  if (lower.includes('passive') || lower.includes('被动')) {
    return '被动语态';
  }
  if (lower.includes('modal') || lower.includes('情态')) {
    return '情态动词';
  }
  
  return '语法细节';
};

const getGrammarKnowledgeList = (weaknesses: string[]): string[] => {
  const knowledgeSet = new Set<string>();
  weaknesses.forEach(w => {
    const knowledge = mapToGrammarKnowledge(w);
    knowledgeSet.add(knowledge);
  });
  return Array.from(knowledgeSet);
};

  useEffect(() => {
    const storedData = sessionStorage.getItem('compareData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        console.log('compareData 加载成功', parsed);
        setCompareData(parsed);
        
        const round2 = parsed.round2;
        if (round2?.grading_result) {
          const grading = round2.grading_result;
          
          // 更新看板分数
          const score = grading.final_band_score?.overall_band || grading.overall_band || 0;
          const breakdown = grading.final_band_score?.breakdown || {};
          if (score > 0) {
            planManager.updateCurrentScore(score, {
              tr: breakdown.task_response || 0,
              cc: breakdown.coherence_cohesion || 0,
              lr: breakdown.lexical_resource || 0,
              gra: breakdown.grammatical_range || 0,
            }, 'second');
            window.dispatchEvent(new Event('plan-updated'));
          }
          
          // 提取剩余错误
          const weaknesses = grading.detailed_feedback?.weaknesses || [];
          const grammarErrors = grading.grammar_errors || {};
          const errors: any[] = [];
          weaknesses.forEach((w: string) => {
            errors.push({ original: w, correction: '', reason: w });
          });
          if (grammarErrors && typeof grammarErrors === 'object') {
            Object.values(grammarErrors).forEach((arr: any) => {
              if (Array.isArray(arr)) {
                arr.forEach((err: any) => {
                  if (err.original) errors.push(err);
                });
              }
            });
          }
          setRemainingErrors(errors);
          
          // 提取 strengths（用于进步总结弹窗）
          const strengths = grading.detailed_feedback?.strengths || [];
          setStrengthsList(strengths);
          
          // 计算提升分数
          const round1 = parsed.round1;
          const round1Score = round1?.grading_result?.final_band_score?.overall_band || 
                              round1?.grading_result?.overall_band || 6;
          const improvementVal = (score - round1Score).toFixed(1);
          setImprovementScore(improvementVal);
          
          // 提取 PEEL 建议
          const improvements = grading.detailed_feedback?.specific_improvements || [];
          if (improvements.length >= 3) {
            const peels = improvements.map((item: string, idx: number) => {
              let paragraph = '';
              if (idx === 0) paragraph = '第二段（支持科技学习）';
              else if (idx === 1) paragraph = '第三段（支持学校学习）';
              else paragraph = `建议 ${idx + 1}`;
              return { paragraph, problem: item.substring(0, 80), diagnosis: item, example: '' };
            });
            setPeelSuggestions(peels);
          }
        }
        
        // 提取 Round 1 的 optimal_outline（用于证据链弹窗）
        const round1 = parsed.round1;
        if (round1?.grading_result?.logic_analysis?.optimal_outline) {
          setOptimalOutline(round1.grading_result.logic_analysis.optimal_outline);
        } else if (round1?.grading_result?.logic_analysis) {
          const outline = round1.grading_result.logic_analysis.optimal_outline || [];
          setOptimalOutline(outline);
        } else {
          // 默认示例
          setOptimalOutline([
            { claim: '社交媒体导致焦虑和抑郁', reason: '社会比较降低自我评价', evidence: '研究表明使用超3小时的青少年焦虑率高40%' },
            { claim: '社交媒体传播虚假信息', reason: '算法优先推送情绪化内容', evidence: '疫情期间谣言传播速度是官方信息6倍' },
            { claim: '社交媒体削弱面对面沟通能力', reason: '过度依赖文字沟通', evidence: '年轻人在聚会时各自刷手机' },
            { claim: '社交媒体可以促进社会运动', reason: '信息快速传播', evidence: '#MeToo运动通过社交媒体扩散' },
            { claim: '为小企业提供低成本营销渠道', reason: '精准广告投放', evidence: '许多个体商户通过Instagram起家' },
            { claim: '关键在于使用方式', reason: '适度使用+媒介素养', evidence: '芬兰将媒介素养纳入课程' }
          ]);
        }
        
      } catch {
        setError('无法解析对比数据');
      }
    } else {
      setError('没有对比数据');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">出错了</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!compareData) {
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

  const round1 = compareData.round1;
  const round2 = compareData.round2;

  const round1Score = round1?.grading_result?.final_band_score?.overall_band || 
                      round1?.grading_result?.overall_band || 6;

  const round2Grading = round2?.grading_result || {};
  const round2Score = round2Grading.final_band_score?.overall_band || 
                      round2Grading.overall_band || 7;
  const improvement = (round2Score - round1Score).toFixed(1);

  const breakdown = round2Grading.final_band_score?.breakdown || {};
  const round1Breakdown = round1?.grading_result?.final_band_score?.breakdown || {
    task_response: 6,
    coherence_cohesion: 6,
    lexical_resource: 6,
    grammatical_range: 5.5
  };

  const detailedFeedback = round2Grading.detailed_feedback || {};
  const weaknesses = detailedFeedback.weaknesses || [];
  const modifiedText = round2?.user_answer || '';

  // 完整显示 weaknesses（不截断）
  const grammarWeaknesses = weaknesses.filter((w: string) => 
    w.includes('grammar') || w.includes('error') || w.includes('punctuation') || w.includes('tense') || w.includes('agreement')
  );
  const displayWeaknesses = grammarWeaknesses.length > 0 ? grammarWeaknesses : weaknesses.slice(0, 3);

  // 标红函数
  const highlightRemainingErrors = (text: string) => {
    if (!remainingErrors.length) return text;
    let result = text;
    remainingErrors.forEach((err) => {
      const original = err.original || err;
      if (original && typeof original === 'string' && original.length > 3) {
        const regex = new RegExp(`(${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        result = result.replace(regex, `<mark class="bg-red-200 text-red-800 rounded px-0.5">$1</mark>`);
      }
    });
    return result;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      {/* 弹窗 */}
      {showEvidenceModal && (
        <Modal title="📚 6条最优分论点（开拓思路）" onClose={() => setShowEvidenceModal(false)}>
          <div className="space-y-4">
            {optimalOutline.map((item: any, idx: number) => (
              <div key={idx} className="border-l-4 border-indigo-400 pl-4 py-2">
                <p className="font-semibold text-gray-800">{idx + 1}. {item.claim}</p>
                <p className="text-gray-600 text-sm mt-1">📌 原因：{item.reason || '论证充分'}</p>
                <p className="text-gray-600 text-sm mt-1">📊 例证：{item.evidence || '有说服力'}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showProgressModal && (
        <Modal title="🌟 详细进步分析" onClose={() => setShowProgressModal(false)}>
          <div className="space-y-3">
            <div className="bg-indigo-50 rounded-xl p-4 mb-4">
              <p className="text-2xl font-bold text-indigo-600">+{improvementScore}</p>
              <p className="text-gray-600">本轮提升 {improvementScore} 分</p>
            </div>
            {strengthsList.length > 0 ? (
              strengthsList.map((item: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700">{item}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-4">暂无详细数据</div>
            )}
            <div className="mt-4 pt-4 border-t text-gray-500 text-sm">
              ⚡ 您的写作能力正在稳步提升！继续保持练习节奏，每篇进步0.5分，目标可期。
            </div>
          </div>
        </Modal>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-indigo-900">对比结果</h1>
        </div>

        <div className="mb-6">
          <PlanDashboard />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm">总分变化</p>
            <p className="text-5xl font-bold">
              <span className="text-gray-500">{round1Score}</span>
              <span className="text-3xl mx-3">→</span>
              <span className="text-green-600">{round2Score}</span>
              <span className={`text-xl ml-3 ${parseFloat(improvement) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ({parseFloat(improvement) >= 0 ? '+' : ''}{improvement})
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">四项评分对比</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'task_response', label: 'TR', name: '任务完成度' },
              { key: 'coherence_cohesion', label: 'CC', name: '连贯与衔接' },
              { key: 'lexical_resource', label: 'LR', name: '词汇资源' },
              { key: 'grammatical_range', label: 'GRA', name: '语法范围' }
            ].map(item => (
              <div key={item.key} className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-gray-500 text-sm">{item.label}</p>
                <p className="text-xl font-bold">
                  <span className="text-gray-500">{round1Breakdown[item.key] || 0}</span>
                  <span className="mx-2">→</span>
                  <span className="text-green-600">{breakdown[item.key] || 0}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{item.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 错题本摘要 - 三列，带点击弹窗 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         {/* 语法收获 - 提炼知识点 */}
<div className="bg-white rounded-2xl shadow-xl p-6">
  <h3 className="text-lg font-bold text-red-600 mb-3">📚 语法收获</h3>
  <div className="flex flex-wrap gap-2">
    {getGrammarKnowledgeList(weaknesses).map((item: string, idx: number) => (
      <span key={idx} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
        ✅ {item}
      </span>
    ))}
    {weaknesses.length === 0 && <span className="text-gray-500 text-sm">暂无</span>}
  </div>
</div>

          {/* 证据链收获 - 点击弹窗 */}
          <div 
            className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all hover:scale-[1.02]"
            onClick={() => setShowEvidenceModal(true)}
          >
            <h3 className="text-lg font-bold text-blue-600 mb-3">💡 证据链收获 🔍</h3>
            <ul className="space-y-2">
              <li className="text-gray-700 text-sm">✅ 学会用具体例子支撑论点</li>
              <li className="text-gray-700 text-sm">✅ 段落结构更加清晰</li>
              <li className="text-gray-700 text-sm">✅ 因果关系推导更明确</li>
            </ul>
            <p className="text-xs text-blue-500 mt-3">点击卡片查看 6 条最优分论点 →</p>
          </div>

          {/* 进步总结 - 点击弹窗 */}
          <div 
            className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer hover:shadow-2xl transition-all hover:scale-[1.02]"
            onClick={() => setShowProgressModal(true)}
          >
            <h3 className="text-lg font-bold text-green-600 mb-3">📈 进步总结 🔍</h3>
            <p className="text-2xl font-bold text-indigo-600">+{improvement}</p>
            <p className="text-gray-600 text-sm mt-1">评分从 {round1Score} 提升到 {round2Score}</p>
            <p className="text-xs text-green-500 mt-3">点击查看详细进步分析 →</p>
          </div>
        </div>

        {/* 左右两栏 */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📝 你的修改稿</h2>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {modifiedText ? (
                modifiedText.split('\n').map((line: string, idx: number) => {
                  const highlightedLine = highlightRemainingErrors(line);
                  return (
                    <div key={idx} className="mb-1" dangerouslySetInnerHTML={{ __html: highlightedLine || '&nbsp;' }} />
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-8">暂无修改稿</p>
              )}
            </div>
            {remainingErrors.length > 0 && (
              <p className="text-xs text-red-500 mt-3">⚠️ 红色高亮为仍需修正的错误</p>
            )}
          </div>

          <div className="flex-1 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-indigo-800 mb-4">🎯 PEEL 优化建议</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {peelSuggestions.length > 0 ? (
                peelSuggestions.map((sug: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-indigo-400 pl-4 py-2">
                    <p className="font-semibold text-gray-800">💡 {sug.paragraph}</p>
                    <p className="text-gray-600 text-sm mt-1">🔗 问题定位：{sug.problem}</p>
                    <p className="text-gray-600 text-sm mt-1">🔗 断层诊断：{sug.diagnosis}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="border-l-4 border-indigo-400 pl-4 py-2">
                    <p className="font-semibold text-gray-800">💡 第二段（支持科技学习）</p>
                    <p className="text-gray-600 text-sm mt-1">🔗 问题定位：缺乏具体数据支撑论点</p>
                    <p className="text-gray-600 text-sm mt-1">🔗 断层诊断：只有观点没有具体数字或研究</p>
                  </div>
                  <div className="border-l-4 border-indigo-400 pl-4 py-2">
                    <p className="font-semibold text-gray-800">💡 第三段（支持学校学习）</p>
                    <p className="text-gray-600 text-sm mt-1">🔗 问题定位：例证不够具体</p>
                    <p className="text-gray-600 text-sm mt-1">🔗 断层诊断：提到反馈但没说如何帮助</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sessionStorage.clear();
            router.push('/');
          }}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all duration-200"
        >
          开启新练习
        </button>
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">加载中...</div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}