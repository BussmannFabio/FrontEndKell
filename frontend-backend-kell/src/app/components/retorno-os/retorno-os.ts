import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators
} from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { OrdemService } from '../../services/ordem.service';
import { ApiService } from '../../services/api.service';

interface OsItem {
  id?: number | string;
  produtoId: string | number;
  produtoTamanhoId?: number | string | null;
  tamanho?: string;
  volumes?: number;
  pecasPorVolume?: number;
  pecasEsperadas?: number;
  pecasReais?: number; 
  pecasRetornadas?: number; 
  corte?: string;
  pecasComDefeito?: number;
}

// Representa um grupo de itens do mesmo produto fundidos em um único card
interface GrupoItem {
  ids: (number | string)[]; // ids originais dos OrdemItem agrupados
  produtoId: string | number;
  pecasEsperadasTotal: number;
  pecasReaisAcumuladasTotal: number;
  // peso proporcional de cada item original (pecasEsperadas / total)
  pesos: number[];
}

interface Ordem {
  id: number;
  confeccaoId?: string | number;
  dataInicio?: string;
  dataRetorno?: string;
  status?: string;
  itens: OsItem[];
}

interface Produto {
  id: number | string;
  codigo?: string;
  nome?: string;
  tamanhos?: any[];
}

@Component({
  selector: 'app-retorno-os',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './retorno-os.html',
  styleUrls: ['./retorno-os.scss']
})
export class RetornoOsComponent implements OnInit, OnDestroy {
  form: FormGroup | null = null;
  osIdControl = new FormControl<number | null>(null, { validators: Validators.required });
  retornoTotalControl = new FormControl<boolean>(false, { nonNullable: true });

  ordensAbertas: Ordem[] = [];
  detalhesAbertos = new Set<number>();
  confeccoesMap: Record<string, string> = {};
  produtosMap: Record<string, Produto> = {};
  produtosComTamanhosMap: Record<string, Produto> = {};
  
  loadingList = false;
  loadingBusca = false;
  submitting = false;
  error: string | null = null;
  lastUpdated: Date | null = null;

  pageSize = 15; 
  currentPage = 1; 
  totalPages = 1;

  private subs: Subscription[] = [];
  private _emptyFormArray?: FormArray;

  constructor(
    private fb: FormBuilder,
    private ordemService: OrdemService,
    private api: ApiService
  ) { }

