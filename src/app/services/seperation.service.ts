import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/services/auth.service';

export interface SeparationType {
  separationTypeId: string;
  orgId: string;
  separationName: string;
  separationCode: string;
  category: string;
  noticePeriodDays: number;
  exitInterviewRequired: boolean;
  rehireEligible: boolean;
  createdDate: string | null;
  modifiedDate?: string | null;
}

export interface SeparationResponse {
  separationId: string;
  empId: string;
  separationType: SeparationType;
  initiatedBy: string | null;
  initiationDate: string;
  lastWorkingDate: string;
  noticePeriodServed: number;
  separationReason: string;
  resignationLetterPath: string;
  separationStatus: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  approvedBy: string | null;
  approvalDate: string | null;
  exitInterviewCompleted: boolean;
  exitInterviewDate: string | null;
  exitInterviewNotes: string;
  handoverCompleted: boolean;
  finalSettlementAmount: number;
  settlementPaid: boolean;
  settlementPaidDate: string | null;
  rehireEligible: boolean;
  rehireNotes: string;
  createdDate: string | null;
  modifiedDate: string | null;
}

export interface Organization {
  orgId: string;
  orgName: string;
  orgCode: string;
  countryName: string;
  dzongkhag: string;
  thromde: string;
  parentOrgId: string | null;
  parentOrgName: string | null;
  orgLevel: number | null;
  childOrganizationsCount: number;
  createdDate: string;
}

export interface Employee {
  empId: string;
  empCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  department?: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  orgId?: string;
  orgName?: string;
}

export interface EmployeeApiResponse {
  employee: Employee;
  contacts: any[];
  addresses: any[];
  qualifications: any[];
  bankDetails: any[];
  history: any[];
}

export interface SeparationRequest {
  empId: string;
  separationTypeId: string;
  initiatedBy: string;
  lastWorkingDate: string;
  noticePeriodServed: number;
  separationReason: string;
  resignationLetterPath?: string;
  rehireEligible: boolean;
  rehireNotes?: string;
}

export interface Separation {
  id?: string;
  separationId?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  separationType: SeparationType;
  separationTypeId?: string;
  initiatedBy?: string | null;
  initiatedByName?: string;
  initiationDate: string;
  lastWorkingDate: string;
  noticePeriodServed: number;
  separationReason: string;
  resignationLetterPath?: string;
  separationStatus: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  approvedBy?: string | null;
  approvedByName?: string;
  approvalDate?: string | null;
  exitInterviewCompleted: boolean;
  exitInterviewDate?: string | null;
  exitInterviewNotes?: string;
  handoverCompleted: boolean;
  finalSettlementAmount?: number;
  settlementPaid?: boolean;
  settlementPaidDate?: string | null;
  rehireEligible: boolean;
  rehireNotes?: string;
  createdDate?: string | null;
  modifiedDate?: string | null;
  reason?: string;
  notes?: string;
  clearanceStatus?: 'Pending' | 'In Progress' | 'Completed';
}

@Injectable({
  providedIn: 'root'
})
export class SeparationService {
  apiUrl = `${environment.apiUrl}/api/v1/separations`;
  empUrl = `${environment.apiUrl}/api/v1/employees`;
  sepTypeUrl = `${environment.apiUrl}/api/separation-types`;
  orgUrl = `${environment.apiUrl}/api/v1/organizations`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getAuthHeaders(): HttpHeaders {
    const user = this.authService.currentUserValue;
    if (!user || !user.accessToken) {
      console.error('No authentication token found');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`
    });
    
    console.log('Auth headers created:', headers.keys());
    return headers;
  }

  getSeparationTypes(): Observable<SeparationType[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<SeparationType[]>(this.sepTypeUrl, { 
      headers,
      observe: 'response'
    }).pipe(
      map(response => {
        if (!response.body) {
          console.warn('Received empty response body from separation types endpoint');
          return [];
        }
        return response.body;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error loading separation types:', error);
        
        const mockTypes: SeparationType[] = [
          {
            separationTypeId: '7d7b5605-b6a9-4e63-95c2-2329a7f92c5f',
            orgId: '5fb2d078-532d-4352-84ba-4e185ae08dac',
            separationName: 'Resignation',
            separationCode: 'RES001',
            category: 'Voluntary',
            noticePeriodDays: 30,
            exitInterviewRequired: true,
            rehireEligible: true,
            createdDate: null
          },
          {
            separationTypeId: '8c7b5605-b6a9-4e63-95c2-2329a7f92c6g',
            orgId: '5fb2d078-532d-4352-84ba-4e185ae08dac',
            separationName: 'Termination',
            separationCode: 'TERM002',
            category: 'Involuntary',
            noticePeriodDays: 0,
            exitInterviewRequired: true,
            rehireEligible: false,
            createdDate: null
          }
        ];
        
        console.warn('Falling back to mock separation types due to error');
        return of(mockTypes);
      })
    );
  }

  getSeparationTypeById(id: string): Observable<SeparationType> {
    const url = `${this.sepTypeUrl}/${id}`;
    return this.http.get<SeparationType>(url, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getAllEmployees(): Observable<Employee[]> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<EmployeeApiResponse[]>(this.empUrl, { headers }).pipe(
      map(response => {
        if (Array.isArray(response)) {
          const employees = response.flatMap(item => {
            if (item && 'employee' in item && item.employee) {
              return [item.employee];
            }
            if (item && 'empId' in item) {
              return [item as unknown as Employee];
            }
            return [];
          }).filter((emp): emp is Employee => 
            !!emp && 'empId' in emp && 'empCode' in emp && 'firstName' in emp && 'lastName' in emp
          );
          return employees;
        } else {
          return [];
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching employees:', error);
        return throwError(() => error);
      })
    );
  }

  getEmployeeById(empId: string): Observable<Employee> {
    return this.http.get<EmployeeApiResponse>(`${this.empUrl}/${empId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      map(response => {
        if (response && response.employee) {
          return response.employee;
        }
        return response as any;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`Error fetching employee ${empId}:`, error);
        return throwError(() => error);
      })
    );
  }

