// ============================================================
// SEED v3.1 — RE-SINCRONIZAÇÃO 06/07/2026
//
// Roda UMA VEZ. Auto-contido (inicializa o próprio Firebase).
//
// COMO RODAR:
//   1. Suba este arquivo no repositório
//   2. Abra o app e o console (F12)
//   3. Cole:
//        const m = await import('./seed-v31.js?v=1'); await m.executaSeedV31();
//
// PRÉ-REQUISITO: subir o app.js novo (saldo desacoplado) ANTES, senão
// o saldo continua sendo recalculado pelos lançamentos e volta a divergir.
//
// O QUE FAZ (não apaga junho nem julho já lançado — só ADICIONA/ATUALIZA):
//   1. Lança os gastos de cartão de julho que você passou (data 06/07).
//   2. Ancora o saldo REAL da conta em -R$ 7.748,64.
//   3. Atualiza a carteira de investimentos (06/07) + Grão R$ 3.431,94.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, setDoc, collection, getDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6q9FtRdqdvVG4rbKQGfW97hzjagppeao",
  authDomain: "financas-bittencourt.firebaseapp.com",
  projectId: "financas-bittencourt",
  storageBucket: "financas-bittencourt.appspot.com",
};

export async function executaSeedV31(dbArg, toastArg){
  const db = dbArg || getFirestore(initializeApp(firebaseConfig, 'seedv31'));
  const toast = toastArg || ((msg) => console.log('[seed-v31]', msg));

  const flagRef = doc(db, 'config', 'seedV31Executado');
  if((await getDoc(flagRef)).exists()){
    if(!confirm('⚠️ A v3.1 já rodou. Rodar de novo duplica os gastos de julho. Continuar?')){
      toast('Cancelado.'); return;
    }
  }

  const tsOf = (y,m,d,h=12) => new Date(y,m,d,h,0).getTime();

  // ============================================================
  // 1. GASTOS DE CARTÃO — JULHO (data 06/07)
  // [descricao, valor, categoria, cartao]
  // ============================================================
  const julho = [
    ['Mercadinho',        140.03, 'alimentacao',   '2913'],
    ['Lojas Renner',       18.12, 'pessoalfilipe', '2913'],
    ['Drogasil',          152.82, 'saude',         '2913'],
    ['Estacionamento',     21.00, 'transporte',    '2913'],
    ['Gasto Mari',         15.98, 'pessoalmari',   '3877'],
    ['Gasto Mari',         23.34, 'pessoalmari',   '3877'],
    ['Conveniência',       22.97, 'outros',        '2913'],
  ];
  const b = writeBatch(db);
  for(const [desc, valor, cat, cartao] of julho){
    const ts = tsOf(2026, 6, 6);
    b.set(doc(collection(db, 'lancamentos')), {
      valor, descricao: desc, categoriaId: cat,
      cartao: cartao || null, ts, data: new Date(ts).toISOString(),
      criadoEm: Date.now(), origem: 'seed-v31',
    });
  }
  await b.commit();

  // ============================================================
  // 2. SALDO REAL DA CONTA — 06/07
  // ============================================================
  await setDoc(doc(db, 'config', 'saldoConta'), {
    valor: -7748.64,
    atualizadoEm: Date.now(),
  });

  // ============================================================
  // 3. CARTEIRA DE INVESTIMENTOS — 06/07 (reconcilia c/ totais e %)
  // ============================================================
  const carteiraRef = doc(db, 'investimentos', 'carteira');
  const grAntigo = ((await getDoc(carteiraRef)).data()?.grao) || {};

  await setDoc(carteiraRef, {
    arca: {
      acoesBR: [
        { nome: 'BBDC4', valor: 481.95 },
        { nome: 'SOJA3', valor: 345.68 },
        { nome: 'CMIG4', valor: 153.44 },
      ],
      fiis: [
        { nome: 'XPML11', valor: 524.76 },
        { nome: 'FIGS11', valor: 299.94 },
        { nome: 'BTHF11', valor: 210.22 },
      ],
      rendaFixa: [
        { nome: 'Tesouro Selic 2029', valor: 386.78 },
        { nome: 'NTN-B1 Renda+ 2065', valor: 317.36 },
        { nome: 'Tesouro Selic 2028', valor: 193.10 },
        { nome: 'Prefixado 2028',     valor: 114.99 },
      ],
      internacional: [
        { nome: 'Rico Bitcoin Dólar FIMRL', valor: 660.56, cripto: true },
        { nome: 'VCLT (Nomad · US$ 75,71)', valor: 391.42 },
        { nome: 'Bitcoin direto',           valor: 133.07, cripto: true },
        { nome: 'NVDC34 (BDR NVIDIA)',      valor: 42.00 },
      ],
    },
    grao: { ...grAntigo, valor: 3431.94 },
    saldoCarteira: 22.93,
    atualizadoEm: Date.now(),
  });

  await setDoc(flagRef, { executadoEm: Date.now() });
  toast('✓ v3.1 concluída. Saldo real ancorado, gastos de julho lançados, carteira atualizada. Recarregue o app.');
}
