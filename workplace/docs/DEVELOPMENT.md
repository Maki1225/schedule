# 開発者ガイド

## 1. インストール (初回のみ)

### frontend のセットアップ
```bash
cd frontend/
npm install
cd ..
```

### backend のセットアップ
```bash
cd backend/
npm install
cd ..
```

## 2. 開発サーバーの起動

### frontend の起動
```bash
cd frontend/
npm run dev
```

### backend の起動
```bash
cd backend/
npm run dev
```

## 3. 環境変数 (backend/.env)

```env
DATABASE_URL="your_database_url"
JWT_SECRET="your_jwt_secret"
GOOGLE_CLIENT_ID="your_google_client_id"
```

## 4. グループチャットのDB準備

グループチャットを有効にする前に、Neon PostgreSQLで
`backend/migrations/20261101_create_group_chat_messages.sql` を一度実行してください。
メッセージはグループ単位で保存され、課題の追加通知も同じテーブルに記録されます。

課題・予定の作成者・最終編集者と編集時刻を記録するため、Neon PostgreSQLで
`backend/migrations/20261101_add_event_audit_metadata.sql` も一度実行してください。

ログアウト時に発行済みJWTを失効させるため、Neon PostgreSQLで
`backend/migrations/20261102_add_user_token_version.sql` を一度実行してください。

APIレート制限を有効にするため、Neon PostgreSQLで
`backend/migrations/20261102_create_api_rate_limit_buckets.sql` も一度実行してください。

## 5. デモの使い方

デモの開始方法、セッションデータの扱い、ローカルでの表示方法は
[デモの使い方](./DEMO.md)を参照してください。
