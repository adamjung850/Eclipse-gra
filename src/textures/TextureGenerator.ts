import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import {
  CROWN_DEFS,
  CROWN_PALETTES,
  renderCrownToContext,
  renderBranchSpriteToContext,
  drawTreeTrunk,
  drawTreeRoot,
  drawTreeBranchL,
  drawTreeBranchR,
  drawTreeSapling,
  drawLushLeaves,
  drawWoodBlock
} from './TreeSprites.js';

// Pre-encoded RGBA fallback data (24x24 and 16x16) for dirt and grass block
const DIRT_24_RGBA = 'imI+/3hSLv+YcUb/c08t/25KKv+BWTX/iGI+/21JJ/9tSyj/l29L/29MLP+VbkX/f1k0/4BZMv+FXzr/dE0s/2pGJP9+WDP/eVIx/3xWMf95Uy7/fVo8/4RgPv9vSyv/gVs0/5pvRf+JYT3/dVMw/5tuRP9sTS7/lGpC/2lMLv93VC7/e1Uw/5pzSv+WbEL/a0go/59wQv92UjD/m3FH/5NmPf98WDT/e1c1/5tuRP97VzP/Zkcq/3dTMf99VzL/cVAx/4RcOP9tTC3/pHVJ/25NLv9jSCv/j2M8/3JUMv9/WDH/gV07/21LKP96VjL/bE0u/4BaNf+YbUP/g105/5xwQf+neEz/a0kt/2hHJv+BWTb/kGQ9/4ZfOP92Ui7/e1Mv/3taOf93YE7/flo4/5JqRv+GYj7/c08r/5txSf9sSyz/bUwr/3VSMv+QZD3/flo4/3ZQK/92UjD/cUot/4FZNf9gSjX/glw3/45oRP93VDT/dlAs/3BNLf9lSCr/imM8/6J2Sf+XbEH/hF02/3BPLv9/VzP/c1Ay/25LK/9+VzD/c1Aq/3ZVMv9hQiX/ZkUm/3lVM/9/VzT/nXBG/49lP/90UTH/bUso/2dGJf99WTX/a0ww/6BzSf+kd03/kGpD/4dhPP93UzH/j2U9/39zZ/+ec0n/Wk5C/2lKK/9sSyz/h103/29OL/+dckj/bEss/3lVM/9mSSn/nnFH/4heOP+XbUX/Y1ZG/4FzZv+YbkT/WVFE/39bN/+idUv/ck4s/15BI/+OZ0D/dFEz/2JDJ/9sSSn/akcn/6h9U/9/WC//gFw6/4NtVv9jTTj/dFEr/5lvSf+KYzr/ck4q/25KKP96WDX/eFU1/2NFKf9pSyn/dVIy/4JbNP99VjX/fFg2/51wR/+DWzf/jWM9/2lKLf+ZbkT/g1s3/5twRf9rSin/gVwy/4VfOv9qRyf/k2dA/5tuRP+abkH/aUot/3VSMv9rTC3/mGxF/2hJLP+RZjz/b04v/3VTMP9tTC3/eFYz/5dsQv9wTS3/hF43/2dIK/+QaUL/akkq/35aOP91Tyr/bUwr/5FnP/90TCj/Z0Qk/5BmPv9+WzX/imM8/3hWM/9oSij/a0go/2pHJ/+VakD/aEkq/3BOK/9tSSX/h2A5/2xNMf+cckr/elY2/21LKP96WDP/oHZO/4JcNf98WDb/iGRA/21KKv+helH/hFw4/25PMv9qSy7/a0kk/5VqQP+KZkT/b0sr/3xVLv94VzT/g1kx/5pwSP9vSST/f1w2/2pLLv9vXEv/cE0t/4RcOP+OZ0D/nHFH/5dqQf97WDL/c1Eu/2ZJK/+RakP/akcn/5ltQP+VaD//nnFI/2VHK/9dU0n/f1s5/35aNv+FXjf/eFYz/4NdOP+ccUb/bk0s/2VHK/+fcET/iGA8/4tjP/9uTSz/mnBI/4dgN/9jQiH/Y0Ql/3pTLP+IYTr/akgl/5lvRf9vTi//k2k//3lVMf94UCz/fFYx/49sRv+HYTz/lmxG/2pLLP9xTyz/g1s4/21OL/+IYTr/elYy/2xNMP+Zb0n/hF45/41hPP+MZkL/nXNN/4liQf9zYlD/kmpG/3VSNP+LYTv/f1cz/4ZcNv+ZbUj/lG1G/2RJLP99WTX/fFg0/55xSP9lRCX/flo2/39ZNf9nSS3/jWM7/21OL/9lRyv/p3pQ/5tuRP95VTH/aUgp/4lfN/9oRyb/o3dQ/4dfO/+SZj//b0ws/3tXNf+RZz//gFo1/21MLf9qSy//o3ZM/2VIKv+Qa0H/hV87/3hXNv+QZTv/dVIy/2JBIP+LYz//cE0t/3FLJ/92UzP/onhQ/2VGKf+Zb0f/aUYm/3tXM/90UTH/bUkl/2lKLf94VTX/akkq/2VBIf9vTCz/bEkr/59zTP+XcEn/gVs2/5JoQv9wTS3/jmQ8/3xYNP+HYDn/aEUn/5JoQP9sSif/a0or/49nQ/98Wjf/mW1I/59ySP+OZDz/nXBG/6BxRf+JXzf/aUYm/41nQv+VaUT/flg0/3RRMf9uTS7/fFg4/5VrQ/+jd0r/cE0x/2dIK/+QZUL/bEkp/4RcOP+DXzv/e1g6/4VnTf+qf1X/Z0gp/3RRM/91US//Z0gr/2hJLP9rSS3/hV05/2lIJ/+XbUP/imA6/2RFKP9yUTL/h2A5/25LK/9sVj//hlw0/4pkQP+JZUP/eFQw/512Tf9tSyj/h2A5/3NRLv+OaEP/elc3/3BOK/+MYjj/a0op/31VMf9iSC//iGI9/4ZkQf+AWjb/hVs1/3FNK/9uSyv/kGlC/3xYNP+leE7/cVAx/3ZTM/9tTC3/jGRA/3xaNP9vTi//clEy/2dIKf+IYTj/clEw/5pvRf95VTP/il43/2tOMP90UC7/hV87/3pWNP90UTH/jmQ+/3VSMv9nTC//fFg2/3pWMv9pSiv/aUot/6F0Sv95VTP/glo2/6Z6S/+QZj7/imQ//5JoQP+CXjr/hF02/2pLL/+Wa0H/bEou/4thO/9jRCf/hmA8/6J4Tv+GXDb/hV05/3xYNP+UakL/eFQw/19CJP+MYjz/dFAu/1U/KP9iQB3/jGtM/6l/Wf+AWjb/dlAr/4ZuVv9pTC7/dlIw/5lvRf+LYz//dFAs/2pJKv92Tir/cFQ8/19GMP9tSir/YUsz/4pkQP+AVC3/hV05/3FQL/90Ui//c1A0/3tXM/+DXTn/g105/5FmO/+NZj//hWE9/3xUMP93VDT/o3lR/2FGKf+OZDz/oHRH/3xYNv9uSy3/aEks/4ZgPP+DWzf/e1k2/6J1S/9xTzP/hF45/2pLLv+NYzv/Z0gr/51wRv+TbEP/akko/4lfN/9yUTD/o3ZM/3tXM/+gdUv/YkMm/2pMMP90UTH/mW5E/29NMf9/Wzf/jGRA/5txR/+SaED/ZEYq/2VHK/+leE7/flg0/5t0Tf95Uy7/d1Mx/3NRNf+KYj7/c08v/4NfPf98WDT/hl84/4FdOf+HYTz/c00p/4tlQP92UzP/lW5H/4VeN/9rRyX/hV06/25LK/+QaUL/a0go/3ROKv93UzP/';
const GRASS_24_RGBA = 'EEYW/5HNS/+RzUv/kc1L/26+PP+RzUv/kc1L/26+PP+RzUv/kc1L/5HNS/9uvjz/kc1L/5HNS/+RzUv/br48/5HNS/+RzUv/kc1L/26+PP+RzUv/kc1L/5HNS/+RzUv/Tq80/06vNP8QRhb/Tq80/06vNP9OrzT/Tq80/06vNP9OrzT/Tq80/xRaHP9OrzT/Tq80/06vNP9OrzT/EEYW/06vNP9OrzT/Tq80/06vNP8UWhz/Tq80/06vNP9OrzT/Tq80/06vNP9OrzT/Tq80/06vNP9OrzT/FFoc/06vNP9OrzT/Tq80/06vNP9OrzT/Tq80/06vNP9OrzT/Tq80/xRaHP9OrzT/Tq80/06vNP9OrzT/Tq80/06vNP9OrzT/Tq80/xRaHP9OrzT/Tq80/06vNP9OrzT/Tq80/06vNP9OrzT/Tq80/06vNP8UWhz/Tq80/06vNP9OrzT/Tq80/06vNP8QRhb/Tq80/06vNP9OrzT/FFoc/06vNP9OrzT/NJYs/zSWLP80liz/NJYs/zSWLP80liz/NJYs/zSWLP9OrzT/NJYs/zSWLP80liz/EEYW/zSWLP80liz/NJYs/zSWLP80liz/NJYs/zSWLP80liz/NJYs/zSWLP80liz/NJYs/xBGFv80liz/NJYs/zSWLP80liz/NJYs/xRaHP80liz/NJYs/zSWLP80liz/NJYs/zSWLP8QRhb/NJYs/zSWLP8UWhz/NJYs/zSWLP80liz/NJYs/zSWLP80liz/NJYs/zSWLP80liz/FFoc/zSWLP80liz/Ingk/zSWLP80liz/EEYW/zSWLP80liz/NJYs/zSWLP80liz/NJYs/yJ4JP80liz/NJYs/yJ4JP80liz/NJYs/xBGFv80liz/Ingk/yJ4JP8ieCT/Ingk/xRaHP8ieCT/Ingk/yJ4JP8ieCT/Ingk/yJ4JP8QRhb/Ingk/xRaHP8ieCT/Ingk/yJ4JP8ieCT/Ingk/yJ4JP8ieCT/Ingk/yJ4JP8UWhz/Ingk/yJ4JP8ieCT/RioU/yJ4JP8ieCT/RioU/yJ4JP8ieCT/FFoc/yJ4JP8ieCT/Ingk/yJ4JP8ieCT/Ingk/0YqFP8ieCT/Ingk/0YqFP8ieCT/Ingk/3BOK/8ieCT/RioU/2xNMf9GKhT/elY2/0YqFP96WDP/oHZO/4JcNf8ieCT/RioU/21KKv9GKhT/hFw4/0YqFP9qSy7/RioU/5VqQP9GKhT/RioU/3xVLv94VzT/g1kx/5pwSP9GKhT/f1w2/2pLLv9vXEv/cE0t/4RcOP+OZ0D/nHFH/5dqQf97WDL/c1Eu/2ZJK/+RakP/akcn/5ltQP+VaD//nnFI/2VHK/9dU0n/f1s5/35aNv+FXjf/eFYz/4NdOP+ccUb/bk0s/2VHK/+fcET/iGA8/4tjP/9uTSz/mnBI/4dgN/9jQiH/Y0Ql/3pTLP+IYTr/akgl/5lvRf9vTi//k2k//3lVMf94UCz/fFYx/49sRv+HYTz/lmxG/2pLLP9xTyz/g1s4/21OL/+IYTr/elYy/2xNMP+Zb0n/hF45/41hPP+MZkL/nXNN/4liQf9zYlD/kmpG/3VSNP+LYTv/f1cz/4ZcNv+ZbUj/lG1G/2RJLP99WTX/fFg0/55xSP9lRCX/flo2/39ZNf9nSS3/jWM7/21OL/9lRyv/p3pQ/5tuRP95VTH/aUgp/4lfN/9oRyb/o3dQ/4dfO/+SZj//b0ws/3tXNf+RZz//gFo1/21MLf9qSy//o3ZM/2VIKv+Qa0H/hV87/3hXNv+QZTv/dVIy/2JBIP+LYz//cE0t/3FLJ/92UzP/onhQ/2VGKf+Zb0f/aUYm/3tXM/90UTH/bUkl/2lKLf94VTX/akkq/2VBIf9vTCz/bEkr/59zTP+XcEn/gVs2/5JoQv9wTS3/jmQ8/3xYNP+HYDn/aEUn/5JoQP9sSif/a0or/49nQ/98Wjf/mW1I/59ySP+OZDz/nXBG/6BxRf+JXzf/aUYm/41nQv+VaUT/flg0/3RRMf9uTS7/fFg4/5VrQ/+jd0r/cE0x/2dIK/+QZUL/bEkp/4RcOP+DXzv/e1g6/4VnTf+qf1X/Z0gp/3RRM/91US//Z0gr/2hJLP9rSS3/hV05/2lIJ/+XbUP/imA6/2RFKP9yUTL/h2A5/25LK/9sVj//hlw0/4pkQP+JZUP/eFQw/512Tf9tSyj/h2A5/3NRLv+OaEP/elc3/3BOK/+MYjj/a0op/31VMf9iSC//iGI9/4ZkQf+AWjb/hVs1/3FNK/9uSyv/kGlC/3xYNP+leE7/cVAx/3ZTM/9tTC3/jGRA/3xaNP9vTi//clEy/2dIKf+IYTj/clEw/5pvRf95VTP/il43/2tOMP90UC7/hV87/3pWNP90UTH/jmQ+/3VSMv9nTC//fFg2/3pWMv9pSiv/aUot/6F0Sv95VTP/glo2/6Z6S/+QZj7/imQ//5JoQP+CXjr/hF02/2pLL/+Wa0H/bEou/4thO/9jRCf/hmA8/6J4Tv+GXDb/hV05/3xYNP+UakL/eFQw/19CJP+MYjz/dFAu/1U/KP9iQB3/jGtM/6l/Wf+AWjb/dlAr/4ZuVv9pTC7/dlIw/5lvRf+LYz//dFAs/2pJKv92Tir/cFQ8/19GMP9tSir/YUsz/4pkQP+AVC3/hV05/3FQL/90Ui//c1A0/3tXM/+DXTn/g105/5FmO/+NZj//hWE9/3xUMP93VDT/o3lR/2FGKf+OZDz/oHRH/3xYNv9uSy3/aEks/4ZgPP+DWzf/e1k2/6J1S/9xTzP/hF45/2pLLv+NYzv/Z0gr/51wRv+TbEP/akko/4lfN/9yUTD/o3ZM/3tXM/+gdUv/YkMm/2pMMP90UTH/mW5E/29NMf9/Wzf/jGRA/5txR/+SaED/ZEYq/2VHK/+leE7/flg0/5t0Tf95Uy7/d1Mx/3NRNf+KYj7/c08v/4NfPf98WDT/hl84/4FdOf+HYTz/c00p/4tlQP92UzP/lW5H/4VeN/9rRyX/hV06/25LK/+QaUL/a0go/3ROKv93UzP/';
const DIRT_16_RGBA = 'aUgp/3FSNf9lSCr/Z0gp/39YN/+cdUz/l2xC/2lHJP90UTH/imA4/45kPv+keEv/Zkco/2VKL/+PZTv/nHFG/3FQMf9tTC3/bk0u/2NIK/+BXTv/f1gx/25LLf96VjL/hFw4/5htQ/+ccEH/p3hM/2hHJv+BWTb/hl84/3ZSLv9nSCv/l2xB/3BPLv9/VzP/lWhB/35XMP+bcEb/YUIl/3tZNv9/VzT/j2U//3RRMf9nRiX/fVk1/6BzSf+kd03/clEy/3dTMf9/c2f/nnNJ/3BNL/9sSyz/qn9V/51ySP93VjX/Zkkp/4heOP+XbUX/gXNm/5huRP9/Wzf/onVL/5ZsRP+pek7/dVAz/3dTMf9wTS3/bUsv/6J3Tf+CWzT/a0wv/3JPL/97VzX/nG9F/3JOKv97VzP/f1k1/29MLP9mRyr/cE0t/2dIK/+QaUL/flgz/3VPKv9vTi//dEwo/5VqQP9+WzX/eFYz/2hKKP9qRyf/lWpA/3BOK/9tSSX/Zkkr/2hLLf96VjL/lmlC/2lMLP94Ui3/n3VN/3ROKf9kSSv/flg0/2dKLP+VaEH/aEsr/5ltQP94VTX/YUQm/5ZsRv+fcET/i2M//25NLP+GYDv/Y0Ih/3tXN/+IYTr/dFEx/29OL/95VTH/eFAs/49sRv+HYTz/akss/3FPLP9sTS7/lmlA/2xgUv9/XDb/jWVB/3BPLv+lelD/nnRK/4BaNv9vTi//b04v/4JbNP9rW0z/lWpA/6B1S/+hdkz/dVIy/5BlO/9iQSD/i2M//3hUMv92UzP/gVk1/5lvR/+PaUT/dFEx/2lKLf94VTX/ZUEh/29MLP+fc0z/l3BJ/4NdOf+jd0r/Z0gr/5BlQv9rSS3/g187/4VdOv+qf1X/kmhC/3VRL/9oSSz/a0kt/2lIJ/+XbUP/ZEUo/3JRMv+GYDz/bFY//4pkQP+JZUP/akcn/21LKP+KZD//jmhD/4pgOv+MYjj/fVUx/2JIL/+GZEH/gFo2/3FNK/9uSyv/flo2/2lKK/+hdEr/eVUz/31ZN/+QZj7/fVk5/4JeOv+ab0T/lmtB/4thO/9jRCf/onhO/4ZcNv98WDT/lGpC/4dhPf+MYjz/VT8o/2JAHf+CXjz/gFo2/2tHJ/9pTC7/aUgp/4tjP/9qSSr/dk4q/19GMP9tSir/imRA/4BULf9wUTT/jWM7/51wRv+TbEP/kWc//3JRMP9oSSz/oHVL/6R1Sf90UTH/b00x/39bN/+bcUf/kmhA/2VHK/+leE7/fVUx/3lTLv9zUTX/imI+/4ReOf98WDT/fVk3/4dhPP+cdUz/dlMz/4VeN/9rRyX/bksr/5BpQv90Tir/d1Mz/w==';
const STONE_24_RGBA = 'eoKS/3qCkv96gpL/eoKS/4qSov+KkqL/ipKi/4qSov96gpL/eoKS/2pygP9qcoD/eoKS/3qCkv+KkqL/ipKi/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/3qCkv96gpL/eoKS/3qCkv96gpL/eoKS/4qSov+KkqL/ipKi/4qSov96gpL/eoKS/2pygP9qcoD/eoKS/3qCkv+KkqL/ipKi/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/3qCkv96gpL/eoKS/3qCkv+KkqL/ipKi/5yktP+cpLT/ipKi/4qSov96gpL/eoKS/1RaaP9UWmj/anKA/2pygP+cpLT/nKS0/4qSov+KkqL/eoKS/3qCkv96gpL/eoKS/3qCkv96gpL/eoKS/3qCkv+KkqL/ipKi/5yktP+cpLT/ipKi/4qSov96gpL/eoKS/1RaaP9UWmj/anKA/2pygP+cpLT/nKS0/4qSov+KkqL/eoKS/3qCkv96gpL/eoKS/3qCkv96gpL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/2pygP9qcoD/eoKS/3qCkv+KkqL/ipKi/3qCkv96gpL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/2pygP9qcoD/eoKS/3qCkv+KkqL/ipKi/3qCkv96gpL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/VFpo/1RaaP9qcoD/anKA/3qCkv96gpL/eoKS/3qCkv+KkqL/ipKi/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/1RaaP9UWmj/anKA/2pygP+KkqL/ipKi/5yktP+cpLT/VFpo/1RaaP9qcoD/anKA/3qCkv96gpL/eoKS/3qCkv+KkqL/ipKi/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/1RaaP9UWmj/anKA/2pygP+KkqL/ipKi/5yktP+cpLT/anKA/2pygP96gpL/eoKS/4qSov+KkqL/nKS0/5yktP+KkqL/ipKi/3qCkv96gpL/eoKS/3qCkv96gpL/eoKS/2pygP9qcoD/eoKS/3qCkv+KkqL/ipKi/4qSov+KkqL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/nKS0/5yktP+KkqL/ipKi/3qCkv96gpL/eoKS/3qCkv96gpL/eoKS/2pygP9qcoD/eoKS/3qCkv+KkqL/ipKi/4qSov+KkqL/eoKS/3qCkv96gpL/eoKS/4qSov+KkqL/ipKi/4qSov96gpL/eoKS/2pygP9qcoD/VFpo/1RaaP9qcoD/anKA/3qCkv96gpL/eoKS/3qCkv96gpL/eoKS/2pygP9qcoD/eoKS/3qCkv96gpL/eoKS/4qSov+KkqL/ipKi/4qSov96gpL/eoKS/2pygP9qcoD/VFpo/1RaaP9qcoD/anKA/3qCkv96gpL/eoKS/3qCkv96gpL/eoKS/2pygP9qcoD/eoKS/3qCkv9qcoD/anKA/3qCkv96gpL/eoKS/3qCkv9qcoD/anKA/1RaaP9UWmj/anKA/2pygP96gpL/eoKS/4qSov+KkqL/ipKi/4qSov96gpL/eoKS/1RaaP9UWmj/eoKS/3qCkv9qcoD/anKA/3qCkv96gpL/eoKS/3qCkv9qcoD/anKA/1RaaP9UWmj/anKA/2pygP96gpL/eoKS/4qSov+KkqL/ipKi/4qSov96gpL/eoKS/1RaaP9UWmj/ipKi/4qSov96gpL/eoKS/2pygP9qcoD/VFpo/1RaaP9qcoD/anKA/3qCkv96gpL/ipKi/4qSov+cpLT/nKS0/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/2pygP9qcoD/ipKi/4qSov96gpL/eoKS/2pygP9qcoD/VFpo/1RaaP9qcoD/anKA/3qCkv96gpL/ipKi/4qSov+cpLT/nKS0/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/2pygP9qcoD/ipKi/4qSov+KkqL/ipKi/3qCkv96gpL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/ipKi/4qSov+KkqL/ipKi/3qCkv96gpL/anKA/2pygP96gpL/eoKS/3qCkv96gpL/ipKi/4qSov+KkqL/ipKi/3qCkv96gpL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/ipKi/4qSov+KkqL/ipKi/3qCkv96gpL/anKA/2pygP96gpL/eoKS/3qCkv96gpL/eoKS/3qCkv+cpLT/nKS0/4qSov+KkqL/eoKS/3qCkv+KkqL/ipKi/5yktP+cpLT/eoKS/3qCkv9qcoD/anKA/1RaaP9UWmj/anKA/2pygP+KkqL/ipKi/4qSov+KkqL/eoKS/3qCkv+cpLT/nKS0/4qSov+KkqL/eoKS/3qCkv+KkqL/ipKi/5yktP+cpLT/eoKS/3qCkv9qcoD/anKA/1RaaP9UWmj/anKA/2pygP+KkqL/ipKi/4qSov+KkqL/anKA/2pygP+KkqL/ipKi/3qCkv96gpL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/2pygP9qcoD/eoKS/3qCkv+cpLT/nKS0/4qSov+KkqL/anKA/2pygP+KkqL/ipKi/3qCkv96gpL/anKA/2pygP96gpL/eoKS/4qSov+KkqL/eoKS/3qCkv9qcoD/anKA/2pygP9qcoD/eoKS/3qCkv+cpLT/nKS0/4qSov+KkqL/eoKS/3qCkv96gpL/eoKS/2pygP9qcoD/eoKS/3qCkv96gpL/eoKS/3qCkv96gpL/anKA/2pygP96gpL/eoKS/3qCkv96gpL/eoKS/3qCkv+KkqL/ipKi/3qCkv96gpL/eoKS/3qCkv96gpL/eoKS/2pygP9qcoD/eoKS/3qCkv96gpL/eoKS/3qCkv96gpL/anKA/2pygP96gpL/eoKS/3qCkv96gpL/eoKS/3qCkv+KkqL/ipKi/3qCkv96gpL/';
const DIRT_WALL_24_RGBA = 'Z0sy/1tAJ/9xVjj/Vz4n/1Q6JP9hRSz/Zksy/1Q5Iv9UOyP/cFQ7/1Q8Jv9vVDf/YEUr/2BFKv9kSjD/WD0m/1E4IP9fRCr/XEAp/11DKf9cQSf/XkYw/2NKMv9UOyX/YUYr/3NUN/9mSzH/WUEo/3NUN/9TPSf/b1E1/1A8J/9aQif/XUIo/3NXOv9vUzX/Ujkj/3dVNf9aQCj/c1Y5/25OMf9dRCv/XUMs/3NUN/9dQyr/Tjkk/1pBKf9eQyr/Vj8p/2NHLv9UPCf/eVk5/1Q9J/9MOSX/a0ww/1ZCKv9gRCn/YUgw/1Q7I/9dQyr/Uz0n/2BGLP9xVDb/Y0gv/3RVNP98Wzz/Ujkn/1A5If9hRS3/bE0x/2VKLv9aQCf/XUEn/11GL/9aSj3/X0Yu/21ROP9lSzL/Vz4l/3NWOf9TOyb/VDwl/1lAKv9sTTH/X0Yu/1o/Jf9aQCj/Vjon/2FFLP9KOiz/Ykct/2pQN/9aQiv/Wj8m/1U9J/9NOST/Z0ww/3haOf9wUzT/Y0gt/1U+J/9gQyr/Vz8q/1Q7Jf9fQyj/Vz8k/1pCKv9LNSD/Tjch/1xCKv9gQyv/dVU4/2tNM/9YQCn/VDsj/084IP9eRSz/Ujwo/3dXOf95Wj3/bFE2/2ZLMP9aQSn/a00x/2BXT/92Vzn/Rj01/1A6Jf9TOyb/Zkgt/1Q9J/91Vjn/Uzsm/1xCKv9OOSP/dlY5/2ZJLv9wVDf/TEM4/2FXTv9xVDf/RUA3/2BGLf94WTv/Vj0m/0k0H/9qTzP/WEAq/0s2Iv9TOSP/UTki/31eQf9gRCf/YEcw/2NUQ/9MPS7/WEAl/3JUOf9nTDD/Vj0k/1Q6I/9dRCz/W0Is/0w3I/9QOyP/WUAq/2JGK/9eQyz/XUQt/3VVOf9jRi3/aUwx/1A6J/9yVDf/Y0Yt/3NVN/9SOiP/YUcq/2RKMP9ROSL/bk8z/3NUN/9zVDT/UDon/1lAKv9SPCf/cVM3/1A5Jv9tTjD/VD0n/1lBKP9UPCf/W0Mq/3BTNf9VPSf/Y0kt/085Jf9sUDX/UTkk/19GLv9ZPiT/VDwl/21PM/9YPCP/Tzcg/2xOMv9fRiz/Z0ww/1tDKv9QOiP/Ujkj/1E5Iv9vUTP/UDkk/1U9Jf9UOSD/Zkov/1M9Kf90Vjr/XUMt/1Q7I/9dRCr/d1o9/2JHLP9dRC3/Zk0z/1Q6JP94XUD/Y0cu/1Q+Kv9ROyf/Ujkg/29RM/9nTjf/VDsl/11CJ/9bQyv/Y0Up/3NVOf9UOSD/YEct/1E7J/9URzv/VT0n/2NHLv9qTzP/dFY5/3BRNP9dRCr/V0An/045Jf9tUTb/UTki/3JUM/9vUDP/dlY5/005Jf9IQTn/YEYv/19GLf9kSS3/W0Mq/2NILv90Vjj/VD0m/005Jf93VTf/Zkow/2hMM/9UPSb/c1U5/2ZKLf9MNR7/TDcg/11BJv9mSzD/UTkg/3JUN/9UPSf/blAz/1xCKf9bPyb/XUMp/2tTOP9mSzD/b1M4/1E7Jv9WPib/Y0Yu/1Q9J/9mSzD/XUMq/1M9KP9yVDn/Y0kv/2lLMP9pTjX/dVc9/2ZLNP9XSz//bVE4/1lAK/9oSzD/YEMq/2VHLf9yVDn/b1Q4/005Jv9eRSz/XUQr/3ZWOf9NNyD/X0Yt/2BFLP9POSf/aUww/1Q9J/9NOSX/fF0//3NUN/9cQin/UDkj/2ZKLf9QOSH/eVo//2ZKMP9tTjP/VDwm/11DLP9tTzP/YEYs/1Q8J/9ROyf/eVo8/005JP9sUjT/ZEow/1tDLf9sTTD/WUAq/0s0Hf9oTDP/VT0n/1Y7Iv9aQSr/eFs//004I/9yVDn/UDgh/11DKv9YQCn/VDkg/1A6J/9bQiz/UTkk/000Hv9UPCb/Uzkl/3dXPP9wVTn/YUYt/21QNf9VPSf/ak0w/11EK/9mSi//UDci/21QM/9TOiL/Ujol/2tPNv9dRi3/clQ5/3dWOf9qTTD/dVU4/3dWN/9mSi3/UDgh/2lPNf9vUDf/X0Qr/1hAKf9UPSf/XUQu/29SNv95Wjr/VT0p/085Jf9sTTX/Uzkj/2NHLv9jSjD/XUQw/2RPPf9+YEL/Tzkj/1hAKv9ZQCf/Tzkl/1A5Jv9SOSf/ZEgv/1A5Iv9wVDb/Z0ow/003I/9WQCr/Zkov/1Q7Jf9TQzP/ZUcr/2dNM/9mTTb/W0Io/3VaPf9UOyP/Zkov/1dAJ/9qUDb/XUMt/1U9Jf9pSy7/Ujoj/15CKf9LOSf/Zksx/2VNNP9gRi3/ZEYs/1Y9Jf9UOyX/bFA1/11EK/96Wz3/Vj8p/1pBKv9UPCf/aU0z/11GK/9UPSf/VkAq/085I/9mSy7/VkAo/3NUN/9cQir/Z0kt/1I9KP9YPyf/ZEow/11DK/9YQCn/ak0y/1lAKv9PPCf/XUQt/11DKv9QOiX/UDon/3hYOv9cQir/YkYt/3tdO/9sTjL/Z00z/21QM/9iSTD/Y0gt/1E7J/9vUjT/Uzon/2hLMP9MNyL/ZUow/3hbPf9lRy3/ZEgv/11EK/9vUTX/W0Io/0o1IP9pSzD/WD8n/0IzI/9LMxv/aVI8/31gRf9gRi3/Wj8l/2VUQ/9QPCf/WkAo/3JUN/9oTDP/WD8m/1E5JP9aPST/VUIw/0o4KP9UOiT/Szsq/2dNM/9gQif/ZEgv/1Y/J/9YQCf/Vz8r/11DKv9jSC//Y0gv/21OMP9pTjP/ZEsx/11CKP9aQiv/eVxA/0s4I/9qTTD/d1g5/11ELf9UOyf/UDkm/2VKMP9jRi3/XUUt/3hZO/9WPir/Y0kv/1E7J/9pTDD/Tzkl/3VVOP9uUzb/UTkj/2ZKLf9WQCj/eVo8/11DKv93WTv/SzYh/1E8KP9YQCn/clQ3/1Q9Kf9gRi3/aU0z/3NWOf9tUDP/TTgk/005Jf96Wz3/X0Qr/3NYPf9cQSf/WkEp/1dALP9nSzL/Vz4n/2NKMf9dRCv/ZUou/2FIL/9mSzD/Vz0j/2hNM/9aQSr/b1Q5/2RJLf9SOSD/ZEgw/1Q7Jf9sUDX/Ujkj/1g9JP9aQSr/';

