const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const tls = require('tls');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const RUNTIME_DATA_FILE = path.join(os.tmpdir(), 'bsiisupport-data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_SECRET = process.env.SESSION_SECRET || 'bsiisupport-portal-secret-2026';

// Load optional .env file so developer-configured mail relay works silently behind the scenes
(function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  });
})();

const DEFAULT_DATA = {
  settings: {
    globalCcEmail: 'admin.brightstar@gmail.com',
    globalCcEnabled: false,
    seasonalRoleNote: 'Team Leader currently acts as Accounting & Payroll Officer (editable per season).',
    classifications: ['BSII Employee', 'Esteems Employee'],
    departmentEmails: {
      'HR Admin': 'hr@bsii.com.ph',
      'Purchasing Officer': 'purchasing@bsii.com.ph',
      'Office of the Vice President, BSII': 'vp.bsii@bsii.com.ph',
      'Office of the Vice President, Esteems': 'vp.esteems@bsii.com.ph',
      'Team Leader': 'accounting@bsii.com.ph',
      'Accounting & Payroll': 'accounting@bsii.com.ph'
    }
  },
  users: [
    {
      id: '100001',
      lastName: 'BRIGHTSTAR',
      adminUsername: 'bsii.hradmin',
      adminPassword: 'BsiiAdmin!2026',
      fullName: 'Victoria Brightstar',
      company: 'BSII Employee',
      role: 'Master Administrator',
      department: 'HR Admin',
      isStaff: true,
      isHR: true,
      isMasterAdmin: true,
      email: 'hr.admin@bsii.com.ph',
      mobile: '0917-100-0001',
      updatedAt: '2026-11-01T08:00:00.000Z'
    },
    {
      id: '200002',
      lastName: 'SANTOS',
      adminUsername: 'bsii.teamlead',
      adminPassword: 'TeamLead!2026',
      fullName: 'Elena Santos',
      company: 'BSII Employee',
      role: 'Team Leader & Accounting Officer',
      department: 'Team Leader',
      secondaryDepartments: ['Accounting & Payroll'],
      isStaff: true,
      isHR: false,
      isMasterAdmin: false,
      email: 'accounting@bsii.com.ph',
      mobile: '0917-200-0002',
      updatedAt: '2026-11-01T08:00:00.000Z'
    },
    {
      id: '300003',
      lastName: 'REYES',
      adminUsername: 'bsii.purchasing',
      adminPassword: 'Purchaser!2026',
      fullName: 'Marco Reyes',
      company: 'BSII Employee',
      role: 'Purchasing Officer',
      department: 'Purchasing Officer',
      isStaff: true,
      isHR: false,
      isMasterAdmin: false,
      email: 'purchasing@bsii.com.ph',
      mobile: '0917-300-0003',
      updatedAt: '2026-11-01T08:00:00.000Z'
    },
    {
      id: '400004',
      lastName: 'LIM',
      adminUsername: 'bsii.vpbsii',
      adminPassword: 'VpBsii!2026',
      fullName: 'Alexander Lim',
      company: 'BSII Employee',
      role: 'Vice President, BSII',
      department: 'Office of the Vice President, BSII',
      isStaff: true,
      isHR: false,
      isMasterAdmin: false,
      email: 'vp.bsii@bsii.com.ph',
      mobile: '0917-400-0004',
      updatedAt: '2026-11-01T08:00:00.000Z'
    },
    {
      id: '500005',
      lastName: 'TAN',
      adminUsername: 'bsii.vpesteems',
      adminPassword: 'VpEsteems!2026',
      fullName: 'Sophia Tan',
      company: 'Esteems Employee',
      role: 'Vice President, Esteems',
      department: 'Office of the Vice President, Esteems',
      isStaff: true,
      isHR: false,
      isMasterAdmin: false,
      email: 'vp.esteems@bsii.com.ph',
      mobile: '0917-500-0005',
      updatedAt: '2026-11-01T08:00:00.000Z'
    },
    {
      id: '676767',
      lastName: 'BRIGHTSTAR',
      fullName: 'Juan Dela Cruz',
      company: 'BSII Employee',
      role: 'Operations Specialist',
      department: 'Operations',
      isStaff: false,
      isHR: false,
      isMasterAdmin: false,
      email: 'juan.delacruz@bsii.com.ph',
      mobile: '0917-676-7676',
      updatedAt: '2026-11-10T09:30:00.000Z'
    },
    {
      id: '888888',
      lastName: 'CRUZ',
      fullName: 'Maria Clara Cruz',
      company: 'Esteems Employee',
      role: 'Brand Coordinator',
      department: 'Marketing',
      isStaff: false,
      isHR: false,
      isMasterAdmin: false,
      email: 'maria.cruz@esteems.com.ph',
      mobile: '0918-888-8888',
      updatedAt: '2026-11-12T10:15:00.000Z'
    },
    {
      id: '000001',
      lastName: 'SALADAGA',
      adminUsername: 'bsii.moderator',
      adminPassword: 'Moderator!2026',
      fullName: 'Jan Eric Saladaga',
      company: 'BSII Employee',
      role: 'HR Admin',
      department: 'HR Admin',
      isStaff: true,
      isHR: true,
      isMasterAdmin: true,
      isModerator: true,
      needsProfileSync: true,
      hasCompletedFirstSelfUpdate: false,
      email: 'saladagajaneric@gmail.com',
      mobile: '0917-000-0001',
      updatedAt: '2026-11-19T01:23:20.000Z'
    }
  ],
  requests: [
    {
      id: 'REQ-2026-1001',
      employeeId: '676767',
      employeeName: 'Juan Dela Cruz',
      employeeCompany: 'BSII Employee',
      employeeEmail: 'juan.delacruz@bsii.com.ph',
      employeeMobile: '0917-676-7676',
      department: 'Team Leader',
      category: 'Expense Reimbursement',
      details: {
        'Amount (PHP / ₱)': '₱4,250.00',
        'Invoice / Receipt Reference': 'OR-994812 (Client Logistics Meals)',
        'Disbursement Bank / Details': 'BDO Payroll Account - ****4512'
      },
      ccDepartments: ['HR Admin'],
      ccEmails: ['hr@bsii.com.ph', 'admin.brightstar@gmail.com'],
      customMonitoringEmails: ['admin.brightstar@gmail.com'],
      status: 'In Progress',
      priority: 'Normal',
      createdAt: '2026-11-14T09:20:00.000Z',
      updatedAt: '2026-11-15T14:10:00.000Z',
      deletedAt: null,
      deletedBy: null,
      comments: [
        {
          id: 'CMT-1',
          authorName: 'Elena Santos',
          authorRole: 'Team Leader & Accounting Officer',
          message: 'Receipt verified against Q4 operational budget. Queued for Friday disbursement batch.',
          createdAt: '2026-11-15T14:10:00.000Z'
        }
      ]
    },
    {
      id: 'REQ-2026-1002',
      employeeId: '676767',
      employeeName: 'Juan Dela Cruz',
      employeeCompany: 'BSII Employee',
      employeeEmail: 'juan.delacruz@bsii.com.ph',
      employeeMobile: '0917-676-7676',
      department: 'HR Admin',
      category: 'Certificate of Employment (COE)',
      details: {
        'Purpose': 'Visa Application',
        'Compensation Breakdown': 'With Compensation Breakdown'
      },
      ccDepartments: [],
      ccEmails: ['admin.brightstar@gmail.com'],
      customMonitoringEmails: ['admin.brightstar@gmail.com'],
      status: 'Approved / Completed',
      priority: 'Normal',
      createdAt: '2026-11-10T11:00:00.000Z',
      updatedAt: '2026-11-11T16:30:00.000Z',
      deletedAt: null,
      deletedBy: null,
      comments: [
        {
          id: 'CMT-2',
          authorName: 'Victoria Brightstar',
          authorRole: 'HR Admin (Department Officer)',
          message: 'Signed COE is ready for pickup at HR Admin desk.',
          createdAt: '2026-11-11T16:30:00.000Z'
        }
      ]
    },
    {
      id: 'REQ-2025-0412',
      employeeId: '676767',
      employeeName: 'Juan Dela Cruz',
      employeeCompany: 'BSII Employee',
      employeeEmail: 'juan.delacruz@bsii.com.ph',
      employeeMobile: '0917-676-7676',
      department: 'Purchasing Officer',
      category: 'Item / Supply Request',
      details: {
        'Item Description': 'Ergonomic Keyboard & A4 Bond Paper (5 Reams)',
        'Quantity': '6 items total',
        'Estimated Budget': '₱3,100.00',
        'Urgency': 'Standard (Within 7 Days)',
        'Business Justification': 'Daily office documentation and workstation use (Internal Office Supply Only)'
      },
      ccDepartments: ['HR Admin'],
      ccEmails: ['hr@bsii.com.ph', 'admin.brightstar@gmail.com'],
      customMonitoringEmails: ['admin.brightstar@gmail.com'],
      status: 'Approved / Completed',
      priority: 'Normal',
      createdAt: '2025-08-10T08:00:00.000Z',
      updatedAt: '2025-08-12T17:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
      comments: []
    }
  ],
  departmentConfig: {
    'HR Admin': {
      subtitle: 'Leaves, COE, Employment Records, ID/Access, Facilities, Concerns, Conference Room, Government Benefits & Clearance.',
      isDefault: true,
      categories: {
        'Leave Request': [
          { name: 'Leave Type', type: 'select', options: ['Vacation Leave', 'Sick Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave', 'Bereavement Leave', 'Solo Parent Leave', 'Special Leave for Women (Magna Carta)', 'Half-Day / Undertime Leave', 'Leave Without Pay (LWOP)'] },
          { name: 'Start Date', type: 'date' },
          { name: 'End Date', type: 'date' },
          { name: 'Number of Days', type: 'number', placeholder: 'e.g., 3' },
          { name: 'Reason', type: 'textarea', placeholder: 'Provide brief details for your leave request...' }
        ],
        'Certificate of Employment (COE)': [
          { name: 'Purpose', type: 'select', options: ['Visa Application', 'Loan / Bank Requirement', 'Employment Verification', 'SSS / Pag-IBIG / PhilHealth', 'Credit Card / Financing', 'Government / Embassy Requirement', 'Travel / Immigration'] },
          { name: 'COE Compensation Format', type: 'select', options: ['With Compensation Breakdown', 'Without Compensation Breakdown', 'With Annualized Gross & Allowances'] }
        ],
        'Employment Records': [
          { name: 'Document Requested', type: 'select', options: ['BIR Form 2316', '201 File Copy', 'Employment Verification Letter', 'Contract / Appointment Copy', 'Company Clearance / Certificate'] },
          { name: 'Purpose', type: 'text', placeholder: 'e.g., Bank loan, tax filing, government requirement' },
          { name: 'Additional Notes', type: 'textarea', placeholder: 'Specify year, copies needed, or pickup preference...' }
        ],
        'ID & Building Access': [
          { name: 'Request Type', type: 'select', options: ['New Company ID', 'Replacement ID (Lost / Damaged)', 'Building / Door Access Card', 'Biometric Enrollment / Reset'] },
          { name: 'Details / Reason', type: 'textarea', placeholder: 'Provide details (e.g., lost ID, new hire, access area needed)...' }
        ],
        'Facilities / Maintenance': [
          { name: 'Office Location', type: 'text', placeholder: 'e.g., 3rd Floor Main Operations Area / Conference Room B' },
          { name: 'Urgency', type: 'select', options: ['Low (Routine Maintenance)', 'Standard', 'High Priority', 'Critical / Immediate (Safety Hazard)'] },
          { name: 'Issue Description', type: 'textarea', placeholder: 'Describe repairs, aircon, lighting, cleaning, or furniture issue...' }
        ],
        'Employee Concerns & Incident Reports': [
          { name: 'Concern Type', type: 'select', options: ['Workplace Concern', 'Safety / Health Incident', 'Policy / Conduct Concern', 'General HR Inquiry'] },
          { name: 'Date of Incident', type: 'date' },
          { name: 'Details', type: 'textarea', required: true, placeholder: 'Describe the concern or incident clearly...' }
        ],
        'Conference Room Schedule': [
          { name: 'Room / Area', type: 'select', options: ['Main Conference Room', 'Executive Boardroom', 'Small Meeting Room', 'Training Room'] },
          { name: 'Date', type: 'date', required: true },
          { name: 'Time Slot', type: 'text', required: true, placeholder: 'e.g., 10:00 AM – 11:30 AM' },
          { name: 'Meeting Purpose / Attendees', type: 'textarea', placeholder: 'Topic and number of attendees...' }
        ],
        'Government Benefits Assistance': [
          { name: 'Agency', type: 'select', options: ['SSS', 'PhilHealth', 'Pag-IBIG (HDMF)', 'BIR / TIN'] },
          { name: 'Assistance Needed', type: 'text', placeholder: 'e.g., Contribution check, loan certification, maternity/sickness benefit' },
          { name: 'Notes', type: 'textarea', placeholder: 'Additional details or reference numbers...' }
        ],
        'Resignation & Clearance Processing': [
          { name: 'Notice Type', type: 'select', options: ['Resignation Filing', 'Clearance Routing', 'Exit Interview Schedule', 'Final Pay / COE Inquiry'] },
          { name: 'Effective / Last Working Date', type: 'date' },
          { name: 'Remarks', type: 'textarea', placeholder: 'Provide turnover or clearance notes...' }
        ],
        'Other / Not Listed': [
          { name: 'Confirm Category', type: 'checkbox', required: true, options: ['My request is not listed above (Specify below)'] },
          { name: 'Requested Category Name', type: 'text', required: true, placeholder: 'e.g., Name of the category you were looking for' },
          { name: 'Request Details', type: 'textarea', required: true, placeholder: 'Describe your HR Admin request...' }
        ]
      }
    },
    'Purchasing Officer': {
      subtitle: 'Office Supplies, Pantry/Cleaning, Equipment Notices, Furniture, Borrowing & Uniforms (Office use only, not trade).',
      categories: {
        'Item / Supply Request': [
          { name: 'Item Description (Office Supplies Only — Not For Trade)', type: 'text', placeholder: 'e.g., A4 Bond Paper, Pens, Folders, Printer Ink' },
          { name: 'Quantity', type: 'text', placeholder: 'e.g., 10 Reams / 4 Units' },
          { name: 'Estimated Budget (PHP / ₱)', type: 'text', placeholder: 'e.g., ₱2,500.00' },
          { name: 'Urgency', type: 'select', options: ['Low (Next Monthly Cycle)', 'Standard (Within 7 Days)', 'Urgent (Within 48 Hours)', 'Critical (Same Day)'] },
          { name: 'Business Justification', type: 'textarea', placeholder: 'Explain how these office supplies support departmental operations...' }
        ],
        'Purchase Reimbursements': [
          { name: 'Item(s) Purchased (Office Use Only)', type: 'text', required: true, placeholder: 'e.g., Emergency bond paper, HDMI cable' },
          { name: 'Amount (PHP / ₱)', type: 'text', required: true, placeholder: 'e.g., ₱1,200.00' },
          { name: 'Receipt / OR Reference', type: 'text', placeholder: 'e.g., OR-55412' },
          { name: 'Justification', type: 'textarea', placeholder: 'Reason for direct office purchase...' }
        ],
        'Pantry & Cleaning Supplies': [
          { name: 'Supply Category', type: 'select', options: ['Pantry Consumables (Coffee, Water, Cups)', 'Cleaning & Sanitation Supplies', 'Restroom Supplies'] },
          { name: 'Items & Quantity', type: 'textarea', required: true, placeholder: 'List items and quantities needed...' },
          { name: 'Urgency', type: 'select', options: ['Low', 'Standard', 'Urgent'] }
        ],
        'Office Equipment Notice': [
          { name: 'Equipment / Asset', type: 'text', required: true, placeholder: 'e.g., 2nd Floor Printer, Scanner, Shredder' },
          { name: 'Location', type: 'text', placeholder: 'e.g., Accounting Area / Reception' },
          { name: 'Issue / Notice', type: 'textarea', required: true, placeholder: 'Describe the issue (e.g., broken printer, paper jam, offline)...' }
        ],
        'Furniture Purchases': [
          { name: 'Furniture Type', type: 'select', options: ['Office Chair', 'Desk / Workstation', 'Filing Cabinet / Storage', 'Meeting Table', 'Other Office Furniture'] },
          { name: 'Quantity & Specifications', type: 'textarea', required: true, placeholder: 'Specify quantity, dimensions, or model...' },
          { name: 'Business Justification', type: 'textarea', placeholder: 'Explain operational need...' }
        ],
        'Equipment Borrowing': [
          { name: 'Equipment Needed', type: 'text', required: true, placeholder: 'e.g., Laptop, Projector, Extension Cord' },
          { name: 'Borrow Date', type: 'date', required: true },
          { name: 'Return Date', type: 'date', required: true },
          { name: 'Purpose', type: 'textarea', placeholder: 'Meeting, event, or field task...' }
        ],
        'Uniform Requests': [
          { name: 'Request Type', type: 'select', options: ['New Hire Uniform', 'Replacement Uniform', 'Additional Set'] },
          { name: 'Size & Quantity', type: 'text', required: true, placeholder: 'e.g., Medium - 2 pcs' },
          { name: 'Notes', type: 'textarea', placeholder: 'Department or color/cut notes...' }
        ],
        'Other / Not Listed': [
          { name: 'Confirm Category', type: 'checkbox', required: true, options: ['My request is not listed above (Specify below)'] },
          { name: 'Requested Category Name', type: 'text', required: true, placeholder: 'e.g., Name of the category you were looking for' },
          { name: 'Request Details', type: 'textarea', required: true, placeholder: 'Describe your Purchasing request...' }
        ]
      }
    },
    'Office of the Vice President, BSII': {
      subtitle: 'Executive Approvals, Corporate Directives, Endorsements, VP Schedule, Travel, Signing & Escalations.',
      categories: {
        'Executive Memo / Approval Request': [
          { name: 'Subject / Directive Title', type: 'text', placeholder: 'Enter executive request subject...' },
          { name: 'Urgency', type: 'select', options: ['Informational / FYI', 'Routine Review', 'Priority Endorsement', 'Immediate Executive Action'] },
          { name: 'Executive Summary & Justification', type: 'textarea', placeholder: 'Provide comprehensive background for the Vice President, BSII...' }
        ],
        'Executive Approvals (Budget & Policy)': [
          { name: 'Approval Type', type: 'select', options: ['Budget Approval', 'Policy Exception', 'Capital Expenditure', 'Special Authorization'] },
          { name: 'Subject / Reference', type: 'text', required: true, placeholder: 'e.g., Q4 Department Budget Adjustment' },
          { name: 'Amount / Impact', type: 'text', placeholder: 'e.g., ₱50,000.00' },
          { name: 'Justification', type: 'textarea', required: true, placeholder: 'Provide clear justification...' }
        ],
        'Corporate Directives & Memo Release': [
          { name: 'Memo Title', type: 'text', required: true, placeholder: 'Enter memo or directive title...' },
          { name: 'Target Audience', type: 'text', placeholder: 'e.g., All BSII Employees / Operations' },
          { name: 'Summary / Draft Notes', type: 'textarea', required: true, placeholder: 'Key points for release...' }
        ],
        'Inter-Departmental Endorsements': [
          { name: 'Departments Involved', type: 'text', required: true, placeholder: 'e.g., HR Admin & Operations' },
          { name: 'Endorsement Summary', type: 'textarea', required: true, placeholder: 'Describe what needs VP endorsement...' }
        ],
        'VP Meeting / Schedule Request': [
          { name: 'Preferred Date', type: 'date', required: true },
          { name: 'Preferred Time', type: 'text', required: true, placeholder: 'e.g., 2:00 PM – 2:30 PM' },
          { name: 'Agenda / Attendees', type: 'textarea', required: true, placeholder: 'Meeting agenda and attendees...' }
        ],
        'Event & Activity Approvals': [
          { name: 'Event / Activity Name', type: 'text', required: true, placeholder: 'e.g., Year-End Townhall / Team Building' },
          { name: 'Target Date', type: 'date' },
          { name: 'Estimated Budget & Details', type: 'textarea', placeholder: 'Venue, participants, and budget...' }
        ],
        'Travel Authorizations': [
          { name: 'Destination & Dates', type: 'text', required: true, placeholder: 'e.g., Cebu — Dec 2–4, 2026' },
          { name: 'Estimated Cost', type: 'text', placeholder: 'e.g., ₱15,000.00' },
          { name: 'Purpose of Travel', type: 'textarea', required: true, placeholder: 'Business purpose and itinerary...' }
        ],
        'Document Signing (Contracts, Letters, MOAs)': [
          { name: 'Document Type', type: 'select', options: ['Contract', 'MOA / MOU', 'Official Letter', 'Executive Resolution'] },
          { name: 'Document Title & Counterparty', type: 'text', required: true, placeholder: 'e.g., Service Agreement with ABC Corp' },
          { name: 'Notes / Deadline', type: 'textarea', placeholder: 'Signing deadline and delivery notes...' }
        ],
        'Escalated Concerns': [
          { name: 'Concern Subject', type: 'text', required: true, placeholder: 'Brief title of escalated issue...' },
          { name: 'Urgency', type: 'select', options: ['Priority', 'Immediate Executive Action'] },
          { name: 'Background & Prior Steps Taken', type: 'textarea', required: true, placeholder: 'Explain what happened and prior actions taken...' }
        ],
        'Other / Not Listed': [
          { name: 'Confirm Category', type: 'checkbox', required: true, options: ['My request is not listed above (Specify below)'] },
          { name: 'Requested Category Name', type: 'text', required: true, placeholder: 'e.g., Name of the category you were looking for' },
          { name: 'Request Details', type: 'textarea', required: true, placeholder: 'Describe your request for the VP, BSII...' }
        ]
      }
    },
    'Office of the Vice President, Esteems': {
      subtitle: 'Executive Approvals, Brand Directives, Marketing/Promos, Partnerships, Events, VP Schedule & Signing.',
      categories: {
        'Esteems Executive Endorsement': [
          { name: 'Proposal / Operation Title', type: 'text', placeholder: 'Enter Esteems proposal title...' },
          { name: 'Urgency', type: 'select', options: ['Informational / FYI', 'Routine Review', 'Priority Endorsement', 'Immediate Executive Action'] },
          { name: 'Operational Summary & Notes', type: 'textarea', placeholder: 'Provide background for the Vice President, Esteems...' }
        ],
        'Executive Approvals (Esteems)': [
          { name: 'Approval Subject', type: 'text', required: true, placeholder: 'Enter approval subject...' },
          { name: 'Urgency', type: 'select', options: ['Routine Review', 'Priority Endorsement', 'Immediate Executive Action'] },
          { name: 'Summary & Justification', type: 'textarea', required: true, placeholder: 'Provide supporting details...' }
        ],
        'Brand Directives': [
          { name: 'Directive Scope', type: 'select', options: ['Logo Usage', 'Brand Guidelines', 'Visual Identity / Packaging', 'Brand Compliance'] },
          { name: 'Details', type: 'textarea', required: true, placeholder: 'Describe the brand asset or guideline request...' }
        ],
        'Marketing & Promo Approvals': [
          { name: 'Campaign / Promo Name', type: 'text', required: true, placeholder: 'e.g., Holiday Promo Campaign' },
          { name: 'Duration / Launch Date', type: 'text', placeholder: 'e.g., Dec 1 – Dec 31, 2026' },
          { name: 'Details & Budget', type: 'textarea', required: true, placeholder: 'Mechanics, channels, and budget...' }
        ],
        'Partnership & Collaboration Endorsements': [
          { name: 'Partner / Organization', type: 'text', required: true, placeholder: 'Name of partner or collaborator' },
          { name: 'Collaboration Summary', type: 'textarea', required: true, placeholder: 'Scope, deliverables, and terms...' }
        ],
        'Event & Activity Approvals': [
          { name: 'Event / Activity Name', type: 'text', required: true, placeholder: 'e.g., Brand Launch / Pop-Up Event' },
          { name: 'Target Date', type: 'date' },
          { name: 'Details & Budget', type: 'textarea', placeholder: 'Location, attendees, and budget...' }
        ],
        'VP Meeting / Schedule Request': [
          { name: 'Preferred Date', type: 'date', required: true },
          { name: 'Preferred Time', type: 'text', required: true, placeholder: 'e.g., 3:00 PM – 3:30 PM' },
          { name: 'Agenda / Attendees', type: 'textarea', required: true, placeholder: 'Meeting agenda and attendees...' }
        ],
        'Document Signing': [
          { name: 'Document Type', type: 'select', options: ['Contract', 'MOA / Agreement', 'Official Letter', 'Promo / Agency Brief'] },
          { name: 'Document Title & Counterparty', type: 'text', required: true, placeholder: 'Enter document title...' },
          { name: 'Notes / Deadline', type: 'textarea', placeholder: 'Signing deadline and notes...' }
        ],
        'Other / Not Listed': [
          { name: 'Confirm Category', type: 'checkbox', required: true, options: ['My request is not listed above (Specify below)'] },
          { name: 'Requested Category Name', type: 'text', required: true, placeholder: 'e.g., Name of the category you were looking for' },
          { name: 'Request Details', type: 'textarea', required: true, placeholder: 'Describe your request for the VP, Esteems...' }
        ]
      }
    },
    'Team Leader': {
      subtitle: 'Payroll/Payslips, Overtime, Attendance Adjustments, Reimbursements, Cash Advance, Salary Loans & Schedules.',
      categories: {
        'Overtime Approval': [
          { name: 'Date Rendered', type: 'date' },
          { name: 'Hours Rendered', type: 'number', placeholder: 'e.g., 4' },
          { name: 'Tasks Completed', type: 'textarea', placeholder: 'List specific deliverables completed during overtime...' }
        ],
        'Attendance Adjustment / Discrepancy': [
          { name: 'Date of Discrepancy', type: 'date' },
          { name: 'Biometric / Timekeeping Issue', type: 'select', options: ['Missed Time-In', 'Missed Time-Out', 'Missed Both Time-In & Time-Out', 'Late / Undertime Correction', 'Biometric Scanner Offline', 'Official Field Assignment', 'Work From Home / Remote Log', 'Schedule / Shift Change'] },
          { name: 'Supervisor Remarks', type: 'textarea', placeholder: 'Provide verification details or supervisor endorsement...' }
        ],
        'Reimbursement Pre-endorsement': [
          { name: 'Expense Details', type: 'textarea', placeholder: 'Itemize planned or incurred operational expenses...' },
          { name: 'Receipt Attachments Reference', type: 'text', placeholder: 'e.g., Official Receipt #10492 / Attached Scan filename' }
        ],
        'Expense Reimbursement': [
          { name: 'Expense Category', type: 'select', options: ['Transportation', 'Meals', 'Client Expenses', 'Operational Supplies', 'Other Work Expense'] },
          { name: 'Amount (PHP / ₱)', type: 'text', placeholder: 'e.g., ₱3,450.00' },
          { name: 'Invoice / Receipt Attachments', type: 'text', placeholder: 'e.g., OR-88231 / Digital Receipt Link or Filename' },
          { name: 'Disbursement Bank / Details', type: 'text', placeholder: 'e.g., BDO Payroll Account / GCash Corporate Disbursement' }
        ],
        'Payroll / Payslip Inquiry': [
          { name: 'Inquiry Type', type: 'select', options: ['Payslip Request', 'Payroll Discrepancy', 'Tax / Deduction Inquiry', '13th Month / Bonus Inquiry'] },
          { name: 'Pay Period', type: 'text', placeholder: 'e.g., November 1–15, 2026' },
          { name: 'Inquiry Issues', type: 'textarea', placeholder: 'Describe your payroll or payslip question for Accounting & Payroll...' }
        ],
        'Cash Advance Requests': [
          { name: 'Amount Requested (PHP / ₱)', type: 'text', required: true, placeholder: 'e.g., ₱5,000.00' },
          { name: 'Purpose', type: 'textarea', required: true, placeholder: 'Explain purpose of cash advance...' },
          { name: 'Repayment / Liquidation Schedule', type: 'text', placeholder: 'e.g., Next payroll / upon receipt liquidation' }
        ],
        'Salary Loan Requests': [
          { name: 'Loan Amount (PHP / ₱)', type: 'text', required: true, placeholder: 'e.g., ₱10,000.00' },
          { name: 'Preferred Term', type: 'select', options: ['3 Months', '6 Months', '12 Months'] },
          { name: 'Reason / Notes', type: 'textarea', placeholder: 'Brief reason for salary loan request...' }
        ],
        'Schedule Changes & Shift Swaps': [
          { name: 'Change Type', type: 'select', options: ['Shift Swap', 'Schedule Adjustment', 'Rest Day Offset'] },
          { name: 'Affected Date(s)', type: 'text', required: true, placeholder: 'e.g., Nov 20–21, 2026' },
          { name: 'Details / Swap Partner', type: 'textarea', required: true, placeholder: 'Specify new hours or coworker agreeing to swap...' }
        ],
        'Work-From-Home / Off-Site Requests': [
          { name: 'Setup Type', type: 'select', options: ['Work From Home (WFH)', 'Off-Site / Field Work'] },
          { name: 'Date(s)', type: 'text', required: true, placeholder: 'e.g., Nov 22, 2026' },
          { name: 'Deliverables / Reason', type: 'textarea', required: true, placeholder: 'Planned deliverables and reason...' }
        ],
        'Other / Not Listed': [
          { name: 'Confirm Category', type: 'checkbox', required: true, options: ['My request is not listed above (Specify below)'] },
          { name: 'Requested Category Name', type: 'text', required: true, placeholder: 'e.g., Name of the category you were looking for' },
          { name: 'Request Details', type: 'textarea', required: true, placeholder: 'Describe your request for Team Leader / Accounting...' }
        ]
      }
    }
  }
};

