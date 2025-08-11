import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Subject, of, throwError } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { HttpClient, HttpClientModule, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { FormBuilder, FormGroup } from '@angular/forms';

interface EmployeeAttendance {
  id?: string;
  employeeId?: number;
  empCode?: string;
  name?: string;
  department?: string;
  displayDepartment?: string;
  departmentId?: string;
  branchId?: string;
  branchName?: string;
  attendanceDate?: string;
  dayOfWeek?: string;
  timePeriod?: string;
  status?: string;
  requiredCheckInTime?: string;
  requiredCheckOutTime?: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  totalDuration?: string;
  lateCheckInTime?: string;
  overTime?: string;
}

interface Department {
  id?: string;
  dept_id: string;
  dept_name: string;
  dept_code: string;
  org_name: string;
  branch_name: string;
  branchId?: string;
  name?: string;
  code?: string;
  isMainBranch?: boolean;
  budget_allocation: number;
  sub_departments_count: number;
}

interface Branch {
  id?: string;
  branchId: string;
  branchName: string;
  name?: string;
  branchCode: string;
  dzongkhag: string;
  thromde: string;
  operationalStatus: boolean;
  organizationName: string;
}

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [CommonModule, SharedModule, HttpClientModule],
  templateUrl: './employee-attendance.component.html',
  styleUrls: ['./employee-attendance.component.scss']
})
export class EmployeeAttendanceComponent implements OnInit {
  divisions: Department[] = [];
  branches: Branch[] = [];
  tabDepartments: (Department | string)[] = ['All Employee'];
  selectedBranchId: string = '';
  filteredDepartments: Department[] = [];
  formDepartments: Department[] = [];
  statuses = ['All Employee', 'Present', 'Late', 'Absent', 'Early Departure', 'Leave'];

  selectedDivision = 'All Employee';
  selectedStatus = 'All Employee';
  selectedBranch = 'All Branches';
  searchQuery = '';
  private searchSubject = new Subject<string>();
  showFilters = false;
  filterCount = 0;
  currentPage = 1;
  itemsPerPage = 10;
  currentDate = new Date();
  activeTab = 'All Employee';

  attendanceData: EmployeeAttendance[] = [];
  isLoading = false;
  errorMessage = '';
  apiUrl = `${environment.apiUrl}/api/v1/employee-attendance/latest`;
  deptApiUrl = `${environment.apiUrl}/api/v1/departments`;
  branchApiUrl = `${environment.apiUrl}/api/v1/branches`;

  // Date filter properties
  dateFilterForm: FormGroup;
  showDateFilter = false;
  currentFilterDate: string | null = null;
  minDate: Date;
  maxDate: Date;

  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  private departmentMap: { [key: string]: string } = {}

  constructor(private http: HttpClient, private fb: FormBuilder) { }

  ngOnInit(): void {
    this.initDateFilter();
    
    this.loadBranches()
      .then(() => {
        console.log('Branches loaded:', this.branches);
        return this.loadDepartments();
      })
      .then(() => {
        console.log('Initial departments loaded');
        return this.loadAttendanceData();
      })
      .catch(error => {
        console.error('Initialization error:', error);
        this.errorMessage = 'Failed to initialize data. Please refresh the page.';
      });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((query) => {
      this.searchQuery = query;
      this.currentPage = 1;
      this.showEmptyStateIfNeeded();
    });
  }

  private initDateFilter(): void {
    const today = new Date();
    this.maxDate = new Date(today);
    this.minDate = new Date(today);
    this.minDate.setMonth(today.getMonth() - 3); // Allow filtering up to 3 months back
    
    this.dateFilterForm = this.fb.group({
      filterDate: [null]
    });
  }

  toggleDateFilter(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showDateFilter = !this.showDateFilter;
    if (this.showDateFilter) {
      // Reset form when opening
      this.dateFilterForm.reset();
      // Set default date to today if no date is selected
      if (this.currentFilterDate) {
        this.dateFilterForm.patchValue({
          filterDate: this.formatDateForInput(this.currentFilterDate)
        });
      }
    }
  }

  applyDateFilter(): void {
    const selectedDate = this.dateFilterForm.get('filterDate')?.value;
    if (selectedDate) {
      // Convert to YYYY-MM-DD format string for the API
      this.currentFilterDate = this.formatDate(new Date(selectedDate));
      this.showDateFilter = false;
      this.loadAttendanceData();
    }
  }

  clearDateFilter(): void {
    this.currentFilterDate = null;
    this.dateFilterForm.reset();
    this.loadAttendanceData();
    this.showDateFilter = false;
  }

