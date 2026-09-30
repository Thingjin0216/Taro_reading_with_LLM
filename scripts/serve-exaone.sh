#!/usr/bin/env bash
# EXAONE 4.0.1 32B를 vLLM으로 띄워 OpenAI 호환 API로 연다.
# vLLM은 전용 conda 환경(기본 taro-exaone)의 것을 쓴다 — 먼저 scripts/setup-exaone-env.sh 를 실행한다.
#
#   scripts/serve-exaone.sh                GPU 0번 한 장에 올린다
#   GPUS=0,1 scripts/serve-exaone.sh       두 장에 나눠 올린다(텐서 병렬)
#   PORT=9000 scripts/serve-exaone.sh      포트를 바꾼다 (기본 8765)
#
# 앱은 .env.local 에 LLM_BASE_URL=http://127.0.0.1:8765/v1 을 넣으면 이 서버를 쓴다.
# 처음 실행하면 가중치 64GB를 내려받는다.
# 라이선스: EXAONE AI Model License Agreement 1.2 - NC (비상업 용도만 허용).
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib/exaone-env.sh"

MODEL="${MODEL:-LGAI-EXAONE/EXAONE-4.0.1-32B}"
GPUS="${GPUS:-0}"
PORT="${PORT:-8765}"
# 리딩은 프롬프트가 짧고 답도 1,200토큰 안쪽이라 8K면 충분하다. 줄인 만큼 KV 캐시에 여유가 생긴다.
MAX_MODEL_LEN="${MAX_MODEL_LEN:-8192}"
GPU_MEMORY_UTILIZATION="${GPU_MEMORY_UTILIZATION:-0.95}"
# 요청에 값이 없을 때 쓰는 샘플링 기본값. EXAONE 4.0은 비추론 모드에서 temperature 0.6 미만을 권하는데,
# 모델의 generation_config.json에는 샘플링 값이 없어 그냥 두면 vLLM 기본값(1.0)이 쓰인다.
GENERATION_DEFAULTS="${GENERATION_DEFAULTS:-{\"temperature\": 0.5, \"top_p\": 0.95\}}"

VLLM="$ENV_PREFIX/bin/vllm"
if [[ ! -x "$VLLM" ]]; then
  echo "$ENV_NAME 환경에 vLLM이 없습니다. 먼저 scripts/setup-exaone-env.sh 를 실행하세요." >&2
  exit 1
fi

TENSOR_PARALLEL_SIZE=$(awk -F, '{print NF}' <<<"$GPUS")

# 셸에 켜 둔 다른 conda 환경의 도구가 섞이지 않게 conda 경로를 모두 빼고 이 환경만 맨 앞에 둔다.
# (그 환경의 옛 nvcc가 flashinfer 컴파일에 끼어든 적이 있다.)
ISOLATED_PATH="$ENV_PREFIX/bin:$(tr ':' '\n' <<<"$PATH" | grep -v "^$CONDA_BASE" | paste -sd: -)"

echo "EXAONE 서빙: ${MODEL} · 환경 ${ENV_NAME} · GPU ${GPUS} (TP=${TENSOR_PARALLEL_SIZE}) · http://127.0.0.1:${PORT}/v1" >&2

# 127.0.0.1에만 연다 — 인증 없는 모델 서버를 공용 서버의 네트워크에 노출하지 않는다.
# VLLM_USE_FLASHINFER_SAMPLER=0: vLLM은 top-p/top-k 샘플링에 FlashInfer 커널을 쓰는데, 이 커널은
# 처음 쓸 때 nvcc로 컴파일된다. 시스템 nvcc(12.4)는 flashinfer가 넘기는 옵션을 몰라 실패하므로
# PyTorch 기본 샘플러를 쓴다. 요청이 몇 건 안 되는 데모에선 속도 차이가 드러나지 않는다.
exec env \
  CUDA_VISIBLE_DEVICES="$GPUS" \
  LD_PRELOAD="$ENV_LIBSTDCXX${LD_PRELOAD:+:$LD_PRELOAD}" \
  PATH="$ISOLATED_PATH" \
  CONDA_PREFIX="$ENV_PREFIX" \
  VLLM_USE_FLASHINFER_SAMPLER=0 \
  "$VLLM" serve "$MODEL" \
  --served-model-name exaone \
  --host 127.0.0.1 \
  --port "$PORT" \
  --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" \
  --max-model-len "$MAX_MODEL_LEN" \
  --gpu-memory-utilization "$GPU_MEMORY_UTILIZATION" \
  --override-generation-config "$GENERATION_DEFAULTS"
