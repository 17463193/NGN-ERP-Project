import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CalendarDataService } from '../../../services/calendar-data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mapHolidaysToMarkedDays } from '../../../services/calendar-data.service';
import { EventModalComponent } from '../event-modal/event-modal.component';
import Swal from 'sweetalert2';
import { Holiday } from '../../../services/calendar-data.service';

@Component({
  selector: 'app-calendar-details',
  standalone: true,
  imports: [CommonModule, FormsModule, EventModalComponent],
  templateUrl: './calendar-details.component.html',
  styleUrls: ['./calendar-details.component.scss']
})
export class CalendarDetailsComponent implements OnInit {
  organizationList: { id: string; name: string }[] = [];
  branchList: { id: string; name: string }[] = [];
  yearList = [2024, 2025, 2026, 2027];
  loading = true;
  isEditMode = false;
  originalHolidays: Holiday[] = [];
  modifiedHolidays: {[key: string]: {type: 'full' | 'half', name: string, holidayType?: string, isOptional?: boolean}} = {};

  @ViewChild(EventModalComponent) eventModal!: EventModalComponent;
  
  selectedOrg = '';
  selectedBranchId: string = '';
  selectedBranchName: string = '';
  selectedYear: number = new Date().getFullYear();
  
  // Modal properties
  showEventModal = false;
  showEditModal = false;
  modalMonth = '';
  modalMonthIndex = 0;
  modalYear: number = 2025;
  selectedDate: Date | null = null;
  isDeleteMode: boolean = false;
  editHolidayData: {
    organizationName: string;
    branchName: string;
    year: number;
    holidayDate: string;
    holidayName: string;
    holidayType: string;
    leaveDayType: 'Full Day' | 'Half Day';
    isOptional: boolean;
    date: Date;
    calendarId?: string;
  } = this.getDefaultHolidayData();

