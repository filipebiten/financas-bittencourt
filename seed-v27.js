// ============================================================
// SEED v2.7 — ajustes finais e gastos novos
// Executa UMA VEZ ao clicar no botão. Faz:
// 1. Adiciona os 5 gastos que entraram na fatura de junho (compras de maio)
// 2. PIX Bia R$ 20 em junho
// 3. Atualiza valor do aluguel pra R$ 1.899,46 em maio
// 4. Adiciona dataFim em Unimed (junho/26) e Minas Brasil (agosto/26)
// 5. Cria nova recorrência: Aluguel R$ 1.875,23 a partir de julho/26
// ============================================================
import {
  getFirestore, doc, setDoc, collection, addDoc, writeBatch, getDoc, getDocs, query, where, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function executaSeedV27(db, toast){
  const flagRef = doc(db, 'config', 'seedV27Executado');
  const flagSnap = await getDoc(flagRef);
  if(flagSnap.exists()){
    if(!confirm('Este ajuste já foi executado. Executar de novo VAI DUPLICAR. Tem certeza?')){
      toast('Cancelado.');
      return;
    }
  }

  // ============== 1. NOVOS LANÇAMENTOS (compras maio que foram pra fatura junho) ==============
  // Lançados com data de maio (15/05/26), conforme decisão do Filipe
  const novos = [
    [15, 5, 'Fornalha Pizzaria',     120.00, 'restaurante',  '2913'],
    [15, 5, 'Laureen depilação Mari', 143.00, 'pessoalmari', '3877'],
    [15, 5, 'Assaí Atacadista',       286.40, 'alimentacao', '3877'],
    [15, 5, 'Mercado Legal',          10.40,  'alimentacao', '2913'],
    [15, 5, 'Mercado Legal',          56.26,  'alimentacao', '2913'],
    // PIX Bia em junho
    [1,  6, 'PIX Bia',                20.00,  'outros',      ''],
  ];

  const batch1 = writeBatch(db);
  for(const [dia, mes, desc, valor, cat, cartao] of novos){
    const ts = new Date(2026, mes - 1, dia, 12, 0).getTime();
    const ref = doc(collection(db, 'lancamentos'));
    batch1.set(ref, {
      valor, descricao: desc, categoriaId: cat,
      cartao: cartao || null,
      ts, data: new Date(ts).toISOString(),
      criadoEm: Date.now(),
      origem: 'seed-v27',
    });
  }
  await batch1.commit();

  // ============== 2. CORRIGE VALOR DO ALUGUEL DE MAIO ==============
  // Procura lançamento "Aluguel" de maio/26 e atualiza valor pra 1899.46
  const iniMaio = new Date(2026, 4, 1).getTime();
  const fimMaio = new Date(2026, 4, 31, 23, 59, 59).getTime();
  const qLanc = query(
    collection(db, 'lancamentos'),
    where('ts', '>=', iniMaio),
    where('ts', '<=', fimMaio)
  );
  const snapLanc = await getDocs(qLanc);
  for(const d of snapLanc.docs){
    const data = d.data();
    if(data.descricao === 'Aluguel'){
      await updateDoc(d.ref, { valor: 1899.46 });
    }
  }

  // ============== 3. AJUSTA RECORRÊNCIAS ==============
  // Aluguel atual: muda valor pra 1899.46 e adiciona dataFim em 30/06/26 (próxima vai ser nova)
  // Unimed: dataFim em 30/06/26 (sai em julho)
  // Minas Brasil: dataFim em 27/08/26 (última parcela)
  const snapRec = await getDocs(collection(db, 'recorrencias'));
  for(const d of snapRec.docs){
    const data = d.data();
    if(data.descricao === 'Aluguel'){
      await updateDoc(d.ref, {
        valor: 1899.46,
        dataFim: new Date(2026, 5, 30, 23, 59).toISOString(), // até 30/06/26
      });
    }
    if(data.descricao === 'Unimed'){
      await updateDoc(d.ref, {
        dataFim: new Date(2026, 5, 30, 23, 59).toISOString(), // último mês: junho/26
      });
    }
    if(data.descricao === 'Minas Brasil'){
      await updateDoc(d.ref, {
        dataFim: new Date(2026, 7, 31, 23, 59).toISOString(), // último mês: agosto/26
      });
    }
  }

  // ============== 4. NOVA RECORRÊNCIA: Aluguel R$ 1.875,23 a partir de julho/26 ==============
  await addDoc(collection(db, 'recorrencias'), {
    descricao: 'Aluguel',
    valor: 1875.23,
    categoriaId: 'moradia',
    diaDoMes: 5,
    cartao: null,
    dataInicio: new Date(2026, 6, 1).toISOString(), // a partir de 01/07/26
    dataFim: null,
    criadoEm: Date.now(),
  });

  // ============== 5. APAGAR LANÇAMENTOS FUTUROS ERRADOS DE UNIMED ==============
  // Como Unimed sai em julho, se materializaRecorrencias já tiver criado um pra junho/26 está OK
  // Mas se tiver criado pra julho+ por engano, remover. Por enquanto, deixar simples:
  // a nova lógica de dataFim na materialização vai impedir criação futura.
  // Lançamentos já criados de Unimed só em maio (do seed original), então não precisa apagar.

  // ============== 6. MARCAR SEED EXECUTADO ==============
  await setDoc(flagRef, {
    executadoEm: Date.now(),
    o_que_fez: '5 gastos novos + PIX Bia + correção aluguel + dataFim Unimed/Minas + aluguel novo R$1875.23',
  });

  toast('✓ Ajustes v2.7 aplicados! Confira maio e junho.');
}
