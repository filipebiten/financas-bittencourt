// ============================================================
// SEED v2.9 — Reset junho + rendas + lançamentos
//
// Executa UMA VEZ. Faz:
// 1. Apaga lançamentos avulsos de junho/26 com origem != 'recorrencia' e != 'parcela'
//    (preserva recorrências materializadas e parcelas vindas do seed v2.8)
// 2. Define saldo inicial -R$ 6.829,18 em 01/06/26
// 3. Cria IUNGO R$ 8.000 como CRÉDITO único em 01/06/26
// 4. Cria recorrência PIB R$ 7.804,93 como CRÉDITO a partir de 05/07/26
// 5. Atualiza cofres: IPVA carro mensal pra jan/27, Manutenção pra dez/26
// 6. Reseta cofre IPVA pra atual=0 (próximo ciclo)
// 7. Cria todos os lançamentos de junho que Filipe passou
// ============================================================
import {
  doc, setDoc, collection, addDoc, writeBatch, getDoc, getDocs, query, where, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function executaSeedV29(db, toast){
  const flagRef = doc(db, 'config', 'seedV29Executado');
  const flagSnap = await getDoc(flagRef);
  if(flagSnap.exists()){
    if(!confirm('⚠️ Este seed já rodou. Executar de novo VAI DUPLICAR lançamentos. Continuar?')){
      toast('Cancelado.');
      return;
    }
  }

  // ============== 1. RESET LANÇAMENTOS AVULSOS DE JUNHO/26 ==============
  // Mantém recorrências materializadas e parcelas — só apaga avulsos
  const iniJun = new Date(2026, 5, 1).getTime();
  const fimJun = new Date(2026, 5, 30, 23, 59, 59).getTime();
  const qJun = query(
    collection(db, 'lancamentos'),
    where('ts', '>=', iniJun),
    where('ts', '<=', fimJun)
  );
  const snapJun = await getDocs(qJun);
  const apagar = snapJun.docs.filter(d => {
    const dt = d.data();
    return dt.origem !== 'recorrencia' && dt.origem !== 'parcela';
  });
  const batchDel = writeBatch(db);
  apagar.forEach(d => batchDel.delete(d.ref));
  if(apagar.length > 0) await batchDel.commit();

  // ============== 2. SALDO INICIAL ==============
  await setDoc(doc(db, 'config', 'saldoConta'), {
    valor: -6829.18,
    atualizadoEm: Date.now(),
  });

  // ============== 3. IUNGO R$ 8.000 CRÉDITO ÚNICO ==============
  const tsIungo = new Date(2026, 5, 1, 12, 0).getTime();
  await addDoc(collection(db, 'lancamentos'), {
    valor: -8000.00,  // negativo = crédito
    descricao: 'IUNGO (renda)',
    categoriaId: 'outros',
    cartao: null,
    ts: tsIungo,
    data: new Date(tsIungo).toISOString(),
    criadoEm: Date.now(),
    origem: 'seed-v29',
  });

  // ============== 4. PIB R$ 7.804,93 RECORRENTE A PARTIR DE 05/07 ==============
  // Criar como recorrência de crédito (valor negativo)
  await addDoc(collection(db, 'recorrencias'), {
    descricao: 'Salário PIB',
    valor: -7804.93,  // negativo = crédito
    categoriaId: 'outros',
    diaDoMes: 5,
    cartao: null,
    dataInicio: new Date(2026, 6, 1).toISOString(), // a partir de julho
    dataFim: null,
    criadoEm: Date.now(),
  });

  // ============== 5. ATUALIZAR COFRES ==============
  // IPVA carro → mês alvo janeiro (mesAlvo=1, ano alvo será 2027 automaticamente)
  // Manutenção carro → mês alvo dezembro (mesAlvo=12, ano alvo 2026 ainda)
  // Reset cofre IPVA atual=0 (pagou agora, ciclo zerou)
  const snapCofres = await getDocs(collection(db, 'cofres'));
  for(const d of snapCofres.docs){
    const data = d.data();
    if(data.nome && data.nome.toLowerCase().includes('ipva')){
      await updateDoc(d.ref, { atual: 0, mesAlvo: 1, meta: 1800 });
    }
    if(data.nome && (data.nome.toLowerCase().includes('manutenção') || data.nome.toLowerCase().includes('manutencao'))){
      await updateDoc(d.ref, { mesAlvo: 12, meta: 1800 });
    }
  }

  // ============== 6. LANÇAMENTOS DE JUNHO ==============
  // [dia, mes, descricao, valor, categoria, cartao]
  // Categoria/cartão conforme conversa
  const lancsJun = [
    // Fora do cartão
    [3,  6, 'PIX Bia',                  20.00, 'restaurante',   ''],
    [3,  6, 'Banco/Juros (cheque esp.)', 460.78, 'bancojuros',  ''],
    [3,  6, 'Limpeza carro',            80.00, 'transporte',    ''],
    // Cartão — Pizzaria 28/05, Sabor em Quilo 31/05 entram com data 28-31/05
    // mas a fatura cai em junho — pra ficar no orçamento JUNHO, vou colocar com data junho
    // (conforme acordo: regime fatura, lançar no mês que sai)
    [1,  6, 'Pizzaria (cartão)',        120.00, 'restaurante',  '2913'],
    [1,  6, 'Depilação Mari (Laureen)', 143.00, 'pessoalmari',  '3877'],
    [2,  6, 'Mercado',                  1486.15, 'alimentacao', '3877'],
    [1,  6, 'Sabor em Quilo',           8.00,   'restaurante',  '2913'],
    [1,  6, 'Combustível carro',        210.45, 'transporte',   '2913'],
    [1,  6, 'Kanto de Minas',           79.90,  'restaurante',  '2913'],
    [2,  6, 'Pizzaria',                 85.90,  'restaurante',  '2913'],
    [3,  6, 'Presente Josi',            125.00, 'presentesextras', '2913'],
    [3,  6, 'Sesc (restaurante)',       18.25,  'restaurante',  '2913'],
    [3,  6, 'Drogaria',                 20.57,  'saude',        '2913'],
    [3,  6, '1B Coffee',                51.00,  'restaurante',  '2913'],
  ];
  const batchAv = writeBatch(db);
  for(const [dia, mes, desc, valor, cat, cartao] of lancsJun){
    const ts = new Date(2026, mes-1, dia, 12, 0).getTime();
    const ref = doc(collection(db, 'lancamentos'));
    batchAv.set(ref, {
      valor: valor,
      descricao: desc,
      categoriaId: cat,
      cartao: cartao || null,
      ts: ts,
      data: new Date(ts).toISOString(),
      criadoEm: Date.now(),
      origem: 'seed-v29',
    });
  }
  await batchAv.commit();

  // ============== 7. PARCELAS NOVAS ==============
  const parcelasNovas = [
    {desc:'Shopee diversos (aniv. meninos)', valor:87.37,  parcelas:12, cat:'outros',  cartao:'3877', diaInicial: 3},
    {desc:'Amazon higiene meninos',          valor:35.67,  parcelas:3,  cat:'filhos',  cartao:'3877', diaInicial: 3},
    {desc:'Amazon bicicleta Pedro',          valor:55.80,  parcelas:10, cat:'filhos',  cartao:'2913', diaInicial: 3},
  ];
  const batchPN = writeBatch(db);
  for(const p of parcelasNovas){
    const grupoId = 'p' + Date.now() + Math.random().toString(36).slice(2,6);
    for(let i = 0; i < p.parcelas; i++){
      // primeira parcela em junho/26, próximas mês a mês
      const data = new Date(2026, 5 + i, p.diaInicial, 12, 0);
      const ref = doc(collection(db, 'lancamentos'));
      batchPN.set(ref, {
        valor: p.valor,
        descricao: `${p.desc} (${i+1}/${p.parcelas})`,
        categoriaId: p.cat,
        cartao: p.cartao || null,
        ts: data.getTime(),
        data: data.toISOString(),
        criadoEm: Date.now(),
        parcelaGrupo: grupoId,
        parcelaNum: i+1,
        parcelaTotal: p.parcelas,
        origem: 'parcela',
      });
    }
  }
  await batchPN.commit();

  // ============== MARCAR EXECUTADO ==============
  await setDoc(flagRef, {
    executadoEm: Date.now(),
  });

  toast('✓ v2.9 importada! Confira aba Hoje, navegue meses pra ver projeções.');
}
