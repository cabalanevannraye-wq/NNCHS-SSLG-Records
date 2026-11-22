import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  FileSpreadsheet,
  Table2,
  Upload,
} from 'lucide-react';
import { downloadTextFile } from '../../lib/downloadEngine.ts';
import {
  exportPortalSnapshotJson,
  type CalendarEventItem,
  type PortalState,
  type PublicClub,
  type PublicOfficer,
} from '../../lib/portalStore.ts';

type CsvTargetDataset = 'officers' | 'clubs' | 'calendarEvents';
type CsvImportMode = 'append' | 'replace';

interface TargetFieldDef {
  key: string;
  label: string;
  required?: boolean;
}

const TARGET_FIELDS: Record<CsvTargetDataset, TargetFieldDef[]> = {
  officers: [
    { key: 'fullName', label: 'Full Name', required: true },
    { key: 'position', label: 'Position / Title', required: true },
    { key: 'gradeLevel', label: 'Grade Level' },
    { key: 'section', label: 'Section' },
    { key: 'gradeSection', label: 'Grade & Section (Auto-Split)' },
    { key: 'bio', label: 'Biography' },
    { key: 'facebookUrl', label: 'Facebook Profile URL' },
  ],
  clubs: [
    { key: 'name', label: 'Organization Name', required: true },
    { key: 'acronym', label: 'Acronym' },
    { key: 'cluster', label: 'Cluster / Category' },
    { key: 'status', label: 'Status (Accredited/Probationary)' },
    { key: 'presidentName', label: 'President Name' },
    { key: 'adviserName', label: 'Adviser Name' },
    { key: 'memberCount', label: 'Member Count' },
    { key: 'description', label: 'Description' },
  ],
  calendarEvents: [
    { key: 'title', label: 'Event Title', required: true },
    { key: 'date', label: 'Date (YYYY-MM-DD)' },
    { key: 'timeRange', label: 'Time Range' },
    { key: 'category', label: 'Event Category' },
    { key: 'venue', label: 'Venue' },
    { key: 'description', label: 'Description' },
  ],
};

function parseCsvText(rawText: string): { headers: string[]; rows: string[][] } {
  const clean = rawText.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell.trim());
      if (row.some((v) => v.length > 0)) records.push(row);
      row = [];
      cell = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell.trim());
      if (row.some((v) => v.length > 0)) records.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((v) => v.length > 0)) {
    records.push(row);
  }

  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((h, idx) => h || `Column_${idx + 1}`);
  const rows = records.slice(1);
  return { headers, rows };
}

function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

function serializeCsv(headers: string[], rows: Array<Array<unknown>>): string {
  return [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.map(escapeCsvCell).join(','))].join(
    '\r\n'
  );
}

function autoMatchColumn(header: string, target: CsvTargetDataset): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!h) return '';

  if (target === 'officers') {
    if (h.includes('fullname') || h === 'name' || h.includes('officername')) return 'fullName';
    if (h.includes('position') || h.includes('role') || h.includes('title')) return 'position';
    if (h === 'gradesection' || h === 'gradeandsection') return 'gradeSection';
    if (h.includes('grade')) return 'gradeLevel';
    if (h.includes('section')) return 'section';
    if (h.includes('bio') || h.includes('about')) return 'bio';
    if (h.includes('facebook') || h === 'fb' || h.includes('url')) return 'facebookUrl';
  } else if (target === 'clubs') {
    if (h === 'name' || h.includes('clubname') || h.includes('orgname') || h.includes('organization')) {
      return 'name';
    }
    if (h.includes('acronym') || h.includes('abbr')) return 'acronym';
    if (h.includes('cluster') || h.includes('category')) return 'cluster';
    if (h.includes('status')) return 'status';
    if (h.includes('president')) return 'presidentName';
    if (h.includes('adviser') || h.includes('advisor')) return 'adviserName';
    if (h.includes('member') || h.includes('count')) return 'memberCount';
    if (h.includes('desc')) return 'description';
  } else {
    if (h.includes('title') || h.includes('event') || h === 'name') return 'title';
    if (h.includes('date')) return 'date';
    if (h.includes('time')) return 'timeRange';
    if (h.includes('category') || h.includes('type')) return 'category';
    if (h.includes('venue') || h.includes('location') || h.includes('place')) return 'venue';
    if (h.includes('desc') || h.includes('note')) return 'description';
  }

  return '';
}

