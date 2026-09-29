/**
 * Sanitizes a string to be a valid Windows and POSIX filename.
 * Removes invalid characters: \ / : * ? " < > | \r \n
 * Ensures the filename ends with the specified extension (defaulting to .pdf).
 */
export function sanitizeFilename(filename?: string, defaultExtension = '.pdf'): string {
  if (!filename || typeof filename !== 'string') {
    const defaultName = `Document_${Date.now()}`;
    return defaultExtension ? `${defaultName}${defaultExtension}` : defaultName;
  }

  // Replace invalid filesystem characters with underscores
  let clean = filename
    .replace(/[\\/:*?"<>|\r\n]/g, '_')
    .trim()
    .replace(/^\.+/, ''); // Strip leading dots

  if (!clean) {
    clean = `Document_${Date.now()}`;
  }

  if (defaultExtension) {
    const ext = defaultExtension.startsWith('.') ? defaultExtension : `.${defaultExtension}`;
    if (!clean.toLowerCase().endsWith(ext.toLowerCase())) {
      clean = `${clean}${ext}`;
    }
  }

  return clean;
}
