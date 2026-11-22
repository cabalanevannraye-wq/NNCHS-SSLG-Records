export const SSLG_ADMIN_SMS_NUMBER = '09163866252';
export const PORTAL_STORAGE_KEY = 'nnchs_sslg_portal_v1';
export const SMS_LOGS_STORAGE_KEY = 'nnchs_sslg_sms_logs';
export const THEME_STORAGE_KEY = 'nnchs_sslg_theme';

export type PortalSectionId =
  | 'home'
  | 'directories'
  | 'services'
  | 'news'
  | 'reporting'
  | 'calendar'
  | 'transparency';

export interface PublicOfficer {
  id: string;
  digitalId: string;
  fullName: string;
  position: string;
  committee: string;
  gradeLevel: string;
  section: string;
  status: 'Active' | 'On Leave' | 'Verified';
  term: string;
  bio: string;
  officeHours: string;
  email: string;
}

export interface PublicClub {
  id: string;
  name: string;
  acronym: string;
  category:
    | 'Campus Press'
    | 'STEM & Research'
    | 'Arts & Culture'
    | 'Sports & Athletics'
    | 'Civic & Environmental'
    | 'Religious & Values'
    | 'Academic & Debate';
  status: 'Accredited' | 'Probationary';
  presidentName: string;
  adviserName: string;
  memberCount: number;
  schedule: string;
  room: string;
  mandate: string;
  flagshipProjects: string[];
}

export interface HomeroomRep {
  id: string;
  gradeLevel: 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10' | 'Grade 11' | 'Grade 12';
  section: string;
  presidentName: string;
  cluster: string;
  adviser: string;
}

export interface PortalProgram {
  id: string;
  title: string;
  committee: string;
  status: 'Ongoing' | 'Open for Registration' | 'Upcoming' | 'Completed';
  targetDate: string;
  venue: string;
  summary: string;
  coreValue: 'Maka-Diyos' | 'Maka-Tao' | 'Maka-Kalikasan' | 'Makabansa';
  beneficiaries: string;
}

export type PrintJobStatus =
  | 'Pending SMS Review'
  | 'Printing in Progress'
  | 'Ready for Claim'
  | 'Claimed';

export interface PrintRequestJob {
  id: string;
  jobCode: string;
  studentName: string;
  gradeSection: string;
  contactNumber: string;
  purpose: 'Academic / Assignment' | 'Club / Org Paper' | 'Research Paper' | 'Reviewer';
  documentTitle: string;
  attachmentReference: string;
  pageCount: number;
  printMode: 'Black & White (Single-Sided)' | 'Black & White (Back-to-Back)';
  claimSlot: 'Morning Recess (9:30–10:00 AM)' | 'Lunch Break (12:00–1:00 PM)' | 'Dismissal (4:00–4:45 PM)';
  status: PrintJobStatus;
  submittedAt: string;
  adminNotes: string;
  smsDispatched: boolean;
}

export interface SmsDispatchLog {
  id: string;
  recipient: string;
  jobCode: string;
  studentName: string;
  messageBody: string;
  dispatchedAt: string;
  deliveryStatus: 'Queued / Dispatched' | 'Resent by Admin';
}

export interface LostFoundItem {
  id: string;
  itemCode: string;
  type: 'Found Item' | 'Lost Report';
  itemName: string;
  location: string;
  dateReported: string;
  description: string;
  reporterOrCustodian: string;
  status: 'In SSLG Custody' | 'Looking for Owner' | 'Claimed';
}

export interface DownloadableResource {
  id: string;
  title: string;
  category: 'Governance' | 'Student Services' | 'Clubs & Orgs' | 'Finance';
  code: string;
  updatedAt: string;
  summary: string;
  filename: string;
  fullText: string;
}

export type TicketStatus = 'Submitted' | 'Under Review' | 'Referred to Office' | 'Resolved';

export interface GrievanceTicket {
  id: string;
  ticketCode: string;
  isAnonymous: boolean;
  studentName: string;
  gradeSection: string;
  category:
    | 'Academic Concern'
    | 'Campus Facilities & Safety'
    | 'Student Welfare & Anti-Bullying'
    | 'Club / Org Matter'
    | 'Policy Suggestion';
  subject: string;
  details: string;
  status: TicketStatus;
  submittedAt: string;
  updatedAt: string;
  publicRemarks: string;
}

export interface CampusNewsItem {
  id: string;
  title: string;
  category: 'Advisory' | 'Event Recap' | 'Memorandum' | 'Student Welfare';
  publishedAt: string;
  author: string;
  summary: string;
  fullBody: string;
  featured?: boolean;
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
  organizer: string;
  description: string;
}

export interface LegislativeRecord {
  id: string;
  numberCode: string;
  docKind: 'Resolution' | 'Executive Order' | 'Memorandum';
  title: string;
  datePassed: string;
  sponsor: string;
  status: 'Enacted' | 'In Effect' | 'Archived';
  summary: string;
  fullText: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  voucherNo: string;
  committee: string;
  particulars: string;
  entryType: 'Allocation / Income' | 'Disbursement / Expense';
  amount: number;
  liquidationStatus: 'Liquidated' | 'For Liquidation' | 'Approved Budget';
}

export interface PortalState {
  schoolYear: string;
  tickerMessages: string[];
  impactCounters: {
    freePagesPrinted: number;
    accreditedClubs: number;
    resolutionsPassed: number;
    projectsImplemented: number;
    concernsResolved: number;
  };
  officers: PublicOfficer[];
  clubs: PublicClub[];
  homeroomReps: HomeroomRep[];
  programs: PortalProgram[];
  printJobs: PrintRequestJob[];
  lostFound: LostFoundItem[];
  downloadables: DownloadableResource[];
  tickets: GrievanceTicket[];
  news: CampusNewsItem[];
  calendarEvents: CalendarEventItem[];
  legislation: LegislativeRecord[];
  ledger: LedgerEntry[];
}

