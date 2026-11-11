#!/usr/bin/env python3
"""Testes automatizados do Conteudista (roteiro de validação em código).

Cobre a apresentação HTML gerada (pausa e narração, último slide, navegação rápida,
Modo leitura, tela cheia, celular), a consistência de versão/documentação e a geração
dos arquivos. Cada caso tem o mesmo número do roteiro (1.1, 2.2, ...).

Uso local:
    pip install -r tools/requirements.txt -r tools/testes/requirements.txt
    playwright install chromium
    python tools/testes/testar_apresentacao.py            # relatório em tools/testes/relatorio/
    python tools/testes/testar_apresentacao.py --grupos 1,2   # só alguns grupos
    python tools/testes/testar_apresentacao.py --navegador firefox
    python tools/testes/testar_apresentacao.py --navegador msedge   # Edge instalado (também motor Chromium)

O navegador PRINCIPAL é o Google Chrome (padrão: --navegador chrome), usando o Chrome instalado
no computador. 'chromium' (build do Playwright), 'msedge', 'firefox' e 'webkit' são complementares.

Código de saída: 0 = tudo certo; 1 = alguma falha; 2 = erro de ambiente.
"""
import argparse, json, math, os, re, struct, subprocess, sys, tempfile, time, traceback, wave, zipfile
from datetime import datetime
from pathlib import Path

# Windows: o console e os pipes usam cp1252 por padrão e quebram com ✔, ☐, → etc. Força UTF-8 aqui e nos
# processos filhos (gerador, teste de acessibilidade, node).
for _f in (sys.stdout, sys.stderr):
    try:
        _f.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
ENV_UTF8 = dict(os.environ, PYTHONUTF8='1', PYTHONIOENCODING='utf-8')

import suporte
from suporte import Ambiente, GERADOR, Grupo, MOTOR, RAIZ, Relatorio
from grupos.apresentacao import grupo1, grupo10, grupo2, grupo3, grupo4, grupo7
from grupos.geracao import grupo15, grupo19, grupo5, grupo6
from grupos.editor import grupo8, grupo9
from grupos.acessibilidade_texto import grupo11, grupo12, grupo13, grupo14
from grupos.acessibilidade_arquivos import grupo16, grupo17, grupo18, grupo20, grupo21
from grupos.nbr17225 import grupo22
from grupos.nbr17225b import grupo23, grupo24
from classificar_mudancas import carregar_config

GRUPOS = {
    '1': ('Pausa respeitada', grupo1, 'desktop'),
    '2': ('Próximo no último slide', grupo2, 'desktop'),
    '3': ('Navegação rápida', grupo3, 'desktop'),
    '4': ('Modo leitura e tela cheia (1.75)', grupo4, 'desktop'),
    '5': ('Versão e documentação', grupo5, 'estatico'),
    '6': ('Geração dos arquivos e layout', grupo6, 'estatico'),
    '7': ('Celular (emulação de toque)', grupo7, 'movel'),
    '8': ('Opções padrão (opcoes.yaml)', grupo8, 'desktop'),
    '9': ('Celular: editor e Importar (1.79)', grupo9, 'movel'),
    '10': ('Zoom nos arquivos gerados (1.79)', grupo10, 'desktop'),
    '11': ('Biblioteca Linguagem Acessível no navegador', grupo11, 'desktop'),
    '12': ('Painel Acessibilidade do texto (1.80)', grupo12, 'desktop'),
    '13': ('Marcas no texto e balão (1.81)', grupo13, 'desktop'),
    '14': ('Janelas de apoio e imagens decorativas (1.82)', grupo14, 'desktop'),
    '15': ('Conteúdo acessível desde a criação (1.83)', grupo15, 'desktop'),
    '16': ('Conferência ao gerar (1.85)', grupo16, 'desktop'),
    '17': ('Relatório de acessibilidade (1.86)', grupo17, 'desktop'),
    '18': ('Configuração e glossário por conteúdo (1.87)', grupo18, 'desktop'),
    '19': ('API local e OpenAPI v1', grupo19, 'estatico'),
    '20': ('Compatibilidade, viewport e preferências do sistema (1.88)', grupo20, 'desktop'),
    '21': ('Acessibilidade dos arquivos gerados (1.89)', grupo21, 'desktop'),
    '22': ('NBR 17225 nivel A: atalhos de uma tecla e leitura com Parar (1.91)', grupo22, 'desktop'),
    '23': ('NBR 17225: abas, areas de arquivo e mensagens (1.97)', grupo23, 'desktop'),
    '24': ('NBR 17225: janelas no lugar de confirm e prompt (1.94 e 1.97)', grupo24, 'desktop'),
}

