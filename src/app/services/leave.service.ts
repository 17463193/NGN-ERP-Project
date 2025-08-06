import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface LeaveRequestPayload {
  cid: string;
  leaveName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  medicalCertificateAttached: boolean;
  handoverDetails: string;
}

export interface LeaveAllocation {
  allocationId: string;
  allocationYear: number;
  allocationMonth: number;
  allocationMonthName: string;
  openingBalance: number;
  annualAccrual: number;
  adjustments: number;
  utilizedBalance: number;
  lateAttendence: number;
  closingBalance: number;
  noOfWorkingDays: number;
  excludedDays: number;
  leaveTypeName: string | null;
  employeeName?: string;
}

export interface Employee {
  empId: string;
  empCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string | null;
  gender: string;
  maritalStatus: string | null;
  bloodGroup: string | null;
  nationality: string;
  socialSecurityNumber: string | null;
  cidNumber: string | null;
  hireDate: string | null;
  employmentStatus: string;
  organizationName: string;
  branchName: string;
  departmentName: string;
}

export interface LeaveRequest extends LeaveRequestPayload {
  id: string;
  empId: string;
  empCode: string;
  name: string;
  division: string;
  totalDays: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'Approved' | string;
  leaveType?: string;
}

export type LeaveType = 'current' | 'all';

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private apiUrl = environment.apiUrl;
  private leaveApiUrl = environment.leaveApiUrl;

  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    private router: Router
  ) { }

  getLeaveAllocations(empCode: string): Observable<LeaveAllocation[]> {
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
      return throwError(() => new Error('No authentication token found'));
    }

    return this.http.get<LeaveAllocation[]>(`${this.leaveApiUrl}/leave-allocations/employee/${empCode}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  // Get leave requests
  getLeaveRequests(type: LeaveType = 'current'): Observable<LeaveRequest[]> {
    const token = this.authService.currentUserValue?.accessToken;
    if (!token) {
      return throwError(() => new Error('Authentication token not found. Please log in.'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    // Use apiUrl for leave applications endpoints
    const endpoint = `${this.apiUrl}/leave/applications/recent/${type}`;
    
    return this.http.get<any>(endpoint, { headers }).pipe(
      map((response: any) => {
        if (!Array.isArray(response)) {
          return [];
        }
        return response.map((item: any): LeaveRequest => ({
          id: item.id || '',
          empId: item.empId || '',
          empCode: item.empCode || '',
          name: item.name || '',
          division: item.division || '',
          fromDate: item.fromDate || '',
          toDate: item.toDate || '',
          status: item.status || 'PENDING',
          totalDays: item.totalDays || 0,
          reason: item.reason || '',
          cid: item.cid || '',
          leaveName: item.leaveName || '',
          medicalCertificateAttached: item.medicalCertificateAttached || false,
          handoverDetails: item.handoverDetails || '',
          ...(item.leaveType && { leaveType: item.leaveType })
        }));
      }),
      tap(data => data),
      catchError(this.handleError)
    );
  }
  
  // Get all leave requests (convenience method)
  getAllLeaveRequests(type: LeaveType = 'all'): Observable<LeaveRequest[]> {
    const endpoint = `${this.apiUrl}/applications/recent/${type}`;
    
    return this.http.get<LeaveRequest[]>(endpoint).pipe(
      map((response: any) => {
        // Ensure we have a valid response
        if (!Array.isArray(response)) {
          return [];
        }
        return response.map((item: any): LeaveRequest => ({
          id: item.id,
          empId: item.empId,
          empCode: item.empCode,
          name: item.name,
          division: item.division,
          fromDate: item.fromDate,
          toDate: item.toDate,
          status: item.status,
          totalDays: item.totalDays,
          reason: item.reason,
          cid: item.cid || '',
          leaveName: item.leaveName || '',
          medicalCertificateAttached: item.medicalCertificateAttached || false,
          handoverDetails: item.handoverDetails || '',
          ...(item.leaveType && { leaveType: item.leaveType })
        }));
      }),
      catchError(this.handleError)
    );
  }

  // Get all employees
  getAllEmployees(): Observable<Employee[]> {
    const endpoint = `${this.apiUrl}/leave/applications/recent/{mode}`;
    
    return this.http.get<Employee[]>(endpoint).pipe(
      catchError(this.handleError)
    );
  }

  // Get all leave types
  getAllLeaveTypes(): Observable<{id: string, name: string}[]> {
    const endpoint = `${this.leaveApiUrl}/getAllLeaveType`;
    
    return this.http.get<{id: string, name: string}[]>(endpoint).pipe(
      tap(data => data),
      catchError(this.handleError)
    );
  }

  // Submit a new leave request
  requestLeave(leaveData: LeaveRequestPayload): Observable<LeaveRequest> {
    const endpoint = `${this.leaveApiUrl}/requestLeave`;
    
    return this.http.post<LeaveRequest>(endpoint, leaveData).pipe(
      tap(response => response),
      catchError(this.handleError)
    );
  }

  // Get employee leave details
  getEmployeeLeaveDetails(empid: string): Observable<any> {
    const endpoint = `${this.leaveApiUrl}/employee/${empid}`;
    
    return this.http.get<any>(endpoint).pipe(
      tap(data => data),
      catchError(this.handleError)
    );
  }

  /**
   * Updates the status of a leave request
   * @param updateData Either a string (legacy ID) or an object containing leave update details
   * @param approved Optional boolean for legacy parameter style
   * @param reason Optional reason for the status update
   * @returns Observable with the update result
   */
  updateLeaveStatus(updateData: { 
    empCode: string; 
    id: string; 
    approved: boolean;
    reason?: string;
  } | string, approved?: boolean, reason?: string): Observable<any> {

    let id: string;
    let isApproved: boolean; 
    
    try {
      // Handle both parameter styles for backward compatibility
      if (typeof updateData === 'string') {
        // Old style: updateLeaveStatus(id, approved, reason?)
        id = updateData;
        isApproved = approved as boolean;
      } else {
        // New style: updateLeaveStatus({ empCode, id, approved, reason? })
        id = updateData.id;
        isApproved = updateData.approved;
        reason = updateData.reason || reason;
      }
      
      if (!id) {
        throw new Error('Leave ID is required');
      }
      
      // Endpoint for approving/rejecting leave requests - using the leave ID in the URL
      const endpoint = `${this.leaveApiUrl}/leave/${id}/approve`;
      
      // Prepare the request body with approval status and reason
      const body = {
        approved: isApproved,
        reason: reason || (isApproved ? 'Approved by manager' : 'Rejected by manager')
      };
      
      // Make the API call
      return this.http.post<any>(endpoint, body, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }).pipe(
        tap((response) => {
          return response;
        }),
        catchError(error => {
          return throwError(() => new Error('Failed to update leave status. Please try again.'));
        })
      );
    } catch (error) {
      return throwError(() => new Error('An unexpected error occurred while processing your request.'));
    }
  }

  // Submit a new leave request
  submitLeaveRequest(leaveData: any): Observable<any> {
    const endpoint = `${this.leaveApiUrl}/requestLeave`;
    
    return this.http.post(endpoint, leaveData).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  // Get leave balance for an employee
  getLeaveBalance(empCode: string): Observable<any> {
    const endpoint = `${this.leaveApiUrl}/employee/${empCode}`;
    
    return this.http.get<any>(endpoint).pipe(
      tap(data => data),
      map((response: any) => {
        // If the response has a leaveBalances array, return it
        if (response && Array.isArray(response.leaveBalances)) {
          return response.leaveBalances;
        }
        // If the response is the balance data directly, return it
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          return [{
            type: 'Annual Leave',
            used: response.usedDays || 0,
            total: response.totalDays || 0,
            remaining: (response.totalDays || 0) - (response.usedDays || 0)
          }];
        }
        // If no valid data found, return default values
        return [];
      }),
      catchError(error => {
        return of([]); // Return empty array on error
      })
    );
  }

  // Get leave history for an employee
  getLeaveHistory(empCode: string): Observable<any[]> {
    const endpoint = `${this.leaveApiUrl}/employee/${empCode}`;
    
    return this.http.get<any>(endpoint).pipe(
      tap(data => data),
      map((response: any) => {
        // If the response is an array, return it directly
        if (Array.isArray(response)) {
          return response;
        }
        // If response is an object with data array, return that
        if (response && Array.isArray(response.data)) {
          return response.data;
        }
        // If no valid data found, return empty array
        return [];
      }),
      catchError(error => {
        return of([]); // Return empty array on error
      })
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}
