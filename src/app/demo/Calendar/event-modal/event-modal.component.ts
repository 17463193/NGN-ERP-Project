import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

export interface CalendarEvent {
  date: Date;
  holidayName: string;
  holidayType: string;
  leaveDayType: string;
  isOptional: boolean;
  // Additional fields from the required structure
  organizationName?: string;
  branchName?: string;
  year?: number;
  holidayDate?: string;
  // For backward compatibility
  text?: string;
  type?: 'full' | 'half';
  // Mark if this is an existing holiday
  isExisting?: boolean;
}

@Component({
  selector: 'app-event-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-modal.component.html',
  styleUrls: ['./event-modal.component.scss']
})
export class EventModalComponent implements OnChanges {

  @Input() visible = false;
  @Input() month: string = '';
  @Input() year: number = 2025;
  @Input() eventText: string = 'Event'; // Default event text
  @Input() eventType: 'full' | 'half' = 'full'; // Default to full day
  @Input() organizationName: string = '';
  @Input() branchName: string = '';
  @Input() set markedDays(value: { [day: number]: { type: 'full' | 'half', name: string, holidayType?: string, isOptional?: boolean } }) {
    const newValue = value || {};
    const currentKeys = Object.keys(this._markedDays).sort().join(',');
    const newKeys = Object.keys(newValue).sort().join(',');
    
    // Always update the internal state
    this._markedDays = { ...newValue };
    
    // Only trigger update if the values have actually changed
    if (currentKeys !== newKeys) {
      this.initializeSelectedDays();
    }
  }
  get markedDays() { return this._markedDays; }
  private _markedDays: { [day: number]: { type: 'full' | 'half', name: string, holidayType?: string, isOptional?: boolean } } = {};
  @Input() loading = false; // Add loading state
  @Input() set initialDate(date: Date | null) {
    if (date) {
      this._initialDate = new Date(date);
      if (this.visible) {
        this.navigateToDate(this._initialDate);
      }
    }
  }
  private _initialDate: Date | null = null;

  @Output() save = new EventEmitter<{events: CalendarEvent[], monthIndex: number, year: number}>();
  @Output() cancel = new EventEmitter<void>();
  @Output() monthChanged = new EventEmitter<{monthIndex: number, year: number}>();
  
  showSuccess = false;

  daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  calendarDays: number[] = [];
  startDay: number = 0;
  selectedDays: { [key: string]: CalendarEvent } = {}; // key: 'YYYY-MM-DD'
  lastClickedDay: number | null = null;

  currentMonthIndex: number = 0;
  currentYear: number = new Date().getFullYear();
  events: CalendarEvent[] = [];

  // Drag selection properties
  isDragging = false;
  dragStartDay: number | null = null;
  dragEndDay: number | null = null;
  dragDirection: 'forward' | 'backward' | null = null;
  
  // Track the last drag selection to implement toggle behavior
  lastDragSelection: { [key: string]: boolean } = {}; // Track which days were selected in last drag
  currentDragSelection: { [key: string]: boolean } = {}; // Track current drag selection

  // Make getDateKey public for template
  getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  isFullDay(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonthIndex, day);
    const key = this.getDateKey(date);
    // Check both markedDays and selectedDays for consistency
    const markedDay = this.markedDays[day];
    const selectedDay = this.selectedDays[key];
    
