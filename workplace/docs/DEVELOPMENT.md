# 開発者ガイド

## 1. インストール (初回のみ)

### front

本プロジェクトのフロントエンドは、ビルド不要の静的ファイルです。Live Server などで `workplace/frontend/` を配信してください。

### backend

```bash
cd backend/
npm install
```

### 全体

- `backend/.env` は `.gitignore` で除外されていますので、絶対にコミットしないでください。

## 2. 開発サーバーの起動

### front

```bash
cd frontend/
npx http-server . -p 5500
# または VS Code の Live Server で開いてください
```

### backend

```bash
cd backend/
npm run dev
```

`http://localhost:5000` で起動します (`PORT` で変更可能)。

## 3. 環境変数

`backend/.env` に以下を設定します。

| 変数名 | 必須 | 説明 |
| :-- | :--: | :-- |
| `DATABASE_URL` | ✅ | Neon (PostgreSQL) の接続文字列 |
| `JWT_SECRET` | ✅ | JWT の署名鍵。**32 文字以上**にしてください。未設定または短い場合、サーバーは起動しません |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth のクライアント ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth のクライアントシークレット |
| `FRONTEND_URL` | 推奨 | フロントエンドの URL。CORS の許可オリジンに追加されます |
| `PORT` | 任意 | ローカル開発時のポート番号 (既定値: `5000`) |
| `NODE_ENV` | 任意 | `production` で、Cookie の `Secure` 属性、500 エラー詳細の非表示、localhost 系 CORS の無効化が有効になります |

`JWT_SECRET` は次のコマンドで生成できます。

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

>.env は絶対にコミットしないでください (`.gitignore` で除外済みです)。

## 3. ディレクトリ構成

```text
schedule/
├── README.md
├── LICENSE.md
└── workplace/
    ├── backend/
    │   ├── index.ts          # エントリーポイント
    │   ├── vercel.json
    │   └── src/
    │       └── ...
    ├── frontend/               # 静的ファイル
    │   └── ...
    └── docs/
        ├── API.md
        ├── DEVELOPMENT.md
        └── CONTRIBUTING.md
```