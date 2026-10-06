// ============================================================
// SETEMBRO/2026 — reconciliacao completa. Rodar no console do app (F12), LOGADO.
// Zera os AVULSOS de setembro e reinsere o real (cartao + conta).
// Mantem recorrencias e parcelas antigas. Ancora saldo + carteira.
// Competencia: DATA DA COMPRA (cartao gravado no dia 15 por decisao). Idempotente (flag setV50).
// Parcelas: pula as que ja existem com mesma descricao (checagem antes de gravar).
//
//   1. app logado -> F12 -> Console -> "allow pasting" -> cola tudo -> Enter -> F5
// ============================================================
(async () => {
  const { getApps } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
  const { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc,
          query, where, getDocs, writeBatch } =
    await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  const app = getApps()[0];
  if(!app){ console.error("Nao logado no app."); return; }
  const db = getFirestore(app);

  const flagRef = doc(db,'config','setV50Executado');
  if((await getDoc(flagRef)).exists()){
    if(!confirm("Setembro ja foi reconciliado (setV50). Rodar de novo apaga os avulsos de set e reinsere. Continuar?")) return;
  }
  const ts=(dia)=>new Date(2026,8,dia,12,0).getTime();

  // 1. SALDO
  await setDoc(doc(db,'config','saldoConta'),{valor:450.08,atualizadoEm:Date.now()},{merge:true});

  // 2. CARTEIRA
  const cartRef=doc(db,'investimentos','carteira');
  await updateDoc(cartRef,{
    arca:{
      acoesBR:[{nome:'BBDC4',valor:627.76},{nome:'SOJA3',valor:688.86},{nome:'CMIG4',valor:168.14},{nome:'NVDC34',valor:50.12},{nome:'BBDC10',valor:22.07}],
      fiis:[{nome:'XPML11',valor:524.05},{nome:'FIGS11',valor:296.16},{nome:'BTHF11',valor:207.69}],
      rendaFixa:[{nome:'NTN-B1 Renda+ 2065',valor:744.70},{nome:'Tesouro Selic 2029',valor:399.80},{nome:'Tesouro Selic 2028',valor:200.05},{nome:'Prefixado 2028',valor:120.69}],
      internacional:[{nome:'Rico Bitcoin Dolar FIMRL',valor:923.49,cripto:true},{nome:'VCLT Nomad (US$70,10)',valor:348.40},{nome:'Bitcoin direto',valor:171.78,cripto:true}]
    },
    'grao.valor':3575.33, saldoCarteira:-12.98, atualizadoEm:Date.now()
  });
  try{ await updateDoc(cartRef,{bolsosForaArca:[{nome:'Tesouro Selic 2031',finalidade:'Reserva (unificado)',valor:8372.18}]}); }
  catch(e){ console.warn("bolsosForaArca:",e.message); }

  // 3. ZERAR avulsos de setembro (mantem recorrencia e parcela)
  const ini=ts(1), fim=new Date(2026,8,30,23,59).getTime();
  const q=query(collection(db,'lancamentos'),where('ts','>=',ini),where('ts','<=',fim));
  const snap=await getDocs(q);
  const apagar=snap.docs.filter(x=>{const o=(x.data().origem||'');return o!=='recorrencia'&&o!=='parcela';});
  for(let i=0;i<apagar.length;i+=400){const b=writeBatch(db);apagar.slice(i,i+400).forEach(x=>b.delete(x.ref));await b.commit();}
  console.log("Apagados "+apagar.length+" avulsos de setembro.");

  // 4. LANCAMENTOS avulsos (cartao + conta)
  const LANC=[
  {d:"1B Connect",v:52.5,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Cachoeira Bike",v:30.0,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Uber",v:11.12,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Posto Sao Jose",v:211.43,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Fornalha Pizzaria",v:11.26,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Legal Super",v:27.05,c:"alimentacao",ca:"2913",dia:15,o:"setV50"},
  {d:"Seu Botelho",v:65.0,c:"pessoalfilipe",ca:"2913",dia:15,o:"setV50"},
  {d:"Dale Itatiaia",v:47.0,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Hotel Tropical",v:5.0,c:"lazer",ca:"2913",dia:15,o:"setV50"},
  {d:"Hotel Tropical",v:15.0,c:"lazer",ca:"2913",dia:15,o:"setV50"},
  {d:"Mercurio Conveniencia",v:36.7,c:"alimentacao",ca:"2913",dia:15,o:"setV50"},
  {d:"Legal Super",v:222.0,c:"alimentacao",ca:"2913",dia:15,o:"setV50"},
  {d:"Legal Super",v:47.03,c:"alimentacao",ca:"2913",dia:15,o:"setV50"},
  {d:"Seu Botelho",v:40.0,c:"pessoalfilipe",ca:"2913",dia:15,o:"setV50"},
  {d:"Posto Sao Jose",v:172.91,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"1B Connect",v:55.0,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Dale Itatiaia",v:9.0,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Dale Itatiaia",v:16.5,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Norte Sul Estacionamento",v:20.0,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Bardoryco",v:54.9,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"1B Connect",v:22.0,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Brasil Park",v:14.0,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Campo Grande Parking",v:21.0,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Parks e Games Goiania",v:160.0,c:"lazer",ca:"2913",dia:15,o:"setV50"},
  {d:"Rios Gabriel e Queiroz",v:38.0,c:"outros",ca:"2913",dia:15,o:"setV50"},
  {d:"Legal Super",v:142.06,c:"alimentacao",ca:"2913",dia:15,o:"setV50"},
  {d:"Brasil Park",v:14.0,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Assai",v:337.72,c:"alimentacao",ca:"2913",dia:15,o:"setV50"},
  {d:"Uber",v:15.95,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Jim Com Arcanjos",v:45.0,c:"outros",ca:"2913",dia:15,o:"setV50"},
  {d:"Jim Com FS Servicos",v:361.39,c:"outros",ca:"2913",dia:15,o:"setV50"},
  {d:"Google One",v:44.99,c:"assinaturas",ca:"2913",dia:15,o:"setV50"},
  {d:"Google One",v:99.99,c:"assinaturas",ca:"2913",dia:15,o:"setV50"},
  {d:"Uber",v:10.96,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Sesc Sabor e Arte",v:19.79,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Papelaria Expresso",v:51.5,c:"outros",ca:"2913",dia:15,o:"setV50"},
  {d:"Uber",v:15.96,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Danielecristina",v:99.0,c:"outros",ca:"2913",dia:15,o:"setV50"},
  {d:"1B Connect",v:42.0,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Cappta Thauan",v:2.0,c:"outros",ca:"2913",dia:15,o:"setV50"},
  {d:"Prime Churrascaria",v:150.36,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"1B Connect",v:6.5,c:"restaurante",ca:"2913",dia:15,o:"setV50"},
  {d:"Rede Faleiros Postos",v:50.0,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Posto Sao Jose",v:330.17,c:"transporte",ca:"2913",dia:15,o:"setV50"},
  {d:"Seguro cartao",v:11.51,c:"bancojuros",ca:"9594",dia:15,o:"setV50"},
  {d:"1B Connect",v:24.0,c:"restaurante",ca:"9594",dia:15,o:"setV50"},
  {d:"Mercado Livre",v:99.9,c:"outros",ca:"3877",dia:15,o:"setV50"},
  {d:"Assai",v:1178.92,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Real Padaria",v:63.81,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Legal Super",v:126.93,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Listo Aura salao",v:170.0,c:"pessoalmari",ca:"3877",dia:15,o:"setV50"},
  {d:"Cinemark",v:20.0,c:"lazer",ca:"3877",dia:15,o:"setV50"},
  {d:"Campo Grande Parking",v:24.0,c:"transporte",ca:"3877",dia:15,o:"setV50"},
  {d:"Mais Q Pao",v:17.0,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Casar Presente",v:104.25,c:"presentes",ca:"3877",dia:15,o:"setV50"},
  {d:"Laureen depilacao",v:120.0,c:"pessoalmari",ca:"3877",dia:15,o:"setV50"},
  {d:"Legal Super",v:207.07,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Assai",v:334.95,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Jeronimocampo",v:45.0,c:"outros",ca:"3877",dia:15,o:"setV50"},
  {d:"Legal Super",v:151.86,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Apple avulso",v:5.9,c:"assinaturas",ca:"3877",dia:15,o:"setV50"},
  {d:"Dale Marqus",v:44.5,c:"outros",ca:"3877",dia:15,o:"setV50"},
  {d:"Assai",v:306.9,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Rede Autoestacionamento",v:12.0,c:"transporte",ca:"3877",dia:15,o:"setV50"},
  {d:"Legal Super",v:95.35,c:"alimentacao",ca:"3877",dia:15,o:"setV50"},
  {d:"Drogasil",v:89.18,c:"saude",ca:"3877",dia:15,o:"setV50"},
  {d:"Raia Drogasil",v:55.0,c:"saude",ca:"3877",dia:15,o:"setV50"},
  {d:"Estorno Amazon",v:-41.9,c:"outros",ca:"2913",dia:15,o:"setV50"},
  {d:"Estorno Shopee",v:-67.38,c:"filhos",ca:"3877",dia:15,o:"setV50"},
  {d:"Estorno Shopee",v:-46.98,c:"filhos",ca:"3877",dia:15,o:"setV50"},
  {d:"Estorno Shopee",v:-66.34,c:"filhos",ca:"3877",dia:15,o:"setV50"},
  {d:"PIX Tania (Filipe)",v:30.0,c:"pessoalfilipe",ca:null,dia:9,o:"setV50"},
  {d:"PIX Tania (Mari)",v:30.0,c:"pessoalmari",ca:null,dia:9,o:"setV50"},
  {d:"PIX Maria Lourdes (Filipe)",v:10.0,c:"pessoalfilipe",ca:null,dia:15,o:"setV50"},
  {d:"PIX Maria Lourdes (Mari)",v:10.0,c:"pessoalmari",ca:null,dia:15,o:"setV50"},
  {d:"PIX MM Solucoes (Filipe)",v:1.5,c:"pessoalfilipe",ca:null,dia:15,o:"setV50"},
  {d:"PIX MM Solucoes (Mari)",v:1.5,c:"pessoalmari",ca:null,dia:15,o:"setV50"},
  {d:"PIX Jaqueline (Filipe)",v:2.5,c:"pessoalfilipe",ca:null,dia:15,o:"setV50"},
  {d:"PIX Jaqueline (Mari)",v:2.5,c:"pessoalmari",ca:null,dia:15,o:"setV50"},
  {d:"PIX Tania Reis (Filipe)",v:50.0,c:"pessoalfilipe",ca:null,dia:16,o:"setV50"},
  {d:"PIX Tania Reis (Mari)",v:50.0,c:"pessoalmari",ca:null,dia:16,o:"setV50"},
  {d:"PIX Mirella (Filipe)",v:2.5,c:"pessoalfilipe",ca:null,dia:18,o:"setV50"},
  {d:"PIX Mirella (Mari)",v:2.5,c:"pessoalmari",ca:null,dia:18,o:"setV50"},
  {d:"PIX Gabriela Lino (Filipe)",v:15.0,c:"pessoalfilipe",ca:null,dia:21,o:"setV50"},
  {d:"PIX Gabriela Lino (Mari)",v:15.0,c:"pessoalmari",ca:null,dia:21,o:"setV50"},
  {d:"PIX Beatriz (Filipe)",v:48.0,c:"pessoalfilipe",ca:null,dia:23,o:"setV50"},
  {d:"PIX Beatriz (Mari)",v:48.0,c:"pessoalmari",ca:null,dia:23,o:"setV50"},
  {d:"PIX Solucoes assessorias (Filipe)",v:1.5,c:"pessoalfilipe",ca:null,dia:24,o:"setV50"},
  {d:"PIX Solucoes assessorias (Mari)",v:1.5,c:"pessoalmari",ca:null,dia:24,o:"setV50"},
  {d:"PIX Maria Lourdes (Filipe)",v:7.5,c:"pessoalfilipe",ca:null,dia:25,o:"setV50"},
  {d:"PIX Maria Lourdes (Mari)",v:7.5,c:"pessoalmari",ca:null,dia:25,o:"setV50"},
  {d:"PIX Beatriz (Filipe)",v:17.0,c:"pessoalfilipe",ca:null,dia:28,o:"setV50"},
  {d:"PIX Beatriz (Mari)",v:17.0,c:"pessoalmari",ca:null,dia:28,o:"setV50"},
  {d:"PIX Laura (Filipe)",v:3.0,c:"pessoalfilipe",ca:null,dia:29,o:"setV50"},
  {d:"PIX Laura (Mari)",v:3.0,c:"pessoalmari",ca:null,dia:29,o:"setV50"},
  {d:"PIX Ana Rebeca (Filipe)",v:19.0,c:"pessoalfilipe",ca:null,dia:30,o:"setV50"},
  {d:"PIX Ana Rebeca (Mari)",v:19.0,c:"pessoalmari",ca:null,dia:30,o:"setV50"},
  {d:"PIX Igreja Batista (oferta)",v:1,c:"dizimo",ca:null,dia:24,o:"setV50"},
  {d:"PIX Igreja (oferta)",v:1,c:"dizimo",ca:null,dia:25,o:"setV50"},
  {d:"PIX Igreja Evangelica (oferta)",v:35,c:"dizimo",ca:null,dia:25,o:"setV50"},
  {d:"Oferta Ronald (recebida)",v:-600,c:"outros",ca:null,dia:8,o:"setV50"},
  {d:"Resgate investimento (TED)",v:-3176.61,c:"investimentos",ca:null,dia:16,o:"setV50"},
  ];
  for(let i=0;i<LANC.length;i+=400){
    const b=writeBatch(db);
    LANC.slice(i,i+400).forEach(l=>{
      const t=ts(l.dia);
      b.set(doc(collection(db,'lancamentos')),{valor:l.v,descricao:l.d,categoriaId:l.c,cartao:l.ca,ts:t,data:new Date(t).toISOString(),criadoEm:Date.now(),origem:l.o});
    });
    await b.commit();
  }
  console.log("Inseridos "+LANC.length+" lancamentos avulsos.");

  // 5. PARCELAMENTOS novos (1a parcela set, resto mes a mes) — pula se ja existe parcela com mesma descricao
  const PARC=[
  {d:"O Boticario",v:64.95,n:2,c:"pessoalmari",ca:"2913"},
  {d:"CIA do Terno",v:111.79,n:10,c:"pessoalfilipe",ca:"2913"},
  {d:"Amazon",v:35.28,n:4,c:"outros",ca:"2913"},
  {d:"Amazon BR",v:44.65,n:2,c:"outros",ca:"2913"},
  {d:"Marrecocentro viagem",v:162.0,n:3,c:"lazer",ca:"2913"},
  {d:"Shopee Poloinfantil",v:66.66,n:5,c:"filhos",ca:"3877"},
  {d:"Paypal Flor de Car",v:58.08,n:2,c:"outros",ca:"3877"},
  {d:"Shopee Hyperbaby",v:65.7,n:6,c:"filhos",ca:"3877"}
  ];
  const baseDesc = s => (s||'').replace(/\s\(\d+\/\d+\)$/,'').trim().toLowerCase();
  const existentes = new Set((await getDocs(query(collection(db,'lancamentos'),where('origem','==','parcela')))).docs.map(x=>baseDesc(x.data().descricao)));
  for(const p of PARC){
    if(existentes.has(baseDesc(p.d))){ console.warn("PULADO (ja existe parcela):", p.d); continue; }
    const grupo='p'+Date.now()+Math.random().toString(36).slice(2,6);
    const b=writeBatch(db);
    for(let k=1;k<=p.n;k++){
      const t=new Date(2026,8+(k-1),15,12,0).getTime();
      b.set(doc(collection(db,'lancamentos')),{valor:p.v,descricao:p.d+" ("+k+"/"+p.n+")",categoriaId:p.c,cartao:p.ca,ts:t,data:new Date(t).toISOString(),criadoEm:Date.now(),parcelaGrupo:grupo,parcelaNum:k,parcelaTotal:p.n,origem:'parcela'});
    }
    await b.commit();
  }
  console.log("Parcelamentos processados (ver avisos PULADO acima).");

  await setDoc(flagRef,{executadoEm:Date.now()});
  console.log("OK. Recarregue (F5). Confira set no termometro e a aba Investir.");
})();
