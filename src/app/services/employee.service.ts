import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Employee {
  employeeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  departmentName?: string;
  organizationName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${environment.apiUrl}/api/v1`;

  constructor(private http: HttpClient) {}

  // Get all employees
  getEmployees(): Observable<Employee[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employees`).pipe(
      map(employees => employees.map(emp => ({
        employeeId: emp.employeeId || emp.empId,
        firstName: emp.firstName || '',
        middleName: emp.middleName || null,
        lastName: emp.lastName || '',
        departmentName: emp.departmentName || emp.department?.name || 'N/A',
        organizationName: emp.organizationName || emp.organization?.name || 'N/A'
      })))
    );
  }

  // Get employee by ID
  getEmployeeById(id: string): Observable<Employee> {
    return this.getEmployees().pipe(
      map(employees => {
        const employee = employees.find(e => e.employeeId === id);
        if (!employee) {
          throw new Error(`Employee with ID ${id} not found`);
        }
        return employee;
      })
    );
  }
}
