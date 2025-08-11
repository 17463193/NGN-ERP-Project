import { Component, OnInit, TemplateRef, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { forkJoin, of, Subject, Subscription, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { SeparationService, Separation, SeparationRequest, Employee, SeparationType } from '../../../services/seperation.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-emp-separation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule
  ],
  templateUrl: './emp-separation.component.html',
  styleUrls: ['./emp-separation.component.scss']
})
export class EmpSeparationComponent implements OnInit, OnDestroy {
  separations: Separation[] = [];
  filteredSeparations: Separation[] = [];
  separationTypes: SeparationType[] = [];
  currentSeparation: Separation | null = null;
  isLoading = false;
  employeeMap: { [key: string]: Employee } = {};
  
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  isLoadingEmployees = false;
  employeeSearchTerm = '';
  selectedEmployee: Employee | null = null;
  showEmployeeDropdown = false;
  employeeSearchSubject = new Subject<string>();
  selectedEmployeeIndex = -1;
  
  currentUserEmployee: Employee | null = null;
  
  form: FormGroup;
  isEditMode = false;
  
  searchQuery = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  errorMessage = '';
  
  @ViewChild('separationModal', { static: true }) separationModalTemplate!: TemplateRef<any>;
  @ViewChild('viewSeparationModal', { static: true }) viewSeparationModalTemplate!: TemplateRef<any>;
  private modalRef: any;

