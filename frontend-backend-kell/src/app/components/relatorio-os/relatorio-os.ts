import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Produto {
  id?: string | number;
  codigo?: string;
  nome?: string;
}

interface CorteItem {
  corte?: string | number;
  tamanho?: string;
  volumes?: number;
  pacotes?: number;
  pecasPorVolume?: number;
  pecasPorPacote?: number;
  produtoId?: string | number;
  produtoCodigo?: string | number;
  produto?: Produto;
}

interface Corte {
  numero: string;
  itens: CorteItem[];
}

interface Confeccao {
  id?: string;
  nome?: string;
}

interface OrdemServico {
  id?: string | number;
  dataInicio?: string;
  confeccaoId?: string | number;
  confeccao?: Confeccao;
  itens?: CorteItem[];
  cortes?: Corte[];
}

interface OsDados {
  os: OrdemServico;
  totalPecas: number;
  totalDuzias: number;
  totalVolumes: number;
  totaisPorTamanho: Record<string, number>;
  retorno: number;
}

@Component({
  selector: 'app-relatorio-os',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="print-container">
      <ng-container *ngIf="modoImpressaoDupla && osDados.length >= 1">
        <div class="a4-page">
          <ng-container *ngFor="let d of osDados; let last = last">
            <div class="os-wrapper">
              <div class="vias-grid">
                <ng-container *ngTemplateOutlet="viaTemplate; context: { data: d, titulo: 'VIA OFICINA', mostrarObs: true }"></ng-container>
                <ng-container *ngTemplateOutlet="viaTemplate; context: { data: d, titulo: 'VIA INTERNA', mostrarObs: false }"></ng-container>
              </div>
              <div class="page-divisor" *ngIf="!last"></div>
            </div>
          </ng-container>
        </div>
      </ng-container>

      <ng-container *ngIf="!modoImpressaoDupla && os">
        <div class="a4-page simples">
          <div class="vias-grid">
            <ng-container *ngTemplateOutlet="viaTemplate; context: { data: getDadosSimples(), titulo: 'VIA OFICINA', mostrarObs: true }"></ng-container>
            <ng-container *ngTemplateOutlet="viaTemplate; context: { data: getDadosSimples(), titulo: 'VIA INTERNA', mostrarObs: false }"></ng-container>
          </div>
        </div>
      </ng-container>

      <div class="print-actions no-print">
        <button (click)="imprimir()">🖨️ Imprimir Documento</button>
      </div>
    </div>

    <ng-template #viaTemplate let-d="data" let-titulo="titulo" let-mostrarObs="mostrarObs">
      <div class="via-box">
        <div class="via-header">
          <div class="via-titulo">{{titulo}} · Nº {{d.os.id}}</div>
          <div class="info-line">Costura: <b>{{d.os.confeccao?.nome}}</b></div>
          <div class="info-line">Envio: <b>{{d.os.dataInicio | date:'dd/MM/yyyy'}}</b></div>
          <div class="info-line">Ordem: <b>{{getCodigosUnicos(d.os)}}</b></div>
        </div>

        <div class="indicadores-container">
          <div class="ind-tag highlight">Qtd: {{d.totalPecas}}</div>
          <div class="ind-tag highlight">Dúz: {{d.totalDuzias}}</div>
          <div class="ind-tag">P: {{d.totaisPorTamanho['P'] || 0}}</div>
          <div class="ind-tag">M: {{d.totaisPorTamanho['M'] || 0}}</div>
          <div class="ind-tag">G: {{d.totaisPorTamanho['G'] || 0}}</div>
          <div class="ind-tag">EG: {{d.totaisPorTamanho['EG'] || 0}}</div>
          <div class="ind-tag">U: {{d.totaisPorTamanho['U'] || 0}}</div>
        </div>

        <div class="grade-conferencia" *ngIf="mostrarObs">
          1ª: P:____ M:____ G:____ U:____ | Qtd Real:_______
        </div>

        <div class="table-wrapper">
          <table class="dados-table">
            <thead>
              <tr>
                <th>Cód</th>
                <th>Tam</th>
                <th>Vol</th>
                <th>Pç/Vol</th>
                <th>Corte</th>
                <th *ngIf="mostrarObs" style="width: 50px;">Obs</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let corte of d.os.cortes">
                <tr *ngFor="let item of corte.itens">
                  <td>{{item.produto?.codigo || item.produtoCodigo}}</td>
                  <td>{{item.tamanho}}</td>
                  <td>{{item.volumes ?? item.pacotes}}</td>
                  <td>{{item.pecasPorVolume ?? item.pecasPorPacote}}</td>
                  <td>{{corte.numero}}</td>
                  <td *ngIf="mostrarObs"></td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <div class="via-footer">
          <div class="totais-resumo">
            VOL: {{d.totalVolumes}} | RETORNO: {{d.retorno}}
          </div>
          <div class="assinatura-area" *ngIf="mostrarObs">
            Data: __/__/__ Ass: ____________
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .print-container {
      background: #f0f0f0;
      min-height: 100vh;
      padding: 20px;
    }

    .a4-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 7mm; /* Reduzido para caber na página */
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #000;
      box-sizing: border-box;
    }

    .vias-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px; /* Reduzido ~20% */
    }

    .via-box {
      border: 1.5px solid #000;
      padding: 10px;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 430px; /* Reduzido ~10% de 480px */
    }

    .via-titulo { 
      font-weight: 800; 
      text-align: center; 
      font-size: 14px; 
      border-bottom: 2px solid #000;
      margin-bottom: 8px;
    }

    .info-line { font-size: 11px; margin-bottom: 2px; }

    .indicadores-container { 
      display: flex; 
      gap: 4px; 
      margin: 10px 0;
    }

    .ind-tag { 
      border: 1px solid #000; 
      padding: 2px 5px; 
      font-weight: bold; 
      font-size: 10px;
      text-align: center;
      flex: 1;
    }

    .ind-tag.highlight { background: #eee; }

    .grade-conferencia {
      border: 1px dashed #000;
      padding: 8px;
      font-size: 10px;
      margin-bottom: 10px;
    }

    .table-wrapper { flex-grow: 1; }

    .dados-table { 
      width: 100%; 
      border-collapse: collapse; 
    }

    .dados-table th, .dados-table td { 
      border: 1px solid #000; 
      padding: 5px 2px; /* Leve redução no padding */
      text-align: center; 
      font-size: 10px; 
    }

    .via-footer {
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .totais-resumo {
      border: 2px solid #000;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 11px;
    }

    .page-divisor {
      border-top: 2px dashed #666;
      margin: 20px 0; /* Reduzido para economizar espaço vertical */
    }

    .print-actions {
      position: fixed;
      bottom: 20px;
      right: 20px;
    }

    .print-actions button {
      padding: 15px 30px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 5px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }

    @media print {
      body > :not(.print-container) {
        display: none !important;
      }
      
      .print-container {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
        z-index: 99999 !important;
      }

      .a4-page {
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }

      .no-print {
        display: none !important;
      }

      @page {
        size: A4 portrait;
        margin: 5mm;
      }
    }
  `]
})
export class RelatorioOsComponent implements OnInit {
  os: OrdemServico | undefined;
  totalPecasGeral = 0;
  totalDuziasGeral = 0;
  totalVolumes = 0;
  totaisPorTamanho: Record<string, number> = {};
  retorno = 0;
  modoImpressaoDupla = false;
  osDados: OsDados[] = [];

  constructor(private api: ApiService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const idsQuery = this.route.snapshot.queryParamMap.get('ids');

    if (idsQuery) {
      const ids = idsQuery.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2);
      this.modoImpressaoDupla = true;
      this.carregarDuplas(ids);
    } else if (idParam) {
      this.carregarSimples(idParam);
    }
  }

  getDadosSimples(): any {
    return {
      os: this.os,
      totalPecas: this.totalPecasGeral,
      totalDuzias: this.totalDuziasGeral,
      totalVolumes: this.totalVolumes,
      totaisPorTamanho: this.totaisPorTamanho,
      retorno: this.retorno
    };
  }

  private carregarSimples(id: string) {
    this.api.get(`ordens/${id}`).subscribe({
      next: (data: any) => {
        this.os = data.ordem || data;
        if (this.os) {
          this.normalizarItens(this.os);
          this.carregarProdutos(this.os.itens || []);
          this.processarDados(this.os);
          const t = this.calcTotais(this.os);
          this.totalPecasGeral = t.totalPecas;
          this.totalDuziasGeral = t.totalDuzias;
          this.totalVolumes = t.totalVolumes;
          this.totaisPorTamanho = t.totaisPorTamanho;
          this.retorno = t.retorno;
        }
      }
    });
  }

  private carregarDuplas(ids: string[]) {
    const reqs = ids.map(id => this.api.get(`ordens/${id}`).pipe(catchError(() => of(null))));
    forkJoin(reqs).subscribe((results: any[]) => {
      this.osDados = results.filter(r => r !== null).map((data: any) => {
        const os: OrdemServico = data.ordem || data;
        this.normalizarItens(os);
        this.processarDados(os);
        this.carregarProdutos(os.itens || []);
        return { os, ...this.calcTotais(os) };
      });
    });
  }

  private normalizarItens(os: OrdemServico) {
    os.itens = os.itens || (os as any).Itens || (os as any).ordem_itens || [];
  }

  private carregarProdutos(itens: CorteItem[]) {
    itens.forEach(item => {
      if (!item.produto) {
        const url = item.produtoCodigo ? `produtos/codigo/${item.produtoCodigo}` : `produtos/${item.produtoId}`;
        this.api.get(url).subscribe(prod => item.produto = prod);
      }
    });
  }

  private processarDados(os: OrdemServico): void {
    if (!os.cortes && os.itens) {
      const cortesMap: Record<string, CorteItem[]> = {};
      os.itens.forEach(item => {
        const num = item.corte != null && item.corte !== '' ? String(item.corte) : '—';
        if (!cortesMap[num]) cortesMap[num] = [];
        cortesMap[num].push(item);
      });
      os.cortes = Object.keys(cortesMap).sort().map(num => ({ numero: num, itens: cortesMap[num] }));
    }
  }

  private calcTotais(os: OrdemServico): Omit<OsDados, 'os'> {
    let totalPecas = 0, totalVolumes = 0;
    const totaisPorTamanho: Record<string, number> = {};

    os.cortes?.forEach(corte => {
      corte.itens.forEach(item => {
        const vol = Number(item.volumes ?? item.pacotes ?? 0);
        const ppv = Number(item.pecasPorVolume ?? item.pecasPorPacote ?? 0);
        const pecas = vol * ppv;
        totalPecas += pecas;
        totalVolumes += vol;
        let tam = (item.tamanho ?? 'U').toUpperCase();
        totaisPorTamanho[tam] = (totaisPorTamanho[tam] || 0) + pecas;
      });
    });

    return {
      totalPecas,
      totalDuzias: Math.ceil(totalPecas / 12),
      totalVolumes,
      totaisPorTamanho,
      retorno: Math.floor(totalPecas * 0.98)
    };
  }

  getCodigosUnicos(os?: OrdemServico): string {
    if (!os?.itens) return '';
    const codigos = new Set<string>();
    os.itens.forEach(item => {
      const cod = item.produto?.codigo || item.produtoCodigo;
      if (cod) codigos.add(String(cod));
    });
    return Array.from(codigos).join(', ');
  }

  imprimir(): void { window.print(); }
}