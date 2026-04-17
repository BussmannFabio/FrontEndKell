import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- INTERFACES ---

export interface Vendedor {
    id: number;
    nome: string;
    telefone: string;
    documento?: string; // Opcional se não for usado sempre
}

// 💡 ISSO RESOLVE O ERRO TS2305 (Exported member 'Cliente')
export interface Cliente {
    id?: number;
    nome: string;
    endereco: string;
    documento: string;
    telefone: string;
}

@Injectable({
    providedIn: 'root'
})
export class CadastroService {
    // Ajuste as URLs conforme seu backend
    private VENDEDOR_URL = 'http://192.168.10.50:3001/vendedores';
    private CLIENTE_URL = 'http://192.168.10.50:3001/clientes';

    constructor(private http: HttpClient) { }

    // =============================
    // === MÉTODOS PARA VENDEDOR ===
    // =============================

    getVendedores(): Observable<Vendedor[]> {
        return this.http.get<Vendedor[]>(this.VENDEDOR_URL);
    }

    getVendedorById(id: number): Observable<Vendedor> {
        return this.http.get<Vendedor>(`${this.VENDEDOR_URL}/${id}`);
    }

    atualizarVendedor(id: number, vendedorData: Vendedor): Observable<any> {
        return this.http.put(`${this.VENDEDOR_URL}/${id}`, vendedorData);
    }

    cadastrarVendedor(vendedorData: Omit<Vendedor, 'id'>): Observable<any> {
        return this.http.post(this.VENDEDOR_URL, vendedorData);
    }

    excluirVendedor(id: number): Observable<any> {
        return this.http.delete(`${this.VENDEDOR_URL}/${id}`);
    }

    // ==========================
    // === MÉTODOS PARA CLIENTE ===
    // 💡 ISSO RESOLVE OS ERROS TS2339 (Property does not exist)
    // ==========================

    getClientes(): Observable<Cliente[]> {
        return this.http.get<Cliente[]>(this.CLIENTE_URL);
    }

    cadastrarCliente(clienteData: Cliente): Observable<any> {
        return this.http.post(this.CLIENTE_URL, clienteData);
    }

    atualizarCliente(id: number, clienteData: Cliente): Observable<any> {
        return this.http.put(`${this.CLIENTE_URL}/${id}`, clienteData);
    }

    excluirCliente(id: number): Observable<any> {
        return this.http.delete(`${this.CLIENTE_URL}/${id}`);
    }
}