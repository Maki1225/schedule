# コントリビューションガイド

## 1. リポジトリの準備 (初回のみ)

### 自分のフォークをクローン
```bash
git clone git@github.com:自分のユーザー名/schedule.git
cd workplace/schedule/
```

### upstream の登録
```bash
git remote add upstream git@github.com:ValeriaTang/schedule.git
git remote -v
```

## 2. 作業開始前の同期

```bash
git fetch upstream
git checkout main
git reset --hard upstream/main
```

## 3. 作業用ブランチの作成

```bash
git checkout -b feature/ブランチ名
```

## 4. 変更のコミット

```bash
git add .
git status
git commit -m "feat: 機能名を追加"
```

## 5. 自分のフォークへプッシュ

```bash
git push origin feature/ブランチ名
```

## 6. プルリクエスト (Pull Request) の作成

GitHub上でプルリクエストを作成し、本家リポジトリの `main` ブランチへマージを依頼してください。
