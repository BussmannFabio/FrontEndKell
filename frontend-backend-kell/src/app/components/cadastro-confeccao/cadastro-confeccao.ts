import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Confeccao {
  id: number;
  nome: string;
}

@Component({
  selector: 'cadastro-confeccao',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">

      <!-- Cabeçalho dinâmico -->
      <h1>
        <span *ngIf="!editandoId">✏️ Cadastro de Confecção</span>
        <span *ngIf="editandoId" class="modo-edicao">🔄 Editando Confecção</span>
      </h1>

      <!-- Formulário (criação e edição) -->
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Nome da Confecção:</label>
        <input
          formControlName="nome"
          placeholder="Digite o nome da confecção"
          [class.input-edicao]="editandoId"
        />

        <div class="btn-row">
          <button
            type="submit"
            [disabled]="form.invalid"
            [class.btn-editar-salvar]="editandoId"
          >
            {{ editandoId ? '💾 Salvar Alteração' : '➕ Cadastrar' }}
          </button>
          <button
            *ngIf="editandoId"
            type="button"
            class="btn-cancelar"
            (click)="cancelarEdicao()"
          >
            ✖ Cancelar
          </button>
        </div>
      </form>

      <!-- Feedback -->
      <div *ngIf="mensagem" class="mensagem" [class.mensagem-erro]="isErro">
        {{ mensagem }}
      </div>

      <!-- Lista -->
      <div *ngIf="loading" class="info">Carregando...</div>

      <div *ngIf="!loading && confeccoes.length === 0" class="info">
        Nenhuma confecção cadastrada.
      </div>

      <div *ngIf="confeccoes.length > 0" class="lista-confeccoes">
        <h2>Confecções Cadastradas</h2>
        <ul>
          <li *ngFor="let c of confeccoes" [class.li-editando]="editandoId === c.id">
            <span class="nome-confeccao">{{ c.nome }}</span>
            <div class="acoes">
              <button class="btn-edit" (click)="iniciarEdicao(c)" [disabled]="editandoId === c.id">
                ✏️ Editar
              </button>
              <button class="btn-delete" (click)="confirmarExcluir(c.id, c.nome)" [disabled]="!!editandoId">
                🗑️ Excluir
              </button>
            </div>
          </li>
        </ul>
      </div>

    </div>
  `,
  styles: [`
    .container {
      max-width: 560px;
      margin: 30px auto;
      padding: 28px;
      border: 1px solid #ddd;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      background-color: #ffffff;
      font-family: 'Segoe UI', Arial, sans-serif;
    }

    h1 {
      text-align: center;
      font-size: 1.4rem;
      color: #333;
      margin-bottom: 20px;
    }

    .modo-edicao { color: #e67e22; }

    h2 {
      text-align: center;
      font-size: 1rem;
      color: #555;
      margin: 24px 0 12px;
      border-top: 1px solid #eee;
      padding-top: 16px;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #444;
      font-size: 0.9rem;
    }

    input {
      width: 100%;
      padding: 10px 12px;
      margin-bottom: 14px;
      border: 2px solid #ddd;
      border-radius: 6px;
      box-sizing: border-box;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    input:focus { outline: none; border-color: #4CAF50; }
    input.input-edicao { border-color: #e67e22; }
    input.input-edicao:focus { border-color: #d35400; }

    .btn-row {
      display: flex;
      gap: 10px;
    }

    button[type=submit] {
      flex: 1;
      padding: 11px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s, transform 0.1s;
    }
    button[type=submit]:hover:not(:disabled) { background-color: #43a047; transform: translateY(-1px); }
    button[type=submit]:disabled { background-color: #bdbdbd; cursor: not-allowed; }
    button[type=submit].btn-editar-salvar { background-color: #e67e22; }
    button[type=submit].btn-editar-salvar:hover:not(:disabled) { background-color: #d35400; }

    .btn-cancelar {
      padding: 11px 16px;
      background-color: #757575;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    .btn-cancelar:hover { background-color: #616161; }

    .mensagem {
      margin-top: 14px;
      text-align: center;
      color: #2e7d32;
      font-weight: 600;
      padding: 8px;
      background: #f1f8e9;
      border-radius: 6px;
      font-size: 0.9rem;
    }
    .mensagem-erro { color: #c62828; background: #ffebee; }

    .lista-confeccoes ul { list-style: none; padding: 0; margin: 0; }
    .lista-confeccoes li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 8px;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.2s;
      border-radius: 6px;
    }
    .lista-confeccoes li:hover { background: #fafafa; }
    .li-editando { background: #fff8f0 !important; border-left: 3px solid #e67e22; }

    .nome-confeccao { font-size: 14px; color: #333; }

    .acoes { display: flex; gap: 8px; }

    .btn-edit {
      background-color: #1976d2;
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    .btn-edit:hover:not(:disabled) { background-color: #1565c0; }
    .btn-edit:disabled { background-color: #90caf9; cursor: default; }

    .btn-delete {
      background-color: #e53935;
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    .btn-delete:hover:not(:disabled) { background-color: #c62828; }
    .btn-delete:disabled { background-color: #ef9a9a; cursor: default; }

    .info { text-align: center; margin-top: 20px; color: #999; font-style: italic; font-size: 0.9rem; }
  `]
})
export class CadastroConfeccao implements OnInit {
  form = new FormGroup({
    nome: new FormControl('', [Validators.required, Validators.minLength(1)])
  });

  confeccoes: Confeccao[] = [];
  mensagem: string | null = null;
  isErro = false;
  loading = false;

  /** ID da confecção sendo editada, ou null se estiver no modo criação */
  editandoId: number | null = null;

  constructor(private api: ApiService) { }

  ngOnInit() { this.carregarConfeccoes(); }

  carregarConfeccoes() {
    this.loading = true;
    this.api.get('confeccoes').subscribe({
      next: (res: any) => { this.confeccoes = res || []; this.loading = false; },
      error: err => { console.error(err); this.mostrarMensagem('Erro ao carregar confecções.', true); this.loading = false; }
    });
  }

  /** Preenche o formulário com os dados da confecção selecionada e entra em modo edição */
  iniciarEdicao(c: Confeccao) {
    this.editandoId = c.id;
    this.form.patchValue({ nome: c.nome });
    this.mensagem = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Cancela a edição e reseta o formulário */
  cancelarEdicao() {
    this.editandoId = null;
    this.form.reset();
    this.mensagem = null;
  }

  submit() {
    if (this.form.invalid) return;

    if (this.editandoId !== null) {
      // Modo edição → PATCH /confeccoes/:id
      this.api.patch(`confeccoes/${this.editandoId}`, this.form.value).subscribe({
        next: () => {
          this.mostrarMensagem('Confecção atualizada com sucesso!');
          this.cancelarEdicao();
          this.carregarConfeccoes();
        },
        error: err => {
          console.error(err);
          this.mostrarMensagem('Erro ao atualizar confecção.', true);
        }
      });
    } else {
      // Modo criação → POST /confeccoes
      this.api.post('confeccoes', this.form.value).subscribe({
        next: () => {
          this.mostrarMensagem('Confecção cadastrada com sucesso!');
          this.form.reset();
          this.carregarConfeccoes();
        },
        error: err => {
          console.error(err);
          this.mostrarMensagem('Erro ao cadastrar confecção.', true);
        }
      });
    }
  }

  confirmarExcluir(id: number, nome: string) {
    if (confirm(`Deseja realmente excluir a confecção "${nome}"?\n\nAtenção: ela pode estar vinculada a Ordens de Serviço.`)) {
      this.deletar(id);
    }
  }

  private deletar(id: number) {
    this.api.delete(`confeccoes/${id}`).subscribe({
      next: () => { this.mostrarMensagem('Confecção excluída.'); this.carregarConfeccoes(); },
      error: err => { console.error(err); this.mostrarMensagem('Erro ao excluir.', true); }
    });
  }

  private mostrarMensagem(msg: string, erro = false) {
    this.mensagem = msg;
    this.isErro = erro;
    setTimeout(() => { this.mensagem = null; this.isErro = false; }, 3500);
  }
}
