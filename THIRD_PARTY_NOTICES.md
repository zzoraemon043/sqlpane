# Third-party notices

sqlpane is released under the MIT License. The built site redistributes the packages below. Each package keeps its own license.

Every build writes the full license and notice texts of these packages, including the NOTICE file of Apache Arrow, to `third-party-licenses.txt` next to `index.html`. The published copy is at <https://zzoraemon043.github.io/sqlpane/third-party-licenses.txt>.

| Package | License | Used for |
| --- | --- | --- |
| @duckdb/duckdb-wasm | MIT | SQL engine, WebAssembly bundles and workers served by the site |
| apache-arrow | Apache-2.0 | Columnar data exchange with the SQL engine |
| flatbuffers | Apache-2.0 | Dependency of apache-arrow |
| tslib | 0BSD | Dependency of apache-arrow |
| sql.js | MIT | Reading SQLite database files, WebAssembly file served by the site |
| hyparquet | MIT | Reading Parquet files |
| hyparquet-compressors | MIT | Parquet decompression codecs |
| fzstd | MIT | Zstandard decompression, dependency of hyparquet-compressors |
| hysnappy | MIT | Snappy decompression, dependency of hyparquet-compressors |
| hyparquet-writer | MIT | Writing Parquet files |
| fflate | MIT | Reading and writing Excel workbooks (zip containers) |
| react, react-dom, scheduler | MIT | User interface |
| codemirror and @codemirror/autocomplete, commands, lang-sql, language, lint, search, state, view | MIT | SQL editor |
| @lezer/common, @lezer/highlight, @lezer/lr | MIT | Parsing for the SQL editor |
| style-mod, w3c-keyname, crelt, @marijn/find-cluster-break | MIT | Dependencies of the SQL editor |
| sql-formatter | MIT | SQL formatting |
| nearley | MIT | Dependency of sql-formatter |
| @tanstack/react-virtual, @tanstack/virtual-core | MIT | Virtual scrolling of the result grid |

Development-only tools such as TypeScript, Vite, Vitest, Playwright, ESLint, jsdom, fake-indexeddb and Testing Library are not redistributed in the built site.
