import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, FormGroupDirective } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

interface Training {
  id?: string;
  trainingName: string;
  trainingCode: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  trainerName: string;
  location: string;
  maxParticipants: number;
  participants: string[];
}

@Component({
  selector: 'app-emp-training',
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
  trainings: Training[] = [];
  filteredTrainings: Training[] = [];
  currentTraining: Training | null = null;
  
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
    private modalService: NgbModal
  ) {
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
    // In a real app, load trainings from a service
    this.loadTrainings();
  }

  loadTrainings(): void {
    // Mock data for demonstration
    this.trainings = [
      {
        id: '1',
        trainingName: 'Angular Fundamentals',
        trainingCode: 'ANG-101',
        description: 'Introduction to Angular framework',
        startDate: '2025-09-01',
        endDate: '2025-09-05',
        status: 'Planned',
        trainerName: 'John Doe',
        location: 'Training Room A',
        maxParticipants: 15,
        participants: []
      },
      // Add more mock trainings as needed
    ];
    this.filteredTrainings = [...this.trainings];
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
      this.filteredTrainings = [...this.trainings];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredTrainings = this.trainings.filter(training => 
      training.trainingName.toLowerCase().includes(query) ||
      training.trainingCode.toLowerCase().includes(query) ||
      training.trainerName.toLowerCase().includes(query) ||
      training.location.toLowerCase().includes(query)
    );
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentTraining = null;
    this.form.reset({
      status: 'Planned',
      maxParticipants: 10
    });
    this.modalRef = this.modalService.open(this.trainingModalRef, { size: 'lg' });
  }

  openEditModal(training: Training): void {
    this.isEditMode = true;
    this.currentTraining = { ...training };
    this.form.patchValue({
      ...training,
      startDate: this.formatDateForInput(training.startDate),
      endDate: this.formatDateForInput(training.endDate)
    });
    this.modalRef = this.modalService.open(this.trainingModalRef, { size: 'lg' });
  }

  openViewModal(training: Training): void {
    this.currentTraining = training;
    this.modalRef = this.modalService.open(this.viewTrainingModalRef, { size: 'lg' });
  }

  saveTraining(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.value;
    const training: Training = {
      ...formData,
      id: this.isEditMode && this.currentTraining?.id 
        ? this.currentTraining.id 
        : Math.random().toString(36).substr(2, 9),
      participants: this.isEditMode && this.currentTraining?.participants 
        ? this.currentTraining.participants 
        : []
    };

    if (this.isEditMode) {
      const index = this.trainings.findIndex(t => t.id === training.id);
      if (index !== -1) {
        this.trainings[index] = training;
      }
      this.showSuccess('Training updated successfully');
    } else {
      this.trainings.unshift(training);
      this.showSuccess('Training added successfully');
    }

    this.filteredTrainings = [...this.trainings];
    this.updateTotalPages();
    this.modalRef.close();
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
    this.totalPages = Math.ceil(this.filteredTrainings.length / this.itemsPerPage) || 1;
  }

  get paginatedTrainings(): Training[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTrainings.slice(start, start + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  confirmDelete(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this training record!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        this.trainings = this.trainings.filter(t => t.id !== id);
        this.filteredTrainings = this.filteredTrainings.filter(t => t.id !== id);
        this.showSuccess('Training deleted successfully');
        this.updateTotalPages();
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Planned': return 'bg-info';
      case 'In Progress': return 'bg-warning text-dark';
      case 'Completed': return 'bg-success';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}