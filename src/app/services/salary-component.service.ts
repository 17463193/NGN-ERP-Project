import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

const API_BASE_URL = environment.apiUrl || '';

export interface SalaryComponent {
  componentId: string;
  orgId: string;
  componentName: string;
  componentCode: string;
  componentType: string;
  calculationBasis: string;
  calculationFormula: string | null;
  taxApplicable: boolean;
  statutoryRequirement: boolean;
  displayOrder: number;
  organizationName: string;
  createdDate: string;
  modifiedDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class SalaryComponentService {
  private baseUrl = `${API_BASE_URL}/api/v1/salary-components`;

  constructor(private http: HttpClient) { }

  /**
   * Get all salary components
   */
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllComponents(): Observable<SalaryComponent[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<SalaryComponent[]>(this.baseUrl, { headers }).pipe(
      map(response => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && Array.isArray((response as any).data)) {
          return (response as any).data;
        } else if (response && (response as any).data) {
          return [(response as any).data];
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get a single salary component by ID
   */
  getComponentById(componentId: string): Observable<SalaryComponent> {
    const headers = this.getAuthHeaders();
    return this.http.get<SalaryComponent>(`${this.baseUrl}/${componentId}`, { headers }).pipe(
      map(response => {
        // Handle different response formats
        if (response && (response as any).data) {
          return (response as any).data;
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Create a new salary component
   */
  createComponent(componentData: Omit<SalaryComponent, 'componentId'>): Observable<SalaryComponent> {
    const headers = this.getAuthHeaders();
    return this.http.post<SalaryComponent>(this.baseUrl, componentData, { headers }).pipe(
      map(response => {
        if (response && (response as any).data) {
          return (response as any).data;
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing salary component
   */
  updateComponent(componentId: string, componentData: Partial<SalaryComponent>): Observable<SalaryComponent> {
    const headers = this.getAuthHeaders();
    return this.http.put<SalaryComponent>(`${this.baseUrl}/${componentId}`, componentData, { headers }).pipe(
      map(response => {
        if (response && (response as any).data) {
          return (response as any).data;
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a salary component
   */
  deleteComponent(componentId: string): Observable<{ success: boolean; message: string }> {
    const headers = this.getAuthHeaders();
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${componentId}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
