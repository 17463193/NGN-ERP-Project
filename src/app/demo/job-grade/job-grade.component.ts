import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { JobPositionService } from '../../services/job-position.service';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JobGradeService, Grade } from '../../services/job-grade.service';
import { Organization } from '../../services/job-position.service';
import { SalaryComponentService, SalaryComponent } from '../../services/salary-component.service';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import Swal from 'sweetalert2';

interface SalaryComponentData {
  componentId: string;
  componentName: string;
  componentValue: number;
}

interface SalaryComponentOption {
  id: string;
  name: string;
  type: string;
  calculationBasis?: string;
  calculationFormula?: string | null;
  taxApplicable?: boolean;
  statutoryRequirement?: boolean;
  displayOrder?: number;
}

@Component({
  selector: 'app-job-grade',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule
  ],
  providers: [
    JobPositionService,
    JobGradeService
  ],
  templateUrl: './job-grade.component.html',
  styleUrls: ['./job-grade.component.scss'],
})
export class JobGradeComponent implements OnInit {
  grades: Grade[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  filteredGrades: Grade[] = [];
  organizations: Organization[] = [];
  currentGrade: Grade | null = null;
  searchQuery = '';
  showModal = false;
  showViewModal = false;
  isEditMode = false;
  viewGradeData: any = null;
  currentPage = 1;
  itemsPerPage = 10;
  isFilterOpen = false;
  showAllPositionNames = false;
  showAllGrades = false;

  salaryComponents: SalaryComponentData[] = [];
  availableSalaryComponents: SalaryComponentOption[] = [];
  showSalaryComponentForm = false;
  selectedComponentId: string = '';

  form: FormGroup;

  constructor(
    private fb: FormBuilder, 
    private jobGradeService: JobGradeService,
    private jobPositionService: JobPositionService,
    private salaryComponentService: SalaryComponentService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      orgId: ['', Validators.required],
      gradeName: ['', Validators.required],
      gradeCode: ['', Validators.required],
      minSalary: ['', [Validators.required, Validators.min(0)]],
      maxSalary: ['', [Validators.required, Validators.min(0)]],
      salaryRangeValid: [true],
      salaryComponents: this.fb.array([])
    }, { validators: this.salaryRangeValidator });
  }

  filterOptions = {
  grades: new Set<string>(),
  positionNames: new Set<string>(),
  selectedGrades: new Set<string>(),
  selectedPositionNames: new Set<string>()
};

filterSections = {
  positionNames: true,
  grades: true
};
toggleFilter(): void {
  this.isFilterOpen = !this.isFilterOpen;
}

isFilterActive(): boolean {
  return this.filterOptions.selectedGrades.size > 0 || 
         this.filterOptions.selectedPositionNames.size > 0;
}

toggleFilterSection(section: 'positionNames' | 'grades'): void {
  this.filterSections[section] = !this.filterSections[section];
}

toggleShowAll(type: 'positionNames' | 'grades'): void {
  if (type === 'positionNames') {
    this.showAllPositionNames = !this.showAllPositionNames;
  } else {
    this.showAllGrades = !this.showAllGrades;
  }
}

setToArray(set: Set<string>): string[] {
  return Array.from(set).sort();
}

isSelected(set: Set<string>, value: string): boolean {
  return set.has(value);
}

toggleFilterOption(type: 'positionNames' | 'grades', value: string): void {
  const selectedSet = type === 'positionNames' ? 
    this.filterOptions.selectedPositionNames : this.filterOptions.selectedGrades;
  
  if (selectedSet.has(value)) {
    selectedSet.delete(value);
  } else {
    selectedSet.add(value);
  }
  this.applyFilters();
}

