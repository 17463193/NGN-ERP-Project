import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CalendarDataService, Holiday } from '../../../services/calendar-data.service';
import { forkJoin } from 'rxjs';

interface BranchSummary {
  id: number;
  branch: string;
  totalDays: number;
  fullDayLeaves: number;
  halfDayLeaves: number;
  holidays: Holiday[];
}

@Component({
  selector: 'app-calendar-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './calendar-overview.component.html',
  styleUrls: ['./calendar-overview.component.scss'],
})
export class CalendarOverviewComponent implements OnInit {
  selectedYear = 2025;
  searchQuery = '';
  
  // Calendar data
  organizationList: string[] = [];
  branchList: string[] = [];
  selectedOrg: string = '';
  selectedBranch: string = '';
  
  // Calendar data with holiday information
  calendarData: BranchSummary[] = [];
  
  // Holiday modal state
  selectedHolidays: Holiday[] = [];



  constructor(
    private router: Router,
    private calendarDataService: CalendarDataService
  ) {}

  ngOnInit() {
    // Load organizations from API
    this.calendarDataService.getOrganizations().subscribe(orgs => {
      this.organizationList = orgs.map(org => org.name);
      
      if (this.organizationList.length > 0) {
        this.selectedOrg = this.organizationList[0];
      }
      
      // Load branches for the selected organization
      this.loadBranches();
    });
  }
  
  private loadBranches() {
    if (this.selectedOrg) {
      // Get holidays for the selected organization and year
      this.calendarDataService.getHolidays(this.selectedOrg, undefined, this.selectedYear).subscribe({
        next: (holidays) => {
          // Extract unique branch names from holidays
          const branchSet = new Set<string>();
          holidays.forEach(holiday => {
            if (holiday.branchName) {
              branchSet.add(holiday.branchName);
            }
          });
          this.branchList = Array.from(branchSet);
          this.updateCalendarDataFromBranches(holidays);
        },
        error: (error) => {
          console.error('Error loading holidays:', error);
          this.branchList = [];
          this.calendarData = [];
        }
      });
    } else {
      this.branchList = [];
      this.calendarData = [];
    }
  }
  
  // Organization change handler
  onOrgChange() {
    this.loadBranches();
  }

  // Year change handler
  onYearChange() {
    this.loadBranches();
  }

  // Calculate total days across all branches
  getTotalDays(): number {
    return this.calendarData.reduce((total, branch) => total + branch.totalDays, 0);
  }

  // Calculate total full days across all branches
  getTotalFullDays(): number {
    return this.calendarData.reduce((total, branch) => total + branch.fullDayLeaves, 0);
  }

  // Calculate total half days across all branches
  getTotalHalfDays(): number {
    return this.calendarData.reduce((total, branch) => total + branch.halfDayLeaves, 0);
  }
  
  private updateCalendarDataFromBranches(holidays: Holiday[] = []) {
    // Group holidays by branch
    const holidaysByBranch = holidays.reduce((acc, holiday) => {
      if (!holiday || !holiday.branchName) {
        return acc;
      }
      
      if (!acc[holiday.branchName]) {
        acc[holiday.branchName] = [];
      }
      
      // Ensure leaveDayType is properly set
      if (!holiday.leaveDayType) {
        holiday.leaveDayType = 'full day';
      }
      
      acc[holiday.branchName].push(holiday);
      return acc;
    }, {} as Record<string, Holiday[]>);

    // Transform branches into calendar data format with leave summary
    this.calendarData = this.branchList.map((branch, index) => {
      const branchHolidays = (holidaysByBranch[branch] || [])
        .filter(holiday => holiday && holiday.holidayDate) // Filter out any invalid holidays
        .sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime());
      
      // Calculate leave summary
      const summary = branchHolidays.reduce((acc, holiday) => {
        if (!holiday.leaveDayType) {
          console.warn('Holiday missing leaveDayType, defaulting to full day:', holiday);
          holiday.leaveDayType = 'full day';
        }
        
        const leaveType = String(holiday.leaveDayType).toLowerCase().trim();
        
        if (leaveType.includes('full') || leaveType === 'fullday' || leaveType === 'full day') {
          acc.fullDayLeaves += 1;
        } else if (leaveType.includes('half') || leaveType === 'halfday' || leaveType === 'half day') {
          acc.halfDayLeaves += 0.5;
        } else {
          // Default to full day if leaveDayType is set but doesn't match expected values
          acc.fullDayLeaves += 1;
        }
        return acc;
      }, { fullDayLeaves: 0, halfDayLeaves: 0 });
      
      const totalDays = summary.fullDayLeaves + summary.halfDayLeaves;
      
      return {
        id: index + 1,
        branch,
        fullDayLeaves: summary.fullDayLeaves,
        halfDayLeaves: summary.halfDayLeaves,
        totalDays: totalDays,
        holidays: branchHolidays
      };
    });
  }
  
  private getDaysInYear(year: number): number {
    return ((year % 4 === 0 && year % 100 > 0) || year % 400 === 0) ? 366 : 365;
  }

  // Get branch summary data for the table
  get holidayRows() {
  // Return empty array if calendarData is empty (no data from API)
  if (!this.calendarData.length) {
    return [];
  }
  
  return this.calendarData.map(entry => {
    // Try to find the branch ID from the first holiday (if available)
    const firstHoliday = entry.holidays && entry.holidays.length > 0 ? entry.holidays[0] : null;
    const branchId = firstHoliday?.branchId || entry.branch; // Fall back to branch name if ID not available
    
    return {
      id: entry.id,
      branch: entry.branch,
      branchId: branchId, // Include branch ID for navigation
      totalDays: entry.totalDays,
      fullDayLeaves: entry.fullDayLeaves,
      halfDayLeaves: entry.halfDayLeaves,
      branchData: {
        ...entry,
        branchId: branchId // Also include in branchData for backward compatibility
      }
    };
  });
}

  
  // Navigate to calendar details view for a specific branch
  viewHolidays(entry: { branch: string; holidays: Holiday[]; branchId?: string; id?: number }) {
    if (!entry) return;
    
    // Use branch ID if available, otherwise fall back to branch name
    const branchIdentifier = entry.branchId || encodeURIComponent(entry.branch);
    
    if (entry.id && branchIdentifier) {
      this.router.navigate(['/calendar', 'details', entry.id, branchIdentifier, this.selectedYear]);
    }
  }
  
  // Close the holiday modal
  closeHolidayModal() {
    this.selectedHolidays = [];
  }
  

  

}
