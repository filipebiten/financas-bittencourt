// ============================================================
// RECONCILIAÇÃO — classificação agosto, parte 1 (itens com dado exato)
//
// Decisões do Filipe (25/09/2026):
//   - PIX pequenos pessoais/ministério -> categoria "pessoal" (usei
//     pessoalfilipe, é ele quem manda esses PIX; ajustar se for o caso).
//   - IOF -> sempre bancojuros (categoria "Banco/Juros").
//   - Erick 200 (25/08) -> transporte.
//   - Eraildes 120 (17/08) -> "gastos mari" = pessoalmari.
//   - Bebi Festas duplicada em julho, confirmado -> apaga a manual de
//     87,00 (seed-v30, 01/07), mantém a parcela real 1/3+2/3+3/3.
//   - Óticas Carol -> confirma saude, já está certo, nada a fazer.
//
// Lidos ao vivo no Firestore (Chrome logado) em 25/09/2026 pra pegar
// id/data exatos antes de escrever:
//   - "Pix laura" 24,00 (26/08) já lançado como pessoalmari -> corrige p/ pessoalfilipe
//   - "Tania" 60,00 (11/08) já lançado como alimentacao -> corrige p/ pessoalfilipe
//   - "Bebi Festa Locação" 87,00 (01/07, origem seed-v30) -> duplicata, apaga
//
// NÃO INCLUÍDOS (sem data exata no roadmap, só valor agregado do
// extrato — perguntar o dia certo antes de lançar às cegas):
//   Rhoan 60 · Laura 30 (2º PIX) · Bruna 72,50 x2 · Julia 20+10 ·
//   Deborah 100 · Isabela 25 · Elisa 15 · Beatriz 15 · Maria Eduarda 10 ·
//   Fabiola 40 · Mafra 80 · débito viagem (Churrascaria Gramado 59,
//   Auto Posto Parati 146,68, Drive Três Lagoas 83,60, Pit Stop Parati 39) ·
//   seguro cartao 11,46
//
// Idempotente. Roda no console (F12) LOGADO no app:
//   const m = await import('./reconciliacao-agosto-2026-09-25.js?v=1'); await m.executaReconciliacaoAgosto2();
// ============================================================

import { getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function executaReconciliacaoAgosto2(){
  const db = getFirestore(getApp());
  const log = (...a) => console.log('[reconciliacao-agosto-25set]', ...a);
  const norm = s => (s ?? '').toString().toLowerCase();

  // ---------------------------------------------------------
  // 1. Corrige categoria de 2 lançamentos já existentes
  // ---------------------------------------------------------
  const correcoes = [
    { id: 'hHLz7YyqaoKatwgUEVYR', desc: 'Pix laura (24,00, 26/08)', novaCategoria: 'pessoalfilipe' },
    { id: 'uUFWioG0ETXy4AWyOh4w', desc: 'Tania (60,00, 11/08)',     novaCategoria: 'pessoalfilipe' },
  ];
  for(const c of correcoes){
    const ref = doc(db, 'lancamentos', c.id);
    const snap = await getDoc(ref);
    if(!snap.exists()){ log(`NÃO ACHEI (pulei): ${c.desc}`); continue; }
    const atual = snap.data().categoriaId;
    if(atual === c.novaCategoria){ log(`já estava certo, pulei: ${c.desc}`); continue; }
    await updateDoc(ref, { categoriaId: c.novaCategoria });
    log(`corrigido: ${c.desc} — ${atual} -> ${c.novaCategoria}`);
  }

  // ---------------------------------------------------------
  // 2. Apaga duplicata Bebi Festas (manual 87,00, seed-v30, 01/07)
  // ---------------------------------------------------------
  const dupRef = doc(db, 'lancamentos', 'gcWjxtf9TQp5qv3illtR');
  const dupSnap = await getDoc(dupRef);
  if(dupSnap.exists() && dupSnap.data().origem === 'seed-v30' && Math.abs((dupSnap.data().valor||0) - 87) < 0.01){
    await deleteDoc(dupRef);
    log('apagada duplicata: Bebi Festa Locação 87,00 (01/07, seed-v30)');
  } else {
    log('duplicata Bebi Festas não encontrada como esperado, pulei (confira manual)');
  }

  // ---------------------------------------------------------
  // 3. Cria avulsos com data exata conhecida
  // ---------------------------------------------------------
  const avulsos = [
    { descricao: 'IOF',    valor: 13.31,  categoriaId: 'bancojuros',   dataIso: '2026-08-03' },
    { descricao: 'Eraildes', valor: 120.00, categoriaId: 'pessoalmari', dataIso: '2026-08-17' },
    { descricao: 'Erick',    valor: 200.00, categoriaId: 'transporte', dataIso: '2026-08-25' },
  ];
  const lancsSnap = await getDocs(collection(db, 'lancamentos'));
  const existentes = lancsSnap.docs.map(d => d.data());
  for(const a of avulsos){
    const jaExiste = existentes.some(l =>
      norm(l.descricao).includes(norm(a.descricao)) && Math.abs((l.valor||0) - a.valor) < 0.01
    );
    if(jaExiste){ log(`já lançado, pulei: ${a.descricao}`); continue; }
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

  log('concluído. Óticas Carol conferida como saude — nada a mudar.');
  log('Ainda faltam (sem data exata): PIX Rhoan/Laura-2º/Bruna/Julia/Deborah/Isabela/Elisa/Beatriz/MariaEduarda/Fabiola/Mafra, débito viagem, seguro cartao.');
}
