# sqlpane

**Drop in a file. Query it with SQL. Nothing leaves your browser.**

sqlpane is an offline-first SQL workbench that runs entirely in the browser. Drag in CSV, JSON, Excel, Parquet or SQLite files, or a MySQL or SQL Server script export, and query them with SQL. It is built on DuckDB-WASM and works without a server or an account.

**線上試用 / Try it online: <https://zzoraemon043.github.io/sqlpane/>**

[繁體中文](#繁體中文) | [English](#english)

> Status: early development. The design is in [docs/spec.md](docs/spec.md).

---

## English

### Why

Looking inside a data file usually means installing a database, writing an import script or uploading the file to a cloud service. sqlpane opens the file in a browser tab, turns it into a table and lets you query it right away. Your data stays on your machine.

### Planned features

- Open CSV, TSV, JSON, NDJSON, Excel, Parquet and SQLite database files by drag and drop
- Import MySQL (`mysqldump`) and SQL Server (Generate Scripts) `.sql` exports into tables
- SQL editor with table and column completion, formatting and query history
- Virtualized result grid that stays fast with millions of rows, with sorting and filtering
- Quick charts from query results
- Export results to CSV, JSON, Parquet and Excel
- Installable as a PWA and fully usable offline
- Interface in Traditional Chinese and English

### License

[MIT](LICENSE)

---

## 繁體中文

**拖進檔案，用 SQL 查詢，資料不離開瀏覽器。**

sqlpane 是完全在瀏覽器中執行、離線優先的 SQL 工作台。把 CSV、JSON、Excel、Parquet、SQLite 檔案，或 MySQL、SQL Server 匯出的 `.sql` 腳本拖進來，就能直接用 SQL 查詢。底層使用 DuckDB-WASM，不需要伺服器，也不需要帳號。

### 為什麼需要它

想看一個資料檔的內容，通常得先安裝資料庫、寫匯入腳本，或把檔案上傳到雲端服務。sqlpane 在瀏覽器分頁中直接打開檔案、轉成資料表，馬上就能查詢，資料始終留在你的電腦上。

### 規劃中的功能

- 拖放開啟 CSV、TSV、JSON、NDJSON、Excel、Parquet 與 SQLite 資料庫檔
- 匯入 MySQL（`mysqldump`）與 SQL Server（產生指令碼）匯出的 `.sql` 檔
- SQL 編輯器：資料表與欄位自動補全、格式化、查詢紀錄
- 虛擬捲動的結果表格，百萬筆資料也流暢，支援排序與篩選
- 從查詢結果快速產生圖表
- 結果匯出為 CSV、JSON、Parquet 與 Excel
- 可安裝為 PWA，完全離線使用
- 繁體中文與英文介面

### 授權

[MIT](LICENSE)
