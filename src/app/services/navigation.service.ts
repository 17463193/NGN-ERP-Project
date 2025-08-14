import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, forkJoin, catchError, of, tap, switchMap } from 'rxjs';
import { NavigationItem } from '../theme/layout/admin/navigation/navigation';
import { environment } from 'src/environments/environment';
import { AuthService } from '../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private apiUrl = environment.apiUrl;
  private allMenuItems: any[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private loadAllMenuItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/v1/menu-items/hierarchy`).pipe(
      tap(items => {
        this.allMenuItems = items;
        console.log('Complete menu hierarchy:', items);
      })
    );
  }

  private getUserPermissionsWithHierarchy(): Observable<Set<string>> {
    const user = this.authService.getCurrentUser();
    
    if (this.authService.isAdmin()) {
      // Admin gets access to everything
      const allMenuIds = this.getAllMenuIds(this.allMenuItems);
      return of(new Set<string>(allMenuIds));
    }

    if (!user?.userId) {
      return of(new Set<string>());
    }

    return this.http.get<{menuId: string}[]>(
      `${this.apiUrl}/api/v1/user-menu-permissions/user/${user.userId}`
    ).pipe(
      map(permissions => {
        const permittedMenuIds = permissions.map(p => p.menuId);
        console.log('Direct permissions:', permittedMenuIds);
        
        // Get all parent IDs to maintain hierarchy
        const parentIds = this.findAllParentIds(permittedMenuIds);
        console.log('Parent IDs to include:', parentIds);
        
        // Get all child IDs for permitted parent menus
        const childIds = this.findAllChildIds(permittedMenuIds);
        console.log('Child IDs to include:', childIds);
        
        // Combine all IDs
        const allAllowedIds = [...new Set([...permittedMenuIds, ...parentIds, ...childIds])];
        console.log('All allowed menu IDs:', allAllowedIds);
        
        return new Set<string>(allAllowedIds);
      }),
      catchError(error => {
        console.error('Permission load error:', error);
        return of(new Set<string>());
      })
    );
  }

  private getAllMenuIds(items: any[]): string[] {
    let ids: string[] = [];
    items.forEach(item => {
      ids.push(item.menuId);
      if (item.children) {
        ids = [...ids, ...this.getAllMenuIds(item.children)];
      }
    });
    return ids;
  }

  private findAllParentIds(menuIds: string[]): string[] {
    const parentIds = new Set<string>();
    
    const findParents = (id: string) => {
      const menu = this.findMenuItem(id);
      if (menu?.parentId) {
        parentIds.add(menu.parentId);
        findParents(menu.parentId); // Recursively find all ancestors
      }
    };

    menuIds.forEach(id => findParents(id));
    return Array.from(parentIds);
  }

  private findAllChildIds(parentIds: string[]): string[] {
    const childIds: string[] = [];
    
    parentIds.forEach(parentId => {
      const menu = this.findMenuItem(parentId);
      if (menu?.children) {
        menu.children.forEach((child: any) => {
          childIds.push(child.menuId);
        });
      }
    });
    
    return childIds;
  }

  private findMenuItem(menuId: string): any | null {
    const findInTree = (items: any[]): any | null => {
      for (const item of items) {
        if (item.menuId === menuId) return item;
        if (item.children) {
          const found = findInTree(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findInTree(this.allMenuItems);
  }

  getNavigationItems(): Observable<NavigationItem[]> {
    return this.loadAllMenuItems().pipe(
      switchMap(menuItems => {
        return this.getUserPermissionsWithHierarchy().pipe(
          map(permissionIds => {
            if (this.authService.isAdmin()) {
              return this.mapAllMenus(menuItems);
            }
            return this.filterMenusWithHierarchy(menuItems, permissionIds);
          })
        );
      }),
      tap(finalItems => console.log('Final navigation items:', finalItems))
    );
  }

  private filterMenusWithHierarchy(menuItems: any[], allowedIds: Set<string>): NavigationItem[] {
    return menuItems
      .filter(menu => {
        // Include if menu is in allowed IDs
        if (allowedIds.has(menu.menuId)) return true;
        
        // Or if any child is in allowed IDs
        if (menu.children) {
          return menu.children.some((child: any) => allowedIds.has(child.menuId));
        }
        
        return false;
      })
      .map(menu => {
        const filteredMenu = { ...menu };
        
        if (filteredMenu.children) {
          // Show all children if parent is permitted
          if (allowedIds.has(menu.menuId)) {
            filteredMenu.children = [...menu.children];
          } else {
            // Otherwise only show permitted children
            filteredMenu.children = menu.children.filter((child: any) => 
              allowedIds.has(child.menuId)
            );
          }
          
          // Sort children by display order
          filteredMenu.children.sort((a: any, b: any) => 
            (a.displayOrder || 0) - (b.displayOrder || 0)
          );
        }
        
        return this.mapMenuItemToNavigationItem(filteredMenu);
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

   private mapMenuItemToNavigationItem(menu: any): NavigationItem {
    const navItem: NavigationItem = {
      id: menu.menuId,
      title: menu.menuName,
      type: menu.children?.length ? 'collapse' : 'item',
      icon: this.getIconClass(menu.menuIndication),
      url: menu.menuUrl,
      breadcrumbs: false,
      classes: 'nav-item',
      displayOrder: menu.displayOrder
    };

    if (menu.children?.length) {
      navItem.children = menu.children
        .map((child: any) => this.mapMenuItemToNavigationItem(child))
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }

    return navItem;
  }

  private mapAllMenus(menuItems: any[]): NavigationItem[] {
    return menuItems.map(menu => this.mapMenuItemToNavigationItem(menu));
  }

  private getIconClass(menuIndication: string): string {
    // If menuIndication is already a valid icon class, return it directly
    if (menuIndication && menuIndication.startsWith('ti ti-')) {
      return menuIndication;
    }
    
    // If menuIndication is just an icon name, add the 'ti ti-' prefix
    if (menuIndication && menuIndication.startsWith('icon-')) {
      return `ti ti-${menuIndication.substring(5)}`; // removes 'icon-' and adds 'ti ti-'
    }
    
    // Default icon if no valid indication is provided
    return 'ti ti-circle';
  }
}