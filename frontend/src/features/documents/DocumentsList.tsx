import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Folder,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  Trash2,
  Search,
  MoreVertical,
  X,
  Loader2,
  Paperclip,
  Check,
} from 'lucide-react';
import notification from '@/core/services/NotificationService';
import {
  ZohoPageHeader,
  ZohoListTable,
} from '@/shared/components/zoho';

export interface DocumentItem {
  id: string;
  name: string;
  folder: string;
  type: string;
  size: string;
  uploadedBy: string;
  date: string;
  url?: string;
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    name: 'Q3_GST_Filing_Summary.pdf',
    folder: 'Tax Documents',
    type: 'PDF',
    size: '1.4 MB',
    uploadedBy: 'Admin User',
    date: '2026-10-12',
  },
  {
    id: 'doc-2',
    name: 'HDFC_Bank_Statement_Sep2026.csv',
    folder: 'Bank Statements',
    type: 'CSV',
    size: '420 KB',
    uploadedBy: 'Accountant',
    date: '2026-10-05',
  },
  {
    id: 'doc-3',
    name: 'Office_Lease_Agreement_2025_2027.pdf',
    folder: 'Contracts',
    type: 'PDF',
    size: '3.8 MB',
    uploadedBy: 'Director',
    date: '2026-08-15',
  },
  {
    id: 'doc-4',
    name: 'Vendor_Invoice_INV-88902.pdf',
    folder: 'Bills',
    type: 'PDF',
    size: '890 KB',
    uploadedBy: 'Admin User',
    date: '2026-10-14',
  },
  {
    id: 'doc-5',
    name: 'Petty_Cash_Receipts_Bundle_Oct.png',
    folder: 'Receipts',
    type: 'PNG',
    size: '2.1 MB',
    uploadedBy: 'Cashier',
    date: '2026-10-10',
  },
];

const FOLDERS = [
  'All Documents',
  'Inbox',
  'Receipts',
  'Bills',
  'Bank Statements',
  'Contracts',
  'Tax Documents',
];

