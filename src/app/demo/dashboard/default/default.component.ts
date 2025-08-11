// Angular Import
import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import * as Papa from 'papaparse';

Chart.register(...registerables);

interface AttendanceRecord {
  'First Name': string;
  'Last Name': string;
  'Attendance Group': string;
  'Date': string;
  'Week': string;
  'First Check In/Out': string;
  'Last Check In/Out': string;
  'Total Duration': string;
  dateObj: Date;
  isWeekend: boolean;
  month: number;
  year: number;
  monthYear: string;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  totalHours: number;
  isPresent: boolean;
}

interface DashboardStats {
  attendanceRate: string;
  presentRecords: number;
  avgWorkingHours: string;
  uniqueEmployees: number;
}// import { CommonModule } from '@angular/common';

// project import
// import { SharedModule } from 'src/app/theme/shared/shared.module';
// import { BajajChartComponent } from 'src/app/theme/shared/components/apexchart/bajaj-chart/bajaj-chart.component';
// import { BarChartComponent } from 'src/app/theme/shared/components/apexchart/bar-chart/bar-chart.component';
// import { ChartDataMonthComponent } from 'src/app/theme/shared/components/apexchart/chart-data-month/chart-data-month.component';

@Component({
  selector: 'app-default',
  // imports: [CommonModule, BajajChartComponent, BarChartComponent, ChartDataMonthComponent, SharedModule],
  // imports:[]
  // templateUrl: './default.component.html',
  // styleUrls: ['./default.component.scss']
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <div class="header">
        <h1>📊 Employee Attendance Dashboard</h1>
        <p>Comprehensive attendance analysis with date-wise insights and group comparisons</p>
      </div>

      <div class="file-upload">
        <input
          type="file"
          #csvFile
          class="file-input"
          accept=".csv"
          (change)="handleFileUpload($event)">
        <label for="csvFile" class="file-label" (click)="csvFile.click()">📁 Upload CSV File</label>
        <p style="margin-top: 15px; color: #666;">Upload your attendance CSV file to generate insights</p>
      </div>

      <div class="controls">
        <div class="control-group">
          <label for="monthSelect">Select Month:</label>
          <select id="monthSelect" [(ngModel)]="selectedMonth" (change)="updateDashboard()">
            <option value="">All Months</option>
            <option *ngFor="let month of availableMonths" [value]="month.value">
              {{month.label}}
            </option>
          </select>
        </div>
        <div class="control-group">
          <label for="groupSelect">Attendance Group:</label>
          <select id="groupSelect" [(ngModel)]="selectedGroup" (change)="updateDashboard()">
            <option value="">All Groups</option>
            <option *ngFor="let group of availableGroups" [value]="group">
              {{group}}
            </option>
          </select>
        </div>
        <div class="control-group">
          <label for="employeeSelect">Employee:</label>
          <select id="employeeSelect" [(ngModel)]="selectedEmployee" (change)="updateDashboard()">
            <option value="">All Employees</option>
            <option *ngFor="let employee of availableEmployees" [value]="employee">
              {{employee}}
            </option>
          </select>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{stats.attendanceRate}}%</div>
          <div class="stat-label">Attendance Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{stats.presentRecords}}</div>
          <div class="stat-label">Present Days</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{stats.avgWorkingHours}}h</div>
          <div class="stat-label">Avg Working Hours</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{stats.uniqueEmployees}}</div>
          <div class="stat-label">Active Employees</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-container">
          <h3 class="chart-title">📈 Daily Attendance Trend</h3>
          <canvas #dailyTrendChart class="chart-canvas"></canvas>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">👥 Group Comparison</h3>
          <canvas #groupComparisonChart class="chart-canvas"></canvas>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">📅 Monthly Attendance Rate</h3>
          <canvas #monthlyChart class="chart-canvas"></canvas>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">⏰ Average Working Hours</h3>
          <canvas #workingHoursChart class="chart-canvas"></canvas>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">🏆 Top Performers</h3>
          <canvas #topPerformersChart class="chart-canvas"></canvas>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">📊 Attendance Heatmap</h3>
          <canvas #heatmapChart class="chart-canvas"></canvas>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :host {
      display: block;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      color: #333;
    }

    .header h1 {
      font-size: 2.5em;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }

    .file-upload {
      background: #f8f9fa;
      border: 2px dashed #667eea;
      border-radius: 15px;
      padding: 30px;
      text-align: center;
      margin-bottom: 30px;
      transition: all 0.3s ease;
    }

    .file-upload:hover {
      border-color: #764ba2;
      background: #f0f4ff;
    }

    .file-input {
      display: none;
    }

    .file-label {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.3s ease;
    }

    .file-label:hover {
      transform: translateY(-2px);
    }

    .controls {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
      flex-wrap: wrap;
      align-items: center;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .control-group label {
      font-weight: 600;
      color: #555;
      font-size: 14px;
    }

    select,
    input {
      padding: 10px 15px;
      border: 2px solid #e0e6ed;
      border-radius: 10px;
      font-size: 14px;
      background: white;
      transition: border-color 0.3s ease;
    }

    select:focus,
    input:focus {
      outline: none;
      border-color: #667eea;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 25px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
      transition: transform 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
    }

    .stat-number {
      font-size: 2.5em;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 1em;
      opacity: 0.9;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 30px;
      margin-bottom: 30px;
    }

    .chart-container {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #f0f0f0;
    }

    .chart-title {
      font-size: 1.3em;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
      text-align: center;
    }

    .chart-canvas {
      width: 100% !important;
      height: auto !important;
      max-height: 400px;
    }

    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }

      .controls {
        flex-direction: column;
        align-items: stretch;
      }

      .dashboard-container {
        padding: 20px;
      }
    }
  `]
})
export class DefaultComponent  implements OnDestroy {
  @ViewChild('dailyTrendChart', { static: false }) dailyTrendChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('groupComparisonChart', { static: false }) groupComparisonChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyChart', { static: false }) monthlyChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('workingHoursChart', { static: false }) workingHoursChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topPerformersChart', { static: false }) topPerformersChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('heatmapChart', { static: false }) heatmapChart!: ElementRef<HTMLCanvasElement>;

  attendanceData: AttendanceRecord[] = [];
  charts: { [key: string]: Chart } = {};

  selectedMonth = '';
  selectedGroup = '';
  selectedEmployee = '';

  availableMonths: { value: string; label: string }[] = [];
  availableGroups: string[] = [];
  availableEmployees: string[] = [];

  stats: DashboardStats = {
    attendanceRate: '0',
    presentRecords: 0,
    avgWorkingHours: '0',
    uniqueEmployees: 0
  };

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        this.attendanceData = this.processData(results.data as any[]);
        this.populateFilters();
        this.updateDashboard();
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
      }
    });
  }

  processData(data: any[]): AttendanceRecord[] {
    return data.map(row => {
      const date = new Date(row.Date);
      return {
        ...row,
        dateObj: date,
        isWeekend: date.getDay() === 0, // Sunday = 0
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        monthYear: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        hasCheckIn: row['First Check In/Out'] !== '00:00:00' && row['First Check In/Out'] !== '',
        hasCheckOut: row['Last Check In/Out'] !== '00:00:00' && row['Last Check In/Out'] !== '',
        totalHours: this.parseDuration(row['Total Duration']),
        isPresent: row['Total Duration'] !== '00:00' && row['Total Duration'] !== ''
      };
    }).filter(row => !row.isWeekend); // Exclude Sundays
  }

  parseDuration(duration: string): number {
    if (!duration || duration === '00:00') return 0;
    const parts = duration.split(':');
    return parseFloat(parts[0]) + parseFloat(parts[1]) / 60;
  }

  populateFilters(): void {
    // Populate months
    const months = [...new Set(this.attendanceData.map(row => row.monthYear))].sort();
    this.availableMonths = months.map(month => ({
      value: month,
      label: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }));

    // Populate groups
    this.availableGroups = [...new Set(this.attendanceData.map(row => row['Attendance Group']))].filter(Boolean).sort();

    // Populate employees
    this.availableEmployees = [...new Set(this.attendanceData.map(row => `${row['First Name']} ${row['Last Name']}`))].sort();
  }

  getFilteredData(): AttendanceRecord[] {
    return this.attendanceData.filter(row => {
      if (this.selectedMonth && row.monthYear !== this.selectedMonth) return false;
      if (this.selectedGroup && row['Attendance Group'] !== this.selectedGroup) return false;
      if (this.selectedEmployee && `${row['First Name']} ${row['Last Name']}` !== this.selectedEmployee) return false;
      return true;
    });
  }

  updateDashboard(): void {
    const filteredData = this.getFilteredData();
    this.updateStats(filteredData);
    this.updateCharts(filteredData);
  }

  updateStats(data: AttendanceRecord[]): void {
    const totalRecords = data.length;
    const presentRecords = data.filter(row => row.isPresent).length;
    const attendanceRate = totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(1) : '0';

    const monthMap: { [key: string]: { totalHours: number; dates: Set<string>; employees: Set<string> } } = {};
    data.forEach(row => {
      const key = row.monthYear;
      if (!monthMap[key]) {
        monthMap[key] = {
          totalHours: 0,
          dates: new Set(),
          employees: new Set()
        };
      }

      if (row.dateObj.getDay() !== 0) { // Exclude Sundays
        monthMap[key].dates.add(row.dateObj.toDateString());
        monthMap[key].employees.add(`${row['First Name']} ${row['Last Name']}`);
      }

      monthMap[key].totalHours += row.totalHours;
    });

    let totalAverage = 0;
    let monthCount = 0;

    for (const key in monthMap) {
      const { totalHours, dates, employees } = monthMap[key];
      const denominator = dates.size * employees.size;
      if (denominator > 0) {
        totalAverage += totalHours / denominator;
        monthCount++;
      }
    }

    const avgWorkingHours = monthCount > 0 ? (totalAverage / monthCount).toFixed(1) : '0';
    const uniqueEmployees = new Set(data.map(row => `${row['First Name']} ${row['Last Name']}`)).size;

    this.stats = {
      attendanceRate,
      presentRecords,
      avgWorkingHours,
      uniqueEmployees
    };
  }

  updateCharts(data: AttendanceRecord[]): void {
    // Destroy existing charts
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};

    // Wait for view to update
    setTimeout(() => {
      this.createDailyTrendChart(data);
      this.createGroupComparisonChart(data);
      this.createMonthlyChart(data);
      this.createWorkingHoursChart(data);
      this.createTopPerformersChart(data);
      this.createHeatmapChart(data);
    });
  }

  createDailyTrendChart(data: AttendanceRecord[]): void {
    if (!this.dailyTrendChart) return;

    const dailyData: { [key: string]: { total: number; present: number } } = {};
    data.forEach(row => {
      const date = row.Date;
      if (!dailyData[date]) {
        dailyData[date] = { total: 0, present: 0 };
      }
      dailyData[date].total++;
      if (row.isPresent) dailyData[date].present++;
    });

    const sortedDates = Object.keys(dailyData).sort();
    const labels = sortedDates.map(date => new Date(date).toLocaleDateString());
    const attendanceRates = sortedDates.map(date =>
      parseFloat(((dailyData[date].present / dailyData[date].total) * 100).toFixed(1))
    );

    const ctx = this.dailyTrendChart.nativeElement.getContext('2d');
    if (ctx) {
      this.charts['dailyTrend'] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Attendance Rate (%)',
            data: attendanceRates,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#667eea',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function (value) {
                  return value + '%';
                }
              }
            }
          }
        }
      });
    }
  }

createGroupComparisonChart(data: AttendanceRecord[]): void {
  if (!this.groupComparisonChart) return;

  const groupData: { [key: string]: { total: number; present: number } } = {};
  data.forEach(row => {
    const group = row['Attendance Group'];
    if (!groupData[group]) {
      groupData[group] = { total: 0, present: 0 };
    }
    groupData[group].total++;
    if (row.isPresent) groupData[group].present++;
  });

  const labels = Object.keys(groupData);
  const attendanceRates = labels.map(group =>
    parseFloat(((groupData[group].present / groupData[group].total) * 100).toFixed(1))
  );

  // Create labels with percentages for display
  const labelsWithPercentages = labels.map((label, index) => 
    label + ': ' + attendanceRates[index] + '%'
  );

  const ctx = this.groupComparisonChart.nativeElement.getContext('2d');
  if (ctx) {
    this.charts['groupComparison'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labelsWithPercentages,
        datasets: [{
          data: attendanceRates,
          backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b'],
          borderWidth: 3,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12
              }
            }
          }
        }
      },
      plugins: [
        {
          id: 'datalabels',
          afterDatasetsDraw: function(chart: any) {
            const ctx = chart.ctx;
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 2;

            chart.data.datasets[0].data.forEach((value: number, index: number) => {
              const meta = chart.getDatasetMeta(0);
              const arc = meta.data[index];
              
              if (arc && value > 5) { // Only show label if segment is large enough
                const position = arc.tooltipPosition();
                ctx.fillText(value + '%', position.x, position.y);
              }
            });
            
            ctx.restore();
          }
        }
      ]
    });
  }
}

  createMonthlyChart(data: AttendanceRecord[]): void {
    if (!this.monthlyChart) return;

    const monthlyData: { [key: string]: { total: number; present: number } } = {};
    data.forEach(row => {
      const month = row.monthYear;
      if (!monthlyData[month]) {
        monthlyData[month] = { total: 0, present: 0 };
      }
      monthlyData[month].total++;
      if (row.isPresent) monthlyData[month].present++;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month =>
      new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    );
    const attendanceRates = sortedMonths.map(month =>
      parseFloat(((monthlyData[month].present / monthlyData[month].total) * 100).toFixed(1))
    );

    const ctx = this.monthlyChart.nativeElement.getContext('2d');
    if (ctx) {
      this.charts['monthly'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Attendance Rate (%)',
            data: attendanceRates,
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            borderColor: '#667eea',
            borderWidth: 2,
            borderRadius: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function (value) {
                  return value + '%';
                }
              }
            }
          }
        }
      });
    }
  }

  createWorkingHoursChart(data: AttendanceRecord[]): void {
    if (!this.workingHoursChart) return;

    const employeeHours: { [key: string]: { totalHours: number; days: number } } = {};
    data.forEach(row => {
      const employee = `${row['First Name']} ${row['Last Name']}`;
      if (!employeeHours[employee]) {
        employeeHours[employee] = { totalHours: 0, days: 0 };
      }
      if (row.totalHours > 0) {
        employeeHours[employee].totalHours += row.totalHours;
        employeeHours[employee].days++;
      }
    });

    const employeeAvg = Object.keys(employeeHours).map(employee => ({
      name: employee,
      avgHours: employeeHours[employee].days > 0 ?
        parseFloat((employeeHours[employee].totalHours / employeeHours[employee].days).toFixed(1)) : 0
    })).sort((a, b) => b.avgHours - a.avgHours).slice(0, 10);

    const labels = employeeAvg.map(emp => emp.name.split(' ')[0]);
    const avgHours = employeeAvg.map(emp => emp.avgHours);

    const ctx = this.workingHoursChart.nativeElement.getContext('2d');
    if (ctx) {
      this.charts['workingHours'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Average Hours',
            data: avgHours,
            backgroundColor: 'rgba(118, 75, 162, 0.8)',
            borderColor: '#764ba2',
            borderWidth: 2,
            borderRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return value + 'h';
                }
              }
            }
          }
        }
      });
    }
  }

  createTopPerformersChart(data: AttendanceRecord[]): void {
    if (!this.topPerformersChart) return;

    const employeeStats: { [key: string]: { total: number; present: number } } = {};
    data.forEach(row => {
      const employee = `${row['First Name']} ${row['Last Name']}`;
      if (!employeeStats[employee]) {
        employeeStats[employee] = { total: 0, present: 0 };
      }
      employeeStats[employee].total++;
      if (row.isPresent) employeeStats[employee].present++;
    });

    const topPerformers = Object.keys(employeeStats).map(employee => ({
      name: employee,
      rate: parseFloat(((employeeStats[employee].present / employeeStats[employee].total) * 100).toFixed(1))
    })).sort((a, b) => b.rate - a.rate).slice(0, 8);

    const labels = topPerformers.map(emp => emp.name.split(' ')[0]);
    const rates = topPerformers.map(emp => emp.rate);

    const ctx = this.topPerformersChart.nativeElement.getContext('2d');
    if (ctx) {
      this.charts['topPerformers'] = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Attendance Rate (%)',
            data: rates,
            backgroundColor: 'rgba(102, 126, 234, 0.2)',
            borderColor: '#667eea',
            borderWidth: 2,
            pointBackgroundColor: '#667eea',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function (value) {
                  return value + '%';
                }
              }
            }
          }
        }
      });
    }
  }

  createHeatmapChart(data: AttendanceRecord[]): void {
    if (!this.heatmapChart) return;

    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const heatmapData: { [key: string]: { total: number; present: number } } = {};

    weekdays.forEach(day => {
      heatmapData[day] = { total: 0, present: 0 };
    });

    data.forEach(row => {
      const dayName = row.Week;
      if (heatmapData[dayName]) {
        heatmapData[dayName].total++;
        if (row.isPresent) heatmapData[dayName].present++;
      }
    });

    const labels = weekdays;
    const attendanceRates = weekdays.map(day =>
      heatmapData[day].total > 0 ?
        parseFloat(((heatmapData[day].present / heatmapData[day].total) * 100).toFixed(1)) : 0
    );

    const ctx = this.heatmapChart.nativeElement.getContext('2d');
    if (ctx) {
      this.charts['heatmap'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Attendance Rate (%)',
            data: attendanceRates,
            backgroundColor: attendanceRates.map(rate => {
              const intensity = rate / 100;
              return `rgba(102, 126, 234, ${0.3 + intensity * 0.7})`;
            }),
            borderColor: '#667eea',
            borderWidth: 2,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function (value) {
                  return value + '%';
                }
              }
            }
          }
        }
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up charts
    Object.values(this.charts).forEach(chart => chart.destroy());
  }
}
