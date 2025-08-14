import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Organization {
  orgId: string;
  orgName: string;
  orgCode: string;
  countryName: string | null;
  dzongkhag: string | null;
  thromde: string | null;
  parentOrgId: string | null;
  parentOrgName: string | null;
  orgLevel: number | null;
  childOrganizationsCount: number;
  createdDate: string | null;
}

export interface Branch {
  branchId: string;
  branchName: string;
  branchCode: string;
  dzongkhag: string | null;
  thromde: string | null;
  operationalStatus: boolean | null;
  organizationName: string | null;
}

export interface Department {
  dept_id: string;
  organization: Organization;
  branch: Branch;
  dept_name: string;
  dept_code: string;
  parent_department: Department | null;
  sub_departments: Department[];
  dept_head_id: string | null;
  budget_allocation: number;
  approval_hierarchy: string;
  reporting_structure: string | null;
  created_date: string;
  modified_date: string | null;
}

export interface DepartmentListResponse {
  success: boolean;
  message: string;
  data: Department[];
  timestamp: string;
}

export interface DepartmentResponse {
  success: boolean;
  message: string;
  data: Department;
  timestamp: string;
}

export type ApiResponse = DepartmentListResponse | DepartmentResponse;

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/api/v1/departments`;

  constructor(private http: HttpClient) { }

  getDepartments(): Observable<DepartmentListResponse> {
    return this.http.get<DepartmentListResponse>(this.apiUrl);
  }

  createDepartment(departmentData: any): Observable<DepartmentResponse> {
    return this.http.post<DepartmentResponse>(this.apiUrl, departmentData);
  }

  // Organization related methods
  getOrganizations(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/v1/organizations`);
  }

  // Branch related methods
  getBranches(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/v1/branches`);
  }

  // Get department by ID
  getDepartmentById(deptId: string): Observable<DepartmentResponse> {
    return this.http.get<DepartmentResponse>(`${this.apiUrl}/${deptId}`);
  }

  // Update department
  updateDepartment(deptId: string, departmentData: any): Observable<DepartmentResponse> {
    return this.http.put<DepartmentResponse>(`${this.apiUrl}/${deptId}`, departmentData);
  }
}