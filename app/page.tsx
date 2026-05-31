'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setAnswer(text);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(text.trim() ? words.length : 0);
  };

  const handleSubmit = async () => {
    if (!question.trim() || !answer.trim()) {
      alert('请填写题目和文章');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, user_answer: answer }),
      });

      const result = await response.json();

      if (result.success) {
        // Store data in sessionStorage instead of URL params to avoid 431 error
        const dataToPass = {
          question,
          result: result.data
        };
        sessionStorage.setItem('round1Data', JSON.stringify(dataToPass));
        router.push('/result');
      } else {
        alert(`批改失败: ${result.error}`);
      }
    } catch {
      alert('提交失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-2">
            IELTS Writing Coach Pro
          </h1>
          <p className="text-gray-600">AI 智能批改，提升你的写作能力</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              题目
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="粘贴雅思大作文题目..."
              className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-800"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                你的文章
              </label>
              <span className="text-sm text-gray-500">
                字数: <span className="font-semibold text-indigo-600">{wordCount}</span>
              </span>
            </div>
            <textarea
              value={answer}
              onChange={handleAnswerChange}
              placeholder="粘贴你的文章..."
              className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-800"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 ${
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
                批改中...
              </span>
            ) : (
              '开始批改'
            )}
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>支持 Task 1 和 Task 2 自动评分</p>
          <p className="mt-1">批改基于 IELTS 官方评分标准</p>
        </div>
      </div>
    </main>
  );
}