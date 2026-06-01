# IELTS Writing Coach Pro

<div align="center">

**🎯 30天雅思大作文6.5分保过 · AI写作教练**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 📖 产品简介

**IELTS Writing Coach Pro** 是一款基于 AI 的雅思写作训练工具，专为目标是 **6.5分** 的考生设计。

与传统批改工具不同，我们不只是「打分」和「给建议」，而是通过 **「写 → 批改 → 修改 → 再判定」** 的闭环流程，强迫用户真正动手修改，从而在 30 天内实现分数提升。

---

## ✨ 核心功能

### 🔄 两轮批改闭环

| 轮次 | 功能 | 特色 |
|------|------|------|
| **Round 1** | 首次体检 | 9类语法错误精确标红、6条最优分论点、四项评分 |
| **Round 2** | 二次验收 | 对比进步、检查修复情况、次生错误检测、PEEL优化建议 |

### 📊 30天保过计划

- 目标分数设置 + 每日计划
- 智能预测达标天数
- 雷达图展示四项能力
- 根据薄弱维度生成「本周重点突破」

### 📚 错题本系统

- 语法收获（知识点提炼）
- 证据链收获（6条分论点弹窗）
- 进步总结（详细优势分析）

### 🎯 PEEL 逻辑诊断

- 问题定位（哪一段有问题）
- 断层诊断（逻辑哪里断了）
- 补全示范（直接可用的改写）

---

## 🏗️ 技术架构

| 技术 | 说明 |
|------|------|
| **框架** | Next.js 14 (App Router) |
| **语言** | TypeScript |
| **样式** | Tailwind CSS |
| **AI 模型** | Qwen3.7-Max / DeepSeek-V3 |
| **部署** | Vercel |
| **存储** | localStorage (MVP) |

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/crysyallll-sys/ielts-writing-coach-pro.git
cd ielts-writing-coach-pro
2. 安装依赖

bash
npm install
3. 配置环境变量

创建 .env.local 文件：

env
# 阿里云百炼（推荐）
OPENAI_API_KEY=your_dashscope_api_key

# 或使用硅基流动
# OPENAI_API_KEY=your_siliconflow_api_key
4. 启动开发服务器

bash
npm run dev -- --webpack
访问 http://localhost:3000

📁 项目结构

text
ielts-writing-coach-pro/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 首页（输入）
│   │   ├── result/page.tsx       # Round 1 结果页
│   │   ├── edit/page.tsx         # 修改页
│   │   ├── compare/page.tsx      # 对比结果页
│   │   └── api/                  # API 路由
│   ├── components/               # React 组件
│   │   ├── PlanDashboard.tsx     # 30天看板
│   │   ├── WeeklyFocus.tsx       # 本周重点
│   │   └── Skeleton.tsx          # 骨架屏
│   ├── lib/
│   │   ├── planManager.ts        # 计划管理
│   │   └── textHighlight.ts      # 文本标红
│   └── prompts/                  # AI Prompt 模板
├── public/
└── package.json
🎯 产品亮点

对比维度	传统批改工具	IELTS Writing Coach Pro
批改后	给完建议结束	强制用户修改 + 二次判定
错误处理	笼统指出	逐条标红 + 给出正确写法
逻辑诊断	无	6条分论点 + PEEL断层分析
学习路径	无	30天计划 + 每周重点突破
错题本	无	知识点提炼 + 弹窗积累
📝 演示流程

用户输入题目 + 作文
AI 返回：四项评分 + 语法错误（标红）+ 6条分论点
用户根据建议修改
AI 再次批改：对比进步 + 剩余错误 + PEEL优化建议
看板自动更新当前分数和预测天数
🧪 测试账号

无需注册，直接使用。（MVP 阶段）

🤝 贡献

欢迎提交 Issue 和 Pull Request！

📄 许可证

MIT License

📧 联系方式

GitHub: crysyallll-sys
项目地址: ielts-writing-coach-pro
<div align="center">
⭐ 如果这个项目对你有帮助，请给个 Star！

</div> ```
