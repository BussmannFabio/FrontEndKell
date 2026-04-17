import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroConfeccao } from './cadastro-confeccao';

describe('CadastroConfeccao', () => {
  let component: CadastroConfeccao;
  let fixture: ComponentFixture<CadastroConfeccao>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroConfeccao]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadastroConfeccao);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
