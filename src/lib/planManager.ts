// 30天保过计划 - 数据管理
// ============================================

const STORAGE_KEY = 'ielts_plan_v1';

export interface DimensionScores {
  tr: number;
  cc: number;
  lr: number;
  gra: number;
}

export interface ScoreRecord {
  score: number;
  date: string;
  round: number;
  type: 'first' | 'second';
}

export interface PlanData {
  targetScore: number;
  currentScore: number | null;
  dailyGoal: number;
  startDate: string;
  historyScores: ScoreRecord[];
  dimensionScores: DimensionScores | null;
}

const DEFAULT_PLAN: PlanData = {
  targetScore: 6.5,
  currentScore: null,
  dailyGoal: 1,
  startDate: new Date().toISOString().split('T')[0],
  historyScores: [],
  dimensionScores: null,
};

function loadPlan(): PlanData {
  if (typeof window === 'undefined') return { ...DEFAULT_PLAN };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PLAN, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PLAN };
}

function savePlan(plan: PlanData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    window.dispatchEvent(new Event('plan-updated'));
  } catch {
    // ignore
  }
}

export const planManager = {
  init(): void {
    const plan = loadPlan();
    if (!plan.startDate) {
      plan.startDate = new Date().toISOString().split('T')[0];
      savePlan(plan);
    }
  },

  getPlan(): PlanData {
    return loadPlan();
  },

  updateCurrentScore(
    score: number,
    dimensions: DimensionScores,
    type: 'first' | 'second'
  ): void {
    const plan = loadPlan();
    plan.currentScore = score;
    plan.dimensionScores = { ...dimensions };

    plan.historyScores.push({
      score,
      date: new Date().toISOString().split('T')[0],
      round: type === 'first' ? 1 : 2,
      type,
    });

    savePlan(plan);
  },

  updateTarget(target: number): void {
    const plan = loadPlan();
    plan.targetScore = target;
    savePlan(plan);
  },

  updateDailyGoal(goal: number): void {
    const plan = loadPlan();
    plan.dailyGoal = goal;
    savePlan(plan);
  },

  getPredictionDays(): number {
    const plan = loadPlan();
    if (!plan.currentScore) return 30;

    const diff = plan.targetScore - plan.currentScore;
    if (diff <= 0) return 0;

    // 假设每篇练习平均提升 0.05 分
    const needed = Math.ceil(diff / 0.05);
    // 每天写 1 篇需要的天数
    return Math.max(1, Math.min(30, needed));
  },

  getWeakDimension(): string | null {
    const dims = loadPlan().dimensionScores;
    if (!dims) return null;

    const map: Record<keyof DimensionScores, string> = {
      tr: 'Task Response',
      cc: 'Coherence & Cohesion',
      lr: 'Lexical Resource',
      gra: 'Grammatical Range',
    };

    const entries = Object.entries(dims) as [keyof DimensionScores, number][];
    const min = entries.reduce((a, b) => (a[1] < b[1] ? a : b));
    return min[1] < 6 ? map[min[0]] : null;
  },

  getProgressPercent(): number {
    const plan = loadPlan();
    if (!plan.currentScore) return 0;
    if (plan.currentScore >= plan.targetScore) return 100;

    const startScore = 4.0; // 假设初始水平
    const total = plan.targetScore - startScore;
    const current = plan.currentScore - startScore;
    return Math.min(100, Math.round((current / total) * 100));
  },
};