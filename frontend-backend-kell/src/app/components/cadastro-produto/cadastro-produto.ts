import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProdutoService, Produto } from '../../services/produto';

@Component({
  selector: 'app-cadastro-produto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div class="header">
        <h2>{{ produtoEditando ? '✏️ Editar Produto' : '📦 Cadastro de Produto' }}</h2>
      </div>

      <form [formGroup]="produtoForm" (ngSubmit)="submit()">
        <div class="form-grid">
          <div class="form-group">
            <label>Código do Produto</label>
            <input formControlName="codigo" placeholder="Ex: CAM-001" required />
          </div>

          <div class="form-group">
            <label>Valor Mão de Obra (Peça)</label>
            <input type="number" formControlName="valorMaoDeObraDuzia" placeholder="R$ 0,000" required />
          </div>

          <div class="form-group full-width">
            <label>Preço de Venda (Dúzia)</label>
            <input type="number" formControlName="precoVendaDuzia" placeholder="R$ 0,000" required />
          </div>
        </div>

        <div class="painel-calculos">
          <div class="card-calculo">
            <span class="label">Venda (Peça)</span>
            <span class="valor">R$ {{ produtoForm.get('precoVendaPeca')?.value | number:'1.3-3' }}</span>
          </div>
          
          <div class="card-calculo destaque">
            <span class="label">Mão de Obra (Peça + 70%)</span>
            <span class="valor">R$ {{ produtoForm.get('valorMaoDeObraPeca')?.value | number:'1.3-3' }}</span>
            <small>Cálculo automático: M.O peça × 1.70</small>
          </div>
        </div>

        <div class="section-header">
          <h3>Grade de Tamanhos</h3>
        </div>

        <div formArrayName="tamanhos" class="tamanhos-list">
          <div class="tamanho-row" *ngFor="let grupo of tamanhos.controls; let i = index" [formGroupName]="i">
            <input formControlName="tamanho" placeholder="P, M, G..." required />
            <input type="number" formControlName="estoqueMinimo" placeholder="Qtd Mín" required />
            <button type="button" class="btn-remove" (click)="removerTamanho(i)">✕</button>
          </div>
        </div>

        <button type="button" class="btn-add" (click)="adicionarTamanho()">+ Adicionar Tamanho</button>

        <div class="form-actions">
          <button type="submit" class="btn-submit" [disabled]="produtoForm.invalid || loading">
            {{ loading ? 'Salvando...' : (produtoEditando ? 'Atualizar Produto' : 'Salvar Produto') }}
          </button>
          <button *ngIf="produtoEditando" type="button" class="btn-cancel" (click)="cancelarEdicao()">Cancelar</button>
        </div>
      </form>

      <div *ngIf="mensagem" [ngClass]="{'msg-success': sucesso, 'msg-error': !sucesso}" class="alert">
        {{ mensagem }}
      </div>

      <div class="lista-container">
        <h3>Produtos Cadastrados</h3>
        <table class="tabela-kell">
          <thead>
            <tr>
              <th>Código</th>
              <th>M.O. (Peça)</th>
              <th>Venda (Dz)</th>
              <th>M.O. (Peça +70%)</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of produtos">
              <td><strong>{{ p.codigo }}</strong></td>
              <td>R$ {{ p.valorMaoDeObraDuzia | number:'1.3-3' }}</td>
              <td>R$ {{ p.precoVendaDuzia | number:'1.3-3' }}</td>
              <td class="text-mo">R$ {{ p.valorMaoDeObraPeca | number:'1.3-3' }}</td>
              <td>
                <button class="btn-action edit" (click)="editarProduto(p)">Editar</button>
                <button class="btn-action delete" (click)="confirmarDeletar(p)">Excluir</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    /* Seus estilos permanecem os mesmos */
    .container { max-width: 900px; margin: 30px auto; padding: 25px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); font-family: 'Segoe UI', sans-serif; }
    .header { border-bottom: 2px solid #f0f0f0; margin-bottom: 25px; padding-bottom: 10px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .full-width { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-weight: 700; color: #444; font-size: 14px; }
    .form-group input { padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 16px; background: #fff; }
    .painel-calculos { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; background: #f4f7f6; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0; }
    .card-calculo { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .card-calculo.destaque { border-left: 5px solid #28a745; background: #eefaf2; }
    .label { font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; }
    .valor { font-size: 22px; font-weight: 800; color: #333; margin: 5px 0; }
    .destaque .valor { color: #28a745; }
    small { font-size: 10px; color: #888; }
    .tamanho-row { display: grid; grid-template-columns: 2fr 2fr 50px; gap: 10px; margin-bottom: 8px; }
    .btn-add { width: 100%; padding: 10px; background: #f8f9fa; border: 1px dashed #bbb; border-radius: 8px; cursor: pointer; margin-bottom: 25px; }
    .btn-submit { background: #007bff; color: #fff; border: none; padding: 15px; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; }
    .btn-cancel { background: #6c757d; color: #fff; border: none; padding: 10px; border-radius: 8px; width: 100%; margin-top: 10px; cursor: pointer; }
    .alert { margin-top: 20px; padding: 15px; border-radius: 8px; text-align: center; }
    .msg-success { background: #d4edda; color: #155724; }
    .msg-error { background: #f8d7da; color: #721c24; }
    .tabela-kell { width: 100%; border-collapse: collapse; margin-top: 25px; }
    .tabela-kell th { background: #f8f9fa; padding: 12px; border-bottom: 2px solid #dee2e6; text-align: left; }
    .tabela-kell td { padding: 12px; border-bottom: 1px solid #eee; }
    .text-mo { color: #28a745; font-weight: 700; }
    .btn-action { border: none; background: none; cursor: pointer; font-weight: 700; margin-right: 10px; }
    .btn-action.edit { color: #007bff; }
    .btn-action.delete { color: #dc3545; }
  `]
})
export class CadastroProduto implements OnInit, OnDestroy {
  produtoForm: FormGroup;
  mensagem: string | null = null;
  sucesso = false;
  loading = false;
  produtos: Produto[] = [];
  produtoEditando: Produto | null = null;
  private subs = new Subscription();

  constructor(private fb: FormBuilder, private produtoService: ProdutoService) {
    this.produtoForm = this.fb.group({
      codigo: ['', Validators.required],
      valorMaoDeObraDuzia: [0, Validators.required],
      precoVendaDuzia: [0, Validators.required],
      precoVendaPeca: [{ value: 0, disabled: true }],
      valorMaoDeObraPeca: [{ value: 0, disabled: true }],
      tamanhos: this.fb.array([])
    });

    this.monitorarCalculos();
  }

  ngOnInit() {
    this.carregarProdutos();
    this.subs.add(this.produtoService.produtoChanged$.subscribe(() => this.carregarProdutos()));
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  private monitorarCalculos() {
    // Preço de venda por dúzia → calcula preço de venda por peça
    this.subs.add(
      this.produtoForm.get('precoVendaDuzia')?.valueChanges.subscribe(vendaDz => {
        if (vendaDz && vendaDz > 0) {
          this.produtoForm.patchValue({ precoVendaPeca: vendaDz / 12 }, { emitEvent: false });
        }
      })
    );
    // M.O. base por peça → calcula M.O. excedente = base × 1.70
    this.subs.add(
      this.produtoForm.get('valorMaoDeObraDuzia')?.valueChanges.subscribe(moPeca => {
        if (moPeca != null && moPeca >= 0) {
          this.produtoForm.patchValue({ valorMaoDeObraPeca: moPeca * 1.70 }, { emitEvent: false });
        }
      })
    );
  }

  private executarCalculos(vendaDz: number, moPeca?: number) {
    if (vendaDz && vendaDz > 0) {
      this.produtoForm.patchValue({ precoVendaPeca: vendaDz / 12 }, { emitEvent: false });
    }
    if (moPeca != null && moPeca >= 0) {
      this.produtoForm.patchValue({ valorMaoDeObraPeca: moPeca * 1.70 }, { emitEvent: false });
    }
  }

  get tamanhos(): FormArray { return this.produtoForm.get('tamanhos') as FormArray; }

  adicionarTamanho(t: string = '', e: number = 0, id?: number) {
    this.tamanhos.push(this.fb.group({
      id: [id ?? null],
      tamanho: [t, Validators.required],
      estoqueMinimo: [e, Validators.required]
    }));
  }

  removerTamanho(i: number) { this.tamanhos.removeAt(i); }

  carregarProdutos() {
    this.produtoService.listarProdutos().subscribe(res => this.produtos = res);
  }

  private extrairIdLimpo(id: any): number {
    if (!id) return 0;
    return Number(String(id).split(/\D/)[0]);
  }

  editarProduto(p: Produto) {
    if (!p.id) return;
    const idLimpo = this.extrairIdLimpo(p.id);
    this.produtoService.obterProduto(idLimpo).subscribe({
      next: (full) => {
        this.produtoEditando = full;
        this.produtoForm.patchValue({
          codigo: full.codigo,
          valorMaoDeObraDuzia: full.valorMaoDeObraDuzia,
          precoVendaDuzia: full.precoVendaDuzia
        });
        this.executarCalculos(full.precoVendaDuzia, full.valorMaoDeObraDuzia);
        this.tamanhos.clear();
        (full.tamanhos || []).forEach(t => {
          this.adicionarTamanho(t.tamanho, t.estoqueMinimo, (t as any).id);
        });
      },
      error: (err) => {
        console.error("Erro ao carregar produto:", err);
        this.mensagem = "❌ Erro ao carregar dados do produto.";
        this.sucesso = false;
      }
    });
  }

  submit() {
    if (this.produtoForm.invalid) return;
    this.loading = true;
    const payload = this.produtoForm.getRawValue();
    const request$ = this.produtoEditando
      ? this.produtoService.atualizarProduto(this.extrairIdLimpo(this.produtoEditando.id), payload)
      : this.produtoService.criarProduto(payload);

    request$.subscribe({
      next: () => {
        this.mensagem = '✅ Salvo com sucesso!';
        this.sucesso = true;
        this.resetForm();
        this.carregarProdutos();
        setTimeout(() => this.mensagem = null, 3000);
      },
      error: (err) => { 
        console.error("Erro no submit:", err);
        this.mensagem = '❌ Erro ao salvar.'; 
        this.sucesso = false; 
      },
      complete: () => this.loading = false
    });
  }

  private resetForm() {
    this.produtoForm.reset({
        valorMaoDeObraDuzia: 0,
        precoVendaDuzia: 0,
        precoVendaPeca: 0,
        valorMaoDeObraPeca: 0
    });
    this.tamanhos.clear();
    this.produtoEditando = null;
  }

  cancelarEdicao() { this.resetForm(); }

  confirmarDeletar(p: Produto) {
    const idLimpo = this.extrairIdLimpo(p.id);
    if (confirm(`Excluir ${p.codigo}?`)) {
      this.produtoService.deletarProduto(idLimpo).subscribe(() => this.carregarProdutos());
    }
  }
}