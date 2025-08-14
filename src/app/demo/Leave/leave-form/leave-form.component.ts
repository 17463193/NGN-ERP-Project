import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { LeaveService } from '../../../services/leave.service';
import { EmployeeTransferService } from '../../../services/employee-transfer.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-leave-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-form.component.html',
  styleUrls: ['./leave-form.component.scss']
})
export class LeaveFormComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<boolean>();
  
  leaveForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  today = new Date().toISOString().split('T')[0];
  
  leaveTypes: { id: string; name: string }[] = [];

  constructor(
    private fb: FormBuilder, 
    private leaveService: LeaveService,
    private employeeTransferService: EmployeeTransferService,
    private authService: AuthService,
    private router: Router
  ) {
    this.leaveForm = this.fb.group({
      cid: [{value: '', disabled: true}, [Validators.required]],
      leaveTypeId: ['', [Validators.required]],
      leaveName: ['', [Validators.required]],
      fromDate: ['', [Validators.required]],
      toDate: ['', [Validators.required]],
      reason: ['', [Validators.required, Validators.minLength(10)]],
      medicalCertificateAttached: [false],
      handoverDetails: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.fetchEmployeeCid();
    this.fetchLeaveTypes();
  }

  private fetchEmployeeCid(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser && currentUser.empId) {
      this.employeeTransferService.getEmployeeProfile(currentUser.empId).subscribe({
        next: (profile) => {
          if (profile.cidNumber) {
            this.leaveForm.patchValue({ cid: profile.cidNumber });
          } else {
            this.errorMessage = 'Could not retrieve your CID. Please contact HR.';
          }
        },
        error: (error) => {
          console.error('Error fetching employee profile:', error);
          this.errorMessage = 'Failed to load your profile. Please try again later.';
        }
      });
    } else {
      this.errorMessage = 'User not authenticated. Please log in again.';
    }
  }
  

  async onSubmit() {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Get the raw form value including disabled fields
    const formValue = {
      ...this.leaveForm.getRawValue(), // This includes disabled fields
      fromDate: this.formatDate(this.leaveForm.get('fromDate')?.value),
      toDate: this.formatDate(this.leaveForm.get('toDate')?.value)
    };

    // Prepare the form data with all required fields
    const formData = {
      cid: formValue.cid,
      leaveTypeId: formValue.leaveTypeId,
      leaveName: formValue.leaveName,
      fromDate: formValue.fromDate,
      toDate: formValue.toDate,
      reason: formValue.reason,
      medicalCertificateAttached: formValue.medicalCertificateAttached,
      handoverDetails: formValue.handoverDetails
    };

    try {
      const result = await this.leaveService.requestLeave(formData)
        .pipe(finalize(() => this.isLoading = false))
        .toPromise();

      await Swal.fire({
        title: 'Success!',
        text: 'Your leave request has been submitted successfully.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        customClass: {
          confirmButton: 'swal-confirm-btn'
        }
      });
      
      this.submitted.emit(true);
      this.closeForm();
    } catch (error: any) {
      let errorMessage = 'Failed to submit leave request. Please try again.';
      
      if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error.status === 400) {
        errorMessage = error.error?.message || 'Invalid request. Please check your input and try again.';
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.status === 404) {
        errorMessage = 'The requested resource was not found. Please contact support.';
      } else if (error.status >= 500) {
        errorMessage = 'A server error occurred. Please try again later or contact support.';
      } else {
        errorMessage = error.error?.message || errorMessage;
      }
      
      this.errorMessage = errorMessage;
      
      await Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33',
        customClass: {
          confirmButton: 'swal-confirm-btn'
        }
      });
    }
  }

  closeForm() {
    this.close.emit();
  }

  onLeaveTypeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedId = selectElement.value;
    const selectedType = this.leaveTypes.find(type => type.id === selectedId);
    if (selectedType) {
      this.leaveForm.patchValue({
        leaveName: selectedType.name
      });
    }
  }

  private fetchLeaveTypes(): void {
    this.isLoading = true;
    this.leaveService.getAllLeaveTypes()
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          if (response && Array.isArray(response) && response.length > 0) {
            this.leaveTypes = response;
            const defaultLeave = this.leaveTypes[0];
            this.leaveForm.patchValue({
              leaveTypeId: defaultLeave.id,
              leaveName: defaultLeave.name
            });
          } else {
            this.leaveTypes = [];
            this.errorMessage = 'No leave types available. Please contact support.';
          }
        },
        error: (error) => {
          this.errorMessage = 'Failed to load leave types. Please try again later.';
          this.leaveTypes = [];
        }
      });
  }

  navigateBack() {
    document.body.style.overflow = 'auto';
    
    if (this.close.observers.length > 0) {
      this.close.emit();
    } else {
      this.router.navigate(['/elmr']).then(() => {
        window.scrollTo(0, 0);
      }).catch(error => {
      });
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }
}
