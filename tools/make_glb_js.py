#!/usr/bin/env python3
"""Incorpora transit.glb in transit.glb.js (base64) cosi' index.html funziona anche da file:// senza server."""
import base64
b = open('transit.glb', 'rb').read()
open('transit.glb.js', 'w').write('window.VAN_B64="' + base64.b64encode(b).decode() + '";\n')
