import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RetornoOsComponent } from './retorno-os';

describe('RetornoOs', () => {
  let component: RetornoOsComponent;
  let fixture: ComponentFixture<RetornoOsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetornoOsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RetornoOsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
