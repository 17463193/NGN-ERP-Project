import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentService, Department } from '../../services/department.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './department.component.html',
  styleUrls: ['./department.component.scss']
})
export class DepartmentComponent implements OnInit {
  departments: Department[] = [];
  filteredDepartments: Department[] = [];
  showFilters = false;
  currentPage = 1;
  itemsPerPage = 10;
  isLoading = true;
  error: string | null = null;

  constructor(private departmentService: DepartmentService) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.isLoading = true;
    this.error = null;
    
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        if (response && response.success) {
          // Map the API response to our component's data structure
          this.departments = response.data.map(dept => ({
            ...dept,
            status: true // Default status since it's not in the API response
          }));
          this.filteredDepartments = [...this.departments];
          this.currentPage = 1; // Reset to first page when data is loaded
        } else {
          this.error = response?.message || 'Failed to load departments';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Error loading departments. Please try again later.';
        this.isLoading = false;
        console.error('Error loading departments:', err);
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDepartments.length / this.itemsPerPage);
  }

  get paginatedDepartments(): Department[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDepartments.slice(startIndex, startIndex + this.itemsPerPage);
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

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // You might want to add logic here to fetch data for the new page
      // if you're loading data from a server
    }
  }
}
