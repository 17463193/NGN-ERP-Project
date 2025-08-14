import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { catchError, map, of, switchMap, throwError } from 'rxjs';
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
  qualification?: {
    qualificationId?: string;
    institutionName: string;
    degreeName: string;
    specialization: string;
    yearOfCompletion: number;
  };
  additionalEducations?: {
    qualificationId?: string;
    institutionName: string;
    degreeName: string;
    specialization: string;
    yearOfCompletion: number;
  }[];
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
  deptId?: string;
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
  departments: Department[] = [];
  positions: Position[] = [];
  branches: Branch[] = [];
  grades: Grade[] = [];


  // Add these properties to your component class
formDepartments: Department[] = [];
filteredPositions: Position[] = [];
modalActiveTab = 'basic';
isSaving = false;

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
  if (!empCode) {
    this.handleMissingCodeError();
    return;
  }

  this.initializeForm();
  
  this.loadReferenceData()
    .then(() => this.loadEmployeeByCode(empCode))
    .catch(error => {
      console.error('Error loading reference data:', error);
      this.isLoading = false;
      this.errorMessage = 'Failed to load required data';
      this.employee = null; // Explicitly set to null on error
    });
}
private initializeForm(): void {
  this.employeeForm = this.fb.group({
    // Personal Information
    empCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]+$/)]],
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    middleName: [''],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    dateOfBirth: ['', Validators.required],
    gender: ['', Validators.required],
    maritalStatus: ['', Validators.required],
    nationality: ['', Validators.required],
    cidNumber: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
    organization: ['', Validators.required],

    // Employment Information
    hireDate: ['', Validators.required],
    employmentStatus: ['', Validators.required],
    employmentType: ['', Validators.required],
    department: ['', Validators.required],
    position: [null, Validators.required],
    location: ['', Validators.required],
    grade: ['', Validators.required],
    basicSalary: ['', Validators.required],
    maxSalary: ['', Validators.required],

    // Contact Information
    email: ['', [Validators.required, Validators.email]],
    phonePrimary: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
    
    // Bank Details
    bankName: [''],
    branchName: [''],
    accountNumber: [''],
    accountType: [''],

    // Education
    institutionName: [''],
    degreeName: [''],
    specialization: [''],
    yearOfCompletion: [null],
    educations: this.fb.array([]),

    // Address
    addressType: ['Permanent', Validators.required],
    addressLine1: ['', Validators.required],
    addressLine2: [''],
    thromde: [''],
    dzongkhag: ['']
  });
}

  changeTab(tabId: string): void {
    this.activeTab = tabId;
  }
private async loadPositions(): Promise<void> {
  try {
    const response = await this.http.get<Position[]>(this.positionApiUrl).toPromise();
    this.positions = response || [];
    this.filteredPositions = [...this.positions];
  } catch (error) {
    console.error('Error loading positions:', error);
    this.positions = [];
    this.filteredPositions = [];
  }
}
  private async loadReferenceData(): Promise<void> {
  try {
    // Load all reference data in parallel for better performance
    const [
      deptsResponse, 
      positionsResponse, 
      branchesResponse, 
      orgsResponse, 
      gradesResponse
    ] = await Promise.all([
      this.http.get<{ data: Department[] }>(this.deptApiUrl).toPromise(),
      this.http.get<Position[]>(this.positionApiUrl).toPromise(),
      this.http.get<Branch[]>(this.branchApiUrl).toPromise(),
      this.http.get<Organization[]>(this.orgApiUrl).toPromise(),
      this.http.get<Grade[]>(this.gradeApiUrl).toPromise()
    ]);

    // Assign the responses to component properties
    this.departments = deptsResponse?.data || [];
    this.positions = positionsResponse || [];
    this.filteredPositions = [...this.positions]; // Initialize filtered positions
    this.branches = branchesResponse || [];
    this.organizations = orgsResponse || [];
    this.grades = gradesResponse || [];
    
    // Set default organization if available
    if (this.organizations.length > 0) {
      this.selectedOrgId = this.organizations[0].orgId;
    }

    // Log successful loading (for debugging)
    console.log('Reference data loaded successfully:', {
      departments: this.departments.length,
      positions: this.positions.length,
      branches: this.branches.length,
      organizations: this.organizations.length,
      grades: this.grades.length
    });
  } catch (error) {
    console.error('Error loading reference data:', error);
    
    // Initialize empty arrays to prevent runtime errors
    this.departments = [];
    this.positions = [];
    this.filteredPositions = [];
    this.branches = [];
    this.organizations = [];
    this.grades = [];
    
    throw error;
  }
}

  private handleMissingCodeError(): void {
    this.isLoading = false;
    this.errorMessage = 'Employee code is missing from URL';
    setTimeout(() => this.router.navigate(['/employees']), 3000);
  }

