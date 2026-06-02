// ============================================================
// CLEANUP — Remove lançamentos recorrentes duplicados
// Estratégia: pra cada (recorrenciaId, mês), mantém apenas o
// lançamento criado primeiro (criadoEm mais antigo). Deleta os outros.
// ============================================================
import {
  doc, collection, getDocs, deleteDoc, writeBatch, setDoc, getDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function executaLimpezaRecorrentes(db, toast){
  const flagRef = doc(db, 'config', 'cleanupRecorrentesV1');
  const flagSnap = await getDoc(flagRef);
  if(flagSnap.exists()){
    if(!confirm('Limpeza já foi executada. Executar de novo é seguro mas desnecessário. Continuar?')){
      toast('Cancelado.');
      return;
    }
  }

  // Buscar TODOS os lançamentos que vieram de recorrência
  const snap = await getDocs(collection(db, 'lancamentos'));
  const todos = snap.docs.map(d => ({id: d.id, ref: d.ref, ...d.data()}));
  const recorrentes = todos.filter(l => l.recorrenciaId);

  // Agrupar por (recorrenciaId + ano-mês)
  const grupos = new Map();
  for(const l of recorrentes){
    const d = new Date(l.ts);
    const mesKey = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
    const chave = `${l.recorrenciaId}|${mesKey}`;
    if(!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(l);
  }

  // Para cada grupo com mais de 1 item, deletar todos exceto o mais antigo (criadoEm)
  let totalDeletado = 0;
  const paraDeletar = [];
  for(const [chave, lista] of grupos){
    if(lista.length <= 1) continue;
    // ordena por criadoEm ascendente; mantém o primeiro
    lista.sort((a,b) => (a.criadoEm||0) - (b.criadoEm||0));
    const manter = lista[0];
    const deletar = lista.slice(1);
    for(const d of deletar){
      paraDeletar.push(d);
      totalDeletado++;
    }
  }

  if(totalDeletado === 0){
    toast('Nenhuma duplicata encontrada.');
    await setDoc(flagRef, { executadoEm: Date.now(), deletados: 0 });
    return;
  }

  // Deletar em batches de 400
  for(let i = 0; i < paraDeletar.length; i += 400){
    const slice = paraDeletar.slice(i, i + 400);
    const b = writeBatch(db);
    for(const d of slice) b.delete(d.ref);
    await b.commit();
  }

  await setDoc(flagRef, {
    executadoEm: Date.now(),
    deletados: totalDeletado,
  });

  toast(`✓ ${totalDeletado} duplicata${totalDeletado>1?'s':''} removida${totalDeletado>1?'s':''}.`);
}
