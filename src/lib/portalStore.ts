export const PORTAL_STORAGE_KEY = 'nnchs_sslg_portal_v2';
export const THEME_STORAGE_KEY = 'nnchs_sslg_theme';
export const DEFAULT_YORP_LOGO_PATH = '/assets/aistudio/image_582ebce5.png';

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
  'Request Submitted',
  'Reviewing File',
  'Printing in Progress',
  'Ready for Pickup at SSLG Office',
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
  | 'Student Welfare / Anti-Bullying'
  | 'Campus Facilities'
  | 'Academic / Policy Concern'
  | 'General Suggestion';

export interface GrievanceTicket {
  id: string;
  ticketCode: string;
  category: TicketCategory;
  isAnonymous: boolean;
  studentName: string;
  gradeSection: string;
  subject: string;
  details: string;
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
  schoolYear: string;
  campusAdvisory: string;
  tickerMessages: string[];
  heroSlides: HeroSlide[];
  yorpLogoUrl: string;
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
  schoolYear: '2026–2027',
  campusAdvisory:
    'Project ‘Free Printing’ for all Learners accepts Black & White and Colored Print files at the SSLG Office (Room 104). Submit files online and track your dot timeline anytime.',
  tickerMessages: [
    'PROJECT ‘FREE PRINTING’ FOR ALL LEARNERS: Black & White and Colored printing accepted — upload your file directly and track status with your PRT Code.',
    'NYC YORP REGISTERED YOUTH ORGANIZATION: NNCHS SSLG champions Health, Education, Economic Empowerment, Social Inclusion, Peace Building, Governance & Active Leadership.',
    'OFFICIAL SSLG UPDATES: Join the NNCHS SSLG Updates Messenger Group from our Bulletin Board for real-time school advisories.',
  ],
  heroSlides: [
    {
      id: 'slide-1',
      title: 'Serving Every Compre Learner Through Transparent Leadership',
      caption:
        'Official digital hub of the Nabunturan National Comprehensive High School — Supreme Secondary Learner Government.',
      ctaLabel: "Project 'Free Printing'",
      ctaSection: 'printing',
      imageUrl: makeGeometricSlideDataUri('NNCHS SSLG Student Leadership', 'SY 2026–2027 · OFFICIAL PORTAL', 'navy'),
    },
    {
      id: 'slide-2',
      title: "Project 'Free Printing' for all Learners",
      caption:
        'Upload PDF, DOCX, PPTX, or image files—both Black & White and Colored Print accepted—and follow your live dot-timeline status.',
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
        'Learners may now specify exact copy counts, choose Black & White or Colored Print, upload files directly, and follow live dot-timeline tracking.',
      fullBody:
        'Pursuant to SSLG Resolution No. 2026-04, Project ‘Free Printing’ for all Learners has been upgraded to accept both Black & White and Colored academic files directly on the NNCHS SSLG Website.\n\nUpload your PDF, Word document, presentation, or image file cleanly on the Free Printing tab, save your generated PRT-2026 tracking code, and track every stage through our connected 5-dot timeline.',
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
      status: 'Ready for Pickup at SSLG Office',
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
      status: 'Printing in Progress',
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
        'Provides free Black & White and Colored academic printing for Compre students with direct file upload and live dot-timeline tracking.',
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
      description: 'Student governance workshops and NYC YORP advocacy planning.',
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
        'Establishes free academic printing for Compre learners supporting both Black & White and Colored printouts with dot-timeline tracking.',
      fullText: `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)

SSLG RESOLUTION NO. 2026-04 (Series of 2026)

A RESOLUTION ESTABLISHING "PROJECT 'FREE PRINTING' FOR ALL LEARNERS" AT THE NNCHS SSLG OFFICE

WHEREAS, bonafide Junior and Senior High School learners regularly require printed worksheets, research drafts, reviewers, and visual projects;
WHEREAS, the NNCHS SSLG is committed to reducing academic expenses for every Compre learner;

NOW, THEREFORE, BE IT RESOLVED AS IT IS HEREBY RESOLVED, that the NNCHS SSLG operates Project 'Free Printing' for all Learners at Room 104, accepting both Black & White and Colored Print requests via direct file upload on the Official SSLG Website.

RESOLVED FURTHER, that learners shall receive a unique Tracking Code with live dot-to-dot timeline progress until pickup.

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
Section 2. Public Moderation. Only reports expressly approved by the SSLG Executive Council may appear on the public feed to safeguard student privacy.

APPROVED this 2nd day of October 2026.`,
    },
    {
      id: 'res-3',
      numberCode: 'Resolution No. 2026-06',
      title: 'Aligning Annual Student Programs with the Seven NYC YORP Advocacy Pillars',
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
      learnerServicesContact: {
        ...DEFAULT_PORTAL_STATE.learnerServicesContact,
        ...(parsed.learnerServicesContact || {}),
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
    // ignore storage quota errors cleanly
  }
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

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}
