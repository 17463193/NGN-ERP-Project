import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { NavigationItem } from '../../navigation';
import { NavCollapseComponent } from '../nav-collapse/nav-collapse.component';
import { NavItemComponent } from '../nav-item/nav-item.component';

@Component({
  selector: 'app-nav-group',
  standalone: true,
  imports: [CommonModule, NavCollapseComponent, NavItemComponent],
  templateUrl: './nav-group.component.html',
  styleUrls: ['./nav-group.component.scss']
})
export class NavGroupComponent implements OnInit {
  private location = inject(Location);

  @Input() item!: NavigationItem;
  currentUrl!: string;

  ngOnInit() {
    this.currentUrl = this.getCurrentUrl();
    this.highlightActiveMenu();
  }

  private getCurrentUrl(): string {
    const baseHref = this.location.prepareExternalUrl('');
    return baseHref + this.location.path();
  }

  private highlightActiveMenu() {
    setTimeout(() => {
      const links = document.querySelectorAll('a.nav-link') as NodeListOf<HTMLAnchorElement>;
      links.forEach((link: HTMLAnchorElement) => {
        if (link.getAttribute('href') === this.currentUrl) {
          let parent = link.parentElement;
          while (parent && parent.classList) {
            if (parent.classList.contains('coded-hasmenu')) {
              parent.classList.add('coded-trigger');
              parent.classList.add('active');
            }
            parent = parent.parentElement;
          }
        }
      });
    }, 0);
  }
}