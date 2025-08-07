import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

const API_BASE_URL = environment.apiUrl;

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
  structureName: string;
  salaryRangeValid?: boolean;
  salaryComponents?: Array<{
    componentId: string;
    componentValue: number;
    isVariable?: boolean | null;
    performanceLinked?: boolean | null;
    revisionCycle?: string | null;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class JobGradeService {
  private baseUrl = `${API_BASE_URL}/v1/job-grades`;

  constructor(private http: HttpClient) { }

  /**
   * Get all job grades
   */
  getAllGrades(): Observable<Grade[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map(response => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && Array.isArray(response.data)) {
          return response.data;
        } else if (response && response.data) {
          return [response.data];
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get grades by organization ID
   */
  getGradesByOrganization(orgId: string): Observable<Grade[]> {
    return this.http.get<any>(`${this.baseUrl}/organization/${orgId}`).pipe(
      map(response => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && Array.isArray(response.data)) {
          return response.data;
        } else if (response && response.data) {
          return [response.data];
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get a single grade by ID
   */
  getGradeById(gradeId: string): Observable<Grade> {
    return this.http.get<any>(`${this.baseUrl}/${gradeId}`).pipe(
      map(response => {
        // Handle different response formats
        if (response && response.data) {
          return response.data;
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get salary structure for a specific grade
   */
  getSalaryStructure(gradeId: string): Observable<Grade> {
    const endpoint = `${this.baseUrl}/${gradeId}/with-salary-structure`;

    return this.http.get<any>(endpoint).pipe(
      tap({
        next: (response) => {
          if (response?.data) {
            if (response.data.salaryComponents) {
            } else {
            }
          } else if (response?.salaryComponents) {
          } else {
            console.log('No salary components found in the response object');
            console.log('Available response keys:', Object.keys(response || {}));
          }
        },
        error: (error) => {
          console.error(`Error fetching from ${endpoint}:`, error);
          if (error instanceof HttpErrorResponse) {
            console.error('Error status:', error.status);
            console.error('Error status text:', error.statusText);
            console.error('Error details:', error.error);
          }
        }
      }),
      map(response => response.data || response), // Handle both {data: {...}} and direct response
      catchError(this.handleError)
    ) as Observable<Grade>;
  }

  /**
   * Create a new job grade with salary structure
   */
  createGrade(gradeData: Omit<Grade, 'gradeId'>): Observable<Grade> {
    // Prepare the request payload with proper typing
    const payload = {
      ...gradeData,
      // Ensure numeric fields are properly formatted
      minSalary: Number(gradeData.minSalary),
      maxSalary: Number(gradeData.maxSalary),
      // Ensure structureName is set (should be the same as gradeName)
      structureName: gradeData.gradeName,
      // Add any other required fields with default values
      organizationName: gradeData.organizationName || '',
      nextGradeId: gradeData.nextGradeId || null,
      salaryRangeValid: gradeData.salaryRangeValid || true
    };

    console.log('Sending create grade request with payload:', JSON.stringify(payload, null, 2));

    interface ApiResponse {
      data?: Grade;
      success?: boolean;
      message?: string;
      [key: string]: any;
    }

    // Use the correct endpoint for creating job grades with salary structure
    const createUrl = `${this.baseUrl}/with-salary-structure`;

    return this.http.post<ApiResponse | Grade>(createUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }).pipe(
      tap((response: ApiResponse | Grade) => {
        console.log('Create grade response:', response);
      }),
      map((response: ApiResponse | Grade) => {
        // Handle different response formats
        if (response && 'data' in response && response.data) {
          return response.data;
        } else if (response && 'gradeId' in response) {
          return response as Grade;
        }
        console.warn('Unexpected response format from create grade:', response);
        throw new Error('Unexpected response format from server');
      }),
      catchError((error: any) => {
        console.error('Error in createGrade:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Update an existing job grade
   */
  updateGrade(gradeId: string, gradeData: Partial<Grade>): Observable<Grade> {
    // Prepare the request payload with proper typing
    const payload: Partial<Grade> = {
      ...gradeData,
      // Ensure numeric fields are properly formatted if they exist
      ...(gradeData.minSalary !== undefined && { minSalary: Number(gradeData.minSalary) }),
      ...(gradeData.maxSalary !== undefined && { maxSalary: Number(gradeData.maxSalary) }),
      // Ensure structureName is set (should be the same as gradeName)
      ...(gradeData.gradeName && { structureName: gradeData.gradeName })
    };

    console.log(`Sending update grade request for ID ${gradeId} with payload:`, JSON.stringify(payload, null, 2));

    interface ApiResponse {
      data?: Grade;
      success?: boolean;
      message?: string;
      [key: string]: any;
    }

    // Use the correct endpoint for updating job grades with salary structure
    const updateUrl = `${this.baseUrl}/${gradeId}/with-salary-structure`;

    return this.http.put<ApiResponse | Grade>(updateUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }).pipe(
      tap((response: ApiResponse | Grade) => {
        console.log('Update grade response:', response);
      }),
      map((response: ApiResponse | Grade) => {
        // Handle different response formats
        if (response && 'data' in response && response.data) {
          return response.data;
        } else if (response && 'gradeId' in response) {
          return response as Grade;
        }
        console.warn('Unexpected response format from update grade:', response);
        throw new Error('Unexpected response format from server');
      }),
      catchError((error: any) => {
        console.error('Error in updateGrade:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Delete a job grade
   */
  deleteGrade(gradeId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${gradeId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    console.error('Full error response:', error);

    let errorMessage = 'An unknown error occurred!';
    let errorDetails = '';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server error (${error.status}): ${error.statusText || 'Unknown error'}`;

      // Try to get error details from the response
      if (error.error) {
        if (typeof error.error === 'string') {
          errorDetails = error.error;
        } else if (error.error.message) {
          errorDetails = error.error.message;
        } else if (error.error.error) {
          errorDetails = error.error.error;
        }

        // Log validation errors if present
        if (error.error.errors) {
          console.error('Validation errors:', error.error.errors);
          const validationErrors = [];
          for (const key in error.error.errors) {
            if (error.error.errors.hasOwnProperty(key)) {
              validationErrors.push(`${key}: ${error.error.errors[key]}`);
            }
          }
          errorDetails = validationErrors.join('\n');
        }
      }
    }

    // Log detailed error information
    console.error('Error details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      headers: error.headers,
      error: error.error
    });

    return throwError(() => ({
      message: errorMessage,
      details: errorDetails,
      status: error.status,
      error: error.error
    }));
  }
}
