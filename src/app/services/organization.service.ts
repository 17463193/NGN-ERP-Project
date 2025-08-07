import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Organization {
  orgId: string;
  orgName: string;
  orgCode: string;
  countryName: string;
  dzongkhag: string;
  thromde: string;
  parentOrgId: string | null;
  parentOrgName: string | null;
  orgLevel: number | null;
  childOrganizationsCount: number;
  createdDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly apiUrl = `${environment.apiUrl}/v1/organizations`;

  constructor(private http: HttpClient) {}

  /**
   * Get all organizations
   * @returns Observable with array of organizations
   */
  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(this.apiUrl);
  }

  /**
   * Get organization by ID
   * @param orgId Organization ID
   * @returns Observable with organization details
   */
  getOrganizationById(orgId: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.apiUrl}/${orgId}`);
  }

  /**
   * Create a new organization
   * @param organization Organization data to create
   * @returns Observable with created organization
   */
  createOrganization(organization: Omit<Organization, 'orgId' | 'createdDate'>): Observable<Organization> {
    return this.http.post<Organization>(this.apiUrl, organization);
  }

  /**
   * Update an existing organization
   * @param orgId Organization ID
   * @param organization Updated organization data
   * @returns Observable with updated organization
   */
  updateOrganization(orgId: string, organization: Partial<Organization>): Observable<Organization> {
    return this.http.put<Organization>(`${this.apiUrl}/${orgId}`, organization);
  }

  /**
   * Delete an organization
   * @param orgId Organization ID to delete
   * @returns Observable with the result of the operation
   */
  deleteOrganization(orgId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${orgId}`);
  }
}
