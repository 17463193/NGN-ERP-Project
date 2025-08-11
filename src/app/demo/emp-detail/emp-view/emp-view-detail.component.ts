import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError, map, of, switchMap } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface Employee {
  empId: string;
  empCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  cidNumber: string;
  orgId?: string;
  orgName?: string;
  hireDate: string;
  employmentStatus: string;
  employmentType: string;
  email: string;
  department: string;
  location: string;
  positionName?: string;
  positionId?: string;
  deptId?: string;
  branchId?: string;
  gradeId?: string;
  gradeName?: string;
  gradeCode?: string;
  basicSalary?: number;
  maxSalary?: number;
  salaryStructures?: any[];
  address?: any;
  bankDetail?: any;
  qualification?: any;
  contact?: any;
  profileImage?: string;
}

interface Department {
  dept_id: string;
  dept_name: string;
}

interface Position {
  positionId: string;
  positionName: string;
}

interface Branch {
  branchId: string;
  branchName: string;
}

interface Grade {
  gradeId: string;
  gradeName: string;
  gradeCode: string;
  minSalary: number;
  maxSalary: number;
}
interface Organization {
  orgId: string;
  orgName: string;
}
@Component({
  selector: 'app-emp-view-detail',
  templateUrl: './emp-view-detail.component.html',
  styleUrls: ['./emp-view-detail.component.scss'],
  providers: [DatePipe, CurrencyPipe],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIf, NgbNavModule]
})
export class EmployeeViewComponent implements OnInit {
  tabs = [
    { id: 'grade', label: 'Grade', icon: 'bi bi-award' },
    { id: 'address', label: 'Address', icon: 'bi bi-house-door' },
    { id: 'bank', label: 'Bank', icon: 'bi bi-bank' },
    { id: 'education', label: 'Education', icon: 'bi bi-book' },
    { id: 'contact', label: 'Contact', icon: 'bi bi-telephone' }
  ];
  activeTab = 'personal';
  employee: Employee | null = null;
  isLoading = true;
  errorMessage = '';
  showEditModal = false;
  employeeForm: FormGroup;
  selectedFile: File | null = null;
  profileImageUrl: string | null = null;
  isUploading = false;
  organizations: Organization[] = [];
selectedOrgId: string = '';
  private departments: Department[] = [];
  private positions: Position[] = [];
  private branches: Branch[] = [];

