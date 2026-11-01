import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../server/node-dom.js';
import { parseCanto, parseRepertorio, score, slugFromUrl, titulosAlvo, wpChordsToChordPro } from '../public/js/lib/cindy.js';
import { chaveDaParte, montarEstrutura, salmoChordPro } from '../public/js/lib/missa.js';

test('converte WP Chords em ChordPro, com refrão em negrito', () => {
  const html = `<wpchords><br />
<strong>Ó fam<wpchord data-nosnippet nota="F#m"></wpchord>ília das na<wpchord nota="E"></wpchord>ções!</strong></p>
<p>[custom_scroll]<wpchord nota="F#m"></wpchord>Cantai ao Senhor *<br />
can<wpchord data-nosnippet class="wpce-extended-chord" nota="D" data-wpce-original="D/F#"></wpchord>tai, ó terra!</p>`;
  assert.equal(wpChordsToChordPro(html),
    '{start_of_chorus}\nÓ fam[F#m]ília das na[E]ções!\n{end_of_chorus}\n\n[F#m]Cantai ao Senhor *\ncan[D/F#]tai, ó terra!');
});

test('monta ChordPro do canto com metadados', () => {
  const c = parseCanto({
    titulo: 'Salmo 95 Teste',
    url: 'https://cindyferrarezi.com/2020/10/08/salmo-95/',
    html: '<h3>29º Domingo</h3><iframe src="https://www.youtube.com/embed/abc123XYZ?feature=oembed"></iframe><div class="wpChordsBody"><wpchords><p>[A]Lá</p></wpchords></div>',
  });
  assert.ok(c.temCifra);
  assert.match(c.chordpro, /^\{title: Salmo 95 Teste\}\n\{subtitle: 29º Domingo\}\n\{key: A\}/);
  assert.equal(c.youtube, 'https://www.youtube.com/watch?v=abc123XYZ');
});

test('lê as abas do repertório da missa', () => {
  const html = `
  <button class="e-n-tab-title" aria-controls="t1"><span class="e-n-tab-title-text"> Entrada </span></button>
  <button class="e-n-tab-title" aria-controls="t2"><span class="e-n-tab-title-text">Salmo</span></button>
  <button class="e-n-tab-title" aria-controls="t3"><span class="e-n-tab-title-text">Missal</span></button>
  <div id="t1"><p>Antífona de Entrada: Eu vos chamo.</p><a href="https://cindyferrarezi.com/2024/10/12/eu-vos-chamo/"><svg><style>.x{}</style></svg>Eu Vos Chamo</a>
     <a href="https://cindyferrarezi.com/2024/10/12/eu-vos-chamo/">dup</a><a href="https://cindyferrarezi.com/contato">Contato</a></div>
  <div id="t2"><a href="https://cindyferrarezi.com/2020/10/08/salmo-95/">Salmo 95</a></div>
  <div id="t3">ignorar</div>`;
  const partes = parseRepertorio(html);
  assert.deepEqual(partes.map((p) => p.parte), ['Entrada', 'Salmo']);
  assert.deepEqual(partes[0].cantos, [{ titulo: 'Eu Vos Chamo', url: 'https://cindyferrarezi.com/2024/10/12/eu-vos-chamo/' }]);
  assert.deepEqual(partes[0].texto, ['Antífona de Entrada: Eu vos chamo.']);
});

test('gera os títulos de busca a partir da liturgia', () => {
  // festa: também o nome curto que a Cindy usa no título
  assert.deepEqual(titulosAlvo({ data_extenso: 'Segunda-feira, 2 de Novembro de 2026', celebracao: 'Comemoração de Todos os Fiéis Defuntos', ano: 'Ano A' }).map((a) => a.consulta),
    ['Comemoração de Todos os Fiéis Defuntos', 'Fiéis Defuntos']);
  assert.deepEqual(titulosAlvo({ data_extenso: 'Domingo, 1 de Novembro de 2026', celebracao: 'Todos os Santos', ano: 'Ano A' }).map((a) => a.consulta), ['Todos os Santos']);
  assert.deepEqual(titulosAlvo({ data_extenso: 'Domingo, 18 de Outubro de 2026', celebracao: '29º Domingo do Tempo Comum', ano: 'Ano A' }).map((a) => a.consulta), ['29º Domingo']);
  assert.deepEqual(titulosAlvo({ data_extenso: 'Sexta-feira, 16 de Outubro de 2026', celebracao: '28ª Semana do Tempo Comum', semana: '28ª Semana do Tempo Comum' }).map((a) => a.alvo),
    ['6ª Feira da 28ª Semana do Tempo Comum']);
  assert.deepEqual(titulosAlvo({ data_extenso: 'Sábado, 17 de Outubro de 2026', celebracao: 'Santo Inácio de Antioquia, bispo e mártir', semana: '28ª Semana do Tempo Comum' }).map((a) => a.tipo),
    ['festa', 'semana']);
});

test('pontuação rejeita domingo e ano diferentes', () => {
  const alvo = '29º Domingo do Tempo Comum Ano A';
  assert.ok(score('Músicas para a Missa 29º Domingo Tempo Comum Ano A', alvo) > 0);
  assert.equal(score('Cantos Músicas para a Missa 29º Domingo Comum Ano C', alvo), -1);
  assert.equal(score('Cantos Músicas para a Missa 30º Domingo Comum Ano A', alvo), -1);
});

test('aceita apenas URLs da Cindy', () => {
  assert.equal(slugFromUrl('https://cindyferrarezi.com/2020/10/08/salmo-95/'), 'salmo-95');
  assert.throws(() => slugFromUrl('https://exemplo.com/x/'));
});

test('estrutura da missa combina CNBB + Cindy', () => {
  assert.equal(chaveDaParte('Antífonas de Comunhão'), 'comunhao');
  assert.equal(chaveDaParte('Hino de Louvor'), 'gloria');
  assert.equal(chaveDaParte('Oferendas'), 'oferendas');
  const lit = {
    data_extenso: 'Domingo, 18 de Outubro de 2026', celebracao: '29º Domingo', ano: 'Ano A', tempo: 'Tempo Comum', grau: '',
    missas: [{ salmo: { tipo: 'salmo', refrao: 'Ó família', referencia: 'Sl 95', estrofes: [['a *', 'b']] }, evangelho: { tipo: 'evangelho', texto: ['x'] } }],
  };
  const partes = montarEstrutura(lit, { partes: [{ parte: 'Salmo', cantos: [{ titulo: 'Salmo 95', url: 'u1' }], texto: [] }] }, { salmo: [{ titulo: 'Outro', url: 'u2' }] });
  const salmo = partes.find((p) => p.chave === 'salmo');
  assert.deepEqual(salmo.cantos.map((c) => c.url), ['u1', 'u2']);
  assert.ok(partes.some((p) => p.chave === 'gloria'), 'domingo do Tempo Comum tem Glória');
  assert.match(salmoChordPro(lit.missas[0].salmo, lit), /\{start_of_chorus: Refrão\}\nÓ família\n\{end_of_chorus\}\n\na \*\nb\n\{chorus\}/);
});
