// ============================================================
// OUTUBRO/2026 — gastos novos 1–6/10 + saldo ancorado (06/10).
// Rodar no console do app (F12), LOGADO.
// Competencia: DATA DA COMPRA. Checa duplicata por descricao+valor antes de gravar.
// Nao lanca parcelas antigas nem oficina/Marreco (ja existem).
// Seguro cartao 11,94: so lanca se nao houver recorrencia equivalente.
//
//   1. app logado -> F12 -> Console -> "allow pasting" -> cola tudo -> Enter -> F5
// ============================================================
(async () => {
  const { getApps } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
  const { getFirestore, doc, setDoc, collection, getDocs, query, where, writeBatch } =
    await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  const app = getApps()[0];
  if(!app){ console.error("Nao logado no app."); return; }
  const db = getFirestore(app);
  const ts=(mes,dia)=>new Date(2026,mes,dia,12,0).getTime();

  const outIni=ts(9,1), outFim=new Date(2026,9,31,23,59).getTime();
  const existentesOut=new Set((await getDocs(query(collection(db,'lancamentos'),where('ts','>=',outIni),where('ts','<=',outFim)))).docs.map(x=>(x.data().descricao||'')+'|'+x.data().valor));
  const recs=(await getDocs(collection(db,'recorrencias'))).docs.map(x=>x.data());
  const parcelasExistentes=new Set((await getDocs(query(collection(db,'lancamentos'),where('origem','==','parcela')))).docs.map(x=>(x.data().descricao||'').replace(/\s\(\d+\/\d+\)$/,'').trim().toLowerCase()));

  const AVULSOS=[
    {d:"Instituto Renovare",v:35.00,c:"pessoalmari",ca:null,dia:2},
    {d:"Pé de Vitamina (bolo)",v:73.61,c:"restaurante",ca:"2913",dia:2},
    {d:"1B Coffee",v:40.90,c:"restaurante",ca:"2913",dia:1},
    {d:"Legal Super (Mari)",v:138.64,c:"alimentacao",ca:"3877",dia:3},
    {d:"Cafeteria (Mari)",v:79.50,c:"restaurante",ca:"3877",dia:3},
    {d:"Legal Super",v:19.98,c:"alimentacao",ca:"2913",dia:4},
    {d:"1B Coffee",v:29.80,c:"restaurante",ca:"2913",dia:4},
    {d:"Compra grande do mês",v:1728.62,c:"alimentacao",ca:null,dia:4},
  ];

  const SEGURO={d:"Seguro cartão",v:11.94,c:"bancojuros",ca:null,dia:5};
  const seguroRecorrente=recs.some(r=>Math.abs((r.valor||0)-SEGURO.v)<0.005 && /seguro/i.test(r.descricao||'') && r.dataFim==null);

  const COLCHAO={d:"Colchão do Pedro",v:32.03,n:5,c:"filhos",ca:null};

  const batch=writeBatch(db);
  const gravados=[], pulados=[];

  for(const a of AVULSOS){
    const key=a.d+'|'+a.v;
    if(existentesOut.has(key)){ pulados.push(a.d+' '+a.v); continue; }
    const t=ts(9,a.dia);
    batch.set(doc(collection(db,'lancamentos')),{valor:a.v,descricao:a.d,categoriaId:a.c,cartao:a.ca,ts:t,data:new Date(t).toISOString(),criadoEm:Date.now(),origem:'out2026'});
    gravados.push(a.d+' '+a.v);
  }

  if(seguroRecorrente){ pulados.push('Seguro cartão 11,94 (recorrência existe)'); }
  else if(existentesOut.has(SEGURO.d+'|'+SEGURO.v)){ pulados.push('Seguro cartão 11,94 (ja lancado)'); }
  else {
    const t=ts(9,SEGURO.dia);
    batch.set(doc(collection(db,'lancamentos')),{valor:SEGURO.v,descricao:SEGURO.d,categoriaId:SEGURO.c,cartao:SEGURO.ca,ts:t,data:new Date(t).toISOString(),criadoEm:Date.now(),origem:'out2026'});
    gravados.push(SEGURO.d+' '+SEGURO.v);
  }

  await batch.commit();

  if(parcelasExistentes.has(COLCHAO.d.toLowerCase())){
    pulados.push(COLCHAO.d+' (parcelamento ja existe)');
  } else {
    const grupo='p'+Date.now()+Math.random().toString(36).slice(2,6);
    const b=writeBatch(db);
    for(let k=1;k<=COLCHAO.n;k++){
      const t=ts(9+(k-1),15);
      b.set(doc(collection(db,'lancamentos')),{valor:COLCHAO.v,descricao:COLCHAO.d+" ("+k+"/"+COLCHAO.n+")",categoriaId:COLCHAO.c,cartao:COLCHAO.ca,ts:t,data:new Date(t).toISOString(),criadoEm:Date.now(),parcelaGrupo:grupo,parcelaNum:k,parcelaTotal:COLCHAO.n,origem:'parcela'});
    }
    await b.commit();
    gravados.push(COLCHAO.d+' 5x 32,03');
  }

  await setDoc(doc(db,'config','saldoConta'),{valor:-1549.60,atualizadoEm:ts(9,6)},{merge:true});

  console.log("Gravados:", gravados);
  console.log("Pulados:", pulados);
  console.log("Saldo ancorado: -1549,60 (06/10). Filipe reancora apos fatura e salario.");
})();
