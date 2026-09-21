// ============================================================
// RECONCILIAÇÃO — avulsos de agosto + resgate parcial cofre férias
//
// Decisões do Filipe (20/09/2026):
//   - Lança os avulsos de agosto (SSP, Aura, Assaí). DARF PULADO —
//     é o mesmo pagamento da recorrência "IRRF 255,22" já materializada
//     em agosto, lançar de novo duplicaria.
//   - Resgate do cofre férias (Tesouro Selic 2031) saiu R$3.000,00,
//     não os 3.898,63 programados. Ainda não estava refletido no
//     saldo ancorado — soma 3.000 no saldo em conta e desconta do
//     bolso "Cofre férias" em investimentos/carteira.
//
// RODA UMA VEZ. Idempotente pros lançamentos (checa antes de duplicar).
// O ajuste de saldo/bolso NÃO é idempotente — não rode duas vezes.
// Rode no console (F12) LOGADO no app:
//   const m = await import('./reconciliacao-agosto-2026-09.js?v=1'); await m.executaReconciliacaoAgosto();
// ============================================================

import { getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, getDoc, updateDoc, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function executaReconciliacaoAgosto(){
  const db = getFirestore(getApp());
  const log = (...a) => console.log('[reconciliacao-agosto]', ...a);
  const norm = s => (s ?? '').toString().toLowerCase();

  // ---------------------------------------------------------
  // 1. Avulsos de agosto (DARF pulado — duplicaria com IRRF recorrente)
  // ---------------------------------------------------------
  const avulsos = [
    { descricao: 'PIX SSP Departamento Estadual (licenciamento)', valor: 251.27, categoriaId: 'transporte',   dataIso: '2026-08-04' },
    { descricao: 'Aura Beleza SPA',                               valor: 225.00, categoriaId: 'pessoalmari',  dataIso: '2026-08-07' },
    { descricao: 'Assaí',                                         valor: 1466.63, categoriaId: 'alimentacao', dataIso: '2026-08-15' },
  ];

  const lancsSnap = await getDocs(collection(db, 'lancamentos'));
  const existentes = lancsSnap.docs.map(d => d.data());

  for(const a of avulsos){
    const jaExiste = existentes.some(l =>
      norm(l.descricao).includes(norm(a.descricao).split(' ')[0]) && Math.abs((l.valor||0) - a.valor) < 0.01
    );
    if(jaExiste){
      log(`já lançado, pulei: ${a.descricao}`);
      continue;
    }
    const dataBase = new Date(a.dataIso + 'T12:00:00');
    await addDoc(collection(db, 'lancamentos'), {
      valor: a.valor,
      descricao: a.descricao,
      categoriaId: a.categoriaId,
      ts: dataBase.getTime(),
      data: dataBase.toISOString(),
      criadoEm: Date.now(),
    });
    log(`lançado: ${a.descricao} (${a.categoriaId}) R$${a.valor} em ${a.dataIso}`);
  }
  log('DARF 255,22 (10/08) PULADO de propósito — já coberto pela recorrência IRRF 255,22.');

  // ---------------------------------------------------------
  // 2. Resgate parcial cofre férias: -3.000 no bolso, +3.000 no saldo
  // ---------------------------------------------------------
  const invRef = doc(db, 'investimentos', 'carteira');
  const invSnap = await getDoc(invRef);
  const inv = invSnap.data();
  const bolsos = (inv.bolsosForaArca || []).map(b => {
    if(b.finalidade === 'Cofre férias'){
      const novoValor = Math.max(0, (b.valor||0) - 3000);
      log(`Cofre férias: ${b.valor} -> ${novoValor} (resgate de 3.000)`);
      return { ...b, valor: novoValor };
    }
    return b;
  });
  await updateDoc(invRef, { bolsosForaArca: bolsos, atualizado: new Date().toISOString().split('T')[0] });

  const saldoRef = doc(db, 'config', 'saldoConta');
  const saldoSnap = await getDoc(saldoRef);
  const saldoAtual = saldoSnap.data().valor || 0;
  const novoSaldo = saldoAtual + 3000;
  await updateDoc(saldoRef, { valor: novoSaldo, atualizadoEm: Date.now() });
  log(`Saldo em conta: ${saldoAtual} -> ${novoSaldo} (+3.000 do resgate)`);

  log('concluído.');
}
