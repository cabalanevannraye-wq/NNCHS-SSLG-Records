import { buildApiUrl } from './api.ts';

export const LIVE_DB_URL =
  'https://nnchs-g-live-default-rtdb.asia-southeast1.firebasedatabase.app/portalState.json';
export const SHARED_CLOUD_URL = LIVE_DB_URL;
export const PORTAL_STORAGE_KEY = 'nnchs_sslg_shared_state_v2';
export const LEGACY_PORTAL_STORAGE_KEYS = [
  'nnchs_sslg_shared_state_v1',
  'nnchs_sslg_portal_v2',
] as const;
export const SYNC_CONFIG_KEY = 'nnchs_sslg_sync_config_v1';
export const THEME_STORAGE_KEY = 'nnchs_sslg_theme';
export const DEFAULT_YORP_LOGO_PATH = '/assets/aistudio/image_582ebce5.png';
export const NNCHS_SCHOOL_LOGO_PATH = '/assets/aistudio/nnchs-logo_4218aa21.jpg';

export type SyncConnectionMode = 'cloud' | 'server' | 'local';

export interface CloudSyncConfig {
  syncApiUrl: string;
}

export function normalizeCloudSyncUrl(raw?: string | null): string {
  const clean = typeof raw === 'string' ? raw.trim().replace(/([^:]\/)\/+/g, '$1') : '';
  if (!clean) return LIVE_DB_URL;
  if (clean.includes('nnchs-g-portal-default-rtdb.asia-southeast1.firebasedatabase.app')) {
    return LIVE_DB_URL;
  }
  return clean;
}

export interface AboutPhotoItem {
  id: string;
  url: string;
  caption: string;
}

export type PortalSectionId =
  | 'home'
  | 'directories'
  | 'printing'
  | 'reporting'
  | 'programs-calendar'
  | 'resolutions-funds';

export interface HeroSlide {
  id: string;
  title: string;
  caption: string;
  ctaLabel: string;
  ctaSection: PortalSectionId;
  imageUrl: string;
}

export interface ImpactStatItem {
  id: string;
  label: string;
  value: number;
  suffix?: string;
}

export interface BulletinPost {
  id: string;
  title: string;
  category: 'Advisory' | 'Event Update' | 'Campus Notice' | 'Learner Welfare';
  publishedAt: string;
  author: string;
  summary: string;
  fullBody: string;
  photoUrl?: string;
  facebookPostUrl?: string;
  featured?: boolean;
}

export interface PublicOfficer {
  id: string;
  fullName: string;
  position: string;
  gradeLevel: string;
  section: string;
  bio: string;
  photoUrl?: string;
  facebookUrl: string;
}

export interface PublicClub {
  id: string;
  name: string;
  acronym: string;
  cluster: string;
  status: 'Accredited' | 'Probationary';
  presidentName: string;
  adviserName: string;
  memberCount: number;
  description: string;
}

export const PRINT_TIMELINE_STEPS = [
  'Submitted',
  'Reviewing',
  'Printing',
  'Ready for Pickup',
  'Claimed',
] as const;

export type PrintJobStatus = (typeof PRINT_TIMELINE_STEPS)[number];

export interface PrintRequestJob {
  id: string;
  jobCode: string;
  studentName: string;
  gradeSection: string;
  copies: number;
  colorOption: 'Black & White' | 'Colored Print';
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  fileDataUrl?: string;
  fileLink?: string;
  notes?: string;
  status: PrintJobStatus;
  submittedAt: string;
  adminNotes: string;
}

export interface PortalProgram {
  id: string;
  title: string;
  category: string;
  status: 'Ongoing' | 'Upcoming' | 'Completed';
  targetDate: string;
  venue: string;
  summary: string;
  photos: string[];
}

export interface LostFoundItem {
  id: string;
  itemCode: string;
  type: 'Found' | 'Lost';
  itemName: string;
  ownerName: string;
  lastSeen: string;
  details: string;
  contactInfo: string;
  photoUrl?: string;
  status: 'Open' | 'Claimed';
}

export type TicketCategory =
  | 'Bullying / Learner Welfare'
  | 'Campus Facilities'
  | 'Academic / Policy Concern'
  | 'General Suggestion';

