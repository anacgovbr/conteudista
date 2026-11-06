# Atualizar o Conteudista pelo celular

Cada etapa é entregue como um **pacote**: `conteudista-pacote-<versão>.zip`. Basta enviá-lo ao repositório. O GitHub confere, testa e publica sozinho.

## Pelo navegador do celular (padrão)

1. Baixe o pacote na conversa.
2. Abra `github.com/anacgovbr/conteudista`, toque em **Add file › Upload files** e escolha o ZIP. Se o botão não aparecer, ative **Versão para computador** no menu do navegador.
3. Toque em **Commit changes**.

Pronto. Acompanhe em **Actions › Aplicar pacote**, se quiser. Quando der certo, a página atualiza em alguns minutos. Quando der errado, o GitHub abre uma **issue** com o motivo, marcada com o rótulo `pacote`, e avisa por notificação: cole o texto na conversa.

## Pelo Termux (atalho)

Uma vez:

```bash
pkg install gh && termux-setup-storage && gh auth login
gh api repos/anacgovbr/conteudista/contents/tools/pacote/cdt.sh -H "Accept: application/vnd.github.raw" > $PREFIX/bin/cdt && chmod +x $PREFIX/bin/cdt
```

Depois, a cada pacote baixado:

```bash
cdt
```

O `cdt` envia o pacote mais recente da pasta Downloads, acompanha o fluxo e mostra ✅ ou o link da issue.

## O que o fluxo faz

1. Lê o `manifesto.json`: versão anterior esperada e a assinatura de cada arquivo antes e depois.
2. Recusa sem mudar nada se o repositório não estiver na versão anterior, se algum arquivo mudou depois que o pacote foi feito, se o ZIP estiver corrompido ou se o pacote tentar alterar `.github/workflows` (o token do GitHub Actions não pode alterar fluxos; esses pacotes vão pelo PowerShell).
3. Aplica e roda `tools/verificar.sh` (gerador, acessibilidade das saídas, biblioteca, `lac`, opções, sintaxe) e o roteiro completo no Google Chrome.
4. Tudo certo: grava no `main`, apaga o ZIP e inicia a publicação da página (que testa de novo antes de publicar).
5. Falhou: não muda o código, apaga o ZIP e abre a issue.

## Configuração do repositório
Nada a configurar em **Settings › Actions › General**. A organização fixa a permissão padrão do `GITHUB_TOKEN` como somente leitura e essa tela fica bloqueada. Isso não impede os pacotes: o fluxo **Aplicar pacote** declara no YAML as permissões de que precisa (`contents`, `issues` e `actions: write`) e a publicação declara `pages: write`.

Pelo mesmo motivo, o fluxo não abre pull request: grava direto no `main`. Se o `main` tiver regra de proteção que bloqueie push, o fluxo não consegue gravar; nesse caso, a issue avisa.

## Conferir antes de cada pacote
No computador, na pasta do repositório:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\pacote\conferir-versao.ps1
```

Confere no GitHub a versão em `web/changelog.js`, `web/index.html` e `CHANGELOG.md`, as permissões do fluxo **Aplicar pacote** e se há pacote pendente. Termina com **LIBERADO** ou **BLOQUEADO**.

## Para quem prepara os pacotes

```bash
python tools/pacote/criar.py --base HEAD --versao 1.84 --titulo "Título" --mensagem "feat: ... (1.84)" -o conteudista-pacote-1.84.zip
python tools/pacote/aplicar.py conteudista-pacote-1.84.zip --conferir    # confere sem gravar
python tools/pacote/testar_pacote.py                                       # testes do formato
```

Testes novos de cada etapa entram em `tools/verificar.sh` (e nos grupos do roteiro de navegador), nunca nos arquivos de `.github/workflows`, para que os pacotes continuem passando pelo celular.
