import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
    FormBuilder,
    FormGroup,
    FormArray,
    Validators,
    ReactiveFormsModule,
    FormsModule
} from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { ValePedidoSpService } from '../../services/vale-pedido-sp.service';
import {
    ProdutoCompletoDTO,
    ValePedidoPayload,
    ValePedidoItemPayload,
    PedidoDTO,
    MetodoPagamento,
    ClienteDTO,
    VendedorDTO,
    FinalizarValePayload
} from '../../services/vale-pedido.interfaces';

registerLocaleData(localePt);

@Component({
    selector: 'app-vale-pedido-sp',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule],
    templateUrl: './vale-pedido-sp.html',
    styleUrls: ['./vale-pedido-sp.scss'],
    providers: [DatePipe]
})
export class ValePedidoSpComponent implements OnInit, OnDestroy {

    public form: FormGroup;
    private destroy$ = new Subject<void>();

    public dataAtual: Date = new Date();
    public pedidos: PedidoDTO[] = [];
    public clientesDisponiveis: ClienteDTO[] = [];
    public vendedoresDisponiveis: VendedorDTO[] = [];

    // --- Paginação ---
    public paginaAtual: number = 1;
    public itensPorPagina: number = 10;

    public codigoBusca = '';
    public loading = false;
    public saving = false;
    public message = '';
    public messageType: 'success' | 'error' | 'warning' | '' = '';
    public datasPagamento: string[] = [];
    
    public pedidoParaFinalizar: any | null = null; 
    public volumesFinalizacao: number = 1;

    public readonly cidadesEstoque = [
        { id: 'Guaratinguetá', nome: 'GUARATINGUETÁ' },
        { id: 'São Paulo', nome: 'SÃO PAULO (SP)' }
    ];

    public readonly tabelasPreco = [
        { id: 'bras', nome: 'TABELA BRÁS (PADRÃO)', acrescimo: 0 },
        { id: 'rene', nome: 'TABELA RENÊ (5%)', acrescimo: 0.05 },
        { id: 'rio', nome: 'TABELA RIO (10%)', acrescimo: 0.10 }
    ];

    public readonly metodosPagamentoOptions: MetodoPagamento[] = [
        { id: 1, nome: 'À Vista', diasParcelas: [0] },
        { id: 2, nome: '20 Dias', diasParcelas: [20] },
        { id: 3, nome: '28 Dias', diasParcelas: [28] },
        { id: 4, nome: '30 Dias', diasParcelas: [30] },
        { id: 5, nome: '30/60 Dias', diasParcelas: [30, 60] },
        { id: 6, nome: '30/60/90 Dias', diasParcelas: [30, 60, 90] },
        { id: 7, nome: '60/90 Dias', diasParcelas: [60, 90] },
        { id: 8, nome: '30/45/60 Dias', diasParcelas: [30, 45, 60] },
    ];

    constructor(
        private fb: FormBuilder,
        private valePedidoService: ValePedidoSpService
    ) {
        this.form = this.createForm();
    }