export class TextureGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    const T = GAME_CONSTANTS.TILE_SIZE;

    // 1. Generate Block Tiles
    this.createBlockTextures(scene, T);

    // 1.1 Generate Unified Tileset Texture for Phaser Tilemap
    this.createTilesetTexture(scene, T);

    // 2. Generate Crack Textures
    this.createCrackTextures(scene, T);

    // 3. Generate Player Sprites
    this.createPlayerTextures(scene);

    // 4. Generate Tool & Icon Textures
    this.createItemIcons(scene);

    // 5. Generate Reticle & Particles
    this.createUtilityTextures(scene, T);

    // 6. Generate Enemies & Combat Textures
    this.createCombatTextures(scene);

    // 7. Generate Celestial Textures (Sun & Moon)
    this.createCelestialTextures(scene);

    // 8. Generate Procedural Handcrafted Tree Crown Textures (5 shapes x 4 palettes = 20 textures)
    for (let v = 0; v < CROWN_DEFS.length; v++) {
      const cDef = CROWN_DEFS[v];
      for (let p = 0; p < CROWN_PALETTES.length; p++) {
        const key = `tree_crown_${v}_${p}`;
        if (!scene.textures.exists(key)) {
          const canvas = scene.textures.createCanvas(key, cDef.width, cDef.height);
          if (canvas) {
            const ctx = canvas.context;
            ctx.imageSmoothingEnabled = false;
            renderCrownToContext(ctx, cDef, CROWN_PALETTES[p]);
            canvas.refresh();
          }
        }
      }
    }

    // 9. Generate Large Pixel Art Branch Textures (Left & Right x Palettes, Regular & Dark Wood)
    for (let p = 0; p < CROWN_PALETTES.length; p++) {
      // Normal oak wood branches
      const leftKey = `tree_branch_left_${p}`;
      if (!scene.textures.exists(leftKey)) {
        const canvas = scene.textures.createCanvas(leftKey, 48, 42);
        if (canvas) {
          const ctx = canvas.context;
          ctx.imageSmoothingEnabled = false;
          renderBranchSpriteToContext(ctx, 'L', CROWN_PALETTES[p], false);
          canvas.refresh();
        }
      }
      const rightKey = `tree_branch_right_${p}`;
      if (!scene.textures.exists(rightKey)) {
        const canvas = scene.textures.createCanvas(rightKey, 48, 42);
        if (canvas) {
          const ctx = canvas.context;
          ctx.imageSmoothingEnabled = false;
          renderBranchSpriteToContext(ctx, 'R', CROWN_PALETTES[p], false);
          canvas.refresh();
        }
      }

      // Dark gothic wood branches for Dark Forest
      const leftDarkKey = `tree_branch_left_${p}_dark`;
      if (!scene.textures.exists(leftDarkKey)) {
        const canvas = scene.textures.createCanvas(leftDarkKey, 48, 42);
        if (canvas) {
          const ctx = canvas.context;
          ctx.imageSmoothingEnabled = false;
          renderBranchSpriteToContext(ctx, 'L', CROWN_PALETTES[p], true);
          canvas.refresh();
        }
      }
      const rightDarkKey = `tree_branch_right_${p}_dark`;
      if (!scene.textures.exists(rightDarkKey)) {
        const canvas = scene.textures.createCanvas(rightDarkKey, 48, 42);
        if (canvas) {
          const ctx = canvas.context;
          ctx.imageSmoothingEnabled = false;
          renderBranchSpriteToContext(ctx, 'R', CROWN_PALETTES[p], true);
          canvas.refresh();
        }
      }
    }

    // Default fallback crown alias
    if (!scene.textures.exists('tree_crown')) {
      const def = CROWN_DEFS[0];
      const canvas = scene.textures.createCanvas('tree_crown', def.width, def.height);
      if (canvas) {
        const ctx = canvas.context;
        ctx.imageSmoothingEnabled = false;
        renderCrownToContext(ctx, def, CROWN_PALETTES[0]);
        canvas.refresh();
      }
    }
  }

  public static decodePixelData(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    base64Data: string,
    dx: number = 0,
    dy: number = 0
  ): void {
    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const imgData = ctx.createImageData(width, height);
    imgData.data.set(bytes);
    ctx.putImageData(imgData, dx, dy);
  }

  public static drawStoneTexture(ctx: CanvasRenderingContext2D, T: number): void {
    TextureGenerator.decodePixelData(ctx, T, T, STONE_24_RGBA);
  }

  public static drawOrganicOreTexture(
    ctx: CanvasRenderingContext2D,
    T: number,
    palette: { socket: string; base: string; bright: string; hi: string; glint: string }
  ): void {
    TextureGenerator.drawStoneTexture(ctx, T);

    const deposits = [
      // Deposit 1 (upper-left, faceted)
      {
        socket: [[5,5,4,1], [4,6,1,2], [8,6,1,1], [4,7,1,1], [9,7,1,1], [5,8,4,1], [6,9,2,1]],
        base:   [[5,6,3,1], [5,7,4,1], [6,8,2,1]],
        bright: [[6,6,2,1], [5,7,2,1]],
        hi:     [[6,6,1,1]],
        glint:  [[6,6,1,1]]
      },
      // Deposit 2 (center-right, faceted)
      {
        socket: [[13,11,4,1], [12,12,1,2], [17,12,1,2], [13,14,1,1], [17,14,1,1], [14,15,3,1]],
        base:   [[14,12,2,1], [13,13,4,1], [14,14,3,1]],
        bright: [[14,12,2,1], [13,13,2,1]],
        hi:     [[14,12,2,1]],
        glint:  [[14,12,1,1]]
      },
      // Deposit 3 (lower-left, faceted)
      {
        socket: [[8,15,4,1], [7,16,1,2], [11,16,1,2], [7,18,1,1], [9,18,2,1], [8,19,1,1]],
        base:   [[9,16,2,1], [8,17,3,1], [8,18,1,1]],
        bright: [[9,16,2,1], [8,17,1,1]],
        hi:     [[9,16,1,1]],
        glint:  [[9,16,1,1]]
      },
      // Deposit 4 (upper-right fleck)
      {
        socket: [[17,4,4,1], [17,5,1,1], [20,5,1,1], [18,6,1,1], [20,6,1,1], [19,7,1,1]],
        base:   [[18,5,2,1], [19,6,1,1]],
        bright: [[18,5,2,1]],
        hi:     [[18,5,1,1]],
        glint:  [[18,5,1,1]]
      },
      // Deposit 5 (lower-edge fleck)
      {
        socket: [[3,12,3,1], [3,13,1,2], [5,13,1,2], [4,15,1,1]],
        base:   [[4,13,1,2]],
        bright: [[4,13,1,1]],
        hi:     [[4,13,1,1]],
        glint:  [[4,13,1,1]]
      }
    ];

    deposits.forEach(dep => {
      ctx.fillStyle = palette.socket;
      dep.socket.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
      ctx.fillStyle = palette.base;
      dep.base.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
      ctx.fillStyle = palette.bright;
      dep.bright.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
      ctx.fillStyle = palette.hi;
      dep.hi.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
      ctx.fillStyle = palette.glint;
      dep.glint.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
    });
  }

  private static createBlockTextures(scene: Phaser.Scene, T: number): void {
    // Helper to draw single tile canvas
    const drawTile = (key: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, T, T);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx);
      canvas.refresh();
    };

    // 1. DIRT
    drawTile(`tile_${BlockId.DIRT}`, (ctx) => {
      if (scene.textures.exists('texture_dirt')) {
        const tex = scene.textures.get('texture_dirt');
        const img = tex.getSourceImage() as CanvasImageSource;
        if (img && ((img as HTMLImageElement).width > 0 || (img as HTMLCanvasElement).width > 0)) {
          ctx.drawImage(img, 0, 0, T, T);
          return;
        }
      }
      this.decodePixelData(ctx, T, T, DIRT_24_RGBA);
    });

    // 2. GRASS
    drawTile(`tile_${BlockId.GRASS}`, (ctx) => {
      if (scene.textures.exists('texture_grass')) {
        const tex = scene.textures.get('texture_grass');
        const img = tex.getSourceImage() as CanvasImageSource;
        if (img && ((img as HTMLImageElement).width > 0 || (img as HTMLCanvasElement).width > 0)) {
          ctx.drawImage(img, 0, 0, T, T);
          return;
        }
      }
      this.decodePixelData(ctx, T, T, GRASS_24_RGBA);
    });

    // 3. STONE (Terraria-style natural subterranean shale)
    drawTile(`tile_${BlockId.STONE}`, (ctx) => {
      TextureGenerator.drawStoneTexture(ctx, T);
    });

    // 4. WOOD (Tree Trunk)
    drawTile(`tile_${BlockId.WOOD}`, (ctx) => {
      drawTreeTrunk(ctx, T);
    });

    // 5. LEAVES (Lush seamless emerald foliage)
    drawTile(`tile_${BlockId.LEAVES}`, (ctx) => {
      drawLushLeaves(ctx, T);
    });

    // 24. SAPLING (Cute young seedling)
    drawTile(`tile_${BlockId.SAPLING}`, (ctx) => {
      drawTreeSapling(ctx, T);
    });

    // 25. TREE ROOT (Flared trunk base resting on grass)
    drawTile(`tile_${BlockId.TREE_ROOT}`, (ctx) => {
      drawTreeRoot(ctx, T);
    });

    // 26. TREE BRANCH LEFT (Trunk with left branch and leaf tuft)
    drawTile(`tile_${BlockId.TREE_BRANCH_L}`, (ctx) => {
      drawTreeBranchL(ctx, T);
    });

    // 27. TREE BRANCH RIGHT (Trunk with right branch and leaf tuft)
    drawTile(`tile_${BlockId.TREE_BRANCH_R}`, (ctx) => {
      drawTreeBranchR(ctx, T);
    });

    // 6. COPPER ORE
    drawTile(`tile_${BlockId.COPPER_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#301405', base: '#c65622', bright: '#ea803e', hi: '#ffaf6c', glint: '#ffe6c8'
      });
    });

    // 7. IRON ORE
    drawTile(`tile_${BlockId.IRON_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#24201c', base: '#8a7c70', bright: '#b0a296', hi: '#d6cec6', glint: '#ffffff'
      });
    });

    // 8. COAL ORE
    drawTile(`tile_${BlockId.COAL_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#101114', base: '#22242a', bright: '#363a42', hi: '#545a66', glint: '#7d8694'
      });
    });

    // 9. GOLD ORE
    drawTile(`tile_${BlockId.GOLD_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#422e02', base: '#d8a010', bright: '#f8ca26', hi: '#ffec64', glint: '#ffffff'
      });
    });

    // 10. CRYSTAL ORE
    drawTile(`tile_${BlockId.CRYSTAL_ORE}`, (ctx) => {
      ctx.fillStyle = '#2d2038';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#3d2b4d';
      ctx.fillRect(2, 1, 14, 8);
      ctx.fillRect(1, 4, 18, 10);
      ctx.fillRect(7, 10, 15, 11);
      ctx.fillStyle = '#503863';
      ctx.fillRect(4, 2, 10, 4);
      ctx.fillRect(8, 11, 11, 4);

      ctx.fillStyle = '#1c1424';
      ctx.fillRect(0, 8, 5, 2);
      ctx.fillRect(4, 10, 3, 2);
      ctx.fillRect(6, 12, 2, 3);
      ctx.fillRect(14, 2, 2, 2);

      const crystals = [
        { x: 4, y: 3, w: 6, h: 5 },
        { x: 12, y: 5, w: 6, h: 5 },
        { x: 7, y: 11, w: 5, h: 5 },
        { x: 14, y: 14, w: 6, h: 5 },
        { x: 3, y: 16, w: 4, h: 4 }
      ];
      crystals.forEach(c => {
        ctx.fillStyle = '#420d66';
        ctx.fillRect(c.x - 1, c.y - 1, c.w + 2, c.h + 2);
        ctx.fillStyle = '#831ec7';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#ab3bf0';
        ctx.fillRect(c.x + 1, c.y + 1, c.w - 1, c.h - 1);
        ctx.fillStyle = '#dc7aff';
        ctx.fillRect(c.x + 1, c.y + 1, Math.max(1, c.w - 2), 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(c.x + 2, c.y + 1, 2, 1);
      });
    });

    // 11. BRICK
    drawTile(`tile_${BlockId.BRICK}`, (ctx) => {
      ctx.fillStyle = '#26282e';
      ctx.fillRect(0, 0, T, T);

      const brickRows = [
        [{ x: 1, y: 1, w: 10, h: 4 }, { x: 12, y: 1, w: 11, h: 4 }],
        [{ x: 1, y: 6, w: 4, h: 4 }, { x: 6, y: 6, w: 11, h: 4 }, { x: 18, y: 6, w: 5, h: 4 }],
        [{ x: 1, y: 11, w: 10, h: 5 }, { x: 12, y: 11, w: 11, h: 5 }],
        [{ x: 1, y: 17, w: 5, h: 5 }, { x: 7, y: 17, w: 10, h: 5 }, { x: 18, y: 17, w: 5, h: 5 }]
      ];

      brickRows.forEach(row => {
        row.forEach(b => {
          ctx.fillStyle = '#545963';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = '#7a8291';
          ctx.fillRect(b.x, b.y, b.w, 1);
          ctx.fillRect(b.x, b.y, 1, b.h);
          ctx.fillStyle = '#636975';
          ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
          ctx.fillStyle = '#3a3d45';
          ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
          ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
        });
      });
    });

    // 12. PLANK
    drawTile(`tile_${BlockId.PLANK}`, (ctx) => {
      ctx.fillStyle = '#331e0d';
      ctx.fillRect(0, 0, T, T);

      const boards = [
        { x: 0, y: 1, w: T, h: 6 },
        { x: 0, y: 9, w: T, h: 6 },
        { x: 0, y: 17, w: T, h: 6 }
      ];

      boards.forEach(b => {
        ctx.fillStyle = '#8a5929';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#9c6630';
        ctx.fillRect(b.x, b.y + 1, b.w, b.h - 2);
        ctx.fillStyle = '#be8547';
        ctx.fillRect(b.x, b.y, b.w, 1);
        ctx.fillStyle = '#d69956';
        ctx.fillRect(b.x + 4, b.y, 12, 1);
        ctx.fillStyle = '#73461c';
        ctx.fillRect(b.x, b.y + 3, b.w, 1);
        ctx.fillRect(b.x + 6, b.y + 4, 10, 1);
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
        // Nails
        ctx.fillStyle = '#26180a';
        ctx.fillRect(b.x + 2, b.y + 2, 2, 2);
        ctx.fillRect(b.x + b.w - 4, b.y + 2, 2, 2);
        ctx.fillStyle = '#8a94a3';
        ctx.fillRect(b.x + 2, b.y + 2, 1, 1);
        ctx.fillRect(b.x + b.w - 4, b.y + 2, 1, 1);
      });
    });

    // 13. GLASS
    drawTile(`tile_${BlockId.GLASS}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#4da2b0';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = 'rgba(165, 230, 245, 0.35)';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#94e8f5';
      ctx.fillRect(1, 1, T - 2, 1);
      ctx.fillRect(1, 1, 1, T - 2);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < 14; i++) {
        ctx.fillRect(4 + i, 18 - i, 2, 1);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(12 + i, 20 - i, 1, 1);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 2, 2, 2);
    });

    // 14. OBSIDIAN
    drawTile(`tile_${BlockId.OBSIDIAN}`, (ctx) => {
      ctx.fillStyle = '#0a0712';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#140e21';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#241838';
      ctx.fillRect(2, 2, 14, 9);
      ctx.fillRect(8, 11, 14, 10);
      ctx.fillRect(2, 13, 8, 8);

      ctx.fillStyle = '#472b6e';
      ctx.fillRect(3, 3, 11, 3);
      ctx.fillRect(9, 12, 11, 3);
      ctx.fillRect(3, 14, 5, 2);

      ctx.fillStyle = '#7346ad';
      ctx.fillRect(5, 3, 7, 1);
      ctx.fillRect(11, 12, 7, 1);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 3, 2, 1);
      ctx.fillRect(13, 12, 2, 1);
    });

    // 15. BEDROCK
    drawTile(`tile_${BlockId.BEDROCK}`, (ctx) => {
      ctx.fillStyle = '#0a0b0e';
      ctx.fillRect(0, 0, T, T);

      ctx.fillStyle = '#151821';
      ctx.fillRect(1, 1, 15, 9);
      ctx.fillRect(8, 10, 15, 12);
      ctx.fillRect(1, 12, 9, 10);

      ctx.fillStyle = '#222836';
      ctx.fillRect(3, 2, 10, 5);
      ctx.fillRect(10, 12, 11, 6);
      ctx.fillRect(2, 14, 6, 5);

      ctx.fillStyle = '#313a4d';
      ctx.fillRect(5, 3, 6, 2);
      ctx.fillRect(12, 13, 7, 2);

      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 9, 8, 2);
      ctx.fillRect(7, 11, 3, 2);
      ctx.fillRect(15, 2, 2, 8);
      ctx.fillRect(16, 9, 8, 2);
    });

    // 16. WALL TILES
    drawTile(`tile_${BlockId.DIRT_WALL}`, (ctx) => {
      ctx.fillStyle = '#2e1e12';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#3d2817';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#4a321d';
      ctx.fillRect(3, 3, 8, 6);
      ctx.fillRect(13, 9, 8, 7);
      ctx.fillRect(4, 14, 7, 6);
      ctx.fillStyle = '#24160a';
      ctx.fillRect(8, 7, 2, 2);
      ctx.fillRect(15, 17, 2, 2);
    });

    drawTile(`tile_${BlockId.STONE_WALL}`, (ctx) => {
      ctx.fillStyle = '#222429';
      ctx.fillRect(0, 0, T, T);

      const bricks = [
        { x: 1, y: 1, w: 10, h: 4 }, { x: 12, y: 1, w: 11, h: 4 },
        { x: 1, y: 6, w: 5, h: 4 }, { x: 7, y: 6, w: 10, h: 4 }, { x: 18, y: 6, w: 5, h: 4 },
        { x: 1, y: 11, w: 10, h: 5 }, { x: 12, y: 11, w: 11, h: 5 },
        { x: 1, y: 17, w: 5, h: 5 }, { x: 7, y: 17, w: 10, h: 5 }, { x: 18, y: 17, w: 5, h: 5 }
      ];
      bricks.forEach(b => {
        ctx.fillStyle = '#393c45';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#4a4f5c';
        ctx.fillRect(b.x, b.y, b.w, 1);
        ctx.fillRect(b.x, b.y, 1, b.h);
      });
    });

    drawTile(`tile_${BlockId.WOOD_WALL}`, (ctx) => {
      ctx.fillStyle = '#211409';
      ctx.fillRect(0, 0, T, T);
      const boards = [{ x: 1, w: 6 }, { x: 9, w: 6 }, { x: 17, w: 6 }];
      boards.forEach(b => {
        ctx.fillStyle = '#422a14';
        ctx.fillRect(b.x, 0, b.w, T);
        ctx.fillStyle = '#54361a';
        ctx.fillRect(b.x + 1, 0, b.w - 2, T);
        ctx.fillStyle = '#694421';
        ctx.fillRect(b.x + 2, 0, 1, T);
      });
    });

    // 19. TORCH
    drawTile(`tile_${BlockId.TORCH}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#262930';
      ctx.fillRect(8, 14, 8, 2);
      ctx.fillRect(8, 16, 2, 4);

      ctx.fillStyle = '#543419';
      ctx.fillRect(10, 8, 4, 14);
      ctx.fillStyle = '#784b25';
      ctx.fillRect(11, 8, 2, 14);

      ctx.fillStyle = '#e63700';
      ctx.fillRect(8, 4, 8, 6);
      ctx.fillStyle = '#ff7b00';
      ctx.fillRect(9, 3, 6, 6);
      ctx.fillStyle = '#ffc800';
      ctx.fillRect(10, 2, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 2, 2, 3);
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(10, 0, 1, 1);
      ctx.fillRect(13, 1, 1, 1);
    });

    // 20. WORKBENCH
    drawTile(`tile_${BlockId.WORKBENCH}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#70431e';
      ctx.fillRect(1, 4, 22, 6);
      ctx.fillStyle = '#8f5728';
      ctx.fillRect(2, 5, 20, 4);
      ctx.fillStyle = '#bd7d42';
      ctx.fillRect(2, 4, 20, 1);

      ctx.fillStyle = '#472a12';
      ctx.fillRect(3, 10, 4, 13);
      ctx.fillRect(17, 10, 4, 13);
      ctx.fillStyle = '#5c3718';
      ctx.fillRect(4, 10, 2, 13);
      ctx.fillRect(18, 10, 2, 13);

      ctx.fillStyle = '#38200c';
      ctx.fillRect(3, 16, 18, 3);

      ctx.fillStyle = '#363b45';
      ctx.fillRect(3, 1, 5, 3);
      ctx.fillStyle = '#8c95a6';
      ctx.fillRect(4, 2, 4, 1);
      ctx.fillStyle = '#c99420';
      ctx.fillRect(14, 2, 5, 2);
      ctx.fillStyle = '#f0b835';
      ctx.fillRect(15, 2, 2, 1);
    });

    // 21. FURNACE
    drawTile(`tile_${BlockId.FURNACE}`, (ctx) => {
      ctx.fillStyle = '#383b42';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#545863';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#6b717e';
      ctx.fillRect(2, 2, 9, 4);
      ctx.fillRect(13, 2, 9, 4);
      ctx.fillStyle = '#26282e';
      ctx.fillRect(0, 6, T, 1);
      ctx.fillRect(11, 0, 1, 7);

      ctx.fillStyle = '#141517';
      ctx.fillRect(4, 9, 16, 13);

      ctx.fillStyle = '#b32200';
      ctx.fillRect(6, 13, 12, 8);
      ctx.fillStyle = '#eb4c07';
      ctx.fillRect(7, 14, 10, 6);
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(8, 15, 8, 4);
      ctx.fillStyle = '#ffea59';
      ctx.fillRect(9, 16, 6, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 16, 3, 1);

      ctx.fillStyle = '#1e1f24';
      ctx.fillRect(6, 0, 12, 2);
    });

    // 22. ANVIL
    drawTile(`tile_${BlockId.ANVIL}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#171921';
      ctx.fillRect(3, 18, 18, 5);
      ctx.fillStyle = '#2d3240';
      ctx.fillRect(4, 18, 16, 2);

      ctx.fillStyle = '#222530';
      ctx.fillRect(7, 11, 10, 7);
      ctx.fillStyle = '#383e52';
      ctx.fillRect(9, 11, 6, 7);

      ctx.fillStyle = '#383e52';
      ctx.fillRect(1, 5, 22, 6);
      ctx.fillStyle = '#57607a';
      ctx.fillRect(4, 5, 17, 3);
      ctx.fillStyle = '#9cb0d4';
      ctx.fillRect(5, 5, 15, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(8, 5, 6, 1);

      ctx.fillStyle = '#383e52';
      ctx.fillRect(0, 6, 2, 3);
    });

    // 23. DIAMOND ORE
    drawTile(`tile_${BlockId.DIAMOND_ORE}`, (ctx) => {
      TextureGenerator.drawOrganicOreTexture(ctx, T, {
        socket: '#082e38', base: '#1aaac4', bright: '#44e0f6', hi: '#a5f8ff', glint: '#ffffff'
      });
    });

    // --- ETAP 4: BIOME BLOCKS ---
    // 28. SNOW
    drawTile(`tile_${BlockId.SNOW}`, (ctx) => {
      ctx.fillStyle = '#bed5eb';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#d8e8f7';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#edf5fc';
      ctx.fillRect(0, 1, T, 6);
      ctx.fillRect(0, 9, T, 5);
      ctx.fillRect(0, 16, T, 6);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 1, 9, 3);
      ctx.fillRect(13, 2, 8, 3);
      ctx.fillRect(4, 9, 12, 3);
      ctx.fillRect(1, 16, 10, 3);
      ctx.fillRect(13, 17, 9, 3);

      ctx.fillStyle = '#adcbe6';
      ctx.fillRect(1, 6, 6, 2);
      ctx.fillRect(16, 7, 6, 2);
      ctx.fillRect(8, 14, 6, 2);
      ctx.fillRect(3, 21, 8, 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 3, 1, 1);
      ctx.fillRect(17, 3, 1, 1);
      ctx.fillRect(8, 10, 1, 1);
      ctx.fillRect(15, 18, 1, 1);
    });

    // 29. ICE
    drawTile(`tile_${BlockId.ICE}`, (ctx) => {
      ctx.fillStyle = '#4496ba';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#62badb';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#8ee0f5';
      ctx.fillRect(2, 2, 14, 9);
      ctx.fillRect(9, 11, 13, 10);
      ctx.fillRect(2, 13, 9, 9);

      ctx.fillStyle = '#bdf0fc';
      ctx.fillRect(4, 3, 10, 5);
      ctx.fillRect(11, 12, 9, 5);
      ctx.fillRect(3, 14, 6, 5);

      ctx.fillStyle = '#2c708f';
      for (let i = 0; i < 9; i++) {
        ctx.fillRect(2 + i, 10 - i, 1, 1);
        ctx.fillRect(12 + i, 20 - i, 1, 1);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 3, 5, 1);
      ctx.fillRect(12, 12, 5, 1);
    });

    // 30. SAND
    drawTile(`tile_${BlockId.SAND}`, (ctx) => {
      ctx.fillStyle = '#b38634';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#c7993f';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#dbae4d';
      ctx.fillRect(0, 3, 11, 2);
      ctx.fillRect(11, 4, 13, 2);
      ctx.fillRect(0, 10, 14, 2);
      ctx.fillRect(14, 11, 10, 2);
      ctx.fillRect(0, 17, 9, 2);
      ctx.fillRect(9, 18, 15, 2);

      ctx.fillStyle = '#f0ca6e';
      ctx.fillRect(2, 3, 7, 1);
      ctx.fillRect(13, 4, 8, 1);
      ctx.fillRect(3, 10, 8, 1);
      ctx.fillRect(15, 11, 7, 1);
      ctx.fillRect(2, 17, 5, 1);
      ctx.fillRect(11, 18, 9, 1);

      ctx.fillStyle = '#9e7327';
      ctx.fillRect(1, 5, 8, 1);
      ctx.fillRect(13, 6, 8, 1);
      ctx.fillRect(2, 12, 10, 1);
      ctx.fillRect(12, 20, 9, 1);

      ctx.fillStyle = '#fff4cc';
      ctx.fillRect(5, 3, 1, 1);
      ctx.fillRect(16, 4, 1, 1);
      ctx.fillRect(7, 10, 1, 1);
      ctx.fillRect(18, 11, 1, 1);
      ctx.fillRect(14, 18, 1, 1);
    });

    // 31. SANDSTONE
    drawTile(`tile_${BlockId.SANDSTONE}`, (ctx) => {
      ctx.fillStyle = '#7a501a';
      ctx.fillRect(0, 0, T, T);

      const strata = [
        { y: 1, h: 5, base: '#b5853c', hi: '#cca054', lo: '#946624' },
        { y: 7, h: 4, base: '#8a5c1e', hi: '#a37129', lo: '#6e4712' },
        { y: 12, h: 5, base: '#bd8f44', hi: '#d4aa59', lo: '#996d29' },
        { y: 18, h: 5, base: '#9c6c22', hi: '#b3812f', lo: '#7a5015' }
      ];

      strata.forEach(s => {
        ctx.fillStyle = s.base;
        ctx.fillRect(0, s.y, T, s.h);
        ctx.fillStyle = s.hi;
        ctx.fillRect(0, s.y, T, 1);
        ctx.fillRect(3, s.y + 1, 8, 2);
        ctx.fillRect(14, s.y + 1, 7, 2);
        ctx.fillStyle = s.lo;
        ctx.fillRect(0, s.y + s.h - 1, T, 1);
      });

      ctx.fillStyle = '#52340b';
      ctx.fillRect(8, 1, 1, 5);
      ctx.fillRect(16, 7, 1, 4);
      ctx.fillRect(6, 12, 1, 5);
      ctx.fillRect(17, 18, 1, 5);
    });

    // 32. DARK GRASS
    drawTile(`tile_${BlockId.DARK_GRASS}`, (ctx) => {
      ctx.fillStyle = '#261c2e';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#392a45';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#1c1029';
      ctx.fillRect(0, 0, T, 6);
      ctx.fillStyle = '#321d47';
      ctx.fillRect(0, 0, T, 4);
      ctx.fillStyle = '#542f78';
      ctx.fillRect(2, 1, 6, 2);
      ctx.fillRect(11, 1, 7, 2);
      ctx.fillStyle = '#7843ab';
      ctx.fillRect(3, 1, 3, 1);
      ctx.fillRect(13, 1, 3, 1);

      ctx.fillStyle = '#321d47';
      ctx.fillRect(2, 4, 2, 4);
      ctx.fillRect(6, 4, 3, 5);
      ctx.fillRect(12, 4, 2, 4);
      ctx.fillRect(17, 4, 3, 5);
      ctx.fillStyle = '#542f78';
      ctx.fillRect(3, 4, 1, 2);
      ctx.fillRect(7, 4, 1, 3);
      ctx.fillRect(18, 4, 1, 3);
    });

    // 33. DARK DIRT
    drawTile(`tile_${BlockId.DARK_DIRT}`, (ctx) => {
      ctx.fillStyle = '#291e30';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#3a2d45';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#4c3a59';
      ctx.fillRect(3, 3, 7, 6);
      ctx.fillRect(13, 8, 8, 7);
      ctx.fillRect(4, 14, 8, 6);

      ctx.fillStyle = '#634b75';
      ctx.fillRect(5, 5, 4, 2);
      ctx.fillRect(15, 10, 4, 2);
      ctx.fillStyle = '#1b1421';
      ctx.fillRect(8, 6, 2, 2);
      ctx.fillRect(14, 17, 2, 2);
    });
    // 34. DARK WOOD
    drawTile(`tile_${BlockId.DARK_WOOD}`, (ctx) => {
      ctx.fillStyle = '#1e1424';
      ctx.fillRect(5, 0, 1, T); ctx.fillRect(18, 0, 1, T);
      ctx.fillStyle = '#32233b';
      ctx.fillRect(6, 0, 1, T); ctx.fillRect(17, 0, 1, T);
      ctx.fillStyle = '#483454';
      ctx.fillRect(7, 0, 10, T);
      // Pale purple bark grain
      ctx.fillStyle = '#32233b'; ctx.fillRect(8, 0, 1, T); ctx.fillRect(13, 0, 1, T);
      ctx.fillStyle = '#654b75'; ctx.fillRect(10, 0, 1, T); ctx.fillRect(15, 0, 1, T);
    });

    // 35. DARK LEAVES
    drawTile(`tile_${BlockId.DARK_LEAVES}`, (ctx) => {
      ctx.fillStyle = '#170e24';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#2a1a40';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#3f2861';
      ctx.fillRect(3, 3, 8, 7);
      ctx.fillRect(13, 8, 8, 7);
      ctx.fillStyle = '#634096';
      ctx.fillRect(4, 4, 4, 3);
      ctx.fillRect(15, 9, 4, 3);
    });

    // 36. MOSSY STONE
    drawTile(`tile_${BlockId.MOSSY_STONE}`, (ctx) => {
      TextureGenerator.drawStoneTexture(ctx, T);

      const moss = [
        { x: 1, y: 1, w: 9, h: 4 },
        { x: 3, y: 4, w: 6, h: 2 },
        { x: 13, y: 2, w: 8, h: 4 },
        { x: 5, y: 8, w: 9, h: 3 },
        { x: 12, y: 12, w: 10, h: 5 },
        { x: 2, y: 16, w: 7, h: 4 }
      ];

      moss.forEach(m => {
        ctx.fillStyle = '#143818';
        ctx.fillRect(m.x - 1, m.y - 1, m.w + 2, m.h + 2);
        ctx.fillStyle = '#23612b';
        ctx.fillRect(m.x, m.y, m.w, m.h);
        ctx.fillStyle = '#368c40';
        ctx.fillRect(m.x + 1, m.y + 1, Math.max(1, m.w - 1), Math.max(1, m.h - 1));
        ctx.fillStyle = '#54b860';
        ctx.fillRect(m.x + 1, m.y + 1, Math.max(1, m.w - 2), 2);
        ctx.fillStyle = '#82e690';
        ctx.fillRect(m.x + 2, m.y + 1, 1, 1);
      });
    });
    // 37. CACTUS
    drawTile(`tile_${BlockId.CACTUS}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      // Main ribbed stem (width 12px)
      ctx.fillStyle = '#2c4718';
      ctx.fillRect(6, 0, 12, T);
      ctx.fillStyle = '#4f7a2d';
      ctx.fillRect(7, 0, 10, T);
      // Ribs
      ctx.fillStyle = '#639639';
      ctx.fillRect(8, 0, 2, T);
      ctx.fillRect(12, 0, 2, T);
      ctx.fillRect(15, 0, 1, T);
      // Needles
      ctx.fillStyle = '#1c300f';
      ctx.fillRect(4, 4, 2, 1);
      ctx.fillRect(18, 8, 2, 1);
      ctx.fillRect(4, 14, 2, 1);
      ctx.fillRect(18, 18, 2, 1);
    });

    // 38. CRYSTAL BLOCK
    drawTile(`tile_${BlockId.CRYSTAL_BLOCK}`, (ctx) => {
      ctx.fillStyle = '#24083b';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#3b0d5e';
      ctx.fillRect(1, 1, T - 2, T - 2);

      // Gemstone facet planes
      ctx.fillStyle = '#63189e';
      ctx.fillRect(3, 3, 11, 11);
      ctx.fillStyle = '#8c24de';
      ctx.fillRect(4, 4, 9, 9);
      ctx.fillStyle = '#b747fa';
      ctx.fillRect(5, 5, 7, 7);
      ctx.fillStyle = '#db82ff';
      ctx.fillRect(6, 6, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 7, 2, 2);

      ctx.fillStyle = '#541287';
      ctx.fillRect(14, 2, 8, 8);
      ctx.fillStyle = '#781ec2';
      ctx.fillRect(15, 3, 6, 6);
      ctx.fillStyle = '#a633fa';
      ctx.fillRect(16, 4, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 4, 2, 1);

      ctx.fillStyle = '#480f73';
      ctx.fillRect(13, 13, 9, 9);
      ctx.fillStyle = '#6b18ad';
      ctx.fillRect(14, 14, 7, 7);
      ctx.fillStyle = '#9b2bf0';
      ctx.fillRect(15, 15, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, 15, 2, 1);

      ctx.fillStyle = '#501180';
      ctx.fillRect(2, 14, 8, 8);
      ctx.fillStyle = '#731bb8';
      ctx.fillRect(3, 15, 6, 6);
      ctx.fillStyle = '#9e29f5';
      ctx.fillRect(4, 16, 4, 4);

      ctx.fillStyle = '#160424';
      ctx.fillRect(14, 0, 1, T);
      ctx.fillRect(0, 14, T, 1);
    });

    // 39. CRYSTAL WALL
    drawTile(`tile_${BlockId.CRYSTAL_WALL}`, (ctx) => {
      ctx.fillStyle = '#1b0729';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#2c0c42';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#421463';
      ctx.fillRect(3, 3, 7, 7);
      ctx.fillRect(13, 11, 7, 7);
      ctx.fillStyle = '#9b38e8';
      ctx.fillRect(6, 6, 2, 2);
      ctx.fillRect(16, 14, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 6, 1, 1);
    });

    // 40. HELLSTONE
    drawTile(`tile_${BlockId.HELLSTONE}`, (ctx) => {
      ctx.fillStyle = '#1c0503';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#310b06';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#471009';
      ctx.fillRect(2, 2, 14, 8);
      ctx.fillRect(7, 10, 15, 11);

      const magmaSegments = [
        { x: 1, y: 7, w: 7, h: 2 },
        { x: 7, y: 5, w: 2, h: 6 },
        { x: 8, y: 10, w: 6, h: 2 },
        { x: 13, y: 8, w: 2, h: 5 },
        { x: 14, y: 8, w: 8, h: 2 },
        { x: 10, y: 12, w: 3, h: 6 },
        { x: 12, y: 17, w: 9, h: 2 },
        { x: 4, y: 15, w: 7, h: 2 }
      ];

      ctx.fillStyle = '#8f1701';
      magmaSegments.forEach(m => ctx.fillRect(m.x - 1, m.y - 1, m.w + 2, m.h + 2));
      ctx.fillStyle = '#db3509';
      magmaSegments.forEach(m => ctx.fillRect(m.x, m.y, m.w, m.h));
      ctx.fillStyle = '#ff7512';
      magmaSegments.forEach(m => ctx.fillRect(m.x, m.y, Math.max(1, m.w - 1), Math.max(1, m.h - 1)));
      ctx.fillStyle = '#ffca29';
      ctx.fillRect(7, 5, 2, 2);
      ctx.fillRect(13, 8, 2, 2);
      ctx.fillRect(10, 12, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 5, 1, 1);
      ctx.fillRect(13, 8, 1, 1);
    });

    // 41. ASH BLOCK
    drawTile(`tile_${BlockId.ASH_BLOCK}`, (ctx) => {
      ctx.fillStyle = '#171517';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#262426';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#383538';
      ctx.fillRect(2, 2, 14, 6);
      ctx.fillRect(7, 9, 15, 10);
      ctx.fillRect(2, 13, 8, 9);

      ctx.fillStyle = '#4a464a';
      ctx.fillRect(4, 3, 9, 3);
      ctx.fillRect(10, 11, 9, 4);

      ctx.fillStyle = '#e62e00';
      ctx.fillRect(7, 6, 2, 2);
      ctx.fillRect(16, 11, 2, 2);
      ctx.fillRect(5, 17, 2, 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(7, 6, 1, 1);
      ctx.fillRect(16, 11, 1, 1);
    });

    // 42. LAVA ROCK
    drawTile(`tile_${BlockId.LAVA_ROCK}`, (ctx) => {
      ctx.fillStyle = '#9e1800';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#db3707';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#ff7300';
      ctx.fillRect(2, 2, T - 4, T - 4);
      ctx.fillStyle = '#ffc414';
      for (let i = 0; i < 16; i++) {
        ctx.fillRect(4 + i, 3 + i, 4, 4);
      }
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 10; i++) {
        ctx.fillRect(7 + i, 6 + i, 2, 2);
      }

      ctx.fillStyle = '#140f13';
      ctx.fillRect(0, 0, 7, 16);
      ctx.fillRect(7, 0, 8, 8);
      ctx.fillRect(0, 16, 4, 8);
      ctx.fillStyle = '#261b24';
      ctx.fillRect(1, 1, 5, 13);
      ctx.fillRect(6, 1, 7, 6);
      ctx.fillStyle = '#3d2b3a';
      ctx.fillRect(2, 2, 3, 10);
      ctx.fillRect(5, 2, 6, 4);

      ctx.fillStyle = '#140f13';
      ctx.fillRect(15, 8, 9, 16);
      ctx.fillRect(9, 16, 7, 8);
      ctx.fillRect(17, 3, 7, 5);
      ctx.fillStyle = '#261b24';
      ctx.fillRect(16, 9, 7, 14);
      ctx.fillRect(10, 17, 6, 6);
      ctx.fillStyle = '#3d2b3a';
      ctx.fillRect(17, 10, 5, 11);
      ctx.fillRect(11, 18, 4, 4);
    });

    // 43. VOID STONE
    drawTile(`tile_${BlockId.VOID_STONE}`, (ctx) => {
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#0d091a';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#1e1136';
      ctx.fillRect(2, 2, 14, 8);
      ctx.fillRect(8, 10, 14, 11);

      ctx.fillStyle = '#331b5c';
      ctx.fillRect(4, 4, 9, 4);
      ctx.fillRect(11, 12, 9, 5);

      ctx.fillStyle = '#a83af5';
      ctx.fillRect(6, 5, 1, 1);
      ctx.fillRect(16, 13, 1, 1);
      ctx.fillRect(9, 18, 1, 1);
      ctx.fillStyle = '#ff66ff';
      ctx.fillRect(15, 4, 1, 1);
      ctx.fillRect(4, 14, 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 6, 1, 1);
      ctx.fillRect(7, 12, 1, 1);
    });

    // 44. VOID CRYSTAL
    drawTile(`tile_${BlockId.VOID_CRYSTAL}`, (ctx) => {
      ctx.fillStyle = '#120221';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#24053d';
      ctx.fillRect(1, 1, T - 2, T - 2);

      ctx.fillStyle = '#540f85';
      ctx.fillRect(3, 3, 11, 11);
      ctx.fillStyle = '#7d19c7';
      ctx.fillRect(4, 4, 9, 9);
      ctx.fillStyle = '#ad2bf0';
      ctx.fillRect(5, 5, 7, 7);
      ctx.fillStyle = '#d96eff';
      ctx.fillRect(6, 6, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 7, 2, 2);

      ctx.fillStyle = '#480d73';
      ctx.fillRect(14, 2, 8, 8);
      ctx.fillStyle = '#6b16a3';
      ctx.fillRect(15, 3, 6, 6);
      ctx.fillStyle = '#9b24ed';
      ctx.fillRect(16, 4, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 4, 2, 1);

      ctx.fillStyle = '#3d0a61';
      ctx.fillRect(13, 13, 9, 9);
      ctx.fillStyle = '#5e1294';
      ctx.fillRect(14, 14, 7, 7);
      ctx.fillStyle = '#8f1fe3';
      ctx.fillRect(15, 15, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, 15, 2, 1);

      ctx.fillStyle = '#420b69';
      ctx.fillRect(2, 14, 8, 8);
      ctx.fillStyle = '#63139c';
      ctx.fillRect(3, 15, 6, 6);
      ctx.fillStyle = '#8f1fe3';
      ctx.fillRect(4, 16, 4, 4);
    });

    // 45. CHEST (Interactive ancient chest)
    drawTile(`tile_${BlockId.CHEST}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(2, 6, 20, 16);
      ctx.fillStyle = '#6e411b';
      ctx.fillRect(3, 7, 18, 14);
      ctx.fillStyle = '#875122';
      ctx.fillRect(3, 8, 18, 3);
      ctx.fillStyle = '#875122';
      ctx.fillRect(3, 14, 18, 3);

      ctx.fillStyle = '#26150a';
      ctx.fillRect(3, 11, 18, 2);

      ctx.fillStyle = '#333842';
      ctx.fillRect(3, 7, 3, 14);
      ctx.fillRect(18, 7, 3, 14);
      ctx.fillStyle = '#545c6e';
      ctx.fillRect(4, 7, 1, 14);
      ctx.fillRect(19, 7, 1, 14);
      ctx.fillStyle = '#8a94a6';
      ctx.fillRect(4, 8, 1, 1);
      ctx.fillRect(4, 18, 1, 1);
      ctx.fillRect(19, 8, 1, 1);
      ctx.fillRect(19, 18, 1, 1);

      ctx.fillStyle = '#8f6815';
      ctx.fillRect(10, 10, 4, 6);
      ctx.fillStyle = '#f5c838';
      ctx.fillRect(11, 11, 2, 4);
      ctx.fillStyle = '#140f06';
      ctx.fillRect(11, 13, 2, 1);
    });
    // 46. PALM WOOD (Segmented warm tropical palm trunk)
    drawTile(`tile_${BlockId.PALM_WOOD}`, (ctx) => {
      // Slender palm trunk (width 12px from x=6 to x=17 in 24px tile)
      ctx.fillStyle = '#4d3215'; // Dark outer bark crevices
      ctx.fillRect(6, 0, 1, T); ctx.fillRect(17, 0, 1, T);
      ctx.fillStyle = '#825828'; // Deep bark tone
      ctx.fillRect(7, 0, 1, T); ctx.fillRect(16, 0, 1, T);
      ctx.fillStyle = '#bf914f'; // Warm golden-tan base palm wood
      ctx.fillRect(8, 0, 8, T);
      // Sunlit vertical highlights
      ctx.fillStyle = '#deb26e'; ctx.fillRect(10, 0, 3, T);
      ctx.fillStyle = '#f5dc9a'; ctx.fillRect(11, 0, 1, T);
      // Characteristic horizontal palm ring grooves (rings every 6px)
      for (let ry = 4; ry < T; ry += 6) {
        ctx.fillStyle = '#4d3215'; ctx.fillRect(6, ry, 12, 1);
        ctx.fillStyle = '#f5dc9a'; ctx.fillRect(8, ry + 1, 8, 1);
      }
    });
  }

  private static createTilesetTexture(scene: Phaser.Scene, T: number): void {
    const TOTAL_TILES = 64;
    const canvas = scene.textures.createCanvas('world_tileset', TOTAL_TILES * T, T);
    if (!canvas) return;
    const ctx = canvas.context;
    ctx.imageSmoothingEnabled = false;

    // Tile 0 is transparent (Air)
    // Copy each tile_X texture into corresponding slot
    for (let id = 1; id < TOTAL_TILES; id++) {
      const tileKey = `tile_${id}`;
      if (scene.textures.exists(tileKey)) {
        const srcCanvas = (scene.textures.get(tileKey).getSourceImage() as unknown) as CanvasImageSource;
        if (srcCanvas) {
          ctx.drawImage(srcCanvas, id * T, 0, T, T);
        }
      }
    }
    canvas.refresh();
  }

  private static createCrackTextures(scene: Phaser.Scene, T: number): void {
    const crackStages = [
      // 0: 25% damage
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(6, 4); ctx.lineTo(11, 11); ctx.lineTo(9, 17);
        ctx.stroke();
      },
      // 1: 50% damage
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(6, 4); ctx.lineTo(11, 11); ctx.lineTo(9, 17);
        ctx.moveTo(11, 11); ctx.lineTo(18, 9); ctx.lineTo(21, 15);
        ctx.stroke();
      },
      // 2: 75% damage
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, 4); ctx.lineTo(11, 11); ctx.lineTo(9, 17);
        ctx.moveTo(11, 11); ctx.lineTo(18, 9); ctx.lineTo(21, 15);
        ctx.moveTo(11, 11); ctx.lineTo(13, 21);
        ctx.moveTo(4, 15); ctx.lineTo(9, 17);
        ctx.stroke();
      },
      // 3: 95% damage
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, 3); ctx.lineTo(11, 11); ctx.lineTo(8, 22);
        ctx.moveTo(11, 11); ctx.lineTo(20, 8); ctx.lineTo(22, 18);
        ctx.moveTo(11, 11); ctx.lineTo(15, 22);
        ctx.moveTo(2, 14); ctx.lineTo(8, 22);
        ctx.moveTo(18, 2); ctx.lineTo(20, 8);
        ctx.stroke();
      }
    ];

    crackStages.forEach((fn, idx) => {
      const key = `crack_${idx}`;
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, T, T);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;
      fn(ctx);
      canvas.refresh();
    });
  }

  private static createPlayerTextures(scene: Phaser.Scene): void {
    const W = 24;
    const H = 40;

    // Helper to draw player frame
    const drawPlayer = (key: string, legOffset: number, armAngle: number) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, W, H);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;

      // 1. Cape / Back scarf
      ctx.fillStyle = '#611b2b';
      ctx.fillRect(5, 12, 5, 16);
      ctx.fillStyle = '#8f2940';
      ctx.fillRect(6, 13, 3, 14);

      // 2. Head & Helmet (Astral explorer cowl)
      ctx.fillStyle = '#1f293d';
      ctx.fillRect(6, 3, 12, 10);
      ctx.fillStyle = '#2f3e5c';
      ctx.fillRect(7, 4, 10, 8);
      // Visor (Glowing cyan)
      ctx.fillStyle = '#38e1ff';
      ctx.fillRect(12, 6, 6, 3);
      ctx.fillStyle = '#d2f9ff';
      ctx.fillRect(14, 7, 3, 1);

      // 3. Torso / Armor tunic
      ctx.fillStyle = '#28334a';
      ctx.fillRect(6, 13, 12, 14);
      ctx.fillStyle = '#3a4b6e';
      ctx.fillRect(7, 14, 10, 11);
      // Gold chest emblem
      ctx.fillStyle = '#e8b838';
      ctx.fillRect(11, 17, 3, 4);

      // 4. Belt & Pouch
      ctx.fillStyle = '#54361e';
      ctx.fillRect(6, 26, 12, 3);
      ctx.fillStyle = '#c79632';
      ctx.fillRect(10, 26, 4, 3);

      // 5. Legs & Boots (animated with legOffset)
      // Left leg
      ctx.fillStyle = '#1b2233';
      ctx.fillRect(7, 29, 4, 7 - legOffset);
      ctx.fillStyle = '#3d2b1b'; // boot
      ctx.fillRect(6, 35 - legOffset, 5, 5);

      // Right leg
      ctx.fillStyle = '#141a26';
      ctx.fillRect(13, 29, 4, 7 + legOffset);
      ctx.fillStyle = '#2b1f13'; // boot
      ctx.fillRect(13, 35 + legOffset, 5, 5);

      // 6. Arm / Shoulder
      ctx.save();
      ctx.translate(11, 16);
      ctx.rotate((armAngle * Math.PI) / 180);
      ctx.fillStyle = '#2f3e5c';
      ctx.fillRect(-2, 0, 4, 10);
      ctx.fillStyle = '#6e4527'; // glove
      ctx.fillRect(-2, 8, 4, 4);
      ctx.restore();

      canvas.refresh();
    };

    drawPlayer('player_idle', 0, 0);
    drawPlayer('player_walk_0', -2, 15);
    drawPlayer('player_walk_1', 0, 0);
    drawPlayer('player_walk_2', 2, -15);
    drawPlayer('player_walk_3', 0, 0);
    drawPlayer('player_jump', -3, -35);
  }

  private static createItemIcons(scene: Phaser.Scene): void {
    const S = 24;

    const drawIcon = (key: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, S, S);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx);
      canvas.refresh();
    };

    // Pickaxe Icon
    drawIcon('icon_pickaxe', (ctx) => {
      // Handle
      ctx.strokeStyle = '#6e4527';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(4, 20); ctx.lineTo(17, 7);
      ctx.stroke();
      // Copper Pickaxe Head
      ctx.fillStyle = '#d97441';
      ctx.beginPath();
      ctx.moveTo(11, 3);
      ctx.lineTo(21, 5);
      ctx.lineTo(20, 15);
      ctx.lineTo(16, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f59a67';
      ctx.fillRect(17, 6, 3, 2);
    });

    // Sword Icon
    drawIcon('icon_sword', (ctx) => {
      // Handle & pommel
      ctx.fillStyle = '#e8b838';
      ctx.fillRect(3, 20, 4, 4);
      ctx.fillStyle = '#6e4527';
      ctx.fillRect(5, 17, 3, 4);
      // Guard
      ctx.fillStyle = '#e8b838';
      ctx.fillRect(4, 15, 8, 3);
      // Copper blade
      ctx.fillStyle = '#d97441';
      ctx.beginPath();
      ctx.moveTo(7, 15);
      ctx.lineTo(19, 3);
      ctx.lineTo(21, 4);
      ctx.lineTo(9, 16);
      ctx.closePath();
      ctx.fill();
      // Edge shine
      ctx.fillStyle = '#f59a67';
      ctx.fillRect(15, 6, 2, 2);
    });

    // Torch Icon
    drawIcon('icon_torch', (ctx) => {
      ctx.fillStyle = '#614324';
      ctx.fillRect(10, 8, 4, 14);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(9, 4, 6, 5);
      ctx.fillStyle = '#ffff66';
      ctx.fillRect(11, 2, 2, 4);
    });

    // Ore / Block Icons
    drawIcon('icon_grass_block', (ctx) => {
      const tileGrass = scene.textures.exists(`tile_${BlockId.GRASS}`) ? scene.textures.get(`tile_${BlockId.GRASS}`) : null;
      if (tileGrass) {
        const src = tileGrass.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
      this.decodePixelData(ctx, S, S, GRASS_24_RGBA);
    });

    drawIcon('icon_dirt', (ctx) => {
      const tileDirt = scene.textures.exists(`tile_${BlockId.DIRT}`) ? scene.textures.get(`tile_${BlockId.DIRT}`) : null;
      if (tileDirt) {
        const src = tileDirt.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
      this.decodePixelData(ctx, 16, 16, DIRT_16_RGBA, 4, 4);
    });

    drawIcon('icon_stone', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.STONE}`) ? scene.textures.get(`tile_${BlockId.STONE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_wood', (ctx) => {
      ctx.fillStyle = '#855331'; ctx.fillRect(3, 5, 18, 14);
      ctx.fillStyle = '#b3774c'; ctx.fillRect(4, 6, 14, 2);
      ctx.fillStyle = '#54321c'; ctx.fillRect(3, 5, 1, 14); ctx.fillRect(20, 5, 1, 14);
      ctx.fillStyle = '#382012'; ctx.fillRect(2, 5, 1, 14); ctx.fillRect(21, 5, 1, 14);
      // Log end grain
      ctx.fillStyle = '#d69e70'; ctx.fillRect(16, 7, 4, 10);
      ctx.fillStyle = '#855331'; ctx.fillRect(17, 8, 2, 8);
      ctx.fillStyle = '#382012'; ctx.fillRect(18, 11, 1, 2);
    });

    drawIcon('icon_plank', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.PLANK}`) ? scene.textures.get(`tile_${BlockId.PLANK}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_brick', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.BRICK}`) ? scene.textures.get(`tile_${BlockId.BRICK}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_glass', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.GLASS}`) ? scene.textures.get(`tile_${BlockId.GLASS}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_copper_ore', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.COPPER_ORE}`) ? scene.textures.get(`tile_${BlockId.COPPER_ORE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_iron_ore', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.IRON_ORE}`) ? scene.textures.get(`tile_${BlockId.IRON_ORE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_coal', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.COAL_ORE}`) ? scene.textures.get(`tile_${BlockId.COAL_ORE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_gold_ore', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.GOLD_ORE}`) ? scene.textures.get(`tile_${BlockId.GOLD_ORE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_crystal', (ctx) => {
      ctx.fillStyle = '#aa44f0'; ctx.beginPath();
      ctx.moveTo(12, 3); ctx.lineTo(19, 10); ctx.lineTo(16, 20); ctx.lineTo(8, 20); ctx.lineTo(5, 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e294ff'; ctx.fillRect(10, 6, 4, 7);
    });

    drawIcon('icon_obsidian', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.OBSIDIAN}`) ? scene.textures.get(`tile_${BlockId.OBSIDIAN}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_diamond_ore', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.DIAMOND_ORE}`) ? scene.textures.get(`tile_${BlockId.DIAMOND_ORE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_diamond', (ctx) => {
      ctx.fillStyle = '#0284c7'; ctx.beginPath();
      ctx.moveTo(12, 3); ctx.lineTo(20, 9); ctx.lineTo(12, 21); ctx.lineTo(4, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath();
      ctx.moveTo(12, 5); ctx.lineTo(18, 9); ctx.lineTo(12, 19); ctx.lineTo(6, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#bae6fd'; ctx.beginPath();
      ctx.moveTo(12, 5); ctx.lineTo(16, 9); ctx.lineTo(12, 12); ctx.lineTo(8, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(11, 6, 2, 2);
    });

    drawIcon('icon_sapling', (ctx) => {
      drawTreeSapling(ctx, S);
    });

    // --- NEW ETAP 2 ICONS ---
    // Stations
    drawIcon('icon_workbench', (ctx) => {
      ctx.fillStyle = '#85582f'; ctx.fillRect(2, 6, 20, 6);
      ctx.fillStyle = '#a16d3b'; ctx.fillRect(3, 6, 18, 2);
      ctx.fillStyle = '#54361c'; ctx.fillRect(4, 12, 4, 10); ctx.fillRect(16, 12, 4, 10);
      ctx.fillStyle = '#7a808c'; ctx.fillRect(5, 3, 4, 3);
    });

    drawIcon('icon_furnace', (ctx) => {
      ctx.fillStyle = '#4a4d52'; ctx.fillRect(3, 3, 18, 18);
      ctx.fillStyle = '#737982'; ctx.fillRect(4, 4, 16, 2);
      ctx.fillStyle = '#17191c'; ctx.fillRect(7, 10, 10, 9);
      ctx.fillStyle = '#ff5500'; ctx.fillRect(8, 13, 8, 5);
      ctx.fillStyle = '#ffff55'; ctx.fillRect(10, 15, 4, 2);
    });

    drawIcon('icon_anvil', (ctx) => {
      ctx.fillStyle = '#2b2e38'; ctx.fillRect(5, 17, 14, 5);
      ctx.fillStyle = '#3a3f4d'; ctx.fillRect(8, 11, 8, 6);
      ctx.fillStyle = '#5a6275'; ctx.fillRect(3, 6, 18, 5);
      ctx.fillStyle = '#7b859e'; ctx.fillRect(5, 6, 15, 2);
    });

    // Ingots / Bars
    drawIcon('icon_copper_bar', (ctx) => {
      ctx.fillStyle = '#9e431e'; ctx.fillRect(4, 8, 16, 9);
      ctx.fillStyle = '#d97441'; ctx.fillRect(5, 9, 14, 6);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(6, 9, 12, 2);
    });

    drawIcon('icon_iron_bar', (ctx) => {
      ctx.fillStyle = '#555b66'; ctx.fillRect(4, 8, 16, 9);
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(5, 9, 14, 6);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(6, 9, 12, 2);
    });

    drawIcon('icon_gold_bar', (ctx) => {
      ctx.fillStyle = '#b08419'; ctx.fillRect(4, 8, 16, 9);
      ctx.fillStyle = '#f5c838'; ctx.fillRect(5, 9, 14, 6);
      ctx.fillStyle = '#fff08a'; ctx.fillRect(6, 9, 12, 2);
    });

    // Advanced Tools
    drawIcon('icon_iron_pickaxe', (ctx) => {
      ctx.strokeStyle = '#6e4527'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#8c94a3'; ctx.beginPath();
      ctx.moveTo(11, 3); ctx.lineTo(21, 5); ctx.lineTo(20, 15); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(17, 6, 3, 2);
    });

    drawIcon('icon_gold_pickaxe', (ctx) => {
      ctx.strokeStyle = '#6e4527'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#f5c838'; ctx.beginPath();
      ctx.moveTo(11, 3); ctx.lineTo(21, 5); ctx.lineTo(20, 15); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff08a'; ctx.fillRect(17, 6, 3, 2);
    });

    drawIcon('icon_astral_pickaxe', (ctx) => {
      ctx.strokeStyle = '#4a2569'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#aa44f0'; ctx.beginPath();
      ctx.moveTo(11, 3); ctx.lineTo(21, 5); ctx.lineTo(20, 15); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e294ff'; ctx.fillRect(17, 6, 3, 2);
    });

    drawIcon('icon_diamond_pickaxe', (ctx) => {
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#0284c7'; ctx.beginPath();
      ctx.moveTo(11, 3); ctx.lineTo(21, 5); ctx.lineTo(20, 15); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(14, 5, 5, 5);
      ctx.fillStyle = '#bae6fd'; ctx.fillRect(17, 6, 3, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(18, 6, 1, 1);
    });

    // Weapons
    drawIcon('icon_stone_sword', (ctx) => {
      ctx.fillStyle = '#54361c'; ctx.fillRect(4, 18, 4, 4);
      ctx.fillStyle = '#737982'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(19, 3); ctx.lineTo(21, 4); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
    });

    drawIcon('icon_iron_sword', (ctx) => {
      ctx.fillStyle = '#e8b838'; ctx.fillRect(3, 20, 4, 4);
      ctx.fillStyle = '#6e4527'; ctx.fillRect(5, 17, 3, 4);
      ctx.fillStyle = '#e8b838'; ctx.fillRect(4, 15, 8, 3);
      ctx.fillStyle = '#a6b0c2'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(19, 3); ctx.lineTo(21, 4); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(15, 6, 2, 2);
    });

    drawIcon('icon_dagger', (ctx) => {
      ctx.fillStyle = '#e8b838'; ctx.fillRect(5, 17, 3, 3);
      ctx.fillStyle = '#a6b0c2'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(17, 5); ctx.lineTo(19, 6); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
    });

    drawIcon('icon_spear', (ctx) => {
      ctx.strokeStyle = '#6e4527'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(3, 21); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#a6b0c2'; ctx.beginPath();
      ctx.moveTo(16, 8); ctx.lineTo(22, 2); ctx.lineTo(19, 11); ctx.closePath(); ctx.fill();
    });

    drawIcon('icon_bow', (ctx) => {
      ctx.strokeStyle = '#85582f'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(12, 12, 9, 0.7 * Math.PI, 1.8 * Math.PI); ctx.stroke();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(6, 19); ctx.lineTo(19, 6); ctx.stroke();
    });

    drawIcon('icon_staff', (ctx) => {
      ctx.strokeStyle = '#54361c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(19, 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(18, 4, 2, 2);
    });

    drawIcon('icon_astral_blade', (ctx) => {
      ctx.fillStyle = '#29173d'; ctx.fillRect(3, 20, 4, 4);
      ctx.fillStyle = '#8542c2'; ctx.fillRect(4, 15, 8, 3);
      ctx.fillStyle = '#aa44f0'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(19, 3); ctx.lineTo(21, 4); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e294ff'; ctx.fillRect(14, 6, 3, 2);
    });

    drawIcon('icon_diamond_sword', (ctx) => {
      ctx.fillStyle = '#334155'; ctx.fillRect(3, 20, 4, 4);
      ctx.fillStyle = '#64748b'; ctx.fillRect(5, 17, 3, 4);
      ctx.fillStyle = '#0284c7'; ctx.fillRect(4, 15, 8, 3);
      ctx.fillStyle = '#38bdf8'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(19, 3); ctx.lineTo(21, 4); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#bae6fd'; ctx.fillRect(14, 6, 4, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(16, 5, 2, 2);
    });

    // Armor Sets
    drawIcon('icon_copper_helmet', (ctx) => {
      ctx.fillStyle = '#d97441'; ctx.fillRect(5, 6, 14, 12);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(6, 6, 12, 3);
      ctx.fillStyle = '#222'; ctx.fillRect(8, 12, 8, 3);
    });

    drawIcon('icon_copper_chestplate', (ctx) => {
      ctx.fillStyle = '#d97441'; ctx.fillRect(5, 5, 14, 14);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(8, 6, 8, 4);
      ctx.fillStyle = '#9e431e'; ctx.fillRect(5, 10, 2, 8); ctx.fillRect(17, 10, 2, 8);
    });

    drawIcon('icon_copper_leggings', (ctx) => {
      ctx.fillStyle = '#d97441'; ctx.fillRect(6, 5, 12, 14);
      ctx.clearRect(11, 10, 2, 9);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(7, 6, 10, 3);
    });

    drawIcon('icon_copper_boots', (ctx) => {
      ctx.fillStyle = '#d97441'; ctx.fillRect(4, 10, 6, 10); ctx.fillRect(14, 10, 6, 10);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(4, 10, 6, 3); ctx.fillRect(14, 10, 6, 3);
    });

    drawIcon('icon_iron_helmet', (ctx) => {
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(5, 6, 14, 12);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(6, 6, 12, 3);
      ctx.fillStyle = '#111'; ctx.fillRect(7, 11, 10, 3);
    });

    drawIcon('icon_iron_chestplate', (ctx) => {
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(5, 5, 14, 14);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(8, 6, 8, 4);
      ctx.fillStyle = '#555b66'; ctx.fillRect(5, 10, 2, 8); ctx.fillRect(17, 10, 2, 8);
    });

    drawIcon('icon_iron_leggings', (ctx) => {
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(6, 5, 12, 14);
      ctx.clearRect(11, 10, 2, 9);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(7, 6, 10, 3);
    });

    drawIcon('icon_iron_boots', (ctx) => {
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(4, 10, 6, 10); ctx.fillRect(14, 10, 6, 10);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(4, 10, 6, 3); ctx.fillRect(14, 10, 6, 3);
    });

    drawIcon('icon_diamond_chestplate', (ctx) => {
      ctx.fillStyle = '#0284c7'; ctx.fillRect(5, 5, 14, 14);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(6, 6, 12, 12);
      ctx.fillStyle = '#bae6fd'; ctx.fillRect(8, 6, 8, 4);
      ctx.fillStyle = '#0369a1'; ctx.fillRect(5, 10, 2, 8); ctx.fillRect(17, 10, 2, 8);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(9, 7, 2, 2);
    });

    // Accessories
    drawIcon('icon_ring', (ctx) => {
      ctx.strokeStyle = '#f5c838'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(12, 13, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#22c55e'; ctx.fillRect(10, 5, 4, 4);
    });

    drawIcon('icon_diamond_ring', (ctx) => {
      ctx.strokeStyle = '#f5c838'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(12, 13, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(10, 4, 4, 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(11, 4, 2, 2);
    });

    drawIcon('icon_amulet', (ctx) => {
      ctx.strokeStyle = '#f5c838'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(12, 9, 6, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath();
      ctx.moveTo(12, 14); ctx.lineTo(16, 19); ctx.lineTo(12, 23); ctx.lineTo(8, 19); ctx.closePath(); ctx.fill();
    });

    drawIcon('icon_boots_wings', (ctx) => {
      ctx.fillStyle = '#4ade80'; ctx.fillRect(6, 11, 6, 9); ctx.fillRect(13, 11, 6, 9);
      ctx.fillStyle = '#ffffff'; // Wings
      ctx.beginPath(); ctx.moveTo(4, 14); ctx.lineTo(1, 9); ctx.lineTo(5, 11); ctx.fill();
      ctx.beginPath(); ctx.moveTo(20, 14); ctx.lineTo(23, 9); ctx.lineTo(19, 11); ctx.fill();
    });

    drawIcon('icon_talisman', (ctx) => {
      ctx.fillStyle = '#b08419'; ctx.fillRect(6, 6, 12, 12);
      ctx.fillStyle = '#d97441'; ctx.fillRect(8, 8, 8, 8);
      ctx.fillStyle = '#fff08a'; ctx.fillRect(11, 11, 2, 2);
    });

    drawIcon('icon_cloak', (ctx) => {
      ctx.fillStyle = '#581c87'; ctx.beginPath();
      ctx.moveTo(8, 4); ctx.lineTo(16, 4); ctx.lineTo(20, 21); ctx.lineTo(4, 21); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a855f7'; ctx.fillRect(10, 5, 4, 15);
    });

    // Potions
    drawIcon('icon_health_potion', (ctx) => {
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(10, 3, 4, 3);
      ctx.fillStyle = '#ef4444'; ctx.beginPath();
      ctx.arc(12, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 11, 2, 2);
    });

    drawIcon('icon_mana_potion', (ctx) => {
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(10, 3, 4, 3);
      ctx.fillStyle = '#38bdf8'; ctx.beginPath();
      ctx.arc(12, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 11, 2, 2);
    });

    drawIcon('icon_speed_potion', (ctx) => {
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(10, 3, 4, 3);
      ctx.fillStyle = '#eab308'; ctx.beginPath();
      ctx.arc(12, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 11, 2, 2);
    });

    // --- ETAP 4: BIOME ICONS ---
    drawIcon('icon_snow', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.SNOW}`) ? scene.textures.get(`tile_${BlockId.SNOW}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_ice', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.ICE}`) ? scene.textures.get(`tile_${BlockId.ICE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_sand', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.SAND}`) ? scene.textures.get(`tile_${BlockId.SAND}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_sandstone', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.SANDSTONE}`) ? scene.textures.get(`tile_${BlockId.SANDSTONE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_dark_dirt', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.DARK_DIRT}`) ? scene.textures.get(`tile_${BlockId.DARK_DIRT}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_dark_wood', (ctx) => {
      ctx.fillStyle = '#1e1424'; ctx.fillRect(3, 3, 18, 18);
      ctx.fillStyle = '#483454'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#654b75'; ctx.fillRect(7, 4, 2, 16);
    });

    drawIcon('icon_cactus', (ctx) => {
      ctx.fillStyle = '#2c4718'; ctx.fillRect(8, 2, 8, 20);
      ctx.fillStyle = '#4f7a2d'; ctx.fillRect(9, 3, 6, 18);
      ctx.fillStyle = '#639639'; ctx.fillRect(11, 3, 2, 18);
      ctx.fillStyle = '#4f7a2d'; ctx.fillRect(4, 8, 5, 4); ctx.fillRect(15, 12, 5, 4);
    });

    drawIcon('icon_palm_wood', (ctx) => {
      ctx.fillStyle = '#4d3215'; ctx.fillRect(3, 3, 18, 18);
      ctx.fillStyle = '#bf914f'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#deb26e'; ctx.fillRect(8, 4, 4, 16);
      ctx.fillStyle = '#f5dc9a'; ctx.fillRect(9, 4, 2, 16);
      ctx.fillStyle = '#4d3215'; ctx.fillRect(4, 9, 16, 1); ctx.fillRect(4, 15, 16, 1);
    });

    drawIcon('icon_hellstone', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.HELLSTONE}`) ? scene.textures.get(`tile_${BlockId.HELLSTONE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_ash', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.ASH_BLOCK}`) ? scene.textures.get(`tile_${BlockId.ASH_BLOCK}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_void_stone', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.VOID_STONE}`) ? scene.textures.get(`tile_${BlockId.VOID_STONE}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_void_crystal', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.VOID_CRYSTAL}`) ? scene.textures.get(`tile_${BlockId.VOID_CRYSTAL}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_chest', (ctx) => {
      const tileTex = scene.textures.exists(`tile_${BlockId.CHEST}`) ? scene.textures.get(`tile_${BlockId.CHEST}`) : null;
      if (tileTex) {
        const src = tileTex.getSourceImage() as CanvasImageSource;
        if (src) {
          ctx.drawImage(src, 4, 4, 16, 16);
          return;
        }
      }
    });

    drawIcon('icon_ice_blade', (ctx) => {
      ctx.fillStyle = '#e8b838'; ctx.fillRect(3, 19, 3, 3);
      ctx.fillStyle = '#5b616b'; ctx.fillRect(5, 16, 3, 3);
      ctx.fillStyle = '#6bc5e8'; ctx.fillRect(4, 14, 7, 2);
      ctx.fillStyle = '#9be0f7'; ctx.beginPath();
      ctx.moveTo(7, 14); ctx.lineTo(19, 3); ctx.lineTo(21, 4); ctx.lineTo(9, 15); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(14, 7, 2, 2);
    });

    drawIcon('icon_bottle', (ctx) => {
      ctx.fillStyle = '#8f6815'; ctx.fillRect(10, 3, 4, 3); // cork
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(8, 6, 8, 3); // neck
      ctx.fillStyle = '#dfbc73'; ctx.beginPath();
      ctx.arc(12, 15, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5c838'; ctx.fillRect(10, 13, 4, 4); // sand swirling
    });

    drawIcon('icon_hell_sword', (ctx) => {
      ctx.fillStyle = '#380c05'; ctx.fillRect(3, 19, 3, 3);
      ctx.fillStyle = '#ff7b1a'; ctx.fillRect(4, 14, 8, 3);
      ctx.fillStyle = '#e6420b'; ctx.beginPath();
      ctx.moveTo(7, 14); ctx.lineTo(19, 3); ctx.lineTo(21, 5); ctx.lineTo(9, 16); ctx.fill();
      ctx.fillStyle = '#ffff55'; ctx.fillRect(13, 8, 3, 2);
    });

    drawIcon('icon_molten_pickaxe', (ctx) => {
      ctx.strokeStyle = '#54321c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#e6420b'; ctx.beginPath();
      ctx.moveTo(10, 2); ctx.lineTo(22, 4); ctx.lineTo(20, 16); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffff55'; ctx.fillRect(16, 5, 4, 3);
    });

    drawIcon('icon_void_sword', (ctx) => {
      ctx.fillStyle = '#1c0533'; ctx.fillRect(3, 19, 3, 3);
      ctx.fillStyle = '#671cb0'; ctx.fillRect(4, 14, 8, 3);
      ctx.fillStyle = '#a832fa'; ctx.beginPath();
      ctx.moveTo(7, 14); ctx.lineTo(19, 3); ctx.lineTo(21, 5); ctx.lineTo(9, 16); ctx.fill();
      ctx.fillStyle = '#e28aff'; ctx.fillRect(14, 7, 2, 2);
    });

    drawIcon('icon_void_pickaxe', (ctx) => {
      ctx.strokeStyle = '#1c0533'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#a832fa'; ctx.beginPath();
      ctx.moveTo(10, 2); ctx.lineTo(22, 4); ctx.lineTo(20, 16); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e28aff'; ctx.fillRect(16, 5, 4, 3);
    });
  }

  private static createUtilityTextures(scene: Phaser.Scene, T: number): void {
    // 1. Reticle Cursor Box
    if (!scene.textures.exists('reticle')) {
      const canvas = scene.textures.createCanvas('reticle', T, T);
      if (canvas) {
        const ctx = canvas.context;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.5, 0.5, T - 1, T - 1);
        canvas.refresh();
      }
    }

    // 2. Particle Chip
    if (!scene.textures.exists('particle_chip')) {
      const canvas = scene.textures.createCanvas('particle_chip', 4, 4);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 4, 4);
        canvas.refresh();
      }
    }

    // 3. Pixel Art Cursor Sprites (32x32)
    this.createCursorTextures(scene);
  }

  private static createCursorTextures(scene: Phaser.Scene): void {
    const drawGrid = (key: string, layout: string[], map: Record<string, string>, scale: number = 2) => {
      if (scene.textures.exists(key)) return;
      const w = layout[0].split(' ').length;
      const h = layout.length;
      const canvas = scene.textures.createCanvas(key, w * scale, h * scale);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;

      for (let y = 0; y < h; y++) {
        const tokens = layout[y].split(' ');
        for (let x = 0; x < w; x++) {
          const col = map[tokens[x]];
          if (col) {
            ctx.fillStyle = col;
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }
      canvas.refresh();
    };

    const mapDef = { '#': '#10121a', 'W': '#ffffff', 'S': '#cbd5e1' };
    const mapInt = { '#': '#280508', 'R': '#ff2a44', 'H': '#ff94a0', 'S': '#b91c1c' };
    const mapTgt = { '#': '#280508', 'R': '#ff2a44', 'H': '#ff94a0' };

    const arrowNorm = [
      '. # . . . . . . . . . . . . . .',
      '# W # . . . . . . . . . . . . .',
      '# W W # . . . . . . . . . . . .',
      '# W W W # . . . . . . . . . . .',
      '# W W W W # . . . . . . . . . .',
      '# W W W W W # . . . . . . . . .',
      '# W W W W W W # . . . . . . . .',
      '# W W W W W W W # . . . . . . .',
      '# W W W W W W W W # . . . . . .',
      '# W W W W W W W W W # . . . . .',
      '# W W W W W # # # # # # . . . .',
      '# W W S W W # . . . . . . . . .',
      '# W S . # W W # . . . . . . . .',
      '# S . . # W W # . . . . . . . .',
      '# . . . . # W W # . . . . . . .',
      '. . . . . . # # . . . . . . . .'
    ];

    const arrowInt = [
      '. # . . . . . . . . . . . . . .',
      '# H # . . . . . . . . . . . . .',
      '# H R # . . . . . . . . . . . .',
      '# H R R # . . . . . . . . . . .',
      '# H R R R # . . . . . . . . . .',
      '# H R R R R # . . . . . . . . .',
      '# H R R R R R # . . . . . . . .',
      '# H R R R R R R # . . . . . . .',
      '# H R R R R R R R # . . . . . .',
      '# H R R R R R R R R # . . . . .',
      '# H R R R R # # # # # # . . . .',
      '# H R S R R # . . . . . . . . .',
      '# R S . # R R # . . . . . . . .',
      '# S . . # R R # . . . . . . . .',
      '# . . . . # R R # . . . . . . .',
      '. . . . . . # # . . . . . . . .'
    ];

    const tgtLayout = [
      '. . . . . . # # # # . . . . . .',
      '. . . . . . # H R # . . . . . .',
      '. . . . . . # H R # . . . . . .',
      '. . . . . . # H R # . . . . . .',
      '. . . . . . . # # . . . . . . .',
      '. . . . . . . . . . . . . . . .',
      '# # # # . . . # # . . . # # # #',
      '# H H H # . # H R # . # H H H #',
      '# R R R # . # R R # . # R R R #',
      '# # # # . . . # # . . . # # # #',
      '. . . . . . . . . . . . . . . .',
      '. . . . . . . # # . . . . . . .',
      '. . . . . . # H R # . . . . . .',
      '. . . . . . # H R # . . . . . .',
      '. . . . . . # H R # . . . . . .',
      '. . . . . . # # # # . . . . . .'
    ];

    const grabClosed = [
      '. . . . . # # . . # # . . . . .',
      '. . . . # R R # # R R # . . . .',
      '. . # # # R R # R R R # . # # .',
      '. # R R # R R # R R R # # R R #',
      '. # R R # R R # R R R # R R R #',
      '. # R R # R R # R R R # R R R #',
      '. # R R R R R R R R R R R R R #',
      '. . # R R R R R R R R R R R R #',
      '. . # R R R R R R R R R R R # .',
      '. . . # R R R R R R R R R R # .',
      '. . . # R R R R R R R R R # . .',
      '. . . . # R R R R R R R # . . .',
      '. . . . # R R R R R R R # . . .',
      '. . . . . # # # # # # # . . . .',
      '. . . . . . . . . . . . . . . .',
      '. . . . . . . . . . . . . . . .'
    ];

    drawGrid('cursor_default', arrowNorm, mapDef, 1);
    drawGrid('cursor_interact', arrowInt, mapInt, 1);
    drawGrid('cursor_target', tgtLayout, mapTgt, 1);
    drawGrid('cursor_grab', grabClosed, mapTgt, 1);
  }

  private static createCombatTextures(scene: Phaser.Scene): void {
    // 1. SLIMES (Green, Blue, Red Cyclops Slimes) - 24x20 with big central eye socket
    const slimePalettes: { key: string; outer: string; inner: string; core: string; shine: string }[] = [
      { key: 'enemy_slime', outer: '#14532d', inner: '#22c55e', core: '#166534', shine: '#bbf7d0' },
      { key: 'enemy_slime_green', outer: '#14532d', inner: '#22c55e', core: '#166534', shine: '#bbf7d0' },
      { key: 'enemy_slime_blue', outer: '#1e3a8a', inner: '#38bdf8', core: '#0284c7', shine: '#bae6fd' },
      { key: 'enemy_slime_red', outer: '#7f1d1d', inner: '#ef4444', core: '#b91c1c', shine: '#fecaca' },
      { key: 'enemy_slime_sand', outer: '#78531a', inner: '#eab308', core: '#ca8a04', shine: '#fef08a' },
      { key: 'enemy_slime_ice', outer: '#0e4a68', inner: '#67e8f9', core: '#06b6d4', shine: '#cffafe' },
      { key: 'enemy_slime_dark', outer: '#2b0f42', inner: '#a855f7', core: '#7e22ce', shine: '#f3e8ff' },
      { key: 'enemy_slime_magma', outer: '#4a0b05', inner: '#ff5500', core: '#c2270c', shine: '#ffea75' }
    ];

    for (const pal of slimePalettes) {
      if (!scene.textures.exists(pal.key)) {
        const canvas = scene.textures.createCanvas(pal.key, 24, 20);
        if (canvas) {
          const ctx = canvas.context;
          ctx.imageSmoothingEnabled = false;
          // Outer gelatinous dome
          ctx.fillStyle = pal.outer;
          ctx.beginPath();
          ctx.roundRect(1, 3, 22, 16, [10, 10, 3, 3]);
          ctx.fill();
          // Inner translucent slime body
          ctx.fillStyle = pal.inner;
          ctx.beginPath();
          ctx.roundRect(2, 4, 20, 14, [9, 9, 2, 2]);
          ctx.fill();
          // Core shadow
          ctx.fillStyle = pal.core;
          ctx.beginPath();
          ctx.arc(12, 13, 5, 0, Math.PI * 2);
          ctx.fill();
          // Glossy surface shine (top left)
          ctx.fillStyle = pal.shine;
          ctx.fillRect(4, 5, 4, 2);
          ctx.fillRect(8, 5, 2, 1);
          ctx.fillRect(4, 7, 2, 2);

          // --- ONE BIG EYE SCLERA (Center at 12, 10) ---
          // Eye dark rim
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(12, 10, 5, 0, Math.PI * 2);
          ctx.fill();
          // Eye bright white eyeball
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(12, 10, 4, 0, Math.PI * 2);
          ctx.fill();
          canvas.refresh();
        }
      }
    }

    // 2. CRAWLER (Cavern Rock Crawler) - 26x16
    if (!scene.textures.exists('enemy_crawler')) {
      const canvas = scene.textures.createCanvas('enemy_crawler', 26, 16);
      if (canvas) {
        const ctx = canvas.context;
        ctx.imageSmoothingEnabled = false;
        // Spidery/Chitin legs
        ctx.fillStyle = '#1f2937';
        // Left legs
        ctx.fillRect(2, 12, 3, 4); ctx.fillRect(1, 14, 2, 2);
        ctx.fillRect(6, 12, 3, 4); ctx.fillRect(5, 14, 2, 2);
        // Right legs
        ctx.fillRect(17, 12, 3, 4); ctx.fillRect(19, 14, 2, 2);
        ctx.fillRect(21, 12, 3, 4); ctx.fillRect(23, 14, 2, 2);
        // Main chitin body
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.roundRect(4, 4, 18, 10, 4);
        ctx.fill();
        // Shell ridges & ore specks
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(6, 5, 14, 3);
        ctx.fillRect(7, 9, 12, 2);
        ctx.fillStyle = '#d97706'; // copper sheen
        ctx.fillRect(9, 6, 3, 2);
        ctx.fillRect(15, 6, 2, 2);
        // Mandibles / Pincers
        ctx.fillStyle = '#111827';
        ctx.fillRect(22, 6, 4, 2);
        ctx.fillRect(22, 10, 4, 2);
        // Glowing red predator eyes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(20, 6, 2, 2);
        ctx.fillRect(20, 10, 2, 2);
        canvas.refresh();
      }
    }

    // 3. SKELETON (Lost Miner Skeleton) - 20x36
    if (!scene.textures.exists('enemy_skeleton')) {
      const canvas = scene.textures.createCanvas('enemy_skeleton', 20, 36);
      if (canvas) {
        const ctx = canvas.context;
        ctx.imageSmoothingEnabled = false;
        // Skull
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(6, 3, 10, 9);
        ctx.fillRect(7, 12, 8, 3); // jaw
        // Eye sockets (haunted glowing amber)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(8, 6, 3, 3);
        ctx.fillRect(13, 6, 3, 3);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(9, 7, 1, 1);
        ctx.fillRect(14, 7, 1, 1);
        // Spine & Ribs
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(10, 15, 2, 12);
        ctx.fillRect(6, 17, 10, 2);
        ctx.fillRect(7, 20, 8, 2);
        ctx.fillRect(8, 23, 6, 2);
        // Pelvis
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(7, 26, 8, 3);
        // Legs & Boots
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(7, 29, 3, 5);
        ctx.fillRect(12, 29, 3, 5);
        ctx.fillStyle = '#334155'; // rusty miner boots
        ctx.fillRect(6, 33, 4, 3);
        ctx.fillRect(12, 33, 4, 3);
        // Arm & Rusty miner blade
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(3, 16, 2, 8);
        ctx.fillStyle = '#78350f'; // rust hilt
        ctx.fillRect(2, 24, 4, 2);
        ctx.fillStyle = '#94a3b8'; // iron blade
        ctx.fillRect(1, 26, 3, 7);
        canvas.refresh();
      }
    }

    // 4. BAT (Shadow Bat) - 24x16
    if (!scene.textures.exists('enemy_bat')) {
      const canvas = scene.textures.createCanvas('enemy_bat', 24, 16);
      if (canvas) {
        const ctx = canvas.context;
        ctx.imageSmoothingEnabled = false;
        // Outstretched leathery wings
        ctx.fillStyle = '#4c1d95';
        ctx.beginPath();
        // Left wing
        ctx.moveTo(10, 6); ctx.lineTo(1, 2); ctx.lineTo(3, 12); ctx.lineTo(7, 10); ctx.lineTo(10, 8);
        // Right wing
        ctx.moveTo(14, 6); ctx.lineTo(23, 2); ctx.lineTo(21, 12); ctx.lineTo(17, 10); ctx.lineTo(14, 8);
        ctx.fill();
        // Wing bone struts
        ctx.fillStyle = '#2e1065';
        ctx.fillRect(1, 2, 9, 2);
        ctx.fillRect(14, 2, 9, 2);
        // Bat body & ears
        ctx.fillStyle = '#2e1065';
        ctx.fillRect(9, 4, 6, 9);
        // Ears
        ctx.fillStyle = '#581c87';
        ctx.fillRect(9, 1, 2, 3);
        ctx.fillRect(13, 1, 2, 3);
        // Glowing red eyes & fangs
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(10, 6, 2, 2);
        ctx.fillRect(13, 6, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11, 10, 1, 2);
        ctx.fillRect(13, 10, 1, 2);
        canvas.refresh();
      }
    }

    // 5. PROJECTILE: Arrow - 18x6
    if (!scene.textures.exists('proj_arrow')) {
      const canvas = scene.textures.createCanvas('proj_arrow', 18, 6);
      if (canvas) {
        const ctx = canvas.context;
        // Shaft
        ctx.fillStyle = '#78350f';
        ctx.fillRect(4, 2, 10, 2);
        // Steel Tip
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(14, 1); ctx.lineTo(18, 3); ctx.lineTo(14, 5); ctx.closePath();
        ctx.fill();
        // Fletching Feathers
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 1, 4, 1);
        ctx.fillRect(0, 4, 4, 1);
        canvas.refresh();
      }
    }

    // 6. PROJECTILE: Magic Bolt - 14x14
    if (!scene.textures.exists('proj_magic')) {
      const canvas = scene.textures.createCanvas('proj_magic', 14, 14);
      if (canvas) {
        const ctx = canvas.context;
        // Astral magic corona
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath(); ctx.arc(7, 7, 6, 0, Math.PI * 2); ctx.fill();
        // Core flame
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(7, 7, 4, 0, Math.PI * 2); ctx.fill();
        // White-hot center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(7, 7, 2, 0, Math.PI * 2); ctx.fill();
        canvas.refresh();
      }
    }

    // 7. EFFECT: Melee Slash Arc - 32x32
    if (!scene.textures.exists('effect_slash')) {
      const canvas = scene.textures.createCanvas('effect_slash', 32, 32);
      if (canvas) {
        const ctx = canvas.context;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(8, 24, 22, -Math.PI * 0.45, Math.PI * 0.05);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(8, 24, 21, -Math.PI * 0.4, Math.PI * 0.0);
        ctx.stroke();
        canvas.refresh();
      }
    }

    // 8. PARTICLE: Spark - 4x4
    if (!scene.textures.exists('particle_spark')) {
      const canvas = scene.textures.createCanvas('particle_spark', 4, 4);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(0, 0, 4, 4);
        canvas.refresh();
      }
    }
  }

  private static createCelestialTextures(scene: Phaser.Scene): void {
    // 1. Radiant Pixel Art Sun - 72x72 (large, glorious retro pixel art with tapered flames)
    if (!scene.textures.exists('celestial_sun')) {
      const size = 72;
      const canvas = scene.textures.createCanvas('celestial_sun', size, size);
      if (canvas) {
        const ctx = canvas.context;
        ctx.imageSmoothingEnabled = false;
        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;
        const cx = (size - 1) / 2.0;
        const cy = (size - 1) / 2.0;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            const wave = Math.cos(8 * angle);
            const rayR = 22.5 + Math.pow(Math.max(0, wave), 1.5) * 8.5;

            let r = 0, g = 0, b = 0, a = 0;
            if (dist <= rayR) {
              if (dist <= 6.5) {
                // Pure white hot core
                r = 255; g = 255; b = 255; a = 255;
              } else if (dist <= 12.5) {
                // Bright lemon-yellow inner ring (#fef08a)
                r = 254; g = 240; b = 138; a = 255;
              } else if (dist <= 18.0) {
                // Radiant golden yellow (#fbbf24)
                r = 251; g = 191; b = 36; a = 255;
              } else if (dist <= 22.0) {
                // Warm amber body (#f59e0b)
                r = 245; g = 158; b = 11; a = 255;
              } else if (dist <= 24.0 && wave < 0.2) {
                // Fiery outline between rays (#c2410c)
                r = 194; g = 65; b = 12; a = 255;
              } else {
                // Tapered triangular flame tips
                const flameT = (dist - 22.0) / (rayR - 22.0 + 0.001);
                if (flameT < 0.5) {
                  r = 251; g = 191; b = 36; a = 255;
                } else if (flameT < 0.85) {
                  r = 245; g = 158; b = 11; a = 240;
                } else {
                  r = 217; g = 119; b = 6; a = 200;
                }
              }
            } else if (dist <= 33.0) {
              // Soft warm ambient pixel aura
              const alpha = Math.floor(52 * (1.0 - (dist - 22.5) / 10.5));
              if (alpha > 0) {
                r = 245; g = 158; b = 11; a = alpha;
              }
            }

            const idx = (y * size + x) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        canvas.refresh();
      }
    }

    // 2. Mystic Pixel Art Crescent Moon - 72x72 (ethereal glowing crescent with lunar craters)
    if (!scene.textures.exists('celestial_moon')) {
      const size = 72;
      const canvas = scene.textures.createCanvas('celestial_moon', size, size);
      if (canvas) {
        const ctx = canvas.context;
        ctx.imageSmoothingEnabled = false;
        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;
        const cx = 35;
        const cy = 35;
        const R = 25.0;

        // Cutout circle for crescent (offset up-right to illuminate crescent facing left / bottom-left)
        const cutX = cx + 11.5;
        const cutY = cy - 4.5;
        const cutR = 23.0;

        // Soft craters on the illuminated crescent
        const craters = [
          [-10, 5, 4.0],
          [-4, 14, 3.5],
          [-13, -6, 3.2],
          [-5, -14, 2.5]
        ];

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const cutDx = x - cutX;
            const cutDy = y - cutY;
            const cutDist = Math.sqrt(cutDx * cutDx + cutDy * cutDy);

            const pIdx = (y * size + x) * 4;

            const inMain = dist <= R;
            const inCut = cutDist <= cutR;

            let r = 0, g = 0, b = 0, a = 0;

            if (inMain && !inCut) {
              // Inside the illuminated crescent
              const edgeDist = Math.min(R - dist, cutDist - cutR);

              let inCrater = false;
              let cDepth = 0;
              for (const [crX, crY, crR] of craters) {
                const cdx = dx - crX;
                const cdy = dy - crY;
                const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cDist <= crR) {
                  inCrater = true;
                  cDepth = 1.0 - cDist / crR;
                  break;
                }
              }

              if (edgeDist < 1.2) {
                // Celestial edge silhouette
                r = 75; g = 85; b = 115; a = 255;
              } else if (inCrater) {
                // Lunar mare crater shading (soft silver-slate)
                if (cDepth > 0.5) {
                  r = 160; g = 175; b = 205; a = 255;
                } else {
                  r = 195; g = 210; b = 230; a = 255;
                }
              } else {
                // Pearlescent luminous crest gradient
                const outerFactor = (-dx * 0.7 - dy * 0.5) / R;
                if (outerFactor > 0.35) {
                  // Pure glowing white crest
                  r = 255; g = 255; b = 255; a = 255;
                } else if (outerFactor > -0.1) {
                  // Warm pale pearl / cream
                  r = 245; g = 248; b = 255; a = 255;
                } else if (outerFactor > -0.5) {
                  // Soft silver
                  r = 220; g = 230; b = 248; a = 255;
                } else {
                  // Twilight crescent rim
                  r = 185; g = 200; b = 225; a = 255;
                }
              }
            } else if (inMain && inCut) {
              // Earthshine silhouette: faint magical outline of the dark hemisphere of the moon
              const shade = Math.floor(18 + (1.0 - dist / R) * 14);
              r = 40; g = 48; b = 75; a = shade;
            } else if (dist <= R + 6.0) {
              // Ethereal celestial lunar halo
              const haloDist = dist - R;
              const angleFactor = Math.max(0, (-dx * 0.7 - dy * 0.5) / dist);
              const alpha = Math.floor((1.0 - haloDist / 6.0) * (45 + angleFactor * 55));
              if (alpha > 0) {
                r = 210; g = 225; b = 255; a = alpha;
              }
            }

            data[pIdx] = r;
            data[pIdx + 1] = g;
            data[pIdx + 2] = b;
            data[pIdx + 3] = a;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        canvas.refresh();
      }
    }
  }
}
