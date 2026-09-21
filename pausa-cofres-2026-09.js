// ============================================================
// PAUSA COFRES — setembro/2026
//
// Marca pausado:true nos 3 cofres existentes (IPVA, Manutenção,
// Aniversários), conforme decisão de suspender aportes até o
// caixa estabilizar (pendência §8 do CLAUDE.md).
//
// RODA UMA VEZ. Idempotente.
// Rode no console (F12) LOGADO no app:
//   const m = await import('./pausa-cofres-2026-09.js?v=1'); await m.executaPausaCofres();
// ============================================================

import { getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function executaPausaCofres(){
  const db = getFirestore(getApp());
  const log = (...a) => console.log('[pausa-cofres]', ...a);

  const snap = await getDocs(collection(db, 'cofres'));
  let n = 0;
  for(const d of snap.docs){
    const c = d.data();
    if(c.pausado === true){
      log(`já pausado: ${c.nome}`);
      continue;
    }
    await updateDoc(doc(db, 'cofres', d.id), { pausado: true });
    log(`pausado: ${c.nome}`);
    n++;
  }
  log(`concluído. ${n} cofre(s) atualizado(s).`);
}
