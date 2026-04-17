export interface ClienteDTO {
  id: number;
  nome: string;
  endereco: string;
  documento: string;
  telefone: string;
  vendedorId?: number;
  vendedor?: { nome: string };
}

export interface VendedorDTO {
  id: number;
  nome: string;
  telefone: string;
}

export interface MetodoPagamento {
  id: number;
  nome: string;
  diasParcelas: number[];
}

export interface ProdutoTamanhoDTO {
  id: number;
  tamanho: string;
  estoqueSp?: number;
  estoquePadrao?: number;
}

export interface ProdutoCompletoDTO {
  id: number;
  codigo: string;
  descricao: string;
  precoVendaPeca: number | string;
  precoVendaDuzia: number | string;
  tamanhos: ProdutoTamanhoDTO[];
}

export interface PedidoDTO {
  id: number;
  cliente: string;
  precoTotal: number;
  status: 'ROMANEIO' | 'FINALIZADO' | 'CANCELADO';
  volumes: number;
  cidadeSeparacao: string;
  valorBruto?: number;
  // Suporta ambas as nomenclaturas para evitar quebra no mapeamento do banco
  items?: any[];
  itens?: any[];
}

export interface ValePedidoItemPayload {
  produtoTamanhoId: number;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface ValePedidoPayload {
  clienteId: number | null;
  vendedorId: number | null;
  cliente: string;
  endereco: string;
  vendedor: string;
  metodoPagamento?: string;
  cidadeSeparacao: string;
  parcelas: number;
  dataInicialPagamento: string;
  dataEmissao?: string;
  volumes: number;
  valorBruto: number;
  descontoPorcento: number;
  precoTotal: number;
  items: ValePedidoItemPayload[];
  status?: string;
}

export interface FinalizarValePayload {
  volumes: number;
  precoTotal: number;
  valorBruto?: number;
  cidadeSeparacao: string;
  itens: {
    produtoTamanhoId: number;
    quantidade: number;
  }[];
}