  private formatDate(date: Date | string): string {
    if (!date) return '--';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '--';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format date for input field (YYYY-MM-DD)
  private formatDateForInput(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Check if any filters have been applied
  hasAppliedFilters(): boolean {
    return this.currentFilterDate !== null || 
           this.selectedBranchId !== '' ||
           this.activeTab !== 'All Employee';
  }

  // Get department name for display
  getDepartmentName(dept: string | Department): string {
    if (typeof dept === 'string') {
      return dept === 'All Employee' ? 'All Departments' : dept;
    }
    return dept.dept_name || dept.name || '--';
  }

  // Get employee's full name from the data
  getEmployeeFullName(emp: any): string {
    if (!emp) return '--';
    // If name is already combined, return as is
    if (emp.name) return emp.name;
    // Otherwise combine first and last names if they exist
    const firstName = emp.firstName || '';
    const lastName = emp.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || '--';
  }

  // Get department display name for an employee
  getDepartmentDisplayName(emp: any): string {
    if (!emp) return 'Unassigned';
    // First try displayDepartment, then department, then departmentId
    return emp.displayDepartment || emp.department || emp.departmentId || 'Unassigned';
  }

  get emptyStateMessage(): string {
    if (this.errorMessage) return '';
    if (this.isLoading) return '';

    if (this.searchQuery || this.selectedDivision !== 'All Employee' || this.selectedStatus !== 'All Employee' || this.selectedBranch !== 'All Branches') {
      return 'No records match your search!';
    }
    return 'No employee records found.';
  }

  private showEmptyStateIfNeeded(): void { }

  private safeString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private safeLowerString(value: any): string {
    return this.safeString(value).toLowerCase();
  }

  private async loadBranches(): Promise<void> {
    try {
      const response = await this.http.get<any>(this.branchApiUrl, this.httpOptions)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Failed to load branches:', error);
            this.errorMessage = 'Failed to load branches. Please try again later.';
            return of({ data: [] });
          })
        ).toPromise();

      this.branches = (Array.isArray(response) ? response : response?.data || []).map((branch: any) => ({
        id: branch.id || branch.branchId,
        name: branch.name || branch.branchName,
        branchId: branch.branchId,
        branchName: branch.branchName
      }));

      console.log('Branches loaded:', this.branches);
    } catch (error) {
      console.error('Error loading branches:', error);
      this.branches = [];
      this.errorMessage = 'Failed to load branches. Please try again later.';
    }
  }

  private loadDepartments(branchId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let url = this.deptApiUrl;
      if (branchId) {
        url = `${this.deptApiUrl}/branch/${branchId}`;
      }

      this.http.get<{ success: boolean, message: string, data: Department[] }>(url, this.httpOptions)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Failed to load departments:', error);
            this.errorMessage = 'Failed to load departments. Please try again later.';
            reject(error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.formDepartments = response.data;
              this.filteredDepartments = [...response.data];
              this.departmentMap = {};

              this.tabDepartments = [
                'All Employee',
                ...response.data.map(dept => dept.dept_name)
              ];

              response.data.forEach(dept => {
                this.departmentMap[dept.dept_id] = dept.dept_name;
              });
              resolve();
            } else {
              reject(new Error('Invalid department data'));
            }
          },
          error: (error) => {
            console.error('Error in department subscription:', error);
            reject(error);
          }
        });
    });
  }

  onBranchChange(event?: Event): void {
    if (event) {
      const selectElement = event.target as HTMLSelectElement;
      this.selectedBranchId = selectElement.value;
    }
    
    this.currentPage = 1;
    const branchIdToLoad = this.selectedBranchId && this.selectedBranchId !== 'undefined'
      ? this.selectedBranchId
      : undefined;

    console.log('Branch changed to:', branchIdToLoad);

    this.loadDepartments(branchIdToLoad)
      .then(() => {
        console.log('Departments loaded, now loading attendance data');
        this.loadAttendanceData();
      })
      .catch(error => {
        console.error('Error in branch change:', error);
        this.errorMessage = 'Failed to load department data. Please try again.';
      });
  }

  loadAttendanceData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Determine which API endpoint to use based on whether we have a date filter
    let url: string;
    const params: any = {
      page: (this.currentPage - 1).toString(),
      size: this.itemsPerPage.toString()
    };
    
    if (this.currentFilterDate) {
      // Use the date-specific endpoint
      url = `${environment.apiUrl}/api/v1/employee-attendance/date/${this.currentFilterDate}`;
      
      // Add other filters as query parameters
      if (this.selectedBranch !== 'All Branches') {
        params.branchId = this.selectedBranch;
      }
      
      if (this.selectedDivision !== 'All Employee') {
        params.department = this.selectedDivision;
      }
      
      if (this.searchQuery) {
        params.employeeId = this.searchQuery;
      }
    } else {
      // Use the default endpoint for latest data
      url = this.apiUrl;
      
      if (this.selectedBranch !== 'All Branches') {
        params.branchId = this.selectedBranch;
      }
      
      if (this.selectedDivision !== 'All Employee') {
        params.department = this.selectedDivision;
      }
      
      if (this.selectedStatus !== 'All Employee') {
        params.status = this.selectedStatus;
      }
      
      if (this.searchQuery) {
        params.search = this.searchQuery;
      }
    }

    this.http.get<any>(url, { params })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error loading attendance data:', error);
          this.errorMessage = 'Failed to load attendance data. Please try again later.';
          return of({ content: [] });
        })
      )
      .subscribe({
        next: (response) => {
          // Handle both response formats: array for old endpoint, paginated for new
          const data = response.content !== undefined ? response.content : response;
          this.attendanceData = Array.isArray(data) ? data : [];
          
          // Update pagination info if available
          if (response.totalElements !== undefined) {
            this.itemsPerPage = response.size || this.itemsPerPage;
            this.currentPage = (response.number || 0) + 1;
          }
          
          this.isLoading = false;
          this.showEmptyStateIfNeeded();
        },
        error: (error) => {
          console.error('Error in subscription:', error);
          this.isLoading = false;
          this.errorMessage = 'An error occurred while processing the data.';
          this.attendanceData = [];
          this.showEmptyStateIfNeeded();
        }
      });
  }

  private validateAttendanceData(data: any[]): EmployeeAttendance[] {
    console.log('Validating attendance data:', data);
    return data.map(item => {
      let departmentName = 'Unassigned';
      let displayDepartment = 'Unassigned';
      let branchId = '';
      let branchName = '';
      
      if (item?.department && typeof item.department === 'string') {
        const deptParts = item.department.split('>');
        if (deptParts.length > 1) {
          departmentName = deptParts[deptParts.length - 1].trim();
          displayDepartment = departmentName;
        } else {
          departmentName = item.department;
          displayDepartment = item.department;
        }
      } else if (item?.departmentId && this.formDepartments.length > 0) {
        const foundDept = this.formDepartments.find(d => d.dept_id === item.departmentId);
        if (foundDept) {
          departmentName = foundDept.dept_name;
          branchId = foundDept.branch_name;
          branchName = foundDept.branch_name;
          displayDepartment = foundDept.dept_name;
        }
      }
      const processedItem = {
        ...item,
        empCode: Number(item?.empCode) || 0,
        name: `${this.safeString(item?.firstName)} ${this.safeString(item?.lastName)}`.trim() || 'Unknown',
        department: departmentName,
        displayDepartment: displayDepartment,
        departmentId: item?.departmentId,
        branchId: branchId,
        branchName: branchName,
        attendanceDate: this.safeString(item?.attendanceDate),
        dayOfWeek: this.safeString(item?.dayOfWeek),
        timePeriod: this.safeString(item?.timePeriod),
        status: this.determineStatus(item),
        requiredCheckInTime: this.formatTime(item?.requiredCheckInTime),
        requiredCheckOutTime: this.formatTime(item?.requiredCheckOutTime),
        actualCheckInTime: this.formatTime(item?.actualCheckInTime),
        actualCheckOutTime: this.formatTime(item?.actualCheckOutTime),
        lateCheckInTime: this.formatTime(item?.lateCheckInTime),
        totalDuration: this.formatDuration(item?.totalDuration),
        overTime: this.calculateOvertime(item)
      };
      console.log('Processed item:', processedItem);
      return processedItem;
    });
  }

  private determineStatus(item: any): string {
    // If no check-in time, mark as Absent
    if (!item.actualCheckInTime || item.actualCheckInTime === '00:00:00') {
      return 'Absent';
    }

    const requiredIn = item.requiredCheckInTime;
    let requiredOut = item.requiredCheckOutTime;
    const day = (item.dayOfWeek || '').toLowerCase();

    // Special case for Saturday
    if (day === 'saturday') {
      requiredOut = '13:00:00';
    }

    // If no required check-in/out times, mark as Present as a fallback
    if (!requiredIn || requiredIn.trim() === '' || requiredIn === '00:00:00' ||
        !requiredOut || requiredOut.trim() === '' || requiredOut === '00:00:00') {
      return 'Present';
    }

    // Check for late check-in
    const actualIn = this.timeToMinutes(item.actualCheckInTime);
    const requiredInTime = this.timeToMinutes(requiredIn);
    
    if (actualIn > requiredInTime) {
      return 'Late';
    }

    // Check for early departure if check-out time exists
    if (item.actualCheckOutTime && item.actualCheckOutTime !== '00:00:00') {
      const actualOut = this.timeToMinutes(item.actualCheckOutTime);
      const requiredOutTime = this.timeToMinutes(requiredOut);
      
      if (actualOut < requiredOutTime) {
        return 'Early Departure';
      }
    }

    // Default to Present if no other conditions met
    return 'Present';
  }

  // Helper method to convert time string to minutes since midnight
  private timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    
    // Handle formats like '09:00:00' or '09:00'
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0], 10) || 0;
      const minutes = parseInt(timeParts[1], 10) || 0;
      return hours * 60 + minutes;
    }
    return 0;
  }

  private calculateOvertime(item: any): string {
    if (!item.actualCheckOutTime) return '--';

    const actualOut = new Date(`1970-01-01T${item.actualCheckOutTime}`);
    const overtimeStart = new Date(`1970-01-01T17:30`);
    const nextDayLimit = new Date(`1970-01-01T08:44`);

    if (actualOut <= overtimeStart && actualOut >= nextDayLimit) return '--';

    if (actualOut > overtimeStart) {
      const overtimeMs = actualOut.getTime() - overtimeStart.getTime();
      const overtimeHours = Math.floor(overtimeMs / (1000 * 60 * 60));
      const overtimeMinutes = Math.floor((overtimeMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${overtimeHours.toString().padStart(2, '0')}:${overtimeMinutes.toString().padStart(2, '0')}`;
    }

    return '--';
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  }

  formatDuration(duration: string): string {
    if (!duration) return '';
    return duration.substring(0, 5);
  }

  selectTab(dept: string): void {
    this.activeTab = dept;
    this.currentPage = 1;

    if (dept === 'All Employee') {
      this.selectedDivision = 'All Employee';
    } else {
      const foundDept = this.divisions.find(d =>
        d.name === dept || d.code === dept
      );
      this.selectedDivision = foundDept ? (foundDept.isMainBranch ? foundDept.name : foundDept.code) : dept;
    }

    this.showEmptyStateIfNeeded();
  }

  setBranchFilter(branchId: string): void {
    this.selectedBranchId = branchId;
    this.selectedBranch = branchId === '' ? 'All Branches' :
      this.branches.find(b => b.id === branchId)?.name || 'All Branches';
    this.currentPage = 1;
    this.updateFilterCount();
    this.onBranchChange();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.showEmptyStateIfNeeded();
  }

  get filteredAttendance(): EmployeeAttendance[] {
    if (!this.attendanceData?.length) return [];

    const query = this.safeLowerString(this.searchQuery);
    const status = this.safeLowerString(this.selectedStatus);
    const branch = this.safeLowerString(this.selectedBranch);

    return this.attendanceData.filter(emp => {
      if (this.selectedDivision !== 'All Employee') {
        const foundDept = this.divisions.find(d =>
          (d.isMainBranch ? d.name : d.code) === this.selectedDivision
        );
        if (!foundDept || emp.departmentId !== foundDept.id) {
          return false;
        }
      }

      if (status !== 'all employee') {
        const empStatus = this.safeLowerString(emp.status);
        if (empStatus !== status) return false;
      }

      if (branch !== 'all branches') {
        const empBranch = this.safeLowerString(emp.branchId);
        if (!empBranch.includes(branch)) return false;
      }

      if (query) {
        const empName = this.safeLowerString(emp.name);
        const empId = this.safeString(emp.employeeId);
        const empDept = this.safeLowerString(emp.department);

        if (!empName.includes(query) &&
          !empId.includes(query) &&
          !empDept.includes(query)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  get totalPages(): number {
    return Math.ceil(this.filteredAttendance.length / this.itemsPerPage);
  }

  get paginatedData(): EmployeeAttendance[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredAttendance.slice(startIndex, startIndex + this.itemsPerPage);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  setDivisionFilter(departmentName: string): void {
    this.selectedDivision = departmentName;
    this.currentPage = 1;
    this.updateFilterCount();
    this.showFilters = false;
    this.showEmptyStateIfNeeded();
  }

  setStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.updateFilterCount();
    this.showFilters = false;
    this.showEmptyStateIfNeeded();
  }

  private updateFilterCount(): void {
    this.filterCount =
      (this.selectedDivision !== 'All Employee' ? 1 : 0) +
      (this.selectedStatus !== 'All Employee' ? 1 : 0) +
      (this.selectedBranch !== 'All Branches' ? 1 : 0) +
      (this.currentFilterDate ? 1 : 0);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  formatDateForDisplay(dateString: string): string {
    try {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch {
      return dateString;
    }
  }

  exportToPdf(): void {
    const doc = new jsPDF({ orientation: 'landscape' });

    let title = 'Employee Attendance Report';
    if (this.selectedDivision !== 'All Employee') title += ` - ${this.selectedDivision}`;
    if (this.selectedStatus !== 'All Employee') title += ` (${this.selectedStatus})`;
    if (this.selectedBranch !== 'All Branches') title += ` [Branch: ${this.selectedBranch}]`;
    if (this.searchQuery) title += ` [Search: "${this.searchQuery}"]`;
    if (this.currentFilterDate) {
      const filterDate = new Date(this.currentFilterDate);
      const monthName = filterDate.toLocaleString('default', { month: 'long' });
      const year = filterDate.getFullYear();
      title += ` [${monthName} ${year}]`;
    }

    doc.setFontSize(18);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const columns = [
      { header: 'Employee ID', dataKey: 'employeeId' },
      { header: 'Employee', dataKey: 'nameWithDept' },
      { header: 'Department', dataKey: 'displayDepartment' },
      { header: 'Branch', dataKey: 'branchName' },
      { header: 'Date', dataKey: 'attendanceDate' },
      { header: 'Shift', dataKey: 'timePeriod' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Clock In', dataKey: 'actualCheckInTime' },
      { header: 'Clock Out', dataKey: 'actualCheckOutTime' },
      { header: 'Late Check-In', dataKey: 'lateCheckInTime' },
      { header: 'Over Time', dataKey: 'overTime' }
    ];

    const tableData = this.filteredAttendance.map(item => {
      const isLate = !!(item.lateCheckInTime && item.lateCheckInTime !== '--' && item.lateCheckInTime !== '00:00');
      const branchName = this.branches.find(b => b.id === item.branchId)?.name || item.branchName || '--';

      return {
        employeeId: String(item.employeeId || '--'),
        nameWithDept: `${item.name || 'Unknown'}`,
        displayDepartment: item.displayDepartment || item.department || 'Unassigned',
        branchName: branchName,
        attendanceDate: item.attendanceDate ? this.formatDateForDisplay(item.attendanceDate) : '--',
        timePeriod: String(item.timePeriod || '--'),
        status: String(item.status || '--'),
        actualCheckInTime: String(item.actualCheckInTime || '--'),
        actualCheckOutTime: String(item.actualCheckOutTime || '--'),
        lateCheckInTime: String(item.lateCheckInTime || '--'),
        overTime: String(item.overTime || '--'),
        isLate: isLate
      };
    });

    autoTable(doc, {
      columns: columns,
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        textColor: [0, 0, 0],
        fontStyle: 'normal'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'normal'
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          data.cell.styles.fillColor = [41, 128, 185];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
        }

        if (data.row.raw && 'isLate' in data.row.raw && data.row.raw['isLate']) {
          data.cell.styles.fillColor = [255, 235, 238];
          data.cell.styles.textColor = [211, 47, 47];

          if (data.column.dataKey === 'nameWithDept') {
            data.cell.styles.textColor = [211, 47, 47];
          }
        }
      }
    });

    let filename = 'Employee_Attendance';
    if (this.selectedDivision !== 'All Employee') filename += `_${this.selectedDivision.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (this.selectedStatus !== 'All Employee') filename += `_${this.selectedStatus.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (this.selectedBranch !== 'All Branches') filename += `_Branch_${this.selectedBranch.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (this.searchQuery) filename += `_Search_${this.searchQuery.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (this.currentFilterDate) {
      const filterDate = new Date(this.currentFilterDate);
      const year = filterDate.getFullYear();
      const month = (filterDate.getMonth() + 1).toString().padStart(2, '0');
      filename += `_${year}_${month}`;
    }
    filename += `_${new Date().toISOString().slice(0, 10)}.pdf`;

    doc.save(filename);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Close date filter when clicking outside
    const target = event.target as HTMLElement;
    const dateFilterButton = document.querySelector('.date-filter-button');
    const dateFilterDropdown = document.querySelector('.date-filter-dropdown');
    
    if (dateFilterButton && !dateFilterButton.contains(target) && 
        dateFilterDropdown && !dateFilterDropdown.contains(target)) {
      this.showDateFilter = false;
    }
  }
}