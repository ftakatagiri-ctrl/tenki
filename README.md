# そらナビ - React 天気予報アプリ

## StackBlitzでの起動
1. StackBlitzで **Create Project → Vite → React + TypeScript** を選択します。
2. このZIP内のファイルを同じ階層・フォルダ構成でアップロードし、既存ファイルを置き換えます。
3. `package.json` の依存パッケージがインストールされたら、プレビューが起動します。
4. ローカルで動かす場合は `npm install` → `npm run dev`。

## 主な機能
- 都市名検索（日本語対応）
- ブラウザの位置情報による現在地検索
- 現在の気温・体感温度・天気・湿度・風速・降水量
- 今日の時間別予報（12時間）
- 7日間の週間予報、日の出・日の入り、UV指数
- iPhone / Android を含むスマートフォン向けレスポンシブ表示

## 天気データ
Open-Meteo の Forecast API と Geocoding API を使用しています。APIキーは不要です。
- https://open-meteo.com/
- 都市検索: https://geocoding-api.open-meteo.com/v1/search
- 天気予報: https://api.open-meteo.com/v1/forecast

## 位置情報について
現在地ボタンを使うには、ブラウザで位置情報の利用を許可してください。位置情報はHTTPSまたはlocalhostで利用できます。拒否した場合も都市名検索は利用できます。

## StackBlitzで変更するファイル
- `src/App.tsx`: 天気取得、都市検索、位置情報、画面構成
- `src/App.css`: 色・レイアウト・レスポンシブデザイン
- `package.json`: React / Vite / TypeScript と起動コマンド
- `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`: Vite・TypeScript設定
- `index.html`: 日本語設定、スマートフォン表示設定
