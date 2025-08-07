  import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { Observable, throwError, from, of, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip adding auth token for auth-related requests
    if (request.url.includes('/api/auth/')) {
      return next.handle(request);
    }

    const authToken = this.authService.currentUserValue?.accessToken;
    let authReq = request;

    if (authToken) {
      authReq = this.addTokenHeader(request, authToken);
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('auth/refresh-token')) {
          return this.handle401Error(authReq, next);
        } else if (error.status === 403) {
          console.error('Access forbidden - insufficient permissions');
          // Optionally redirect to unauthorized page or show a message
          // this.router.navigate(['/unauthorized']);
          return throwError(() => new Error('You do not have permission to access this resource.'));
        }
        
        console.error('HTTP Error:', {
          url: request.url,
          status: error.status,
          message: error.message,
          error: error.error
        });
        
        return throwError(() => error);
      })
    );
  }

  private addTokenHeader(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          const newToken = this.authService.currentUserValue?.accessToken;
          this.refreshTokenSubject.next(newToken);
          
          if (newToken) {
            return next.handle(this.addTokenHeader(request, newToken));
          }
          
          // If no new token, log the user out
          this.authService.logout();
          this.router.navigate(['/guest/login']);
          return throwError(() => new Error('Session expired. Please log in again.'));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          this.authService.logout();
          this.router.navigate(['/guest/login']);
          return throwError(() => error);
        })
      );
    }

    // If token is already being refreshed, wait for it to complete
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next.handle(this.addTokenHeader(request, token)))
    );
  }
}