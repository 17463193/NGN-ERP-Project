import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

interface Separation {
  id?: string;
  employeeName: string;
  employeeId: string;
  department: string;
  position: string;
  separationDate: string;
  separationType: 'Voluntary' | 'Involuntary' | 'Retirement' | 'Resignation' | 'Termination' | string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  lastWorkingDate?: string;
  reason?: string;
  notes?: string;
  approvedBy?: string;
  approvedDate?: string;
  exitInterviewDate?: string;
  clearanceStatus?: 'Pending' | 'In Progress' | 'Completed';
}

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
export class EmpSeparationComponent implements OnInit {
  // Data
  separations: Separation[] = [];
  filteredSeparations: Separation[] = [];
  currentSeparation: Separation | null = null;
  
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

  positions = [
    'Manager',
    'Team Lead',
    'Senior Developer',
    'Developer',
    'HR Executive',
    'Accountant',
    'Marketing Executive',
    'Sales Executive',
    'Support Executive'
  ];
  
  // Template Refs
  @ViewChild('separationModal') private separationModalRef!: TemplateRef<any>;
  @ViewChild('viewSeparationModal') private viewSeparationModalRef!: TemplateRef<any>;
  private modalRef: any;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal
  ) {
    this.form = this.fb.group({
      employeeName: ['', Validators.required],
      employeeId: ['', Validators.required],
      department: ['', Validators.required],
      position: ['', Validators.required],
      separationDate: ['', Validators.required],
      separationType: ['', Validators.required],
      lastWorkingDate: ['', Validators.required],
      status: ['Pending'],
      reason: [''],
      notes: [''],
      exitInterviewDate: [''],
      clearanceStatus: ['Pending'],
      approvedBy: [''],
      approvedDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadSeparations();
  }

  loadSeparations(): void {
    // Mock data for demonstration
    this.separations = [
      {
        id: '1',
        employeeName: 'John Doe',
        employeeId: 'EMP-001',
        department: 'Information Technology',
        position: 'Senior Developer',
        separationDate: '2025-08-15',
        separationType: 'Resignation',
        status: 'Approved',
        lastWorkingDate: '2025-08-31',
        reason: 'Better opportunity',
        exitInterviewDate: '2025-08-20',
        clearanceStatus: 'In Progress',
        approvedBy: 'Jane Smith (HR Manager)',
        approvedDate: '2025-08-10'
      },
      {
        id: '2',
        employeeName: 'Alice Johnson',
        employeeId: 'EMP-042',
        department: 'Marketing',
        position: 'Marketing Executive',
        separationDate: '2025-09-01',
        separationType: 'Retirement',
        status: 'Pending',
        lastWorkingDate: '2025-10-01',
        reason: 'Retirement after 30 years of service',
        clearanceStatus: 'Pending'
      }
    ];
    this.filteredSeparations = [...this.separations];
    this.updatePagination();
  }

  applySearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredSeparations = [...this.separations];
      this.updatePagination();
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredSeparations = this.separations.filter(separation => 
      separation.employeeName.toLowerCase().includes(query) ||
      separation.employeeId.toLowerCase().includes(query) ||
      separation.department.toLowerCase().includes(query) ||
      separation.separationType.toLowerCase().includes(query) ||
      separation.status.toLowerCase().includes(query)
    );
    
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredSeparations.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  get paginatedSeparations(): Separation[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSeparations.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentSeparation = null;
    this.form.reset({
      status: 'Pending',
      clearanceStatus: 'Pending',
      separationDate: new Date().toISOString().split('T')[0],
      lastWorkingDate: this.addDays(new Date(), 15).toISOString().split('T')[0]
    });
    this.modalRef = this.modalService.open(this.separationModalRef, { size: 'lg' });
  }

  openEditModal(separation: Separation): void {
    this.isEditMode = true;
    this.currentSeparation = { ...separation };
    this.form.patchValue({
      ...separation,
      separationDate: this.formatDateForInput(separation.separationDate),
      lastWorkingDate: separation.lastWorkingDate ? this.formatDateForInput(separation.lastWorkingDate) : '',
      exitInterviewDate: separation.exitInterviewDate ? this.formatDateForInput(separation.exitInterviewDate) : ''
    });
    this.modalRef = this.modalService.open(this.separationModalRef, { size: 'lg' });
  }

  openViewModal(separation: Separation): void {
    this.currentSeparation = separation;
    this.modalRef = this.modalService.open(this.viewSeparationModalRef, { size: 'lg' });
  }

  saveSeparation(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.value;
    const separation: Separation = {
      ...formData,
      id: this.isEditMode && this.currentSeparation?.id 
        ? this.currentSeparation.id 
        : Math.random().toString(36).substr(2, 9),
      approvedBy: formData.status === 'Approved' 
        ? 'System Admin' 
        : (this.currentSeparation?.approvedBy || ''),
      approvedDate: formData.status === 'Approved' 
        ? new Date().toISOString().split('T')[0]
        : (this.currentSeparation?.approvedDate || '')
    };

    if (this.isEditMode) {
      const index = this.separations.findIndex(s => s.id === separation.id);
      if (index !== -1) {
        this.separations[index] = separation;
      }
      this.showSuccess('Separation updated successfully');
    } else {
      this.separations.unshift(separation);
      this.showSuccess('Separation added successfully');
    }

    this.filteredSeparations = [...this.separations];
    this.updatePagination();
    this.modalRef.close();
  }

  confirmDelete(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this separation record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteSeparation(id);
      }
    });
  }

  deleteSeparation(id: string): void {
    const index = this.separations.findIndex(s => s.id === id);
    if (index !== -1) {
      this.separations.splice(index, 1);
      this.filteredSeparations = this.filteredSeparations.filter(s => s.id !== id);
      this.updatePagination();
      this.showSuccess('Separation deleted successfully');
    }
  }

  exportSeparations(): void {
    console.log('Exporting separations:', this.filteredSeparations);
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

  getClearanceStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'bg-success';
      case 'In Progress':
        return 'bg-primary';
      case 'Pending':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
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
