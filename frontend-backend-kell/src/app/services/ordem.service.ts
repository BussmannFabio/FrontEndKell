import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrdemService {
  private base = 'ordens';

  constructor(private api: ApiService) {}

  /**
   * Lista as ordens do sistema.
   * @param status Opcional. Se não enviado, o backend deve retornar todas as ordens.
   */
  listarOrdens(status?: string): Observable<any> {
    if (status && status.trim() !== '') {
      // Passa o objeto de query params para o ApiService
      return this.api.get(this.base, { status: status });
    }
    // Busca sem filtros (Trará ABERTAS e RETORNADAS)
    return this.api.get(this.base);
  }

  buscarOrdemPorId(id: number | string): Observable<any> {
    if (!id) {
      throw new Error('buscarOrdemPorId: ID da ordem é obrigatório.');
    }
    return this.api.get(`${this.base}/${id}`);
  }

  criarOrdem(payload: any): Observable<any> {
    return this.api.post(this.base, payload);
  }

  /**
   * Realiza o retorno de peças da OS para o estoque.
   */
  retornarOrdem(id: number | string, payload: any): Observable<any> {
    if (!id) {
      throw new Error('retornarOrdem: ID da ordem é obrigatório para o retorno.');
    }
    // Payload contém: { itens: [...], retornoTotal: boolean, dataRetorno: string }
    return this.api.patch(`${this.base}/${id}/retornar`, payload);
  }

  /**
   * Reabre uma OS que já foi finalizada/retornada.
   */
  reabrirOrdem(id: number | string): Observable<any> {
    if (!id) {
      throw new Error('reabrirOrdem: ID da ordem é obrigatório.');
    }
    return this.api.patch(`${this.base}/${id}/reabrir`, {});
  }

  /**
   * Exclui permanentemente uma OS do banco de dados.
   */
  deletarOrdem(id: number | string): Observable<any> {
    if (!id) {
      throw new Error('deletarOrdem: ID da ordem é obrigatório.');
    }
    return this.api.delete(`${this.base}/${id}`);
  }
}