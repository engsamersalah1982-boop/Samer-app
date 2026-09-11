import {
  User,
  Task,
  WorkOrder,
  Equipment,
  PMSchedule,
  LeaveRequest,
  PermissionRequest,
  Employee,
  PlantDocument,
  AuditLog,
  SystemNotification,
  WorkOrderStatus,
  TaskStatus,
  RequestStatus,
  PlantProfile,
  UserRole,
  UserPermissions,
  getDefaultPermissionsForRole,
} from '../types';
import { INITIAL_50_USERS, INITIAL_50_EMPLOYEES } from '../data/initialUsers';
import { firestoreSync } from './firestoreSync';
import { playNotificationSound } from '../utils/notificationSound';

// Storage keys
const USERS_KEY = 'jbc_users_v7';
const TASKS_KEY = 'jbc_tasks_v2';
const WORK_ORDERS_KEY = 'jbc_work_orders_mwm_v3';
const EQUIPMENT_KEY = 'jbc_equipment_mwm_v3';
const PM_SCHEDULES_KEY = 'jbc_pm_schedules_mwm_v3';
const LEAVES_KEY = 'jbc_leaves_v2';
const PERMISSIONS_KEY = 'jbc_permissions_v2';
const EMPLOYEES_KEY = 'jbc_employees_v5';
const DOCUMENTS_KEY = 'jbc_documents_v2';
const AUDIT_LOGS_KEY = 'jbc_audit_logs_v2';
const NOTIFICATIONS_KEY = 'jbc_notifications_v2';
const PLANT_PROFILE_KEY = 'jbc_plant_profile_v1';

// Initial Seed Data for Jordan Biogas Company (JBC)
const INITIAL_USERS: User[] = INITIAL_50_USERS;
const INITIAL_EMPLOYEES: Employee[] = INITIAL_50_EMPLOYEES;

export const DEFAULT_PLANT_PROFILE: PlantProfile = {
  facilityNameAr: 'محطة توليد الكهرباء من الغاز الحيوي - مكب الغباوي الهندسي',
  facilityNameEn: 'Al-Ghabawi Landfill Biogas Power Generation Facility',
  subTitleAr: 'تشغيل مستمر لـ 3 مولدات MWM بقدرة إجمالية 4.68 MWe (3 × 1.56 MWe) مع معالجة حيوية مستمرة لكبريتيد الهيدروجين.',
  subTitleEn: 'Continuous operation of 3x MWM gensets at 4.68 MWe (3 × 1.56 MWe) with biological H2S scrubbing.',
  companyNameAr: 'Jordan Biogas Company (JBC) - شركة الغاز الحيوي الأردنية',
  companyNameEn: 'Jordan Biogas Company (JBC)',
  locationAr: 'مكب الغباوي الهندسي / محطة الرصيفة (عمان، الأردن)',
  locationEn: 'Al-Ghabawi Sanitary Landfill / Rusaifeh Plant (Amman, Jordan)',
  installedCapacityAr: '4.68 MWe (3 × 1.56 MWe MWM TCG 2020 V16)',
  installedCapacityEn: '4.68 MWe (3 × 1.56 MWe MWM TCG 2020 V16)',
  gridConnectionAr: 'شركة الكهرباء الوطنية (NEPCO) - خط الربط الكهربائي 11/33 kV',
  gridConnectionEn: 'National Electric Power Company (NEPCO) - 11/33 kV Interconnection',
  plantDescriptionAr: 'مشروع بيئي وهندسي ريادي يهدف إلى استخلاص ومعالجة غاز الميثان الحيوي المنبعث من خلايا طمر النفايات الصلبة بمكب الغباوي الهندسي، وتحويله عبر 3 محركات احتراق داخلي ألمانية فائقة الكفاءة من طراز MWM TCG 2020 V16 إلى طاقة كهربائية مستدامة يتم ضخها مباشرة إلى شبكة النقل الوطنية، مساهماً في تقليل الانبعاثات الكربونية ودعم استقرار مزيج الطاقة المتجددة في المملكة الأردنية الهاشمية.',
  plantDescriptionEn: 'A pioneering environmental and engineering initiative aimed at extracting and biologically treating landfill methane gas at Al-Ghabawi sanitary landfill, converting it via three high-efficiency German MWM TCG 2020 V16 gas gensets into sustainable electricity injected directly into the Jordanian national transmission grid (NEPCO).',
  environmentalImpactAr: 'خفض انبعاثات غازات الدفيئة بما يعادل أكثر من 100,000 طن مكافئ من ثاني أكسيد الكربون سنوياً، وحماية المياه الجوفية وطبقات الهواء المحيطة من تسربات غاز الميثان ورائحة كبريتيد الهيدروجين.',
  environmentalImpactEn: 'Reducing greenhouse gas emissions by over 100,000 tons of CO2 equivalent annually, safeguarding groundwater, and eliminating toxic odor emissions.',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'م. سامر صلاح (مدير النظام)',
};

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'eq-1',
    code: 'JBC-MWM-01',
    nameAr: 'مولد الغاز الحيوي MWM رقم 1 (قدرة 1.56 MWe - تشغيل مستمر)',
    nameEn: 'MWM Biogas Genset #1 (1.56 MWe - Continuous Operation)',
    model: 'MWM TCG 2020 V16',
    serialNumber: 'MWM-TCG-2020-01-JO',
    location: 'صالة محطة التوليد الرئيسية - الغباوي (محطة 4.68 MWe)',
    status: 'running',
    operatingHours: 28450,
    lastMaintenanceDate: '2026-08-22',
    specifications: {
      power: '1.56 MWe (1560 kWe)',
      duty: 'تشغيل مستمر 24/7 (Continuous Baseload)',
      totalStationCapacity: '4.68 MWe (3 × 1.56 MWe)',
      electricalEfficiency: '42.4%',
      fuel: 'Landfill Biogas (CH4 52-55%)',
      cylinders: 'V16 Turbocharged Gas Engine',
      oilCapacity: '450 Liters Synthetic Gas Oil',
    },
    qrCodeValue: 'JBC-MWM-01',
    installedDate: '2021-03-15',
  },
  {
    id: 'eq-2',
    code: 'JBC-MWM-02',
    nameAr: 'مولد الغاز الحيوي MWM رقم 2 (قدرة 1.56 MWe - تشغيل مستمر)',
    nameEn: 'MWM Biogas Genset #2 (1.56 MWe - Continuous Operation)',
    model: 'MWM TCG 2020 V16',
    serialNumber: 'MWM-TCG-2020-02-JO',
    location: 'صالة محطة التوليد الرئيسية - الغباوي (محطة 4.68 MWe)',
    status: 'running',
    operatingHours: 29120,
    lastMaintenanceDate: '2026-08-25',
    specifications: {
      power: '1.56 MWe (1560 kWe)',
      duty: 'تشغيل مستمر 24/7 (Continuous Baseload)',
      totalStationCapacity: '4.68 MWe (3 × 1.56 MWe)',
      electricalEfficiency: '42.4%',
      fuel: 'Landfill Biogas (CH4 52-55%)',
      cylinders: 'V16 Turbocharged Gas Engine',
      oilCapacity: '450 Liters Synthetic Gas Oil',
    },
    qrCodeValue: 'JBC-MWM-02',
    installedDate: '2021-03-15',
  },
  {
    id: 'eq-3',
    code: 'JBC-MWM-03',
    nameAr: 'مولد الغاز الحيوي MWM رقم 3 (قدرة 1.56 MWe - تشغيل مستمر)',
    nameEn: 'MWM Biogas Genset #3 (1.56 MWe - Continuous Operation)',
    model: 'MWM TCG 2020 V16',
    serialNumber: 'MWM-TCG-2020-03-JO',
    location: 'صالة محطة التوليد الرئيسية - الغباوي (محطة 4.68 MWe)',
    status: 'running',
    operatingHours: 27980,
    lastMaintenanceDate: '2026-09-01',
    specifications: {
      power: '1.56 MWe (1560 kWe)',
      duty: 'تشغيل مستمر 24/7 (Continuous Baseload)',
      totalStationCapacity: '4.68 MWe (3 × 1.56 MWe)',
      electricalEfficiency: '42.4%',
      fuel: 'Landfill Biogas (CH4 52-55%)',
      cylinders: 'V16 Turbocharged Gas Engine',
      oilCapacity: '450 Liters Synthetic Gas Oil',
    },
    qrCodeValue: 'JBC-MWM-03',
    installedDate: '2021-03-15',
  },
  {
    id: 'eq-4',
    code: 'JBC-DESULF-01',
    nameAr: 'وحدة المعالجة البيولوجية وإزالة كبريتيد الهيدروجين (Desulfurization)',
    nameEn: 'Biological H2S Desulfurization Plant',
    model: 'B-H2S Scrubber Tower 2400',
    serialNumber: 'DESULF-441-A',
    location: 'منطقة المعالجة الأولية للغاز',
    status: 'under_maintenance',
    operatingHours: 24300,
    lastMaintenanceDate: '2026-09-02',
    specifications: {
      capacity: '2400 Nm3/h',
      inletH2S: 'Up to 3500 ppm',
      targetOutletH2S: '< 200 ppm',
      nutrientFeedRate: '45 L/day',
    },
    qrCodeValue: 'JBC-DESULF-01',
    installedDate: '2020-11-10',
  },
  {
    id: 'eq-5',
    code: 'JBC-BLOW-01',
    nameAr: 'مروحة شفط الغاز الحيوي الرئيسية (Blower Unit A)',
    nameEn: 'Primary Biogas Extraction Blower A',
    model: 'Aerzen GM 15 L Blower',
    serialNumber: 'AERZ-7712-B',
    location: 'محطة الشفط والتكثيف المركزية',
    status: 'running',
    operatingHours: 31200,
    lastMaintenanceDate: '2026-07-10',
    specifications: {
      flowRate: '1800 m3/h',
      differentialPressure: '220 mbar',
      motorRating: '45 kW ATEX',
    },
    qrCodeValue: 'JBC-BLOW-01',
    installedDate: '2019-06-20',
  },
  {
    id: 'eq-6',
    code: 'JBC-FLARE-01',
    nameAr: 'حارقة الغاز المغلقة الآمنة (High-Temp Enclosed Flare)',
    nameEn: 'Enclosed High-Temperature Biogas Flare',
    model: 'Hofstetter H-HT 3000',
    serialNumber: 'HOF-FL-2020-03',
    location: 'محطة الحرق والتفريغ الاحتياطي',
    status: 'running',
    operatingHours: 4200,
    lastMaintenanceDate: '2026-08-01',
    specifications: {
      combustionTemp: '1050 °C',
      retentionTime: '0.3 s',
      destructionEfficiency: '99.9%',
    },
    qrCodeValue: 'JBC-FLARE-01',
    installedDate: '2020-01-14',
  },
  {
    id: 'eq-7',
    code: 'JBC-CHILL-01',
    nameAr: 'وحدة تجفيف وتبريد الغاز وإزالة الرطوبة (Gas Chiller)',
    nameEn: 'Biogas Dehumidification Chiller Unit',
    model: 'FrigorTec Biogas D-250',
    serialNumber: 'FRIG-992-01',
    location: 'وحدة تكثيف وفصل المياه',
    status: 'running',
    operatingHours: 15600,
    lastMaintenanceDate: '2026-08-28',
    specifications: {
      gasDewPoint: '4 °C',
      refrigerant: 'R134a',
      capacity: '2000 Nm3/h',
    },
    qrCodeValue: 'JBC-CHILL-01',
    installedDate: '2021-08-05',
  },
];