export interface TicketEvidenceFile {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface GrievanceTicket {
  id: string;
  ticketCode: string;
  category: TicketCategory;
  isAnonymous: boolean;
  studentName: string;
  gradeSection: string;
  subject: string;
  details: string;
  // Section 1: Reporter Information & Confidentiality
  reportingRole?: 'Self (Target/Victim)' | 'Witness' | 'Concerned Peer' | 'Parent or Guardian';
  anonymityPreference?:
    | 'Full Disclosure (Open for direct follow-up)'
    | 'Confidential (Known only to the Guidance Counselor/Welfare Officer)'
    | 'Strictly Anonymous (No contact details provided)';
  preferredContactMethod?: 'Email' | 'Messenger' | 'In-Person via Guidance Office';
  contactValue?: string;
  // Section 2: Incident Classification
  bullyingTypes?: string[];
  incidentFrequency?: 'First time' | 'Happened 2–3 times' | 'Ongoing (Weekly or Daily)';
  // Section 3: Incident Details & Documentation
  incidentDateTime?: string;
  incidentLocation?: string;
  personsInvolved?: string;
  witnesses?: string;
  narrativeDescription?: string;
  evidenceFiles?: TicketEvidenceFile[];
  evidenceLink?: string;
  // Section 4: Immediate Safety & Support Needs
  immediateSafetyCheck?: 'Yes, immediate intervention is needed' | 'No, I am currently safe' | 'Unsure';
  previouslyReported?: boolean;
  previousReportDetails?: string;
  supportPreferences?: string[];
  // Legacy compatibility fields
  welfareWhatHappened?: string;
  welfareWhoDidIt?: string;
  welfareNextAction?: string;
  facilityPhotos: string[];
  approvedForPublic: boolean;
  status: 'Pending Approval' | 'Under Review' | 'Resolved';
  submittedAt: string;
  updatedAt: string;
  adminResponse: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  timeRange: string;
  category:
    | 'School-Wide Events'
    | 'Club Activities'
    | 'Examinations'
    | 'Division/District Events';
  venue: string;
  description: string;
}

export interface FundAllocationItem {
  id: string;
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  notes: string;
}

export interface LegislativeRecord {
  id: string;
  numberCode: string;
  title: string;
  datePassed: string;
  sponsor: string;
  summary: string;
  fullText: string;
  attachedPdfDataUrl?: string;
  attachedPdfName?: string;
}

export interface LearnerServicesContact {
  officeLocation: string;
  officeHours: string;
  contactNumber: string;
  email: string;
  serviceNote: string;
}

export interface PortalState {
  syncUrl?: string;
  liveSynced?: boolean;
  arrayCounts?: Record<string, number>;
  schoolYear: string;
  campusAdvisory: string;
  tickerMessages: string[];
  heroSlides: HeroSlide[];
  yorpLogoUrl: string;
  aboutPhotos: AboutPhotoItem[];
  impactStats: ImpactStatItem[];
  messengerGroupUrl: string;
  bulletinPosts: BulletinPost[];
  officers: PublicOfficer[];
  clubs: PublicClub[];
  printJobs: PrintRequestJob[];
  programs: PortalProgram[];
  lostFound: LostFoundItem[];
  tickets: GrievanceTicket[];
  calendarEvents: CalendarEventItem[];
  funds: FundAllocationItem[];
  resolutions: LegislativeRecord[];
  learnerServicesContact: LearnerServicesContact;
  lastPublishedAt?: string;
}

const PORTAL_ARRAY_KEYS = [
  'tickerMessages',
  'heroSlides',
  'aboutPhotos',
  'impactStats',
  'bulletinPosts',
  'officers',
  'clubs',
  'printJobs',
  'programs',
  'lostFound',
  'tickets',
  'calendarEvents',
  'funds',
  'resolutions',
] as const;

type PortalArrayKey = (typeof PORTAL_ARRAY_KEYS)[number];

export function withArrayMetadata(state: PortalState): PortalState {
  const arrayCounts: Record<string, number> = {};
  for (const key of PORTAL_ARRAY_KEYS) {
    const val = state[key];
    arrayCounts[key] = Array.isArray(val) ? val.length : 0;
  }
  return {
    ...state,
    liveSynced: true,
    arrayCounts,
  };
}

function makeGeometricSlideDataUri(
  title: string,
  accentLabel: string,
  variant: 'navy' | 'royal' | 'deep'
): string {
  const bg1 = variant === 'navy' ? '#0f172a' : variant === 'royal' ? '#1e3a8a' : '#172554';
  const bg2 = variant === 'navy' ? '#1e3a8a' : variant === 'royal' ? '#2563eb' : '#1d4ed8';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="640" viewBox="0 0 1440 640">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="1440" height="640" fill="url(#g)"/>
    <circle cx="1180" cy="140" r="240" fill="#facc15" fill-opacity="0.14"/>
    <circle cx="1220" cy="460" r="190" fill="#3b82f6" fill-opacity="0.22"/>
    <rect x="0" y="616" width="1440" height="24" fill="#eab308"/>
    <text x="96" y="135" fill="#fde047" font-family="sans-serif" font-size="22" font-weight="700" letter-spacing="3">${accentLabel}</text>
    <text x="96" y="210" fill="#ffffff" font-family="sans-serif" font-size="46" font-weight="800">${title}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeProgramPhotoSvg(title: string, badge: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
    <defs>
      <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e3a8a"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="800" height="480" fill="url(#pg)"/>
    <circle cx="680" cy="90" r="140" fill="#facc15" fill-opacity="0.18"/>
    <rect x="0" y="456" width="800" height="24" fill="#eab308"/>
    <text x="48" y="100" fill="#fde047" font-family="sans-serif" font-size="18" font-weight="700">${badge}</text>
    <text x="48" y="160" fill="#ffffff" font-family="sans-serif" font-size="30" font-weight="800">${title}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_PORTAL_STATE: PortalState = {
  syncUrl: SHARED_CLOUD_URL,
  schoolYear: '2026–2027',
  campusAdvisory:
    'Project ‘Free Printing’ for all Learners accepts Black & White and Colored Print files at the SSLG Office (Room 104). Submit files online and follow your live Status Tracker anytime.',
  tickerMessages: [
    'PROJECT ‘FREE PRINTING’ FOR ALL LEARNERS: Black & White and Colored printing accepted — upload your file directly and follow your PRT Code Request Progress.',
    'NYC YORP REGISTERED YOUTH ORGANIZATION: NNCHS SSLG champions Health, Education, Economic Empowerment, Social Inclusion, Peace Building, Governance & Active Leadership.',
    'OFFICIAL SSLG UPDATES: Join the NNCHS SSLG Updates Messenger Group from our Bulletin Board for real-time school advisories.',
  ],
  heroSlides: [
    {
      id: 'slide-1',
      title: 'Serving Every Compre Learner Through Transparent Leadership',
      caption:
        'Official digital portal of the Nabunturan National Comprehensive High School — Supreme Secondary Learner Government.',
      ctaLabel: "Project 'Free Printing'",
      ctaSection: 'printing',
      imageUrl: makeGeometricSlideDataUri('NNCHS SSLG Learner Leadership', 'SY 2026–2027 · OFFICIAL PORTAL', 'navy'),
    },
    {
      id: 'slide-2',
      title: "Project 'Free Printing' for all Learners",
      caption:
        'Upload PDF, DOCX, PPTX, or image files—both Black & White and Colored Print accepted—and follow your live Status Tracker.',
      ctaLabel: 'Request Free Print',
      ctaSection: 'printing',
      imageUrl: makeGeometricSlideDataUri("Project 'Free Printing'", 'B&W & COLORED PRINT SUPPORT', 'royal'),
    },
    {
      id: 'slide-3',
      title: 'Safe Campus Reporting & Student Welfare Desk',
      caption:
        'Dedicated Student Welfare / Anti-Bullying support and Campus Facilities photo reporting directly reviewed by SSLG and Learner Formation Officers.',
      ctaLabel: 'Open Reporting System',
      ctaSection: 'reporting',
      imageUrl: makeGeometricSlideDataUri('Grievance & Welfare Desk', 'CONFIDENTIAL SUPPORT FOR LEARNERS', 'deep'),
    },
  ],
  yorpLogoUrl: DEFAULT_YORP_LOGO_PATH,
  aboutPhotos: [
    {
      id: 'about-photo-1',
      url: NNCHS_SCHOOL_LOGO_PATH,
      caption: 'Nabunturan National Comprehensive High School Official Seal',
    },
    {
      id: 'about-photo-2',
      url: makeProgramPhotoSvg('SSLG General Assembly', 'LEARNER GOVERNANCE · SY 2026–2027'),
      caption: 'Compre Learner Leaders Assembly & Policy Consultation',
    },
    {
      id: 'about-photo-3',
      url: makeProgramPhotoSvg('YORP Advocacy Initiatives', 'NATIONAL YOUTH COMMISSION ACCREDITED'),
      caption: 'NYC YORP Registered Youth Organization Programs',
    },
    {
      id: 'about-photo-4',
      url: makeProgramPhotoSvg("Project 'Free Printing'", 'ROOM 104 LEARNER SUPPORT DESK'),
      caption: 'Project Free Printing Academic Support Operations',
    },
  ],
  impactStats: [
    { id: 'stat-1', label: 'Recognized Clubs & Organizations', value: 9 },
    { id: 'stat-2', label: 'Programs & Initiatives', value: 18 },
    { id: 'stat-3', label: 'Resolutions Enacted', value: 12 },
    { id: 'stat-4', label: 'Learner Concerns Addressed', value: 47 },
  ],
  messengerGroupUrl: 'https://m.me/nnchssslg.official',
  bulletinPosts: [
    {
      id: 'bul-1',
      title: "Project 'Free Printing' Now Accepts Colored & Multi-Copy Academic Requests",
      category: 'Advisory',
      publishedAt: '2026-11-21',
      author: 'Office of the SSLG Secretariat',
      summary:
        'Learners may now specify exact copy counts, choose Black & White or Colored Print, upload files directly, and follow live Status Tracker progress.',
      fullBody:
        'Pursuant to SSLG Resolution No. 2026-04, Project ‘Free Printing’ for all Learners has been upgraded to accept both Black & White and Colored academic files directly on the NNCHS SSLG Website.\n\nUpload your PDF, Word document, presentation, or image file cleanly on the Free Printing tab, save your generated PRT-2026 tracking code, and monitor every step from Submitted to Claimed.',
      facebookPostUrl: 'https://www.facebook.com/nnchssslg.official',
      featured: true,
    },
    {
      id: 'bul-2',
      title: 'Join the Official NNCHS SSLG Updates Messenger Group',
      category: 'Campus Notice',
      publishedAt: '2026-11-19',
      author: 'Public Information Office',
      summary:
        'Stay connected with real-time class advisories, examination reminders, and club notices via our official Messenger community.',
      fullBody:
        'All JHS and SHS learners are encouraged to join the SSLG Updates Messenger Group to receive instant campus announcements, calendar reminders, and activity schedules directly.',
      facebookPostUrl: 'https://www.facebook.com/nnchssslg.official',
    },
    {
      id: 'bul-3',
      title: 'NYC YORP Renewal Advocacy Focus Areas for SY 2026–2027',
      category: 'Event Update',
      publishedAt: '2026-11-15',
      author: 'SSLG Executive Council',
      summary:
        'Continuing our recognized YORP commitment across Health, Education, Economic Empowerment, Social Inclusion, Peace Building, Governance & Active Leadership.',
      fullBody:
        'On August 3, 2023, NNCHS SSLG successfully renewed its Youth Organization Registration Program (YORP) accreditation under the National Youth Commission, anchoring all campus programs on seven key youth development pillars.',
      facebookPostUrl: 'https://www.facebook.com/nnchssslg.official',
    },
  ],
  officers: [
    {
      id: 'off-1',
      fullName: 'Evann Raye Cabalan',
      position: 'SSLG President',
      gradeLevel: 'Grade 12',
      section: 'STEM A - Rizal',
      bio: 'Presides over the NNCHS Supreme Secondary Learner Government, coordinates student welfare policy, and represents learners across campus councils.',
      facebookUrl: 'https://www.facebook.com/nnchssslg.official',
    },
    {
      id: 'off-2',
      fullName: 'Clarisse Anne Mendoza',
      position: 'SSLG Vice President',
      gradeLevel: 'Grade 12',
      section: 'HUMSS B - Mabini',
      bio: 'Leads internal club coordination, parliamentary sessions, and inter-grade student consultations.',
      facebookUrl: 'https://www.facebook.com/nnchssslg.official',
    },
    {
      id: 'off-3',
      fullName: 'Jethro Paul Alcaraz',
      position: 'SSLG Secretary',
      gradeLevel: 'Grade 11',
      section: 'STEM B - Bonifacio',
      bio: 'Manages official SSLG minutes, resolutions, bulletin publications, and Project ‘Free Printing’ queue operations.',
      facebookUrl: 'https://www.facebook.com/nnchssslg.official',
    },
    {
      id: 'off-4',
      fullName: 'Hannah Grace Dela Cruz',
      position: 'SSLG Treasurer',
      gradeLevel: 'Grade 11',
      section: 'ABM A - Silang',
      bio: 'Stewards learner government budget allocations, printing supply procurement, and public fund reporting.',
      facebookUrl: 'https://www.facebook.com/nnchssslg.official',
    },
    {
      id: 'off-5',
      fullName: 'Mark Anthony Quimpo',
      position: 'SSLG Auditor',
      gradeLevel: 'Grade 12',
      section: 'ABM B - Del Pilar',
      bio: 'Audits official receipts, SSLG properties, and student activity financial balances.',
      facebookUrl: 'https://www.facebook.com/nnchssslg.official',
    },
    {
      id: 'off-6',
      fullName: 'Bea Katrina Villalobos',
      position: 'Public Information Officer',
      gradeLevel: 'Grade 11',
      section: 'HUMSS A - Jacinto',
      bio: 'Coordinates campus-wide announcements, bulletin board updates, and the SSLG Updates Messenger Group.',
      facebookUrl: 'https://www.facebook.com/nnchssslg.official',
    },
    {
      id: 'off-7',
      fullName: 'Lorenzo Miguel Bautista',
      position: 'Protocol Officer',
      gradeLevel: 'Grade 10',
      section: 'STE - Newton',
      bio: 'Oversees campus assembly orderliness, Lost & Found custody, and student welfare coordination.',
      facebookUrl: 'https://www.facebook.com/nnchssslg.official',
    },
    {
      id: 'off-8',
      fullName: 'Sofia Nicole Pangilinan',
      position: 'Grade 12 Representative',
      gradeLevel: 'Grade 12',
      section: 'TVL-ICT A',
      bio: 'Voices Grade 12 learner priorities on work immersion, research needs, and academic support.',
      facebookUrl: 'https://www.facebook.com/nnchssslg.official',
    },
  ],
  clubs: [
    {
      id: 'club-1',
      name: 'Ang Lambak Campus Press',
      acronym: 'ANG LAMBAK',
      cluster: 'Campus Press & Media',
      status: 'Accredited',
      presidentName: 'Kyla Marie Enriquez',
      adviserName: 'Mr. Danilo R. Fernandez',
      memberCount: 48,
      description: 'Official student publication of NNCHS covering school news, division press clinics, and campus features.',
    },
    {
      id: 'club-2',
      name: 'NNCHS Young Scientists & STEM Guild',
      acronym: 'YSSG-STEM',
      cluster: 'STEM & Research',
      status: 'Accredited',
      presidentName: 'Nathaniel Cruz',
      adviserName: 'Mrs. Marites L. Bacalso',
      memberCount: 74,
      description: 'Advances investigatory science projects, robotics prototyping, and academic quiz bowls.',
    },
    {
      id: 'club-3',
      name: 'Youth for Environment in Schools Organization',
      acronym: 'YES-O NNCHS',
      cluster: 'Civic & Environmental',
      status: 'Accredited',
      presidentName: 'Jomar V. Tagupa',
      adviserName: 'Ms. Jocelyn D. Magno',
      memberCount: 112,
      description: 'Drives campus waste segregation, eco-gardening, and environmental conservation across Grades 7–12.',
    },
    {
      id: 'club-4',
      name: 'NNCHS Red Cross Youth Council',
      acronym: 'RCY-NNCHS',
      cluster: 'Health & First Aid',
      status: 'Accredited',
      presidentName: 'Shaira Mae Lomibao',
      adviserName: 'Nurse Kevin P. Bautista',
      memberCount: 65,
      description: 'Trains learner first-aiders and staffs campus wellness and emergency preparedness drives.',
    },
    {
      id: 'club-5',
      name: 'Kalinaw Cultural & Performing Arts Ensemble',
      acronym: 'KALINAW ARTS',
      cluster: 'Arts & Culture',
      status: 'Accredited',
      presidentName: 'Renz Carlo Dizon',
      adviserName: 'Mrs. Corazon S. Rivera',
      memberCount: 54,
      description: 'Showcases heritage dance, choir, rondalla, and theater productions for Compre celebrations.',
    },
    {
      id: 'club-6',
      name: 'NNCHS Debate & Academic Honor Society',
      acronym: 'NDAHS',
      cluster: 'Academic & Debate',
      status: 'Accredited',
      presidentName: 'Patricia Mae Villanueva',
      adviserName: 'Mr. Wilfredo A. Castro',
      memberCount: 41,
      description: 'Builds public speaking, parliamentary literacy, and civic debate excellence.',
    },
  ],
  printJobs: [
    {
      id: 'prt-1',
      jobCode: 'PRT-2026-101',
      studentName: 'Althea Marie Villanueva',
      gradeSection: '12 - STEM A Rizal',
      copies: 2,
      colorOption: 'Black & White',
      fileName: 'Research_Ch1-3_Villanueva.pdf',
      fileMimeType: 'application/pdf',
      fileSize: 284000,
      fileLink: 'https://drive.google.com',
      notes: 'Back-to-back if possible for thesis draft checking.',
      status: 'Ready for Pickup',
      submittedAt: '2026-11-21T08:15:00+08:00',
      adminNotes: 'Printed 2 clean copies. Ready at Room 104 counter.',
    },
    {
      id: 'prt-2',
      jobCode: 'PRT-2026-102',
      studentName: 'Carl Angelo Dalisay',
      gradeSection: '10 - STE Newton',
      copies: 1,
      colorOption: 'Colored Print',
      fileName: 'Science_Visual_Chart.png',
      fileMimeType: 'image/png',
      fileSize: 192000,
      notes: 'Colored print for Science classroom visual aid.',
      status: 'Printing',
      submittedAt: '2026-11-21T09:40:00+08:00',
      adminNotes: 'Queued for color inkjet print.',
    },
  ],
  programs: [
    {
      id: 'prog-1',
      title: "Project 'Free Printing' for all Learners",
      category: 'Education',
      status: 'Ongoing',
      targetDate: '2027-03-31',
      venue: 'SSLG Office · Room 104',
      summary:
        'Provides free Black & White and Colored academic printing for Compre learners with direct file upload and live Status Tracker progress.',
      photos: [
        makeProgramPhotoSvg("Project 'Free Printing'", 'EDUCATION & LEARNER SUPPORT'),
        makeProgramPhotoSvg('Room 104 Print Station', 'BLACK & WHITE · COLORED ACCEPTED'),
      ],
    },
    {
      id: 'prog-2',
      title: 'Compre Youth Leadership & Parliamentary Summit',
      category: 'Governance & Active Leadership',
      status: 'Upcoming',
      targetDate: '2026-12-12',
      venue: 'NNCHS Gymnasium',
      summary:
        'Interactive civic workshops, mock council legislation, and club leadership mentoring aligned with NYC YORP advocacies.',
      photos: [
        makeProgramPhotoSvg('Youth Leadership Summit', 'GOVERNANCE & ACTIVE LEADERSHIP'),
        makeProgramPhotoSvg('Parliamentary Literacy', 'NNCHS GYMNASIUM'),
      ],
    },
    {
      id: 'prog-3',
      title: 'Berde Compre: Clean & Safe Campus Initiative',
      category: 'Health & Social Inclusion',
      status: 'Ongoing',
      targetDate: '2027-02-20',
      venue: 'NNCHS Quadrangles',
      summary:
        'Campus cleanliness drives, eco-brick collection, and student wellness awareness booths led by grade representatives.',
      photos: [
        makeProgramPhotoSvg('Berde Compre Clean Drive', 'HEALTH & ENVIRONMENT'),
      ],
    },
  ],
  lostFound: [
    {
      id: 'lf-1',
      itemCode: 'LF-2026-01',
      type: 'Found',
      itemName: 'Casio fx-991ES Plus Scientific Calculator',
      ownerName: 'Unclaimed (Name label faded)',
      lastSeen: 'SHS Building 2nd Floor Corridor · Nov 20, 2026',
      details: 'Silver-black calculator inside clear sleeve.',
      contactInfo: 'Claim at SSLG Office Room 104',
      status: 'Open',
    },
    {
      id: 'lf-2',
      itemCode: 'LF-2026-02',
      type: 'Lost',
      itemName: 'Navy Blue Compre Tumbler (22oz)',
      ownerName: 'Mikaela Grace P.',
      lastSeen: 'Covered Court Bleachers · Nov 21, 2026',
      details: 'Has yellow Compre sticker near the bottom.',
      contactInfo: 'FB Messenger: Mikaela P. (Grade 10 Rosal)',
      status: 'Open',
    },
  ],
  tickets: [
    {
      id: 'tkt-1',
      ticketCode: 'NNCHS-SSLG-2026-8412',
      category: 'Campus Facilities',
      isAnonymous: false,
      studentName: 'Paolo Miguel D.',
      gradeSection: '11 - STEM A',
      subject: 'Ceiling Fan & Outlet Check Needed in Room 208',
      details: 'Two ceiling fans in Room 208 wobble loudly and one wall switch needs electrician inspection.',
      facilityPhotos: [],
      approvedForPublic: true,
      status: 'Under Review',
      submittedAt: '2026-11-18T10:20:00+08:00',
      updatedAt: '2026-11-19T14:00:00+08:00',
      adminResponse:
        'Inspected by SSLG Facilities Committee and endorsed to NNCHS School Physical Facilities for repair.',
    },
    {
      id: 'tkt-2',
      ticketCode: 'NNCHS-SSLG-2026-8419',
      category: 'General Suggestion',
      isAnonymous: true,
      studentName: 'Anonymous',
      gradeSection: 'Undisclosed',
      subject: 'Earlier Afternoon Drinking Station Refill Near Grade 9 Wing',
      details: 'Water dispenser near Grade 9 corridor runs empty before afternoon dismissal.',
      facilityPhotos: [],
      approvedForPublic: true,
      status: 'Resolved',
      submittedAt: '2026-11-16T15:05:00+08:00',
      updatedAt: '2026-11-18T11:30:00+08:00',
      adminResponse:
        'Coordinated with school utility personnel; afternoon refill schedule adjusted to 1:30 PM daily.',
    },
  ],
  calendarEvents: [
    {
      id: 'cal-1',
      title: 'SSLG Monthly Legislative & Homeroom Presidents Session',
      date: '2026-11-27',
      timeRange: '4:00 PM – 5:15 PM',
      category: 'School-Wide Events',
      venue: 'NNCHS Audio-Visual Room',
      description: 'Monthly legislative session reviewing approved concerns and December programs.',
    },
    {
      id: 'cal-2',
      title: '2nd Quarter Written & Performance Examinations',
      date: '2026-12-03',
      timeRange: '7:30 AM – 3:30 PM',
      category: 'Examinations',
      venue: 'All JHS & SHS Classrooms',
      description: 'Quarterly assessment week. Reviewer printing requests accommodated at Room 104.',
    },
    {
      id: 'cal-3',
      title: 'Compre Youth Leadership & Parliamentary Summit',
      date: '2026-12-12',
      timeRange: '8:00 AM – 4:30 PM',
      category: 'Division/District Events',
      venue: 'NNCHS Gymnasium',
      description: 'Learner Governance workshops and NYC YORP advocacy planning.',
    },
  ],
  funds: [
    {
      id: 'fund-1',
      category: "Project 'Free Printing' Ink & Paper Supply",
      allocatedAmount: 22000,
      spentAmount: 14250,
      notes: 'Bond paper reams, black laser toner, and colored printer ink bottles.',
    },
    {
      id: 'fund-2',
      category: 'Student Welfare & Campus Safety Kits',
      allocatedAmount: 15000,
      spentAmount: 6850,
      notes: 'First-aid kit refills and campus sanitation supplies.',
    },
    {
      id: 'fund-3',
      category: 'Leadership Summits & Club Activities',
      allocatedAmount: 18000,
      spentAmount: 5900,
      notes: 'Training materials, sound logistics, and recognition certificates.',
    },
    {
      id: 'fund-4',
      category: 'Green Campus & YORP Advocacy Projects',
      allocatedAmount: 10000,
      spentAmount: 4200,
      notes: 'MRF waste bins and student civic initiatives.',
    },
  ],
  resolutions: [
    {
      id: 'res-1',
      numberCode: 'Resolution No. 2026-04',
      title: "Establishing Project 'Free Printing' for all Learners (B&W and Colored Print)",
      datePassed: '2026-09-18',
      sponsor: 'Sec. Jethro Paul Alcaraz & Treas. Hannah Grace Dela Cruz',
      summary:
        'Establishes free academic printing for Compre learners supporting both Black & White and Colored printouts with Status Tracker progress.',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)

SSLG RESOLUTION NO. 2026-04 (Series of 2026)

A RESOLUTION ESTABLISHING "PROJECT 'FREE PRINTING' FOR ALL LEARNERS" AT THE NNCHS SSLG OFFICE

WHEREAS, bonafide Junior and Senior High School learners regularly require printed worksheets, research drafts, reviewers, and visual projects;
WHEREAS, the NNCHS SSLG is committed to reducing academic expenses for every Compre learner;

NOW, THEREFORE, BE IT RESOLVED AS IT IS HEREBY RESOLVED, that the NNCHS SSLG operates Project 'Free Printing' for all Learners at Room 104, accepting both Black & White and Colored Print requests via direct file upload on the Official SSLG Website.

RESOLVED FURTHER, that learners shall receive a unique Tracking Code with live Request Progress updates until pickup.

APPROVED UNANIMOUSLY this 18th day of September 2026.
Signed: Evann Raye Cabalan, SSLG President
Attested: Jethro Paul Alcaraz, SSLG Secretary`,
    },
    {
      id: 'res-2',
      numberCode: 'Resolution No. 2026-05',
      title: 'Establishing the Guided Student Welfare & Campus Facilities Reporting Desk',
      datePassed: '2026-10-02',
      sponsor: 'Protocol Officer Lorenzo Miguel Bautista',
      summary:
        'Creates guided reporting protocols for Anti-Bullying / Welfare concerns and photo-enabled Campus Facilities reports.',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)

SSLG RESOLUTION NO. 2026-05 (Series of 2026)

A RESOLUTION INSTITUTIONALIZING THE GUIDED STUDENT WELFARE AND CAMPUS FACILITIES REPORTING SYSTEM

Section 1. Guided Welfare Intake. Student Welfare and Anti-Bullying reports shall remain confidential and guide learners to describe what happened, who was involved, and what immediate support is needed, alongside class adviser and Learner Formation Officer coordination.
Section 2. Public Moderation. Only reports expressly approved by the SSLG Executive Council may appear on the public feed to safeguard learner privacy.

APPROVED this 2nd day of October 2026.`,
    },
    {
      id: 'res-3',
      numberCode: 'Resolution No. 2026-06',
      title: 'Aligning Annual Learner Programs with the Seven NYC YORP Advocacy Pillars',
      datePassed: '2026-11-06',
      sponsor: 'VP Clarisse Anne Mendoza',
      summary:
        'Formalizes campus programming under Health, Education, Economic Empowerment, Social Inclusion, Peace Building & Security, Governance, and Active Leadership.',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)

SSLG RESOLUTION NO. 2026-06 (Series of 2026)

A RESOLUTION ALIGNING ALL ACCREDITED CLUB AND SSLG INITIATIVES WITH NYC YORP ADVOCACY PILLARS

RESOLVED, that building on the August 3, 2023 NYC YORP renewal, every flagship initiative for SY 2026–2027 shall advance measurable learner outcomes across Health, Education, Economic Empowerment, Social Inclusion, Peace Building & Security, Governance, and Active Leadership.

Passed November 6, 2026.`,
    },
  ],
  learnerServicesContact: {
    officeLocation: 'SSLG Office · Room 104, Main Academic Building',
    officeHours: 'Monday–Friday · 8:00 AM – 5:00 PM',
    contactNumber: '0916-386-6252',
    email: 'sslg.nnchs@gmail.com',
    serviceNote: 'Approach the SSLG Office or message our official channels for Free Printing, Lost & Found claims, or Student Welfare support.',
  },
};

export function normalizePrintStatus(raw: string | undefined): PrintJobStatus {
  if (!raw) return 'Submitted';
  if ((PRINT_TIMELINE_STEPS as readonly string[]).includes(raw)) {
    return raw as PrintJobStatus;
  }
  const map: Record<string, PrintJobStatus> = {
    'Request Submitted': 'Submitted',
    'Reviewing File': 'Reviewing',
    'Printing in Progress': 'Printing',
    'Ready for Pickup at SSLG Office': 'Ready for Pickup',
  };
  return map[raw] || 'Submitted';
}

export function normalizeTicketCategory(raw: string | undefined): TicketCategory {
  if (raw === 'Student Welfare / Anti-Bullying' || raw === 'Bullying / Learner Welfare') {
    return 'Bullying / Learner Welfare';
  }
  if (
    raw === 'Campus Facilities' ||
    raw === 'Academic / Policy Concern' ||
    raw === 'General Suggestion'
  ) {
    return raw;
  }
  return 'Bullying / Learner Welfare';
}

function resolveNormalizedArray<K extends PortalArrayKey>(
  parsed: Partial<PortalState>,
  key: K,
  preserveEmptyFromRemote: boolean
): PortalState[K] {
  const candidate = parsed[key];
  if (Array.isArray(candidate)) {
    return candidate as PortalState[K];
  }
  if (parsed.arrayCounts && typeof parsed.arrayCounts === 'object' && parsed.arrayCounts[key] === 0) {
    return [] as unknown as PortalState[K];
  }
  if (preserveEmptyFromRemote) {
    return [] as unknown as PortalState[K];
  }
  return DEFAULT_PORTAL_STATE[key];
}

export function normalizePortalState(parsed: Partial<PortalState> | null | undefined): PortalState {
  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_PORTAL_STATE;
  }

  const preserveEmptyFromRemote = Boolean(
    parsed.liveSynced || parsed.lastPublishedAt || parsed.arrayCounts
  );

  const rawJobs = resolveNormalizedArray(parsed, 'printJobs', preserveEmptyFromRemote);
  const normalizedJobs = rawJobs.map((job) => ({
    ...job,
    status: normalizePrintStatus(job?.status),
  }));

  const rawTickets = resolveNormalizedArray(parsed, 'tickets', preserveEmptyFromRemote);
  const normalizedTickets = rawTickets.map((t) => ({
    ...t,
    category: normalizeTicketCategory(t?.category),
    facilityPhotos: Array.isArray(t?.facilityPhotos) ? t.facilityPhotos : [],
    bullyingTypes: Array.isArray(t?.bullyingTypes) ? t.bullyingTypes : undefined,
    supportPreferences: Array.isArray(t?.supportPreferences) ? t.supportPreferences : undefined,
    evidenceFiles: Array.isArray(t?.evidenceFiles) ? t.evidenceFiles : undefined,
  }));

  const rawPrograms = resolveNormalizedArray(parsed, 'programs', preserveEmptyFromRemote);
  const normalizedPrograms = rawPrograms.map((prog) => ({
    ...prog,
    photos: Array.isArray(prog?.photos) ? prog.photos : [],
  }));

  return withArrayMetadata({
    ...DEFAULT_PORTAL_STATE,
    ...parsed,
    syncUrl: normalizeCloudSyncUrl(parsed.syncUrl),
    tickerMessages: resolveNormalizedArray(parsed, 'tickerMessages', preserveEmptyFromRemote),
    heroSlides: resolveNormalizedArray(parsed, 'heroSlides', preserveEmptyFromRemote),
    aboutPhotos: resolveNormalizedArray(parsed, 'aboutPhotos', preserveEmptyFromRemote),
    impactStats: resolveNormalizedArray(parsed, 'impactStats', preserveEmptyFromRemote),
    bulletinPosts: resolveNormalizedArray(parsed, 'bulletinPosts', preserveEmptyFromRemote),
    officers: resolveNormalizedArray(parsed, 'officers', preserveEmptyFromRemote),
    clubs: resolveNormalizedArray(parsed, 'clubs', preserveEmptyFromRemote),
    printJobs: normalizedJobs,
    programs: normalizedPrograms,
    lostFound: resolveNormalizedArray(parsed, 'lostFound', preserveEmptyFromRemote),
    tickets: normalizedTickets,
    calendarEvents: resolveNormalizedArray(parsed, 'calendarEvents', preserveEmptyFromRemote),
    funds: resolveNormalizedArray(parsed, 'funds', preserveEmptyFromRemote),
    resolutions: resolveNormalizedArray(parsed, 'resolutions', preserveEmptyFromRemote),
    learnerServicesContact: {
      ...DEFAULT_PORTAL_STATE.learnerServicesContact,
      ...(parsed.learnerServicesContact || {}),
    },
  });
}

export function loadSyncConfig(): CloudSyncConfig {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (!raw) return { syncApiUrl: LIVE_DB_URL };
    const parsed = JSON.parse(raw) as Partial<CloudSyncConfig>;
    const normalized = normalizeCloudSyncUrl(parsed.syncApiUrl);
    if (normalized !== parsed.syncApiUrl) {
      localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify({ syncApiUrl: normalized }));
    }
    return { syncApiUrl: normalized };
  } catch {
    return { syncApiUrl: LIVE_DB_URL };
  }
}

export function saveSyncConfig(config: CloudSyncConfig): void {
  try {
    localStorage.setItem(
      SYNC_CONFIG_KEY,
      JSON.stringify({ syncApiUrl: normalizeCloudSyncUrl(config.syncApiUrl) })
    );
  } catch {
    // ignore storage quota errors
  }
}

export function loadPortalState(): PortalState {
  try {
    let raw = localStorage.getItem(PORTAL_STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_PORTAL_STORAGE_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          raw = legacyRaw;
          break;
        }
      }
    }
    if (!raw) {
      const initial = withArrayMetadata(DEFAULT_PORTAL_STATE);
      localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<PortalState>;
    const normalized = normalizePortalState(parsed);
    localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return withArrayMetadata(DEFAULT_PORTAL_STATE);
  }
}

export function savePortalState(state: PortalState): void {
  try {
    localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(withArrayMetadata(state)));
  } catch {
    // ignore storage quota errors cleanly
  }
}

function isRasterImageDataUrl(value: string | undefined): value is string {
  return Boolean(
    value &&
      value.startsWith('data:image/') &&
      !value.startsWith('data:image/svg+xml')
  );
}

export async function compressDataUrlImage(
  dataUrl: string,
  maxWidth = 900,
  quality = 0.72
): Promise<string> {
  if (!isRasterImageDataUrl(dataUrl) || typeof document === 'undefined') {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;
        if (!naturalWidth || !naturalHeight) {
          resolve(dataUrl);
          return;
        }
        const scale = naturalWidth > maxWidth ? maxWidth / naturalWidth : 1;
        const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
        const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function compressPortalImages(state: PortalState): Promise<PortalState> {
  const [
    yorpLogoUrl,
    heroSlides,
    aboutPhotos,
    bulletinPosts,
    officers,
    programs,
    lostFound,
    tickets,
  ] = await Promise.all([
    compressDataUrlImage(state.yorpLogoUrl),
    Promise.all(
      state.heroSlides.map(async (slide) => ({
        ...slide,
        imageUrl: await compressDataUrlImage(slide.imageUrl),
      }))
    ),
    Promise.all(
      state.aboutPhotos.map(async (photo) => ({
        ...photo,
        url: await compressDataUrlImage(photo.url),
      }))
    ),
    Promise.all(
      state.bulletinPosts.map(async (post) => ({
        ...post,
        photoUrl: post.photoUrl ? await compressDataUrlImage(post.photoUrl) : post.photoUrl,
      }))
    ),
    Promise.all(
      state.officers.map(async (off) => ({
        ...off,
        photoUrl: off.photoUrl ? await compressDataUrlImage(off.photoUrl) : off.photoUrl,
      }))
    ),
    Promise.all(
      state.programs.map(async (prog) => ({
        ...prog,
        photos: await Promise.all(prog.photos.map((p) => compressDataUrlImage(p))),
      }))
    ),
    Promise.all(
      state.lostFound.map(async (lf) => ({
        ...lf,
        photoUrl: lf.photoUrl ? await compressDataUrlImage(lf.photoUrl) : lf.photoUrl,
      }))
    ),
    Promise.all(
      state.tickets.map(async (t) => ({
        ...t,
        facilityPhotos: await Promise.all(t.facilityPhotos.map((p) => compressDataUrlImage(p))),
        evidenceFiles: t.evidenceFiles
          ? await Promise.all(
              t.evidenceFiles.map(async (ev) => ({
                ...ev,
                dataUrl: ev.mimeType.startsWith('image/')
                  ? await compressDataUrlImage(ev.dataUrl)
                  : ev.dataUrl,
              }))
            )
          : t.evidenceFiles,
      }))
    ),
  ]);

  return {
    ...state,
    yorpLogoUrl,
    heroSlides,
    aboutPhotos,
    bulletinPosts,
    officers,
    programs,
    lostFound,
    tickets,
  };
}

function buildCloudWriteRequest(
  targetUrl: string,
  payloadState: PortalState
): { method: 'PUT' | 'POST'; headers: Record<string, string>; body: string } {
  const basePath = targetUrl.split('?')[0].toLowerCase();
  const isFirebaseRtdb = basePath.endsWith('.json');
  const isJsonBin = targetUrl.includes('api.jsonbin.io');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (isFirebaseRtdb || isJsonBin) {
    return {
      method: 'PUT',
      headers,
      body: JSON.stringify(payloadState),
    };
  }

  const workerSecret =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUD_SYNC_SECRET
      ? String(import.meta.env.VITE_CLOUD_SYNC_SECRET).trim()
      : '';
  if (workerSecret) {
    headers.Authorization = `Bearer ${workerSecret}`;
  }

  return {
    method: 'POST',
    headers,
    body: JSON.stringify(payloadState),
  };
}

function unwrapCloudPayload(raw: unknown): { state: Partial<PortalState> | null; updatedAt: string | null } {
  if (!raw || typeof raw !== 'object') return { state: null, updatedAt: null };
  const obj = raw as Record<string, unknown>;
  if (obj.record && typeof obj.record === 'object') {
    const rec = obj.record as Record<string, unknown>;
    if (rec.state && typeof rec.state === 'object') {
      return {
        state: rec.state as Partial<PortalState>,
        updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : null,
      };
    }
    return { state: rec as Partial<PortalState>, updatedAt: null };
  }
  if ('state' in obj) {
    return {
      state:
        obj.state && typeof obj.state === 'object' ? (obj.state as Partial<PortalState>) : null,
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : null,
    };
  }
  if ('schoolYear' in obj || 'printJobs' in obj || 'officers' in obj || 'syncUrl' in obj) {
    return {
      state: obj as Partial<PortalState>,
      updatedAt: typeof obj.lastPublishedAt === 'string' ? obj.lastPublishedAt : null,
    };
  }
  return { state: null, updatedAt: null };
}

let syncWriteChain: Promise<unknown> = Promise.resolve();

export async function loadLivePublicData(syncApiUrl?: string): Promise<{
  state: PortalState | null;
  mode: SyncConnectionMode;
  updatedAt: string | null;
  seeded?: boolean;
  error?: string;
}> {
  const targetUrl = normalizeCloudSyncUrl(syncApiUrl ?? loadSyncConfig().syncApiUrl);
  const cacheBustedUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

  try {
    const res = await fetch(cacheBustedUrl, { method: 'GET', cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as unknown;
      const isEmptyObject =
        data !== null && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0;

      if (data === null || isEmptyObject) {
        // Database is completely empty on first-ever run: seed once with default NNCHS-SSLG data via PUT
        const seededAt = new Date().toISOString();
        const seededState = withArrayMetadata({
          ...DEFAULT_PORTAL_STATE,
          syncUrl: targetUrl,
          lastPublishedAt: seededAt,
        });
        try {
          const reqInit = buildCloudWriteRequest(targetUrl, seededState);
          await fetch(targetUrl, {
            method: reqInit.method,
            headers: reqInit.headers,
            body: reqInit.body,
          });
        } catch {
          // Best-effort initial seed
        }
        savePortalState(seededState);
        return { state: seededState, mode: 'cloud', updatedAt: seededAt, seeded: true };
      }

      const unwrapped = unwrapCloudPayload(data);
      if (unwrapped.state) {
        const normalized = normalizePortalState({
          ...unwrapped.state,
          syncUrl: targetUrl,
        });
        savePortalState(normalized);
        return { state: normalized, mode: 'cloud', updatedAt: unwrapped.updatedAt };
      }
      return { state: null, mode: 'cloud', updatedAt: null };
    }
  } catch (err) {
    const networkMsg = err instanceof Error ? err.message : 'Unable to reach live cloud database.';
    try {
      const res = await fetch(buildApiUrl('/api/portal/state'), {
        method: 'GET',
        cache: 'no-store',
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = (await res.json()) as {
          state?: Partial<PortalState> | null;
          updatedAt?: string | null;
        };
        if (data.state && typeof data.state === 'object') {
          const normalized = normalizePortalState(data.state);
          savePortalState(normalized);
          return {
            state: normalized,
            mode: 'server',
            updatedAt: data.updatedAt || normalized.lastPublishedAt || null,
          };
        }
        return { state: null, mode: 'server', updatedAt: null };
      }
    } catch {
      return { state: null, mode: 'local', updatedAt: null, error: networkMsg };
    }
    return { state: null, mode: 'local', updatedAt: null, error: networkMsg };
  }

  return {
    state: null,
    mode: 'local',
    updatedAt: null,
    error: `Live database at ${targetUrl} could not be loaded.`,
  };
}

export const fetchFromCloud = loadLivePublicData;

export function syncAdminChangesToPublic(
  state: PortalState,
  authToken?: string | null,
  syncApiUrl?: string
): Promise<{
  ok: boolean;
  mode: SyncConnectionMode;
  updatedAt: string;
  publishedState?: PortalState;
  error?: string;
}> {
  const runWrite = async (): Promise<{
    ok: boolean;
    mode: SyncConnectionMode;
    updatedAt: string;
    publishedState?: PortalState;
    error?: string;
  }> => {
    const targetUrl = normalizeCloudSyncUrl(
      syncApiUrl ?? state.syncUrl ?? loadSyncConfig().syncApiUrl
    );
    const publishedAt = new Date().toISOString();
    const compressed = await compressPortalImages(state);
    const payloadState = withArrayMetadata({
      ...compressed,
      syncUrl: targetUrl,
      lastPublishedAt: publishedAt,
    });
    savePortalState(payloadState);

    let cloudSynced = false;
    let lastError: string | undefined;

    try {
      const reqInit = buildCloudWriteRequest(targetUrl, payloadState);
      const res = await fetch(targetUrl, {
        method: reqInit.method,
        headers: reqInit.headers,
        body: reqInit.body,
      });
      if (res.ok) {
        cloudSynced = true;
      } else {
        const detail = await res.text().catch(() => '');
        lastError = `Cloud Sync HTTP ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`;
      }
    } catch (err) {
      lastError =
        err instanceof Error
          ? `Network error: ${err.message}`
          : 'Network error reaching Live Database URL.';
    }

    if (authToken) {
      try {
        await fetch(buildApiUrl('/api/portal/state'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ state: payloadState }),
        });
      } catch {
        // Optional local Node mirror failed cleanly
      }
    }

    if (cloudSynced) {
      return {
        ok: true,
        mode: 'cloud',
        updatedAt: publishedAt,
        publishedState: payloadState,
      };
    }

    return {
      ok: false,
      mode: 'local',
      updatedAt: publishedAt,
      publishedState: payloadState,
      error: lastError || 'Unable to publish to live database endpoint.',
    };
  };

  const nextTask = syncWriteChain.then(runWrite, runWrite);
  syncWriteChain = nextTask.catch(() => undefined);
  return nextTask;
}

export const publishToCloud = syncAdminChangesToPublic;

export async function submitPublicItemToCloud(
  kind: 'print-jobs' | 'lost-found' | 'tickets',
  item: PrintRequestJob | LostFoundItem | GrievanceTicket,
  updatedLocalState: PortalState,
  syncApiUrl?: string
): Promise<{
  synced: boolean;
  mode: SyncConnectionMode;
  mergedState?: PortalState;
  error?: string;
}> {
  const targetUrl = normalizeCloudSyncUrl(
    syncApiUrl ?? updatedLocalState.syncUrl ?? loadSyncConfig().syncApiUrl
  );

  let baseState = updatedLocalState;
  try {
    const remoteRes = await fetch(
      `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}t=${Date.now()}`,
      { method: 'GET', cache: 'no-store' }
    );
    if (remoteRes.ok) {
      const raw = (await remoteRes.json()) as unknown;
      const unwrapped = unwrapCloudPayload(raw);
      if (unwrapped.state) {
        const remote = normalizePortalState({ ...unwrapped.state, syncUrl: targetUrl });
        if (kind === 'print-jobs') {
          const printItem = item as PrintRequestJob;
          baseState = {
            ...remote,
            printJobs: remote.printJobs.some((j) => j.id === printItem.id)
              ? remote.printJobs
              : [printItem, ...remote.printJobs],
          };
        } else if (kind === 'lost-found') {
          const lfItem = item as LostFoundItem;
          baseState = {
            ...remote,
            lostFound: remote.lostFound.some((i) => i.id === lfItem.id)
              ? remote.lostFound
              : [lfItem, ...remote.lostFound],
          };
        } else {
          const ticketItem = item as GrievanceTicket;
          baseState = {
            ...remote,
            tickets: remote.tickets.some((t) => t.id === ticketItem.id)
              ? remote.tickets
              : [ticketItem, ...remote.tickets],
          };
        }
      }
    }
  } catch {
    // Fallback to updatedLocalState when offline
  }

  const compressedState = withArrayMetadata({
    ...(await compressPortalImages(baseState)),
    syncUrl: targetUrl,
    lastPublishedAt: new Date().toISOString(),
  });
  savePortalState(compressedState);

  let synced = false;
  let mode: SyncConnectionMode = 'local';
  let error: string | undefined;

  try {
    const reqInit = buildCloudWriteRequest(targetUrl, compressedState);
    const res = await fetch(targetUrl, {
      method: reqInit.method,
      headers: reqInit.headers,
      body: reqInit.body,
    });
    if (res.ok) {
      synced = true;
      mode = 'cloud';
    } else {
      error = `Cloud Sync HTTP ${res.status}`;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unable to reach Live Cloud URL.';
  }

  try {
    const res = await fetch(buildApiUrl(`/api/portal/${kind}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    });
    if (res.ok && !synced) {
      synced = true;
      mode = 'server';
    }
  } catch {
    // ignore if static host
  }

