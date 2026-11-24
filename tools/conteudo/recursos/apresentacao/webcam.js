(function(){
'use strict';
/* Fase 3 — Controle por webcam (MediaPipe Gesture Recognizer)
   Ativado pelo checkbox data-a11y="webcam" no painel de acessibilidade.
   Persistido em conteudista.gerados.webcam.
   Gestos:
     mão aberta (Open_Palm)     → próximo slide
     dois dedos (Victory)       → slide anterior
     joinha (Thumb_Up)          → reproduzir/pausar
*/
var WEBCAM={ativo:false,sessao:0,stream:null,video:null,recognizer:null,ultimo:null,tGesto:0,disparado:false,tAcao:0,raf:null,ultimoFrame:0};
var GESTOS={Open_Palm:'next',Victory:'prev','Thumb_Up':'play'};
var DELAY=700,COOLDOWN=800;

function _salvar(v){try{localStorage.setItem('conteudista.gerados.webcam',v?'1':'0')}catch(e){}}
function _salvo(){try{return localStorage.getItem('conteudista.gerados.webcam')==='1'}catch(e){return false}}

function _status(msg){var s=document.getElementById('a11yEstado');if(s)s.textContent=msg}

function _executarGesto(nome){
  var agora=Date.now();
  if(nome!==WEBCAM.ultimo){WEBCAM.ultimo=nome;WEBCAM.tGesto=agora;WEBCAM.disparado=false;return}
  var acao=GESTOS[nome];
  if(!acao||WEBCAM.disparado||agora-WEBCAM.tGesto<DELAY||agora-WEBCAM.tAcao<COOLDOWN)return;
  WEBCAM.disparado=true;WEBCAM.tAcao=agora;
  document.dispatchEvent(new CustomEvent('conteudista:cmd',{detail:acao}));
}

function _loop(){
  if(!WEBCAM.ativo||!WEBCAM.recognizer)return;
  try{
    var now=performance.now();
    if(now-WEBCAM.ultimoFrame<100){WEBCAM.raf=requestAnimationFrame(_loop);return}
    WEBCAM.ultimoFrame=now;
    var r=WEBCAM.recognizer.recognizeForVideo(WEBCAM.video,now),g=r&&r.gestures&&r.gestures[0]&&r.gestures[0][0];
    /* toda categoria (inclusive None) conta como quadro: trocar de gesto rearma o disparo */
    if(g&&g.score>0.7)_executarGesto(g.categoryName);
    else{WEBCAM.ultimo=null;WEBCAM.disparado=false}
  }catch(ex){_status('Erro ao reconhecer gesto: '+ex.message);desativar();return}
  WEBCAM.raf=requestAnimationFrame(_loop);
}

var mediaPipe;
function _carregarMediaPipe(){
  if(!mediaPipe)mediaPipe=import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs');
  return mediaPipe;
}

function ativar(){
  if(WEBCAM.ativo)return;
  WEBCAM.ativo=true;
  var sessao=++WEBCAM.sessao;
  function atual(){return WEBCAM.ativo&&WEBCAM.sessao===sessao}
  _salvar(true);
  _status('Iniciando câmera…');
  _carregarMediaPipe().then(function(mp){
    if(!atual())return;
    return navigator.mediaDevices.getUserMedia({video:{width:320,height:240,facingMode:'user'}}).then(function(stream){
      if(!atual()){stream.getTracks().forEach(function(t){t.stop()});return}
      WEBCAM.stream=stream;
      var video=WEBCAM.video=document.createElement('video');
      video.setAttribute('playsinline','');video.muted=true;video.srcObject=stream;
      return video.play().then(function(){
        return mp.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm').then(function(fileset){
          return mp.GestureRecognizer.createFromOptions(fileset,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'},runningMode:'VIDEO',numHands:1});
        });
      });
    });
  }).then(function(rec){
    if(!atual()){if(rec)rec.close();return}
    WEBCAM.recognizer=rec;
    _status('Controle por webcam ativo. Mão aberta = próximo; dois dedos = anterior; joinha = reproduzir/pausar.');
    _loop();
  }).catch(function(ex){if(!atual())return;desativar();var cb=document.querySelector('[data-a11y="webcam"]');if(cb)cb.checked=false;_status('Não foi possível iniciar o controle por webcam: '+ex.message)});
}

function desativar(){
  WEBCAM.ativo=false;
  WEBCAM.sessao++;
  _salvar(false);
  if(WEBCAM.raf){cancelAnimationFrame(WEBCAM.raf);WEBCAM.raf=null}
  if(WEBCAM.stream){WEBCAM.stream.getTracks().forEach(function(t){t.stop()});WEBCAM.stream=null}
  if(WEBCAM.video){WEBCAM.video.srcObject=null;WEBCAM.video=null}
  if(WEBCAM.recognizer){try{WEBCAM.recognizer.close()}catch(ex){}WEBCAM.recognizer=null}
  WEBCAM.ultimo=null;WEBCAM.disparado=false;
  _status('Controle por webcam desativado.');
}

/* integração com painel de acessibilidade */
document.addEventListener('change',function(e){
  if(e.target&&e.target.dataset&&e.target.dataset.a11y==='webcam'){
    if(e.target.checked)ativar();else desativar();
  }
});

/* restaurar preferência salva */
if(_salvo()){
  document.addEventListener('DOMContentLoaded',function(){
    var cb=document.querySelector('[data-a11y="webcam"]');
    if(cb){cb.checked=true;ativar()}
  });
}
})();
