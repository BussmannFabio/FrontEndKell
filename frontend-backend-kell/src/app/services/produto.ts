import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiService } from './api.service';

export interface Tamanho {
  id?: number;
  tamanho: string;
  estoqueMinimo: number;
}

export interface Produto {
  id?: number;
  codigo: string;
  valorMaoDeObraDuzia: number;
  valorMaoDeObraPeca: number;
  precoVendaDuzia: number;   // ✅ NOVO CAMPO
  precoVendaPeca: number;    // ✅ EXISTENTE
  tamanhos: Tamanho[];
}

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private endpoint = 'produtos';

  // Stream pública para reagir a alterações
  private _produtoChanged = new Subject<void>();
  produtoChanged$ = this._produtoChanged.asObservable();

  constructor(private api: ApiService) {}

  triggerChange(): void {
    this._produtoChanged.next();
  }

  criarProduto(produto: Produto): Observable<Produto> {
    return this.api.post<Produto>(this.endpoint, produto);
  }

  obterProduto(id: number): Observable<Produto> {
    return this.api.get<Produto>(`${this.endpoint}/${id}`);
  }

  listarProdutos(): Observable<Produto[]> {
    return this.api.get<Produto[]>(this.endpoint);
  }

  buscarPorCodigo(codigo: string): Observable<Produto> {
    return this.api.get<Produto>(`${this.endpoint}/codigo/${encodeURIComponent(codigo)}`);
  }

  atualizarProduto(id: number, produto: Partial<Produto>): Observable<any> {
    return this.api.put(`${this.endpoint}/${id}`, produto);
  }

  deletarProduto(id: number): Observable<any> {
    return this.api.delete(`${this.endpoint}/${id}`);
  }
}
