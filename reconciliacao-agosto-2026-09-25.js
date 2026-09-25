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
//   - Seguro cartão 11,46 -> não mantém recorrente, mas o de agosto foi
//     cobrado mesmo -> lança avulso, categoria seguros.
//   - Débito viagem (Gramado/Parati/Três Lagoas) -> categoria lazer
//     (não existe categoria "viagem" no app; chamada mais próxima).
//
// Lidos ao vivo no Firestore (Chrome logado) em 25/09/2026 pra pegar
// id/data exatos antes de escrever:
//   - "Pix laura" 24,00 (26/08) já lançado como pessoalmari -> corrige p/ pessoalfilipe
//   - "Tania" 60,00 (11/08) já lançado como alimentacao -> corrige p/ pessoalfilipe
//   - "Bebi Festa Locação" 87,00 (01/07, origem seed-v30) -> duplicata, apaga
//
// Parte 2 (25/09/2026): resto dos PIX pequenos + débito viagem + seguro
// cartão. Filipe confirmou: dia exato não importa, só cair no mês certo
// (agosto/2026) — usei dia 15 pros PIX (meio do mês) e 21–22 pro débito
// de viagem (única janela que o extrato original dava).
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

  log('Óticas Carol conferida como saude — nada a mudar.');

  // ---------------------------------------------------------
  // 4. Resto dos PIX pequenos + débito viagem + seguro cartão
  //    (dia chutado dentro do mês certo, valor é o que importa)
  // ---------------------------------------------------------
  const avulsos2 = [
    { descricao: 'Pix Rhoan',              valor: 60.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Laura (2)',          valor: 30.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Bruna (1)',          valor: 72.50,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Bruna (2)',          valor: 72.50,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Julia (1)',          valor: 20.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Julia (2)',          valor: 10.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Deborah',            valor: 100.00, categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Isabela',            valor: 25.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Elisa',              valor: 15.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Beatriz',            valor: 15.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Maria Eduarda',      valor: 10.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Fabiola',            valor: 40.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Pix Mafra',              valor: 80.00,  categoriaId: 'pessoalfilipe', dataIso: '2026-08-15' },
    { descricao: 'Churrascaria Gramado (viagem)',  valor: 59.00,  categoriaId: 'lazer', dataIso: '2026-08-21' },
    { descricao: 'Auto Posto Parati (viagem)',     valor: 146.68, categoriaId: 'lazer', dataIso: '2026-08-21' },
    { descricao: 'Drive Três Lagoas (viagem)',     valor: 83.60,  categoriaId: 'lazer', dataIso: '2026-08-22' },
    { descricao: 'Pit Stop Parati (viagem)',       valor: 39.00,  categoriaId: 'lazer', dataIso: '2026-08-22' },
    { descricao: 'Seguro cartão',           valor: 11.46,  categoriaId: 'seguros', dataIso: '2026-08-15' },
  ];
  const lancsSnap2 = await getDocs(collection(db, 'lancamentos'));
  const existentes2 = lancsSnap2.docs.map(d => d.data());
  for(const a of avulsos2){
    const jaExiste = existentes2.some(l =>
      Math.abs((l.valor||0) - a.valor) < 0.01 && new Date(l.ts).getMonth() === 7 && new Date(l.ts).getFullYear() === 2026
      && norm(l.descricao).includes(norm(a.descricao).split(' ')[1] || norm(a.descricao).split(' ')[0])
    );
    if(jaExiste){ log(`já lançado (bate valor+mês+nome), pulei: ${a.descricao}`); continue; }
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

  log('concluído.');
}
