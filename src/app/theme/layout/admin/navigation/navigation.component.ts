// navigation.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NavigationService } from 'src/app/services/navigation.service';
import { NavigationItem } from './navigation';
import { NavGroupComponent } from '../navigation/nav-content/nav-group/nav-group.component';
import { NavCollapseComponent } from '../navigation/nav-content/nav-collapse/nav-collapse.component';
import { NavItemComponent } from '../navigation/nav-content/nav-item/nav-item.component';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    NavGroupComponent,
    NavCollapseComponent,
    NavItemComponent
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  @Output() NavCollapsedMob = new EventEmitter();
  @Output() SubmenuCollapse = new EventEmitter();
  
  navItems: NavigationItem[] = [];
  loading = true;
  error = false;

  constructor(private navigationService: NavigationService) {}

  ngOnInit() {
    // Replace 'currentUserId' with actual user ID from your auth service
    const userId = 'currentUserId'; 
    this.loadNavigation(userId);
  }

  loadNavigation(userId: string) {
    this.loading = true;
    this.error = false;
    
    this.navigationService.getNavigationItems().subscribe({
      next: (items) => {
        this.navItems = items;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  trackByFn(index: number, item: NavigationItem): string {
    return item.id;
  }

  toggleCollapse(item: NavigationItem) {
    item.active = !item.active;
  }
}