clearFilters(): void {
  this.filterOptions.selectedGrades.clear();
  this.filterOptions.selectedPositionNames.clear();
  this.searchQuery = '';
  this.applyFilters();
  this.isFilterOpen = false;
}

  // Handle search input
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.applyFilters();
  }

  // Export functionality removed as per user request

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadAllGrades();
    this.loadSalaryComponents();
  }

  loadOrganizations(): void {
    this.jobPositionService.getOrganizations().subscribe({
      next: (orgs) => {
        this.organizations = orgs;
      },
      error: (error) => {

        this.errorMessage = 'Failed to load organizations';
      }
    });
  }

  onOrganizationSelect(orgId: string): void {
    if (!orgId) return;
    
    this.jobGradeService.getGradesByOrganization(orgId).subscribe({
      next: (grades) => {
        this.grades = grades;
        this.filteredGrades = [...grades];
        
        // Clear the grade name and code when organization changes
        this.form.patchValue({
          gradeName: '',
          gradeCode: ''
        });
      },
      error: (error) => {
        console.error('Error loading grades:', error);
        this.errorMessage = 'Failed to load grades';
      }
    });
  }

  salaryRangeValidator(form: FormGroup) {
    const min = form.get('minSalary')?.value;
    const max = form.get('maxSalary')?.value;
    return min && max && Number(min) >= Number(max) ? { invalidSalaryRange: true } : null;
  }

  loadAllGrades(): void {
    this.jobGradeService.getAllGrades().subscribe({
      next: (grades) => {
        this.grades = grades;
        this.filteredGrades = [...grades];
        this.initializeFilters();
        this.currentPage = 1;
      },
      error: (error) => {
        console.error('Error loading grades:', error);
        this.errorMessage = 'Failed to load grades';
      }
    });
  }

  private initializeFilters(): void {
    // Clear existing filter options
    this.filterOptions.grades.clear();
    this.filterOptions.positionNames.clear();
    this.filterOptions.selectedGrades.clear();
    this.filterOptions.selectedPositionNames.clear();

    // Populate filter options from grades
    this.grades.forEach(grade => {
      if (grade.gradeCode) this.filterOptions.grades.add(grade.gradeCode);
      if (grade.gradeName) this.filterOptions.positionNames.add(grade.gradeName);
    });
  }

  applyFilters(): void {
    let filtered = [...this.grades];
    const searchTerm = this.searchQuery?.toLowerCase().trim() || '';

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(grade => 
        (grade.gradeName?.toLowerCase().includes(searchTerm) || 
         grade.gradeCode?.toLowerCase().includes(searchTerm) ||
         grade.organizationName?.toLowerCase().includes(searchTerm))
      );
    }

    // Apply position name filters (mapped to gradeName)
    if (this.filterOptions.selectedPositionNames.size > 0) {
      filtered = filtered.filter(grade => 
        grade.gradeName && this.filterOptions.selectedPositionNames.has(grade.gradeName)
      );
    }

    // Apply grade filters (mapped to gradeCode)
    if (this.filterOptions.selectedGrades.size > 0) {
      filtered = filtered.filter(grade => 
        grade.gradeCode && this.filterOptions.selectedGrades.has(grade.gradeCode)
      );
    }

    this.filteredGrades = filtered;
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredGrades.length / this.itemsPerPage));
  }

  get paginatedGrades(): Grade[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredGrades.slice(start, start + this.itemsPerPage);
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = 1;
    let endPage = this.totalPages;

    if (this.totalPages > maxVisiblePages) {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      startPage = Math.max(1, this.currentPage - halfVisible);
      endPage = Math.min(this.totalPages, this.currentPage + halfVisible);

      if (this.currentPage <= halfVisible) {
        endPage = maxVisiblePages;
      } else if (this.currentPage >= this.totalPages - halfVisible) {
        startPage = this.totalPages - maxVisiblePages + 1;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
    }
  }

  openModal(grade?: Grade): void {
    // Reset the form and clear any existing salary components
    this.form.reset();
    while (this.salaryComponentsArray.length) {
      this.salaryComponentsArray.removeAt(0);
    }
    
    this.showModal = true;

    if (grade) {
      this.isEditMode = true;
      this.currentGrade = grade;
      
      // Set initial form values
      this.form.patchValue({
        orgId: grade.orgId,
        gradeName: grade.gradeName,
        gradeCode: grade.gradeCode,
        minSalary: grade.minSalary,
        maxSalary: grade.maxSalary,
        salaryRangeValid: grade.salaryRangeValid || true
      });
      
      // Load salary structure for the grade
      this.loadSalaryStructure(grade.gradeId);
    } else {
      this.isEditMode = false;
      this.currentGrade = null;
      this.form.patchValue({
        salaryRangeValid: true
      });
    }
  }

  saveGrade(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill all required fields correctly';
      return;
    }

    // Get form values
    const gradeName = this.form.get('gradeName')?.value;
    
    // Prepare the request body according to the new API endpoint
    const selectedOrg = this.organizations.find(org => org.orgId === this.form.get('orgId')?.value);
    
    // Get the selected salary components with their values
    const salaryComponents = this.salaryComponentsArray.value.map((comp: any) => ({
      componentId: comp.componentId,
      componentValue: Number(comp.componentValue) || 0,
      isVariable: comp.isVariable || null,
      performanceLinked: comp.performanceLinked || null,
      revisionCycle: comp.revisionCycle || null
    }));

    // Prepare the request body according to the API specification
    const requestBody = {
      orgId: this.form.get('orgId')?.value,
      organizationName: selectedOrg?.orgName || '',
      gradeName: gradeName,
      gradeCode: this.form.get('gradeCode')?.value,
      minSalary: Number(this.form.get('minSalary')?.value) || 0,
      maxSalary: Number(this.form.get('maxSalary')?.value) || 0,
      progressionRules: null,
      benefitEntitlements: null,
      performanceCriteria: null,
      nextGradeId: null,
      structureName: gradeName,
      salaryComponents: salaryComponents
    };
    


    const handleSuccess = (response: any) => {
      try {
        const savedGrade = response?.data || response;
        
        if (!savedGrade) {

          this.errorMessage = 'Failed to save grade: No data received';
          return;
        }
        
        const updatedGrades = [...this.grades];
        
        if (this.isEditMode && this.currentGrade) {
          const index = updatedGrades.findIndex(g => g.gradeId === savedGrade.gradeId);
          if (index !== -1) {
            updatedGrades[index] = { ...savedGrade };
          } else {
            updatedGrades.unshift(savedGrade);
          }
          
          // Show success message for update
          Swal.fire({
            title: 'Success!',
            text: 'Grade has been updated successfully.',
            icon: 'success',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK'
          }).then(() => {
            // Reset the form after successful save
            this.resetForm();
          });
        } else {
          updatedGrades.unshift(savedGrade);
          this.currentPage = 1;
          
          // Show success message for create
          Swal.fire({
            title: 'Success!',
            text: 'Grade has been created successfully.',
            icon: 'success',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK'
          });
        }
        
        this.grades = updatedGrades;
        this.filteredGrades = [...updatedGrades];
        this.errorMessage = '';
        this.closeModal();
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.grades = [...updatedGrades];
          this.filteredGrades = [...updatedGrades];
          this.cdr.markForCheck();
        }, 100);
        
      } catch (error) {
  
        this.errorMessage = 'Failed to update grade list. Please refresh the page.';
        this.cdr.detectChanges();
      }
    };

    const handleError = (error: any) => {

      
      if (error.status === 400) {
        // Log the full error response for debugging

        
        // Handle validation errors
        if (error.error) {
          // Try to extract error message from the error object
          let errorMessage = 'Validation error: ';
          const errorObj = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
          
          // Check for different possible error formats
          if (errorObj.message) {
            errorMessage += errorObj.message;
          } else if (errorObj.details) {
            errorMessage += errorObj.details;
          } else if (errorObj.error) {
            errorMessage += errorObj.error;
          } else {
            errorMessage = 'Invalid data provided. Please check your inputs.';
          }
          
          // If there are field-specific errors, add them to the message
          if (errorObj.errors) {
            const errorMessages = Object.entries(errorObj.errors)
              .map(([field, messages]) => {
                if (Array.isArray(messages)) {
                  return `${field}: ${messages.join(', ')}`;
                }
                return `${field}: ${messages}`;
              });
            errorMessage += '\n' + errorMessages.join('\n');
          }
          
          this.errorMessage = errorMessage;
        } else {
          this.errorMessage = 'Invalid request. Please check your inputs and try again.';
        }
      } else if (error.status === 401 || error.status === 403) {
        this.errorMessage = 'You are not authorized to perform this action.';
      } else if (error.status === 404) {
        this.errorMessage = 'The requested resource was not found.';
      } else if (error.status >= 500) {
        this.errorMessage = 'A server error occurred. Please try again later.';
      } else {
        this.errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      }
      
      // Ensure the error message is visible
      this.cdr.detectChanges();
    };


    
    if (this.isEditMode && this.currentGrade?.gradeId) {

      this.jobGradeService.updateGrade(this.currentGrade.gradeId, requestBody).subscribe({
        next: handleSuccess,
        error: handleError
      });
    } else {

      this.jobGradeService.createGrade(requestBody).subscribe({
        next: handleSuccess,
        error: handleError
      });
    }
  }

  deleteGrade(gradeId: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You are about to delete this grade. This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.jobGradeService.deleteGrade(gradeId).subscribe({
          next: () => {
            if (this.grades) {
              this.grades = this.grades.filter((grade: Grade) => grade.gradeId !== gradeId);
            }
            if (this.filteredGrades) {
              this.filteredGrades = this.filteredGrades.filter((grade: Grade) => grade.gradeId !== gradeId);
            }
            
            this.errorMessage = '';
            this.cdr.detectChanges();
            
            // Show success message
            Swal.fire(
              'Deleted!',
              'The grade has been deleted.',
              'success'
            );
          },
          error: (error: any) => {

            this.errorMessage = error.message || 'Failed to delete grade';
            this.cdr.detectChanges();
            
            // Show error message
            Swal.fire(
              'Error!',
              'Failed to delete the grade. ' + (error.message || 'Please try again.'),
              'error'
            );
          }
        });
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.showViewModal = false;
    this.form.reset();
    this.currentGrade = null;
    this.viewGradeData = null;
    this.errorMessage = '';
    
    if (this.form) {
      // Reset the salary components array
      while (this.salaryComponentsArray.length) {
        this.salaryComponentsArray.removeAt(0);
      }
    }
  }

  // View grade details
  viewGrade(grade: Grade): void {
    this.jobGradeService.getSalaryStructure(grade.gradeId).subscribe({
      next: (data: any) => {
        this.viewGradeData = data.data || data; // Handle both response formats
        this.showViewModal = true;
      },
      error: (error) => {

        this.errorMessage = 'Failed to load grade details';
      }
    });
    if (this.grades && this.filteredGrades) {
      setTimeout(() => {
        this.grades = [...this.grades!];
        this.filteredGrades = [...this.filteredGrades!];
        this.cdr.markForCheck();
      }, 0);
    }
  }

  get salaryComponentsArray(): FormArray {
    return this.form.get('salaryComponents') as FormArray;
  }

  addSalaryComponent(): void {
    if (!this.selectedComponentId) return;
    
    const selectedComponent = this.availableSalaryComponents.find(
      comp => comp.id === this.selectedComponentId
    );
    
    if (!selectedComponent) return;
    
    const componentGroup = this.fb.group({
      componentId: [this.selectedComponentId, Validators.required],
      componentName: [selectedComponent.name, Validators.required],
      componentValue: [0, [Validators.required, Validators.min(0)]],
      isVariable: [false],
      performanceLinked: [false],
      revisionCycle: [''],
      componentType: [selectedComponent.type || '']
    });
    
    this.salaryComponentsArray.push(componentGroup);
    this.selectedComponentId = '';
    this.showSalaryComponentForm = false;
    
    this.cdr.detectChanges();
  }

  removeSalaryComponent(index: number): void {
    this.salaryComponentsArray.removeAt(index);
  }

  /**
   * Load salary structure for a specific grade
   */
  private loadSalaryStructure(gradeId: string): void {
    if (!gradeId) return;
    
    this.jobGradeService.getSalaryStructure(gradeId).subscribe({
      next: (gradeData: any) => {
        if (!gradeData) return;
        
        // Extract salary components from different possible locations in the response
        let salaryComponents = [];
        
        // Check for components in salaryStructures array
        if (Array.isArray(gradeData.salaryStructures) && gradeData.salaryStructures.length > 0) {
          // Map the salaryStructures to the expected component format
          salaryComponents = gradeData.salaryStructures.map((structure: any) => ({
            componentId: structure.componentId,
            componentName: structure.componentName,
            componentValue: structure.componentValue,
            isVariable: structure.isVariable,
            performanceLinked: structure.performanceLinked,
            revisionCycle: structure.revisionCycle
          }));
        } 
        // Fallback to other possible locations if needed
        else if (Array.isArray(gradeData.salaryComponents)) {
          salaryComponents = gradeData.salaryComponents;
        } else if (Array.isArray(gradeData.components)) {
          salaryComponents = gradeData.components;
        } else if (gradeData.data?.salaryComponents) {
          salaryComponents = gradeData.data.salaryComponents;
        } else if (gradeData.data?.components) {
          salaryComponents = gradeData.data.components;
        }
        
        // Ensure the salary components array is initialized
        if (!this.salaryComponentsArray) {
          this.form.setControl('salaryComponents', this.fb.array([]));
        }
        
        // Clear existing salary components
        while (this.salaryComponentsArray.length > 0) {
          this.salaryComponentsArray.removeAt(0);
        }
        
        // Update the form with grade data
        this.form.patchValue({
          orgId: gradeData.orgId || gradeData.data?.orgId,
          gradeName: gradeData.gradeName || gradeData.data?.gradeName,
          gradeCode: gradeData.gradeCode || gradeData.data?.gradeCode,
          minSalary: gradeData.minSalary || gradeData.data?.minSalary,
          maxSalary: gradeData.maxSalary || gradeData.data?.maxSalary,
          progressionRules: gradeData.progressionRules || gradeData.data?.progressionRules || '',
          benefitEntitlements: gradeData.benefitEntitlements || gradeData.data?.benefitEntitlements || '',
          performanceCriteria: gradeData.performanceCriteria || gradeData.data?.performanceCriteria || '',
          nextGradeId: gradeData.nextGradeId || gradeData.data?.nextGradeId || null,
          structureName: gradeData.structureName || gradeData.data?.structureName || ''
        });
        
        // Add each component to the form if we have any
        if (Array.isArray(salaryComponents) && salaryComponents.length > 0) {
          salaryComponents.forEach((component: any) => {
            try {
              const componentId = component.componentId || component.id;
              const componentValue = component.componentValue || component.value || 0;
              
              if (!componentId) return;
              
              const componentOption = this.availableSalaryComponents.find(
                c => c.id === componentId
              );
              
              if (componentOption) {
                const componentGroup = this.fb.group({
                  componentId: [componentId, Validators.required],
                  componentName: [componentOption.name, Validators.required],
                  componentValue: [componentValue, [Validators.required, Validators.min(0)]],
                  isVariable: [component.isVariable || component.is_variable || false],
                  performanceLinked: [component.performanceLinked || component.performance_linked || false],
                  revisionCycle: [component.revisionCycle || component.revision_cycle || ''],
                  componentType: [componentOption.type || '']
                });
                
                this.salaryComponentsArray.push(componentGroup);
              }
            } catch (error) {
              // Silently handle the error
            }
          });
        }
        
        // Force change detection
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load salary structure for this grade';
      }
    });
  }

  /**
   * Load all salary components from the service
   */
  loadSalaryComponents(): void {

    this.salaryComponentService.getAllComponents().subscribe({
      next: (response: any) => {

        try {
          let components: any[] = [];
          
          // Handle different possible response formats
          if (Array.isArray(response)) {
            // Case 1: Response is directly an array
            components = response;
          } else if (response && Array.isArray(response.data)) {
            // Case 2: Response has a data property that's an array
            components = response.data;
          } else if (response && response.data) {
            // Case 3: Response has a data property that's a single object
            components = [response.data];
          }
          
          if (components.length === 0) {
            this.useFallbackData();
            return;
          }
          
          // Map the API response to the expected format
          this.availableSalaryComponents = components.map((comp: any) => ({
            id: comp.componentId || comp.id || '',
            name: comp.componentName || comp.name || 'Unnamed Component',
            type: comp.componentType || comp.type || 'Fixed',
            calculationBasis: comp.calculationBasis || '',
            calculationFormula: comp.calculationFormula || null,
            taxApplicable: comp.taxApplicable || false,
            statutoryRequirement: comp.statutoryRequirement || false,
            displayOrder: comp.displayOrder || 0
          }));
          
          // Sort components by displayOrder
          this.availableSalaryComponents.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          

          // Force UI update
          this.cdr.detectChanges();
        } catch (error) {

          this.useFallbackData();
        }
      },
      error: (error) => {

        this.useFallbackData();
      }
    });
  }

  // Helper method to use fallback data
  private useFallbackData(): void {
    this.availableSalaryComponents = [
      { id: 'e1181e3b-ebb7-40d9-9ca6-f3e564e52e6b', name: 'Basic Salary', type: 'Earning', calculationBasis: 'Fixed' },
      { id: '0ee9d1ae-1e7c-445c-9dac-08141f8e9182', name: 'House Rent Allowance', type: 'Earning', calculationBasis: 'Formula' },
      { id: 'cdb6805a-7c8f-4553-be09-ec6eb7c1b925', name: 'Conveyance Allowance', type: 'Earning', calculationBasis: 'Fixed' },
      { id: 'a7902423-7a53-4766-9403-e1935d82aef0', name: 'Medical Allowance', type: 'Earning', calculationBasis: 'Fixed' },
      { id: '5d192cce-0972-4594-9648-b24f82a29551', name: 'Provident Fund', type: 'Deduction', calculationBasis: 'Percentage' },
      { id: '62442502-a86b-4edc-b518-6df3b7393c9e', name: 'Professional Tax', type: 'Deduction', calculationBasis: 'Fixed' },
      { id: '650dfe62-5f3d-4dd8-9975-61e1ccd7faa3', name: 'Income Tax', type: 'Deduction', calculationBasis: 'Formula' },
      { id: 'ee73b73f-e391-4072-b236-742de97c1b60', name: 'Employer PF Contribution', type: 'Deduction', calculationBasis: 'Percentage' },
      { id: 'c796b21b-b53a-448a-9d27-bf40dd818f2d', name: 'Gratuity', type: 'Deduction', calculationBasis: 'Formula' },
      { id: '521e906c-96f0-45d4-a0ef-f3a808e0c8b2', name: 'Bonus', type: 'Earning', calculationBasis: 'Fixed' }
    ];

  }

  // Helper method to get a form control from a form group
  getFormControl(group: any, controlName: string): FormControl {
    return group.get(controlName) as FormControl;
  }

  isComponentSelected(componentId: string): boolean {
    return this.salaryComponentsArray.controls.some(
      control => control.get('componentId')?.value === componentId
    );
  }

  private resetForm(): void {
    // Reset the form
    this.form.reset();
    
    // Clear the salary components array
    while (this.salaryComponentsArray.length !== 0) {
      this.salaryComponentsArray.removeAt(0);
    }
    
    // Reset other form-related properties
    this.isEditMode = false;
    this.currentGrade = null;
    this.errorMessage = '';
    this.selectedComponentId = '';
    this.showSalaryComponentForm = false;
    
    // Reset the form's validation state
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.setErrors(null);
    });
  }
}