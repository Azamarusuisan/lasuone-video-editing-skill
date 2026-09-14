# Lasuone Video Editing Skill

「ラスワンのギャンブル魂〜復活編〜」の公開動画を分析し、チャンネルに合う編集判断を再利用できるCodex Skillとして整理するプロジェクトです。現在は学習・設計段階です。

## できること

- 長尺、Shorts、Podcast、バカラ、ポーカーなどを分けて編集方針を作る
- 字幕、カット、HUD、金額表示、画面転換、間、素材、プライバシーの判断を参照動画・時刻・信頼度と一緒に記録する
- 動画から定点画像、指定区間の全フレーム、カット候補、OCR、音量、未校正ASRを取得する
- フォーマット別テンプレートと編集・内容・権利のQC項目を参照する
- スキル草案と解析記録の構造・参照整合性を検証する

## Skill

草案は `skill-draft/lasuone-editing/SKILL.md` にあります。

```sh
python3 skill-draft/lasuone-editing/scripts/validate_package.py skill-draft/lasuone-editing
```

詳しい編集ルールは [CHANNEL_EDITING_BIBLE.md](CHANNEL_EDITING_BIBLE.md)、確認項目は [QUALITY_CHECKLIST.md](QUALITY_CHECKLIST.md) を参照してください。

## 現在の制限

実素材の自動編集、AI画像の生成・挿入、レンダリング、完成動画の採点は未実装です。研究用の動画・音声・静止画像はこのリポジトリに含まれません。
