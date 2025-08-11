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
    path: 'view-employee',
    component: ViewEmployeeComponent,
    data: { title: 'View Employee' }
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