const INITIAL_TASKS: Task[] = [
  {
    id: 'tsk-1',
    taskCode: 'TSK-001',
    titleAr: 'قياس نسب تركيز غاز الميثان والأكسجين في حقل الآبار (الخلية 3)',
    titleEn: 'Measure CH4 & O2 Gas Concentrations across Cell 3 Wellfield',
    descriptionAr:
      'إجراء الفحص الدوري لشبكة استخراج الغاز واستخدام جهاز Geotech GA5000 للتحقق من نسبة الميثان وضبط صمامات الموازنة لتجنب سحب الهواء الخارجي.',
    descriptionEn:
      'Inspect Cell 3 wellheads with GA5000 analyzer. Ensure CH4 > 50% and O2 < 1.0% by balancing vacuum control valves.',
    assignedToUserId: 'usr-6',
    assignedToName: 'طارق حداد',
    assignedByUserId: 'usr-3',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-09-08',
    estimatedHours: 4,
    actualHours: 2.5,
    checklist: [
      {
        id: 'c1',
        textAr: 'معايرة جهاز التحليل المحمول GA5000 بغاز المعايرة القياسي',
        textEn: 'Calibrate portable GA5000 analyzer with span gas',
        completed: true,
      },
      {
        id: 'c2',
        textAr: 'قياس الضغط التفريغي عند مجمع الصمامات (Manifold A3)',
        textEn: 'Measure vacuum pressure at manifold A3',
        completed: true,
      },
      {
        id: 'c3',
        textAr: 'فحص رؤوس الآبار الفرعية من W3-01 إلى W3-15 وتسجيل القراءات',
        textEn: 'Sample wellheads W3-01 through W3-15 and log data',
        completed: false,
      },
      {
        id: 'c4',
        textAr: 'تفريغ مصائد التكثيف (Condensate knockouts) على خط الغاز',
        textEn: 'Drain condensation traps along the gas pipeline',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-06T08:30:00Z',
    updatedAt: '2026-09-07T06:15:00Z',
  },
  {
    id: 'tsk-2',
    taskCode: 'TSK-002',
    titleAr: 'سحب وتحليل عينات زيت التزييت لمولد MWM رقم 1 (MWM Genset #1)',
    titleEn: 'Lube Oil Sampling & Analysis for MWM Genset #1',
    descriptionAr:
      'أخذ عينة زيت محرك معتمدة وإرسالها للمختبر لقياس أكسدة الزيت، اللزوجة، والرقم القاعدي TBN وتركيز المعادن وفق توصيات MWM.',
    descriptionEn:
      'Draw hot engine oil sample into certified lab container. Test for viscosity, oxidation, TBN, and wear metals.',
    assignedToUserId: 'usr-4',
    assignedToName: 'فني. محمود العبادي',
    assignedByUserId: 'usr-3',
    status: 'pending',
    priority: 'medium',
    dueDate: '2026-09-09',
    estimatedHours: 2,
    checklist: [
      {
        id: 'c21',
        textAr: 'تشغيل المحرك حتى وصول درجة حرارة الزيت إلى 80 درجة مئوية',
        textEn: 'Ensure engine is at operating temp (~80°C)',
        completed: false,
      },
      {
        id: 'c22',
        textAr: 'أخذ العينة من صمام الفحص الخاص قبل فلتر الزيت',
        textEn: 'Extract sample from test port prior to oil filters',
        completed: false,
      },
      {
        id: 'c23',
        textAr: 'توثيق ساعات تشغيل الزيت في بطاقة العينة وإرسالها للمختبر',
        textEn: 'Log oil run hours on test certificate label',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T07:00:00Z',
    updatedAt: '2026-09-07T07:00:00Z',
  },
  {
    id: 'tsk-3',
    taskCode: 'TSK-003',
    titleAr: 'تنظيف ومعايرة مجس كبريتيد الهيدروجين (H2S Sensor) بمخرج وحدة المعالجة',
    titleEn: 'Clean & Calibrate H2S Electrochemical Sensor at Scrubber Outlet',
    descriptionAr:
      'معايرة حساس H2S والتأكد من توافقه مع قراءات نظام SCADA لتفادي دخول كبريتيد الهيدروجين للمحركات بنسب تزيد عن 200 ppm.',
    descriptionEn:
      'Clean sensor head with optical solvent, calibrate zero and span with 500 ppm H2S calibration gas, align with SCADA.',
    assignedToUserId: 'usr-5',
    assignedToName: 'فني. إبراهيم الزعبي',
    assignedByUserId: 'usr-3',
    status: 'completed',
    priority: 'urgent',
    dueDate: '2026-09-06',
    estimatedHours: 3,
    actualHours: 2.8,
    completionNotes:
      'تم تنظيف المجس بنجاح وضبط نسبة الخطأ من +18 ppm إلى 0 ppm باستخدام غاز المعايرة المعتمد. القراءات على SCADA الآن مستقرة عند 145 ppm.',
    checklist: [
      {
        id: 'c31',
        textAr: 'فصل الإنذار التلقائي مؤقتاً في لوحة SCADA',
        textEn: 'Temporarily bypass PLC safety trip alarm',
        completed: true,
      },
      {
        id: 'c32',
        textAr: 'تطبيق غاز التصفير Zero Gas ومعايرة الصفر',
        textEn: 'Apply synthetic air zero gas and adjust baseline',
        completed: true,
      },
      {
        id: 'c33',
        textAr: 'تطبيق غاز المعايرة Span Gas وضبط النطاق',
        textEn: 'Apply 500 ppm calibration gas and adjust span',
        completed: true,
      },
      {
        id: 'c34',
        textAr: 'إعادة تفعيل إنذارات SCADA وتوثيق القراءة المعتمدة',
        textEn: 'Reactivate SCADA telemetry alarm thresholds',
        completed: true,
      },
    ],
    attachments: [],
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-06T14:30:00Z',
  },
  {
    id: 'tsk-4',
    taskCode: 'TSK-004',
    titleAr: 'فحص وضبط خلوص شمعات الاحتراق (MWM Iridium Spark Plugs) للمولد #2',
    titleEn: 'Inspect & Gap MWM Iridium Spark Plugs for Genset #2',
    descriptionAr:
      'فك كامل شمعات الاحتراق (16 شمعة)، فحص التآكل الكهربائي، وتنظيف الرواسب الكربونية وضبط الخلوص عند 0.30 مم.',
    descriptionEn:
      'Remove all 16 spark plugs, check electrode wear, ultrasonic clean carbon deposits, and calibrate gap to 0.30 mm.',
    assignedToUserId: 'usr-4',
    assignedToName: 'فني. محمود العبادي',
    assignedByUserId: 'usr-3',
    status: 'pending',
    priority: 'high',
    dueDate: '2026-09-10',
    estimatedHours: 4,
    checklist: [
      {
        id: 'c41',
        textAr: 'عزل المولد كهربائياً وميكانيكياً وإغلاق محبس الغاز اليدوي',
        textEn: 'LOTO isolation and close manual gas valve',
        completed: false,
      },
      {
        id: 'c42',
        textAr: 'فك كوابل الإشعال بحذر وفحص عوازل التفلون',
        textEn: 'Remove ignition leads and inspect Teflon sleeves',
        completed: false,
      },
      {
        id: 'c43',
        textAr: 'قياس خلوص الأقطاب باستخدام فيلر دقيق وضبطها على 0.30 مم',
        textEn: 'Measure spark gap with feeler gauge and set to 0.30mm',
        completed: false,
      },
      {
        id: 'c44',
        textAr: 'إعادة الشد باستخدام عزم الربط المعتمد من MWM (35 Nm)',
        textEn: 'Torque spark plugs to MWM specification (35 Nm)',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T08:00:00Z',
    updatedAt: '2026-09-07T08:00:00Z',
  },
  {
    id: 'tsk-5',
    taskCode: 'TSK-005',
    titleAr: 'معايرة مسبار الحموضة (pH Probe) ومحلول المغذيات في برج إزالة الكبريت',
    titleEn: 'Calibrate pH Sensor & Bacterial Nutrients in Biogas Scrubber',
    descriptionAr:
      'معايرة إلكترود قياس الـ pH بمحاليل المعايرة (pH 4.01 و pH 7.00) وضخ 50 لتر من المحلول المغذي للبكتيريا المؤكسدة للكبريت.',
    descriptionEn:
      'Perform 2-point pH calibration, inspect recirculation pump nozzle pressure, and replenish liquid micro-nutrients.',
    assignedToUserId: 'usr-6',
    assignedToName: 'طارق حداد',
    assignedByUserId: 'usr-3',
    status: 'in_progress',
    priority: 'medium',
    dueDate: '2026-09-08',
    estimatedHours: 3,
    actualHours: 1.5,
    checklist: [
      {
        id: 'c51',
        textAr: 'غسل مسبار الـ pH بالماء المقطر ومعايرته بنظام البفر القياسي',
        textEn: 'Clean pH probe with deionized water and buffer 4/7',
        completed: true,
      },
      {
        id: 'c52',
        textAr: 'فحص وتوثيق قيمة الـ pH في الحوض (المعيار 1.8 - 2.2)',
        textEn: 'Record sump pH (operating target: 1.8 - 2.2)',
        completed: true,
      },
      {
        id: 'c53',
        textAr: 'ضخ كمية المغذيات البيولوجية وإعادة ضبط معدل الجرعات',
        textEn: 'Replenish nutrient tank and set dosing rate',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T06:00:00Z',
    updatedAt: '2026-09-07T10:00:00Z',
  },
  {
    id: 'tsk-6',
    taskCode: 'TSK-006',
    titleAr: 'فحص اهتزازات محامل مروحة سحب الغاز الحيوي الرئيسية (Biogas Blower A)',
    titleEn: 'Vibration Analysis on Biogas Blower A Bearings & Drive Coupling',
    descriptionAr:
      'استخدام جهاز قياس الاهتزازات المحمول لفحص رولمان بلي المروحة ومحاذاة السير للتأكد من عدم تجاوز حد الإنذار (2.8 mm/s RMS).',
    descriptionEn:
      'Measure overall velocity vibration (RMS) on drive/non-drive bearings, check belt tension and pulley alignment.',
    assignedToUserId: 'usr-4',
    assignedToName: 'فني. محمود العبادي',
    assignedByUserId: 'usr-3',
    status: 'completed',
    priority: 'high',
    dueDate: '2026-09-05',
    estimatedHours: 2,
    actualHours: 1.8,
    completionNotes:
      'الاهتزاز المقاس عند المحامل 1.3 mm/s (ضمن النطاق الآمن الأخضر). تم تشحيم المحامل بشحم درجات الحرارة العالية.',
    checklist: [
      {
        id: 'c61',
        textAr: 'قياس الاهتزاز في المحاور الثلاثة (أفقي، عمودي، محوري)',
        textEn: 'Record vibration in horizontal, vertical, and axial axes',
        completed: true,
      },
      {
        id: 'c62',
        textAr: 'فحص حرارة كراسي التحميل باستخدام كاميرا الأشعة تحت الحمراء',
        textEn: 'Thermal IR imaging of bearing housings (< 65°C)',
        completed: true,
      },
      {
        id: 'c63',
        textAr: 'تشحيم المحامل بنوع الشحم المعتمد وتوثيق الكمية',
        textEn: 'Grease bearings with SKF LGHP 2',
        completed: true,
      },
    ],
    attachments: [],
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-05T11:30:00Z',
  },
  {
    id: 'tsk-7',
    taskCode: 'TSK-007',
    titleAr: 'اختبار التزامن الكهربائي (Synchronization Test) لمولد MWM #3 مع الشبكة الوطنية',
    titleEn: 'Electrical Synchronization & Protection Relay Test for MWM #3',
    descriptionAr:
      'فحص عمل قاطع المولد الرئيسي 400V، ومطابقة التردد والجهد وزاوية الطور مع الشبكة الوطنية 11kV عبر محول الرفع.',
    descriptionEn:
      'Test auto-synchronizer parameters, check synchro-check relay (ANSI 25), and verify breaker closing timings.',
    assignedToUserId: 'usr-5',
    assignedToName: 'فني. إبراهيم الزعبي',
    assignedByUserId: 'usr-3',
    status: 'pending',
    priority: 'urgent',
    dueDate: '2026-09-09',
    estimatedHours: 3,
    checklist: [
      {
        id: 'c71',
        textAr: 'فحص إشارات الجهد والتردد القادمة من محولات القياس PTs',
        textEn: 'Verify voltage and frequency inputs from PTs',
        completed: false,
      },
      {
        id: 'c72',
        textAr: 'محاكاة عملية التزامن اليدوي والتلقائي عبر لوحة المولد',
        textEn: 'Simulate manual and automatic sync via switchgear',
        completed: false,
      },
      {
        id: 'c73',
        textAr: 'التأكد من توقيت فتح وإغلاق القاطع الهوائي ACB',
        textEn: 'Verify ACB closing time and contact wear',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T11:00:00Z',
    updatedAt: '2026-09-07T11:00:00Z',
  },
  {
    id: 'tsk-8',
    taskCode: 'TSK-008',
    titleAr: 'تفريغ وتنظيف مصائد التكثيف وفلاتر الغاز الأولية (Gravel & Condensate Filters)',
    titleEn: 'Purge Condensate Traps & Clean Gravel Filter Media',
    descriptionAr:
      'تفريغ مياه التكثيف المجمعة في خط الغاز الرئيسي وتنظيف الفلتر الحصوي لضمان عدم وصول قطرات الماء إلى المولدات.',
    descriptionEn:
      'Blow down all manual condensate drains, check automatic drain float valves, measure differential pressure.',
    assignedToUserId: 'usr-6',
    assignedToName: 'طارق حداد',
    assignedByUserId: 'usr-3',
    status: 'completed',
    priority: 'medium',
    dueDate: '2026-09-06',
    estimatedHours: 2,
    actualHours: 2.0,
    completionNotes:
      'تم تفريغ ما يقارب 120 لتر ماء تكثيف من المصائد الأربع والتأكد من سلامة صمامات العوامات التلقائية.',
    checklist: [
      {
        id: 'c81',
        textAr: 'إغلاق صمامات العزل وفتح مصائد التكثيف بحذر مع ارتداء كمامة الغاز',
        textEn: 'Drain condensation traps wearing organic vapor respirator',
        completed: true,
      },
      {
        id: 'c82',
        textAr: 'تسجيل قراءة الضغط التفاضلي قبل وبعد الفلتر الحصوي',
        textEn: 'Log differential pressure (drained at < 15 mbar)',
        completed: true,
      },
      {
        id: 'c83',
        textAr: 'فحص عدم وجود تسريب غاز حول الصمامات بمستشعر الغاز المحمول',
        textEn: 'Gas leak check around flanged fittings',
        completed: true,
      },
    ],
    attachments: [],
    createdAt: '2026-09-06T06:00:00Z',
    updatedAt: '2026-09-06T09:30:00Z',
  },
  {
    id: 'tsk-9',
    taskCode: 'TSK-009',
    titleAr: 'فحص واختبار صمام الأمان سريع الإغلاق لقطار الغاز (Gas Train Quick-Closing Valve)',
    titleEn: 'Operational Trip Test of Gas Train Safety Shut-off Valves',
    descriptionAr:
      'اختبار سرعة الإغلاق التلقائي لصمامات الغاز المزدوجة (Double Solenoid Valves) عند انخفاض الضغط أو استشعار حريق.',
    descriptionEn:
      'Perform leak-tightness test (DIN EN 161) and verify shut-off time (< 1 sec) on emergency trip command.',
    assignedToUserId: 'usr-4',
    assignedToName: 'فني. محمود العبادي',
    assignedByUserId: 'usr-3',
    status: 'in_progress',
    priority: 'urgent',
    dueDate: '2026-09-08',
    estimatedHours: 3,
    actualHours: 1.2,
    checklist: [
      {
        id: 'c91',
        textAr: 'فصل المولد وتفعيل إشارة الإغلاق الطارئ ESD للتأكد من انطباق الصمام',
        textEn: 'Trigger emergency stop trip and verify immediate valve slam-shut',
        completed: true,
      },
      {
        id: 'c92',
        textAr: 'فحص عدم وجود تسريب داخلي بين الصمامين باستخدام جهاز اختبار التسريب',
        textEn: 'Run valve proving system (VPS) test',
        completed: false,
      },
      {
        id: 'c93',
        textAr: 'توثيق زمن الإغلاق والضغط في سجل فحص قطار الغاز',
        textEn: 'Record closure time and seal condition',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T09:00:00Z',
    updatedAt: '2026-09-07T11:45:00Z',
  },
  {
    id: 'tsk-10',
    taskCode: 'TSK-010',
    titleAr: 'معايرة حساسات الأكسجين المتبقي (Lambda Sensors) ونظام TEM لمولد MWM #1',
    titleEn: 'Calibrate Lambda Oxygen Sensors & TEM Engine Control on MWM #1',
    descriptionAr:
      'معايرة حساس Lambda في عادم المحرك ومطابقة نسبة الهواء/الوقود في نظام TEM لضمان الاحتراق النظيف والأداء المستقر.',
    descriptionEn:
      'Inspect Bosch broadband Lambda sensor, verify calibration curve in TEM control, test mixture controller response.',
    assignedToUserId: 'usr-5',
    assignedToName: 'فني. إبراهيم الزعبي',
    assignedByUserId: 'usr-3',
    status: 'pending',
    priority: 'high',
    dueDate: '2026-09-10',
    estimatedHours: 3,
    checklist: [
      {
        id: 'c101',
        textAr: 'فحص مظهر طرف الحساس والتأكد من خلوه من التسمم الكبريتي أو السيليكوني',
        textEn: 'Inspect sensor tip for sulfur/siloxane poisoning',
        completed: false,
      },
      {
        id: 'c102',
        textAr: 'معايرة نقطة الصفر ونقطة الهواء الحر عبر برنامج TEM-EVO',
        textEn: 'Calibrate sensor in free air via TEM-EVO software',
        completed: false,
      },
      {
        id: 'c103',
        textAr: 'تشغيل المحرك والتحقق من استقرار قيمة Lambda عند 1.62 ± 0.03',
        textEn: 'Verify lean-burn lambda stabilization at 1.62 under load',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T12:00:00Z',
    updatedAt: '2026-09-07T12:00:00Z',
  },
  {
    id: 'tsk-11',
    taskCode: 'TSK-011',
    titleAr: 'فحص ضغوط ومستويات وسيط التبريد في مبرد تجفيف الغاز (Biogas Chiller 12°C)',
    titleEn: 'Check Refrigerant Pressures & Dew Point on Biogas Chiller Unit',
    descriptionAr:
      'فحص ضغط الغاز R134a، وتنظيف المكثف الهوائي، والتأكد من خفض درجة حرارة الغاز الحيوي إلى 12°C لتكثيف الرطوبة.',
    descriptionEn:
      'Monitor suction/discharge refrigerant pressures, inspect subcooling, wash condenser fins, ensure 12°C gas outlet.',
    assignedToUserId: 'usr-4',
    assignedToName: 'فني. محمود العبادي',
    assignedByUserId: 'usr-3',
    status: 'pending',
    priority: 'medium',
    dueDate: '2026-09-11',
    estimatedHours: 2,
    checklist: [
      {
        id: 'c111',
        textAr: 'قياس ضغط السحب والطرد لكمبريسور التبريد',
        textEn: 'Check suction & discharge refrigerant pressures',
        completed: false,
      },
      {
        id: 'c112',
        textAr: 'فحص نظافة زعانف المكثف وإزالة الأتربة باستخدام الهواء المضغوط',
        textEn: 'Blow out air condenser coil fins',
        completed: false,
      },
      {
        id: 'c113',
        textAr: 'التحقق من عمل مضخة طرد مياه التكثيف الأوتوماتيكية',
        textEn: 'Verify condensate auto-drain pump operation',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-08T06:00:00Z',
    updatedAt: '2026-09-08T06:00:00Z',
  },
  {
    id: 'tsk-12',
    taskCode: 'TSK-012',
    titleAr: 'قياس كفاءة الاحتراق وانبعاثات العادم (CO, NOx) لمولد MWM #2',
    titleEn: 'Flue Gas Emissions & Combustion Efficiency Analysis on MWM #2',
    descriptionAr:
      'قياس مستويات انبعاثات أول أكسيد الكربون CO وأكاسيد النيتروجين NOx ودرجة حرارة العادم بجهاز تحليل الغازات Testo 350.',
    descriptionEn:
      'Measure CO, NOx, O2 and exhaust temp at 100% baseload. Confirm compliance with environmental emission limits.',
    assignedToUserId: 'usr-6',
    assignedToName: 'طارق حداد',
    assignedByUserId: 'usr-3',
    status: 'completed',
    priority: 'high',
    dueDate: '2026-09-07',
    estimatedHours: 3,
    actualHours: 2.5,
    completionNotes:
      'NOx المقاس 480 mg/Nm³ (الحد المسموح 500)، CO عند 620 mg/Nm³، وكفاءة المحرك الحرارية 42.1%. النتائج ممتازة.',
    checklist: [
      {
        id: 'c121',
        textAr: 'إدخال مسبار العادم في الفتحة المعتمدة بعد التوربوشارجر',
        textEn: 'Insert probe into calibrated exhaust port after turbo',
        completed: true,
      },
      {
        id: 'c122',
        textAr: 'تسجيل القراءات عند 50% و 75% و 100% من الحمل الكهربائي',
        textEn: 'Log emissions at multiple generator load steps',
        completed: true,
      },
      {
        id: 'c123',
        textAr: 'طباعة تقرير الفحص وتضمينه في سجلات الالتزام البيئي للمحطة',
        textEn: 'Print calibration report and file in compliance folder',
        completed: true,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T07:30:00Z',
    updatedAt: '2026-09-07T12:30:00Z',
  },
  {
    id: 'tsk-13',
    taskCode: 'TSK-013',
    titleAr: 'فحص محاذاة الكوبلنغ بالليزر بين محرك MWM والمولد الكهربائي الرئيسي #3',
    titleEn: 'Laser Alignment Verification of MWM Engine to Alternator Coupling #3',
    descriptionAr:
      'التحقق من عدم وجود أي انحراف زاوي أو موازي (Angular & Parallel Misalignment) لتفادي تلف كراسي التحميل.',
    descriptionEn:
      'Use Optalign laser system to measure cold/hot thermal growth alignment tolerances (< 0.05 mm).',
    assignedToUserId: 'usr-4',
    assignedToName: 'فني. محمود العبادي',
    assignedByUserId: 'usr-3',
    status: 'pending',
    priority: 'urgent',
    dueDate: '2026-09-12',
    estimatedHours: 4,
    checklist: [
      {
        id: 'c131',
        textAr: 'عزل المولد كهربائياً وتركيب أجهزة الليزر على طرفي الكوبلنغ',
        textEn: 'LOTO isolation and mount laser bracket fixtures',
        completed: false,
      },
      {
        id: 'c132',
        textAr: 'تدوير العمود 360 درجة وقراءة قيم الانحراف على الشاشة الرقمية',
        textEn: 'Rotate shaft and record dial measurements',
        completed: false,
      },
      {
        id: 'c133',
        textAr: 'فحص الخلوصات وتوثيق بطاقة المحاذاة النهائية',
        textEn: 'Log final shim values and print alignment report',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-08T07:00:00Z',
    updatedAt: '2026-09-08T07:00:00Z',
  },
  {
    id: 'tsk-14',
    taskCode: 'TSK-014',
    titleAr: 'اختبار نظام الإشعال التلقائي للشعلة المغلقة ذات درجات الحرارة العالية (Enclosed Flare)',
    titleEn: 'Auto-Ignition & Safety Flame Scanner Test on High-Temp Flare',
    descriptionAr:
      'فحص شمعة الإشعال التلقائي ومجس اللهب البصري (UV Flame Scanner) وصمامات الغاز للشعلة المستخدمة في حالات الطوارئ.',
    descriptionEn:
      'Test pilot spark generator, inspect UV flame detector, verify gas burner modulation and 1000°C combustion temp.',
    assignedToUserId: 'usr-5',
    assignedToName: 'فني. إبراهيم الزعبي',
    assignedByUserId: 'usr-3',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-09-08',
    estimatedHours: 3,
    actualHours: 1.5,
    checklist: [
      {
        id: 'c141',
        textAr: 'تنظيف عدسة حساس اللهب UV وتجربة استجابته',
        textEn: 'Clean UV scanner lens and test flame signal response',
        completed: true,
      },
      {
        id: 'c142',
        textAr: 'اختبار شرارة الإشعال بشمعة الغاز التجريبية Pilot Burner',
        textEn: 'Test ignition transformer and pilot spark gap',
        completed: true,
      },
      {
        id: 'c143',
        textAr: 'محاكاة بدء تشغيل الشعلة عند ارتفاع ضغط الغاز والتأكد من فتح الصمامات',
        textEn: 'Simulate overpressure start trigger sequence',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T08:30:00Z',
    updatedAt: '2026-09-08T08:00:00Z',
  },
  {
    id: 'tsk-15',
    taskCode: 'TSK-015',
    titleAr: 'فحص محولات الرفع 0.4kV / 11kV وعزل القواطع الرئيسية للمحطة',
    titleEn: 'Step-Up Transformer & 11kV Switchgear Insulation Resistance Inspection',
    descriptionAr:
      'فحص حرارة أطراف التوصيل بالكاميرا الحرارية واختبار مقاومة العزل Megger للطور إلى الأرض والطور إلى الطور.',
    descriptionEn:
      'Perform Megger insulation test on 11kV step-up transformer windings, check silica gel breather, scan busbars.',
    assignedToUserId: 'usr-5',
    assignedToName: 'فني. إبراهيم الزعبي',
    assignedByUserId: 'usr-3',
    status: 'completed',
    priority: 'high',
    dueDate: '2026-09-06',
    estimatedHours: 4,
    actualHours: 3.5,
    completionNotes:
      'مقاومة العزل أعلى من 850 Megaohms لجميع الأطوار. لون جل السيليكا أزرق سليم ولا توجد نقاط ساخنة في القواطع.',
    checklist: [
      {
        id: 'c151',
        textAr: 'فحص مستوى ولون زيت المحول ومظهر جل السيليكا في منفس المحول',
        textEn: 'Inspect transformer oil level and silica gel condition',
        completed: true,
      },
      {
        id: 'c152',
        textAr: 'فحص التوصيلات الكهربائية بالأشعة تحت الحمراء عند ذروة الحمل',
        textEn: 'Infrared scan of 11kV bushings and cable terminations',
        completed: true,
      },
      {
        id: 'c153',
        textAr: 'اختبار استمرارية منظومة التأريض الرئيسية لغرفة المحولات',
        textEn: 'Verify main substation earthing continuity (< 1 Ohm)',
        completed: true,
      },
    ],
    attachments: [],
    createdAt: '2026-09-05T07:00:00Z',
    updatedAt: '2026-09-06T15:00:00Z',
  },
  {
    id: 'tsk-16',
    taskCode: 'TSK-016',
    titleAr: 'فحص دورة التبريد ذات درجات الحرارة المرتفعة HT والمنخفضة LT ومستوى مانع التجمد',
    titleEn: 'Inspect HT/LT Cooling Circuits, Glycol Concentration & Expansion Tanks',
    descriptionAr:
      'فحص تركيز سائل التبريد (Glycol) بمقياس الانكسار، ومستوى الضغط في خزانات التمدد، ونظافة ردياتيرات التبريد الخارجية.',
    descriptionEn:
      'Refractometer test of coolant mixture, check expansion vessel nitrogen charge, clean radiator cooling matrix.',
    assignedToUserId: 'usr-4',
    assignedToName: 'فني. محمود العبادي',
    assignedByUserId: 'usr-3',
    status: 'pending',
    priority: 'low',
    dueDate: '2026-09-13',
    estimatedHours: 2,
    checklist: [
      {
        id: 'c161',
        textAr: 'فحص نسبة الجلايكول والتأكد من حماية التجمد حتى -15°C',
        textEn: 'Check glycol concentration with optical refractometer',
        completed: false,
      },
      {
        id: 'c162',
        textAr: 'فحص ضغط خزان التمدد الهيدروليكي والتأكد من ثباته عند 1.8 bar',
        textEn: 'Inspect HT expansion vessel static pressure',
        completed: false,
      },
      {
        id: 'c163',
        textAr: 'التأكد من خلو مبرد الهواء الداخلي Intercooler من الرواسب',
        textEn: 'Inspect mixture LT circuit radiator fans',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-08T08:00:00Z',
    updatedAt: '2026-09-08T08:00:00Z',
  },
  {
    id: 'tsk-17',
    taskCode: 'TSK-017',
    titleAr: 'موازنة التدفق وسحب الغاز في آبار المكب الرئيسية (Wellheads W1 to W18)',
    titleEn: 'Wellfield Flow Balancing & Valve Tuning for Wells W1 through W18',
    descriptionAr:
      'ضبط المحابس البلاستيكية على رؤوس الآبار لتحقيق أقصى تدفق للميثان دون التسبب في دخول غاز الأكسجين والنيتروجين لشبكة السحب.',
    descriptionEn:
      'Fine-tune orifice plate throttling valves across southern wellfield. Maintain steady methane feedstock.',
    assignedToUserId: 'usr-6',
    assignedToName: 'طارق حداد',
    assignedByUserId: 'usr-3',
    status: 'in_progress',
    priority: 'medium',
    dueDate: '2026-09-09',
    estimatedHours: 4,
    actualHours: 2.0,
    checklist: [
      {
        id: 'c171',
        textAr: 'قياس الضغط السلبي في كل بئر وتوثيق نسبة CH4',
        textEn: 'Measure wellhead vacuum and gas composition',
        completed: true,
      },
      {
        id: 'c172',
        textAr: 'إغلاق المحابس جزئياً للآبار التي تحتوي على نسبة أكسجين أعلى من 1.5%',
        textEn: 'Throttle back wellheads with elevated O2 readings',
        completed: true,
      },
      {
        id: 'c173',
        textAr: 'فحص الأنابيب المرنة وتأكيد عدم وجود تشققات أو تسريب للهواء',
        textEn: 'Inspect flexible hose connections for weathering cracks',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T09:30:00Z',
    updatedAt: '2026-09-08T09:00:00Z',
  },
  {
    id: 'tsk-18',
    taskCode: 'TSK-018',
    titleAr: 'فحص وتنظيف فلتر سحب الهواء الرئيسي للمحركات (Air Intake Filters)',
    titleEn: 'Inspect & Service Heavy-Duty Combustion Air Intake Filter Cartridges',
    descriptionAr:
      'تنظيف خراطيش فلتر الهواء بالهواء الجاف المضغوط وفحص مؤشر الانسداد التفاضلي (Vacuum Restriction Indicator).',
    descriptionEn:
      'Check intake restriction gauge (< 25 mbar), blow reverse dry air, replace torn paper elements.',
    assignedToUserId: 'usr-4',
    assignedToName: 'فني. محمود العبادي',
    assignedByUserId: 'usr-3',
    status: 'completed',
    priority: 'low',
    dueDate: '2026-09-05',
    estimatedHours: 2,
    actualHours: 1.5,
    completionNotes:
      'تم تنظيف الفلاتر بالهواء المضغوط وفحص جلود الإحكام. مؤشر الانسداد انخفض إلى 8 mbar.',
    checklist: [
      {
        id: 'c181',
        textAr: 'فك خراطيش فلتر الهواء وفحص سلامة الورق والحلقات المطاطية',
        textEn: 'Disassemble air filter housing and inspect gaskets',
        completed: true,
      },
      {
        id: 'c182',
        textAr: 'التنظيف العكسي بالهواء المضغوط بضغط أقل من 3 bar',
        textEn: 'Reverse pulse clean filter cartridges (< 3 bar)',
        completed: true,
      },
      {
        id: 'c183',
        textAr: 'إعادة تصفير مؤشر الانسداد الميكانيكي على مدخل المحرك',
        textEn: 'Reset mechanical restriction indicator',
        completed: true,
      },
    ],
    attachments: [],
    createdAt: '2026-09-05T10:00:00Z',
    updatedAt: '2026-09-05T12:00:00Z',
  },
  {
    id: 'tsk-19',
    taskCode: 'TSK-019',
    titleAr: 'فحص واختبار حساسات تسريب الغاز CH4 و H2S في صالة المولدات المغلقة',
    titleEn: 'Gas Leak Detection System & Ventilation Interlock Functional Test',
    descriptionAr:
      'اختبار الحساسات الثابتة في صالة مولدات MWM بغاز الاختبار للتأكد من تشغيل مراوح التهوية الطارئة وإرسال إنذار فوري لنظام SCADA.',
    descriptionEn:
      'Bump test fixed CH4 LEL and H2S detectors in engine hall. Verify emergency ventilation fans trip at 20% LEL.',
    assignedToUserId: 'usr-5',
    assignedToName: 'فني. إبراهيم الزعبي',
    assignedByUserId: 'usr-3',
    status: 'pending',
    priority: 'urgent',
    dueDate: '2026-09-11',
    estimatedHours: 3,
    checklist: [
      {
        id: 'c191',
        textAr: 'اختبار حساس الميثان LEL بغاز المعايرة المعتمد والتأكد من إطلاق صفارة الإنذار',
        textEn: 'Bump test CH4 detector with 50% LEL canister',
        completed: false,
      },
      {
        id: 'c192',
        textAr: 'التأكد من التشغيل التلقائي لمراوح شفط الطوارئ المقاومة للانفجار ATEX',
        textEn: 'Verify ATEX emergency exhaust fans start automatically',
        completed: false,
      },
      {
        id: 'c193',
        textAr: 'تسجيل زمن الاستجابة في سجل السلامة وإبلاغ غرفة التحكم',
        textEn: 'Log response time and notify main control room',
        completed: false,
      },
    ],
    attachments: [],
    createdAt: '2026-09-08T08:30:00Z',
    updatedAt: '2026-09-08T08:30:00Z',
  },
  {
    id: 'tsk-20',
    taskCode: 'TSK-020',
    titleAr: 'معايرة عداد الطاقة ومطابقة إنتاجية المحطة الإجمالية 4.68 MWe مع شركة الكهرباء',
    titleEn: 'Main Revenue Meter Cross-Check & Total 4.68 MWe Power Delivery Verification',
    descriptionAr:
      'قراءة عدادات الطاقة الرئيسية (Class 0.2S Revenue Meters) ومطابقة الطاقة المصدرة للشبكة الوطنية مع سجلات الفوترة وسجلات المولدات الثلاثة.',
    descriptionEn:
      'Audit 11kV grid export revenue meters, check active/reactive MWh readings against SCADA historical trends.',
    assignedToUserId: 'usr-3',
    assignedToName: 'م. علاء الدين النجار',
    assignedByUserId: 'usr-1',
    status: 'completed',
    priority: 'high',
    dueDate: '2026-09-07',
    estimatedHours: 2,
    actualHours: 1.8,
    completionNotes:
      'تمت المطابقة مع شركة الكهرباء الوطنية (NEPCO). الإنتاجية اليومية للمحطة بلغت 108.4 MWh بمعامل قدرة 0.98 ومعدل توافر 98.6%.',
    checklist: [
      {
        id: 'c201',
        textAr: 'أخذ قراءات العداد الفعالة MWh وغير الفعالة MVArh لمخرجات المحولات',
        textEn: 'Record active & reactive energy counters on billing meters',
        completed: true,
      },
      {
        id: 'c202',
        textAr: 'مطابقة الأرقام مع سجلات إنتاجية المولدات الثلاثة (G1 + G2 + G3)',
        textEn: 'Reconcile sum of 3x MWM genset generation data',
        completed: true,
      },
      {
        id: 'c203',
        textAr: 'إصدار تقرير الإنتاجية اليومي المعتمد وإرساله لإدارة المحطة',
        textEn: 'Generate daily generation certified log for management',
        completed: true,
      },
    ],
    attachments: [],
    createdAt: '2026-09-07T06:00:00Z',
    updatedAt: '2026-09-07T14:00:00Z',
  },
];

const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-1',
    workOrderNumber: 'WO-2026-0142',
    type: 'corrective',
    priority: 'high',
    equipmentId: 'eq-3',
    equipmentCode: 'JBC-DESULF-01',
    assignedTechnicianId: 'usr-4',
    assignedTechnicianName: 'فني. محمود العبادي',
    createdById: 'usr-3',
    status: 'in_progress',
    problemDescription:
      'انخفاض تدفق محلول المغذيات البكتيرية وارتفاع الضغط التفاضلي عبر برج المعالجة البيولوجية إلى 45 mbar',
    safetyChecklist: [
      {
        id: 's1',
        labelAr: 'تطبيق إجراءات العزل وفصل الطاقة الميكانيكية والكهربائية (LOTO)',
        labelEn: 'Lockout/Tagout (LOTO) of main pump power and valves',
        checked: true,
      },
      {
        id: 's2',
        labelAr: 'فحص نسبة الغازات السامة H2S و CH4 في محيط العمل بأجهزة كشف شخصية',
        labelEn: 'Atmospheric gas testing for H2S and CH4 with portable detector',
        checked: true,
      },
      {
        id: 's3',
        labelAr: 'ارتداء معدات الوقاية الشخصية المقاومة للمواد الكيماوية وحزام الأمان',
        labelEn: 'Wear chemical-resistant gloves, full face shield and safety harness',
        checked: true,
      },
      {
        id: 's4',
        labelAr: 'وجود مراقب سلامة أرضي معتمد في الموقع طوال فترة العمل',
        labelEn: 'Certified safety standby observer present at site',
        checked: true,
      },
    ],
    sparePartsUsed: [
      {
        id: 'sp-1',
        partNumber: 'NOZ-SPIR-25',
        nameAr: 'فوهات رش حلزونية مضادة للانسداد (Spraying Nozzles)',
        nameEn: 'Spiral Desulf Non-Clog Spray Nozzle',
        quantity: 4,
        unitCostJOD: 65,
        totalCostJOD: 260,
      },
      {
        id: 'sp-2',
        partNumber: 'BIO-NUT-200L',
        nameAr: 'محلول مغذيات بكتيريا إزالة الكبريت (برميل 200 لتر)',
        nameEn: 'Bacterial Liquid Micro-Nutrient Feed 200L',
        quantity: 1,
        unitCostJOD: 420,
        totalCostJOD: 420,
      },
    ],
    downtimeHours: 3.5,
    actualHours: 4.2,
    createdAt: '2026-09-06T11:00:00Z',
    updatedAt: '2026-09-07T06:00:00Z',
  },
  {
    id: 'wo-2',
    workOrderNumber: 'WO-2026-0141',
    type: 'preventive',
    priority: 'medium',
    equipmentId: 'eq-1',
    equipmentCode: 'JBC-GEN-01',
    assignedTechnicianId: 'usr-4',
    assignedTechnicianName: 'فني. محمود العبادي',
    createdById: 'usr-3',
    status: 'completed',
    problemDescription:
      'صيانة دورية 250 ساعة: استبدال فلاتر زيت المحرك، وفحص خلوص الصمامات وشمعات الاحتراق (Spark Plugs)',
    actionTaken:
      'تم تفريغ واستبدال فلاتر الزيت الأولية والثانوية، وفحص فجوة شمعات الاحتراق وضبطها على 0.30 مم وتنظيف حساسات الضغط.',
    safetyChecklist: [
      {
        id: 's11',
        labelAr: 'تطبيق إجراءات العزل وفصل الطاقة الميكانيكية والكهربائية (LOTO)',
        labelEn: 'Lockout/Tagout (LOTO) of engine breaker & gas valve',
        checked: true,
      },
      {
        id: 's12',
        labelAr: 'إغلاق صمام الغاز الحيوي الرئيسي وتفريغ الخط الآمن',
        labelEn: 'Close manual main gas shut-off valve & vent safely',
        checked: true,
      },
      {
        id: 's13',
        labelAr: 'تأريض المحرك والتأكد من انخفاض درجة حرارة العادم',
        labelEn: 'Verify engine grounding and cold exhaust manifold',
        checked: true,
      },
      {
        id: 's14',
        labelAr: 'ارتداء بدلة العمل الواقية، النظارات، وقفازات الحرارة',
        labelEn: 'Full PPE including safety goggles and thermal gloves',
        checked: true,
      },
    ],
    sparePartsUsed: [
      {
        id: 'sp-11',
        partNumber: 'MWM-FLT-TCG2020',
        nameAr: 'طقم فلاتر زيت أصلية MWM TCG 2020 V16',
        nameEn: 'MWM TCG 2020 V16 Engine Lube Oil Filter Cartridges',
        quantity: 2,
        unitCostJOD: 180,
        totalCostJOD: 360,
      },
      {
        id: 'sp-12',
        partNumber: 'MWM-SPK-IRID12',
        nameAr: 'شمعات احتراق إيريديوم أصلية MWM لغاز المطامر (Spark Plugs)',
        nameEn: 'MWM Biogas Heavy-Duty Iridium Spark Plugs',
        quantity: 8,
        unitCostJOD: 85,
        totalCostJOD: 680,
      },
    ],
    downtimeHours: 4.0,
    actualHours: 3.8,
    createdAt: '2026-09-04T07:30:00Z',
    updatedAt: '2026-09-05T13:00:00Z',
  },
  {
    id: 'wo-3',
    workOrderNumber: 'WO-2026-0140',
    type: 'emergency',
    priority: 'urgent',
    equipmentId: 'eq-4',
    equipmentCode: 'JBC-BLOW-01',
    assignedTechnicianId: 'usr-5',
    assignedTechnicianName: 'فني. إبراهيم الزعبي',
    createdById: 'usr-2',
    status: 'closed',
    problemDescription:
      'توقف مفاجئ لمروحة الشفط Blower A بسبب ارتفاع اهتزاز المحامل (High Bearing Vibration Alarm > 6.2 mm/s)',
    actionTaken:
      'تم فحص محاذاة الكبلنغ بالليزر وتغيير رولمان بلي الأمامي والخلفي وتشحيمها بشحم خاص بدرجات الحرارة العالية SKF LGHP 2. الاهتزاز بعد التشغيل 1.4 mm/s.',
    safetyChecklist: [
      {
        id: 's21',
        labelAr: 'تطبيق إجراءات العزل وفصل الطاقة الميكانيكية والكهربائية (LOTO)',
        labelEn: 'Lockout/Tagout (LOTO)',
        checked: true,
      },
      {
        id: 's22',
        labelAr: 'تأكيد العزل الميداني وقفل مفتاح التشغيل المحلي',
        labelEn: 'Padlock local isolator switch in zero position',
        checked: true,
      },
      {
        id: 's23',
        labelAr: 'فحص تركيز الغازات في الغرفة الميكانيكية قبل البدء',
        labelEn: 'Gas check in blower room',
        checked: true,
      },
      {
        id: 's24',
        labelAr: 'فحص عدم وجود ضغط متبقي في خط الشفط',
        labelEn: 'Verify zero pipeline differential pressure',
        checked: true,
      },
    ],
    sparePartsUsed: [
      {
        id: 'sp-21',
        partNumber: 'SKF-6312-C3',
        nameAr: 'محامل كروية SKF عالية التحمل (Bearings)',
        nameEn: 'SKF 6312/C3 Deep Groove Ball Bearings',
        quantity: 2,
        unitCostJOD: 110,
        totalCostJOD: 220,
      },
      {
        id: 'sp-22',
        partNumber: 'SKF-LGHP-400G',
        nameAr: 'شحم محامل حراري SKF LGHP 2',
        nameEn: 'SKF High Performance Bearing Grease 400g',
        quantity: 1,
        unitCostJOD: 25,
        totalCostJOD: 25,
      },
    ],
    downtimeHours: 5.5,
    actualHours: 5.0,
    closedById: 'usr-3',
    closedByName: 'م. عمر المجالي',
    closedAt: '2026-09-03T16:00:00Z',
    createdAt: '2026-09-03T08:00:00Z',
    updatedAt: '2026-09-03T16:00:00Z',
  },
];

const INITIAL_PM_SCHEDULES: PMSchedule[] = [
  {
    id: 'pm-1',
    equipmentId: 'eq-1',
    titleAr: 'صيانة وقائية دورية كل 500 ساعة تشغيل (مولد MWM #1 - قدرة 1.56 MWe)',
    titleEn: '500-Operating-Hours PM Routine (MWM Genset #1 - 1.56 MWe)',
    frequency: 'operating_hours',
    operatingHoursInterval: 500,
    nextDueDate: '2026-09-12',
    lastTriggeredDate: '2026-08-20',
    steps: [
      'تفريغ عينة زيت محرك ساخنة وإرسالها للمختبر لفحص اللزوجة والرقم القلوي TBN',
      'استبدال خراطيش فلاتر زيت التزييت الرئيسية وتنظيف حوض الفلتر الداخلي',
      'فحص وضبط خلوص صمامات السحب والعادم (Inlet: 0.30mm, Exhaust: 0.40mm)',
      'فحص وتنظيف شمعات الاحتراق الصناعية وضبط فجوة القطب على 0.30 مم',
      'فحص ضغط دائرة تبريد الغلاف المائي والمبادل الحراري لغاز التبريد',
      'فحص مجسات الطرق والاهتزاز Knock Sensors ومعايرة سرعة الخمول',
    ],
    autoGenerateWorkOrder: true,
  },
  {
    id: 'pm-2',
    equipmentId: 'eq-2',
    titleAr: 'صيانة دورية كل 1000 ساعة: فحص قطار الغاز ومنظومة الخلط TEM (مولد MWM #2)',
    titleEn: '1,000-Hours Gas Train & TEM System Calibration (MWM Genset #2)',
    frequency: 'operating_hours',
    operatingHoursInterval: 1000,
    nextDueDate: '2026-09-15',
    lastTriggeredDate: '2026-08-15',
    steps: [
      'فحص محابس الغاز الآمنة سريعة الإغلاق والتحقق التام من عدم وجود أي تسريب',
      'تنظيف واستبدال فلاتر الغاز الحيوي الأولية الدقيقة (10 ميكرون)',
      'معايرة نظام التحكم والمراقبة الإلكتروني TEM وفحص حساسات Lambda',
      'فحص محاذاة الكوبلنغ بالليزر وفحص رمان بلي المولد الكهربائي الرئيسي',
      'فحص نظام التحكم في الشحن التوربيني Turbocharger وصمام التنفيس Wastegate',
    ],
    autoGenerateWorkOrder: true,
  },
  {
    id: 'pm-3',
    equipmentId: 'eq-3',
    titleAr: 'صيانة وقائية دورية كل 2000 ساعة: فحص منظومة الاشتعال والتوربو (مولد MWM #3)',
    titleEn: '2,000-Hours Ignition & Turbocharger Inspection (MWM Genset #3)',
    frequency: 'operating_hours',
    operatingHoursInterval: 2000,
    nextDueDate: '2026-09-20',
    lastTriggeredDate: '2026-08-10',
    steps: [
      'استبدال كامل طقم شمعات الاحتراق الخاصة بغاز المطامر MWM Iridium Plugs',
      'فحص عمود التوربين وخلوص الريش المحورية والشعاعية للتوربوشارجر',
      'فحص واختبار عمل صمامات التهوية لحجرة المحرك (Crankcase Ventilation)',
      'فحص عوازل المولد الكهربائي واختبار المقاومة Megger Test للملفات',
      'معايرة صمامات الأمان وتوثيق كفاءة الاحتراق عبر جهاز تحليل العادم',
    ],
    autoGenerateWorkOrder: true,
  },
  {
    id: 'pm-4',
    equipmentId: 'eq-4',
    titleAr: 'صيانة أسبوعية: فحص مضخات برج إزالة كبريتيد الهيدروجين والمعايرة',
    titleEn: 'Weekly Biological Scrubber Recirculation & pH Calibration',
    frequency: 'weekly',
    nextDueDate: '2026-09-10',
    lastTriggeredDate: '2026-09-03',
    steps: [
      'معايرة مسبار الحموضة pH بمحاليل المعايرة القياسية 4 و 7',
      'فحص تدفق مضخة تدوير المحلول وضغط الفوهات وتوزيع الرذاذ',
      'تزويد خزان المغذيات الحيوية البكتيرية Nutrient Solution',
      'فحص نظام تسخين المحلول لضمان ثبات درجة الحرارة بين 32-35 °C',
    ],
    autoGenerateWorkOrder: true,
  },
];

const INITIAL_LEAVES: LeaveRequest[] = [
  {
    id: 'lev-1',
    employeeId: 'emp-4',
    leaveType: 'annual',
    startDate: '2026-09-14',
    endDate: '2026-09-16',
    daysCount: 3,
    reason: 'إجازة سنوية لظروف عائلية خاصة مع ترتيب المناوبة',
    replacementEmployeeId: 'emp-5',
    status: 'pending',
    createdAt: '2026-09-05T10:00:00Z',
  },
  {
    id: 'lev-2',
    employeeId: 'emp-6',
    leaveType: 'sick',
    startDate: '2026-08-28',
    endDate: '2026-08-29',
    daysCount: 2,
    reason: 'إجازة مرضية بموجب تقرير طبي معتمد من المركز الصحي',
    replacementEmployeeId: 'emp-4',
    status: 'approved',
    approvedById: 'usr-3',
    approvedByName: 'م. عمر المجالي',
    createdAt: '2026-08-27T14:20:00Z',
  },
];

const INITIAL_PERMISSIONS: PermissionRequest[] = [
  {
    id: 'prm-1',
    employeeId: 'emp-5',
    date: '2026-09-08',
    startTime: '13:00',
    endTime: '15:00',
    durationHours: 2.0,
    reasonType: 'official',
    reason: 'مهمة رسمية لإحضار أجهزة قياس الضغط بعد معايرتها في الجمعية العلمية الملكية',
    status: 'pending',
    createdAt: '2026-09-07T06:30:00Z',
  },
  {
    id: 'prm-2',
    employeeId: 'emp-4',
    date: '2026-09-01',
    startTime: '14:00',
    endTime: '15:30',
    durationHours: 1.5,
    reasonType: 'personal',
    reason: 'مراجعة طبية عاجلة',
    status: 'approved',
    approvedById: 'usr-3',
    approvedByName: 'م. عمر المجالي',
    createdAt: '2026-08-31T11:00:00Z',
  },
];

const INITIAL_DOCUMENTS: PlantDocument[] = [
  {
    id: 'doc-1',
    titleAr: 'دليل تشغيل وصيانة محركات MWM TCG 2020 V16 المعتمد',
    titleEn: 'MWM TCG 2020 V16 Operation & Maintenance Manual',
    category: 'manuals',
    fileType: 'pdf',
    fileSizeBytes: 14200000,
    url: '#',
    tags: ['MWM', 'TCG-2020', 'Engine', 'Manual'],
    uploadedById: 'usr-1',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'doc-2',
    titleAr: 'إجراءات السلامة العامة وعزل الطاقة الكهربائية والميكانيكية (LOTO SOP)',
    titleEn: 'Standard Operating Procedure: Lockout/Tagout (LOTO) & Confined Space',
    category: 'safety',
    fileType: 'pdf',
    fileSizeBytes: 4800000,
    url: '#',
    tags: ['Safety', 'LOTO', 'SOP', 'H2S'],
    uploadedById: 'usr-2',
    createdAt: '2026-02-14T08:30:00Z',
  },
  {
    id: 'doc-3',
    titleAr: 'كتالوج قطع الغيار الأصلية لمحطة معالجة الغاز وإزالة الكبريت',
    titleEn: 'Biological Desulfurization Plant Spare Parts Catalog',
    category: 'catalogs',
    fileType: 'pdf',
    fileSizeBytes: 8900000,
    url: '#',
    tags: ['Desulf', 'Spare Parts', 'Pumps', 'Nozzles'],
    uploadedById: 'usr-3',
    createdAt: '2026-03-20T12:00:00Z',
  },
  {
    id: 'doc-4',
    titleAr: 'المخططات الكهربائية والتحكم SCADA لمحطة التوليد - الغباوي',
    titleEn: 'Al-Ghabawi Biogas Plant Electrical & SCADA Wiring Diagrams',
    category: 'procedures',
    fileType: 'pdf',
    fileSizeBytes: 22400000,
    url: '#',
    tags: ['Electrical', 'SCADA', 'Wiring', 'PLC'],
    uploadedById: 'usr-1',
    createdAt: '2026-04-05T15:10:00Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    userId: 'usr-3',
    userName: 'م. عمر المجالي',
    action: 'إغلاق أمر صيانة WO-2026-0140 واعتماد الإجراء الفني',
    entity: 'WorkOrder',
    entityId: 'wo-3',
    oldValue: 'completed',
    newValue: 'closed',
    timestamp: '2026-09-03T16:00:00Z',
    ipAddress: '10.20.4.15',
  },
  {
    id: 'aud-2',
    userId: 'usr-4',
    userName: 'فني. محمود العبادي',
    action: 'تحديث قائمة السلامة LOTO وتوثيق فحص الغازات لأمر WO-2026-0142',
    entity: 'WorkOrder',
    entityId: 'wo-1',
    oldValue: 'new',
    newValue: 'in_progress',
    timestamp: '2026-09-06T11:30:00Z',
    ipAddress: '10.20.4.88 (Mobile Android)',
  },
  {
    id: 'aud-3',
    userId: 'usr-5',
    userName: 'فني. إبراهيم الزعبي',
    action: 'إكمال المهمة الميدانية TSK-088 وتوثيق قراءات معايرة الحساس',
    entity: 'Task',
    entityId: 'tsk-3',
    oldValue: 'in_progress',
    newValue: 'completed',
    timestamp: '2026-09-06T14:30:00Z',
    ipAddress: '10.20.4.92 (Field Tablet)',
  },
];

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    userId: 'usr-4',
    titleAr: 'أمر صيانة جديد مسند إليك',
    titleEn: 'New Work Order Assigned',
    messageAr: 'تم إسناد أمر الصيانة رقم WO-2026-0142 (معالجة برج إزالة الكبريت) إليك.',
    messageEn: 'Work order WO-2026-0142 for Desulfurization Tower assigned to you.',
    type: 'warning',
    read: false,
    actionUrl: 'maintenance',
    createdAt: '2026-09-06T11:00:00Z',
  },
  {
    id: 'notif-2',
    userId: 'usr-3',
    titleAr: 'طلب إجازة سنوية جديد بانتظار موافقتك',
    titleEn: 'New Leave Request Pending Approval',
    messageAr: 'قدم الفني محمود العبادي طلب إجازة سنوية لمدة 3 أيام تبدأ 14 أيلول.',
    messageEn: 'Technician Mahmoud Abbadi submitted a 3-day annual leave request.',
    type: 'info',
    read: false,
    actionUrl: 'requests',
    createdAt: '2026-09-05T10:05:00Z',
  },
  {
    id: 'notif-3',
    userId: 'usr-1',
    titleAr: 'تنبيه صيانة وقائية مستحقة',
    titleEn: 'PM Schedule Due Notification',
    messageAr: 'مولد الغاز رقم 1 يقترب من حاجز 250 ساعة تشغيل وتستحق الصيانة الدورية.',
    messageEn: 'Genset #1 is approaching 250 operating hours threshold.',
    type: 'alert',
    read: true,
    actionUrl: 'pm',
    createdAt: '2026-09-06T08:00:00Z',
  },
];

class DatabaseService {
  private get<T>(key: string, initial: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data) as T;
    } catch {
      return initial;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Asynchronously push update to Firebase Firestore for real-time multi-device sync
      firestoreSync.pushUpdate(key, value);
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  public resetToDefaults(): void {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(TASKS_KEY);
    localStorage.removeItem(WORK_ORDERS_KEY);
    localStorage.removeItem(EQUIPMENT_KEY);
    localStorage.removeItem(PM_SCHEDULES_KEY);
    localStorage.removeItem(LEAVES_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    localStorage.removeItem(EMPLOYEES_KEY);
    localStorage.removeItem(DOCUMENTS_KEY);
    localStorage.removeItem(AUDIT_LOGS_KEY);
    localStorage.removeItem(NOTIFICATIONS_KEY);

    this.getUsers();
    this.getTasks();
    this.getWorkOrders();
    this.getEquipment();
    this.getPMSchedules();
    this.getLeaveRequests();
    this.getPermissionRequests();
    this.getEmployees();
    this.getDocuments();
    this.getAuditLogs();
    this.getNotifications();
  }

  // AUDIT LOGGING HELPER
  public logAction(
    userId: string,
    userName: string,
    action: string,
    entity: string,
    entityId: string,
    oldValue?: string,
    newValue?: string
  ): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      userName,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      ipAddress: '10.20.4.15 (JBC Android Hub)',
    };
    logs.unshift(newLog);
    this.set(AUDIT_LOGS_KEY, logs);
  }

  // NOTIFICATIONS HELPER
  public sendNotification(notif: Omit<SystemNotification, 'id' | 'createdAt' | 'read'>): void {
    const list = this.getNotifications();
    const newNotif: SystemNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newNotif);
    this.set(NOTIFICATIONS_KEY, list);
    try {
      window.dispatchEvent(new CustomEvent('jbc-notification-received', { detail: newNotif }));
      playNotificationSound();
    } catch {
      // safe fallback
    }
  }

  public sendNotificationToAdmins(notif: Omit<SystemNotification, 'id' | 'createdAt' | 'read' | 'userId'>): void {
    const adminUsers = this.getUsers().filter(
      (u) => u.role === 'admin' || u.role === 'super_admin' || u.role === 'maintenance_manager'
    );
    adminUsers.forEach((admin) => {
      this.sendNotification({
        ...notif,
        userId: admin.id,
      });
    });
  }

  public sendNotificationToAll(notif: Omit<SystemNotification, 'id' | 'createdAt' | 'read' | 'userId'>): void {
    this.sendNotification({
      ...notif,
      userId: 'all',
    });
  }

  // USERS CRUD (Admin & Super Admin Managed)
  public getUsers(): User[] {
    let list = this.get<User[] | null>(USERS_KEY, null as any);
    if (!list) {
      const prev = localStorage.getItem('jbc_users_v6_admin_only');
      if (prev) {
        try {
          const parsed = JSON.parse(prev);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        } catch {
          list = null;
        }
      }
    }
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = [...INITIAL_USERS];
      this.set(USERS_KEY, list);
      return list;
    }

    // Ensure the primary Admin is always guaranteed in the list
    const hasAdmin = list.some(
      (u) => u.id === 'usr-admin' || u.username.toLowerCase() === 'admin'
    );
    if (!hasAdmin) {
      list = [INITIAL_USERS[0], ...list];
      this.set(USERS_KEY, list);
    }
    return list;
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public createUser(
    userData: Omit<User, 'id'>,
    actorId: string,
    actorName: string
  ): User {
    const actor = this.getUserById(actorId);
    const isActorAdmin = Boolean(
      actor && (actor.role === 'super_admin' || actor.role === 'admin' || actor.id === 'usr-admin' || actor.username?.toLowerCase() === 'admin')
    );
    if (!isActorAdmin) {
      throw new Error('غير مصرح لك بإضافة مستخدمين جدد (صلاحية حصرية بمدير النظام الأدمن فقط)');
    }

    const cleanUsername = userData.username?.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل بدون مسافات');
    }

    if (!userData.nameAr || !userData.nameAr.trim()) {
      throw new Error('يرجى إدخال الاسم الكامل للمستخدم باللغة العربية');
    }

    const cleanPassword = userData.password?.trim() || 'user123';
    if (cleanPassword.length < 4) {
      throw new Error('كلمة المرور يجب أن تكون 4 خانات على الأقل');
    }

    const list = this.getUsers();

    // Check if username already exists
    if (list.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`اسم المستخدم "${cleanUsername}" مستخدم بالفعل! يرجى اختيار اسم مستخدم آخر.`);
    }

    const newUserRole: UserRole = userData.role || 'employee';
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      password: cleanPassword,
      role: newUserRole,
      nameAr: userData.nameAr.trim(),
      nameEn: userData.nameEn?.trim() || userData.nameAr.trim(),
      department: userData.department || 'Operations',
      jobTitleAr: userData.jobTitleAr || 'موظف محطة',
      jobTitleEn: userData.jobTitleEn || 'Plant Staff',
      phone: userData.phone || '+962 7 9000 0000',
      email: userData.email || `${cleanUsername}@jordanbiogas.com`,
      permissions: userData.permissions || getDefaultPermissionsForRole(newUserRole),
    };

    list.push(newUser);
    this.set(USERS_KEY, list);

    // Sync matching employee record for leaves & attendance
    const employees = this.getEmployees();
    const newEmp: Employee = {
      id: newUser.employeeId || `emp-${newUser.id}`,
      userId: newUser.id,
      code: newUser.employeeId || `JBC-E${String(employees.length + 1).padStart(3, '0')}`,
      nameAr: newUser.nameAr,
      nameEn: newUser.nameEn,
      jobTitleAr: newUser.jobTitleAr,
      jobTitleEn: newUser.jobTitleEn,
      department: newUser.department,
      phone: newUser.phone || '+962 7 9000 0000',
      annualLeaveBalance: 21,
      sickLeaveBalance: 14,
      permissionHoursBalance: 8,
      status: 'active',
    };
    employees.push(newEmp);
    this.set(EMPLOYEES_KEY, employees);

    this.logAction(
      actorId,
      actorName,
      `إضافة مستخدم جديد للنظام (${newUser.nameAr} - @${newUser.username})`,
      'UserManagement',
      newUser.id,
      undefined,
      newUser.role
    );

    this.sendNotificationToAdmins({
      titleAr: 'إضافة مستخدم جديد للنظام',
      titleEn: 'New User Registered',
      messageAr: `قام ${actorName} بإضافة المستخدم ${newUser.nameAr} (@${newUser.username}) بصلاحية ${newUser.role}.`,
      messageEn: `${actorName} added user ${newUser.nameEn} (@${newUser.username}) with role ${newUser.role}.`,
      type: 'info',
      actionUrl: 'users',
    });

    return newUser;
  }

  public updateUser(
    updatedUser: User,
    actorId: string,
    actorName: string
  ): void {
    const actor = this.getUserById(actorId);
    const isActorAdmin = Boolean(
      actor && (actor.role === 'super_admin' || actor.role === 'admin' || actor.id === 'usr-admin' || actor.username?.toLowerCase() === 'admin')
    );
    if (!isActorAdmin) {
      throw new Error('غير مصرح لك بتعديل بيانات المستخدمين (صلاحية حصرية بمدير النظام الأدمن فقط)');
    }

    const list = this.getUsers();
    const idx = list.findIndex((u) => u.id === updatedUser.id);
    if (idx === -1) {
      throw new Error('لم يتم العثور على سجل المستخدم المطلوب تعديله!');
    }

    const cleanUsername = updatedUser.username?.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل بدون مسافات');
    }

    if (!updatedUser.nameAr || !updatedUser.nameAr.trim()) {
      throw new Error('يرجى إدخال الاسم الكامل للمستخدم باللغة العربية');
    }

    const old = list[idx];
    if (
      cleanUsername !== old.username.toLowerCase() &&
      list.some((u) => u.id !== updatedUser.id && u.username.toLowerCase() === cleanUsername)
    ) {
      throw new Error(`اسم المستخدم "${cleanUsername}" مستخدم بالفعل بحساب آخر!`);
    }

    // Preserve primary admin role & permissions
    const isPrimaryAdmin = old.id === 'usr-admin' || old.username.toLowerCase() === 'admin';
    const roleToSave: UserRole = isPrimaryAdmin ? 'super_admin' : (updatedUser.role || old.role);

    // Calculate permissions if role changed or permissions missing
    const permissionsToSave = isPrimaryAdmin
      ? getDefaultPermissionsForRole('super_admin')
      : (updatedUser.permissions || getDefaultPermissionsForRole(roleToSave));

    const cleanUser: User = {
      ...updatedUser,
      username: cleanUsername,
      password: updatedUser.password?.trim() || old.password || 'pass123',
      role: roleToSave,
      permissions: permissionsToSave,
      nameAr: updatedUser.nameAr.trim(),
      nameEn: updatedUser.nameEn?.trim() || updatedUser.nameAr.trim(),
    };

    list[idx] = cleanUser;
    this.set(USERS_KEY, list);

    // Sync employee record if exists
    const employees = this.getEmployees();
    const empIdx = employees.findIndex(
      (e) => e.userId === cleanUser.id || (cleanUser.employeeId && e.id === cleanUser.employeeId)
    );
    if (empIdx !== -1) {
      employees[empIdx].nameAr = cleanUser.nameAr;
      employees[empIdx].nameEn = cleanUser.nameEn;
      employees[empIdx].department = cleanUser.department;
      employees[empIdx].jobTitleAr = cleanUser.jobTitleAr;
      employees[empIdx].jobTitleEn = cleanUser.jobTitleEn;
      if (cleanUser.phone) employees[empIdx].phone = cleanUser.phone;
      this.set(EMPLOYEES_KEY, employees);
    }

    this.logAction(
      actorId,
      actorName,
      `تحديث بيانات المستخدم (${cleanUser.nameAr} - @${cleanUser.username})`,
      'UserManagement',
      cleanUser.id,
      old.username,
      cleanUser.username
    );

    this.sendNotificationToAdmins({
      titleAr: 'تحديث بيانات مستخدم',
      titleEn: 'User Profile Updated',
      messageAr: `قام ${actorName} بتعديل بيانات المستخدم ${cleanUser.nameAr} (@${cleanUser.username}).`,
      messageEn: `${actorName} modified user ${cleanUser.nameEn}.`,
      type: 'info',
      actionUrl: 'users',
    });
  }

  public deleteUser(
    userId: string,
    actorId: string,
    actorName: string
  ): boolean {
    const actor = this.getUserById(actorId);
    const isActorAdmin = Boolean(
      actor && (actor.role === 'super_admin' || actor.role === 'admin' || actor.id === 'usr-admin' || actor.username?.toLowerCase() === 'admin')
    );
    if (!isActorAdmin) {
      throw new Error('غير مصرح لك بشطب المستخدمين (صلاحية حصرية بمدير النظام الأدمن فقط)');
    }

    const list = this.getUsers();
    const target = list.find((u) => u.id === userId);
    if (!target) return false;

    // Prevent deleting super_admin, primary admin, or self
    if (
      target.role === 'super_admin' ||
      target.id === 'usr-admin' ||
      target.username.toLowerCase() === 'admin' ||
      target.id === actorId
    ) {
      return false;
    }

    const filtered = list.filter((u) => u.id !== userId);
    this.set(USERS_KEY, filtered);

    // Sync deletion with matching employee record
    const employees = this.getEmployees();
    const filteredEmployees = employees.filter(
      (e) => e.userId !== userId && e.id !== target.employeeId
    );
    this.set(EMPLOYEES_KEY, filteredEmployees);

    this.logAction(
      actorId,
      actorName,
      `شطب المستخدم (${target.nameAr} - @${target.username}) من النظام`,
      'UserManagement',
      userId,
      target.username,
      'DELETED'
    );

    this.sendNotificationToAdmins({
      titleAr: 'حذف مستخدم من النظام',
      titleEn: 'User Removed',
      messageAr: `قام ${actorName} بشطب حساب المستخدم ${target.nameAr} (@${target.username}).`,
      messageEn: `${actorName} deleted user account ${target.nameEn}.`,
      type: 'warning',
      actionUrl: 'users',
    });

    return true;
  }

  public resetUserPassword(
    userId: string,
    newPassword: string,
    actorId: string,
    actorName: string
  ): boolean {
    const actor = this.getUserById(actorId);
    const isActorAdmin = Boolean(
      actor && (actor.role === 'super_admin' || actor.role === 'admin' || actor.id === 'usr-admin' || actor.username?.toLowerCase() === 'admin')
    );
    if (!isActorAdmin) {
      throw new Error('غير مصرح لك بتغيير كلمات المرور (صلاحية حصرية بمدير النظام الأدمن فقط)');
    }

    const list = this.getUsers();
    const target = list.find((u) => u.id === userId);
    if (!target) return false;

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 4) {
      throw new Error('كلمة المرور يجب أن تتكون من 4 خانات على الأقل');
    }

    target.password = trimmedPassword;
    this.set(USERS_KEY, list);

    this.logAction(
      actorId,
      actorName,
      `تغيير كلمة مرور المستخدم (${target.nameAr} - @${target.username})`,
      'UserManagement',
      userId
    );

    this.sendNotification({
      userId: target.id,
      titleAr: 'تحديث كلمة المرور',
      titleEn: 'Password Updated',
      messageAr: `تم تحديث كلمة المرور الخاصة بحسابك بواسطة المشرف ${actorName}.`,
      messageEn: `Your password was updated by administrator ${actorName}.`,
      type: 'info',
    });

    return true;
  }

  // EMPLOYEES
  public getEmployees(): Employee[] {
    let list = this.get<Employee[] | null>(EMPLOYEES_KEY, null as any);
    if (!list) {
      const prev = localStorage.getItem('jbc_employees_v4_admin_only');
      if (prev) {
        try {
          const parsed = JSON.parse(prev);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        } catch {
          list = null;
        }
      }
    }
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = [...INITIAL_EMPLOYEES];
      this.set(EMPLOYEES_KEY, list);
      return list;
    }

    // Ensure the primary Admin employee record is always present
    const hasAdminEmp = list.some(
      (e) => e.userId === 'usr-admin' || e.code === 'JBC-EMP-001'
    );
    if (!hasAdminEmp) {
      list = [INITIAL_EMPLOYEES[0], ...list];
      this.set(EMPLOYEES_KEY, list);
    }
    return list;
  }

  public updateEmployee(emp: Employee): void {
    const list = this.getEmployees();
    const idx = list.findIndex((e) => e.id === emp.id);
    if (idx !== -1) {
      list[idx] = emp;
      this.set(EMPLOYEES_KEY, list);
    }
  }

  public getEmployeeByUserId(userId: string): Employee | undefined {
    const employees = this.getEmployees();
    return employees.find(
      (e) => e.userId === userId || e.id === userId || (userId && e.code.endsWith(userId.replace(/\D/g, '')))
    );
  }

  /**
   * Admin-only: Directly adjust an employee's annual leave, sick leave, and permission hours balance.
   */
  public updateEmployeeBalances(
    employeeId: string,
    balances: {
      annualLeaveBalance: number;
      sickLeaveBalance: number;
      permissionHoursBalance: number;
    },
    actorId: string,
    actorName: string,
    notes?: string
  ): Employee | undefined {
    const actor = this.getUserById(actorId);
    if (
      actor &&
      actor.role !== 'super_admin' &&
      actor.role !== 'admin' &&
      !actor.permissions?.canManageUsers
    ) {
      throw new Error('غير مصرح لك بتعديل أرصدة إجازات الموظفين (صلاحية خاصة بمدير النظام الأدمن)');
    }

    const employees = this.getEmployees();
    const empIdx = employees.findIndex((e) => e.id === employeeId || e.userId === employeeId);
    if (empIdx === -1) return undefined;

    const old = employees[empIdx];
    const updated: Employee = {
      ...old,
      annualLeaveBalance: Math.max(0, balances.annualLeaveBalance),
      sickLeaveBalance: Math.max(0, balances.sickLeaveBalance),
      permissionHoursBalance: Math.max(0, Math.round(balances.permissionHoursBalance * 10) / 10),
    };
    employees[empIdx] = updated;
    this.set(EMPLOYEES_KEY, employees);

    this.logAction(
      actorId,
      actorName,
      `تعديل رصيد الإجازات والمغادرات للموظف ${updated.nameAr} (سنوي: ${updated.annualLeaveBalance}، مرضي: ${updated.sickLeaveBalance}، مغادرات: ${updated.permissionHoursBalance}س)${notes ? ' - ' + notes : ''}`,
      'HR_Balance_Adjustment',
      updated.id
    );

    if (updated.userId) {
      this.sendNotification({
        userId: updated.userId,
        titleAr: 'تحديث رصيد الإجازات والمغادرات 📊',
        titleEn: 'Leave Balances Updated by Admin',
        messageAr: `تم تحديث أرصدتك من قبل الإدارة (${actorName}): السنوي: ${updated.annualLeaveBalance} يوم، المرضي: ${updated.sickLeaveBalance} يوم، والمغادرات: ${updated.permissionHoursBalance} ساعة.`,
        messageEn: `Your leave balances were updated by Admin ${actorName}.`,
        type: 'info',
        actionUrl: 'requests',
      });
    }

    return updated;
  }

  // TASKS
  public getTasks(): Task[] {
    const stored = this.get<Task[]>(TASKS_KEY, INITIAL_TASKS);
    // Never re-seed deleted tasks; only return active (non-deleted) tasks
    return (stored || []).filter((t) => !t.deleted);
  }

  public getTaskById(id: string): Task | undefined {
    return this.getTasks().find((t) => t.id === id);
  }

  public createTask(
    task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'taskCode'>,
    userId: string,
    userName: string
  ): Task {
    const stored = this.get<Task[]>(TASKS_KEY, INITIAL_TASKS);
    const count = stored.length + 91;
    const newTask: Task = {
      ...task,
      id: `tsk-${Date.now()}`,
      taskCode: `TSK-${String(count).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    stored.unshift(newTask);
    this.set(TASKS_KEY, stored);

    this.logAction(
      userId,
      userName,
      `إنشاء مهمة ميدانية جديدة: ${newTask.titleAr}`,
      'Task',
      newTask.id,
      undefined,
      newTask.status
    );

    if (newTask.assignedToUserId) {
      this.sendNotification({
        userId: newTask.assignedToUserId,
        titleAr: 'مهمة عمل جديدة مسندة إليك',
        titleEn: 'New Task Assigned',
        messageAr: `تم إسناد المهمة: ${newTask.titleAr} إليك للتنفيذ.`,
        messageEn: `Task "${newTask.titleEn}" has been assigned to you.`,
        type: 'info',
        actionUrl: 'tasks',
      });
    }

    return newTask;
  }

  public updateTask(
    taskId: string,
    updates: Partial<Task>,
    userId: string,
    userName: string
  ): Task | undefined {
    const stored = this.get<Task[]>(TASKS_KEY, INITIAL_TASKS);
    const idx = stored.findIndex((t) => t.id === taskId);
    if (idx === -1) return undefined;

    const old = stored[idx];
    const statusChanged = !!(updates.status && updates.status !== old.status);
    const updated: Task = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    stored[idx] = updated;
    this.set(TASKS_KEY, stored);

    this.logAction(
      userId,
      userName,
      `تحديث المهمة: ${updated.titleAr} (الحالة: ${updated.status})`,
      'Task',
      taskId,
      old.status,
      updated.status
    );

    if (statusChanged && updated.status === 'completed') {
      this.sendNotificationToAdmins({
        titleAr: 'إنجاز مهمة تشغيلية - بانتظار الاعتماد ✅',
        titleEn: 'Task Completed - Pending Approval',
        messageAr: `قام الفني المكلف ${userName} بإتمام المهمة (${updated.taskCode}: ${updated.titleAr}) وبانتظار مراجعة الإدارة والاعتماد النهائي.`,
        messageEn: `Task ${updated.taskCode} was completed by ${userName} and awaits admin approval.`,
        type: 'info',
        actionUrl: 'tasks',
      });
    }

    return updated;
  }

  /**
   * Admin-only: Approve and officially close a completed task.
   */
  public closeTask(
    taskId: string,
    userId: string,
    userName: string,
    adminApprovalNotes?: string
  ): Task | undefined {
    const updated = this.updateTask(
      taskId,
      {
        status: 'closed',
        closedById: userId,
        closedByName: userName,
        closedAt: new Date().toISOString(),
        adminApprovalNotes: adminApprovalNotes || 'تم الاعتماد والإغلاق من قبل الإدارة',
      },
      userId,
      userName
    );

    if (updated) {
      if (updated.assignedToUserId) {
        this.sendNotification({
          userId: updated.assignedToUserId,
          titleAr: 'اعتماد وإغلاق المهمة رسمياً 🏆',
          titleEn: 'Task Approved & Closed',
          messageAr: `اعتمد المسؤول ${userName} إنجاز المهمة (${updated.taskCode}: ${updated.titleAr}) وأُغلقت رسمياً بنجاح.`,
          messageEn: `Task ${updated.taskCode} was approved and officially closed by ${userName}.`,
          type: 'success',
          actionUrl: 'tasks',
        });
      }
      this.sendNotificationToAdmins({
        titleAr: 'اعتماد وإغلاق مهمة تشغيلية ✅',
        titleEn: 'Task Approved and Closed',
        messageAr: `قام ${userName} باعتماد وإغلاق المهمة (${updated.taskCode}: ${updated.titleAr}) المنفذة بواسطة (${updated.assignedToName || 'الفني'}).`,
        messageEn: `${userName} approved and closed task ${updated.taskCode}.`,
        type: 'success',
        actionUrl: 'tasks',
      });
    }

    return updated;
  }

  /**
   * Admin-only: Reopen a task back to in_progress or pending
   */
  public reopenTask(
    taskId: string,
    userId: string,
    userName: string,
    reopenReason?: string
  ): Task | undefined {
    const updated = this.updateTask(
      taskId,
      {
        status: 'in_progress',
        reopenedById: userId,
        reopenedByName: userName,
        reopenedAt: new Date().toISOString(),
        reopenReason: reopenReason || 'إعادة الفتح بطلب من الإدارة للمتابعة',
      },
      userId,
      userName
    );

    if (updated && updated.assignedToUserId) {
      this.sendNotification({
        userId: updated.assignedToUserId,
        titleAr: 'إعادة فتح المهمة للمتابعة 🔄',
        titleEn: 'Task Reopened',
        messageAr: `قام المشرف ${userName} بإعادة فتح المهمة (${updated.taskCode}: ${updated.titleAr}). السبب: ${reopenReason || 'متابعة العمل وإكماله'}.`,
        messageEn: `Task ${updated.taskCode} was reopened by ${userName}. Reason: ${reopenReason || 'Follow-up'}.`,
        type: 'warning',
        actionUrl: 'tasks',
      });
    }

    return updated;
  }

  /**
   * Admin-only: Reassign technician regardless of task status (pending, in_progress, completed, closed)
   */
  public updateTaskTechnician(
    taskId: string,
    newTechnicianUserId: string,
    newTechnicianName: string,
    actorUserId: string,
    actorUserName: string
  ): Task | undefined {
    const stored = this.get<Task[]>(TASKS_KEY, INITIAL_TASKS);
    const idx = stored.findIndex((t) => t.id === taskId);
    if (idx === -1) return undefined;

    const oldTask = stored[idx];
    const oldTechName = oldTask.assignedToName || 'غير محدد';

    const updated: Task = {
      ...oldTask,
      assignedToUserId: newTechnicianUserId,
      assignedToName: newTechnicianName,
      updatedAt: new Date().toISOString(),
    };
    stored[idx] = updated;
    this.set(TASKS_KEY, stored);

    this.logAction(
      actorUserId,
      actorUserName,
      `تغيير الفني المكلف بالمهمة (${oldTask.taskCode} - ${oldTask.titleAr}) من (${oldTechName}) إلى (${newTechnicianName})`,
      'Task',
      taskId,
      oldTechName,
      newTechnicianName
    );

    if (newTechnicianUserId && newTechnicianUserId !== oldTask.assignedToUserId) {
      this.sendNotification({
        userId: newTechnicianUserId,
        titleAr: 'إعادة إسناد مهمة إليك 🔄',
        titleEn: 'Task Reassigned To You',
        messageAr: `تم إسناد المهمة (${oldTask.taskCode}: ${oldTask.titleAr}) إليك بواسطة المسؤول ${actorUserName}.`,
        messageEn: `Task ${oldTask.taskCode} has been reassigned to you by ${actorUserName}.`,
        type: 'info',
        actionUrl: 'tasks',
      });
    }

    return updated;
  }

  /**
   * Admin-only: Delete task permanently and remove globally from database
   */
  public deleteTask(
    taskId: string,
    userId: string,
    userName: string
  ): boolean {
    const actor = this.getUserById(userId);
    if (
      actor &&
      actor.role !== 'super_admin' &&
      actor.role !== 'admin' &&
      !actor.permissions?.canDeleteTasks
    ) {
      throw new Error('غير مصرح لك بحذف المهام اليومية (صلاحية حصرية لمدير النظام الأدمن)');
    }

    const stored = this.get<Task[]>(TASKS_KEY, INITIAL_TASKS);
    const target = stored.find((t) => t.id === taskId);
    if (!target) return false;

    // Filter out completely so it disappears for all users and admins
    const filtered = stored.filter((t) => t.id !== taskId);
    this.set(TASKS_KEY, filtered);

    this.logAction(
      userId,
      userName,
      `حذف مهمة عمل يومية من النظام نهائياً: ${target.titleAr} (${target.taskCode})`,
      'Task',
      taskId,
      target.status,
      'DELETED'
    );

    this.sendNotificationToAdmins({
      titleAr: 'حذف مهمة عمل 🗑️',
      titleEn: 'Task Deleted',
      messageAr: `قام المسؤول ${userName} بحذف المهمة (${target.taskCode}: ${target.titleAr}) من قاعدة بيانات المحطة.`,
      messageEn: `Admin ${userName} deleted task ${target.taskCode}.`,
      type: 'warning',
      actionUrl: 'tasks',
    });

    if (target.assignedToUserId && target.assignedToUserId !== userId) {
      this.sendNotification({
        userId: target.assignedToUserId,
        titleAr: 'إلغاء/حذف مهمة عمل 🗑️',
        titleEn: 'Task Removed / Deleted',
        messageAr: `قام مشرف النظام بحذف المهمة (${target.taskCode}: ${target.titleAr}) التي كانت مكلفة إليك.`,
        messageEn: `Task ${target.taskCode} assigned to you was deleted by admin.`,
        type: 'info',
        actionUrl: 'tasks',
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jbc-data-updated'));
      window.dispatchEvent(new CustomEvent('jbc-task-deleted', { detail: { taskId } }));
    }

    return true;
  }

  // WORK ORDERS
  public getWorkOrders(): WorkOrder[] {
    const stored = this.get<WorkOrder[]>(WORK_ORDERS_KEY, INITIAL_WORK_ORDERS);
    if (stored && stored.some((w) => w.sparePartsUsed?.some((sp) => sp.nameAr?.includes('Jenbacher') || sp.nameEn?.includes('Jenbacher')))) {
      const cleaned = stored.map((w) => {
        if (!w.sparePartsUsed) return w;
        return {
          ...w,
          sparePartsUsed: w.sparePartsUsed.map((sp) => {
            if (sp.id === 'sp-11') {
              return {
                ...sp,
                partNumber: 'MWM-FLT-TCG2020',
                nameAr: 'طقم فلاتر زيت أصلية MWM TCG 2020 V16',
                nameEn: 'MWM TCG 2020 V16 Engine Lube Oil Filter Cartridges',
              };
            }
            if (sp.id === 'sp-12') {
              return {
                ...sp,
                partNumber: 'MWM-SPK-IRID12',
                nameAr: 'شمعات احتراق إيريديوم أصلية MWM لغاز المطامر (Spark Plugs)',
                nameEn: 'MWM Biogas Heavy-Duty Iridium Spark Plugs',
              };
            }
            return sp;
          }),
        };
      });
      this.set(WORK_ORDERS_KEY, cleaned);
      return cleaned;
    }
    return stored;
  }

  public getWorkOrderById(id: string): WorkOrder | undefined {
    return this.getWorkOrders().find((w) => w.id === id);
  }

  public createWorkOrder(
    wo: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'workOrderNumber'>,
    userId: string,
    userName: string
  ): WorkOrder {
    const list = this.getWorkOrders();
    const count = list.length + 143;
    const newWo: WorkOrder = {
      ...wo,
      id: `wo-${Date.now()}`,
      workOrderNumber: `WO-2026-${String(count).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newWo);
    this.set(WORK_ORDERS_KEY, list);

    this.logAction(
      userId,
      userName,
      `إنشاء أمر صيانة جديد ${newWo.workOrderNumber}`,
      'WorkOrder',
      newWo.id,
      undefined,
      newWo.status
    );

    if (newWo.assignedTechnicianId) {
      this.sendNotification({
        userId: newWo.assignedTechnicianId,
        titleAr: `أمر صيانة جديد: ${newWo.workOrderNumber}`,
        titleEn: `New Work Order: ${newWo.workOrderNumber}`,
        messageAr: `تم إسناد أمر الصيانة للمعدة ${newWo.equipmentCode || ''} إليك (${newWo.type === 'preventive' ? 'وقائي' : 'تصحيحي'}).`,
        messageEn: `Work order for equipment ${newWo.equipmentCode || ''} assigned to you.`,
        type: 'warning',
        actionUrl: 'maintenance',
      });
    }

    // Notify all admins and operations supervisors
    this.sendNotificationToAdmins({
      titleAr: `أمر صيانة جديد: ${newWo.workOrderNumber}`,
      titleEn: `New Work Order Created: ${newWo.workOrderNumber}`,
      messageAr: `أنشأ ${userName} أمر صيانة جديد للمعدة ${newWo.equipmentCode || ''} (${newWo.type === 'preventive' ? 'وقائي' : 'تصحيحي'}).`,
      messageEn: `${userName} created work order ${newWo.workOrderNumber}.`,
      type: 'info',
      actionUrl: 'maintenance',
    });

    return newWo;
  }

  public updateWorkOrder(
    woId: string,
    updates: Partial<WorkOrder>,
    userId: string,
    userName: string
  ): WorkOrder | undefined {
    const list = this.getWorkOrders();
    const idx = list.findIndex((w) => w.id === woId);
    if (idx === -1) return undefined;

    const old = list[idx];
    const textEdited = !!(updates.problemDescription && updates.problemDescription !== old.problemDescription);
    const statusChanged = !!(updates.status && updates.status !== old.status);

    const updated: WorkOrder = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    this.set(WORK_ORDERS_KEY, list);

    this.logAction(
      userId,
      userName,
      textEdited
        ? `تحرير نص أمر الصيانة ${updated.workOrderNumber}: ${updated.problemDescription}`
        : `تحديث أمر الصيانة ${updated.workOrderNumber} (الحالة: ${updated.status})`,
      'WorkOrder',
      woId,
      old.status,
      updated.status
    );

    // Send notifications for process/text changes to assigned technician and admins
    const notifMessage = textEdited
      ? `قام المشرف ${userName} بتعديل وتحرير نص أمر الصيانة ${updated.workOrderNumber} للمعدة ${updated.equipmentCode || ''}.`
      : `تم تغيير حالة أمر الصيانة ${updated.workOrderNumber} إلى (${updated.status}) بواسطة ${userName}.`;

    if (updated.assignedTechnicianId && updated.assignedTechnicianId !== userId) {
      this.sendNotification({
        userId: updated.assignedTechnicianId,
        titleAr: textEdited ? 'تعديل نص أمر الصيانة 📝' : 'تحديث حالة أمر الصيانة ⚙️',
        titleEn: 'Work Order Updated',
        messageAr: notifMessage,
        messageEn: `Work order ${updated.workOrderNumber} was updated by ${userName}.`,
        type: 'info',
        actionUrl: 'maintenance',
      });
    }

    this.sendNotificationToAdmins({
      titleAr: textEdited ? 'تحرير نص أمر صيانة' : 'تحديث بروسس الصيانة',
      titleEn: 'Maintenance Process Update',
      messageAr: notifMessage,
      messageEn: `Work order ${updated.workOrderNumber} updated.`,
      type: 'info',
      actionUrl: 'maintenance',
    });

    return updated;
  }

  public closeWorkOrder(
    woId: string,
    userId: string,
    userName: string
  ): WorkOrder | undefined {
    const updated = this.updateWorkOrder(
      woId,
      {
        status: 'closed',
        closedById: userId,
        closedByName: userName,
        closedAt: new Date().toISOString(),
      },
      userId,
      userName
    );

    if (updated) {
      this.sendNotificationToAdmins({
        titleAr: 'إغلاق واعتماد أمر صيانة ✅',
        titleEn: 'Work Order Closed & Approved',
        messageAr: `قام ${userName} بإغلاق واعتماد أمر الصيانة ${updated.workOrderNumber} للمعدة ${updated.equipmentCode || ''} بنجاح.`,
        messageEn: `Work order ${updated.workOrderNumber} closed and approved by ${userName}.`,
        type: 'success',
        actionUrl: 'maintenance',
      });
    }

    return updated;
  }

  /**
   * Admin-only: Permanently delete/purge a work order in any state.
   * Completely removes the record from system so it disappears for all users and admins.
   */
  public deleteWorkOrder(
    woId: string,
    userId: string,
    userName: string
  ): boolean {
    const actor = this.getUserById(userId);
    if (
      actor &&
      actor.role !== 'super_admin' &&
      actor.role !== 'admin' &&
      !actor.permissions?.canDeleteWorkOrders
    ) {
      throw new Error('غير مصرح لك بشطب أوامر الصيانة (صلاحية خاصة بمدير النظام الأدمن)');
    }

    const list = this.getWorkOrders();
    const target = list.find((w) => w.id === woId);
    if (!target) return false;

    const filtered = list.filter((w) => w.id !== woId);
    this.set(WORK_ORDERS_KEY, filtered);

    this.logAction(
      userId,
      userName,
      `شطب وحذف أمر الصيانة ${target.workOrderNumber} نهائياً بجميع سجلاته (الحالة السابقة: ${target.status})`,
      'WorkOrder',
      woId,
      target.status,
      'deleted'
    );

    this.sendNotificationToAdmins({
      titleAr: 'شطب وحذف أمر صيانة 🗑️',
      titleEn: 'Work Order Purged',
      messageAr: `قام المسؤول ${userName} بشطب أمر الصيانة ${target.workOrderNumber} نهائياً من قاعدة بيانات وسجلات المحطة.`,
      messageEn: `Admin ${userName} permanently purged work order ${target.workOrderNumber}.`,
      type: 'warning',
      actionUrl: 'maintenance',
    });

    return true;
  }

  // EQUIPMENT
  public getEquipment(): Equipment[] {
    const stored = this.get<Equipment[]>(EQUIPMENT_KEY, INITIAL_EQUIPMENT);
    if (
      stored &&
      stored.some(
        (e) =>
          e.nameAr?.toLowerCase().includes('jenbacher') ||
          e.nameEn?.toLowerCase().includes('jenbacher') ||
          e.model?.toLowerCase().includes('jms-320') ||
          e.model?.toLowerCase().includes('jenbacher')
      )
    ) {
      const migrated = stored.map((eq) => {
        const matchingInit = INITIAL_EQUIPMENT.find(
          (init) => init.id === eq.id || init.code === eq.code
        );
        if (matchingInit) {
          return {
            ...eq,
            nameAr: matchingInit.nameAr,
            nameEn: matchingInit.nameEn,
            model: matchingInit.model,
            specifications: matchingInit.specifications,
            location: matchingInit.location,
          };
        }
        return eq;
      });
      this.set(EQUIPMENT_KEY, migrated);
      return migrated;
    }
    return stored;
  }

  public getEquipmentById(id: string): Equipment | undefined {
    return this.getEquipment().find((e) => e.id === id);
  }

  public getEquipmentByCode(code: string): Equipment | undefined {
    const query = code.trim().toLowerCase();
    return this.getEquipment().find(
      (e) =>
        e.code.toLowerCase() === query ||
        e.qrCodeValue.toLowerCase() === query ||
        e.serialNumber.toLowerCase() === query ||
        e.id.toLowerCase() === query
    );
  }

  public createEquipment(
    data: Omit<Equipment, 'id'>,
    userId: string,
    userName: string
  ): Equipment {
    const list = this.getEquipment();
    const newEquipment: Equipment = {
      ...data,
      id: `eq-${Date.now()}`,
      qrCodeValue: data.qrCodeValue || data.code,
    };
    list.unshift(newEquipment);
    this.set(EQUIPMENT_KEY, list);

    this.logAction(
      userId,
      userName,
      `إضافة معدة/أصل جديد: ${newEquipment.nameAr} (${newEquipment.code})`,
      'Equipment',
      newEquipment.id,
      undefined,
      newEquipment.code
    );

    return newEquipment;
  }

  public updateEquipment(
    id: string,
    updates: Partial<Equipment>,
    userId: string,
    userName: string
  ): Equipment | undefined {
    const list = this.getEquipment();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;

    const old = list[idx];
    const updated: Equipment = {
      ...old,
      ...updates,
    };
    list[idx] = updated;
    this.set(EQUIPMENT_KEY, list);

    this.logAction(
      userId,
      userName,
      `تعديل بيانات الأصل: ${updated.nameAr} (${updated.code})`,
      'Equipment',
      id,
      old.status,
      updated.status
    );

    if (updates.status && updates.status !== old.status) {
      this.sendNotificationToAdmins({
        titleAr: 'تغيير حالة أصل / معدة ⚙️',
        titleEn: 'Equipment Status Change',
        messageAr: `تم تغيير حالة الأصل ${updated.nameAr} (${updated.code}) إلى (${updated.status}) بواسطة ${userName}.`,
        messageEn: `Equipment ${updated.code} status changed to ${updated.status} by ${userName}.`,
        type: updated.status === 'stopped' ? 'alert' : 'info',
        actionUrl: 'equipment',
      });
    }

    return updated;
  }

  public updateEquipmentHours(
    id: string,
    operatingHours: number,
    status?: Equipment['status'],
    userId: string = 'usr-user',
    userName: string = 'User'
  ): Equipment | undefined {
    const updates: Partial<Equipment> = { operatingHours };
    if (status) updates.status = status;
    return this.updateEquipment(id, updates, userId, userName);
  }

  public deleteEquipment(
    id: string,
    userId: string,
    userName: string
  ): boolean {
    const list = this.getEquipment();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    const removed = list[idx];
    list.splice(idx, 1);
    this.set(EQUIPMENT_KEY, list);

    this.logAction(
      userId,
      userName,
      `حذف الأصل من السجلات: ${removed.nameAr} (${removed.code})`,
      'Equipment',
      id,
      removed.code,
      'deleted'
    );

    return true;
  }

  // PREVENTIVE MAINTENANCE
  public getPMSchedules(): PMSchedule[] {
    return this.get<PMSchedule[]>(PM_SCHEDULES_KEY, INITIAL_PM_SCHEDULES);
  }

  public generateWorkOrderFromPM(
    pmId: string,
    userId: string,
    userName: string
  ): WorkOrder | null {
    const pm = this.getPMSchedules().find((p) => p.id === pmId);
    if (!pm) return null;

    const eq = this.getEquipmentById(pm.equipmentId);

    const newWO = this.createWorkOrder(
      {
        type: 'preventive',
        priority: 'high',
        equipmentId: pm.equipmentId,
        equipmentCode: eq?.code,
        assignedTechnicianId: 'usr-4',
        assignedTechnicianName: 'فني. محمود العبادي',
        createdById: userId,
        status: 'new',
        problemDescription: `صيانة وقائية دورية مجدولة: ${pm.titleAr}`,
        safetyChecklist: [
          {
            id: 'pm-s1',
            labelAr: 'تطبيق إجراءات العزل وفصل الطاقة الميكانيكية والكهربائية (LOTO)',
            labelEn: 'Lockout/Tagout (LOTO)',
            checked: false,
          },
          {
            id: 'pm-s2',
            labelAr: 'فحص خلو المكان من غاز الميثان وكبريتيد الهيدروجين',
            labelEn: 'Atmospheric gas testing',
            checked: false,
          },
        ],
        sparePartsUsed: [],
        downtimeHours: 0,
        actualHours: 0,
      },
      userId,
      userName
    );

    // Update last triggered
    const list = this.getPMSchedules();
    const idx = list.findIndex((p) => p.id === pmId);
    if (idx !== -1) {
      list[idx].lastTriggeredDate = new Date().toISOString().split('T')[0];
      this.set(PM_SCHEDULES_KEY, list);
    }

    return newWO;
  }

  public createPMSchedule(
    data: Omit<PMSchedule, 'id'>,
    userId: string,
    userName: string
  ): PMSchedule {
    const list = this.getPMSchedules();
    const newPM: PMSchedule = {
      ...data,
      id: `pm-${Date.now()}`,
    };
    list.unshift(newPM);
    this.set(PM_SCHEDULES_KEY, list);

    this.logAction(
      userId,
      userName,
      `إضافة خطة صيانة وقائية جديدة: ${newPM.titleAr}`,
      'PM_Schedule',
      newPM.id
    );

    this.sendNotificationToAdmins({
      titleAr: 'إضافة خطة صيانة وقائية جديدة 📋',
      titleEn: 'New PM Schedule Created',
      messageAr: `قام ${userName} بإنشاء خطة صيانة وقائية جديدة: ${newPM.titleAr}.`,
      messageEn: `${userName} created a new preventive maintenance schedule: ${newPM.titleEn || newPM.titleAr}.`,
      type: 'info',
      actionUrl: 'pm',
    });

    return newPM;
  }

  public updatePMSchedule(
    id: string,
    updates: Partial<PMSchedule>,
    userId: string,
    userName: string
  ): PMSchedule | null {
    const list = this.getPMSchedules();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const old = list[idx];
    const updated: PMSchedule = {
      ...old,
      ...updates,
    };
    list[idx] = updated;
    this.set(PM_SCHEDULES_KEY, list);

    this.logAction(
      userId,
      userName,
      `تعديل خطة الصيانة الوقائية والتعليمات: ${updated.titleAr}`,
      'PM_Schedule',
      id
    );

    this.sendNotificationToAdmins({
      titleAr: 'تعديل خطة صيانة وقائية ⚙️',
      titleEn: 'PM Schedule Updated',
      messageAr: `قام ${userName} بتعديل خطة الصيانة الوقائية وتعليماتها: ${updated.titleAr}.`,
      messageEn: `${userName} updated PM schedule and instructions: ${updated.titleEn || updated.titleAr}.`,
      type: 'info',
      actionUrl: 'pm',
    });

    return updated;
  }

  public deletePMSchedule(
    id: string,
    userId: string,
    userName: string
  ): boolean {
    const list = this.getPMSchedules();
    const target = list.find((p) => p.id === id);
    if (!target) return false;

    const filtered = list.filter((p) => p.id !== id);
    this.set(PM_SCHEDULES_KEY, filtered);

    this.logAction(
      userId,
      userName,
      `حذف خطة صيانة وقائية: ${target.titleAr}`,
      'PM_Schedule',
      id
    );

    this.sendNotificationToAdmins({
      titleAr: 'حذف خطة صيانة وقائية 🗑️',
      titleEn: 'PM Schedule Deleted',
      messageAr: `قام ${userName} بحذف خطة الصيانة الوقائية: ${target.titleAr}.`,
      messageEn: `${userName} deleted PM schedule: ${target.titleEn || target.titleAr}.`,
      type: 'warning',
      actionUrl: 'pm',
    });

    return true;
  }

  // LEAVE REQUESTS
  public getLeaveRequests(): LeaveRequest[] {
    return this.get<LeaveRequest[]>(LEAVES_KEY, INITIAL_LEAVES);
  }

  public createLeaveRequest(
    leave: Omit<LeaveRequest, 'id' | 'createdAt'>,
    userId: string,
    userName: string
  ): LeaveRequest {
    // Balance validation before submission
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === leave.employeeId);
    if (emp) {
      const available = leave.leaveType === 'annual' ? emp.annualLeaveBalance : emp.sickLeaveBalance;
      if (leave.daysCount > available) {
        throw new Error(
          `رصيد الإجازة المتاح (${available} يوم) غير كافٍ لطلب ${leave.daysCount} يوم.`
        );
      }
    }

    const list = this.getLeaveRequests();
    const newLeave: LeaveRequest = {
      ...leave,
      id: `lev-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isBalanceDeducted: false,
    };
    list.unshift(newLeave);
    this.set(LEAVES_KEY, list);

    this.logAction(
      userId,
      userName,
      `تقديم طلب إجازة ${newLeave.leaveType} لمدة ${newLeave.daysCount} أيام`,
      'LeaveRequest',
      newLeave.id,
      undefined,
      'pending'
    );

    // Notify managers
    this.sendNotificationToAdmins({
      titleAr: 'طلب إجازة جديد بانتظار الاعتماد',
      titleEn: 'New Leave Request Pending',
      messageAr: `قدم الموظف ${userName} طلب إجازة (${newLeave.leaveType === 'annual' ? 'سنوية' : 'مرضية'}) لمدة ${newLeave.daysCount} يوم تبدأ ${newLeave.startDate}.`,
      messageEn: `${userName} submitted a leave request for ${newLeave.daysCount} days starting ${newLeave.startDate}.`,
      type: 'info',
      actionUrl: 'requests',
    });

    return newLeave;
  }

  public reviewLeaveRequest(
    leaveId: string,
    status: RequestStatus,
    rejectionReason?: string,
    reviewerId?: string,
    reviewerName?: string
  ): void {
    const list = this.getLeaveRequests();
    const idx = list.findIndex((l) => l.id === leaveId);
    if (idx === -1) return;

    const leave = list[idx];
    const prevStatus = leave.status;
    const employees = this.getEmployees();
    const empIdx = employees.findIndex((e) => e.id === leave.employeeId);
    const targetEmp = empIdx !== -1 ? employees[empIdx] : null;

    if (status === 'approved') {
      if (!targetEmp) {
        throw new Error('لم يتم العثور على سجل الموظف لاعتماد الإجازة');
      }
      // Double check balance before deducting (idempotent atomic check)
      if (!leave.isBalanceDeducted) {
        const available = leave.leaveType === 'annual' ? targetEmp.annualLeaveBalance : targetEmp.sickLeaveBalance;
        if (leave.daysCount > available) {
          throw new Error(
            `لا يمكن اعتماد الطلب: رصيد الموظف المتاح (${available} يوم) غير كافٍ لمدة الإجازة (${leave.daysCount} يوم).`
          );
        }
        if (leave.leaveType === 'annual') {
          targetEmp.annualLeaveBalance = Math.max(0, targetEmp.annualLeaveBalance - leave.daysCount);
        } else if (leave.leaveType === 'sick') {
          targetEmp.sickLeaveBalance = Math.max(0, targetEmp.sickLeaveBalance - leave.daysCount);
        }
        employees[empIdx] = targetEmp;
        this.set(EMPLOYEES_KEY, employees);
        leave.isBalanceDeducted = true;
      }
      leave.status = 'approved';
      leave.approvedById = reviewerId || '';
      leave.approvedByName = reviewerName || '';
      leave.approvedAt = new Date().toISOString();
      leave.rejectionReason = '';
    } else if (status === 'rejected' || status === 'cancelled') {
      // Revert deduction if previously deducted
      if (leave.isBalanceDeducted && targetEmp && empIdx !== -1) {
        if (leave.leaveType === 'annual') {
          targetEmp.annualLeaveBalance += leave.daysCount;
        } else if (leave.leaveType === 'sick') {
          targetEmp.sickLeaveBalance += leave.daysCount;
        }
        employees[empIdx] = targetEmp;
        this.set(EMPLOYEES_KEY, employees);
        leave.isBalanceDeducted = false;
      }
      leave.status = status;
      leave.approvedById = reviewerId || '';
      leave.approvedByName = reviewerName || '';
      leave.rejectionReason = rejectionReason || '';
      leave.approvedAt = new Date().toISOString();
    } else {
      leave.status = status;
    }

    list[idx] = leave;
    this.set(LEAVES_KEY, list);

    // Send instant notification to the employee
    const employeeUserId = targetEmp?.userId;
    if (employeeUserId) {
      if (status === 'approved') {
        this.sendNotification({
          userId: employeeUserId,
          titleAr: 'تمت الموافقة على طلب الإجازة ✅',
          titleEn: 'Leave Request Approved',
          messageAr: `وافق المشرف ${reviewerName || 'الأدمن'} على طلب إجازتك (${leave.leaveType === 'annual' ? 'سنوية' : 'مرضية'}) للفترة من ${leave.startDate} إلى ${leave.endDate}.`,
          messageEn: `Your leave request was approved by ${reviewerName || 'Admin'}.`,
          type: 'success',
          actionUrl: 'requests',
        });
      } else if (status === 'rejected') {
        this.sendNotification({
          userId: employeeUserId,
          titleAr: 'تم رفض طلب الإجازة ❌',
          titleEn: 'Leave Request Rejected',
          messageAr: `تم رفض طلب إجازتك من قبل ${reviewerName || 'الأدمن'}. السبب: ${rejectionReason || 'لم يحدد سبب'}.`,
          messageEn: `Your leave request was rejected by ${reviewerName || 'Admin'}. Reason: ${rejectionReason || 'None specified'}.`,
          type: 'alert',
          actionUrl: 'requests',
        });
      }
    }

    // Notify all admins of the decision
    this.sendNotificationToAdmins({
      titleAr: `تحديث حالة طلب إجازة (${status === 'approved' ? 'قبول' : 'رفض'})`,
      titleEn: `Leave Request Updated (${status})`,
      messageAr: `قام ${reviewerName || 'المشرف'} بـ (${status === 'approved' ? 'قبول' : 'رفض'}) طلب إجازة ${targetEmp?.nameAr || 'الموظف'}.`,
      messageEn: `${reviewerName || 'Admin'} ${status} leave request for ${targetEmp?.nameEn || 'employee'}.`,
      type: status === 'approved' ? 'info' : 'warning',
      actionUrl: 'requests',
    });

    if (reviewerId && reviewerName) {
      this.logAction(
        reviewerId,
        reviewerName,
        `مراجعة طلب إجازة (${status}): ${leave.reason}`,
        'LeaveRequest',
        leaveId,
        prevStatus,
        status
      );
    }
  }

  // PERMISSION REQUESTS
  public getPermissionRequests(): PermissionRequest[] {
    return this.get<PermissionRequest[]>(PERMISSIONS_KEY, INITIAL_PERMISSIONS);
  }

  public createPermissionRequest(
    perm: Omit<PermissionRequest, 'id' | 'createdAt'>,
    userId: string,
    userName: string
  ): PermissionRequest {
    // Balance validation before submission
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === perm.employeeId);
    if (emp) {
      if (perm.durationHours > emp.permissionHoursBalance) {
        throw new Error(
          `رصيد ساعات المغادرة المتاح (${emp.permissionHoursBalance} ساعة) غير كافٍ لطلب ${perm.durationHours} ساعة.`
        );
      }
    }

    const list = this.getPermissionRequests();
    const newPerm: PermissionRequest = {
      ...perm,
      id: `prm-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isBalanceDeducted: false,
    };
    list.unshift(newPerm);
    this.set(PERMISSIONS_KEY, list);

    this.logAction(
      userId,
      userName,
      `تقديم إذن مغادرة (${newPerm.durationHours} ساعة)`,
      'PermissionRequest',
      newPerm.id,
      undefined,
      'pending'
    );

    this.sendNotificationToAdmins({
      titleAr: 'طلب إذن مغادرة ميداني جديد',
      titleEn: 'New Exit Permission Request',
      messageAr: `طلب ${userName} إذن مغادرة بتاريخ ${newPerm.date} لمدة ${newPerm.durationHours} ساعة (${newPerm.reasonType === 'official' ? 'رسمي' : 'شخصي'}).`,
      messageEn: `${userName} requested ${newPerm.durationHours}h exit permission.`,
      type: 'info',
      actionUrl: 'requests',
    });

    return newPerm;
  }

  public reviewPermissionRequest(
    permId: string,
    status: RequestStatus,
    rejectionReason?: string,
    reviewerId?: string,
    reviewerName?: string
  ): void {
    const list = this.getPermissionRequests();
    const idx = list.findIndex((p) => p.id === permId);
    if (idx === -1) return;

    const perm = list[idx];
    const prevStatus = perm.status;
    const employees = this.getEmployees();
    const empIdx = employees.findIndex((e) => e.id === perm.employeeId);
    const targetEmp = empIdx !== -1 ? employees[empIdx] : null;

    if (status === 'approved') {
      if (!targetEmp) {
        throw new Error('لم يتم العثور على سجل الموظف لاعتماد إذن المغادرة');
      }
      if (!perm.isBalanceDeducted) {
        if (perm.durationHours > targetEmp.permissionHoursBalance) {
          throw new Error(
            `لا يمكن اعتماد الطلب: رصيد ساعات المغادرة المتاح (${targetEmp.permissionHoursBalance} ساعة) غير كافٍ للمدة المطلوبة (${perm.durationHours} ساعة).`
          );
        }
        targetEmp.permissionHoursBalance = Math.max(
          0,
          Math.round((targetEmp.permissionHoursBalance - perm.durationHours) * 10) / 10
        );
        employees[empIdx] = targetEmp;
        this.set(EMPLOYEES_KEY, employees);
        perm.isBalanceDeducted = true;
      }
      perm.status = 'approved';
      perm.approvedById = reviewerId || '';
      perm.approvedByName = reviewerName || '';
      perm.approvedAt = new Date().toISOString();
      perm.rejectionReason = '';
    } else if (status === 'rejected' || status === 'cancelled') {
      if (perm.isBalanceDeducted && targetEmp && empIdx !== -1) {
        targetEmp.permissionHoursBalance =
          Math.round((targetEmp.permissionHoursBalance + perm.durationHours) * 10) / 10;
        employees[empIdx] = targetEmp;
        this.set(EMPLOYEES_KEY, employees);
        perm.isBalanceDeducted = false;
      }
      perm.status = status;
      perm.approvedById = reviewerId || '';
      perm.approvedByName = reviewerName || '';
      perm.rejectionReason = rejectionReason || '';
      perm.approvedAt = new Date().toISOString();
    } else {
      perm.status = status;
    }

    list[idx] = perm;
    this.set(PERMISSIONS_KEY, list);

    // Send instant notification to the employee
    const employeeUserId = targetEmp?.userId;
    if (employeeUserId) {
      if (status === 'approved') {
        this.sendNotification({
          userId: employeeUserId,
          titleAr: 'تمت الموافقة على إذن المغادرة ✅',
          titleEn: 'Exit Permission Approved',
          messageAr: `وافق ${reviewerName || 'الأدمن'} على إذن المغادرة الخاص بك ليوم ${perm.date} (${perm.startTime} - ${perm.endTime}).`,
          messageEn: `Your exit permission was approved by ${reviewerName || 'Admin'}.`,
          type: 'success',
          actionUrl: 'requests',
        });
      } else if (status === 'rejected') {
        this.sendNotification({
          userId: employeeUserId,
          titleAr: 'تم رفض إذن المغادرة ❌',
          titleEn: 'Exit Permission Rejected',
          messageAr: `تم رفض إذن المغادرة الخاص بك بواسطة ${reviewerName || 'الأدمن'}. السبب: ${rejectionReason || 'لم يحدد سبب'}.`,
          messageEn: `Your exit permission was rejected by ${reviewerName || 'Admin'}.`,
          type: 'alert',
          actionUrl: 'requests',
        });
      }
    }

    // Notify admins
    this.sendNotificationToAdmins({
      titleAr: `تحديث حالة إذن مغادرة (${status === 'approved' ? 'قبول' : 'رفض'})`,
      titleEn: `Exit Permission ${status}`,
      messageAr: `قام ${reviewerName || 'المشرف'} بـ (${status === 'approved' ? 'قبول' : 'رفض'}) إذن مغادرة ${targetEmp?.nameAr || 'الموظف'}.`,
      messageEn: `${reviewerName || 'Admin'} ${status} exit permission for ${targetEmp?.nameEn || 'employee'}.`,
      type: status === 'approved' ? 'info' : 'warning',
      actionUrl: 'requests',
    });

    if (reviewerId && reviewerName) {
      this.logAction(
        reviewerId,
        reviewerName,
        `مراجعة إذن مغادرة (${status}): ${perm.reason}`,
        'PermissionRequest',
        permId,
        prevStatus,
        status
      );
    }
  }

  // DOCUMENTS (Technical Archive)
  public getDocuments(): PlantDocument[] {
    const stored = this.get<PlantDocument[]>(DOCUMENTS_KEY, INITIAL_DOCUMENTS);
    return (stored || []).filter((doc) => !doc.deleted);
  }

  public getDocumentById(id: string): PlantDocument | undefined {
    return this.getDocuments().find((d) => d.id === id);
  }

  public createDocument(
    doc: Omit<PlantDocument, 'id' | 'createdAt'>,
    userId: string,
    userName: string
  ): PlantDocument {
    const stored = this.get<PlantDocument[]>(DOCUMENTS_KEY, INITIAL_DOCUMENTS);
    const newDoc: PlantDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedBy: userName,
      uploadedByUserId: userId,
    };
    stored.unshift(newDoc);
    this.set(DOCUMENTS_KEY, stored);

    this.logAction(
      userId,
      userName,
      `أرشفة ورفع مستند جديد في الأرشيف الفني: ${newDoc.titleAr} (${newDoc.category})`,
      'Document',
      newDoc.id
    );

    this.sendNotificationToAdmins({
      titleAr: 'مستند فني جديد 📁',
      titleEn: 'New Technical Document',
      messageAr: `قام ${userName} برفع مستند جديد في الأرشيف الفني: ${newDoc.titleAr}.`,
      messageEn: `${userName} uploaded a new technical document: ${newDoc.titleEn || newDoc.titleAr}.`,
      type: 'info',
      actionUrl: 'documents',
    });

    return newDoc;
  }

  public updateDocument(
    id: string,
    updates: Partial<PlantDocument>,
    userId: string,
    userName: string
  ): PlantDocument | undefined {
    const stored = this.get<PlantDocument[]>(DOCUMENTS_KEY, INITIAL_DOCUMENTS);
    const idx = stored.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;

    const oldDoc = stored[idx];
    const updated: PlantDocument = {
      ...oldDoc,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    stored[idx] = updated;
    this.set(DOCUMENTS_KEY, stored);

    this.logAction(
      userId,
      userName,
      `تعديل بيانات مستند في الأرشيف الفني: ${updated.titleAr}`,
      'Document',
      id
    );

    return updated;
  }

  public replaceDocumentAttachment(
    id: string,
    attachment: {
      fileData: string;
      fileName: string;
      fileType: string;
      fileSizeBytes: number;
    },
    userId: string,
    userName: string
  ): PlantDocument | undefined {
    const stored = this.get<PlantDocument[]>(DOCUMENTS_KEY, INITIAL_DOCUMENTS);
    const idx = stored.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;

    const oldDoc = stored[idx];
    const updated: PlantDocument = {
      ...oldDoc,
      fileData: attachment.fileData,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSizeBytes: attachment.fileSizeBytes,
      fileSize: `${Math.round((attachment.fileSizeBytes / (1024 * 1024)) * 10) / 10 || 0.1} MB`,
      updatedAt: new Date().toISOString(),
    };
    stored[idx] = updated;
    this.set(DOCUMENTS_KEY, stored);

    this.logAction(
      userId,
      userName,
      `استبدال المرفق الفني للمستند (${oldDoc.titleAr}) بملف جديد (${attachment.fileName})`,
      'Document',
      id
    );

    return updated;
  }

  public deleteDocument(
    id: string,
    userId: string,
    userName: string
  ): boolean {
    const stored = this.get<PlantDocument[]>(DOCUMENTS_KEY, INITIAL_DOCUMENTS);
    const idx = stored.findIndex((d) => d.id === id);
    if (idx === -1) return false;

    const target = stored[idx];
    target.deleted = true;
    target.deletedAt = new Date().toISOString();
    target.deletedBy = userName;
    target.deletedByUserId = userId;
    stored[idx] = target;
    this.set(DOCUMENTS_KEY, stored);

    this.logAction(
      userId,
      userName,
      `حذف مستند من الأرشيف الفني نهائياً: ${target.titleAr}`,
      'Document',
      id,
      'ACTIVE',
      'DELETED'
    );

    this.sendNotificationToAdmins({
      titleAr: 'حذف مستند من الأرشيف الفني 🗑️',
      titleEn: 'Document Deleted',
      messageAr: `قام المسؤول ${userName} بحذف المستند (${target.titleAr}) من الأرشيف الفني.`,
      messageEn: `Admin ${userName} deleted document "${target.titleEn || target.titleAr}".`,
      type: 'warning',
      actionUrl: 'documents',
    });

    return true;
  }

  // AUDIT LOGS
  public getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>(AUDIT_LOGS_KEY, INITIAL_AUDIT_LOGS);
  }

  // NOTIFICATIONS
  public getNotifications(): SystemNotification[] {
    return this.get<SystemNotification[]>(NOTIFICATIONS_KEY, INITIAL_NOTIFICATIONS);
  }

  public markNotificationAsRead(notifId: string): void {
    const list = this.getNotifications();
    const idx = list.findIndex((n) => n.id === notifId);
    if (idx !== -1) {
      list[idx].read = true;
      this.set(NOTIFICATIONS_KEY, list);
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    const list = this.getNotifications();
    list.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    this.set(NOTIFICATIONS_KEY, list);
  }

  // PLANT & SYSTEM PROFILE (Introductory and descriptive texts)
  public getPlantProfile(): PlantProfile {
    return this.get<PlantProfile>(PLANT_PROFILE_KEY, DEFAULT_PLANT_PROFILE);
  }

  public updatePlantProfile(
    updates: Partial<PlantProfile>,
    actorId: string,
    actorName: string
  ): PlantProfile {
    const current = this.getPlantProfile();
    const updated: PlantProfile = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
      updatedBy: actorName,
    };
    this.set(PLANT_PROFILE_KEY, updated);

    this.logAction(
      actorId,
      actorName,
      'تحديث النصوص والبيانات التعريفية الخاصة بالمحطة والنظام',
      'PlantProfile',
      'profile-1'
    );

    return updated;
  }

  public resetPlantProfile(actorId: string, actorName: string): PlantProfile {
    this.set(PLANT_PROFILE_KEY, DEFAULT_PLANT_PROFILE);

    this.logAction(
      actorId,
      actorName,
      'استعادة النصوص والبيانات التعريفية الافتراضية للمحطة',
      'PlantProfile',
      'profile-1'
    );

    return DEFAULT_PLANT_PROFILE;
  }
}

export const db = new DatabaseService();