COM_GERADOR = {'1', '2', '3', '4', '6', '7', '10', '14', '20', '21', '22'}


def resolver_grupos(nomes):
    config = carregar_config()
    ids = set()
    for nome in nomes:
        if nome in GRUPOS:
            ids.add(nome)
        elif nome in config['grupos'] and config['grupos'][nome]['tipo'] == 'navegador':
            ids.update(str(numero) for numero in config['grupos'][nome]['numeros'])
        else:
            raise ValueError('Grupo de navegador desconhecido: ' + nome)
    if ids - GRUPOS.keys():
        raise ValueError('Registro referencia identificador inexistente')
    return sorted(ids, key=int)


def executar_estaticos(ids, args):
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    relatorio = Relatorio()
    inicio = time.perf_counter()
    with tempfile.TemporaryDirectory() as pasta:
        ambiente = Ambiente(pasta, args)
        for gid in ids:
            grupo = Grupo(gid)
            GRUPOS[gid][1](ambiente, None, grupo)
            for identificador, titulo, status, detalhe in grupo.itens:
                relatorio.add(identificador, titulo, status, detalhe, gid)
    for identificador, titulo in MANUAIS:
        relatorio.add(identificador, titulo, 'MANUAL', '', 'M')
    contagem = {status: sum(item['status'] == status for item in relatorio.itens) for status in ('OK', 'FALHA', 'ERRO', 'INSTAVEL', 'AVISO', 'PULADO', 'MANUAL')}
    versao = re.search(r"const VERSAO = '([\d.]+)'", (RAIZ / 'web/changelog.js').read_text(encoding='utf-8')).group(1)
    resultado = {'versao': versao, 'navegador': None, 'versao_navegador': 'sem navegador', 'data': datetime.now().isoformat(timespec='seconds'), 'duracao_s': round(time.perf_counter() - inicio, 3), 'resumo': contagem, 'itens': relatorio.itens}
    (saida / 'relatorio.json').write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding='utf-8')
    (saida / 'relatorio.md').write_text('# Verificacoes sem navegador\n\n' + '\n'.join(f'- {item["id"]}: {item["status"]} {item["titulo"]}' for item in relatorio.itens), encoding='utf-8')
    print(f'RESULTADO: {contagem["OK"]} ok, {contagem["FALHA"] + contagem["ERRO"]} falha(s), sem navegador')
    return int(bool(relatorio.falhou()))

MANUAIS = [
    ('M.1', 'iPhone/Safari de verdade: o áudio automático após trocar de slide não é bloqueado (botão não pode ficar em Pausar sem som)'),
    ('M.2', 'Android de verdade (Chrome): gesto de deslizar e toque na barra com o dedo, em retrato e paisagem'),
    ('M.3', 'PPTX no PowerPoint: o áudio de cada slide inicia sozinho e, com avanço automático, o slide passa ao fim do áudio'),
    ('M.4', 'Imprimir/PDF: a janela de impressão abre sem ativar o Modo leitura sozinha'),
    ('M.5', 'Ouvir a voz real (Kokoro/Piper) pausar e retomar no mesmo ponto, sem estalos'),
]