export const DEFAULT_PORTAL_STATE: PortalState = {
  schoolYear: '2026–2027',
  tickerMessages: [
    'FREE PRINTING DESK: 15 B&W pages daily per NNCHS student via SSLG Office (Room 104) · Instant SMS alert to Admin (09163866252)',
    'SY 2026–2027 CLUB ACCREDITATION: 8+ recognized NNCHS student organizations active under DepEd Order No. 18, s. 2023',
    'LEGISLATIVE UPDATE: SSLG Resolution No. 2026-04 establishing the Free Academic Printing Support Desk is now in full effect',
    'STUDENT WELFARE DESK: Confidential & anonymous campus concern reporting open 24/7 with live ticket tracking',
  ],
  impactCounters: {
    freePagesPrinted: 4860,
    accreditedClubs: 9,
    resolutionsPassed: 14,
    projectsImplemented: 22,
    concernsResolved: 47,
  },
  officers: [
    {
      id: 'off-1',
      digitalId: 'NNCHS-SSLG-001',
      fullName: 'Evann Raye Cabalan',
      position: 'SSLG President',
      committee: 'Executive Committee & External Affairs',
      gradeLevel: 'Grade 12',
      section: 'STEM A - Rizal',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Chief student executive presiding over the NNCHS SSLG Council, legislative coordination, and division youth representation.',
      officeHours: 'Mon–Fri · 12:00 PM–1:00 PM & 4:00 PM–5:00 PM',
      email: 'sslg.president@nnchs.edu.ph',
    },
    {
      id: 'off-2',
      digitalId: 'NNCHS-SSLG-002',
      fullName: 'Clarisse Anne Mendoza',
      position: 'SSLG Vice President',
      committee: 'Internal Governance & Club Accreditation',
      gradeLevel: 'Grade 12',
      section: 'HUMSS B - Mabini',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Presides over the Student Legislative Council and supervises recognized campus clubs and homeroom presidents.',
      officeHours: 'Mon/Wed/Fri · 9:30 AM–10:00 AM & 12:00 PM–1:00 PM',
      email: 'sslg.vp@nnchs.edu.ph',
    },
    {
      id: 'off-3',
      digitalId: 'NNCHS-SSLG-003',
      fullName: 'Jethro Paul Alcaraz',
      position: 'SSLG Secretary',
      committee: 'Secretariat, Records & Transmittal',
      gradeLevel: 'Grade 11',
      section: 'STEM B - Bonifacio',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Custodian of official minutes, resolutions, control registers, and the Free Academic Printing queue.',
      officeHours: 'Daily · 12:00 PM–1:00 PM & Dismissal',
      email: 'sslg.secretary@nnchs.edu.ph',
    },
    {
      id: 'off-4',
      digitalId: 'NNCHS-SSLG-004',
      fullName: 'Hannah Grace Dela Cruz',
      position: 'SSLG Treasurer',
      committee: 'Finance, Budget & Transparency',
      gradeLevel: 'Grade 11',
      section: 'ABM A - Silang',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Manages SSLG disbursements, printing ink & bond paper supply allocation, and monthly liquidation ledgers.',
      officeHours: 'Tue/Thu · 12:00 PM–1:00 PM',
      email: 'sslg.treasurer@nnchs.edu.ph',
    },
    {
      id: 'off-5',
      digitalId: 'NNCHS-SSLG-005',
      fullName: 'Mark Anthony Quimpo',
      position: 'SSLG Auditor',
      committee: 'Audit & Property Inventory',
      gradeLevel: 'Grade 12',
      section: 'ABM B - Del Pilar',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Conducts quarterly audits of SSLG vouchers, club event financial reports, and Lost & Found inventory.',
      officeHours: 'Wed/Fri · 12:00 PM–1:00 PM',
      email: 'sslg.auditor@nnchs.edu.ph',
    },
    {
      id: 'off-6',
      digitalId: 'NNCHS-SSLG-006',
      fullName: 'Bea Katrina Villalobos',
      position: 'Public Information Officer',
      committee: 'Communications & Campus Media',
      gradeLevel: 'Grade 11',
      section: 'HUMSS A - Jacinto',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Leads official advisories, bulletin publications, and coordination with Ang Lambak campus press.',
      officeHours: 'Mon–Fri · Recess & Lunch Break',
      email: 'sslg.pio@nnchs.edu.ph',
    },
    {
      id: 'off-7',
      digitalId: 'NNCHS-SSLG-007',
      fullName: 'Lorenzo Miguel Bautista',
      position: 'Protocol Officer',
      committee: 'Campus Safety, Peace & Welfare',
      gradeLevel: 'Grade 10',
      section: 'STE - Newton',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Coordinates campus assembly orderliness, emergency drills, and Lost & Found safe custody.',
      officeHours: 'Daily · Morning Recess & Lunch',
      email: 'sslg.protocol@nnchs.edu.ph',
    },
    {
      id: 'off-8',
      digitalId: 'NNCHS-SSLG-008',
      fullName: 'Sofia Nicole Pangilinan',
      position: 'Grade 12 Representative',
      committee: 'Senior High Academic Welfare',
      gradeLevel: 'Grade 12',
      section: 'TVL-ICT A',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Represents Grade 12 tracks on immersion readiness, research printing quota, and graduation matters.',
      officeHours: 'Tue/Thu · 4:00 PM–4:45 PM',
      email: 'g12.rep@nnchs.edu.ph',
    },
    {
      id: 'off-9',
      digitalId: 'NNCHS-SSLG-009',
      fullName: 'Rafael Andres Tan',
      position: 'Grade 11 Representative',
      committee: 'Sports & Youth Culture',
      gradeLevel: 'Grade 11',
      section: 'GAS A - Luna',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Coordinates intramurals, inter-strand tournaments, and Grade 11 peer orientation programs.',
      officeHours: 'Mon/Wed · 4:00 PM–4:45 PM',
      email: 'g11.rep@nnchs.edu.ph',
    },
    {
      id: 'off-10',
      digitalId: 'NNCHS-SSLG-010',
      fullName: 'Arianne Joy Macapagal',
      position: 'Grade 10 Representative',
      committee: 'Junior High Academic Support',
      gradeLevel: 'Grade 10',
      section: '10 - Gold',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Advocates for JHS completer concerns, classroom ventilation, and library access.',
      officeHours: 'Mon/Fri · 12:15 PM–1:00 PM',
      email: 'g10.rep@nnchs.edu.ph',
    },
    {
      id: 'off-11',
      digitalId: 'NNCHS-SSLG-011',
      fullName: 'Christian Jay Navarro',
      position: 'Grade 9 Representative',
      committee: 'Environment & Green Campus (YES-O Liaison)',
      gradeLevel: 'Grade 9',
      section: '9 - Narra',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Leads weekly campus clean-up drives, MRF segregation audits, and Nabunturan tree-growing initiatives.',
      officeHours: 'Tue/Thu · 12:15 PM–1:00 PM',
      email: 'g9.rep@nnchs.edu.ph',
    },
    {
      id: 'off-12',
      digitalId: 'NNCHS-SSLG-012',
      fullName: 'Princess Aliyah Soriano',
      position: 'Grade 8 Representative',
      committee: 'Student Rights & Anti-Bullying',
      gradeLevel: 'Grade 8',
      section: '8 - Sampaguita',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Conducts classroom orientations on Child Protection Policy and safe reporting pathways.',
      officeHours: 'Wed/Fri · 9:30 AM–10:00 AM',
      email: 'g8.rep@nnchs.edu.ph',
    },
    {
      id: 'off-13',
      digitalId: 'NNCHS-SSLG-013',
      fullName: 'Gabriel Isaiah Ramos',
      position: 'Grade 7 Representative',
      committee: 'Freshman Integration & Campus Tour',
      gradeLevel: 'Grade 7',
      section: '7 - Mahogany',
      status: 'Active',
      term: 'SY 2026–2027',
      bio: 'Assists incoming Grade 7 learners with campus navigation, club sign-ups, and study circles.',
      officeHours: 'Tue/Fri · 12:00 PM–12:45 PM',
      email: 'g7.rep@nnchs.edu.ph',
    },
  ],
  clubs: [
    {
      id: 'club-1',
      name: 'Ang Lambak Campus Press',
      acronym: 'ANG LAMBAK',
      category: 'Campus Press',
      status: 'Accredited',
      presidentName: 'Kyla Marie Enriquez',
      adviserName: 'Mr. Danilo R. Fernandez',
      memberCount: 48,
      schedule: 'Wednesdays · 4:00 PM–5:15 PM',
      room: 'Media & Journalism Room (Bldg. B)',
      mandate: 'Official student publication of NNCHS covering campus governance, division press conferences, and investigative features.',
      flagshipProjects: ['Quarterly Broadsheet Issue', 'DSPC/RSPC Training Clinic', 'SSLG Transparency Coverage'],
    },
    {
      id: 'club-2',
      name: 'NNCHS Young Scientists & STEM Guild',
      acronym: 'YSSG-STEM',
      category: 'STEM & Research',
      status: 'Accredited',
      presidentName: 'Nathaniel Cruz',
      adviserName: 'Mrs. Marites L. Bacalso',
      memberCount: 74,
      schedule: 'Thursdays · 4:00 PM–5:00 PM',
      room: 'Science Innovation Lab',
      mandate: 'Advances learner-led investigatory projects, robotics prototyping, and Davao de Oro Division Science Fair readiness.',
      flagshipProjects: ['Annual Research Colloquium', 'Solar Lamp Workshop', 'Math & Science Quiz Bowl'],
    },
    {
      id: 'club-3',
      name: 'Youth for Environment in Schools Organization',
      acronym: 'YES-O NNCHS',
      category: 'Civic & Environmental',
      status: 'Accredited',
      presidentName: 'Jomar V. Tagupa',
      adviserName: 'Ms. Jocelyn D. Magno',
      memberCount: 112,
      schedule: 'Fridays · 3:45 PM–5:00 PM',
      room: 'Eco-Garden Pavilion',
      mandate: 'Implements DepEd solid waste segregation, gulayan sa paaralan, and climate resilience drives in Nabunturan.',
      flagshipProjects: ['Zero-Single-Use-Plastic Fridays', 'Davao de Oro Watershed Planting', 'Eco-Brick Building Drive'],
    },
    {
      id: 'club-4',
      name: 'NNCHS Red Cross Youth Council',
      acronym: 'RCY-NNCHS',
      category: 'Civic & Environmental',
      status: 'Accredited',
      presidentName: 'Shaira Mae Lomibao',
      adviserName: 'Nurse Kevin P. Bautista',
      memberCount: 65,
      schedule: 'Tuesdays · 4:00 PM–5:15 PM',
      room: 'School Clinic Annex',
      mandate: 'Trains learner first-aiders, coordinates quarterly blood/health campaigns, and staffs campus medical stations.',
      flagshipProjects: ['Basic Life Support Bootcamp', 'Campus First-Aid Patrols', 'Dengue Prevention Drive'],
    },
    {
      id: 'club-5',
      name: 'Kalinaw Cultural & Performing Arts Ensemble',
      acronym: 'KALINAW ARTS',
      category: 'Arts & Culture',
      status: 'Accredited',
      presidentName: 'Renz Carlo Dizon',
      adviserName: 'Mrs. Corazon S. Rivera',
      memberCount: 54,
      schedule: 'Tue & Thu · 4:15 PM–5:30 PM',
      room: 'MAPEH Cultural Hall',
      mandate: 'Preserves Davao de Oro cultural heritage through folk dance, rondalla, choral music, and campus stage productions.',
      flagshipProjects: ['Buwan ng Wika Showcase', 'Bulawanon Heritage Night', 'Foundation Day Production'],
    },
    {
      id: 'club-6',
      name: 'NNCHS Varsity & Athletics Association',
      acronym: 'NVAA',
      category: 'Sports & Athletics',
      status: 'Accredited',
      presidentName: 'Jericho B. Villanueva',
      adviserName: 'Coach Marlon T. Ocampo',
      memberCount: 89,
      schedule: 'Mon–Thu · 4:15 PM–5:45 PM',
      room: 'NNCHS Covered Court & Oval',
      mandate: 'Supports student-athletes across basketball, volleyball, arnis, badminton, and track & field competitions.',
      flagshipProjects: ['Inter-Strand Intramurals', 'DAVRAA Conditioning Camp', 'Sportsmanship Clinic'],
    },
    {
      id: 'club-7',
      name: 'NNCHS Debate & Academic Honor Society',
      acronym: 'NDAHS',
      category: 'Academic & Debate',
      status: 'Accredited',
      presidentName: 'Patricia Mae Villanueva',
      adviserName: 'Mr. Wilfredo A. Castro',
      memberCount: 41,
      schedule: 'Wednesdays · 4:00 PM–5:15 PM',
      room: 'Senior High Library Mezzanine',
      mandate: 'Cultivates parliamentary debate, public speaking, and civic policy literacy among junior and senior high learners.',
      flagshipProjects: ['Nabunturan Inter-School Cup', 'Mock Legislative Session', 'Civic Literacy Seminars'],
    },
    {
      id: 'club-8',
      name: 'NNCHS Barkada Kontra Droga & Values Guild',
      acronym: 'BKD-VALUES',
      category: 'Religious & Values',
      status: 'Accredited',
      presidentName: 'Emmanuel J. Aquino',
      adviserName: 'Mrs. Teresita G. Lim',
      memberCount: 60,
      schedule: 'Fridays · 4:00 PM–5:00 PM',
      room: 'Values Education Center',
      mandate: 'Promotes Maka-Diyos character formation, mental wellness circles, and drug-free youth advocacy.',
      flagshipProjects: ['Mental Wellness Week', 'Inter-Faith Morning Reflection', 'Peer Support Booths'],
    },
    {
      id: 'club-9',
      name: 'NNCHS Digital Makers & Robotics Circle',
      acronym: 'DMRC',
      category: 'STEM & Research',
      status: 'Probationary',
      presidentName: 'Kyle Vincent Morales',
      adviserName: 'Mr. Arvin C. Salonga',
      memberCount: 28,
      schedule: 'Thursdays · 4:15 PM–5:30 PM',
      room: 'ICT Computer Lab 2',
      mandate: 'Empowers learners in Arduino automation, civic web development, and digital productivity.',
      flagshipProjects: ['Arduino Campus Sensor Demo', 'Basic Web Literacy Bootcamp'],
    },
  ],
  homeroomReps: [
    { id: 'hr-7a', gradeLevel: 'Grade 7', section: '7 - Mahogany', presidentName: 'Liam Gabriel Flores', cluster: 'JHS Lower Cluster A', adviser: 'Ms. Liza M. Torres' },
    { id: 'hr-7b', gradeLevel: 'Grade 7', section: '7 - Molave', presidentName: 'Chloe Anne Magbanua', cluster: 'JHS Lower Cluster A', adviser: 'Mr. Junrey P. Uy' },
    { id: 'hr-8a', gradeLevel: 'Grade 8', section: '8 - Sampaguita', presidentName: 'Daniel James Soriano', cluster: 'JHS Lower Cluster B', adviser: 'Mrs. Norma V. Perez' },
    { id: 'hr-8b', gradeLevel: 'Grade 8', section: '8 - Rosal', presidentName: 'Micahella Joyce Dy', cluster: 'JHS Lower Cluster B', adviser: 'Ms. Carla R. Gomez' },
    { id: 'hr-9a', gradeLevel: 'Grade 9', section: '9 - Narra', presidentName: 'Adrian Kurt Bautista', cluster: 'JHS Upper Cluster A', adviser: 'Mr. Noel G. Navarro' },
    { id: 'hr-9b', gradeLevel: 'Grade 9', section: '9 - Yakal', presidentName: 'Trixie Mae Cordero', cluster: 'JHS Upper Cluster A', adviser: 'Mrs. Alma S. Yu' },
    { id: 'hr-10a', gradeLevel: 'Grade 10', section: '10 - STE Newton', presidentName: 'Zoren Patrick Ilagan', cluster: 'JHS Upper Cluster B', adviser: 'Mrs. Elena C. Domingo' },
    { id: 'hr-10b', gradeLevel: 'Grade 10', section: '10 - Gold', presidentName: 'Francheska Nicole Lim', cluster: 'JHS Upper Cluster B', adviser: 'Mr. Ricky B. Santos' },
    { id: 'hr-11a', gradeLevel: 'Grade 11', section: '11 - STEM B Bonifacio', presidentName: 'Janelle Mae Padillo', cluster: 'SHS Academic Track', adviser: 'Ms. Rhea T. Morales' },
    { id: 'hr-11b', gradeLevel: 'Grade 11', section: '11 - ABM A Silang', presidentName: 'Caleb Josh Evangelista', cluster: 'SHS Academic Track', adviser: 'Mr. Dennis K. Yap' },
    { id: 'hr-12a', gradeLevel: 'Grade 12', section: '12 - STEM A Rizal', presidentName: 'Samantha Claire Obrero', cluster: 'SHS Graduating Council', adviser: 'Dr. Rowena H. Abad' },
    { id: 'hr-12b', gradeLevel: 'Grade 12', section: '12 - TVL-ICT A', presidentName: 'Kenji Paolo Marquez', cluster: 'SHS TVL Track', adviser: 'Mr. Paolo M. Tan' },
  ],
  programs: [
    {
      id: 'prog-1',
      title: 'Project LIBRE-PRINT: Free Academic Printing Support Desk',
      committee: 'Secretariat & Academic Welfare',
      status: 'Ongoing',
      targetDate: '2026-12-18',
      venue: 'SSLG Office · Room 104',
      summary: 'Provides up to 15 free Black & White pages per day for NNCHS students’ research papers, reviewers, and club documents with live SMS dispatch to SSLG Admin.',
      coreValue: 'Maka-Tao',
      beneficiaries: 'All Enrolled JHS & SHS Learners',
    },
    {
      id: 'prog-2',
      title: 'Nabunturan Youth Leadership & Parliamentary Summit 2026',
      committee: 'Internal Governance & Training',
      status: 'Open for Registration',
      targetDate: '2026-12-12',
      venue: 'NNCHS Gymnasium',
      summary: 'Full-day legislative simulation, resolution drafting workshop, and club officer leadership summit with guest speakers from Nabunturan West District.',
      coreValue: 'Makabansa',
      beneficiaries: 'Homeroom Presidents & Club Executive Boards',
    },
    {
      id: 'prog-3',
      title: 'Berde Campus: Zero-Plastic Friday & Eco-Brick Drive',
      committee: 'Environment & Green Campus',
      status: 'Ongoing',
      targetDate: '2027-02-20',
      venue: 'All Grade Level Quadrangles',
      summary: 'Weekly eco-waste audit and plastic-to-ecobrick collection led by SSLG Grade Reps and YES-O NNCHS for campus garden benches.',
      coreValue: 'Maka-Kalikasan',
      beneficiaries: 'Grades 7–12 Sections',
    },
    {
      id: 'prog-4',
      title: 'Oplan Balik-Kalinaw: Mental Health & Values Awareness Week',
      committee: 'Student Welfare & Values Guild',
      status: 'Upcoming',
      targetDate: '2027-01-15',
      venue: 'NNCHS Covered Court & Guidance Lawn',
      summary: 'Inter-faith reflection mornings, peer-listening booths, and stress-management workshops ahead of 3rd Quarter Examinations.',
      coreValue: 'Maka-Diyos',
      beneficiaries: 'Entire NNCHS Student Body',
    },
    {
      id: 'prog-5',
      title: 'SSLG School-Wide Brigada Eskwela Student Kickoff',
      committee: 'Campus Safety & Facilities',
      status: 'Completed',
      targetDate: '2026-07-24',
      venue: 'NNCHS Main Campus',
      summary: 'Mobilized 340+ student officers and club volunteers to repaint hallway signages, repair classroom desks, and prepare SSLG Room 104.',
      coreValue: 'Maka-Tao',
      beneficiaries: '48 JHS & SHS Classrooms',
    },
  ],
  printJobs: [
    {
      id: 'prt-1',
      jobCode: 'PRT-2026-1041',
      studentName: 'Althea Marie Villanueva',
      gradeSection: '12 - STEM A Rizal',
      contactNumber: '09174561120',
      purpose: 'Research Paper',
      documentTitle: 'Chapter 1-3 Draft: Solar Water Filtration Study',
      attachmentReference: 'Research_Ch1-3_Villanueva.pdf (USB/Drive)',
      pageCount: 14,
      printMode: 'Black & White (Back-to-Back)',
      claimSlot: 'Lunch Break (12:00–1:00 PM)',
      status: 'Ready for Claim',
      submittedAt: '2026-11-21T08:15:00+08:00',
      adminNotes: 'Printed crisp on 70gsm bond paper. Ready at Room 104 front tray.',
      smsDispatched: true,
    },
    {
      id: 'prt-2',
      jobCode: 'PRT-2026-1042',
      studentName: 'Carl Angelo Dalisay',
      gradeSection: '10 - STE Newton',
      contactNumber: '09283349981',
      purpose: 'Reviewer',
      documentTitle: 'Second Quarter Science & Trigonometry Reviewer',
      attachmentReference: 'Q2_Reviewer_Dalisay.pdf',
      pageCount: 8,
      printMode: 'Black & White (Single-Sided)',
      claimSlot: 'Dismissal (4:00–4:45 PM)',
      status: 'Printing in Progress',
      submittedAt: '2026-11-21T09:40:00+08:00',
      adminNotes: 'Queued on Printer 2. Admin alerted via SMS.',
      smsDispatched: true,
    },
    {
      id: 'prt-3',
      jobCode: 'PRT-2026-1043',
      studentName: 'Jessa Mae Baguio',
      gradeSection: '8 - Sampaguita',
      contactNumber: '',
      purpose: 'Academic / Assignment',
      documentTitle: 'Araling Panlipunan Reflection & Map Worksheet',
      attachmentReference: 'AP_Worksheet_G8.docx',
      pageCount: 4,
      printMode: 'Black & White (Single-Sided)',
      claimSlot: 'Morning Recess (9:30–10:00 AM)',
      status: 'Claimed',
      submittedAt: '2026-11-20T13:10:00+08:00',
      adminNotes: 'Claimed by student at 9:42 AM.',
      smsDispatched: true,
    },
  ],
  lostFound: [
    {
      id: 'lf-1',
      itemCode: 'LF-2026-081',
      type: 'Found Item',
      itemName: 'Casio fx-991ES Plus Scientific Calculator',
      location: 'SHS Building 2nd Floor Corridor (near Lab 1)',
      dateReported: '2026-11-20',
      description: 'Silver-black casing with small blue name sticker faded on back cover.',
      reporterOrCustodian: 'SSLG Custody (Protocol Officer)',
      status: 'In SSLG Custody',
    },
    {
      id: 'lf-2',
      itemCode: 'LF-2026-082',
      type: 'Found Item',
      itemName: 'Black Insulated Tumbler (Aquaflask 22oz)',
      location: 'NNCHS Covered Court Bleachers',
      dateReported: '2026-11-21',
      description: 'Matte black bottle with Davao de Oro Youth sticker.',
      reporterOrCustodian: 'SSLG Custody (Room 104)',
      status: 'In SSLG Custody',
    },
    {
      id: 'lf-3',
      itemCode: 'LF-2026-083',
      type: 'Lost Report',
      itemName: 'Grade 11 Student ID Lace & Clear Card Holder',
      location: 'Canteen Area / Gate 2 Pathway',
      dateReported: '2026-11-21',
      description: 'Navy NNCHS lanyard belonging to Grade 11 ABM learner.',
      reporterOrCustodian: 'Reported via Public Portal',
      status: 'Looking for Owner',
    },
  ],
  downloadables: [
    {
      id: 'dl-1',
      title: 'NNCHS SSLG Constitution & By-Laws (2026 Revised)',
      category: 'Governance',
      code: 'DOC-CONST-2026',
      updatedAt: '2026-08-15',
      summary: 'Complete governing charter of the NNCHS Supreme Secondary Learner Government aligned with DepEd Order No. 18, s. 2023.',
      filename: 'NNCHS_SSLG_Constitution_ByLaws_2026.txt',
      fullText: `REPUBLIC OF THE PHILIPPINES
DEPARTMENT OF EDUCATION · REGION XI
SCHOOLS DIVISION OF DAVAO DE ORO
NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)

OFFICIAL CONSTITUTION AND BY-LAWS (SY 2026–2027 REVISION)

PREAMBLE
We, the bonafide learners of Nabunturan National Comprehensive High School, Nabunturan, Davao de Oro, imploring the aid of Almighty God, in order to establish a representative, transparent, service-driven learner government that upholds Maka-Diyos, Maka-Tao, Maka-Kalikasan, and Makabansa core values, do ordain and promulgate this Constitution.

ARTICLE I – NAME AND DOMICILE
Section 1. This organization shall be known as the Supreme Secondary Learner Government of Nabunturan National Comprehensive High School (NNCHS SSLG).
Section 2. Official headquarters: Room 104, SSLG Operations & Student Services Office, Nabunturan, Davao de Oro.

ARTICLE II – MANDATE & OBJECTIVES
1. Uphold learner rights, academic support services, and safe campus participation.
2. Operate transparent digital governance, legislative archives, and zero-login student welfare mechanisms.
3. Coordinate all accredited student clubs and homeroom legislative councils.

ARTICLE III – TRANSPARENCY & ACCOUNTABILITY
All resolutions, financial disbursements, liquidation reports, and printing logs shall be open for public learner inspection via the NNCHS SSLG Transparency Seal.`,
    },
    {
      id: 'dl-2',
      title: 'SSLG Activity & Project Proposal Format',
      category: 'Clubs & Orgs',
      code: 'FORM-PROP-2026',
      updatedAt: '2026-09-02',
      summary: 'Standard outline for clubs and homerooms preparing external activity proposals for routing and control numbering.',
      filename: 'NNCHS_SSLG_Project_Proposal_Format.txt',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)
FORM-PROP-2026 · PROJECT & ACTIVITY PROPOSAL OUTLINE

I. PROJECT TITLE: [Enter Official Activity Title]
II. PROPONENT ORGANIZATION / COMMITTEE: [Club Name / SSLG Committee]
III. DEPED CORE VALUE ALIGNMENT: [Maka-Diyos / Maka-Tao / Maka-Kalikasan / Makabansa]
IV. TARGET DATE, TIME & VENUE: [Date / Time / Campus Venue]
V. RATIONALE & OBJECTIVES:
   - State clear student benefits and measurable outcomes.
VI. LINE-ITEM BUDGETARY REQUIREMENTS:
   - Item | Quantity | Unit Cost | Total | Source of Fund
VII. SAFETY & LOGISTICS PLAN:
   - Supervision, medical standby (RCY), and clean-up assignment.
VIII. SIGNATORIES:
   Prepared by: Club / Committee Head
   Noted by: Club Adviser
   Endorsed by: SSLG Executive Committee (via 5-Stage Digital Routing)`,
    },
    {
      id: 'dl-3',
      title: 'Free Academic Printing Service Guidelines (Project LIBRE-PRINT)',
      category: 'Student Services',
      code: 'GUIDE-PRT-2026',
      updatedAt: '2026-10-05',
      summary: 'Eligibility rules, 15-page daily B&W academic quota, file formats, and claiming hours at Room 104.',
      filename: 'NNCHS_SSLG_Free_Printing_Guidelines.txt',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)
PROJECT LIBRE-PRINT · OFFICIAL FREE PRINTING GUIDELINES

1. ELIGIBILITY: All currently enrolled NNCHS Junior and Senior High School learners (Grades 7–12).
2. DAILY QUOTA: Maximum of 15 Black & White pages per learner per school day.
3. COVERED DOCUMENTS:
   - Academic Assignments, Worksheets & Performance Tasks
   - Capstone / Research Paper Drafts
   - Quarterly Examination Reviewers
   - Accredited Club & Homeroom Governance Papers
4. SMS NOTIFICATION WORKFLOW:
   Upon submitting a request via the Public Portal, an instant SMS summary is queued for the SSLG Admin Custodian (09163866252) with your Job Code (PRT-2026-XXXX).
5. CLAIMING SCHEDULE (SSLG Office · Room 104):
   - Morning Recess: 9:30 AM – 10:00 AM
   - Lunch Break: 12:00 PM – 1:00 PM
   - Dismissal: 4:00 PM – 4:45 PM
   Present your NNCHS School ID and PRT Job Code upon claiming.`,
    },
    {
      id: 'dl-4',
      title: 'Club & Committee Financial Liquidation Form',
      category: 'Finance',
      code: 'FORM-LIQ-2026',
      updatedAt: '2026-09-20',
      summary: 'Standard cash disbursement liquidation sheet required within 5 school days after any approved student activity.',
      filename: 'NNCHS_SSLG_Financial_Liquidation_Form.txt',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)
FORM-LIQ-2026 · ACTIVITY LIQUIDATION REPORT TEMPLATE

VOUCHER / CONTROL REF NO.: ______________________
ACTIVITY TITLE: _________________________________
COMMITTEE / CLUB: _______________________________
AMOUNT RELEASED (PHP): __________________________

ITEMIZED OFFICIAL RECEIPTS / EXPENSES:
Date | OR / Receipt No. | Supplier / Store | Particular | Amount (PHP)
-----------------------------------------------------------------------
[Attach scanned official receipts to external PDF before uploading]

TOTAL EXPENSES INCURRED (PHP): __________________
EXCESS RETURNED TO TREASURY (PHP): ______________

CERTIFIED CORRECT BY:
Treasurer / Proponent: ___________________________
Audited by (SSLG Auditor): _______________________
Posted to Public Transparency Ledger Date: _______`,
    },
  ],
  tickets: [
    {
      id: 'tkt-1',
      ticketCode: 'NNCHS-SSLG-2026-8412',
      isAnonymous: false,
      studentName: 'Paolo Miguel D.',
      gradeSection: '11 - STEM A',
      category: 'Campus Facilities & Safety',
      subject: 'Ceiling Fan & Outlet Repair Needed in Room 208',
      details: 'Two ceiling fans in Room 208 wobble loudly and one wall switch sparks lightly during afternoon classes.',
      status: 'Referred to Office',
      submittedAt: '2026-11-18T10:20:00+08:00',
      updatedAt: '2026-11-19T14:00:00+08:00',
      publicRemarks: 'Inspected by SSLG Facilities Desk and endorsed to NNCHS School Physical Facilities Coordinator for breaker and motor check.',
    },
    {
      id: 'tkt-2',
      ticketCode: 'NNCHS-SSLG-2026-8419',
      isAnonymous: true,
      studentName: 'Anonymous Student',
      gradeSection: 'Undisclosed',
      category: 'Student Welfare & Anti-Bullying',
      subject: 'Extended Canteen Water Dispenser Refill Request',
      details: 'Drinking water station near Grade 9 corridor runs out before 2:30 PM on hot days.',
      status: 'Resolved',
      submittedAt: '2026-11-16T15:05:00+08:00',
      updatedAt: '2026-11-18T11:30:00+08:00',
      publicRemarks: 'Coordinated with Canteen Concessionaire & Utility Staff. Afternoon refill schedule moved earlier to 1:30 PM daily.',
    },
    {
      id: 'tkt-3',
      ticketCode: 'NNCHS-SSLG-2026-8425',
      isAnonymous: false,
      studentName: 'Trisha Mae R.',
      gradeSection: '9 - Narra',
      category: 'Policy Suggestion',
      subject: 'Additional Study Tables at Covered Pavilion Before Quarter Exams',
      details: 'Requesting temporary foldable tables during lunch breaks one week prior to quarterly examinations.',
      status: 'Under Review',
      submittedAt: '2026-11-20T16:12:00+08:00',
      updatedAt: '2026-11-21T08:45:00+08:00',
      publicRemarks: 'Scheduled for deliberation in Friday Executive & Homeroom Council meeting.',
    },
  ],
  news: [
    {
      id: 'news-1',
      title: 'Project LIBRE-PRINT Expands Free Daily Academic Printing Quota to 15 Pages',
      category: 'Advisory',
      publishedAt: '2026-11-21',
      author: 'Office of the SSLG Secretary & PIO',
      summary: 'NNCHS learners may now submit zero-login print requests online with instant SMS queue alerts straight to SSLG Admin (09163866252).',
      featured: true,
      fullBody: `Pursuant to SSLG Resolution No. 2026-04, the Nabunturan National Comprehensive High School Supreme Secondary Learner Government has officially upgraded Project LIBRE-PRINT for SY 2026–2027.

All bonafide Junior and Senior High School learners are entitled to up to 15 Black & White pages per school day for research manuscripts, quarterly reviewers, assignments, and official club documentation.

How it works:
1. Open the Services & Free Printing section on this portal—no account sign-in required.
2. Fill in your Name, Grade & Section, document reference, page count (1–15), and preferred claim slot.
3. Submit to generate your tracking Job Code (PRT-2026-XXXX) and trigger an instant SMS dispatch notification to the SSLG Admin Custodian (09163866252).
4. Claim your printed pages at Room 104 during Morning Recess, Lunch Break, or Dismissal.`,
    },
    {
      id: 'news-2',
      title: 'Nine NNCHS Student Clubs Receive Official SY 2026–2027 Recognition',
      category: 'Memorandum',
      publishedAt: '2026-11-18',
      author: 'SSLG Internal Governance Committee',
      summary: 'Ang Lambak, YSSG-STEM, YES-O, Red Cross Youth, Kalinaw Arts, Varsity, Debate Society, and BKD lead this year’s accredited student directory.',
      fullBody: `Following completion of accreditation requirements and adviser endorsements, nine (9) student-led organizations at NNCHS are now listed in the Official Public Directory for SY 2026–2027.

Learners may inspect club meeting schedules, officers, rooms, and flagship projects directly under the Public Directories section. Probationary clubs such as the Digital Makers & Robotics Circle will undergo mid-year activity review in January 2027.`,
    },
    {
      id: 'news-3',
      title: 'First Semester Transparency Seal & Budget Utilization Published',
      category: 'Student Welfare',
      publishedAt: '2026-11-14',
      author: 'Office of the SSLG Treasurer & Auditor',
      summary: 'Complete committee allocations, printing supply expenditures, and liquidated activity vouchers are now accessible for public CSV export.',
      fullBody: `In compliance with full public disclosure principles, the Office of the SSLG Treasurer and Auditor have uploaded the complete First Semester Financial & Liquidation Ledger.

Key allocations prioritize Free Academic Printing ink and bond paper supplies, student welfare facilities, YES-O environmental drives, and leadership capacity building.`,
    },
    {
      id: 'news-4',
      title: '2nd Quarter Examination Study Zone & Quiet Hours Advisory',
      category: 'Event Recap',
      publishedAt: '2026-11-10',
      author: 'Academic Welfare Committee',
      summary: 'Senior High Library Mezzanine and Pavilion wings will observe silent study hours during lunch breaks ahead of quarterly exams.',
      fullBody: `To support learner preparation across Grades 7 to 12, SSLG Grade Level Representatives will coordinate quiet study areas during lunch periods (12:00 PM – 1:00 PM) throughout examination week. Free reviewer printing remains prioritized at Room 104.`,
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
      organizer: 'Office of the SSLG Vice President',
      description: 'Monthly legislative assembly reviewing pending student grievances and upcoming December campus events.',
    },
    {
      id: 'cal-2',
      title: '2nd Quarter Written & Performance Examinations (Day 1–2)',
      date: '2026-12-03',
      timeRange: '7:30 AM – 3:30 PM',
      category: 'Examinations',
      venue: 'All JHS & SHS Classrooms',
      organizer: 'NNCHS Academic Council',
      description: 'First two days of 2nd Quarter Examinations. Free reviewer printing cut-off at 4:45 PM the day before.',
    },
    {
      id: 'cal-3',
      title: 'YES-O & Ang Lambak Eco-Journalism Workshop',
      date: '2026-12-08',
      timeRange: '1:30 PM – 4:30 PM',
      category: 'Club Activities',
      venue: 'Media Room & Eco-Garden',
      organizer: 'YES-O NNCHS & Ang Lambak',
      description: 'Joint environmental documentation clinic and campus eco-brick audit.',
    },
    {
      id: 'cal-4',
      title: 'Nabunturan Youth Leadership & Parliamentary Summit',
      date: '2026-12-12',
      timeRange: '8:00 AM – 4:30 PM',
      category: 'Division/District Events',
      venue: 'NNCHS Gymnasium',
      organizer: 'NNCHS SSLG & Nabunturan West District',
      description: 'District-wide student council assembly, mock parliamentary session, and civic leadership awards.',
    },
    {
      id: 'cal-5',
      title: 'Pasko sa NNCHS: Campus Solidarity & Gift-Giving Drive',
      date: '2026-12-17',
      timeRange: '9:00 AM – 4:00 PM',
      category: 'School-Wide Events',
      venue: 'NNCHS Covered Court',
      organizer: 'NNCHS SSLG & Values Guild',
      description: 'Year-end learner solidarity program featuring Kalinaw Cultural Ensemble and outreach turnover.',
    },
  ],
  legislation: [
    {
      id: 'leg-1',
      numberCode: 'Resolution No. 2026-04',
      docKind: 'Resolution',
      title: 'Establishing Project LIBRE-PRINT: Free Daily Academic Printing & SMS Dispatch Desk',
      datePassed: '2026-09-18',
      sponsor: 'Sec. Jethro Paul Alcaraz & Treas. Hannah Grace Dela Cruz',
      status: 'Enacted',
      summary: 'Allocates PHP 18,500 for laser toner, ink refills, and 70gsm bond paper enabling 15 free B&W pages daily per learner.',
      fullText: `REPUBLIC OF THE PHILIPPINES · DEPARTMENT OF EDUCATION · REGION XI
NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)

