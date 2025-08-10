import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, FormGroupDirective } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { TrainingService, TrainingProgram, TrainingNomination } from '../../../services/training.service';

// Extend the base TrainingNomination but make all fields optional
interface TrainingNominationExtended extends Partial<TrainingNomination> {
  employeeName?: string;
  employeeId?: string;
  nominationDate?: string;
  createdDate?: string;
  status: string; // Status is required
}

interface TrainingProgramWithNominations extends Omit<TrainingProgram, 'status' | 'venue' | 'location' | 'trainerName' | 'seatsBooked' | 'maxSeats' | 'description'> {
  nominations?: TrainingNominationExtended[];
  status?: string;
  venue?: string;
  location?: string;
  trainerName?: string;
  seatsBooked?: number;
  maxSeats?: number;
  maxParticipants?: number;
  programDescription?: string;
  participants?: any[]; // For backward compatibility with template
}

@Component({
  selector: 'app-emp-programs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule
  ],
  templateUrl: './emp-training.component.html',
  styleUrls: ['./emp-training.component.scss']
})
export class EmpTrainingComponent implements OnInit {
  // Data
  trainingPrograms: TrainingProgramWithNominations[] = [];
  filteredPrograms: TrainingProgramWithNominations[] = [];
  organizations: { orgId: string; orgName: string }[] = [];
  allCategories: { categoryId: string; categoryName: string; orgId: string | null; isActive?: boolean }[] = [];
  filteredCategories: { categoryId: string; categoryName: string }[] = [];
  currentProgram: TrainingProgramWithNominations | null = null;
  isLoading = false;
  currentTraining: TrainingProgramWithNominations | null = null;

  // Search state
  searchQuery = '';

  // Date range for filtering
  dateRange: [Date | null, Date | null] = [null, null];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // UI State
  isEditMode = false;
  errorMessage = '';

  // Forms
  form: FormGroup;

  // Template Refs
  @ViewChild('trainingModal') private trainingModalRef!: TemplateRef<any>;
  @ViewChild('viewTrainingModal') private viewTrainingModalRef!: TemplateRef<any>;
  private modalRef: any;

