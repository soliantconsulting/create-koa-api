#!/usr/bin/env bash

return_code=0

commands=(
  "pnpm biome ci ."
  "pnpm tsc --noEmit"
  "pnpm --dir=./cdk tsc --noEmit"
)

for cmd in "${commands[@]}"; do
    $cmd

    if [ $? -ne 0 ]; then
        return_code=1
    fi
done

exit $return_code