SSLG RESOLUTION NO. 2026-04 (Series of 2026)

A RESOLUTION ESTABLISHING "PROJECT LIBRE-PRINT": THE NNCHS FREE ACADEMIC PRINTING SUPPORT DESK WITH AUTOMATED SMS QUEUE NOTIFICATION

WHEREAS, many Junior and Senior High School learners incur recurring out-of-pocket expenses for printing research drafts, reviewers, and performance worksheets;
WHEREAS, the NNCHS Supreme Secondary Learner Government maintains dedicated Academic Welfare funds earmarked for direct student relief;

NOW, THEREFORE, BE IT RESOLVED AS IT IS HEREBY RESOLVED, that the NNCHS SSLG establishes Project LIBRE-PRINT at Room 104, granting up to fifteen (15) Black & White pages daily per enrolled learner free of charge;
RESOLVED FURTHER, that an official digital queue integrated with SMS notification to the designated SSLG Admin Custodian (09163866252) shall operate without requiring student login.

APPROVED UNANIMOUSLY this 18th day of September 2026 at Nabunturan, Davao de Oro.
Signed: Evann Raye Cabalan, SSLG President · Attested: Jethro Paul Alcaraz, SSLG Secretary`,
    },
    {
      id: 'leg-2',
      numberCode: 'Resolution No. 2026-05',
      docKind: 'Resolution',
      title: 'Adopting the Confidential & Anonymous Student Grievance Tracking Charter',
      datePassed: '2026-10-02',
      sponsor: 'G8 Rep. Princess Aliyah Soriano & Protocol Officer Lorenzo Miguel Bautista',
      status: 'Enacted',
      summary: 'Mandates 48-hour initial acknowledgement and public tracking IDs for all welfare and facility reports.',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)

SSLG RESOLUTION NO. 2026-05 (Series of 2026)

A RESOLUTION INSTITUTIONALIZING THE CONFIDENTIAL AND ANONYMOUS STUDENT GRIEVANCE & WELFARE TRACKING DESK

Section 1. Zero-Barrier Reporting. Every learner may file academic, facility, safety, or welfare concerns without login credentials and may toggle complete identity anonymity.
Section 2. Tracking Receipt. Each submission generates a unique NNCHS-SSLG-2026-XXXX code inspectable on the Public Ticket Status Checker.
Section 3. Response Service Level. Committee officers shall log initial review status within two (2) school days.

APPROVED this 2nd day of October 2026, Nabunturan, Davao de Oro.`,
    },
    {
      id: 'leg-3',
      numberCode: 'Executive Order No. 2026-02',
      docKind: 'Executive Order',
      title: 'Mandating Monthly Public Financial Disclosure & CSV Open-Data Ledger',
      datePassed: '2026-08-29',
      sponsor: 'Pres. Evann Raye Cabalan',
      status: 'In Effect',
      summary: 'Requires all SSLG committee disbursements and liquidations to be published under the Transparency Seal.',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
OFFICE OF THE SSLG PRESIDENT · EXECUTIVE ORDER NO. 2026-02

MANDATING MONTHLY TRANSPARENCY SEAL UPDATES AND OPEN-DATA CSV EXPORT OF SSLG LEDGERS

1. The SSLG Treasurer and Auditor shall reconcile all official receipts and cash vouchers on or before the 5th day of each month.
2. Every allocation and expense item shall appear on the Public Transparency Seal alongside liquidation status and printable summaries.

Issued this 29th day of August 2026 at NNCHS Campus, Nabunturan, Davao de Oro.`,
    },
    {
      id: 'leg-4',
      numberCode: 'Memorandum No. 2026-11',
      docKind: 'Memorandum',
      title: 'Guidelines on Lost & Found Custody and 30-Day Unclaimed Property Disposal',
      datePassed: '2026-10-14',
      sponsor: 'Protocol Officer Lorenzo Miguel Bautista',
      status: 'In Effect',
      summary: 'Establishes centralized logging at Room 104 for calculators, tumblers, IDs, and classroom items.',
      fullText: `NNCHS SSLG MEMORANDUM NO. 2026-11

TO: ALL CLASSROOM OFFICERS, UTILITY PERSONNEL & STUDENT CLUBS
SUBJECT: STANDARDIZED LOST & FOUND CUSTODY PROTOCOL

1. Found valuables (calculators, wallets, IDs, tumblers, gadgets) shall be turned over to SSLG Room 104 within the school day.
2. Items are tagged with an LF-2026-XXX code and displayed on the Public Portal Lost & Found Digital Board.
3. Owners claim items by presenting their School ID and describing identifying marks.`,
    },
    {
      id: 'leg-5',
      numberCode: 'Resolution No. 2026-06',
      docKind: 'Resolution',
      title: 'Supporting Zero-Single-Use-Plastic Fridays & Campus Eco-Brick Targets',
      datePassed: '2026-11-06',
      sponsor: 'G9 Rep. Christian Jay Navarro & YES-O NNCHS',
      status: 'Enacted',
      summary: 'Partners SSLG with YES-O and campus concessionaires to phase out single-use sachets and cups.',
      fullText: `NNCHS SSLG RESOLUTION NO. 2026-06

SUPPORTING "BERDE CAMPUS" ZERO-SINGLE-USE-PLASTIC FRIDAYS ACROSS ALL NNCHS QUADRANGLES

RESOLVED, that all accredited clubs and homerooms promote reusable tumblers and food containers every Friday, while turning in clean, dry plastic wrappers to the YES-O Eco-Brick Pavilion.

Passed November 6, 2026 · NNCHS Legislative Council.`,
    },
  ],
  ledger: [
    {
      id: 'led-1',
      date: '2026-08-10',
      voucherNo: 'ALLOC-2026-001',
      committee: 'General SSLG Trust Fund',
      particulars: 'Opening SY 2026–2027 Approved Student Government Operating Fund',
      entryType: 'Allocation / Income',
      amount: 65000,
      liquidationStatus: 'Approved Budget',
    },
    {
      id: 'led-2',
      date: '2026-09-20',
      voucherNo: 'CV-2026-014',
      committee: 'Free Printing & Academic Support',
      particulars: '25 Reams 70gsm Bond Paper + 4 Laser Ink Bottles (Project LIBRE-PRINT)',
      entryType: 'Disbursement / Expense',
      amount: 14250,
      liquidationStatus: 'Liquidated',
    },
    {
      id: 'led-3',
      date: '2026-10-08',
      voucherNo: 'CV-2026-019',
      committee: 'Environment & Green Campus',
      particulars: 'Color-Coded MRF Bins, Eco-Signages & Garden Composting Supplies',
      entryType: 'Disbursement / Expense',
      amount: 8400,
      liquidationStatus: 'Liquidated',
    },
    {
      id: 'led-4',
      date: '2026-10-24',
      voucherNo: 'CV-2026-025',
      committee: 'Student Welfare & Safety',
      particulars: 'First-Aid Kits Replenishment (RCY) & Lost/Found Storage Cabinets',
      entryType: 'Disbursement / Expense',
      amount: 6850,
      liquidationStatus: 'Liquidated',
    },
    {
      id: 'led-5',
      date: '2026-11-12',
      voucherNo: 'CV-2026-031',
      committee: 'Free Printing & Academic Support',
      particulars: 'Printer Drum Maintenance & Supplementary Paper Stock (Q2 Exams)',
      entryType: 'Disbursement / Expense',
      amount: 4250,
      liquidationStatus: 'For Liquidation',
    },
    {
      id: 'led-6',
      date: '2026-11-15',
      voucherNo: 'CV-2026-033',
      committee: 'Leadership & Club Support',
      particulars: 'Parliamentary Training Handouts & Club Charter Certificates',
      entryType: 'Disbursement / Expense',
      amount: 5900,
      liquidationStatus: 'Liquidated',
    },
  ],
};

export const DEFAULT_SMS_LOGS: SmsDispatchLog[] = [
  {
    id: 'sms-1',
    recipient: SSLG_ADMIN_SMS_NUMBER,
    jobCode: 'PRT-2026-1041',
    studentName: 'Althea Marie Villanueva',
    messageBody:
      '[NNCHS SSLG FREE PRINT] Job PRT-2026-1041 | Althea Marie Villanueva (12 - STEM A Rizal) | 14p B&W Back-to-Back | Research Paper | Claim: Lunch Break (12:00–1:00 PM) | Doc: Chapter 1-3 Draft: Solar Water Filtration Study',
    dispatchedAt: '2026-11-21T08:15:02+08:00',
    deliveryStatus: 'Queued / Dispatched',
  },
  {
    id: 'sms-2',
    recipient: SSLG_ADMIN_SMS_NUMBER,
    jobCode: 'PRT-2026-1042',
    studentName: 'Carl Angelo Dalisay',
    messageBody:
      '[NNCHS SSLG FREE PRINT] Job PRT-2026-1042 | Carl Angelo Dalisay (10 - STE Newton) | 8p B&W Single-Sided | Reviewer | Claim: Dismissal (4:00–4:45 PM) | Doc: Second Quarter Science & Trigonometry Reviewer',
    dispatchedAt: '2026-11-21T09:40:03+08:00',
    deliveryStatus: 'Queued / Dispatched',
  },
];

export function loadPortalState(): PortalState {
  try {
    const raw = localStorage.getItem(PORTAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(DEFAULT_PORTAL_STATE));
      return DEFAULT_PORTAL_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<PortalState>;
    return {
      ...DEFAULT_PORTAL_STATE,
      ...parsed,
      impactCounters: {
        ...DEFAULT_PORTAL_STATE.impactCounters,
        ...(parsed.impactCounters || {}),
      },
    };
  } catch {
    return DEFAULT_PORTAL_STATE;
  }
}

export function savePortalState(state: PortalState): void {
  try {
    localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota issues safely
  }
}

export function loadSmsLogs(): SmsDispatchLog[] {
  try {
    const raw = localStorage.getItem(SMS_LOGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SMS_LOGS_STORAGE_KEY, JSON.stringify(DEFAULT_SMS_LOGS));
      return DEFAULT_SMS_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SmsDispatchLog[]) : DEFAULT_SMS_LOGS;
  } catch {
    return DEFAULT_SMS_LOGS;
  }
}

export function saveSmsLogs(logs: SmsDispatchLog[]): void {
  try {
    localStorage.setItem(SMS_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore quota issues safely
  }
}

export function generatePrintJobCode(existing: PrintRequestJob[]): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const candidate = `PRT-2026-${randomPart}`;
  if (existing.some((j) => j.jobCode === candidate)) {
    return `PRT-2026-${randomPart + 1}`;
  }
  return candidate;
}

export function generateTicketCode(existing: GrievanceTicket[]): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const candidate = `NNCHS-SSLG-2026-${randomPart}`;
  if (existing.some((t) => t.ticketCode === candidate)) {
    return `NNCHS-SSLG-2026-${randomPart + 1}`;
  }
  return candidate;
}

export function buildSmsAlertPayload(job: PrintRequestJob): string {
  const modeShort = job.printMode.includes('Back-to-Back') ? 'B&W Back-to-Back' : 'B&W Single-Sided';
  const contactText = job.contactNumber.trim() ? ` | Student Tel: ${job.contactNumber.trim()}` : '';
  return `[NNCHS SSLG FREE PRINT] Job ${job.jobCode} | ${job.studentName} (${job.gradeSection})${contactText} | ${job.pageCount}p ${modeShort} | ${job.purpose} | Claim: ${job.claimSlot} | Doc: ${job.documentTitle}`;
}