export const DocumentsList: React.FC = () => {
  const [activeFolder, setActiveFolder] = useState<string>('All Documents');
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem('billaura_documents');
      return saved ? JSON.parse(saved) : DEFAULT_DOCUMENTS;
    } catch {
      return DEFAULT_DOCUMENTS;
    }
  });

  const [search, setSearch] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState<boolean>(false);
  const [folderList, setFolderList] = useState<string[]>(FOLDERS);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string>('Inbox');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveDocuments = (items: DocumentItem[]) => {
    setDocuments(items);
    try {
      localStorage.setItem('billaura_documents', JSON.stringify(items));
    } catch {}
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (activeFolder !== 'All Documents' && doc.folder !== activeFolder) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.type.toLowerCase().includes(q) ||
          doc.uploadedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, activeFolder, search]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: DocumentItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split('.').pop()?.toUpperCase() || 'FILE';
      const sizeStr = f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`;

      newDocs.push({
        id: `doc-${Date.now()}-${i}`,
        name: f.name,
        folder: uploadTargetFolder,
        type: ext,
        size: sizeStr,
        uploadedBy: 'Current User',
        date: new Date().toISOString().split('T')[0],
      });
    }

    saveDocuments([...newDocs, ...documents]);
    notification.success(`Uploaded ${newDocs.length} file(s) successfully`);
    setIsUploadModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const remaining = documents.filter((d) => d.id !== id);
    saveDocuments(remaining);
    notification.success('Document deleted');
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (folderList.includes(newFolderName.trim())) {
      notification.warning('Folder already exists');
      return;
    }
    setFolderList([...folderList, newFolderName.trim()]);
    setActiveFolder(newFolderName.trim());
    setNewFolderName('');
    setIsNewFolderOpen(false);
    notification.success('Folder created successfully');
  };

  const columns = [
    {
      key: 'name',
      label: 'NAME',
      width: '40%',
      render: (row: DocumentItem) => {
        const isPdf = row.type === 'PDF';
        const isImg = ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(row.type);
        const isSheet = ['CSV', 'XLSX', 'XLS'].includes(row.type);

        return (
          <div className="flex items-center gap-2.5 truncate">
            {isPdf ? (
              <FileText className="w-4 h-4 text-red-500 shrink-0" />
            ) : isImg ? (
              <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
            ) : isSheet ? (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
            )}
            <span className="font-semibold text-gray-900 truncate hover:text-[#408DFB] cursor-pointer">
              {row.name}
            </span>
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'TYPE',
      width: '12%',
      render: (row: DocumentItem) => (
        <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {row.type}
        </span>
      ),
    },
    {
      key: 'size',
      label: 'SIZE',
      width: '12%',
      render: (row: DocumentItem) => (
        <span className="text-xs text-gray-500 font-mono">{row.size}</span>
      ),
    },
    {
      key: 'uploadedBy',
      label: 'UPLOADED BY',
      width: '18%',
      render: (row: DocumentItem) => (
        <span className="text-xs text-gray-700">{row.uploadedBy}</span>
      ),
    },
    {
      key: 'date',
      label: 'DATE',
      width: '12%',
      render: (row: DocumentItem) => (
        <span className="text-xs text-gray-500 font-mono">
          {new Date(row.date).toLocaleDateString('en-IN')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      align: 'right' as const,
      render: (row: DocumentItem) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => notification.success(`Downloading ${row.name}`)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row.id)}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const folderViews = folderList.map((f) => ({ id: f, label: f }));

  return (
    <div className="flex flex-col h-full bg-white select-none font-sans">
      <ZohoPageHeader
        title={activeFolder}
        views={folderViews}
        activeViewId={activeFolder}
        onViewChange={(f) => setActiveFolder(f)}
        newAction={{
          label: '+ Upload',
          onClick: () => setIsUploadModalOpen(true),
        }}
      />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Folder Tree */}
        <div className="w-60 border-r border-[#E5E7EB] bg-[#F8F9FB] flex flex-col h-full overflow-y-auto p-3 text-xs">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
              Folders
            </span>
            <button
              type="button"
              onClick={() => setIsNewFolderOpen(true)}
              className="text-[#408DFB] hover:underline flex items-center gap-1 font-semibold"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {folderList.map((folder) => {
              const count = documents.filter((d) =>
                folder === 'All Documents' ? true : d.folder === folder
              ).length;
              const isSelected = activeFolder === folder;

              return (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setActiveFolder(folder)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-[#408DFB] font-semibold'
                      : 'text-gray-700 hover:bg-gray-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{folder}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Table */}
        <div className="flex-1 min-h-0 flex flex-col">
          <ZohoListTable
            columns={columns}
            data={filteredDocuments}
            keyField={(row: DocumentItem) => row.id}
            emptyState={<div className="p-12 text-center text-xs text-gray-400">No documents found in this folder.</div>}
            pagination={{
              currentPage: 1,
              totalCount: filteredDocuments.length,
              pageSize: filteredDocuments.length || 25,
              onPageChange: () => {},
              onPageSizeChange: () => {},
            }}
          />
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Upload Documents</h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Target Folder</label>
                <select
                  value={uploadTargetFolder}
                  onChange={(e) => setUploadTargetFolder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                >
                  {folderList.filter((f) => f !== 'All Documents').map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50/50 hover:bg-blue-50/20 cursor-pointer transition-colors"
              >
                <Upload className="w-8 h-8 text-[#408DFB] mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Click to select files to upload</p>
                <p className="text-[11px] text-gray-500 mt-1">PDF, PNG, JPG, CSV, XLSX up to 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-1.5 text-xs bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateFolder}
            className="bg-white rounded-lg shadow-xl max-w-sm w-full border border-gray-200 overflow-hidden text-xs"
          >
            <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Create New Folder</h3>
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <label className="block text-gray-700 font-medium mb-1.5">Folder Name</label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Audit 2026"
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
              />
            </div>

            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-[#408DFB] text-white rounded font-semibold hover:bg-blue-600"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
