import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  signOut as firebaseSignOut,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  auth,
  db,
  extractUsernameFromEmail,
  getProvisionerAuth,
  isSyntheticUsernameEmail,
  isValidUsername,
  normalizeUsername,
  usernameOrEmailToAuthEmail,
} from '../firebase.ts';
import type {
  AccountInvite,
  CoreValue,
  DirectoryEntry,
  DocumentCategory,
  DocumentModuleType,
  LeaderboardEntry,
  SSLGDocument,
  SystemSettings,
  TransmittalEvent,
  UserAccount,
  UserRole,
} from '../types.ts';
import { api } from './api.ts';
import { handleFirestoreError, OperationType } from './firestoreError.ts';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'cabalan.evann.raye@gmail.com';

const SAMPLE_SIGNATURE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAUCAYAAADs4zK8AAAAAXNSR0IArs4c6QAAAD1JREFUWEft0zENAAAMw7D8/1M3s4sF6YKmSbo2gQABAgQIECBAgAABAgQIECBAgAABAgQIECDwLwK3A294AXm71k25AAAAAElFTkSuQmCC';

export const DEFAULT_SETTINGS: SystemSettings = {
  organizationHeader: 'NNCHS · Supreme Secondary Learner Government',
  schoolYear: '2026-2027',
  generalPrefix: 'SSLG-2026',
  generalNextSequence: 4,
  accomplishmentPrefix: 'AR-2026',
  accomplishmentNextSequence: 4,
};

export function toInviteId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function timestampToIso(value: unknown, fallback = new Date().toISOString()): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return fallback;
}

