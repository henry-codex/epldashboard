/* ═══════════════════════════════════════════════════════════
   EPL Fellows Platform — Shared Mock Data
   All pages import from here instead of duplicating data.
   (Will be replaced by API calls when backend is ready)
   ═══════════════════════════════════════════════════════════ */

export type CountryId = "gh" | "ke" | "lr" | "mw" | "sl";

export interface Cohort {
  year: string;
  fellows: number;
  placed: number;
  graduated: number;
}

export interface Project {
  name: string;
  status: "active" | "completed" | "planning";
  fellows: number;
  startDate: string;
}

export interface AlumniPerson {
  name: string;
  role: string;
  cohort: string;
}

export interface RecentUpdate {
  text: string;
  time: string;
  type: "checkin" | "fellow" | "event" | "alert";
}

export interface CountryData {
  id: CountryId;
  name: string;
  flag: string;
  color: string;
  fellows: number;
  alumni: number;
  institutions: number;
  activePrograms: number;
  placed: number;
  checkInRate: number;
  trend: number;
  mediaItems: number;
  upcomingEvents: number;
  cohorts: Cohort[];
  projects: Project[];
  recentUpdates: RecentUpdate[];
  events: { title: string; date: string }[];
  alumniHighlights: AlumniPerson[];
}

/* ── Full country dataset ───────────────────────────────── */
export const COUNTRIES: CountryData[] = [
  {
    id: "gh", name: "Ghana", flag: "🇬🇭", color: "#3B8BEB",
    fellows: 87, alumni: 142, institutions: 22, activePrograms: 3,
    placed: 81, checkInRate: 94, trend: 12, mediaItems: 14, upcomingEvents: 3,
    cohorts: [
      { year: "Cohort 7", fellows: 22, placed: 18, graduated: 0 },
      { year: "Cohort 6", fellows: 20, placed: 20, graduated: 12 },
      { year: "Cohort 5", fellows: 18, placed: 18, graduated: 18 },
      { year: "Cohort 4", fellows: 15, placed: 14, graduated: 15 },
      { year: "Cohort 3", fellows: 12, placed: 11, graduated: 12 },
    ],
    projects: [
      { name: "Public Service Fellowship", status: "active", fellows: 45, startDate: "Jan 2018" },
      { name: "Women on the Rise", status: "active", fellows: 20, startDate: "Mar 2024" },
      { name: "P.E.A.C.E", status: "active", fellows: 22, startDate: "Jun 2025" },
    ],
    recentUpdates: [
      { text: "Inspiring the Next Generation of Inclusive Leaders: Tour planned for June 2025", time: "2h ago", type: "event" },
      { text: "Validating Gender Inclusion: Civil Service Finalises Gender Mainstreaming SOP", time: "1d ago", type: "checkin" },
      { text: "PSF Cohort VI Graduation completed successfully", time: "2d ago", type: "event" },
      { text: "GDO Sensitisation Workshop Held in May 2025", time: "4d ago", type: "event" },
    ],
    events: [
      { title: "Empowerment and Leadership Tour", date: "Jun 15, 2025" },
      { title: "Cohort 7 Orientation", date: "Sep 28, 2025" },
      { title: "Women on the Rise Mid-year Review", date: "Dec 10, 2025" },
    ],
    alumniHighlights: [
      { name: "Ama Serwah", role: "Director, Ministry of Finance", cohort: "Cohort 3" },
      { name: "Kofi Mensah", role: "Policy Advisor, Min. of Education", cohort: "Cohort 4" },
      { name: "Abena Osei-Bonsu", role: "Deputy Head, OHCS", cohort: "Cohort 5" },
    ],
  },
  {
    id: "ke", name: "Kenya", flag: "🇰🇪", color: "#9B59B6",
    fellows: 18, alumni: 44, institutions: 5, activePrograms: 2,
    placed: 16, checkInRate: 88, trend: 6, mediaItems: 7, upcomingEvents: 1,
    cohorts: [
      { year: "Cohort 7", fellows: 8, placed: 6, graduated: 0 },
      { year: "Cohort 6", fellows: 6, placed: 6, graduated: 4 },
      { year: "Cohort 5", fellows: 4, placed: 4, graduated: 4 },
    ],
    projects: [
      { name: "Public Service Fellowship", status: "active", fellows: 10, startDate: "Feb 2023" },
      { name: "Women on the Rise", status: "active", fellows: 8, startDate: "Sep 2024" },
    ],
    recentUpdates: [
      { text: "12 new fellows onboarded for PSF program", time: "5h ago", type: "fellow" },
      { text: "Bi-weekly progress update received", time: "3d ago", type: "checkin" },
    ],
    events: [
      { title: "Kenya PSF Demo Day", date: "May 02, 2026" },
    ],
    alumniHighlights: [
      { name: "Wanjiku Kamau", role: "Health Director, Nairobi County", cohort: "Cohort 5" },
      { name: "James Otieno", role: "Principal Sec, Ministry of Agriculture", cohort: "Cohort 6" },
    ],
  },
  {
    id: "lr", name: "Liberia", flag: "🇱🇷", color: "#E05C5C",
    fellows: 42, alumni: 68, institutions: 10, activePrograms: 3,
    placed: 36, checkInRate: 79, trend: -3, mediaItems: 5, upcomingEvents: 2,
    cohorts: [
      { year: "Cohort 6", fellows: 14, placed: 12, graduated: 0 },
      { year: "Cohort 5", fellows: 12, placed: 10, graduated: 8 },
      { year: "Cohort 4", fellows: 10, placed: 9, graduated: 10 },
      { year: "Cohort 3", fellows: 6, placed: 5, graduated: 6 },
    ],
    projects: [
      { name: "Public Service Fellowship", status: "active", fellows: 14, startDate: "Jan 2023" },
      { name: "Women on the Rise", status: "active", fellows: 16, startDate: "Jun 2021" },
      { name: "P.E.A.C.E", status: "active", fellows: 12, startDate: "Mar 2022" },
    ],
    recentUpdates: [
      { text: "3 institutions still pending check-in — overdue", time: "1d ago", type: "alert" },
      { text: "Women on the Rise cohort placement complete", time: "3d ago", type: "checkin" },
    ],
    events: [
      { title: "Governance Fellows Workshop", date: "Apr 18, 2026" },
      { title: "Liberia Annual Review", date: "Jun 01, 2026" },
    ],
    alumniHighlights: [
      { name: "Mary Kollie", role: "Director, Ministry of Gender", cohort: "Cohort 3" },
      { name: "Samuel Gaye", role: "Health Policy, Ministry of Health", cohort: "Cohort 4" },
    ],
  },
  {
    id: "mw", name: "Malawi", flag: "🇲🇼", color: "#E8A020",
    fellows: 35, alumni: 51, institutions: 9, activePrograms: 2,
    placed: 30, checkInRate: 82, trend: 4, mediaItems: 3, upcomingEvents: 1,
    cohorts: [
      { year: "Cohort 6", fellows: 14, placed: 12, graduated: 0 },
      { year: "Cohort 5", fellows: 12, placed: 10, graduated: 8 },
      { year: "Cohort 4", fellows: 9, placed: 8, graduated: 9 },
    ],
    projects: [
      { name: "Public Service Fellowship", status: "active", fellows: 20, startDate: "Sep 2021" },
      { name: "Women on the Rise", status: "active", fellows: 15, startDate: "Jan 2023" },
    ],
    recentUpdates: [
      { text: "PSF cohort 6 completed placement", time: "2d ago", type: "checkin" },
      { text: "Women on the Rise mid-term review scheduled", time: "5d ago", type: "event" },
    ],
    events: [
      { title: "Mid-term Review", date: "Apr 25, 2026" },
    ],
    alumniHighlights: [
      { name: "Grace Banda", role: "Education Consultant, Min of Education", cohort: "Cohort 4" },
      { name: "Chimwemwe Phiri", role: "WASH Coordinator, Lilongwe Council", cohort: "Cohort 5" },
    ],
  },
  {
    id: "sl", name: "Sierra Leone", flag: "🇸🇱", color: "#2EC27E",
    fellows: 28, alumni: 39, institutions: 7, activePrograms: 2,
    placed: 26, checkInRate: 91, trend: 8, mediaItems: 6, upcomingEvents: 2,
    cohorts: [
      { year: "Cohort 7", fellows: 10, placed: 8, graduated: 0 },
      { year: "Cohort 6", fellows: 10, placed: 10, graduated: 6 },
      { year: "Cohort 5", fellows: 8, placed: 8, graduated: 8 },
    ],
    projects: [
      { name: "Public Service Fellowship", status: "active", fellows: 16, startDate: "Mar 2022" },
      { name: "Women on the Rise", status: "active", fellows: 12, startDate: "Jan 2024" },
    ],
    recentUpdates: [
      { text: "Alumni meetup scheduled for April 15", time: "1d ago", type: "event" },
      { text: "Check-in review session complete", time: "4d ago", type: "checkin" },
    ],
    events: [
      { title: "SL Fellows Check-in Review", date: "Apr 15, 2026" },
      { title: "PSF Showcase", date: "May 20, 2026" },
    ],
    alumniHighlights: [
      { name: "Aminata Kamara", role: "Director, Sierra Leone EPA", cohort: "Cohort 5" },
      { name: "Ibrahim Sesay", role: "Public Health Lead, Freetown", cohort: "Cohort 6" },
    ],
  },
];

