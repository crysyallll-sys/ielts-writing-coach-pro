'use client';

import { useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { highlightText } from '@/lib/textHighlight';

// Hardcoded test data
const TEST_QUESTION = `You should spend about 40 minutes on this task. Write about the following topic: Some people think computers and the Internet are important in children's study, but others think students can learn more effectively in schools and with teachers. Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.`;

const TEST_USER_ANSWER = `In the coming 21st century, with the development of technology, more and more people think that students should learn by using computers and the internet. They deem the electronic media as a online teacher, who play an essential role in students' learning. However, some people still advocate that students should learn in schools where students are taught by their teachers. There are several following tips about this argument.

On the one hand, some people think it is important for students to learn by using electronic media. Initially, students can access more accurate information about learning from Internet than that from school. There are little wrong knowledge from computer, but teachers may go wrong in several circumstances. Besides, it is convenient for students to learn online. In other words, students can access knowledge anywhere, which is more efficient than that in school. Finally, students can get more and more knowledge from computer. There are lots of online platforms to get knowledge. In deed, some applications have such a blanket below its website. By this way, students can learn some new ways from other students, which are commented by others.

On the other hand, people think school is the cradle of education for students. First and foremost, students can be supervised by teachers in schools. If students use computer to learn, they won't regulate themselves when they are learning, which may decrease the learning efficiency during this process. Moreover, teachers are familiar with their students in schools. In some circumstances, teachers can deliver a suitable feedback to their children, which can solve their problems precisely.

In my opinion, I think students are supposed to learn in schools instead of computers. Actually, most students can't learn well when they face to a non-live machines rather than a live people called teacher.`;

const TEST_ROUND1_RESULT = {
  overall_band: 5.5,
  band_scores: {
    task_achievement: 5,
    coherence_cohesion: 5.5,
    lexical_resource: 5,
    grammatical_range: 4.5
  },
  overview: {
    key_features: [],
    summary: ''
  },
  detailed_feedback: {
    introduction: '',
    body_paragraphs: [],
    conclusion: ''
  },
  logic_analysis: {
    topic: '',
    user_position: '',
    missing_angles: [],
    optimal_outline: []
  },
  grammar_errors: {},
  writing_feedback: {
    overall_band: 5.5,
    band_score_analysis: {
      grammatical_range: {
        score: 4.5,
        examples: [
          "a online teacher",
          "who play",
          "there are little",
          "face to a non-live machines",
          "from Internet",
          "a suitable feedback"
        ]
      },
      lexical_resource: {
        score: 5,
        examples: []
      },
      coherence_cohesion: {
        score: 5.5,
        examples: []
      },
      task_achievement: {
        score: 5,
        examples: []
      }
    },
    overall_comment: '',
    suggested_improvements: []
  }
};

interface TestEditData {
  question: string;
  user_answer: string;
  grading_result: typeof TEST_ROUND1_RESULT;
  metadata: {
    question_type: string;
    processing_time_ms: number;
    model_used: string;
  };
}

function TestEditContent() {
  const router = useRouter();
  const [editedAnswer, setEditedAnswer] = useState(TEST_USER_ANSWER);
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize word count on mount
  useState(() => {
    const words = TEST_USER_ANSWER.trim().split(/\s+/).filter((w: string) => w.length > 0);
    setWordCount(words.length);
  });

  const testEditData: TestEditData = {
    question: TEST_QUESTION,
    user_answer: TEST_USER_ANSWER,
    grading_result: TEST_ROUND1_RESULT,
    metadata: {
      question_type: 'round1',
      processing_time_ms: 0,
      model_used: 'MiniMax-M2.7'
    }
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEditedAnswer(text);
    const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0);
    setWordCount(text.trim() ? words.length : 0);
  };

  const handleSubmit = async () => {
    if (!editedAnswer.trim()) {
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
          question: testEditData.question,
          user_answer: editedAnswer,
          previous_result: {
            user_answer: testEditData.user_answer,
            grading_result: testEditData.grading_result,
            metadata: testEditData.metadata
          }
        }),
      });

      const result = await response.json();
      console.log('reevaluate API 返回:', result);

      if (result.success && result.data) {
        const compareData = {
          round1: {
            user_answer: testEditData.user_answer,
            grading_result: testEditData.grading_result,
            metadata: testEditData.metadata
          },
          round2: result.data,
        };
        console.log('compareData 存储内容:', compareData);
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

  const originalText = testEditData.user_answer;
  const grammarErrors = testEditData.grading_result.writing_feedback.band_score_analysis.grammatical_range.examples || [];

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
          <h1 className="text-3xl font-bold text-indigo-900">测试 Round 2 流程</h1>
          <p className="text-gray-600 mt-2">请修改红色标注的语法错误，然后提交二次批改</p>
        </div>

        {/* Header with score and errors count */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">上一轮总分</p>
              <p className="text-3xl font-bold text-indigo-600">
                {testEditData.grading_result.overall_band}
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
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-700 mb-2">题目</h2>
          <p className="text-gray-600">{testEditData.question}</p>
        </div>

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

export default function TestEditPage() {
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
      <TestEditContent />
    </Suspense>
  );
}