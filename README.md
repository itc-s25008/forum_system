# 講義で作成した DB版メッセージボードの構成と異なる部分

- `forum_system`はPugによる画面表示ではなく、`http://localhost:3000/api`配下のREST APIとして動作する。
- 共通ロジックをルート直下に置き、ルート処理は`routes/`、Prismaクライアントは`libs/prisma.ts`に分けている。
- `app.ts`でExpressアプリの設定と`app.listen()`を行う。
- `forum.yaml`にOpenAPI形式のAPI仕様を定義している。
- ユーザ、トピック、メッセージの論理削除を含むデータモデルを持つ。
- ログインセッションはメモリではなくValKeyへ保存する。セッションは`forum-session:`プレフィックスで管理される。
- Docker ComposeにはPostgreSQLに加えてValKeyサービスを追加している。
- ValKey接続には`connect-redis`と`redis`パッケージを使用し、接続先は`VALKEY_URL`で設定する。
- `public/`、`views/`、`styles/`などのPug・静的ファイル用フォルダは持たない。
- `package.json`の`watch`スクリプトには、CSS監視用の`watch:css`がない。
