import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Import standalone components
import { EmployeeDetailComponent } from './emp-details/emp-det.component';
import { EmployeeViewComponent } from './emp-view/emp-view-detail.component';

// Import Angular modules
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbNavModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeRoutingModule } from './employee-routing.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    NgbNavModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    EmployeeRoutingModule,
    // Import standalone components
    EmployeeDetailComponent,
    EmployeeViewComponent
  ]
})
export class EmployeeModule { }
