#!/bin/sh
# Dựng lại assets/characters/ga/hood.glb (cần Blender 4.2; chỉnh BLENDER nếu cài chỗ khác)
BLENDER="${BLENDER:-C:/Program Files/Blender Foundation/blender.exe}"
"$BLENDER" --factory-startup -b -P tools/blender/ga_hood.py -- "${1:-assets/characters/ga/hood.glb}" 2>&1 | grep -E "HOOD|OK|Error|Traceback"