# ----------------------------------------------------------------------------- execução
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--grupos', help='lista de IDs ou aliases (ex.: 1,2,5 ou editor,marcas)')
    ap.add_argument('--grupo', action='append', help='ID ou alias de grupo')
    ap.add_argument('--completo', action='store_true')
    ap.add_argument('--listar-grupos', action='store_true')
    ap.add_argument('--navegador', default='chrome', choices=list(MOTOR), help='padrão: chrome (Google Chrome instalado)')
    ap.add_argument('--saida', default=str(Path(__file__).parent / 'relatorio'), help='pasta do relatório')
    ap.add_argument('--tentativas', type=int, default=2, help='repete o grupo com falha até N vezes (passou na repetição = INSTAVEL)')
    ap.add_argument('--executavel', default=None, help='caminho de um Chrome/Chromium já instalado (opcional)')
    ap.add_argument('--canal', default=None, choices=['chrome', 'msedge'], help='(compatibilidade) equivale a --navegador chrome|msedge')
    ap.add_argument('--gerador', default=None, help='usa outro gerador.py (para comparar versões ou provar que o teste detecta uma regressão)')
    ap.add_argument('--com-cabeca', action='store_true', help='mostra a janela do navegador')
    args = ap.parse_args()

    if args.listar_grupos:
        print(json.dumps({gid: {'id': gid, 'descricao': dados[0], 'perfil': dados[2], 'gerador': gid in COM_GERADOR, 'manual': False} for gid, dados in GRUPOS.items()}, ensure_ascii=False, indent=2))
        return 0
    try:
        nomes = (args.grupo or []) + [nome.strip() for nome in (args.grupos or '').split(',') if nome.strip()]
        ids = sorted(GRUPOS, key=int) if args.completo or not nomes else resolver_grupos(nomes)
    except ValueError as exc:
        ap.error(str(exc))
    if args.canal:
        args.navegador = args.canal
    global GERADOR
    if args.gerador:
        GERADOR = Path(args.gerador).resolve()
        suporte.GERADOR = GERADOR
    if set(ids) <= {'5', '19'}:
        return executar_estaticos(ids, args)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('ERRO: instale com  pip install -r tools/testes/requirements.txt')
        return 2

    saida = Path(args.saida); saida.mkdir(parents=True, exist_ok=True)
    rel = Relatorio()
    t_ini = time.time()
    with tempfile.TemporaryDirectory(prefix='conteudista-testes-') as tmp, sync_playwright() as p:
        amb = Ambiente(tmp, args)
        print(f'Conteudista · testes de navegador · {args.navegador} · {datetime.now():%d/%m/%Y %H:%M}')
        if set(ids) & {'1', '2', '3', '4', '7'}:
            print('Gerando apresentações de teste…')
            try:
                amb.gerar_apresentacoes()
            except Exception as ex:
                print('ERRO ao gerar os arquivos de teste:', ex)
                return 2
        motor = MOTOR[args.navegador]
        tipo = getattr(p, motor)
        kw = {'headless': not args.com_cabeca}
        if motor == 'chromium':
            kw['args'] = ['--autoplay-policy=no-user-gesture-required']
            if os.environ.get('CI') or (hasattr(os, 'geteuid') and os.geteuid() == 0):
                kw['args'].append('--no-sandbox')
            if args.executavel:
                kw['executable_path'] = args.executavel
            elif args.navegador in ('chrome', 'msedge'):
                kw['channel'] = args.navegador
        elif motor == 'firefox':
            kw['firefox_user_prefs'] = {'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0}
        try:
            nav = tipo.launch(**kw)
        except Exception as ex:
            dica = 'Instale o Google Chrome (https://www.google.com/chrome) ou rode: playwright install chrome' if args.navegador == 'chrome' else f'Rode: playwright install {args.navegador}'
            print(f'ERRO ao abrir o {args.navegador}: {ex}\n{dica}')
            return 2

        ver_nav = f'{args.navegador} {nav.version}'
        print(f'Navegador: {ver_nav}')

        def novo_contexto(viewport=None, touch=False, movel=False):
            if movel and motor == 'chromium' and 'Pixel 7' in p.devices:
                d = dict(p.devices['Pixel 7'])
                return nav.new_context(**d)
            return nav.new_context(viewport=viewport or {'width': 1280, 'height': 720}, has_touch=touch)
        amb.novo_contexto = novo_contexto

        for gid in ids:
            titulo, fn, perfil = GRUPOS[gid]
            print(f'\nGrupo {gid} — {titulo}')
            anterior = None
            max_t = 1 if perfil == 'estatico' else max(1, args.tentativas)
            for tent in range(1, max_t + 1):
                G = Grupo(gid)
                ctx = None
                try:
                    ctx = novo_contexto(movel=True) if perfil == 'movel' else (novo_contexto() if perfil == 'desktop' else None)
                    fn(amb, ctx, G)
                except Exception as ex:
                    G.itens.append((f'{gid}.!', 'Execução do grupo interrompida', 'ERRO', f'{type(ex).__name__}: {ex}'.splitlines()[0][:300]))
                    try:
                        for pg in (ctx.pages if ctx else []):
                            pg.screenshot(path=str(saida / f'erro-grupo{gid}.png'))
                            break
                    except Exception:
                        pass
                finally:
                    try:
                        if ctx: ctx.close()
                    except Exception:
                        pass
                if not G.tem_falha() or tent >= max_t:
                    break
                anterior = G
                print(f'  … falha na tentativa {tent}; repetindo o grupo {gid}')
            ja_falhou = {(i) for i, _, s, _ in (anterior.itens if anterior else []) if s in ('FALHA', 'ERRO')}
            for id, tit, st, det in G.itens:
                if st == 'OK' and id in ja_falhou:
                    st, det = 'INSTAVEL', 'falhou na 1ª tentativa e passou na repetição'
                rel.add(id, tit, st, det, gid)
        nav.close()

        print('\nPendências manuais (não automatizáveis aqui):')
        for id, tit in MANUAIS:
            rel.add(id, tit, 'MANUAL', '', 'M')

    dur = time.time() - t_ini
    cont = {k: sum(1 for i in rel.itens if i['status'] == k) for k in ('OK', 'FALHA', 'ERRO', 'INSTAVEL', 'AVISO', 'PULADO', 'MANUAL')}
    versao = (re.search(r"const VERSAO = '([\d.]+)'", (RAIZ / 'web' / 'changelog.js').read_text(encoding='utf-8')) or [0, '?'])[1]
    (saida / 'relatorio.json').write_text(json.dumps({'versao': versao, 'navegador': args.navegador, 'versao_navegador': ver_nav, 'data': datetime.now().isoformat(timespec='seconds'), 'duracao_s': round(dur, 1), 'resumo': cont, 'itens': rel.itens}, ensure_ascii=False, indent=1), encoding='utf-8')
    sim = {'OK': '✅', 'FALHA': '❌', 'ERRO': '❌', 'INSTAVEL': '⚠️', 'AVISO': '⚠️', 'MANUAL': '☐', 'PULADO': '➖'}
    linhas = [f'# Conteudista {versao} — relatório de testes de navegador', '',
              f'{datetime.now():%d/%m/%Y %H:%M} · {ver_nav} · {dur:.0f} s', '',
              f"**{cont['OK']} ok · {cont['FALHA'] + cont['ERRO']} falha(s) · {cont['INSTAVEL']} instável(is) · {cont['AVISO']} aviso(s) · {cont['PULADO']} pulado(s) · {cont['MANUAL']} manual(is)**", '',
              '| Caso | Verificação | Resultado | Detalhe |', '|---|---|---|---|']
    for i in rel.itens:
        det = i['detalhe'].replace('|', '\\|').replace('\n', ' ')
        linhas.append(f"| {i['id']} | {i['titulo']} | {sim.get(i['status'], '?')} {i['status']} | {det} |")
    (saida / 'relatorio.md').write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    print(f"\nRESULTADO: {cont['OK']} ok, {cont['FALHA'] + cont['ERRO']} falha(s), {cont['INSTAVEL']} instável(is), {cont['AVISO']} aviso(s), {cont['PULADO']} pulado(s) — {dur:.0f} s · relatório: {saida / 'relatorio.md'}")
    return 1 if rel.falhou() else 0


if __name__ == '__main__':
    sys.exit(main())
