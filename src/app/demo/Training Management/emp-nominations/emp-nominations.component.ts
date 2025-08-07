import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

interface TrainingProgram {
  programId: string;
  orgId: string;
  categoryId: string;
  programName: string;
  programCode: string;
  programType: string;
  deliveryMethod: string;
  durationHours: number;
  costPerParticipant: number;
  batchName: string;
  startDate: string;
  endDate: string;
  venue: string;
  maxSeats: number;
  seatsBooked: number;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
  heldBy: string;
  // For backward compatibility
  location?: string;
  trainerName?: string;
  status?: string;
  description?: string;
}

interface TrainingNomination {
  id: string;
  programId: string;
  employeeId?: string;  // Made optional with ?
  employeeName: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';
  createdDate: string;
  modifiedDate: string;
  programName?: string;
  programCode?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  trainerName?: string;
}

interface TrainingNominationWithProgram extends TrainingNomination {
  program?: TrainingProgram;
}

@Component({
  selector: 'app-emp-nominations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule
  ],
  templateUrl: './emp-nominations.component.html',
  styleUrls: ['./emp-nominations.component.scss']
})
export class EmpNominationsComponent implements OnInit {
  // Data
  nominations: TrainingNominationWithProgram[] = [];
  programs: TrainingProgram[] = [];
  filteredNominations: TrainingNominationWithProgram[] = [];
  currentNomination: TrainingNominationWithProgram | null = null;
  private apiUrl = environment.trainingApiUrl;
  
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
  isLoading = false;
  errorMessage = '';

  // Forms
  form: FormGroup;
  
