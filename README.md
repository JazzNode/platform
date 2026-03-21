# web

> The Jazz Scene, Connected. — The IMDb of Jazz.

JazzNode 公開網站 — 瀏覽場地、藝人、活動。

## Tech Stack

- **Next.js 16** (App Router, SSG + ISR)
- **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** + **Radix UI**
- **Supabase** (SSOT，搭配 SSR adapter)
- **next-intl** (EN / 繁中 / 日本語)
- **Recharts** (資料視覺化)
- **Fuse.js** (模糊搜尋)
- **Sharp** (圖片處理)
- **Vercel** (部署)

## Architecture

```
Supabase (SSOT)
    ↓ build-time fetch
Next.js SSG + ISR (revalidate: 1h)
    ↓
Vercel CDN → Users
```

- **Zero runtime API calls** — 所有資料在建置時取得
- **ISR** — 每小時自動重新驗證頁面
- **Schema Check** — `prebuild` hook 自動執行 schema alignment 檢查
- **Three languages** — URL-based: `/en/`, `/zh/`, `/ja/`

## Routes

| Route | Description |
|---|---|
| `/[locale]` | 首頁 — 即將到來的活動 + 推薦場地 |
| `/[locale]/venues` | 場地列表（依城市分組） |
| `/[locale]/venues/[id]` | 場地詳情 + 活動列表 |
| `/[locale]/artists` | 藝人列表（依樂器分組） |
| `/[locale]/artists/[id]` | 藝人簡介 + 演出紀錄 |
| `/[locale]/events` | 活動行事曆（依月份分組） |

## Getting Started

```bash
npm install

# 環境變數
cp .env.local.example .env.local
# 填入 Supabase URL、Supabase Anon Key 等

npm run dev     # 開發
npm run build   # 建置（含 schema 檢查）
```

## Structure

```
src/
├── app/           — 路由目錄（venues, artists, events, cities 等）
├── components/    — 75+ 可重用 UI 元件
├── lib/           — 服務模組（Supabase client、filters、helpers）
├── i18n/          — 語言設定
└── messages/      — 翻譯內容（EN / 繁中 / 日本語）
```