// In your loadEmployeeByCode method, modify it like this:
loadEmployeeByCode(empCode: string): void {
  this.isLoading = true;
  this.errorMessage = '';

  this.http.get<any[]>(this.apiUrl).pipe(
    map(response => {
      if (!Array.isArray(response)) {
        throw new Error('Invalid response format');
      }
      
      const match = response.find(e => e.employee?.empCode === empCode);
      if (!match) {
        throw new Error(`Employee with code ${empCode} not found`);
      }
      return this.transformResponse(match);
    }),
    catchError(error => {
      this.isLoading = false;
      this.errorMessage = error.message || 'Failed to fetch employee details';
      return throwError(() => error);
    })
  ).subscribe({
    next: (employee) => {
      this.employee = employee;
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error loading employee:', error);
      this.errorMessage = error.message || 'Failed to fetch employee details';
      this.isLoading = false;
      this.employee = null; // Explicitly set to null on error
    }
  });
}

  private transformResponse(response: any): Employee {
    if (!response) {
    return null;
  }
    const emp = response.employee;
    const primaryContact = Array.isArray(response.contacts)
      ? response.contacts.find((c: any) => c.isPrimary) || response.contacts[0] || {}
      : {};
    const primaryAddress = Array.isArray(response.addresses)
      ? response.addresses.find((a: any) => a.isCurrent) || response.addresses[0] || {}
      : {};
    const primaryBank = Array.isArray(response.bankDetails)
      ? response.bankDetails[0] || {}
      : {};
   
  const primaryQualification = response.qualifications?.length > 0 
    ? response.qualifications[0] 
    : { institutionName: '', degreeName: '', specialization: '', yearOfCompletion: 0 };
    const additionalEducations = response.qualifications?.length > 1 
    ? response.qualifications.slice(1) 
    : [];

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
    additionalEducations: additionalEducations,
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


  get educations(): FormArray {
  return this.employeeForm.get('educations') as FormArray;
}
addEducation(education?: any): void {
  this.educations.push(this.createEducationFormGroup(education));
}

removeEducation(index: number): void {
  this.educations.removeAt(index);
}

createEducationFormGroup(education?: any): FormGroup {
  return this.fb.group({
    qualificationId: [education?.qualificationId || ''],
    institutionName: [education?.institutionName || '', Validators.required],
    degreeName: [education?.degreeName || '', Validators.required],
    specialization: [education?.specialization || ''],
    yearOfCompletion: [education?.yearOfCompletion || null, [
      Validators.required,
      Validators.min(1900),
      Validators.max(new Date().getFullYear())
    ]]
  });
}

addNewEducation(): void {
  this.showEditModal = true;
  this.selectModalTab('education');
  this.addEducation();
}

editEducation(education: any): void {
  this.showEditModal = true;
  this.selectModalTab('education');
  
  // Find if this is the main qualification or additional education
  if (education === this.employee?.qualification) {
    // Update main form fields
    this.employeeForm.patchValue({
      institutionName: education.institutionName,
      degreeName: education.degreeName,
      specialization: education.specialization,
      yearOfCompletion: education.yearOfCompletion
    });
  } else {
    // Find in additional educations and edit
    const index = this.educations.controls.findIndex(ctrl => 
      ctrl.value.institutionName === education.institutionName &&
      ctrl.value.degreeName === education.degreeName
    );
    
    if (index >= 0) {
      // If found in form array, update it
      this.educations.at(index).patchValue(education);
    } else {
      // Otherwise add as new
      this.addEducation(education);
    }
  }
}

deleteEducation(education: any): void {
  if (!this.employee) return;

  if (confirm('Are you sure you want to delete this education record?')) {
    if (education === this.employee.qualification) {
      // Clear main qualification
      this.employee.qualification = {
        institutionName: '',
        degreeName: '',
        specialization: '',
        yearOfCompletion: 0
      };
    } else {
      // Remove from additional educations
      this.employee.additionalEducations = this.employee.additionalEducations?.filter(
        edu => edu !== education
      );
    }
  }
}
  private async loadGradeDetails(gradeId: string): Promise<Grade | null> {
    if (!gradeId) return null;
    return this.grades.find(g => g.gradeId === gradeId) || null;
  }

selectModalTab(tab: string): void {
  this.modalActiveTab = tab;
}

isModalTabActive(tab: string): boolean {
  return this.modalActiveTab === tab;
}

openEditModal(): void {
  if (!this.employee) return;
  
  // Initialize the form first
  this.initializeForm();
  
  // Load necessary reference data
  Promise.all([
    this.loadGrades(),
    this.loadBranches(),
    this.loadDepartments(this.employee.branchId || '')
  ]).then(() => {
    // Now set the form values
    this.setFormValues(this.employee);
    this.showEditModal = true;
    this.modalActiveTab = 'basic';
  }).catch(error => {
    console.error('Error loading reference data:', error);
    // Still try to set form values even if reference data fails
    this.setFormValues(this.employee);
    this.showEditModal = true;
    this.modalActiveTab = 'basic';
  });
}

closeEditModal(): void {
  this.showEditModal = false;
  this.errorMessage = '';
}

private async loadGrades(): Promise<void> {
  try {
    const response = await this.http.get<Grade[]>(this.gradeApiUrl).toPromise();
    this.grades = response || [];
  } catch (error) {
    console.error('Error loading grades:', error);
    this.grades = [];
  }
}

private loadBranches(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.http.get<Branch[]>(this.branchApiUrl)
      .pipe(
        catchError(error => {
          console.error('Error loading branches:', error);
          reject(error);
          return of([]);
        })
      )
      .subscribe({
        next: (branches) => {
          this.branches = branches || [];
          resolve();
        },
        error: (error) => {
          reject(error);
        }
      });
  });
}

