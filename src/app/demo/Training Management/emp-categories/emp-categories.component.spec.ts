import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpProgramComponent } from './emp-categories.component';

describe('EmpProgramComponent', () => {
  let component: EmpProgramComponent;
  let fixture: ComponentFixture<EmpProgramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpProgramComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpProgramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
