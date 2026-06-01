'use client';

import { useEffect, useState } from 'react';
import { planManager } from '@/lib/planManager';

type DimKey = 'GRA' | 'LR' | 'CC' | 'TR';

const FOCUS_MAP: Record<DimKey, { title: string; task: string; video: string }> = {
  GRA: {
    title: '语法短板',
    task: '完成5个主谓一致改错题',
    video: '如何避免主谓一致错误',
  },
  LR: {
    title: '词汇短板',
    task: '背诵10个同义替换词',
    video: '学术词汇搭配指南',
  },
  CC: {
    title: '连贯短板',
    task: '练习使用5个连接词造句',
    video: '段落衔接技巧',
  },
  TR: {
    title: '论证短板',
    task: '分析2篇高分范文结构',
    video: 'PEEL论证法',
  },
};

export default function WeeklyFocus() {
  const [weakDim, setWeakDim] = useState<string | null>(null);
  const [currentScore, setCurrentScore] = useState<number | null>(null);

  useEffect(() => {
    planManager.init();
    const plan = planManager.getPlan();
    setCurrentScore(plan.currentScore);
    setWeakDim(planManager.getWeakDimension());
  }, []);

  if (currentScore === null || !weakDim) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg mx-auto text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">本周聚焦</h3>
        <p className="text-gray-500 text-sm leading-relaxed">
          完成首次批改后，系统将为你生成个性化学习计划
        </p>
      </div>
    );
  }

  const focus = FOCUS_MAP[weakDim as DimKey];
  if (!focus) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg mx-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">🎯</span> 本周聚焦
        <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
          {weakDim}
        </span>
      </h3>

      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 mb-4">
        <h4 className="text-base font-bold text-orange-700 mb-1">{focus.title}</h4>
        <p className="text-sm text-gray-600">{weakDim} 维度得分仍需提升</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
            1
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">每日任务</p>
            <p className="text-sm text-gray-600">{focus.task}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
            2
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">推荐视频</p>
            <p className="text-sm text-gray-600">{focus.video}</p>
          </div>
        </div>
      </div>
    </div>
  );
}