private loadDepartments(branchId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let url = this.deptApiUrl;
    if (branchId) {
      url = `${this.deptApiUrl}/branch/${branchId}`;
    }

    this.http.get<{ data: Department[] }>(url)
      .pipe(
        catchError(error => {
          console.error('Error loading departments:', error);
          reject(error);
          return of({ data: [] });
        })
      )
      .subscribe({
        next: (response) => {
          this.formDepartments = response?.data || [];
          resolve();
        },
        error: (error) => {
          reject(error);
        }
      });
  });
}

onBranchChangeInForm(): void {
  const selectedBranchName = this.employeeForm.get('location')?.value;
  const selectedBranch = this.branches.find(b => b.branchName === selectedBranchName);
  
  if (selectedBranch) {
    this.loadDepartments(selectedBranch.branchId).then(() => {
      this.employeeForm.get('department')?.setValue('');
    });
  }
}

onDepartmentChange(): void {
  const departmentControl = this.employeeForm.get('department');
  const positionControl = this.employeeForm.get('position');
  
  if (!departmentControl || !positionControl) {
    return;
  }

  const selectedDepartmentId = departmentControl.value;
  
  if (!selectedDepartmentId) {
    // If no department selected, show all positions
    this.filteredPositions = [...this.positions];
    positionControl.setValue('');
    positionControl.disable();
    return;
  }

  // Filter positions based on selected department
  // Note: Adjust this logic if your positions have a different relationship structure
  this.filteredPositions = this.positions.filter(position => 
    position.deptId === selectedDepartmentId || // if positions have departmentId
    !position.deptId // include positions without department assignment
  );

  // Enable position selection and reset value
  positionControl.enable();
  positionControl.setValue('');

  // If there's only one position, select it automatically
  if (this.filteredPositions.length === 1) {
    positionControl.setValue(this.filteredPositions[0].positionId);
  }
}

