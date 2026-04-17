import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FinanceiroService } from '../../services/financeiro.service';

interface FinanceiroRegistro {
  id: number;
  produtoId?: number;
  ordemId: number | string;
  confeccaoId?: number | string | null;
  confeccaoNome?: string | null;
  produtoCodigo?: string;
  quantidade?: number;
  valorMaoDeObra: number;
  status: string;
  dataLancamento: string;
}

interface RelatorioPorConfeccao {
  confeccaoId?: number | string | null;
  confeccaoNome: string;
  totalPecasEsperadas: number;
  totalPecasComMargem: number;
  totalPecasProduzidas: number;
  totalDuzias: number;
  totalValor: number;
  ordensCount: number;
  inconsistencias: number;
  ordensDetalhadas: any[];
}

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './financeiro.html',
  styleUrls: ['./financeiro.scss']
})
export class Financeiro implements OnInit {

  registros: FinanceiroRegistro[] = [];
  filteredRegistros: FinanceiroRegistro[] = [];
  paginatedRegistros: FinanceiroRegistro[] = [];
  report: RelatorioPorConfeccao[] = [];
  selectedOrdemIds: Set<number> = new Set();
  loading = false;
  error: string | null = null;
  updatingId: number | null = null;
  today: Date = new Date();

  page = 1;
  pageSize = 15;
  totalPages = 1;

  filterFrom: string | null = null;
  filterTo: string | null = null;