  private mapToSeparation(response: SeparationResponse): Separation {
    if (!response) {
      const now = new Date().toISOString();
      const defaultSeparationType: SeparationType = {
        separationTypeId: 'default',
        orgId: '',
        separationName: 'Voluntary',
        separationCode: 'VOL',
        category: 'Voluntary',
        noticePeriodDays: 30,
        exitInterviewRequired: true,
        rehireEligible: true,
        createdDate: now,
        modifiedDate: now
      };

      return {
        id: '',
        separationId: '',
        employeeId: '',
        employeeName: 'Unknown Employee',
        department: 'Not specified',
        position: 'Not specified',
        separationType: defaultSeparationType,
        separationTypeId: 'default',
        initiatedBy: 'System',
        initiationDate: now,
        lastWorkingDate: now,
        noticePeriodServed: 0,
        separationReason: 'Not specified',
        resignationLetterPath: '',
        separationStatus: 'Pending',
        status: 'Pending',
        clearanceStatus: 'Pending',
        approvedBy: null,
        approvalDate: null,
        exitInterviewCompleted: false,
        exitInterviewDate: null,
        exitInterviewNotes: '',
        handoverCompleted: false,
        finalSettlementAmount: 0,
        settlementPaid: false,
        settlementPaidDate: null,
        rehireEligible: false,
        rehireNotes: '',
        createdDate: now,
        modifiedDate: now
      };
    }

    return {
      id: response.separationId,
      separationId: response.separationId,
      employeeId: response.empId || '',
      employeeName: '',
      department: '',
      position: 'Not specified',
      separationType: response.separationType,
      separationTypeId: response.separationType.separationTypeId,
      initiatedBy: response.initiatedBy || 'System',
      initiationDate: response.initiationDate,
      lastWorkingDate: response.lastWorkingDate,
      noticePeriodServed: response.noticePeriodServed || 0,
      separationReason: response.separationReason || 'Not specified',
      resignationLetterPath: response.resignationLetterPath || '',
      separationStatus: response.separationStatus,
      status: response.separationStatus,
      clearanceStatus: 'Pending',
      approvedBy: response.approvedBy || null,
      approvalDate: response.approvalDate || null,
      exitInterviewCompleted: response.exitInterviewCompleted || false,
      exitInterviewDate: response.exitInterviewDate || null,
      exitInterviewNotes: response.exitInterviewNotes || '',
      handoverCompleted: response.handoverCompleted || false,
      finalSettlementAmount: response.finalSettlementAmount || 0,
      settlementPaid: response.settlementPaid || false,
      settlementPaidDate: response.settlementPaidDate || null,
      rehireEligible: response.rehireEligible || false,
      rehireNotes: response.rehireNotes || '',
      createdDate: response.createdDate || null,
      modifiedDate: response.modifiedDate || null
    };
  }

