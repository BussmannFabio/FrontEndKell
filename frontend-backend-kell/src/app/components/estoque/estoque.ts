import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface GradeTamanhos {
  p: number; m: number; g: number; u: number;
}

interface ProdutoAgrupado {
  codigo: string;
  confeccao: string; // Adicionado para o filtro
  pronto: GradeTamanhos;
  producao: GradeTamanhos;
  minimo: GradeTamanhos;
}

@Component({
  selector: 'estoque',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="estoque-container">
      <h1 class="no-print">📦 Estoque de Produtos</h1>

      <div class="top-row no-print">
        <div class="tabs">
          <button (click)="aba = 'prontos'" [class.active]="aba==='prontos'">Prontos</button>
          <button (click)="aba = 'producao'" [class.active]="aba==='producao'">Produção</button>
          <button (click)="aba = 'resumo'" [class.active]="aba==='resumo'">Resumo</button>
        </div>

        <div class="controle">
          <select [(ngModel)]="filtroConfeccao">
            <option value="">Todas Confecções</option>
            <option *ngFor="let c of listaConfeccoes" [value]="c">{{ c }}</option>
          </select>

          <input [(ngModel)]="filtro" placeholder="Buscar por código..." />
          
          <label class="unidade-select">
            Exibir em:
            <select [(ngModel)]="unidade">
              <option value="duzias">Dúzias (DZ)</option>
              <option value="pecas">Peças (UN)</option>
            </select>
          </label>
          <button (click)="gerarRelatorio()" class="btn-relatorio">🖨️ Relatório</button>
        </div>
      </div>

      <div class="print-header print-only">
        <h2>Relatório de Estoque - {{ aba | uppercase }}</h2>
        <p>Confecção: {{ filtroConfeccao || 'Todas' }} | Data: {{ dataHoje | date:'dd/MM/yyyy' }}</p>
      </div>

      <table class="tabela-estoque">
        <thead>
          <tr>
            <th>Produto</th>
            <th>P</th>
            <th>M</th>
            <th>G</th>
            <th>U</th>
            <th>Total ({{ unidadeLabel }})</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of produtosFiltrados">
            <td class="col-codigo">{{ item.codigo }}</td>
            <td *ngFor="let tam of ['p','m','g','u']" [ngClass]="getClasseAlertaTam(item, tam)">
              <div class="valor-estoque">{{ getValorTam(item, tam) }}</div>
              <div class="valor-minimo no-print">min: {{ getMinimoTam(item, tam) }}</div>
            </td>
            <td class="col-total"><strong>{{ getTotalLinha(item) }}</strong></td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="row-footer">
            <td><strong>TOTAL GERAL</strong></td>
            <td>{{ somarColuna('p') }}</td>
            <td>{{ somarColuna('m') }}</td>
            <td>{{ somarColuna('g') }}</td>
            <td>{{ somarColuna('u') }}</td>
            <td><strong>{{ somarTotalGeral() }}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `,
  styles: [`
    .estoque-container { max-width: 1200px; margin: 20px auto; font-family: 'Segoe UI', sans-serif; }
    .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .tabs button { padding: 10px 20px; border: 1px solid #ccc; background: #fff; cursor: pointer; border-radius: 4px; margin-right: 5px;}
    .tabs button.active { background: #007bff; color: white; border-color: #007bff; font-weight: bold; }
    .controle { display: flex; gap: 10px; align-items: center; }
    input, select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .btn-relatorio { padding: 8px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    .tabela-estoque { width: 100%; border-collapse: collapse; text-align: center; background: white; }
    th, td { border: 1px solid #eee; padding: 12px 5px; }
    th { background: #f8f9fa; color: #333; font-weight: 600; }
    .col-codigo { text-align: left; padding-left: 20px; font-weight: bold; width: 120px; }
    .valor-estoque { font-size: 1.15em; font-weight: 500; }
    .valor-minimo { font-size: 0.75em; color: #888; border-top: 1px dotted #ddd; display: inline-block; padding-top: 2px; min-width: 60px; margin-top: 4px; }
    .row-footer { background: #f8f9fa; font-size: 1.1em; }
    .col-total { font-weight: bold; background: #fafafa; }
    .vermelho { background-color: #fff5f5 !important; color: #c92a2a; }
    .laranja { background-color: #fff9db !important; color: #e67e22; }
    .verde { background-color: #f4fce3 !important; color: #2b8a3e; }

    /* Estilos de Impressão */
    .print-only { display: none; }
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block; }
      body { background: white; }
      .estoque-container { width: 100%; max-width: none; margin: 0; }
      .tabela-estoque th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
    }
  `]
})
export class Estoque implements OnInit {
  produtos: ProdutoAgrupado[] = [];
  listaConfeccoes: string[] = [];
  filtroConfeccao = '';
  filtro = '';
  aba: 'prontos' | 'producao' | 'resumo' = 'prontos';
  unidade: 'pecas' | 'duzias' = 'duzias'; 
  dataHoje = new Date();

  constructor(private api: ApiService) {}

  ngOnInit() { this.carregarEstoque(); }

  get unidadeLabel() { return this.unidade === 'duzias' ? 'DZ' : 'UN'; }

  carregarEstoque() {
    this.api.get('estoque/produtos').subscribe({
      next: (data: any[]) => {
        const mapa = new Map<string, ProdutoAgrupado>();
        const setConfeccoes = new Set<string>();

        data.forEach(item => {
          const codigo = item.produtoTamanho?.produto?.codigo || 'S/C';
          const confeccao = item.produtoTamanho?.produto?.confeccao?.nome || 'Não Informada';
          setConfeccoes.add(confeccao);

          const tamOriginal = (item.produtoTamanho?.tamanho || 'U').toUpperCase();
          let tamChave: keyof GradeTamanhos = (['P', 'M', 'G'].includes(tamOriginal)) 
            ? tamOriginal.toLowerCase() as keyof GradeTamanhos : 'u';

          const pronto = Number(item.quantidadePronta || 0);
          const producao = Number(item.quantidadeAberta || 0);
          const min = Number(item.estoqueMinimo || item.produtoTamanho?.estoqueMinimo || 0);

          if (!mapa.has(codigo)) {
            mapa.set(codigo, {
              codigo,
              confeccao,
              pronto: { p: 0, m: 0, g: 0, u: 0 },
              producao: { p: 0, m: 0, g: 0, u: 0 },
              minimo: { p: 0, m: 0, g: 0, u: 0 }
            });
          }
          const p = mapa.get(codigo)!;
          p.pronto[tamChave] += pronto;
          p.producao[tamChave] += producao;
          p.minimo[tamChave] += min;
        });

        this.listaConfeccoes = Array.from(setConfeccoes).sort();
        this.produtos = Array.from(mapa.values()).sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
      }
    });
  }

  get produtosFiltrados() {
    return this.produtos.filter(p => {
      const matchCodigo = p.codigo.toLowerCase().includes(this.filtro.trim().toLowerCase());
      const matchConf = !this.filtroConfeccao || p.confeccao === this.filtroConfeccao;
      return matchCodigo && matchConf;
    });
  }

  private converter(valorBase: number): number {
    if (this.unidade === 'pecas') return valorBase; // Se for em peças, exibe o valor real do banco
    return Number((valorBase / 12).toFixed(2)); // Se for em dúzias, divide por 12
  }

  getValorTam(item: ProdutoAgrupado, tam: string): number {
    const t = tam as keyof GradeTamanhos;
    let v = 0;
    if (this.aba === 'prontos') v = item.pronto[t];
    else if (this.aba === 'producao') v = item.producao[t];
    else v = item.pronto[t] + item.producao[t];
    return this.converter(v);
  }

  getMinimoTam(item: ProdutoAgrupado, tam: string): number {
    return this.converter(item.minimo[tam as keyof GradeTamanhos]);
  }

  getTotalLinha(item: ProdutoAgrupado): number {
    let total = 0;
    ['p','m','g','u'].forEach(t => {
      const tam = t as keyof GradeTamanhos;
      if (this.aba !== 'producao') total += item.pronto[tam];
      if (this.aba !== 'prontos') total += item.producao[tam];
    });
    return this.converter(total);
  }

  getClasseAlertaTam(item: ProdutoAgrupado, tam: string): string {
    const t = tam as keyof GradeTamanhos;
    const estoque = (this.aba === 'producao' ? item.producao[t] : (this.aba === 'prontos' ? item.pronto[t] : item.pronto[t] + item.producao[t]));
    const min = item.minimo[t];
    if (min > 0) {
      if (estoque === 0) return 'vermelho';
      if (estoque < min) return 'laranja';
      if (estoque >= min * 2) return 'verde';
    }
    return '';
  }

  somarColuna(tam: string): number {
    const t = tam as keyof GradeTamanhos;
    const soma = this.produtosFiltrados.reduce((acc, item) => {
      let v = 0;
      if (this.aba === 'prontos') v = item.pronto[t];
      else if (this.aba === 'producao') v = item.producao[t];
      else v = item.pronto[t] + item.producao[t];
      return acc + v;
    }, 0);
    return this.converter(soma);
  }

  somarTotalGeral(): number {
    const soma = this.produtosFiltrados.reduce((acc, item) => {
        let tItem = 0;
        ['p','m','g','u'].forEach(t => {
            const tam = t as keyof GradeTamanhos;
            if (this.aba !== 'producao') tItem += item.pronto[tam];
            if (this.aba !== 'prontos') tItem += item.producao[tam];
        });
        return acc + tItem;
    }, 0);
    return this.converter(soma);
  }

  gerarRelatorio() {
    window.print();
  }
}