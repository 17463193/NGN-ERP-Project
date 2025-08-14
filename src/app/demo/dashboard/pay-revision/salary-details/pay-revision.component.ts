import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { catchError, finalize, tap, map } from 'rxjs/operators';
import { forkJoin, of, throwError } from 'rxjs';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'src/app/core/services/auth.service';

interface Employee {
  empId: string;
  empCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  department: string;
  positionId?: string;
  positionName?: string;
  employmentType?: string;
  maxSalary: number;
  hireDate: string;
}

interface EmployeeWrapper {
  employee: Employee;
  contacts: any[];
  addresses: any[];
  qualifications: any[];
  bankDetails: any[];
}

interface Department {
  deptId: string;
  deptName: string;
}

interface Position {
  positionId: string;
  positionName: string;
}

interface SalaryComponent {
  empCode: string;
  salaryDetailId: string;
  componentCode: string;
  componentValue: number;
  firstName: string;
  componentName: string;
  lastName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
}

interface EmployeeSalaryData {
  basicSalary: number;
  grossSalary: number;
  components: SalaryComponent[];
}

@Component({
  standalone: true,
  selector: 'app-pay-revise',
  templateUrl: './pay-revision.component.html',
  styleUrls: ['./pay-revision.component.scss'],
  imports: [FormsModule, CommonModule, NgbTooltipModule],
  providers: [DatePipe, CurrencyPipe]
})
export class PayRevisionComponent implements OnInit {
  allEmployees: EmployeeWrapper[] = [];
  filteredEmployees: any[] = [];
  paginatedEmployees: any[] = [];
  departments: Department[] = [];
  positions: Position[] = [];
  employeeSalaries: { [empId: string]: EmployeeSalaryData } = {};
  
  selectedDepartment: string = 'All';
  selectedPosition: string = 'All';
  
