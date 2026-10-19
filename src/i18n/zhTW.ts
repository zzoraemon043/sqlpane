import type { Messages } from './en'
import { lineList } from '../loaders/notice'

export const zhTW: Messages = {
  language: '語言',
  appTagline: '拖進檔案，用 SQL 查詢，資料不離開瀏覽器。',
  engineStarting: '正在啟動 SQL 引擎...',
  engineFailed: 'SQL 引擎無法啟動。',
  openFiles: '開啟檔案',
  dropHint: '放開滑鼠，把檔案開啟成資料表',
  emptyWorkspace: '把 CSV、TSV、JSON、NDJSON、Parquet、Excel、SQLite 或 .sql 檔案拖到這裡，或按「開啟檔案」。',
  tables: '資料表',
  noTables: '尚未開啟任何資料表。',
  rename: '重新命名',
  renameTable: '資料表新名稱',
  save: '儲存',
  cancel: '取消',
  drop: '移除',
  loading: '正在開啟',
  loadedTables: '已開啟',
  rows: '筆',
  unsupportedBackup:
    '無法開啟資料庫備份檔（.bak、.mdf）或 MySQL 資料檔。請改為匯出 .sql 指令碼：在 SQL Server Management Studio 中使用「工作 > 產生指令碼」，並把「要編寫指令碼的資料類型」設為「結構描述和資料」；MySQL 請執行 mysqldump。',
  unsupportedUnknown: '不支援這種檔案類型。',
  loadFailed: '無法開啟',
  dismiss: '關閉',
  importReport: '匯入報告',
  importProgress: '匯入進度',
  statementsRead: '個陳述式',
  rowsImported: '筆資料已匯入',
  dialectMysql: 'MySQL 指令碼',
  dialectSqlserver: 'SQL Server 指令碼',
  skippedStatements: '略過的陳述式',
  failedRows: '未匯入的資料列',
  failedStatements: '未匯入的陳述式',
  line: '行號',
  table: '資料表',
  reason: '原因',
  kind: '類型',
  statement: '陳述式',
  showingFirst: '僅顯示前',
  noProblems: '所有資料列都已匯入。',
  editorLabel: 'SQL 編輯器',
  editorPlaceholder: '在這裡輸入 SQL。按 Ctrl+Enter 或 Cmd+Enter 執行游標所在的陳述式或選取的文字。',
  run: '執行',
  running: '執行中...',
  format: '格式化',
  saveQuery: '儲存查詢',
  queryName: '查詢名稱',
  savedQueries: '已存查詢',
  noSavedQueries: '尚無已存查詢。',
  history: '查詢紀錄',
  noHistory: '尚未執行任何查詢。',
  clearHistory: '清除紀錄',
  results: '查詢結果',
  queryFailed: '查詢失敗',
  storageUnavailable: '瀏覽器儲存空間無法使用，查詢紀錄與已存查詢只會保留到關閉頁面為止。',
  rowCount: '筆',
  elapsed: '毫秒',
  preview: '預覽',
  columnsOf: (table: string) => `${table} 的欄位`,
  shownAfterFilter: '筆符合篩選條件',
  filter: '篩選',
  filterColumn: '篩選',
  resizeColumn: '調整欄寬',
  noRowsReturned: '陳述式已執行完成。',
  csvOptions: 'CSV 選項',
  delimiter: '分隔符號',
  headerRow: '標題列',
  automatic: '自動偵測',
  comma: '逗號',
  semicolon: '分號',
  tab: 'Tab 字元',
  pipe: '直線符號',
  yes: '有',
  no: '沒有',
  csvOptionsHint: '套用在變更後開啟的 CSV 與 TSV 檔案。',
  viewTable: '表格',
  viewChart: '圖表',
  resultView: '結果檢視',
  chartType: '圖表類型',
  chartKinds: { bar: '長條圖', line: '折線圖', scatter: '散佈圖', pie: '圓餅圖' },
  chartCategory: '類別',
  chartXAxis: 'X 軸',
  chartValue: '數值',
  chartNeedsNumbers: '圖表至少需要一個數值欄位。',
  chartOther: '其他',
  exportResult: '匯出',
  exportTruncated: 'Excel 最多只能放 1,048,575 列資料，其餘資料未匯出。',
  exportFailed: '匯出失敗',
  offlinePreparing: '正在準備離線使用...',
  offlineReady: '已可離線使用',
  offlineFailed: '無法離線使用',
  describeNotice: (notice) => {
    switch (notice.code) {
      case 'emptySheetSkipped':
        return `已略過空白工作表：${notice.sheet}`
      case 'rowsNotLoaded':
        return `${notice.table}：未載入的資料列：${lineList(notice.lines)}`
      case 'recordsSkipped':
        return `未載入的紀錄：${lineList(notice.lines)}`
      case 'zeroDatesAsNull':
        return `0000-00-00 這類零日期已存成 NULL：${notice.count} 個`
      case 'computedColumnsSkipped':
        return `${notice.table}：未匯入計算欄位：${notice.columns.join('、')}`
      case 'createdWithTextColumns':
        return `${notice.table}：指令碼中沒有這張表的 CREATE TABLE，已用文字欄位建立`
      case 'valueTypeMismatch':
        return '資料值與欄位型別不符'
      case 'valueCountMismatch':
        return `應有 ${notice.expected} 個值，實際為 ${notice.found} 個`
      case 'detail':
        return notice.text
    }
  },
}