  return { synced, mode, mergedState: compressedState, error };
}

export function exportPortalSnapshotJson(state: PortalState): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      portal: 'NNCHS SSLG Shared Portal Snapshot',
      state,
    },
    null,
    2
  );
}

export function parsePortalSnapshotJson(rawJson: string): PortalState {
  const parsed = JSON.parse(rawJson) as unknown;
  const unwrapped = unwrapCloudPayload(parsed);
  if (!unwrapped.state) {
    throw new Error('Invalid NNCHS SSLG snapshot JSON file.');
  }
  return normalizePortalState(unwrapped.state);
}

export function generatePrintJobCode(existing: PrintRequestJob[]): string {
  const num = Math.floor(100 + Math.random() * 900);
  const candidate = `PRT-2026-${num}`;
  if (existing.some((j) => j.jobCode === candidate)) {
    return `PRT-2026-${num + 1}`;
  }
  return candidate;
}

export function generateTicketCode(existing: GrievanceTicket[]): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const candidate = `NNCHS-SSLG-2026-${num}`;
  if (existing.some((t) => t.ticketCode === candidate)) {
    return `NNCHS-SSLG-2026-${num + 1}`;
  }
  return candidate;
}

export function getActiveSyncEndpointInfo(): {
  endpoint: string;
  isExternalCloud: boolean;
} {
  return {
    endpoint: loadSyncConfig().syncApiUrl,
    isExternalCloud: true,
  };
}

export async function pingCloudEndpoint(): Promise<{
  ok: boolean;
  endpoint: string;
  latencyMs: number;
  mode: SyncConnectionMode;
  statusCode?: number;
  error?: string;
}> {
  const { endpoint } = getActiveSyncEndpointInfo();
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const targetPingUrl = `${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${Date.now()}`;

  try {
    const res = await fetch(targetPingUrl, { method: 'GET', cache: 'no-store' });
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latencyMs = Math.max(1, Math.round(endedAt - startedAt));
    if (res.ok) {
      return {
        ok: true,
        endpoint,
        latencyMs,
        mode: 'cloud',
        statusCode: res.status,
      };
    }
    return {
      ok: false,
      endpoint,
      latencyMs,
      mode: 'local',
      statusCode: res.status,
      error: `Endpoint returned HTTP ${res.status}`,
    };
  } catch (err) {
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      ok: false,
      endpoint,
      latencyMs: Math.max(1, Math.round(endedAt - startedAt)),
      mode: 'local',
      error: err instanceof Error ? err.message : 'Unable to reach sync endpoint.',
    };
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}
