export type UserRole = 'admin' | 'officer' | 'organization';

export type DocumentModuleType = 'general' | 'accomplishment';

export type CoreValue =
  | 'Maka-Diyos'
  | 'Maka-Tao'
  | 'Maka-Kalikasan'
  | 'Makabansa';

export const CORE_VALUES: CoreValue[] = [
  'Maka-Diyos',
  'Maka-Tao',
  'Maka-Kalikasan',
  'Makabansa',
];

export type DocumentCategory =
  | 'Activity Proposal'
  | 'Resolution'
  | 'Financial Report'
  | 'Memorandum'
  | 'Letter'
  | 'Monthly Accomplishment Report'
  | 'Quarterly Accomplishment Report'
  | 'Event / Project Accomplishment Report'
  | 'Annual Accomplishment Report';

export const GENERAL_CATEGORIES: DocumentCategory[] = [
  'Activity Proposal',
  'Resolution',
  'Financial Report',
  'Memorandum',
  'Letter',
];

export const ACCOMPLISHMENT_CATEGORIES: DocumentCategory[] = [
  'Monthly Accomplishment Report',
  'Quarterly Accomplishment Report',
  'Event / Project Accomplishment Report',
  'Annual Accomplishment Report',
];

export const ALL_CATEGORIES: DocumentCategory[] = [
  ...GENERAL_CATEGORIES,
  ...ACCOMPLISHMENT_CATEGORIES,
];

export type WorkflowStage = 1 | 2 | 3 | 4 | 5;

export type StageStatusLabel =
  | 'Stage 1: Author Submitted'
  | 'Stage 2: For E-Signature'
  | 'Stage 3: Control No. & Eartag Ready'
  | 'Stage 4: Printed for Routing'
  | 'Stage 5: Completed & Archived';

export type TransmittalAction =
  | 'Submitted'
  | 'Received for E-Sign'
  | 'E-Signed'
  | 'Control Number Issued'
  | 'Marked Printed'
  | 'Hardcopy Scan Uploaded';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  positionOrClub: string;
  department: string;
  avatarDataUrl?: string | null;
  active: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  positionOrClub: string;
  role: UserRole;
  department: string;
  avatarDataUrl?: string | null;
  totalPassed: number;
  ongoingCount: number;
  completedCount: number;
  generalCount: number;
  accomplishmentCount: number;
}

export interface DirectoryEntry {
  userId: string;
  fullName: string;
  email: string;
  positionOrClub: string;
  role: UserRole;
  department: string;
  avatarDataUrl?: string | null;
  totalPassed: number;
  ongoingCount: number;
  completedCount: number;
  generalCount: number;
  accomplishmentCount: number;
  latestDocumentDate: string | null;
}

export interface TransmittalEvent {
  id: string;
  stage: WorkflowStage;
  stepLabel: string;
  action: TransmittalAction;
  actorUserId: string;
  actorName: string;
  actorPosition: string;
  timestamp: string;
  remarks: string;
}

export interface SignatureRecord {
  id: string;
  signerUserId: string;
  signerName: string;
  signerPosition: string;
  signatureDataUrl: string;
  signedAt: string;
}

export interface HardcopyScan {
  scanId: string;
  fileName: string;
  fileMimeType: string;
  filePath: string;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedAt: string;
  wetInkSignatories: string;
  notes: string;
}

export interface SSLGDocument {
  id: string;
  docType: DocumentModuleType;
  controlNumber: string | null;
  title: string;
  category: DocumentCategory;
  coreValue?: CoreValue | null;
  documentDate: string; // YYYY-MM-DD
  purpose: string;
  submittedByUserId: string;
  authorName: string;
  organizationName: string;
  fileName: string;
  fileMimeType: string;
  filePath: string;
  signedFilePath: string | null;
  fileSize: number;
  currentStage: WorkflowStage;
  stageLabel: StageStatusLabel;
  printedAt: string | null;
  printedByName: string | null;
  transmittalHistory: TransmittalEvent[];
  signatures: SignatureRecord[];
  hardcopyScan: HardcopyScan | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  organizationHeader: string;
  schoolYear: string;
  generalPrefix: string;
  generalNextSequence: number;
  accomplishmentPrefix: string;
  accomplishmentNextSequence: number;
}
