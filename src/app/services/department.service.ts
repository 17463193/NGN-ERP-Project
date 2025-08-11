import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Department {
  dept_id: string;
  dept_name: string;
  dept_code: string;
  org_name: string;
  branch_name: string;
  budget_allocation: number;
  sub_departments_count: number;
  status?: boolean; // Optional since it's not in the API response but used in the template
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: Department[];
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/api/v1/departments`;

  constructor(private http: HttpClient) {}

  getDepartments(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(this.apiUrl);
  }
}