    ngOnInit(): void {
        this.loadInitialData();
        this.setupFormSubscriptions();
        setInterval(() => this.dataAtual = new Date(), 60000);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get pedidosPaginados(): PedidoDTO[] {
        const ordenados = [...this.pedidos].sort((a, b) => (b.id || 0) - (a.id || 0));
        const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
        const fim = inicio + this.itensPorPagina;
        return ordenados.slice(inicio, fim);
    }

    get totalPaginas(): number {
        return Math.ceil(this.pedidos.length / this.itensPorPagina);
    }

    public mudarPagina(novaPagina: number): void {
        if (novaPagina >= 1 && novaPagina <= this.totalPaginas) {
            this.paginaAtual = novaPagina;
        }
    }

    private createForm(): FormGroup {
        return this.fb.group({
            id: [null], 
            clienteId: [null, Validators.required],
            endereco: [{ value: '', disabled: true }, Validators.required],
            vendedorId: [null, Validators.required],
            cidadeSeparacao: ['Guaratinguetá', Validators.required], 
            tabelaPreco: ['bras', Validators.required], 
            modoPagamento: ['cadastro', Validators.required],
            metodoPagamentoId: [1, Validators.required],
            parcelasCustomizadas: this.fb.array([]),
            dataInicialPagamento: [this.getTodayDate(), Validators.required],
            valorBruto: [{ value: 0, disabled: true }],
            descontoPorcento: [0], 
            precoTotal: [{ value: 0, disabled: true }],
            produtos: this.fb.array([])
        });
    }

    private loadInitialData(): void {
        this.valePedidoService.listarClientes().pipe(takeUntil(this.destroy$)).subscribe(res => this.clientesDisponiveis = res || []);
        this.valePedidoService.listarVendedores().pipe(takeUntil(this.destroy$)).subscribe(res => {
            this.vendedoresDisponiveis = res || [];
            if (this.vendedoresDisponiveis.length > 0) this.form.get('vendedorId')?.setValue(this.vendedoresDisponiveis[0].id);
        });
        this.loadPedidos();
    }

    public loadPedidos(): void {
        this.valePedidoService.listarPedidos().pipe(takeUntil(this.destroy$)).subscribe({
            next: (p) => {
                this.pedidos = p;
                this.paginaAtual = 1;
            },
            error: (e) => this.showMessage('Erro ao carregar pedidos: ' + e.message, 'error')
        });
    }

    private setupFormSubscriptions(): void {
        this.form.get('clienteId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(id => {
            const cliente = this.clientesDisponiveis.find(c => c.id === id);
            this.form.get('endereco')?.setValue(cliente ? cliente.endereco : '');
        });

        this.form.get('tabelaPreco')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.atualizarPrecosPorTabela());
        this.form.get('descontoPorcento')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.recalcularTotalGeral());

        this.form.get('modoPagamento')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(modo => {
            if (modo === 'custom') {
                if (this.parcelasCustomizadasFA.length === 0) this.adicionarParcelaCustomizada();
            } else {
                this.parcelasCustomizadasFA.clear();
            }
            this.calcularDatasPagamento();
        });

        this.form.get('metodoPagamentoId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.calcularDatasPagamento());
        this.form.get('dataInicialPagamento')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.calcularDatasPagamento());
        this.parcelasCustomizadasFA.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.calcularDatasPagamento());
    }

    private abrirPopupImpressao(url: string): void {
        const width = 800;
        const height = 600;
        const features = `width=${width},height=${height},menubar=no,status=no,toolbar=no,scrollbars=yes`;
        window.open(url, 'ImpressaoValePedido', features);
    }

    public criarRomaneio(): void {
        if (this.validarFormulario()) {
            this.enviarPedido('ROMANEIO', 0);
        }
    }

    public iniciarValeDireto(): void {
        if (this.validarFormulario()) {
            const clienteNome = this.getNomeCliente();
            const cidade = this.form.get('cidadeSeparacao')?.value;
            
            this.pedidoParaFinalizar = { 
                id: 'Novo', 
                cliente: clienteNome, 
                isDireto: true,
                cidadeSeparacao: cidade,
                produtos: this.produtosFA.getRawValue() 
            };
            this.volumesFinalizacao = 1;
        }
    }

    private validarFormulario(): boolean {
        if (this.form.invalid) {
            this.markAllFieldsAsTouched();
            this.showMessage('Preencha os campos obrigatórios.', 'warning');
            return false;
        }
        if (this.produtosFA.length === 0) {
            this.showMessage('Adicione pelo menos um produto.', 'warning');
            return false;
        }
        return true;
    }

    private enviarPedido(status: 'ROMANEIO' | 'FINALIZADO', volumes: number): void {
        const raw = this.form.getRawValue();
        const items: ValePedidoItemPayload[] = [];
        
        raw.produtos.forEach((p: any) => {
            p.tamanhos.forEach((t: any) => {
                const quantidadeDuzias = Number(t.quantidade) || 0;
                const precoPorDuzia = Number(t.precoDuzia) || 0;

                if (quantidadeDuzias > 0) {
                    items.push({
                        produtoTamanhoId: t.produtoTamanhoId, // Correção: Uso rigoroso do ID do Tamanho
                        quantidade: quantidadeDuzias,
                        precoUnitario: precoPorDuzia,
                        subtotal: Number((quantidadeDuzias * precoPorDuzia).toFixed(2))
                    });
                }
            });
        });

        this.saving = true;
        
        let metodoNome = '';
        if (raw.modoPagamento === 'cadastro') {
            metodoNome = this.metodosPagamentoOptions.find(m => m.id === raw.metodoPagamentoId)?.nome || '';
        } else {
            metodoNome = 'Personalizado (' + this.parcelasCustomizadasFA.length + ' parcs)';
        }
        
        const payload: ValePedidoPayload = {
            ...raw,
            cliente: this.getNomeCliente(),
            vendedor: this.getNomeVendedor(),
            metodoPagamento: metodoNome,
            parcelas: this.datasPagamento.length,
            dataEmissao: new Date().toISOString(),
            items: items,
            status: status,
            volumes: volumes,
            valorBruto: Number(raw.valorBruto) || 0,
            precoTotal: Number(raw.precoTotal) || 0
        };

        this.valePedidoService.criarRomaneio(payload).subscribe({
            next: (res) => {
                this.saving = false;
                this.showMessage(`${status} gerado com sucesso!`, 'success');
                const endpoint = status === 'ROMANEIO' ? 'romaneio' : 'vale';
                const url = `${this.valePedidoService.VALEPEDIDOS_ENDPOINT}/relatorio/${endpoint}/${res.id}`;
                this.abrirPopupImpressao(url);
                this.resetForm();
                this.loadPedidos();
                this.pedidoParaFinalizar = null;
            },
            error: (err) => { 
                this.saving = false; 
                this.showMessage('Erro ao salvar pedido: ' + (err.error?.message || err.message), 'error'); 
            }
        });
    }

    public confirmarFinalizacao(): void {
        if (this.volumesFinalizacao < 1) {
            this.showMessage('Informe pelo menos 1 volume.', 'warning');
            return;
        }
        if (this.pedidoParaFinalizar?.isDireto) {
            this.enviarPedido('FINALIZADO', this.volumesFinalizacao);
        } else {
            this.finalizarOuEditarPedido();
        }
    }

    /**
     * ✅ CORREÇÃO CRÍTICA: Mapeamento de IDs para Baixa de Estoque
     * Garante que o ID enviado seja sempre o produtoTamanhoId real.
     */
    private finalizarOuEditarPedido(): void {
        this.saving = true;
        const ped = this.pedidoParaFinalizar;
        
        const itensBrutos = ped.itens || ped.items || [];

        if (itensBrutos.length === 0) {
            this.showMessage('Erro: O pedido não possui itens para baixar o estoque.', 'error');
            this.saving = false;
            return;
        }

        // Mapeamento explícito para evitar confusão entre ID da linha e ID do Tamanho
        const itensMapeados = itensBrutos.map((i: any) => ({
            produtoTamanhoId: i.produtoTamanhoId || (i.produtoTamanho ? i.produtoTamanho.id : i.id),
            quantidade: Number(i.quantidade) || 0
        })).filter((item: any) => item.quantidade > 0);

        const payload: FinalizarValePayload = {
            volumes: this.volumesFinalizacao,
            precoTotal: Number(ped.precoTotal) || 0,
            valorBruto: Number(ped.valorBruto) || 0,
            cidadeSeparacao: ped.cidadeSeparacao || 'Guaratinguetá',
            itens: itensMapeados
        };

        this.valePedidoService.finalizarPedido(ped.id, payload).subscribe({
            next: (res) => {
                this.saving = false;
                this.showMessage('Pedido Finalizado e Estoque Baixado!', 'success');
                const url = `${this.valePedidoService.VALEPEDIDOS_ENDPOINT}/relatorio/vale/${ped.id}`;
                this.abrirPopupImpressao(url);
                this.pedidoParaFinalizar = null;
                this.loadPedidos();
            },
            error: (err) => { 
                this.saving = false; 
                this.showMessage('Falha na baixa: ' + (err.error?.error || err.message), 'error'); 
            }
        });
    }

    public buscarProdutoPorCodigo(): void {
        if (!this.codigoBusca) return;
        this.loading = true;
        this.valePedidoService.buscarProdutoCompleto(this.codigoBusca).subscribe({
            next: (p) => {
                this.loading = false;
                this.adicionarProdutoAoFormulario(p);
                this.codigoBusca = '';
            },
            error: () => { this.loading = false; this.showMessage('Produto não encontrado', 'error'); }
        });
    }

    private adicionarProdutoAoFormulario(produto: ProdutoCompletoDTO): void {
        if (this.produtosFA.controls.some(c => c.get('produtoId')?.value === produto.id)) {
            this.showMessage('Este produto já foi adicionado.', 'warning');
            return;
        }
        const acrescimo = this.tabelasPreco.find(t => t.id === this.form.get('tabelaPreco')?.value)?.acrescimo || 0;
        const precoBase = Number(produto.precoVendaDuzia) || 0;
        const precoCalc = Math.round(precoBase * (1 + acrescimo));

        const tamanhosGroups = (produto.tamanhos || []).map(t => this.fb.group({
            produtoTamanhoId: [t.id],
            tamanho: [t.tamanho],
            quantidade: [0],
            precoDuziaBase: [precoBase], 
            precoDuzia: [{ value: precoCalc, disabled: true }],
            subtotal: [{ value: 0, disabled: true }]
        }));

        this.produtosFA.push(this.fb.group({
            produtoId: [produto.id],
            codigo: [produto.codigo],
            descricao: [produto.descricao],
            tamanhos: this.fb.array(tamanhosGroups)
        }));
    }

    public atualizarSubtotal(prodIdx: number, tamIdx: number): void {
        const group = this.tamanhosFA(prodIdx).at(tamIdx) as FormGroup;
        const qtd = Number(group.get('quantidade')?.value) || 0;
        const preco = Number(group.get('precoDuzia')?.getRawValue()) || 0;
        
        group.get('subtotal')?.setValue(Number((qtd * preco).toFixed(2)), { emitEvent: false });
        this.recalcularTotalGeral();
    }

    private atualizarPrecosPorTabela(): void {
        const acrescimo = this.tabelasPreco.find(t => t.id === this.form.get('tabelaPreco')?.value)?.acrescimo || 0;
        this.produtosFA.controls.forEach((prod, pIdx) => {
            this.tamanhosFA(pIdx).controls.forEach((tam, tIdx) => {
                const base = tam.get('precoDuziaBase')?.value || 0;
                tam.get('precoDuzia')?.setValue(Math.round(base * (1 + acrescimo)), { emitEvent: false });
                this.atualizarSubtotal(pIdx, tIdx);
            });
        });
    }

    public recalcularTotalGeral(): void {
        let bruto = 0;
        this.produtosFA.getRawValue().forEach((p: any) => {
            p.tamanhos.forEach((t: any) => {
                bruto += Number(t.subtotal) || 0;
            });
        });
        const desc = Number(this.form.get('descontoPorcento')?.value) || 0;
        const total = bruto * (1 - (desc / 100));
        
        this.form.patchValue({ 
            valorBruto: bruto, 
            precoTotal: Number(total.toFixed(2)) 
        }, { emitEvent: false });
    }

    public getNomeCliente(): string {
        const id = this.form.get('clienteId')?.value;
        return this.clientesDisponiveis.find(c => c.id === id)?.nome || 'CONSUMIDOR';
    }

    public getNomeVendedor(): string {
        const id = this.form.get('vendedorId')?.value;
        return this.vendedoresDisponiveis.find(v => v.id === id)?.nome || '-';
    }

    get produtosFA(): FormArray { return this.form.get('produtos') as FormArray; }
    get parcelasCustomizadasFA(): FormArray { return this.form.get('parcelasCustomizadas') as FormArray; }
    public tamanhosFA(idx: number): FormArray { return this.produtosFA.at(idx).get('tamanhos') as FormArray; }
    
    public adicionarParcelaCustomizada(): void { 
        const ultimaParcela = this.parcelasCustomizadasFA.length > 0 
            ? this.parcelasCustomizadasFA.at(this.parcelasCustomizadasFA.length - 1).value 
            : 0;
        this.parcelasCustomizadasFA.push(this.fb.control(ultimaParcela + 30, [Validators.required, Validators.min(0)])); 
    }

    public removerParcelaCustomizada(i: number): void { 
        this.parcelasCustomizadasFA.removeAt(i); 
        if (this.parcelasCustomizadasFA.length === 0) {
            this.form.get('modoPagamento')?.setValue('cadastro');
        }
    }

    public removerProduto(i: number): void { 
        this.produtosFA.removeAt(i); 
        this.recalcularTotalGeral(); 
    }
    
    public imprimirRomaneioH(id: number): void { 
        this.abrirPopupImpressao(`${this.valePedidoService.VALEPEDIDOS_ENDPOINT}/relatorio/romaneio/${id}`);
    }
    public imprimirValeH(id: number): void { 
        this.abrirPopupImpressao(`${this.valePedidoService.VALEPEDIDOS_ENDPOINT}/relatorio/vale/${id}`);
    }
    
    public prepararFinalizacao(ped: PedidoDTO): void { 
        this.loading = true;
        this.valePedidoService.buscarPedidoPorId(ped.id).subscribe({
            next: (completo) => {
                this.loading = false;
                this.pedidoParaFinalizar = completo; 
                this.volumesFinalizacao = completo.volumes || 1; 
            },
            error: (err) => {
                this.loading = false;
                this.showMessage('Erro ao carregar detalhes do pedido.', 'error');
            }
        });
    }

    public getTodayDate(): string { return new Date().toISOString().split('T')[0]; }

    private calcularDatasPagamento(): void {
        const base = this.form.get('dataInicialPagamento')?.value;
        if (!base) return;
        let dias: number[] = [];
        const modo = this.form.get('modoPagamento')?.value;
        if (modo === 'cadastro') {
            const metodoId = this.form.get('metodoPagamentoId')?.value;
            dias = this.metodosPagamentoOptions.find(m => m.id === metodoId)?.diasParcelas || [0];
        } else {
            dias = this.parcelasCustomizadasFA.controls.map(control => Number(control.value) || 0);
        }
        this.datasPagamento = dias.map(d => {
            const dt = new Date(base + 'T12:00:00');
            dt.setDate(dt.getDate() + d);
            return dt.toISOString().split('T')[0];
        });
    }

    private showMessage(m: string, t: 'success' | 'error' | 'warning'): void {
        this.message = m; this.messageType = t;
        setTimeout(() => this.message = '', 4000);
    }

    private markAllFieldsAsTouched(): void { 
        Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched()); 
    }

    public resetForm(): void {
        this.produtosFA.clear();
        this.parcelasCustomizadasFA.clear();
        this.form.reset({
            cidadeSeparacao: 'Guaratinguetá', 
            tabelaPreco: 'bras',
            modoPagamento: 'cadastro', 
            metodoPagamentoId: 1,
            dataInicialPagamento: this.getTodayDate(), 
            descontoPorcento: 0
        });
    }

    public pedirDelete(id: number): void {
        if (confirm('Deseja excluir este pedido permanentemente? O estoque será devolvido.')) {
            this.valePedidoService.deletarPedido(id).subscribe({
                next: () => {
                    this.showMessage('Pedido excluído!', 'success');
                    this.loadPedidos();
                },
                error: (err) => {
                    this.showMessage('Erro ao excluir: ' + err.message, 'error');
                }
            });
        }
    }
}