  private destroy$ = new Subject<void>();
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private modalService: NgbModal,
    private separationService: SeparationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      empId: ['', Validators.required],
      empName: ['', Validators.required],
      separationTypeId: ['', Validators.required],
      lastWorkingDate: ['', Validators.required],
      noticePeriodServed: [0, [Validators.required, Validators.min(0)]],
      separationReason: ['', Validators.required],
      resignationLetterPath: [''],
      rehireEligible: [false],
      rehireNotes: ['']
    });
  }

  get paginatedSeparations(): Separation[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSeparations.slice(startIndex, startIndex + this.itemsPerPage);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupEmployeeSearch();
    this.loadCurrentUserEmployee();
    this.loadSeparations();
    this.loadSeparationTypes();
    this.setupClickOutsideHandler();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.employee-search-container')) {
      this.showEmployeeDropdown = false;
      this.selectedEmployeeIndex = -1;
    }
  };

  private setupClickOutsideHandler(): void {
    document.addEventListener('click', this.handleDocumentClick);
  }

  private setupEmployeeSearch(): void {
    const searchSub = this.employeeSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        if (!searchTerm || searchTerm.trim().length < 2) {
          this.isLoadingEmployees = false;
          this.filteredEmployees = [];
          return of([]);
        }
        
        this.isLoadingEmployees = true;
        return this.separationService.getAllEmployees().pipe(
          catchError(error => {
            console.error('Error searching employees:', error);
            this.isLoadingEmployees = false;
            return of([]);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(employees => {
      if (this.employeeSearchTerm && this.employeeSearchTerm.trim().length >= 2) {
        const searchTerm = this.employeeSearchTerm.toLowerCase();
        this.filteredEmployees = employees.filter(emp => 
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm) ||
          emp.empCode.toLowerCase().includes(searchTerm) ||
          emp.empId.toLowerCase().includes(searchTerm)
        );
      } else {
        this.filteredEmployees = employees;
      }
      
      this.isLoadingEmployees = false;
      this.selectedEmployeeIndex = -1;
    });
    
    this.subscriptions.push(searchSub);
  }

  onEmployeeSearch(event: any): void {
    const searchTerm = event?.target?.value || '';
    this.employeeSearchTerm = searchTerm;
    this.showEmployeeDropdown = true;
    this.selectedEmployeeIndex = -1;
    
    if (this.selectedEmployee) {
      const selectedName = `${this.selectedEmployee.firstName} ${this.selectedEmployee.lastName}`;
      if (searchTerm !== selectedName && searchTerm !== this.selectedEmployee.empCode) {
        this.clearEmployeeSelection();
      }
    }
    
    this.employeeSearchSubject.next(searchTerm);
  }

  onEmployeeKeydown(event: KeyboardEvent): void {
    if (!this.showEmployeeDropdown || this.filteredEmployees.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedEmployeeIndex = Math.min(this.selectedEmployeeIndex + 1, this.filteredEmployees.length - 1);
        this.scrollToSelectedEmployee();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.selectedEmployeeIndex = Math.max(this.selectedEmployeeIndex - 1, -1);
        this.scrollToSelectedEmployee();
        break;
        
      case 'Enter':
        event.preventDefault();
        if (this.selectedEmployeeIndex >= 0 && this.selectedEmployeeIndex < this.filteredEmployees.length) {
          this.selectEmployee(this.filteredEmployees[this.selectedEmployeeIndex]);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.showEmployeeDropdown = false;
        this.selectedEmployeeIndex = -1;
        break;
    }
  }

  private scrollToSelectedEmployee(): void {
    setTimeout(() => {
      const selectedElement = document.getElementById(`employee-option-${this.selectedEmployeeIndex}`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  selectEmployee(employee: Employee): void {
    if (!employee) {
      console.error('No employee data found');
      return;
    }
    
    this.selectedEmployee = employee;
    const firstName = employee.firstName || '';
    const lastName = employee.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Employee';
    const empId = employee.empId || '';
    
    this.employeeSearchTerm = fullName;
    
    this.form.patchValue({
      empId: empId,
      empName: fullName
    }, { emitEvent: false });
    
    this.form.get('empId')?.markAsTouched();
    this.form.get('empName')?.markAsTouched();
    this.form.get('empId')?.updateValueAndValidity();
    this.form.get('empName')?.updateValueAndValidity();
    
    this.showEmployeeDropdown = false;
    this.selectedEmployeeIndex = -1;
    
    setTimeout(() => {
      const nextField = document.getElementById('separationTypeId');
      if (nextField) {
        nextField.focus();
      }
    }, 100);
  }
  
  clearEmployeeSelection(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    this.selectedEmployee = null;
    this.employeeSearchTerm = '';
    this.filteredEmployees = [];
    this.selectedEmployeeIndex = -1;
    
    this.form.patchValue({
      empId: '',
      empName: ''
    }, { emitEvent: false });
    
    this.form.get('empId')?.markAsTouched();
    this.form.get('empName')?.markAsTouched();
    this.form.get('empId')?.updateValueAndValidity();
    this.form.get('empName')?.updateValueAndValidity();
    
    setTimeout(() => {
      const input = document.getElementById('empName') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  onEmployeeFocus(): void {
    this.showEmployeeDropdown = true;
    if (this.employeeSearchTerm.length >= 2) {
      this.employeeSearchSubject.next(this.employeeSearchTerm);
    }
  }

  getCurrentUserDisplayName(): string {
    if (this.currentUserEmployee) {
      return `${this.currentUserEmployee.firstName} ${this.currentUserEmployee.lastName}`;
    }
    return this.authService.currentUserValue?.username || 'Current User';
  }

  getCurrentUserEmpId(): string {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.empId || 'system';
  }

  loadCurrentUserEmployee(): void {
  try {
    const currentUser = this.authService.currentUserValue;
    
    if (!currentUser) {
      console.warn('No user is currently logged in');
      this.router.navigate(['/auth/login']);
      return;
    }
    
    console.log('Loading employee data for user:', currentUser.username);
    
    const userSub = this.separationService.getCurrentUserEmployee().subscribe({
      next: (employee) => {
        if (employee) {
          console.log('Successfully loaded employee data:', employee);
          this.currentUserEmployee = employee;
          
          if (!this.employees.length) {
            this.loadEmployeeNames();
          }
        }
      },
      error: (error) => {
        // Skip showing error for permission issues (403)
        if (error.status !== 403) {
          console.error('Error loading current user employee:', error);
          
          let errorMessage = 'Failed to load your employee information';
          
          if (error.status === 404) {
            errorMessage = 'Your employee record could not be found. Please contact HR.';
          } else if (error.status === 401) {
            errorMessage = 'Your session has expired. Redirecting to login...';
            setTimeout(() => this.router.navigate(['/auth/login']), 2000);
          }
          
          this.showError(errorMessage);
        }
        
        // Continue with functionality even if employee data couldn't be loaded
        if (currentUser.username) {
          console.warn('Proceeding - employee record may not be accessible');
        } else {
          this.router.navigate(['/auth/login']);
        }
      }
    });
    
    this.subscriptions.push(userSub);
  } catch (error) {
    console.error('Unexpected error in loadCurrentUserEmployee:', error);
    // Continue without showing error
    if (this.authService.currentUserValue?.username) {
      console.warn('Continuing despite error');
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
}
  private initializeForm(): void {
    this.form = this.fb.group({
      empId: ['', Validators.required],
      empName: ['', Validators.required],
      separationTypeId: [
        { value: '', disabled: this.separationTypes.length === 0 },
        Validators.required
      ],
      lastWorkingDate: ['', Validators.required],
      noticePeriodServed: [0, [Validators.required, Validators.min(0)]],
      separationReason: ['', Validators.required],
      resignationLetterPath: [''],
      rehireEligible: [false],
      rehireNotes: ['']
    });

    // Update disabled state based on separationTypes array
    const control = this.form.get('separationTypeId');
    if (this.separationTypes.length === 0) {
      control?.disable();
    } else {
      control?.enable();
    }
  }

  private showError(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonColor: '#3f51b5',
    });
  }

  private loadSeparations(): void {
    this.isLoading = true;
    const separationsSub = this.separationService.getSeparations()
      .subscribe({
        next: (separations: Separation[]) => {
          this.separations = separations;
          this.filteredSeparations = [...this.separations];
          this.totalPages = Math.ceil(this.separations.length / this.itemsPerPage);
          this.loadEmployeeNames();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading separations:', error);
          this.showError('Failed to load separations. Please try again.');
          this.isLoading = false;
        }
      });
    
    this.subscriptions.push(separationsSub);
  }

  private isValidEmployeeId(id: string | null | undefined): boolean {
    if (!id) return false;
    const lowerId = id.toLowerCase();
    return !(lowerId.includes('system') || id.length < 4);
  }

  private createUnknownEmployee(id: string): any {
    return {
      id: id,
      firstName: 'Unknown',
      lastName: 'Employee',
      department: 'N/A',
      position: 'N/A'
    };
  }

  private loadEmployeeNames(): void {
    try {
      // Get all unique IDs from the separations
      const allIds = [
        ...this.separations.map(s => s.employeeId),
        ...this.separations.map(s => s.initiatedBy).filter(Boolean),
        ...this.separations.map(s => s.approvedBy).filter(Boolean)
      ];

      // Filter out invalid and duplicate IDs
      const validUniqueIds = [...new Set(allIds.filter(id => this.isValidEmployeeId(id)))];
      
      // For invalid IDs, create unknown employee entries
      allIds.filter(id => !validUniqueIds.includes(id) && id).forEach(invalidId => {
        this.employeeMap[invalidId] = this.createUnknownEmployee(invalidId);
      });

      if (validUniqueIds.length === 0) {
        this.updateSeparationData();
        return;
      }

      // Create requests only for valid IDs
      const employeeRequests = validUniqueIds.map(empId => 
        this.separationService.getEmployeeById(empId).pipe(
          catchError(error => {
            console.warn(`Failed to load employee ${empId}:`, error);
            // Return a minimal employee object to prevent UI breakage
            return of(this.createUnknownEmployee(empId));
          })
        )
      );

      const employeeNamesSub = forkJoin(employeeRequests).subscribe({
        next: (employees) => {
          employees.forEach((employee, index) => {
            const empId = validUniqueIds[index];
            if (employee) {
              this.employeeMap[empId] = employee;
            }
          });
          this.updateSeparationData();
        },
        error: (error) => {
          console.error('Error loading employee data:', error);
          this.updateSeparationData();
        }
      });
      
      this.subscriptions.push(employeeNamesSub);
    } catch (error) {
      console.error('Unexpected error in loadEmployeeNames:', error);
      this.updateSeparationData();
    }
  }

  private updateSeparationData(): void {
    this.separations.forEach(separation => {
      const employee = this.employeeMap[separation.employeeId] || this.createUnknownEmployee(separation.employeeId);
      separation.employeeName = `${employee.firstName} ${employee.lastName}`.trim();
      separation.department = employee.department || 'N/A';
      separation.position = employee.position || 'N/A';
      
      if (separation.initiatedBy) {
        const initiator = this.employeeMap[separation.initiatedBy] || this.createUnknownEmployee(separation.initiatedBy);
        separation.initiatedByName = `${initiator.firstName} ${initiator.lastName}`.trim();
      }
      
      if (separation.approvedBy) {
        const approver = this.employeeMap[separation.approvedBy] || this.createUnknownEmployee(separation.approvedBy);
        separation.approvedByName = `${approver.firstName} ${approver.lastName}`.trim();
      }
    });
    
    this.filteredSeparations = [...this.separations];
    this.cdr.detectChanges();
  }

  private loadSeparationTypes(): void {
    this.isLoading = true;
    
    const typesSub = this.separationService.getSeparationTypes().subscribe({
      next: (types) => {
        this.separationTypes = types || [];
        this.isLoading = false;
        
        if (this.form && this.form.get('separationTypeId')?.value) {
          const selectedType = this.separationTypes.find(
            t => t.separationTypeId === this.form.get('separationTypeId')?.value
          );
          
          if (!selectedType) {
            this.form.get('separationTypeId')?.setValue('');
          }
        }
      },
      error: (error) => {
        console.error('Error loading separation types:', error);
        this.isLoading = false;
        this.separationTypes = [];
        this.showError('Failed to load separation types');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(typesSub);
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentSeparation = null;
    this.selectedEmployee = null;
    this.employeeSearchTerm = '';
    this.showEmployeeDropdown = false;
    this.filteredEmployees = [];
    this.selectedEmployeeIndex = -1;
    this.initializeForm();
    
    this.form.enable();
    
    this.modalRef = this.modalService.open(this.separationModalTemplate, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });

    setTimeout(() => {
      const empNameInput = document.getElementById('empName') as HTMLInputElement;
      if (empNameInput) {
        empNameInput.focus();
      }
    }, 300);
  }

  openViewModal(separation: Separation): void {
    this.currentSeparation = separation;
    this.modalRef = this.modalService.open(this.viewSeparationModalTemplate, {
      size: 'lg',
      backdrop: 'static'
    });
  }

  openEditModal(separation: Separation): void {
    this.isEditMode = true;
    this.currentSeparation = separation;
    console.log('Edit functionality not implemented yet');
  }

  exportSeparations(): void {
    try {
      const csvContent = this.convertToCSV(this.filteredSeparations);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `separations_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Swal.fire({
        icon: 'success',
        title: 'Export Successful',
        text: 'Separations data has been exported successfully.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error exporting separations:', error);
      this.showError('Failed to export separations data.');
    }
  }

  private convertToCSV(data: Separation[]): string {
    const headers = [
      'Employee ID',
      'Employee Name', 
      'Separation Type',
      'Separation Reason',
      'Initiation Date',
      'Last Working Date',
      'Notice Period (Days)',
      'Status',
      'Initiated By',
      'Rehire Eligible'
    ];

    const csvRows = [headers.join(',')];

    data.forEach(separation => {
      const row = [
        separation.employeeId,
        `"${separation.employeeName || 'N/A'}"`,
        `"${this.getSeparationTypeName(separation.separationType)}"`,
        `"${(separation.separationReason || 'N/A').replace(/"/g, '""')}"`,
        separation.initiationDate,
        separation.lastWorkingDate,
        separation.noticePeriodServed,
        separation.status,
        `"${separation.initiatedByName || 'N/A'}"`,
        separation.rehireEligible ? 'Yes' : 'No'
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  applySearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredSeparations = [...this.separations];
    } else {
      const query = this.searchQuery.toLowerCase().trim();
      this.filteredSeparations = this.separations.filter(separation => 
        separation.employeeName?.toLowerCase().includes(query) ||
        separation.employeeId.toLowerCase().includes(query) ||
        separation.separationReason?.toLowerCase().includes(query) ||
        this.getSeparationTypeName(separation.separationType).toLowerCase().includes(query)
      );
    }
    
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredSeparations.length / this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getSeparationTypeName(separationType: SeparationType): string {
    return separationType?.separationName || 'N/A';
  }

  getStatusBadgeClass(status: string | undefined): string {
    if (!status) return 'bg-secondary';
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-warning text-dark';
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-danger';
      case 'completed': return 'bg-primary';
      default: return 'bg-secondary';
    }
  }

  getClearanceStatusBadgeClass(status: string | undefined): string {
    if (!status) return 'bg-secondary';
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-warning text-dark';
      case 'in progress': return 'bg-info';
      case 'completed': return 'bg-success';
      default: return 'bg-secondary';
    }
  }



  saveSeparation(): void {
    if (this.form.invalid) {
      // ... existing validation code ...
      return;
    }
  
    this.isLoading = true;
    const formValue = this.form.getRawValue();
    
    // Get current user
    const currentUser = this.authService.currentUserValue;
    if (!currentUser?.userId) {  // Use userId instead of empId
      this.isLoading = false;
      Swal.fire({
        title: 'Error!',
        text: 'Unable to determine current user. Please log in again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    // Prepare separation data with initiatedBy field
    const separationData: SeparationRequest = {
      empId: formValue.empId,  // This should be the selected employee's empId
      separationTypeId: formValue.separationTypeId,
      initiatedBy: currentUser.userId,  // Use userId for initiatedBy
      lastWorkingDate: formValue.lastWorkingDate,
      noticePeriodServed: Number(formValue.noticePeriodServed) || 0,
      separationReason: formValue.separationReason,
      resignationLetterPath: formValue.resignationLetterPath || '',
      rehireEligible: Boolean(formValue.rehireEligible),
      rehireNotes: formValue.rehireNotes || ''
    };
  

    // Show confirmation dialog before saving
    Swal.fire({
      title: 'Confirm Submission',
      text: 'Are you sure you want to submit this separation request?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, submit it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.processSeparation(separationData);
      } else {
        this.isLoading = false;
      }
    });
  }

  private processSeparation(separationData: SeparationRequest): void {
    const saveOperation = this.separationService.createSeparation(separationData);

    saveOperation.pipe(
      catchError((error: any) => {
        this.isLoading = false;
        console.error('Error in save operation:', error);
        
        // Handle specific error cases
        let errorMessage = 'An unexpected error occurred. Please try again.';
        
        if (error.status === 401 || error.status === 403) {
          errorMessage = 'Your session has expired. Please log in again.';
          // Optionally redirect to login
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Invalid data. Please check your inputs.';
        } else if (error.status === 409) {
          errorMessage = 'A separation request already exists for this employee.';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.modalService.dismissAll();
        this.loadSeparations();
        
        // Show success message
        Swal.fire({
          title: 'Success!',
          text: 'Separation created successfully.',
          icon: 'success',
          confirmButtonText: 'OK'
        }).then(() => {
          // Reset form after successful submission
          this.form.reset({
            noticePeriodServed: 0,
            rehireEligible: false
          });
          this.selectedEmployee = null;
        });
      },
      error: (error) => {
        this.isLoading = false;
        
        // Show error message
        Swal.fire({
          title: 'Error',
          text: 'Failed to process separation request. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.empId;
  }

  // Helper methods for displaying names in the UI
  getEmployeeNameById(empId: string): string {
    if (!this.employees) return 'Unknown';
    const employee = this.employees.find(emp => emp.empId === empId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  }

  getInitiatorName(separation: Separation): string {
    if (!separation) return 'Unknown';
    return this.getEmployeeNameById(separation.initiatedBy);
  }

  getApproverName(separation: Separation): string {
    if (!separation || !separation.approvedBy) return 'N/A';
    if (separation.approvedByName) {
      return separation.approvedByName;
    }
    return this.getEmployeeNameById(separation.approvedBy);
  }
}