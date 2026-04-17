// src/app/components/envio-materiais/envio-materiais.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MovimentacaoMaterialService } from '../../services/movimentacao-material.service';

interface MaterialPai {
  id: number;
  nome: string;
  unidadeMedida?: string;
  quantidade?: string | number;
  valorUnitario?: string | number;
  preco?: string | number;
  precoVenda?: string | number;
}

interface EstoqueMaterialView {
  id?: number;
  materialId: number;
  quantidade: string | number;
  materialPai?: MaterialPai;
  // some backends put 'material' nested differently; keep opcional
  material?: MaterialPai;
  nome?: string;
}

interface Confeccao { id: number; nome: string; }

export interface Movimentacao {
  id?: number;
  materialId: number;
  quantidade: number | string;
  tipo: 'entrada' | 'saida';
  confeccaoId?: number | null;
  usuarioId?: number | null;
  valorUnitario?: number | string | null;
  emAberto?: boolean;
  observacao?: string | null;
  data?: string;
  createdAt?: string;
  updatedAt?: string;

  materialPai?: MaterialPai | null;
  confeccao?: Confeccao | null;
  usuario?: { id?: number; nome?: string } | null;

  selecionado?: boolean;

  // propriedades auxiliares calculadas no front
  materialNome?: string; // **USAR para impressão** (evita imprimir ID)
  valorUnitarioNumber?: number;
}

@Component({
  selector: 'app-envio-materiais',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './envio-materiais.html',
  styleUrls: ['./envio-materiais.scss']
})
export class EnvioMateriaisComponent implements OnInit {
  public Math = Math;

  form = new FormGroup({
    materialId: new FormControl<number | ''>('', Validators.required),
    tipo: new FormControl<'entrada' | 'saida'>('entrada', Validators.required),
    quantidade: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
    confeccao: new FormControl<number | ''>(''),
    emAberto: new FormControl<boolean>(true)
  });

  estoques: EstoqueMaterialView[] = [];
  confeccoes: Confeccao[] = [];
  movimentacoes: Movimentacao[] = [];
  movimentacoesFiltradas: Movimentacao[] = [];
  movimentacoesPagina: Movimentacao[] = [];

  filtroMaterial = '';
  filtroTipo: '' | 'entrada' | 'saida' = '';
  filtroDataInicio: string | null = null;
  filtroDataFim: string | null = null;

  page = 1;
  pageSize = 10;
  submitting = false;
  downloading = false;
  selecionarTodos = false;

  userRole: 'admin' | 'user' = 'user';
  userData: any = null;

  constructor(
    private api: ApiService,
    private movService: MovimentacaoMaterialService
  ) {}

  ngOnInit(): void {
    this.carregarUsuario();
    this.loadEstoques();
    this.loadConfeccoes();
    this.loadMovimentacoes();
  }

  // ---------------------------
  // Usuário
  // ---------------------------
  private carregarUsuario(): void {
    try {
      const sessionUser = sessionStorage.getItem('user');
      const localUser = localStorage.getItem('user');
      this.userData = JSON.parse(sessionUser ?? localUser ?? '{}');

      const roleStr = String(this.userData?.role ?? '').toLowerCase();
      this.userRole = roleStr === 'admin' ? 'admin' : 'user';
    } catch (e) {
      console.error('[carregarUsuario] erro parse user:', e);
      this.userRole = 'user';
      this.userData = {};
    }
  }

  // ---------------------------
  // Carregamento de dados
  // ---------------------------
  loadEstoques(): void {
    this.api.get('estoque/materiais').subscribe({
      next: (res: any) => {
        this.estoques = Array.isArray(res) ? res : res?.estoques ?? [];
        // se já temos movimentacoes carregadas, atualize materialNome delas
        this.updateMaterialNomesFromEstoques();
      },
      error: (err) => {
        console.error('[loadEstoques] erro', err);
        this.estoques = [];
      }
    });
  }

  loadConfeccoes(): void {
    this.api.get('confeccoes').subscribe({
      next: (res: any) => { this.confeccoes = Array.isArray(res) ? res : res?.confeccoes ?? []; },
      error: (err) => { console.error('[loadConfeccoes] erro', err); this.confeccoes = []; }
    });
  }

