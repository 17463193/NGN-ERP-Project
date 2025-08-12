import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { EmployeeTransferService } from '../../../services/employee-transfer.service';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

interface Transfer {
  id?: string;
  employeeName: string;
  employeeId: string;
  currentDepartment: string;
  newDepartment: string;
  transferDate: string;
  transferType: 'Permanent' | 'Temporary' | 'Lateral' | 'Promotion' | string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  effectiveDate?: string;
  reason?: string;
  notes?: string;
  approvedBy?: string;
  approvedDate?: string;
}

interface TransferType {
  transferTypeId: string;
  orgId: string;
  transferName: string;
  transferCode: string;
  category: string;
  requiresConsent: boolean;
  hasProbation: boolean;
  probationDays: number;
  createdDate: string;
}

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
  templateUrl: './emp-type.component.html',
  styleUrls: ['./emp-type.component.scss']
})
export class EmpTypeComponent implements OnInit {
  // Data
  transfers: Transfer[] = [];
  filteredTransfers: Transfer[] = [];
  currentTransfer: Transfer | null = null;
  transferTypes: TransferType[] = [];
  filteredTransferTypes: TransferType[] = [];
  organizations: any[] = [];
  searchQuery: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 1;
  pages: number[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  // Form state
  form: FormGroup;
  isEditMode = false;

  // Search and filter state
  searchQueryTransfer = '';

  // Pagination
  currentPageTransfer = 1;
  itemsPerPageTransfer = 10;
  totalPagesTransfer = 1;

  // UI State
  isLoadingTransfer = false;
  errorMessageTransfer = '';

  // Dropdown options
  departments = [
    'Human Resources',
    'Finance',
    'Information Technology',
    'Marketing',
    'Operations',
    'Sales',
    'Customer Support',
    'Research & Development',
    'Administration'
  ];

  // Template Refs
  @ViewChild('transferModal') private transferModalRef!: TemplateRef<any>;
  @ViewChild('viewTransferModal') private viewTransferModalRef!: TemplateRef<any>;
  private modalRef: any;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private http: HttpClient,
    private employeeTransferService: EmployeeTransferService
  ) {
    this.form = this.fb.group({
      transferTypeId: [''],
      orgId: [''],
      transferName: ['', [Validators.required, Validators.maxLength(100)]],
      transferCode: ['', [Validators.required, Validators.maxLength(20)]],
      category: ['', [Validators.required, Validators.maxLength(50)]],
      transferType: ['', [Validators.required]],
      status: ['Pending', [Validators.required]],
      effectiveDate: [''],
      reason: [''],
      requiresConsent: [false],
      hasProbation: [false],
      probationDays: [0, [Validators.min(0), Validators.max(365)]]
    });
  }

  loadOrganizations(): void {
    this.isLoading = true;
    this.http.get(`${environment.apiUrl}/api/v1/organizations`).subscribe({
      next: (data: any) => {
        this.organizations = data || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.errorMessage = 'Failed to load organizations. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  ngOnInit(): void {
    this.loadTransferTypes();
    this.loadOrganizations();
  }

  openTransferModal(): void {
    this.isEditMode = false;
    this.form.reset({
      transferTypeId: '',
      orgId: '',
      transferName: '',
      transferCode: '',
      category: '',
      transferType: '',
      status: 'Pending',
      effectiveDate: '',
      requiresConsent: false,
      hasProbation: false,
      probationDays: 0
    });
    this.modalService.open(this.transferModalRef, { size: 'lg', centered: true });
  }
  
  onProbationToggle(): void {
    const hasProbation = this.form.get('hasProbation')?.value;
    const probationDaysControl = this.form.get('probationDays');
    
    if (hasProbation) {
      probationDaysControl?.setValidators([Validators.required, Validators.min(1), Validators.max(365)]);
    } else {
      probationDaysControl?.clearValidators();
      probationDaysControl?.setValue(0);
    }
    probationDaysControl?.updateValueAndValidity();
  }

  editTransferType(transferType: TransferType): void {
    this.isEditMode = true;
    // Set form values for editing
    this.form.patchValue({
      transferTypeId: transferType.transferTypeId,
      orgId: transferType.orgId,
      transferName: transferType.transferName,
      transferCode: transferType.transferCode,
      category: transferType.category,
      requiresConsent: transferType.requiresConsent,
      hasProbation: transferType.hasProbation,
      probationDays: transferType.probationDays || 0
    });
    
    // Update validators based on probation status
    if (transferType.hasProbation) {
      this.form.get('probationDays')?.setValidators([Validators.required, Validators.min(1), Validators.max(365)]);
    } else {
      this.form.get('probationDays')?.clearValidators();
    }
    this.form.get('probationDays')?.updateValueAndValidity();
    
    // Open the modal
    this.modalService.open(this.transferModalRef, { size: 'lg', centered: true });
  }

  deleteTransferType(transferTypeId: string): void {
    // Show confirmation dialog
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        // Call delete API here
        this.employeeTransferService.deleteTransferType(transferTypeId).subscribe({
          next: () => {
            Swal.fire(
              'Deleted!',
              'The transfer type has been deleted.',
              'success'
            );
            // Reload the transfer types
            this.loadTransferTypes();
          },
          error: (error) => {
            console.error('Error deleting transfer type:', error);
            Swal.fire(
              'Error!',
              'There was an error deleting the transfer type.',
              'error'
            );
          }
        });
      }
    });
  }

