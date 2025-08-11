import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface EmployeeTransfer {
  transferId: string;
  empId: string;
  transferTypeId: string;
  initiatedBy: string;
  initiationDate: string;
  effectiveDate: string;
  fromBranchId: string;
  fromDeptId: string;
  fromPositionId: string;
  fromManagerId: string;
  toBranchId: string;
  toDeptId: string;
  toPositionId: string;
  toManagerId: string;
  transferReason: string;
  employeeConsent: boolean;
  consentDate: string;
  relocationAllowance: number;
  transferStatus: string;
  approvedBy: string | null;
  approvalDate: string | null;
  rejectionReason: string | null;
  isTemporary: boolean;
  temporaryEndDate: string | null;
  probationApplicable: boolean;
  probationEndDate: string | null;
  createdDate: string;
  modifiedDate: string;
}

interface TransferResponse {
  message: string;
  data: EmployeeTransfer[];
}

export interface TransferType {
  transferTypeId: string;
  orgId: string;
  transferName: string;
  transferCode: string;
  category: string;
  requiresConsent: boolean;
  hasProbation: boolean;
  probationDays: number;
  createdDate: string;
}

interface TransferTypeResponse {
  message: string;
  data: TransferType;
}

export interface EmployeeProfile {
  empId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  // Other fields as needed
}

export interface EmployeeProfileResponse {
  employee: EmployeeProfile;
  // Other fields as needed
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeTransferService {
  private apiUrl = `${environment.transferApiUrl}/employeetransfer`;
  private transferTypeBaseUrl = `${environment.transferApiUrl}`; // New base URL for transfer types
  private transferTypesCache: {[key: string]: TransferType} = {};

  private employeeCache: {[key: string]: EmployeeProfile} = {};

  constructor(private http: HttpClient) { }

  /**
   * Get all employee transfers
   * @returns Observable containing the list of employee transfers
   */
  getAllTransfers(): Observable<TransferResponse> {
    return this.http.get<TransferResponse>(this.apiUrl);
  }

  /**
   * Get departments from the API
   */
  getDepartments() {
    return this.http.get<any[]>(`${environment.apiUrl}/departments`);
  }

  /**
   * Get branches from the API
   */
  getBranches() {
    return this.http.get<any[]>(`${environment.apiUrl}/api/v1/branches`);
  }

  /**
   * Get job positions from the API
   */
  getJobPositions() {
    return this.http.get<any[]>(`${environment.apiUrl}/api/v1/job-positions`);
  }

  /**
   * Get all employees from the API
   */
  getEmployees() {
    return this.http.get<any[]>(`${environment.apiUrl}/api/v1/employees`);
  }

  /**
   * Get transfer type by ID
   * @param transferTypeId The ID of the transfer type to fetch
   * @returns Observable containing the transfer type details
   */
  /**
   * Get employee profile by ID
   * @param empId Employee ID
   * @returns Observable containing the employee profile
   */
  /**
   * Create a new employee transfer
   * @param transferData The transfer data to be submitted
   * @returns Observable containing the created transfer
   */
  createTransfer(transferData: Partial<EmployeeTransfer>): Observable<EmployeeTransfer> {
    return this.http.post<EmployeeTransfer>(this.apiUrl, transferData).pipe(
      catchError(error => {
        console.error('Error creating transfer:', error);
        throw error; // Re-throw to allow component to handle the error
      })
    );
  }

  getEmployeeProfile(empId: string): Observable<EmployeeProfile> {
    if (this.employeeCache[empId]) {
      return of(this.employeeCache[empId]);
    }

    const url = `${environment.apiUrl}/api/v1/employees/${empId}`;
    
    return this.http.get<EmployeeProfileResponse>(url).pipe(
      map(response => {
        if (response && response.employee) {
          this.employeeCache[response.employee.empId] = response.employee;
          return response.employee;
        }
        throw new Error('Invalid employee data');
      }),
      catchError(error => {
        console.error('Error fetching employee profile:', error);
        return of({
          empId,
          firstName: 'Unknown',
          middleName: null,
          lastName: 'Employee'
        });
      })
    );
  }

  getTransferTypeById(transferTypeId: string): Observable<TransferType> {
    console.log('Fetching transfer type for ID:', transferTypeId);
    
    // Check if we have the transfer type in cache
    if (this.transferTypesCache[transferTypeId]) {
      console.log('Using cached transfer type:', this.transferTypesCache[transferTypeId]);
      return of(this.transferTypesCache[transferTypeId]);
    }

    // Using direct mapping for transfer type endpoint
    const url = `${this.transferTypeBaseUrl}/Transfer/${transferTypeId}`;
    console.log('API URL:', url);

    return this.http.get<TransferTypeResponse>(url).pipe(
      map(response => {
        console.log('API Response:', response);
        if (!response || !response.data) {
          console.warn('Invalid response format - missing data property');
          throw new Error('Invalid response format');
        }
        // Cache the result for future use
        this.transferTypesCache[response.data.transferTypeId] = response.data;
        console.log('Cached transfer type:', response.data);
        return response.data;
      }),
      catchError(error => {
        console.error('Error fetching transfer type:', error);
        // Return a default transfer type if the request fails
        return of({
          transferTypeId,
          transferName: transferTypeId, // Fallback to ID if name not available
          transferCode: '',
          orgId: '',
          category: '',
          requiresConsent: false,
          hasProbation: false,
          probationDays: 0,
          createdDate: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Get all transfer types from the API
   * @returns Observable containing the list of transfer types
   */
  getTransferTypes(): Observable<TransferType[]> {
    const url = `${this.transferTypeBaseUrl}/Transfer`;
    console.log('Fetching all transfer types from:', url);
    
    return this.http.get<TransferType[] | {message: string, data: TransferType[]}>(url).pipe(
      map(response => {
        console.log('Transfer types response:', response);
        
        // Handle different response formats
        let transferTypes: TransferType[] = [];
        
        // Case 1: Response is already an array of TransferType
        if (Array.isArray(response)) {
          transferTypes = response;
        } 
        // Case 2: Response is an object with data property containing the array
        else if (response && 'data' in response && Array.isArray(response.data)) {
          transferTypes = response.data;
        }
        
        if (transferTypes.length === 0) {
          console.warn('No transfer types found in the response');
          return [];
        }
        
        // Cache all transfer types
        transferTypes.forEach(type => {
          if (type.transferTypeId) {
            this.transferTypesCache[type.transferTypeId] = type;
          }
        });
        
        return transferTypes;
      }),
      catchError(error => {
        console.error('Error fetching transfer types:', error);
        return of([]);
      })
    );
  }
}
