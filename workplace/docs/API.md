# API 仕様

認証トークン (JWT Cookie) が必要なエンドポイントは、`Authorization` ヘッダーではなく、**Cookie `token`** で認証します。

## 認証

| メソッド | エンドポイント | 概要 | 備考 |
| :-- | :-- | :-- | :-- |
| `POST` | `/api/auth/google` | Google の認可コードでログイン | 未ログイン時は `/api/auth/me` で未認証判定 |
| `GET` | `/api/auth/me` | ログイン中のユーザー情報を取得 | ペイロードには `id, email, exp` を含みます |
| `POST` | `/api/auth/logout` | ログアウト | Cookie `token` を削除 |

## イベント (予定・課題)

認証が必要です。

| メソッド | エンドポイント | 概要 | 備考 |
| :-- | :-- | :-- | :-- |
| `GET` | `/api/events` | 予定・課題一覧を取得 | `groupId` クエリパラメータで絞り込み可 |
| `POST` | `/api/events` | 予定・課題の作成 | body: `title`, `description`, `start_time`, `end_time`, `groupId` |
| `PUT` | `/api/events/:id` | 予定・課題の更新 | 作成者本人または管理者のみ |
| `DELETE` | `/api/events/:id` | 予定・課題の削除 | 作成者本人または管理者のみ |

## グループ

認証が必要です。

| メソッド | エンドポイント | 概要 | 備考 |
| :-- | :-- | :-- | :-- |
| `GET` | `/api/groups` | 所属グループ一覧を取得 | |
| `POST` | `/api/groups` | グループの作成 | body: `groupName`, `color` |
| `POST` | `/api/groups/join` | 招待コードで参加 | body: `inviteCode` |
| `GET` | `/api/groups/:id/events` | グループの共有予定を取得 | メンバーのみ |

## ユーザー (プロフィール)

認証が必要です。

| メソッド | エンドポイント | 概要 | 備考 |
| :-- | :-- | :-- | :-- |
| `GET` | `/api/users/me` | プロフィールの取得 | `name`, `picture` を含みます |
| `PUT` | `/api/users/me` | プロフィールの更新 | body: `name` (1-50文字), `picture` (URL) |

## レート制限

- `/api/*` は 1 分あたり 100 回
- `/api/auth/google` は 15 分あたり 20 回

## 認証トークン (Cookie)

- Cookie 名: `token`
- `SameSite`: `Lax` (開発環境では `Lax`、本番では `Strict` が推奨)
- HttpOnly: 常に有効
- 本番環境では `Secure` 属性が有効になります

## エラー応答

- 4xx / 5xx の際、本番環境では `error` フィールドのみをクライアントへ返します (詳細はサーバーログに出力)
- 開発環境では `message` も含める場合があります