/* ── Lookup helpers ─────────────────────────────────────── */
export const COUNTRIES_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.id, c])) as Record<CountryId, CountryData>;

export const TOTAL_FELLOWS = COUNTRIES.reduce((s, c) => s + c.fellows, 0);
export const TOTAL_ALUMNI  = COUNTRIES.reduce((s, c) => s + c.alumni, 0);
export const TOTAL_PLACED  = COUNTRIES.reduce((s, c) => s + c.placed, 0);
export const TOTAL_INST    = COUNTRIES.reduce((s, c) => s + c.institutions, 0);
export const AVG_CHECKIN   = Math.round(COUNTRIES.reduce((s, c) => s + c.checkInRate, 0) / COUNTRIES.length);

export const RECENT_ACTIVITY = [
  { id: 1, type: "checkin",  text: "Ghana submitted Q1 2026 check-in report", time: "2h ago",  color: "#3B8BEB" },
  { id: 2, type: "fellow",   text: "12 new fellows onboarded in Kenya (Cohort 7)", time: "5h ago",  color: "#9B59B6" },
  { id: 3, type: "alert",    text: "Liberia check-in overdue — 3 institutions pending", time: "1d ago", color: "#E05C5C" },
  { id: 4, type: "event",    text: "Sierra Leone alumni meetup scheduled for April 15", time: "1d ago", color: "#2EC27E" },
  { id: 5, type: "program",  text: "Malawi PSF cohort 6 completed placement", time: "2d ago", color: "#E8A020" },
  { id: 6, type: "checkin",  text: "Kenya bi-weekly progress update received", time: "3d ago", color: "#9B59B6" },
];