    if (selectedDay) {
      return selectedDay.leaveDayType === 'full day';
    }
    return markedDay ? markedDay.type === 'full' : false;
  }

  isHalfDay(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonthIndex, day);
    const key = this.getDateKey(date);
    // Check both markedDays and selectedDays for consistency
    const markedDay = this.markedDays[day];
    const selectedDay = this.selectedDays[key];
    
    if (selectedDay) {
      return selectedDay.leaveDayType === 'half day';
    }
    return markedDay ? markedDay.type === 'half' : false;
  }
  
  isDaySelected(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonthIndex, day);
    const key = this.getDateKey(date);
    // A day is selected if it's in either selectedDays or markedDays
    return !!this.selectedDays[key] || !!this.markedDays[day];
  }

  isExistingHoliday(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonthIndex, day);
    const key = this.getDateKey(date);
    const selectedDay = this.selectedDays[key];
    return selectedDay ? selectedDay.isExisting : false;
  }

  isOtherMonth(day: number): boolean {
    return day > 20 && day < 28 && this.calendarDays[this.calendarDays.length - 1] < day;
  }

  // Check if day is in drag selection range
  isDayInDragRange(day: number): boolean {
    if (!this.isDragging || this.dragStartDay === null || this.dragEndDay === null) {
      return false;
    }
    
    const start = Math.min(this.dragStartDay, this.dragEndDay);
    const end = Math.max(this.dragStartDay, this.dragEndDay);
    
    return day >= start && day <= end;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['month'] || changes['year']) {
      // Update current month and year
      const prevMonthIndex = this.currentMonthIndex;
      const prevYear = this.currentYear;
      
      this.currentMonthIndex = this.getMonthIndex(this.month);
      this.currentYear = this.year;
      
      // Update the calendar view
      this.updateCalendar();
    }
    
    // Handle initial date when modal becomes visible
    if (changes['visible'] && this.visible && this._initialDate) {
      this.navigateToDate(this._initialDate);
    }
    
    // Handle markedDays changes (initial load)
    if (changes['markedDays'] && this.markedDays && !this.loading) {
      this.initializeSelectedDays();
    }
  }

  private initializeSelectedDays() {
    const updatedSelectedDays = {};
    
    // First, process all marked days from the input (existing holidays)
    Object.entries(this._markedDays).forEach(([day, obj]) => {
      const dayNum = parseInt(day, 10);
      if (!isNaN(dayNum)) {
        // Create date object for the marked day
        const date = new Date(this.currentYear, this.currentMonthIndex, dayNum);
        const dateKey = this.getDateKey(date);
        
        // Create or update the event with values from markedDays
        updatedSelectedDays[dateKey] = {
          date,
          holidayName: obj.name || '',
          holidayType: obj.holidayType || 'Public',
          leaveDayType: obj.type === 'half' ? 'half day' : 'full day',
          isOptional: obj.isOptional || false,
          type: obj.type,
          text: obj.name || '',
          // Mark as existing holiday
          isExisting: true
        };
      }
    });
    
    // Preserve any existing selected days that aren't in the marked days
    Object.entries(this.selectedDays).forEach(([dateKey, event]) => {
      if (!updatedSelectedDays[dateKey]) {
        updatedSelectedDays[dateKey] = event;
      }
    });
    
    // Update the component state
    this.selectedDays = updatedSelectedDays;
    this.events = Object.values(updatedSelectedDays);
    
    // Update the calendar view
    this.updateCalendar();
  }
  
  private updateMarkedDays() {
    // This method is now just an alias for initializeSelectedDays for backward compatibility
    this.initializeSelectedDays();
  }

  // Reset form to initial state
  private resetForm() {
    this.events = [];
    this.selectedDays = {};
    this.lastClickedDay = null;
  }

  updateCalendar() {
    if (this.month && this.year) {
      const daysInMonth = new Date(this.currentYear, this.currentMonthIndex + 1, 0).getDate();
      const firstDayOfMonth = new Date(this.currentYear, this.currentMonthIndex, 1).getDay();
      
      // Adjust for Sunday as last day of week
      this.startDay = firstDayOfMonth === 0 ? 7 : firstDayOfMonth;
      
      // Generate days array with empty slots for days before the 1st
      this.calendarDays = [
        ...Array(this.startDay - 1).fill(0), // Empty days before 1st
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
      ];
      
      // Filter events to show only those in the current month and year
      this.events = Object.values(this.selectedDays).filter(event => {
        return event.date.getMonth() === this.currentMonthIndex && 
               event.date.getFullYear() === this.currentYear;
      });
    }
  }

  getMonthIndex(month: string): number {
    return [
      'January', 'February', 'March', 'April',
      'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'
    ].indexOf(month);
  }

  private isSelecting = false;
  
  // Mouse event handlers for drag selection
  onMouseDown(day: number, event: MouseEvent) {
    if (day === 0) return; // Ignore clicks on empty days
    
    this.isDragging = true;
    this.dragStartDay = day;
    this.dragEndDay = day;
    this.dragDirection = null;
    
    // Clear current drag selection tracking
    this.currentDragSelection = {};
    
    // Add the initial day to drag selection tracking
    const date = new Date(this.currentYear, this.currentMonthIndex, day);
    const dateKey = this.getDateKey(date);
    this.currentDragSelection[dateKey] = true;
    
    // Select the initial day directly without calling selectDay
    if (!this.selectedDays[dateKey]) {
      const newEvent: CalendarEvent = {
        date,
        holidayName: `Holiday ${date.getDate()}/${date.getMonth() + 1}`,
        holidayType: 'Public',
        leaveDayType: 'full day',
        isOptional: false,
        text: `Holiday ${date.getDate()}/${date.getMonth() + 1}`,
        type: 'full' as const
      };
      this.selectedDays[dateKey] = newEvent;
      
      // Only add to events if it's for the current month
      if (date.getMonth() === this.currentMonthIndex && 
          date.getFullYear() === this.currentYear) {
        this.events = [...this.events, newEvent];
      }
    }
    
    this.lastClickedDay = day;
    event.preventDefault();
  }

  onMouseEnter(day: number) {
    if (this.isDragging && day !== 0 && this.dragStartDay !== null) {
      this.dragEndDay = day;
      
      // Determine drag direction
      if (this.dragEndDay > this.dragStartDay) {
        this.dragDirection = 'forward';
      } else if (this.dragEndDay < this.dragStartDay) {
        this.dragDirection = 'backward';
      }
      
      // Select all days in the range
      this.selectRange(this.dragStartDay, this.dragEndDay);
    }
  }

  onMouseUp() {
    if (this.isDragging) {
      // Check if this drag selection matches the last one
      const currentSelectionKeys = Object.keys(this.currentDragSelection).sort().join(',');
      const lastSelectionKeys = Object.keys(this.lastDragSelection).sort().join(',');
      
      console.log('Current selection:', currentSelectionKeys);
      console.log('Last selection:', lastSelectionKeys);
      console.log('Current drag selection:', this.currentDragSelection);
      
      if (currentSelectionKeys === lastSelectionKeys && currentSelectionKeys !== '') {
        // Same selection as last time - toggle the leave day type
        console.log('Toggling selection:', currentSelectionKeys);
        this.toggleLeaveDayTypeForSelection();
      }
      
      // Update last drag selection
      this.lastDragSelection = { ...this.currentDragSelection };
    }
    
    this.isDragging = false;
    this.dragStartDay = null;
    this.dragEndDay = null;
    this.dragDirection = null;
    this.currentDragSelection = {};
  }

  // Global mouse up listener
  @HostListener('document:mouseup')
  onGlobalMouseUp() {
    this.onMouseUp();
  }

  // Toggle leave day type for the current drag selection
  private toggleLeaveDayTypeForSelection() {
    const selectedKeys = Object.keys(this.currentDragSelection);
    
    console.log('Toggling for keys:', selectedKeys);
    
    selectedKeys.forEach(dateKey => {
      console.log('Checking key:', dateKey, 'exists:', !!this.selectedDays[dateKey]);
      if (this.selectedDays[dateKey]) {
        const currentEvent = this.selectedDays[dateKey];
        console.log('Before toggle:', currentEvent.leaveDayType);
        // Toggle between full day and half day
        if (currentEvent.leaveDayType === 'full day') {
          currentEvent.leaveDayType = 'half day';
          currentEvent.type = 'half';
        } else {
          currentEvent.leaveDayType = 'full day';
          currentEvent.type = 'full';
        }
        console.log('After toggle:', currentEvent.leaveDayType);
      }
    });
  }

  // Select a range of days
  private selectRange(startDay: number, endDay: number) {
    const start = Math.min(startDay, endDay);
    const end = Math.max(startDay, endDay);
    
    // Don't clear currentDragSelection - preserve the initial day
    // this.currentDragSelection = {};
    
    for (let day = start; day <= end; day++) {
      const date = new Date(this.currentYear, this.currentMonthIndex, day);
      const dateKey = this.getDateKey(date);
      
      // Track this day in current drag selection
      this.currentDragSelection[dateKey] = true;
      
      // Only add if not already selected
      if (!this.selectedDays[dateKey]) {
        const newEvent: CalendarEvent = {
          date,
          holidayName: `Holiday ${date.getDate()}/${date.getMonth() + 1}`,
          holidayType: 'Public',
          leaveDayType: 'full day',
          isOptional: false,
          text: `Holiday ${date.getDate()}/${date.getMonth() + 1}`,
          type: 'full' as const
        };
        this.selectedDays[dateKey] = newEvent;
      }
    }
    
    // Update events array
    this.events = Object.values(this.selectedDays).filter(event => {
      return event.date.getMonth() === this.currentMonthIndex && 
             event.date.getFullYear() === this.currentYear;
    });
  }
  
  selectDay(day: number) {
    if (day === 0) return; // Ignore clicks on empty days
    
    this.isSelecting = true;
    
    try {
      const date = new Date(this.currentYear, this.currentMonthIndex, day);
      const dateKey = this.getDateKey(date);
      
      if (this.selectedDays[dateKey]) {
        // Toggle between full day and half day
        const currentEvent = this.selectedDays[dateKey];
        if (currentEvent.leaveDayType === 'full day') {
          // Change to half day
          currentEvent.leaveDayType = 'half day';
          currentEvent.type = 'half';
        } else {
          // Change back to full day
          currentEvent.leaveDayType = 'full day';
          currentEvent.type = 'full';
        }
      } else {
        // Add new event with default holiday data
        const newEvent: CalendarEvent = {
          date,
          holidayName: `Holiday ${date.getDate()}/${date.getMonth() + 1}`,
          holidayType: 'Public',
          leaveDayType: 'full day',
          isOptional: false,
          // For backward compatibility
          text: `Holiday ${date.getDate()}/${date.getMonth() + 1}`,
          type: 'full' as const
        };
        this.selectedDays[dateKey] = newEvent;
        
        // Only add to events if it's for the current month
        if (date.getMonth() === this.currentMonthIndex && 
            date.getFullYear() === this.currentYear) {
          this.events = [...this.events, newEvent];
        }
      }
      
      this.lastClickedDay = day;
    } finally {
      // Use setTimeout to ensure this runs after any change detection
      setTimeout(() => {
        this.isSelecting = false;
      });
    }
  }

  changeMonth(direction: number) {
    // Update the month index
    this.currentMonthIndex += direction;
    
    // Handle year transition
    if (this.currentMonthIndex > 11) {
      this.currentMonthIndex = 0;
      this.currentYear++;
    } else if (this.currentMonthIndex < 0) {
      this.currentMonthIndex = 11;
      this.currentYear--;
    }
    
    // Update the calendar view
    this.updateCalendar();
    
    // Emit month changed event
    this.monthChanged.emit({
      monthIndex: this.currentMonthIndex,
      year: this.currentYear
    });
  }

  // Navigate to a specific date and select it
  private navigateToDate(date: Date) {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    // Only update month/year if needed
    if (this.currentMonthIndex !== month || this.currentYear !== year) {
      this.currentMonthIndex = month;
      this.currentYear = year;
      this.updateCalendar();
      
      // Emit month changed event
      this.monthChanged.emit({
        monthIndex: month,
        year: year
      });
    }
    
    // Select the day after a small delay to ensure the calendar is rendered
    setTimeout(() => {
      this.selectDay(day);
    }, 50);
  }
  
  // Navigate to a specific month and year
  private navigateToMonth(monthIndex: number, year: number) {
    this.currentMonthIndex = monthIndex;
    this.currentYear = year;
    this.updateCalendar();
    
    // Emit month changed event
    this.monthChanged.emit({
      monthIndex,
      year
    });
  }

  onSave() {
    if (this.events.length === 0) {
      Swal.fire({
        title: 'No dates selected',
        text: 'Please select at least one date',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Validate all events have required fields
    const invalidEvents = this.events.filter(event => !event.holidayName || !event.holidayType);
    if (invalidEvents.length > 0) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields for all selected dates',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Process events to match the required structure
    const processedEvents = this.events.map(event => {
      const eventDate = new Date(event.date);
      const holidayDate = eventDate.toISOString().split('T')[0];
      
      // Create the event in the required format
      const newEvent: CalendarEvent = {
        date: event.date,
        organizationName: this.organizationName,
        branchName: this.branchName,
        year: this.year,
        holidayDate,
        holidayName: event.holidayName,
        holidayType: event.holidayType,
        leaveDayType: event.leaveDayType || (event.type === 'half' ? 'half day' : 'full day'),
        isOptional: event.isOptional || false,
        // For backward compatibility
        text: event.text || event.holidayName,
        type: event.type || 'full',
        // Preserve the existing flag
        isExisting: event.isExisting
      };
      
      return newEvent;
    });

    // Emit the processed events to the parent component
    this.save.emit({
      events: processedEvents,
      monthIndex: this.currentMonthIndex,
      year: this.currentYear
    });
    
    // Show success message
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    
    Toast.fire({
      icon: 'success',
      title: 'Event saved',
      width: 200
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  // No longer needed as we show all events in the UI
  getSelectedDaysSummary(): string {
    return this.events.length > 0 ? `${this.events.length} dates selected` : 'No dates selected';
  }
}


