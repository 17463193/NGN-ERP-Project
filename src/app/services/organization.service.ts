import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, filter, take, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';

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

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly apiUrl = `${environment.apiUrl}/v1/organizations`;
  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Get all organizations
   * @returns Observable with array of organizations
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.currentUserValue?.accessToken;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Handle specific status codes
      if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.status === 401) {
        // Token expired or invalid
        this.authService.logout();
        this.router.navigate(['/auth/login']);
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.status === 403) {
        errorMessage = 'Access forbidden - insufficient permissions';
      } else if (error.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (error.status >= 500) {
        errorMessage = 'A server error occurred. Please try again later.';
      }
    }
    
    console.error('API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  private handleHttpError(error: HttpErrorResponse, requestFn: () => Observable<any>): Observable<any> {
    // If it's a 401 and we're not already refreshing the token
    if (error.status === 401 && !this.refreshTokenInProgress) {
      this.refreshTokenInProgress = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(tokenResponse.accessToken);
          // Retry the original request with the new token
          return requestFn();
        }),
        catchError((refreshError) => {
          this.refreshTokenInProgress = false;
          this.authService.logout();
          this.router.navigate(['/auth/login']);
          return throwError(() => refreshError);
        })
      );
    }

    // If we're already refreshing the token, wait for it to complete
    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => requestFn())
      );
    }

    // For other errors, just pass them through
    return throwError(() => error);
  }

  getOrganizations(): Observable<Organization[]> {
    const requestFn = () => this.http.get<Organization[]>(
      this.apiUrl,
      { headers: this.getAuthHeaders() }
    );

    return requestFn().pipe(
      catchError(error => this.handleHttpError(error, requestFn)),
      catchError(this.handleError)
    );
  }

  /**
   * Get organization by ID
   * @param orgId Organization ID
   * @returns Observable with organization details
   */
  private organizationCache = new Map<string, Organization>();

  getOrganizationById(orgId: string): Observable<Organization> {
    // Return cached organization if available
    const cachedOrg = this.organizationCache.get(orgId);
    if (cachedOrg) {
      return of(cachedOrg);
    }

    const requestFn = () => this.http.get<Organization>(
      `${this.apiUrl}/${orgId}`,
      { 
        headers: this.getAuthHeaders(),
        // Add this to get full error responses from the server
        observe: 'response' as const,
        responseType: 'json' as const
      }
    ).pipe(
      // Extract the response body
      map(response => response.body as Organization)
    );

    return requestFn().pipe(
      tap((org: Organization) => {
        if (org) {
          this.organizationCache.set(orgId, org);
        }
      }),
      catchError(error => {
        // For 401 errors, handle token refresh
        if (error.status === 401) {
          return this.handleHttpError(error, requestFn);
        }
        
        // For 403 errors, just rethrow the error
        // The error will be handled by the global error handler or the component
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new organization
   * @param organization Organization data to create
   * @returns Observable with created organization
   */
  /**
   * Create a new organization
   * @param organization Organization data to create
   * @returns Observable with the created organization
   */
  createOrganization(organization: Omit<Organization, 'orgId' | 'createdDate'>): Observable<Organization> {
    const requestFn = () => this.http.post<Organization>(
      this.apiUrl,
      organization,
      { headers: this.getAuthHeaders() }
    );

    return requestFn().pipe(
      catchError(error => this.handleHttpError(error, requestFn)),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing organization
   * @param orgId Organization ID
   * @param organization Updated organization data
   * @returns Observable with updated organization
   */
  updateOrganization(orgId: string, organization: Partial<Organization>): Observable<Organization> {
    const requestFn = () => this.http.put<Organization>(
      `${this.apiUrl}/${orgId}`,
      organization,
      { headers: this.getAuthHeaders() }
    );

    return requestFn().pipe(
      tap(updatedOrg => {
        // Update cache if the update was successful
        if (updatedOrg) {
          this.organizationCache.set(orgId, updatedOrg);
        }
      }),
      catchError(error => this.handleHttpError(error, requestFn)),
      catchError(this.handleError)
    );
  }

  /**
   * Delete an organization
   * @param orgId Organization ID to delete
   * @returns Observable with the result of the operation
   */
  deleteOrganization(orgId: string): Observable<void> {
    const requestFn = () => this.http.delete<void>(
      `${this.apiUrl}/${orgId}`,
      { headers: this.getAuthHeaders() }
    );

    return requestFn().pipe(
      tap(() => {
        // Remove from cache if deletion was successful
        this.organizationCache.delete(orgId);
      }),
      catchError(error => this.handleHttpError(error, requestFn)),
      catchError(this.handleError)
    );
  }
}
