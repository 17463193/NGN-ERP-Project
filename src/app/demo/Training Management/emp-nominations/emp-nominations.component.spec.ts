import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpNominationsComponent } from './emp-nominations.component';

describe('EmpNominationsComponent', () => {
  let component: EmpNominationsComponent;
  let fixture: ComponentFixture<EmpNominationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpNominationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpNominationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
