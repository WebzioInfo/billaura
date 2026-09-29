import { resolveDocumentFolder } from './documentFolderResolver';
import { sanitizeFilename } from './sanitizeFilename';

const DB_NAME = 'BillAuraStorage';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'downloadsDir';

/**
 * IndexedDB helper to persist FileSystemDirectoryHandle.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to persist directory handle to IndexedDB:', err);
  }
}

async function verifyPermission(handle: FileSystemDirectoryHandle, readWrite = true): Promise<boolean> {
  const options = { mode: readWrite ? 'readwrite' : 'read' } as const;
  try {
    if ((await (handle as any).queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await (handle as any).requestPermission(options)) === 'granted') {
      return true;
    }
  } catch (_) {}
  return false;
}

export interface SaveDocumentOptions {
  blob: Blob;
  docType?: string;
  docTitle?: string;
  filename: string;
  forcePicker?: boolean;
}

export interface SaveResult {
  success: boolean;
  mode: 'filesystem' | 'fallback';
  relativePath?: string;
}

export class DownloadDirectoryManager {
  /**
   * Checks if the File System Access API is supported by the current browser.
   */
  static isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  /**
   * Checks whether a stored, valid directory handle exists.
   */
  static async hasStoredDirectory(): Promise<boolean> {
    if (!this.isFileSystemAccessSupported()) return false;
    const handle = await getStoredDirectoryHandle();
    if (!handle) return false;
    return verifyPermission(handle, true);
  }

  /**
   * Prompts the user to select their Downloads directory.
   */
  static async connectDownloadsDirectory(): Promise<boolean> {
    if (!this.isFileSystemAccessSupported()) return false;
    try {
      const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        id: 'bill_aura_downloads_root',
        startIn: 'downloads',
      });
      const granted = await verifyPermission(handle, true);
      if (granted) {
        await storeDirectoryHandle(handle);
        return true;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Directory selection failed:', err);
      }
    }
    return false;
  }

  /**
   * Saves a document Blob.
   * If File System Access API is available and permission is granted, automatically
   * organizes the file under: Downloads/Bill Aura/<Folder>/<SafeFilename>.pdf
   * Otherwise falls back seamlessly to browser Blob download.
   */
  static async saveDocument(options: SaveDocumentOptions): Promise<SaveResult> {
    const { blob, docType, docTitle, filename, forcePicker = false } = options;
    const safeFileName = sanitizeFilename(filename, '.pdf');
    const folderName = resolveDocumentFolder(docType, docTitle);
    const relativePath = `Bill Aura/${folderName}/${safeFileName}`;

    if (this.isFileSystemAccessSupported()) {
      try {
        let rootHandle = await getStoredDirectoryHandle();
        let valid = false;

        if (rootHandle && !forcePicker) {
          valid = await verifyPermission(rootHandle, true);
        }

        if (!valid) {
          const connected = await this.connectDownloadsDirectory();
          if (connected) {
            rootHandle = await getStoredDirectoryHandle();
            valid = !!rootHandle;
          }
        }

        if (rootHandle && valid) {
          // 1. Create/Get 'Bill Aura' directory
          const billAuraDir = await rootHandle.getDirectoryHandle('Bill Aura', { create: true });
          
          // 2. Create/Get subfolder (e.g. 'Invoices', 'Receipts')
          const subDir = await billAuraDir.getDirectoryHandle(folderName, { create: true });

          // 3. Create file handle
          const fileHandle = await subDir.getFileHandle(safeFileName, { create: true });

          // 4. Write blob content
          const writable = await (fileHandle as any).createWritable();
          await writable.write(blob);
          await writable.close();

          return {
            success: true,
            mode: 'filesystem',
            relativePath,
          };
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('File System Access save failed, using browser fallback:', err);
        }
      }
    }

    // Fallback: Normal browser download
    this.fallbackBrowserDownload(blob, safeFileName);
    return {
      success: true,
      mode: 'fallback',
      relativePath: safeFileName,
    };
  }

  /**
   * Safe fallback for standard browser Blob download.
   */
  private static fallbackBrowserDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
