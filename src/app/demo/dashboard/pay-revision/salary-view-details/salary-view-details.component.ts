import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { catchError, finalize, tap, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, FormsModule } from '@angular/forms';
import * as bootstrap from 'bootstrap';

interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  calculationType: 'fixed' | 'percentage';
  formula?: string;
}

interface SalaryRevision {
  revisionId: string;
  employeeId: string;
  empCode: string;
  firstName: string;
  lastName: string;
  componentId: string;
  componentName: string;
  componentCode: string;
  revisionType: string;
  oldAmount: number;
  newAmount: number;
  percentageIncrease: number;
  effectiveDate: string;
  revisionReason: string;
  rejectionReason: string | null;
  status: string;
  communicationStatus: string;
  createdDate: string;
  modifiedDate: string;
}

interface SalaryDetail {
  empCode: string;
  componentValue: number;
  componentCode: string;
  salaryDetailId: string;
  lastName: string;
  firstName: string;
  componentName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
}

interface EmployeeData {
  firstName: string;
  lastName: string;
  empCode: string;
}

@Component({
  selector: 'app-salary-view-details',
  standalone: true,
  templateUrl: './salary-view-details.component.html',
  styleUrls: ['./salary-view-details.component.scss'],
  imports: [CommonModule, ReactiveFormsModule,FormsModule]
})
export class SalaryViewDetailsComponent implements OnInit {
  employeeId: string = '';
  employeeData: EmployeeData | null = null;
  salaryDetails: SalaryDetail[] = [];
  salaryRevisions: SalaryRevision[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  showRevisionForm: boolean = false;
  revisionForm: FormGroup;
  isSubmitting: boolean = false;
  formSubmitted: boolean = false;
  approvedRevisions: SalaryRevision[] = [];
  rejectedRevisions: SalaryRevision[] = [];
  basicSalary: number = 0;
  totalSalary: number = 0;
  hasSalaryData: boolean = false;
  selectedRevision: SalaryRevision | null = null;
  rejectionReason: string = '';
  isProcessing: boolean = false;
  

  salaryComponents: SalaryComponent[] = [
    { id: '1', name: 'Basic Salary', code: 'BASIC', calculationType: 'fixed' },
    { id: '2', name: 'Provident Fund', code: 'PF', calculationType: 'percentage', formula: 'BASIC*0.12' },
    { id: '3', name: 'House Rent Allowance', code: 'HRA', calculationType: 'percentage', formula: 'BASIC*0.4' },
    { id: '4', name: 'Medical Allowance', code: 'MA', calculationType: 'fixed' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.revisionForm = this.fb.group({
      revisions: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      tap(() => this.resetComponentState()),
      switchMap(params => {
        const empId = params.get('empId');
        if (!empId) {
          this.errorMessage = 'No employee ID provided';
          return of(null);
        }
        this.employeeId = empId;
        return this.loadEmployeeData().pipe(
          switchMap(() => this.loadSalaryDetails()),
          switchMap(() => this.loadSalaryRevisions())
        );
      })
    ).subscribe();
  }

  private resetComponentState(): void {
    this.employeeData = null;
    this.salaryDetails = [];
    this.salaryRevisions = [];
    this.approvedRevisions = [];
    this.rejectedRevisions = [];
    this.basicSalary = 0;
    this.totalSalary = 0;
    this.hasSalaryData = false;
    this.errorMessage = null;
    this.showRevisionForm = false;
    this.formSubmitted = false;
    this.selectedRevision = null;
    this.rejectionReason = '';
    if (this.revisionForm) {
      this.revisionForm.reset();
      const revisions = this.revisionForm.get('revisions') as FormArray;
      if (revisions) {
        while (revisions.length) {
          revisions.removeAt(0);
        }
      }
    }
  }

  private loadEmployeeData() {
    return this.http.get<any>(`${environment.apiUrl}/api/v1/employees/${this.employeeId}`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(employee => {
        this.employeeData = {
          firstName: employee?.firstName || employee?.data?.firstName || employee?.employee?.firstName || 'N/A',
          lastName: employee?.lastName || employee?.data?.lastName || employee?.employee?.lastName || 'N/A',
          empCode: employee?.empCode || employee?.data?.empCode || employee?.employee?.empCode || 'N/A'
        };
      }),
      catchError(err => {
        console.error('Error loading employee data:', err);
        this.errorMessage = 'Failed to load employee data';
        return of(null);
      })
    );
  }

  private loadSalaryDetails() {
    this.isLoading = true;
    return this.http.get<SalaryDetail[]>(`${environment.payrollApiUrl}/api/payRoll/salary-details/${this.employeeId}`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(details => {
        this.salaryDetails = details;
        this.calculateSalaryValues();
        this.hasSalaryData = this.salaryDetails.length > 0;
      }),
      catchError(err => {
        console.error('Error loading salary details:', err);
        this.errorMessage = 'Failed to load salary details';
        return of(null);
      }),
      finalize(() => this.isLoading = false)
    );
  }

  private loadSalaryRevisions() {
    this.isLoading = true;
    const timestamp = new Date().getTime();
    const url = `${environment.payrollApiUrl}/api/payRoll/salary-revisions?employeeId=${this.employeeId}&t=${timestamp}`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      tap(response => {
        this.processSalaryRevisionsResponse(response);
      }),
      catchError(err => {
        console.error('Error loading salary revisions:', err);
        this.errorMessage = 'Failed to load salary revisions';
        return of(null);
      }),
      finalize(() => this.isLoading = false)
    );
  }

private calculateSalaryValues(): void {
  // Basic salary should always be the BASIC component value
  const basicSalaryDetail = this.salaryDetails.find(d => d.componentCode === 'BASIC');
  this.basicSalary = basicSalaryDetail ? basicSalaryDetail.componentValue : 0;
  
  // Revised salary should be the basic salary plus any approved revisions
  this.totalSalary = this.calculateTotalSalary();
}
calculateTotalSalary(): number {
  // Start with the sum of all current component values
  let total = this.salaryDetails.reduce((sum, detail) => sum + detail.componentValue, 0);

  // Add any approved revisions (only the difference between new and old amounts)
  this.approvedRevisions.forEach(rev => {
    // Find the current value of this component
    const currentComponent = this.salaryDetails.find(d => d.componentCode === rev.componentCode);
    const currentValue = currentComponent ? currentComponent.componentValue : 0;
    
    // Only add the difference if the revision amount is higher than current
    if (rev.newAmount > currentValue) {
      total += (rev.newAmount - currentValue);
    }
  });

  return total;
}

  private processSalaryRevisionsResponse(response: any): void {
    this.salaryRevisions = Array.isArray(response) ? response : (response.salaryRevisions || response.items || []);
    this.salaryRevisions = this.salaryRevisions.filter(rev => rev.employeeId === this.employeeId);
    this.approvedRevisions = this.salaryRevisions.filter(rev => rev.status === 'APPROVED');
    this.rejectedRevisions = this.salaryRevisions.filter(rev => rev.status === 'REJECTED');
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  get revisions(): FormArray {
    return this.revisionForm.get('revisions') as FormArray;
  }

  addNewRevision(): void {
    this.revisions.push(this.createRevisionFormGroup());
  }

  removeRevision(index: number): void {
    this.revisions.removeAt(index);
  }

  createRevisionFormGroup(): FormGroup {
    return this.fb.group({
      componentId: ['', Validators.required],
      componentName: ['', Validators.required],
      calculationType: ['fixed'],
      formula: [''],
      newAmount: [0, [Validators.required, Validators.min(0)]],
      revisionType: ['', Validators.required],
      effectiveDate: ['', Validators.required],
      revisionReason: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  toggleRevisionForm(): void {
    this.showRevisionForm = !this.showRevisionForm;
    if (this.showRevisionForm && this.revisions.length === 0) {
      this.addNewRevision();
    }
  }

  onComponentSelect(index: number): void {
    const componentId = this.revisions.at(index).get('componentId')?.value;
    const component = this.salaryComponents.find(c => c.id === componentId);
    
    if (component) {
      this.revisions.at(index).patchValue({
        componentName: component.name,
        calculationType: component.calculationType,
        formula: component.formula || ''
      });

      if (component.calculationType === 'percentage' && component.formula) {
        const amount = this.calculatePercentageAmount(component.formula);
        this.revisions.at(index).patchValue({
          newAmount: amount
        });
      }
    }
  }

  private calculatePercentageAmount(formula: string): number {
    if (formula.includes('BASIC')) {
      return this.basicSalary * parseFloat(formula.split('*')[1]);
    }
    return 0;
  }

submitRevisions(): void {
  this.formSubmitted = true;
  if (this.revisionForm.invalid) {
    return;
  }

  this.isSubmitting = true;
  const payload = this.revisions.value.map((rev: any) => {
    const component = this.salaryComponents.find(c => c.id === rev.componentId);
    const componentDetail = this.salaryDetails.find(d => d.componentCode === component?.code);
    
    return {
      employeeId: this.employeeId, // Add employee ID
      salaryDetailId: componentDetail?.salaryDetailId || '',
      componentId: rev.componentId, // Add component ID
      newAmount: rev.newAmount,
      revisionType: rev.revisionType,
      effectiveDate: rev.effectiveDate,
      revisionReason: rev.revisionReason,
      status: 'PENDING', // Explicitly set status
      communicationStatus: 'PENDING'
    };
  });

  this.http.post(`${environment.payrollApiUrl}/api/payRoll/revision`, payload, { 
    headers: this.getHeaders() 
  }).pipe(
    tap((response) => {
      console.log('Revision submitted successfully:', response);
      this.showRevisionForm = false;
      this.revisionForm.reset();
      this.loadSalaryRevisions().subscribe(); // Ensure subscription
    }),
    catchError(err => {
      console.error('Error submitting revisions:', err);
      this.errorMessage = err.error?.message || 'Failed to submit salary revisions';
      return of(null);
    }),
    finalize(() => {
      this.isSubmitting = false;
      this.formSubmitted = false;
    })
  ).subscribe();
}

  isControlInvalid(revision: FormGroup, controlName: string): boolean {
    const control = revision.get(controlName);
    return control ? (control.invalid && (control.dirty || control.touched || this.formSubmitted)) : false;
  }

  isPercentageCalculation(index: number): boolean {
    const revision = this.revisions.at(index);
    return revision.get('calculationType')?.value === 'percentage';
  }

  getCurrentAmount(index: number): number {
    const componentId = this.revisions.at(index).get('componentId')?.value;
    const component = this.salaryComponents.find(c => c.id === componentId);
    if (!component) return 0;
    
    const detail = this.salaryDetails.find(d => d.componentCode === component.code);
    return detail ? detail.componentValue : 0;
  }

  getRevisedSalary(): number {
  // Start with basic salary
  let revisedAmount = this.basicSalary;

  // Add all approved revisions for basic salary
  const basicRevisions = this.approvedRevisions
    .filter(rev => rev.componentCode === 'BASIC')
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

  if (basicRevisions.length > 0) {
    revisedAmount = basicRevisions[0].newAmount;
  }

  return revisedAmount;
}
getIncreasePercentage(): number {
  const revisedBasic = this.getRevisedSalary();
  if (this.basicSalary === 0) return 0;
  return ((revisedBasic - this.basicSalary) / this.basicSalary) * 100;
}
hasApprovedRevisions(): boolean {
  return this.approvedRevisions && this.approvedRevisions.length > 0;
}



  getCurrentComponentValue(componentCode: string): number {
    const detail = this.salaryDetails.find(d => d.componentCode === componentCode);
    return detail ? detail.componentValue : 0;
  }

  // Approve/Reject functionality
  approveRevision(revision: SalaryRevision): void {
    if (confirm(`Are you sure you want to approve this salary revision for ${revision.componentName}?`)) {
      this.updateRevisionStatus(revision.revisionId, 'APPROVED', '');
    }
  }

  openRejectModal(revision: SalaryRevision): void {
    this.selectedRevision = revision;
    this.rejectionReason = '';
    const modal = new bootstrap.Modal(document.getElementById('rejectReasonModal') as any);
    modal.show();
  }

  confirmReject(): void {
    if (!this.selectedRevision || !this.rejectionReason) return;

    this.isProcessing = true;
    this.updateRevisionStatus(this.selectedRevision.revisionId, 'REJECTED', this.rejectionReason);
  }

  private updateRevisionStatus(revisionId: string, status: 'APPROVED' | 'REJECTED', rejectionReason: string): void {
    const payload = [{
        revisionId: revisionId,
        status: status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null
    }];

    this.isProcessing = true;
    
    this.http.put(`${environment.payrollApiUrl}/api/payRoll/salary-revision/${this.employeeId}/status`, payload, {
        headers: this.getHeaders()
    }).pipe(
        tap(() => {
            // Update the local state immediately
            const revisionIndex = this.salaryRevisions.findIndex(rev => rev.revisionId === revisionId);
            if (revisionIndex !== -1) {
                // Update the revision status
                this.salaryRevisions[revisionIndex].status = status;
                this.salaryRevisions[revisionIndex].rejectionReason = rejectionReason;
                
                // Re-categorize the revisions
                this.approvedRevisions = this.salaryRevisions.filter(rev => rev.status === 'APPROVED');
                this.rejectedRevisions = this.salaryRevisions.filter(rev => rev.status === 'REJECTED');
                
                // Close the modal if it's open
                const modal = bootstrap.Modal.getInstance(document.getElementById('rejectReasonModal') as any);
                if (modal) modal.hide();
            }
        }),
        catchError(err => {
            console.error('Error updating revision status:', err);
            this.errorMessage = `Failed to ${status.toLowerCase()} revision`;
            return of(null);
        }),
        finalize(() => this.isProcessing = false)
    ).subscribe();
}

  goBack(): void {
    this.router.navigate(['/employee-salaries']);
  }
}