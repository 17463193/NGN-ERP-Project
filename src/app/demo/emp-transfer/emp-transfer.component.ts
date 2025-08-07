import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
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
export class EmpTransferComponent implements OnInit {
  // Data
  transfers: Transfer[] = [];
  filteredTransfers: Transfer[] = [];
  currentTransfer: Transfer | null = null;
  
  // Form state
  form: FormGroup;
  isEditMode = false;
  
  // Search and filter state
  searchQuery = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  
  // UI State
  isLoading = false;
  errorMessage = '';
  
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
    private modalService: NgbModal
  ) {
    this.form = this.fb.group({
      employeeName: ['', Validators.required],
      employeeId: ['', Validators.required],
      currentDepartment: ['', Validators.required],
      newDepartment: ['', Validators.required],
      transferDate: ['', Validators.required],
      transferType: ['', Validators.required],
      status: ['Pending'],
      effectiveDate: [''],
      reason: [''],
      notes: [''],
      approvedBy: [''],
      approvedDate: ['']
    }, { validators: this.departmentValidator });
  }

  ngOnInit(): void {
    this.loadTransfers();
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
    this.updatePagination();
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
    if (!this.searchQuery.trim()) {
      this.filteredTransfers = [...this.transfers];
      this.updatePagination();
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredTransfers = this.transfers.filter(transfer => 
      transfer.employeeName.toLowerCase().includes(query) ||
      transfer.employeeId.toLowerCase().includes(query) ||
      transfer.currentDepartment.toLowerCase().includes(query) ||
      transfer.newDepartment.toLowerCase().includes(query) ||
      transfer.transferType.toLowerCase().includes(query)
    );
    
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTransfers.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  get paginatedTransfers(): Transfer[] {
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

  openEditModal(transfer: Transfer): void {
    this.isEditMode = true;
    this.currentTransfer = { ...transfer };
    this.form.patchValue({
      ...transfer,
      transferDate: this.formatDateForInput(transfer.transferDate),
      effectiveDate: transfer.effectiveDate ? this.formatDateForInput(transfer.effectiveDate) : ''
    });
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