  private apiUrl = `${environment.apiUrl}/api/v1/employees`;
  private deptApiUrl = `${environment.apiUrl}/api/v1/departments`;
  private positionApiUrl = `${environment.apiUrl}/api/v1/job-positions`;
  private branchApiUrl = `${environment.apiUrl}/api/v1/branches`;
  private gradeApiUrl = `${environment.apiUrl}/api/v1/job-grades`;
  private readonly orgApiUrl = `${environment.apiUrl}/api/v1/organizations`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private datePipe: DatePipe,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder
  ) {
    this.employeeForm = this.fb.group({
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      maritalStatus: ['Single'],
      nationality: ['', Validators.required],
      cidNumber: ['', [Validators.required]],
      organization: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phonePrimary: ['', [Validators.required]],
      department: ['', Validators.required],
      position: ['', Validators.required],
      employmentType: ['Regular', Validators.required],
      employmentStatus: ['Active', Validators.required],
      grade: ['', Validators.required],
      basicSalary: ['', Validators.required],
      maxSalary: ['', Validators.required],
      addressType: ['Permanent'],
      addressLine1: [''],
      addressLine2: [''],
      thromde: [''],
      dzongkhag: ['']
    });
  }


  ngOnInit(): void {
    const empCode = this.route.snapshot.paramMap.get('empCode');
    if (empCode) {
      this.loadReferenceData().then(() => {
        this.loadEmployeeByCode(empCode);
      }).catch(error => {
        console.error('Error loading reference data:', error);
        this.loadEmployeeByCode(empCode);
      });
    } else {
      this.handleMissingCodeError();
    }
  }
  changeTab(tabId: string): void {
    this.activeTab = tabId;
  }
  private async loadReferenceData(): Promise<void> {
  try {
    const [deptsResponse, positionsResponse, branchesResponse, orgsResponse] = await Promise.all([
      this.http.get<{ data: Department[] }>(this.deptApiUrl).toPromise(),
      this.http.get<Position[]>(this.positionApiUrl).toPromise(),
      this.http.get<Branch[]>(this.branchApiUrl).toPromise(),
      this.http.get<Organization[]>(this.orgApiUrl).toPromise()
    ]);

    this.departments = deptsResponse?.data || [];
    this.positions = positionsResponse || [];
    this.branches = branchesResponse || [];
    this.organizations = orgsResponse || [];
    
    if (this.organizations.length > 0) {
      this.selectedOrgId = this.organizations[0].orgId;
    }
  } catch (error) {
    console.error('Error loading reference data:', error);
    throw error;
  }
}
  private handleMissingCodeError(): void {
    this.isLoading = false;
    this.errorMessage = 'Employee code is missing from URL';
    setTimeout(() => this.router.navigate(['/employees']), 3000);
  }

  loadEmployeeByCode(empCode: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<any[]>(this.apiUrl).pipe(
      map(response => {
        const match = Array.isArray(response)
          ? response.find(e => e.employee?.empCode === empCode)
          : null;

        if (!match) {
          throw new Error(`Employee with code ${empCode} not found.`);
        }
        return match;
      })
    ).subscribe({
      next: (response) => {
        this.employee = this.transformResponse(response);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employee:', error);
        this.errorMessage = error.message || 'Failed to fetch employee details';
        this.isLoading = false;
      }
    });
  }

  private transformResponse(response: any): Employee {
    const emp = response.employee || {};
    const primaryContact = Array.isArray(response.contacts)
      ? response.contacts.find((c: any) => c.isPrimary) || response.contacts[0] || {}
      : {};
    const primaryAddress = Array.isArray(response.addresses)
      ? response.addresses.find((a: any) => a.isCurrent) || response.addresses[0] || {}
      : {};
    const primaryBank = Array.isArray(response.bankDetails)
      ? response.bankDetails[0] || {}
      : {};
    const primaryQualification = Array.isArray(response.qualifications)
      ? response.qualifications[0] || {}
      : {};

    let departmentName = '';
    if (emp.deptId && Array.isArray(this.departments)) {
      const dept = this.departments.find(d => d.dept_id === emp.deptId);
      departmentName = dept?.dept_name || emp.department || '';
    } else {
      departmentName = emp.department || '';
    }

    let positionName = '';
    if (emp.positionId && Array.isArray(this.positions)) {
      const position = this.positions.find(p => p.positionId === emp.positionId);
      positionName = position?.positionName || emp.positionName || '';
    } else {
      positionName = emp.positionName || '';
    }

    let locationName = '';
    if (emp.branchId && Array.isArray(this.branches)) {
      const branch = this.branches.find(b => b.branchId === emp.branchId);
      locationName = branch?.branchName || emp.location || '';
    } else {
      locationName = emp.location || '';
    }
    let orgName = '';
    if (emp.orgId && Array.isArray(this.organizations)) {
    const org = this.organizations.find(o => o.orgId === emp.orgId);
    orgName = org?.orgName || '';
  }
    const employee: Employee = {
      empId: emp.empId || '',
      empCode: emp.empCode || '',
      firstName: emp.firstName || '',
      middleName: emp.middleName,
      lastName: emp.lastName || '',
      dateOfBirth: emp.dateOfBirth || '',
      gender: emp.gender || '',
      maritalStatus: emp.maritalStatus || 'Unknown',
      nationality: emp.nationality || '',
      cidNumber: emp.cidNumber || '',
      orgId: emp.orgId,
    orgName: orgName,
      hireDate: emp.hireDate || '',
      employmentStatus: emp.employmentStatus || '',
      employmentType: emp.employmentType || '',
      email: primaryContact.email || emp.email || '',
      department: departmentName,
      location: locationName,
      positionName: positionName,
      positionId: emp.positionId,
      deptId: emp.deptId,
      branchId: emp.branchId,
      gradeId: emp.gradeId,
      basicSalary: emp.basicSalary,
      maxSalary: emp.maxSalary,
      address: primaryAddress,
      bankDetail: primaryBank,
      qualification: primaryQualification,
      contact: primaryContact,
      profileImage: emp.profileImage
    };

    if (emp.gradeId && (!emp.gradeName || !emp.basicSalary)) {
      this.loadGradeDetails(emp.gradeId).then(grade => {
        if (grade) {
          employee.gradeName = grade.gradeName;
          employee.gradeCode = grade.gradeCode;
          employee.basicSalary = grade.minSalary;
          employee.maxSalary = grade.maxSalary;
        }
      });
    }

    return employee;
  }

  private async loadGradeDetails(gradeId: string): Promise<Grade | null> {
    if (!gradeId) return null;

    try {
      const allGrades = await this.http.get<Grade[]>(this.gradeApiUrl).toPromise();
      if (allGrades) {
        return allGrades.find(g => g.gradeId === gradeId) || null;
      }
      return null;
    } catch (error) {
      console.error('Error loading grades:', error);
      return null;
    }
  }

  // openEditModal(): void {
  //   if (!this.employee) return;

  //   this.employeeForm.patchValue({
  //     firstName: this.employee.firstName,
  //     middleName: this.employee.middleName || '',
  //     lastName: this.employee.lastName,
  //     dateOfBirth: this.formatDateForInput(this.employee.dateOfBirth),
  //     gender: this.employee.gender,
  //     maritalStatus: this.employee.maritalStatus || 'Single',
  //     nationality: this.employee.nationality,
  //     email: this.employee.email,
  //     phonePrimary: this.employee.contact?.phonePrimary || ''
  //   });

  //   this.showEditModal = true;
  // }

  // closeEditModal(): void {
  //   this.showEditModal = false;
  // }

  // saveEmployee(): void {
  //   if (this.employeeForm.invalid || !this.employee) return;

  //   const updatedData = this.employeeForm.value;

  //   this.employee = {
  //     ...this.employee,
  //     firstName: updatedData.firstName,
  //     middleName: updatedData.middleName,
  //     lastName: updatedData.lastName,
  //     dateOfBirth: updatedData.dateOfBirth,
  //     gender: updatedData.gender,
  //     maritalStatus: updatedData.maritalStatus,
  //     nationality: updatedData.nationality,
  //     email: updatedData.email,
  //     contact: {
  //       ...this.employee.contact,
  //       phonePrimary: updatedData.phonePrimary
  //     }
  //   };

  //   this.closeEditModal();
  // }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.match(/image\/*/)) {
        this.errorMessage = 'Only image files are allowed';
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        this.errorMessage = 'File size must be less than 2MB';
        return;
      }

      this.selectedFile = file;
      this.errorMessage = '';

      const reader = new FileReader();
      reader.onload = (e) => {
        this.profileImageUrl = this.sanitizer.bypassSecurityTrustUrl(e.target?.result as string) as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadPhoto(): void {
    if (!this.selectedFile || !this.employee) return;

    this.isUploading = true;

    const reader = new FileReader();
    reader.onload = () => {
      this.isUploading = false;
      this.profileImageUrl = reader.result as string;
      if (this.employee) {
        this.employee.profileImage = this.profileImageUrl;
      }
    };
    reader.readAsDataURL(this.selectedFile);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    return this.datePipe.transform(date, 'mediumDate') || 'N/A';
  }

  getStatusBadgeClass(status: string | undefined): string {
    if (!status) return 'bg-secondary';
    switch (status.toLowerCase()) {
      case 'active': return 'bg-success';
      case 'inactive': return 'bg-danger';
      case 'on leave': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  exportToPDF(): void {
    if (!this.employee) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Employee Details', pageWidth / 2, 20, { align: 'center' });

    // Add employee name and code
    doc.setFontSize(14);
    doc.text(`Name: ${this.employee.firstName} ${this.employee.lastName}`, margin, 35);
    doc.text(`Employee Code: ${this.employee.empCode}`, margin, 45);

    // Add department and position
    doc.text(`Department: ${this.employee.department || 'N/A'}`, margin, 55);
    doc.text(`Position: ${this.employee.positionName || 'N/A'}`, margin, 65);

    // Add employment status
    doc.text(`Employment Status: ${this.employee.employmentStatus || 'N/A'}`, margin, 75);

    // Add horizontal line
    doc.setDrawColor(200);
    doc.line(margin, 80, pageWidth - margin, 80);

    let yPosition = 90;

    // Personal Information Section
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Personal Information', margin, yPosition);
    yPosition += 10;

    const personalData = [
      ['Date of Birth', this.formatDate(this.employee.dateOfBirth)],
      ['Gender', this.employee.gender || 'N/A'],
      ['Marital Status', this.employee.maritalStatus || 'N/A'],
      ['Nationality', this.employee.nationality || 'N/A'],
      ['CID Number', this.employee.cidNumber || 'N/A']
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Field', 'Value']],
      body: personalData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Contact Information Section
    doc.setFontSize(14);
    doc.text('Contact Information', margin, yPosition);
    yPosition += 10;

    const contactData = [
      ['Email', this.employee.contact?.email || 'N/A'],
      ['Primary Phone', this.employee.contact?.phonePrimary || 'N/A'],
      ['Secondary Phone', this.employee.contact?.phoneSecondary || 'N/A']
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Field', 'Value']],
      body: contactData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Address Information Section
    if (this.employee.address) {
      doc.setFontSize(14);
      doc.text('Address Information', margin, yPosition);
      yPosition += 10;

      const addressData = [
        ['Address Type', this.employee.address.addressType || 'N/A'],
        ['Address Line 1', this.employee.address.addressLine1 || 'N/A'],
        ['Address Line 2', this.employee.address.addressLine2 || 'N/A'],
        ['Thromde/Dzongkhag', this.employee.address.thromde || this.employee.address.dzongkhag || 'N/A'],
        ['Country', this.employee.address.country || 'N/A']
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Field', 'Value']],
        body: addressData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Bank Information Section
    if (this.employee.bankDetail) {
      doc.setFontSize(14);
      doc.text('Bank Information', margin, yPosition);
      yPosition += 10;

      const bankData = [
        ['Bank Name', this.employee.bankDetail.bankName || 'N/A'],
        ['Branch Name', this.employee.bankDetail.branchName || 'N/A'],
        ['Account Number', this.employee.bankDetail.accountNumber || 'N/A'],
        ['Account Type', this.employee.bankDetail.accountType || 'N/A']
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Field', 'Value']],
        body: bankData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
      });
    }

    // Add footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      doc.text('Generated by ERP System', margin, doc.internal.pageSize.getHeight() - 10);
    }

    // Save the PDF
    doc.save(`Employee_${this.employee.empCode}_Details.pdf`);
  }
}