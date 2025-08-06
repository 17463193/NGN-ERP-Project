// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Check if user exists in local storage
    const storedUser = localStorage.getItem('currentUser');
    
    // If no user in local storage, clear any partial data and redirect to login
    if (!storedUser) {
      this.authService.logout();
      return this.router.createUrlTree(['/guest/login'], { 
        queryParams: { returnUrl: state.url } 
      });
    }

    try {
      const user = JSON.parse(storedUser);
      
      // If no token exists, clear and redirect
      if (!user?.accessToken) {
        this.authService.logout();
        return this.router.createUrlTree(['/guest/login'], { 
          queryParams: { returnUrl: state.url } 
        });
      }

      // Check for required roles if specified
      const requiredRoles = next.data?.['roles'] as string[];
      if (requiredRoles?.length > 0) {
        const hasRequiredRole = requiredRoles.includes(user.roleName);
        if (!hasRequiredRole) {
          // User doesn't have required role - redirect to unauthorized or home
          return this.router.createUrlTree(['/unauthorized']);
        }
      }

      // User is authenticated and has required role (if any)
      return true;
      
    } catch (error) {
      // In case of JSON parse error or other issues
      console.error('Error parsing user data:', error);
      this.authService.logout();
      return this.router.createUrlTree(['/guest/login']);
    }
  }
}