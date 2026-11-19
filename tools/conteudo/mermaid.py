"""Acessibilidade dos fluxos Mermaid do HTML gerado.

O texto do nó já diz o que ele é; o que pode falhar é o desenho: texto claro
sobre preenchimento claro e pares vermelho/verde que se confundem no
daltonismo. Aqui só se mexe em `style` e `classDef`, que é o que o autor
escreve no Markdown.
"""
# shortcut: entende só `fill`, `color` e `stroke` em `style`/`classDef`; diretivas de tema do Mermaid ficam de fora. Ampliar quando o editor oferecer mais campos de estilo.
import colorsys, re

# Matrizes de simulação de daltonismo (Machado et al. 2009), as mesmas do editor web.
_M = {
    'protanopia': [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
    'deuteranopia': [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
    'tritanopia': [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
    'acromatopsia': [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722],
}
DIFERENCA_MINIMA = 12  # ΔE (CIE76), o mesmo limite do editor de temas

_RE_COR = re.compile(r'\b(fill|color|stroke)\s*:\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)')
_RE_DIRETIVA = re.compile(r'^\s*(style|classDef|linkStyle)\b')


def _normal(cor):
    "Expande #abc para #aabbcc e devolve em minúsculas."
    cor = cor.lower()
    return '#' + ''.join(c * 2 for c in cor[1:]) if len(cor) == 4 else cor


def _canal(v):
    v /= 255
    return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4


def _linear(cor):
    h = cor.lstrip('#')
    return [_canal(int(h[i:i + 2], 16)) for i in (0, 2, 4)]


def _lum(cor):
    r, g, b = _linear(cor)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a, b):
    x, y = sorted((_lum(a), _lum(b)))
    return (y + 0.05) / (x + 0.05)


def _lab(c):
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    x = f((0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.95047)
    y = f(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])
    z = f((0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.08883)
    return (116 * y - 16, 500 * (x - y), 200 * (y - z))


def _distancia(a, b):
    p, q = _lab(a), _lab(b)
    return ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2) ** 0.5


def _lstar(cor):
    return _lab(_linear(cor))[0]


def _simular(cor, tipo):
    c, m = _linear(cor), _M[tipo]
    return [min(1.0, max(0.0, m[i] * c[0] + m[i + 1] * c[1] + m[i + 2] * c[2])) for i in (0, 3, 6)]


def pior_diferenca(a, b):
    "Menor ΔE entre as duas cores nos quatro tipos de daltonismo."
    return min(_distancia(_simular(a, t), _simular(b, t)) for t in _M)


def _hls(cor):
    h = cor.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return colorsys.rgb_to_hls(r, g, b)  # matiz, luminosidade, saturação


def _hex(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, max(0.02, min(0.98, l)), s)
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def _clarear(cor, passos):
    "Move a luminosidade em passos de 3%; não muda matiz nem saturação."
    h, l, s = _hls(cor)
    return _hex(h, l + passos * 0.03, s)


def familia(cor):
    "Família de significado de uma cor, pela matiz: 'vermelho', 'verde' ou vazia."
    h, l, s = _hls(cor)
    h *= 360
    if s < 0.30 or l < 0.12 or l > 0.90:
        return ''
    if h >= 330 or h <= 20:
        return 'vermelho'
    if 75 <= h <= 165:
        return 'verde'
    return ''


def _texto_sobre(preenchimento):
    "Cor de texto (preto ou branco) com melhor contraste sobre o preenchimento."
    return '#ffffff' if contraste('#ffffff', preenchimento) >= contraste('#000000', preenchimento) else '#000000'


def _tingir(cor, base):
    "Adota a matiz/saturação da cor do tema mantendo o brilho percebido (L*) da original."
    bh, bl, bs = _hls(base)
    nova = _hex(bh, 0.5, max(bs, 0.55))
    alvo = _lstar(cor)
    for _ in range(30):
        atual = _lstar(nova)
        if abs(atual - alvo) < 1:
            break
        nova = _clarear(nova, 1 if atual < alvo else -1)
    return nova


def _afastar(cor, outros):
    "Afasta do par mais próximo (em brilho) até ficar distinta nos quatro tipos."
    for _ in range(24):
        if not outros:
            return cor
        par = min(outros, key=lambda o: pior_diferenca(cor, o))
        if pior_diferenca(cor, par) >= DIFERENCA_MINIMA:
            return cor
        cor = _clarear(cor, 1 if _lum(cor) >= _lum(par) else -1)
    return cor


def _corrigir_linha(linha, mapa):
    achado = _RE_COR.search(linha)
    if not achado:
        return linha, None
    trocas = []
    for m in _RE_COR.finditer(linha):
        if m.group(1) == 'fill' and _normal(m.group(2)) in mapa:
            trocas.append((m.group(0), 'fill:' + mapa[_normal(m.group(2))]))
    for antigo, novo in trocas:
        linha = linha.replace(antigo, novo)
    fill = next((m for m in _RE_COR.finditer(linha) if m.group(1) == 'fill'), None)
    if not fill:
        return linha, ('remapa' if trocas else None)
    preenchimento = _normal(fill.group(2))
    cor = next((m for m in _RE_COR.finditer(linha) if m.group(1) == 'color'), None)
    if cor and contraste(_normal(cor.group(2)), preenchimento) >= 4.5:
        return linha, ('remapa' if trocas else None)
    alvo = _texto_sobre(preenchimento)
    ajustado = preenchimento
    for _ in range(20):
        if contraste(alvo, ajustado) >= 4.5:
            break
        ajustado = _clarear(ajustado, -1 if alvo == '#ffffff' else 1)
    # troca de trás para frente: os índices do fill e do color seguem válidos
    trocas = [(fill.span(2), ajustado)] + ([(cor.span(2), alvo)] if cor else [])
    for (a, b), novo in sorted(trocas, reverse=True):
        linha = linha[:a] + novo + linha[b:]
    if not cor:
        linha = linha.rstrip() + ',color:' + alvo
    return linha, 'texto'


def corrigir(codigo, paleta):
    """Corrige cores de significado e contraste do fluxo.

    Devolve (codigo corrigido, lista de ajustes feitos). Sem ajustes, o texto
    devolvido é idêntico ao original.
    """
    fills = [_normal(m.group(2)) for m in _RE_COR.finditer(codigo) if m.group(1) == 'fill']
    tem_vermelho = any(familia(c) == 'vermelho' for c in fills)
    tem_verde = any(familia(c) == 'verde' for c in fills)
    mapa, ajustes = {}, []
    if tem_vermelho and tem_verde:
        erro = str(paleta.get('erro') or '#e52207')
        apoio = str(paleta.get('apoio') or '#1cb02b')
        vermelhos = sorted({c.lower() for c in fills if familia(c) == 'vermelho'})
        verdes = sorted({c.lower() for c in fills if familia(c) == 'verde'})
        alvo_v = [_tingir(c, erro) for c in vermelhos]
        alvo_g = [_afastar(_tingir(c, apoio), alvo_v) for c in verdes]
        mapa = dict(zip(vermelhos, alvo_v))
        mapa.update(zip(verdes, alvo_g))
        ajustes.append('vermelho e verde aproximados das cores de erro e apoio do tema')
    linhas, texto = [], False
    for linha in codigo.split('\n'):
        if _RE_DIRETIVA.match(linha):
            linha, feito = _corrigir_linha(linha, mapa)
            texto = texto or feito == 'texto'
        linhas.append(linha)
    if texto:
        ajustes.append('cor do texto ajustada para 4,5:1 sobre o preenchimento')
    return '\n'.join(linhas), ajustes