  loadMovimentacoes(): void {
    this.movService.listar().subscribe({
      next: (res: Movimentacao[] | any) => {
        const arr: any[] = Array.isArray(res) ? res : res?.movimentacoes ?? res?.data ?? [];
        // normaliza cada movimentacao e calcula materialNome
        this.movimentacoes = arr.map((m: any) => {
          const base: Movimentacao = {
            id: m.id,
            materialId: Number(m.materialId ?? m.material?.id ?? m.materialId ?? 0),
            quantidade: m.quantidade ?? m.qty ?? 0,
            tipo: (m.tipo ?? 'entrada'),
            confeccaoId: m.confeccaoId ?? m.ConfeccaoId ?? m.confeccao?.id ?? null,
            usuarioId: m.usuarioId ?? m.usuario?.id ?? null,
            valorUnitario: m.valorUnitario ?? m.valor_unitario ?? null,
            emAberto: m.emAberto !== undefined ? !!m.emAberto : (m.acertado === undefined ? true : !m.acertado),
            observacao: m.observacao ?? null,
            data: m.data ?? m.createdAt ?? new Date().toISOString(),
            createdAt: m.createdAt ?? m.data ?? undefined,
            updatedAt: m.updatedAt ?? undefined,
            materialPai: m.materialPai ?? m.Material ?? m.material ?? null,
            confeccao: m.confeccao ?? m.Confeccao ?? null,
            usuario: m.usuario ?? null,
            selecionado: m.selecionado ?? false
          };

          // materialNome: prioridade
          base.materialNome = this.resolveMaterialNome(base, m);
          base.valorUnitarioNumber = this.valueToNumber(base.valorUnitario ?? this.getMaterialValorUnitario(base.materialId));

          return base;
        });

        // caso los estoques já carregados, garantir que nomes reflitam
        this.updateMaterialNomesFromEstoques();
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('[loadMovimentacoes] erro', err);
        this.movimentacoes = [];
        this.movimentacoesFiltradas = [];
        this.movimentacoesPagina = [];
      }
    });
  }

  // Fallbacks para nome do material (garante que não saia ID)
  private resolveMaterialNome(base: Movimentacao, raw: any): string {
    // 1) se veio materialPai.nome
    if (base.materialPai && base.materialPai.nome) return String(base.materialPai.nome);

    // 2) se veio objeto Material ou material
    if (raw?.Material?.nome) return String(raw.Material.nome);
    if (raw?.material?.nome) return String(raw.material.nome);

    // 3) se já existia uma propriedade materialNome no objeto bruto
    if (raw?.materialNome) return String(raw.materialNome);
    if (raw?.nomeMaterial) return String(raw.nomeMaterial);

    // 4) buscar no estoques carregados (procura por materialId)
    const est = this.estoques.find(e => Number(e.materialId) === Number(base.materialId));
    if (est) {
      if (est.materialPai && est.materialPai.nome) return String(est.materialPai.nome);
      if (est.material && est.material.nome) return String(est.material.nome);
      if (est.nome) return String(est.nome);
    }

    // 5) última alternativa: '#<id>' (apenas se nada encontrado)
    return '#' + base.materialId;
  }

  // atualiza materialNome de movimentacoes com os dados atuais de estoques
  private updateMaterialNomesFromEstoques(): void {
    if (!this.estoques?.length || !this.movimentacoes?.length) return;
    this.movimentacoes.forEach(m => {
      const est = this.estoques.find(e => Number(e.materialId) === Number(m.materialId));
      if (est) {
        const nome = est.materialPai?.nome ?? est.material?.nome ?? est.nome;
        if (nome) m.materialNome = String(nome);
      }
    });
  }

  // ---------------------------
  // Utilitários gerais
  // ---------------------------
  private getDateObj(item: { data?: string; createdAt?: string } | any): Date {
    return new Date(item?.data ?? item?.createdAt ?? new Date());
  }

  getDateString(item: { data?: string; createdAt?: string } | any): string {
    return this.getDateObj(item).toLocaleString();
  }

