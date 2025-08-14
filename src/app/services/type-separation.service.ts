import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap, retry, switchMap, filter, take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';

export interface SeparationType {
  separationTypeId: string;
  orgId: string;
  separationName: string;
  separationCode: string;
  category: string;
  noticePeriodDays: number;
  exitInterviewRequired: boolean;
  rehireEligible: boolean;
  createdDate?: string | null;
  updatedDate?: string | null;
}

export interface Organization {
  orgId: string;
  orgName: string;
  orgCode?: string;
  countryName?: string;
  countryCode?: string;
  dzongkhag?: string;
  thromde?: string;
  postalCode?: string;
  timezone?: string;
  currencyCode?: string;
  taxJurisdiction?: string;
  legalEntityStructure?: string | null;
  taxRegistrationNumbers?: string | null;
  parentOrgId?: string | null;
  parentOrgName?: string | null;
  orgLevel?: number | null;
  childOrganizationsCount?: number;
  createdDate?: string;
  modifiedDate?: string;
}

@Injectable({ providedIn: 'root' })
export class SeparationService {
  private readonly sepTypeUrl = `${environment.apiUrl}/api/separation-types`;
  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

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

  getSeparationTypes(): Observable<SeparationType[]> {
    const requestFn = () => this.http.get<SeparationType[]>(this.sepTypeUrl, { 
      headers: this.getAuthHeaders()
    });

    return requestFn().pipe(
      catchError(error => this.handleHttpError(error, requestFn))
    );
  }

  getSeparationTypeById(id: string): Observable<SeparationType> {
    const requestFn = () => this.http.get<SeparationType>(`${this.sepTypeUrl}/${id}`, { 
      headers: this.getAuthHeaders() 
    });

    return requestFn().pipe(
      catchError(error => this.handleHttpError(error, requestFn))
    );
  }

  createSeparationType(separationType: Omit<SeparationType, 'separationTypeId' | 'createdDate' | 'updatedDate'>): Observable<SeparationType> {
    // Ensure all required fields are present and properly formatted
    const payload = {
      orgId: separationType.orgId,
      separationName: separationType.separationName,
      separationCode: separationType.separationCode,
      category: separationType.category,
      noticePeriodDays: separationType.noticePeriodDays,
      exitInterviewRequired: separationType.exitInterviewRequired,
      rehireEligible: separationType.rehireEligible
    };

    const requestFn = () => this.http.post<SeparationType>(
      this.sepTypeUrl, 
      payload, 
      { 
        headers: this.getAuthHeaders(),
        observe: 'response' as const
      }
    ).pipe(
      map(response => {
        if (!response.body) {
          throw new Error('No response body received');
        }
        return response.body as SeparationType;
      })
    );

    return requestFn().pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating separation type:', error);
        
        if (error.status === 400) {
          return throwError(() => new Error('Invalid request. Please check your input.'));
        } else if (error.status === 401) {
          return throwError(() => new Error('Session expired. Please log in again.'));
        } else if (error.status === 403) {
          return throwError(() => new Error('You do not have permission to create a separation type.'));
        } else if (error.status === 409) {
          return throwError(() => new Error('A separation type with this code already exists.'));
        } else {
          return throwError(() => new Error('An unexpected error occurred. Please try again later.'));
        }
      })
    );
  }

  updateSeparationType(id: string, separationType: Partial<Omit<SeparationType, 'separationTypeId' | 'createdDate' | 'updatedDate'>>): Observable<SeparationType> {
    const requestFn = () => this.http.put<SeparationType>(`${this.sepTypeUrl}/${id}`, separationType, { 
      headers: this.getAuthHeaders() 
    });

    return requestFn().pipe(
      catchError(error => this.handleHttpError(error, requestFn))
    );
  }

  deleteSeparationType(id: string): Observable<void> {
    const requestFn = () => this.http.delete<void>(`${this.sepTypeUrl}/${id}`, { 
      headers: this.getAuthHeaders() 
    });

    return requestFn().pipe(
      catchError(error => this.handleHttpError(error, requestFn))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly orgUrl = `${environment.apiUrl}/api/v1/organizations`;
  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);
  private organizationCache = new Map<string, Organization>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

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
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.status === 401) {
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
    if (error.status === 401 && !this.refreshTokenInProgress) {
      this.refreshTokenInProgress = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(tokenResponse.accessToken);
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

    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => requestFn())
      );
    }

    return throwError(() => error);
  }

  /**
   * Get all organizations
   * Handles different response formats from the API
   */
  getOrganizations(): Observable<Organization[]> {
    const requestFn = () => this.http.get<any>(
      this.orgUrl,
      { headers: this.getAuthHeaders() }
    );

    return requestFn().pipe(
      map(response => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && typeof response === 'object' && 'data' in response) {
          return Array.isArray(response.data) ? response.data : [];
        } else if (response && typeof response === 'object' && 'organizations' in response) {
          return Array.isArray(response.organizations) ? response.organizations : [];
        }
        return [];
      }),
      catchError(error => this.handleHttpError(error, requestFn)),
      catchError(this.handleError)
    );
  }

  /**
   * Get organization by ID with caching and error handling
   * Returns a default 'Restricted Organization' for 403 errors
   */
  getOrganizationById(orgId: string): Observable<Organization> {
    // Return cached organization if available
    const cachedOrg = this.organizationCache.get(orgId);
    if (cachedOrg) {
      return of(cachedOrg);
    }

    const requestFn = () => this.http.get<Organization>(
      `${this.orgUrl}/${orgId}`,
      { 
        headers: this.getAuthHeaders(),
        observe: 'response' as const,
        responseType: 'json' as const
      }
    ).pipe(
      map(response => response.body as Organization)
    );

    return requestFn().pipe(
      tap(org => {
        if (org) {
          this.organizationCache.set(orgId, org);
        }
      }),
      catchError(error => {
        if (error.status === 401) {
          return this.handleHttpError(error, requestFn);
        } else if (error.status === 403) {
          // Return a default restricted organization for 403 errors
          const defaultOrg = this.createAndCacheDefaultOrg(orgId);
          return of(defaultOrg);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Helper method to create and cache a default organization
   */
  private createAndCacheDefaultOrg(orgId: string): Observable<Organization> {
    const defaultOrg: Organization = {
      orgId: orgId,
      orgName: 'Restricted Organization',
      orgCode: '',
      countryName: '',
      dzongkhag: '',
      thromde: '',
      parentOrgId: null,
      parentOrgName: null,
      orgLevel: null,
      childOrganizationsCount: 0,
      createdDate: new Date().toISOString()
    };
    
    this.organizationCache.set(orgId, defaultOrg);
    return of(defaultOrg);
  }
}