onGradeChange(event: Event): void {
  const gradeId = (event.target as HTMLSelectElement).value;
  const selectedGrade = this.grades.find(g => g.gradeId === gradeId);
  
  if (selectedGrade) {
    this.employeeForm.patchValue({
      basicSalary: selectedGrade.minSalary,
      maxSalary: selectedGrade.maxSalary
    });
  }
}

private setFormValues(employee: Employee | null): void {
  if (!employee) return;

  const primaryContact = employee.contact || {
    email: '',
    phonePrimary: '',
    isEmergencyContact: false
  };

  const primaryBank = employee.bankDetail || {
    bankName: '',
    branchName: '',
    accountNumber: '',
    accountType: ''
  };

  const primaryQualification = employee.qualification || {
    institutionName: '',
    degreeName: '',
    specialization: '',
    yearOfCompletion: 0
  };

  const currentAddress = employee.address || {
    addressType: 'Permanent',
    addressLine1: '',
    addressLine2: '',
    thromde: '',
    dzongkhag: '',
    country: 'Bhutan',
    isCurrent: false
  };
this.filteredPositions = this.positions.filter(p => 
    p.deptId === employee.deptId || // if positions have departmentId
    true // if positions are not department-specific
  );
  // Find the branch name from branchId
  const branchName = employee.branchId 
    ? this.branches.find(b => b.branchId === employee.branchId)?.branchName 
    : '';

  // Find the department from deptId
  const departmentId = employee.deptId || '';

  // Find the position from positionId
  const positionId = employee.positionId || '';

  // Find the grade from gradeId
  const gradeId = employee.gradeId || '';


  while (this.educations.length) {
    this.educations.removeAt(0);
  }
  this.employeeForm.patchValue({
    institutionName: employee.qualification?.institutionName || '',
    degreeName: employee.qualification?.degreeName || '',
    specialization: employee.qualification?.specialization || '',
    yearOfCompletion: employee.qualification?.yearOfCompletion || null
  });

  // Add additional educations
  if (employee.additionalEducations?.length) {
    employee.additionalEducations.forEach(edu => {
      this.addEducation(edu);
    });
  }
  this.employeeForm.patchValue({
    empCode: employee.empCode,
    firstName: employee.firstName,
    middleName: employee.middleName || '',
    lastName: employee.lastName,
    dateOfBirth: this.formatDateForInput(employee.dateOfBirth),
    gender: employee.gender,
    maritalStatus: employee.maritalStatus || 'Single',
    nationality: employee.nationality,
    cidNumber: employee.cidNumber,
    organization: employee.orgId || this.selectedOrgId,
    hireDate: this.formatDateForInput(employee.hireDate),
    employmentStatus: employee.employmentStatus,
    employmentType: employee.employmentType || '',
    email: primaryContact.email,
    department: departmentId,
    position: positionId,
    location: branchName,
    phonePrimary: primaryContact.phonePrimary,
    grade: gradeId,
    basicSalary: employee.basicSalary || '',
    maxSalary: employee.maxSalary || '',
    bankName: primaryBank.bankName,
    branchName: primaryBank.branchName,
    accountNumber: primaryBank.accountNumber,
    accountType: primaryBank.accountType,
    institutionName: primaryQualification.institutionName,
    degreeName: primaryQualification.degreeName,
    specialization: primaryQualification.specialization,
    yearOfCompletion: primaryQualification.yearOfCompletion || 0,
    addressType: currentAddress.addressType,
    addressLine1: currentAddress.addressLine1,
    addressLine2: currentAddress.addressLine2,
    thromde: currentAddress.thromde,
    dzongkhag: currentAddress.dzongkhag
  });

  // Enable/disable fields based on selections
  if (branchName) {
    this.employeeForm.get('department')?.enable();
  }
  if (departmentId) {
    this.employeeForm.get('position')?.enable();
  }
  
}

