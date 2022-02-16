#!/bin/sh

#bash updater.sh

regex="([0-9]+)x([0-9]+)\+([0-9]+)\+([0-9]+)"

monitor_stats=$(xrandr -d :0 -q | grep ' connected' &)

index=0

while [[ $monitor_stats =~ $regex ]]; do
        echo "Starting App on:${BASH_REMATCH[1]},${BASH_REMATCH[2]}+${BASH_REMATCH[3]}+${BASH_REMATCH[4]}" &
        ./MultiDisplayManager.AppImage --viewer --disableAutoUpdate --savename=${index} &
        last_pid=$!
        sleep 5
        echo "Process ID : ${last_pid}"
        xdotool search --pid $last_pid | while read wid ; do
                echo "Window ID : ${wid}"
                xdotool windowsize $wid ${BASH_REMATCH[1]} ${BASH_REMATCH[2]}
                xdotool windowmove $wid ${BASH_REMATCH[3]} ${BASH_REMATCH[4]}
        done
        monitor_stats=${monitor_stats/"${BASH_REMATCH[0]}"/}
        (( index++ ))
done