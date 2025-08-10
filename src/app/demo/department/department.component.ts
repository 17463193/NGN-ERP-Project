import { Component, HostListener, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentService, Department, DepartmentListResponse, DepartmentResponse, Organization, Branch } from '../../services/department.service';

interface DepartmentTableItem extends Department {
  org_name: string;
  branch_name: string;
  sub_departments_count: number;
  status?: boolean;
}
import { HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [
    CommonModule, 
    HttpClientModule, 
    ReactiveFormsModule,
    FormsModule,
    NgbModule
  ],
  templateUrl: './department.component.html',
  styleUrls: ['./department.component.scss']
})
export class DepartmentComponent implements OnInit {
  departments: DepartmentTableItem[] = [];
  filteredDepartments: DepartmentTableItem[] = [];
  organizations: Partial<Organization>[] = [];
  branches: Partial<Branch>[] = [];
  showFilters = false;
  currentPage = 1;
  itemsPerPage = 10;
  private _totalPages = 1;
  private _paginatedDepartments: DepartmentTableItem[] = [];
  departmentForm: FormGroup;
  isEditMode = false;
  currentDepartmentId: string | null = null;
  error: string | null = null;
  isLoading = false;
  isLoadingOrganizations = false;
  isLoadingBranches = false;
  isSubmitting = false;
  private modalRef!: NgbModalRef;

  @ViewChild('departmentModal') departmentModal!: TemplateRef<any>;

  constructor(
    private departmentService: DepartmentService,
    private fb: FormBuilder,
    private modalService: NgbModal
  ) {
    this.departmentForm = this.fb.group({
      dept_name: ['', [Validators.required, Validators.minLength(3)]],
      dept_code: ['', [Validators.required]],
      org_id: ['', [Validators.required]],
      branch_id: ['', [Validators.required]],
      parent_dept_id: [''],
      dept_head_id: [''],
      budget_allocation: [0, [Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadDepartments();
    this.loadOrganizations();
    this.loadBranches();
    this.updatePagination();
  }

  initializeForm() {
    this.departmentForm = this.fb.group({
      dept_name: ['', [Validators.required, Validators.minLength(3)]],
      dept_code: ['', [Validators.required]],
      org_id: ['', [Validators.required]],
      branch_id: ['', [Validators.required]],
      parent_dept_id: [''],
      dept_head_id: [''],
      budget_allocation: [0, [Validators.min(0)]]
    });
  }

  private updatePagination() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.filteredDepartments = [...this.departments];
    this._paginatedDepartments = this.filteredDepartments.slice(startIndex, endIndex);
    this._totalPages = Math.ceil(this.filteredDepartments.length / this.itemsPerPage);
  }

  loadDepartments(): void {
    this.isLoading = true;
    this.error = null;
    
    this.departmentService.getDepartments().subscribe({
      next: (response: DepartmentListResponse) => {
        if (response && response.success) {
          this.departments = response.data.map(dept => ({
            ...dept,
            org_name: dept.organization?.orgName || 'N/A',
            branch_name: dept.branch?.branchName || 'N/A',
            sub_departments_count: dept.sub_departments?.length || 0
          }));
          this.updatePagination();
        } else {
          this.error = response?.message || 'Failed to load departments';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error loading departments. Please try again.';
        this.isLoading = false;
        console.error('Error loading departments:', err);
      }
    });
  }

  get totalPages(): number {
    return this._totalPages;
  }

  get paginatedDepartments(): DepartmentTableItem[] {
    return this._paginatedDepartments;
  }

  get showPagination(): boolean {
    return this.filteredDepartments.length > this.itemsPerPage;
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const filterContainer = document.querySelector('.filter-container');
    
    if (filterContainer && !filterContainer.contains(target)) {
      this.showFilters = false;
    }
  }

  toggleFilters(event: Event) {
    event.stopPropagation();
    this.showFilters = !this.showFilters;
  }

  closeFilters() {
    this.showFilters = false;
  }

  loadOrganizations() {
    this.isLoadingOrganizations = true;
    this.departmentService.getOrganizations().subscribe({
      next: (data: any[]) => {
        this.organizations = data.map(org => ({
          orgId: org.orgId,
          orgName: org.orgName,
          orgCode: org.orgCode
        } as Partial<Organization>));
        this.isLoadingOrganizations = false;
      },
      error: (err) => {
        console.error('Error loading organizations:', err);
        this.isLoadingOrganizations = false;
      }
    });
  }

  loadBranches() {
    this.isLoadingBranches = true;
    this.departmentService.getBranches().subscribe({
      next: (data: any[]) => {
        this.branches = data.map(branch => ({
          branchId: branch.branchId,
          branchName: branch.branchName,
          branchCode: branch.branchCode
        } as Partial<Branch>));
        this.isLoadingBranches = false;
      },
      error: (err) => {
        console.error('Error loading branches:', err);
        this.isLoadingBranches = false;
      }
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentDepartmentId = null;
    this.resetForm();
    this.error = null;
    this.modalRef = this.modalService.open(this.departmentModal, { 
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
  }

  openEditModal(department: Department) {
    this.isEditMode = true;
    this.currentDepartmentId = department.dept_id;
    this.error = null;
    this.isLoading = true;

    // Fetch complete department details
    this.departmentService.getDepartmentById(department.dept_id).subscribe({
      next: (response: DepartmentResponse) => {
        if (response && response.success) {
          const dept = response.data;
          // Set form values with the detailed department data
          this.departmentForm.patchValue({
            org_id: dept.organization?.orgId || '',
            branch_id: dept.branch?.branchId || '',
            dept_name: dept.dept_name,
            dept_code: dept.dept_code,
            parent_dept_id: dept.parent_department?.dept_id || '',
            dept_head_id: dept.dept_head_id || '',
            budget_allocation: dept.budget_allocation || 0
          });

          this.modalRef = this.modalService.open(this.departmentModal, { 
            size: 'lg',
            backdrop: 'static',
            keyboard: false
          });
        } else {
          this.error = response?.message || 'Failed to load department details';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error loading department details. Please try again.';
        this.isLoading = false;
        console.error('Error loading department:', err);
      }
    });
  }

  private resetForm() {
    this.departmentForm.reset();
    this.isEditMode = false;
    this.currentDepartmentId = null;
  }

  onSubmit() {
    if (this.departmentForm.invalid) {
      return;
    }
    this.isSubmitting = true;
    this.error = null;
    
    const formData = {
      ...this.departmentForm.value,
      approval_hierarchy: JSON.stringify({ levels: ["manager", "director", "ceo"] }),
      reporting_structure: JSON.stringify({ structure: "hierarchical" })
    };

    const submitObservable = this.isEditMode && this.currentDepartmentId
      ? this.departmentService.updateDepartment(this.currentDepartmentId, formData)
      : this.departmentService.createDepartment(formData);

    submitObservable.subscribe({
      next: (response) => {
        if (response && response.success) {
          this.loadDepartments();
          this.modalRef.close();
          this.resetForm();
        } else {
          this.error = response?.message || 
            (this.isEditMode ? 'Failed to update department' : 'Failed to create department');
        }
        this.isSubmitting = false;
      },
      error: (err) => {
        this.error = this.isEditMode 
          ? 'Error updating department. Please try again.'
          : 'Error creating department. Please try again.';
        this.isSubmitting = false;
        console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} department:`, err);
      }
    });
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.updatePagination();
  }
}
