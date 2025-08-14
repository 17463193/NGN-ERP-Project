import { Component, OnInit, TemplateRef, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { EmployeeTransferService, EmployeeTransfer, TransferType, EmployeeProfile } from '../../../services/employee-transfer.service';
import { DepartmentService, Department } from '../../../services/department.service';

// Using the EmployeeTransfer interface from the service

@Component({
  selector: 'app-emp-transfer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule
  ],
  templateUrl: './emp-transfer.component.html',
  styleUrls: ['./emp-transfer.component.scss']
})
export class EmpTransferComponent implements OnInit, OnDestroy {
  // Template Refs
  @ViewChild('transferModal') private transferModalRef!: TemplateRef<any>;
  @ViewChild('viewTransferModal') private viewTransferModalRef!: TemplateRef<any>;
  private modalRef: any;
  
  // Department management
  private departmentSub: Subscription | null = null;
  // Department and branch data
  departments: any[] = [];
  private departmentMap: { [key: string]: string } = {};
  branches: any[] = [];
  private branchMap: { [key: string]: string } = {};
  departmentHeads: { [key: string]: any } = {}; // Cache for department heads
  jobPositions: any[] = [];
  private jobPositionMap: { [key: string]: string } = {}; // Map of positionId to positionName
  
  // Employee management
  employees: any[] = []; // Array of employee objects
  private employeeMap: { [key: string]: string } = {}; // Map of empId to full name
  
  // Data
  transfers: EmployeeTransfer[] = [];
  filteredTransfers: EmployeeTransfer[] = [];
  currentTransfer: EmployeeTransfer | null = null;
  transferTypes: TransferType[] = [];
  private transferTypesMap: {[key: string]: string} = {}; // Cache for transfer type names
  departmentList: any[] = []; // For dropdowns
  employeeNames: {[key: string]: string} = {}; // Cache for employee names
  
  // Form state
  form: FormGroup;
  isSaving = false;
  isEditMode = false;
  searchQuery = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  isLoading = false;
  errorMessage = '';
  
  // Status options
  transferStatuses = [
    'Pending',
    'Approved',
    'Rejected',
    'Completed',
    'Cancelled'
  ];
  
  // Get array of transfer type entries for template
  get transferTypeOptions(): {id: string, name: string}[] {
    if (!this.transferTypes || this.transferTypes.length === 0) {
      // No need to show warning here as it might be called before data is loaded
      return [];
    }
    
    // Ensure we have valid transfer types with required properties
    const options = this.transferTypes
      .filter(type => type && type.transferTypeId) // Filter out invalid entries
      .map(type => ({
        id: type.transferTypeId,
        name: type.transferName || type.transferCode || `Transfer Type (${type.transferTypeId})`
      }));
    
    return options;
  }
  
  /**
   * Compare function for transfer type dropdown
   * This ensures proper comparison of transfer type values in the dropdown
   */
  compareTransferTypes(type1: any, type2: any): boolean {
    // If both values are null/undefined, consider them equal
    if (!type1 && !type2) return true;
    
    // If one is null/undefined and the other isn't, they're not equal
    if (!type1 || !type2) return false;
    
    // If either is a string, compare as strings
    if (typeof type1 === 'string' || typeof type2 === 'string') {
      return type1 === type2;
    }
    
    // If both have an 'id' property, compare those
    if (type1.id && type2.id) {
      return type1.id === type2.id;
    }
    
    // Default to strict equality
    return type1 === type2;
  }
  
  // Format employee name (first + middle + last name)
  private formatEmployeeName(employee: any): string {
    if (!employee) return 'N/A';
    const { firstName, middleName, lastName } = employee;
    return [firstName, middleName, lastName].filter(Boolean).join(' ');
  }
  
