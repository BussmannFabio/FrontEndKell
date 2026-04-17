import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CadastroService, Vendedor } from '../../services/cadastroVendedorCliente.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-vendedor-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="simple-container">

      <h2 class="form-title">
        {{ vendedor.id ? 'Editar Vendedor' : 'Cadastrar Vendedor' }}
      </h2>

      <form (ngSubmit)="salvar()" #vendedorForm="ngForm">

        <!-- Campo Nome -->
        <div class="form-group">
          <label for="nome">Nome</label>
          <input
            id="nome"
            name="nome"
            type="text"
            [(ngModel)]="vendedor.nome"
            required
            minlength="3"
            #nomeControl="ngModel"
            class="form-control"
          >
          <div *ngIf="nomeControl.invalid && (nomeControl.dirty || nomeControl.touched)" class="error-msg">
            Nome obrigatório (mínimo 3 letras).
          </div>
        </div>

        <!-- Campo Telefone -->
        <div class="form-group">
          <label for="telefone">Telefone</label>
          <input
            id="telefone"
            name="telefone"
            type="text"
            [(ngModel)]="vendedor.telefone"
            class="form-control"
          >
        </div>

        <!-- Mensagens de Sucesso/Erro do Backend -->
        <div *ngIf="successMessage" class="msg-success">{{ successMessage }}</div>
        <div *ngIf="errorMessage" class="msg-error">{{ errorMessage }}</div>

        <!-- Botões -->
        <div class="btn-group">
          <button type="button" (click)="voltar()" class="btn btn-cancel">
            Cancelar
          </button>

          <button type="submit" [disabled]="vendedorForm.invalid || loading" class="btn btn-save">
            {{ loading ? 'Salvando...' : (vendedor.id ? 'Atualizar' : 'Salvar') }}
          </button>
        </div>
      </form>

      <!-- ===== LISTAGEM ABAIXO DO FORM ===== -->
        <section class="list-section" *ngIf="vendedores.length >= 0">
        <h3 class="list-title">Vendedores Cadastrados</h3>

        <div *ngIf="listLoading" class="msg-info">Carregando...</div>
        <div *ngIf="!listLoading && vendedores.length === 0" class="msg-info">Nenhum vendedor cadastrado.</div>

        <ul class="list">
          <li *ngFor="let v of vendedores" class="list-item">
            <div class="item-left">
          <div class="item-name-block">
             <span class="item-name">{{ v.nome.toUpperCase() }}</span>
             <span class="item-phone">{{ v.telefone }}</span>
          </div>

            </div>
            <div class="item-right">
              <button class="btn-action btn-remove" (click)="excluirVendedor(v.id)" [disabled]="deletingId === v.id">
                {{ deletingId === v.id ? 'Excluindo...' : 'Excluir' }}
              </button>
            </div>
          </li>
        </ul>
      </section>

    </div>
  `,
  styleUrls: ['./vendedor-lista.scss']
})
export class VendedorListaComponent implements OnInit {
  private cadastroService = inject(CadastroService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  vendedor: Partial<Vendedor> = {
    nome: '',
    telefone: ''
  };

  vendedores: Vendedor[] = [];
  loading: boolean = false;
  listLoading: boolean = false;
  deletingId: number | null = null;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    // carregar lista sempre que entrar
    this.carregarLista();

    // se tiver id na rota, carregar para edição
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.carregarVendedor(+id);
      }
    });
  }

  carregarLista(): void {
    this.listLoading = true;
    // presumi que a service tenha getVendedores()
    this.cadastroService.getVendedores().pipe(finalize(() => this.listLoading = false)).subscribe({
      next: (data) => {
        this.vendedores = Array.isArray(data) ? data : [];
      },
      error: () => {
        this.vendedores = [];
      }
    });
  }

  carregarVendedor(id: number): void {
    this.loading = true;
    this.cadastroService.getVendedorById(id).subscribe({
      next: (data) => {
        this.vendedor = data;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar dados.';
        this.loading = false;
      }
    });
  }

  salvar(): void {
    this.loading = true;
    this.successMessage = null;
    this.errorMessage = null;

    const vendedorData = this.vendedor as Vendedor;

    if (vendedorData.id) {
      this.cadastroService.atualizarVendedor(vendedorData.id, vendedorData).subscribe({
        next: () => {
          this.successMessage = 'Salvo com sucesso!';
          this.loading = false;
          // atualizar lista sem sair
          this.carregarLista();
          // limpar formulário (se quiser) — mantenho para edição; se preferir limpar, descomente:
          // this.vendedor = { nome: '', telefone: '' };
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Erro ao atualizar.';
          this.loading = false;
        }
      });
    } else {
      this.cadastroService.cadastrarVendedor(vendedorData).subscribe({
        next: () => {
          this.successMessage = 'Cadastrado com sucesso!';
          this.vendedor = { nome: '', telefone: '' };
          this.loading = false;
          this.carregarLista();
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Erro ao cadastrar.';
          this.loading = false;
        }
      });
    }
  }

  voltar(): void {
    this.router.navigate(['/lista-vendedores']);
  }

  excluirVendedor(id?: number): void {
    if (!id) return;
    if (!confirm('Confirma exclusão deste vendedor?')) return;

    this.deletingId = id;
    // presumi que a service tenha excluirVendedor(id:number)
    this.cadastroService.excluirVendedor(id).subscribe({
      next: () => {
        this.deletingId = null;
        this.carregarLista();
      },
      error: () => {
        this.deletingId = null;
        this.errorMessage = 'Erro ao excluir.';
      }
    });
  }
}
