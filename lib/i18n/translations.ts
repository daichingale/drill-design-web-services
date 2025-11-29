// lib/i18n/translations.ts

export type Language = "ja" | "en";

export type TranslationKey = 
  | "app.title"
  | "app.description"
  | "menu.file"
  | "menu.edit"
  | "menu.view"
  | "menu.file.save"
  | "menu.file.load"
  | "menu.file.export"
  | "menu.file.import"
  | "menu.file.editMetadata"
  | "menu.file.deleteAll"
  | "menu.edit.undo"
  | "menu.edit.redo"
  | "menu.edit.deleteAll"
  | "menu.view.commandPalette"
  | "menu.view.drillEditor"
  | "menu.view.memberManagement"
  | "menu.view.settings"
  | "set.operations"
  | "set.add"
  | "set.current"
  | "set.startCount"
  | "set.name"
  | "set.delete"
  | "set.reorder"
  | "snap.mode"
  | "snap.whole"
  | "snap.half"
  | "snap.free"
  | "arrangement.title"
  | "arrangement.lineById"
  | "arrangement.lineBySelection"
  | "arrangement.reorderSelection"
  | "confirmedCounts.title"
  | "confirmedCounts.navigation"
  | "copyPaste.title"
  | "copyPaste.copyAll"
  | "copyPaste.copySelected"
  | "copyPaste.selectSource"
  | "copyPaste.selectTarget"
  | "field.title"
  | "member.hover"
  | "common.confirm"
  | "common.cancel"
  | "common.save"
  | "common.delete"
  | "common.close"
  | "common.reset"
  | "common.apply"
  | "set.reorderUp"
  | "set.reorderDown"
  | "set.confirmPosition"
  | "set.cancel"
  | "set.removeConfirmed"
  | "set.selectSet"
  | "set.selectSourceSet"
  | "set.selectTargetSet"
  | "set.individualPlacement"
  | "set.individualPlacementOn"
  | "set.shapeCreation"
  | "set.transform"
  | "set.circle"
  | "set.rectangle"
  | "set.spiral"
  | "set.box"
  | "set.rotate"
  | "set.scale"
  | "set.bezierArc"
  | "set.startBezier"
  | "set.clearBezier"
  | "commandPalette.search"
  | "commandPalette.noResults"
  | "commandPalette.select"
  | "commandPalette.execute"
  | "commandPalette.close"
  | "exportOptions.title"
  | "exportOptions.description"
  | "exportOptions.selectSets"
  | "exportOptions.selectAll"
  | "exportOptions.deselectAll"
  | "exportOptions.includeSetName"
  | "exportOptions.includeCount"
  | "exportOptions.includeNote"
  | "exportOptions.includeInstructions"
  | "exportOptions.includeField"
  | "exportOptions.execute"
  | "exportOptions.warning"
  | "metadata.title"
  | "metadata.drillTitle"
  | "metadata.dataName"
  | "metadata.titlePlaceholder"
  | "metadata.dataNamePlaceholder"
  | "timeline.now"
  | "timeline.insertSet"
  | "timeline.range"
  | "music.load"
  | "music.change"
  | "music.play"
  | "music.pause"
  | "music.stop"
  | "music.bpm"
  | "music.currentSpeed"
  | "music.countsPerSecond"
  | "music.markers"
  | "music.addMarker"
  | "music.removeMarker"
  | "music.sync"
  | "position.confirm"
  | "position.confirmed"
  | "position.edit"
  | "position.cancel";