  months = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];
  daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  markedDaysByMonth: { [monthIndex: number]: { [day: number]: { 
    type: 'full' | 'half', 
    name: string, 
    holidayType?: string, 
    isOptional?: boolean 
  } } } = {};

  constructor(
    private calendarDataService: CalendarDataService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadOrganizations();
  }

  private async loadHolidays() {
    if (!this.selectedBranchId) {
      this.loading = false;
      return;
    }
    
    this.loading = true;
    try {
      const holidays = await this.calendarDataService.getHolidaysByBranchId(this.selectedBranchId, this.selectedYear).toPromise();
      this.originalHolidays = [...holidays];
      this.markedDaysByMonth = this.mapHolidaysToMarkedDays(holidays);
      this.loading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching holidays:', error);
      this.loading = false;
    }
  }

  private mapHolidaysToMarkedDays(holidays: Holiday[]): { [monthIndex: number]: { [day: number]: any } } {
    const markedDays: { [monthIndex: number]: { [day: number]: any } } = {};
    
    holidays.forEach(holiday => {
      const date = new Date(holiday.holidayDate);
      const monthIndex = date.getMonth();
      const day = date.getDate();
      
      if (!markedDays[monthIndex]) {
        markedDays[monthIndex] = {};
      }
      
      markedDays[monthIndex][day] = {
        type: holiday.leaveDayType?.toLowerCase().includes('half') ? 'half' : 'full',
        name: holiday.holidayName,
        holidayType: holiday.holidayType,
        isOptional: holiday.isOptional
      };
    });
    
    return markedDays;
  }

  private loadOrganizations() {
    this.loading = true;
    this.calendarDataService.getOrganizations().subscribe({
      next: (orgs) => {
        this.organizationList = orgs;
        if (this.organizationList.length > 0) {
          this.selectedOrg = this.organizationList[0].id;
          this.loadBranches();
        } else {
          console.warn('No organizations found');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.loading = false;
      }
    });
  }

  private loadBranches() {
    this.loading = true;
    
    this.calendarDataService.getBranches().subscribe({
      next: (branches) => {
        this.branchList = branches.map(branch => ({
          id: branch.id,
          name: branch.name
        }));
        
        this.processRouteParams();
      },
      error: (error) => {
        console.error('Error loading branches:', error);
        this.loading = false;
      }
    });
  }
  
  private processRouteParams() {
    this.route.params.subscribe(params => {
      if (params['year']) {
        this.selectedYear = +params['year'];
      }
      const branchIdentifier = params['branchId'] || params['branch'];
      if (branchIdentifier) {
        let branch = this.branchList.find(b => b.id === branchIdentifier);
        if (!branch) {
          const branchName = decodeURIComponent(branchIdentifier);
          branch = this.branchList.find(b => b.name === branchName);
        }
        if (branch) {
          this.selectedBranchId = branch.id;
          this.selectedBranchName = branch.name;
          this.fetchMarkedDates();
        } else if (this.branchList.length > 0) {
          this.selectedBranchId = this.branchList[0].id;
          this.selectedBranchName = this.branchList[0].name;
          this.fetchMarkedDates();
        }
      } else if (this.branchList.length > 0) {
        this.selectedBranchId = this.branchList[0].id;
        this.selectedBranchName = this.branchList[0].name;
        this.fetchMarkedDates();
      } else {
        this.loading = false;
      }
    });
  }

  async fetchMarkedDates(): Promise<void> {
    if (!this.selectedBranchId) {
      console.warn('No branch selected, cannot fetch holidays');
      this.loading = false;
      return;
    }
    
    this.loading = true;
    
    try {
      const holidays = await this.calendarDataService.getHolidaysByBranchId(this.selectedBranchId, this.selectedYear).toPromise();
      this.originalHolidays = [...holidays];
      this.markedDaysByMonth = this.mapHolidaysToMarkedDays(holidays);
      this.loading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching holidays:', error);
      this.loading = false;
    }
  }

  getDayType(monthIndex: number, day: number): string {
    // First check if this date has been modified
    const dateKey = this.getDateKey(monthIndex, day);
    if (this.modifiedHolidays[dateKey]) {
      return this.modifiedHolidays[dateKey].type || '';
    }
    
    // Then check if it's in the marked days
    const markedDay = this.markedDaysByMonth[monthIndex]?.[day];
    if (markedDay) {
      // Ensure we return a valid type or empty string
      return markedDay.type === 'half' ? 'half' : 
             markedDay.type === 'full' ? 'full' : 
             '';
    }
    
    // Default to empty string for unmarked days
    return '';
  }
  
  private getDateKey(monthIndex: number, day: number): string {
    const date = new Date(this.selectedYear, monthIndex, day);
    return date.toISOString().split('T')[0];
  }
  
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode) {
      this.modifiedHolidays = {};
    }
    this.cdr.detectChanges();
  }
  
  openEventModal() {
    this.modalYear = this.selectedYear;
    this.modalMonthIndex = new Date().getMonth();
    this.modalMonth = this.months[this.modalMonthIndex];
    this.showEventModal = true;
  }

  // Get marked days for the event modal
  getMarkedDaysForModal() {
    return this.markedDaysByMonth[this.modalMonthIndex] || {};
  }
  
  onDayClick(monthIndex: number, day: number, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.isEditMode) return;
    
    const date = new Date(this.selectedYear, monthIndex, day);
    const dateKey = this.getDateKey(monthIndex, day);
    
    const isHoliday = this.markedDaysByMonth[monthIndex] && this.markedDaysByMonth[monthIndex][day];
    
    if (isHoliday) {
      this.openEditModalForHoliday(monthIndex, day, date);
    } else {
      this.openEventModalForDate(date);
    }
  }
  
  openEditModalForHoliday(monthIndex: number, day: number, date: Date) {
    const holiday = this.markedDaysByMonth[monthIndex]?.[day];
    
    if (holiday) {
      let holidayDate = date;
      const dateKey = this.getDateKey(monthIndex, day);
      
      const originalHoliday = this.originalHolidays.find(h => {
        const hDate = new Date(h.holidayDate);
        return hDate.getMonth() === monthIndex && hDate.getDate() === day && 
               hDate.getFullYear() === this.selectedYear;
      });
      
      if (originalHoliday) {
        holidayDate = new Date(originalHoliday.holidayDate);
      }
      
      this.editHolidayData = {
        ...this.getDefaultHolidayData(),
        branchName: this.selectedBranchName,
        year: this.selectedYear,
        holidayDate: holidayDate.toISOString().split('T')[0],
        holidayName: holiday.name || '',
        holidayType: holiday.holidayType || 'Public',
        leaveDayType: holiday.type === 'half' ? 'Half Day' : 'Full Day',
        isOptional: holiday.isOptional || false,
        date: holidayDate,
        calendarId: originalHoliday?.calendarId
      };
      
      this.isDeleteMode = false;
      this.showEditModal = true;
    }
  }

  closeEditModal() {
    this.showEditModal = false;
    this.cdr.detectChanges();
  }
  
  private updateMarkedDays() {
    const newMarkedDays: { [monthIndex: number]: { [day: number]: any } } = {};
    
    this.originalHolidays.forEach(holiday => {
      const date = new Date(holiday.holidayDate);
      const monthIndex = date.getMonth();
      const day = date.getDate();
      const dateKey = this.getDateKey(monthIndex, day);
      
      if (!this.modifiedHolidays[dateKey]) {
        if (!newMarkedDays[monthIndex]) {
          newMarkedDays[monthIndex] = {};
        }
        newMarkedDays[monthIndex][day] = {
          type: holiday.leaveDayType === 'half day' ? 'half' : 'full',
          name: holiday.holidayName,
          holidayType: holiday.holidayType,
          isOptional: holiday.isOptional
        };
      }
    });
    
    Object.entries(this.modifiedHolidays).forEach(([dateKey, holiday]) => {
      const date = new Date(dateKey);
      const monthIndex = date.getMonth();
      const day = date.getDate();
      
      if (!newMarkedDays[monthIndex]) {
        newMarkedDays[monthIndex] = {};
      }
      
      newMarkedDays[monthIndex][day] = {
        type: holiday.type,
        name: holiday.name,
        holidayType: holiday.holidayType,
        isOptional: holiday.isOptional
      };
    });
    
    this.markedDaysByMonth = newMarkedDays;
    this.cdr.detectChanges();
  }

  async handleEditModalSave() {
    if (!this.editHolidayData.holidayName || !this.editHolidayData.holidayDate) {
      Swal.fire('Error', 'Please fill in all required fields.', 'error');
      return;
    }
    
    let normalizedLeaveDayType = this.editHolidayData.leaveDayType?.toLowerCase().includes('half') ? 'Half Day' : 'Full Day';
    
    const updateBody: any = {
      organizationName: this.getSelectedOrgName(),
      branchName: this.editHolidayData.branchName,
      year: this.editHolidayData.year,
      holidayDate: this.editHolidayData.holidayDate,
      holidayName: this.editHolidayData.holidayName,
      holidayType: this.editHolidayData.holidayType,
      leaveDayType: normalizedLeaveDayType,
      isOptional: this.editHolidayData.isOptional || false
    };

    try {
      if (this.isDeleteMode) {
        if (this.editHolidayData?.calendarId) {
          await this.calendarDataService.deleteHoliday(this.editHolidayData.calendarId).toPromise();
          this.calendarDataService.clearHolidaysCache();
          
          // Remove from original holidays
          this.originalHolidays = this.originalHolidays.filter(h => h.calendarId !== this.editHolidayData?.calendarId);
          
          // Remove from marked days
          const date = new Date(this.editHolidayData.holidayDate);
          const monthIndex = date.getMonth();
          const day = date.getDate();
          if (this.markedDaysByMonth[monthIndex] && this.markedDaysByMonth[monthIndex][day]) {
            delete this.markedDaysByMonth[monthIndex][day];
          }
          
          Swal.fire('Deleted', 'Holiday deleted successfully!', 'success');
        }
      } else {
        if (this.editHolidayData?.calendarId) {
          // Update existing holiday
          const updatedHoliday = await this.calendarDataService.updateHoliday(this.editHolidayData.calendarId, updateBody).toPromise();
          this.calendarDataService.clearHolidaysCache();
          
          // Update the original holidays array
          const index = this.originalHolidays.findIndex(h => h.calendarId === this.editHolidayData?.calendarId);
          if (index !== -1) {
            this.originalHolidays[index] = { ...this.originalHolidays[index], ...updateBody };
          }
          
          // Update marked days immediately
          const date = new Date(this.editHolidayData.holidayDate);
          const monthIndex = date.getMonth();
          const day = date.getDate();
          
          if (!this.markedDaysByMonth[monthIndex]) {
            this.markedDaysByMonth[monthIndex] = {};
          }
          
          this.markedDaysByMonth[monthIndex][day] = {
            type: normalizedLeaveDayType === 'Half Day' ? 'half' : 'full',
            name: this.editHolidayData.holidayName,
            holidayType: this.editHolidayData.holidayType,
            isOptional: this.editHolidayData.isOptional
          };
          
          Swal.fire('Success', 'Holiday updated successfully!', 'success');
        } else {
          // Create new holiday
          const createdHoliday = await this.calendarDataService.insertLeaveCalendar([updateBody]).toPromise();
          this.calendarDataService.clearHolidaysCache();
          
          // Add to original holidays
          this.originalHolidays.push({
            ...updateBody,
            calendarId: createdHoliday.calendarId,
            branchId: this.selectedBranchId
          });
          
          // Update marked days immediately
          const date = new Date(this.editHolidayData.holidayDate);
          const monthIndex = date.getMonth();
          const day = date.getDate();
          
          if (!this.markedDaysByMonth[monthIndex]) {
            this.markedDaysByMonth[monthIndex] = {};
          }
          
          this.markedDaysByMonth[monthIndex][day] = {
            type: normalizedLeaveDayType === 'Half Day' ? 'half' : 'full',
            name: this.editHolidayData.holidayName,
            holidayType: this.editHolidayData.holidayType,
            isOptional: this.editHolidayData.isOptional
          };
          
          Swal.fire('Success', 'Holiday added successfully!', 'success');
        }
      }
      
      this.closeEditModal();
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('Error saving holiday:', error);
      Swal.fire('Error', 'Failed to save holiday. Please try again.', 'error');
    }
  }

  openEventModalForDate(date: Date) {
    this.modalYear = date.getFullYear();
    this.modalMonthIndex = date.getMonth();
    this.modalMonth = this.months[this.modalMonthIndex];
    this.selectedDate = date;
    this.showEventModal = true;
  }
  
  onCancelEvents() {
    this.showEventModal = false;
  }
  
  async onModalSave(events: any[]) {
    if (!events || events.length === 0) {
      this.showEventModal = false;
      return;
    }
    
    const event = events[0];
    if (!event || !event.date) {
      this.showEventModal = false;
      return;
    }
    
    // Close the modal immediately to prevent any race conditions
    this.showEventModal = false;
    
    try {
      const date = new Date(event.date);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      const monthIndex = date.getMonth();
      const day = date.getDate();
      const dateKey = this.getDateKey(monthIndex, day);
      
      // Create the holiday data object with proper type casting
      const holidayData = {
        organizationName: this.getSelectedOrgName(),
        branchName: this.selectedBranchName,
        year: this.selectedYear,
        holidayDate: date.toISOString().split('T')[0],
        holidayName: event.holidayName || 'Holiday',
        holidayType: event.holidayType || 'Public',
        leaveDayType: (event.leaveDayType === 'half day' ? 'Half Day' : 'Full Day'),
        isOptional: event.isOptional || false,
        branchId: this.selectedBranchId
      } as Holiday;
      
      // Show loading state
      let loadingSwal: any;
      try {
        loadingSwal = await Swal.fire({
          title: 'Saving...',
          text: 'Please wait',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        let response: any;
        
        if (event.calendarId) {
          // Update existing holiday
          response = await this.calendarDataService.updateHoliday(event.calendarId, holidayData).toPromise();
          
          // Update the local state by refreshing from the server
          await this.fetchMarkedDates();
          
          // Clear the modified holidays for this date
          if (this.modifiedHolidays[dateKey]) {
            const { [dateKey]: _, ...newModifiedHolidays } = this.modifiedHolidays;
            this.modifiedHolidays = newModifiedHolidays;
          }
          
          // Force update the UI
          this.updateMarkedDays();
          this.cdr.detectChanges();
          
          // Close loading dialog and show success message
          Swal.close();
          await Swal.fire({
            title: 'Success!',
            text: 'Holiday updated successfully!',
            icon: 'success',
            confirmButtonText: 'OK'
          });
        } else {
          // Create new holiday
          response = await this.calendarDataService.insertLeaveCalendar([holidayData]).toPromise();
          
          // Clear the modified holidays for this date
          if (this.modifiedHolidays[dateKey]) {
            const { [dateKey]: _, ...newModifiedHolidays } = this.modifiedHolidays;
            this.modifiedHolidays = newModifiedHolidays;
          }
          
          // Refresh all data for new holiday
          await this.fetchMarkedDates();
          
          // Close loading dialog and show success message
          Swal.close();
          await Swal.fire({
            title: 'Success!',
            text: 'Holiday created successfully!',
            icon: 'success',
            confirmButtonText: 'OK'
          });
        }
        
        // Force change detection
        this.cdr.detectChanges();
        
      } catch (error) {
        // Close any open dialogs
        Swal.close();
        
        console.error('Error saving holiday:', error);
        await Swal.fire({
          title: 'Error',
          text: 'Failed to save holiday. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
      
    } catch (error) {
      console.error('Error in onModalSave:', error);
      await Swal.fire({
        title: 'Error',
        text: 'An unexpected error occurred. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
  
  saveChanges() {
    if (Object.keys(this.modifiedHolidays).length === 0) {
      this.isEditMode = false;
      return;
    }
    
    const holidaysToSave = Object.entries(this.modifiedHolidays).map(([dateStr, holiday]) => {
      const date = new Date(dateStr);
      const formattedDate = date.toISOString().split('T')[0];
      
      return {
        organizationName: this.getSelectedOrgName(),
        branchName: this.selectedBranchName,
        year: this.selectedYear,
        holidayDate: formattedDate,
        holidayName: holiday.name,
        holidayType: holiday.holidayType || 'Public',
        leaveDayType: holiday.type === 'half' ? 'Half Day' : 'Full Day',
        isOptional: holiday.isOptional || false
      };
    });
    
    // Update local state
    Object.entries(this.modifiedHolidays).forEach(([dateStr, holiday]) => {
      const date = new Date(dateStr);
      const monthIndex = date.getMonth();
      const day = date.getDate();
      
      if (!this.markedDaysByMonth[monthIndex]) {
        this.markedDaysByMonth[monthIndex] = {};
      }
      
      if (holiday.type === 'full' || holiday.type === 'half') {
        this.markedDaysByMonth[monthIndex][day] = {
          type: holiday.type,
          name: holiday.name,
          holidayType: holiday.holidayType,
          isOptional: holiday.isOptional
        };
      } else {
        delete this.markedDaysByMonth[monthIndex][day];
      }
    });
    
    this.modifiedHolidays = {};
    this.isEditMode = false;
    this.showEventModal = false;
    this.cdr.detectChanges();
    
    Swal.fire({
      title: 'Success!',
      text: 'Calendar updated successfully',
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }
  
  cancelEdit() {
    this.modifiedHolidays = {};
    this.isEditMode = false;
    this.cdr.detectChanges();
  }

  getSelectedOrgName(): string {
    const org = this.organizationList.find(org => org.id === this.selectedOrg);
    return org ? org.name : 'N/A';
  }

  private updateLocalHoliday(holidayData: any) {
    const dateParts = holidayData.holidayDate.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    
    const newDate = new Date(year, month, day);
    const dateKey = this.getDateKey(month, day);
    
    this.modifiedHolidays[dateKey] = {
      type: holidayData.leaveDayType.toLowerCase().includes('half') ? 'half' : 'full',
      name: holidayData.holidayName,
      holidayType: holidayData.holidayType,
      isOptional: holidayData.isOptional || false
    };
    
    this.updateMarkedDays();
  }

  private getDefaultHolidayData(): {
    organizationName: string;
    branchName: string;
    year: number;
    holidayDate: string;
    holidayName: string;
    holidayType: string;
    leaveDayType: 'Full Day' | 'Half Day';
    isOptional: boolean;
    date: Date;
    calendarId?: string;
  } {
    return {
      organizationName: '',
      branchName: '',
      year: new Date().getFullYear(),
      holidayDate: '',
      holidayName: '',
      holidayType: 'Public',
      leaveDayType: 'Full Day',
      isOptional: false,
      date: new Date(),
      calendarId: undefined
    };
  }

  getFirstHalfHolidayDays(monthIndex: number): number[] {
    if (!this.markedDaysByMonth[monthIndex]) return [];
    
    return Object.keys(this.markedDaysByMonth[monthIndex])
      .map(day => parseInt(day))
      .filter(day => day >= 1 && day <= 15)
      .sort((a, b) => a - b);
  }

  getSecondHalfHolidayDays(monthIndex: number): number[] {
    if (!this.markedDaysByMonth[monthIndex]) return [];
    
    return Object.keys(this.markedDaysByMonth[monthIndex])
      .map(day => parseInt(day))
      .filter(day => day >= 16)
      .sort((a, b) => a - b);
  }

  getCalendarDays(monthIndex: number): number[] {
    const daysInMonth = new Date(this.selectedYear, monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  getStartDayOfMonth(monthIndex: number): number {
    return new Date(this.selectedYear, monthIndex, 1).getDay();
  }
}