export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  routerLink?: string;
  classes?: string;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  children?: NavigationItem[];
  roles?: string[];
  isMainParent?: boolean;
  active?: boolean;
  permission?: string;
  displayOrder?: number;
}

export const NavigationItems: NavigationItem[] = [
  // {
  //   id: 'dashboard',
  //   title: 'Dashboard',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   permission: 'view_dashboard',
  //   children: [
  //     {
  //       id: 'default',
  //       title: 'Dashboard',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/default',
  //       icon: 'ti ti-chart-bar',
  //       breadcrumbs: false,
  //       permission: 'view_dashboard'
  //     }
  //   ]
  // },
  // {
  //   id: 'page',
  //   title: 'Pages',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   permission: 'view_pages',
  //   children: [
  //     {
  //       id: 'emp-det',
  //       title: 'Employee Details',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/empl/emp-det',
  //       icon: 'ti ti-users',
  //       target: false,
  //       breadcrumbs: false,
  //       permission: 'view_employee_details'
  //     },
  //     {
  //       id: 'attendence',
  //       title: 'Employee Attendance',
  //       type: 'item',
  //       url: '/attendence',
  //       icon: 'ti ti-calendar-time',
  //       classes: 'nav-item',
  //       target: false,
  //       breadcrumbs: false,
  //       permission: 'view_attendance',
  //       children: [
  //         {
  //           id: 'employee-attendance',
  //           title: 'Employee Attendance',
  //           type: 'item',
  //           url: '/employee-attendance',
  //           breadcrumbs: false,
  //           hidden: true,
  //           permission: 'view_attendance_details'
  //         },
  //         {
  //           id: 'attendance-sheet',
  //           title: 'Attendance Sheet',
  //           type: 'item',
  //           classes: 'nav-item',
  //           url: '/attendance-sheet',
  //           icon: 'ti ti-calendar-check',
  //           breadcrumbs: false,
  //           hidden: true,
  //           permission: 'view_attendance_sheet'
  //         }
  //       ]
  //     },
  //     {
  //       id: 'elmr',
  //       title: 'Leave Management',
  //       type: 'item',
  //       url: '/elmr',
  //       icon: 'ti ti-calendar-minus',
  //       target: false,
  //       breadcrumbs: false,
  //       permission: 'view_leave_management',
  //       children: [
  //         {
  //           id: 'balance-leave',
  //           title: 'Leave Balance',
  //           type: 'item',
  //           url: '/balanceleave',
  //           breadcrumbs: false,
  //           hidden: true,
  //           permission: 'view_leave_balance'
  //         },
  //         {
  //           id: 'leave-form',
  //           title: 'Leave Form',
  //           type: 'item',
  //           url: '/leave-form',
  //           icon: 'ti ti-file-text',
  //           breadcrumbs: false,
  //           hidden: false,
  //           permission: 'view_leave_form'
  //         }
  //       ]
  //     },
  //     {
  //       id: 'leave-allocation',
  //       title: 'Leave Allocation',
  //       type: 'item',
  //       url: '/leave-allocation',
  //       icon: 'ti ti-calendar-plus',
  //       classes: 'nav-item',
  //       breadcrumbs: false,
  //       hidden: false,
  //       permission: 'view_leave_allocation'
  //     },
  //     {
  //       id: 'Calendar',
  //       title: 'Calendar',
  //       type: 'item',
  //       url: '/calendar',
  //       icon: 'ti ti-calendar',
  //       target: false,
  //       classes: 'nav-item',
  //       breadcrumbs: false,
  //       permission: 'view_calendar'
  //     },
  //     {
  //       id: 'Organization',
  //       title: 'Organization',
  //       type: 'collapse',
  //       icon: 'ti ti-certificate',
  //       classes: 'nav-item',
  //       permission: 'view_organization',
  //       children: [
  //         {
  //           id: 'job-grade',
  //           title: 'Job Grade',
  //           type: 'item',
  //           url: '/job-management/job-grade',
  //           breadcrumbs: false,
  //           icon: 'ti ti-category',
  //           classes: 'nav-item',
  //           active: false,
  //           permission: 'view_job_grade'
  //         },
  //         {
  //           id: 'job-position',
  //           title: 'Job Position',
  //           type: 'item',
  //           url: '/job-position',
  //           breadcrumbs: false,
  //           icon: 'ti ti-certificate',
  //           classes: 'nav-item',
  //           active: true,
  //           permission: 'view_job_position'
  //         },
  //         {
  //           id: 'department',
  //           title: 'Department',
  //           type: 'item',
  //           url: '/job-management/department',
  //           breadcrumbs: false,
  //           icon: 'ti ti-certificate',
  //           classes: 'nav-item',
  //           active: true,
  //           permission: 'view_department'
  //         }
  //       ]
  //     },
  //     {
  //       id: 'pay-roll',
  //       title: 'Pay Roll',
  //       type: 'item',
  //       icon: 'ti ti-currency-dollar',
  //       url: '/pay-roll',
  //       classes: 'nav-item',
  //       breadcrumbs: false,
  //       permission: 'view_payroll',
  //       children: [
  //         {
  //           id: 'pay-slip',
  //           title: 'Payslip',
  //           type: 'item',
  //           url: '/guest/payslip',
  //           breadcrumbs: false,
  //           hidden: true,
  //           permission: 'view_payslip'
  //         }
  //       ]
  //     },
  //     {
  //       id: 'pay-revision',
  //       title: 'Pay Revision',
  //       type: 'item',
  //       classes: 'nav-item', 
  //       url: '/pay-revision',
  //       icon: 'ti ti-currency-dollar',
  //       permission: 'view_pay_revision'
  //     },
  //     {
  //       id: 'document-archival',
  //       title: 'Document Archival',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/document-archival',
  //       icon: 'ti ti-archive',
  //       permission: 'view_document_archival'
  //     },
  //     {
  //       id: 'training-management',
  //       title: 'Training Management',
  //       type: 'collapse',
  //       icon: 'ti ti-certificate',
  //       classes: 'nav-item',
  //       permission: 'view_training_management',
  //       children: [
  //         {
  //           id: 'training-programs',
  //           title: 'Programs',
  //           type: 'item',
  //           url: '/emp-training',
  //           breadcrumbs: false,
  //           icon: 'ti ti-category',
  //           classes: 'nav-item',
  //           permission: 'view_training_programs'
  //         },
  //         {
  //           id: 'training-categories',
  //           title: 'Categories',
  //           type: 'item',
  //           url: '/emp-categories',
  //           breadcrumbs: false,
  //           icon: 'ti ti-certificate',
  //           classes: 'nav-item',
  //           active: true,
  //           permission: 'view_training_categories'
  //         },
  //         {
  //           id: 'training-nominations',
  //           title: 'Nominations',
  //           type: 'item',
  //           url: '/emp-nominations',
  //           breadcrumbs: false,
  //           icon: 'ti ti-list-check',
  //           classes: 'nav-item',
  //           permission: 'view_training_nominations'
  //         }
  //       ]
  //     },
  //     {
  //       id: 'emp-transfer',
  //       title: 'Employee Transfer',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/emp-transfer',
  //       icon: 'ti ti-arrows-exchange',
  //       permission: 'view_employee_transfer'
  //     },
  //     {
  //       id: 'emp-separation',
  //       title: 'Employee Separation',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/emp-separation',
  //       icon: 'ti ti-logout',
  //       permission: 'view_employee_separation'
  //     }
  //   ]
  // }
];