export const translations: Record<Language, Record<TranslationKey, string>> = {
  ja: {
    "app.title": "Drill Design Web",
    "app.description": "ブラウザでマーチングドリルを作成するツール",
    "menu.file": "ファイル",
    "menu.edit": "編集",
    "menu.view": "表示",
    "menu.file.save": "保存",
    "menu.file.load": "読み込み",
    "menu.file.export": "エクスポート",
    "menu.file.import": "インポート",
    "menu.file.editMetadata": "ドリル情報を編集",
    "menu.file.deleteAll": "データを全削除",
    "menu.edit.undo": "元に戻す",
    "menu.edit.redo": "やり直す",
    "menu.edit.deleteAll": "データを全削除",
    "menu.view.commandPalette": "コマンドパレット",
    "menu.view.drillEditor": "ドリルエディタ",
    "menu.view.memberManagement": "メンバー管理",
    "menu.view.settings": "設定",
    "set.operations": "Set 操作",
    "set.add": "Set 追加（最後尾）",
    "set.current": "現在の Set",
    "set.startCount": "開始カウント",
    "set.name": "セット名",
    "set.delete": "削除",
    "set.reorder": "並び替え",
    "snap.mode": "スナップ:",
    "snap.whole": "1マス",
    "snap.half": "0.5マス",
    "snap.free": "自由",
    "arrangement.title": "整列・ベジェ操作",
    "arrangement.lineById": "一列整列（ID順）",
    "arrangement.lineBySelection": "一列整列（選択順）",
    "arrangement.reorderSelection": "選択順入れ替え",
    "confirmedCounts.title": "確定済みカウント",
    "confirmedCounts.navigation": "確定済みカウント",
    "copyPaste.title": "コピー/ペースト",
    "copyPaste.copyAll": "セット全体をコピー",
    "copyPaste.copySelected": "選択メンバーをコピー",
    "copyPaste.selectSource": "コピー元を選択",
    "copyPaste.selectTarget": "ペースト先を選択",
    "field.title": "ドリルエディタ",
    "member.hover": "メンバー名",
    "common.confirm": "確定",
    "common.cancel": "キャンセル",
    "common.save": "保存",
    "common.delete": "削除",
    "common.close": "閉じる",
    "common.reset": "リセット",
    "common.apply": "適用",
    "set.reorderUp": "上に移動",
    "set.reorderDown": "下に移動",
    "set.confirmPosition": "位置を確定",
    "set.cancel": "キャンセル",
    "set.removeConfirmed": "確定を解除",
    "set.selectSet": "選択してください",
    "set.selectSourceSet": "コピー元を選択",
    "set.selectTargetSet": "ペースト先を選択",
    "set.individualPlacement": "個別配置モード",
    "set.individualPlacementOn": "個別配置モード（ON）",
    "set.shapeCreation": "形状作成",
    "set.transform": "変形・回転",
    "set.circle": "円形整列",
    "set.rectangle": "矩形整列",
    "set.spiral": "螺旋整列",
    "set.box": "箱形整列",
    "set.rotate": "回転",
    "set.scale": "拡大・縮小",
    "set.bezierArc": "ベジェ曲線",
    "set.startBezier": "ベジェ開始",
    "set.clearBezier": "ベジェ解除",
    "commandPalette.search": "コマンドを検索... (例: 保存、エクスポート)",
    "commandPalette.noResults": "コマンドが見つかりません",
    "commandPalette.select": "↑↓ で選択",
    "commandPalette.execute": "Enter で実行",
    "commandPalette.close": "Esc で閉じる",
    "exportOptions.title": "エクスポート・印刷オプション",
    "exportOptions.description": "出力に含める項目を選択してください",
    "exportOptions.selectSets": "印刷するSetを選択",
    "exportOptions.selectAll": "全て選択",
    "exportOptions.deselectAll": "全て解除",
    "exportOptions.includeSetName": "セット名",
    "exportOptions.includeCount": "開始カウント",
    "exportOptions.includeNote": "ノート",
    "exportOptions.includeInstructions": "動き方・指示",
    "exportOptions.includeField": "フィールド画像",
    "exportOptions.execute": "実行",
    "exportOptions.warning": "⚠️ 少なくとも1つのSetを選択してください",
    "metadata.title": "ドリル情報",
    "metadata.drillTitle": "ドリルタイトル",
    "metadata.dataName": "データ名",
    "metadata.titlePlaceholder": "例: 2024年度定期演奏会",
    "metadata.dataNamePlaceholder": "例: 2024-regular-concert",
    "timeline.now": "Now",
    "timeline.insertSet": "Insert set @ current",
    "timeline.range": "RANGE",
    "music.load": "音楽を読み込む",
    "music.change": "音楽を変更",
    "music.play": "▶ 再生",
    "music.pause": "⏸ 一時停止",
    "music.stop": "⏹ 停止",
    "music.bpm": "再生テンポ（BPM）",
    "music.currentSpeed": "現在の再生速度",
    "music.countsPerSecond": "カウント/秒",
    "music.markers": "マーカー",
    "music.addMarker": "マーカー追加",
    "music.removeMarker": "削除",
    "music.sync": "同期",
    "position.confirm": "位置を確定",
    "position.confirmed": "確定済みカウント",
    "position.edit": "位置を編集しました。確定してください。",
    "position.cancel": "キャンセル",
  },
  en: {
    "app.title": "Drill Design Web",
    "app.description": "A tool for creating marching drills in your browser",
    "menu.file": "File",
    "menu.edit": "Edit",
    "menu.view": "View",
    "menu.file.save": "Save",
    "menu.file.load": "Load",
    "menu.file.export": "Export",
    "menu.file.import": "Import",
    "menu.file.editMetadata": "Edit Drill Info",
    "menu.file.deleteAll": "Delete All Data",
    "menu.edit.undo": "Undo",
    "menu.edit.redo": "Redo",
    "menu.edit.deleteAll": "Delete All Data",
    "menu.view.commandPalette": "Command Palette",
    "menu.view.drillEditor": "Drill Editor",
    "menu.view.memberManagement": "Member Management",
    "menu.view.settings": "Settings",
    "set.operations": "Set Operations",
    "set.add": "Add Set (to end)",
    "set.current": "Current Set",
    "set.startCount": "Start Count",
    "set.name": "Set Name",
    "set.delete": "Delete",
    "set.reorder": "Reorder",
    "snap.mode": "Snap:",
    "snap.whole": "1 Step",
    "snap.half": "0.5 Step",
    "snap.free": "Free",
    "arrangement.title": "Arrangement & Bezier",
    "arrangement.lineById": "Line (by ID)",
    "arrangement.lineBySelection": "Line (by Selection)",
    "arrangement.reorderSelection": "Reorder Selection",
    "confirmedCounts.title": "Confirmed Counts",
    "confirmedCounts.navigation": "Confirmed Counts",
    "copyPaste.title": "Copy/Paste",
    "copyPaste.copyAll": "Copy Set",
    "copyPaste.copySelected": "Copy Selected",
    "copyPaste.selectSource": "Select Source",
    "copyPaste.selectTarget": "Select Target",
    "field.title": "Drill Editor",
    "member.hover": "Member Name",
    "common.confirm": "Confirm",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.close": "Close",
    "common.reset": "Reset",
    "common.apply": "Apply",
    "set.reorderUp": "Move Up",
    "set.reorderDown": "Move Down",
    "set.confirmPosition": "Confirm Position",
    "set.cancel": "Cancel",
    "set.removeConfirmed": "Remove Confirmation",
    "set.selectSet": "Please select",
    "set.selectSourceSet": "Select Source",
    "set.selectTargetSet": "Select Target",
    "set.individualPlacement": "Individual Placement",
    "set.individualPlacementOn": "Individual Placement (ON)",
    "set.shapeCreation": "Shape Creation",
    "set.transform": "Transform & Rotate",
    "set.circle": "Circle",
    "set.rectangle": "Rectangle",
    "set.spiral": "Spiral",
    "set.box": "Box",
    "set.rotate": "Rotate",
    "set.scale": "Scale",
    "set.bezierArc": "Bezier Arc",
    "set.startBezier": "Start Bezier",
    "set.clearBezier": "Clear Bezier",
    "commandPalette.search": "Search commands... (e.g., Save, Export)",
    "commandPalette.noResults": "No commands found",
    "commandPalette.select": "↑↓ to select",
    "commandPalette.execute": "Enter to execute",
    "commandPalette.close": "Esc to close",
    "exportOptions.title": "Export & Print Options",
    "exportOptions.description": "Select items to include in output",
    "exportOptions.selectSets": "Select Sets to Print",
    "exportOptions.selectAll": "Select All",
    "exportOptions.deselectAll": "Deselect All",
    "exportOptions.includeSetName": "Set Name",
    "exportOptions.includeCount": "Start Count",
    "exportOptions.includeNote": "Note",
    "exportOptions.includeInstructions": "Instructions",
    "exportOptions.includeField": "Field Image",
    "exportOptions.execute": "Execute",
    "exportOptions.warning": "⚠️ Please select at least one Set",
    "metadata.title": "Drill Information",
    "metadata.drillTitle": "Drill Title",
    "metadata.dataName": "Data Name",
    "metadata.titlePlaceholder": "e.g., 2024 Annual Concert",
    "metadata.dataNamePlaceholder": "e.g., 2024-regular-concert",
    "timeline.now": "Now",
    "timeline.insertSet": "Insert set @ current",
    "timeline.range": "RANGE",
    "music.load": "Load Music",
    "music.change": "Change Music",
    "music.play": "▶ Play",
    "music.pause": "⏸ Pause",
    "music.stop": "⏹ Stop",
    "music.bpm": "Playback Tempo (BPM)",
    "music.currentSpeed": "Current Playback Speed",
    "music.countsPerSecond": "counts/sec",
    "music.markers": "Markers",
    "music.addMarker": "Add Marker",
    "music.removeMarker": "Remove",
    "music.sync": "Sync",
    "position.confirm": "Confirm Position",
    "position.confirmed": "Confirmed Counts",
    "position.edit": "Position edited. Please confirm.",
    "position.cancel": "Cancel",
  },
};

