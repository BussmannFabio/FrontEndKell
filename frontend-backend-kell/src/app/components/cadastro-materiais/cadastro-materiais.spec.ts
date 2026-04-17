import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroMateriais } from './cadastro-materiais';

describe('CadastroMateriais', () => {
  let component: CadastroMateriais;
  let fixture: ComponentFixture<CadastroMateriais>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroMateriais]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadastroMateriais);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
