import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface Branch {
  branchId: string;
  branchName: string;
  branchCode: string;
  dzongkhag: string;
  thromde: string;
  operationalStatus: boolean;
  organizationName: string;
}

interface Department {
  dept_id: string;
  dept_name: string;
  branch_id?: string;
  [key: string]: any;
}

interface Employee {
  id: string;
  empCode: string;
  name: string;
  department: string;
  department_id?: string;
  branch_id?: string;
  netSalary: number;
  salaryMonth: string;
  status: string;
  overtime: string;
  position?: string;
}

@Component({
  selector: 'app-pay-roll',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HttpClientModule],
  templateUrl: './pay-roll.component.html',
  styleUrls: ['./pay-roll.component.scss']
})
export class PayRollComponent implements OnInit {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  branches: Branch[] = [];
  allDepartments: Department[] = [];
  filteredDepartments: Department[] = [];
  
  selectedBranch: string = 'All';
  selectedDepartment: string = 'All';
  activeFilter: string = 'all';
  searchQuery: string = '';

  selectedYear: string;
  selectedMonth: string;

  // Add the missing properties
  totalEmployees: number = 0;
  totalPayroll: number = 0;
  processedCount: number = 0;
  currentPage: number = 1;
  itemsPerPage: number = 10;

  years: string[] = [];
  months = [
    { value: '01', name: 'January' },
    { value: '02', name: 'February' },
    { value: '03', name: 'March' },
    { value: '04', name: 'April' },
    { value: '05', name: 'May' },
    { value: '06', name: 'June' },
    { value: '07', name: 'July' },
    { value: '08', name: 'August' },
    { value: '09', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' },
  ];

  private readonly deptApiUrl = `${environment.apiUrl}/api/v1/departments`;
  private readonly branchApiUrl = `${environment.apiUrl}/api/v1/branches`;
  private readonly payrollApiUrl = `${environment.payrollApiUrl}/api/payRoll/getAllPayRoll`;

  constructor(private http: HttpClient,private router: Router,) {
    const now = new Date();
    this.selectedYear = now.getFullYear().toString();
    this.selectedMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Generate years list
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
      this.years.push(y.toString());
    }
  }

  ngOnInit() {
    this.loadBranches();
  }

  // Add the missing methods
  showAdvancedFilters() {
    // Implement your advanced filters logic here
    console.log('Advanced filters clicked');
  }

  refreshData() {
    this.loadEmployees();
  }

  resetFilters() {
    this.selectedBranch = 'All';
    this.selectedDepartment = 'All';
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.applyFilters();
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatPeriod(month: string): string {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const monthName = this.months.find(m => m.value === monthNum)?.name || '';
    return `${monthName} ${year}`;
  }

  get currentPageStart(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get currentPageEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredEmployees.length);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredEmployees.length / this.itemsPerPage);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  loadBranches(): void {
    this.http.get<any>(this.branchApiUrl).subscribe({
      next: (response) => {
        if (response && Array.isArray(response)) {
          this.branches = [
            { branchId: 'All', branchName: 'All Branches' },
            ...response
          ];
        } else if (response?.data) {
          this.branches = [
            { branchId: 'All', branchName: 'All Branches' },
            ...response.data
          ];
        } else {
          console.warn('Unexpected branches response format:', response);
          this.branches = [
            { 
              branchId: 'All', 
              branchName: 'All Branches', 
              branchCode: '', 
              dzongkhag: '', 
              thromde: '', 
              operationalStatus: true, 
              organizationName: '' 
            }
          ];
        }
        this.loadDepartments();
        this.loadEmployees();
      },
      error: (err) => {
        console.error('Failed to load branches:', err);
        this.branches = [
          { 
            branchId: 'All', 
            branchName: 'All Branches', 
            branchCode: '', 
            dzongkhag: '', 
            thromde: '', 
            operationalStatus: true, 
            organizationName: '' 
          }
        ];
        this.loadDepartments();
        this.loadEmployees();
      }
    });
  }

  loadDepartments() {
    this.http.get<{data: Department[]}>(this.deptApiUrl).subscribe({
      next: (response) => {
        this.allDepartments = [
          { dept_id: 'All', dept_name: 'All Departments', branch_id: 'All' },
          ...response.data.map(dept => {
            const branch = this.branches.find(b => b.branchName === dept['branch_name']);
            return {
              ...dept,
              branch_id: branch ? branch.branchId : 'unknown'
            };
          })
        ];
        this.updateDepartmentFilter();
      },
      error: (err) => {
        console.error('Failed to load departments:', err);
        this.allDepartments = [
          { dept_id: 'All', dept_name: 'All Departments', branch_id: 'All' }
        ];
        this.filteredDepartments = this.allDepartments;
      }
    });
  }

