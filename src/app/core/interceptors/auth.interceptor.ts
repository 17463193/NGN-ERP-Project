import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpStatusCode
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  private refreshInProgress = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip adding token for auth and public endpoints
    if (this.isAuthRequest(request.url) || this.isPublicEndpoint(request.url)) {
      return next.handle(request);
    }

    // Get the access token
    const accessToken = this.authService.getToken();
    
    // If no token, redirect to login
    if (!accessToken) {
      this.redirectToLogin();
      return throwError(() => new Error('No access token available'));
    }

    // Add token to the request
    const authReq = this.addTokenHeader(request, accessToken);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized errors
        if (error.status === HttpStatusCode.Unauthorized) {
          // Don't try to refresh token for refresh-token endpoint
          if (request.url.includes('auth/refresh-token')) {
            this.authService.logout();
            this.redirectToLogin();
            return throwError(() => error);
          }
          
          // Handle token refresh
          return this.handle401Error(authReq, next);
        }
        
        // Handle other errors
        if (error.status === HttpStatusCode.Forbidden) {
          // Handle 403 Forbidden
          this.router.navigate(['/unauthorized']);
        }
        
        return throwError(() => error);
      })
    );
  }

  private isAuthRequest(url: string): boolean {
    return url.includes('/auth/');
  }

  private isPublicEndpoint(url: string): boolean {
    // Add any public endpoints that don't require authentication
    const publicEndpoints = [
      '/api/public/',
      '/training/programs' // Add training programs endpoint if it should be public
    ];
    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }

  private addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap(() => {
          this.isRefreshing = false;
          const newToken = this.authService.getToken();
          
          if (newToken) {
            this.refreshTokenSubject.next(newToken);
            return next.handle(this.addTokenHeader(request, newToken));
          }
          
          // If no new token, force logout
          this.authService.logout();
          this.redirectToLogin();
          return throwError(() => new Error('Token refresh failed'));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          this.authService.logout();
          this.redirectToLogin();
          return throwError(() => error);
        }),
        finalize(() => {
          this.isRefreshing = false;
        })
      );
    }

    // If token is being refreshed, wait for it to complete
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => {
        if (token) {
          return next.handle(this.addTokenHeader(request, token));
        }
        this.redirectToLogin();
        return throwError(() => new Error('Token refresh failed'));
      })
    );
  }

  private redirectToLogin(): void {
    // Get the current URL to redirect back after login
    const currentUrl = this.router.url;
    
    // Only redirect to login if not already on login page
    if (!currentUrl.includes('/guest/login') && !currentUrl.includes('/auth/login')) {
      this.router.navigate(['/guest/login'], { 
        queryParams: { returnUrl: currentUrl } 
      }).then(() => {
        // Force a page reload to reset the application state
        window.location.reload();
      });
    }
  }
}
