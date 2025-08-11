import { Component, OnInit, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs/operators';
import { SeparationService as SeparationTypeService, SeparationType, OrganizationService, Organization } from '../../../services/type-separation.service';

@Component({
  selector: 'app-separation-type',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbPaginationModule
  ],
  templateUrl: './separation-type.component.html',
  styleUrls: ['./separation-type.component.scss']
})
export class SeparationTypeComponent implements OnInit {
  @ViewChild('addEditModal') addEditModal!: TemplateRef<any>;
  @ViewChild('viewModal') viewModal!: TemplateRef<any>;

  separationTypes: SeparationType[] = [];
  filteredTypes: SeparationType[] = [];
  currentType: SeparationType | null = null;
  organizations: Organization[] = [];
  organizationCache: Map<string, Organization> = new Map(); // Cache for organization details
  isLoading = false;
  searchQuery = '';
  isEditMode = false;
  modalRef!: NgbModalRef;
  
  typeForm: FormGroup;

  categories = [
    // Removed predefined categories - now user will input manually
  ];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  organizationLoading = new Set<string>();
  failedOrgLoads = new Set<string>();

  constructor(
    private separationTypeService: SeparationTypeService,
    private organizationService: OrganizationService,
    private modalService: NgbModal,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.typeForm = this.fb.group({
      orgId: ['', Validators.required],
      separationName: ['', [Validators.required, Validators.maxLength(100)]],
      separationCode: ['', [Validators.required, Validators.maxLength(20)]],
      category: ['', Validators.required],
      noticePeriodDays: [0, [Validators.required, Validators.min(0)]],
      exitInterviewRequired: [false],
      rehireEligible: [false]
    });
  }

  ngOnInit(): void {
    // Load organizations for dropdown first
    this.loadOrganizations();
    // Then load separation types which will trigger individual org loading
    this.loadSeparationTypes();
  }

