export interface DefaultUnitDefinition {
  code: string;
  name: string;
  abbreviation: string;
  symbol: string;
  category: string;
  decimals: number;
  keywords: string;
}

export const DEFAULT_UNITS_LIBRARY: DefaultUnitDefinition[] = [
  // --- LENGTH ---
  { code: 'MM', name: 'Millimeter', abbreviation: 'mm', symbol: 'mm', category: 'Length', decimals: 2, keywords: 'length distance millimeter mm' },
  { code: 'CM', name: 'Centimeter', abbreviation: 'cm', symbol: 'cm', category: 'Length', decimals: 2, keywords: 'length distance centimeter cm' },
  { code: 'METER', name: 'Meter', abbreviation: 'm', symbol: 'm', category: 'Length', decimals: 2, keywords: 'length distance meter m' },
  { code: 'KM', name: 'Kilometer', abbreviation: 'km', symbol: 'km', category: 'Length', decimals: 2, keywords: 'length distance kilometer km' },
  { code: 'INCH', name: 'Inch', abbreviation: 'in', symbol: 'in', category: 'Length', decimals: 2, keywords: 'length distance inch in' },
  { code: 'FEET', name: 'Foot', abbreviation: 'ft', symbol: 'ft', category: 'Length', decimals: 2, keywords: 'length distance foot feet ft' },
  { code: 'YARD', name: 'Yard', abbreviation: 'yd', symbol: 'yd', category: 'Length', decimals: 2, keywords: 'length distance yard yd' },
  { code: 'MILE', name: 'Mile', abbreviation: 'mi', symbol: 'mi', category: 'Length', decimals: 2, keywords: 'length distance mile mi' },

  // --- AREA ---
  { code: 'SQMM', name: 'Square Millimeter', abbreviation: 'sq mm', symbol: 'mm²', category: 'Area', decimals: 2, keywords: 'area sqmm mm2' },
  { code: 'SQCM', name: 'Square Centimeter', abbreviation: 'sq cm', symbol: 'cm²', category: 'Area', decimals: 2, keywords: 'area sqcm cm2' },
  { code: 'SQM', name: 'Square Meter', abbreviation: 'sq m', symbol: 'm²', category: 'Area', decimals: 2, keywords: 'area sqm m2' },
  { code: 'SQFT', name: 'Square Feet', abbreviation: 'sq ft', symbol: 'ft²', category: 'Area', decimals: 2, keywords: 'area sqft ft2 square feet' },
  { code: 'SQYD', name: 'Square Yard', abbreviation: 'sq yd', symbol: 'yd²', category: 'Area', decimals: 2, keywords: 'area sqyd yd2' },
  { code: 'ACRE', name: 'Acre', abbreviation: 'acre', symbol: 'acre', category: 'Area', decimals: 2, keywords: 'area land acre' },
  { code: 'HECTARE', name: 'Hectare', abbreviation: 'ha', symbol: 'ha', category: 'Area', decimals: 2, keywords: 'area land hectare ha' },

  // --- VOLUME ---
  { code: 'ML', name: 'Milliliter', abbreviation: 'ml', symbol: 'ml', category: 'Volume', decimals: 2, keywords: 'volume liquid milliliter ml' },
  { code: 'LTR', name: 'Liter', abbreviation: 'L', symbol: 'L', category: 'Volume', decimals: 2, keywords: 'volume liquid liter ltr' },
  { code: 'CC', name: 'Cubic Centimeter', abbreviation: 'cc', symbol: 'cc', category: 'Volume', decimals: 2, keywords: 'volume cubic centimeter cc' },
  { code: 'CUM', name: 'Cubic Meter', abbreviation: 'cu m', symbol: 'm³', category: 'Volume', decimals: 2, keywords: 'volume cubic meter cum' },
  { code: 'CFT', name: 'Cubic Feet', abbreviation: 'cu ft', symbol: 'ft³', category: 'Volume', decimals: 2, keywords: 'volume cubic feet cft' },
  { code: 'GAL', name: 'Gallon', abbreviation: 'gal', symbol: 'gal', category: 'Volume', decimals: 2, keywords: 'volume liquid gallon gal' },

  // --- WEIGHT ---
  { code: 'MG', name: 'Milligram', abbreviation: 'mg', symbol: 'mg', category: 'Weight', decimals: 2, keywords: 'weight mass milligram mg' },
  { code: 'GRAM', name: 'Gram', abbreviation: 'g', symbol: 'g', category: 'Weight', decimals: 2, keywords: 'weight mass gram g' },
  { code: 'KG', name: 'Kilogram', abbreviation: 'kg', symbol: 'kg', category: 'Weight', decimals: 2, keywords: 'weight mass kilogram kg' },
  { code: 'TON', name: 'Metric Ton', abbreviation: 'MT', symbol: 'MT', category: 'Weight', decimals: 2, keywords: 'weight mass metric ton mt' },
  { code: 'LB', name: 'Pound', abbreviation: 'lb', symbol: 'lb', category: 'Weight', decimals: 2, keywords: 'weight mass pound lb' },
  { code: 'OZ', name: 'Ounce', abbreviation: 'oz', symbol: 'oz', category: 'Weight', decimals: 2, keywords: 'weight mass ounce oz' },

  // --- COUNT & QUANTITY ---
  { code: 'PCS', name: 'Piece', abbreviation: 'Pcs', symbol: 'pcs', category: 'Count', decimals: 0, keywords: 'piece pcs count quantity item' },
  { code: 'NOS', name: 'Numbers', abbreviation: 'Nos', symbol: 'nos', category: 'Count', decimals: 0, keywords: 'numbers nos count item' },
  { code: 'UNIT', name: 'Unit', abbreviation: 'U', symbol: 'u', category: 'Count', decimals: 0, keywords: 'unit count item' },
  { code: 'EACH', name: 'Each', abbreviation: 'ea', symbol: 'ea', category: 'Count', decimals: 0, keywords: 'each ea count' },
  { code: 'DOZEN', name: 'Dozen', abbreviation: 'doz', symbol: 'doz', category: 'Count', decimals: 0, keywords: 'dozen doz 12' },
  { code: 'PAIR', name: 'Pair', symbol: 'pr', abbreviation: 'pr', category: 'Count', decimals: 0, keywords: 'pair pr 2 shoes' },
  { code: 'SET', name: 'Set', symbol: 'set', abbreviation: 'set', category: 'Count', decimals: 0, keywords: 'set combo group' },
  { code: 'PACK', name: 'Pack', abbreviation: 'pk', symbol: 'pk', category: 'Count', decimals: 0, keywords: 'pack packet bundle' },
  { code: 'BOX', name: 'Box', abbreviation: 'box', symbol: 'box', category: 'Packaging', decimals: 0, keywords: 'box carton container' },
  { code: 'CARTON', name: 'Carton', abbreviation: 'ctn', symbol: 'ctn', category: 'Packaging', decimals: 0, keywords: 'carton ctn box' },
  { code: 'BUNDLE', name: 'Bundle', abbreviation: 'bdl', symbol: 'bdl', category: 'Packaging', decimals: 0, keywords: 'bundle bdl tied' },
  { code: 'PACKET', name: 'Packet', abbreviation: 'pkt', symbol: 'pkt', category: 'Packaging', decimals: 0, keywords: 'packet pkt small pack' },
  { code: 'BOTTLE', name: 'Bottle', abbreviation: 'btl', symbol: 'btl', category: 'Packaging', decimals: 0, keywords: 'bottle btl liquid' },
  { code: 'CAN', name: 'Can', abbreviation: 'can', symbol: 'can', category: 'Packaging', decimals: 0, keywords: 'can aluminum tin' },
  { code: 'JAR', name: 'Jar', abbreviation: 'jar', symbol: 'jar', category: 'Packaging', decimals: 0, keywords: 'jar glass plastic' },
  { code: 'TUBE', name: 'Tube', abbreviation: 'tb', symbol: 'tb', category: 'Packaging', decimals: 0, keywords: 'tube paste cream' },
  { code: 'STRIP', name: 'Strip', abbreviation: 'stp', symbol: 'stp', category: 'Packaging', decimals: 0, keywords: 'strip medicine tablets' },
  { code: 'ROLL', name: 'Roll', abbreviation: 'rl', symbol: 'rl', category: 'Packaging', decimals: 0, keywords: 'roll paper tape foil' },
  { code: 'BAG', name: 'Bag', abbreviation: 'bag', symbol: 'bag', category: 'Packaging', decimals: 0, keywords: 'bag sack pouch' },
  { code: 'SACK', name: 'Sack', abbreviation: 'sck', symbol: 'sck', category: 'Packaging', decimals: 0, keywords: 'sack large bag grain' },
  { code: 'DRUM', name: 'Drum', abbreviation: 'drm', symbol: 'drm', category: 'Packaging', decimals: 0, keywords: 'drum barrel chemical' },
  { code: 'BARREL', name: 'Barrel', abbreviation: 'bbl', symbol: 'bbl', category: 'Packaging', decimals: 0, keywords: 'barrel bbl oil' },
  { code: 'PALLET', name: 'Pallet', abbreviation: 'plt', symbol: 'plt', category: 'Packaging', decimals: 0, keywords: 'pallet wooden stack' },
  { code: 'TRAY', name: 'Tray', abbreviation: 'try', symbol: 'try', category: 'Packaging', decimals: 0, keywords: 'tray eggs plastic' },
  { code: 'SHEET', name: 'Sheet', abbreviation: 'sht', symbol: 'sht', category: 'Packaging', decimals: 0, keywords: 'sheet paper metal glass' },
  { code: 'COIL', name: 'Coil', abbreviation: 'cl', symbol: 'cl', category: 'Packaging', decimals: 0, keywords: 'coil wire cable' },
  { code: 'BLOCK', name: 'Block', abbreviation: 'blk', symbol: 'blk', category: 'Packaging', decimals: 0, keywords: 'block solid brick' },

  // --- LENGTH BASED SALES ---
  { code: 'RMTR', name: 'Running Meter', abbreviation: 'Rmtr', symbol: 'Rmtr', category: 'Length', decimals: 2, keywords: 'running meter rmtr pipe fabric' },
  { code: 'RFT', name: 'Running Feet', abbreviation: 'Rft', symbol: 'Rft', category: 'Length', decimals: 2, keywords: 'running feet rft pipe wood' },
  { code: 'MROLL', name: 'Meter Roll', abbreviation: 'm roll', symbol: 'm roll', category: 'Length', decimals: 2, keywords: 'meter roll fabric carpet' },
  { code: 'FTROLL', name: 'Foot Roll', abbreviation: 'ft roll', symbol: 'ft roll', category: 'Length', decimals: 2, keywords: 'foot roll wire mesh' },

  // --- WATER INDUSTRY ---
  { code: 'JAR_20L', name: '20L Jar', abbreviation: '20L Jar', symbol: '20L Jar', category: 'Water Industry', decimals: 0, keywords: 'water jar 20 liter 20l bubble top' },
  { code: 'JAR_10L', name: '10L Jar', abbreviation: '10L Jar', symbol: '10L Jar', category: 'Water Industry', decimals: 0, keywords: 'water jar 10 liter 10l' },
  { code: 'CAN_5L', name: '5L Can', abbreviation: '5L Can', symbol: '5L Can', category: 'Water Industry', decimals: 0, keywords: 'water can 5 liter 5l' },
  { code: 'BTL_2L', name: '2L Bottle', abbreviation: '2L Btl', symbol: '2L Btl', category: 'Water Industry', decimals: 0, keywords: 'water bottle 2 liter 2l' },
  { code: 'BTL_1L', name: '1L Bottle', abbreviation: '1L Btl', symbol: '1L Btl', category: 'Water Industry', decimals: 0, keywords: 'water bottle 1 liter 1l' },
  { code: 'BTL_500ML', name: '500ml Bottle', abbreviation: '500ml Btl', symbol: '500ml Btl', category: 'Water Industry', decimals: 0, keywords: 'water bottle 500ml' },
  { code: 'BTL_300ML', name: '300ml Bottle', abbreviation: '300ml Btl', symbol: '300ml Btl', category: 'Water Industry', decimals: 0, keywords: 'water bottle 300ml' },
  { code: 'BTL_250ML', name: '250ml Bottle', abbreviation: '250ml Btl', symbol: '250ml Btl', category: 'Water Industry', decimals: 0, keywords: 'water bottle 250ml' },
  { code: 'CUP_WATER', name: 'Cup', abbreviation: 'cup', symbol: 'cup', category: 'Water Industry', decimals: 0, keywords: 'water cup pouch disposable' },

  // --- EDUCATION & COURSES ---
  { code: 'COURSE', name: 'Course', abbreviation: 'crs', symbol: 'crs', category: 'Education', decimals: 0, keywords: 'course education training class' },
  { code: 'STUDENT', name: 'Student', abbreviation: 'std', symbol: 'std', category: 'Education', decimals: 0, keywords: 'student candidate student seat' },
  { code: 'ENROLLMENT', name: 'Enrollment', abbreviation: 'enr', symbol: 'enr', category: 'Education', decimals: 0, keywords: 'enrollment admission registration' },
  { code: 'SESSION', name: 'Session', abbreviation: 'sess', symbol: 'sess', category: 'Education', decimals: 0, keywords: 'session class lecture' },
  { code: 'MODULE', name: 'Module', abbreviation: 'mod', symbol: 'mod', category: 'Education', decimals: 0, keywords: 'module subject chapter' },
  { code: 'CLASS', name: 'Class', abbreviation: 'cls', symbol: 'cls', category: 'Education', decimals: 0, keywords: 'class grade lecture' },
  { code: 'LESSON', name: 'Lesson', abbreviation: 'lsn', symbol: 'lsn', category: 'Education', decimals: 0, keywords: 'lesson topic' },
  { code: 'CR_HR', name: 'Credit Hour', abbreviation: 'cr hr', symbol: 'cr hr', category: 'Education', decimals: 1, keywords: 'credit hour university academic' },
  { code: 'SEMESTER', name: 'Semester', abbreviation: 'sem', symbol: 'sem', category: 'Education', decimals: 0, keywords: 'semester term academic' },
  { code: 'TR_HR', name: 'Training Hour', abbreviation: 'tr hr', symbol: 'tr hr', category: 'Education', decimals: 1, keywords: 'training hour course time' },
  { code: 'CERTIFICATE', name: 'Certificate', abbreviation: 'cert', symbol: 'cert', category: 'Education', decimals: 0, keywords: 'certificate diploma degree' },

  // --- LABORATORY & TESTING ---
  { code: 'SAMPLE', name: 'Sample', abbreviation: 'smp', symbol: 'smp', category: 'Laboratory', decimals: 0, keywords: 'sample lab specimen specimen' },
  { code: 'TEST', name: 'Test', abbreviation: 'tst', symbol: 'tst', category: 'Laboratory', decimals: 0, keywords: 'test lab examination diagnostic' },
  { code: 'WATER_TEST', name: 'Water Test', abbreviation: 'wtr tst', symbol: 'wtr tst', category: 'Laboratory', decimals: 0, keywords: 'water test purity ph dissolved solids lab' },
  { code: 'CHEM_TEST', name: 'Chemical Test', abbreviation: 'chm tst', symbol: 'chm tst', category: 'Laboratory', decimals: 0, keywords: 'chemical test assay reaction' },
  { code: 'MICRO_TEST', name: 'Microbiology Test', abbreviation: 'mb tst', symbol: 'mb tst', category: 'Laboratory', decimals: 0, keywords: 'microbiology test culture bacteria lab' },
  { code: 'ANALYSIS', name: 'Analysis', abbreviation: 'anl', symbol: 'anl', category: 'Laboratory', decimals: 0, keywords: 'analysis lab study report' },
  { code: 'REPORT', name: 'Report', abbreviation: 'rpt', symbol: 'rpt', category: 'Laboratory', decimals: 0, keywords: 'report test result certificate' },
  { code: 'EXPERIMENT', name: 'Experiment', abbreviation: 'exp', symbol: 'exp', category: 'Laboratory', decimals: 0, keywords: 'experiment trial research' },
  { code: 'READING', name: 'Reading', abbreviation: 'rdg', symbol: 'rdg', category: 'Laboratory', decimals: 0, keywords: 'reading meter measure value' },

  // --- HEALTHCARE ---
  { code: 'PATIENT', name: 'Patient', abbreviation: 'pt', symbol: 'pt', category: 'Healthcare', decimals: 0, keywords: 'patient person hospital clinic' },
  { code: 'VISIT', name: 'Visit', abbreviation: 'vst', symbol: 'vst', category: 'Healthcare', decimals: 0, keywords: 'visit consultation opd doctor' },
  { code: 'PROCEDURE', name: 'Procedure', abbreviation: 'proc', symbol: 'proc', category: 'Healthcare', decimals: 0, keywords: 'procedure surgery treatment medical' },
  { code: 'DOSE', name: 'Dose', abbreviation: 'dose', symbol: 'dose', category: 'Healthcare', decimals: 0, keywords: 'dose medicine dosage' },
  { code: 'INJECTION', name: 'Injection', abbreviation: 'inj', symbol: 'inj', category: 'Healthcare', decimals: 0, keywords: 'injection shot iv vaccine' },
  { code: 'TABLET', name: 'Tablet', abbreviation: 'tab', symbol: 'tab', category: 'Healthcare', decimals: 0, keywords: 'tablet pill medicine' },
  { code: 'CAPSULE', name: 'Capsule', abbreviation: 'cap', symbol: 'cap', category: 'Healthcare', decimals: 0, keywords: 'capsule medicine pill' },
  { code: 'VIAL', name: 'Vial', abbreviation: 'vial', symbol: 'vial', category: 'Healthcare', decimals: 0, keywords: 'vial liquid bottle medicine' },

  // --- SERVICES & TIME ---
  { code: 'HOUR', name: 'Hour', abbreviation: 'hr', symbol: 'hr', category: 'Service', decimals: 2, keywords: 'hour hr time service billing' },
  { code: 'DAY', name: 'Day', abbreviation: 'day', symbol: 'day', category: 'Service', decimals: 1, keywords: 'day time daily service' },
  { code: 'WEEK', name: 'Week', abbreviation: 'wk', symbol: 'wk', category: 'Service', decimals: 1, keywords: 'week weekly service' },
  { code: 'MONTH', name: 'Month', abbreviation: 'mo', symbol: 'mo', category: 'Service', decimals: 1, keywords: 'month monthly service subscription' },
  { code: 'YEAR', name: 'Year', abbreviation: 'yr', symbol: 'yr', category: 'Service', decimals: 1, keywords: 'year yearly annual' },
  { code: 'PROJECT', name: 'Project', abbreviation: 'proj', symbol: 'proj', category: 'Service', decimals: 0, keywords: 'project turnkey scope' },
  { code: 'JOB', name: 'Job', abbreviation: 'job', symbol: 'job', category: 'Service', decimals: 0, keywords: 'job task assignment' },
  { code: 'TASK', name: 'Task', abbreviation: 'task', symbol: 'task', category: 'Service', decimals: 0, keywords: 'task subtask work' },
  { code: 'CONSULTATION', name: 'Consultation', abbreviation: 'con', symbol: 'con', category: 'Service', decimals: 0, keywords: 'consultation advice professional' },
  { code: 'LICENSE', name: 'License', abbreviation: 'lic', symbol: 'lic', category: 'Service', decimals: 0, keywords: 'license permit right' },
  { code: 'SUBSCRIPTION', name: 'Subscription', abbreviation: 'sub', symbol: 'sub', category: 'Service', decimals: 0, keywords: 'subscription SaaS recurring' },
  { code: 'MAINTENANCE', name: 'Maintenance', abbreviation: 'maint', symbol: 'maint', category: 'Service', decimals: 0, keywords: 'maintenance amc support' },

  // --- DIGITAL PRODUCTS ---
  { code: 'USER', name: 'User', abbreviation: 'usr', symbol: 'usr', category: 'Digital', decimals: 0, keywords: 'user account login digital' },
  { code: 'SEAT', name: 'Seat', abbreviation: 'seat', symbol: 'seat', category: 'Digital', decimals: 0, keywords: 'seat user license saas' },
  { code: 'DOWNLOAD', name: 'Download', abbreviation: 'dwn', symbol: 'dwn', category: 'Digital', decimals: 0, keywords: 'download file digital product' },
  { code: 'ACTIVATION', name: 'Activation', abbreviation: 'act', symbol: 'act', category: 'Digital', decimals: 0, keywords: 'activation key software' },
  { code: 'LICENSE_KEY', name: 'License Key', abbreviation: 'key', symbol: 'key', category: 'Digital', decimals: 0, keywords: 'license key token serial' },
];
