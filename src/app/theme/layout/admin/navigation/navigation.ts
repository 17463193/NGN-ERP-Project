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
  role?: string[];
  isMainParent?: boolean;
  active?: boolean;
}

export const NavigationItems: NavigationItem[] = [
 {
  id: 'dashboard',
  title: 'Dashboard',
  type: 'group',
  icon: 'icon-navigation',
  children: [
    {
      id: 'default',
      title: 'Dashboard',
      type: 'item',
      classes: 'nav-item',
      url: '/default',
      icon: 'ti ti-chart-bar', // ✓ Correct - already good
      breadcrumbs: false
    }
  ]
},
{
  id: 'page',
  title: 'Pages',
  type: 'group',
  icon: 'icon-navigation',
  children: [
    {
      id: 'emp-det',
      title: 'Employee Details',
      type: 'item',
      classes: 'nav-item',
      url: '/empl/emp-det',
      icon: 'ti ti-users', // Changed from 'ti ti-user' to 'ti ti-users' for employee details
      target: false,
      breadcrumbs: false
    },
    {
      id: 'attendence',
      title: 'Employee Attendance',
      type: 'item',
      url: '/attendence',
      icon: 'ti ti-calendar-time', // Changed to calendar with time for leave management
      classes: 'nav-item',
      target: false,
      breadcrumbs: false,
      children: [
        {
          id: 'employee-attendance',
          title: 'Employee Attendance',
          type: 'item',
          url: '/employee-attendance',
          breadcrumbs: false,
          hidden: true
        },
        {
          id: 'attendance-sheet',
          title: 'Attendance Sheet',
          type: 'item',
          classes: 'nav-item',
          url: '/attendance-sheet',
          icon: 'ti ti-calendar-check', // Change Icon
          breadcrumbs: false,
          hidden: true
        }
      ]
    },
    {
      id: 'elmr',
      title: 'Leave Management',
      type: 'item',
      url: '/elmr',
      icon: 'ti ti-calendar-minus', // Changed to calendar with time for leave management
      target: false,
      breadcrumbs: false,
      children: [
        {
          id: 'balance-leave',
          title: 'Leave Balance',
          type: 'item',
          url: '/balanceleave',
          breadcrumbs: false,
          hidden: true
        },
        {
          id: 'leave-form',
          title: 'Leave Form',
          type: 'item',
          url: '/leave-form',
          icon: 'ti ti-file-text',
          breadcrumbs: false,
          hidden: false
        }
      ]
    },
    {
  id: 'leave-allocation',
  title: 'Leave Allocation',
  type: 'item',
  url: '/leave-allocation',
  icon: 'ti ti-calendar-plus', // Best match for "allocation"
  classes: 'nav-item',
  breadcrumbs: false,
  hidden: false
},
    {
      id: 'Calendar',
      title: 'Calendar',
      type: 'item',
      url: '/calendar',
      icon: 'ti ti-calendar', // Changed to calendar with time for leave management
      target: false,
      classes: 'nav-item',
      breadcrumbs: false,
    },
    {
      id: 'Organization',
      title: 'Organization',
      type: 'collapse',
      icon: 'ti ti-certificate',
      classes: 'nav-item',
      children: [
        {
          id: 'job-grade',
          title: 'Job Grade',
          type: 'item',
          url: '/job-management/job-grade',
          breadcrumbs: false,
          icon: 'ti ti-category',
          classes: 'nav-item',
          active: false
        },
        {
          id: 'job-position',
          title: 'Job Position',
          type: 'item',
          url: '/job-position',
          breadcrumbs: false,
          icon: 'ti ti-certificate',
          classes: 'nav-item',
          active: true
        },
        {
          id: 'department',
          title: 'Department',
          type: 'item',
          url: '/job-management/department',
          breadcrumbs: false,
          icon: 'ti ti-certificate',
          classes: 'nav-item',
          active: true
        }
      ]
    },
    {
      id: 'pay-roll',
      title: 'Pay Roll',
      type: 'item',
      icon: 'ti ti-currency-dollar', // ✓ Correct - already good for payroll
      url: '/pay-roll',
      classes: 'nav-item',
      breadcrumbs: false,
      children: [
        {
          id: 'pay-slip',
          title: 'Payslip',
          type: 'item',
          url: '/guest/payslip',
          breadcrumbs: false,
          hidden: true
        }
      ]
    },
    {
      id: 'document-archival',
      title: 'Document Archival', // Fixed title casing
      type: 'item',
      classes: 'nav-item', // Fixed class name
      url: '/document-archival',
      icon: 'ti ti-archive' // Fixed icon - 'ti ti-document-archival' doesn't exist
    },
        {
      id: 'training-management',
      title: 'Training Management',
      type: 'collapse',
      icon: 'ti ti-certificate',
      classes: 'nav-item',
      children: [
        {
          id: 'training-programs',
          title: 'Programs',
          type: 'item',
          url: '/emp-training',
          breadcrumbs: false,
          icon: 'ti ti-category',
          classes: 'nav-item'
        },
        {
          id: 'training-categories',
          title: 'Categories',
          type: 'item',
          url: '/emp-categories',
          breadcrumbs: false,
          icon: 'ti ti-certificate',
          classes: 'nav-item',
          active: true
        },
        {
          id: 'training-nominations',
          title: 'Nominations',
          type: 'item',
          url: '/emp-nominations',
          breadcrumbs: false,
          icon: 'ti ti-list-check',
          classes: 'nav-item'
        }
      ]
    },
    {
      id: 'emp-transfer',
      title: 'Employee Transfer',
      type: 'item',
      classes: 'nav-item',
      url: '/emp-transfer',
      icon: 'ti ti-arrows-exchange' 
    },
    {
      id: 'emp-separation',
      title: 'Employee Separation',
      type: 'item',
      classes: 'nav-item',
      url: '/emp-separation',
      icon: 'ti ti-logout' 
    }
  ]
}
 // {
      //   id: 'Authentication',
      //   title: 'Authentication',
      //   type: 'collapse',
      //   icon: 'ti ti-key',
      //   children: [
      //     {
      //       id: 'login',
      //       title: 'Login',
      //       type: 'item',
      //       url: '/guest/login',
      //       target: true,
      //       breadcrumbs: false
      //     },
      //     {
      //       id: 'register',
      //       title: 'Register',
      //       type: 'item',
      //       url: '/guest/register',
      //       target: true,
      //       breadcrumbs: false
      //     }
      //   ]
      // }
  // {
  //   id: 'elements',
  //   title: 'Elements',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   children: [
  //     {
  //       id: 'typography',
  //       title: 'Typography',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/typography',
  //       icon: 'ti ti-typography'
  //     },
  //     {
  //       id: 'color',
  //       title: 'Colors',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/color',
  //       icon: 'ti ti-brush'
  //     },
  //     {
  //       id: 'tabler',
  //       title: 'Tabler',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: 'https://tabler-icons.io/',
  //       icon: 'ti ti-plant-2',
  //       target: true,
  //       external: true
  //     }
  //   ]
  // },
  // {
  //   id: 'other',
  //   title: 'Other',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   children: [
  //     {
  //       id: 'sample-page',
  //       title: 'Sample Page',
  //       type: 'item',
  //       url: '/sample-page',
  //       classes: 'nav-item',
  //       icon: 'ti ti-brand-chrome'
  //     },
  //     {
  //       id: 'document',
  //       title: 'Document',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: 'https://codedthemes.gitbook.io/berry-angular/',
  //       icon: 'ti ti-vocabulary',
  //       target: true,
  //       external: true
  //     }
  //   ]
  // }
];