function makeDocId(prefix = 'doc'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeDocFromFirestore(id: string, raw: Record<string, unknown>): SSLGDocument {
  return {
    id: (raw.id as string) || id,
    docType: (raw.docType as DocumentModuleType) === 'accomplishment' ? 'accomplishment' : 'general',
    controlNumber: (raw.controlNumber as string | null) ?? null,
    title: String(raw.title || ''),
    category: raw.category as DocumentCategory,
    coreValue: (raw.coreValue as CoreValue | null) ?? null,
    documentDate: String(raw.documentDate || '2026-01-01'),
    purpose: String(raw.purpose || ''),
    submittedByUserId: String(raw.submittedByUserId || ''),
    authorName: String(raw.authorName || ''),
    organizationName: String(raw.organizationName || ''),
    fileName: String(raw.fileName || ''),
    fileMimeType: String(raw.fileMimeType || 'application/pdf'),
    filePath: String(raw.filePath || ''),
    signedFilePath: (raw.signedFilePath as string | null) ?? null,
    driveFileId: (raw.driveFileId as string | null) ?? null,
    driveWebViewLink: (raw.driveWebViewLink as string | null) ?? null,
    fileSize: typeof raw.fileSize === 'number' ? raw.fileSize : 0,
    currentStage: (Number(raw.currentStage) as 1 | 2 | 3 | 4 | 5) || 1,
    stageLabel: String(raw.stageLabel || 'Stage 1: Author Submitted') as SSLGDocument['stageLabel'],
    printedAt: (raw.printedAt as string | null) ?? null,
    printedByName: (raw.printedByName as string | null) ?? null,
    reviewerUids: Array.isArray(raw.reviewerUids) ? (raw.reviewerUids as string[]) : [],
    transmittalHistory: Array.isArray(raw.transmittalHistory)
      ? (raw.transmittalHistory as TransmittalEvent[])
      : [],
    signatures: Array.isArray(raw.signatures) ? (raw.signatures as SSLGDocument['signatures']) : [],
    hardcopyScan: (raw.hardcopyScan as SSLGDocument['hardcopyScan']) ?? null,
    createdAt: timestampToIso(raw.createdAt),
    updatedAt: timestampToIso(raw.updatedAt),
  };
}

function formatControlNumber(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

export type AuthResolutionResult =
  | {
      status: 'authorized';
      user: UserAccount;
      settings: SystemSettings;
    }
  | {
      status: 'unauthorized';
      email: string;
    }
  | {
      status: 'disabled';
      email: string;
    }
  | {
      status: 'unverified';
      email: string;
    };

async function seedInitialSampleWorkspace(adminUid: string, adminName: string) {
  const sampleUsers: Array<{
    uid: string;
    email: string;
    fullName: string;
    role: UserRole;
    positionOrClub: string;
    department: string;
  }> = [
    {
      uid: 'usr-off-sec',
      email: 'secretary@sslg.edu',
      fullName: 'Clarisse Mendoza',
      role: 'officer',
      positionOrClub: 'SSLG Secretary',
      department: 'Secretariat & Records',
    },
    {
      uid: 'usr-off-treas',
      email: 'treasurer@sslg.edu',
      fullName: 'Rafael Torres',
      role: 'officer',
      positionOrClub: 'SSLG Treasurer',
      department: 'Finance & Ways and Means',
    },
    {
      uid: 'usr-org-1',
      email: 'scienceclub@sslg.edu',
      fullName: 'Julian Reyes',
      role: 'organization',
      positionOrClub: 'Young Scientists Guild',
      department: 'STEM & Academic Clubs',
    },
    {
      uid: 'usr-org-2',
      email: 'artsclub@sslg.edu',
      fullName: 'Patricia Lim',
      role: 'organization',
      positionOrClub: 'Campus Creative Collective',
      department: 'Arts & Culture Organizations',
    },
  ];

  for (const u of sampleUsers) {
    await setDoc(doc(db, 'user_directory', u.uid), {
      uid: u.uid,
      fullName: u.fullName,
      role: u.role,
      positionOrClub: u.positionOrClub,
      department: u.department,
      avatarDataUrl: null,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'user_private', u.uid), {
      uid: u.uid,
      email: u.email,
      role: u.role,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'invites', toInviteId(u.email)), {
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      positionOrClub: u.positionOrClub,
      department: u.department,
      active: true,
      claimedUid: u.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const sampleDocs: Array<Omit<SSLGDocument, 'createdAt' | 'updatedAt'>> = [
    {
      id: 'doc-gen-5',
      docType: 'general',
      controlNumber: 'SSLG-2026-0001',
      title: 'Annual Science & Innovation Fair 2026 Proposal',
      category: 'Activity Proposal',
      coreValue: null,
      documentDate: '2026-02-12',
      purpose: 'Requesting approval for the two-day campus Science Fair and student innovation booths.',
      submittedByUserId: 'usr-org-1',
      authorName: 'Julian Reyes',
      organizationName: 'Young Scientists Guild',
      fileName: 'SSLG-2026-0001_ScienceFair.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'SSLG-2026-0001_ScienceFair.pdf',
      signedFilePath: null,
      fileSize: 4200,
      currentStage: 5,
      stageLabel: 'Stage 5: Completed & Archived',
      printedAt: '2026-02-13T10:00:00.000Z',
      printedByName: 'Clarisse Mendoza',
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-g5-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-org-1',
          actorName: 'Julian Reyes',
          actorPosition: 'Young Scientists Guild',
          timestamp: '2026-02-12T08:45:00.000Z',
          remarks: 'Uploaded prepared proposal PDF.',
        },
        {
          id: 'tr-g5-2',
          stage: 2,
          stepLabel: 'Stage 2: Electronically Signed',
          action: 'E-Signed',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-02-12T14:20:00.000Z',
          remarks: 'Approved & E-Signed by SSLG President.',
        },
        {
          id: 'tr-g5-3',
          stage: 3,
          stepLabel: 'Stage 3: Control Number SSLG-2026-0001 Issued',
          action: 'Control Number Issued',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-02-12T14:20:00.000Z',
          remarks: 'Auto-assigned sequential Control Number and unlocked Eartag.',
        },
        {
          id: 'tr-g5-4',
          stage: 4,
          stepLabel: 'Stage 4: Printed with Eartag',
          action: 'Marked Printed',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-02-13T10:00:00.000Z',
          remarks: 'Printed hardcopy and attached Eartag for dry seal.',
        },
        {
          id: 'tr-g5-5',
          stage: 5,
          stepLabel: 'Stage 5: Final Printed Copy Scanned & Archived',
          action: 'Hardcopy Scan Uploaded',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-02-14T15:10:00.000Z',
          remarks: 'Uploaded final stamped hardcopy scan.',
        },
      ],
      signatures: [
        {
          id: 'sig-g5-1',
          signerUserId: adminUid,
          signerName: adminName,
          signerPosition: 'SSLG President (Admin)',
          signatureDataUrl: SAMPLE_SIGNATURE_PNG,
          signedAt: '2026-02-12T14:20:00.000Z',
        },
      ],
      hardcopyScan: {
        scanId: 'scan-g5',
        fileName: 'SCAN_SSLG-2026-0001.pdf',
        fileMimeType: 'application/pdf',
        filePath: 'SCAN_SSLG-2026-0001.pdf',
        uploadedByUserId: 'usr-off-sec',
        uploadedByName: 'Clarisse Mendoza',
        uploadedAt: '2026-02-14T15:10:00.000Z',
        wetInkSignatories: `${adminName} (SSLG President), Clarisse Mendoza (SSLG Secretary)`,
        notes: 'Final dry-sealed hardcopy scan.',
      },
    },
    {
      id: 'doc-gen-4',
      docType: 'general',
      controlNumber: 'SSLG-2026-0002',
      title: 'Q1 Intramurals Booth Revenue & Expense Liquidation',
      category: 'Financial Report',
      coreValue: null,
      documentDate: '2026-03-20',
      purpose: 'Audited financial statement and receipts summary for Q1 Intramurals art booth.',
      submittedByUserId: 'usr-org-2',
      authorName: 'Patricia Lim',
      organizationName: 'Campus Creative Collective',
      fileName: 'SSLG-2026-0002_Q1Liquidation.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'SSLG-2026-0002_Q1Liquidation.pdf',
      signedFilePath: null,
      fileSize: 4100,
      currentStage: 4,
      stageLabel: 'Stage 4: Printed for Routing',
      printedAt: '2026-03-22T09:15:00.000Z',
      printedByName: 'Rafael Torres',
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-g4-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-org-2',
          actorName: 'Patricia Lim',
          actorPosition: 'Campus Creative Collective',
          timestamp: '2026-03-20T13:20:00.000Z',
          remarks: 'Submitted liquidation report with official receipts.',
        },
        {
          id: 'tr-g4-2',
          stage: 2,
          stepLabel: 'Stage 2: Electronically Signed',
          action: 'E-Signed',
          actorUserId: 'usr-off-treas',
          actorName: 'Rafael Torres',
          actorPosition: 'SSLG Treasurer',
          timestamp: '2026-03-21T11:00:00.000Z',
          remarks: 'Audited and e-signed by SSLG Treasurer.',
        },
        {
          id: 'tr-g4-3',
          stage: 3,
          stepLabel: 'Stage 3: Control Number SSLG-2026-0002 Issued',
          action: 'Control Number Issued',
          actorUserId: 'usr-off-treas',
          actorName: 'Rafael Torres',
          actorPosition: 'SSLG Treasurer',
          timestamp: '2026-03-21T11:00:00.000Z',
          remarks: 'Assigned SSLG-2026-0002.',
        },
        {
          id: 'tr-g4-4',
          stage: 4,
          stepLabel: 'Stage 4: Printed with Eartag',
          action: 'Marked Printed',
          actorUserId: 'usr-off-treas',
          actorName: 'Rafael Torres',
          actorPosition: 'SSLG Treasurer',
          timestamp: '2026-03-22T09:15:00.000Z',
          remarks: 'Printed hardcopy for physical binder; awaiting final scan upload.',
        },
      ],
      signatures: [
        {
          id: 'sig-g4-1',
          signerUserId: 'usr-off-treas',
          signerName: 'Rafael Torres',
          signerPosition: 'SSLG Treasurer',
          signatureDataUrl: SAMPLE_SIGNATURE_PNG,
          signedAt: '2026-03-21T11:00:00.000Z',
        },
      ],
      hardcopyScan: null,
    },
    {
      id: 'doc-gen-3',
      docType: 'general',
      controlNumber: 'SSLG-2026-0003',
      title: 'SSLG Resolution No. 04: Campus Plastic-Free Initiative',
      category: 'Resolution',
      coreValue: null,
      documentDate: '2026-05-14',
      purpose: 'Student resolution establishing reusable container rules and segregation bins.',
      submittedByUserId: 'usr-org-1',
      authorName: 'Julian Reyes',
      organizationName: 'Young Scientists Guild',
      fileName: 'SSLG-2026-0003_PlasticFreeRes.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'SSLG-2026-0003_PlasticFreeRes.pdf',
      signedFilePath: null,
      fileSize: 4000,
      currentStage: 3,
      stageLabel: 'Stage 3: Control No. & Eartag Ready',
      printedAt: null,
      printedByName: null,
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-g3-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-org-1',
          actorName: 'Julian Reyes',
          actorPosition: 'Young Scientists Guild',
          timestamp: '2026-05-14T10:00:00.000Z',
          remarks: 'Draft resolution uploaded.',
        },
        {
          id: 'tr-g3-2',
          stage: 2,
          stepLabel: 'Stage 2: Electronically Signed',
          action: 'E-Signed',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-05-15T16:30:00.000Z',
          remarks: 'Signed by SSLG President.',
        },
        {
          id: 'tr-g3-3',
          stage: 3,
          stepLabel: 'Stage 3: Control Number SSLG-2026-0003 Issued',
          action: 'Control Number Issued',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-05-15T16:30:00.000Z',
          remarks: 'Control number logged; ready to print document and eartag.',
        },
      ],
      signatures: [
        {
          id: 'sig-g3-1',
          signerUserId: adminUid,
          signerName: adminName,
          signerPosition: 'SSLG President (Admin)',
          signatureDataUrl: SAMPLE_SIGNATURE_PNG,
          signedAt: '2026-05-15T16:30:00.000Z',
        },
      ],
      hardcopyScan: null,
    },
    {
      id: 'doc-gen-2',
      docType: 'general',
      controlNumber: null,
      title: 'STEM Robotics Workshop & Inter-Class Quiz Bee',
      category: 'Activity Proposal',
      coreValue: null,
      documentDate: '2026-10-18',
      purpose: 'Proposal for weekend robotics starter workshop in Audio-Visual Room B.',
      submittedByUserId: 'usr-org-1',
      authorName: 'Julian Reyes',
      organizationName: 'Young Scientists Guild',
      fileName: 'GEN_Stage2_RoboticsWorkshop.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'GEN_Stage2_RoboticsWorkshop.pdf',
      signedFilePath: null,
      fileSize: 3900,
      currentStage: 2,
      stageLabel: 'Stage 2: For E-Signature',
      printedAt: null,
      printedByName: null,
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-g2-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-org-1',
          actorName: 'Julian Reyes',
          actorPosition: 'Young Scientists Guild',
          timestamp: '2026-10-18T09:10:00.000Z',
          remarks: 'Uploaded robotics proposal.',
        },
        {
          id: 'tr-g2-2',
          stage: 2,
          stepLabel: 'Stage 2: Received for E-Signature',
          action: 'Received for E-Sign',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-10-19T08:40:00.000Z',
          remarks: 'Checked completeness; ready for Officer/President E-Signature.',
        },
      ],
      signatures: [],
      hardcopyScan: null,
    },
    {
      id: 'doc-gen-1',
      docType: 'general',
      controlNumber: null,
      title: 'Request for Auditorium Sound System & Stage Permit',
      category: 'Letter',
      coreValue: null,
      documentDate: '2026-11-10',
      purpose: 'Formal letter requesting clearance to use auditorium audio console for Spoken Word Night.',
      submittedByUserId: 'usr-org-2',
      authorName: 'Patricia Lim',
      organizationName: 'Campus Creative Collective',
      fileName: 'GEN_Stage1_SoundSystemLetter.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'GEN_Stage1_SoundSystemLetter.pdf',
      signedFilePath: null,
      fileSize: 3900,
      currentStage: 1,
      stageLabel: 'Stage 1: Author Submitted',
      printedAt: null,
      printedByName: null,
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-g1-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-org-2',
          actorName: 'Patricia Lim',
          actorPosition: 'Campus Creative Collective',
          timestamp: '2026-11-10T14:30:00.000Z',
          remarks: 'Uploaded permit request letter.',
        },
      ],
      signatures: [],
      hardcopyScan: null,
    },
    {
      id: 'doc-ar-5',
      docType: 'accomplishment',
      controlNumber: 'AR-2026-0001',
      title: 'Q1 STEM Week & Science Fair Accomplishment Report',
      category: 'Quarterly Accomplishment Report',
      coreValue: 'Maka-Kalikasan',
      documentDate: '2026-03-28',
      purpose: 'Full narrative, participant tally, and photo documentation for Q1 STEM Week.',
      submittedByUserId: 'usr-org-1',
      authorName: 'Julian Reyes',
      organizationName: 'Young Scientists Guild',
      fileName: 'AR-2026-0001_Q1ScienceAccomplishment.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'AR-2026-0001_Q1ScienceAccomplishment.pdf',
      signedFilePath: null,
      fileSize: 4200,
      currentStage: 5,
      stageLabel: 'Stage 5: Completed & Archived',
      printedAt: '2026-03-29T10:30:00.000Z',
      printedByName: 'Clarisse Mendoza',
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-a5-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-org-1',
          actorName: 'Julian Reyes',
          actorPosition: 'Young Scientists Guild',
          timestamp: '2026-03-28T11:00:00.000Z',
          remarks: 'Uploaded Q1 accomplishment report PDF.',
        },
        {
          id: 'tr-a5-2',
          stage: 2,
          stepLabel: 'Stage 2: Electronically Signed',
          action: 'E-Signed',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-03-28T15:40:00.000Z',
          remarks: 'Verified and e-signed by SSLG President.',
        },
        {
          id: 'tr-a5-3',
          stage: 3,
          stepLabel: 'Stage 3: Control Number AR-2026-0001 Issued',
          action: 'Control Number Issued',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-03-28T15:40:00.000Z',
          remarks: 'Logged under AR-2026-0001.',
        },
        {
          id: 'tr-a5-4',
          stage: 4,
          stepLabel: 'Stage 4: Printed with Eartag',
          action: 'Marked Printed',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-03-29T10:30:00.000Z',
          remarks: 'Printed hardcopy with attached Eartag.',
        },
        {
          id: 'tr-a5-5',
          stage: 5,
          stepLabel: 'Stage 5: Final Printed Copy Scanned & Archived',
          action: 'Hardcopy Scan Uploaded',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-03-30T14:00:00.000Z',
          remarks: 'Uploaded signed hardcopy scan.',
        },
      ],
      signatures: [
        {
          id: 'sig-a5-1',
          signerUserId: adminUid,
          signerName: adminName,
          signerPosition: 'SSLG President (Admin)',
          signatureDataUrl: SAMPLE_SIGNATURE_PNG,
          signedAt: '2026-03-28T15:40:00.000Z',
        },
      ],
      hardcopyScan: {
        scanId: 'scan-a5',
        fileName: 'SCAN_AR-2026-0001.pdf',
        fileMimeType: 'application/pdf',
        filePath: 'SCAN_AR-2026-0001.pdf',
        uploadedByUserId: 'usr-off-sec',
        uploadedByName: 'Clarisse Mendoza',
        uploadedAt: '2026-03-30T14:00:00.000Z',
        wetInkSignatories: `${adminName} (SSLG President), Julian Reyes (Club Lead)`,
        notes: 'Q1 Accomplishment binder scan.',
      },
    },
    {
      id: 'doc-ar-4',
      docType: 'accomplishment',
      controlNumber: 'AR-2026-0002',
      title: 'Mid-Year Cultural Showcase & Mural Project Report',
      category: 'Event / Project Accomplishment Report',
      coreValue: 'Maka-Tao',
      documentDate: '2026-07-28',
      purpose: 'Post-activity documentation and attendance tally for the Campus Mural Project.',
      submittedByUserId: 'usr-org-2',
      authorName: 'Patricia Lim',
      organizationName: 'Campus Creative Collective',
      fileName: 'AR-2026-0002_MuralAccomplishment.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'AR-2026-0002_MuralAccomplishment.pdf',
      signedFilePath: null,
      fileSize: 4100,
      currentStage: 4,
      stageLabel: 'Stage 4: Printed for Routing',
      printedAt: '2026-07-30T11:10:00.000Z',
      printedByName: 'Clarisse Mendoza',
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-a4-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-org-2',
          actorName: 'Patricia Lim',
          actorPosition: 'Campus Creative Collective',
          timestamp: '2026-07-28T09:15:00.000Z',
          remarks: 'Submitted event accomplishment report.',
        },
        {
          id: 'tr-a4-2',
          stage: 2,
          stepLabel: 'Stage 2: Electronically Signed',
          action: 'E-Signed',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-07-29T13:20:00.000Z',
          remarks: 'E-Signed and verified.',
        },
        {
          id: 'tr-a4-3',
          stage: 3,
          stepLabel: 'Stage 3: Control Number AR-2026-0002 Issued',
          action: 'Control Number Issued',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-07-29T13:20:00.000Z',
          remarks: 'Assigned AR-2026-0002.',
        },
        {
          id: 'tr-a4-4',
          stage: 4,
          stepLabel: 'Stage 4: Printed with Eartag',
          action: 'Marked Printed',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-07-30T11:10:00.000Z',
          remarks: 'Printed hardcopy for dry seal; awaiting Stage 5 scan.',
        },
      ],
      signatures: [
        {
          id: 'sig-a4-1',
          signerUserId: 'usr-off-sec',
          signerName: 'Clarisse Mendoza',
          signerPosition: 'SSLG Secretary',
          signatureDataUrl: SAMPLE_SIGNATURE_PNG,
          signedAt: '2026-07-29T13:20:00.000Z',
        },
      ],
      hardcopyScan: null,
    },
    {
      id: 'doc-ar-3',
      docType: 'accomplishment',
      controlNumber: 'AR-2026-0003',
      title: 'August SSLG Secretariat Monthly Accomplishment Report',
      category: 'Monthly Accomplishment Report',
      coreValue: 'Makabansa',
      documentDate: '2026-08-31',
      purpose: 'Monthly summary of general assemblies, resolutions passed, and club coordinations.',
      submittedByUserId: 'usr-off-sec',
      authorName: 'Clarisse Mendoza',
      organizationName: 'SSLG Secretary',
      fileName: 'AR-2026-0003_AugustMonthlyAR.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'AR-2026-0003_AugustMonthlyAR.pdf',
      signedFilePath: null,
      fileSize: 4000,
      currentStage: 3,
      stageLabel: 'Stage 3: Control No. & Eartag Ready',
      printedAt: null,
      printedByName: null,
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-a3-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-off-sec',
          actorName: 'Clarisse Mendoza',
          actorPosition: 'SSLG Secretary',
          timestamp: '2026-08-31T15:00:00.000Z',
          remarks: 'Uploaded August monthly report.',
        },
        {
          id: 'tr-a3-2',
          stage: 2,
          stepLabel: 'Stage 2: Electronically Signed',
          action: 'E-Signed',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-09-01T09:30:00.000Z',
          remarks: 'Approved & E-Signed by SSLG President.',
        },
        {
          id: 'tr-a3-3',
          stage: 3,
          stepLabel: 'Stage 3: Control Number AR-2026-0003 Issued',
          action: 'Control Number Issued',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-09-01T09:30:00.000Z',
          remarks: 'Control number AR-2026-0003 generated; ready to print.',
        },
      ],
      signatures: [
        {
          id: 'sig-a3-1',
          signerUserId: adminUid,
          signerName: adminName,
          signerPosition: 'SSLG President (Admin)',
          signatureDataUrl: SAMPLE_SIGNATURE_PNG,
          signedAt: '2026-09-01T09:30:00.000Z',
        },
      ],
      hardcopyScan: null,
    },
    {
      id: 'doc-ar-2',
      docType: 'accomplishment',
      controlNumber: null,
      title: 'October Finance Committee Accomplishment Report',
      category: 'Monthly Accomplishment Report',
      coreValue: 'Maka-Diyos',
      documentDate: '2026-10-30',
      purpose: 'Monthly report of audited club collections, disbursements, and ledger balances.',
      submittedByUserId: 'usr-off-treas',
      authorName: 'Rafael Torres',
      organizationName: 'SSLG Treasurer',
      fileName: 'AR_Stage2_OctoberFinanceAR.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'AR_Stage2_OctoberFinanceAR.pdf',
      signedFilePath: null,
      fileSize: 3900,
      currentStage: 2,
      stageLabel: 'Stage 2: For E-Signature',
      printedAt: null,
      printedByName: null,
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-a2-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-off-treas',
          actorName: 'Rafael Torres',
          actorPosition: 'SSLG Treasurer',
          timestamp: '2026-10-30T16:10:00.000Z',
          remarks: 'Uploaded October finance accomplishment report.',
        },
        {
          id: 'tr-a2-2',
          stage: 2,
          stepLabel: 'Stage 2: Received for E-Signature',
          action: 'Received for E-Sign',
          actorUserId: adminUid,
          actorName: adminName,
          actorPosition: 'SSLG President (Admin)',
          timestamp: '2026-10-31T09:00:00.000Z',
          remarks: 'Received by SSLG President for electronic signature.',
        },
      ],
      signatures: [],
      hardcopyScan: null,
    },
    {
      id: 'doc-ar-1',
      docType: 'accomplishment',
      controlNumber: null,
      title: 'November Spoken Word & Art Exhibit Accomplishment Report',
      category: 'Event / Project Accomplishment Report',
      coreValue: 'Maka-Tao',
      documentDate: '2026-11-12',
      purpose: 'Post-event accomplishment report and attendance sheets for Spoken Word Night.',
      submittedByUserId: 'usr-org-2',
      authorName: 'Patricia Lim',
      organizationName: 'Campus Creative Collective',
      fileName: 'AR_Stage1_NovemberArtsAR.pdf',
      fileMimeType: 'application/pdf',
      filePath: 'AR_Stage1_NovemberArtsAR.pdf',
      signedFilePath: null,
      fileSize: 3900,
      currentStage: 1,
      stageLabel: 'Stage 1: Author Submitted',
      printedAt: null,
      printedByName: null,
      reviewerUids: [adminUid, 'usr-off-sec', 'usr-off-treas'],
      transmittalHistory: [
        {
          id: 'tr-a1-1',
          stage: 1,
          stepLabel: 'Stage 1: Uploaded by Author',
          action: 'Submitted',
          actorUserId: 'usr-org-2',
          actorName: 'Patricia Lim',
          actorPosition: 'Campus Creative Collective',
          timestamp: '2026-11-12T10:25:00.000Z',
          remarks: 'Uploaded initial accomplishment report file.',
        },
      ],
      signatures: [],
      hardcopyScan: null,
    },
  ];

  for (const d of sampleDocs) {
    await setDoc(doc(db, 'documents', d.id), {
      ...d,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const u of sampleUsers) {
    const userDocs = sampleDocs.filter((d) => d.submittedByUserId === u.uid);
    const sortedDates = userDocs.map((d) => d.documentDate).sort().reverse();
    await setDoc(doc(db, 'contributor_stats', u.uid), {
      uid: u.uid,
      isPublicStat: true,
      totalPassed: userDocs.length,
      ongoingCount: userDocs.filter((d) => d.currentStage < 5).length,
      completedCount: userDocs.filter((d) => d.currentStage === 5).length,
      generalCount: userDocs.filter((d) => d.docType === 'general').length,
      accomplishmentCount: userDocs.filter((d) => d.docType === 'accomplishment').length,
      latestDocumentDate: sortedDates[0] || null,
      updatedAt: serverTimestamp(),
    });
  }
}

async function syncReviewerUidsForAdmin(): Promise<void> {
  try {
    const dirSnap = await getDocs(
      query(collection(db, 'user_directory'), where('active', '==', true))
    );
    const reviewerIds = dirSnap.docs
      .map((d) => d.data() as { uid: string; role: UserRole })
      .filter((u) => u.role === 'admin' || u.role === 'officer')
      .map((u) => u.uid)
      .slice(0, 25);

    if (reviewerIds.length === 0) return;

    const docsSnap = await getDocs(collection(db, 'documents'));
    for (const d of docsSnap.docs) {
      const data = d.data() as { reviewerUids?: string[] };
      const existing = Array.isArray(data.reviewerUids) ? data.reviewerUids : [];
      const missing = reviewerIds.filter((rid) => !existing.includes(rid));
      if (missing.length > 0 && existing.length + missing.length <= 25) {
        await updateDoc(d.ref, {
          reviewerUids: arrayUnion(...missing),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch {
    // non-fatal background sync
  }
}

export async function resolveSignedInUser(fbUser: FirebaseUser): Promise<AuthResolutionResult> {
  const email = (fbUser.email || '').trim().toLowerCase();
  const isSynthetic = isSyntheticUsernameEmail(email);
  if (!email || (!fbUser.emailVerified && !isSynthetic)) {
    return { status: 'unverified', email };
  }

  const uid = fbUser.uid;
  const isBootstrapped = email === BOOTSTRAPPED_ADMIN_EMAIL;

  try {
    if (isBootstrapped) {
      const displayName = fbUser.displayName?.trim() || 'SSLG President';

      const adminRef = doc(db, 'admins', uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid,
          grantedBy: 'system_bootstrap',
          createdAt: serverTimestamp(),
        });
      }

      const privRef = doc(db, 'user_private', uid);
      const privSnap = await getDoc(privRef);
      if (!privSnap.exists()) {
        await setDoc(privRef, {
          uid,
          email,
          role: 'admin',
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const dirRef = doc(db, 'user_directory', uid);
      const dirSnap = await getDoc(dirRef);
      if (!dirSnap.exists()) {
        await setDoc(dirRef, {
          uid,
          fullName: displayName,
          role: 'admin',
          positionOrClub: 'SSLG President (Admin)',
          department: 'Executive Committee',
          avatarDataUrl: null,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const statRef = doc(db, 'contributor_stats', uid);
      const statSnap = await getDoc(statRef);
      if (!statSnap.exists()) {
        await setDoc(statRef, {
          uid,
          isPublicStat: true,
          totalPassed: 0,
          ongoingCount: 0,
          completedCount: 0,
          generalCount: 0,
          accomplishmentCount: 0,
          latestDocumentDate: null,
          updatedAt: serverTimestamp(),
        });
      }

      const inviteRef = doc(db, 'invites', toInviteId(email));
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) {
        await setDoc(inviteRef, {
          email,
          fullName: displayName,
          role: 'admin',
          positionOrClub: 'SSLG President (Admin)',
          department: 'Executive Committee',
          active: true,
          claimedUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, {
          ...DEFAULT_SETTINGS,
          updatedAt: serverTimestamp(),
        });
        await seedInitialSampleWorkspace(uid, displayName);
      }

      // Sync any claimed admin invites & reviewerUids in background
      void (async () => {
        try {
          const invSnap = await getDocs(collection(db, 'invites'));
          for (const inv of invSnap.docs) {
            const d = inv.data() as { role?: UserRole; claimedUid?: string | null; active?: boolean };
            if (d.role === 'admin' && d.active && d.claimedUid) {
              const markerRef = doc(db, 'admins', d.claimedUid);
              const markerSnap = await getDoc(markerRef);
              if (!markerSnap.exists()) {
                await setDoc(markerRef, {
                  uid: d.claimedUid,
                  grantedBy: uid,
                  createdAt: serverTimestamp(),
                });
              }
            }
          }
          await syncReviewerUidsForAdmin();
        } catch {
          // ignore background invite/reviewer sync failure
        }
      })();

      const freshDir = (await getDoc(dirRef)).data() as Record<string, unknown>;
      const freshSettings = (await getDoc(settingsRef)).data() as Record<string, unknown>;

      return {
        status: 'authorized',
        user: {
          id: uid,
          username: (freshDir?.username as string | undefined) ?? undefined,
          email,
          fullName: String(freshDir?.fullName || displayName),
          role: 'admin',
          positionOrClub: String(freshDir?.positionOrClub || 'SSLG President (Admin)'),
          department: String(freshDir?.department || 'Executive Committee'),
          avatarDataUrl: (freshDir?.avatarDataUrl as string | null) ?? null,
          active: true,
          createdAt: timestampToIso(freshDir?.createdAt),
        },
        settings: {
          organizationHeader: String(
            freshSettings?.organizationHeader || DEFAULT_SETTINGS.organizationHeader
          ),
          schoolYear: String(freshSettings?.schoolYear || DEFAULT_SETTINGS.schoolYear),
          generalPrefix: String(freshSettings?.generalPrefix || DEFAULT_SETTINGS.generalPrefix),
          generalNextSequence: Number(
            freshSettings?.generalNextSequence || DEFAULT_SETTINGS.generalNextSequence
          ),
          accomplishmentPrefix: String(
            freshSettings?.accomplishmentPrefix || DEFAULT_SETTINGS.accomplishmentPrefix
          ),
          accomplishmentNextSequence: Number(
            freshSettings?.accomplishmentNextSequence || DEFAULT_SETTINGS.accomplishmentNextSequence
          ),
        },
      };
    }

    // Non-bootstrapped user: check user_private first
    const privRef = doc(db, 'user_private', uid);
    const privSnap = await getDoc(privRef);
    const inviteId = toInviteId(email);
    const inviteRef = doc(db, 'invites', inviteId);

    if (privSnap.exists()) {
      const priv = privSnap.data() as { role: UserRole; active: boolean; email: string };
      if (!priv.active) {
        return { status: 'disabled', email };
      }
      const dirRef = doc(db, 'user_directory', uid);
      const dirSnap = await getDoc(dirRef);
      if (!dirSnap.exists()) {
        const invSnap = await getDoc(inviteRef);
        const inv = invSnap.exists() ? (invSnap.data() as Record<string, unknown>) : null;
        await setDoc(dirRef, {
          uid,
          fullName: String(inv?.fullName || fbUser.displayName || email),
          role: priv.role,
          positionOrClub: String(inv?.positionOrClub || 'SSLG Member'),
          department: String(inv?.department || 'Student Governance'),
          avatarDataUrl: null,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      const dirData = (await getDoc(dirRef)).data() as Record<string, unknown>;
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      const sData = settingsSnap.exists()
        ? (settingsSnap.data() as Record<string, unknown>)
        : DEFAULT_SETTINGS;

      return {
        status: 'authorized',
        user: {
          id: uid,
          username:
            (dirData.username as string | undefined) ?? extractUsernameFromEmail(email),
          email,
          fullName: String(dirData.fullName || fbUser.displayName || email),
          role: (dirData.role as UserRole) || priv.role,
          positionOrClub: String(dirData.positionOrClub || 'SSLG Member'),
          department: String(dirData.department || 'Student Governance'),
          avatarDataUrl: (dirData.avatarDataUrl as string | null) ?? null,
          active: Boolean(dirData.active),
          createdAt: timestampToIso(dirData.createdAt),
        },
        settings: {
          organizationHeader: String(
            sData.organizationHeader || DEFAULT_SETTINGS.organizationHeader
          ),
          schoolYear: String(sData.schoolYear || DEFAULT_SETTINGS.schoolYear),
          generalPrefix: String(sData.generalPrefix || DEFAULT_SETTINGS.generalPrefix),
          generalNextSequence: Number(
            sData.generalNextSequence || DEFAULT_SETTINGS.generalNextSequence
          ),
          accomplishmentPrefix: String(
            sData.accomplishmentPrefix || DEFAULT_SETTINGS.accomplishmentPrefix
          ),
          accomplishmentNextSequence: Number(
            sData.accomplishmentNextSequence || DEFAULT_SETTINGS.accomplishmentNextSequence
          ),
        },
      };
    }

    // First sign-in: check Admin-issued invite
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      return { status: 'unauthorized', email };
    }

    const invite = inviteSnap.data() as {
      email: string;
      fullName: string;
      role: UserRole;
      positionOrClub: string;
      department: string;
      active: boolean;
    };

    if (!invite.active || invite.email.toLowerCase() !== email) {
      return { status: 'disabled', email };
    }

    await setDoc(privRef, {
      uid,
      email,
      role: invite.role,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'user_directory', uid), {
      uid,
      fullName: invite.fullName,
      role: invite.role,
      positionOrClub: invite.positionOrClub,
      department: invite.department,
      avatarDataUrl: null,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'contributor_stats', uid), {
      uid,
      isPublicStat: true,
      totalPassed: 0,
      ongoingCount: 0,
      completedCount: 0,
      generalCount: 0,
      accomplishmentCount: 0,
      latestDocumentDate: null,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(inviteRef, {
      claimedUid: uid,
      updatedAt: serverTimestamp(),
    });

    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    const sData = settingsSnap.exists()
      ? (settingsSnap.data() as Record<string, unknown>)
      : DEFAULT_SETTINGS;

    return {
      status: 'authorized',
      user: {
        id: uid,
        username: extractUsernameFromEmail(email),
        email,
        fullName: invite.fullName,
        role: invite.role,
        positionOrClub: invite.positionOrClub,
        department: invite.department,
        avatarDataUrl: null,
        active: true,
        createdAt: new Date().toISOString(),
      },
      settings: {
        organizationHeader: String(
          sData.organizationHeader || DEFAULT_SETTINGS.organizationHeader
        ),
        schoolYear: String(sData.schoolYear || DEFAULT_SETTINGS.schoolYear),
        generalPrefix: String(sData.generalPrefix || DEFAULT_SETTINGS.generalPrefix),
        generalNextSequence: Number(
          sData.generalNextSequence || DEFAULT_SETTINGS.generalNextSequence
        ),
        accomplishmentPrefix: String(
          sData.accomplishmentPrefix || DEFAULT_SETTINGS.accomplishmentPrefix
        ),
        accomplishmentNextSequence: Number(
          sData.accomplishmentNextSequence || DEFAULT_SETTINGS.accomplishmentNextSequence
        ),
      },
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `auth_bootstrap/${uid}`);
  }
}

export interface WorkspaceSnapshotHandlers {
  onSettings: (settings: SystemSettings) => void;
  onDocuments: (docs: SSLGDocument[]) => void;
  onDirectoryProfiles: (profiles: UserAccount[]) => void;
  onStats: (stats: Map<string, {
    totalPassed: number;
    ongoingCount: number;
    completedCount: number;
    generalCount: number;
    accomplishmentCount: number;
    latestDocumentDate: string | null;
  }>) => void;
}

export function subscribeWorkspaceData(
  currentUser: UserAccount,
  handlers: WorkspaceSnapshotHandlers
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  // 1. Settings listener
  unsubs.push(
    onSnapshot(
      doc(db, 'settings', 'global'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        handlers.onSettings({
          organizationHeader: String(
            data.organizationHeader || DEFAULT_SETTINGS.organizationHeader
          ),
          schoolYear: String(data.schoolYear || DEFAULT_SETTINGS.schoolYear),
          generalPrefix: String(data.generalPrefix || DEFAULT_SETTINGS.generalPrefix),
          generalNextSequence: Number(
            data.generalNextSequence || DEFAULT_SETTINGS.generalNextSequence
          ),
          accomplishmentPrefix: String(
            data.accomplishmentPrefix || DEFAULT_SETTINGS.accomplishmentPrefix
          ),
          accomplishmentNextSequence: Number(
            data.accomplishmentNextSequence || DEFAULT_SETTINGS.accomplishmentNextSequence
          ),
        });
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/global')
    )
  );

  // 2. Active directory profiles listener (non-PII)
  unsubs.push(
    onSnapshot(
      query(collection(db, 'user_directory'), where('active', '==', true)),
      (snap) => {
        const profiles: UserAccount[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const uid = String(data.uid || d.id);
          return {
            id: uid,
            username: (data.username as string | undefined) ?? undefined,
            email: uid === currentUser.id ? currentUser.email : '',
            fullName: String(data.fullName || ''),
            role: (data.role as UserRole) || 'organization',
            positionOrClub: String(data.positionOrClub || ''),
            department: String(data.department || ''),
            avatarDataUrl: (data.avatarDataUrl as string | null) ?? null,
            active: Boolean(data.active),
            createdAt: timestampToIso(data.createdAt),
          };
        });
        handlers.onDirectoryProfiles(profiles);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'user_directory')
    )
  );

  // 3. Contributor stats listener (non-PII)
  unsubs.push(
    onSnapshot(
      query(collection(db, 'contributor_stats'), where('isPublicStat', '==', true)),
      (snap) => {
        const map = new Map<
          string,
          {
            totalPassed: number;
            ongoingCount: number;
            completedCount: number;
            generalCount: number;
            accomplishmentCount: number;
            latestDocumentDate: string | null;
          }
        >();
        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>;
          const uid = String(data.uid || d.id);
          map.set(uid, {
            totalPassed: Number(data.totalPassed || 0),
            ongoingCount: Number(data.ongoingCount || 0),
            completedCount: Number(data.completedCount || 0),
            generalCount: Number(data.generalCount || 0),
            accomplishmentCount: Number(data.accomplishmentCount || 0),
            latestDocumentDate: (data.latestDocumentDate as string | null) ?? null,
          });
        }
        handlers.onStats(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contributor_stats')
    )
  );

  // 4. Documents listener (rule-aligned query by role)
  const docsQuery =
    currentUser.role === 'admin'
      ? collection(db, 'documents')
      : currentUser.role === 'officer'
      ? query(collection(db, 'documents'), where('reviewerUids', 'array-contains', currentUser.id))
      : query(collection(db, 'documents'), where('submittedByUserId', '==', currentUser.id));

  unsubs.push(
    onSnapshot(
      docsQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => sanitizeDocFromFirestore(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        handlers.onDocuments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'documents')
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

export function buildLeaderboardAndDirectory(
  profiles: UserAccount[],
  statsMap: Map<
    string,
    {
      totalPassed: number;
      ongoingCount: number;
      completedCount: number;
      generalCount: number;
      accomplishmentCount: number;
      latestDocumentDate: string | null;
    }
  >
): { leaderboard: LeaderboardEntry[]; directory: DirectoryEntry[] } {
  const leaderboard: LeaderboardEntry[] = profiles
    .map((u) => {
      const s = statsMap.get(u.id);
      return {
        userId: u.id,
        fullName: u.fullName,
        positionOrClub: u.positionOrClub,
        role: u.role,
        department: u.department,
        avatarDataUrl: u.avatarDataUrl ?? null,
        totalPassed: s?.totalPassed ?? 0,
        ongoingCount: s?.ongoingCount ?? 0,
        completedCount: s?.completedCount ?? 0,
        generalCount: s?.generalCount ?? 0,
        accomplishmentCount: s?.accomplishmentCount ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.totalPassed !== a.totalPassed) return b.totalPassed - a.totalPassed;
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      return a.fullName.localeCompare(b.fullName);
    });

  const directory: DirectoryEntry[] = profiles
    .map((u) => {
      const s = statsMap.get(u.id);
      return {
        userId: u.id,
        fullName: u.fullName,
        email: u.email || undefined,
        positionOrClub: u.positionOrClub,
        role: u.role,
        department: u.department,
        avatarDataUrl: u.avatarDataUrl ?? null,
        totalPassed: s?.totalPassed ?? 0,
        ongoingCount: s?.ongoingCount ?? 0,
        completedCount: s?.completedCount ?? 0,
        generalCount: s?.generalCount ?? 0,
        accomplishmentCount: s?.accomplishmentCount ?? 0,
        latestDocumentDate: s?.latestDocumentDate ?? null,
      };
    })
    .sort((a, b) => {
      if (a.role === 'organization' && b.role !== 'organization') return -1;
      if (a.role !== 'organization' && b.role === 'organization') return 1;
      return b.totalPassed - a.totalPassed || a.positionOrClub.localeCompare(b.positionOrClub);
    });

  return { leaderboard, directory };
}

async function syncContributorStat(uid: string, docsForUser: SSLGDocument[]): Promise<void> {
  try {
    const sortedDates = docsForUser.map((d) => d.documentDate).sort().reverse();
    const statRef = doc(db, 'contributor_stats', uid);
    const statSnap = await getDoc(statRef);
    const counts = {
      totalPassed: docsForUser.length,
      ongoingCount: docsForUser.filter((d) => d.currentStage < 5).length,
      completedCount: docsForUser.filter((d) => d.currentStage === 5).length,
      generalCount: docsForUser.filter((d) => d.docType === 'general').length,
      accomplishmentCount: docsForUser.filter((d) => d.docType === 'accomplishment').length,
      latestDocumentDate: sortedDates[0] || null,
      updatedAt: serverTimestamp(),
    };
    if (statSnap.exists()) {
      await updateDoc(statRef, counts);
    } else {
      await setDoc(statRef, {
        uid,
        isPublicStat: true,
        ...counts,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `contributor_stats/${uid}`);
  }
}

export const firebaseService = {
  updateMyAvatar: async (currentUser: UserAccount, avatarDataUrl: string | null): Promise<UserAccount> => {
    try {
      const ref = doc(db, 'user_directory', currentUser.id);
      await updateDoc(ref, {
        avatarDataUrl: avatarDataUrl || null,
        updatedAt: serverTimestamp(),
      });
      return { ...currentUser, avatarDataUrl: avatarDataUrl || null };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `user_directory/${currentUser.id}`);
    }
  },

  updateSettings: async (payload: Partial<SystemSettings>): Promise<SystemSettings> => {
    try {
      const ref = doc(db, 'settings', 'global');
      const snap = await getDoc(ref);
      const current = snap.exists() ? (snap.data() as SystemSettings) : DEFAULT_SETTINGS;
      const next: SystemSettings = {
        organizationHeader: payload.organizationHeader?.trim() || current.organizationHeader,
        schoolYear: payload.schoolYear?.trim() || current.schoolYear,
        generalPrefix: payload.generalPrefix?.trim() || current.generalPrefix,
        generalNextSequence:
          typeof payload.generalNextSequence === 'number' && payload.generalNextSequence >= 1
            ? Math.floor(payload.generalNextSequence)
            : Math.floor(current.generalNextSequence),
        accomplishmentPrefix: payload.accomplishmentPrefix?.trim() || current.accomplishmentPrefix,
        accomplishmentNextSequence:
          typeof payload.accomplishmentNextSequence === 'number' &&
          payload.accomplishmentNextSequence >= 1
            ? Math.floor(payload.accomplishmentNextSequence)
            : Math.floor(current.accomplishmentNextSequence),
      };
      await updateDoc(ref, {
        ...next,
        updatedAt: serverTimestamp(),
      });
      return next;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  },

  getAccountInvites: async (): Promise<AccountInvite[]> => {
    try {
      const snap = await getDocs(collection(db, 'invites'));
      return snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          const email = String(data.email || '');
          return {
            id: d.id,
            username:
              (data.username as string | undefined) ?? extractUsernameFromEmail(email),
            email,
            fullName: String(data.fullName || ''),
            role: (data.role as UserRole) || 'organization',
            positionOrClub: String(data.positionOrClub || ''),
            department: String(data.department || 'Student Governance'),
            active: Boolean(data.active),
            claimedUid: (data.claimedUid as string | null) ?? null,
            createdAt: timestampToIso(data.createdAt),
            updatedAt: timestampToIso(data.updatedAt),
          };
        })
        .sort((a, b) => a.positionOrClub.localeCompare(b.positionOrClub));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'invites');
    }
  },

  createUsernamePasswordAccount: async (
    actorUid: string,
    payload: {
      username: string;
      password: string;
      fullName: string;
      role: UserRole;
      positionOrClub: string;
      department: string;
    }
  ): Promise<AccountInvite> => {
    const cleanUsername = normalizeUsername(payload.username);
    if (!isValidUsername(cleanUsername)) {
      throw new Error(
        'Username must be 3–60 characters using only letters, numbers, dots (.), underscores (_), or hyphens (-).'
      );
    }
    if (!payload.password || payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const authEmail = usernameOrEmailToAuthEmail(cleanUsername);
    const inviteId = toInviteId(cleanUsername);
    const inviteRef = doc(db, 'invites', inviteId);

    const existingInvite = await getDoc(inviteRef);
    if (existingInvite.exists()) {
      throw new Error(`Username "${cleanUsername}" is already in use.`);
    }

    let newUid = '';
    const provisionerAuth = await getProvisionerAuth();
    try {
      const cred = await createUserWithEmailAndPassword(
        provisionerAuth,
        authEmail,
        payload.password
      );
      newUid = cred.user.uid;
      await firebaseSignOut(provisionerAuth).catch(() => undefined);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/Password sign-in is not yet enabled in Firebase Console. Open Firebase Console → Authentication → Sign-in method → Enable Email/Password, then try again.'
        );
      }
      if (code === 'auth/email-already-in-use') {
        throw new Error(`Username "${cleanUsername}" is already registered in Firebase Auth.`);
      }
      if (code === 'auth/weak-password') {
        throw new Error('Password is too weak. Use at least 6 characters.');
      }
      throw err instanceof Error ? err : new Error('Failed to create login credentials.');
    }

    const trimmedFullName = payload.fullName.trim();
    const trimmedPos = payload.positionOrClub.trim();
    const trimmedDept = payload.department.trim() || 'Student Governance';

    try {
      // Write user_private first so isAdmin() checks referencing admins/{uid} + user_private/{uid} succeed
      await setDoc(doc(db, 'user_private', newUid), {
        uid: newUid,
        username: cleanUsername,
        email: authEmail,
        role: payload.role,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'user_directory', newUid), {
        uid: newUid,
        username: cleanUsername,
        fullName: trimmedFullName,
        role: payload.role,
        positionOrClub: trimmedPos,
        department: trimmedDept,
        avatarDataUrl: null,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'contributor_stats', newUid), {
        uid: newUid,
        isPublicStat: true,
        totalPassed: 0,
        ongoingCount: 0,
        completedCount: 0,
        generalCount: 0,
        accomplishmentCount: 0,
        latestDocumentDate: null,
        updatedAt: serverTimestamp(),
      });

      if (payload.role === 'admin') {
        await setDoc(doc(db, 'admins', newUid), {
          uid: newUid,
          grantedBy: actorUid,
          createdAt: serverTimestamp(),
        });
      }

      await setDoc(inviteRef, {
        username: cleanUsername,
        email: authEmail,
        fullName: trimmedFullName,
        role: payload.role,
        positionOrClub: trimmedPos,
        department: trimmedDept,
        active: true,
        claimedUid: newUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (payload.role === 'admin' || payload.role === 'officer') {
        void syncReviewerUidsForAdmin();
      }

      const now = new Date().toISOString();
      return {
        id: inviteId,
        username: cleanUsername,
        email: authEmail,
        fullName: trimmedFullName,
        role: payload.role,
        positionOrClub: trimmedPos,
        department: trimmedDept,
        active: true,
        claimedUid: newUid,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invites/${inviteId}`);
    }
  },

  setMyPassword: async (newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('You must be signed in to set or change your password.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const hasPasswordProvider = user.providerData.some((p) => p.providerId === 'password');
    try {
      if (hasPasswordProvider) {
        await updatePassword(user, newPassword);
      } else {
        const credential = EmailAuthProvider.credential(user.email, newPassword);
        await linkWithCredential(user, credential);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/Password sign-in is not yet enabled in Firebase Console. Enable Email/Password under Authentication → Sign-in method first.'
        );
      }
      if (code === 'auth/requires-recent-login') {
        throw new Error(
          'For security, please sign out and sign back in right before changing your password.'
        );
      }
      throw err instanceof Error ? err : new Error('Failed to update password.');
    }
  },

  createAccountInvite: async (payload: {
    email: string;
    fullName: string;
    role: UserRole;
    positionOrClub: string;
    department: string;
  }): Promise<AccountInvite> => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const inviteId = toInviteId(normalizedEmail);
    const ref = doc(db, 'invites', inviteId);
    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        throw new Error('An account invitation for this Google email already exists.');
      }
      await setDoc(ref, {
        email: normalizedEmail,
        fullName: payload.fullName.trim(),
        role: payload.role,
        positionOrClub: payload.positionOrClub.trim(),
        department: payload.department.trim() || 'Student Governance',
        active: true,
        claimedUid: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const now = new Date().toISOString();
      return {
        id: inviteId,
        email: normalizedEmail,
        fullName: payload.fullName.trim(),
        role: payload.role,
        positionOrClub: payload.positionOrClub.trim(),
        department: payload.department.trim() || 'Student Governance',
        active: true,
        claimedUid: null,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.CREATE, `invites/${inviteId}`);
    }
  },

  updateAccountInvite: async (
    invite: AccountInvite,
    actorUid: string,
    payload: Partial<Pick<AccountInvite, 'fullName' | 'role' | 'positionOrClub' | 'department' | 'active'>>
  ): Promise<AccountInvite> => {
    const ref = doc(db, 'invites', invite.id);
    try {
      const nextFullName = payload.fullName?.trim() || invite.fullName;
      const nextRole = payload.role || invite.role;
      const nextPos = payload.positionOrClub?.trim() || invite.positionOrClub;
      const nextDept = payload.department?.trim() || invite.department;
      const nextActive = typeof payload.active === 'boolean' ? payload.active : invite.active;

      await updateDoc(ref, {
        fullName: nextFullName,
        role: nextRole,
        positionOrClub: nextPos,
        department: nextDept,
        active: nextActive,
        updatedAt: serverTimestamp(),
      });

      if (invite.claimedUid) {
        const uid = invite.claimedUid;
        const dirSnap = await getDoc(doc(db, 'user_directory', uid));
        if (dirSnap.exists()) {
          await updateDoc(doc(db, 'user_directory', uid), {
            fullName: nextFullName,
            role: nextRole,
            positionOrClub: nextPos,
            department: nextDept,
            active: nextActive,
            updatedAt: serverTimestamp(),
          });
        }
        const privSnap = await getDoc(doc(db, 'user_private', uid));
        if (privSnap.exists()) {
          await updateDoc(doc(db, 'user_private', uid), {
            role: nextRole,
            active: nextActive,
            updatedAt: serverTimestamp(),
          });
        }
        const adminRef = doc(db, 'admins', uid);
        const adminSnap = await getDoc(adminRef);
        if (nextRole === 'admin' && nextActive && !adminSnap.exists()) {
          await setDoc(adminRef, {
            uid,
            grantedBy: actorUid,
            createdAt: serverTimestamp(),
          });
        } else if (nextRole !== 'admin' && adminSnap.exists() && uid !== actorUid) {
          await deleteDoc(adminRef);
        }
      }

      return {
        ...invite,
        fullName: nextFullName,
        role: nextRole,
        positionOrClub: nextPos,
        department: nextDept,
        active: nextActive,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invites/${invite.id}`);
    }
  },

  deleteAccountInvite: async (invite: AccountInvite, actorUid: string): Promise<void> => {
    try {
      if (invite.claimedUid && invite.claimedUid === actorUid) {
        throw new Error('You cannot delete your own active Admin account.');
      }
      await deleteDoc(doc(db, 'invites', invite.id));
      if (invite.claimedUid) {
        const uid = invite.claimedUid;
        const adminSnap = await getDoc(doc(db, 'admins', uid));
        if (adminSnap.exists()) {
          await deleteDoc(doc(db, 'admins', uid));
        }
        const privSnap = await getDoc(doc(db, 'user_private', uid));
        if (privSnap.exists()) {
          await deleteDoc(doc(db, 'user_private', uid));
        }
        const dirSnap = await getDoc(doc(db, 'user_directory', uid));
        if (dirSnap.exists()) {
          await deleteDoc(doc(db, 'user_directory', uid));
        }
        const statSnap = await getDoc(doc(db, 'contributor_stats', uid));
        if (statSnap.exists()) {
          await deleteDoc(doc(db, 'contributor_stats', uid));
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('cannot delete')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.DELETE, `invites/${invite.id}`);
    }
  },

  createDocument: async (
    actor: UserAccount,
    allUserDocs: SSLGDocument[],
    params: {
      file: File;
      docType: DocumentModuleType;
      title: string;
      category: DocumentCategory;
      coreValue?: CoreValue | null;
      documentDate: string;
      purpose: string;
      organizationOverride?: string;
      driveFileId?: string | null;
      driveWebViewLink?: string | null;
    }
  ): Promise<SSLGDocument> => {
    const uploaded = await api.uploadFile(params.file);
    const id = makeDocId('doc');
    const now = new Date().toISOString();
    const orgName =
      actor.role === 'organization'
        ? actor.positionOrClub
        : params.organizationOverride?.trim() || actor.positionOrClub;

    const resolvedCoreValue: CoreValue | null =
      params.docType === 'accomplishment' ? params.coreValue || 'Maka-Tao' : null;

    // Collect active Officer & Admin UIDs so all officers can immediately query/review this submission
    let reviewerUids: string[] = [];
    try {
      const dirSnap = await getDocs(
        query(collection(db, 'user_directory'), where('active', '==', true))
      );
      reviewerUids = dirSnap.docs
        .map((d) => d.data() as { uid: string; role: UserRole })
        .filter((u) => u.role === 'admin' || u.role === 'officer')
        .map((u) => u.uid)
        .slice(0, 25);
    } catch {
      reviewerUids = actor.role !== 'organization' ? [actor.id] : [];
    }

    const stage1Event: TransmittalEvent = {
      id: makeDocId('tr'),
      stage: 1,
      stepLabel: 'Stage 1: Uploaded by Author',
      action: 'Submitted',
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorPosition: orgName,
      timestamp: now,
      remarks: params.purpose.trim() || 'Prepared file uploaded; awaiting SSLG Officer E-Signature.',
    };

    const docRecord: SSLGDocument = {
      id,
      docType: params.docType,
      controlNumber: null,
      title: params.title.trim(),
      category: params.category,
      coreValue: resolvedCoreValue,
      documentDate: params.documentDate,
      purpose: params.purpose.trim() || 'Submitted for SSLG review and e-signature.',
      submittedByUserId: actor.id,
      authorName: actor.fullName,
      organizationName: orgName,
      fileName: uploaded.fileName,
      fileMimeType: uploaded.fileMimeType,
      filePath: uploaded.filePath,
      signedFilePath: null,
      driveFileId: params.driveFileId ?? uploaded.driveFileId ?? null,
      driveWebViewLink: params.driveWebViewLink ?? uploaded.driveWebViewLink ?? null,
      fileSize: uploaded.fileSize,
      currentStage: 1,
      stageLabel: 'Stage 1: Author Submitted',
      printedAt: null,
      printedByName: null,
      reviewerUids,
      transmittalHistory: [stage1Event],
      signatures: [],
      hardcopyScan: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'documents', id), {
        ...docRecord,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `documents/${id}`);
    }

    const updatedUserDocs = [docRecord, ...allUserDocs.filter((d) => d.submittedByUserId === actor.id)];
    await syncContributorStat(actor.id, updatedUserDocs);

    return docRecord;
  },

  attachDriveFileToDocument: async (
    targetDoc: SSLGDocument,
    driveFile: { id: string; webViewLink?: string | null }
  ): Promise<SSLGDocument> => {
    const now = new Date().toISOString();
    const driveWebViewLink =
      driveFile.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(driveFile.id)}/view`;
    try {
      await updateDoc(doc(db, 'documents', targetDoc.id), {
        driveFileId: driveFile.id,
        driveWebViewLink,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `documents/${targetDoc.id}`);
    }
    return {
      ...targetDoc,
      driveFileId: driveFile.id,
      driveWebViewLink,
      updatedAt: now,
    };
  },

  deleteDocument: async (
    targetDoc: SSLGDocument,
    allDocs: SSLGDocument[]
  ): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'documents', targetDoc.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `documents/${targetDoc.id}`);
    }

    try {
      await api.deleteFiles([
        targetDoc.filePath,
        targetDoc.signedFilePath,
        targetDoc.hardcopyScan?.filePath,
      ]);
    } catch {
      // non-fatal disk cleanup
    }

    const remainingAuthorDocs = allDocs.filter(
      (d) => d.id !== targetDoc.id && d.submittedByUserId === targetDoc.submittedByUserId
    );
    await syncContributorStat(targetDoc.submittedByUserId, remainingAuthorDocs);
  },

  receiveForEsign: async (targetDoc: SSLGDocument, actor: UserAccount): Promise<SSLGDocument> => {
    const now = new Date().toISOString();
    const nextHistory: TransmittalEvent[] = [
      ...targetDoc.transmittalHistory,
      {
        id: makeDocId('tr'),
        stage: 2,
        stepLabel: 'Stage 2: Received for E-Signature',
        action: 'Received for E-Sign',
        actorUserId: actor.id,
        actorName: actor.fullName,
        actorPosition: actor.positionOrClub,
        timestamp: now,
        remarks: `Received by ${actor.fullName} (${actor.positionOrClub}) for electronic signature.`,
      },
    ];

    try {
      await updateDoc(doc(db, 'documents', targetDoc.id), {
        currentStage: 2,
        stageLabel: 'Stage 2: For E-Signature',
        transmittalHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `documents/${targetDoc.id}`);
    }

    return {
      ...targetDoc,
      currentStage: 2,
      stageLabel: 'Stage 2: For E-Signature',
      transmittalHistory: nextHistory,
      updatedAt: now,
    };
  },

  esignDocument: async (
    targetDoc: SSLGDocument,
    actor: UserAccount,
    payload: { signatureDataUrl: string; remarks?: string }
  ): Promise<SSLGDocument> => {
    const now = new Date().toISOString();
    const settingsRef = doc(db, 'settings', 'global');
    const docRef = doc(db, 'documents', targetDoc.id);

    // Pre-determine control number for stamping PDF signature block
    let previewControlNumber = targetDoc.controlNumber;
    if (!previewControlNumber) {
      const sSnap = await getDoc(settingsRef);
      const s = sSnap.exists() ? (sSnap.data() as SystemSettings) : DEFAULT_SETTINGS;
      previewControlNumber =
        targetDoc.docType === 'accomplishment'
          ? formatControlNumber(s.accomplishmentPrefix, Math.floor(s.accomplishmentNextSequence))
          : formatControlNumber(s.generalPrefix, Math.floor(s.generalNextSequence));
    }

    const stamped = await api.stampSignature({
      doc: targetDoc,
      controlNumber: previewControlNumber,
      signatureDataUrl: payload.signatureDataUrl,
      signerName: actor.fullName,
      signerPosition: actor.positionOrClub,
      signedAt: now,
    });

    try {
      const updated = await runTransaction(db, async (tx) => {
        const freshDocSnap = await tx.get(docRef);
        if (!freshDocSnap.exists()) {
          throw new Error('Document no longer exists.');
        }
        const freshDoc = sanitizeDocFromFirestore(
          freshDocSnap.id,
          freshDocSnap.data() as Record<string, unknown>
        );
        const freshSettingsSnap = await tx.get(settingsRef);
        const freshSettings = freshSettingsSnap.exists()
          ? (freshSettingsSnap.data() as SystemSettings)
          : DEFAULT_SETTINGS;

        let finalControlNumber = freshDoc.controlNumber;
        let newlyIssued = false;
        if (!finalControlNumber) {
          newlyIssued = true;
          if (freshDoc.docType === 'accomplishment') {
            const nextSeq = Math.floor(freshSettings.accomplishmentNextSequence);
            finalControlNumber = formatControlNumber(freshSettings.accomplishmentPrefix, nextSeq);
            tx.update(settingsRef, {
              accomplishmentNextSequence: nextSeq + 1,
              updatedAt: serverTimestamp(),
            });
          } else {
            const nextSeq = Math.floor(freshSettings.generalNextSequence);
            finalControlNumber = formatControlNumber(freshSettings.generalPrefix, nextSeq);
            tx.update(settingsRef, {
              generalNextSequence: nextSeq + 1,
              updatedAt: serverTimestamp(),
            });
          }
        }

        const nextSignatures = [
          ...freshDoc.signatures,
          {
            id: makeDocId('sig'),
            signerUserId: actor.id,
            signerName: actor.fullName,
            signerPosition: actor.positionOrClub,
            signatureDataUrl: payload.signatureDataUrl,
            signedAt: now,
          },
        ];

        const nextHistory: TransmittalEvent[] = [
          ...freshDoc.transmittalHistory,
          {
            id: makeDocId('tr'),
            stage: 2,
            stepLabel: `Stage 2: Electronically Signed by ${actor.positionOrClub}`,
            action: 'E-Signed',
            actorUserId: actor.id,
            actorName: actor.fullName,
            actorPosition: actor.positionOrClub,
            timestamp: now,
            remarks:
              payload.remarks?.trim() ||
              `Electronically signed and approved by ${actor.fullName} (${actor.positionOrClub}).`,
          },
        ];

        if (newlyIssued) {
          nextHistory.push({
            id: makeDocId('trcn'),
            stage: 3,
            stepLabel: `Stage 3: Control Number ${finalControlNumber} Issued`,
            action: 'Control Number Issued',
            actorUserId: actor.id,
            actorName: actor.fullName,
            actorPosition: actor.positionOrClub,
            timestamp: now,
            remarks: `Sequential Control Number ${finalControlNumber} logged in register. Eartag unlocked for printing.`,
          });
        }

        const nextStage = freshDoc.currentStage < 3 ? 3 : freshDoc.currentStage;
        const nextStageLabel: SSLGDocument['stageLabel'] =
          nextStage === 3 ? 'Stage 3: Control No. & Eartag Ready' : freshDoc.stageLabel;

        tx.update(docRef, {
          controlNumber: finalControlNumber,
          signedFilePath: stamped.signedFilePath ?? freshDoc.signedFilePath ?? null,
          currentStage: nextStage,
          stageLabel: nextStageLabel,
          transmittalHistory: nextHistory,
          signatures: nextSignatures,
          updatedAt: serverTimestamp(),
        });

        return {
          ...freshDoc,
          controlNumber: finalControlNumber,
          signedFilePath: stamped.signedFilePath ?? freshDoc.signedFilePath ?? null,
          currentStage: nextStage,
          stageLabel: nextStageLabel,
          transmittalHistory: nextHistory,
          signatures: nextSignatures,
          updatedAt: now,
        };
      });

      return updated;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `documents/${targetDoc.id}`);
    }
  },

  updateControlNumber: async (
    targetDoc: SSLGDocument,
    controlNumber: string,
    allDocs: SSLGDocument[]
  ): Promise<SSLGDocument> => {
    const trimmed = controlNumber.trim();
    if (!trimmed) {
      throw new Error('Control number cannot be empty.');
    }
    const duplicate = allDocs.some(
      (d) =>
        d.id !== targetDoc.id &&
        d.controlNumber &&
        d.controlNumber.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      throw new Error('Another record already uses this control number.');
    }

    const nextStage = targetDoc.currentStage < 3 ? 3 : targetDoc.currentStage;
    const nextStageLabel: SSLGDocument['stageLabel'] =
      nextStage === 3 ? 'Stage 3: Control No. & Eartag Ready' : targetDoc.stageLabel;
    const now = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'documents', targetDoc.id), {
        controlNumber: trimmed,
        currentStage: nextStage,
        stageLabel: nextStageLabel,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `documents/${targetDoc.id}`);
    }

    return {
      ...targetDoc,
      controlNumber: trimmed,
      currentStage: nextStage,
      stageLabel: nextStageLabel,
      updatedAt: now,
    };
  },

  markDocumentPrinted: async (
    targetDoc: SSLGDocument,
    actor: UserAccount,
    remarks?: string
  ): Promise<SSLGDocument> => {
    if (targetDoc.currentStage < 3) {
      throw new Error(
        'Document must be E-Signed and issued a Control Number (Stage 3) before printing.'
      );
    }
    const now = new Date().toISOString();
    const nextStage = targetDoc.currentStage < 4 ? 4 : targetDoc.currentStage;
    const nextStageLabel: SSLGDocument['stageLabel'] =
      nextStage === 4 ? 'Stage 4: Printed for Routing' : targetDoc.stageLabel;
    const nextHistory: TransmittalEvent[] = [
      ...targetDoc.transmittalHistory,
      {
        id: makeDocId('tr'),
        stage: 4,
        stepLabel: 'Stage 4: Physical Document & Eartag Printed',
        action: 'Marked Printed',
        actorUserId: actor.id,
        actorName: actor.fullName,
        actorPosition: actor.positionOrClub,
        timestamp: now,
        remarks:
          remarks?.trim() ||
          `Signed document and Eartag (${targetDoc.controlNumber}) printed for physical dry-seal / hardcopy routing.`,
      },
    ];

    try {
      await updateDoc(doc(db, 'documents', targetDoc.id), {
        currentStage: nextStage,
        stageLabel: nextStageLabel,
        printedAt: now,
        printedByName: actor.fullName,
        transmittalHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `documents/${targetDoc.id}`);
    }

    return {
      ...targetDoc,
      currentStage: nextStage,
      stageLabel: nextStageLabel,
      printedAt: now,
      printedByName: actor.fullName,
      transmittalHistory: nextHistory,
      updatedAt: now,
    };
  },

  uploadHardcopyScanForDoc: async (
    targetDoc: SSLGDocument,
    actor: UserAccount,
    allDocs: SSLGDocument[],
    params: {
      file: File;
      wetInkSignatories: string;
      notes?: string;
    }
  ): Promise<SSLGDocument> => {
    if (targetDoc.currentStage < 3) {
      throw new Error(
        'Document must complete E-Signature & Control Number issuance before archiving the scanned hardcopy.'
      );
    }

    const uploaded = await api.uploadFile(params.file);
    const now = new Date().toISOString();
    const printedAt = targetDoc.printedAt || now;
    const printedByName = targetDoc.printedByName || actor.fullName;
    const hardcopyScan = {
      scanId: makeDocId('scan'),
      fileName: uploaded.fileName,
      fileMimeType: uploaded.fileMimeType,
      filePath: uploaded.filePath,
      uploadedByUserId: actor.id,
      uploadedByName: actor.fullName,
      uploadedAt: now,
      wetInkSignatories: params.wetInkSignatories.trim() || 'SSLG President & Officers',
      notes: params.notes?.trim() || 'Final printed and approved copy scanned and archived.',
    };

    const nextHistory: TransmittalEvent[] = [
      ...targetDoc.transmittalHistory,
      {
        id: makeDocId('tr'),
        stage: 5,
        stepLabel: 'Stage 5: Final Printed Copy Scanned & Archived (100% Complete)',
        action: 'Hardcopy Scan Uploaded',
        actorUserId: actor.id,
        actorName: actor.fullName,
        actorPosition: actor.positionOrClub,
        timestamp: now,
        remarks:
          params.notes?.trim() ||
          `Scanned final physical copy uploaded (${params.wetInkSignatories || 'Verified'}). Sent to Signed Hardcopy Scans archive.`,
      },
    ];

    try {
      await updateDoc(doc(db, 'documents', targetDoc.id), {
        currentStage: 5,
        stageLabel: 'Stage 5: Completed & Archived',
        printedAt,
        printedByName,
        hardcopyScan,
        transmittalHistory: nextHistory,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `documents/${targetDoc.id}`);
    }

    const updatedDoc: SSLGDocument = {
      ...targetDoc,
      currentStage: 5,
      stageLabel: 'Stage 5: Completed & Archived',
      printedAt,
      printedByName,
      hardcopyScan,
      transmittalHistory: nextHistory,
      updatedAt: now,
    };

    const authorDocs = allDocs
      .filter((d) => d.submittedByUserId === targetDoc.submittedByUserId)
      .map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    await syncContributorStat(targetDoc.submittedByUserId, authorDocs);

    return updatedDoc;
  },
};
