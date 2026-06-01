'use client';

import { useEffect, useState } from 'react';
import { planManager, PlanData } from '@/lib/planManager';

export default function PlanDashboard() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');

  useEffect(() => {
    planManager.init();
    setPlan(planManager.getPlan());
    setTarget(planManager.getPlan().targetScore.toString());
    setDailyGoal(planManager.getPlan().dailyGoal.toString());

    const handleUpdate = () => {
      setPlan(planManager.getPlan());
    };
    window.addEventListener('plan-updated', handleUpdate);
    return () => window.removeEventListener('plan-updated', handleUpdate);
  }, []);

  if (!plan) return null;

  const progress = planManager.getProgressPercent();
  const predictDays = planManager.getPredictionDays();
  const weakDim = planManager.getWeakDimension();

  const handleSave = () => {
    const t = parseFloat(target);
    const g = parseInt(dailyGoal);
    if (!isNaN(t) && t >= 0 && t <= 9) planManager.updateTarget(t);
    if (!isNaN(g) && g > 0) planManager.updateDailyGoal(g);
    setPlan(planManager.getPlan());
    setEditing(false);
  };

  return (
    <div className="bg-gray-900 text-white rounded-2xl shadow-xl p-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">30天保过计划</h2>
        <button
          onClick={() => setEditing(true)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="编辑计划"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
      </div>

      {/* Scores Row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard
          label="目标分数"
          value={plan.targetScore.toFixed(1)}
          color="text-blue-400"
        />
        <StatCard
          label="当前分数"
          value={
            plan.currentScore !== null
              ? plan.currentScore.toFixed(1)
              : '待测评'
          }
          color={
            plan.currentScore !== null
              ? 'text-green-400'
              : 'text-gray-500'
          }
          muted={plan.currentScore === null}
        />
        <StatCard
          label="每日篇数"
          value={plan.dailyGoal.toString()}
          color="text-purple-400"
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">学习进度</span>
          <span className="text-gray-300">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard
          label="预计达标"
          value={
            predictDays === 0
              ? '已达标'
              : predictDays <= 30
              ? `${predictDays} 天`
              : '30+ 天'
          }
          sub={weakDim ? `薄弱维度: ${weakDim}` : '各维度良好'}
        />
        <InfoCard
          label="开始日期"
          value={plan.startDate}
          sub={`目标 ${plan.targetScore} 分`}
        />
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-80 shadow-2xl border border-gray-700">
            <h3 className="text-white font-semibold mb-4">编辑计划</h3>

            <label className="block text-gray-400 text-sm mb-1">目标分数</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="9"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="block text-gray-400 text-sm mb-1">每日篇数</label>
            <input
              type="number"
              min="1"
              max="10"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  muted = false,
}: {
  label: string;
  value: string;
  color: string;
  muted?: boolean;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 text-center">
      <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${color} ${muted ? 'italic' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">{label}</p>
      <p className="text-white font-semibold">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{sub}</p>
    </div>
  );
}