export const UPCOMING_EVENTS = [
  { id: 1, title: "Ghana Alumni Summit 2026", date: "Apr 12", country: "Ghana", color: "#3B8BEB" },
  { id: 2, title: "SL Fellows Check-in Review", date: "Apr 15", country: "Sierra Leone", color: "#2EC27E" },
  { id: 3, title: "Continental Board Update", date: "Apr 20", country: "All", color: "rgba(255,255,255,0.60)" },
  { id: 4, title: "Kenya PSF Demo Day", date: "May 02", country: "Kenya", color: "#9B59B6" },
];

/* ── All fellows (for Fellows page) ─────────────────────── */
export interface Fellow {
  id: string;
  name: string;
  avatar?: string;
  country: CountryId;
  cohort: string;
  project: string;
  institution: string;
  status: "active" | "completed" | "on-leave";
  checkInStatus: "on-track" | "late" | "overdue";
  gender: "Male" | "Female";
  age: number;
  email: string;
  phone: string;
  placeOfPosting: string;
  highlights: string[];
}

export const ALL_FELLOWS: Fellow[] = [
  // GHANA - 15 FELLOWS
  { id: "f1", name: "Kwame Asante", gender: "Male", age: 26, email: "kwame.a@example.com", phone: "+233 24 123 4567", placeOfPosting: "Accra Metro", highlights: ["Led coding bootcamp for 500 kids", "Featured in Ghanaian Times"], country: "gh", cohort: "Cohort 7", project: "Public Service Fellowship", institution: "Ministry of Finance", status: "active", checkInStatus: "on-track" },
  { id: "f2", name: "Esi Mensah", gender: "Female", age: 24, email: "esi.mensah@example.com", phone: "+233 20 987 6543", placeOfPosting: "Kumasi Hub", highlights: ["Top 3 in Hackathon 2024"], country: "gh", cohort: "Cohort 7", project: "Women on the Rise", institution: "Office of the Head of Civil Service", status: "active", checkInStatus: "on-track" },
  { id: "f3", name: "Yaa Agyeman", gender: "Female", age: 28, email: "yaa.a@example.com", phone: "+233 27 345 6789", placeOfPosting: "Tamale", highlights: ["Published rural resilience report"], country: "gh", cohort: "Cohort 6", project: "P.E.A.C.E", institution: "Ministry of Interior", status: "active", checkInStatus: "late" },
  { id: "f13", name: "Nana Osei", gender: "Male", age: 25, email: "nana.osei@example.com", phone: "+233 24 555 1234", placeOfPosting: "Accra Central", highlights: ["Initiated community tech library"], country: "gh", cohort: "Cohort 7", project: "Public Service Fellowship", institution: "Ministry of Education", status: "active", checkInStatus: "on-track" },
  { id: "f14", name: "Abena Boakye", gender: "Female", age: 27, email: "abena.b@example.com", phone: "+233 54 321 9876", placeOfPosting: "Cape Coast", highlights: ["Winner of Innovation Grant"], country: "gh", cohort: "Cohort 6", project: "Women on the Rise", institution: "Ghana Revenue Authority", status: "completed", checkInStatus: "on-track" },
  { id: "f15", name: "Kofi Owusu", gender: "Male", age: 29, email: "kofi.o@example.com", phone: "+233 20 444 8888", placeOfPosting: "Sunyani", highlights: ["Keynote speaker at Africa Climate Week"], country: "gh", cohort: "Cohort 5", project: "Public Service Fellowship", institution: "Environmental Protection Agency", status: "active", checkInStatus: "on-track" },
  { id: "f16", name: "Ama Kusi", gender: "Female", age: 23, email: "ama.kusi@example.com", phone: "+233 55 111 2222", placeOfPosting: "Tema", highlights: ["Developed local waste sorting app"], country: "gh", cohort: "Cohort 7", project: "Women on the Rise", institution: "Ministry of Sanitation", status: "active", checkInStatus: "on-track" },
  { id: "f17", name: "Kwabena Yeboah", gender: "Male", age: 26, email: "kwabena.y@example.com", phone: "+233 27 999 0000", placeOfPosting: "Koforidua", highlights: ["Voted best cohort leader"], country: "gh", cohort: "Cohort 6", project: "Public Service Fellowship", institution: "Ministry of Transport", status: "active", checkInStatus: "late" },
  { id: "f18", name: "Akua Danso", gender: "Female", age: 25, email: "akua.d@example.com", phone: "+233 24 777 6666", placeOfPosting: "Ho", highlights: ["Launched coding club for girls"], country: "gh", cohort: "Cohort 7", project: "Women on the Rise", institution: "Ministry of Communications", status: "active", checkInStatus: "on-track" },
  { id: "f19", name: "Yaw Appiah", gender: "Male", age: 28, email: "yaw.a@example.com", phone: "+233 20 555 3333", placeOfPosting: "Takoradi", highlights: ["Drafted regional youth policy"], country: "gh", cohort: "Cohort 5", project: "P.E.A.C.E", institution: "Ministry of National Security", status: "on-leave", checkInStatus: "overdue" },
  { id: "f20", name: "Afia Pokua", gender: "Female", age: 27, email: "afia.p@example.com", phone: "+233 54 888 1111", placeOfPosting: "Bolgatanga", highlights: ["Secured funding for solar project"], country: "gh", cohort: "Cohort 6", project: "Women on the Rise", institution: "Ministry of Energy", status: "active", checkInStatus: "on-track" },
  { id: "f21", name: "Kweku Baah", gender: "Male", age: 24, email: "kweku.b@example.com", phone: "+233 27 444 7777", placeOfPosting: "Accra", highlights: ["Top 10 Innovator Award"], country: "gh", cohort: "Cohort 7", project: "Public Service Fellowship", institution: "Ministry of Trade", status: "active", checkInStatus: "on-track" },
  { id: "f22", name: "Serwaa Manu", gender: "Female", age: 26, email: "serwaa.m@example.com", phone: "+233 24 222 9999", placeOfPosting: "Kumasi", highlights: ["Organized massive tree planting drive"], country: "gh", cohort: "Cohort 6", project: "P.E.A.C.E", institution: "Forestry Commission", status: "completed", checkInStatus: "on-track" },
  { id: "f23", name: "Gideon Sarfo", gender: "Male", age: 29, email: "gideon.s@example.com", phone: "+233 20 111 5555", placeOfPosting: "Wa", highlights: ["Developed AI agricultural tool"], country: "gh", cohort: "Cohort 5", project: "Public Service Fellowship", institution: "Ministry of Food and Agriculture", status: "active", checkInStatus: "on-track" },
  { id: "f24", name: "Mavis Atta", gender: "Female", age: 25, email: "mavis.a@example.com", phone: "+233 55 666 4444", placeOfPosting: "Obuasi", highlights: ["Mentored 20 high school girls"], country: "gh", cohort: "Cohort 7", project: "Women on the Rise", institution: "Ministry of Education", status: "active", checkInStatus: "late" },
  { id: "f25", name: "Emmanuel Tetteh", gender: "Male", age: 27, email: "emmanuel.t@example.com", phone: "+233 27 333 8888", placeOfPosting: "Accra", highlights: ["Created open-source data dashboard"], country: "gh", cohort: "Cohort 6", project: "Public Service Fellowship", institution: "Ministry of Information", status: "active", checkInStatus: "on-track" },

  // KENYA
  { id: "f4", name: "Wanjiku Mwangi", gender: "Female", age: 24, email: "wanjiku@example.com", phone: "+254 712 345 678", placeOfPosting: "Nairobi", highlights: ["Pioneered agritech startup"], country: "ke", cohort: "Cohort 7", project: "Women on the Rise", institution: "Ministry of Agriculture", status: "active", checkInStatus: "on-track" },
  { id: "f5", name: "Ochieng Otieno", gender: "Male", age: 27, email: "ochieng@example.com", phone: "+254 723 456 789", placeOfPosting: "Kisumu", highlights: ["Improved local clinic efficiency by 40%"], country: "ke", cohort: "Cohort 6", project: "Public Service Fellowship", institution: "Ministry of Health", status: "active", checkInStatus: "on-track" },

  // LIBERIA
  { id: "f6", name: "Moses Kollie", gender: "Male", age: 29, email: "moses.k@example.com", phone: "+231 77 123 4567", placeOfPosting: "Monrovia", highlights: ["Authored civic engagement policy"], country: "lr", cohort: "Cohort 6", project: "P.E.A.C.E", institution: "Ministry of Internal Affairs", status: "active", checkInStatus: "overdue" },
  { id: "f7", name: "Fatu Kamara", gender: "Female", age: 25, email: "fatu.k@example.com", phone: "+231 88 987 6543", placeOfPosting: "Buchanan", highlights: ["Founded local code club"], country: "lr", cohort: "Cohort 5", project: "Women on the Rise", institution: "Ministry of Gender", status: "active", checkInStatus: "on-track" },
  { id: "f8", name: "Patricia Doe", gender: "Female", age: 26, email: "patricia.d@example.com", phone: "+231 77 555 1234", placeOfPosting: "Gbarnga", highlights: ["Organized rural health camp"], country: "lr", cohort: "Cohort 6", project: "Public Service Fellowship", institution: "Ministry of Health", status: "active", checkInStatus: "late" },

  // MALAWI
  { id: "f9", name: "Chisomo Banda", gender: "Male", age: 28, email: "chisomo.b@example.com", phone: "+265 99 123 4567", placeOfPosting: "Lilongwe", highlights: ["Trained 100+ rural teachers"], country: "mw", cohort: "Cohort 6", project: "Public Service Fellowship", institution: "Ministry of Education", status: "active", checkInStatus: "on-track" },
  { id: "f10", name: "Mphatso Phiri", gender: "Female", age: 25, email: "mphatso.p@example.com", phone: "+265 88 987 6543", placeOfPosting: "Blantyre", highlights: ["Designed accessible water purifier"], country: "mw", cohort: "Cohort 5", project: "Women on the Rise", institution: "Ministry of Water and Sanitation", status: "active", checkInStatus: "on-track" },

  // SIERRA LEONE
  { id: "f11", name: "Aminata Sesay", gender: "Female", age: 24, email: "aminata.s@example.com", phone: "+232 76 123 456", placeOfPosting: "Freetown", highlights: ["Built mobile library app"], country: "sl", cohort: "Cohort 7", project: "Women on the Rise", institution: "Ministry of Basic Education", status: "active", checkInStatus: "on-track" },
  { id: "f12", name: "Mohamed Conteh", gender: "Male", age: 27, email: "mohamed.c@example.com", phone: "+232 77 987 654", placeOfPosting: "Bo", highlights: ["Led malaria prevention campaign"], country: "sl", cohort: "Cohort 6", project: "Public Service Fellowship", institution: "Ministry of Health and Sanitation", status: "active", checkInStatus: "on-track" },
];
