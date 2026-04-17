import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Material {
  id?: number;
  nome: string;
  unidadeMedida: string;
  quantidade: number;
  estoqueMinimo: number;
  preco: number;
  criadoPor?: string;
  atualizadoPor?: string;
  deletadoPor?: string;
}

@Component({
  selector: 'cadastro-materiais',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <h1>Cadastro de Materiais</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-container">
        <div class="form-group">
          <label>Nome:</label>
          <input formControlName="nome"/>
        </div>
        <div class="form-group">
          <label>Unidade de Medida:</label>
          <input formControlName="unidadeMedida"/>
        </div>
        <div class="form-group">
          <label>Quantidade:</label>
          <input type="number" formControlName="quantidade"/>
        </div>
        <div class="form-group">
          <label>Estoque Mínimo:</label>
          <input type="number" formControlName="estoqueMinimo"/>
        </div>
        <div class="form-group">
          <label>Preço:</label>
          <input type="number" formControlName="preco" step="0.01"/>
        </div>
        <div class="button-group">
          <button type="submit">{{ editing ? 'Atualizar' : 'Salvar' }}</button>
          <button type="button" *ngIf="editing" (click)="cancelEdit()" class="cancel-btn">Cancelar</button>
        </div>
      </form>

      <h2>Materiais Cadastrados</h2>
      <table class="material-table">
        <tr>
          <th>Nome</th>
          <th>Unidade</th>
          <th>Quantidade</th>
          <th>Estoque Mínimo</th>
          <th>Preço</th>
          <th>Ações</th>
        </tr>
        <tr *ngFor="let mat of materiais">
          <td>{{ mat.nome }}</td>
          <td>{{ mat.unidadeMedida }}</td>
          <td>{{ mat.quantidade }}</td>
          <td>{{ mat.estoqueMinimo }}</td>
          <td>{{ mat.preco | number:'1.2-2' }}</td>
          <td>
            <button (click)="edit(mat)" class="edit-btn">Editar</button>
            <button (click)="delete(mat.id)" class="delete-btn">Excluir</button>
          </td>
        </tr>
      </table>
    </div>
  `,
  styles: [`
    .container { max-width: 800px; margin: auto; padding: 20px; font-family: Arial, sans-serif; }
    h1, h2 { text-align: center; margin-bottom: 20px; }
    .form-container { display: flex; flex-direction: column; gap: 10px; background: #f5f5f5;
      padding: 15px; border-radius: 8px; margin-bottom: 30px; }
    .form-group { display: flex; flex-direction: column; }
    label { font-weight: bold; margin-bottom: 5px; }
    input, select { padding: 5px 10px; font-size: 14px; border-radius: 4px; border: 1px solid #ccc; }
    .button-group { display: flex; gap: 10px; margin-top: 10px; }
    button { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    button[type="submit"] { background-color: #4CAF50; color: white; }
    .cancel-btn { background-color: #f44336; color: white; }
    .material-table { width: 100%; border-collapse: collapse; text-align: left; }
    .material-table th, .material-table td { border: 1px solid #ddd; padding: 8px; }
    .material-table th { background-color: #f2f2f2; }
    .edit-btn { background-color: #2196F3; color: white; margin-right: 5px; }
    .delete-btn { background-color: #f44336; color: white; }
  `]
})
export class CadastroMateriaisComponent implements OnInit {
  form = new FormGroup({
    nome: new FormControl('', Validators.required),
    unidadeMedida: new FormControl('', Validators.required),
    quantidade: new FormControl(0, [Validators.required, Validators.min(0)]),
    estoqueMinimo: new FormControl(0, [Validators.required, Validators.min(0)]),
    preco: new FormControl(0, [Validators.required, Validators.min(0)])
  });

  materiais: Material[] = [];
  editing = false;
  editingId: number | null = null;

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.loadMateriais();
  }

  private getValue<T>(value: T | null | undefined, fallback: T): T {
    return value ?? fallback;
  }

  loadMateriais() {
    this.api.get('materiais').subscribe((res: any) => {
      this.materiais = Array.isArray(res) ? res : res.materiais || [];
    });
  }

  submit() {
    if (this.form.invalid) return;

    const raw = this.form.value;

    // Pega o usuário logado do localStorage
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const usuarioLogado = userData.nome ?? 'Desconhecido';

    const data: Material = {
      nome: this.getValue(raw.nome, ''),
      unidadeMedida: this.getValue(raw.unidadeMedida, ''),
      quantidade: this.getValue(raw.quantidade, 0),
      estoqueMinimo: this.getValue(raw.estoqueMinimo, 0),
      preco: this.getValue(raw.preco, 0),
      criadoPor: usuarioLogado
    };

    if (this.editing && this.editingId != null) {
      this.api.put(`materiais/${this.editingId}`, {
        ...data,
        atualizadoPor: usuarioLogado
      }).subscribe(() => {
        this.loadMateriais();
        this.cancelEdit();
      });
    } else {
      this.api.post('materiais', data).subscribe((novo: Material) => {
        this.materiais.push(novo);
        this.form.reset({ nome: '', unidadeMedida: '', quantidade: 0, estoqueMinimo: 0, preco: 0 });
      });
    }
  }

  edit(mat: Material) {
    this.editing = true;
    this.editingId = mat.id ?? null;
    this.form.setValue({
      nome: mat.nome,
      unidadeMedida: mat.unidadeMedida,
      quantidade: mat.quantidade,
      estoqueMinimo: mat.estoqueMinimo,
      preco: mat.preco
    });
  }

  cancelEdit() {
    this.editing = false;
    this.editingId = null;
    this.form.reset({ nome: '', unidadeMedida: '', quantidade: 0, estoqueMinimo: 0, preco: 0 });
  }

  delete(id?: number) {
    if (!id) return;

    const confirmacao = prompt(
      '⚠️ Tem certeza que deseja excluir este material?\n\nDigite CONFIRMAR para prosseguir:'
    );

    if (confirmacao === 'CONFIRMAR') {
      this.api.delete(`materiais/${id}`).subscribe(() => this.loadMateriais());
    } else {
      alert('Exclusão cancelada.');
    }
  }

}
