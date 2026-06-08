// ============================================================
// SEED v2.11 — Atualização carteira investimentos 08/06/2026
//
// Executa UMA VEZ. Faz:
// 1. Apaga TODOS os ativos das coleções 'investimentos' (arca/quadrantes)
// 2. Recria do zero com os valores fornecidos por Filipe em 08/06/26
// 3. Atualiza valor total do Grão pra R$ 3.414,46
// ============================================================
import {
  doc, setDoc, collection, getDoc, getDocs, writeBatch, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function executaSeedV211(db, toast){
  const flagRef = doc(db, 'config', 'seedV211Executado');
  const flagSnap = await getDoc(flagRef);
  if(flagSnap.exists()){
    if(!confirm('⚠️ Esta atualização já rodou em ' +
      new Date(flagSnap.data().executadoEm).toLocaleString('pt-BR') +
      '. Executar de novo vai zerar a carteira e recriar com os mesmos valores. Continuar?')){
      toast('Cancelado.');
      return;
    }
  }

  // ============== 1-3. ATUALIZAR DOCUMENTO ÚNICO ==============
  // O Firestore guarda 'investimentos/carteira' com subcampos 'arca' (carteira) e 'grao'
  // Pra preservar 'grao.rendimento' (campo antigo) usamos merge

  const carteiraRef = doc(db, 'investimentos', 'carteira');
  const carteiraSnap = await getDoc(carteiraRef);
  const grAntigo = (carteiraSnap.exists() && carteiraSnap.data().grao) || {};

  const arcaNova = {
    rendaFixa: [
      { nome: 'Tesouro Selic 2029',  valor: 382.65 },
      { nome: 'NTN-B1 Renda+ 2065',  valor: 292.17 },
      { nome: 'Tesouro Selic 2028',  valor: 191.51 },
      { nome: 'Prefixado 2028',      valor: 113.03 },
    ],
    acoesBR: [
      { nome: 'BBDC4',                valor: 467.37 },
      { nome: 'SOJA3',                valor: 354.96 },
      { nome: 'CMIG4',                valor: 170.52 },
      { nome: 'NVDC34 (BDR NVIDIA)',  valor: 45.04 },
    ],
    fiis: [
      { nome: 'XPML11', valor: 316.98 },
      { nome: 'FIGS11', valor: 295.14 },
      { nome: 'BTHF11', valor: 210.68 },
    ],
    internacional: [
      { nome: 'Rico Bitcoin Dólar FIMRL', valor: 657.15, cripto: true },
      { nome: 'VCLT (Nomad)',             valor: 390.86 },
      { nome: 'Bitcoin direto',           valor: 131.67, cripto: true },
    ],
  };

  const graoNovo = {
    ...grAntigo,
    valor: 3414.46,
  };

  await setDoc(carteiraRef, {
    arca: arcaNova,
    grao: graoNovo,
    atualizadoEm: Date.now(),
  });

  // ============== MARCAR EXECUTADO ==============
  await setDoc(flagRef, {
    executadoEm: Date.now(),
  });

  toast('✓ Carteira atualizada! Confira aba Investir.');
}
