import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ModernButton } from '../ui/ModernButton';
import { useContactStore } from '../../hooks/useContactStore';
import { Contact } from '../../types';
import {
  X,
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  Users,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useContactFilterFields } from '../../hooks/useContactFilterFields';
import {
  autoMatchColumns,
  BASE_IMPORT_TARGETS,
  flagImportDuplicates,
  IGNORE,
  parseCsvText,
  rowsToContacts,
  type ImportTarget
} from '../../lib/import/columnMapping';

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CSV_TEMPLATE_HEADERS = [
  'firstName',
  'lastName',
  'email'
];

const SAMPLE_CSV_DATA = [
  [
    'John',
    'Smith',
    'john.smith@company.com'
  ],
  [
    'Sarah',
    'Johnson',
    'sarah.j@startup.io'
  ]
];

export const ImportContactsModal: React.FC<ImportContactsModalProps> = ({ isOpen, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'upload' | 'preview'>('guide');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importContacts, contacts: existingContacts } = useContactStore();

  // Column mapping state
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const allFields = useContactFilterFields();

  const importTargets: ImportTarget[] = useMemo(
    () => [
      ...BASE_IMPORT_TARGETS,
      ...allFields
        .filter((f) => f.source === 'custom')
        .map((f) => ({ key: `custom:${f.label}`, label: `${f.label} (custom)`, aliases: [f.label] }))
    ],
    [allFields]
  );

  const headers = useMemo(
    () => (csvData[0] ? (hasHeader ? csvData[0].map((h) => String(h ?? '')) : csvData[0].map((_, i) => `Column ${i + 1}`)) : []),
    [csvData, hasHeader]
  );
  const dataRows = useMemo(() => (hasHeader ? csvData.slice(1) : csvData), [csvData, hasHeader]);
  const processedRows = useMemo(
    () => rowsToContacts(dataRows, mapping, hasHeader ? 2 : 1),
    [dataRows, mapping, hasHeader]
  );
  const duplicateFlags = useMemo(
    () => flagImportDuplicates(processedRows.filter((r) => r.errors.length === 0), existingContacts ?? []),
    [processedRows, existingContacts]
  );
  const missingRequired = BASE_IMPORT_TARGETS.filter(
    (t) => t.required && t.key !== 'firstName' && t.key !== 'lastName' && !Object.values(mapping).includes(t.key)
  );
  const hasName =
    (Object.values(mapping).includes('firstName') && Object.values(mapping).includes('lastName')) ||
    Object.values(mapping).includes('name');

  // Recompute valid rows / errors whenever the mapping or options change
  useEffect(() => {
    if (csvData.length === 0) return;
    const skipRows = new Set(skipDuplicates ? duplicateFlags.map((f) => f.rowNumber) : []);
    setErrors(
      processedRows.filter((r) => r.errors.length > 0).map((r) => `Row ${r.rowNumber}: ${r.errors.join(', ')}`)
    );
    setParsedContacts(processedRows.filter((r) => r.errors.length === 0 && !skipRows.has(r.rowNumber)).map((r) => r.contact));
  }, [processedRows, duplicateFlags, skipDuplicates, csvData.length]);

  const downloadTemplate = () => {
    const csvContent = [
      CSV_TEMPLATE_HEADERS.join(','),
      ...SAMPLE_CSV_DATA.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const loadRows = (rows: string[][], header = true) => {
    if (rows.length < 2 || !rows[0]) {
      setErrors(['File must contain at least a header row and one data row']);
      return;
    }
    setCsvData(rows);
    setHasHeader(header);
    const heads = header ? rows[0].map((h) => String(h ?? '')) : rows[0].map((_, i) => `Column ${i + 1}`);
    setMapping(autoMatchColumns(heads, importTargets));
  };

  const readSheet = (workbook: XLSX.WorkBook, sheetName: string): string[][] | null => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return null;
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as unknown[][];
    return json
      .map((r) => r.map((c) => String(c ?? '').trim()))
      .filter((r) => r.some((c) => c !== ''));
  };

  const handleSheetChange = (name: string) => {
    if (!workbookRef.current) return;
    const rows = readSheet(workbookRef.current, name);
    if (!rows) {
      setErrors(['Excel worksheet could not be read']);
      return;
    }
    setActiveSheet(name);
    loadRows(rows, hasHeader);
  };

  const handleHeaderToggle = (checked: boolean) => {
    setHasHeader(checked);
    if (csvData[0]) {
      const heads = checked ? csvData[0].map((h) => String(h ?? '')) : csvData[0].map((_, i) => `Column ${i + 1}`);
      setMapping(autoMatchColumns(heads, importTargets));
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const lower = selectedFile.name.toLowerCase();
    const isCSV = lower.endsWith('.csv');
    const isXLSX = lower.endsWith('.xlsx') || lower.endsWith('.xls');

    if (!isCSV && !isXLSX) {
      setErrors(['Please select a CSV or Excel file (.csv, .xlsx, .xls)']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    setImportResults(null);
    workbookRef.current = null;
    setSheetNames([]);
    setActiveSheet('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (isCSV) {
          loadRows(parseCsvText(e.target?.result as string));
        } else {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const first = workbook.SheetNames[0];
          if (!first) {
            setErrors(['Excel file must contain at least one worksheet']);
            return;
          }
          workbookRef.current = workbook;
          setSheetNames(workbook.SheetNames);
          setActiveSheet(first);
          const rows = readSheet(workbook, first);
          if (!rows) {
            setErrors(['Excel worksheet could not be read']);
            return;
          }
          loadRows(rows);
        }
        setActiveTab('preview');
      } catch (error) {
        setErrors([`Failed to parse ${isCSV ? 'CSV' : 'Excel'} file`]);
      }
    };

    if (isCSV) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleImport = async () => {
    if (parsedContacts.length === 0) return;
    
    setIsProcessing(true);
    try {
      await importContacts(parsedContacts);
      setImportResults({ success: parsedContacts.length, failed: errors.length });
      setActiveTab('preview');
    } catch (error) {
      setErrors(['Failed to import contacts']);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setCsvData([]);
    setParsedContacts([]);
    setErrors([]);
    setImportResults(null);
    setMapping({});
    setHasHeader(true);
    setSheetNames([]);
    setActiveSheet('');
    workbookRef.current = null;
    setActiveTab('guide');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl text-white">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import Contacts</h2>
              <p className="text-gray-600">Upload CSV file to import multiple contacts</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'guide', label: 'CSV Format Guide', icon: Info },
            { id: 'upload', label: 'Upload File', icon: Upload },
            { id: 'preview', label: 'Preview & Import', icon: Database }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'guide' | 'upload' | 'preview')}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'guide' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">CSV Format Requirements</h3>
                    <p className="text-blue-800">Follow this guide to ensure your CSV file imports correctly.</p>
                  </div>
                </div>
              </div>

              {/* Required Fields */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                  Required Fields (Minimum)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { field: 'firstName', description: 'Contact\'s first name' },
                    { field: 'lastName', description: 'Contact\'s last name' },
                    { field: 'email', description: 'Valid email address (e.g., john@company.com)' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900">{item.field}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Fields */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  Optional Fields
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  You can include any of these additional fields in your CSV. They are all optional and will be processed if present.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { field: 'name', description: 'Full name (auto-generated from firstName + lastName if not provided)' },
                    { field: 'title', description: 'Job title or position' },
                    { field: 'company', description: 'Company name' },
                    { field: 'phone', description: 'Phone number with country code' },
                    { field: 'industry', description: 'Industry category' },
                    { field: 'sources', description: 'Comma-separated (LinkedIn,Email,Website)' },
                    { field: 'interestLevel', description: 'hot, medium, low, or cold' },
                    { field: 'status', description: 'lead, prospect, customer, or churned' },
                    { field: 'notes', description: 'Additional notes about the contact' },
                    { field: 'tags', description: 'Comma-separated tags (Enterprise,VIP)' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900">{item.field}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Format */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-500" />
                  Sample CSV Format
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre">
{`firstName,lastName,email
John,Smith,john.smith@company.com
Sarah,Johnson,sarah.j@startup.io

For additional fields, you can add columns like:
firstName,lastName,email,company,title,phone
John,Smith,john.smith@company.com,Tech Corp,Marketing Director,+1-555-0123
Sarah,Johnson,sarah.j@startup.io,Startup Inc,CEO,+1-555-0456`}
                  </pre>
                </div>
              </div>

              {/* Download Template */}
              <div className="flex justify-center">
                <ModernButton
                  variant="primary"
                  onClick={downloadTemplate}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV Template</span>
                </ModernButton>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {file ? 'File Selected' : 'Upload CSV File'}
                </h3>
                {file ? (
                  <div className="space-y-2">
                    <p className="text-green-600 font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Different File
                    </ModernButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <ModernButton
                      variant="primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </ModernButton>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900 mb-2">Import Errors</h4>
                      <ul className="space-y-1">
                        {errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {parsedContacts.length > 0 && errors.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <h4 className="font-semibold text-green-900">Ready to Import</h4>
                      <p className="text-sm text-green-700">
                        {parsedContacts.length} contacts parsed successfully
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              {importResults ? (
                <div className="text-center space-y-4">
                  <div className="p-8 bg-green-50 rounded-lg">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-900 mb-2">Import Successful!</h3>
                    <p className="text-green-700">
                      Successfully imported {importResults.success} contacts
                      {importResults.failed > 0 && ` (${importResults.failed} failed)`}
                    </p>
                  </div>
                  <ModernButton variant="primary" onClick={handleClose}>
                    Close
                  </ModernButton>
                </div>
              ) : (
                <>
                  {csvData.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">Column mapping</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-700">
                          {sheetNames.length > 1 && (
                            <label className="flex items-center gap-2">
                              Sheet
                              <select
                                value={activeSheet}
                                onChange={(e) => handleSheetChange(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded-lg bg-white"
                              >
                                {sheetNames.map((n) => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </label>
                          )}
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hasHeader}
                              onChange={(e) => handleHeaderToggle(e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            First row is a header
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {headers.map((header, i) => {
                          const sample = dataRows.slice(0, 3).map((r) => r[i]).filter(Boolean).join(' · ');
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="w-40 min-w-0 text-sm text-gray-700">
                                <span className="block truncate font-medium" title={header}>{header || `Column ${i + 1}`}</span>
                                <span className="block truncate text-xs text-gray-400" title={sample}>{sample}</span>
                              </span>
                              <select
                                aria-label={`Map column ${header || i + 1}`}
                                value={mapping[i] ?? IGNORE}
                                onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value }))}
                                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value={IGNORE}>Don't import</option>
                                {importTargets.map((t) => (
                                  <option
                                    key={t.key}
                                    value={t.key}
                                    disabled={mapping[i] !== t.key && Object.values(mapping).includes(t.key)}
                                  >
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                      {(missingRequired.length > 0 || !hasName) && (
                        <p className="mt-3 text-sm text-red-600">
                          Map {[...(hasName ? [] : ['First name + Last name (or Full name)']), ...missingRequired.map((t) => t.label)].join(', ')} to import.
                        </p>
                      )}
                    </div>
                  )}

                  {duplicateFlags.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                            {duplicateFlags.length} possible duplicate{duplicateFlags.length === 1 ? '' : 's'}
                          </h4>
                          <ul className="mt-1 text-sm text-yellow-800 dark:text-yellow-200 space-y-0.5 max-h-24 overflow-y-auto">
                            {duplicateFlags.slice(0, 20).map((f) => (
                              <li key={f.rowNumber}>
                                Row {f.rowNumber} matches {f.kind === 'existing' ? 'existing contact' : 'earlier row'} “{f.matchName}”
                              </li>
                            ))}
                          </ul>
                          <label className="mt-2 flex items-center gap-2 text-sm text-yellow-900 dark:text-yellow-100">
                            <input
                              type="checkbox"
                              checked={skipDuplicates}
                              onChange={(e) => setSkipDuplicates(e.target.checked)}
                              className="rounded border-yellow-400 text-blue-600 focus:ring-blue-500"
                            />
                            Skip duplicates (recommended)
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Preview Contacts ({parsedContacts.length})
                    </h3>
                    <ModernButton
                      variant="primary"
                      onClick={handleImport}
                      loading={isProcessing}
                      disabled={parsedContacts.length === 0}
                      className="flex items-center space-x-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>Import {parsedContacts.length} Contacts</span>
                    </ModernButton>
                  </div>

                  {parsedContacts.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Company</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Interest</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedContacts.map((contact, index) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-900">{contact.name}</td>
                                <td className="py-3 px-4 text-gray-700">{contact.email}</td>
                                <td className="py-3 px-4 text-gray-700">{contact.company}</td>
                                <td className="py-3 px-4 text-gray-700">{contact.title}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                    contact.interestLevel === 'hot' ? 'bg-red-100 text-red-800' :
                                    contact.interestLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    contact.interestLevel === 'low' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {contact.interestLevel}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                                    {contact.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};