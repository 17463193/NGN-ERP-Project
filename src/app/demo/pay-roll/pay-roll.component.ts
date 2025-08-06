import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pay-roll',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HttpClientModule],
  templateUrl: './pay-roll.component.html',
  styleUrls: ['./pay-roll.component.scss']
})
export class PayRollComponent implements OnInit {
  employees: any[] = [];
  filteredEmployees: any[] = [];
  departments: string[] = [];
  selectedDepartment: string = 'All';
  activeFilter: string = 'all';
  searchQuery: string = '';

  selectedYear: string;
  selectedMonth: string;

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

  constructor(private http: HttpClient) {
    const now = new Date();
    this.selectedYear = now.getFullYear().toString();

    let prevMonth = now.getMonth();
    if (prevMonth === 0) {
      prevMonth = 12;
      this.selectedYear = (now.getFullYear() - 1).toString();
    }
    this.selectedMonth = prevMonth.toString().padStart(2, '0');

    const currentYear = now.getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      this.years.push(y.toString());
    }
  }

  ngOnInit() {
    this.loadDepartments();
    this.loadEmployees();
  }

  loadDepartments() {
    this.http.get<any[]>(this.deptApiUrl).subscribe({
      next: (data) => {
        this.departments = ['All', ...data.map(dept => dept.name)];
      },
      error: (err) => {
        this.departments = ['All'];
      }
    });
  }

  loadEmployees() {
    const url = `${environment.apiUrl}/api/payRoll/getAllPayRoll`;

    const params = new HttpParams()
      .set('year', this.selectedYear)
      .set('month', this.selectedMonth);

    this.http.get<any[]>(url, { params }).subscribe({
      next: (data) => {
        this.employees = data.map(emp => ({
          id: emp.empId,
          empCode: emp.empCode,
          name: [emp.firstName, emp.middleName, emp.lastName].filter(n => n).join(' '),
          department: emp.department || 'Unknown',
          netSalary: emp.netSalary,
          salaryMonth: emp.salaryMonth,
          status: emp.employmentStatus.toLowerCase(),
          overtime: emp.overtime || '0'
        }));
        this.applyFilters(); // Apply current filters
      },
      error: () => {
        this.employees = [];
        this.filteredEmployees = [];
      }
    });
  }

  onYearChange(event: string) {
    this.selectedYear = event;
    this.loadEmployees();
  }

  onMonthChange(event: string) {
    this.selectedMonth = event;
    this.loadEmployees();
  }

  getStatusText(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  filterEmployees(type: string) {
    this.activeFilter = type;
    this.applyFilters();
  }

  applyFilters() {
    // Apply employment type filter
    let filtered = [...this.employees];
    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(emp => emp.status === this.activeFilter.toLowerCase());
    }

    // Apply department filter
    if (this.selectedDepartment && this.selectedDepartment !== 'All') {
      filtered = filtered.filter(emp => emp.department === this.selectedDepartment);
    }

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(query) ||
        emp.empCode.toLowerCase().includes(query) ||
        emp.department.toLowerCase().includes(query)
      );
    }

    this.filteredEmployees = filtered;
  }

  searchEmployees() {
    this.applyFilters();
  }
}