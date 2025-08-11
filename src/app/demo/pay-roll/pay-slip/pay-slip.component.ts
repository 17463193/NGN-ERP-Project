import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-pay-slip',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  providers: [DecimalPipe],
  templateUrl: './pay-slip.component.html',
  styleUrls: ['./pay-slip.component.scss']
})
export class PaySlipComponent implements OnInit {
  employeeDetails: any = {};
  salaryData: any[] = [];

  startYear!: number;
  startMonth!: string;
  endYear!: number;
  endMonth!: string;

  years: number[] = [];
  months = [
    { value: '01', name: 'January' }, { value: '02', name: 'February' }, { value: '03', name: 'March' },
    { value: '04', name: 'April' }, { value: '05', name: 'May' }, { value: '06', name: 'June' },
    { value: '07', name: 'July' }, { value: '08', name: 'August' }, { value: '09', name: 'September' },
    { value: '10', name: 'October' }, { value: '11', name: 'November' }, { value: '12', name: 'December' }
  ];

  totalgrossSalary = 0;
  totalAllowance = 0;
  totalnetSalary = 0;
  totalTds = 0;
  totalGpf = 0;
  totalGis = 0;
  totalLwp = 0;

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit(): void {
    const empId = this.route.snapshot.paramMap.get('empId');
    const queryParams = this.route.snapshot.queryParamMap;

    if (!empId) {
      console.error('❌ empId is missing in route params!');
      return;
    }

    const passedYear = queryParams.get('year');
    const passedMonth = queryParams.get('month');
    const today = new Date();

    this.startYear = this.endYear = passedYear ? parseInt(passedYear) : today.getFullYear();
    this.startMonth = this.endMonth = passedMonth || (today.getMonth() + 1).toString().padStart(2, '0');

    const currentYear = today.getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      this.years.push(y);
    }

    this.loadSalaryRange(empId);
    this.loadEmployeeSalary(empId);
  }

  loadEmployeeSalary(empId: string) {
    const params = new HttpParams()
      .set('empId', empId)
      .set('year', this.endYear.toString())
      .set('month', this.endMonth);

    const url = `${environment.payrollApiUrl}/api/payRoll/viewEachEmployeePayroll`;

    this.http.get<any>(url, { params }).subscribe({
      next: (res) => {
        this.employeeDetails = res;
      },
      error: (err) => {
        console.error('❌ Error loading fallback month data:', err);
      }
    });
  }

  loadSalaryRange(empId: string) {
    const url = `${environment.payrollApiUrl}/api/payRoll/pay-summary/range/${empId}`;
    const params = new HttpParams()
      .set('startYear', this.startYear.toString())
      .set('startMonth', this.startMonth)
      .set('endYear', this.endYear.toString())
      .set('endMonth', this.endMonth);

    this.http.get<any[]>(url, { params }).subscribe({
      next: (res) => {
        this.salaryData = res || [];
        this.calculateTotals();
      },
      error: (err) => {
        console.error('❌ Error loading salary range:', err);
      }
    });
  }

  getMonthName(monthValue: string): string {
    const found = this.months.find(m => m.value === monthValue);
    return found ? found.name : monthValue;
  }

  calculateTotals() {
    if (this.salaryData.length > 0) {
      this.totalgrossSalary = this.salaryData.reduce((sum, item) => sum + (item.grossSalary || 0), 0);
      this.totalAllowance = this.salaryData.reduce((sum, item) => sum + (item.allowance || 0), 0);
      this.totalnetSalary = this.salaryData.reduce((sum, item) => sum + ((item.netSalary || 0)), 0);
      this.totalTds = this.salaryData.reduce((sum, item) => sum + (item.tds || 0), 0);
      this.totalGpf = this.salaryData.reduce((sum, item) => sum + (item.gpf || 0), 0);
      this.totalGis = this.salaryData.reduce((sum, item) => sum + (item.gis || 0), 0);
      this.totalLwp = this.salaryData.reduce((sum, item) => sum + (item.lwp || 0), 0);
    } else {
      this.totalgrossSalary = this.employeeDetails?.grossSalary || 0;
      this.totalAllowance = this.employeeDetails?.allowance || 0;
      this.totalnetSalary = (this.employeeDetails?.netSalary || 0);
      this.totalTds = this.employeeDetails?.tds || 0;
      this.totalGpf = this.employeeDetails?.gpf || 0;
      this.totalGis = this.employeeDetails?.gis || 0;
      this.totalLwp = this.employeeDetails?.lwp || 0;
    }
  }

  onRangeChange() {
    const empId = this.route.snapshot.paramMap.get('empId');
    if (empId) {
      this.loadSalaryRange(empId);
      this.loadEmployeeSalary(empId);
    }
  }

  saveData() {
    const element = document.getElementById('pdfContent');
    if (!element) return;

    const opt = {
      margin: 0.3,
      Colors: true,
      filename: 'Payslip.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0
      },
      jsPDF: {
        unit: 'pt',
        format: 'a4',
        orientation: 'landscape'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  }

  // Format number to 3 decimal places and remove trailing zeros
  formatDecimal(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    // Format to 3 decimal places and remove trailing zeros
    const formatted = num.toFixed(3);
    return formatted.replace(/\.?0+$/, '');
  }
}