  /**
   * Handle employee selection
   * @param empId Selected employee ID
   */
  private onEmployeeSelected(empId: string): void {
    const selectedEmployee = this.employees.find(e => e.employee?.empId === empId);
    if (!selectedEmployee?.employee) return;
    
    const { deptId, branchId, positionId } = selectedEmployee.employee;
    
    // Update form with employee's current details
    this.form.patchValue({
      fromDeptId: deptId || '',
      fromBranchId: branchId || '',
      fromPositionId: positionId || ''
    });
    
    // Disable these fields as they should come from employee record
    this.form.get('fromDeptId')?.disable({ onlySelf: true });
    this.form.get('fromBranchId')?.disable({ onlySelf: true });
    this.form.get('fromPositionId')?.disable({ onlySelf: true });
    
    // Fetch department details to get department head
    if (deptId) {
      this.departmentService.getDepartmentById(deptId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const deptHeadId = response.data.dept_head_id;
            if (deptHeadId) {
              // Auto-fill manager if department head exists
              this.form.patchValue({
                fromManagerId: deptHeadId
              });
              this.form.get('fromManagerId')?.disable();
            } else {
              // Enable manager selection if no department head
              this.form.get('fromManagerId')?.enable();
            }
          }
        },
        error: (error) => {
          console.error('Error fetching department details:', error);
          // Enable manager selection in case of error
          this.form.get('fromManagerId')?.enable();
        }
      });
    } else {
      this.form.get('fromManagerId')?.enable();
    }
    
    // Manually update the form's validity
    this.form.updateValueAndValidity();
  }
  
  /**
   * Reset employee-related form fields
   */
  private resetEmployeeDetails(): void {
    this.form.patchValue({
      fromDeptId: '',
      fromBranchId: '',
      fromPositionId: '',
      fromManagerId: ''
    });
    
    // Re-enable fields for new selection
    this.form.get('fromDeptId')?.enable({ onlySelf: true });
    this.form.get('fromBranchId')?.enable({ onlySelf: true });
    this.form.get('fromPositionId')?.enable({ onlySelf: true });
    this.form.get('fromManagerId')?.enable({ onlySelf: true });
    
    // Manually update the form's validity
    this.form.updateValueAndValidity();
  }
  
  /**
   * Handle department selection
   * @param deptId Selected department ID
   */
  onDepartmentSelected(deptId: string): void {
    if (!deptId) return;
    
    // Disable branch and manager fields while loading
    this.form.get('toBranchId')?.disable({ onlySelf: true });
    this.form.get('toManagerId')?.disable({ onlySelf: true });
    
    // Check if we already have the department head cached
    if (this.departmentHeads[deptId]) {
      this.updateManagerField(this.departmentHeads[deptId]);
      return;
    }
    
    // If not in cache, fetch department details
    this.isLoading = true;
    this.departmentService.getDepartmentById(deptId).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success && response.data) {
          const department = response.data;
          
          // Update branch field
          if (department.branch) {
            this.form.get('toBranchId')?.setValue(department.branch.branchId);
            this.form.get('toBranchId')?.updateValueAndValidity();
          }
          
          // Update manager field if department head exists
          if (department.dept_head_id) {
            this.departmentHeads[deptId] = department.dept_head_id;
            this.updateManagerField(department.dept_head_id);
          }
          
          // Disable the fields as they are auto-filled
          this.form.get('toBranchId')?.disable({ onlySelf: true });
          this.form.get('toManagerId')?.disable({ onlySelf: true });
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading department details:', error);
        this.showError('Error loading department details. Please try again.');
        
        // Re-enable fields on error
        this.form.get('toBranchId')?.enable({ onlySelf: true });
        this.form.get('toManagerId')?.enable({ onlySelf: true });
      }
    });
  }
  
  // Helper method to update manager field
  private updateManagerField(managerId: string): void {
    if (!managerId) {
      this.form.get('toManagerId')?.setValue(null);
      return;
    }
    
    // If we already have the manager in our employee map
    if (this.employeeMap[managerId]) {
      this.form.get('toManagerId')?.setValue(managerId);
      this.form.get('toManagerId')?.updateValueAndValidity();
      return;
    }
    
    // If not, we need to load the manager's details
    this.loadEmployeeNames([managerId]).then(() => {
      if (this.employeeMap[managerId]) {
        this.form.get('toManagerId')?.setValue(managerId);
        this.form.get('toManagerId')?.updateValueAndValidity();
      }
    });
  }

  /**
   * Open the add transfer modal
   */
  openAddModal(): void {
    this.isEditMode = false;
    this.currentTransfer = null;
    
    // Reset the form with all fields set to null or default values
    this.form.reset({
      // Employee and Transfer Type
      empId: null,
      transferTypeId: null,
      
      // From Department Details (will be auto-filled when employee is selected)
      fromDeptId: null,
      fromBranchId: null,
      fromPositionId: null,
      fromManagerId: null,
      
      // To Department Details
      toDeptId: null,
      toBranchId: null,
      toPositionId: null,
      toManagerId: null,
      
      // Transfer Details
      transferReason: null,
      effectiveDate: null,
      transferStatus: null,
      isTemporary: false,
      temporaryEndDate: null,
      probationApplicable: false,
      probationEndDate: null,
      employeeConsent: false,
      consentDate: null,
      relocationAllowance: 0,
      
      // System Fields
      initiatedBy: null,
      initiationDate: null,
      createdDate: null,
      modifiedDate: null,
      approvedBy: null,
      approvalDate: null,
      rejectionReason: null
    });
    
    // Enable the form controls that might have been disabled
    this.form.get('fromDeptId')?.enable({ onlySelf: true });
    this.form.get('fromBranchId')?.enable({ onlySelf: true });
    this.form.get('fromPositionId')?.enable({ onlySelf: true });
    
    // Disable the from fields initially until an employee is selected
    this.form.get('fromDeptId')?.disable({ onlySelf: true });
    this.form.get('fromBranchId')?.disable({ onlySelf: true });
    this.form.get('fromPositionId')?.disable({ onlySelf: true });
    
    // Make sure the form is marked as pristine and untouched
    this.form.markAsPristine();
    this.form.markAsUntouched();
    
    // Force change detection to update the view
    setTimeout(() => {
      this.cdr.detectChanges();
    });
    
    this.modalRef = this.modalService.open(this.transferModalRef, { 
      size: 'lg', 
      backdrop: 'static' 
    });
  }

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private transferService: EmployeeTransferService,
    private departmentService: DepartmentService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.initForm();
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadBranches();
    this.loadJobPositions();
    this.loadEmployees();
    this.loadAllTransferTypes();
    this.loadTransfers();
    
    // Set up department change subscription
    this.form.get('toDeptId')?.valueChanges.subscribe(deptId => {
      if (deptId) {
        this.onDepartmentSelected(deptId);
      } else {
        this.form.get('toBranchId')?.reset();
        this.form.get('toManagerId')?.reset();
      }
    });
    
    // Add employee selection handler
    this.form.get('empId')?.valueChanges.subscribe(empId => {
      if (empId) {
        this.onEmployeeSelected(empId);
      } else {
        this.resetEmployeeDetails();
      }
    });

    // Handle loading state for employee dropdown
    this.transferService.isLoading$.subscribe(isLoading => {
      this.isLoading = isLoading;
      const empIdControl = this.form.get('empId');
      if (isLoading) {
        empIdControl?.disable({ onlySelf: true });
      } else {
        empIdControl?.enable({ onlySelf: true });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.departmentSub) {
      this.departmentSub.unsubscribe();
    }
  }
  
  /**
   * Load all transfer types from the API for dropdown
   */
  private loadAllTransferTypes(): void {
    this.isLoading = true;
    this.transferService.getTransferTypes().subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response)) {
          // If response is already an array, use it directly
          this.transferTypes = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          // If response has a data property that's an array, use that
          this.transferTypes = response.data;
        } else {
          this.errorMessage = 'Unexpected response format for transfer types';
          console.error('Unexpected transfer types format:', response);
          return;
        }
        
        // Update the transfer types map for quick lookup
        this.transferTypesMap = {}; // Reset the map
        this.transferTypes.forEach(type => {
          if (type && type.transferTypeId) {
            const name = type.transferName || type.transferCode || type.transferTypeId;
            this.transferTypesMap[type.transferTypeId] = name;
          }
        });
      },
      error: (error) => {
        this.errorMessage = 'Failed to load transfer types';
        this.showError('Failed to load transfer types. Please try again later.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Load departments from the API and create a mapping of department IDs to names
   */
  private loadDepartments(): void {
    this.isLoading = true;
    this.departmentService.getDepartments().subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.departments = Array.isArray(response.data) ? response.data : [];
          this.departmentMap = {};
          
          this.departments.forEach(dept => {
            if (dept && dept.dept_id) {
              this.departmentMap[dept.dept_id] = dept.dept_name || `Department ${dept.dept_id}`;
              
              // Preload department heads for better performance
              if (dept.dept_head_id) {
                this.departmentHeads[dept.dept_id] = dept.dept_head_id;
              }
            }
          });
        } else {
          this.showError('Failed to load departments. Please try again later.');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('Error loading departments. Please try again later.');
      }
    });
  }

  /**
   * Load branches from the API
   */
  private loadBranches(): void {
    this.isLoading = true;
    this.transferService.getBranches().subscribe({
      next: (response) => {
        if (response) {
          this.branches = response;
          // Create a map of branch ID to branch name
          this.branchMap = response.reduce((acc: { [key: string]: string }, branch: any) => {
            acc[branch.branchId] = branch.branchName;
            return acc;
          }, {});
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('Failed to load branches. Please try again later.');
      }
    });
  }

  /**
   * Load job positions from the API
   */
  private loadJobPositions(): void {
    this.isLoading = true;
    this.transferService.getJobPositions().subscribe({
      next: (response) => {
        if (response) {
          this.jobPositions = response;
          // Create a map of position ID to position name
          this.jobPositionMap = response.reduce((acc: { [key: string]: string }, position: any) => {
            acc[position.positionId] = position.positionName;
            return acc;
          }, {});
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('Failed to load job positions. Please try again later.');
      }
    });
  }

  /**
   * Get job position name by ID
   * @param positionId Position ID
   * @returns Position name or ID if not found
   */
  getJobPositionName(positionId: string | undefined): string {
    if (!positionId) return 'N/A';
    return this.jobPositionMap[positionId] || positionId;
  }

  /**
   * Load employees from the API
   */
  private loadEmployees(): void {
    this.isLoading = true;
    this.transferService.getEmployees().subscribe({
      next: (response) => {
        if (response && Array.isArray(response)) {
          this.employees = response;
          // Create a map of employee ID to full name
          this.employeeMap = response.reduce((acc: { [key: string]: string }, emp: any) => {
            if (emp.employee) {
              acc[emp.employee.empId] = this.formatEmployeeName(emp.employee);
            }
            return acc;
          }, {});
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('Failed to load employees. Please try again later.');
      }
    });
  }

  /**
   * Get employee name by ID
   * @param empId Employee ID
   * @returns Formatted employee name or ID if not found
   */
  getEmployeeName(empId: string | undefined): string {
    if (!empId) return 'N/A';
    
    // Check if we have the employee in our map
    if (this.employeeMap[empId]) {
      return this.employeeMap[empId];
    }
    
    // Fallback to searching in employees array if not in map
    const employee = this.employees.find(emp => emp.empId === empId);
    if (employee) {
      const name = this.formatEmployeeName(employee);
      this.employeeMap[empId] = name; // Cache for next time
      return name;
    }
    
    return `Employee ${empId.substring(0, 8)}...`;
  }

  /**
   * Get department name by ID
   * @param deptId Department ID
   * @returns Department name or 'N/A' if not found
   */
  getDepartmentName(deptId: string | undefined): string {
    if (!deptId) return 'N/A';
    return this.departmentMap[deptId] || deptId; // Return ID if name not found
  }

  loadTransfers(): void {
    this.isLoading = true;
    this.transferService.getAllTransfers()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: async (response) => {
          this.transfers = response.data || [];
          
          // Get all unique employee IDs (both requester and approver)
          const allEmployeeIds = new Set<string>();
          this.transfers.forEach(transfer => {
            allEmployeeIds.add(transfer.empId);
            if (transfer.approvedBy) {
              allEmployeeIds.add(transfer.approvedBy);
            }
          });
          
          // Load transfer types and employee names in parallel
          const uniqueTypeIds = [...new Set(this.transfers.map(t => t.transferTypeId))];
          const uniqueEmpIds = Array.from(allEmployeeIds);
          
          await Promise.all([
            this.loadTransferTypes(uniqueTypeIds),
            this.loadEmployeeNames(uniqueEmpIds)
          ]);
          
          this.filteredTransfers = [...this.transfers];
          this.updatePagination();
        },
        error: (error) => {
          this.errorMessage = 'Failed to load transfers. Please try again later.';
          this.showError('Failed to load transfers. Please try again later.');
        }
      });
  }

/**
 * Load employee names for the given employee IDs
 * @param empIds Array of employee IDs to load names for
 */
private async loadEmployeeNames(empIds: string[]): Promise<void> {
  // Filter out IDs we already have
  const idsToLoad = empIds.filter(id => !this.employeeMap[id]);
  if (idsToLoad.length === 0) return;

  try {
    // Get all employees and filter by the ones we need
    const employees = await this.transferService.getEmployees().toPromise();
    if (employees) {
      employees.forEach(emp => {
        if (emp.empId && idsToLoad.includes(emp.empId)) {
          this.employeeMap[emp.empId] = this.formatEmployeeName(emp);
        }
      });
    }
    
    // For any IDs not found in the employees list, use a fallback
    idsToLoad.forEach(id => {
      if (!this.employeeMap[id]) {
        this.employeeMap[id] = `Employee ${id.substring(0, 8)}...`;
      }
    });
  } catch (error) {
    // If there's an error, use generic names for all requested IDs
    idsToLoad.forEach(id => {
      this.employeeMap[id] = `Employee ${id.substring(0, 8)}...`;
    });
  }
}

  /**
   * Load transfer types for the given IDs
   * @param typeIds Array of transfer type IDs to load
   */
  private async loadTransferTypes(typeIds: string[]): Promise<void> {
    for (const typeId of typeIds) {
      if (!typeId) {
        continue;
      }
      
      if (this.transferTypes[typeId]) {
        continue;
      }
      
      try {
        const type = await this.transferService.getTransferTypeById(typeId).toPromise();
        
        if (type) {
          const typeName = type.transferName || typeId;
          this.transferTypes[typeId] = typeName;
        } else {
          this.transferTypes[typeId] = typeId;
        }
      } catch (error) {
        this.transferTypes[typeId] = typeId; // Fallback to ID if name not available
      }
    }
  }

  /**
   * Get transfer type name by ID
   * @param typeId Transfer type ID
   * @returns Transfer type name or ID if not found
   */
  getTransferTypeName(typeId: string | undefined): string {
    if (!typeId) {
      return 'N/A';
    }
    
    // First check the transferTypes array for a matching type
    const transferType = this.transferTypes.find(type => type && type.transferTypeId === typeId);
    
    if (transferType) {
      // Return the most appropriate name in this order: transferName > transferCode > transferTypeId
      return transferType.transferName || transferType.transferCode || transferType.transferTypeId || typeId;
    }
    
    // Check if we have a cached name in the map
    if (this.transferTypesMap[typeId]) {
      return this.transferTypesMap[typeId];
    }
    
    // If we're still here, try to find the type in the service's cache
    if (this.transferService['transferTypesCache']?.[typeId]) {
      const cachedType = this.transferService['transferTypesCache'][typeId];
      const name = cachedType.transferName || cachedType.transferCode || typeId;
      // Cache it for next time
      this.transferTypesMap[typeId] = name;
      return name;
    }
    
    // As a last resort, return the type ID
    return typeId;
  }

  /**
   * Show error message using SweetAlert2
   * @param message Error message to display
   */
  private showError(message: string): void {
    Swal.fire({
      title: 'Error!',
      text: message,
      icon: 'error',
      confirmButtonColor: '#3b82f6'
    });
  }

  private initForm(): FormGroup {
    const formGroup = this.fb.group({
      // Required fields
      empId: ['', Validators.required],
      transferTypeId: [null, Validators.required],
      fromDeptId: [{value: '', disabled: true}],
      toDeptId: [null, Validators.required],
      fromBranchId: [{value: '', disabled: true}],
      fromPositionId: [{value: '', disabled: true}],
      fromManagerId: [{value: '', disabled: true}],
      toBranchId: [{value: '', disabled: true}],
      toPositionId: [{value: '', disabled: false}],
      toManagerId: [{value: '', disabled: true}],
      
      // Transfer details
      transferReason: ['', [Validators.required, Validators.minLength(10)]],
      effectiveDate: [null, Validators.required],
      transferStatus: [null, Validators.required],
      
      // Other fields
      isTemporary: [false],
      temporaryEndDate: [null],
      probationApplicable: [false],
      probationEndDate: [null],
      relocationAllowance: [0, [Validators.required, Validators.min(0)]],
      employeeConsent: [false],
      notes: [''],
      consentDate: [null],
      approvedBy: [null],
      approvalDate: [null],
      rejectionReason: [null],
      initiatedBy: [''],
      initiationDate: [null],
      createdDate: [null],
      modifiedDate: [null]
    }, { 
      validators: [
        this.validateForm,
        this.validateEffectiveDate
      ],
      updateOn: 'change' // Ensure validation happens on every change
    });

    // Set up value changes for dynamic validation
    formGroup.get('isTemporary')?.valueChanges.subscribe(isTemporary => {
      const tempEndDateControl = formGroup.get('temporaryEndDate');
      if (isTemporary) {
        tempEndDateControl?.setValidators([Validators.required]);
      } else {
        tempEndDateControl?.clearValidators();
        tempEndDateControl?.setValue(null);
      }
      tempEndDateControl?.updateValueAndValidity();
    });

    formGroup.get('probationApplicable')?.valueChanges.subscribe(probationApplicable => {
      const probationEndDateControl = formGroup.get('probationEndDate');
      if (probationApplicable) {
        probationEndDateControl?.setValidators([Validators.required]);
      } else {
        probationEndDateControl?.clearValidators();
        probationEndDateControl?.setValue(null);
      }
      probationEndDateControl?.updateValueAndValidity();
    });

    return formGroup;
  }

  // Custom form validator to handle conditional validation
  private validateForm(group: FormGroup): { [key: string]: any } | null {
    const errors: { [key: string]: any } = {};
    
    // Check if temporary transfer is enabled but no end date is provided
    if (group.get('isTemporary')?.value && !group.get('temporaryEndDate')?.value) {
      errors['temporaryEndDateRequired'] = true;
    }
    
    // Check if probation is applicable but no end date is provided
    if (group.get('probationApplicable')?.value && !group.get('probationEndDate')?.value) {
      errors['probationEndDateRequired'] = true;
    }
    
    // Ensure transfer date is in the future
    const effectiveDate = group.get('effectiveDate')?.value;
    if (effectiveDate && new Date(effectiveDate) <= new Date()) {
      errors['invalidEffectiveDate'] = true;
    }
    
    // If there are validation errors, return them
    return Object.keys(errors).length > 0 ? errors : null;
  }

  // Validate that effective date is in the future
  private validateEffectiveDate(group: FormGroup): { [key: string]: any } | null {
    const effectiveDate = group.get('effectiveDate')?.value;
    if (effectiveDate && new Date(effectiveDate) <= new Date()) {
      return { 'invalidEffectiveDate': true };
    }
    return null;
  }

  departmentValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const currentDept = group.get('currentDepartment')?.value;
    const newDept = group.get('newDepartment')?.value;
    
    if (currentDept && newDept && currentDept === newDept) {
      return { 'sameDepartment': true };
    }
    return null;
  }

  applySearch(): void {
    if (!this.searchQuery) {
      this.filteredTransfers = [...this.transfers];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredTransfers = this.transfers.filter(transfer => 
      (transfer.empId && transfer.empId.toLowerCase().includes(query)) ||
      (transfer.fromDeptId && transfer.fromDeptId.toLowerCase().includes(query)) ||
      (transfer.toDeptId && transfer.toDeptId.toLowerCase().includes(query)) ||
      (transfer.transferReason && transfer.transferReason.toLowerCase().includes(query)) ||
      (transfer.transferStatus && transfer.transferStatus.toLowerCase().includes(query))
    );
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTransfers.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  get paginatedTransfers(): EmployeeTransfer[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTransfers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }



  openEditModal(transfer: EmployeeTransfer): void {
    this.isEditMode = true;
    this.currentTransfer = { ...transfer };
    this.form.patchValue({
      ...transfer,
      effectiveDate: transfer.effectiveDate ? this.formatDateForInput(transfer.effectiveDate) : '',
      temporaryEndDate: transfer.temporaryEndDate ? this.formatDateForInput(transfer.temporaryEndDate) : '',
      consentDate: transfer.consentDate ? this.formatDateForInput(transfer.consentDate) : '',
      probationEndDate: transfer.probationEndDate ? this.formatDateForInput(transfer.probationEndDate) : ''
    });
    this.modalRef = this.modalService.open(this.transferModalRef, { size: 'lg' });
  }

  openViewModal(transfer: EmployeeTransfer): void {
    this.currentTransfer = transfer;
    this.modalRef = this.modalService.open(this.viewTransferModalRef, { size: 'lg' });
  }

  /**
   * Marks all controls in a form group as touched
   * @param formGroup - The form group to touch
   */
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Checks if all required fields are filled
   */
  public areRequiredFieldsFilled(): boolean {
    // Only check fields that are enabled and required
    const requiredFields = [
      'empId', 'transferTypeId', 'toDeptId', 'transferReason', 
      'effectiveDate', 'transferStatus'
    ];
    
    const formData = this.form.getRawValue();
    
    // Check if any required field is empty
    const hasEmptyField = requiredFields.some(field => {
      const control = this.form.get(field);
      const value = formData[field];
      
      // Skip validation for disabled fields
      if (control?.disabled) {
        return false;
      }
      
      return value === null || value === undefined || value === '';
    });
    
    // Also check if the form is valid
    const isFormValid = this.form.valid;
    
    return !hasEmptyField && isFormValid;
  }

  /**
   * Handles the form submission for creating or updating a transfer
   */
  saveTransfer(): void {
    // Mark all fields as touched to show validation messages
    this.markFormGroupTouched(this.form);
    
    // Check if form is valid
    if (this.form.invalid) {
      this.showError('Please fill in all required fields');
      return;
    }
    
    // Check if all required fields are filled
    if (!this.areRequiredFieldsFilled()) {
      this.showError('Please fill in all required fields');
      return;
    }
    
    this.isSaving = true;
    
    // Format dates to YYYY-MM-DD
    const formatDate = (date: string | Date) => {
      if (!date) return null;
      try {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      } catch (e) {
        console.error('Error formatting date:', e);
        return null;
      }
    };
    
    // Get form data including disabled fields
    const formData = this.form.getRawValue();
    
    // Ensure we have a valid transfer type ID
    let transferTypeId = formData.transferTypeId;
    
    // If transferTypeId is an object, extract the ID
    if (transferTypeId && typeof transferTypeId === 'object') {
      transferTypeId = transferTypeId.id || transferTypeId.transferTypeId || null;
    }
    
    if (!transferTypeId) {
      this.isSaving = false;
      this.showError('Please select a valid transfer type');
      return;
    }
    
    // Get current date in ISO format (YYYY-MM-DD)
    const currentDate = new Date().toISOString().split('T')[0];
    
    try {
      // Prepare the transfer data
      const transferData: Partial<EmployeeTransfer> = {
        empId: formData.empId,
        transferTypeId: transferTypeId,
        fromDeptId: formData.fromDeptId,
        fromBranchId: formData.fromBranchId,
        fromPositionId: formData.fromPositionId,
        fromManagerId: formData.fromManagerId,
        toDeptId: formData.toDeptId,
        toBranchId: formData.toBranchId,
        toPositionId: formData.toPositionId,
        toManagerId: formData.toManagerId,
        transferReason: formData.transferReason,
        effectiveDate: formatDate(formData.effectiveDate) || currentDate,
        transferStatus: 'Pending',
        isTemporary: Boolean(formData.isTemporary),
        temporaryEndDate: formData.isTemporary ? formatDate(formData.temporaryEndDate) : null,
        probationApplicable: Boolean(formData.probationApplicable),
        probationEndDate: formData.probationApplicable ? formatDate(formData.probationEndDate) : null,
        employeeConsent: Boolean(formData.employeeConsent),
        consentDate: formData.employeeConsent ? formatDate(formData.consentDate) : null,
        relocationAllowance: Number(formData.relocationAllowance) || 0,
        initiatedBy: formData.empId, // Using the same employee as initiator
        initiationDate: currentDate,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        approvedBy: null,
        approvalDate: null,
        rejectionReason: null
      };



      this.transferService.createTransfer(transferData).subscribe({
        next: (createdTransfer) => {
          this.isSaving = false;
          this.modalService.dismissAll();
          this.showSuccess('Transfer created successfully!');
          this.loadTransfers(); // Refresh the transfers list
        },
        error: (error) => {
          this.isSaving = false;
          console.error('Error creating transfer:', error);
          
          let errorMessage = 'Failed to create transfer. ';
          if (error.status === 409) {
            errorMessage = 'A transfer with these details already exists. Please check the details and try again.';
          } else if (error.error?.message) {
            errorMessage += error.error.message;
          } else if (error.message) {
            errorMessage += error.message;
          } else {
            errorMessage += 'Please try again later.';
          }
          
          this.showError(errorMessage);
        }
      });
    } catch (error) {
      this.isSaving = false;
      console.error('Error preparing transfer data:', error);
      this.showError('An error occurred while preparing the transfer data. Please try again.');
    }
  }

  confirmDelete(transfer: EmployeeTransfer): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete the transfer record for employee ID: ${transfer.empId}. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.transfers = this.transfers.filter(t => t.transferId !== transfer.transferId);
        this.filteredTransfers = this.filteredTransfers.filter(t => t.transferId !== transfer.transferId);
        
        Swal.fire(
          'Deleted!',
          'The transfer record has been deleted.',
          'success'
        );
      }
    });
  }

  exportTransfers(): void {
    // In a real app, this would export the data to a file
    this.showSuccess('Export functionality will be implemented here');
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Approved':
        return 'bg-success';
      case 'Pending':
        return 'bg-warning text-dark';
      case 'Rejected':
        return 'bg-danger';
      case 'Completed':
        return 'bg-info';
      case 'Cancelled':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  }

  private showSuccess(message: string): void {
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: message,
      timer: 2000,
      showConfirmButton: false
    });
  }
}