  getMaterialValorUnitario(materialId: number): number {
    const e = this.estoques.find(x => Number(x.materialId) === Number(materialId));
    const raw = e?.materialPai?.valorUnitario ?? e?.materialPai?.preco ?? e?.materialPai?.precoVenda ?? e?.material?.valorUnitario ?? 0;
    const num = Number(raw ?? 0);
    return Number.isFinite(num) ? num : 0;
  }

  valueToNumber(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private formatCurrency(v: number | string): string {
    const n = Number(v || 0) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ---------------------------
  // Submit (criar movimentação)
  // ---------------------------
  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;

    const tipoRaw = this.form.get('tipo')?.value;
    if (tipoRaw !== 'entrada' && tipoRaw !== 'saida') {
      this.submitting = false;
      return;
    }
    const tipoValue: 'entrada' | 'saida' = tipoRaw;

    const materialId = Number(this.form.get('materialId')?.value ?? 0);
    const quantidade = Number(this.form.get('quantidade')?.value ?? 0);
    const confeccaoRaw = this.form.get('confeccao')?.value;
    const confeccaoId = (tipoValue === 'saida' && confeccaoRaw) ? Number(confeccaoRaw) : undefined;
    const emAbertoVal = !!this.form.get('emAberto')?.value;

    const payload: Omit<Movimentacao, 'id'> = {
      materialId,
      tipo: tipoValue,
      quantidade,
      confeccaoId,
      usuarioId: this.userData?.id ?? undefined,
      valorUnitario: this.getMaterialValorUnitario(materialId),
      emAberto: emAbertoVal,
      data: new Date().toISOString()
    };

    this.movService.criar(payload as any).subscribe({
      next: (res: any) => {
        const novaMov: Movimentacao = {
          id: res?.id ?? undefined,
          ...payload,
          selecionado: false,
          materialPai: this.estoques.find(e => e.materialId === materialId)?.materialPai ?? null,
          confeccao: tipoValue === 'saida'
            ? this.confeccoes.find(c => c.id === payload.confeccaoId) ?? null
            : null,
          materialNome: undefined // será preenchido abaixo
        };

        // preencher materialNome usando mesmas regras
        novaMov.materialNome = this.resolveMaterialNome(novaMov, res ?? {});

        this.movimentacoes.unshift(novaMov);
        this.aplicarFiltros();

        // atualiza estoque localmente
        const estoque = this.estoques.find(e => e.materialId === materialId);
        if (estoque) {
          estoque.quantidade = tipoValue === 'entrada'
            ? Number(estoque.quantidade) + quantidade
            : Number(estoque.quantidade) - quantidade;
        }

        this.form.reset({ tipo: 'entrada', quantidade: 1, materialId: '', confeccao: '', emAberto: true });
      },
      error: (err) => {
        alert('Erro ao registrar movimentação: ' + (err?.error?.error ?? err?.message ?? err));
      },
      complete: () => { this.submitting = false; }
    });
  }

  // ---------------------------
  // Propriedades calculadas / paginação
  // ---------------------------
  get hasSaidaNaPagina(): boolean {
    return this.movimentacoesPagina?.some(m => m.tipo === 'saida') ?? false;
  }

  aplicarFiltros(): void {
    let arr = [...this.movimentacoes];

    if (this.filtroMaterial?.trim())
      arr = arr.filter(m => (m.materialNome ?? m.materialPai?.nome ?? '').toLowerCase().includes(this.filtroMaterial.toLowerCase()));

    if (this.filtroTipo)
      arr = arr.filter(m => m.tipo === this.filtroTipo);

    if (this.filtroDataInicio) {
      const start = new Date(this.filtroDataInicio);
      arr = arr.filter(m => this.getDateObj(m) >= start);
    }

    if (this.filtroDataFim) {
      const end = new Date(this.filtroDataFim);
      end.setHours(23, 59, 59, 999);
      arr = arr.filter(m => this.getDateObj(m) <= end);
    }

    arr.sort((a, b) => Number(this.getDateObj(b)) - Number(this.getDateObj(a)));
    this.movimentacoesFiltradas = arr;
    this.page = 1;
    this.atualizarPagina();
    this.selecionarTodos = this.movimentacoesFiltradas.length > 0 && this.movimentacoesFiltradas.every(m => !!m.selecionado);
  }

  limparFiltros(): void {
    this.filtroMaterial = '';
    this.filtroTipo = '' as any;
    this.filtroDataInicio = null;
    this.filtroDataFim = null;
    this.aplicarFiltros();
  }

  atualizarPagina(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.movimentacoesPagina = this.movimentacoesFiltradas.slice(start, end);
  }

  paginaAnterior(): void {
    if (this.page > 1) { this.page--; this.atualizarPagina(); }
  }

  paginaProxima(): void {
    if (this.page < Math.ceil(this.movimentacoesFiltradas.length / this.pageSize)) { this.page++; this.atualizarPagina(); }
  }

  // ---------------------------
  // Seleção
  // ---------------------------
  // aceita parâmetro opcional para compatibilidade com (change)="onSelecionadoChange(m)"
  onSelecionadoChange(m?: Movimentacao): void {
    // se foi passado o item, já foi marcado no template — apenas atualiza flag geral
    this.selecionarTodos = this.movimentacoesFiltradas.length > 0 && this.movimentacoesFiltradas.every(item => !!item.selecionado);
  }

  toggleSelecionadoMov(m: Movimentacao): void {
    m.selecionado = !m.selecionado;
    this.onSelecionadoChange();
  }

  selecionarTodosMov(checked: boolean): void {
    this.movimentacoesFiltradas.forEach(m => m.selecionado = checked);
    this.selecionarTodos = checked;
    this.atualizarPagina();
  }

  // ---------------------------
  // Toggle Em Aberto / Status / Deletar
  // ---------------------------
  toggleEmAberto(m: Movimentacao, checked: boolean): void {
    const novoValor = !checked; // se a checkbox representa "acertado", inverte
    if (m.id == null) {
      m.emAberto = novoValor;
      return;
    }
    this.movService.atualizar(m.id!, { emAberto: novoValor }).subscribe({
      next: (res: any) => { m.emAberto = res?.emAberto ?? novoValor; },
      error: (err) => {
        alert('Erro ao atualizar status: ' + (err?.error?.error ?? err?.message ?? err));
        this.loadMovimentacoes();
      }
    });
  }

  getStatus(m: Movimentacao): string {
    return m.emAberto ? 'Aberto' : 'Acertado';
  }

deletarSelecionados(): void {
    // 1. Filtra apenas os itens selecionados que possuem ID (evita o erro /undefined)
    const selecionados = this.movimentacoes.filter(m => m.selecionado && m.id != null);

    if (selecionados.length === 0) {
      alert('Nenhum registro válido selecionado para exclusão.');
      return;
    }

    // 2. Confirmação de segurança
    const confirmText = prompt(`Você está prestes a deletar ${selecionados.length} registro(s) e ESTORNAR o estoque. Digite CONFIRMAR:`);
    if (confirmText?.toUpperCase() !== 'CONFIRMAR') {
      alert('Ação cancelada.');
      return;
    }

    this.submitting = true;
    const erros: string[] = [];

    // 3. Criamos o array de Promises para processar as exclusões
    const promises = selecionados.map(m => {
      // É seguro usar m.id! aqui porque filtramos acima
      return this.movService.deletar(m.id!).toPromise()
        .then(() => {
          // --- LÓGICA DE ESTORNO NO ESTOQUE LOCAL ---
          const estoque = this.estoques.find(e => Number(e.materialId) === Number(m.materialId));
          
          if (estoque) {
            const qtdMovimentada = Number(m.quantidade) || 0;
            
            // Se deletamos uma SAÍDA, o material deve VOLTAR ao estoque (+)
            // Se deletamos uma ENTRADA, o material deve SAIR do estoque (-)
            if (m.tipo === 'saida') {
              estoque.quantidade = Number(estoque.quantidade) + qtdMovimentada;
            } else if (m.tipo === 'entrada') {
              estoque.quantidade = Number(estoque.quantidade) - qtdMovimentada;
            }
          }
          
          // Remove o item da lista principal após sucesso no back-end
          this.movimentacoes = this.movimentacoes.filter(item => item.id !== m.id);
        })
        .catch(err => {
          console.error(`Erro ao deletar registro ${m.id}:`, err);
          erros.push(`ID #${m.id}: ${err?.error?.error || err?.message || 'Erro interno'}`);
        });
    });

    // 4. Executa todas as exclusões
    Promise.all(promises).then(() => {
      this.submitting = false;

      if (erros.length > 0) {
        alert('Alguns itens não puderam ser deletados:\n' + erros.join('\n'));
      } else {
        alert('Itens deletados e estoque atualizado com sucesso!');
      }

      // Atualiza a visualização e filtros
      this.aplicarFiltros();
      
      // Reseta a seleção global
      this.selecionarTodos = false;
    });
  }
  // ---------------------------
  // RELATÓRIO FINANCEIRO E VALE (impressão)
  // ---------------------------
  gerarPdfFinanceiro(): void {
    if (this.userRole !== 'admin') {
      alert('Apenas administradores podem gerar relatório financeiro.');
      return;
    }

    this.downloading = true;

    // selecionados: apenas saídas
    const selecionados = this.movimentacoesFiltradas.filter(m => m.selecionado && m.tipo === 'saida');
    if (!selecionados.length) {
      alert('Nenhum item selecionado.');
      this.downloading = false;
      return;
    }

    // agrupa por confeccaoId
    const grupos = new Map<number | string, { nome: string; items: Movimentacao[]; subtotal: number }>();
    selecionados.forEach(m => {
      const id = m.confeccaoId ?? 'null';
      const nome = m.confeccao?.nome ?? 'Sem Destino';
      const valorUnit = this.valueToNumber(m.valorUnitario ?? m.valorUnitarioNumber);
      const qtd = Number(m.quantidade) || 0;
      const linhaTotal = valorUnit * qtd;

      if (!grupos.has(id)) {
        grupos.set(id, { nome, items: [], subtotal: 0 });
      }
      const g = grupos.get(id)!;
      g.items.push(m);
      g.subtotal += linhaTotal;
    });

    const nowStr = new Date().toLocaleString();
    const css = `
      <style>
        body { font-family: Arial, Helvetica, sans-serif; margin: 12px; color:#111; }
        .title { text-align:center; margin-bottom:8px; }
        .meta { text-align:right; font-size:0.9rem; margin-bottom:12px; }
        table { width:100%; border-collapse: collapse; margin-bottom:18px; font-size:0.92rem;}
        th, td { border:1px solid #333; padding:6px 8px; text-align:left; }
        th { background:#f2f2f2; font-weight:700; }
        .right { text-align:right; }
        .subtotal { font-weight:700; background:#fafafa; }
        h3 { margin:8px 0; }
        @media print {
          body { margin:6mm; font-size:11px; }
          table { page-break-inside: avoid; }
        }
      </style>
    `;

    let bodyHtml = `<div class="title"><h2>Relatório Financeiro de Materiais</h2></div>`;
    bodyHtml += `<div class="meta">Emitido: ${nowStr}</div>`;

    let totalGeral = 0;
    grupos.forEach((grupo) => {
      bodyHtml += `<h3>Oficina / Confecção: ${this.escapeHtml(grupo.nome)}</h3>`;
      bodyHtml += `
        <table>
          <thead>
            <tr>
              <th style="width:12%;">Data</th>
              <th>Material</th>
              <th style="width:10%;" class="right">Qtd</th>
              <th style="width:16%;" class="right">Valor Unit.</th>
              <th style="width:16%;" class="right">Total</th>
            </tr>
          </thead>
          <tbody>
      `;

      grupo.items.forEach(item => {
        const dataCurta = this.getDateObj(item).toLocaleDateString('pt-BR');
        const nomeMaterial = item.materialNome ?? item.materialPai?.nome ?? ('#' + item.materialId);
        const qtd = Number(item.quantidade) || 0;
        const valorUnit = this.valueToNumber(item.valorUnitario ?? item.valorUnitarioNumber);
        const totalLinha = valorUnit * qtd;
        bodyHtml += `
          <tr>
            <td>${dataCurta}</td>
            <td>${this.escapeHtml(nomeMaterial)}</td>
            <td class="right">${qtd}</td>
            <td class="right">${this.formatCurrency(valorUnit)}</td>
            <td class="right">${this.formatCurrency(totalLinha)}</td>
          </tr>
        `;
      });

      bodyHtml += `
          </tbody>
          <tfoot>
            <tr class="subtotal">
              <td colspan="4" class="right">Subtotal - ${this.escapeHtml(grupo.nome)}:</td>
              <td class="right">${this.formatCurrency(grupo.subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      `;
      totalGeral += grupo.subtotal;
    });

    bodyHtml += `<h3>Total Geral: ${this.formatCurrency(totalGeral)}</h3>`;

    const html = `<html><head><meta charset="utf-8">${css}</head><body>${bodyHtml}</body></html>`;
    this.openPrintWindowAndPrint(html);
    this.downloading = false;
  }

  gerarPdfSelecionados(): void {
    // gera o vale/movimentação (vias) — garante mostrar materialNome
    this.downloading = true;
    const selecionados = this.movimentacoes.filter(m => !!m.selecionado);
    if (!selecionados.length) {
      alert('Nenhum item selecionado.');
      this.downloading = false;
      return;
    }

    const nowStr = new Date().toLocaleString();
    const css = `
      <style>
        :root { --m:10px; --box-h:70px; font-family: Arial, Helvetica, sans-serif; color:#111; }
        body { margin: 12px; -webkit-print-color-adjust: exact; }
        .header { text-align:center; margin-bottom:8px; }
        .meta { font-size:0.9rem; margin-bottom:12px; }
        .item { display:flex; gap:12px; margin-bottom:12px; page-break-inside: avoid; }
        .via { border:1px solid #333; padding:8px; width:100%; min-height: var(--box-h); box-sizing:border-box; }
        .titulo { font-weight:700; margin-bottom:6px; font-size:0.95rem; }
        .linha { font-size:0.9rem; margin-bottom:4px; }
        .assinatura { margin-top:10px; border-top:1px dashed #333; text-align:center; padding-top:4px; font-size:0.85rem; }
        @media print {
          body { margin:6mm; }
          .item { page-break-inside: avoid; }
        }
      </style>
    `;

    let bodyHtml = `
      <div class="header">
        <h2>Relatório de Movimentações - Vias</h2>
        <div class="meta">Emitido: ${nowStr}</div>
      </div>
    `;

    selecionados.forEach(m => {
      const dataCurta = this.getDateObj(m).toLocaleDateString('pt-BR');
      const nomeMaterial = m.materialNome ?? m.materialPai?.nome ?? ('#' + m.materialId);
      const qtd = Number(m.quantidade) || 0;
      const tipo = m.tipo ?? '';
      const confeccaoNome = m.confeccao?.nome ?? '';

      bodyHtml += `
        <div class="item">
          <div class="via">
            <div class="titulo">Via Externa</div>
            <div class="linha"><strong>Data:</strong> ${dataCurta}</div>
            <div class="linha"><strong>Material:</strong> ${this.escapeHtml(nomeMaterial)}</div>
            <div class="linha"><strong>Qtd:</strong> ${qtd} &nbsp; | &nbsp; <strong>Tipo:</strong> ${tipo}</div>
            <div class="linha"><strong>Confecção:</strong> ${this.escapeHtml(confeccaoNome)}</div>
          </div>
          <div class="via">
            <div class="titulo">Via Interna</div>
            <div class="linha"><strong>Data:</strong> ${dataCurta}</div>
            <div class="linha"><strong>Material:</strong> ${this.escapeHtml(nomeMaterial)}</div>
            <div class="linha"><strong>Qtd:</strong> ${qtd} &nbsp; | &nbsp; <strong>Tipo:</strong> ${tipo}</div>
            <div class="linha"><strong>Confecção:</strong> ${this.escapeHtml(confeccaoNome)}</div>
            <div class="assinatura">Assinatura do Recebedor</div>
          </div>
        </div>
      `;
    });

    const html = `<html><head><meta charset="utf-8">${css}</head><body>${bodyHtml}</body></html>`;
    this.openPrintWindowAndPrint(html);
    this.downloading = false;
  }

  gerarRelatorioEstoqueAtual(): void {
  this.downloading = true;

  if (!this.estoques || this.estoques.length === 0) {
    alert('Não há dados de estoque para gerar o relatório.');
    this.downloading = false;
    return;
  }

  const nowStr = new Date().toLocaleString();
  const css = `
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
      .header { text-align: center; border-bottom: 2px solid #444; margin-bottom: 20px; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
      th { background-color: #f4f4f4; font-weight: bold; text-transform: uppercase; font-size: 0.85rem; }
      tr:nth-child(even) { background-color: #fafafa; }
      .text-right { text-align: right; }
      .footer { margin-top: 30px; font-size: 0.8rem; text-align: right; color: #666; }
      .qtd-alerta { color: #d9534f; font-weight: bold; }
    </style>
  `;

  let tableRows = '';
  let valorTotalEstoque = 0;

  // Ordenar estoques por nome do material
  const estoqueOrdenado = [...this.estoques].sort((a, b) => {
    const nomeA = a.materialPai?.nome ?? a.material?.nome ?? a.nome ?? '';
    const nomeB = b.materialPai?.nome ?? b.material?.nome ?? b.nome ?? '';
    return nomeA.localeCompare(nomeB);
  });

  estoqueOrdenado.forEach(item => {
    const nome = item.materialPai?.nome ?? item.material?.nome ?? item.nome ?? 'Sem Nome';
    const qtd = Number(item.quantidade) || 0;
    const valorUnit = this.getMaterialValorUnitario(item.materialId);
    const subtotal = qtd * valorUnit;
    valorTotalEstoque += subtotal;

    tableRows += `
      <tr>
        <td>${this.escapeHtml(nome)}</td>
        <td>${this.escapeHtml(item.materialPai?.unidadeMedida ?? 'un')}</td>
        <td class="text-right ${qtd <= 0 ? 'qtd-alerta' : ''}">${qtd}</td>
      </tr>
    `;
  });

  const bodyHtml = `
    <div class="header">
      <h2>Relatório de Inventário - Estoque de Materiais</h2>
      <p>Data de Emissão: ${nowStr}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Material</th>
          <th>U.M.</th>
          <th class="text-right">Saldo Atual</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr style="background: #eee; font-weight: bold;">
        </tr>
      </tfoot>
    </table>
    <div class="footer">
      Relatório gerado pelo sistema de gestão de materiais.
    </div>
  `;

  const html = `<html><head><meta charset="utf-8">${css}</head><body>${bodyHtml}</body></html>`;
  this.openPrintWindowAndPrint(html);
  this.downloading = false;
}
  // ---------------------------
  // Impressão helper
  // ---------------------------
  private openPrintWindowAndPrint(html: string): void {
    // injeta script para auto-print após load — evita problemas com popup blockers quando usado a partir de clique
    const autoPrintScript = `
      <script>
        window.onload = function() {
          try {
            window.focus();
            setTimeout(function(){ window.print(); }, 150);
          } catch(e) {}
        };
      </script>
    `;
    let final = html;
    if (final.indexOf('</body>') !== -1) final = final.replace('</body>', `${autoPrintScript}</body>`);
    else final += autoPrintScript;

    let printWindow: Window | null = null;
    try { printWindow = window.open('', '_blank'); } catch { printWindow = null; }

    if (printWindow) {
      try {
        printWindow.document.open();
        printWindow.document.write(final);
        printWindow.document.close();
      } catch (err) {
        try { printWindow.close(); } catch (_) {}
        printWindow = null;
      }
    }

    if (!printWindow) {
      // fallback: blob + anchor
      const blob = new Blob([final], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      try {
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      } catch (e) {
        try { document.body.removeChild(a); } catch (_) {}
      }
      try {
        window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch (e) {
        alert('Não foi possível abrir janela de impressão automaticamente. Verifique bloqueadores de pop-ups.');
      }
    }
  }

  // ---------------------------
  // Sanitização
  // ---------------------------
  private escapeHtml(s: any): string {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
