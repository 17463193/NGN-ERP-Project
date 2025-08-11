import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { LeaveService } from '../../../services/leave.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-leave-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-form.component.html',
  styleUrls: ['./leave-form.component.scss']
})
export class LeaveFormComponent {
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
    private router: Router
  ) {
    this.leaveForm = this.fb.group({
      cid: ['', [Validators.required]],
      leaveTypeId: ['', [Validators.required]],
      leaveName: ['', [Validators.required]],
      fromDate: ['', [Validators.required]],
      toDate: ['', [Validators.required]],
      reason: ['', [Validators.required, Validators.minLength(10)]],
      medicalCertificateAttached: [false],
      handoverDetails: ['', [Validators.required]]
    });
    
    this.fetchLeaveTypes();
  }
  

  async onSubmit() {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

        const formData = {
      cid: this.leaveForm.value.cid,
      leaveTypeId: this.leaveForm.value.leaveTypeId, // Added missing leaveTypeId
      leaveName: this.leaveForm.value.leaveName,
      fromDate: this.formatDate(this.leaveForm.value.fromDate),
      toDate: this.formatDate(this.leaveForm.value.toDate),
      reason: this.leaveForm.value.reason,
      medicalCertificateAttached: this.leaveForm.value.medicalCertificateAttached,
      handoverDetails: this.leaveForm.value.handoverDetails
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
