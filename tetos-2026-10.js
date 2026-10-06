// ============================================================
// TETOS DE CATEGORIA — plano financeiro novo (out/2026). Soma R$ 6.933.
// Rodar no console do app (F12), LOGADO. Idempotente (sobrescreve os tetos).
//
//   1. app logado -> F12 -> Console -> "allow pasting" -> cola tudo -> Enter -> F5
// ============================================================
(async () => {
  const { getApps } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
  const { getFirestore, doc, updateDoc, collection, getDocs } =
    await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  const app = getApps()[0];
  if(!app){ console.error("Nao logado no app."); return; }
  const db = getFirestore(app);

  const tetos = {
    moradia: 2291, comunicacao: 309, seguros: 66, dizimo: 787, alimentacao: 1800,
    transporte: 500, restaurante: 250, saude: 180, pessoalfilipe: 80, pessoalmari: 120,
    assinaturas: 250, filhos: 200, presentes: 100,
    investimentos: 0, outros: 0, lazer: 0, bancojuros: 0, impostos: 0,
  };

  const catsSnap = await getDocs(collection(db,'categorias'));
  const catIds = new Set(catsSnap.docs.map(d => d.id));
  const semCat = Object.keys(tetos).filter(id => !catIds.has(id));
  if(semCat.length){
    console.error("Categorias inexistentes no banco, nada gravado:", semCat.join(', '));
    return;
  }

  let soma = 0;
  for(const [id, teto] of Object.entries(tetos)){
    await updateDoc(doc(db,'categorias',id), { teto });
    soma += teto;
  }
  console.log("Tetos gravados. Soma: R$ " + soma + " (alvo 6.933).");
  console.log("OK. Recarregue (F5) e confira a aba Hoje.");
})();
