import { Component, OnInit, TemplateRef, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of, Subject, Subscription, throwError } from 'rxjs';
import { tap, catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
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
  separationTypesMap: { [key: string]: SeparationType } = {};
  currentSeparation: Separation | null = null;
  currentUser: any = null;
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
  statusForm: FormGroup;

  statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Completed', label: 'Completed' }
  ];

  @ViewChild('separationModal', { static: true }) separationModalTemplate!: TemplateRef<any>;
  @ViewChild('viewSeparationModal', { static: true }) viewSeparationModalTemplate!: TemplateRef<any>;
  @ViewChild('statusModal', { static: true }) statusModalTemplate!: TemplateRef<any>;
  
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

    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      notes: ['']
    });
  }

  get paginatedSeparations(): Separation[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSeparations.slice(startIndex, startIndex + this.itemsPerPage);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadInitialData();
    this.setupEmployeeSearch();
    this.setupClickOutsideHandler();
    this.loadCurrentUserEmployee();
    
    // Get the current user value directly
    this.currentUser = this.authService.currentUserValue;
    
    // Subscribe to user changes using the user$ observable
    const userSub = this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
    
    this.subscriptions.push(userSub);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    document.removeEventListener('click', this.handleDocumentClick);
  }

  // Load initial data - separation types and separations
  private loadInitialData(): void {
    this.isLoading = true;
    
    // First load separation types, then separations
    const typesSub = this.separationService.getSeparationTypes().subscribe({
      next: (types) => {
        console.log('Loaded separation types:', types);
        this.separationTypes = types || [];
        this.separationTypesMap = {};
        types.forEach(type => {
          this.separationTypesMap[type.separationTypeId] = type;
        });
        
        // Now load separations
        this.loadSeparations();
      },
      error: (error) => {
        console.error('Error loading separation types:', error);
        this.showError('Failed to load separation types. Please try again.');
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(typesSub);
  }

  // Load separations
  private loadSeparations(): void {
    const separationsSub = this.separationService.getSeparations().subscribe({
      next: (separations) => {
        console.log('Loaded separations:', separations);
        
        // Store separations with properly mapped types
        this.separations = separations.map(sep => {
          // If the separation has a separationTypeId, use it to find the type
          if (sep.separationTypeId && this.separationTypesMap[sep.separationTypeId]) {
            sep.separationType = this.separationTypesMap[sep.separationTypeId];
            sep.separationTypeId = sep.separationTypeId;
          }
          // Otherwise, if separation type is missing or default, try to find it in our map
          else if (!sep.separationType || sep.separationType.separationTypeId === 'default') {
            if (sep.separationTypeId && this.separationTypesMap[sep.separationTypeId]) {
              sep.separationType = this.separationTypesMap[sep.separationTypeId];
            }
          }
          return sep;
        });
        
        this.filteredSeparations = [...this.separations];
        this.totalPages = Math.ceil(this.separations.length / this.itemsPerPage);
        
        // Load employee names for display
        this.loadEmployeeNames();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading separations:', error);
        this.showError('Failed to load separations. Please try again.');
        this.separations = [];
        this.filteredSeparations = [];
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(separationsSub);
  }

  // View reason in modal
  viewReason(reason: string): void {
    Swal.fire({
      title: 'Separation Reason',
      html: `<div class="text-start"><p>${reason || 'No reason provided'}</p></div>`,
      confirmButtonText: 'Close',
      width: '600px',
      customClass: {
        popup: 'text-start'
      }
    });
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
        const searchTerm = this.employeeSearchTerm.toLowerCase().trim();
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
    return currentUser?.empId || currentUser?.userId || 'system';
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
          console.warn('Could not load current user employee data:', error.message);
          if (currentUser.username) {
            console.log('Proceeding with basic user info');
          } else {
            this.router.navigate(['/auth/login']);
          }
        }
      });
      
      this.subscriptions.push(userSub);
    } catch (error) {
      console.error('Unexpected error in loadCurrentUserEmployee:', error);
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
      separationTypeId: ['', Validators.required],
      lastWorkingDate: ['', Validators.required],
      noticePeriodServed: [0, [Validators.required, Validators.min(0)]],
      separationReason: ['', Validators.required],
      resignationLetterPath: [''],
      rehireEligible: [false],
      rehireNotes: ['']
    });
  }

  private showError(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonColor: '#3f51b5',
    });
  }

  private isValidEmployeeId(id: string | null | undefined): boolean {
    if (!id) return false;
    const lowerId = id.toLowerCase();
    return !(lowerId.includes('system') || id.length < 4);
  }

  private createUnknownEmployee(id: string): Employee {
    return {
      empId: id,
      empCode: 'UNKNOWN',
      firstName: 'Unknown',
      lastName: 'Employee',
      department: 'N/A',
      position: 'N/A'
    };
  }

  private loadEmployeeNames(): void {
    try {
      if (!this.separations || this.separations.length === 0) {
        return;
      }

      const allIds = [
        ...this.separations.map(s => s.employeeId).filter(Boolean),
        ...this.separations.map(s => s.initiatedBy).filter(Boolean),
        ...this.separations.map(s => s.approvedBy).filter(Boolean)
      ] as string[];

      const validUniqueIds = [...new Set(allIds.filter(id => this.isValidEmployeeId(id)))];
      
      allIds.filter(id => !validUniqueIds.includes(id) && id).forEach(invalidId => {
        this.employeeMap[invalidId] = this.createUnknownEmployee(invalidId);
      });

      if (validUniqueIds.length === 0) {
        this.updateSeparationData();
        return;
      }

      const employeeRequests = validUniqueIds.map(empId => 
        this.separationService.getEmployeeById(empId).pipe(
          catchError(error => {
            console.warn(`Failed to load employee ${empId}:`, error);
            return of(this.createUnknownEmployee(empId));
          })
        )
      );

      const employeeNamesSub = forkJoin(employeeRequests).subscribe({
        next: (employees) => {
          employees.forEach((employee, index) => {
            const empId = validUniqueIds[index];
            if (employee && empId) {
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
    if (!this.separations || this.separations.length === 0) {
      console.log('No separations to update');
      return;
    }

    this.separations = this.separations.map(separation => {
      const updatedSeparation = { ...separation };

      if (updatedSeparation.employeeId) {
        const employee = this.employeeMap[updatedSeparation.employeeId] || this.createUnknownEmployee(updatedSeparation.employeeId);
        updatedSeparation.employeeName = `${employee.firstName} ${employee.lastName}`.trim();
        updatedSeparation.department = employee.department || 'N/A';
        updatedSeparation.position = employee.position || 'N/A';
      }
      
      if (updatedSeparation.initiatedBy) {
        const initiator = this.employeeMap[updatedSeparation.initiatedBy] || this.createUnknownEmployee(updatedSeparation.initiatedBy);
        updatedSeparation.initiatedByName = `${initiator.firstName} ${initiator.lastName}`.trim();
      }
      
      if (updatedSeparation.approvedBy) {
        const approver = this.employeeMap[updatedSeparation.approvedBy] || this.createUnknownEmployee(updatedSeparation.approvedBy);
        updatedSeparation.approvedByName = `${approver.firstName} ${approver.lastName}`.trim();
      }
      
      return updatedSeparation;
    });
    
    this.filteredSeparations = [...this.separations];
    this.cdr.detectChanges();
  }

  getSeparationTypeOptions(): SeparationType[] {
    return this.separationTypes;
  }

  getSeparationTypeId(separationType: SeparationType): string {
    return separationType?.separationTypeId || '';
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
    
    // Reload separation types to ensure we have the latest
    this.separationService.getSeparationTypes().subscribe({
      next: (types) => {
        this.separationTypes = types;
        this.separationTypesMap = {};
        types.forEach(type => {
          this.separationTypesMap[type.separationTypeId] = type;
        });
      }
    });
    
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

  openStatusModal(separation: Separation): void {
    this.currentSeparation = separation;
    this.statusForm.patchValue({
      status: separation.status || 'Pending',
      notes: separation.notes || ''
    });
    
    this.modalRef = this.modalService.open(this.statusModalTemplate, {
      size: 'md',
      backdrop: 'static'
    });
  }

  openEditModal(separation: Separation): void {
    this.isEditMode = true;
    this.currentSeparation = separation;
    console.log('Edit functionality not implemented yet');
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
        this.getSeparationTypeName(separation).toLowerCase().includes(query)
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

  getSeparationTypeName(separation: Separation): string {
    // First check if separation has a separationType object with name
    if (separation.separationType && separation.separationType.separationName) {
      return separation.separationType.separationName;
    }
    
    // If not, try to find it using separationTypeId
    if (separation.separationTypeId) {
      const type = this.separationTypesMap[separation.separationTypeId];
      if (type) {
        return type.separationName;
      }
    }
    
    // Check if there's a separationTypeId
    if (separation.separationTypeId) {
      const type = this.separationTypesMap[separation.separationTypeId];
      if (type) {
        return type.separationName;
      }
    }
    
    return 'N/A';
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
      this.form.markAllAsTouched();
      Swal.fire({
        title: 'Form Invalid',
        text: 'Please fill all required fields correctly',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
  
    const formValue = this.form.getRawValue();
    const separationData: SeparationRequest = {
      empId: formValue.empId,
      separationTypeId: formValue.separationTypeId,
      initiatedBy: this.getCurrentUserEmpId(),
      lastWorkingDate: formValue.lastWorkingDate,
      noticePeriodServed: Number(formValue.noticePeriodServed) || 0,
      separationReason: formValue.separationReason,
      resignationLetterPath: formValue.resignationLetterPath || '',
      rehireEligible: Boolean(formValue.rehireEligible),
      rehireNotes: formValue.rehireNotes || ''
    };

    console.log('Submitting separation with typeId:', separationData.separationTypeId);

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
      }
    });
  }

  private processSeparation(separationData: SeparationRequest): void {
    this.isLoading = true;
    
    const selectedType = this.separationTypes.find(
      type => type.separationTypeId === separationData.separationTypeId
    );

    if (!selectedType) {
      this.isLoading = false;
      this.showError('Invalid separation type selected. Please select a valid separation type.');
      return;
    }

    console.log('Selected separation type:', selectedType);

    this.separationService.createSeparation(separationData).subscribe({
      next: (savedSeparation: Separation) => {
        console.log('Separation created successfully:', savedSeparation);
        
        // Ensure the separation has the correct type
        if (!savedSeparation.separationType || savedSeparation.separationType.separationTypeId === 'default') {
          savedSeparation.separationType = selectedType;
          savedSeparation.separationTypeId = selectedType.separationTypeId;
        }
        
        // Add employee details
        savedSeparation.employeeName = this.form.get('empName')?.value || 'Loading...';
        savedSeparation.department = this.selectedEmployee?.department || 'Loading...';
        savedSeparation.position = this.selectedEmployee?.position || 'Loading...';
        savedSeparation.initiatedByName = this.getCurrentUserDisplayName();
        
        this.separations.unshift(savedSeparation);
        this.filteredSeparations = [...this.separations];
        this.totalPages = Math.ceil(this.filteredSeparations.length / this.itemsPerPage);

        this.isLoading = false;
        this.modalService.dismissAll();
        this.initializeForm();

        // Reload data to ensure everything is in sync
        this.loadInitialData();

        Swal.fire({
          title: 'Success!',
          text: 'Separation request has been submitted successfully.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error in save operation:', error);
        
        let errorMessage = 'Failed to save separation. Please try again.';
        
        if (error.status === 401 || error.status === 403) {
          errorMessage = 'Your session has expired. Please log in again.';
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Invalid data. Please check your inputs.';
        } else if (error.status === 409) {
          errorMessage = 'A separation request already exists for this employee.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }
  
  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.empId;
  }

  getEmployeeNameById(empId: string): string {
    if (!empId || !this.employeeMap) return 'Unknown';
    const employee = this.employeeMap[empId];
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  }

  getInitiatorName(separation: Separation): string {
    if (!separation || !separation.initiatedBy) return 'Unknown';
    if (separation.initiatedByName) {
      return separation.initiatedByName;
    }
    return this.getEmployeeNameById(separation.initiatedBy);
  }

  getApproverName(separation: Separation): string {
    if (!separation || !separation.approvedBy) return 'N/A';
    if (separation.approvedByName) {
      return separation.approvedByName;
    }
    return this.getEmployeeNameById(separation.approvedBy);
  }

  updateStatus(): void {
    if (this.statusForm.invalid || !this.currentSeparation) {
      return;
    }
    
    const status = this.statusForm.value.status;
    const notes = this.statusForm.value.notes;
    
    this.isLoading = true;
    
    this.separationService.updateSeparationStatus(
      this.currentSeparation.separationId!,
      status,
      notes
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.modalService.dismissAll();
        
        // Update the separation in the local array
        const index = this.separations.findIndex(s => s.separationId === this.currentSeparation?.separationId);
        if (index !== -1) {
          this.separations[index].status = status;
          this.separations[index].separationStatus = status;
          this.separations[index].notes = notes;
          this.separations[index].approvedBy = this.getCurrentUserEmpId();
          this.separations[index].approvalDate = new Date().toISOString();
          this.separations[index].approvedByName = this.getCurrentUserDisplayName();
        }
        
        this.filteredSeparations = [...this.separations];
        this.cdr.detectChanges();
        
        Swal.fire({
          title: 'Success!',
          text: 'Separation status updated successfully.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error updating status:', error);
        
        let errorMessage = 'Failed to update separation status.';
        if (error.message) {
          errorMessage = error.message;
        }
        
        Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }
}