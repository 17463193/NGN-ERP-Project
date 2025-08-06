import { Component, ElementRef, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LeaveService, LeaveRequest, LeaveType } from '../../../services/leave.service';
import { finalize } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import { LeaveFormComponent } from '../leave-form/leave-form.component'

interface LeaveRequestUI {
  id: string;
  empId: string;
  empCode: string;
  name: string;
  division?: string;    // Original field from API
  department: string;   // Mapped from division
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: string;
  
  // UI specific fields
  image: string;
  leaveBalances?: any;
  leaveHistory?: any[];
  date: string;        // Formatted display date
  rawDate: string;     // Original date string for filtering
  duration: string;    // Formatted duration text
}

@Component({
  selector: 'app-elmr',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LeaveFormComponent],
  templateUrl: './elmr.component.html',
  styleUrls: ['./elmr.component.scss'],
  providers: [LeaveService]
})
export class ELMRComponent implements OnInit {
  @ViewChild('exportDiv', { static: false }) exportDiv!: ElementRef;
  @ViewChild('dateInput') dateInput!: ElementRef;

  // UI State
  isLoading = false;
  errorMessage: string | null = null;
  showQRCodeModal = false;
  showLeaveForm = false;
  qrCodeImage = 'assets/frame (2).png'; // Path to your placeholder image
  searchTerm = '';
  selectedDepartment = 'All';
  selectedDate: string | null = null;
  showDatePicker = false;
  showFilter = false;
  filterName = '';
  filterDate = '';
  filterDepartment = '';
  
  // Template methods
  toggleDatePicker(): void {
    this.showDatePicker = !this.showDatePicker;
  }
  