  // Template Refs
  @ViewChild('trainingModal') private trainingModalRef!: TemplateRef<any>;
  @ViewChild('viewTrainingModal') private viewTrainingModalRef!: TemplateRef<any>;
  private modalRef: any;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      employeeName: ['', Validators.required],
      programId: ['', Validators.required],
      status: ['Pending', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      location: ['', Validators.required],
      trainerName: ['', Validators.required]
    }, { validators: this.dateRangeValidator });
  }

  ngOnInit(): void {
    this.loadPrograms();
  }

  loadPrograms(): void {
    this.isLoading = true;
    const url = `${this.apiUrl}/training/programs`;
    console.log('Fetching programs from:', url); // Debug log
    
    this.http.get<TrainingProgram[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (programs) => {
        console.log('Programs loaded successfully:', programs); // Debug log
        this.programs = programs;
        this.loadNominations();
      },
      error: (error) => {
        console.error('Error loading programs:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to load training programs. Please check your connection and try again.',
          icon: 'error'
        });
      }
    });
  }

  loadNominations(): void {
    this.isLoading = true;
    // First, get all programs to fetch their nominations
    const programIds = this.programs.map(p => p.programId);
    console.log('Program IDs to fetch nominations for:', programIds); // Debug log
    
    // If there are no programs, set empty nominations and return
    if (programIds.length === 0) {
      this.nominations = [];
      this.filteredNominations = [];
      this.isLoading = false;
      return;
    }

    const nominationPromises = programIds.map(programId => 
      this.http.get<TrainingNomination[]>(`${this.apiUrl}/training/nominations/program/${programId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }).toPromise()
    );

    Promise.all(nominationPromises)
      .then(nominationArrays => {
        console.log('Nominations response:', nominationArrays); // Debug log
        // Flatten the array of arrays and add program info
        this.nominations = [];
        nominationArrays.forEach((nominations, index) => {
          if (nominations && Array.isArray(nominations) && nominations.length > 0) {
            const program = this.programs.find(p => p.programId === programIds[index]);
            if (!program) return; // Skip if program not found
            
            const nominationsWithProgram = nominations.map(nom => ({
              ...nom,
              programName: program.programName,
              programCode: program?.programCode,
              startDate: program?.startDate,
              endDate: program?.endDate,
              location: program?.location,
              trainerName: program?.trainerName,
              program: program
            }));
            this.nominations = [...this.nominations, ...nominationsWithProgram];
          }
        });
        
        this.filteredNominations = [...this.nominations];
        this.updateTotalPages();
      })
      .catch(error => {
        console.error('Error loading nominations:', error);
        Swal.fire('Error', 'Failed to load training nominations', 'error');
      })
      .finally(() => {
        this.isLoading = false;
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
      this.filteredNominations = [...this.nominations];
      this.updateTotalPages();
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredNominations = this.nominations.filter(nomination => 
      (nomination.programName?.toLowerCase().includes(query) ||
      nomination.programCode?.toLowerCase().includes(query) ||
      nomination.employeeName?.toLowerCase().includes(query) ||
      nomination.status?.toLowerCase().includes(query) ||
      nomination.location?.toLowerCase().includes(query)) ?? false
    );
    this.currentPage = 1;
    this.updateTotalPages();
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentNomination = null;
    this.form.reset({
      status: 'Pending',
      programId: ''
    });
    this.modalRef = this.modalService.open(this.trainingModalRef, { size: 'lg' });
  }

  openEditModal(nomination: TrainingNominationWithProgram): void {
    this.isEditMode = true;
    this.currentNomination = { ...nomination };
    this.form.patchValue({
      employeeName: nomination.employeeName,
      programId: nomination.programId,
      status: nomination.status,
      startDate: nomination.startDate ? new Date(nomination.startDate).toISOString().substring(0, 10) : '',
      endDate: nomination.endDate ? new Date(nomination.endDate).toISOString().substring(0, 10) : '',
      location: nomination.location,
      trainerName: nomination.trainerName
    });
    this.modalRef = this.modalService.open(this.trainingModalRef, { size: 'lg' });
  }

  openViewModal(nomination: TrainingNominationWithProgram): void {
    this.currentNomination = nomination;
    this.modalRef = this.modalService.open(this.viewTrainingModalRef, { size: 'lg' });
  }

  saveNomination(): void {
    if (this.form.invalid) {
      return;
    }

    const formData = this.form.value;
    const apiUrl = environment.apiUrl;
    
    // Find the selected program to get additional details
    const selectedProgram = this.programs.find(p => p.programId === formData.programId);
    
    const nominationData: TrainingNomination = {
      id: this.isEditMode && this.currentNomination?.id ? this.currentNomination.id : undefined,
      employeeName: formData.employeeName,
      programId: formData.programId,
      programName: selectedProgram?.programName || '',
      programCode: selectedProgram?.programCode || '',
      status: formData.status,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      location: formData.location,
      trainerName: formData.trainerName,
      createdDate: this.isEditMode && this.currentNomination?.createdDate 
        ? this.currentNomination.createdDate 
        : new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };

    const request = this.isEditMode && this.currentNomination?.id
      ? this.http.put(`${apiUrl}/api/v1/training/nominations/${this.currentNomination.id}`, nominationData)
      : this.http.post(`${apiUrl}/api/v1/training/nominations`, nominationData);

    this.isLoading = true;
    request.pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        Swal.fire({
          title: 'Success!',
          text: `Training nomination ${this.isEditMode ? 'updated' : 'created'} successfully.`,
          icon: 'success',
          confirmButtonText: 'OK'
        });
        this.loadNominations();
        this.modalRef.close();
      },
      error: (error) => {
        console.error('Error saving training nomination:', error);
        Swal.fire({
          title: 'Error!',
          text: 'An error occurred while saving the training nomination. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  confirmDelete(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this nomination record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteNomination(id);
      }
    });
  }

  private deleteNomination(id: string): void {
    this.isLoading = true;
    this.http.delete(`${environment.apiUrl}/api/v1/training/nominations/${id}`)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: () => {
          Swal.fire({
            title: 'Deleted!',
            text: 'The nomination record has been deleted.',
            icon: 'success',
            confirmButtonText: 'OK'
          });
          this.loadNominations();
        },
        error: (error) => {
          console.error('Error deleting nomination record:', error);
          Swal.fire({
            title: 'Error!',
            text: 'An error occurred while deleting the nomination record. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      });
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

  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  updateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredNominations.length / this.itemsPerPage) || 1;
  }

  get paginatedNominations(): TrainingNominationWithProgram[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredNominations.slice(start, start + this.itemsPerPage);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Pending': return 'bg-info';
      case 'Approved': return 'bg-success';
      case 'Rejected': return 'bg-danger';
      case 'Completed': return 'bg-primary';
      case 'Cancelled': return 'bg-secondary';
      default: return 'bg-light text-dark';
    }
  }
}