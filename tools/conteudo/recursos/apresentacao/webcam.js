(function(){
'use strict';
/* Fase 3 — Controle por webcam (MediaPipe Gesture Recognizer)
   Ativado pelo checkbox data-a11y="webcam" no painel de acessibilidade.
   Persistido em conteudista.gerados.webcam.
   Gestos:
     mão aberta (Open_Palm)     → próximo slide
     dois dedos (Victory)       → slide anterior
     joinha (Thumb_Up)          → reproduzir/pausar
     punho fechado (Closed_Fist) por 700 ms → tela preta (tecla B)
*/
var WEBCAM={ativo:false,stream:null,recognizer:null,ultimo:null,tGesto:0,canvas:null,ctx:null,raf:null};
var GESTOS={Open_Palm:'next',Victory:'prev','Thumb_Up':'play',Closed_Fist:'blackout'};
var DELAY=700;

function _salvar(v){try{localStorage.setItem('conteudista.gerados.webcam',v?'1':'0')}catch(e){}}
function _salvo(){try{return localStorage.getItem('conteudista.gerados.webcam')==='1'}catch(e){return false}}

function _status(msg){var s=document.getElementById('a11yEstado');if(s)s.textContent=msg}

function _executarGesto(nome){
  var acao=GESTOS[nome];if(!acao)return;
  var agora=Date.now();
  if(nome===WEBCAM.ultimo&&(agora-WEBCAM.tGesto)<DELAY)return;
  if(nome!==WEBCAM.ultimo){WEBCAM.ultimo=nome;WEBCAM.tGesto=agora;return}
  if(agora-WEBCAM.tGesto<DELAY)return;
  WEBCAM.ultimo=null;WEBCAM.tGesto=0;
  document.dispatchEvent(new CustomEvent('conteudista:webcam:gesto',{detail:acao}));
  if(acao==='next'){document.getElementById('n')&&document.getElementById('n').click()}
  else if(acao==='prev'){document.getElementById('p')&&document.getElementById('p').click()}
  else if(acao==='play'){document.getElementById('bp')&&document.getElementById('bp').click()}
  else if(acao==='blackout'){document.dispatchEvent(new CustomEvent('conteudista:slide',{detail:window._slideAtual||0}))}
}

function _loop(){
  if(!WEBCAM.ativo||!WEBCAM.recognizer)return;
  try{
    var r=WEBCAM.recognizer.recognizeForVideo(WEBCAM.canvas,Date.now());
    if(r&&r.gestures&&r.gestures.length>0){
      var g=r.gestures[0][0];
      if(g&&g.score>0.82)_executarGesto(g.categoryName);
      else WEBCAM.ultimo=null;
    }else{WEBCAM.ultimo=null}
  }catch(ex){}
  WEBCAM.raf=requestAnimationFrame(_loop);
}

function _iniciarStream(cb){
  navigator.mediaDevices.getUserMedia({video:{width:320,height:240,facingMode:'user'}})
  .then(function(s){WEBCAM.stream=s;cb(null,s)})
  .catch(function(e){cb(e)});
}

function _criarCanvas(video){
  if(!WEBCAM.canvas){WEBCAM.canvas=document.createElement('canvas');WEBCAM.ctx=WEBCAM.canvas.getContext('2d')}
  WEBCAM.canvas.width=video.videoWidth||320;WEBCAM.canvas.height=video.videoHeight||240;
  function desenhar(){
    if(!WEBCAM.ativo)return;
    WEBCAM.ctx.drawImage(video,0,0,WEBCAM.canvas.width,WEBCAM.canvas.height);
    requestAnimationFrame(desenhar);
  }
  desenhar();
}

function _carregarMediaPipe(cb){
  if(window.GestureRecognizer){cb(null);return}
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js';
  s.crossOrigin='anonymous';
  s.onload=function(){cb(null)};
  s.onerror=function(){cb(new Error('Não foi possível carregar MediaPipe. Verifique a conexão.'))};
  document.head.appendChild(s);
}

function ativar(){
  if(WEBCAM.ativo)return;
  WEBCAM.ativo=true;
  _salvar(true);
  _status('Iniciando câmera…');
  _carregarMediaPipe(function(e){
    if(e){_status(e.message);WEBCAM.ativo=false;_salvar(false);return}
    var video=document.createElement('video');
    video.setAttribute('playsinline','');video.muted=true;
    _iniciarStream(function(err,stream){
      if(err){_status('Câmera não disponível: '+err.message);WEBCAM.ativo=false;_salvar(false);return}
      video.srcObject=stream;
      video.play().then(function(){
        _criarCanvas(video);
        window.GestureRecognizer.createFromOptions(window.FilesetResolver&&window.FilesetResolver.forVisionTasks?
          window.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'):
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
          {baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1}
        ).then(function(rec){
          WEBCAM.recognizer=rec;
          _status('Controle por webcam ativo. Gestos: mão aberta = próximo, dois dedos = anterior.');
          _loop();
        }).catch(function(ex){_status('Erro ao iniciar reconhecedor: '+ex.message);desativar()});
      }).catch(function(ex){_status('Erro ao iniciar câmera: '+ex.message);desativar()});
    });
  });
}

function desativar(){
  WEBCAM.ativo=false;
  _salvar(false);
  if(WEBCAM.raf){cancelAnimationFrame(WEBCAM.raf);WEBCAM.raf=null}
  if(WEBCAM.stream){WEBCAM.stream.getTracks().forEach(function(t){t.stop()});WEBCAM.stream=null}
  if(WEBCAM.recognizer){try{WEBCAM.recognizer.close()}catch(ex){}WEBCAM.recognizer=null}
  WEBCAM.ultimo=null;
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