  constructor(private svc: FinanceiroService) {}

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    this.loading = true;
    this.error = null;
    try {
      const resp: any = await firstValueFrom(this.svc.listar());
      this.registros = (resp?.registros || []).slice().sort((a: any, b: any) =>
        new Date(b.dataLancamento).getTime() - new Date(a.dataLancamento).getTime()
      );
      this.applyDateFilter();
    } catch (err) {
      console.error(err);
      this.error = 'Não foi possível conectar ao servidor backend.';
    } finally {
      this.loading = false;
    }
  }

  // --- FILTROS E PAGINAÇÃO ---

  applyDateFilter() {
    let fromTime: number | null = null;
    let toTime: number | null = null;

    if (this.filterFrom) {
      const d = new Date(this.filterFrom);
      fromTime = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0).getTime();
    }

    if (this.filterTo) {
      const d = new Date(this.filterTo);
      toTime = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999).getTime();
    }

    this.filteredRegistros = this.registros.filter(r => {
      const t = new Date(r.dataLancamento).getTime();
      if (fromTime !== null && t < fromTime) return false;
      if (toTime !== null && t > toTime) return false;
      return true;
    });

    this.totalPages = Math.max(1, Math.ceil(this.filteredRegistros.length / this.pageSize));
    this.page = 1;
    this.updatePaginated();
  }

  clearFilter() {
    this.filterFrom = null;
    this.filterTo = null;
    this.applyDateFilter();
  }

  updatePaginated() {
    const start = (this.page - 1) * this.pageSize;
    this.paginatedRegistros = this.filteredRegistros.slice(start, start + this.pageSize);
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.updatePaginated();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.updatePaginated();
    }
  }

  // --- MÉTODOS DE SELEÇÃO (ESSENCIAIS PARA O TEMPLATE) ---

  isSelected(r: FinanceiroRegistro) {
    return this.selectedOrdemIds.has(Number(r.ordemId));
  }

  toggleSelecionar(r: FinanceiroRegistro, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedOrdemIds.add(Number(r.ordemId));
    } else {
      this.selectedOrdemIds.delete(Number(r.ordemId));
    }
  }

  allSelected(): boolean {
    return this.paginatedRegistros.length > 0 &&
      this.paginatedRegistros.every(r => this.selectedOrdemIds.has(Number(r.ordemId)));
  }

  someSelected(): boolean {
    const count = this.paginatedRegistros.filter(r =>
      this.selectedOrdemIds.has(Number(r.ordemId))
    ).length;
    return count > 0 && count < this.paginatedRegistros.length;
  }

  toggleSelectAll(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.paginatedRegistros.forEach(r => {
      if (checked) {
        this.selectedOrdemIds.add(Number(r.ordemId));
      } else {
        this.selectedOrdemIds.delete(Number(r.ordemId));
      }
    });
  }

  // --- MÉTODOS DE FORMATAÇÃO E TOTAIS (PARA O HTML) ---

  formatCurrency(valor: number | string) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatDate(dt: string | undefined | null) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('pt-BR');
  }

  totalPecas() {
    return this.report.reduce((s, r) => s + (r.totalPecasProduzidas || 0), 0);
  }

  totalDuzias() {
    return this.report.reduce((s, r) => s + (r.totalDuzias || 0), 0);
  }

  totalValor() {
    const total = this.report.reduce((s, r) => s + (r.totalValor || 0), 0);
    return this.formatCurrency(total);
  }

  totalOrdens() {
    return this.report.reduce((s, r) => s + (r.ordensCount || 0), 0);
  }

  // --- AÇÕES DE NEGÓCIO ---

  async confirmToggleStatus(r: FinanceiroRegistro, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const novoStatus = checked ? 'PAGO' : 'ABERTO';
    
    if (!confirm(`Confirma marcar a OS #${r.ordemId} como ${novoStatus}?`)) {
      (ev.target as HTMLInputElement).checked = !checked;
      return;
    }

    this.updatingId = r.id;
    try {
      await firstValueFrom(this.svc.atualizarStatus(r.id, novoStatus));
      r.status = novoStatus;
    } catch (err) {
      alert('Erro ao atualizar status.');
      (ev.target as HTMLInputElement).checked = !checked;
    } finally {
      this.updatingId = null;
    }
  }

  async gerarRelatorioSelecionados() {
    if (this.selectedOrdemIds.size === 0) {
      alert('Selecione ao menos uma Ordem de Serviço.');
      return;
    }
    this.loading = true;
    try {
      const ids = Array.from(this.selectedOrdemIds).map(Number);
      const resp: any = await firstValueFrom(this.svc.gerarRelatorio(ids));
      if (resp && resp.success) {
        this.report = resp.report;
        this.today = new Date();
        alert('Relatório de auditoria gerado com sucesso!');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar auditoria no servidor.');
    } finally {
      this.loading = false;
    }
  }

  baixarPdf() {
    if (!this.report.length) {
      alert('Gere o relatório de auditoria antes de visualizar.');
      return;
    }

    const htmlSections = this.report.map(oficina => {
      const rows = (oficina.ordensDetalhadas || []).map(o => {
        // Regra atualizada: Se esperado é 100, a meta real para bônus é 98 (2% margem)
        const metaCalculada = o.esperado * 0.98;
        const pecasDiferenca = o.real - metaCalculada;
        
        // Valor unitário p/ bônus (Baseado no valor total / real produzido)
        const valorUnitario = o.real > 0 ? (o.valor / o.real) : 0;
        const valorBonusOnus = pecasDiferenca * valorUnitario;

        const corDiferenca = pecasDiferenca < 0 ? '#d32f2f' : (pecasDiferenca > 0 ? '#2e7d32' : '#333');
        const sinal = pecasDiferenca > 0 ? '+' : '';

        return `
          <tr>
            <td>OS #${o.ordemId}</td>
            <td class="center">${o.real} pçs</td>
            <td class="center" style="color: ${corDiferenca}; font-weight: bold;">
              ${sinal}${pecasDiferenca.toFixed(2)}
            </td>
            <td class="right" style="color: ${corDiferenca};">
              ${sinal}${this.formatCurrency(valorBonusOnus)}
            </td>
            <td class="right" style="font-weight: bold;">${this.formatCurrency(o.valor)}</td>
          </tr>
        `;
      }).join('');

      // Totais por oficina para o PDF
      const totalDifOficina = (oficina.ordensDetalhadas || []).reduce((acc, o) => acc + (o.real - (o.esperado * 0.98)), 0);
      const totalBonusOficina = (oficina.ordensDetalhadas || []).reduce((acc, o) => {
        const vUnit = o.real > 0 ? (o.valor / o.real) : 0;
        return acc + ((o.real - (o.esperado * 0.98)) * vUnit);
      }, 0);

      return `
        <div class="oficina-block">
          <div class="oficina-header">
            <span><strong>OFICINA:</strong> ${oficina.confeccaoNome}</span>
            <span><strong>ID:</strong> ${oficina.confeccaoId || 'N/A'}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ordem de Serviço</th>
                <th class="center">Produção Real</th>
                <th class="center">Peças de Saldo (Margem 2%)</th>
                <th class="right">Bônus/Ônus</th>
                <th class="right">Valor Líquido</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr class="summary-row">
                <td>TOTAIS DA UNIDADE</td>
                <td class="center">${oficina.totalPecasProduzidas} pçs</td>
                <td class="center" style="color: ${totalDifOficina < 0 ? '#d32f2f' : '#2e7d32'}">
                  ${totalDifOficina > 0 ? '+' : ''}${totalDifOficina.toFixed(2)}
                </td>
                <td class="right">${this.formatCurrency(totalBonusOficina)}</td>
                <td class="right">${this.formatCurrency(oficina.totalValor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }).join('');

    const totalGeralLote = this.report.reduce((s, r) => s + (r.totalValor || 0), 0);

    const htmlFinal = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Fechamento Financeiro - Extrato</title>
          <style>
            @media print { .no-print { display: none !important; } body { background: white; padding: 0; } .main-page { box-shadow: none; margin: 0; width: 100%; padding: 10mm; } }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #333; background: #525659; display: flex; flex-direction: column; align-items: center; }
            .no-print { position: fixed; top: 20px; right: 20px; z-index: 99; background: #2c3e50; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
            .main-page { background: white; width: 210mm; min-height: 297mm; padding: 15mm; box-shadow: 0 0 20px rgba(0,0,0,0.5); box-sizing: border-box; }
            .doc-title { text-align: center; font-size: 20px; font-weight: bold; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 25px; color: #2c3e50; }
            .oficina-block { margin-bottom: 35px; }
            .oficina-header { display: flex; justify-content: space-between; background: #f8f9fa; padding: 10px; font-size: 13px; border: 1px solid #dee2e6; border-left: 5px solid #2c3e50; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { background: #f1f3f5; font-size: 11px; text-transform: uppercase; padding: 10px 5px; border: 1px solid #dee2e6; color: #495057; }
            td { padding: 10px 5px; border: 1px solid #dee2e6; font-size: 13px; }
            .right { text-align: right; }
            .center { text-align: center; }
            .summary-row { background: #f8f9fa; font-weight: bold; }
            .lote-footer { margin-top: 40px; padding: 20px; background: #2c3e50; color: white; border-radius: 4px; }
            .lote-total { font-size: 22px; font-weight: bold; display: flex; justify-content: space-between; }
            .rules-text { font-size: 11px; opacity: 0.8; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; }
          </style>
        </head>
        <body>
          <button class="no-print" onclick="window.print()">🖨️ IMPRIMIR EXTRATO</button>
          <div class="main-page">
            <div class="doc-title">EXTRATO DE AUDITORIA DE PRODUÇÃO</div>
            ${htmlSections}
            <div class="lote-footer">
              <div class="lote-total">
                <span>VALOR TOTAL DO LOTE:</span>
                <span>${this.formatCurrency(totalGeralLote)}</span>
              </div>
              <div class="rules-text">
                * O cálculo de bônus/ônus considera a margem de 2% sobre a folha original. | Gerado em: ${new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlFinal], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}