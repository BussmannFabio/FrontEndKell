// src/app/services/financeiro.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface FinanceiroRegistro {
  id: number;
  ordemId: number;
  confeccaoId: number;
  confeccaoNome?: string;
  valorMaoDeObra: number | string;
  diferenca?: number;
  status?: 'ABERTO' | 'PAGO';
  dataLancamento: string;
  ordemFinanceiro?: any;
  produtoId?: number;
  produtoCodigo?: string;
  quantidade?: number;
}

export interface RelatorioPorConfeccao {
  confeccaoId: number | null;
  confeccaoNome: string;
  totalPecas: number;
  totalDuzias: number;
  totalValor: number;
  ordensCount: number;
  ordensDetalhadas?: any[];
  totalEsperado?: number;
}

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private endpoint = 'financeiro';

  constructor(private api: ApiService) {}

  listar(): Observable<{ success: boolean; registros: FinanceiroRegistro[] }> {
    return this.api.get<{ success: boolean; registros: FinanceiroRegistro[] }>(this.endpoint);
  }

  atualizarStatus(id: number, status?: 'ABERTO' | 'PAGO') {
    // mantém o comportamento anterior (PUT para /financeiro/:id/pagar)
    const body = status ? { status } : {};
    return this.api.put<{ success: boolean; registro: FinanceiroRegistro }>(`${this.endpoint}/${id}/pagar`, body);
  }

  gerarRelatorio(ordemIds: number[]): Observable<{ success: boolean; report: RelatorioPorConfeccao[] }> {
    return this.api.post<{ success: boolean; report: RelatorioPorConfeccao[] }>(`${this.endpoint}/relatorio-gerar`, { ordemIds });
  }

  // ==== CORREÇÕES IMPORTANTES ====
  // listarOrdens: usa o endpoint central de ordens (GET /ordens)
  listarOrdens(): Observable<any> {
    return this.api.get<any>('ordens');
  }

  // getOrdemById: GET /ordens/:id
  getOrdemById(ordemId: number): Observable<any> {
    return this.api.get<any>(`ordens/${ordemId}`);
  }

  // obterProdutosPorIds: usa GET /produtos?ids=1,2,3 (ApiService suporta params)
  obterProdutosPorIds(ids: number[]): Observable<any[]> {
    if (!ids || ids.length === 0) {
      // retorna observable de array vazio via get para manter compatibilidade
      return this.api.get<any[]>('produtos', { ids: '' + ids.join(',') });
    }
    return this.api.get<any[]>('produtos', { ids: ids.join(',') });
  }
}