  loadEmployees() {
    const monthParam = parseInt(this.selectedMonth, 10).toString();
    const params = new HttpParams()
      .set('year', this.selectedYear)
      .set('month', monthParam);

    this.http.get<any[]>(this.payrollApiUrl, { params }).subscribe({
      next: (data) => {
        this.employees = data.map(emp => ({
          id: emp.empId,
          empCode: emp.empCode,
          name: [emp.firstName, emp.middleName, emp.lastName].filter(n => n).join(' '),
          department: emp.departmentName || 'Unknown',
          department_id: emp.department_id,
          branch_id: emp.branch_id,
          netSalary: emp.netSalary || 0,
          salaryMonth: emp.salaryMonth || '',
          status: emp.employmentStatus?.toLowerCase() || 'unknown',
          overtime: emp.overtime || '0',
          position: emp.position || 'N/A'
        }));
        
        // Update summary statistics
        this.totalEmployees = this.employees.length;
        this.totalPayroll = this.employees.reduce((sum, emp) => sum + (emp.netSalary || 0), 0);
        this.processedCount = this.employees.filter(emp => emp.status === 'active').length;
        
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error loading employees:', err);
        this.employees = [];
        this.filteredEmployees = [];
        this.totalEmployees = 0;
        this.totalPayroll = 0;
        this.processedCount = 0;
      }
    });
  }

  onBranchChange() {
    this.selectedDepartment = 'All';
    this.updateDepartmentFilter();
    this.applyFilters();
  }

  updateDepartmentFilter() {
    if (this.selectedBranch === 'All') {
      this.filteredDepartments = this.allDepartments.filter(dept => dept.dept_id !== 'All');
      this.filteredDepartments.unshift({ dept_id: 'All', dept_name: 'All Departments', branch_id: 'All' });
    } else {
      this.filteredDepartments = this.allDepartments.filter(
        dept => dept.branch_id === this.selectedBranch || dept.dept_id === 'All'
      );
    }
    
    if (this.selectedDepartment !== 'All' && 
        !this.filteredDepartments.some(dept => dept.dept_id === this.selectedDepartment)) {
      this.selectedDepartment = 'All';
    }
  }

  onYearChange(year: string) {
    this.selectedYear = year;
    this.loadEmployees();
  }

  onMonthChange(month: string) {
    this.selectedMonth = month;
    this.loadEmployees();
  }

  getBranchName(branchId: string): string {
    if (!branchId || branchId === 'All') return 'All Branches';
    if (!this.branches || this.branches.length === 0) {
      return 'Loading...';
    }
    const branch = this.branches.find(b => b.branchId === branchId);
    return branch?.branchName || 'Unknown Branch';
  }

  getDepartmentName(deptId: string): string {
    if (!deptId || deptId === 'All') return 'All Departments';
    if (!this.allDepartments || this.allDepartments.length === 0) {
      return 'Loading...';
    }
    const dept = this.allDepartments.find(d => d.dept_id === deptId);
    return dept?.dept_name || 'Unknown Department';
  }

  getStatusText(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  applyFilters() {
    try {
      let filtered = [...this.employees];

      // Status filter
      if (this.activeFilter !== 'all') {
        filtered = filtered.filter(emp => emp.status === this.activeFilter.toLowerCase());
      }

      // Branch filter
      if (this.selectedBranch !== 'All') {
        filtered = filtered.filter(emp => emp.branch_id === this.selectedBranch);
      }

      // Department filter
      if (this.selectedDepartment !== 'All') {
        filtered = filtered.filter(emp => emp.department_id === this.selectedDepartment);
      }

      // Search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(emp =>
          emp.name.toLowerCase().includes(query) ||
          emp.empCode.toLowerCase().includes(query) ||
          (emp.department?.toLowerCase().includes(query) || '')
        );
      }

      this.filteredEmployees = filtered;
      this.currentPage = 1; // Reset to first page when filters change
    } catch (error) {
      console.error('Error applying filters:', error);
      this.filteredEmployees = [];
    }
  }

  searchEmployees() {
    this.applyFilters();
  }

viewSalaryDetails(empId: string) {
  console.log('Attempting to view salary for employee:', empId); // Debug log
  this.router.navigate(['/pay-roll-detail', empId]);
}
}