private formatDateForInput(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

saveEmployee(): void {
  if (this.employeeForm.invalid || !this.employee) {
    this.errorMessage = 'Please fill all required fields correctly.';
    this.employeeForm.markAllAsTouched();
    return;
  }

  this.isSaving = true;
  this.errorMessage = '';

  const formValue = this.employeeForm.getRawValue();
  const empId = this.employee.empId;

  try {
    const branchId = this.getBranchId(formValue.location);
    if (!branchId) {
      throw new Error('Invalid location selected');
    }

    // Get existing IDs for updates
    const existingContactId = this.employee.contact?.contactId;
    const existingAddressId = this.employee.address?.addressId;
    const existingQualificationId = this.employee.qualification?.qualificationId;
    const existingBankDetailId = this.employee.bankDetail?.bankDetailId;

     if (formValue.institutionName || formValue.degreeName) {
    }
     const qualifications = [];
      qualifications.push({
        qualificationId: this.employee.qualification?.qualificationId || undefined,
        institutionName: formValue.institutionName,
        degreeName: formValue.degreeName,
        specialization: formValue.specialization,
        yearOfCompletion: formValue.yearOfCompletion
      });
     formValue.educations.forEach((edu: any) => {
      if (edu.institutionName || edu.degreeName) {
        qualifications.push({
          qualificationId: edu.qualificationId || undefined,
          institutionName: edu.institutionName,
          degreeName: edu.degreeName,
          specialization: edu.specialization,
          yearOfCompletion: edu.yearOfCompletion
        });
      }
    });
    const payload = {
      employee: {
        empId: empId,
        empCode: formValue.empCode,
        firstName: formValue.firstName,
        middleName: formValue.middleName || null,
        lastName: formValue.lastName,
        positionId: formValue.position,
        deptId: formValue.department,
        dateOfBirth: this.formatDateForAPI(formValue.dateOfBirth),
        gender: formValue.gender,
        maritalStatus: formValue.maritalStatus,
        nationality: formValue.nationality,
        cidNumber: formValue.cidNumber,
        hireDate: this.formatDateForAPI(formValue.hireDate),
        employmentStatus: formValue.employmentStatus,
        employmentType: formValue.employmentType,
        branchId: branchId,
        orgId: formValue.organization,
        gradeId: formValue.grade,
        basicSalary: formValue.basicSalary,
        maxSalary: formValue.maxSalary
      },
      contacts: [{
        contactId: existingContactId || undefined,
        email: formValue.email,
        phonePrimary: formValue.phonePrimary,
        isEmergencyContact: false,
        relationship: 'Self',
        priorityLevel: 1
      }],
      addresses: [{
        addressId: existingAddressId || undefined,
        addressType: formValue.addressType || 'Permanent',
        addressLine1: formValue.addressLine1,
        addressLine2: formValue.addressLine2,
        thromde: formValue.thromde,
        dzongkhag: formValue.dzongkhag,
        country: 'Bhutan',
        isCurrent: true
      }],
           qualifications: qualifications,

      bankDetails: [{
        bankDetailId: existingBankDetailId || undefined,
        bankName: formValue.bankName,
        branchName: formValue.branchName,
        accountNumber: formValue.accountNumber,
        accountType: formValue.accountType
      }],
      updateOperation: true
    };

    this.http.put(`${this.apiUrl}/${empId}`, payload)
      .pipe(
        catchError(error => {
          this.errorMessage = this.extractErrorMessage(error);
          this.isSaving = false;
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isSaving = false;
          this.closeEditModal();
          // Reload the employee data
          this.loadEmployeeByCode(this.employee?.empCode || '');
        },
        error: (error) => {
          console.error('Update failed:', error);
          this.isSaving = false;
        }
      });
  } catch (error) {
    this.errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    this.isSaving = false;
  }
}

private formatDateForAPI(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

private getBranchId(locationName: string): string {
  if (!locationName) {
    console.error('Location name is empty');
    return '';
  }

  const branch = this.branches.find(b =>
    b.branchName.trim().toLowerCase() === locationName.trim().toLowerCase()
  );

  if (!branch) {
    console.error('Branch not found for location:', locationName);
    throw new Error(`Branch not found for location: ${locationName}`);
  }

  return branch.branchId;
}

private extractErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Network error: Could not connect to server';
    }
    if (error.status === 404) {
      return 'The requested resource was not found';
    }

    try {
      const serverError = error.error;
      if (serverError?.message) {
        return serverError.message;
      }
      if (typeof serverError === 'string') {
        return serverError;
      }
    } catch (e) {
      console.error('Error parsing error response:', e);
    }

    return `Server error: ${error.status} ${error.statusText}`;
  }

  return error.message || 'An unknown error occurred';
}

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