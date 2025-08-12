import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewEmployeeComponent } from './view-employee/view-employee.component';

const routes: Routes = [
  {
    path: 'employees',
    component: ViewEmployeeComponent,
    data: { title: 'Employee Directory' }
  },
  {
    path: 'employees/:empId',
    component: ViewEmployeeComponent,
    data: { title: 'View Employee Details' }
  },
  {
    path: 'view-employee',
    redirectTo: 'employees',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'employees',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
