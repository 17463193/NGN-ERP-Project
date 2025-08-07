import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
interface AttendanceRecord {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  attendanceGroup: string;
  attendanceDate: string;
  dayOfWeek: string;
  timePeriod: string;
  requiredCheckInDate: string;
  requiredCheckInTime: string;
  requiredCheckOutDate: string;
  requiredCheckOutTime: string;
  actualCheckInTime: string;
  actualCheckOutTime: string;
  totalDuration: string;
  empCode: string;
  employeeId: string;
  graceCheckInTime: string;
  lateCheckInTime: string;
  earlyTime: string;
  overTime: string;
}

interface EmployeeAttendance {
  employeeId: string;
  attendanceList: AttendanceRecord[];
}

interface ApiResponse {
  content: EmployeeAttendance[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceSheetService {
  apiUrl = `${environment.apiUrl}/api/v1/employee-attendance/monthly-grouped`;
//  apiUrl = `${environment.apiUrl}/api/v1/employee-attendance/latest`
  constructor(private http: HttpClient) { }

  getAttendanceData(year: number, month: number, attendanceGroup?: string, page: number = 0): Observable<EmployeeAttendance[]> {
    let params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString())
      .set('page', page.toString());

    // Only add attendanceGroup if it has a value and is not 'All'
    if (attendanceGroup && attendanceGroup !== 'All') {
      params = params.set('attendanceGroup', attendanceGroup);
    }

    return this.http.get<ApiResponse>(this.apiUrl, { params })
      .pipe(
        map(response => response.content || []),
        catchError(error => {
          // For 404 errors (no data), return empty array
          if (error.status === 404) {
            return of([]);
          }
          
          // For other errors, log in development and return empty array
          if (!environment.production) {
            console.warn('Error fetching attendance data:', error);
          }
          return of([]);
        })
      );
  }

  // Get all attendance data with pagination (fetch all pages)
  getAllAttendanceData(year: number, month: number, attendanceGroup?: string): Observable<EmployeeAttendance[]> {
    return new Observable(subscriber => {
      let allData: EmployeeAttendance[] = [];
      let currentPage = 0;
      let hasMore = true;

      const fetchPage = (page: number) => {
        if (!hasMore) {
          subscriber.complete();
          return;
        }

        this.getAttendanceDataWithPagination(year, month, attendanceGroup, page)
          .subscribe({
            next: (response) => {
              if (response.content && response.content.length > 0) {
                allData = [...allData, ...response.content];
                subscriber.next([...allData]); // Emit current data
              }
              
              hasMore = !response.last && response.content && response.content.length > 0;
              
              if (hasMore) {
                // Fetch next page if there are more
                fetchPage(page + 1);
              } else {
                subscriber.complete();
              }
            },
            error: (error) => {
              console.error(`Error fetching page ${page}:`, error);
              // Return data collected so far
              subscriber.next(allData);
              subscriber.complete();
            }
          });
      };

      fetchPage(currentPage);
    });
  }

  // Private method to get paginated response with full API response
  private getAttendanceDataWithPagination(year: number, month: number, attendanceGroup?: string, page: number = 0): Observable<ApiResponse> {
    let params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString())
      .set('page', page.toString());

    if (attendanceGroup && attendanceGroup !== 'All') {
      params = params.set('attendanceGroup', attendanceGroup);
    }

    return this.http.get<ApiResponse>(this.apiUrl, { params })
      .pipe(
        catchError(error => {
          // Check if it's a 404 error (no data for this month)
          if (error.status === 404) {
            // Return empty response structure for 404 (no data available)
            const emptyResponse: ApiResponse = {
              content: [],
              pageable: {
                pageNumber: 0,
                pageSize: 0,
                sort: { empty: true, sorted: false, unsorted: true },
                offset: 0,
                paged: true,
                unpaged: false
              },
              last: true,
              totalPages: 0,
              totalElements: 0,
              size: 0,
              number: 0,
              sort: { empty: true, sorted: false, unsorted: true },
              first: true,
              numberOfElements: 0,
              empty: true
            };
            return of(emptyResponse);
          }
          
          // For other errors, still return empty response but log to console in development
          if (!environment.production) {
            console.warn('Error fetching attendance data:', error);
          }
          
          // Return empty response for other errors as well
          const errorResponse: ApiResponse = {
            content: [],
            pageable: {
              pageNumber: 0,
              pageSize: 0,
              sort: { empty: true, sorted: false, unsorted: true },
              offset: 0,
              paged: true,
              unpaged: false
            },
            last: true,
            totalPages: 0,
            totalElements: 0,
            size: 0,
            number: 0,
            sort: { empty: true, sorted: false, unsorted: true },
            first: true,
            numberOfElements: 0,
            empty: true
          };
          return of(errorResponse);
        })
      );
  }

  // Get available years and months from the API
  getAvailableDates(): Observable<{ years: number[], months: { value: number, name: string }[] }> {
    // In a real app, this might be another API endpoint
    // For now, we'll provide a reasonable range of years and all months
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    const months = [
      { value: 1, name: 'January' },
      { value: 2, name: 'February' },
      { value: 3, name: 'March' },
      { value: 4, name: 'April' },
      { value: 5, name: 'May' },
      { value: 6, name: 'June' },
      { value: 7, name: 'July' },
      { value: 8, name: 'August' },
      { value: 9, name: 'September' },
      { value: 10, name: 'October' },
      { value: 11, name: 'November' },
      { value: 12, name: 'December' }
    ];

    return of({ years, months });
  }

  // Get unique attendance groups/departments
  getAttendanceGroups(year: number, month: number): Observable<string[]> {
    return this.getAllAttendanceData(year, month).pipe(
      map(data => {
        const groups = new Set<string>();
        data.forEach(employee => {
          if (employee.attendanceList && employee.attendanceList.length > 0) {
            const group = employee.attendanceList[0]?.attendanceGroup;
            if (group && group.trim() !== '') {
              groups.add(group.trim());
            }
          }
        });
        return ['All', ...Array.from(groups).sort()];
      }),
      catchError(error => {
        console.error('Error fetching attendance groups:', error);
        return of(['All']);
      })
    );
  }
}