  searchQuery: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50, 100];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  isSalaryLoading: { [empId: string]: boolean } = {};

  constructor(
  private http: HttpClient,
  private router: Router,
  private datePipe: DatePipe,
  private currencyPipe: CurrencyPipe,
  private authService: AuthService  // Add this
) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }

  loadInitialData(): void {
    this.isLoading = true;
    
    forkJoin([
      this.loadEmployees(),
      this.loadDepartments(),
      this.loadPositions()
    ]).subscribe({
      next: () => {
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading initial data:', err);
        this.errorMessage = 'Failed to load initial data';
        this.isLoading = false;
      }
    });
  }

  loadEmployees(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<EmployeeWrapper[]>(
        `${environment.apiUrl}/api/v1/employees`,
        { headers: this.getHeaders() }
      ).pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      ).subscribe({
        next: (response) => {
          this.allEmployees = Array.isArray(response) ? response : [];
          this.filteredEmployees = this.allEmployees.map(item => {
            const employee: Employee = item.employee || {
              empId: '',
              empCode: '',
              firstName: '',
              lastName: '',
              dateOfBirth: '',
              gender: '',
              email: '',
              department: '',
              maxSalary: 0,
              hireDate: ''
            };
            
            this.isSalaryLoading[employee.empId] = true;
            this.employeeSalaries[employee.empId] = {
              basicSalary: 0,
              grossSalary: 0,
              components: []
            };
            
            this.loadEmployeeSalary(employee.empId, employee.empCode);
            
            return {
              ...employee,
              department: employee.department || '',
              contacts: item.contacts || [],
              addresses: item.addresses || []
            };
          });
          resolve();
        },
        error: (err) => {
          console.error('Error loading employees:', err);
          this.errorMessage = 'Failed to load employee data';
          reject(err);
        }
      });
    });
  }

  loadEmployeeSalary(empId: string, empCode: string): void {
    if (!empId) return;
    
    this.isSalaryLoading[empId] = true;
    
    this.http.get<SalaryComponent[]>(
      `${environment.payrollApiUrl}/api/payRoll/salary-details/${empId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => {
        console.error(`Error loading salary for employee ${empId}:`, err);
        this.employeeSalaries[empId] = {
          basicSalary: 0,
          grossSalary: 0,
          components: []
        };
        return of([]);
      }),
      finalize(() => {
        this.isSalaryLoading[empId] = false;
      })
    ).subscribe({
      next: (salaryComponents) => {
        const currentComponents = salaryComponents.filter(c => c?.isCurrent);
        const basicComponent = currentComponents.find(c => 
          c?.componentCode === 'BASIC' || 
          c?.componentName?.toLowerCase().includes('basic')
        );
        
        const grossSalary = currentComponents.reduce((sum, c) => sum + (c?.componentValue || 0), 0);
        
        this.employeeSalaries[empId] = {
          basicSalary: basicComponent?.componentValue || 0,
          grossSalary: grossSalary,
          components: currentComponents
        };
      }
    });
  }

  viewEmployeeDetails(empId: string): void {
    const employeeWrapper = this.allEmployees.find(e => e.employee?.empId === empId);
    
    if (!employeeWrapper) {
      console.error('Employee not found for ID:', empId);
      return;
    }

    // Clear navigation and force component reload
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/salary-view-details', empId], {
        state: {
          employeeData: employeeWrapper.employee,
          salaryData: this.employeeSalaries[empId],
          contacts: employeeWrapper.contacts,
          addresses: employeeWrapper.addresses
        }
      });
    });
  }

  applyFilters(): void {
    let filtered = [...this.allEmployees.map(item => ({
      ...item.employee,
      contacts: item.contacts,
      addresses: item.addresses
    }))];
    
    // Department filter
    if (this.selectedDepartment !== 'All') {
      filtered = filtered.filter(emp => emp.department === this.selectedDepartment);
    }
    
    // Position filter
    if (this.selectedPosition !== 'All') {
      filtered = filtered.filter(emp => emp.positionId === this.selectedPosition);
    }
    
    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        (emp.firstName?.toLowerCase().includes(query)) || 
        (emp.lastName?.toLowerCase().includes(query)) || 
        (emp.empCode?.toLowerCase().includes(query)) || 
        (emp.email?.toLowerCase().includes(query))
      );
    }
    
    this.filteredEmployees = filtered;
    this.currentPage = 1;
    this.updatePaginatedEmployees();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedDepartment = 'All';
    this.selectedPosition = 'All';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery !== '' || 
      this.selectedDepartment !== 'All' || 
      this.selectedPosition !== 'All'
    );
  }

  updatePaginatedEmployees(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedEmployees = this.filteredEmployees.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage = page;
      this.updatePaginatedEmployees();
    }
  }

  totalPages(): number {
    return Math.ceil(this.filteredEmployees.length / this.itemsPerPage);
  }

  getPages(): number[] {
    const pages: number[] = [];
    const totalPages = this.totalPages();
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, this.currentPage - half);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push(-1);
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push(-1);
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.updatePaginatedEmployees();
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredEmployees.length);
  }



  openReviseSalary(empId: string): void {
    const employeeWrapper = this.allEmployees.find(e => e.employee.empId === empId);
    
    if (employeeWrapper) {
      this.router.navigate(['/revise-salary', empId], {
        state: {
          salaryData: this.employeeSalaries[empId],
          employee: employeeWrapper.employee
        }
      });
    }
  }

  getCurrentSalary(empId: string): string {
    if (!empId || !this.employeeSalaries[empId] || this.employeeSalaries[empId].grossSalary <= 0) {
      return '-';
    }
    return this.currencyPipe.transform(
      this.employeeSalaries[empId].grossSalary,
      'Nu',
      'symbol',
      '1.2-2'
    ) || '-';
  }

  getSalaryTooltip(empId: string): string {
    if (!empId || !this.employeeSalaries[empId]) {
      return 'Salary details not available';
    }
    
    const salaryData = this.employeeSalaries[empId];
    let tooltip = `<strong>Salary Breakdown:</strong><br>`;
    
    if (salaryData.basicSalary > 0) {
      tooltip += `Basic Salary: ${this.currencyPipe.transform(salaryData.basicSalary, 'USD', 'symbol', '1.2-2')}<br>`;
    }
    
    salaryData.components.forEach(comp => {
      if (comp?.componentValue > 0 && comp?.componentCode !== 'BASIC') {
        tooltip += `${comp.componentName}: ${this.currencyPipe.transform(comp.componentValue, 'USD', 'symbol', '1.2-2')}<br>`;
      }
    });
    
    if (salaryData.grossSalary > 0) {
      tooltip += `<strong>Total: ${this.currencyPipe.transform(salaryData.grossSalary, 'USD', 'symbol', '1.2-2')}</strong>`;
    } else {
      tooltip += `<strong>No salary data available</strong>`;
    }
    
    return tooltip;
  }

  async loadDepartments(): Promise<void> {
    const endpoints = [
      `${environment.apiUrl}/api/v1/departments`,
      `${environment.apiUrl}/departments`,
      `${environment.apiUrl}/api/departments`
    ];

    for (const endpoint of endpoints) {
      try {
        const departments = await this.http.get<Department[]>(
          endpoint,
          { 
            headers: this.getHeaders(),
            observe: 'response'
          }
        ).pipe(
          map(response => response.body || []),
          catchError(err => {
            console.error(`Error loading departments from ${endpoint}:`, err);
            return of([]);
          })
        ).toPromise();

        if (departments && departments.length > 0) {
          this.departments = departments;
          return;
        }
      } catch (err) {
        console.error(`Unexpected error loading departments from ${endpoint}:`, err);
      }
    }

    console.error('All department endpoints failed');
    this.errorMessage = 'Failed to load department data. Please check your connection and try again.';
    this.departments = [];
  }

  loadPositions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<Position[]>(
        `${environment.apiUrl}/api/v1/job-positions`,
        { headers: this.getHeaders() }
      ).pipe(
        catchError(err => {
          console.error('Error loading positions:', err);
          return of([]);
        })
      ).subscribe({
        next: (positions) => {
          this.positions = Array.isArray(positions) ? positions : [];
          resolve();
        },
        error: (err) => {
          console.error('Error in position loading:', err);
          this.positions = [];
          reject(err);
        }
      });
    });
  }

  getDepartmentName(deptId: string): string {
    if (!deptId || !this.departments || this.departments.length === 0) return 'N/A';
    
    const dept = this.departments.find(d => d?.deptId === deptId);
    if (dept) return dept.deptName;
    
    const deptLower = this.departments.find(d => 
      d?.deptId?.toLowerCase() === deptId?.toLowerCase()
    );
    if (deptLower) return deptLower.deptName;
    
    console.warn(`Department with ID ${deptId} not found in departments list`);
    return 'N/A';
  }

  getPositionName(positionId?: string): string {
    if (!positionId) return 'N/A';
    const position = this.positions.find(p => p?.positionId === positionId);
    return position?.positionName || 'N/A';
  }

  getEmploymentTypeClass(type?: string): string {
    if (!type) return 'bg-secondary';
    
    switch (type.toLowerCase()) {
      case 'regular': return 'bg-success';
      case 'contract': return 'bg-primary';
      case 'temporary': return 'bg-warning text-dark';
      case 'probation': return 'bg-info text-dark';
      case 'intern': return 'bg-secondary';
      case 'consultant': return 'bg-dark';
      default: return 'bg-light text-dark';
    }
  }
}