  loadTransfers(): void {
    // Mock data for demonstration
    this.transfers = [
      {
        id: '1',
        employeeName: 'John Doe',
        employeeId: 'EMP-001',
        currentDepartment: 'Information Technology',
        newDepartment: 'Research & Development',
        transferDate: '2025-09-01',
        transferType: 'Lateral',
        status: 'Approved',
        effectiveDate: '2025-09-15',
        reason: 'Better alignment with skills and project requirements',
        approvedBy: 'Jane Smith (HR Manager)',
        approvedDate: '2025-08-25'
      },
      {
        id: '2',
        employeeName: 'Alice Johnson',
        employeeId: 'EMP-042',
        currentDepartment: 'Marketing',
        newDepartment: 'Sales',
        transferDate: '2025-10-01',
        transferType: 'Permanent',
        status: 'Pending',
        reason: 'Career growth opportunity',
        notes: 'Requires additional training'
      }
    ];
    this.filteredTransfers = [...this.transfers];
    this.updatePaginationTransfer();
  }

  loadTransferTypes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.employeeTransferService.getTransferTypes().subscribe({
      next: (response: any) => {
        console.log('Transfer types loaded:', response); // Debug log
        
        // Handle different response formats
        let transferTypes: TransferType[] = [];
        
        if (Array.isArray(response)) {
          // If response is already an array, use it directly
          transferTypes = response;
        } else if (response && Array.isArray(response.data)) {
          // If response has a data property that's an array, use that
          transferTypes = response.data;
        } else if (response && response.data && typeof response.data === 'object') {
          // If data is an object, convert it to an array
          transferTypes = Object.values(response.data);
        }
        
        console.log('Processed transfer types:', transferTypes); // Debug log
        
        this.transferTypes = transferTypes;
        this.filteredTransferTypes = [...this.transferTypes];
        this.updatePagination();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading transfer types:', error);
        this.errorMessage = 'Failed to load transfer types. Please try again later.';
        this.isLoading = false;
        
        // For debugging - log the error details
        if (error.error) {
          console.error('Error details:', error.error);
        }
      }
    });
  }
  

  
  saveTransferType(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.isLoading = true;
    const formData = this.form.getRawValue();
    
    // Prepare the transfer type data according to the API expected format
    const transferTypeData: any = {
      transferTypeId: formData.transferTypeId || this.generateUUID(),
      orgId: formData.orgId || this.organizations[0]?.orgId || '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      transferName: formData.transferName,
      transferCode: formData.transferCode,
      category: formData.category,
      transferType: formData.transferType,
      status: formData.status || 'Active',
      effectiveDate: formData.effectiveDate || null,
      requiresConsent: Boolean(formData.requiresConsent),
      hasProbation: Boolean(formData.hasProbation),
      probationDays: formData.hasProbation ? Number(formData.probationDays) : 0,
      createdDate: this.isEditMode 
        ? (formData.createdDate || new Date().toISOString())
        : new Date().toISOString()
    };
    
    // Remove any undefined or null values that might cause issues
    Object.keys(transferTypeData).forEach(key => {
      if (transferTypeData[key] === undefined || transferTypeData[key] === null) {
        delete transferTypeData[key];
      }
    });
    
    console.log('Sending transfer type data:', JSON.stringify(transferTypeData, null, 2));
    
    const request$ = this.isEditMode
      ? this.employeeTransferService.updateTransferType(transferTypeData)
      : this.employeeTransferService.createTransferType(transferTypeData);
    
    request$.subscribe({
      next: (response) => {
        console.log('Transfer type saved successfully:', response);
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `Transfer type ${this.isEditMode ? 'updated' : 'created'} successfully.`,
          timer: 2000,
          showConfirmButton: false
        });
        this.loadTransferTypes();
        this.modalService.dismissAll();
        this.form.reset({
          status: 'Pending',
          requiresConsent: false,
          hasProbation: false,
          probationDays: 0
        });
        this.isEditMode = false;
      },
      error: (error) => {
        console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} transfer type:`, error);
        this.isLoading = false;
        
        let errorMessage = `Failed to ${this.isEditMode ? 'update' : 'create'} transfer type. `;
        
        if (error.error && error.error.message) {
          errorMessage += error.error.message;
        } else if (error.status === 0) {
          errorMessage += 'Unable to connect to the server. Please check your connection.';
        } else if (error.status === 500) {
          errorMessage += 'Server error occurred. Please try again later.';
        } else {
          errorMessage += 'An unexpected error occurred.';
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
      }
    });
  }
  
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
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
    if (!this.searchQueryTransfer.trim()) {
      this.filteredTransfers = [...this.transfers];
      this.updatePaginationTransfer();
      return;
    }

    const query = this.searchQueryTransfer.toLowerCase().trim();
    this.filteredTransfers = this.transfers.filter(transfer =>
      transfer.employeeName.toLowerCase().includes(query) ||
      transfer.employeeId.toLowerCase().includes(query) ||
      transfer.currentDepartment.toLowerCase().includes(query) ||
      transfer.newDepartment.toLowerCase().includes(query) ||
      transfer.transferType.toLowerCase().includes(query)
    );

    this.currentPageTransfer = 1;
    this.updatePaginationTransfer();
  }

  applySearchTransferType(): void {
    if (!this.searchQuery.trim()) {
      this.filteredTransferTypes = [...this.transferTypes];
    } else {
      const query = this.searchQuery.toLowerCase().trim();
      this.filteredTransferTypes = this.transferTypes.filter(type =>
        type.transferName.toLowerCase().includes(query) ||
        type.transferCode.toLowerCase().includes(query) ||
        type.category.toLowerCase().includes(query)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePaginationTransfer(): void {
    this.totalItems = this.filteredTransfers.length;
    this.totalPagesTransfer = Math.ceil(this.totalItems / this.itemsPerPageTransfer);
    this.pages = Array.from({ length: this.totalPagesTransfer }, (_, i) => i + 1);
    
    // Reset to first page if current page is out of bounds
    if (this.currentPageTransfer > this.totalPagesTransfer && this.totalPagesTransfer > 0) {
      this.currentPageTransfer = 1;
    }
  }

  updatePagination(): void {
    this.totalItems = this.filteredTransferTypes.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    // Reset to first page if current page is out of bounds
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
  }

  get paginatedTransfers(): Transfer[] {
    if (!this.filteredTransfers.length) return [];
    
    const startIndex = (this.currentPageTransfer - 1) * this.itemsPerPageTransfer;
    return this.filteredTransfers.slice(startIndex, startIndex + this.itemsPerPageTransfer);
  }

  get paginatedTransferTypes(): TransferType[] {
    if (!this.filteredTransferTypes.length) return [];
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTransferTypes.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPagesTransfer) {
      this.currentPageTransfer = page;
    }
  }

  onPageChangeTransferType(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentTransfer = null;
    this.form.reset({
      transferTypeId: '',
      orgId: '',
      transferName: '',
      transferCode: '',
      category: '',
      requiresConsent: false,
      hasProbation: false,
      probationDays: 0
    });
    this.modalRef = this.modalService.open(this.transferModalRef, { size: 'lg' });
  }

  openEditModal(transfer: Transfer): void {
    this.isEditMode = true;
    this.currentTransfer = { ...transfer };
    
    // Only patch values that exist in the form
    const formValue: any = { ...transfer };
    
    // Remove any properties that don't exist in the form
    Object.keys(formValue).forEach(key => {
      if (!this.form.contains(key)) {
        delete formValue[key];
      }
    });
    
    this.form.patchValue(formValue);
    this.modalRef = this.modalService.open(this.transferModalRef, { size: 'lg' });
  }

  openViewModal(transfer: Transfer): void {
    this.currentTransfer = transfer;
    this.modalRef = this.modalService.open(this.viewTransferModalRef, { size: 'lg' });
  }

  saveTransfer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.value;
    const transfer: Transfer = {
      ...formData,
      id: this.isEditMode && this.currentTransfer?.id 
        ? this.currentTransfer.id 
        : Math.random().toString(36).substr(2, 9),
      approvedBy: formData.status === 'Approved' 
        ? 'System Admin' 
        : (this.currentTransfer?.approvedBy || ''),
      approvedDate: formData.status === 'Approved' 
        ? new Date().toISOString().split('T')[0]
        : (this.currentTransfer?.approvedDate || '')
    };

    if (this.isEditMode) {
      const index = this.transfers.findIndex(t => t.id === transfer.id);
      if (index !== -1) {
        this.transfers[index] = transfer;
      }
      this.showSuccess('Transfer updated successfully');
    } else {
      this.transfers.unshift(transfer);
      this.showSuccess('Transfer added successfully');
    }

    this.filteredTransfers = [...this.transfers];
    this.updatePagination();
    this.modalRef.close();
  }

  confirmDelete(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this transfer record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteTransfer(id);
      }
    });
  }

  deleteTransfer(id: string): void {
    const index = this.transfers.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transfers.splice(index, 1);
      this.filteredTransfers = this.filteredTransfers.filter(t => t.id !== id);
      this.updatePagination();
      this.showSuccess('Transfer deleted successfully');
    }
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