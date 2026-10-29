# -*- coding: utf-8 -*-
"""Confere tools/fontes contra o manifesto.json: arquivos presentes, assinatura WOFF2, SHA-256 e licenças OFL.
Se fontTools (+ brotli) estiver instalado, confere também os acentos do português. Sai com código 1 se algo falhar.
Uso: python tools/fontes/verificar_fontes.py"""
import os, sys, json, hashlib
PASTA = os.path.dirname(os.path.abspath(__file__))
ACENTOS = 'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ'
falhas = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: falhas.append(m)
man = json.load(open(os.path.join(PASTA, 'manifesto.json'), encoding='utf-8'))
ok(isinstance(man.get('familias'), list) and {f.get('id') for f in man['familias']} == {'atkinson', 'opendyslexic'}, 'manifesto com as famílias atkinson e opendyslexic')
for lic in man.get('licencas', []):
    cam = os.path.join(PASTA, lic)
    ok(os.path.isfile(cam) and 'SIL OPEN FONT LICENSE' in open(cam, encoding='utf-8', errors='ignore').read(), 'licença OFL presente: ' + lic)
try:
    from fontTools.ttLib import TTFont
except Exception:
    TTFont = None
n = 0
for fam in man.get('familias', []):
    for a in fam.get('arquivos', []):
        n += 1; cam = os.path.join(PASTA, a['arquivo'])
        if not os.path.isfile(cam): ok(False, 'arquivo listado no manifesto existe: ' + a['arquivo']); continue
        b = open(cam, 'rb').read()
        ok(b[:4] == b'wOF2', a['arquivo'] + ': assinatura WOFF2')
        ok(hashlib.sha256(b).hexdigest() == a.get('sha256'), a['arquivo'] + ': SHA-256 confere com o manifesto')
        if TTFont:
            try:
                cmap = TTFont(cam).getBestCmap()
                faltam = [c for c in ACENTOS if ord(c) not in cmap]
                ok(not faltam, a['arquivo'] + ': acentos do português' + (' (faltam %s)' % ''.join(faltam) if faltam else ''))
            except Exception as e:
                print('AVISO: não foi possível ler %s com fontTools (%s)' % (a['arquivo'], e))
soltos = [f for f in os.listdir(PASTA) if f.endswith('.woff2') and f not in {a['arquivo'] for fam in man['familias'] for a in fam.get('arquivos', [])}]
ok(not soltos, 'nenhum WOFF2 fora do manifesto' + (': ' + ', '.join(soltos) if soltos else ''))
print('Fontes no manifesto: %d de 8%s' % (n, '' if n == 8 else ' (as demais caem para Verdana)'))
print('RESULTADO: %s' % ('OK' if not falhas else 'FALHOU'))
sys.exit(1 if falhas else 0)
