import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  FormControl
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';
import { OrdemService } from '../../services/ordem.service';

@Component({
  selector: 'app-criacao-os',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="app-container">
      <div id="anchor-top"></div>
      
      <header class="page-header">
        <h1>{{ isEditing ? 'Edição de Ordem de Serviço #' + osIdParaEdicao : 'Nova Ordem de Serviço' }}</h1>
        <div class="header-actions" *ngIf="isEditing">
          <button class="btn-ghost" (click)="cancelarEdicao()">Voltar para Nova OS</button>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="salvarOS()" class="main-card form-area">
        <div class="form-section-title">Dados da Operação</div>
        <div class="grid-row">
          <div class="field-group flex-2">
            <label>Oficina / Confecção</label>
            <select formControlName="confeccaoId">
              <option value="">Selecione o destino...</option>
              <option *ngFor="let c of confeccoes" [value]="c.id">{{ c.nome }}</option>
            </select>
          </div>
          <div class="field-group">
            <label>Data de Início</label>
            <input type="date" formControlName="dataInicio" />
          </div>
          <div class="field-group">
            <label>Previsão de Retorno</label>
            <input type="date" formControlName="dataRetorno" />
          </div>
        </div>

        <div class="form-section-title" style="margin-top: 20px;">Itens da Ordem</div>
        <div formArrayName="itens">
          <div class="product-entry" *ngFor="let item of itens.controls; let i=index" [formGroupName]="i">
            <div class="product-row">
              <div class="field-group flex-1">
                <label>Referência do Produto</label>
                <input placeholder="Ex: 202" formControlName="produtoCodigo" type="text" />
              </div>
              <button type="button" class="btn-danger-text" (click)="removerItem(i)">Remover Produto</button>
            </div>

            <div formArrayName="grupos">
              <div class="batch-card" *ngFor="let grupo of getGrupos(i).controls; let g=index" [formGroupName]="g">
                <div class="batch-header">
                  <div class="field-group">
                    <label>Nº do Corte</label>
                    <input placeholder="0001" formControlName="corte" type="text" />
                  </div>
                  <div class="field-group">
                    <label>Peças por Volume</label>
                    <input type="number" formControlName="pecasPorVolume" (input)="atualizarCalculos(i, g)" />
                  </div>
                  <button type="button" class="btn-link-danger" (click)="removerGrupo(i, g)" *ngIf="getGrupos(i).length > 1">Excluir Lote</button>
                </div>

                <div formArrayName="tamanhos" class="size-row">
                  <div class="size-cell" *ngFor="let t of getTamanhos(i, g).controls; let j=index" [formGroupName]="j">
                    <span class="label">{{ t.get('tamanho')?.value }}</span>
                    <input type="number" formControlName="volumes" (input)="atualizarCalculos(i, g)" />
                    <span class="calc">{{ t.get('pecasEsperadas')?.value }} pçs</span>
                  </div>
                </div>
              </div>
            </div>
            <button type="button" class="btn-outline-primary" (click)="adicionarGrupo(i)">+ Adicionar Corte ao Produto</button>
          </div>
        </div>

        <div class="form-footer">
          <button type="button" class="btn-secondary" (click)="adicionarItem()">+ Adicionar Outro Produto</button>
          <button type="submit" class="btn-primary" [disabled]="form.invalid">
            {{ isEditing ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR ORDEM' }}
          </button>
        </div>
      </form>

      <hr class="section-divider" />

      <section class="list-area">
        <div class="list-header">
          <h2>Gerenciamento de Ordens</h2>
          <div class="search-box">
            <input type="text" [formControl]="osIdControl" placeholder="Buscar por ID..." />
            <select [formControl]="osStatusControl">
              <option value="all">Todos os Status</option>
              <option value="open">Abertas</option>
              <option value="returned">Retornadas</option>
            </select>
            <button class="btn-primary" (click)="buscarOs()">Buscar</button>
            <button class="btn-print" (click)="imprimirSelecionadas()" [disabled]="selectedOsIds.length === 0">
              🖨️ Imprimir ({{selectedOsIds.length}})
            </button>
          </div>
        </div>

        <div class="main-card no-padding">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">✓</th>
                <th style="width: 80px;">ID</th>
                <th>Oficina</th>
                <th>Data Início</th>
                <th style="width: 150px;">Status</th>
                <th style="width: 150px; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of osDisplayList" [class.row-selected]="isSelected(o.id)">
                <td style="text-align: center;">
                  <input type="checkbox"
                    [checked]="isSelected(o.id)"
                    (change)="toggleSelection(o.id, $event)"
                    [disabled]="!isSelected(o.id) && selectedOsIds.length >= 2" />
                </td>
                <td class="id-text">#{{ o.id }}</td>
                <td class="font-medium">{{ confeccaoName(o.confeccaoId) }}</td>
                <td>{{ formatDateDisplay(o.dataInicio) }}</td>
                <td>
                  <span class="status-pill" [ngClass]="o.statusNormalized === 'ABERTA' ? 'pill-blue' : 'pill-green'">
                    {{ o.statusNormalized }}
                  </span>
                </td>
                <td class="actions-td">
                  <button (click)="verDetalhe(o.id)" class="btn-icon" title="Ver Relatório">Visualizar</button>
                  <button *ngIf="o.statusNormalized === 'ABERTA'" (click)="editarOs(o.id)" class="btn-icon edit" title="Editar">Editar</button>
                </td>
              </tr>
              <tr *ngIf="osDisplayList.length === 0">
                <td colspan="6" class="empty-state">Nenhum registro encontrado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { 
      --primary: #1e293b; 
      --accent: #2563eb; 
      --danger: #be123c; 
      --success: #059669;
      --border: #e2e8f0;
      --bg: #f8fafc;
    }

    .app-container { max-width: 1200px; margin: 0 auto; padding: 30px; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--primary); }
    
    /* Headers */
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
    h2 { font-size: 18px; font-weight: 700; margin: 0; }
    .form-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 5px; }

    /* Cards */
    .main-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px; }
    .no-padding { padding: 0; overflow: hidden; }

    /* Form Layout */
    .grid-row { display: flex; gap: 15px; margin-bottom: 15px; }
    .field-group { display: flex; flex-direction: column; flex: 1; }
    .flex-2 { flex: 2; }
    label { font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 5px; }
    input, select { padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; }
    
    /* Product Entries */
    .product-entry { border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #f1f5f9; }
    .product-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; }
    
    .batch-card { background: #fff; border: 1px solid var(--border); border-radius: 6px; padding: 15px; margin-bottom: 10px; }
    .batch-header { display: flex; gap: 15px; align-items: flex-end; margin-bottom: 15px; }
    
    .size-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px; }
    .size-cell { display: flex; flex-direction: column; align-items: center; background: #f8fafc; border: 1px solid var(--border); padding: 8px; border-radius: 4px; min-width: 80px; }
    .size-cell .label { font-weight: 800; font-size: 11px; color: var(--accent); }
    .size-cell input { width: 60px; text-align: center; padding: 4px; margin: 5px 0; }
    .size-cell .calc { font-size: 10px; font-weight: 700; color: var(--success); }

    /* Footer / Buttons */
    .form-footer { display: flex; justify-content: space-between; padding-top: 20px; }
    .btn-primary { background: var(--accent); color: #fff; border: none; padding: 12px 25px; border-radius: 6px; font-weight: 700; cursor: pointer; }
    .btn-secondary { background: #fff; border: 1px solid var(--accent); color: var(--accent); padding: 12px 25px; border-radius: 6px; font-weight: 700; cursor: pointer; }
    .btn-outline-primary { width: 100%; background: transparent; border: 1px dashed var(--accent); color: var(--accent); padding: 8px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-danger-text { color: var(--danger); border: none; background: none; font-weight: 700; cursor: pointer; font-size: 12px; }
    .btn-link-danger { color: var(--danger); border: none; background: none; cursor: pointer; font-size: 12px; }
    .btn-ghost { color: #64748b; background: none; border: none; cursor: pointer; font-weight: 600; }

    .section-divider { margin: 40px 0; border: 0; border-top: 2px solid var(--border); }

    /* Search & Table */
    .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .search-box { display: flex; gap: 10px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 15px; background: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid var(--border); }
    .data-table td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 14px; }
    .id-text { font-weight: 800; color: var(--accent); }
    .font-medium { font-weight: 600; }
    .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .pill-blue { background: #dbeafe; color: #1e40af; }
    .pill-green { background: #d1fae5; color: #065f46; }
    .actions-td { display: flex; gap: 10px; justify-content: center; }
    .btn-icon { background: #f8fafc; border: 1px solid var(--border); padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; }
    .btn-icon.edit { background: #fffbeb; border-color: #fcd34d; color: #92400e; }
    .empty-state { text-align: center; padding: 40px; color: #94a3b8; }
    .row-selected { background: #eff6ff; }
    .btn-print { background: #059669; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; }
    .btn-print:disabled { background: #94a3b8; cursor: not-allowed; }
    input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent); }
    input[type=checkbox]:disabled { cursor: not-allowed; opacity: 0.4; }
  `]
})
export class CriacaoOsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ordemService = inject(OrdemService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form: FormGroup;
  confeccoes: any[] = [];
  isEditing = false;
  osIdParaEdicao: number | null = null;

  osIdControl = new FormControl('');
  osStatusControl = new FormControl('all');
  osDisplayList: any[] = [];

  constructor() {
    this.form = this.fb.group({
      dataInicio: [new Date().toISOString().substring(0, 10), Validators.required],
      dataRetorno: [''],
      confeccaoId: ['', Validators.required],
      itens: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.carregarConfeccoes();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.osIdParaEdicao = Number(id);
        this.isEditing = true;
        this.carregarDadosParaEdicao(this.osIdParaEdicao);
      } else {
        this.resetarParaNovo();
      }
    });
    this.buscarOs();
  }

  get itens(): FormArray { return this.form.get('itens') as FormArray; }
  getGrupos(i: number): FormArray { return this.itens.at(i).get('grupos') as FormArray; }
  getTamanhos(i: number, g: number): FormArray { return this.getGrupos(i).at(g).get('tamanhos') as FormArray; }

  carregarDadosParaEdicao(id: number) {
    this.ordemService.buscarOrdemPorId(id).subscribe({
      next: (res: any) => {
        const os = res?.ordem || res;
        if (!os) return;

        this.form.patchValue({
          dataInicio: os.dataInicio?.substring(0, 10),
          dataRetorno: os.dataRetorno?.substring(0, 10),
          confeccaoId: os.confeccaoId
        });

        this.itens.clear();
        const listaItens = os.itens || os.Itens || os.ordem_itens || [];
        const agrupados = this.agruparItensApi(listaItens);

        agrupados.forEach(it => {
          const itemForm = this.fb.group({
            produtoCodigo: [it.produtoCodigo, Validators.required],
            grupos: this.fb.array(it.grupos.map((g: any) => this.fb.group({
              corte: [g.corte, Validators.required],
              pecasPorVolume: [g.pecasPorVolume, Validators.required],
              tamanhos: this.fb.array(g.tamanhos.map((t: any) => this.fb.group({
                tamanho: [t.tamanho],
                volumes: [t.volumes],
                pecasEsperadas: [{ value: t.volumes * g.pecasPorVolume, disabled: true }]
              })))
            })))
          });
          this.attachProdutoSubscription(itemForm);
          this.itens.push(itemForm);
        });
        document.getElementById('anchor-top')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  private agruparItensApi(itensFlat: any[]) {
    const mapaProd = new Map();
    itensFlat.forEach(it => {
      if (!mapaProd.has(it.produtoCodigo)) {
        mapaProd.set(it.produtoCodigo, { produtoCodigo: it.produtoCodigo, gruposMap: new Map() });
      }
      const p = mapaProd.get(it.produtoCodigo);
      const corteKey = it.corte || 'UNICO';
      if (!p.gruposMap.has(corteKey)) {
        p.gruposMap.set(corteKey, { corte: it.corte, pecasPorVolume: it.pecasPorVolume, tamanhos: [] });
      }
      p.gruposMap.get(corteKey).tamanhos.push({ tamanho: it.tamanho, volumes: it.volumes });
    });
    return Array.from(mapaProd.values()).map(p => ({ ...p, grupos: Array.from(p.gruposMap.values()) }));
  }

  adicionarItem(): void {
    const item = this.fb.group({
      produtoCodigo: ['', Validators.required],
      grupos: this.fb.array([this.criarGrupoVazio()])
    });
    this.attachProdutoSubscription(item);
    this.itens.push(item);
  }

  private criarGrupoVazio() {
    return this.fb.group({
      corte: ['', Validators.required],
      pecasPorVolume: [0, Validators.required],
      tamanhos: this.fb.array(['P', 'M', 'G'].map(t => this.fb.group({
        tamanho: [t], volumes: [0], pecasEsperadas: [{ value: 0, disabled: true }]
      })))
    });
  }

  adicionarGrupo(i: number) {
    const tamsAtuais = (this.getTamanhos(i, 0)).controls.map(c => c.get('tamanho')?.value);
    this.getGrupos(i).push(this.fb.group({
      corte: ['', Validators.required],
      pecasPorVolume: [0, Validators.required],
      tamanhos: this.fb.array(tamsAtuais.map(t => this.fb.group({
        tamanho: [t], volumes: [0], pecasEsperadas: [{ value: 0, disabled: true }]
      })))
    }));
  }

  removerItem(i: number) { this.itens.removeAt(i); }
  removerGrupo(i: number, g: number) { this.getGrupos(i).removeAt(g); }

  private attachProdutoSubscription(item: FormGroup) {
    item.get('produtoCodigo')?.valueChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe(cod => {
      if (!cod) return;
      this.api.get(`produtos`).subscribe((res: any) => {
        const p = (res?.produtos || res || []).find((x: any) => String(x.codigo) === String(cod));
        if (p?.tamanhos) {
          const tams = p.tamanhos.map((t: any) => typeof t === 'string' ? t : t.tamanho);
          const grupos = item.get('grupos') as FormArray;
          grupos.controls.forEach((g: any) => {
            const tArray = g.get('tamanhos') as FormArray;
            tArray.clear();
            tams.forEach((t: string) => tArray.push(this.fb.group({ tamanho: [t], volumes: [0], pecasEsperadas: [{ value: 0, disabled: true }] })));
          });
        }
      });
    });
  }

  atualizarCalculos(i: number, g: number) {
    const grupo = this.getGrupos(i).at(g);
    const ppv = grupo.get('pecasPorVolume')?.value || 0;
    const tams = this.getTamanhos(i, g);
    tams.controls.forEach(c => {
      const vol = c.get('volumes')?.value || 0;
      c.get('pecasEsperadas')?.setValue(vol * ppv);
    });
  }

  salvarOS(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const itensPayload: any[] = [];

    raw.itens.forEach((it: any) => {
      it.grupos.forEach((g: any) => {
        g.tamanhos.forEach((t: any) => {
          if (t.volumes > 0) {
            itensPayload.push({
              produtoCodigo: it.produtoCodigo,
              tamanho: t.tamanho,
              volumes: Number(t.volumes),
              pecasPorVolume: Number(g.pecasPorVolume),
              corte: g.corte
            });
          }
        });
      });
    });

    const payload = { ...raw, confeccaoId: Number(raw.confeccaoId), itens: itensPayload };
    const req = this.isEditing
      ? this.api.put(`ordens/${this.osIdParaEdicao}`, payload)
      : this.api.post(`ordens`, payload);

    req.subscribe({
      next: () => {
        alert('Salvo!');
        this.resetarParaNovo();
        this.buscarOs();
        this.router.navigate(['/criacao-os']);
      }
    });
  }

  buscarOs() {
    this.ordemService.listarOrdens().subscribe((res: any) => {
      const lista = res?.ordens || res || [];
      const queryId = this.osIdControl.value;
      const queryStatus = this.osStatusControl.value;

      this.osDisplayList = lista
        .map((o: any) => ({
          ...o,
          statusNormalized: ['RETORNADA', 'RETORNO', 'FINALIZADA'].includes(String(o.status).toUpperCase()) ? 'RETORNADA' : 'ABERTA'
        }))
        .filter((o: any) => {
          const matchId = queryId ? String(o.id).includes(queryId) : true;
          const matchStatus = queryStatus === 'all' ? true :
            queryStatus === 'open' ? o.statusNormalized === 'ABERTA' : o.statusNormalized === 'RETORNADA';
          return matchId && matchStatus;
        });
    });
  }

  carregarConfeccoes() {
    this.api.get('confeccoes').subscribe(res => this.confeccoes = res?.confeccoes || res || []);
  }

  resetarParaNovo() {
    this.isEditing = false;
    this.osIdParaEdicao = null;
    this.form.reset({ dataInicio: new Date().toISOString().substring(0, 10), dataRetorno: '', confeccaoId: '' });
    this.itens.clear();
    this.adicionarItem();
  }

  confeccaoName(id: any) { return this.confeccoes.find(c => c.id == id)?.nome || id; }
  formatDateDisplay(d: string) { return d ? new Date(d).toLocaleDateString('pt-BR') : '-'; }
  selectedOsIds: number[] = [];

  toggleSelection(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (this.selectedOsIds.length < 2) {
        this.selectedOsIds = [...this.selectedOsIds, id];
      } else {
        (event.target as HTMLInputElement).checked = false;
      }
    } else {
      this.selectedOsIds = this.selectedOsIds.filter(x => x !== id);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedOsIds.includes(id);
  }

  imprimirSelecionadas() {
    if (this.selectedOsIds.length === 1) {
      this.router.navigate(['/relatorio-os', this.selectedOsIds[0]]);
    } else if (this.selectedOsIds.length === 2) {
      this.router.navigate(['/relatorio-os'], { queryParams: { ids: this.selectedOsIds.join(',') } });
    }
  }

  verDetalhe(id: number) { this.router.navigate(['/relatorio-os', id]); }
  editarOs(id: number) { this.router.navigate(['/editar-os', id]); }
  cancelarEdicao() { this.resetarParaNovo(); this.router.navigate(['/criacao-os']); }
}