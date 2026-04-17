import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatorioOsComponent } from './relatorio-os';

describe('RelatorioOs', () => {
  let component: RelatorioOsComponent;
  let fixture: ComponentFixture<RelatorioOsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatorioOsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelatorioOsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