  constructor(
    private trainingService: TrainingService,
    private modalService: NgbModal,
    private fb: FormBuilder
  ) {
    // Initialize with default values to prevent null reference errors
    this.currentTraining = {
      programId: '',
      programName: '',
      programCode: '',
      startDate: new Date(),
      endDate: new Date(),
      venue: '',
      location: '',
      trainerName: '',
      status: 'Planned',
      seatsBooked: 0,
      maxSeats: 10,
      maxParticipants: 10,
      nominations: [],
      participants: [],
      // Required fields from TrainingProgram
      orgId: '',
      categoryId: '',
      programType: 'In-House',
      deliveryMethod: 'In-Person',
      description: '',
      isActive: true
    } as unknown as TrainingProgramWithNominations;
    this.form = this.fb.group({
      // Basic Information
      orgId: ['', Validators.required],
      categoryId: ['', Validators.required],
      programName: ['', Validators.required],
      programCode: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9-]+$')]],
      programType: ['In-House', Validators.required],
      deliveryMethod: ['In-Person', Validators.required],
      
      // Dates
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      
      // Details
      durationHours: ['', [Validators.required, Validators.min(1)]],
      costPerParticipant: ['', [Validators.required, Validators.min(0)]],
      batchName: [''],
      heldBy: ['', Validators.required],
      venue: ['', Validators.required],
      maxSeats: ['', [Validators.required, Validators.min(1)]],
      isActive: [true, Validators.required],
      
      // Optional Fields
      description: ['']
    }, { validators: this.dateRangeValidator });
  }

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadAllCategories();
    this.loadTrainingPrograms();
    
    // Filter categories when organization changes
    this.form.get('orgId')?.valueChanges.subscribe(orgId => {
      this.filterCategoriesByOrganization(orgId);
    });
  }
  
  // Load all categories
  loadAllCategories(): void {
    this.isLoading = true;
    this.trainingService.getTrainingCategories()
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (categories) => {
          if (!Array.isArray(categories)) {
            console.error('Expected an array of categories but got:', typeof categories);
            this.allCategories = [];
            return;
          }
          
          this.allCategories = categories.map(cat => ({
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            orgId: cat.orgId,
            isActive: cat.isActive
          }));
          
          // After loading all categories, filter them based on the currently selected organization
          const currentOrgId = this.form.get('orgId')?.value;
          this.filterCategoriesByOrganization(currentOrgId);
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.allCategories = [];
          this.filteredCategories = [];
          this.form.get('categoryId')?.reset('');
          Swal.fire('Error', 'Failed to load categories', 'error');
        }
      });
  }
  
  // Filter categories by organization ID
  filterCategoriesByOrganization(orgId: string | null): void {
    if (!orgId) {
      // If no org is selected, show all active categories
      this.filteredCategories = this.allCategories
        .filter(cat => cat.orgId !== null && cat.isActive !== false)
        .map(({ categoryId, categoryName }) => ({ categoryId, categoryName }));
    } else {
      // If org is selected, show only categories for that org
      this.filteredCategories = this.allCategories
        .filter(cat => cat.orgId === orgId && cat.isActive !== false)
        .map(({ categoryId, categoryName }) => ({ categoryId, categoryName }));
    }
    
    // If there's only one category, select it by default
    if (this.filteredCategories.length === 1) {
      this.form.get('categoryId')?.setValue(this.filteredCategories[0].categoryId);
    } else {
      this.form.get('categoryId')?.reset('');
    }
  }

  loadOrganizations(): void {
    this.isLoading = true;
    this.trainingService.getOrganizations()
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (organizations) => {
          this.organizations = organizations || [];
        },
        error: (error) => {
          console.error('Error loading organizations:', error);
          Swal.fire('Error', 'Failed to load organizations', 'error');
        }
      });
  }

  loadTrainingPrograms(): void {
    this.isLoading = true;
    this.trainingService.getTrainingPrograms()
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (programs) => {
          this.trainingPrograms = programs;
          this.filteredPrograms = [...this.trainingPrograms];
          this.loadNominationsForPrograms();
        },
        error: (error) => {
          console.error('Error loading training programs:', error);
          Swal.fire('Error', 'Failed to load training programs', 'error');
        }
      });
  }

  loadNominationsForPrograms(): void {
    this.trainingPrograms.forEach(program => {
      this.trainingService.getNominationsByProgram(program.programId)
        .subscribe({
          next: (nominations) => {
            program.nominations = nominations;
            // Set status based on nominations
            if (nominations && nominations.length > 0) {
              program.status = nominations[0].status; // Taking first nomination's status as program status
            } else {
              program.status = 'No Nominations';
            }
            // Update seats booked
            program.seatsBooked = nominations?.length || 0;
          },
          error: (error) => {
            console.error(`Error loading nominations for program ${program.programId}:`, error);
            program.status = 'Error loading status';
            program.seatsBooked = 0;
          }
        });
    });
  }

  dateRangeValidator(group: FormGroup): { [key: string]: boolean } | null {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return { 'dateRangeInvalid': true };
    }
    return null;
  }

  applySearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredPrograms = [...this.trainingPrograms];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredPrograms = this.trainingPrograms.filter(program => {
      const programName = program.programName?.toLowerCase() || '';
      const programCode = program.programCode?.toLowerCase() || '';
      const heldBy = program.heldBy?.toLowerCase() || '';
      const venue = program.venue?.toLowerCase() || '';
      
      return programName.includes(query) ||
             programCode.includes(query) ||
             heldBy.includes(query) ||
             venue.includes(query);
    });
  }

  updateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredPrograms.length / this.itemsPerPage) || 1;
  }

  get paginatedPrograms(): TrainingProgramWithNominations[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPrograms.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Modal methods
  openAddModal(): void {
    this.isEditMode = false;
    this.currentTraining = {
      programId: '',
      programName: '',
      programCode: '',
      startDate: new Date(),
      endDate: new Date(),
      venue: '',
      location: '',
      trainerName: '',
      status: 'Planned',
      seatsBooked: 0,
      maxSeats: 10,
      maxParticipants: 10,
      nominations: [],
      participants: [],
      orgId: '',
      categoryId: '',
      programType: 'In-House',
      deliveryMethod: 'In-Person',
      description: '',
      isActive: true
    } as unknown as TrainingProgramWithNominations;
    
    // Reset the form
    this.form.reset({
      programType: 'In-House',
      deliveryMethod: 'In-Person',
      isActive: true,
      maxSeats: 10
    });
    
    // Open the modal
    this.modalRef = this.modalService.open(this.trainingModalRef, { size: 'lg' });
  }

  openEditModal(program: TrainingProgramWithNominations): void {
    this.isEditMode = true;
    this.currentTraining = { ...program };
    
    // Populate the form with the program data
    this.form.patchValue({
      orgId: program.orgId,
      categoryId: program.categoryId,
      programName: program.programName,
      programCode: program.programCode,
      programType: program.programType,
      deliveryMethod: program.deliveryMethod,
      durationHours: program.durationHours,
      costPerParticipant: program.costPerParticipant,
      batchName: program.batchName || '',
      startDate: program.startDate,
      endDate: program.endDate,
      heldBy: program.heldBy,
      venue: program.venue,
      maxSeats: program.maxSeats,
      isActive: program.isActive
    });
    
    // Open the modal
    this.modalRef = this.modalService.open(this.trainingModalRef, { size: 'lg' });
  }

  openViewModal(program: TrainingProgramWithNominations): void {
    this.currentTraining = { ...program };
    this.modalService.open(this.viewTrainingModalRef, { size: 'lg' });
  }

  confirmDelete(programId: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this training program!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        // In a real app, you would call a service to delete the program
        this.trainingPrograms = this.trainingPrograms.filter(p => p.programId !== programId);
        this.filteredPrograms = this.filteredPrograms.filter(p => p.programId !== programId);
        
        // Show success message
        Swal.fire(
          'Deleted!',
          'The training program has been deleted.',
          'success'
        );
        
        this.updateTotalPages();
      }
    });
  }

  getStatusBadgeClass(status: string = ''): string {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    // Special case for 'No Nominations' - return empty string for no badge styling
    if (statusLower === 'no nominations') {
      return '';
    }
    
    // Special case for 'Approved' - black text on neon green background
    if (statusLower === 'approved') {
      return 'bg-neon-green text-dark';
    }
    
    switch(statusLower) {
      case 'completed':
        return 'bg-success';
      case 'in progress':
      case 'inprogress':
        return 'bg-warning';
      case 'planned':
      case 'scheduled':
        return 'bg-info';
      case 'cancelled':
      case 'rejected':
        return 'bg-danger';
      case 'pending':
        return 'bg-secondary';
      default:
        return 'bg-light text-dark';
    }
  }
  
  getProgressPercentage(program: TrainingProgramWithNominations): number {
    if (!program.maxSeats) return 0;
    return Math.min(100, Math.round(((program.seatsBooked || 0) / program.maxSeats) * 100));
  }
  
  isAtCapacity(program: TrainingProgramWithNominations): boolean {
    if (!program.maxSeats) return false;
    return (program.seatsBooked || 0) >= program.maxSeats;
  }

  saveTraining(): void {
    if (this.form.invalid) {
      // Mark all fields as touched to show validation messages
      this.form.markAllAsTouched();
      return;
    }

    // Get current date in ISO format
    const currentDate = new Date().toISOString();
    
    // For create operation
    if (!this.isEditMode || !this.currentTraining?.programId) {
      const newProgram: Omit<TrainingProgram, 'programId' | 'seatsBooked' | 'createdDate' | 'modifiedDate'> = {
        orgId: this.form.value.orgId,
        categoryId: this.form.value.categoryId,
        programName: this.form.value.programName,
        programCode: this.form.value.programCode,
        programType: this.form.value.programType,
        deliveryMethod: this.form.value.deliveryMethod,
        durationHours: Number(this.form.value.durationHours),
        costPerParticipant: Number(this.form.value.costPerParticipant),
        batchName: this.form.value.batchName || '',
        startDate: this.form.value.startDate,
        endDate: this.form.value.endDate,
        heldBy: this.form.value.heldBy,
        venue: this.form.value.venue,
        maxSeats: Number(this.form.value.maxSeats),
        isActive: this.form.value.isActive
      };

      this.isLoading = true;
      this.trainingService.createProgram(newProgram)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: () => this.handleSaveSuccess('created'),
          error: (error) => this.handleSaveError(error)
        });
    } 
    // For update operation
    else if (this.currentTraining?.programId) {
      const updatedProgram: TrainingProgram = {
        programId: this.currentTraining.programId,
        orgId: this.form.value.orgId,
        categoryId: this.form.value.categoryId,
        programName: this.form.value.programName,
        programCode: this.form.value.programCode,
        programType: this.form.value.programType,
        deliveryMethod: this.form.value.deliveryMethod,
        durationHours: Number(this.form.value.durationHours),
        costPerParticipant: Number(this.form.value.costPerParticipant),
        batchName: this.form.value.batchName || '',
        startDate: this.form.value.startDate,
        endDate: this.form.value.endDate,
        heldBy: this.form.value.heldBy,
        venue: this.form.value.venue,
        maxSeats: Number(this.form.value.maxSeats),
        isActive: this.form.value.isActive,
        // Preserve existing values
        seatsBooked: this.currentTraining.seatsBooked || 0,
        createdDate: this.currentTraining.createdDate || currentDate,
        modifiedDate: currentDate
      };

      this.isLoading = true;
      this.trainingService.updateProgram(updatedProgram)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: () => this.handleSaveSuccess('updated'),
          error: (error) => this.handleSaveError(error)
        });
    }
  }

  // Handle successful save
  private handleSaveSuccess(action: 'created' | 'updated'): void {
    Swal.fire('Success', `Training program ${action} successfully`, 'success');
    this.loadTrainingPrograms();
    this.modalService.dismissAll();
  }

  // Handle save error
  private handleSaveError(error: any): void {
    console.error('Error saving training program:', error);
    const errorMessage = error.error?.message || 'Failed to save training program';
    Swal.fire('Error', errorMessage, 'error');
  }

  onSubmit(): void {
    this.saveTraining();
  }
}