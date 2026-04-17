import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

interface EstoqueSpItem {
  id: number;
  produtoTamanhoId: number;
  quantidade: number;
  produtoCodigo?: string | number | null;
  produtoNome?: string | null;
  tamanho?: string | null;
}

interface GradeEstoque {
  codigo: string;
  nome: string;
  P: number;
  M: number;
  G: number;
  U: number; 
  total: number;
}

@Component({
  selector: 'app-estoque-sp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="container">
      <div class="header">
        <h2>📦 Estoque - SP (Matriz de Grade)</h2>
        <div class="actions-header">
           <button (click)="refresh()" class="btn-refresh">🔄 Atualizar</button>
           <button (click)="printReport()" [disabled]="!filteredGrade.length" class="btn-print">🖨️ Imprimir Relatório</button>
        </div>
      </div>

      <div class="controls">
        <input [formControl]="searchControl" placeholder="Filtrar por código ou nome..." class="search-input" />
        
        <div class="unit-toggle">
          <span>Exibir em:</span>
          <select [(ngModel)]="unidade">
            <option value="pecas">Peças</option>
            <option value="duzias">Dúzias</option>
          </select>
        </div>
      </div>

      <div *ngIf="loading" class="info">⏳ Carregando grade de estoque...</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <div class="table-responsive">
        <table *ngIf="!loading && filteredGrade.length" class="table">
          <thead>
            <tr>
              <th>Produto / REF</th>
              <th class="qty-col">P</th>
              <th class="qty-col">M</th>
              <th class="qty-col">G</th>
              <th class="qty-col">U (Especiais)</th>
              <th class="qty-col total-col">Total ({{ unidadeLabel }})</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredGrade">
              <td>
                <span class="cod">{{ item.codigo }}</span><br>
                <small class="nome" *ngIf="item.nome">{{ item.nome }}</small>
              </td>
              
              <td class="qty"><span [class.empty]="!item.P">{{ displayQtd(item.P) }}</span></td>
              <td class="qty"><span [class.empty]="!item.M">{{ displayQtd(item.M) }}</span></td>
              <td class="qty"><span [class.empty]="!item.G">{{ displayQtd(item.G) }}</span></td>
              <td class="qty"><span [class.empty]="!item.U">{{ displayQtd(item.U) }}</span></td>

              <td class="qty total-cell">
                {{ displayQtd(item.total) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="!loading && !filteredGrade.length" class="info">Nenhum registro encontrado.</div>
    </div>
  `,
  styles: [`
    .container { max-width: 1200px; margin: 20px auto; padding:20px; background:#fff; border-radius:12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); font-family: 'Segoe UI', Roboto, sans-serif; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; }
    .controls { display:flex; gap:15px; align-items:center; margin-bottom:20px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .search-input { flex: 1; padding:10px; border:1px solid #ddd; border-radius:6px; }
    .unit-toggle { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #555; }
    select { padding:8px; border-radius:6px; border:1px solid #ccc; }
    .actions-header { display: flex; gap: 10px; }
    button { padding:10px 16px; border-radius:6px; border:none; cursor:pointer; font-weight:bold; }
    .btn-refresh { background:#6c757d; color: white; }
    .btn-print { background:#28a745; color: white; }
    .table-responsive { overflow-x: auto; }
    .table { width:100%; border-collapse:collapse; }
    .table th { background:#f8f9fa; padding:12px; text-align:center; border-bottom: 2px solid #dee2e6; }
    .table td { padding:10px; border-bottom: 1px solid #eee; text-align: center; }
    .cod { font-weight: bold; color: #1976d2; font-size: 1rem; }
    .nome { color: #666; font-size: 0.85rem; }
    .qty { font-family: 'Courier New', monospace; font-weight: 600; }
    .empty { color: #ccc; }
    .total-cell { background: #eef6ff; font-size: 1.1rem; color: #1976d2; }
    .info { text-align: center; padding: 40px; color: #666; }
    .error { color: #d32f2f; background: #ffebee; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
  `]
})
export class EstoqueSpComponent implements OnInit, OnDestroy {
  originalItems: EstoqueSpItem[] = [];
  gradeEstoque: GradeEstoque[] = [];
  filteredGrade: GradeEstoque[] = [];
  loading = false;
  error: string | null = null;
  unidade: 'pecas' | 'duzias' = 'duzias';
  searchControl = new FormControl('');
  private subs = new Subscription();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
    this.subs.add(
      this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.applyFilters())
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get unidadeLabel(): string {
    return this.unidade === 'duzias' ? 'Dz' : 'Pç';
  }

  displayQtd(qtdPecas: number): string {
    if (qtdPecas === 0) return '-';
    const valor = this.unidade === 'pecas' ? qtdPecas : qtdPecas / 12;
    return valor % 1 === 0 ? valor.toString() : valor.toFixed(2);
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.api.get('cargas/estoque-sp').subscribe({
      next: (res: any) => {
        this.originalItems = Array.isArray(res) ? res : [];
        this.processGrade();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Erro ao carregar dados do estoque.';
        this.loading = false;
      }
    });
  }

  processGrade(): void {
    const mapa = new Map<string, GradeEstoque>();

    this.originalItems.forEach(item => {
      // Normalização do código (REF)
      const codigo = item.produtoCodigo ? String(item.produtoCodigo).trim() : 'S/REF';
      
      if (!mapa.has(codigo)) {
        mapa.set(codigo, {
          codigo,
          nome: item.produtoNome || '',
          P: 0, M: 0, G: 0, U: 0,
          total: 0
        });
      }

      const row = mapa.get(codigo)!;
      const tam = (item.tamanho || '').toUpperCase().trim();
      const qtd = Number(item.quantidade) || 0;

      // Distribuição inteligente por coluna
      // Trata P, M, G especificamente; 14, JV, GG, etc., caem no U
      if (tam === 'P') { 
        row.P += qtd;
      } else if (tam === 'M') { 
        row.M += qtd;
      } else if (tam === 'G') { 
        row.G += qtd;
      } else { 
        row.U += qtd;
      }

      row.total += qtd;
    });

    // Ordenação: Numérica primeiro (ex: 745 antes de 1010), depois Alfabética
    this.gradeEstoque = Array.from(mapa.values()).sort((a, b) => {
      const numA = parseInt(a.codigo, 10);
      const numB = parseInt(b.codigo, 10);
      const isNumA = !isNaN(numA) && /^\d+$/.test(a.codigo);
      const isNumB = !isNaN(numB) && /^\d+$/.test(b.codigo);

      if (isNumA && isNumB) return numA - numB;
      if (isNumA && !isNumB) return -1;
      if (!isNumA && isNumB) return 1;
      
      return a.codigo.localeCompare(b.codigo);
    });

    this.applyFilters();
  }

  applyFilters(): void {
    const term = (this.searchControl.value || '').toLowerCase().trim();
    if (!term) {
      this.filteredGrade = [...this.gradeEstoque];
    } else {
      this.filteredGrade = this.gradeEstoque.filter(g => 
        g.codigo.toLowerCase().includes(term) || 
        (g.nome && g.nome.toLowerCase().includes(term))
      );
    }
  }

  refresh() {
    this.load();
  }

  printReport() {
    const html = `
      <html>
      <head>
        <title>Relatório de Estoque SP</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px; }
          th { background: #f2f2f2; }
          .header-report { text-align: center; margin-bottom: 20px; }
          .left { text-align: left; }
        </style>
      </head>
      <body>
        <div class="header-report">
          <h2>ESTOQUE MATRIZ - SÃO PAULO (${this.unidadeLabel.toUpperCase()})</h2>
          <p>Gerado em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>REF / PRODUTO</th>
              <th>P</th><th>M</th><th>G</th><th>U</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredGrade.map(g => `
              <tr>
                <td class="left"><strong>${g.codigo}</strong> ${g.nome ? ' - ' + g.nome : ''}</td>
                <td>${this.displayQtd(g.P)}</td>
                <td>${this.displayQtd(g.M)}</td>
                <td>${this.displayQtd(g.G)}</td>
                <td>${this.displayQtd(g.U)}</td>
                <td><strong>${this.displayQtd(g.total)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>`;
    const win = window.open('', '_blank');
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => win?.print(), 500);
  }
}