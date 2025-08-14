import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';

@Component({
    standalone:true,
    imports:[CommonModule],
  selector: 'app-pay-roll-detail',
  templateUrl: './pay-roll-detail.component.html',
  styleUrls: ['./pay-roll-detail.component.scss']
})
export class PayRollDetailComponent implements OnInit {
  employeeId: string | null = null;
  salaryDetails: any[] = [];
  employeeInfo: any = {
    name: '',
    empCode: '',
    department: ''
  };
  isLoading: boolean = true;
  errorMessage: string | null = null; // Add this line

  // Add these arrays for type classification
  earningCodes = ['BASIC', 'HRA', 'DA', 'TA'];
  deductionCodes = ['PF', 'TDS', 'GIS', 'GPF'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    this.employeeId = params.get('id');
    console.log('Received employeeId:', this.employeeId); // Debug log
    
    if (!this.employeeId) {
      console.error('No employee ID found in route parameters');
      this.errorMessage = 'Employee information could not be loaded';
      this.isLoading = false;
      setTimeout(() => this.router.navigate(['/pay-roll']), 3000);
      return;
    }

    this.loadSalaryDetails();
  });
}

loadSalaryDetails(): void {
  if (!this.employeeId) {
    this.errorMessage = 'Invalid employee ID';
    this.isLoading = false;
    return;
  }

  this.isLoading = true;
  this.errorMessage = null;
  const url = `${environment.payrollApiUrl}/api/payRoll/salary-details/${this.employeeId}`;
  
   this.http.get<any[]>(url).subscribe({
    next: (data) => {
      console.log('Full API Response:', data);  // 👈 Add this debug log
      this.salaryDetails = data;
      
      if (data.length > 0) {
        console.log('First Employee Data:', data[0]);  // 👈 Detailed log
        this.employeeInfo = {
          name: `${data[0].firstName || ''} ${data[0].lastName || ''}`.trim(),
          empCode: data[0].empCode || 'N/A',
          department: data[0].departmentName || 
                     data[0].department || 
                     data[0].deptName || 
                     data[0].dept || 
                     'N/A'
        };
      }
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Error loading salary details:', err);
      this.errorMessage = 'Failed to load salary details. Please try again later.';
      this.isLoading = false;
    }
  });
}
  // Helper methods
  isEarning(componentCode: string): boolean {
    return this.earningCodes.includes(componentCode);
  }

  isDeduction(componentCode: string): boolean {
    return this.deductionCodes.includes(componentCode);
  }

  getTotalEarnings(): number {
    return this.salaryDetails
      .filter(d => this.isEarning(d.componentCode))
      .reduce((sum, d) => sum + (d.componentValue || 0), 0);
  }

  getTotalDeductions(): number {
    return this.salaryDetails
      .filter(d => this.isDeduction(d.componentCode))
      .reduce((sum, d) => sum + (d.componentValue || 0), 0);
  }

  getNetSalary(): number {
    return this.getTotalEarnings() - this.getTotalDeductions();
  }
}