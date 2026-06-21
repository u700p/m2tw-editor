export function toCRLF(text) {
  return String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
}

export function textBlob(text, type = 'text/plain') {
  return new Blob([toCRLF(text)], { type });
}
