import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Movimentacao {
  id?: number;
  materialId: number;
  quantidade: number;
  tipo: 'entrada' | 'saida';
  confeccaoId?: number | null;
  usuarioId?: number | null;
  valorUnitario?: number | null;
  emAberto?: boolean;
  observacao?: string;
  data?: string;
}

@Injectable({ providedIn: 'root' })
export class MovimentacaoMaterialService {
  private endpoint = 'movimentar-estoque';

  constructor(private api: ApiService) {}

  listar(): Observable<Movimentacao[]> {
    return this.api.get<Movimentacao[]>(this.endpoint);
  }

  criar(mov: Movimentacao): Observable<Movimentacao> {
    return this.api.post<Movimentacao>(this.endpoint, mov);
  }

  atualizar(id: number, campos: Partial<Movimentacao>): Observable<Movimentacao> {
    return this.api.patch<Movimentacao>(`${this.endpoint}/${id}`, campos);
  }

  deletar(id: number): Observable<any> {
    return this.api.delete(`${this.endpoint}/${id}`);
  }
}
