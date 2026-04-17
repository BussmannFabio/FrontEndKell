import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { finalize } from 'rxjs/operators';

interface ProdutoTamanho {
  id: number | null;
  tamanho: string;
}

interface Produto {
  id: number;
  codigo: string;
  nome?: string | null;
  tamanhos?: ProdutoTamanho[];
  tamanhosProduto?: ProdutoTamanho[];
}

interface CargaItem {
  produtoTamanhoId: number | null;
  quantidade: number;
  produtoCodigo?: string;
  produtoNome?: string;
  tamanho?: string;
}

interface Carga {
  id: number;
  data: string | null;
  dataDisplay?: string;
  quantidadeTotal: number;
  itens: CargaItem[];
}

@Component({
  selector: 'app-cargas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cargas.html',
  styleUrls: ['./cargas.scss']
})
export class CargasComponent implements OnInit {
  form!: FormGroup;
  produtos: Produto[] = [];
  cargas: Carga[] = [];
  carregandoProdutos = false;
  carregandoCargas = false;
  produtosComItens: Array<{ produto: Produto; controles: FormGroup[] }> = [];

  page = 1;
  pageSize = 10;
  totalCargas = 0;
  selectedCargaId: number | null = null;

  mensagem: string | null = null;
  mensagemErro: string | null = null;

  constructor(private fb: FormBuilder, private api: ApiService) {}

  ngOnInit() {
    this.carregarProdutos();
    this.carregarCargas();
  }

  // ---------- Produtos / Form ----------
  carregarProdutos() {
    this.carregandoProdutos = true;
    this.api.get<Produto[]>('/produtos').pipe(finalize(() => this.carregandoProdutos = false)).subscribe({
      next: (data) => {
        this.produtos = Array.isArray(data) ? data : [];
        this.criarFormulario();
        this.carregarProdutosComItens();
      },
      error: (err) => {
        console.error('Erro ao carregar produtos', err);
        this.produtos = [];
        this.criarFormulario();
        this.carregarProdutosComItens();
      }
    });
  }

  criarFormulario() {
    const itensArray = this.fb.array<FormGroup>([]);
    this.produtos.forEach(produto => {
      const tamanhos: ProdutoTamanho[] = produto.tamanhosProduto?.length
        ? produto.tamanhosProduto
        : (produto.tamanhos?.length ? produto.tamanhos : [{ id: null, tamanho: '-' }]);
      tamanhos.forEach(tam => {
        itensArray.push(this.fb.group({
          produtoTamanhoId: [tam.id],
          produtoCodigo: [produto.codigo],
          produtoNome: [produto.nome || 'Sem nome'],
          tamanho: [tam.tamanho],
          // O usuário digita DÚZIAS aqui
          quantidade: [0, [Validators.min(0)]] 
        }));
      });
    });

    const hoje = new Date();
    const isoHoje = hoje.toISOString().split('T')[0];

    this.form = this.fb.group({
      data: [isoHoje, Validators.required],
      itens: itensArray
    });
  }

  carregarProdutosComItens() {
    this.produtosComItens = [];
    const controls = this.itens.controls as FormGroup[];
    this.produtos.forEach(produto => {
      const grupoControles = controls.filter(c => String(c.get('produtoCodigo')?.value) === String(produto.codigo));
      this.produtosComItens.push({ produto, controles: grupoControles });
    });
  }

  get itens(): FormArray {
    return (this.form?.get('itens') as FormArray) || this.fb.array([]);
  }

  get quantidadeTotal(): number {
    return this.itens.controls.reduce((sum, c) => sum + Number(c.get('quantidade')?.value || 0), 0);
  }

  // ---------- Envio ----------
  private formatDateToDDMMYYYY(isoDate: string | null): string | null {
    if (!isoDate) return null;
    const [ano, mes, dia] = isoDate.split('-');
    if (!ano || !mes || !dia) return null;
    return `${dia}/${mes}/${ano}`;
  }

  enviar() {
    // CONVERSÃO: O valor digitado (dúzias) é multiplicado por 12 para o banco (peças)
    const itensPayload: CargaItem[] = this.itens.controls.map(ctrl => ({
      produtoTamanhoId: ctrl.get('produtoTamanhoId')?.value ?? null,
      quantidade: Math.round(Number(ctrl.get('quantidade')?.value || 0) * 12) 
    })).filter(i => i.quantidade > 0);

    if (!itensPayload.length) {
      this.showErro('Informe pelo menos uma quantidade maior que 0 para registrar a carga.');
      return;
    }

    let dataIso = this.form.value.data;
    if (!dataIso) {
      dataIso = new Date().toISOString().split('T')[0];
      this.form.get('data')?.setValue(dataIso);
    }

    const payload = {
      data: dataIso,
      descricao: `Carga do dia ${this.formatDateToDDMMYYYY(dataIso)}`,
      itens: itensPayload
    };

    this.api.post('/cargas', payload).subscribe({
      next: () => {
        this.showMensagem('Carga registrada com sucesso!');
        this.criarFormulario();
        this.carregarProdutosComItens();
        this.carregarCargas();
      },
      error: err => {
        console.error('Erro ao registrar carga', err);
        const serverMsg = err?.error?.message || '';
        
        // ALERT CLARO PARA ERRO DE ESTOQUE/ID INEXISTENTE
        if (err.status === 400 || serverMsg.toLowerCase().includes('estoque')) {
          this.showErro(`⚠️ ERRO DE ESTOQUE: O produto pode não ter registro na tabela estoque_produtos. Verifique se a OS foi finalizada.`);
        } else {
          this.showErro(serverMsg || 'Erro ao registrar carga');
        }
      }
    });
  }

