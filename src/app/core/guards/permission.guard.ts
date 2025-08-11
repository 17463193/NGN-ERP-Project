// core/guards/permission.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const requiredPermissions = next.data['permissions'] as string[];
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    if (this.authService.hasAnyPermission(requiredPermissions)) {
      return true;
    }

    // Redirect to unauthorized or dashboard if user doesn't have permission
    return this.router.createUrlTree(['/unauthorized']);
  }
}