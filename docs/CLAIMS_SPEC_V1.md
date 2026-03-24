# Milestone 10: Claims Workflow — Spec V1

> Status: **Design Complete** — 待 Airtable 恢復後實作
> Date: 2026-02-21

## 1. 目的

讓**藝人本人**或**場地經營者**透過 App 認領自己的頁面，獲得編輯權限和加值功能。認領後成為該實體的 `manager`。

## 2. 現有 Schema（Airtable 已建）

**Claims 表** (`tblnAvojrl86VMtxo`)

| 欄位 | 類型 | 狀態 | 說明 |
|---|---|---|---|
| `claim_id` | singleLineText | ✅ 已存在 | 唯一識別碼 |
| `status` | singleSelect | ✅ 已存在 | `pending` / `approved` / `rejected` |
| `target_type` | singleSelect | ✅ 已存在 | `artist` / `venue` |
| `target_artist` | link → Artists | ✅ 已存在 | 認領的藝人 |
| `target_venue` | link → Venues | ✅ 已存在 | 認領的場地 |

## 3. 新增欄位

| 欄位 | 類型 | 說明 |
|---|---|---|
| `claimant` | link → Users | 發起認領的用戶 |
| `evidence_text` | multilineText | 申請理由/證據描述 |
| `evidence_files` | multipleAttachments | 佐證文件（名片、社群截圖等） |
| `submitted_at` | dateTime | 提交時間 |
| `reviewed_at` | dateTime | 審核完成時間 |
| `reviewed_by` | singleLineText | 審核者（初期為 Fish 手動） |
| `rejection_reason` | multilineText | 拒絕原因（可選） |
| `notes` | multilineText | 內部備註 |

## 4. 狀態機

```
[User 提交] → pending
                 ├─ approve → approved → 寫入 manager_list + 頒發 badge
                 └─ reject  → rejected → 可重新申請
```

### 規則
- 同一 User 對同一 target 只能有一筆 `pending` claim（防重複提交）
- **允許多個 manager**（符合現實：樂團經紀人、場地共同經營者等）
- `approved` 後：
  1. 將 `claimant` 加入 Artists/Venues 的 `manager_list`
  2. 更新 target 的 `verification_status` → `Verified`
  3. 頒發對應 badge（`art_in_the_house` 或 `ven_house_keys`）
- `rejected` 後可建立新 claim 重新申請

## 5. Manager Badges

### `art_in_the_house` — In The House 🏠
- **對象**: Artists
- **badge_id**: `art_in_the_house`
- **觸發條件**: 該 Artist 有至少一筆 `approved` claim
- **描述 (en)**: This artist's page is managed by the artist or their authorized representative. The house is alive.
- **描述 (zh)**: 此藝人頁面由本人或其授權代表管理中。本人駐場。
- **描述 (ja)**: このアーティストページは本人または正式な代理人が管理しています。本人在籍中。
- **可撤銷**: 是（當所有 manager 被移除時）

### `ven_house_keys` — House Keys 🔑
- **對象**: Venues
- **badge_id**: `ven_house_keys`
- **觸發條件**: 該 Venue 有至少一筆 `approved` claim
- **描述 (en)**: This venue's page is managed by the owner or operator. Someone's got the keys.
- **描述 (zh)**: 此場地頁面由經營者或負責人管理中。鑰匙在對的人手上。
- **描述 (ja)**: この会場ページはオーナーまたは運営者が管理しています。鍵は正しい人の手に。
- **可撤銷**: 是（當所有 manager 被移除時）

## 6. Pipeline 腳本設計

**`claims_processor.js`**（`repos/pipeline/scripts/dev/`）

### 功能
1. 查詢所有 `status=pending` 的 Claims（報告清單供人工審核）
2. `--approve <claim_id>` — 執行 approved 後的副作用：
   - 將 `claimant` 加入 target 的 `manager_list`
   - 更新 `verification_status` → `Verified`
   - 頒發對應 badge（加入 target 的 `badge_list`）
   - 更新 claim 的 `reviewed_at` + `reviewed_by`
3. `--reject <claim_id> --reason "..."` — 標記 rejected + 寫入原因
4. `--dry-run` — 預覽不寫入
5. `--status` — 列出所有 pending claims 摘要

### 防重複邏輯
- 提交時檢查：同一 `claimant` + 同一 `target_artist`/`target_venue` 是否已有 `pending` record
- 有則拒絕建立，回傳提示

## 7. 前端流程（Glideapps MVP）

1. User 在 Artist/Venue 頁面看到「Claim This Page」按鈕
2. 填寫 `evidence_text` + 上傳 `evidence_files`
3. 系統寫入 Claims 表（status=pending, submitted_at=now）
4. Fish 在 Airtable 後台或用 CLI 審核
5. 審核後腳本自動處理 manager_list 綁定 + badge 頒發

## 8. Phase 3 未來擴展（暫不實作）

### 自動驗證機制
- **社群帳號比對**: 比對 User profile 的社群連結與 Artist/Venue 現有社群欄位
- **Email domain 比對**: 場地官方 email domain 與 claimant email 比對
- **自動核准白名單**: 特定條件（如 email 完全匹配）可跳過人工審核

### 通知系統
- 推播通知 claimant 審核結果（approved/rejected + 原因）
- 審核提醒：pending claims 超過 48h 未處理時通知 Fish

### Premium 加值功能解鎖（認領者專屬）
- **互動權限 (Engagement)**:
  - 主動推播：發布新演出時通知所有追蹤者
  - 粉絲溝通：App 內訊息直達核心粉絲
- **外觀自訂 (Branding)**:
  - Cover Photo：自訂封面照片
  - Featured Media：置頂精選演出影片
  - 社群導流：自訂連結按鈕
- **數據洞察 (Analytics)**:
  - 頁面瀏覽量、搜尋曝光次數
  - 粉絲地圖：追蹤者城市分佈（協助巡演規劃）

### 認領層級
- `Verified`: 基本認領（免費）
- `Official`: 付費升級，解鎖全部 Premium 功能

---

## Appendix: Roadmap 定位

| Phase | 重點 | 狀態 |
|---|---|---|
| Phase 1 (MVP) | 權威資料庫 + 搜尋 + Follow | ✅ Done |
| Phase 2 (Growth) | App + 推播 + 認領機制 | 🟡 M10 進行中 |
| Phase 3 (Monetization) | 售票 + 廣告 + Premium Claims | ⏳ 設計完成 |
| Phase 4 (Gamification) | 自動化徽章系統 | ✅ M9 Done |
