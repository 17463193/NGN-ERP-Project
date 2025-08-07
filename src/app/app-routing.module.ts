import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  
   {
    path: '',
    redirectTo: '/guest/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./demo/pages/authentication/authentication-routing.module').then(m => m.AuthenticationRoutingModule)
  },
  { 
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: '/default',
        pathMatch: 'full'
      },
      {
        path: 'default',
        loadComponent: () => import('./demo/dashboard/default/default.component').then((c) => c.DefaultComponent)
      },
      {
        path: 'attendence',
        loadComponent: () => import('./demo/dashboard/attendence/attendence.component').then((c) => c.AttendenceComponent),
        children: [
          { path: '', redirectTo: 'employee-attendance', pathMatch: 'full' },
          {
            path: 'employee-attendance',
           loadComponent: () => import('./demo/dashboard/employee-attendance/employee-attendance.component').then((c) => c.EmployeeAttendanceComponent)
          },
          {
           path: 'attendance-sheet',
        loadComponent: () => import('./demo/dashboard/attendance-sheet/attendance-sheet.component').then((c) => c.AttendanceSheetComponent)
          }
        ]
      },
      // Keep the old routes for backward compatibility
      {
        path: 'employee-attendance',
        redirectTo: 'job-management/employee-attendance',
        pathMatch: 'full'
      },
      {
        path: 'attendance-sheet',
        redirectTo: 'job-management/attendance-sheet',
        pathMatch: 'full'
      },

      {
        path: 'typography',
        loadComponent: () => import('./demo/elements/typography/typography.component')
      },
      {
        path: 'color',
        loadComponent: () => import('./demo/elements/element-color/element-color.component')
      },
      {
        path: 'sample-page',
        loadComponent: () => import('./demo/other/sample-page/sample-page.component')
      },
     {
        path: 'elmr',
        loadComponent: () => import('./demo/Leave/ELMR/elmr.component').then((c)=> c.ELMRComponent)
      },
      {
        path: 'balanceleave',
        loadComponent: () => import('./demo/Leave/balanceleave/balanceleave.component').then((c)=>c.BalanceleaveComponent)
      },
     
      {
        path: 'balanceleave/:id',
        loadComponent: () => import('./demo/Leave/balanceleave/balanceleave.component').then((c) => c.BalanceleaveComponent),
      },
      {
        path: 'pay-roll',
        loadComponent: () => import('./demo/pay-roll/pay-roll.component').then((c) => c.PayRollComponent)
      },
      {
        path: 'pay-slip/:empId',
        loadComponent: () => import('./demo/pay-roll/pay-slip/pay-slip.component').then((c) => c.PaySlipComponent)
      },
      {
        path: 'document-archival',
        loadComponent: () => import('./demo/elements/document-archival/document-archival.component').then((m) => m.DocumentArchivalComponent)
      },
      {
        path: 'doc-view-file/:id',
        loadComponent: () => import('./demo/elements/doc-view-file/doc-view-file.component').then((m) => m.DocViewFileComponent)
      },
      {
        path: 'empl',
        loadChildren: () => import('./demo/emp-detail/emp.module').then((m) => m.EmployeeModule)
      },
      {
        path: 'leave-allocation',
        loadComponent: () => import('./demo/Leave/leave-allocation/leave-allocation.component').then((c) => c.LeaveAllocationComponent)
      },
      {
        path: 'leave-allocation-details/:empId',
        loadComponent: () => import('./demo/Leave/leave-allocation-details/leave-allocation-details.component').then((c) => c.LeaveAllocationDetailsComponent)
      },
      {
        path: 'calendar',
        children: [
          // Default route - Calendar Overview
          {
            path: '',
            title: 'Calendar Overview',
            loadComponent: () => import('./demo/Calendar/calendar-overview/calendar-overview.component').then((c) => c.CalendarOverviewComponent)
          },
          // Add New Calendar
          {
            path: 'add',
            title: 'Add New Calendar',
            loadComponent: () => import('./demo/Calendar/add-calendar/add-calendar.component').then((c) => c.AddCalendarComponent)
          },
          // Edit Existing Calendar (with full parameters)
          {
            path: 'edit/:id/:org/:branch/:year',
            title: 'Edit Calendar',
            loadComponent: () => import('./demo/Calendar/edit-calendar/edit-calendar.component').then((c) => c.EditCalendarComponent)
          },
          // View Calendar Details (with full parameters)
          {
            path: 'details/:id/:branchId/:year',
            title: 'Calendar Details',
            loadComponent: () => import('./demo/Calendar/calendar-details/calendar-details.component').then((c) => c.CalendarDetailsComponent)
          },
          // Fallback route for direct ID access (redirects to overview)
          {
            path: ':id',
            redirectTo: '/calendar',
            pathMatch: 'full'
          }
        ]
      },

      {
        path: 'job-management',
        children: [
          { path: '', redirectTo: 'job-grade', pathMatch: 'full' },
          {
            path: 'job-grade',
            loadComponent: () => import('./demo/job-grade/job-grade.component').then((c) => c.JobGradeComponent)
          },
          {
            path: 'job-position',
            loadComponent: () => import('./demo/job-position/job-position.component').then((c) => c.JobPositionComponent)
          },
          {
            path: 'department',
            loadComponent: () => import('./demo/department/department.component').then((c) => c.DepartmentComponent)
          }
        ]
      },
      // Keep the old routes for backward compatibility
      {
        path: 'job-position',
        redirectTo: 'job-management/job-position',
        pathMatch: 'full'
      },
      {
        path: 'job-grade',
        redirectTo: 'job-management/job-grade',
        pathMatch: 'full'
      },
       {
        path: 'emp-training',
        loadComponent: () => import('./demo/Training Management/emp-training/emp-training.component').then((c) => c.EmpTrainingComponent)
      },
      {
        path: 'emp-categories',
        loadComponent: () => import('./demo/Training Management/emp-categories/emp-categories.component').then((c) => c.EmpCategoriesComponent)
      },
      {
        path: 'emp-nominations',
        loadComponent: () => import('./demo/Training Management/emp-nominations/emp-nominations.component').then((c) => c.EmpNominationsComponent)
      },
      {
        path: 'emp-transfer',
        loadComponent: () => import('./demo/emp-transfer/emp-transfer.component').then((c) => c.EmpTransferComponent)
      },
      {
        path: 'emp-separation',
        loadComponent: () => import('./demo/emp-separation/emp-separation.component').then((c) => c.EmpSeparationComponent)
      }

    ]
  },
  {
    path: '',
    component: GuestComponent,
    children: [
      {
        path: 'guest',
        loadChildren: () => import('./demo/pages/authentication/authentication.module').then((m) => m.AuthenticationModule)
      }
    ]
  },
  {
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'balanceleave',
        loadComponent: () => import('./demo/Leave/balanceleave/balanceleave.component').then((c) => c.BalanceleaveComponent)
      },
      {
        path: 'leave-form',
        loadComponent: () => import('./demo/Leave/leave-form/leave-form.component').then((c) => c.LeaveFormComponent)
      },
      {
        path: 'balanceleave/:id',
        loadComponent: () => import('./demo/Leave/balanceleave/balanceleave.component').then((c) => c.BalanceleaveComponent)
      }
    ]
  },
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
