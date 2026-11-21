/**
 * Phase 0 TDD Security Rules Specification Test Harness
 * Verifies the "Dirty Dozen" adversarial payloads against firestore.rules
 * when executed with @firebase/rules-unit-testing against the Firestore Emulator.
 */

export interface DirtyDozenScenario {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_SCENARIOS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Email Spoofing (email_verified: false)',
    collectionPath: 'documents/doc-test-1',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role in user_directory',
    collectionPath: 'user_directory/attacker_uid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: {
      uid: 'attacker_uid',
      fullName: 'Attacker',
      role: 'admin',
      positionOrClub: 'Fake President',
      department: 'None',
      avatarDataUrl: null,
      active: true,
    },
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Document Create',
    collectionPath: 'documents/doc-shadow-1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: {
      id: 'doc-shadow-1',
      docType: 'general',
      title: 'Test',
      isApprovedBypass: true,
    },
  },
  {
    id: 4,
    name: 'Path Variable ID Poisoning (>128 chars)',
    collectionPath: `documents/${'a'.repeat(140)}`,
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-Tenant PII Read on user_private',
    collectionPath: 'user_private/victim_uid',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Cross-Club Blanket Document List',
    collectionPath: 'documents',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unauthorized E-Signature & Control Number Issuance by Club',
    collectionPath: 'documents/doc-stage-1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: {
      currentStage: 3,
      controlNumber: 'SSLG-2026-9999',
    },
  },
  {
    id: 8,
    name: 'Client-Spoofed Timestamp (non-request.time)',
    collectionPath: 'documents/doc-ts-spoof',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: {
      id: 'doc-ts-spoof',
      createdAt: '2020-01-01T00:00:00.000Z',
    },
  },
  {
    id: 9,
    name: 'Immutable submittedByUserId Reassignment',
    collectionPath: 'documents/doc-stage-1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: {
      submittedByUserId: 'another_uid',
    },
  },
  {
    id: 10,
    name: 'Terminal Stage 5 Overwrite by Non-Admin Officer',
    collectionPath: 'documents/doc-stage-5',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: {
      currentStage: 3,
      title: 'Tampered Archived Title',
    },
  },
  {
    id: 11,
    name: 'Oversized Avatar / String Payload Exhaustion',
    collectionPath: 'user_directory/club_uid',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: {
      avatarDataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(350000),
    },
  },
  {
    id: 12,
    name: 'Unauthorized Prefix Modification on settings/global',
    collectionPath: 'settings/global',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: {
      generalPrefix: 'HACKED-2026',
    },
  },
];