  // ---------- Cargas ----------
  carregarCargas() {
    this.carregandoCargas = true;
    this.api.get<Carga[]>('/cargas').pipe(finalize(() => this.carregandoCargas = false)).subscribe({
      next: data => {
        this.cargas = (data || []).map(c => {
          const rawDate = (c as any).data ?? (c as any).dataCarga ?? new Date().toISOString().split('T')[0];
          return {
            ...c,
            data: rawDate,
            dataDisplay: this.formatDateForDisplay(rawDate),
            itens: c.itens || []
          } as Carga;
        });
        this.totalCargas = this.cargas.length;
      },
      error: err => {
        console.error('Erro ao buscar cargas', err);
        this.cargas = [];
        this.totalCargas = 0;
        this.showErro('Erro ao buscar cargas. Veja console.');
      }
    });
  }

  private formatDateForDisplay(raw: string | null): string {
    if (!raw || raw.trim() === '') return '-';
    if (raw.includes('/')) return raw;
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) {
        const parts = String(raw).split('-');
        if (parts.length >= 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return '-';
      }
      return this.pad(d.getDate()) + '/' + this.pad(d.getMonth() + 1) + '/' + d.getFullYear();
    } catch {
      return '-';
    }
  }

  private pad(n: number) { return String(n).padStart(2, '0'); }

  deletar(cargaId: number) {
    const entrada = window.prompt(`Você está prestes a excluir a carga #${cargaId}.\n\nDigite CONFIRMAR para confirmar a exclusão.`, '');
    if (!entrada) return;
    if (entrada.trim().toUpperCase() !== 'CONFIRMAR') {
      this.showErro('Exclusão cancelada: é necessário digitar "CONFIRMAR".');
      return;
    }
    this.api.delete(`/cargas/${cargaId}`).subscribe({
      next: () => {
        this.showMensagem('Carga excluída com sucesso.');
        this.carregarCargas();
      },
      error: err => {
        console.error('Erro ao deletar carga', err);
        this.showErro(err?.error?.message || 'Erro ao deletar carga');
      }
    });
  }

  editar(carga: Carga) {
    const newData = window.prompt('Nova data da carga (DD/MM/YYYY):', carga.dataDisplay || '');
    if (!newData) return;
    this.api.patch(`/cargas/${carga.id}`, { dataCarga: newData }).subscribe({
      next: () => {
        this.showMensagem('Carga atualizada.');
        this.carregarCargas();
      },
      error: err => {
        console.error('Erro ao atualizar carga', err);
        this.showErro('Erro ao atualizar carga. Veja console.');
      }
    });
  }

  toggleCargaItens(cargaId: number) {
    this.selectedCargaId = this.selectedCargaId === cargaId ? null : cargaId;
  }

  proximaPagina() {
    if ((this.page * this.pageSize) < this.totalCargas) this.page++;
  }

  paginaAnterior() {
    if (this.page > 1) this.page--;
  }

  gerarRelatorio(carga: Carga) {
    const conteudo = `
      <h2>Relatório de Carga #${carga.id}</h2>
      <p>Data: ${carga.dataDisplay || '-'}</p>
      <p>Total de Peças: ${carga.quantidadeTotal}</p>
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="padding:6px">Código</th>
            <th style="padding:6px">Tamanho</th>
            <th style="padding:6px">Peças</th>
            <th style="padding:6px">Dúzias</th>
          </tr>
        </thead>
        <tbody>
          ${carga.itens.map(item => `
            <tr>
              <td style="padding:6px">${item.produtoCodigo || '-'}</td>
              <td style="padding:6px">${item.tamanho || '-'}</td>
              <td style="padding:6px; text-align:right">${item.quantidade}</td>
              <td style="padding:6px; text-align:right">${(item.quantidade / 12).toFixed(1)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Relatório Carga #${carga.id}</title></head><body>${conteudo}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
    } else {
      this.showErro('Não foi possível abrir a janela de impressão.');
    }
  }

  private showMensagem(msg: string) {
    this.mensagem = msg;
    this.mensagemErro = null;
    setTimeout(() => this.mensagem = null, 3500);
  }

  private showErro(msg: string) {
    this.mensagemErro = msg;
    this.mensagem = null;
    // Erros de estoque ficam na tela por 10 segundos para leitura do diagnóstico
    setTimeout(() => this.mensagemErro = null, 10000); 
  }

  canSubmit(): boolean {
    return this.quantidadeTotal > 0 && this.form.valid && !this.carregandoProdutos;
  }
}