# EXAONE 설정·서빙 스크립트가 함께 쓰는 값. 직접 실행하지 않고 source 한다.
# 두 스크립트가 같은 환경, 같은 C++ 런타임 조건을 보게 하려고 한곳에 둔다.

ENV_NAME="${ENV_NAME:-taro-exaone}"

CONDA_BIN="${CONDA_EXE:-$(command -v conda || true)}"
if [[ -z "$CONDA_BIN" ]]; then
  echo "conda를 찾을 수 없습니다. conda(또는 miniforge)를 설치한 뒤 다시 실행하세요." >&2
  exit 1
fi

CONDA_BASE="$("$CONDA_BIN" info --base)"
ENV_PREFIX="$CONDA_BASE/envs/$ENV_NAME"

# pip로 받은 torch 등이 시스템의 옛 libstdc++를 먼저 물면, 나중에 환경의 SQLite→ICU가
# 요구하는 새 CXXABI를 찾지 못해 vLLM이 임포트 단계에서 죽는다. 환경의 것을 먼저 올린다.
# libstdc++는 하위 호환이라 새 것을 먼저 올려도 옛 것을 기대하는 쪽이 깨지지 않는다.
ENV_LIBSTDCXX="$ENV_PREFIX/lib/libstdc++.so.6"
