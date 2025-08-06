import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceSheetService } from '../../../services/attendance-sheet.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';

Chart.register(...registerables);

interface AttendanceRecord {
  date: number;
  day: string;
  shift: string;
  dayStatus: 'PP' | 'AA' | 'XX' | 'PA' | '--' | '';
  checkIn: string;
  checkOut: string;
  breakTime: string;
  workingHours: string;
  extraHours: string;
  lateTime: string;
  earlyTime: string;
}

@Component({
  selector: 'app-attendance-sheet',
  templateUrl: './attendance-sheet.component.html',
  styleUrls: ['./attendance-sheet.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AttendanceSheetComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('attendanceChart', { static: false }) chartRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;
  private subscription: Subscription = new Subscription();

  // Configuration
  currentDepartment = 'All Departments';
  currentYear = new Date().getFullYear();
  currentMonth = new Date().toLocaleString('default', { month: 'long' });

  // Loading states
  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Filter properties
  selectedDepartment = 'All';
  selectedYear = this.currentYear;
  selectedMonth = new Date().getMonth() + 1; // 1-12

  // Available filter options
  availableYears: number[] = [];
  availableMonths: { value: number, name: string }[] = [];
  departments: string[] = ['All'];

  // Statistics
  attendanceRatio = 0;
  dailyAttendanceData: number[] = [];

  // Summary data
  summary: any = {};

  // Employee data
  employees: any[] = [];

  // Calendar data
  daysInMonth = 31;
  public weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  public monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Dynamic headers from API data
  public dynamicWeekHeaders: string[] = [];
  public dynamicDateHeaders: number[] = [];
  public dynamicDayHeaders: string[] = [];
  public currentDate = new Date();

  constructor(private attendanceService: AttendanceSheetService) { }

  ngOnInit(): void {
    this.initializeFilters();
    this.loadAvailableDates();
    this.loadAttendanceData();
  }

  // Load available years and months from the API
  private loadAvailableDates(): void {
    const sub = this.attendanceService.getAvailableDates().subscribe({
      next: (data) => {
        this.availableYears = data.years;
        this.availableMonths = data.months;

        // Set default selected year/month if not set
        if (!this.selectedYear && this.availableYears.length > 0) {
          this.selectedYear = this.availableYears[this.availableYears.length - 1];
        }

        if (!this.selectedMonth && this.availableMonths.length > 0) {
          this.selectedMonth = this.availableMonths[0].value;
        }

        // Update current month name for display
        const selectedMonthObj = this.availableMonths.find(m => m.value === this.selectedMonth);
        this.currentMonth = selectedMonthObj ? selectedMonthObj.name : this.currentMonth;
      },
      error: (error) => {
        console.error('Error loading available dates:', error);
        // Fallback to default years if API fails
        this.availableYears = [this.currentYear - 1, this.currentYear, this.currentYear + 1];
        this.availableMonths = [
          { value: 1, name: 'January' }, { value: 2, name: 'February' }, { value: 3, name: 'March' },
          { value: 4, name: 'April' }, { value: 5, name: 'May' }, { value: 6, name: 'June' },
          { value: 7, name: 'July' }, { value: 8, name: 'August' }, { value: 9, name: 'September' },
          { value: 10, name: 'October' }, { value: 11, name: 'November' }, { value: 12, name: 'December' }
        ];
      }
    });
    this.subscription.add(sub);
  }

  // Initialize filters with default values
  private initializeFilters(): void {
    const currentDate = new Date();
    this.selectedYear = currentDate.getFullYear();
    this.selectedMonth = currentDate.getMonth() + 1;
    this.selectedDepartment = 'All';
    this.currentYear = this.selectedYear;

    // Find the current month in availableMonths or fallback to current month name
    const currentMonthObj = this.availableMonths.find(m => m.value === this.selectedMonth);
    this.currentMonth = currentMonthObj ? currentMonthObj.name : currentDate.toLocaleString('default', { month: 'long' });
  }

  // Handle filter changes
  onFilterChange(): void {
    // Update current year and month for display
    this.currentYear = this.selectedYear;

    // Find the month name from available months
    const selectedMonthObj = this.availableMonths.find(m => m.value === this.selectedMonth);
    this.currentMonth = selectedMonthObj ? selectedMonthObj.name : 'Month';

    // Update current department for display
    this.currentDepartment = this.selectedDepartment === 'All' ? 'All Departments' : this.selectedDepartment;

    // Reload data with new filters
    this.loadAttendanceData();
  }

  // Reset all filters to default values
  resetFilters(): void {
    const currentDate = new Date();
    this.selectedYear = currentDate.getFullYear();
    this.selectedMonth = currentDate.getMonth() + 1;
    this.selectedDepartment = 'All';
    this.onFilterChange();
  }

  ngAfterViewInit() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      this.initChart();
    }, 100);
  }

  initChart() {
    if (this.chart) {
      this.chart.destroy();
    }

    if (!this.chartRef?.nativeElement) {
      return;
    }

    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const horizontalGridPlugin = {
      id: 'horizontalGrid',
      beforeDatasetsDraw: (chart: any) => {
        if (!chart.scales['y'] || !chart.scales['x']) return;

        const yAxis = chart.scales['y'];
        const xAxis = chart.scales['x'];
        const ctx = chart.ctx;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;

        const ticks = yAxis.ticks;
        for (let i = 0; i < ticks.length; i++) {
          if (ticks[i].value === 0) continue;

          const y = yAxis.getPixelForValue(ticks[i].value);
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.moveTo(xAxis.left, y);
          ctx.lineTo(xAxis.right, y);
          ctx.stroke();
        }

        ctx.restore();
      }
    };

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.dynamicDateHeaders,
        datasets: [{
          label: 'Daily Attendance',
          data: this.dailyAttendanceData,
          backgroundColor: 'rgba(121, 134, 203, 1)',
          borderColor: 'rgba(121, 134, 203, 1)',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 20,
          order: 2
        }]
      },
      plugins: [horizontalGridPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 0 },
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            ticks: {
              stepSize: 2,
              font: { size: 11 },
              color: '#666'
            },
            grid: { display: false },
            border: { display: false }
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              font: { size: 10 }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Attendance: ${context.parsed.y}`,
              title: (context) => `Day ${context[0].label}`
            }
          }
        }
      }
    });
  }

  private loadAttendanceData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    // Reset data before loading new data
    this.employees = [];
    this.summary = {};
    this.dynamicDateHeaders = [];
    this.dynamicWeekHeaders = [];

    // Update current month name for display
    const monthObj = this.availableMonths.find(m => m.value === this.selectedMonth);
    this.currentMonth = monthObj ? monthObj.name : new Date().toLocaleString('default', { month: 'long' });
    this.currentYear = this.selectedYear;

    // Generate headers first to ensure we have the correct number of days
    this.generateMonthHeaders(this.selectedMonth, this.selectedYear);

    // Use getAllAttendanceData to fetch all pages
    const sub = this.attendanceService.getAllAttendanceData(
      this.selectedYear, 
      this.selectedMonth, 
      this.selectedDepartment === 'All' ? undefined : this.selectedDepartment
    ).subscribe({
      next: (data) => {
        this.isLoading = false;
        if (data && data.length > 0) {
          this.processAttendanceData(data);
          this.updateChartData();
          this.hasError = false;
          this.errorMessage = '';
        } else {
          // No data available for the selected month
          this.employees = [];
          this.summary = {};
          this.dynamicDateHeaders = [];
          this.dynamicWeekHeaders = [];
          this.hasError = true;
          this.errorMessage = 'No attendance data available for the selected month.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Failed to load attendance data. Please try again.';
        if (!environment.production) {
          console.warn('Error loading attendance data:', error);
        }
        
        // Process empty data to still show the structure
        this.processAttendanceData([]);
        this.updateChartData();
      }
    });
    this.subscription.add(sub);
  }

  private processAttendanceData(data: any[]) {
    this.employees = [];

    if (data && data.length > 0) {
      // Extract unique attendance groups for the filter dropdown
      const uniqueAttendanceGroups = new Set<string>();

      // First pass: collect all unique attendance groups
      data.forEach(employeeData => {
        if (employeeData.attendanceList && employeeData.attendanceList.length > 0) {
          const attendanceGroup = employeeData.attendanceList[0]?.attendanceGroup;
          if (attendanceGroup && attendanceGroup.trim() !== '') {
            uniqueAttendanceGroups.add(attendanceGroup.trim());
          }
        }
      });

      // Update departments list with unique attendance groups, sorted alphabetically
      const sortedDepartments = Array.from(uniqueAttendanceGroups).sort();
      this.departments = ['All', ...sortedDepartments];

      // Process and filter the data based on selected department
      data.forEach(employeeData => {
        if (employeeData.attendanceList && employeeData.attendanceList.length > 0) {
          const attendanceGroup = employeeData.attendanceList[0]?.attendanceGroup?.trim() || '';

          // If 'All' is selected or no department selected, include all records
          // Otherwise, only include records matching the selected department
          const shouldInclude = !this.selectedDepartment ||
            this.selectedDepartment === 'All' ||
            attendanceGroup === this.selectedDepartment;

          if (shouldInclude) {
            this.processEmployeeAttendance(employeeData);
          }
        }
      });
    } else {
      // If no data, still populate departments with 'All'
      this.departments = ['All'];
    }

    this.updateSummary();
  }

  private processEmployeeAttendance(employeeData: any) {
    // Get the number of days in the selected month
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();

    const employee = {
      name: `${employeeData.attendanceList[0]?.firstName || ''} ${employeeData.attendanceList[0]?.lastName || ''}`.trim(),
      designation: employeeData.attendanceList[0]?.department?.split('>').pop() || '',
      records: new Array(daysInMonth).fill(null).map((_, index) => {
        const date = new Date(this.selectedYear, this.selectedMonth - 1, index + 1);
        const isFutureDate = date > this.currentDate;
        const isSunday = date.getDay() === 0; // Sunday

        // For Sundays, show -- for all fields including shift
        if (isSunday) {
          return {
            date: index + 1,
            day: 'Sun',
            shift: '--',
            dayStatus: '--',
            checkIn: '--',
            checkOut: '--',
            breakTime: '--',
            workingHours: '--',
            extraHours: '--',
            lateTime: '--',
            earlyTime: '--'
          };
        }

        // For future dates, show empty values with shift as empty string
        if (isFutureDate) {
          return {
            date: index + 1,
            day: this.weekDays[date.getDay()],
            shift: '',
            dayStatus: '',
            checkIn: '',
            checkOut: '',
            breakTime: '',
            workingHours: '',
            extraHours: '',
            lateTime: '',
            earlyTime: ''
          };
        }

        // Default values for past dates without data (shift = 1)
        return {
          date: index + 1,
          day: this.weekDays[date.getDay()],
          shift: '1',
          dayStatus: 'AA',
          checkIn: '00:00',
          checkOut: '00:00',
          breakTime: '00:00',
          workingHours: '00:00',
          extraHours: '00:00',
          lateTime: '00:00',
          earlyTime: '00:00'
        };
      }),
      totals: {
        fullDay: 0,
        halfDay: 0,
        presentDay: 0,
        absentDay: 0,
        leaves: 0,
        lateDays: 0,
        holidays: 0,
        earlyDays: 0,
        latePenalty: 0,
        penalty: 0,
        extraHours: 0,
        totalWorkHours: 0
      }
    };

    if (employeeData.attendanceList && Array.isArray(employeeData.attendanceList)) {
      employeeData.attendanceList.forEach(attendance => {
        const attendanceDate = new Date(attendance.attendanceDate);
        const dayOfMonth = attendanceDate.getDate() - 1;

        if (dayOfMonth >= 0 && dayOfMonth < this.daysInMonth) {
          const dayOfWeek = this.weekDays[attendanceDate.getDay()];
          const isSunday = dayOfWeek === 'Sun';
          const isSaturday = dayOfWeek === 'Sat';

          // Skip processing for Sundays as we already set them to '--'
          if (isSunday) {
            return;
          }

          // Calculate day status based on working hours
          let dayStatus = 'AA';
          if (attendance.actualCheckInTime && attendance.actualCheckOutTime &&
            attendance.actualCheckInTime !== '00:00:00' && attendance.actualCheckOutTime !== '00:00:00') {
            const workingHours = this.parseTimeToMinutes(attendance.totalDuration);

            if (isSaturday) {
              // For Saturday, full day if worked >= 4 hours
              dayStatus = workingHours >= 240 ? 'PP' : 'AA';
            } else {
              // For weekdays, full day if worked >= 8 hours, half day if >= 4 hours
              if (workingHours >= 480) { // 8 hours
                dayStatus = 'PP';
              } else if (workingHours >= 240) { // 4 hours
                dayStatus = 'PA';
              } else {
                dayStatus = 'AA';
              }
            }
          }

          // Use overTime and earlyTime directly from the API
          const extraHours = attendance.overTime || '00:00:00';
          const earlyTime = attendance.earlyTime || '00:00:00';

          employee.records[dayOfMonth] = {
            date: dayOfMonth + 1,
            day: dayOfWeek,
            shift: '1', // Set shift to '1' for all non-Sunday days
            dayStatus: dayStatus as 'PP' | 'AA' | 'XX' | 'PA' | '--',
            checkIn: this.formatTime(attendance.actualCheckInTime || '00:00:00'),
            checkOut: this.formatTime(attendance.actualCheckOutTime || '00:00:00'),
            breakTime: '00:00',
            workingHours: this.formatTime(attendance.totalDuration || '00:00:00'),
            extraHours: this.formatTime(extraHours),
            lateTime: this.formatTime(attendance.lateCheckInTime || '00:00:00'),
            earlyTime: this.formatTime(earlyTime)
          };

          this.updateEmployeeTotals(employee, dayOfMonth, dayOfWeek);
        }
      });
    }

    this.employees.push(employee);
  }

  private parseTimeToMinutes(timeString: string): number {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return hours * 60 + minutes;
    }
    return 0;
  }

  // Format time display to show hours or minutes
  public formatTimeDisplay(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    } else {
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (mins === 0) {
        return `${hrs} hrs`;
      }
      return `${hrs}.${Math.round((mins / 60) * 10)} hrs`;
    }
  }

  // Calculate applied penalty in days based on total penalty minutes
  public calculateAppliedPenalty(totalPenaltyMinutes: number): string {
    const penaltyHours = totalPenaltyMinutes / 60;
    const penaltyDays = Math.floor(penaltyHours / 8);

    if (penaltyDays > 0) {
      return penaltyDays === 1 ? '1 Day' : `${penaltyDays} Days`;
    }

    return '--';
  }

  private updateEmployeeTotals(employee: any, dayIndex: number, dayOfWeek: string) {
    const record = employee.records[dayIndex];

    if (dayOfWeek === 'Sun') {
      employee.totals.holidays++;
      return;
    }

    switch (record.dayStatus) {
      case 'PP':
        employee.totals.presentDay++;
        employee.totals.fullDay++;
        break;
      case 'PA':
        employee.totals.presentDay++;
        employee.totals.halfDay++;
        break;
      case 'AA':
        employee.totals.absentDay++;
        break;
    }

    // Update late days and penalty
    if (record.lateTime && record.lateTime !== '00:00' && record.lateTime !== '--') {
      employee.totals.lateDays++;
      const lateMinutes = this.parseTimeToMinutes(record.lateTime);
      employee.totals.latePenalty += lateMinutes;
    }

    // Update early days and penalty
    if (record.earlyTime && record.earlyTime !== '00:00' && record.earlyTime !== '--') {
      employee.totals.earlyDays++;
      const earlyMinutes = this.parseTimeToMinutes(record.earlyTime);
      employee.totals.latePenalty += earlyMinutes;
    }

    // Update total work hours
    if (record.workingHours && record.workingHours !== '00:00' && record.workingHours !== '--') {
      const workMinutes = this.parseTimeToMinutes(record.workingHours);
      employee.totals.totalWorkHours += workMinutes / 60;
    }

    // Update overTime (extra hours)
    if (record.extraHours && record.extraHours !== '00:00' && record.extraHours !== '--') {
      const extraMinutes = this.parseTimeToMinutes(record.extraHours);
      employee.totals.extraHours += extraMinutes / 60;
    }
  }

  private updateSummary() {
    this.summary = {
      fullDays: this.employees.reduce((sum, emp) => sum + emp.totals.fullDay, 0),
      halfDays: this.employees.reduce((sum, emp) => sum + emp.totals.halfDay, 0),
      presentDays: this.employees.reduce((sum, emp) => sum + emp.totals.presentDay, 0),
      absentDays: this.employees.reduce((sum, emp) => sum + emp.totals.absentDay, 0),
      leaves: 0,
      lateDays: this.employees.reduce((sum, emp) => sum + emp.totals.lateDays, 0),
      holidays: this.employees.reduce((sum, emp) => sum + emp.totals.holidays, 0),
      earlyDays: this.employees.reduce((sum, emp) => sum + emp.totals.earlyDays, 0),
      totalLateEarlyPenalty: this.employees.reduce((sum, emp) => sum + emp.totals.latePenalty, 0),
      appliedPenalty: 0,
      overTime: this.employees.reduce((sum, emp) => sum + emp.totals.extraHours, 0),
      totalWorkHours: this.employees.reduce((sum, emp) => sum + emp.totals.totalWorkHours, 0)
    };

    // Calculate attendance ratio
    // Total working days = Total days in month - weekends - holidays
    const totalWorkingDays = this.calculateWorkingDays(this.selectedMonth, this.selectedYear);
    const presentDays = this.summary.presentDays;
    const totalPossibleDays = totalWorkingDays * Math.max(1, this.employees.length);

    // Calculate ratio, handle division by zero and NaN cases
    let ratio = 0;
    if (totalPossibleDays > 0 && !isNaN(presentDays)) {
      ratio = (presentDays / totalPossibleDays) * 100;
    }
    
    // Ensure ratio is a valid number between 0 and 100
    this.attendanceRatio = isNaN(ratio) ? 0 : Math.min(Math.max(0, Math.round(ratio)), 100);
  }

  // Helper method to calculate number of working days (excluding weekends) in a month
  private calculateWorkingDays(month: number, year: number): number {
    let workingDays = 0;
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      // Count only weekdays (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  }

  // Generate month headers based on selected month and year
  generateMonthHeaders(month?: number, year?: number): void {
    const selectedMonth = month || this.selectedMonth;
    const selectedYear = year || this.selectedYear;

    // Get the number of days in the selected month
    this.daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    // Clear existing headers
    this.dynamicDateHeaders = [];
    this.dynamicWeekHeaders = [];
    this.dynamicDayHeaders = [];

    // Generate date and week headers
    for (let day = 1; day <= this.daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

      this.dynamicDateHeaders.push(day);
      this.dynamicWeekHeaders.push(dayOfWeek);
      this.dynamicDayHeaders.push(dayOfWeek);
    }
  }

  private updateChartData() {
    this.dailyAttendanceData = [];

    // Calculate actual daily attendance based on employee data
    for (let i = 0; i < this.daysInMonth; i++) {
      let dailyCount = 0;
      this.employees.forEach(employee => {
        if (employee.records[i] && employee.records[i].dayStatus === 'PP') {
          dailyCount++;
        }
      });
      this.dailyAttendanceData.push(dailyCount);
    }

    // If no real data, use dummy data for visualization
    if (this.employees.length === 0) {
      for (let i = 0; i < this.daysInMonth; i++) {
        const baseAttendance = 8;
        const variation = Math.floor(Math.random() * 3) - 1;
        this.dailyAttendanceData.push(Math.max(6, Math.min(10, baseAttendance + variation)));
      }
    }

    if (this.chart) {
      this.chart.data.labels = this.dynamicDateHeaders;
      this.chart.data.datasets[0].data = this.dailyAttendanceData;
      this.chart.update();
    }
  }

  public getMonthNumber(monthName: string): number {
    return this.monthNames.indexOf(monthName) + 1;
  }

  formatTime(timeString: string): string {
    if (!timeString) return '00:00';
    // Remove seconds if present
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return '00:00';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'AA': return 'status-absent';
      case 'XX': return 'status-irregular';
      case 'PA': return 'status-half';
      case 'PP': return 'status-present';
      case '--': return 'status-holiday';
      default: return ''; // For empty status (Sundays and future dates)
    }
  }

  getWorkingHoursClass(record: any): string {
    return this.getStatusClass(record.dayStatus);
  }

  exportToExcel() {
    console.log('Exporting to Excel...');
  }

  exportToPDF() {
    console.log('Exporting to PDF...');
  }

  printReport() {
    window.print();
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}