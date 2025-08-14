import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { ViewEmployeeComponent } from './view-employee/view-employee.component';
import { DashboardRoutingModule } from './dashboard-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    NgbDropdownModule,
    DashboardRoutingModule,
    ViewEmployeeComponent // Import standalone component here
  ]
})
export class DashboardModule { }
