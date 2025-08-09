import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

const API_BASE_URL = environment.apiUrl;

export interface Organization {
  orgId: string;
  orgName: string;
  orgCode: string;
  countryName?: string;
  dzongkhag?: string;
  thromde?: string;
  parentOrgId: string | null;
  parentOrgName: string | null;
  orgLevel: string | null;
  childOrganizationsCount: number;
  createdDate: string;
}

export interface Grade {
  gradeId: string;
  orgId: string;
  organizationName: string;
  gradeName: string;
  gradeCode: string;
  minSalary: number;
  maxSalary: number;
  progressionRules?: string | null;
  benefitEntitlements?: string | null;
  performanceCriteria?: string | null;
  nextGradeId?: string | null;
  salaryRangeValid?: boolean;
}

export interface Position {
  positionId?: string;  // Optional for create operation
  orgId: string;
  positionName: string;
  positionCode: string;
  gradeId: string;
  skillRequirements: string;
  reportingManagerPosition: string;
  successionPlanning: string;
  jobDescription: string;
  orgName?: string;
  deptName?: string;
  gradeName?: string;
  reportingManagerPositionName?: string;
  createdDate?: string;
  modifiedDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobPositionService {
  private apiUrl = `${API_BASE_URL}/api/v1/job-positions`;

  constructor(private http: HttpClient) { }

  getOrganizations(): Observable<Organization[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    return this.http.get<Organization[]>(`${API_BASE_URL}/api/v1/organizations`, { headers }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Backend returned code ${error.status}: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }

  getGrades(orgId: string): Observable<Grade[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    const url = `${API_BASE_URL}api/v1/job-grades/organization/${orgId}`;
    return this.http.get<Grade[]>(url, { headers }).pipe(
      map(response => Array.isArray(response) ? response : (response as any).data || []),
      catchError(error => this.handleError(error))
    );
  }

  getJobGrades(): Observable<Grade[]> {
        return this.http.get<Grade[]>(`${environment.apiUrl}/api/v1/job-grades`).pipe(
      map(response => Array.isArray(response) ? response : (response as any).data || []),
      catchError(error => this.handleError(error))
    );
  }

  addJobGrade(gradeData: Omit<Grade, 'gradeId'>): Observable<Grade> {
        return this.http.post<{ data: Grade }>(`${environment.apiUrl}/api/v1/job-grades`, gradeData).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  updateJobGrade(id: string, gradeData: Partial<Grade>): Observable<Grade> {
        return this.http.put<{ data: Grade }>(`${environment.apiUrl}/api/v1/job-grades/${id}`, gradeData).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  deleteJobGrade(id: string): Observable<{ success: boolean, message: string }> {
        return this.http.delete<{ success: boolean, message: string }>(`${environment.apiUrl}/api/v1/job-grades/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getPositions(): Observable<Position[]> {
    return this.http.get<Position[] | { success: boolean, data: Position[] }>(this.apiUrl)
      .pipe(
        map(response => {
          // Handle different response formats
          if (Array.isArray(response)) {
            return response; // Direct array response
          } else if (response && response.success && Array.isArray(response.data)) {
            return response.data; // Response with success and data properties
          } else if (response && Array.isArray(response)) {
            return response; // Fallback for array response
          }
          return [];
        }),
        catchError(error => this.handleError(error))
      );
  }

  getPosition(positionId: string): Observable<Position> {
    const url = `${this.apiUrl}/${positionId}`;
    return this.http.get<{ success: boolean, data: Position }>(url)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  createPosition(position: Omit<Position, 'positionId'>): Observable<Position> {
    return this.http.post<{ success: boolean, data: Position }>(this.apiUrl, position)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  updatePosition(id: string, position: Partial<Position>): Observable<Position> {
    return this.http.put<{ success: boolean, data: Position }>(`${this.apiUrl}/${id}`, position)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  deletePosition(id: string): Observable<{ success: boolean, message: string }> {
    return this.http.delete<{ success: boolean, message: string }>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }
}
