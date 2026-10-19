export function parseXml(text: string): Document {
  const document = new DOMParser().parseFromString(text, 'application/xml')
  if (document.getElementsByTagName('parsererror').length > 0) throw new Error('the workbook contains invalid XML')
  return document
}

export function elementsByLocalName(root: Document | Element, localName: string): Element[] {
  return Array.from(root.getElementsByTagNameNS('*', localName))
}

export function childrenByLocalName(parent: Element, localName: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === localName)
}

export function attributeByLocalName(element: Element, localName: string): string | null {
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName) return attribute.value
  }
  return null
}
