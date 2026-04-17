import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendedorLista } from './vendedor-lista';

describe('VendedorLista', () => {
  let component: VendedorLista;
  let fixture: ComponentFixture<VendedorLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendedorLista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendedorLista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
