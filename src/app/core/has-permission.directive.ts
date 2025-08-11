// // shared/directives/has-permission.directive.ts
// import { Directive, Input, TemplateRef, ViewContainerRef, OnDestroy } from '@angular/core';
// import { AuthService } from './services/auth.service';
// import { Subscription } from 'rxjs';

// @Directive({
//   selector: '[appHasPermission]'
// })
// export class HasPermissionDirective implements OnDestroy {
//   private permissionSubscription: Subscription;
//   private currentPermission: string;

//   constructor(
//     private templateRef: TemplateRef<any>,
//     private viewContainer: ViewContainerRef,
//     private authService: AuthService
//   ) {}

//   @Input() set appHasPermission(permission: string) {
//     this.currentPermission = permission;
//     this.updateView();
    
//     // Subscribe to permission changes
//     this.permissionSubscription = this.authService.permissions$.subscribe(() => {
//       this.updateView();
//     });
//   }

//   private updateView(): void {
//     const hasPermission = this.authService.hasPermission(this.currentPermission);
//     this.viewContainer.clear();
    
//     if (hasPermission) {
//       this.viewContainer.createEmbeddedView(this.templateRef);
//     }
//   }

//   ngOnDestroy(): void {
//     if (this.permissionSubscription) {
//       this.permissionSubscription.unsubscribe();
//     }
//   }
// }