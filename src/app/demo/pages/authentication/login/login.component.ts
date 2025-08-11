// login.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  error: string = '';
  loading = false;
  private returnUrl: string = '/default';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Redirect to home if already logged in
    if (this.authService.currentUserValue) {
      this.router.navigate([this.returnUrl]);
      return;
    }

    // Get return url from route parameters or default to '/default'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/default';
    
    // Check for remember me data
    const rememberMeData = localStorage.getItem('rememberMeData');
    if (rememberMeData) {
      try {
        const { username, rememberMe } = JSON.parse(rememberMeData);
        if (rememberMe) {
          this.loginForm.patchValue({
            username,
            rememberMe: true
          });
        }
      } catch (e) {
        console.error('Error parsing remember me data', e);
      }
    }
  }

  onSubmit(): void {
    // Stop if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const { username, password, rememberMe } = this.loginForm.value;

    // Handle remember me
    if (rememberMe) {
      localStorage.setItem('rememberMeData', JSON.stringify({ username, rememberMe: true }));
    } else {
      localStorage.removeItem('rememberMeData');
    }

    // Attempt to login
    this.authService.login(username, password).subscribe({
      next: (success) => {
        if (success) {
          // Redirect to the return URL or default page
          this.router.navigateByUrl(this.returnUrl).then(() => {
            // Force reload to ensure all guards and resolvers run
            window.location.reload();
          });
        } else {
          this.error = 'Invalid username or password';
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        this.error = error.error?.message || 'An error occurred. Please try again.';
        this.loading = false;
      }
    });
  }
}