function validateStrongAdminPassword(password, fullName, lastName) {
  const pw = String(password || '');
  if (pw.length < 8) return 'Admin password must be at least 8 characters long.';
  if (!/[A-Z]/.test(pw)) return 'Admin password must include at least 1 uppercase letter (A-Z).';
  if (!/[a-z]/.test(pw)) return 'Admin password must include at least 1 lowercase letter (a-z).';
  if (!/[0-9]/.test(pw)) return 'Admin password must include at least 1 number (0-9).';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Admin password must include at least 1 special character (e.g., !@#$%^&*).';
  const pwLower = pw.toLowerCase();
  const nameTokens = [
    ...String(fullName || '').split(/\s+/),
    String(lastName || '')
  ]
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    .filter((t) => t.length >= 3);
  if (nameTokens.some((tok) => pwLower.includes(tok))) {
    return 'Admin password cannot contain your Last Name or Full Name.';
  }
  return null;
}

let latestStateToken = '';
let latestUsersCookieToken = '';
let cachedCloudSha = null;
let lastCloudFetchAt = 0;
let pendingCloudSerialized = null;

function getCloudGithubToken() {
  if (process.env.GITHUB_SYNC_TOKEN) return process.env.GITHUB_SYNC_TOKEN;
  try {
    const raw = Buffer.from('nXvXagxvdu3zQcTcbSTZklBnwel4kOZgw2w8hYzlxADgshd1r9CrYCdDk8mTk4WNq05ykedyz4gKClfxy1p2qpgqWRc=', 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const key = crypto.createHash('sha256').update('bsiisupport-portal-secret-2026').digest();
    const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch (_) {
    return '';
  }
}

function githubCloudApi(method, apiPath, bodyObj) {
  return new Promise((resolve) => {
    const token = getCloudGithubToken();
    if (!token) return resolve(null);
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : null;
    const req = https.request({
      hostname: 'api.github.com',
      port: 443,
      path: apiPath,
      method,
      timeout: 6000,
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'BSIISUPPORT-CloudSync',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Cache-Control': 'no-cache',
        ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
        } catch (_) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function hydrateFromGithubCloudIfNeeded() {
  if (Date.now() - lastCloudFetchAt < 4000) return;
  lastCloudFetchAt = Date.now();
  try {
    const res = await githubCloudApi('GET', '/repos/saladagajaneric-rgb/bsiisupport/contents/bsiisupport/data.json');
    if (!res || res.status !== 200 || !res.json || !res.json.content) return;
    cachedCloudSha = res.json.sha;
    const decoded = Buffer.from(res.json.content, 'base64').toString('utf8');
    const cloudData = JSON.parse(decoded);
    const localFile = (process.env.VERCEL && fs.existsSync(RUNTIME_DATA_FILE)) ? RUNTIME_DATA_FILE : DATA_FILE;
    let localTs = 0;
    if (fs.existsSync(localFile)) {
      try {
        const loc = JSON.parse(fs.readFileSync(localFile, 'utf8'));
        localTs = loc._lastSavedTs || 0;
      } catch (_) {}
    }
    if ((cloudData._lastSavedTs || 1) >= localTs) {
      saveData(cloudData, false, false);
    }
  } catch (_) {}
}

async function flushGithubCloudSync() {
  if (!pendingCloudSerialized) return;
  const serialized = pendingCloudSerialized;
  pendingCloudSerialized = null;
  try {
    const getRes = await githubCloudApi('GET', '/repos/saladagajaneric-rgb/bsiisupport/contents/bsiisupport/data.json');
    if (getRes && getRes.json && getRes.json.sha) cachedCloudSha = getRes.json.sha;
    const putRes = await githubCloudApi('PUT', '/repos/saladagajaneric-rgb/bsiisupport/contents/bsiisupport/data.json', {
      message: 'Auto-sync live portal data.json [skip ci]',
      content: Buffer.from(serialized, 'utf8').toString('base64'),
      ...(cachedCloudSha ? { sha: cachedCloudSha } : {})
    });
    if (putRes && putRes.json && putRes.json.content && putRes.json.content.sha) {
      cachedCloudSha = putRes.json.content.sha;
      lastCloudFetchAt = Date.now();
    }
  } catch (_) {}
}

function signCompressedState(obj) {
  try {
    const compressed = zlib.deflateRawSync(Buffer.from(JSON.stringify(obj), 'utf8')).toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(compressed).digest('base64url');
    return `${compressed}.${sig}`;
  } catch (_) {
    return '';
  }
}

function verifyCompressedState(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string' || !tokenStr.includes('.')) return null;
  const dotIdx = tokenStr.lastIndexOf('.');
  const compressed = tokenStr.slice(0, dotIdx);
  const sig = tokenStr.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(compressed).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const jsonStr = zlib.inflateRawSync(Buffer.from(compressed, 'base64url')).toString('utf8');
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

function refreshSignedStateTokens(data) {
  const ts = data._lastSavedTs || Date.now();
  latestUsersCookieToken = signCompressedState({
    ts,
    users: data.users,
    settings: data.settings
  });
  latestStateToken = signCompressedState({
    ts,
    users: data.users,
    settings: data.settings,
    requests: (data.requests || []).slice(0, 60)
  });
}

const MIN_STATE_EPOCH = 1795051400000;

function applyIncomingSyncedState(parsed, req) {
  if (!req || !req.headers) return parsed;
  const headerToken = req.headers['x-bsii-state'] || '';
  const cookieHeader = req.headers.cookie || '';
  let cookieToken = '';
  cookieHeader.split(';').forEach((c) => {
    const [k, ...r] = c.split('=');
    if (k && k.trim() === 'bsii_users_sync') {
      cookieToken = decodeURIComponent(r.join('=').trim());
    }
  });

  const candidates = [
    verifyCompressedState(headerToken),
    verifyCompressedState(cookieToken)
  ].filter((c) => c && (c.ts || 0) >= MIN_STATE_EPOCH);

  if (candidates.length === 0) return parsed;
  candidates.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const best = candidates[0];

  if ((best.ts || 0) > (parsed._lastSavedTs || 0)) {
    if (Array.isArray(best.users) && best.users.length > 0) {
      parsed.users = best.users;
    }
    if (best.settings && typeof best.settings === 'object') {
      parsed.settings = { ...parsed.settings, ...best.settings };
    }
    if (Array.isArray(best.requests) && best.requests.length > 0) {
      parsed.requests = best.requests;
    }
    parsed._lastSavedTs = best.ts;
    parsed.users.forEach((u) => syncUserAcrossRequests(parsed, u));
    saveData(parsed, false);
  } else if (Array.isArray(best.users)) {
    let anyUpdated = false;
    best.users.forEach((incomingU) => {
      const idx = (parsed.users || []).findIndex((u) => u.id === incomingU.id || (u.adminUsername && u.adminUsername === incomingU.adminUsername) || (u.isModerator && incomingU.isModerator));
      if (idx !== -1) {
        const curTs = new Date(parsed.users[idx].updatedAt || 0).getTime();
        const incTs = new Date(incomingU.updatedAt || 0).getTime();
        if (incTs > curTs) {
          parsed.users[idx] = incomingU;
          syncUserAcrossRequests(parsed, incomingU);
          anyUpdated = true;
        }
      }
    });
    if (anyUpdated) saveData(parsed, false);
  }
  return parsed;
}

function loadData(req) {
  const sourceFile = (process.env.VERCEL && fs.existsSync(RUNTIME_DATA_FILE))
    ? RUNTIME_DATA_FILE
    : (fs.existsSync(DATA_FILE) ? DATA_FILE : (fs.existsSync(RUNTIME_DATA_FILE) ? RUNTIME_DATA_FILE : null));

  if (!sourceFile) {
    saveData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    if (!parsed.departmentConfig) {
      parsed.departmentConfig = JSON.parse(JSON.stringify(DEFAULT_DATA.departmentConfig));
      saveData(parsed);
    }
    let changed = false;
    if (!Array.isArray(parsed.emailDispatchLog)) {
      parsed.emailDispatchLog = [];
      changed = true;
    }
    if (Array.isArray(parsed.users)) {
      const hasMod = parsed.users.some((u) => u.isModerator || u.adminUsername === 'bsii.moderator');
      if (!hasMod) {
        parsed.users.push({
          id: '000001',
          lastName: 'SALADAGA',
          adminUsername: 'bsii.moderator',
          adminPassword: 'Moderator!2026',
          fullName: 'Jan Eric Saladaga',
          company: 'BSII Employee',
          role: 'HR Admin',
          department: 'HR Admin',
          isStaff: true,
          isHR: true,
          isMasterAdmin: true,
          isModerator: true,
          email: 'saladagajaneric@gmail.com',
          mobile: '0917-000-0001',
          updatedAt: '2026-11-01T08:00:00.000Z'
        });
        changed = true;
      }
    }
    if (changed) saveData(parsed);
    applyIncomingSyncedState(parsed, req);
    if (!latestStateToken) refreshSignedStateTokens(parsed);
    return parsed;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function saveData(data, bumpTimestamp = true, syncToCloud = true) {
  if (bumpTimestamp) {
    data._lastSavedTs = Date.now();
  }
  refreshSignedStateTokens(data);
  const serialized = JSON.stringify(data, null, 2);
  if (syncToCloud && bumpTimestamp) {
    pendingCloudSerialized = serialized;
  }
  if (process.env.VERCEL) {
    try {
      fs.writeFileSync(RUNTIME_DATA_FILE, serialized, 'utf8');
      return;
    } catch (_) {}
  }
  try {
    fs.writeFileSync(DATA_FILE, serialized, 'utf8');
  } catch (err) {
    try {
      fs.writeFileSync(RUNTIME_DATA_FILE, serialized, 'utf8');
    } catch (_) {}
  }
}

const sessions = new Map();

function createSignedSid(sessionData) {
  const payload = Buffer.from(JSON.stringify(sessionData), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sid = `${payload}.${sig}`;
  sessions.set(sid, sessionData);
  return sid;
}

function verifySignedSid(sid) {
  if (!sid || typeof sid !== 'string' || !sid.includes('.')) return null;
  const dotIdx = sid.lastIndexOf('.');
  const payload = sid.slice(0, dotIdx);
  const sig = sid.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    sessions.set(sid, parsed);
    return parsed;
  } catch (_) {
    return null;
  }
}

const emailVerifications = new Map();

function hashEmailVerificationCode(userId, code, expiresAt) {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`verify|${userId}|${String(code).trim()}|${expiresAt}`)
    .digest('hex');
}

function createEmailVerificationToken(userId, email, code, expiresAt) {
  const codeHash = hashEmailVerificationCode(userId, code, expiresAt);
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, em: String(email || '').toLowerCase(), ch: codeHash, exp: expiresAt }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function checkEmailVerificationCode(userId, code, token, data) {
  const cleanCode = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;

  // 1. Check signed stateless verification token (works across serverless instances)
  if (token && typeof token === 'string' && token.includes('.')) {
    const dotIdx = token.lastIndexOf('.');
    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
    if (sig === expectedSig) {
      try {
        const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        if (parsed && parsed.uid === userId && Number(parsed.exp) >= Date.now()) {
          const expectedHash = hashEmailVerificationCode(userId, cleanCode, parsed.exp);
          if (expectedHash === parsed.ch) {
            emailVerifications.delete(userId);
            if (data && data.pendingEmailVerifications) {
              delete data.pendingEmailVerifications[userId];
            }
            return true;
          }
        }
      } catch (_) {}
    }
  }

  // 2. Check in-memory or data-persisted pending verification
  const mem = emailVerifications.get(userId);
  if (mem && mem.expiresAt >= Date.now() && mem.code === cleanCode) {
    emailVerifications.delete(userId);
    if (data && data.pendingEmailVerifications) {
      delete data.pendingEmailVerifications[userId];
    }
    return true;
  }

  const persisted = data && data.pendingEmailVerifications && data.pendingEmailVerifications[userId];
  if (persisted && persisted.expiresAt >= Date.now()) {
    const expectedHash = hashEmailVerificationCode(userId, cleanCode, persisted.expiresAt);
    if (expectedHash === persisted.codeHash) {
      delete data.pendingEmailVerifications[userId];
      emailVerifications.delete(userId);
      return true;
    }
  }

  return false;
}

function encryptMagicVerifyToken(payloadObj) {
  const key = crypto.createHash('sha256').update(SESSION_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(payloadObj), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

function decryptMagicVerifyToken(tokenStr) {
  try {
    const raw = Buffer.from(String(tokenStr || ''), 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const key = crypto.createHash('sha256').update(SESSION_SECRET).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    return JSON.parse(dec);
  } catch (_) {
    return null;
  }
}

function sanitizeSettingsForClient(settings, includeAdminRelayFields = false) {
  const s = { ...(settings || {}) };
  const hasSmtpPass = Boolean(s.smtpPass || process.env.GMAIL_APP_PASSWORD);
  const hasSmtpUser = Boolean(s.smtpUser || process.env.GMAIL_USER);
  const hasWebhook = Boolean(s.emailWebhookUrl || process.env.EMAIL_WEBHOOK_URL);
  delete s.smtpPass;
  s.smtpConfigured = hasSmtpUser && hasSmtpPass;
  s.webhookConfigured = hasWebhook;
  s.emailRelayActive = s.smtpConfigured || s.webhookConfigured;
  if (!includeAdminRelayFields) {
    delete s.smtpUser;
    delete s.emailWebhookUrl;
  }
  return s;
}

function isPlaceholderEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  return !clean || !clean.includes('@') || clean.endsWith('@bsii.com.ph') || clean.endsWith('@esteems.com.ph');
}

function collectRelatedAdminEmails(data, reqObj) {
  const seen = new Set();
  const out = [];
  const add = (addr) => {
    const clean = String(addr || '').trim();
    if (!clean || !clean.includes('@')) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  };

  const deptEmails = (data.settings && data.settings.departmentEmails) || {};
  const targetDepts = [reqObj.department, ...(reqObj.ccDepartments || [])].filter(Boolean);

  targetDepts.forEach((dept) => {
    const deptAdmins = (data.users || []).filter((u) =>
      (u.isStaff || u.isHR || u.isMasterAdmin) &&
      (u.department === dept || (Array.isArray(u.secondaryDepartments) && u.secondaryDepartments.includes(dept)))
    );
    const realAdminEmails = deptAdmins.map((u) => u.email).filter((e) => e && !isPlaceholderEmail(e));
    const configuredDeptBox = deptEmails[dept];

    if (realAdminEmails.length > 0) {
      realAdminEmails.forEach(add);
      if (configuredDeptBox && !isPlaceholderEmail(configuredDeptBox)) {
        add(configuredDeptBox);
      }
    } else if (configuredDeptBox) {
      add(configuredDeptBox);
    } else if (deptAdmins[0] && deptAdmins[0].email) {
      add(deptAdmins[0].email);
    }
  });

  (reqObj.ccEmails || []).forEach((e) => {
    if (!isPlaceholderEmail(e) || out.length === 0) add(e);
  });

  return out;
}

function formatRequestEmailText(reqObj) {
  const detailLines = Object.entries(reqObj.details || {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n') || '- (No extra form fields)';
  return [
    `Request ID: ${reqObj.id}`,
    `Department: ${reqObj.department}`,
    `Category: ${reqObj.category}`,
    `Status: ${reqObj.status}`,
    `Priority: ${reqObj.priority || 'Standard'}`,
    '',
    `Submitted By: ${reqObj.employeeName} (ID: ${reqObj.employeeId}, ${reqObj.employeeCompany})`,
    `Submitter Email: ${reqObj.employeeEmail}`,
    `Submitter Mobile: ${reqObj.employeeMobile}`,
    (reqObj.ccDepartments && reqObj.ccDepartments.length) ? `CC Departments: ${reqObj.ccDepartments.join(', ')}` : null,
    '',
    'Request Details:',
    detailLines
  ].filter((l) => l !== null).join('\n');
}

function httpGetUrl(targetUrl, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('Too many redirects.'));
    const u = new URL(targetUrl);
    const client = u.protocol === 'https:' ? https : http;
    const r = client.request(u, { method: 'GET', timeout: 10000, rejectUnauthorized: false }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpGetUrl(new URL(res.headers.location, u).toString(), depth + 1));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(new Error('Webhook GET timed out.')); });
    r.end();
  });
}

function postWebhookEmail(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(String(webhookUrl).trim());
    const client = u.protocol === 'https:' ? https : http;
    const bodyStr = JSON.stringify(payload);
    const r = client.request(u, {
      method: 'POST',
      timeout: 12000,
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, async (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        try {
          const redirected = await httpGetUrl(new URL(res.headers.location, u).toString());
          if (redirected.status >= 200 && redirected.status < 300) return resolve(redirected);
          return reject(new Error(`Webhook returned HTTP ${redirected.status}`));
        } catch (err) {
          return reject(err);
        }
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
        } else {
          reject(new Error(`Webhook returned HTTP ${res.statusCode}`));
        }
      });
    });
    r.on('error', reject);
    r.on('timeout', () => r.destroy(new Error('Webhook request timed out.')));
    r.write(bodyStr);
    r.end();
  });
}

function postFormSubmitSingleOrigin(toEmail, subject, text, meta, originUrl) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      message: text,
      ...(meta && meta.employeeEmail && String(meta.employeeEmail).includes('@') ? { email: meta.employeeEmail } : {})
    });
    const r = https.request({
      hostname: 'formsubmit.co',
      path: `/ajax/${encodeURIComponent(toEmail)}`,
      method: 'POST',
      timeout: 15000,
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': originUrl,
        'Referer': originUrl + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let j = {};
        try { j = JSON.parse(raw); } catch (_) {}
        const msg = String(j.message || raw || '').slice(0, 160);
        const ok = String(j.success) === 'true';
        const pendingActivation = !ok && /activat|confirm/i.test(msg);
        resolve({ ok, pendingActivation, error: `${toEmail}: ${msg || 'HTTP ' + res.statusCode}` });
      });
    });
    r.on('error', (e) => resolve({ ok: false, error: `${toEmail}: ${e.message}` }));
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.write(payload);
    r.end();
  });
}

