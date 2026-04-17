import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import {
  ClienteDTO,
  VendedorDTO,
  ProdutoCompletoDTO,
  PedidoDTO,
  ValePedidoPayload,
  FinalizarValePayload
} from './vale-pedido.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ValePedidoSpService {
  private readonly BASE_URL = 'http://192.168.10.50:3001';
  
  public readonly VALEPEDIDOS_ENDPOINT = `${this.BASE_URL}/vale-pedido-sp`;
  private readonly PRODUTOS_ENDPOINT = `${this.BASE_URL}/vale-pedido-sp/produto`;
  private readonly CLIENTES_ENDPOINT = `${this.BASE_URL}/clientes`;
  private readonly VENDEDORES_ENDPOINT = `${this.BASE_URL}/vendedores`;

  constructor(private http: HttpClient) {}

  criarRomaneio(payload: ValePedidoPayload): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(this.VALEPEDIDOS_ENDPOINT, payload)
      .pipe(catchError(this.handleError));
  }

  /**
   * Finaliza o pedido garantindo que apenas o ID do tamanho e a quantidade sejam enviados.
   */
  finalizarPedido(id: number, payload: FinalizarValePayload): Observable<any> {
    const sanitizedBody = {
      volumes: Number(payload.volumes),
      precoTotal: Number(payload.precoTotal),
      valorBruto: Number(payload.valorBruto || 0),
      cidadeSeparacao: payload.cidadeSeparacao,
      // Mapeamento rigoroso: garantimos que o campo enviado é o ID do estoque (produtoTamanhoId)
      itens: (payload.itens || []).map(item => ({
        produtoTamanhoId: item.produtoTamanhoId,
        quantidade: Number(item.quantidade)
      }))
    };

    return this.http.put<any>(`${this.VALEPEDIDOS_ENDPOINT}/${id}/finalizar`, sanitizedBody)
      .pipe(
        tap(res => console.log(`✅ Pedido #${id} finalizado com sucesso`, res)),
        catchError(this.handleError)
      );
  }

  listarPedidos(): Observable<PedidoDTO[]> {
    return this.http.get<PedidoDTO[]>(this.VALEPEDIDOS_ENDPOINT).pipe(
      map(pedidos => pedidos.map(p => ({
        ...p,
        status: p.status || 'ROMANEIO'
      }))),
      catchError(this.handleError)
    );
  }

  buscarPedidoPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.VALEPEDIDOS_ENDPOINT}/${id}`)
      .pipe(
        tap(res => console.log(`📦 Detalhes do pedido #${id} carregados`)),
        catchError(this.handleError)
      );
  }

  deletarPedido(id: number): Observable<any> {
    return this.http.delete<any>(`${this.VALEPEDIDOS_ENDPOINT}/${id}`)
      .pipe(catchError(this.handleError));
  }

  listarClientes(): Observable<ClienteDTO[]> {
    return this.http.get<ClienteDTO[]>(this.CLIENTES_ENDPOINT)
      .pipe(catchError(this.handleError));
  }

  listarVendedores(): Observable<VendedorDTO[]> {
    return this.http.get<VendedorDTO[]>(this.VENDEDORES_ENDPOINT)
      .pipe(catchError(this.handleError));
  }

  buscarProdutoCompleto(codigo: string): Observable<ProdutoCompletoDTO> {
    return this.http.get<ProdutoCompletoDTO>(`${this.PRODUTOS_ENDPOINT}/${codigo}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Erro desconhecido';
    
    if (error.status === 404) {
      errorMessage = `Recurso não encontrado (404). Verifique se a rota ou o ID existe no servidor.`;
    } else {
      errorMessage = error.error?.error || error.error?.message || error.message || 'Erro na comunicação com o servidor';
    }

    console.error('🔥 [API ERROR]:', error);
    return throwError(() => new Error(errorMessage));
  }
}