import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators'; 

import { CadastroService, Cliente } from '../../services/cadastroVendedorCliente.service';

@Component({
  selector: 'app-cliente-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="container">

    <section class="card form-card">
      <h2 class="card-title">Cadastro de Cliente</h2>

      <form [formGroup]="formCliente" (ngSubmit)="salvarCliente()">

        <div class="form-row">
          <label>Nome</label>
          <input type="text" formControlName="nome" placeholder="Nome completo" />
        </div>

        <div class="form-row">
          <label>Endereço</label>
          <input type="text" formControlName="endereco" placeholder="Endereço completo" />
        </div>

        <div class="form-row">
          <label>Documento (CPF/CNPJ)</label>
          <input type="text" formControlName="documento" placeholder="CPF ou CNPJ" />
        </div>

        <div class="form-row">
          <label>CEP</label>
          <input type="text" formControlName="telefone" placeholder="00000-000" />
        </div>

        <button type="submit" class="btn salvar" [disabled]="formCliente.invalid || loading">
          {{ loading ? 'Aguarde...' : (editando ? 'Atualizar Cliente' : 'Cadastrar Cliente') }}
        </button>
        <button type="button" class="btn cancelar" *ngIf="editando" (click)="cancelarEdicao()">
            Cancelar Edição
        </button>

      </form>
    </section>

    <section class="card list-card" *ngIf="clientes.length > 0">
      <h2 class="card-title">Clientes Cadastrados</h2>

      <div class="list-container">
        <div class="list-item" *ngFor="let c of clientes">
          <div class="item-info">
            <span class="item-name">{{ c.nome.toUpperCase() }}</span>
            <span class="item-desc">{{ c.documento }} — CEP: {{ c.telefone || 'Não informado' }}</span>
            <span class="item-desc">{{ c.endereco }}</span>
          </div>

          <div class="item-actions">
            <button class="btn editar" (click)="editar(c)">Editar</button>
            <button class="btn deletar" (click)="deletar(c.id!)">Excluir</button>
          </div>
        </div>
      </div>

    </section>

    <section *ngIf="clientes.length === 0 && !loading" class="empty">
      Nenhum cliente cadastrado ainda.
    </section>
    
    <div *ngIf="loading" class="msg-info">Carregando dados...</div>

  </div>
  `,
  styleUrls: ['./cliente-lista.scss']
})
export class ClienteListaComponent implements OnInit, OnDestroy {

  clientes: Cliente[] = [];
  formCliente!: FormGroup;
  editando: boolean = false;
  loading: boolean = false;

  private destroy$ = new Subject<void>();
  
  private cadastroService = inject(CadastroService);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.formCliente = this.fb.group({
      id: [null],
      nome: ['', Validators.required],
      endereco: ['', Validators.required],
      documento: ['', Validators.required],
      // 💡 Mantemos o nome 'telefone' para sincronizar direto com o banco
      telefone: ['', [Validators.required]] 
    });

    this.carregarClientes();
  }

  carregarClientes() {
    this.loading = true;
    this.cadastroService.getClientes()
      .pipe(
        takeUntil(this.destroy$), 
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (dados: Cliente[]) => this.clientes = dados,
        error: (err: any) => console.error('Erro ao carregar clientes', err)
      });
  }

  salvarCliente() {
    if (this.formCliente.invalid) return;

    const cliente = this.formCliente.value as Cliente;
    this.loading = true;

    if (this.editando && cliente.id) {
      this.cadastroService.atualizarCliente(cliente.id, cliente)
        .pipe(
            takeUntil(this.destroy$), 
            finalize(() => this.loading = false)
        )
        .subscribe({
          next: () => {
            this.cancelarEdicao();
            this.carregarClientes();
          },
          error: (err: any) => console.error('Erro ao atualizar cliente', err)
        });
    } else {
      this.cadastroService.cadastrarCliente(cliente)
        .pipe(
            takeUntil(this.destroy$), 
            finalize(() => this.loading = false)
        )
        .subscribe({
          next: () => {
            this.formCliente.reset();
            this.carregarClientes();
          },
          error: (err: any) => console.error('Erro ao cadastrar cliente', err)
        });
    }
  }

  editar(cliente: Cliente) {
    this.editando = true;
    this.formCliente.patchValue(cliente);
  }

  cancelarEdicao() {
    this.editando = false;
    this.formCliente.reset();
  }

  deletar(id: number) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    this.loading = true;
    this.cadastroService.excluirCliente(id)
      .pipe(
        takeUntil(this.destroy$), 
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => this.carregarClientes(),
        error: (err: any) => console.error('Erro ao excluir cliente', err)
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}