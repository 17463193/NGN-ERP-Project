import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-nav-right',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss']
})
export class NavRightComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}
  onLogout() {
    this.authService.logout();

  }

  async onForceLogout(userId: string) {
    if (confirm('Are you sure you want to force logout this user?')) {
      try {
        const success = await this.authService.forceLogoutUser(userId).toPromise();
        if (success) {
          alert('User has been logged out successfully');
        } else {
          alert('Failed to force logout user');
        }
      } catch (error) {
        console.error('Force logout error:', error);
        alert('An error occurred while trying to force logout');
      }
    }
  }
}