import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escolherAudio, mesmaSincronia, paresDasSincronias, paresPelaDuracao, tempoNoAudio, tempoNoVideo } from '../public/js/lib/versoes.js';

const v = (id, titulo, canal, segundos) => ({ id, titulo, canal, segundos });

test('acha o áudio oficial da gravação (e não o clipe, o ao vivo ou outra duração)', () => {
  const achados = [
    v('clipe000001', 'Sabrina Carpenter - Espresso (Official Video)', 'Sabrina Carpenter', 194),
    v('aovivo00001', 'Sabrina Carpenter - Espresso (Live)', 'Sabrina Carpenter', 175),
    v('fan00000001', 'Espresso - Sabrina Carpenter (lyrics)', 'Fã Clube', 178),
    v('topic000001', 'Espresso', 'Sabrina Carpenter', 175),
    v('outra000001', 'Cappuccino', 'Sabrina Carpenter', 175),
  ];
  const a = escolherAudio(achados, { titulo: 'Espresso', artista: 'Sabrina Carpenter', duracao: 175, evitar: 'clipe000001' });
  assert.equal(a.id, 'topic000001');
  // Mesmo título, artista e duração: a faixa type=music deve ganhar do stream que representa o clipe.
  const tipos = [
    { ...v('streamclip01', 'Espresso', 'Sabrina Carpenter - Topic', 175), tipo: 'stream' },
    { ...v('musictrack01', 'Espresso', 'Sabrina Carpenter', 175), tipo: 'music' },
  ];
  assert.equal(escolherAudio(tipos, { titulo: 'Espresso', artista: 'Sabrina Carpenter', duracao: 175 })?.id, 'musictrack01');
  assert.equal(escolherAudio(achados, { titulo: 'Espresso', artista: 'X', duracao: 300 }), null);
  assert.equal(escolherAudio(achados, { titulo: 'Espresso', duracao: 0 })?.id, 'topic000001');
  // Sem LRCLIB, o resultado type=music ainda deve ser encontrado pelo título e artista.
  const semLrc = [
    { ...v('yummyclip01', 'Justin Bieber - Yummy (Official Music Video)', 'Justin Bieber', 230), tipo: 'stream' },
    { ...v('yummyaudio1', 'Yummy', 'Justin Bieber - Topic', 210), tipo: 'music' },
  ];
  assert.equal(escolherAudio(semLrc, { titulo: 'Yummy', artista: 'Justin Bieber', duracao: 0 })?.id, 'yummyaudio1');
  assert.equal(escolherAudio(semLrc, { titulo: 'Yummy', artista: 'Justin Bieber', duracao: 0, evitar: 'yummyaudio1' }), null);
  // A diferença de alguns segundos entre LRCLIB e YouTube não deve impedir o áudio oficial.
  const thriller = [
    v('thrillerclip1', 'Michael Jackson - Thriller (Official Music Video)', 'Michael Jackson', 858),
    v('thrilleraudio', 'Michael Jackson - Thriller (Official Audio)', 'Michael Jackson - Topic', 363),
    v('thrillerlive1', 'Michael Jackson - Thriller (Live)', 'Michael Jackson', 360),
  ];
  assert.equal(escolherAudio(thriller, { titulo: 'Thriller', artista: 'Michael Jackson', duracao: 357, evitar: 'thrillerclip1' })?.id, 'thrilleraudio');
});

test('o tempo passa do áudio para o clipe e volta, trecho por trecho (cena antes e no meio)', () => {
  // o clipe tem 10 s de cena antes da música e, depois do segundo 60 do áudio, mais 20 s de cena
  const pares = [[12, 22], [30, 40], [70, 100], [90, 120]];
  assert.equal(tempoNoVideo(pares, 5), 15);
  assert.equal(tempoNoVideo(pares, 45), 55);
  assert.equal(tempoNoVideo(pares, 80), 110);
  assert.equal(tempoNoAudio(pares, 110), 80);
  assert.equal(tempoNoAudio(pares, 3), 0); // na cena antes da música: o começo do áudio
  for (const t of [0, 13, 44, 71, 150]) assert.equal(tempoNoAudio(pares, tempoNoVideo(pares, t)), t);
});

test('os pares pelas duas sincronias, ou pela duração', () => {
  assert.deepEqual(paresDasSincronias([{ inicio: 1 }, { inicio: 5 }], [{ inicio: 11 }, { inicio: 15 }]), [[1, 11], [5, 15]]);
  assert.equal(paresDasSincronias([{ inicio: 1 }], [{ inicio: 1 }, { inicio: 2 }]), null);
  assert.deepEqual(paresPelaDuracao(194, 175), [[0, 19]]);
  assert.deepEqual(paresPelaDuracao(170, 175), [[0, 0]]);
});


test('só compartilha o mesmo vídeo entre Música e Vídeo quando a sincronia é idêntica', () => {
  assert.equal(mesmaSincronia([[0, 0], [10, 10.2], [40, 40.1]]), true);
  assert.equal(mesmaSincronia([[0, 18], [10, 28], [40, 58]]), false); // introdução
  assert.equal(mesmaSincronia([[0, 0], [10, 10], [40, 55]]), false); // corte no meio
  assert.equal(mesmaSincronia([]), false);
  assert.equal(mesmaSincronia(null), false);
});
