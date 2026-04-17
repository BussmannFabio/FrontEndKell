import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstoqueSpComponent } from './estoque-sp';

describe('EstoqueSpComponent', () => {
  let component: EstoqueSpComponent;
  let fixture: ComponentFixture<EstoqueSpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstoqueSpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstoqueSpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
