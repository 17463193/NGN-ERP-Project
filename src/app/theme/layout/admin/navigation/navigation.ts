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
      id: 'Leave-controller',
      title: 'Leave Management',
      type: 'collapse',
      icon: 'ti ti-certificate',
      classes: 'nav-item',
      children: [
        {
          id: 'leave-management',
          title: 'Leave Management',
          type: 'item',
          url: '/elmr',
          breadcrumbs: false,
          icon: 'ti ti-category',
          classes: 'nav-item'
        },
        {
          id: 'leave-allocation',
          title: 'Leave Allocation',
          type: 'item',
          url: '/leave-allocation',
          breadcrumbs: false,
          icon: 'ti ti-certificate',
          classes: 'nav-item',
          active: true
        },
      ]
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
    // {
    //   id: 'emp-training',
    //   title: 'Employee Training', // Fixed title casing
    //   type: 'item',
    //   classes: 'nav-item', // Fixed class name
    //   url: '/emp-training',
    //   icon: 'ti ti-book' 
    // },
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
      id: 'transfer-management',
      title: 'Transfer Management',
      type: 'collapse',
      classes: 'nav-item',
      icon: 'ti ti-arrows-exchange' ,
      children: [
        {
          id: 'emp-transfer',
          title: 'Transfer',
          type: 'item',
          url: '/emp-transfer',
          breadcrumbs: false,
          icon: 'ti ti-category',
          classes: 'nav-item'
        },
        {
          id: 'emp-type',
          title: 'Transfer Type',
          type: 'item',
          url: '/emp-type',
          breadcrumbs: false,
          icon: 'ti ti-category',
          classes: 'nav-item'
        },
      ]
    },
  ],
},
{
  id: 'employee-separation',
  title: 'Employee Separation',
  type: 'collapse',
  icon: 'ti ti-certificate',
  classes: 'nav-item',
  children: [
{
  id: 'emp-separation',
  title: 'Emp.. Separation',
  type: 'item',
  classes: 'nav-item',
  url: '/emp-separation',
  icon: 'ti ti-logout' ,
  breadcrumbs: false,
  active:true
},
{
  id: 'separation-type',
  title: 'Separation Type',
  type: 'item',
  classes: 'nav-item',
  url: '/separation-type',
  icon: 'ti ti-logout' ,
  breadcrumbs: false,
  // active: true
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
