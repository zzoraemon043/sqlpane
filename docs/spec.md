# sqlpane design

## Goal

A browser SQL workbench for local data files and database script exports. It must work offline after the first load and never send data to a server.

## Architecture

- React, TypeScript, Vite, static site deployable to GitHub Pages
- DuckDB-WASM in a Web Worker as the query engine
- Every asset the app needs at runtime, including the DuckDB WASM bundles and any extensions, is served from the app itself. No CDN requests at runtime.
- A service worker caches the app shell for offline use and installation as a PWA
- Content Security Policy that blocks network access except the app's own origin

## Data sources

| Source | How it is loaded |
| --- | --- |
| CSV, TSV | DuckDB `read_csv` with automatic type and delimiter detection, with an option to override them |
| JSON, NDJSON | DuckDB `read_json` |
| Parquet | DuckDB `read_parquet` |
| Excel `.xlsx` | Parse with a library whose license allows redistribution, then insert into DuckDB, one table per sheet |
| SQLite `.db`, `.sqlite` | Read every table into DuckDB without a network request. If a DuckDB extension is used, bundle it with the app |
| MySQL `.sql` from `mysqldump` | Script importer, see below |
| SQL Server `.sql` from Generate Scripts | Script importer, see below |

Each opened file becomes one or more tables named after the file. Users can rename tables.

### Script importer

MySQL and SQL Server scripts do not run in DuckDB as they are. The importer converts the parts needed to rebuild the data:

- `CREATE TABLE` with column names, types, nullability and primary keys
- `INSERT` statements, including multi-row inserts and `INSERT ... VALUES` batches
- Type mapping to DuckDB types, for example `TINYINT(1)`, `DATETIME`, `NVARCHAR(MAX)`, `UNIQUEIDENTIFIER`, `MONEY`, `BIT`
- Identifier quoting with backticks and square brackets
- String literals with escapes, `N'...'` Unicode strings, hex literals and `NULL`
- `GO` batch separators, `SET` statements, `USE`, comments, `LOCK TABLES` and other statements that do not affect data are skipped and listed in an import report

Streaming parse, so a dump of several hundred megabytes does not load fully into memory as one string. Report progress, skipped statements and failed rows with line numbers.

SQL Server `.bak` backups and MySQL binary data directories are out of scope. The import screen explains how to export a script instead.

## Editor

- SQL editor with syntax highlighting, completion of table and column names from the current schema, and formatting
- Run the statement under the cursor or the selection
- Query history and saved queries stored in IndexedDB, wrapped in error handling so the app still works when storage is unavailable
- Schema sidebar with tables, columns and types, and a preview of the first rows

## Results

- Virtualized grid for millions of rows, with column resizing, sorting and filtering
- Show row count and query time
- Charts: bar, line, scatter and pie from selected columns
- Export the result to CSV, JSON, Parquet and Excel

## Internationalization

- Traditional Chinese (Taiwan) and English, switchable at runtime, defaulting to the browser language
- Taiwan vocabulary in Chinese text

## Quality

- Unit tests with Vitest for the script importer, type mapping and each file loader
- End-to-end tests with Playwright for opening each file type, running a query and exporting
- Fixtures are small generated or hand-written files in open formats. No real personal data.
- Lighthouse performance and accessibility checks on the built site

## Out of scope for the first release

- Connecting to a live MySQL or SQL Server. Browsers cannot open database connections.
- AI features such as natural language to SQL
- Collaboration or cloud sync