  ngOnInit(): void {
    this.carregarConfeccoes();
    this.carregarProdutos();
    this.carregarOrdensAbertas();

    this.addSub(
      this.retornoTotalControl.valueChanges.subscribe(() => {
        if (!this.form) return;
        this.itens.controls.forEach(ctrl => {
          if (ctrl instanceof FormGroup) {
            this.applyRetornoTotalToControl(ctrl);
          }
        });
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private addSub(s: Subscription) { this.subs.push(s); }

  get itens(): FormArray {
    if (!this.form) {
      if (!this._emptyFormArray) this._emptyFormArray = this.fb.array([]);
      return this._emptyFormArray;
    }
    return this.form.get('itens') as FormArray;
  }

  getControl(i: number): FormGroup {
    return this.itens.at(i) as FormGroup;
  }

  trackById(_: number, os: Ordem) { return os.id; }

  toggleDetalhes(osId: number) {
    if (this.detalhesAbertos.has(osId)) {
      this.detalhesAbertos.delete(osId);
    } else {
      this.detalhesAbertos.add(osId);
    }
  }

  resumoItens(os: Ordem) {
    const pendentes = (os.itens || []).reduce((s, i) => s + ((i.pecasEsperadas ?? 0) - (i.pecasReais ?? 0)), 0);
    return `${os.itens?.length || 0} item(s) • ${pendentes > 0 ? pendentes : 0} pç(s) pend.`;
  }

  getConfeccaoName(id: string | number | undefined | null) {
    return id == null ? '—' : this.confeccoesMap[String(id)] ?? `#${id}`;
  }

  getProdutoCodigo(prodId: string | number | undefined | null) {
    const p = prodId != null ? this.produtosMap[String(prodId)] : null;
    return p?.codigo ?? p?.nome ?? (prodId != null ? `#${prodId}` : '—');
  }

  private carregarConfeccoes(): void {
    this.addSub(
      this.api.get('confeccoes').subscribe({
        next: (dados: any) => {
          const arr = dados?.confeccoes ?? dados ?? [];
          if (Array.isArray(arr)) arr.forEach((c: any) => this.confeccoesMap[String(c.id)] = c.nome);
        }
      })
    );
  }

  private carregarProdutos(): void {
    this.addSub(
      this.api.get('produtos').subscribe({
        next: (dados: any) => {
          const arr = dados?.produtos ?? dados ?? [];
          if (Array.isArray(arr)) arr.forEach((p: any) => this.produtosMap[String(p.id)] = p);
        }
      })
    );
  }

  carregarOrdensAbertas(): void {
    this.loadingList = true;
    this.addSub(
      this.ordemService.listarOrdens().subscribe({
        next: (dados: any) => {
          const arr = Array.isArray(dados) ? dados : (dados?.ordens ?? []);
          this.ordensAbertas = arr.sort((a: Ordem, b: Ordem) => Number(b.id) - Number(a.id));
          this.totalPages = Math.ceil(this.ordensAbertas.length / this.pageSize);
          this.loadingList = false;
        },
        error: () => this.loadingList = false
      })
    );
  }

  get ordensPaginadas(): Ordem[] { 
    const start = (this.currentPage - 1) * this.pageSize; 
    return this.ordensAbertas.slice(start, start + this.pageSize); 
  }
  
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }

  selecionarOS(osId: number) {
    this.osIdControl.setValue(osId);
    this.buscarOS();
  }

  buscarOS(): void {
    const osId = this.osIdControl.value;
    if (!osId) return;
    this.loadingBusca = true;
    this.addSub(
      this.ordemService.buscarOrdemPorId(osId).subscribe({
        next: async (resp: any) => {
          let ordem: Ordem = resp?.ordem ?? resp;
          if (ordem.itens.some(item => !item.produtoTamanhoId)) {
            ordem = await this.corrigirProdutoTamanhoIds(ordem);
          }
          this.buildFormFromOrdem(ordem);
          this.loadingBusca = false;
        },
        error: () => { alert('Erro ao buscar OS'); this.loadingBusca = false; }
      })
    );
  }

  private async corrigirProdutoTamanhoIds(ordem: Ordem): Promise<Ordem> {
    const itensCorrigidos = [];
    for (const item of ordem.itens) {
      if (!item.produtoTamanhoId && item.produtoId && item.tamanho) {
        try {
          const prodId = String(item.produtoId);
          if (!this.produtosComTamanhosMap[prodId]) {
            const data: any = await firstValueFrom(this.api.get(`produtos/${item.produtoId}`));
            this.produtosComTamanhosMap[prodId] = data;
          }
          const prod = this.produtosComTamanhosMap[prodId];
          const found = prod.tamanhos?.find((t: any) => t.tamanho === item.tamanho);
          itensCorrigidos.push(found ? { ...item, produtoTamanhoId: found.id } : item);
        } catch { itensCorrigidos.push(item); }
      } else { itensCorrigidos.push(item); }
    }
    return { ...ordem, itens: itensCorrigidos };
  }

  /**
   * Agrupa os itens da OS por produtoId em um único card de retorno.
   * Itens do mesmo produto têm suas quantidades somadas.
   */
  private agruparItensPorProduto(itens: OsItem[]): GrupoItem[] {
    const mapaGrupos = new Map<string, GrupoItem>();

    for (const it of itens) {
      const chave = String(it.produtoId);
      const esperadas = Number(it.pecasEsperadas ?? 0);
      const reais = Number(it.pecasReais ?? 0);

      if (!mapaGrupos.has(chave)) {
        mapaGrupos.set(chave, {
          ids: [it.id!],
          produtoId: it.produtoId,
          pecasEsperadasTotal: esperadas,
          pecasReaisAcumuladasTotal: reais,
          pesos: [esperadas]
        });
      } else {
        const g = mapaGrupos.get(chave)!;
        g.ids.push(it.id!);
        g.pecasEsperadasTotal += esperadas;
        g.pecasReaisAcumuladasTotal += reais;
        g.pesos.push(esperadas);
      }
    }

    return Array.from(mapaGrupos.values());
  }

  private buildFormFromOrdem(ordem: Ordem): void {
    const grupos = this.agruparItensPorProduto(ordem.itens || []);

    const itensFg = grupos.map(g => {
      return this.fb.group({
        // Armazena os ids originais como JSON para distribuição no payload
        idsOriginais: [JSON.stringify(g.ids)],
        pesosOriginais: [JSON.stringify(g.pesos)],
        produtoId: [g.produtoId],
        pecasEsperadas: [g.pecasEsperadasTotal],
        pecasReaisAcumuladas: [g.pecasReaisAcumuladasTotal],
        pecasRetornadas: [0, [Validators.min(0)]],
        pecasComDefeito: [0, [Validators.min(0)]]
      });
    });

    this.form = this.fb.group({
      id: [ordem.id],
      confeccaoId: [ordem.confeccaoId],
      status: [ordem.status],
      itens: this.fb.array(itensFg)
    });
    this.retornoTotalControl.setValue(false);
  }

  private applyRetornoTotalToControl(ctrl: FormGroup) {
    if (this.retornoTotalControl.value) {
      const esperadas = ctrl.get('pecasEsperadas')?.value ?? 0;
      const jaRetornadas = ctrl.get('pecasReaisAcumuladas')?.value ?? 0;
      const falta = Math.max(0, esperadas - jaRetornadas);
      ctrl.get('pecasRetornadas')?.setValue(falta, { emitEvent: false });
    }
  }

  normalizePecasRetornadas(ctrl: FormGroup): void {
    let valor = Math.trunc(Number(ctrl.get('pecasRetornadas')?.value ?? 0));
    if (valor < 0) valor = 0;
    ctrl.get('pecasRetornadas')?.setValue(valor, { emitEvent: false });
  }

  normalizePecasComDefeito(ctrl: FormGroup): void {
    let defeitos = Math.trunc(Number(ctrl.get('pecasComDefeito')?.value ?? 0));
    const retornadas = Math.trunc(Number(ctrl.get('pecasRetornadas')?.value ?? 0));
    if (defeitos < 0) defeitos = 0;
    if (defeitos > retornadas) defeitos = retornadas;
    ctrl.get('pecasComDefeito')?.setValue(defeitos, { emitEvent: false });
  }

  calcBomRetorno(i: number): number {
    const fg = this.getControl(i);
    const r = Number(fg.get('pecasRetornadas')?.value ?? 0);
    const d = Number(fg.get('pecasComDefeito')?.value ?? 0);
    return Math.max(0, r - d);
  }

  podeRetornar(): boolean {
    if (!this.form || this.form.get('status')?.value === 'RETORNADA') return false;
    return this.retornoTotalControl.value || this.itens.controls.some(c => (c.get('pecasRetornadas')?.value ?? 0) > 0);
  }

  /** SALVAR PARCIAL (STANDBY) */
  async salvarParcial(): Promise<void> {
    if (!this.form || this.submitting) return;
    if (!confirm('Deseja salvar este retorno parcial? (A OS continuará EM PRODUÇÃO)')) return;

    this.submitting = true;
    const id = this.form.get('id')?.value;
    const payload = {
      isParcial: true,
      retornoTotal: false, // Força a permanência como parcial
      status: 'EM_PRODUCAO',
      itens: this.getPayloadItens()
    };

    this.addSub(this.ordemService.retornarOrdem(id, payload).subscribe({
      next: () => {
        alert('✅ Retorno parcial salvo!');
        this.submitting = false;
        this.carregarOrdensAbertas();
        this.buscarOS();
      },
      error: (e) => { alert('Erro: ' + e.error?.message); this.submitting = false; }
    }));
  }

  /** FINALIZAR RETORNO (FECHAMENTO) */
  confirmRetornar(): void {
    if (!this.form || this.submitting) return;
    if (!confirm('Deseja FINALIZAR esta OS? Isso mudará o status para RETORNADA.')) return;

    this.submitting = true;
    const id = this.form.get('id')?.value;
    const payload = {
      isParcial: false, 
      retornoTotal: true, // FLAG CRUCIAL PARA O BACKEND
      status: 'RETORNADA',
      dataRetorno: new Date().toISOString().split('T')[0],
      itens: this.getPayloadItens()
    };

    this.addSub(this.ordemService.retornarOrdem(id, payload).subscribe({
      next: () => {
        alert('✅ OS FINALIZADA com sucesso!');
        this.submitting = false;
        this.carregarOrdensAbertas();
        this.form = null;
        this.osIdControl.reset();
      },
      error: (e) => { alert('Erro: ' + e.error?.message); this.submitting = false; }
    }));
  }

  /**
   * Expande os grupos de volta para itens individuais,
   * distribuindo as peças retornadas proporcionalmente pelo peso de cada item original.
   */
  private getPayloadItens() {
    const resultado: { id: number | string; pecasRetornadas: number; pecasComDefeito: number }[] = [];

    for (const c of this.itens.controls) {
      const idsOriginais: (number | string)[] = JSON.parse(c.get('idsOriginais')?.value ?? '[]');
      const pesosOriginais: number[] = JSON.parse(c.get('pesosOriginais')?.value ?? '[]');

      const totalRetornadas = Math.trunc(Number(c.get('pecasRetornadas')?.value ?? 0));
      const totalDefeitos  = Math.trunc(Number(c.get('pecasComDefeito')?.value ?? 0));
      const somaP = pesosOriginais.reduce((s, p) => s + p, 0);

      // Distribui proporcionalmente; o último item absorve possível resto para manter exatidão
      let retornadasRestantes = totalRetornadas;
      let defeitosRestantes   = totalDefeitos;

      for (let i = 0; i < idsOriginais.length; i++) {
        const isLast = i === idsOriginais.length - 1;
        const frac = somaP > 0 ? pesosOriginais[i] / somaP : 1 / idsOriginais.length;

        const ret = isLast ? retornadasRestantes : Math.round(totalRetornadas * frac);
        const def = isLast ? defeitosRestantes   : Math.round(totalDefeitos   * frac);

        retornadasRestantes -= ret;
        defeitosRestantes   -= def;

        resultado.push({
          id: idsOriginais[i],
          pecasRetornadas: Math.max(0, ret),
          pecasComDefeito: Math.max(0, def)
        });
      }
    }

    return resultado;
  }

  confirmExcluir(): void {
    const input = prompt('Digite "CONFIRMAR" para excluir permanentemente:');
    if (input === 'CONFIRMAR') {
      this.submitting = true;
      this.addSub(this.ordemService.deletarOrdem(this.form?.get('id')?.value).subscribe({
        next: () => { alert('Excluída!'); this.form = null; this.carregarOrdensAbertas(); this.submitting = false; },
        error: () => this.submitting = false
      }));
    }
  }
}