  getSeparations(): Observable<Separation[]> {
    return this.http.get<SeparationResponse[]>(this.apiUrl, { 
      headers: this.getAuthHeaders(),
      observe: 'response'
    }).pipe(
      map(response => {
        if (!response.body) {
          throw new Error('Empty response body from server');
        }
        return response.body.map(item => this.mapToSeparation(item));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error loading separations:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url
        });
        
        let errorMessage = 'Failed to load separation data';
        if (error.status === 0) {
          errorMessage += ' - No response from server. Please check your network connection.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to view this data.';
        } else if (error.status === 404) {
          errorMessage = 'The requested resource was not found. Please check the API URL.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  deleteSeparation(id: string): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error deleting separation:', error);
        if (error.status === 403) {
          console.error('Authentication failed. Please check if you are logged in and your session is valid.');
        }
        return throwError(() => error);
      })
    );
  }

  getCurrentUserEmployee(): Observable<Employee> {
    const currentUser = this.authService.currentUserValue;
    
    if (!currentUser) {
      return throwError(() => new Error('No user is currently logged in'));
    }
  
    const employeeId = currentUser.userId || currentUser.empId;
    
    if (!employeeId) {
      return throwError(() => new Error('No employee ID found'));
    }
  
    return this.getEmployeeById(employeeId).pipe(
      catchError((error: HttpErrorResponse) => {
        const emptyEmployee: Employee = {
          empId: employeeId,
          empCode: '',
          firstName: currentUser.username || 'User',
          lastName: '',
          email: currentUser.email || ''
        };
        return of(emptyEmployee);
      })
    );
  }

  createSeparation(separation: SeparationRequest): Observable<Separation> {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser?.accessToken) {
      return throwError(() => new Error('No authentication token found. Please log in again.'));
    }

    if (!currentUser.userId) {
      return throwError(() => new Error('No user ID found for current user.'));
    }

    if (!separation.empId) {
      return throwError(() => new Error('Employee ID is required'));
    }
    if (!separation.separationTypeId) {
      return throwError(() => new Error('Separation type is required'));
    }
    if (!separation.lastWorkingDate) {
      return throwError(() => new Error('Last working date is required'));
    }
    if (!separation.separationReason) {
      return throwError(() => new Error('Separation reason is required'));
    }

    let formattedDate: string;
    try {
      const date = new Date(separation.lastWorkingDate);
      if (isNaN(date.getTime())) {
        formattedDate = separation.lastWorkingDate;
      } else {
        formattedDate = date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('Error formatting date, using as is:', e);
      formattedDate = separation.lastWorkingDate;
    }

    const requestPayload = {
      empId: separation.empId,
      separationTypeId: separation.separationTypeId,
      initiatedBy: currentUser.userId,
      lastWorkingDate: formattedDate,
      noticePeriodServed: Number(separation.noticePeriodServed) || '',
      separationReason: separation.separationReason,
      resignationLetterPath: separation.resignationLetterPath || '',
      rehireEligible: Boolean(separation.rehireEligible),
      rehireNotes: separation.rehireNotes || ''
    };

    console.log('Creating separation with payload:', requestPayload);

    return this.http.post<SeparationResponse>(
      this.apiUrl,
      requestPayload,
      { 
        headers: this.getAuthHeaders(),
        observe: 'response' 
      }
    ).pipe(
      map((response: HttpResponse<SeparationResponse>) => {
        console.log('Separation created successfully:', response);
        if (!response.body) {
          throw new Error('Empty response body');
        }
        return this.mapToSeparation(response.body);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating separation:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url,
          message: error.message
        });
        
        let errorMessage = 'Failed to create separation. Please try again.';
        
        if (error.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to create a separation.';
        } else if (error.status === 400 && error.error?.errors) {
          const validationErrors = Object.values(error.error.errors).flat();
          errorMessage = validationErrors.join('\n');
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  updateSeparationStatus(
    separationId: string,
    status: 'Pending' | 'Approved' | 'Rejected' | 'Completed',
    approvalNotes: string = ''
  ): Observable<any> {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser?.userId) {
      return throwError(() => new Error('Current user not available'));
    }

    const payload = {
      separationStatus: status,
      approvedBy: currentUser.userId,
      approvalNotes: approvalNotes
    };

    const url = `${this.apiUrl}/${separationId}/status`;
    return this.http.put(url, payload, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }
    return throwError(() => new Error(errorMessage));
  }

  deleteSeparationType(id: string): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.sepTypeUrl}/${id}`, { headers });
  }

  createSeparationType(separationType: Omit<SeparationType, 'separationTypeId' | 'createdDate' | 'modifiedDate'>): Observable<SeparationType> {
    const headers = this.getAuthHeaders();
    return this.http.post<SeparationType>(this.sepTypeUrl, separationType, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating separation type:', error);
        return throwError(() => new Error('Failed to create separation type. Please try again.'));
      })
    );
  }

  updateSeparationType(id: string, separationType: Partial<SeparationType>): Observable<SeparationType> {
    const headers = this.getAuthHeaders();
    return this.http.put<SeparationType>(`${this.sepTypeUrl}/${id}`, separationType, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating separation type:', error);
        return throwError(() => new Error('Failed to update separation type. Please try again.'));
      })
    );
  }

  getEmployeeNameById(empId: string): Observable<string> {
    return this.getEmployeeById(empId).pipe(
      map(employee => `${employee.firstName} ${employee.lastName}`),
      catchError(() => of('Unknown Employee'))
    );
  }
}