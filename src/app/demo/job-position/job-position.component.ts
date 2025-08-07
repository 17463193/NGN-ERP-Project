import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { JobPositionService, Position} from '../../services/job-position.service';
import { finalize } from 'rxjs/operators';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-job-position',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModule,
    HttpClientModule,
    FormsModule,
    RouterModule
  ],
  providers: [JobPositionService],
  templateUrl: './job-position.component.html',
  styleUrls: ['./job-position.component.scss']
})
export class JobPositionComponent implements OnInit {
  positions: Position[] = [];
  filteredPositions: Position[] = [];
  organizations: any[] = [];
  grades: any[] = [];
  isLoading = false;
  isOrgLoading = true;
  isEditing = false;
  isFilterOpen = false;
  
  // Filter options
  filterOptions = {
    grades: new Set<string>(),
    positionNames: new Set<string>(),
    selectedGrades: new Set<string>(),
    selectedPositionNames: new Set<string>()
  };
  
  // Show all toggle states for filter dropdowns
  showAllPositionNames = false;
  showAllGrades = false;
  
  // Track expanded/collapsed state of filter sections
  filterSections = {
    positionNames: true,
    grades: true
  };
  
  // Error handling
  errorMessage: string | null = null;
  
  // Search term
  searchTerm = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  
  currentPositionId: string | null = null;
  modalRef: any;
  positionForm: FormGroup;
  orgId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private jobPositionService: JobPositionService
  ) {
    this.positionForm = this.fb.group({
      orgId: [{value: this.orgId, disabled: false}, Validators.required],
      positionName: ['', [Validators.required, Validators.minLength(3)]],
      positionCode: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9-]+$')]],
      gradeId: ['', Validators.required],
      skillRequirements: ['', Validators.required],
      reportingManagerPosition: [''],
      jobDescription: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadPositions();
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.isOrgLoading = true;
    this.jobPositionService.getOrganizations().subscribe({
      next: (orgs) => {

        this.organizations = Array.isArray(orgs) ? orgs : [];
        
        if (this.organizations.length > 0) {
          // Make sure we're using the raw orgId without any prefixes
          this.orgId = this.organizations[0].orgId;
          // Update the form control with just the orgId
          this.positionForm.patchValue({ orgId: this.orgId });
          // Load grades for the first organization
          this.loadGrades();
        }
        

      },
      error: (error) => {

        this.organizations = [];
        this.isOrgLoading = false;
      },
      complete: () => {
        this.isOrgLoading = false;
      }
    });
  }

  onOrganizationChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    // Get the selected option
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    // Get the raw value (which might include the display text)
    const rawValue = selectedOption.value;
    
    // Extract just the UUID part (handle the case where it's in format "1: uuid")
    const newOrgId = rawValue.includes(':') 
      ? rawValue.split(':')[1].trim() 
      : rawValue;
    
    // Only proceed if the organization actually changed
    if (newOrgId === this.orgId) {
      return;
    }
    
    this.orgId = newOrgId;
    
    // Reset the grade selection when organization changes
    this.positionForm.patchValue({ 
      gradeId: ''
    });
    
    if (this.orgId && this.orgId !== 'null') {
      this.loadGrades();
    } else {
      this.grades = [];
      this.orgId = null;
    }
  }

  loadGrades(): void {
    if (!this.orgId) {

      this.grades = [];
      return;
    }
    

    this.jobPositionService.getGrades(this.orgId).subscribe({
      next: (grades: any) => {

        this.grades = Array.isArray(grades) ? grades : [];

      },
      error: (error) => {

        this.grades = [];
      },
      complete: () => {

      }
    });
  }

  initializeFilterOptions(): void {
    this.filterOptions.grades = new Set();
    this.filterOptions.positionNames = new Set();

    this.positions.forEach(position => {
      if (position.gradeName) this.filterOptions.grades.add(position.gradeName);
      if (position.positionName) this.filterOptions.positionNames.add(position.positionName);
    });
  }

  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;
    if (this.isFilterOpen) {
      this.initializeFilterOptions();
    }
  }

  toggleFilterSection(section: 'positionNames' | 'grades'): void {
    this.filterSections[section] = !this.filterSections[section];
  }

  toggleFilterOption(type: 'grades' | 'positionNames', value: string): void {
    const selectedSet = this.filterOptions[`selected${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof this.filterOptions] as Set<string>;
    
    if (selectedSet.has(value)) {
      selectedSet.delete(value);
    } else {
      selectedSet.add(value);
    }
    
    this.applyFilters();
  }

  toggleShowAll(type: 'grades' | 'positionNames'): void {
    if (type === 'grades') {
      this.showAllGrades = !this.showAllGrades;
    } else if (type === 'positionNames') {
      this.showAllPositionNames = !this.showAllPositionNames;
    }
  }

  isSelected(set: Set<string>, value: string): boolean {
    return set.has(value);
  }

  setToArray(set: Set<string>): string[] {
    return Array.from(set);
  }

  isFilterActive(): boolean {
    return this.filterOptions.selectedGrades.size > 0 || 
           this.filterOptions.selectedPositionNames.size > 0;
  }

  clearFilters(): void {
    this.filterOptions.selectedGrades.clear();
    this.filterOptions.selectedPositionNames.clear();
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredPositions = this.positions.filter(position => {
      const matchesGrade = this.filterOptions.selectedGrades.size === 0 || 
                         (position.gradeName && this.filterOptions.selectedGrades.has(position.gradeName));
      
      const matchesPosition = this.filterOptions.selectedPositionNames.size === 0 ||
                            (position.positionName && this.filterOptions.selectedPositionNames.has(position.positionName));
      
      const matchesSearch = !this.searchTerm || 
                          (position.positionName && position.positionName.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
                          (position.positionCode && position.positionCode.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      return matchesGrade && matchesPosition && matchesSearch;
    });
    
    this.currentPage = 1; // Reset to first page when filters change
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPositions.length / this.itemsPerPage);
  }

  get paginatedPositions(): Position[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPositions.slice(startIndex, startIndex + this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxPages = 5; // Show max 5 page numbers in the pagination
    
    if (this.totalPages <= maxPages) {
      // If total pages are less than max pages, show all
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);
      
      // Calculate start and end of the middle section
      let start = Math.max(2, this.currentPage - 1);
      let end = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      // Adjust if we're near the start or end
      if (this.currentPage <= 3) {
        end = 3;
      } else if (this.currentPage >= this.totalPages - 2) {
        start = this.totalPages - 2;
      }
      
      // Add ellipsis if needed after first page
      if (start > 2) {
        pages.push(-1); // -1 represents ellipsis
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        if (i > 1 && i < this.totalPages) {
          pages.push(i);
        }
      }
      
      // Add ellipsis if needed before last page
      if (end < this.totalPages - 1) {
        pages.push(-1); // -1 represents ellipsis
      }
      
      // Always include last page
      if (this.totalPages > 1) {
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  private loadPositions(): void {
    this.isLoading = true;
    this.jobPositionService.getPositions()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: any) => {
          if (Array.isArray(response)) {
            this.positions = response;
          } else if (response && Array.isArray(response.data)) {
            this.positions = response.data;
          } else {
            this.positions = [];

          }
          
          // Apply any active filters to the new data
          this.applyFilters();
        },
        error: (error) => {

          this.positions = [];
          this.filteredPositions = [];
        }
      });
  }

  openAddModal(modal: any): void {
    this.isEditing = false;
    this.currentPositionId = null;
    this.positionForm.reset();
    this.modalRef = this.modalService.open(modal, { centered: true });
  }

  openEditModal(modal: any, position: Position): void {
    this.isEditing = true;
    this.currentPositionId = position.positionId;
    this.positionForm.patchValue({
      orgId: position.orgId,
      positionName: position.positionName,
      positionCode: position.positionCode,
      gradeId: position.gradeId,
      skillRequirements: position.skillRequirements,
      reportingManagerPosition: position.reportingManagerPosition,
      successionPlanning: position.successionPlanning || '',
      jobDescription: position.jobDescription
    });
    this.modalRef = this.modalService.open(modal, { centered: true });
  }

  savePosition(): void {
    if (this.positionForm.invalid) {
      Object.values(this.positionForm.controls).forEach(control => {
        control.markAsTouched();
      });
      return;
    }

    const formValue = this.positionForm.getRawValue();
    const positionData = {
      orgId: formValue.orgId,
      positionName: formValue.positionName,
      positionCode: formValue.positionCode,
      gradeId: formValue.gradeId,
      skillRequirements: formValue.skillRequirements,
      reportingManagerPosition: formValue.reportingManagerPosition,
      successionPlanning: formValue.successionPlanning || '',
      jobDescription: formValue.jobDescription
    };

    const isEdit = this.isEditing && this.currentPositionId;
    const operation = isEdit
      ? this.jobPositionService.updatePosition(this.currentPositionId, positionData)
      : this.jobPositionService.createPosition(positionData);

    // Show loading indicator
    Swal.fire({
      title: isEdit ? 'Updating Position...' : 'Creating Position...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (popup) {
          const button = popup.querySelector('button');
          if (button) {
            Swal.showLoading(button);
          }
        }
      }
    });

    operation.subscribe({
      next: () => {
        // Close any open modals
        if (this.modalRef) {
          this.modalRef.close();
        }
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: isEdit ? 'Updated!' : 'Created!',
          text: `Position has been ${isEdit ? 'updated' : 'created'} successfully.`,
          timer: 1500,
          showConfirmButton: false
        });
        this.loadPositions();
        this.closeModal();
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Failed to ${isEdit ? 'update' : 'create'} position. ${error?.error?.message || 'Please try again.'}`,
          confirmButtonText: 'OK'
        });
      }
    });
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
  }

  viewPosition(position: Position): void {
    Swal.fire({
      title: position.positionName,
      html: `
        <div class="text-start">
          <p><strong>Position Code:</strong> ${position.positionCode || 'N/A'}</p>
          <p><strong>Grade:</strong> ${position.gradeName || position.gradeId || 'N/A'}</p>
          <p><strong>Skills:</strong> ${position.skillRequirements || 'N/A'}</p>
          <p><strong>Job Description:</strong> ${position.jobDescription || 'N/A'}</p>
          ${position.successionPlanning ? `<p><strong>Succession Planning:</strong> ${position.successionPlanning}</p>` : ''}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Close',
      width: '600px'
    });
  }
}
