import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WindButtonComponent } from './wind-button.component';

describe('WindButtonComponent', () => {
  let component: WindButtonComponent;
  let fixture: ComponentFixture<WindButtonComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WindButtonComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WindButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