  clearSelectedDate(): void {
    this.selectedDate = null;
    this.applyFilters();
  }
  
  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedDate = input.value;
    this.showDatePicker = false;
    this.applyFilters();
  }
  
  selectDepartment(department: string): void {
    this.selectedDepartment = department;
    this.applyFilters();
  }
  
  toggleFilter(): void {
    this.showFilter = !this.showFilter;
  }
  
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedDepartment = 'All';
    this.selectedDate = null;
    this.filterName = '';
    this.filterDate = '';
    this.filterDepartment = '';
    this.applyFilters();
  }
  
  formatDisplayDate(dateString: string | null): string {
    if (!dateString) return 'Select Date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString || '';
    }
  }
  
  private applyFilters(): void {
    console.log('Applying filters...');
    console.log('Search term:', this.searchTerm);
    console.log('Selected department:', this.selectedDepartment);
    console.log('Selected date:', this.selectedDate);
    console.log('Filter name:', this.filterName);
    console.log('Filter date:', this.filterDate);
    console.log('Filter department:', this.filterDepartment);
    
    // Apply filters to leaveRequests
    this.leaveRequests = this.allLeaveRequests.filter(leave => {
      // Filter by search term (name or employee code)
      const matchesSearch = !this.searchTerm || 
        leave.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        leave.empCode.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      // Filter by department
      const matchesDepartment = this.selectedDepartment === 'All' || 
        leave.department === this.selectedDepartment;
      
      // Filter by date if selected
      const matchesDate = !this.selectedDate || 
        (leave.rawDate && leave.rawDate === this.selectedDate);
      
      return matchesSearch && matchesDepartment && matchesDate;
    });
    
    console.log('Filtered leave requests:', this.leaveRequests);
  }
  
  // Modal state
  showRequestModal = false;
  
  // Data Stores
  leaveRequests: LeaveRequestUI[] = [];
  allLeaveRequests: LeaveRequestUI[] = [];

  // Services
  private http = inject(HttpClient);
  private leaveService = inject(LeaveService);
  private router = inject(Router);


  ngOnInit(): void {
    console.log('Component initialized');
    // Load both current and all leave requests
    this.loadLeaveRequests();
  }

  loadLeaveRequests(): void {
    console.log('Loading all leave requests...');
    this.isLoading = true;
    this.errorMessage = null;
    
    // Load both current and all leave requests in parallel
    combineLatest([
      this.leaveService.getLeaveRequests('current'),
      this.leaveService.getLeaveRequests('all')
    ]).pipe(
      finalize(() => {
        this.isLoading = false;
        console.log('Loading completed');
      })
    )
    .subscribe({
      next: ([currentData, allData]) => {        
        // Process current leaves
        const currentLeaves = Array.isArray(currentData) ? currentData : [];
        this.leaveRequests = this.mapApiResponseToUI(currentLeaves);
        
        // Process all leaves
        const allLeaves = Array.isArray(allData) ? allData : [];
        this.allLeaveRequests = this.mapApiResponseToUI(allLeaves);
        
        console.log('Mapped current leaves:', this.leaveRequests);
        console.log('Mapped all leave requests:', this.allLeaveRequests);
      },
      error: (error) => {
        console.error('Error loading leave requests:', error);
        this.errorMessage = 'Failed to load leave requests. Please try again later.';
        Swal.fire({
          title: 'Error!',
          text: this.errorMessage,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  // This method is no longer needed as we load both current and all leaves in loadLeaveRequests
  loadTodaysLeaves(): void {
    // No-op as we handle this in loadLeaveRequests now
  }

  get filteredLeaves(): LeaveRequestUI[] {
    if (!this.allLeaveRequests || this.allLeaveRequests.length === 0) {
      return [];
    }
    
    return this.allLeaveRequests.filter(leave => {
      // Filter by search term (name or employee code)
      const matchesSearch = !this.searchTerm || 
        (leave.name && leave.name.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (leave.empCode && leave.empCode.toLowerCase().includes(this.searchTerm.toLowerCase()));

      // Filter by department
      const matchesDepartment = this.selectedDepartment === 'All' || 
        (leave.department && leave.department === this.selectedDepartment);

      // Filter by date if selected
      const matchesDate = !this.selectedDate || 
        (leave.rawDate && leave.rawDate === this.selectedDate);

      return matchesSearch && matchesDepartment && matchesDate;
    });
  }

  private mapApiResponseToUI(apiData: any[]): LeaveRequestUI[] {
    if (!apiData || !Array.isArray(apiData)) {
      console.error('Invalid API data received:', apiData);
      return [];
    }

    return apiData.map(item => {
      try {
        // Parse the date string to a Date object
        const fromDate = new Date(item.fromDate);
        const toDate = new Date(item.toDate);
        
        // Format the date for display
        const formattedDate = isNaN(fromDate.getTime()) 
          ? 'Invalid Date' 
          : fromDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
        
        // Calculate duration
        const duration = item.totalDays || 1;
        const durationText = duration === 1 ? '1 day' : `${duration} days`;
        
        // Normalize status (handle both 'PENDING' and 'Pending' cases)
        const normalizedStatus = item.status 
          ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
          : 'Pending';
        
        // Create the leave request object with all required properties
        const leaveRequest: LeaveRequestUI = {
          id: item.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
          empId: item.empId || '',
          empCode: item.empCode || '',
          name: item.name || 'Unknown Employee',
          division: item.division,
          department: item.division || 'N/A',
          fromDate: item.fromDate || '',
          toDate: item.toDate || '',
          totalDays: item.totalDays || 1,
          reason: item.reason || '',
          status: normalizedStatus,
          image: 'assets/images/default-avatar.png',
          date: formattedDate,
          rawDate: item.fromDate || '',
          duration: durationText,
          leaveBalances: {},
          leaveHistory: []
        };
        
        return leaveRequest;
      } catch (error) {
        console.error('Error mapping leave request:', error, item);
        return null;
      }
    }).filter((item): item is LeaveRequestUI => item !== null);  

// Apply filters to leaveRequests
this.leaveRequests = this.allLeaveRequests.filter(leave => {
// Filter by search term (name or employee code)
const matchesSearch = !this.searchTerm || 
leave.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
leave.empCode.toLowerCase().includes(this.searchTerm.toLowerCase());

// Filter by department
const matchesDepartment = this.selectedDepartment === 'All' || 
leave.department === this.selectedDepartment;

// Filter by date if selected
const matchesDate = !this.selectedDate || 
(leave.rawDate && leave.rawDate === this.selectedDate);

return matchesSearch && matchesDepartment && matchesDate;
});
    console.log('Filtering leaves...');
    if (!this.allLeaveRequests || this.allLeaveRequests.length === 0) {
      console.log('No leave requests to filter');
      return [];
    }

    const searchTerm = this.searchTerm.toLowerCase().trim();
    const filterName = this.filterName.toLowerCase().trim();
    const filterDate = this.filterDate;
    const filterDepartment = this.filterDepartment;

    const filtered = this.allLeaveRequests.filter(leave => {
      try {
        const leaveDate = new Date(leave.date).toISOString().split('T')[0];
        const matchesDate = !this.selectedDate || 
                          leaveDate === new Date(this.selectedDate).toISOString().split('T')[0];
        const matchesSearch = searchTerm === '' || 
                            (leave.name && leave.name.toLowerCase().includes(searchTerm)) || 
                            (leave.department && leave.department.toLowerCase().includes(searchTerm)) ||
                            (leave.empCode && leave.empCode.toLowerCase().includes(searchTerm));
        const matchesDept = this.selectedDepartment === 'All' || 
                           leave.department === this.selectedDepartment;
        const matchesFilterName = filterName === '' || 
                                (leave.name && leave.name.toLowerCase().includes(filterName));
        const matchesFilterDept = filterDepartment === '' || 
                                leave.department === filterDepartment;
        const matchesFilterDate = filterDate === '' || 
                                leave.rawDate === filterDate;

        return matchesDate && matchesSearch && matchesDept && 
               matchesFilterName && matchesFilterDept && matchesFilterDate;
      } catch (error) {
        console.error('Error filtering leave:', leave, error);
        return false;
      }
    });
    console.log('Filtered leaves:', filtered);
    return filtered;
  }

  get filteredTodaysLeaves(): LeaveRequestUI[] {
    if (!this.leaveRequests || this.leaveRequests.length === 0) {
      return [];
    }
    
    // Return all current leave requests from the API
    return [...this.leaveRequests];
  }

  /**
   * Update the status of a leave request
   * @param leave The leave request to update
   * @param status The new status ('Approved' or 'Rejected')
   */
  updateStatus(leave: LeaveRequestUI, status: 'Approved' | 'Rejected'): void {
    console.log(leave)
    const isApproved = status === 'Approved';
    const actionText = isApproved ? 'approve' : 'reject';
    
    // For rejections, show the reason input in the same dialog
    const showConfirmation = (): Promise<{isConfirmed: boolean, reason?: string}> => {
      if (isApproved) {
        return Swal.fire({
          title: 'Approve Leave',
          text: 'Are you sure you want to approve this leave request?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes',
          cancelButtonText: 'Cancel'
        }).then((result) => ({
          isConfirmed: result.isConfirmed,
          reason: undefined
        }));
      } else {
        return Swal.fire({
          title: 'Reject Leave',
          html: `
            <p>Please provide a reason for rejection:</p>
            <textarea id="rejectionReason" class="swal2-textarea" placeholder="Enter reason for rejection..." required></textarea>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes',
          cancelButtonText: 'Cancel',
          focusConfirm: false,
          preConfirm: () => {
            const reasonInput = document.getElementById('rejectionReason') as HTMLTextAreaElement;
            const reason = reasonInput?.value.trim();
            if (!reason) {
              Swal.showValidationMessage('Please provide a reason for rejection');
              return false;
            }
            return reason;
          }
        }).then((result) => ({
          isConfirmed: result.isConfirmed,
          reason: result.value
        }));
      }
    };

    showConfirmation().then(({isConfirmed, reason}) => {
      if (isConfirmed) {
        // Show loading indicator
        Swal.fire({
          title: 'Updating...',
          text: 'Please wait while we update the leave status',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        console.log(`Updating leave request ${leave.id} to ${status} with reason:`, leave);
        // Call the service to update the status with the correct request format
        this.leaveService.updateLeaveStatus({
          empCode: leave.empCode,
          id: leave.id,
          approved: isApproved,
          reason: reason
        }).subscribe({
          next: () => {
            // Update the local state in leaveRequests
            const updateLeaveInArray = (arr: LeaveRequestUI[]) => {
              const index = arr.findIndex(l => l.id === leave.id);
              if (index !== -1) {
                arr[index].status = status;
                return [...arr];
              }
              return arr;
            };

            // Update both leaveRequests and allLeaveRequests
            this.leaveRequests = updateLeaveInArray(this.leaveRequests);
            this.allLeaveRequests = updateLeaveInArray(this.allLeaveRequests);
            
            // Close loading and show success
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: `Leave request has been ${status.toLowerCase()}.`,
              confirmButtonColor: '#3085d6',
            });
          },
          error: (error) => {
            console.error('Error updating leave status:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: `Failed to ${actionText} leave request. Please try again.`,
              confirmButtonColor: '#d33',
            });
          }
        });
      }
    });
  }

  // Export to PDF
  exportToPDF(): void {
    if (!this.exportDiv) return;
    
    const element = this.exportDiv.nativeElement;
    const options = {
      scale: 2,
      useCORS: true,
      logging: true,
      letterRendering: true,
      allowTaint: true
    };

    html2canvas(element, options).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('leave-requests.pdf');
      
      Swal.close();
      this.showSuccessToast('The PDF has been generated.');
    }).catch(error => {
      console.error('Error generating PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'There was an error generating the PDF.',
        confirmButtonColor: '#d33'
      });
    });
  }

  navigateToEmployeeDetails(employeeId: string): void {
    this.router.navigate(['/employee', employeeId]);
  }

  // Modal methods
  openRequestModal(): void {
    this.showRequestModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showRequestModal = false;
    document.body.style.overflow = 'auto';
  }

  openLeaveForm(): void {
    this.showRequestModal = false;
    this.router.navigate(['/leave-form']);
  }

  closeLeaveForm() {
    this.showLeaveForm = false;
    document.body.style.overflow = 'auto';
  }

  onLeaveSubmitted(success: boolean) {
    if (success) {
      // Show success message
      Swal.fire({
        title: 'Success!',
        text: 'Leave request submitted successfully',
        icon: 'success',
        confirmButtonText: 'OK'
      });
      
      // Refresh the leave requests list
      this.loadLeaveRequests();
    }
    
    // Always close the form
    this.closeLeaveForm();
  }

  generateQR(): void {
    this.showRequestModal = false;
    this.showQRCodeModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeQRCodeModal(): void {
    this.showQRCodeModal = false;
    document.body.style.overflow = 'auto';
  }

  downloadQRCode(): void {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = this.qrCodeImage;
    link.download = 'leave-request-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showSuccessToast('QR code downloaded successfully!');
  }

  // Show success toast
  private showSuccessToast(message: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }
}