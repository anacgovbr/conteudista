# Plano de migração da Locução: Piper como padrão para português (Kokoro mantido)

## Objetivo
Melhorar a fala em português do Brasil sem perder o que já funciona. O **Piper** (`pt_BR-faber-medium`)
passa a ser o motor padrão para português; o **Kokoro-82M** continua na aplicação para inglês e para as
vozes pt-BR experimentais (Dora, Alex, Santa).

## Por que
- O Kokoro tem suporte fraco a idiomas além do inglês e só 3 vozes pt-BR; no navegador, a biblioteca
  `kokoro-js` não converte português em fonemas, o que exigiu um conversor próprio com pronúncia imperfeita.
- O Piper é um modelo VITS treinado por voz e idioma. A biblioteca usada no navegador traz o **espeak-ng pt-br
  em WebAssembly**, a mesma ferramenta usada no treino da voz → pronúncia correta, sem conversor improvisado.

## Arquitetura (versão 1.17)
| Item | Piper (padrão pt-BR) | Kokoro (mantido) |
|---|---|---|
| Worker | `web/locucao-piper-worker.js` | `web/locucao-worker.js` (inalterado) |
| Biblioteca | `@mintplex-labs/piper-tts-web@1.0.4` (fallback `@jtsage/piper-tts-web@1.2.0`) via jsDelivr | `kokoro-js@1.2.1` |
| Modelo | `pt_BR-faber-medium` (~63 MB, Hugging Face `rhasspy/piper-voices`), guardado no OPFS do navegador | `onnx-community/Kokoro-82M-v1.0-ONNX` (~86 MB) |
| Fonemas | espeak-ng pt-br embutido (WASM) | inglês: kokoro-js; pt-BR: espeak-ng → conversor interno `ptbr-g2p.js` |
| Áudio | 22,05 kHz, velocidade natural do modelo | 24 kHz, velocidade ajustável |
| Vozes | Faber (masculina) | Heart, Michael, Emma, George (inglês); Dora, Alex, Santa (pt-BR experimental) |

O motor é escolhido **pela voz**. A interface, o histórico local (IndexedDB `KokoroTTS_DB`), a divisão de
textos longos, a emenda sem estalos, o download .wav e o cancelamento são compartilhados pelos dois.

## Fases
1. **Fase 1 — entregue (1.17)**
   - Piper integrado em worker próprio; voz padrão `piper:pt_BR-faber-medium`.
   - Migração automática única: quem tinha uma voz pt-BR do Kokoro salva passa para o Piper (chave `loc.migr117`).
   - Kokoro intacto e selecionável; opções do Kokoro identificadas no painel.
   - Falha do Piper não bloqueia o Kokoro (mensagem orientando; nova tentativa só pelo botão).
   - “Remover modelo baixado” limpa os dois motores (Cache API + OPFS).
   - Áudios antigos do histórico continuam válidos (a chave inclui a voz; Piper e Kokoro não se confundem).
2. **Fase 2 — validação (você)**
   - Abrir a aba Locução na rede da ANAC e confirmar o download do Piper (jsDelivr + Hugging Face).
   - Avaliar a pronúncia com textos reais (siglas, números, nomes de sistemas).
   - Critério de aceite: fala compreensível e natural; tempo de geração aceitável em computador sem GPU.
3. **Fase 3 — robustez — entregue (1.18)**
   - `web/modelos.json` + `tools/hospedar_modelos.py` + passo no workflow; variável `MODELOS_LOCAIS`; redirecionamento em `web/locucao-local.js`.
   - Kokoro corrigido (fp32 padrão, espeak-ng com pós-processamento do misaki) e idiomas a, b, e, f, h, i, p.
   - Velocidade no Piper (length_scale; alternativa WSOLA).
3a. **Fase 3 — plano original (referência)**
   - Hospedar no próprio site os arquivos WASM do Piper/onnxruntime e o modelo `pt_BR-faber-medium`
     (63 MB cabem no GitHub Pages), apontando o worker para caminhos locais.
4. **Fase 4 — melhorias opcionais**
   - Dicionário de pronúncia da ANAC (siglas → forma falada) aplicado antes dos dois motores.
   - Avaliar outras vozes pt-BR do Piper à medida que forem publicadas.
5. **Fase 5 — desativação do conversor interno (decisão futura)**
   - Se o Piper for aprovado, as vozes pt-BR do Kokoro e o `ptbr-g2p.js` podem ser ocultados por padrão
     (não removidos), mantendo o Kokoro para inglês.

## Reversão
Selecionar uma voz Kokoro na lista volta ao comportamento anterior, sem perda de dados. Para voltar
o padrão ao Kokoro no código, altere `VOZ_PADRAO` em `web/locucao.js`.
