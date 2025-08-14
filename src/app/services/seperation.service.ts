import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
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
  separationType: SeparationType | null;
  separationTypeId?: string;
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
  separationType: SeparationType | null;
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
  
  // Cache separation types
  private separationTypesSubject = new BehaviorSubject<SeparationType[]>([]);
  public separationTypes$ = this.separationTypesSubject.asObservable();
  private separationTypesMap: { [key: string]: SeparationType } = {};

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { 
    // Load separation types on service initialization
    this.loadSeparationTypes();
  }

  private getAuthHeaders(): HttpHeaders {
    const user = this.authService.currentUserValue;
    if (!user || !user.accessToken) {
      console.error('No authentication token found');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`
    });
  }

  private createDefaultSeparationType(): SeparationType {
    return {
      separationTypeId: 'default',
      orgId: '',
      separationName: 'N/A',
      separationCode: 'DEFAULT',
      category: 'Unknown',
      noticePeriodDays: 0,
      exitInterviewRequired: false,
      rehireEligible: false,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString()
    };
  }

  private loadSeparationTypes(): void {
    this.getSeparationTypes().subscribe({
      next: (types) => {
        this.separationTypesSubject.next(types);
        this.separationTypesMap = {};
        types.forEach(type => {
          this.separationTypesMap[type.separationTypeId] = type;
        });
      },
      error: (error) => {
        console.error('Failed to load separation types:', error);
      }
    });
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
        const types = response.body;
        // Update the cached types
        this.separationTypesSubject.next(types);
        this.separationTypesMap = {};
        types.forEach(type => {
          this.separationTypesMap[type.separationTypeId] = type;
        });
        return types;
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
        
        this.separationTypesSubject.next(mockTypes);
        this.separationTypesMap = {};
        mockTypes.forEach(type => {
          this.separationTypesMap[type.separationTypeId] = type;
        });
        return of(mockTypes);
      })
    );
  }

  getSeparationTypeById(id: string): Observable<SeparationType> {
    // First check cache
    if (this.separationTypesMap[id]) {
      return of(this.separationTypesMap[id]);
    }
    
    const url = `${this.sepTypeUrl}/${id}`;
    return this.http.get<SeparationType>(url, { headers: this.getAuthHeaders() })
      .pipe(
        tap(type => {
          // Cache the type
          this.separationTypesMap[id] = type;
        }),
        catchError(this.handleError)
      );
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

  private mapToSeparation(response: SeparationResponse, requestedTypeId?: string): Separation {
    if (!response) {
      const now = new Date().toISOString();
      const defaultSeparationType = this.createDefaultSeparationType();

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

    // Try to extract separationTypeId from multiple sources
    let separationTypeId = response.separationTypeId || requestedTypeId;
    
    // If no separationTypeId but separationType exists with an ID, use that
    if (!separationTypeId && response.separationType && typeof response.separationType === 'object' && response.separationType.separationTypeId) {
      separationTypeId = response.separationType.separationTypeId;
    }
    
    // If separationType is a string (might be the ID itself), use it
    if (!separationTypeId && response.separationType && typeof response.separationType === 'string') {
      separationTypeId = response.separationType as any;
    }
    
    // Try to find the separation type from cache
    let separationType: SeparationType | null = null;
    
    if (separationTypeId && separationTypeId !== 'default') {
      separationType = this.separationTypesMap[separationTypeId] || null;
      if (separationType) {
        console.log(`Found separation type in cache for ID ${separationTypeId}:`, separationType.separationName);
      } else {
        console.warn(`Separation type not found in cache for ID: ${separationTypeId}`);
      }
    }
    
    // If still no separation type found, check if it came in the response as an object
    if (!separationType && response.separationType && typeof response.separationType === 'object') {
      separationType = response.separationType as SeparationType;
      // Cache it for future use
      if (separationType.separationTypeId) {
        this.separationTypesMap[separationType.separationTypeId] = separationType;
        if (!separationTypeId) {
          separationTypeId = separationType.separationTypeId;
        }
      }
    }
    
    // If still no separation type, create default
    if (!separationType) {
      console.warn(`Using default separation type. ID: ${separationTypeId}, Response:`, response);
      separationType = this.createDefaultSeparationType();
      if (!separationTypeId) {
        separationTypeId = 'default';
      }
    }

    return {
      id: response.separationId,
      separationId: response.separationId,
      employeeId: response.empId || '',
      employeeName: '',
      department: '',
      position: 'Not specified',
      separationType: separationType,
      separationTypeId: separationTypeId,
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
    const headers = this.getAuthHeaders();
    
    // Ensure separation types are loaded first
    return this.getSeparationTypes().pipe(
      switchMap(types => {
        return this.http.get<SeparationResponse[]>(this.apiUrl, { 
          headers,
          observe: 'response'
        }).pipe(
          map(response => {
            if (!response.body || !Array.isArray(response.body)) {
              return [];
            }
            
            return response.body.map(item => {
              try {
                // Map the response and ensure proper separation type mapping
                const separation = this.mapToSeparation(item);
                
                // Additional check: if separationType is still null/default but we have an ID
                // Try to fetch it from our cache one more time
                if ((!separation.separationType || separation.separationType.separationTypeId === 'default') 
                    && item.separationTypeId) {
                  const cachedType = this.separationTypesMap[item.separationTypeId];
                  if (cachedType) {
                    separation.separationType = cachedType;
                    separation.separationTypeId = item.separationTypeId;
                  }
                }
                
                return separation;
              } catch (error) {
                console.error('Error mapping separation item:', item, error);
                return this.mapToSeparation(null as any);
              }
            }).filter(separation => separation.separationId);
          })
        );
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error loading separations:', error);
        return throwError(() => new Error('Failed to load separations'));
      })
    );
  }

  getCurrentUserEmployee(): Observable<Employee> {
    const currentUser = this.authService.currentUserValue;
    
    if (!currentUser) {
      return throwError(() => new Error('No user is currently logged in'));
    }
  
    // Try to get employee ID from different user properties
    let employeeId = currentUser.empId || currentUser.userId;
    
    // Use roleBasedId getter if available
    if (this.authService.roleBasedId) {
      employeeId = this.authService.roleBasedId;
    }
    
    if (!employeeId) {
      return throwError(() => new Error('No employee ID found'));
    }
  
    return this.getEmployeeById(employeeId).pipe(
      catchError((error: HttpErrorResponse) => {
        // Create a fallback employee object
        const emptyEmployee: Employee = {
          empId: employeeId,
          empCode: currentUser.username || '',
          firstName: currentUser.username || 'User',
          lastName: '',
          email: currentUser.email || ''
        };
        console.warn('Failed to fetch employee details, using fallback:', emptyEmployee);
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

    // Validation
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

    // Format date
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
      noticePeriodServed: Number(separation.noticePeriodServed) || 0,
      separationReason: separation.separationReason,
      resignationLetterPath: separation.resignationLetterPath || '',
      rehireEligible: Boolean(separation.rehireEligible),
      rehireNotes: separation.rehireNotes || ''
    };

    console.log('=== CREATE SEPARATION REQUEST ===');
    console.log('Sending payload to API:', requestPayload);
    console.log('SeparationTypeId being sent:', requestPayload.separationTypeId);

    return this.http.post<SeparationResponse>(
      this.apiUrl,
      requestPayload,
      { 
        headers: this.getAuthHeaders(),
        observe: 'response' 
      }
    ).pipe(
      map((response: HttpResponse<SeparationResponse>) => {
        if (!response.body) {
          throw new Error('Empty response body');
        }
        
        console.log('=== CREATE SEPARATION RESPONSE ===');
        console.log('Raw API response:', response.body);
        
        // Map the response, passing the requested type ID
        const mappedSeparation = this.mapToSeparation(response.body, separation.separationTypeId);
        
        // Ensure we have the correct separation type from our cache
        if (separation.separationTypeId && this.separationTypesMap[separation.separationTypeId]) {
          console.log('Setting separation type from cache for ID:', separation.separationTypeId);
          mappedSeparation.separationType = this.separationTypesMap[separation.separationTypeId];
          mappedSeparation.separationTypeId = separation.separationTypeId;
        }
        
        console.log('Final mapped separation:', mappedSeparation);
        
        return mappedSeparation;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating separation:', error);
        console.error('Error response body:', error.error);
        
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
      approvalDate: new Date().toISOString().split('T')[0],
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

  createSeparationType(separationType: Omit<SeparationType, 'separationTypeId' | 'createdDate' | 'modifiedDate'>): Observable<SeparationType> {
    const headers = this.getAuthHeaders();
    return this.http.post<SeparationType>(this.sepTypeUrl, separationType, { headers }).pipe(
      tap(newType => {
        // Add to cache
        this.separationTypesMap[newType.separationTypeId] = newType;
        // Reload types
        this.loadSeparationTypes();
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating separation type:', error);
        return throwError(() => new Error('Failed to create separation type. Please try again.'));
      })
    );
  }

  updateSeparationType(id: string, separationType: Partial<SeparationType>): Observable<SeparationType> {
    const headers = this.getAuthHeaders();
    return this.http.put<SeparationType>(`${this.sepTypeUrl}/${id}`, separationType, { headers }).pipe(
      tap(updatedType => {
        // Update cache
        this.separationTypesMap[id] = updatedType;
        // Reload types
        this.loadSeparationTypes();
      }),
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

  // Helper method to get cached separation types
  getCachedSeparationTypes(): SeparationType[] {
    return this.separationTypesSubject.value;
  }

  // Helper method to get a specific cached separation type
  getCachedSeparationType(id: string): SeparationType | null {
    return this.separationTypesMap[id] || null;
  }
}