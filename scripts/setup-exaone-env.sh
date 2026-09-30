#!/usr/bin/env bash
# EXAONE 서빙 전용 conda 환경을 만든다. 다른 연구용 환경과 패키지를 섞지 않기 위해서다.
#
#   scripts/setup-exaone-env.sh                  taro-exaone 환경을 만들고 vLLM을 설치한다
#   ENV_NAME=my-env scripts/setup-exaone-env.sh  환경 이름을 바꾼다
#
# 이미 환경이 있으면 새로 만들지 않고 설치만 다시 확인한다.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib/exaone-env.sh"

PYTHON_VERSION="${PYTHON_VERSION:-3.12}"
VLLM_VERSION="${VLLM_VERSION:-0.30.0}"
# vLLM 기본 휠은 CUDA 13 빌드라 드라이버 580 이상이 필요하다.
# 드라이버 570(CUDA 12.8)에서도 도는 12.x 빌드를 쓴다 — CUDA 12 안에서는 하위 드라이버와 호환된다.
CUDA_VARIANT="${CUDA_VARIANT:-cu129}"

PYTHON="$ENV_PREFIX/bin/python"

if [[ -x "$PYTHON" ]]; then
  echo "환경 $ENV_NAME 이(가) 이미 있습니다: $ENV_PREFIX" >&2
else
  echo "환경 $ENV_NAME 을(를) 만듭니다 (Python $PYTHON_VERSION)" >&2
  "$CONDA_BIN" create -y -n "$ENV_NAME" "python=$PYTHON_VERSION" pip
fi

WHEEL="https://github.com/vllm-project/vllm/releases/download/v${VLLM_VERSION}/vllm-${VLLM_VERSION}+${CUDA_VARIANT}-cp38-abi3-manylinux_2_28_x86_64.whl"

INSTALLED="$("$PYTHON" -c 'import importlib.metadata as m; print(m.version("vllm"))' 2>/dev/null || true)"
if [[ "$INSTALLED" == "${VLLM_VERSION}+${CUDA_VARIANT}" ]]; then
  echo "vLLM ${INSTALLED}이(가) 이미 설치돼 있어 설치를 건너뜁니다" >&2
else
  echo "vLLM ${VLLM_VERSION}+${CUDA_VARIANT} 설치" >&2
  "$PYTHON" -m pip install --upgrade pip
  "$PYTHON" -m pip install "vllm @ ${WHEEL}" --extra-index-url "https://download.pytorch.org/whl/${CUDA_VARIANT}"
fi

echo "설치 확인" >&2
"$PYTHON" -m pip check
# serve-exaone.sh와 같은 조건(환경의 libstdc++를 먼저 올림)에서 서버가 실제로 밟는 임포트를 해 본다.
# torch만 확인했을 땐 통과했지만, vLLM이 sqlite3→ICU를 부를 때 C++ 런타임 버전 문제로 죽은 적이 있다.
LD_PRELOAD="$ENV_LIBSTDCXX" "$PYTHON" - <<'PY'
import importlib.metadata as md
import sqlite3  # noqa: F401 — ICU를 거쳐 새 libstdc++를 요구한다
import torch

import vllm.entrypoints.openai.api_server  # noqa: F401 — vllm serve가 불러오는 경로

assert torch.cuda.is_available(), "CUDA를 쓸 수 없습니다 — 드라이버와 CUDA 빌드를 확인하세요."
torch.ones(1, device="cuda")  # 드라이버가 이 빌드를 실제로 돌릴 수 있는지까지 본다

print("vllm", md.version("vllm"), "| torch", torch.__version__, "| GPU", torch.cuda.get_device_name(0))
PY

echo "완료. 서버는 scripts/serve-exaone.sh 로 띄웁니다." >&2
