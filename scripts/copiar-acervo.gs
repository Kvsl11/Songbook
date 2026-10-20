// Copia a pasta do acervo litúrgico (com todas as subpastas) para o SEU Google Drive.
// Como usar (no computador):
//   1. Abra https://script.google.com → "Novo projeto".
//   2. Apague o que estiver lá, cole este arquivo inteiro e salve (Ctrl+S).
//   3. Em cima, escolha a função "copiarAcervo" e clique em "Executar". Autorize com a sua conta Google.
//   4. Pode fechar a página: o Google só deixa rodar ~5 minutos de cada vez, então o script agenda a
//      continuação sozinho até terminar (4.000 arquivos levam algumas horas).
//   5. Quando terminar, a pasta "Acervo litúrgico (cópia)" fica no seu Drive com o link liberado para leitura
//      ("Qualquer pessoa com o link") e você recebe um e-mail com o link. Mande esse link para o Claude.
// Precisa de uns 5 GB livres no seu Drive. Rodar de novo não duplica: o que já foi copiado é pulado.

const ORIGEM = '143snmvAYnhWx1icJKVdsB4GGSNuJjCm-';
const NOME = 'Acervo litúrgico (cópia)';
const LIMITE = 4.5 * 60 * 1000; // para antes dos 6 minutos do Google

function copiarAcervo() {
  const props = PropertiesService.getScriptProperties();
  const inicio = Date.now();
  const acabouTempo = () => Date.now() - inicio > LIMITE;
  let fila = JSON.parse(props.getProperty('fila') || 'null');
  if (!fila) {
    const destino = DriveApp.createFolder(NOME);
    props.setProperty('destino', destino.getId());
    fila = [[ORIGEM, destino.getId()]];
  }
  while (fila.length) {
    if (acabouTempo()) return continuarDepois(props, fila);
    const [o, d] = fila[0];
    let origem;
    try { origem = DriveApp.getFolderById(o); } catch (e) { fila.shift(); continue; } // pasta sem acesso: pula
    const destino = DriveApp.getFolderById(d);
    // arquivos (os que já estão na cópia são pulados)
    const ja = new Set();
    const feitos = destino.getFiles();
    while (feitos.hasNext()) ja.add(feitos.next().getName());
    const arquivos = origem.getFiles();
    while (arquivos.hasNext()) {
      if (acabouTempo()) return continuarDepois(props, fila);
      const f = arquivos.next();
      if (ja.has(f.getName())) continue;
      try { f.makeCopy(f.getName(), destino); ja.add(f.getName()); } catch (e) { console.warn(f.getName() + ': ' + e.message); }
    }
    // subpastas: cria na cópia (se ainda não existir) e põe na fila
    const jaPastas = new Map();
    const criadas = destino.getFolders();
    while (criadas.hasNext()) { const p = criadas.next(); jaPastas.set(p.getName(), p.getId()); }
    const subpastas = origem.getFolders();
    const novas = [];
    while (subpastas.hasNext()) {
      const p = subpastas.next();
      const id = jaPastas.get(p.getName()) || destino.createFolder(p.getName()).getId();
      novas.push([p.getId(), id]);
    }
    fila.shift();
    fila.push(...novas);
    props.setProperty('fila', JSON.stringify(fila));
  }
  // terminou: libera o link da cópia para leitura e avisa por e-mail
  apagarAgendamentos();
  props.deleteProperty('fila');
  const pasta = DriveApp.getFolderById(props.getProperty('destino'));
  pasta.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const msg = 'A cópia do acervo litúrgico terminou: ' + pasta.getUrl();
  console.log(msg);
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Acervo litúrgico copiado', msg);
}

function continuarDepois(props, fila) {
  props.setProperty('fila', JSON.stringify(fila));
  apagarAgendamentos();
  ScriptApp.newTrigger('copiarAcervo').timeBased().after(60 * 1000).create();
  console.log('Continua em 1 minuto. Faltam ' + fila.length + ' pastas na fila.');
}

function apagarAgendamentos() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'copiarAcervo').forEach((t) => ScriptApp.deleteTrigger(t));
}
