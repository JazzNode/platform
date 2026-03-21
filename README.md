# platform

JazzNode 管理後台 — 分析儀表板、內容審核、Claims 工作流、使用者管理。

## Tech Stack

- **Next.js 16** (App Router, SSG + ISR)
- **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** (Auth + Realtime + 資料存取)
- **Recharts** (分析圖表)
- **Notion Client** (報告/文件同步)
- **AWS S3** (海報圖片封存)
- **@react-pdf/renderer** (PDF 產生)
- **Sharp** (圖片處理)
- **next-intl** (8 種語言支援)

## 功能

- **分析儀表板** — 即時指標、活動統計、場地/藝人活躍度
- **內容管理** — 活動審核、Release 分組管理
- **8 種城市主題配色** — 主題選擇器（mobile/desktop 優化）
- **Claims 工作流** — 場地/藝人認領審核
- **使用者管理** — Supabase Auth 整合
- **多語言** — 支援 8 種語言

## Getting Started

```bash
npm install

# 環境變數
cp .env.local.example .env.local
# 填入 Supabase URL、Service Role Key、Notion Token 等

npm run dev     # 開發
npm run build   # 建置
```

## Structure

```
src/
├── app/           — Admin 路由
├── components/    — 75+ 元件（analytics、moderation 等）
├── lib/           — 服務模組（Supabase、Notion、S3 等）
└── messages/      — i18n 翻譯（8 種語言）
```
