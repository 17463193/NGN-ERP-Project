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
      trainingName: ['', Validators.required],
      trainingCode: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9-]+$')]],
      description: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      status: ['Planned', Validators.required],
      trainerName: ['', Validators.required],
      location: ['', Validators.required],
      maxParticipants: ['', [Validators.required, Validators.min(1), Validators.max(100)]]
    }, { validators: this.dateRangeValidator });
  }

  ngOnInit(): void {
    this.loadTrainingPrograms();
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
    // Implementation for opening add modal
    // This is a placeholder - implement as needed
    console.log('Open add modal');
  }

  openEditModal(program: TrainingProgramWithNominations): void {
    this.currentTraining = { ...program };
    // Implementation for opening edit modal
    console.log('Open edit modal for:', program.programName);
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

  // Save training program
  saveTraining(program: TrainingProgramWithNominations): void {
    if (!program) return;

    const saveOperation = program.programId
      ? this.trainingService.updateProgram(program as TrainingProgram)
      : this.trainingService.createProgram(program as TrainingProgram);

    saveOperation.subscribe({
      next: () => {
        Swal.fire('Success', 'Training program saved successfully', 'success');
        this.loadTrainingPrograms();
        this.modalService.dismissAll();
      },
      error: (error) => {
        console.error('Error saving training program:', error);
        Swal.fire('Error', 'Failed to save training program', 'error');
      }
    });
  }

  // Handle form submission
  onSubmit(): void {
    if (this.form.valid && this.currentTraining) {
      const formData = this.form.value;
      
      // Update currentTraining with form data
      const updatedTraining: Partial<TrainingProgramWithNominations> = {
        programName: formData.trainingName,
        programCode: formData.trainingCode,
        programDescription: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        venue: formData.location, // Assuming venue and location are the same in the form
        location: formData.location,
        trainerName: formData.trainerName,
        maxSeats: formData.maxParticipants,
        status: formData.status || 'Planned',
        maxParticipants: formData.maxParticipants
      };

      // Merge with existing training data
      const trainingToSave: TrainingProgramWithNominations = {
        ...this.currentTraining,
        ...updatedTraining
      };

      this.saveTraining(trainingToSave);
    } else {
      // Mark all fields as touched to show validation errors
      this.form.markAllAsTouched();
    }
  }
}