import { Component, OnInit } from '@angular/core';
import { NavigationService } from '../../../../../services/navigation.service';
import { NavigationItem } from '../../navigation/navigation';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  navigationItems: NavigationItem[] = [];

  constructor(private navigationService: NavigationService) {}

  ngOnInit() {
    this.navigationService.getNavigationItems().subscribe(items => {
      this.navigationItems = items;
    });
  }
}