  loadOrganizations(): void {
    // console.log('Loading organizations...');
    this.isLoading = true;
    this.organizationService.getOrganizations()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (orgs) => {
          this.organizations = orgs || [];
          // console.log('Organizations loaded successfully:', this.organizations);
          if (this.organizations.length === 0) {
            console.warn('No organizations found. Please check if the API is returning data.');
          }
        },
        error: (error) => {
          console.error('Failed to load organizations:', error);
          this.organizations = [];
          // console.log('Organizations array reset to empty due to error');
        }
      });
  }

  loadSeparationTypes(): void {
    this.isLoading = true;
    this.separationTypeService.getSeparationTypes()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (types) => {
          this.separationTypes = types || [];
          this.filteredTypes = [...this.separationTypes];
          
          // Only try to load organization details if we have types
          if (this.separationTypes.length > 0) {
            this.loadOrganizationDetails();
          }
        },
        error: (error) => {
          if (error.status === 403) {
            // Show user-friendly message for permission issues
            console.warn('You do not have permission to view separation types. Please contact your administrator.');
            this.separationTypes = [];
            this.filteredTypes = [];
          } else {
            console.error('Error loading separation types:', error);
          }
        }
      });
  }

  loadOrganizationDetails(): void {
    // Get unique orgIds from separation types
    const uniqueOrgIds = [...new Set(
      this.separationTypes
        .map(type => type.orgId)
        .filter((id): id is string => !!id)
    )];
    
    // Load each organization
    uniqueOrgIds.forEach(orgId => {
      if (this.organizationLoading.has(orgId)) return;
      
      this.organizationLoading.add(orgId);
      
      this.organizationService.getOrganizationById(orgId).subscribe({
        next: (org) => {
          // Update the organizations list for the dropdown
          if (!this.organizations.some(o => o.orgId === orgId)) {
            this.organizations.push(org);
          }
          this.organizationLoading.delete(orgId);
          this.cdr.detectChanges();
        },
        error: () => {
          this.organizationLoading.delete(orgId);
          this.cdr.detectChanges();
        }
      });
    });
  }

  getOrgName(orgId: string): string {
    if (!orgId) return 'Unknown Organization';
    
    // Check if we have the organization in our local list
    const org = this.organizations.find(o => o.orgId === orgId);
    if (org) {
      return org.orgName;
    }
    
    // If not found and not already loading, trigger a load
    if (!this.organizationLoading.has(orgId)) {
      this.organizationLoading.add(orgId);
      
      this.organizationService.getOrganizationById(orgId).subscribe({
        next: (loadedOrg) => {
          if (!this.organizations.some(o => o.orgId === orgId)) {
            this.organizations.push(loadedOrg);
          }
          this.organizationLoading.delete(orgId);
          this.cdr.detectChanges();
        },
        error: () => {
          this.organizationLoading.delete(orgId);
          this.cdr.detectChanges();
        }
      });
    }
    
    return 'Loading...';
  }

  applySearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredTypes = [...this.separationTypes];
      return;
    }
    
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredTypes = this.separationTypes.filter(type => 
      type.separationName?.toLowerCase().includes(query) ||
      type.separationCode?.toLowerCase().includes(query) ||
      type.category?.toLowerCase().includes(query) ||
      this.getOrgName(type.orgId).toLowerCase().includes(query)
    );
    this.currentPage = 1;
  }

  get paginatedTypes(): SeparationType[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTypes.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTypes.length / this.itemsPerPage) || 1;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Fixed getter for form controls
  get f() { 
    return this.typeForm?.controls || {}; 
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentType = null;
    
    this.typeForm.reset({
      orgId: '',
      separationName: '',
      separationCode: '',
      category: '',
      noticePeriodDays: 0,
      exitInterviewRequired: false,
      rehireEligible: false
    });
    this.modalRef = this.modalService.open(this.addEditModal, { 
      size: 'lg', 
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  openEditModal(type: SeparationType): void {
    this.isEditMode = true;
    this.currentType = { ...type };
    this.typeForm.patchValue({
      orgId: type.orgId || '',
      separationName: type.separationName || '',
      separationCode: type.separationCode || '',
      category: type.category || '',
      noticePeriodDays: type.noticePeriodDays || 0,
      exitInterviewRequired: type.exitInterviewRequired || false,
      rehireEligible: type.rehireEligible || false
    });
    this.modalRef = this.modalService.open(this.addEditModal, { 
      size: 'lg', 
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  openViewModal(type: SeparationType): void {
    this.currentType = { ...type };
    this.modalRef = this.modalService.open(this.viewModal, { 
      size: 'lg', 
      centered: true 
    });
  }

  onSubmit(): void {
    // Skip form validation since we're handling permissions
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }

    const formData = this.typeForm.value;
    const separationType = {
      orgId: formData.orgId || null,  // Make orgId optional
      separationName: formData.separationName || '',
      separationCode: formData.separationCode || '',
      category: formData.category || '',
      noticePeriodDays: Number(formData.noticePeriodDays) || 0,
      exitInterviewRequired: Boolean(formData.exitInterviewRequired),
      rehireEligible: Boolean(formData.rehireEligible)
    };

    this.isLoading = true;
    const request = this.isEditMode && this.currentType?.separationTypeId
      ? this.separationTypeService.updateSeparationType(this.currentType.separationTypeId, separationType)
: this.separationTypeService.createSeparationType(separationType);

    request.pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => {
        this.loadSeparationTypes();
        this.modalRef.close();
      },
      error: (error) => {
        if (error.status === 403) {
          // Show user-friendly message for permission issues
          alert('You do not have permission to perform this action. Please contact your administrator.');
        } else {
          // Handle other errors
          console.error('Error saving separation type:', error);
          alert('An error occurred while saving. Please try again.');
        }
      }
    });
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
    }
  }

  dismissModal(): void {
    if (this.modalRef) {
      this.modalRef.dismiss();
    }
  }

  exportToExcel(): void {
    // Implement Excel export logic here
    // console.log('Export to Excel functionality');
    // You would typically use a library like xlsx here
  }

  // Helper method for Math operations in template
  getMathMin = Math.min;
}