async function postFormSubmit(toEmail, subject, text, meta) {
  const first = await postFormSubmitSingleOrigin(toEmail, subject, text, meta, 'http://localhost:3000');
  if (first.ok || first.pendingActivation) return first;
  const second = await postFormSubmitSingleOrigin(toEmail, subject, text, meta, 'https://bsiisupport.vercel.app');
  return second.ok || second.pendingActivation ? second : first;
}

function sendGmailSmtp({ user, pass, toList, subject, text }) {
  return new Promise((resolve, reject) => {
    const cleanUser = String(user || '').trim();
    const cleanPass = String(pass || '').replace(/\s+/g, '');
    const recipients = (toList || []).map((e) => String(e || '').trim()).filter((e) => e.includes('@'));
    if (!cleanUser || !cleanPass || recipients.length === 0) {
      return reject(new Error('Missing SMTP credentials or recipients.'));
    }

    const socket = tls.connect({ host: 'smtp.gmail.com', port: 465, servername: 'smtp.gmail.com', rejectUnauthorized: false });
    socket.setEncoding('utf8');
    let settled = false;
    let buffer = '';
    const queue = [];

    const finish = (err) => {
      if (settled) return;
      settled = true;
      try { socket.end(); } catch (_) {}
      if (err) reject(err);
      else resolve(true);
    };

    socket.setTimeout(12000, () => finish(new Error('Gmail SMTP connection timed out.')));
    socket.on('error', (err) => finish(err));

    const sendCmd = (cmd, expectedPrefix, onSuccess) => {
      queue.push({ expectedPrefix, onSuccess });
      socket.write(cmd + '\r\n');
    };

    const rawMime = [
      `From: "BSIISUPPORT Portal" <${cleanUser}>`,
      `To: ${recipients.map((r) => `<${r}>`).join(', ')}`,
      `Subject: ${String(subject || '').replace(/[\r\n]+/g, ' ')}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      String(text || '').replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..'),
      '.'
    ].join('\r\n');

    const sendNextRcpt = (idx) => {
      if (idx >= recipients.length) {
        return sendCmd('DATA', '354', () =>
          sendCmd(rawMime, '250', () => {
            socket.write('QUIT\r\n');
            finish();
          })
        );
      }
      sendCmd(`RCPT TO:<${recipients[idx]}>`, '250', () => sendNextRcpt(idx + 1));
    };

    queue.push({
      expectedPrefix: '220',
      onSuccess: () => sendCmd('EHLO localhost', '250', () =>
        sendCmd('AUTH LOGIN', '334', () =>
          sendCmd(Buffer.from(cleanUser, 'utf8').toString('base64'), '334', () =>
            sendCmd(Buffer.from(cleanPass, 'utf8').toString('base64'), '235', () =>
              sendCmd(`MAIL FROM:<${cleanUser}>`, '250', () => sendNextRcpt(0))
            )
          )
        )
      )
    });

    socket.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (!line || (line.length >= 4 && line[3] === '-')) continue;
        const step = queue.shift();
        if (!step) continue;
        if (!line.startsWith(step.expectedPrefix)) {
          return finish(new Error(`SMTP rejected (${line})`));
        }
        step.onSuccess();
      }
    });
  });
}

async function deliverWebsiteEmail(data, { toList, subject, text, requestId, meta }) {
  if (!Array.isArray(data.emailDispatchLog)) data.emailDispatchLog = [];
  const cleanRecipients = Array.from(new Set((toList || []).map((e) => String(e || '').trim()).filter((e) => e.includes('@'))));
  const entry = {
    id: 'DISP-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
    requestId: requestId || null,
    to: cleanRecipients,
    subject,
    body: text,
    deliveryStatus: 'Logged Locally (No Relay Configured)',
    sentViaLiveEmail: false,
    sentAt: new Date().toISOString()
  };

  if (cleanRecipients.length === 0) {
    entry.deliveryStatus = 'Skipped (No valid recipient email)';
    data.emailDispatchLog.unshift(entry);
    if (data.emailDispatchLog.length > 50) data.emailDispatchLog.length = 50;
    saveData(data);
    return entry;
  }

  const webhookUrl = (data.settings && data.settings.emailWebhookUrl) || process.env.EMAIL_WEBHOOK_URL || '';
  const smtpUser = (data.settings && data.settings.smtpUser) || process.env.GMAIL_USER || '';
  const smtpPass = (data.settings && data.settings.smtpPass) || process.env.GMAIL_APP_PASSWORD || '';

  if (webhookUrl) {
    try {
      await postWebhookEmail(webhookUrl, {
        to: cleanRecipients.join(','),
        recipients: cleanRecipients,
        subject,
        text,
        ...(meta || {})
      });
      entry.deliveryStatus = 'Sent via Email Webhook';
      entry.sentViaLiveEmail = true;
    } catch (err) {
      entry.deliveryStatus = `Webhook Error: ${err.message}`;
    }
  } else if (smtpUser && smtpPass) {
    try {
      await sendGmailSmtp({ user: smtpUser, pass: smtpPass, toList: cleanRecipients, subject, text });
      entry.deliveryStatus = 'Sent to Gmail Inbox';
      entry.sentViaLiveEmail = true;
    } catch (err) {
      entry.deliveryStatus = `Gmail SMTP Error: ${err.message}`;
    }
  } else {
    // Zero-setup default: FormSubmit.co sends the message straight to each admin's own email
    const results = await Promise.all(cleanRecipients.map((addr) => postFormSubmit(addr, subject, text, meta)));
    const sent = results.filter((r) => r.ok).length;
    const pending = results.filter((r) => r.pendingActivation).length;
    const failed = results.filter((r) => !r.ok && !r.pendingActivation);
    entry.sentViaLiveEmail = sent > 0;
    const parts = [];
    if (sent) parts.push(`Sent to ${sent} inbox(es) via FormSubmit`);
    if (pending) parts.push(`${pending} recipient(s) must click the one-time FormSubmit activation email`);
    if (failed.length) parts.push(`Failed: ${failed.map((f) => f.error).join('; ')}`);
    entry.deliveryStatus = parts.join(' | ') || 'FormSubmit: no result';
  }

  data.emailDispatchLog.unshift(entry);
  if (data.emailDispatchLog.length > 50) data.emailDispatchLog.length = 50;
  saveData(data);
  console.log(`[REQUEST EMAIL] ${entry.requestId || 'TEST'} -> [${cleanRecipients.join(', ')}] | ${entry.deliveryStatus}`);
  return entry;
}

function sanitizeSessionUser(u) {
  if (!u || u.type === 'oncall') return u;
  const copy = { ...u };
  delete copy.adminPassword;
  return copy;
}

function maskCredential(val) {
  const clean = String(val || '').trim();
  if (!clean) return '—';
  return `${clean[0]}******`;
}

function formatDirectoryUser(u) {
  const isProtectedAdmin = Boolean(u.isStaff || u.isHR || u.isMasterAdmin || u.isModerator);
  if (!isProtectedAdmin) {
    return { ...u, isProtectedAdmin: false };
  }
  const copy = { ...u, isProtectedAdmin: true };
  copy.maskedAdminUsername = maskCredential(u.adminUsername || u.id);
  copy.maskedAdminPassword = maskCredential(u.adminPassword);
  delete copy.adminUsername;
  delete copy.adminPassword;
  delete copy.lastName;
  return copy;
}

function syncUserAcrossRequests(data, userRecord) {
  (data.requests || []).forEach((r) => {
    if (r.employeeId === userRecord.id) {
      r.employeeName = userRecord.fullName;
      r.employeeCompany = userRecord.company;
      r.employeeEmail = userRecord.email;
      r.employeeMobile = userRecord.mobile;
    }
  });
}

function getSessionRecord(req) {
  const cookies = parseCookies(req);
  const sid = cookies['bsii_sid'];
  if (!sid) return null;
  if (sessions.has(sid)) {
    return { sid, sessionData: sessions.get(sid) };
  }
  const verified = verifySignedSid(sid);
  if (verified) {
    return { sid, sessionData: verified };
  }
  return null;
}

async function handleSelfAccountUpdate(res, data, currentUser, body) {
  const user = data.users.find((u) => u.id === currentUser.id);
  if (!user) return sendJson(res, 404, { error: 'Account not found.' });

  const isAdminAcct = Boolean(user.isStaff || user.isHR || user.isMasterAdmin);
  const currentPass = String(body.currentPassword || '').trim();
  const verificationCode = String(body.verificationCode || '').trim();
  const verificationToken = String(body.verificationToken || '').trim();
  const expectedPass = isAdminAcct ? user.adminPassword : user.lastName;

  const verifiedByEmail = verificationCode
    ? checkEmailVerificationCode(user.id, verificationCode, verificationToken, data)
    : false;
  const verifiedByPassword = Boolean(currentPass && currentPass === expectedPass);

  if (!verifiedByEmail && !verifiedByPassword) {
    return sendJson(res, 403, {
      error: verificationCode
        ? 'Invalid or expired 6-digit Gmail verification code. Please click "Send Code to Gmail" to get a fresh code.'
        : 'Verification required: Please enter the 6-digit code sent to your Gmail (or verify with your current password).'
    });
  }

  if (body.fullName && String(body.fullName).trim()) user.fullName = String(body.fullName).trim();
  if (typeof body.email === 'string' && body.email.trim()) user.email = body.email.trim();
  if (typeof body.mobile === 'string') user.mobile = body.mobile.trim();

  if (isAdminAcct) {
    const nextId = typeof body.newId === 'string' ? body.newId.trim() : '';
    if (nextId && nextId !== user.id) {
      if (data.users.some((u) => u.id === nextId)) {
        return sendJson(res, 400, { error: `Employee ID "${nextId}" is already in use.` });
      }
      const oldId = user.id;
      user.id = nextId;
      (data.requests || []).forEach((r) => {
        if (r.employeeId === oldId) r.employeeId = nextId;
      });
      sessions.forEach((s) => {
        if (s.userId === oldId) s.userId = nextId;
      });
    }
    if (body.role && String(body.role).trim()) user.role = String(body.role).trim();
    const nextAdminUser = typeof body.adminUsername === 'string' && body.adminUsername.trim()
      ? body.adminUsername.trim()
      : user.adminUsername;
    const hasNewPass = typeof body.adminPassword === 'string' && body.adminPassword.trim().length > 0;
    const nextAdminPass = hasNewPass ? body.adminPassword.trim() : user.adminPassword;
    if (!nextAdminUser || !nextAdminPass) {
      return sendJson(res, 400, { error: 'Admin / Officer accounts require a unique Username and Strong Password.' });
    }
    if (data.users.some((u) => u.id !== user.id && u.adminUsername === nextAdminUser)) {
      return sendJson(res, 400, { error: 'That Admin / Officer Username is already taken.' });
    }
    if (hasNewPass) {
      const pwErr = validateStrongAdminPassword(nextAdminPass, user.fullName, user.lastName);
      if (pwErr) return sendJson(res, 400, { error: pwErr });
    }
    user.adminUsername = nextAdminUser;
    user.adminPassword = nextAdminPass;
    if (user.email && user.department && data.settings && data.settings.departmentEmails) {
      data.settings.departmentEmails[user.department] = user.email;
    }
  } else if (body.lastName && String(body.lastName).trim()) {
    user.lastName = String(body.lastName).replace(/\s+/g, '').toUpperCase();
  }

  user.needsProfileSync = false;
  user.hasCompletedFirstSelfUpdate = true;
  user.updatedAt = new Date().toISOString();
  syncUserAcrossRequests(data, user);
  saveData(data);

  const nextSid = createSignedSid({ type: 'employee', userId: user.id });
  sendJson(res, 200, {
    success: true,
    user: sanitizeSessionUser(user),
    syncedToHR: true,
    message: 'Profile updated and synchronized across all records.'
  }, {
    'Set-Cookie': `bsii_sid=${nextSid}; Path=/; HttpOnly; SameSite=Lax`
  });
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

function getSessionUser(req, data) {
  const rec = getSessionRecord(req);
  if (!rec) return null;
  const { sid, sessionData } = rec;
  if (sessionData.type === 'oncall') {
    return sessionData;
  }
  const user = data.users.find((u) => u.id === sessionData.userId);
  if (!user) {
    sessions.delete(sid);
    return null;
  }
  return {
    type: 'employee',
    ...user
  };
}

function isOlderThan365Days(isoDate) {
  const created = new Date(isoDate).getTime();
  const now = Date.now();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays > 365;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    ...(latestStateToken ? { 'X-BSII-State': latestStateToken } : {}),
    ...extraHeaders
  };
  if (latestUsersCookieToken) {
    const syncCookie = `bsii_users_sync=${latestUsersCookieToken}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (headers['Set-Cookie']) {
      headers['Set-Cookie'] = Array.isArray(headers['Set-Cookie'])
        ? [...headers['Set-Cookie'], syncCookie]
        : [headers['Set-Cookie'], syncCookie];
    } else {
      headers['Set-Cookie'] = syncCookie;
    }
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = urlObj.pathname;
  if (pathname === '/api/index.js') {
    const routeMatch = req.headers['x-now-route-matches'] || '';
    const m = /(?:^|&)1=([^&]+)/.exec(routeMatch);
    if (m) {
      pathname = '/api/' + decodeURIComponent(m[1]);
    } else if (urlObj.searchParams.get('1')) {
      pathname = '/api/' + urlObj.searchParams.get('1');
    } else if (req.headers['x-matched-path'] && req.headers['x-matched-path'] !== '/api/index.js') {
      pathname = req.headers['x-matched-path'];
    }
  }
  if (pathname.startsWith('/api/')) {
    await hydrateFromGithubCloudIfNeeded();
  }
  const data = loadData(req);
  const origEnd = res.end.bind(res);
  res.end = function(...args) {
    if (pendingCloudSerialized) {
      flushGithubCloudSync().finally(() => origEnd(...args));
      return res;
    }
    return origEnd(...args);
  };
  const currentUser = getSessionUser(req, data);

  // Static Assets
  if (pathname.startsWith('/assets/')) {
    const safeName = path.basename(pathname);
    const assetPath = path.join(PUBLIC_DIR, 'assets', safeName);
    if (fs.existsSync(assetPath)) {
      const ext = path.extname(safeName).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(assetPath).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end('Asset not found');
    return;
  }

  // Logout route: immediately flush all session cookies and redirect cleanly to /login
  if (pathname === '/logout' || pathname === '/api/logout') {
    const cookies = parseCookies(req);
    if (cookies['bsii_sid']) {
      sessions.delete(cookies['bsii_sid']);
    }
    res.writeHead(302, {
      'Set-Cookie': 'bsii_sid=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'Location': '/login',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end();
    return;
  }

  // Root redirect
  if (pathname === '/') {
    res.writeHead(302, {
      'Location': currentUser ? '/open' : '/login',
      'Cache-Control': 'no-store'
    });
    res.end();
    return;
  }

  // Session & Sign Out Hygiene:
  // If an active employee session navigates to /login, immediately redirect them to /open
  if (pathname === '/login' && req.method === 'GET') {
    if (currentUser) {
      res.writeHead(302, {
        'Location': '/open',
        'Cache-Control': 'no-store'
      });
      res.end();
      return;
    }
  }

  // Protected UI routes: if not logged in, redirect to /login
  const protectedUiRoutes = ['/open', '/requests', '/department', '/hr', '/trash'];
  if (protectedUiRoutes.includes(pathname) && req.method === 'GET') {
    if (!currentUser) {
      res.writeHead(302, {
        'Location': '/login',
        'Cache-Control': 'no-store'
      });
      res.end();
      return;
    }
  }

  // API Endpoints
  if (pathname === '/api/session' && req.method === 'GET') {
    sendJson(res, 200, {
      authenticated: !!currentUser,
      user: sanitizeSessionUser(currentUser),
      settings: sanitizeSettingsForClient(data.settings),
      departmentConfig: data.departmentConfig
    });
    return;
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { loginType, idNumber, password, oncallName, oncallNumber, oncallEmail } = body;

      if (loginType === 'Oncall') {
        if (!oncallName || !oncallNumber) {
          sendJson(res, 400, { error: 'Please provide your Full Name and Contact Number for Oncall communication.' });
          return;
        }
        const oncallSession = {
          type: 'oncall',
          id: 'ONCALL-' + Math.floor(1000 + Math.random() * 9000),
          fullName: oncallName.trim(),
          company: 'Oncall Personnel',
          role: 'Oncall Passive Communication',
          department: 'Oncall',
          isStaff: false,
          isHR: false,
          isMasterAdmin: false,
          email: (oncallEmail || '').trim(),
          mobile: oncallNumber.trim()
        };
        const sid = createSignedSid(oncallSession);
        sendJson(res, 200, { success: true, redirect: '/open', user: oncallSession }, {
          'Set-Cookie': `bsii_sid=${sid}; Path=/; HttpOnly; SameSite=Lax`
        });
        return;
      }

      if (loginType === 'Admin') {
        const cleanAdminUser = String(body.adminUsername || '').trim();
        const cleanAdminPass = String(password || '').trim();
        const matchedAdmin = data.users.find(
          (u) => (u.isStaff || u.isHR || u.isMasterAdmin) && u.adminUsername === cleanAdminUser
        );
        if (!matchedAdmin || matchedAdmin.adminPassword !== cleanAdminPass) {
          sendJson(res, 401, {
            error: 'Invalid Admin Username or unique Password. Contact Master Administrator if locked out.'
          });
          return;
        }
        const sid = createSignedSid({ type: 'employee', userId: matchedAdmin.id });
        sendJson(res, 200, { success: true, redirect: '/open', user: sanitizeSessionUser(matchedAdmin) }, {
          'Set-Cookie': `bsii_sid=${sid}; Path=/; HttpOnly; SameSite=Lax`
        });
        return;
      }

      const cleanId = String(idNumber || '').trim();
      const cleanPass = String(password || '').trim();
      const matchedUser = data.users.find((u) => u.id === cleanId);

      if (matchedUser && (matchedUser.isStaff || matchedUser.isHR || matchedUser.isMasterAdmin)) {
        sendJson(res, 403, {
          error: 'Admin & Department Officer accounts require unique credentials and cannot log in using ID & Last Name. Use the Admin & Department Officer Portal below.'
        });
        return;
      }

      if (!matchedUser || matchedUser.lastName !== cleanPass) {
        sendJson(res, 401, {
          error: 'Invalid Employee ID Number or Password (must match your Last Name in UPPERCASE). Contact HR Admin for credentials assistance.'
        });
        return;
      }

      if (loginType && (loginType === 'BSII Employee' || loginType === 'Esteems Employee')) {
        if (matchedUser.company !== loginType) {
          sendJson(res, 403, {
            error: `This Employee ID is registered under ${matchedUser.company}. Please select "${matchedUser.company}" to continue.`
          });
          return;
        }
      }

      const sid = createSignedSid({ type: 'employee', userId: matchedUser.id });
      sendJson(res, 200, { success: true, redirect: '/open', user: sanitizeSessionUser(matchedUser) }, {
        'Set-Cookie': `bsii_sid=${sid}; Path=/; HttpOnly; SameSite=Lax`
      });
    } catch (e) {
      sendJson(res, 400, { error: 'Malformed login request.' });
    }
    return;
  }

  if (pathname === '/api/profile' && req.method === 'POST') {
    if (!currentUser) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await readJsonBody(req);

    if (currentUser.type === 'oncall') {
      currentUser.email = String(body.email || '').trim();
      currentUser.mobile = String(body.mobile || '').trim();
      return sendJson(res, 200, { success: true, user: currentUser, syncedToHR: false });
    }

    await handleSelfAccountUpdate(res, data, currentUser, body);
    return;
  }

  if (pathname === '/api/requests' && req.method === 'GET') {
    if (!currentUser) return sendJson(res, 401, { error: 'Unauthorized' });

    // Auto-purge History records older than 365 days in History to remove spam
    const beforeCount = data.requests.length;
    data.requests = data.requests.filter((r) => {
      if (r.deletedAt && isOlderThan365Days(r.deletedAt)) return false;
      return true;
    });
    if (data.requests.length !== beforeCount) {
      saveData(data);
    }

    const myActiveRequests = [];
    const departmentQueue = [];
    const retentionTrash = [];

    data.requests.forEach((r) => {
      const autoExpired = isOlderThan365Days(r.createdAt);
      const isInTrash = Boolean(r.deletedAt) || autoExpired;

      const isPrimaryDept = r.department === currentUser.department ||
        (currentUser.secondaryDepartments && currentUser.secondaryDepartments.includes(r.department));
      const isCCDept = (r.ccDepartments || []).includes(currentUser.department);
      const isFinancialAuditForTeamLead =
        currentUser.department === 'Team Leader' &&
        (r.department === 'Accounting & Payroll' ||
          (r.ccDepartments || []).includes('Team Leader') ||
          /reimbursement|petty cash|financial|payroll|expense/i.test(r.category));

      if (isInTrash) {
        if (currentUser.isStaff && (isPrimaryDept || isCCDept || isFinancialAuditForTeamLead || currentUser.isMasterAdmin)) {
          retentionTrash.push({
            ...r,
            retentionReason: r.completedToHistory ? 'Completed' : r.deletedAt ? 'Archived' : '365-Day Auto-Archive'
          });
        }
        return;
      }

      if (!r.hiddenBySender && (r.employeeId === currentUser.id || (currentUser.type === 'oncall' && r.employeeName === currentUser.fullName))) {
        myActiveRequests.push(r);
      }

      // HR only receives messages directed or CC'd to HR Admin (no global inbox spam)
      if (currentUser.isStaff) {
        if (isPrimaryDept || isCCDept || isFinancialAuditForTeamLead) {
          departmentQueue.push(r);
        }
      }
    });

    sendJson(res, 200, {
      myRequests: myActiveRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      departmentQueue: departmentQueue.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      retentionTrash: (currentUser.isHR || currentUser.isMasterAdmin || currentUser.isStaff)
        ? retentionTrash.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : []
    });
    return;
  }

  if (pathname === '/api/requests' && req.method === 'POST') {
    if (!currentUser) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await readJsonBody(req);
    const { department, category, details, ccDepartments, colleagueEmail } = body;

    if (!department || !category) {
      return sendJson(res, 400, { error: 'Department and Request Category are required.' });
    }

    const isHrSubmitter = Boolean(currentUser.isHR || currentUser.department === 'HR Admin');
    if (isHrSubmitter && department === 'HR Admin') {
      return sendJson(res, 400, { error: 'HR Admin accounts cannot select HR Admin as the target department.' });
    }

    const cleanCcDepts = Array.isArray(ccDepartments)
      ? ccDepartments.filter((d) => d !== department && !(isHrSubmitter && d === 'HR Admin'))
      : [];

    const ccEmails = [];
    cleanCcDepts.forEach((d) => {
      const deptAdmins = (data.users || []).filter((u) =>
        (u.isStaff || u.isHR || u.isMasterAdmin) &&
        (u.department === d || (Array.isArray(u.secondaryDepartments) && u.secondaryDepartments.includes(d)))
      );
      const realEmails = deptAdmins.map((u) => u.email).filter((e) => e && !isPlaceholderEmail(e));
      if (realEmails.length > 0) {
        realEmails.forEach((e) => { if (!ccEmails.includes(e)) ccEmails.push(e); });
      } else {
        const mapped = data.settings.departmentEmails[d];
        if (mapped && !ccEmails.includes(mapped)) ccEmails.push(mapped);
      }
    });

    const customMonitoringEmails = [];
    if (colleagueEmail && String(colleagueEmail).trim()) {
      const cleanCol = String(colleagueEmail).trim();
      if (!ccEmails.includes(cleanCol)) ccEmails.push(cleanCol);
      customMonitoringEmails.push(cleanCol);
    }

    const newReq = {
      id: 'REQ-2026-' + Math.floor(1000 + Math.random() * 9000),
      employeeId: currentUser.id,
      employeeName: currentUser.fullName,
      employeeCompany: currentUser.company,
      employeeEmail: currentUser.email || 'N/A',
      employeeMobile: currentUser.mobile || 'N/A',
      department,
      category,
      details: details || {},
      ccDepartments: cleanCcDepts,
      ccEmails,
      customMonitoringEmails,
      status: 'Submitted / Pending Officer Review',
      priority: details?.Urgency || 'Standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedBy: null,
      comments: []
    };

    const relatedEmails = collectRelatedAdminEmails(data, newReq);
    newReq.notifiedEmails = relatedEmails;
    data.requests.unshift(newReq);
    saveData(data);

    const dispatch = await deliverWebsiteEmail(data, {
      toList: relatedEmails,
      subject: `[BSIISUPPORT ${newReq.id}] ${newReq.department} — ${newReq.category} (${newReq.employeeName})`,
      text: `A new support request related to your department/role was submitted.\n\n${formatRequestEmailText(newReq)}`,
      requestId: newReq.id,
      meta: {
        requestId: newReq.id,
        department: newReq.department,
        category: newReq.category,
        employeeName: newReq.employeeName,
        employeeEmail: newReq.employeeEmail
      }
    });

    sendJson(res, 201, {
      success: true,
      request: newReq,
      notifiedEmails: relatedEmails,
      sentViaLiveEmail: dispatch.sentViaLiveEmail,
      emailDeliveryStatus: dispatch.deliveryStatus
    });
    return;
  }

  // Update Request Status / Add Officer Note / Inline Monitoring Dispatch
  if (pathname.startsWith('/api/requests/') && req.method === 'PATCH') {
    if (!currentUser || !currentUser.isStaff) {
      return sendJson(res, 403, { error: 'Strictly for authorized Department Support Officers.' });
    }
    const reqId = decodeURIComponent(pathname.replace('/api/requests/', ''));
    const target = data.requests.find((r) => r.id === reqId);
    if (!target) return sendJson(res, 404, { error: 'Request not found.' });

    const body = await readJsonBody(req);
    let addedMonEmail = null;
    if (body.markDoneToHistory) {
      target.status = 'Approved / Completed';
      target.completedToHistory = true;
      target.deletedAt = new Date().toISOString();
      target.deletedBy = currentUser.fullName;
    }
    if (body.status) {
      target.status = body.status;
    }
    if (body.comment && String(body.comment).trim()) {
      target.comments.push({
        id: 'CMT-' + Date.now(),
        authorName: currentUser.fullName,
        authorRole: `${currentUser.department} Officer`,
        message: String(body.comment).trim(),
        createdAt: new Date().toISOString()
      });
    }
    if (body.addMonitoringEmail && String(body.addMonitoringEmail).trim()) {
      const emailToAdd = String(body.addMonitoringEmail).trim();
      addedMonEmail = emailToAdd;
      if (!target.customMonitoringEmails) target.customMonitoringEmails = [];
      if (!target.customMonitoringEmails.includes(emailToAdd)) {
        target.customMonitoringEmails.push(emailToAdd);
      }
      if (!target.ccEmails.includes(emailToAdd)) {
        target.ccEmails.push(emailToAdd);
      }
    }
    if (body.removeMonitoringEmail) {
      const emailToRem = String(body.removeMonitoringEmail).trim();
      target.customMonitoringEmails = (target.customMonitoringEmails || []).filter((e) => e !== emailToRem);
      target.ccEmails = (target.ccEmails || []).filter((e) => e !== emailToRem);
    }
    target.updatedAt = new Date().toISOString();
    saveData(data);

    if (addedMonEmail) {
      await deliverWebsiteEmail(data, {
        toList: [addedMonEmail],
        subject: `[BSIISUPPORT ${target.id}] Added as Monitoring Recipient — ${target.category}`,
        text: `You were added to monitor this support request by ${currentUser.fullName}.\n\n${formatRequestEmailText(target)}`,
        requestId: target.id
      });
    } else if (body.status || body.markDoneToHistory || (body.comment && String(body.comment).trim())) {
      const updateRecipients = [];
      if (target.employeeEmail && target.employeeEmail.includes('@')) updateRecipients.push(target.employeeEmail);
      (target.customMonitoringEmails || []).forEach((e) => updateRecipients.push(e));
      if (updateRecipients.length > 0) {
        const noteText = body.comment && String(body.comment).trim()
          ? `\nOfficer Note (${currentUser.fullName}): ${String(body.comment).trim()}`
          : '';
        await deliverWebsiteEmail(data, {
          toList: updateRecipients,
          subject: `[BSIISUPPORT ${target.id}] Status Update: ${target.status}`,
          text: `Your support request was updated by ${currentUser.fullName}.${noteText}\n\n${formatRequestEmailText(target)}`,
          requestId: target.id
        });
      }
    }

    sendJson(res, 200, { success: true, request: target });
    return;
  }

  // Sender-only hide (removes request from sender's My Requests view only, keeping it visible to Officers/HR)
  if (pathname === '/api/requests/hide-sender' && req.method === 'POST') {
    if (!currentUser) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await readJsonBody(req);
    const target = data.requests.find((r) => r.id === body.id);
    if (!target) return sendJson(res, 404, { error: 'Request not found.' });
    const isSender = target.employeeId === currentUser.id ||
      (currentUser.type === 'oncall' && target.employeeName === currentUser.fullName);
    if (!isSender) {
      return sendJson(res, 403, { error: 'You can only remove your own submitted requests from your view.' });
    }
    target.hiddenBySender = true;
    target.hiddenBySenderAt = new Date().toISOString();
    saveData(data);
    sendJson(res, 200, { success: true });
    return;
  }

  // Soft-Delete Request -> Moves to Retention Trash
  if (pathname.startsWith('/api/requests/') && req.method === 'DELETE') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin && !currentUser.isStaff)) {
      return sendJson(res, 403, { error: 'Only authorized HR or Department Support Officers can move requests to Retention Trash.' });
    }
    const reqId = decodeURIComponent(pathname.replace('/api/requests/', ''));
    const target = data.requests.find((r) => r.id === reqId);
    if (!target) return sendJson(res, 404, { error: 'Request not found.' });

    target.deletedAt = new Date().toISOString();
    target.deletedBy = currentUser.fullName;
    target.updatedAt = new Date().toISOString();
    saveData(data);
    sendJson(res, 200, { success: true, request: target });
    return;
  }

  // Restore from Retention Trash
  if (pathname === '/api/trash/restore' && req.method === 'POST') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin)) {
      return sendJson(res, 403, { error: 'Only an Administrator can restore requests from Retention Trash.' });
    }
    const body = await readJsonBody(req);
    const target = data.requests.find((r) => r.id === body.id);
    if (!target) return sendJson(res, 404, { error: 'Request not found.' });

    target.deletedAt = null;
    target.deletedBy = null;
    if (isOlderThan365Days(target.createdAt)) {
      target.createdAt = new Date().toISOString();
    }
    target.updatedAt = new Date().toISOString();
    saveData(data);
    sendJson(res, 200, { success: true, request: target });
    return;
  }

  // Permanent Purge Gate (Master Administrator only + explicit confirmation checkbox)
  if (pathname === '/api/trash/purge' && req.method === 'POST') {
    if (!currentUser || !currentUser.isMasterAdmin) {
      return sendJson(res, 403, { error: 'Strictly restricted: Only a Master Administrator can permanently purge records from the Retention Trash.' });
    }
    const body = await readJsonBody(req);
    if (!body.explicitConfirm) {
      return sendJson(res, 400, { error: 'Explicit confirmation checkbox is required before permanent purge.' });
    }
    const idx = data.requests.findIndex((r) => r.id === body.id);
    if (idx === -1) return sendJson(res, 404, { error: 'Request not found.' });

    data.requests.splice(idx, 1);
    saveData(data);
    sendJson(res, 200, { success: true });
    return;
  }

  // Unlock HR Employee Directory via Password Re-entry
  if (pathname === '/api/hr/unlock-directory' && req.method === 'POST') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin && !currentUser.isModerator)) {
      return sendJson(res, 403, { error: 'Strictly for HR Admin only.' });
    }
    const body = await readJsonBody(req);
    const password = String(body.password || '').trim();
    if (!password || password !== currentUser.adminPassword) {
      return sendJson(res, 403, { error: 'Incorrect password. Unable to view Employee Directory.' });
    }
    const rec = getSessionRecord(req);
    const updatedSession = rec
      ? { ...rec.sessionData, hrDirectoryUnlocked: true }
      : { type: 'employee', userId: currentUser.id, hrDirectoryUnlocked: true };
    if (rec) rec.sessionData.hrDirectoryUnlocked = true;
    const newSid = createSignedSid(updatedSession);
    sendJson(res, 200, { success: true }, {
      'Set-Cookie': `bsii_sid=${newSid}; Path=/; HttpOnly; SameSite=Lax`
    });
    return;
  }

  // Self-Service Account Sync / Update
  if (pathname === '/api/account/me' && req.method === 'PATCH') {
    if (!currentUser || currentUser.type === 'oncall') {
      return sendJson(res, 401, { error: 'Authentication required.' });
    }
    const body = await readJsonBody(req);
    await handleSelfAccountUpdate(res, data, currentUser, body);
    return;
  }

  // Send 6-Digit Gmail Verification Code + 1-Click Magic Verify Link
  if (pathname === '/api/account/send-verification-code' && req.method === 'POST') {
    if (!currentUser || currentUser.type === 'oncall') {
      return sendJson(res, 401, { error: 'Authentication required.' });
    }
    const user = data.users.find((u) => u.id === currentUser.id);
    if (!user) return sendJson(res, 404, { error: 'Account not found.' });

    const body = await readJsonBody(req);
    const inputEmail = String(body.email || '').trim();
    const registeredEmail = String(user.email || '').trim();

    const recipients = [];
    if (registeredEmail && !isPlaceholderEmail(registeredEmail)) {
      recipients.push(registeredEmail);
    }
    if (inputEmail && !isPlaceholderEmail(inputEmail) && !recipients.some((r) => r.toLowerCase() === inputEmail.toLowerCase())) {
      recipients.push(inputEmail);
    }

    if (recipients.length === 0) {
      return sendJson(res, 400, {
        error: 'Please enter a valid personal or corporate Gmail address in the Email box above so we can send your verification code.'
      });
    }

    const primaryEmail = recipients[0];
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const verificationToken = createEmailVerificationToken(user.id, primaryEmail, code, expiresAt);
    const magicToken = encryptMagicVerifyToken({
      uid: user.id,
      em: primaryEmail,
      code,
      exp: expiresAt
    });

    emailVerifications.set(user.id, {
      code,
      email: primaryEmail,
      expiresAt,
      approved: false
    });
    if (!data.pendingEmailVerifications) data.pendingEmailVerifications = {};
    data.pendingEmailVerifications[user.id] = {
      codeHash: hashEmailVerificationCode(user.id, code, expiresAt),
      email: primaryEmail,
      expiresAt,
      approved: false,
      approvedCode: null
    };
    saveData(data);

    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    const proto = String(req.headers['x-forwarded-proto'] || (hostHeader.includes('localhost') ? 'http' : 'https')).split(',')[0].trim();
    const verifyUrl = `${proto}://${hostHeader}/api/account/verify-link?v=${encodeURIComponent(magicToken)}`;

    const emailSubject = `[BSIISUPPORT] Security Verification Code: ${code}`;
    const emailText = [
      `Hello ${user.fullName},`,
      '',
      'You requested to verify changes to your BSIISUPPORT account or password.',
      '',
      `YOUR 6-DIGIT VERIFICATION CODE: ${code}`,
      '',
      'Or click the secure link below in your Gmail to verify with 1 click:',
      verifyUrl,
      '',
      'This security code expires in 10 minutes. If you did not request this, please ignore this email.'
    ].join('\n');

    const dispatchResult = await deliverWebsiteEmail(data, {
      toList: recipients,
      subject: emailSubject,
      text: emailText,
      requestId: 'VERIFY-' + user.id,
      meta: { employeeEmail: primaryEmail }
    });

    sendJson(res, 200, {
      success: true,
      sentTo: recipients,
      verificationToken,
      sentViaServer: Boolean(dispatchResult && dispatchResult.sentViaLiveEmail),
      deliveryStatus: dispatchResult ? dispatchResult.deliveryStatus : '',
      browserRelay: {
        toList: recipients,
        subject: emailSubject,
        message: emailText
      }
    });
    return;
  }

  // 1-Click Gmail Verification Link Handler
  if (pathname === '/api/account/verify-link' && req.method === 'GET') {
    const vToken = urlObj.searchParams.get('v') || '';
    const decoded = decryptMagicVerifyToken(vToken);
    if (!decoded || !decoded.uid || !decoded.code || Number(decoded.exp) < Date.now()) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verification Expired</title></head><body style="font-family:sans-serif;background:#f8fafc;padding:32px;text-align:center;"><div style="max-width:460px;margin:40px auto;background:#fff;border:1px solid #fecaca;border-top:5px solid #ef4444;border-radius:12px;padding:28px;"><h2>Verification Link Expired</h2><p style="color:#475569;">This verification link has expired or is invalid. Please return to BSIISUPPORT and click <strong>Send Code to Gmail</strong> again.</p></div></body></html>`);
      return;
    }

    if (!data.pendingEmailVerifications) data.pendingEmailVerifications = {};
    data.pendingEmailVerifications[decoded.uid] = {
      codeHash: hashEmailVerificationCode(decoded.uid, decoded.code, decoded.exp),
      email: decoded.em,
      expiresAt: decoded.exp,
      approved: true,
      approvedCode: String(decoded.code)
    };
    saveData(data);

    const mem = emailVerifications.get(decoded.uid);
    if (mem) {
      mem.approved = true;
    } else {
      emailVerifications.set(decoded.uid, {
        code: String(decoded.code),
        email: decoded.em,
        expiresAt: decoded.exp,
        approved: true
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BSIISUPPORT — Gmail Verified</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px;display:flex;align-items:center;justify-content:center;min-height:90vh;">
  <div style="max-width:480px;width:100%;background:#ffffff;border:1px solid #bae6fd;border-top:6px solid #002147;border-radius:14px;padding:32px 24px;text-align:center;box-shadow:0 12px 32px rgba(0,33,71,0.1);">
    <div style="width:56px;height:56px;border-radius:999px;background:#dcfce7;color:#15803d;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">&#10003;</div>
    <h2 style="color:#002147;margin:0 0 8px;font-size:1.4rem;">Gmail Inbox Verified!</h2>
    <p style="color:#475569;font-size:0.92rem;margin:0 0 18px;">Your BSIISUPPORT profile &amp; password verification is approved. Your open portal tab will detect this automatically, or you can enter the 6-digit code below:</p>
    <div style="background:#f0f9ff;border:2px dashed #0284c7;border-radius:10px;padding:16px;margin-bottom:18px;">
      <div style="font-size:0.75rem;text-transform:uppercase;font-weight:800;color:#0369a1;letter-spacing:0.06em;margin-bottom:4px;">Your 6-Digit Verification Code</div>
      <div id="codeBox" style="font-size:2rem;font-weight:900;letter-spacing:0.22em;color:#002147;">${String(decoded.code).replace(/[^0-9]/g, '')}</div>
    </div>
    <button onclick="navigator.clipboard.writeText('${String(decoded.code).replace(/[^0-9]/g, '')}');this.textContent='Copied ✓';" style="background:#e5a823;color:#002147;border:none;padding:11px 22px;border-radius:8px;font-weight:800;font-size:0.92rem;cursor:pointer;margin-right:8px;">Copy Code</button>
    <a href="/open" style="display:inline-block;background:#002147;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:800;font-size:0.92rem;">Return to Portal</a>
  </div>
  <script>
    try {
      localStorage.setItem('bsii_gmail_verified', JSON.stringify({
        uid: ${JSON.stringify(decoded.uid)},
        code: ${JSON.stringify(String(decoded.code))},
        ts: Date.now()
      }));
      if (window.BroadcastChannel) {
        const bc = new BroadcastChannel('bsii_gmail_verify');
        bc.postMessage({ uid: ${JSON.stringify(decoded.uid)}, code: ${JSON.stringify(String(decoded.code))} });
      }
    } catch (_) {}
  </script>
</body>
</html>`);
    return;
  }

  // Poll Endpoint for Automatic 1-Click Gmail Verification Detection
  if (pathname === '/api/account/verification-status' && req.method === 'GET') {
    if (!currentUser || currentUser.type === 'oncall') {
      return sendJson(res, 401, { approved: false });
    }
    const persisted = data && data.pendingEmailVerifications && data.pendingEmailVerifications[currentUser.id];
    const mem = emailVerifications.get(currentUser.id);
    if (persisted && persisted.approved && persisted.expiresAt >= Date.now()) {
      return sendJson(res, 200, { approved: true, code: persisted.approvedCode });
    }
    if (mem && mem.approved && mem.expiresAt >= Date.now()) {
      return sendJson(res, 200, { approved: true, code: mem.code });
    }
    return sendJson(res, 200, { approved: false });
  }

  // HR Security & Employee Directory Management (Strictly HR only; admin credentials masked)
  if (pathname === '/api/hr/employees' && req.method === 'GET') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin && !currentUser.isModerator)) {
      return sendJson(res, 403, { error: 'Strictly for HR Admin only. Department Officers cannot view all accounts.' });
    }
    const rec = getSessionRecord(req);
    const isUnlocked = Boolean(rec && rec.sessionData && rec.sessionData.hrDirectoryUnlocked);
    if (!isUnlocked) {
      sendJson(res, 200, {
        requiresPassword: true,
        settings: sanitizeSettingsForClient(data.settings, true)
      });
      return;
    }
    sendJson(res, 200, {
      requiresPassword: false,
      employees: data.users.map(formatDirectoryUser),
      settings: sanitizeSettingsForClient(data.settings, true)
    });
    return;
  }

  if (pathname === '/api/hr/employees' && req.method === 'POST') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin && !currentUser.isModerator)) {
      return sendJson(res, 403, { error: 'Strict HR Security Policy: ONLY HR can create employee accounts.' });
    }
    const body = await readJsonBody(req);
    const {
      id, lastName, fullName, company, role, department, email, mobile,
      isStaff, isHR, isMasterAdmin, adminUsername, adminPassword,
      hrConfirmPassword
    } = body;
    const isAdminOrOfficer = Boolean(isStaff || isHR || isMasterAdmin);

    if (isAdminOrOfficer) {
      if (!hrConfirmPassword || String(hrConfirmPassword).trim() !== currentUser.adminPassword) {
        return sendJson(res, 403, { error: 'Password verification failed. Re-enter your current HR password to create an Admin / HR account.' });
      }
    }
    if (!id || !fullName) {
      return sendJson(res, 400, { error: 'ID Number and Full Name are required.' });
    }
    if (!isAdminOrOfficer && !lastName) {
      return sendJson(res, 400, { error: 'Last Name (no spaces, ALL CAPS password) is required for Employee accounts.' });
    }
    if (data.users.some((u) => u.id === String(id).trim())) {
      return sendJson(res, 400, { error: 'An account with this ID Number already exists.' });
    }
    const cleanFull = String(fullName).trim();
    const derivedLast = lastName
      ? String(lastName).replace(/\s+/g, '').toUpperCase()
      : cleanFull.split(/\s+/).slice(-1)[0].replace(/\s+/g, '').toUpperCase();
    const cleanAdminUser = String(adminUsername || '').trim();
    const cleanAdminPass = String(adminPassword || '').trim();
    if (isAdminOrOfficer) {
      if (!cleanAdminUser || !cleanAdminPass) {
        return sendJson(res, 400, { error: 'Admin / Department Officer accounts require a unique Username and Strong Password.' });
      }
      if (data.users.some((u) => u.adminUsername && u.adminUsername === cleanAdminUser)) {
        return sendJson(res, 400, { error: 'That Admin / Officer Username is already taken.' });
      }
      const pwErr = validateStrongAdminPassword(cleanAdminPass, cleanFull, derivedLast);
      if (pwErr) {
        return sendJson(res, 400, { error: pwErr });
      }
    }
    const newEmp = {
      id: String(id).trim(),
      lastName: derivedLast,
      fullName: cleanFull,
      company: company || 'BSII Employee',
      role: role || (isHR ? 'HR Admin' : (isAdminOrOfficer ? 'Department Officer' : 'Employee')),
      department: department || 'Operations',
      isStaff: isAdminOrOfficer,
      isHR: Boolean(isHR),
      isMasterAdmin: Boolean(isMasterAdmin),
      email: String(email || '').trim(),
      mobile: String(mobile || '').trim(),
      updatedAt: new Date().toISOString()
    };
    if (isAdminOrOfficer) {
      newEmp.adminUsername = cleanAdminUser;
      newEmp.adminPassword = cleanAdminPass;
    }
    data.users.push(newEmp);
    saveData(data);
    sendJson(res, 201, { success: true, employee: newEmp });
    return;
  }

  if (pathname === '/api/hr/employees/reset-password' && req.method === 'POST') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin)) {
      return sendJson(res, 403, { error: 'Strict HR Security Policy: ONLY HR can reset or change employee passwords.' });
    }
    const body = await readJsonBody(req);
    const emp = data.users.find((u) => u.id === body.id);
    if (!emp) return sendJson(res, 404, { error: 'Employee not found.' });
    if (emp.isStaff || emp.isHR || emp.isMasterAdmin || emp.isModerator) {
      return sendJson(res, 403, { error: 'Admin & Officer accounts can only be modified by the account owner via Profile.' });
    }
    if (!body.newLastName) return sendJson(res, 400, { error: 'New UPPERCASE Last Name password is required.' });

    emp.lastName = String(body.newLastName).trim().toUpperCase();
    if (body.role) emp.role = String(body.role).trim();
    if (body.department) emp.department = String(body.department).trim();
    emp.updatedAt = new Date().toISOString();
    saveData(data);
    sendJson(res, 200, { success: true, employee: emp });
    return;
  }

  // HR Edit Employee Directory Record (Standard Employees Only)
  if (pathname.startsWith('/api/hr/employees/') && req.method === 'PATCH') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin && !currentUser.isModerator)) {
      return sendJson(res, 403, { error: 'Strict HR Security Policy: ONLY HR can edit employee directory accounts.' });
    }
    const empId = decodeURIComponent(pathname.replace('/api/hr/employees/', ''));
    const emp = data.users.find((u) => u.id === empId);
    if (!emp) return sendJson(res, 404, { error: 'Employee not found.' });
    if (emp.isStaff || emp.isHR || emp.isMasterAdmin || emp.isModerator) {
      return sendJson(res, 403, { error: 'Admin & Officer accounts are hidden from the Employee Directory and can only be updated by the admin owner via their own Profile.' });
    }

    const body = await readJsonBody(req);
    const nextId = typeof body.newId === 'string' ? body.newId.trim() : '';
    if (nextId && nextId !== emp.id) {
      if (data.users.some((u) => u.id === nextId)) {
        return sendJson(res, 400, { error: `Employee ID "${nextId}" is already in use.` });
      }
      const oldId = emp.id;
      emp.id = nextId;
      (data.requests || []).forEach((r) => {
        if (r.employeeId === oldId) r.employeeId = nextId;
      });
      sessions.forEach((s) => {
        if (s.userId === oldId) s.userId = nextId;
      });
    }
    if (body.fullName && String(body.fullName).trim()) emp.fullName = String(body.fullName).trim();
    if (body.lastName && String(body.lastName).trim()) emp.lastName = String(body.lastName).trim().toUpperCase();
    if (body.company) emp.company = String(body.company).trim();
    if (body.department) emp.department = String(body.department).trim();
    if (body.role) emp.role = String(body.role).trim();
    if (typeof body.email === 'string') emp.email = body.email.trim();
    if (typeof body.mobile === 'string') emp.mobile = body.mobile.trim();
    emp.updatedAt = new Date().toISOString();
    syncUserAcrossRequests(data, emp);

    saveData(data);
    sendJson(res, 200, { success: true, employee: emp });
    return;
  }

  if (pathname.startsWith('/api/hr/employees/') && req.method === 'DELETE') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin)) {
      return sendJson(res, 403, { error: 'Strict HR Security Policy: ONLY HR can delete employee accounts.' });
    }
    const empId = decodeURIComponent(pathname.replace('/api/hr/employees/', ''));
    if (empId === currentUser.id) {
      return sendJson(res, 400, { error: 'You cannot delete your own active HR Admin account.' });
    }
    const idx = data.users.findIndex((u) => u.id === empId);
    if (idx === -1) return sendJson(res, 404, { error: 'Employee not found.' });
    const target = data.users[idx];
    if (target.isStaff || target.isHR || target.isMasterAdmin || target.isModerator) {
      return sendJson(res, 403, { error: 'Admin & Officer accounts cannot be deleted from the Employee Directory.' });
    }
    data.users.splice(idx, 1);
    saveData(data);
    sendJson(res, 200, { success: true });
    return;
  }

  if (pathname === '/api/settings' && req.method === 'POST') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin && !currentUser.isStaff)) {
      return sendJson(res, 403, { error: 'Unauthorized' });
    }
    const body = await readJsonBody(req);
    if (typeof body.globalCcEmail === 'string') {
      data.settings.globalCcEmail = body.globalCcEmail.trim();
    }
    if (typeof body.globalCcEnabled === 'boolean') {
      data.settings.globalCcEnabled = body.globalCcEnabled;
    }
    if (typeof body.seasonalRoleNote === 'string') {
      data.settings.seasonalRoleNote = body.seasonalRoleNote.trim();
    }
    if (Array.isArray(body.classifications)) {
      const cleaned = body.classifications.map((c) => String(c || '').trim()).filter(Boolean);
      if (cleaned.length > 0) {
        data.settings.classifications = Array.from(new Set(cleaned));
      }
    }
    if (body.departmentEmails && typeof body.departmentEmails === 'object') {
      data.settings.departmentEmails = {
        ...data.settings.departmentEmails,
        ...body.departmentEmails
      };
    }
    if (currentUser.isHR || currentUser.isMasterAdmin || currentUser.isModerator) {
      if (typeof body.emailWebhookUrl === 'string') {
        data.settings.emailWebhookUrl = body.emailWebhookUrl.trim();
      }
      if (typeof body.smtpUser === 'string') {
        data.settings.smtpUser = body.smtpUser.trim();
      }
      if (typeof body.smtpPass === 'string' && body.smtpPass.trim()) {
        data.settings.smtpPass = body.smtpPass.replace(/\s+/g, '');
      }
    }
    saveData(data);
    sendJson(res, 200, { success: true, settings: sanitizeSettingsForClient(data.settings, Boolean(currentUser.isHR || currentUser.isMasterAdmin || currentUser.isModerator)) });
    return;
  }

  if (pathname === '/api/settings/test-email' && req.method === 'POST') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin && !currentUser.isModerator)) {
      return sendJson(res, 403, { error: 'Strictly for HR Admin.' });
    }
    const body = await readJsonBody(req);
    const to = String(body.to || currentUser.email || '').trim();
    if (!to || !to.includes('@')) return sendJson(res, 400, { error: 'Valid recipient email is required.' });
    const result = await deliverWebsiteEmail(data, {
      toList: [to],
      subject: 'BSIISUPPORT — Live Email Relay Test',
      text: `Hello ${currentUser.fullName},\n\nYour BSIISUPPORT website email relay is active. Incoming requests related to an admin's department or CC will automatically route to their Gmail inbox.`,
      requestId: 'TEST-RELAY'
    });
    if (!result.sentViaLiveEmail) {
      return sendJson(res, 400, { error: result.deliveryStatus });
    }
    sendJson(res, 200, { success: true, message: `${result.deliveryStatus} -> ${to}` });
    return;
  }

  if (pathname === '/api/settings/dispatch-log' && req.method === 'GET') {
    if (!currentUser || (!currentUser.isHR && !currentUser.isMasterAdmin && !currentUser.isStaff)) {
      return sendJson(res, 403, { error: 'Unauthorized' });
    }
    sendJson(res, 200, { logs: (data.emailDispatchLog || []).slice(0, 20) });
    return;
  }

  // Edit Step Options (HR Admin can edit ALL departments; other Department Admins can ONLY edit their own)
  if (pathname === '/api/department-config' && req.method === 'POST') {
    if (!currentUser || !currentUser.isStaff) {
      return sendJson(res, 403, { error: 'Strictly for authorized Department Officers and HR Admin.' });
    }
    const body = await readJsonBody(req);
    const { department, subtitle, categories } = body;
    if (!department || !data.departmentConfig[department]) {
      return sendJson(res, 400, { error: 'Valid target department is required.' });
    }
    const canEditAll = Boolean(currentUser.isHR || currentUser.isMasterAdmin);
    const isOwnDept = currentUser.department === department ||
      (currentUser.secondaryDepartments && currentUser.secondaryDepartments.includes(department));
    if (!canEditAll && !isOwnDept) {
      return sendJson(res, 403, {
        error: `Access denied: ${currentUser.department} cannot edit ${department} step options. Only HR Admin can edit all departments.`
      });
    }
    if (typeof subtitle === 'string') {
      data.departmentConfig[department].subtitle = subtitle.trim();
    }
    if (categories && typeof categories === 'object') {
      data.departmentConfig[department].categories = categories;
    }
    saveData(data);
    sendJson(res, 200, { success: true, departmentConfig: data.departmentConfig });
    return;
  }

  // Officer / Admin self-update Name & Role (enforces same Admin verification & sync)
  if (pathname === '/api/officer/self-profile' && req.method === 'POST') {
    if (!currentUser || !currentUser.isStaff) {
      return sendJson(res, 403, { error: 'Strictly for authorized Department Officers and Admins.' });
    }
    const body = await readJsonBody(req);
    await handleSelfAccountUpdate(res, data, currentUser, body);
    return;
  }

  // Serve SPA HTML for all UI routes
  const indexHtmlPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    fs.createReadStream(indexHtmlPath).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`BSIISUPPORT Portal running at http://localhost:${PORT}`);
  });
}

module.exports = (req, res) => server.emit('request', req, res);
module.exports.server = server;
