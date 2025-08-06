import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, of, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, tap, catchError } from 'rxjs/operators';

export interface Branch {
  id: string;
  name: string;
}

export interface Holiday {
  organizationName: string;
  branchName: string;
  branchId?: string; // Added branchId to match API response
  year: number;
  holidayDate: string;
  holidayName: string;
  holidayType: string;
  leaveDayType: 'Full Day' | 'Half Day' | 'full day' | 'half day'; // Updated to match API response
  isOptional: boolean;
  calendarId: string;
}

export interface Organization {
  id: string;
  name: string;
  branches: Branch[];
}

@Injectable({ providedIn: 'root' })
export class CalendarDataService {
  // Cache for holidays data
  private holidaysCache: { [key: string]: Holiday[] } = {};
  private organizations: Organization[] = [];
  private organizationsLoaded = false;

  // Base URL for API endpoints
    private readonly baseUrl = environment.leaveApiUrl;

  constructor(private http: HttpClient) {}



  /**
   * Get all branches from the API
   * @returns Observable with array of branches
   */
  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.baseUrl}/getBranches`).pipe(
      map(branches => branches || []),
      catchError(error => {
        console.error('Failed to load branches from API', error);
        return of([]);
      })
    );
  }

  // Get all organizations from API with fallback to default organization
  getOrganizations(): Observable<Organization[]> {
    if (this.organizationsLoaded) {
      return of([...this.organizations]);
    }

    // Try to fetch organizations from API, but fall back to default if not available
    return this.http.get<Array<{id: string, name: string}>>(`${this.baseUrl}/getOrganizations`).pipe(
      map(orgs => {
        // Transform the API response to match our Organization interface
        this.organizations = orgs.map(org => ({
          id: org.id,
          name: org.name,
          branches: []
        }));
        this.organizationsLoaded = true;
        return this.organizations;
      }),
      catchError(error => {
        console.warn('Failed to load organizations from API, using empty organization list', error);
        // Fallback to empty organizations array if API fails
        this.organizations = [];
        this.organizationsLoaded = true;
        return of(this.organizations);
      })
    );
  }

  // Get all holidays with optional filtering
  getHolidays(orgName?: string, branchName?: string, year?: number): Observable<Holiday[]> {
    const cacheKey = `${orgName || 'all'}-${branchName || 'all'}-${year || 'all'}`;
    
    // Return cached data if available
    if (this.holidaysCache[cacheKey]) {
      return of(this.holidaysCache[cacheKey]);
    }

    // Use the correct endpoint /api/leave/getAllHoliday
    let url = `${this.baseUrl}/getAllHoliday`;
    const params: string[] = [];
    
    if (orgName) params.push(`orgName=${encodeURIComponent(orgName)}`);
    if (branchName) params.push(`branchName=${encodeURIComponent(branchName)}`);
    if (year) params.push(`year=${year}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<Holiday[]>(url).pipe(
      map(holidays => holidays || []),
      tap(holidays => {
        // Cache the results
        this.holidaysCache[cacheKey] = holidays;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get holidays for a specific branch by branch ID and year
   * @param branchId The ID of the branch
   * @param year The year to get holidays for
   * @returns Observable with array of holidays
   */
  getHolidaysByBranchId(branchId: string, year: number): Observable<Holiday[]> {
    const cacheKey = `branch-${branchId}-${year}`;
    
    // Return cached data if available
    if (this.holidaysCache[cacheKey]) {
      return of(this.holidaysCache[cacheKey]);
    }

    const url = `${this.baseUrl}/getHolidayByBranch/${branchId}?year=${year}`;
    
    return this.http.get<Holiday[]>(url).pipe(
      map(holidays => holidays || []),
      tap(holidays => {
        // Cache the results
        this.holidaysCache[cacheKey] = holidays;
      }),
      catchError(error => {
        console.error(`Error loading holidays for branch ${branchId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Inserts or updates leave calendar entries
   * @param holidays Array of holiday objects to be saved
   * @returns Observable with the response from the server
   */
  insertLeaveCalendar(holidays: Holiday[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/insertLeaveCalendar`, holidays).pipe(
      tap(() => {
        // Clear cache after successful save to ensure fresh data on next load
        this.holidaysCache = {};
      }),
      catchError(error => {
        console.error('Error saving leave calendar:', error);
        throw error; // Re-throw to allow component to handle the error
      })
    );
  }

  deleteHoliday(calendarId: string): Observable<any> {
    const url = `${this.baseUrl}/deleteHoliday/${calendarId}`;
    return this.http.delete(url).pipe(
      tap(() => {
        this.clearHolidaysCache();
      }),
      catchError(error => {
        console.error('Error deleting holiday:', error);
        throw error;
      })
    );
  }


  /**
   * Clears the holidays cache to force a refresh on the next request
   * This is useful after adding, updating, or deleting holidays
   */
  clearHolidaysCache(): void {
    this.holidaysCache = {};
  }

  /**
   * Updates an existing holiday
   * @param calendarId The ID of the calendar entry to update
   * @param holidayData The updated holiday data
   * @returns Observable with the updated holiday
   */
  updateHoliday(calendarId: string, holidayData: {
    organizationName: string;
    branchName: string;
    year: number;
    holidayDate: string;
    holidayName: string;
    holidayType: string;
    leaveDayType: 'Full Day' | 'Half Day' | 'full day' | 'half day';
    isOptional: boolean;
  }): Observable<Holiday> {
    const url = `${this.baseUrl}/updateHoliday/${calendarId}`;
    
    // Clear cache to ensure fresh data on next load
    this.clearHolidaysCache();
    
    return this.http.put<Holiday>(url, holidayData).pipe(
      tap(updatedHoliday => {
        console.log('Successfully updated holiday:', updatedHoliday);
      }),
      catchError(error => {
        console.error('Error updating holiday:', error);
        throw error; // Re-throw to allow component to handle the error
      })
    );
  }


}

/**
 * Utility function to map holidays to markedDaysByMonth structure
 * @param holidays Array of Holiday objects
 * @returns { [monthIndex: number]: { [day: number]: { type: 'full' | 'half', name: string } } }
 */
export function mapHolidaysToMarkedDays(holidays: Holiday[]): { [monthIndex: number]: { [day: number]: { type: 'full' | 'half', name: string } } } {
  const markedDaysByMonth: { [monthIndex: number]: { [day: number]: { type: 'full' | 'half', name: string } } } = {};
  holidays.forEach(holiday => {
    try {
      const date = new Date(holiday.holidayDate);
      if (isNaN(date.getTime())) return;
      const monthIndex = date.getMonth();
      const day = date.getDate();
      const leaveType = (holiday.leaveDayType || '').toLowerCase();
      const isHalf = leaveType.includes('half') || leaveType.includes('1/2') || leaveType.includes('partial') || leaveType.replace(/\s/g, '').includes('halfday');
      const type = isHalf ? 'half' : 'full';
      if (!markedDaysByMonth[monthIndex]) {
        markedDaysByMonth[monthIndex] = {};
      }
      markedDaysByMonth[monthIndex][day] = {
        type,
        name: holiday.holidayName || 'Holiday'
      };
    } catch (e) {
      // Ignore invalid dates
    }
  });
  return markedDaysByMonth;
}
