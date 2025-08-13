import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpStatusCode
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of, never } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

 intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
  console.log('Intercepting request to:', request.url);
  console.log('Current token:', this.authService.getToken());

    // Skip adding token for public API endpoints
    if (this.isPublicApiEndpoint(request.url)) {
      return next.handle(request);
    }

    const accessToken = this.authService.getToken();
    
    if (!accessToken || !this.isValidToken(accessToken)) {
      this.redirectToLogin();
      return throwError(() => new Error('Invalid or missing access token'));
    }

    const authReq = this.addTokenHeader(request, accessToken);

    if (!environment.production) {
      console.log('Making authenticated request to:', authReq.url);
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === HttpStatusCode.Unauthorized) {
          return this.handleUnauthorizedError(authReq, next);
        }
        
        if (error.status === HttpStatusCode.Forbidden) {
          return this.handleForbiddenError(error);
        }
        
        return throwError(() => error);
      })
    );
  }

  private isAuthenticationEndpoint(url: string): boolean {
    const authEndpoints = [
      '/auth/login',
      '/auth/refresh-token',
      '/auth/logout',
      '/auth/register'
    ];
    return authEndpoints.some(endpoint => url.includes(endpoint));
  }

  private isPublicApiEndpoint(url: string): boolean {
    const publicEndpoints = [
      '/api/public/',
      '/assets/',
      '/config/'
    ];
    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }

  private isValidToken(token: string): boolean {
    try {
      const parts = token.split('.');
      return parts.length === 3; // Basic JWT structure check
    } catch {
      return false;
    }
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

  private handleUnauthorizedError(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (request.url.includes('auth/refresh-token')) {
      this.authService.logout();
      this.redirectToLogin();
      return throwError(() => new Error('Refresh token failed'));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
          this.isRefreshing = false;
          const newToken = tokenResponse?.accessToken;
          
          if (newToken) {
            this.refreshTokenSubject.next(newToken);
            return next.handle(this.addTokenHeader(request, newToken));
          }
          
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

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => {
        return next.handle(this.addTokenHeader(request, token!));
      })
    );
  }

  private handleForbiddenError(error: HttpErrorResponse): Observable<never> {
    if (!this.router.url.startsWith('/unauthorized')) {
      this.router.navigate(['/unauthorized'], { 
        replaceUrl: true,
        state: { 
          error: error,
          previousUrl: this.router.url
        }
      });
    }
    return throwError(() => error);
  }

  private redirectToLogin(): void {
    if (!this.router.url.includes('/login')) {
      const currentUrl = this.router.url;
      this.router.navigate(['/guest/login'], { 
        queryParams: { returnUrl: currentUrl },
        replaceUrl: true
      }).then(() => {
        if (!environment.production) {
          console.log('Redirected to login from:', currentUrl);
        }
      });
    }
  }
}