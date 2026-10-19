export function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`
}

export function quoteLiteral(text: string): string {
  return `'${text.replaceAll("'", "''")}'`
}
