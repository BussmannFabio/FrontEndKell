import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CriacaoOsComponent} from './criacao-os';

describe('CriacaoOs', () => {
  let component: CriacaoOsComponent;
  let fixture: ComponentFixture<CriacaoOsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CriacaoOsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CriacaoOsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
