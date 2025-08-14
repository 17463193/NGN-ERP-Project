import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface TrainingCategory {
  categoryId: string;
  orgId: string;
  categoryName: string;
  categoryCode: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
}

export interface TrainingProgram {
  programId: string;
  orgId: string;
  categoryId: string;
  programName: string;
  programCode: string;
  programType: string;
  deliveryMethod: string;
  durationHours: number;
  costPerParticipant: number;
  batchName: string;
  startDate: string;
  endDate: string;
  venue: string;
  maxSeats: number;
  seatsBooked: number;
  isActive: boolean;
  createdDate: string;
  modifiedDate: string;
  heldBy: string;
}

export interface TrainingNomination {
  nominationId: string;
  empId: string;
  programId: string;
  nominationDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | string;
  justification: string;
  createdDate: string;
  modifiedDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Get all organizations
   * @returns Observable of Organization array
   */
  getOrganizations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/v1/organizations`).pipe(
      catchError(error => {
        console.error('Error fetching organizations:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all training categories
   * @returns Observable of TrainingCategory array
   */
  getTrainingCategories(): Observable<TrainingCategory[]> {
    const url = `${this.apiUrl}/api/v1/training/categories`;
    return this.http.get<TrainingCategory[]>(url).pipe(
      catchError(error => {
        console.error('Error in getTrainingCategories:', error);
        // Return empty array if there's an error
        return of([]);
      })
    );
  }

  /**
   * Get training categories by organization ID
   * @param orgId The organization ID to filter categories by
   * @returns Observable of TrainingCategory array
   */
  getTrainingCategoriesByOrganization(orgId: string): Observable<TrainingCategory[]> {
    return this.http.get<TrainingCategory[]>(
      `${this.apiUrl}/api/v1/training/categories/organization/${orgId}`
    ).pipe(
      catchError(error => {
        console.error('Error fetching categories by organization:', error);
        // Return empty array if there's an error
        return of([]);
      })
    );
  }

  /**
   * Get all training programs
   * @returns Observable of TrainingProgram array
   */
  getTrainingPrograms(): Observable<TrainingProgram[]> {
    return this.http.get<TrainingProgram[]>(`${this.apiUrl}/api/v1/training/programs`).pipe(
      catchError(error => {
        console.error('Error fetching training programs:', error);
        // Return empty array if there's an error
        return of([]);
      })
    );
  }

  /**
   * Get nominations for a specific training program
   * @param programId The ID of the training program
   * @returns Observable of TrainingNomination array
   */
  getNominationsByProgram(programId: string): Observable<TrainingNomination[]> {
    return this.http.get<TrainingNomination[]>(
      `${this.apiUrl}/api/v1/training/nominations/program/${programId}`
    );
  }

  /**
   * Create a new training program
   * @param program The training program data to create
   * @returns Observable of the created TrainingProgram
   */
  createProgram(program: Omit<TrainingProgram, 'programId' | 'createdDate' | 'modifiedDate' | 'seatsBooked'>): Observable<TrainingProgram> {
    return this.http.post<TrainingProgram>(
      `${this.apiUrl}/api/v1/training/programs`,
      program
    );
  }

  /**
   * Update an existing training program
   * @param program The training program data to update
   * @returns Observable of the updated TrainingProgram
   */
  updateProgram(program: TrainingProgram): Observable<TrainingProgram> {
    if (!program.programId) {
      throw new Error('Cannot update program without programId');
    }
    
    return this.http.put<TrainingProgram>(
      `${this.apiUrl}/api/v1/training/programs/${program.programId}`,
      program
    );
  }

  /**
   * Update the status of a training nomination
   * @param nominationId The ID of the nomination to update
   * @param status The new status to set
   * @returns Observable of the updated TrainingNomination
   */
  updateNominationStatus(nominationId: string, status: 'Pending' | 'Approved' | 'Rejected' | 'Completed'): Observable<TrainingNomination> {
    if (!nominationId) {
      throw new Error('Cannot update nomination status without nominationId');
    }
    
    return this.http.patch<TrainingNomination>(
      `${this.apiUrl}/api/v1/training/nominations/${nominationId}/status`,
      { status }
    );
  }
}
