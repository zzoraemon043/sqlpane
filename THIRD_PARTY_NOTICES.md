# Third-party notices

sqlpane is released under the MIT License. It redistributes the packages below in the built site. Each package keeps its own license; the full license texts are shipped in the corresponding package in `node_modules` and in the upstream repositories.

| Package | License | Used for |
| --- | --- | --- |
| react | MIT | User interface |
| react-dom | MIT | User interface |
| @duckdb/duckdb-wasm | MIT | SQL engine, WebAssembly bundles and workers served by the site |
| apache-arrow | Apache-2.0 | Columnar data exchange with the SQL engine |
| sql.js | MIT | Reading SQLite database files, WebAssembly file served by the site |
| hyparquet | MIT | Reading Parquet files |
| hyparquet-compressors | MIT | Parquet decompression codecs |
| fzstd | MIT | Zstandard decompression, dependency of hyparquet-compressors |
| hysnappy | MIT | Snappy decompression, dependency of hyparquet-compressors |
| hyparquet-writer | MIT | Writing Parquet files |
| fflate | MIT | Reading and writing Excel workbooks (zip containers) |

Development-only tools such as TypeScript, Vite, Vitest, Playwright and ESLint are not redistributed in the built site.
