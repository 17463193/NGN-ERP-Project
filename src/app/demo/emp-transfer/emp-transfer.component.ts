import { Component, OnInit, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { EmployeeTransferService, EmployeeTransfer, TransferType, EmployeeProfile } from '../../services/employee-transfer.service';
import { DepartmentService, Department } from '../../services/department.service';

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
  // Department management
  private departmentSub: Subscription | null = null;
  departments: any[] = []; // Array of department objects
  private departmentMap: { [key: string]: string } = {}; // Map of dept_id to dept_name
  
  // Branch management
  branches: any[] = []; // Array of branch objects
  private branchMap: { [key: string]: string } = {}; // Map of branchId to branchName
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
      console.warn('No transfer types available in transferTypeOptions');
      return [];
    }
    
    const options = this.transferTypes
      .filter(type => type && type.transferTypeId) // Filter out invalid entries
      .map(type => ({
        id: type.transferTypeId,
        name: type.transferName || `Unknown (${type.transferTypeId})`
      }));
    
    console.log('Transfer type options:', options);
    return options;
  }
  
  // Format employee name (first + middle + last name)
  private formatEmployeeName(employee: any): string {
    if (!employee) return 'N/A';
    const { firstName, middleName, lastName } = employee;
    return [firstName, middleName, lastName].filter(Boolean).join(' ');
  }
  
  // Template Refs
  @ViewChild('transferModal') private transferModalRef!: TemplateRef<any>;
  @ViewChild('viewTransferModal') private viewTransferModalRef!: TemplateRef<any>;
  private modalRef: any;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private transferService: EmployeeTransferService,
    private departmentService: DepartmentService
  ) {
    this.form = this.initForm();
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadBranches();
    this.loadJobPositions();
    this.loadEmployees();
    this.loadTransfers();
    this.loadAllTransferTypes();
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
    console.log('Loading transfer types...');
    this.isLoading = true;
    this.transferService.getTransferTypes().subscribe({
      next: (response: any) => {
        console.log('Transfer types response:', response);
        if (response && Array.isArray(response)) {
          this.transferTypes = response;
          // Update the transfer types map for quick lookup
          this.transferTypes.forEach(type => {
            if (type.transferTypeId) {
              this.transferTypesMap[type.transferTypeId] = type.transferName || type.transferTypeId;
            }
          });
          console.log('Transfer types loaded successfully:', this.transferTypes);
        } else {
          console.warn('Unexpected response format for transfer types:', response);
          this.errorMessage = 'Unexpected response format for transfer types';
        }
      },
      error: (error) => {
        console.error('Error loading transfer types:', error);
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
    this.departmentSub = this.departmentService.getDepartments().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.departments = response.data;
          // Create a map of department ID to department name
          this.departmentMap = response.data.reduce((acc: { [key: string]: string }, dept: any) => {
            acc[dept.dept_id] = dept.dept_name;
            return acc;
          }, {});
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.isLoading = false;
        // Show error to user
        this.showError('Failed to load departments. Please try again later.');
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
        console.error('Error loading branches:', error);
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
        console.error('Error loading job positions:', error);
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
        console.error('Error loading employees:', error);
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
          console.error('Error loading transfers:', error);
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
    console.error('Error loading employee names:', error);
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
    console.log('Loading transfer types for IDs:', typeIds);
    
    for (const typeId of typeIds) {
      if (!typeId) {
        console.warn('Skipping empty transfer type ID');
        continue;
      }
      
      if (this.transferTypes[typeId]) {
        console.log(`Using cached transfer type ${typeId}:`, this.transferTypes[typeId]);
        continue;
      }
      
      try {
        console.log(`Fetching transfer type for ID: ${typeId}`);
        const type = await this.transferService.getTransferTypeById(typeId).toPromise();
        console.log(`Received transfer type for ${typeId}:`, type);
        
        if (type) {
          const typeName = type.transferName || typeId;
          console.log(`Setting transfer type ${typeId} name to:`, typeName);
          this.transferTypes[typeId] = typeName;
        } else {
          console.warn(`No data received for transfer type ${typeId}, using ID as fallback`);
          this.transferTypes[typeId] = typeId;
        }
      } catch (error) {
        console.error(`Error loading transfer type ${typeId}:`, error);
        this.transferTypes[typeId] = typeId; // Fallback to ID if name not available
      }
    }
    
    console.log('Final transfer types cache:', this.transferTypes);
  }

  /**
   * Get transfer type name by ID
   * @param typeId Transfer type ID
   * @returns Transfer type name or ID if not found
   */
  getTransferTypeName(typeId: string | undefined): string {
    console.log('Getting transfer type name for ID:', typeId);
    if (!typeId) {
      console.log('No type ID provided, returning N/A');
      return 'N/A';
    }
    
    const typeName = this.transferTypes[typeId];
    console.log(`Type name for ${typeId}:`, typeName || 'Not found');
    console.log('Current transferTypes cache:', this.transferTypes);
    
    return typeName || typeId;
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
    return this.fb.group({
      // Required fields
      empId: ['', Validators.required],
      transferTypeId: ['', Validators.required],
      fromDeptId: ['', Validators.required],
      toDeptId: ['', Validators.required],
      fromBranchId: [''],
      fromPositionId: [''],
      fromManagerId: [''],
      toBranchId: [''],
      toPositionId: [''],
      toManagerId: [''],
      
      // Transfer details
      transferReason: ['', Validators.required],
      effectiveDate: [null, Validators.required],
      transferStatus: ['Pending'],
      
      // Temporary transfer options
      isTemporary: [false],
      temporaryEndDate: [null],
      
      // Probation options
      probationApplicable: [false],
      probationEndDate: [null],
      
      // Relocation details
      relocationAllowance: [0],
      
      // Employee consent
      employeeConsent: [false],
      consentDate: [null],
      
      // Approval details
      approvedBy: [null],
      approvalDate: [null],
      rejectionReason: [null],
      
      // Metadata
      initiatedBy: [''],
      initiationDate: [null],
      createdDate: [null],
      modifiedDate: [null]
    });
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

  openAddModal(): void {
    this.isEditMode = false;
    this.currentTransfer = null;
    this.form.reset({
      status: 'Pending',
      transferDate: new Date().toISOString().split('T')[0] // Today's date
    });
    this.modalRef = this.modalService.open(this.transferModalRef, { size: 'lg' });
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

  saveTransfer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formData = this.form.value;
    
    // Set the current user as the initiator
    // TODO: Replace with actual current user ID from your auth service
    const currentUserId = 'current-user-id';
    
    const transferData: Partial<EmployeeTransfer> = {
      ...formData,
      initiatedBy: currentUserId,
      initiationDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      transferStatus: 'Pending', // Default status
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      isTemporary: formData.isTemporary || false,
      temporaryEndDate: formData.temporaryEndDate,
      probationApplicable: formData.probationApplicable || false,
      probationEndDate: formData.probationEndDate,
      relocationAllowance: formData.relocationAllowance || 0,
      employeeConsent: formData.employeeConsent || false,
      consentDate: formData.consentDate,
      notes: formData.notes || ''
    };

    this.transferService.createTransfer(transferData).subscribe({
      next: (createdTransfer) => {
        this.isSaving = false;
        this.modalService.dismissAll();
        this.showSuccess('Transfer created successfully!');
        this.loadTransfers(); // Refresh the transfers list
      },
      error: (error) => {
        console.error('Error creating transfer:', error);
        this.isSaving = false;
        this.showError('Failed to create transfer. Please try again.');
      }
    });
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
    console.log('Exporting transfers:', this.filteredTransfers);
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
