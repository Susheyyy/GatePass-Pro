export function csvText(headers, rows) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}

export function downloadCSV(filename, headers, rows) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csvText(headers, rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
