#!/bin/bash
export N=0
export MAX_JOBS=5
for f in n8n_workflows/*.json; do
  filename=$(basename "$f")
  (
    echo "Importing $filename..."
    docker exec automata-n8n n8n import:workflow --input="/tmp/n8n_workflows/$filename" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo "$filename SUCCESS"
    else
      echo "$filename FAILED"
    fi
  ) &
  
  # Allow only N jobs at a time
  ((N=N+1))
  if [[ $(($N % $MAX_JOBS)) -eq 0 ]]; then
    wait
  fi
done
wait
echo "All done!"