function splitGradeAndSection(raw: string): { gradeLevel: string; section: string } {
  const clean = raw.trim();
  if (!clean) return { gradeLevel: 'Grade 11', section: 'NNCHS' };
  const dashSplit = clean.split(/\s*[-–/]\s*/);
  if (dashSplit.length >= 2) {
    return {
      gradeLevel: dashSplit[0].trim() || 'Grade 11',
      section: dashSplit.slice(1).join(' - ').trim() || 'NNCHS',
    };
  }
  return { gradeLevel: clean, section: 'NNCHS' };
}

function normalizeCalendarCategory(raw: string): CalendarEventItem['category'] {
  const v = raw.toLowerCase();
  if (v.includes('club')) return 'Club Activities';
  if (v.includes('exam') || v.includes('test')) return 'Examinations';
  if (v.includes('division') || v.includes('district')) return 'Division/District Events';
  return 'School-Wide Events';
}

export function PortalCsvImportExportTab({
  portal,
  syncing,
  onCommitAndSync,
  onNotify,
}: {
  portal: PortalState;
  syncing: boolean;
  onCommitAndSync: (nextState: PortalState, successMessage: string) => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [target, setTarget] = useState<CsvTargetDataset>('officers');
  const [importMode, setImportMode] = useState<CsvImportMode>('append');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});
  const [importFeedback, setImportFeedback] = useState('');
  const [committing, setCommitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fieldDefs = TARGET_FIELDS[target];

  const handleTargetChange = (nextTarget: CsvTargetDataset) => {
    setTarget(nextTarget);
    setImportFeedback('');
    if (csvHeaders.length > 0) {
      const remapped: Record<number, string> = {};
      csvHeaders.forEach((header, idx) => {
        remapped[idx] = autoMatchColumn(header, nextTarget);
      });
      setColumnMap(remapped);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportFeedback('');

    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setImportFeedback('The uploaded CSV file contains no data rows.');
        return;
      }
      setUploadedFileName(file.name);
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);
      const initialMap: Record<number, string> = {};
      parsed.headers.forEach((header, idx) => {
        initialMap[idx] = autoMatchColumn(header, target);
      });
      setColumnMap(initialMap);
      onNotify(`Loaded ${parsed.rows.length} row(s) from ${file.name}.`);
    } catch {
      setImportFeedback('Unable to read the selected CSV file.');
    }
  };

  const mappedPreview = useMemo(() => {
    return csvRows.map((row, rowIndex) => {
      const record: Record<string, string> = {};
      csvHeaders.forEach((_, colIdx) => {
        const destField = columnMap[colIdx];
        if (destField) {
          record[destField] = (row[colIdx] || '').trim();
        }
      });

      if (target === 'officers') {
        const splitGS = record.gradeSection ? splitGradeAndSection(record.gradeSection) : null;
        const fullName = record.fullName || '';
        const position = record.position || '';
        const missing: string[] = [];
        if (!fullName) missing.push('Full Name');
        if (!position) missing.push('Position');
        const officer: PublicOfficer = {
          id: `off-csv-${Date.now()}-${rowIndex}`,
          fullName,
          position,
          gradeLevel: record.gradeLevel || splitGS?.gradeLevel || 'Grade 11',
          section: record.section || splitGS?.section || 'NNCHS',
          bio: record.bio || 'Elected student leader serving NNCHS learners.',
          facebookUrl: record.facebookUrl || 'https://www.facebook.com/nnchssslg.official',
        };
        return { rowIndex, valid: missing.length === 0, missing, item: officer, summaryCols: [officer.fullName, officer.position, `${officer.gradeLevel} - ${officer.section}`] };
      }

      if (target === 'clubs') {
        const name = record.name || '';
        const missing: string[] = [];
        if (!name) missing.push('Organization Name');
        const parsedCount = Number.parseInt(record.memberCount || '', 10);
        const club: PublicClub = {
          id: `club-csv-${Date.now()}-${rowIndex}`,
          name,
          acronym:
            record.acronym ||
            name
              .split(/\s+/)
              .map((w) => w[0] || '')
              .join('')
              .slice(0, 8)
              .toUpperCase(),
          cluster: record.cluster || 'Academic & Civic',
          status:
            record.status?.toLowerCase() === 'probationary' ? 'Probationary' : 'Accredited',
          presidentName: record.presidentName || 'TBA',
          adviserName: record.adviserName || 'TBA',
          memberCount: Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 25,
          description: record.description || 'Registered NNCHS learner organization.',
        };
        return { rowIndex, valid: missing.length === 0, missing, item: club, summaryCols: [club.name, club.acronym, `${club.cluster} (${club.memberCount})`] };
      }

      const title = record.title || '';
      const missing: string[] = [];
      if (!title) missing.push('Event Title');
      const event: CalendarEventItem = {
        id: `cal-csv-${Date.now()}-${rowIndex}`,
        title,
        date: record.date || new Date().toISOString().slice(0, 10),
        timeRange: record.timeRange || '8:00 AM – 12:00 PM',
        category: normalizeCalendarCategory(record.category || ''),
        venue: record.venue || 'NNCHS Campus',
        description: record.description || 'Official NNCHS SSLG activity.',
      };
      return { rowIndex, valid: missing.length === 0, missing, item: event, summaryCols: [event.title, event.date, event.venue] };
    });
  }, [columnMap, csvHeaders, csvRows, target]);

  const validItems = mappedPreview.filter((m) => m.valid);
  const invalidCount = mappedPreview.length - validItems.length;

  const handleDownloadTemplate = () => {
    if (target === 'officers') {
      const csv = serializeCsv(
        ['Full Name', 'Position', 'Grade Level', 'Section', 'Bio', 'Facebook URL'],
        [
          [
            'Juan Dela Cruz',
            'Grade 11 Representative',
            'Grade 11',
            'STEM A - Rizal',
            'Coordinates Grade 11 academic and campus wellness drives.',
            'https://www.facebook.com/nnchssslg.official',
          ],
        ]
      );
      downloadTextFile('nnchs-sslg-officers-template.csv', csv, 'text/csv;charset=utf-8', onNotify);
      return;
    }
    if (target === 'clubs') {
      const csv = serializeCsv(
        ['Name', 'Acronym', 'Cluster', 'Status', 'President', 'Adviser', 'Members', 'Description'],
        [
          [
            'NNCHS Mathematics Enthusiasts Guild',
            'MATH-GUILD',
            'STEM & Research',
            'Accredited',
            'Andrea Santos',
            'Mr. R. Villanueva',
            '45',
            'Promotes peer math tutoring and division quiz bee preparation.',
          ],
        ]
      );
      downloadTextFile('nnchs-sslg-clubs-template.csv', csv, 'text/csv;charset=utf-8', onNotify);
      return;
    }
    const csv = serializeCsv(
      ['Title', 'Date', 'Time Range', 'Category', 'Venue', 'Description'],
      [
        [
          'SSLG Campus Wellness & Clean-Up Drive',
          '2026-12-18',
          '7:30 AM – 11:00 AM',
          'School-Wide Events',
          'NNCHS Quadrangle',
          'Campus-wide student-led clean-up and waste segregation activity.',
        ],
      ]
    );
    downloadTextFile('nnchs-sslg-calendar-template.csv', csv, 'text/csv;charset=utf-8', onNotify);
  };

  const handleFinalizeAndSync = async () => {
    if (validItems.length === 0) {
      setImportFeedback('Map at least the required columns so valid rows are ready to import.');
      return;
    }
    setCommitting(true);
    setImportFeedback('');
    try {
      let nextState: PortalState;
      if (target === 'officers') {
        const imported = validItems.map((m) => m.item as PublicOfficer);
        nextState = {
          ...portal,
          officers: importMode === 'replace' ? imported : [...portal.officers, ...imported],
        };
      } else if (target === 'clubs') {
        const imported = validItems.map((m) => m.item as PublicClub);
        nextState = {
          ...portal,
          clubs: importMode === 'replace' ? imported : [...portal.clubs, ...imported],
        };
      } else {
        const imported = validItems.map((m) => m.item as CalendarEventItem);
        nextState = {
          ...portal,
          calendarEvents:
            importMode === 'replace' ? imported : [...portal.calendarEvents, ...imported],
        };
      }

      await onCommitAndSync(
        nextState,
        `Imported ${validItems.length} record(s) into ${target} and published updates.`
      );
      setImportFeedback(
        `Committed ${validItems.length} record(s) (${importMode === 'replace' ? 'Replaced' : 'Appended'}) and synced to public portal.`
      );
      setCsvHeaders([]);
      setCsvRows([]);
      setUploadedFileName('');
    } finally {
      setCommitting(false);
    }
  };

  const exportDatasetCsv = (dataset: CsvTargetDataset) => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    if (dataset === 'officers') {
      const csv = serializeCsv(
        ['ID', 'Full Name', 'Position', 'Grade Level', 'Section', 'Bio', 'Facebook URL'],
        portal.officers.map((o) => [
          o.id,
          o.fullName,
          o.position,
          o.gradeLevel,
          o.section,
          o.bio,
          o.facebookUrl,
        ])
      );
      downloadTextFile(`nnchs-sslg-officers-${dateStamp}.csv`, csv, 'text/csv;charset=utf-8', onNotify);
      return;
    }
    if (dataset === 'clubs') {
      const csv = serializeCsv(
        ['ID', 'Name', 'Acronym', 'Cluster', 'Status', 'President', 'Adviser', 'Members', 'Description'],
        portal.clubs.map((c) => [
          c.id,
          c.name,
          c.acronym,
          c.cluster,
          c.status,
          c.presidentName,
          c.adviserName,
          c.memberCount,
          c.description,
        ])
      );
      downloadTextFile(`nnchs-sslg-clubs-${dateStamp}.csv`, csv, 'text/csv;charset=utf-8', onNotify);
      return;
    }
    const csv = serializeCsv(
      ['ID', 'Title', 'Date', 'Time Range', 'Category', 'Venue', 'Description'],
      portal.calendarEvents.map((ev) => [
        ev.id,
        ev.title,
        ev.date,
        ev.timeRange,
        ev.category,
        ev.venue,
        ev.description,
      ])
    );
    downloadTextFile(`nnchs-sslg-calendar-${dateStamp}.csv`, csv, 'text/csv;charset=utf-8', onNotify);
  };

  return (
    <div className="space-y-8">
      {/* CSV Bulk Importer & Column Mapper */}
      <div className="backdrop-blur-md bg-white/85 dark:bg-slate-900/80 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>CSV Bulk Data Importer &amp; Column Mapper</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Upload a CSV spreadsheet, map its columns to NNCHS-SSLG fields, inspect the live preview, and publish directly to the live website.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-950 dark:text-[#fde047] border border-blue-200 dark:border-slate-700 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample Template</span>
          </button>
        </div>

        {/* Step 1: Select Dataset, Mode, Upload */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              1. Target Portal Dataset
            </label>
            <select
              value={target}
              onChange={(e) => handleTargetChange(e.target.value as CsvTargetDataset)}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="officers">
                Officers / Student Leaders Directory ({portal.officers.length} current)
              </option>
              <option value="clubs">
                Registered Clubs &amp; Organizations ({portal.clubs.length} current)
              </option>
              <option value="calendarEvents">
                Activity Calendar Events ({portal.calendarEvents.length} current)
              </option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              2. Import Behavior
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImportMode('append')}
                className={`py-2.5 px-3 rounded-lg text-xs font-extrabold border cursor-pointer transition-colors ${
                  importMode === 'append'
                    ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                    : 'bg-blue-50/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-slate-700'
                }`}
              >
                Append Rows
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`py-2.5 px-3 rounded-lg text-xs font-extrabold border cursor-pointer transition-colors ${
                  importMode === 'replace'
                    ? 'bg-[#facc15] text-slate-950 border-[#eab308]'
                    : 'bg-blue-50/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-slate-700'
                }`}
              >
                Replace All
              </button>
            </div>
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#fde047]" />
              <span>{uploadedFileName ? 'Choose Another .CSV' : 'Upload .CSV File'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </div>
        </div>

        {importFeedback && (
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-[#eab308] text-xs font-bold text-blue-950 dark:text-[#fde047] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importFeedback}</span>
          </div>
        )}

        {/* Step 2: Interactive Column Mapper */}
        {csvHeaders.length > 0 && (
          <div className="space-y-5 pt-2">
            <div className="rounded-xl border border-blue-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-[#1e3a8a] text-white flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold">
                  3. Interactive Column Mapping — {uploadedFileName}
                </span>
                <span className="text-[#fde047] font-mono-code tabular-nums">
                  {csvHeaders.length} columns · {csvRows.length} rows
                </span>
              </div>

              <div className="divide-y divide-blue-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                {csvHeaders.map((header, idx) => (
                  <div
                    key={`${header}-${idx}`}
                    className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
                  >
                    <div className="sm:col-span-5">
                      <span className="font-mono-code font-bold text-blue-950 dark:text-white">
                        {header}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Sample: {csvRows[0]?.[idx] || '—'}
                      </p>
                    </div>
                    <div className="sm:col-span-7">
                      <select
                        value={columnMap[idx] || ''}
                        onChange={(e) =>
                          setColumnMap((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        aria-label={`Map column ${header}`}
                        className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100"
                      >
                        <option value="">-- Ignore Column --</option>
                        {fieldDefs.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                            {field.required ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Live Preview Table */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-blue-700 dark:text-[#fde047]" />
                  <span>
                    4. Live Data Preview ({validItems.length} ready
                    {invalidCount > 0 ? ` · ${invalidCount} skipped due to missing required fields` : ''}
                    )
                  </span>
                </h3>
                <button
                  type="button"
                  disabled={committing || syncing || validItems.length === 0}
                  onClick={() => void handleFinalizeAndSync()}
                  className="px-5 py-2.5 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <Cloud className="w-4 h-4" />
                  <span>
                    {committing ? 'Committing & Syncing...' : `Finalize & Sync (${validItems.length} Rows)`}
                  </span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-blue-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-blue-50 dark:bg-slate-800 text-blue-950 dark:text-[#fde047]">
                    <tr>
                      <th className="py-2.5 px-3 font-extrabold">Row</th>
                      <th className="py-2.5 px-3 font-extrabold">Status</th>
                      <th className="py-2.5 px-3 font-extrabold">Primary Field</th>
                      <th className="py-2.5 px-3 font-extrabold">Secondary Field</th>
                      <th className="py-2.5 px-3 font-extrabold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                    {mappedPreview.slice(0, 25).map((entry) => (
                      <tr
                        key={entry.rowIndex}
                        className={
                          entry.valid
                            ? ''
                            : 'bg-yellow-50/70 dark:bg-yellow-950/30'
                        }
                      >
                        <td className="py-2 px-3 font-mono-code tabular-nums">
                          #{entry.rowIndex + 1}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {entry.valid ? (
                            <span className="text-blue-700 dark:text-blue-300">Ready</span>
                          ) : (
                            <span className="text-blue-950 dark:text-[#fde047]">
                              Missing: {entry.missing.join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-blue-950 dark:text-white">
                          {entry.summaryCols[0] || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {entry.summaryCols[1] || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {entry.summaryCols[2] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Structured CSV & Full Snapshot Export Controls */}
      <div className="backdrop-blur-md bg-white/85 dark:bg-slate-900/80 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
            Structured Export &amp; Full Portal Backup
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            Download clean CSV spreadsheets of current directory and calendar records, or export the complete JSON portal backup.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => exportDatasetCsv('officers')}
            className="p-4 rounded-xl bg-blue-50/75 hover:bg-blue-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 text-left space-y-1 cursor-pointer transition-colors"
          >
            <p className="text-xs font-extrabold text-blue-950 dark:text-[#fde047] flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Export Officers CSV</span>
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
              {portal.officers.length} profile(s)
            </p>
          </button>

          <button
            type="button"
            onClick={() => exportDatasetCsv('clubs')}
            className="p-4 rounded-xl bg-blue-50/75 hover:bg-blue-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 text-left space-y-1 cursor-pointer transition-colors"
          >
            <p className="text-xs font-extrabold text-blue-950 dark:text-[#fde047] flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Export Clubs CSV</span>
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
              {portal.clubs.length} organization(s)
            </p>
          </button>

          <button
            type="button"
            onClick={() => exportDatasetCsv('calendarEvents')}
            className="p-4 rounded-xl bg-blue-50/75 hover:bg-blue-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 text-left space-y-1 cursor-pointer transition-colors"
          >
            <p className="text-xs font-extrabold text-blue-950 dark:text-[#fde047] flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Export Calendar CSV</span>
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
              {portal.calendarEvents.length} event(s)
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `nnchs-sslg-full-backup-${new Date().toISOString().slice(0, 10)}.json`,
                exportPortalSnapshotJson(portal),
                'application/json;charset=utf-8',
                onNotify
              )
            }
            className="p-4 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white border border-blue-900 text-left space-y-1 cursor-pointer transition-colors"
          >
            <p className="text-xs font-extrabold text-[#fde047] flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Full Portal JSON Backup</span>
            </p>
            <p className="text-[11px] text-blue-100">Complete PortalState snapshot</p>
          </button>
        </div>
      </div>
    </div>
  );
}
